import {createHash,randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {z} from "zod";
import {partialReturnQuoteSchema,partialReturnCommandSchema,type PartialReturnQuote,type PartialReturnPlan,
  type PartialReturnValuation,type PartialReturnHistory,type PartialReturnTargets} from "@shared/accounting-partial-returns";
import type {AccountingAccess} from "@shared/accounting-api";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {assertLedgerReady} from "./readiness";
import {assertPipelineManager} from "./loading-invoice-stock";
import {lockedWallet,reconciled,account} from "./wallet";
import {postJournalEntry} from "./postJournalEntry";
import {decimal} from "./money";
function normalized(input:PartialReturnQuote):PartialReturnQuote {
  return input.kind==="GOODS"?{...input,items:input.items.map(x=>({...x,quantityTons:decimal(x.quantityTons).toFixed()}))
    .sort((a,b)=>a.orderItemId-b.orderItemId)}:
    {...input,walletAmount:decimal(input.walletAmount).toFixed(),allocations:input.allocations.map(x=>({...x,amount:decimal(x.amount).toFixed()}))
      .sort((a,b)=>a.receivableId-b.receivableId)};
}
async function planWithin(tx:AccountingTransaction,input:PartialReturnQuote):Promise<PartialReturnPlan>{
  const d=normalized(input);
  const valuation=(await tx.execute(sql`select accounting_partial_return_valuation(${JSON.stringify(d)}::jsonb) v`)).rows[0].v as PartialReturnValuation;
  const gate=(await tx.execute(sql`select 1 from accounting_partial_return_cutovers g
    join accounting_companies c on c.id=g.company_id and c.is_active
    join accounting_wallet_cutovers w on w.company_id=c.id and w.pipeline_ready
    join accounting_receipt_cutovers r on r.company_id=c.id and r.processing_ready
    join accounting_fiscal_years y on y.company_id=c.id and y.status='open'
    where g.company_id=${d.companyId} and g.processing_ready and ${d.entryDate}::date>=g.starts_on
      and ${d.entryDate}::date between y.starts_on and y.ends_on
      and ${d.entryDate}::date<=(now() at time zone c.timezone)::date`)).rows;
  const financialGateOpen=gate.length>0;
  const arReconciled=!valuation.available||(await tx.execute(sql`select accounting_partial_return_ar_reconciled(${d.companyId},
    ${valuation.customerId},${valuation.currency}) ok`)).rows[0].ok===true;
  const blockers=[...(!financialGateOpen?["PARTIAL_RETURN_GATE_CLOSED"]:[]),
    ...(!arReconciled?["PARTIAL_RETURN_AR_RECONCILIATION_REQUIRED"]:[]),
    ...(!valuation.available?[valuation.blockingReason??"RETURN_EVIDENCE_REQUIRED"]:[])];
  const evidence={input:d,valuation,financialGateOpen,postingAllowed:!blockers.length,blockers};
  return {...evidence,planHash:createHash("sha256").update(JSON.stringify(evidence)).digest("hex")};
}
export async function readPartialReturnPlan(input:unknown,callerTx?:AccountingTransaction){
  const parsed=partialReturnQuoteSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  return callerTx?planWithin(callerTx,parsed.data):accountingDb.transaction(tx=>planWithin(tx,parsed.data),
    {isolationLevel:"repeatable read",accessMode:"read only"});
}
export async function postPartialReturn(input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction){
  const parsed=partialReturnCommandSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    await assertPipelineManager(tx,actor);await assertLedgerReady(tx);
    const required=["accounting_partial_return_guard","accounting_partial_return_completion_guard",
      "accounting_partial_return_journal_guard","accounting_partial_return_reversal_guard",
      "accounting_partial_return_gate_guard","accounting_partial_return_collection_guard",
      "accounting_partial_return_counter_guard","accounting_partial_return_full_goods_guard",
      "accounting_partial_return_full_receipt_guard","accounting_partial_return_cross_payout_guard",
      "accounting_partial_return_ar_guard"];
    const guards=new Set((await tx.execute(sql`select tgname from pg_trigger
      where tgname in (${sql.join(required.map(x=>sql`${x}`),sql`,`)}) and not tgisinternal and tgenabled in ('O','A')`)).rows.map(x=>String(x.tgname)));
    if(required.some(x=>!guards.has(x)))throw new AccountingError("Partial-return integrity guards missing",503,"RETURN_GUARDS_MISSING");
    const quote=normalized(partialReturnQuoteSchema.parse(parsed.data.kind==="GOODS"?
      {kind:"GOODS",companyId:parsed.data.companyId,invoiceId:parsed.data.invoiceId,entryDate:parsed.data.entryDate,items:parsed.data.items}:
      {kind:"RECEIPT",companyId:parsed.data.companyId,receiptId:parsed.data.receiptId,entryDate:parsed.data.entryDate,
        allocations:parsed.data.allocations,walletAmount:parsed.data.walletAmount}));
    const d={...parsed.data,...quote};
    if(d.kind==="RECEIPT"&&d.payoutReference.length<5)
      throw new AccountingError("Actual bank transaction or cash voucher reference required",422,"PAYOUT_REFERENCE_REQUIRED");
    const old=(await tx.execute(sql`select * from accounting_partial_return_books where company_id=${d.companyId} and source_id=${d.sourceId}`)).rows[0];
    if(old){
      const same=(await tx.execute(sql`select ${JSON.stringify(d)}::jsonb=${JSON.stringify(old.input)}::jsonb same`)).rows[0].same;
      if(!same||old.journal_id==null)throw new AccountingError("Return source conflicts with original evidence",409,"IDEMPOTENCY_CONFLICT");
      return {id:Number(old.id),journalId:Number(old.journal_id),duplicate:true};
    }
    const plan=await planWithin(tx,quote);
    if(!plan.postingAllowed)throw new AccountingError(`Return blocked: ${plan.blockers.join(", ")}`,409,"PARTIAL_RETURN_BLOCKED");
    if(d.expectedPlanHash!==plan.planHash)throw new AccountingError("Return evidence changed; review a fresh plan",409,"STALE_RETURN_PLAN");
    await tx.execute(sql`set constraints accounting_partial_return_completion_guard,accounting_partial_return_journal_guard,
      accounting_partial_return_ar_guard,
      accounting_balance_header,accounting_balance_lines,accounting_foreign_ar_parity deferred`);
    const v=plan.valuation;
    const w=v.walletId&&decimal(v.walletAmount).gt(0)?await lockedWallet(tx,v.walletId,d.companyId):null;
    const liability=w?await account(tx,d.companyId,"WALLET_LIABILITY"):null;
    if(w&&(v.walletAfter===null||v.walletBefore===null))
      throw new AccountingError("Exact native wallet balance evidence required",409,"RETURN_EVIDENCE_MISSING");
    if(w)await reconciled(tx,w,d.companyId,liability!);
    const saved=(await tx.execute(sql`insert into accounting_partial_return_books(company_id,kind,source_id,input,valuation,actor_id,actor_type)
      values(${d.companyId},${d.kind},${d.sourceId},${JSON.stringify(d)}::jsonb,${JSON.stringify(v)}::jsonb,
        ${actor.actorId},${actor.actorType}) returning id`)).rows[0];
    const posted=await postJournalEntry({companyId:d.companyId,sourceType:"PartialReturn",sourceId:d.sourceId,
      entryDate:d.entryDate,description:d.reason,lines:v.lines.map(({accountId,currency,debit,credit,partyType,partyId,costCenterId,description})=>
        ({accountId,currency,debit,credit,partyType,partyId,costCenterId,description}))},actor,tx);
    if(posted.duplicate)throw new AccountingError("Uncoordinated journal cannot be adopted",409,"IDEMPOTENCY_CONFLICT");
    if(w){
      await tx.execute(sql`insert into wallet_transactions(wallet_id,customer_id,transaction_type,amount,currency,balance_before,balance_after,
        description,reference_type,reference_id,status,processed_by,metadata)
        values(${w.id},${w.customer_id},${d.kind==="GOODS"?"credit":"debit"},${v.walletAmount},${w.currency},
          ${v.walletBefore},${v.walletAfter},${d.reason},'accounting_journal',${posted.entry.id},'completed',${actor.actorId},
          ${JSON.stringify({partialReturnId:saved.id,bankApiCalled:false,physicalStockChanged:false})}::json)`);
      await tx.execute(sql`update customer_wallets set balance=${v.walletAfter},updated_at=now(),last_activity_date=now() where id=${w.id}`);
      await reconciled(tx,{...w,balance:v.walletAfter!},d.companyId,liability!);
    }
    await tx.execute(sql`update accounting_partial_return_books set journal_id=${posted.entry.id} where id=${Number(saved.id)}`);
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,"after")
      values(${d.companyId},${actor.actorId},${actor.actorType},'documented_partial_return','partial_return',${String(saved.id)},
        ${JSON.stringify({input:d,valuation:v,journalId:posted.entry.id,originalCountersChanged:false,bankApiCalled:false,
          freightReversed:false,physicalStockChanged:false})}::jsonb)`);
    await tx.execute(sql`set constraints accounting_partial_return_completion_guard,accounting_partial_return_journal_guard,
      accounting_partial_return_ar_guard,
      accounting_balance_header,accounting_balance_lines,accounting_foreign_ar_parity immediate`);
    return {id:Number(saved.id),journalId:posted.entry.id,duplicate:false};
  };
  if(!callerTx)return accountingDb.transaction(run);
  const sp=sql.identifier(`partial_return_${randomUUID().replaceAll("-","")}`);
  await callerTx.execute(sql`savepoint ${sp}`);
  try{const result=await run(callerTx);await callerTx.execute(sql`release savepoint ${sp}`);return result;}
  catch(e){await callerTx.execute(sql`rollback to savepoint ${sp}`);await callerTx.execute(sql`release savepoint ${sp}`);throw e;}
}
const scopeSchema=z.object({companyId:z.coerce.number().int().positive().max(2147483647),
  page:z.coerce.number().int().positive().default(1),pageSize:z.coerce.number().int().min(1).max(100).default(20)}).strict();
export async function readPartialReturnHistory(input:unknown,callerTx?:AccountingTransaction):Promise<PartialReturnHistory>{
  const d=scopeSchema.parse(input),run=async(tx:AccountingTransaction)=>{
    const n=(await tx.execute(sql`select count(*)::integer n from accounting_partial_return_books where company_id=${d.companyId} and journal_id is not null`)).rows[0];
    const rows=(await tx.execute(sql`select id,kind,input->>'entryDate' as "entryDate",source_id as "sourceId",
      input->>'evidenceReference' as "evidenceReference",input->>'reason' reason,input->>'payoutReference' as "payoutReference",
      journal_id as "journalId",valuation from accounting_partial_return_books where company_id=${d.companyId}
      and journal_id is not null order by id desc limit ${d.pageSize} offset ${(d.page-1)*d.pageSize}`)).rows as unknown as PartialReturnHistory["rows"];
    return {rows,pagination:{page:d.page,pageSize:d.pageSize,totalRows:Number(n.n)}};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}
export async function readPartialReturnTargets(input:unknown,callerTx?:AccountingTransaction):Promise<PartialReturnTargets>{
  const d=scopeSchema.pick({companyId:true}).parse(input),run=async(tx:AccountingTransaction)=>{
    const invoices=(await tx.execute(sql`select i.id,i.receivable_id as "receivableId",r.customer_id as "customerId",r.currency,
      r.amount::text as amount,accounting_receivable_open_native(r.id,'infinity'::date)::text as "openAmount",
      (select jsonb_agg(jsonb_build_object('orderItemId',x->'orderItemId','originalTons',x->>'weightTons','returnedTons',
        (select coalesce(sum((q->>'quantityTons')::numeric),0)::text from accounting_partial_return_books p
          cross join lateral jsonb_array_elements(p.valuation->'items') q where p.kind='GOODS' and p.journal_id is not null
          and (p.valuation->>'invoiceId')::integer=i.id and q->>'orderItemId'=x->>'orderItemId')))
        from jsonb_array_elements(i.plan->'amounts'->'lines') x) items
      from accounting_loading_invoices i join accounting_receivable_items r on r.id=i.receivable_id
      where i.company_id=${d.companyId} and not exists(select 1 from accounting_journal_entries j where j.reversal_of_id=i.journal_id)
      order by i.id desc limit 200`)).rows as unknown as PartialReturnTargets["invoices"];
    const receipts=(await tx.execute(sql`select r.id,r.customer_id as "customerId",r.currency,r.method,r.amount::text amount,
      r.wallet_credit::text as "walletCredit",
      (select coalesce(sum((p.valuation->>'amount')::numeric),0)::text from accounting_partial_return_books p
        where p.kind='RECEIPT' and p.journal_id is not null and (p.valuation->>'receiptId')::integer=r.id) as "returnedAmount",
      (select coalesce(sum((p.valuation->>'walletAmount')::numeric),0)::text from accounting_partial_return_books p
        where p.kind='RECEIPT' and p.journal_id is not null and (p.valuation->>'receiptId')::integer=r.id) as "walletReturned",
      coalesce((select jsonb_agg(jsonb_build_object('receivableId',a.receivable_id,'amount',a.amount::text,
        'returnedAmount',(select coalesce(sum((x->>'amount')::numeric),0)::text from accounting_partial_return_books p
          cross join lateral jsonb_array_elements(p.valuation->'restorations') x where p.kind='RECEIPT' and p.journal_id is not null
          and (p.valuation->>'receiptId')::integer=r.id and (x->>'receivableId')::integer=a.receivable_id)))
        from accounting_receipt_allocations a where a.receipt_id=r.id and a.status='active'),'[]'::jsonb) allocations
      from accounting_customer_receipts r where r.company_id=${d.companyId} and r.method in ('BANK','CASH') and r.status='confirmed'
      order by r.id desc limit 200`)).rows as unknown as PartialReturnTargets["receipts"];
    return {companyId:d.companyId,invoices,receipts};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}
