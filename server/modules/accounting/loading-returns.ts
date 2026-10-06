import {createHash,randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {loadingReturnCommandSchema,loadingReturnFiltersSchema,type LoadingReturnPlan,
  type LoadingReturnWorkbench,type LoadingReturnBlocker} from "@shared/accounting-loading-returns";
import type {AccountingAccess} from "@shared/accounting-api";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {assertPipelineManager} from "./loading-invoice-stock";
import {assertLedgerReady} from "./readiness";
import {reverseJournalEntry,postJournalEntry} from "./postJournalEntry";
import {lockedWallet,account,reconciled,nativeMoney} from "./wallet";
import {decimal} from "./money";
import {calculateUnpaidFirstReturn,type LoadingReturnSettlementPolicy} from "@shared/accounting-return-settlement";
type CreditEvidence={amount:string;baseAmount:string;baseCurrency:string;walletId:number|null;
  walletBalance:string|null;minDate:string;valid:boolean;walletAvailable:boolean;receivableAccountId:number;liabilityAccountId:number};
type ReviewedPlan=LoadingReturnPlan&{evidence:Record<string,unknown>;creditEvidence?:CreditEvidence};
async function planWithin(tx:AccountingTransaction,companyId:number,invoiceId:number):Promise<ReviewedPlan>{
  const row=(await tx.execute(sql`select i.id,c.is_active,
    accounting_loading_return_evidence(i.id) as evidence,
    accounting_loading_return_min_date(i.company_id,i.id)::text as min_date,
    (now() at time zone c.timezone)::date::text as today
    from accounting_loading_invoices i join accounting_companies c on c.id=i.company_id
    where i.id=${invoiceId} and i.company_id=${companyId}`)).rows[0];
  if(!row)throw new AccountingError("Loading invoice not found in selected company",404,"NOT_FOUND");
  const e=row.evidence as Record<string,unknown>|null;
  if(!e)throw new AccountingError("Original loading invoice evidence is missing",409,"RETURN_EVIDENCE_MISSING");
  const done=(await tx.execute(sql`select * from accounting_loading_returns
    where company_id=${companyId} and invoice_id=${invoiceId}`)).rows[0];
  if(done){
    if(done.invoice_reversal_id==null)throw new AccountingError("Incomplete return evidence",409,"RETURN_EVIDENCE_MISSING");
    return {...done.plan as ReviewedPlan,postingAllowed:false,returned:{id:Number(done.id),
      invoiceReversalId:Number(done.invoice_reversal_id),
      cogsReversalId:done.cogs_reversal_id==null?null:Number(done.cogs_reversal_id),
       returnDate:String(done.return_date),goodsReceiptReference:String(done.goods_receipt_reference),reason:String(done.reason),
       customerCreditJournalId:done.customer_credit_journal_id==null?null:Number(done.customer_credit_journal_id),
       customerCreditAmount:(done.plan as ReviewedPlan).customerCredit?.amount??"0"}};
  }
  const blockers=new Set<LoadingReturnBlocker>();
  const currencyRow=(await tx.execute(sql`select decimals from accounting_currencies where code=${String(e.currency)} and is_active`)).rows[0];
  let settlementPolicy:LoadingReturnSettlementPolicy|undefined;
  if(currencyRow){
    try{
      const split=calculateUnpaidFirstReturn({invoiceAmount:String(e.originalAmount),
        settledAmount:String(e.settledAmount),returnAmount:String(e.originalAmount),currencyDecimals:Number(currencyRow.decimals)});
      settlementPolicy={kind:"UNPAID_FIRST",invoiceAmount:split.invoiceAmount,
        settledAmount:split.settledAmount,currencyDecimals:Number(currencyRow.decimals)};
    }catch{
      blockers.add("EVIDENCE_MISMATCH");
    }
  }else blockers.add("EVIDENCE_MISMATCH");
  if(!row.is_active)blockers.add("COMPANY_INACTIVE");
  if(e.evidenceValid!==true||e.originalBaseAmount==null||e.quantityTons==null)blockers.add("EVIDENCE_MISMATCH");
   const gate=(await tx.execute(sql`select processing_ready,allow_paid_returns,starts_on::text from accounting_loading_return_cutovers
    where company_id=${companyId}`)).rows[0];
  if(!gate?.processing_ready||!gate.starts_on||String(gate.starts_on)>String(row.today))blockers.add("RETURN_GATE_CLOSED");
   const hasPayments=(await tx.execute(sql`select 1 from accounting_wallet_settlements where receivable_id=${Number(e.receivableId)}
    union select 1 from accounting_loading_invoices where id=${invoiceId}
      and (settlement_id is not null or exists(select 1 from accounting_receivable_items r
         where r.id=receivable_id and r.settled_amount<>0))`)).rows.length>0;
   const hasAllocations=(await tx.execute(sql`select 1 from accounting_receipt_allocations
     where receivable_id=${Number(e.receivableId)} and status='active'`)).rows.length>0;
   let creditEvidence:CreditEvidence|undefined;
   if(hasPayments||hasAllocations){
     if(!gate?.allow_paid_returns){
       blockers.add("PAID_RETURN_GATE_CLOSED");
       if(hasPayments)blockers.add("SETTLEMENT_EXISTS");
       if(hasAllocations)blockers.add("RECEIPT_ALLOCATION_EXISTS");
     }else{
       creditEvidence=(await tx.execute(sql`select accounting_loading_return_credit_evidence(${invoiceId}) e`)).rows[0]?.e as CreditEvidence;
       if(!creditEvidence?.valid)blockers.add("CREDIT_EVIDENCE_MISMATCH");
        if(creditEvidence?.valid&&settlementPolicy){
          const split=calculateUnpaidFirstReturn({...settlementPolicy,returnAmount:settlementPolicy.invoiceAmount});
          if(!decimal(split.customerCredit).eq(creditEvidence.amount))blockers.add("CREDIT_EVIDENCE_MISMATCH");
        }
       if(!creditEvidence?.walletAvailable)blockers.add("CREDIT_WALLET_UNAVAILABLE");
       if(!(await tx.execute(sql`select 1 from accounting_wallet_cutovers w
         join accounting_receipt_cutovers r on r.company_id=w.company_id and r.processing_ready
         where w.company_id=${companyId} and w.pipeline_ready`)).rows.length)blockers.add("PAID_RETURN_GATE_CLOSED");
     }
   }
  if((await tx.execute(sql`select 1 from accounting_journal_entries where reversal_of_id
    in (${Number(e.invoiceJournalId)},${e.cogsJournalId==null?null:Number(e.cogsJournalId)})`)).rows.length)blockers.add("ALREADY_REVERSED");
  if((await tx.execute(sql`select 1 from accounting_journal_lines l join accounting_accounts a on a.id=l.account_id
    where l.entry_id in (${Number(e.invoiceJournalId)},${e.cogsJournalId==null?null:Number(e.cogsJournalId)})
    and (not a.is_active or not a.is_posting or a.company_id<>${companyId})`)).rows.length)blockers.add("ACCOUNT_INACTIVE");
  if((await tx.execute(sql`select accounting_stock_ledger_reconciled(${companyId}) as ok`)).rows[0]?.ok!==true)
    blockers.add("STOCK_RECONCILIATION_REQUIRED");
   const minReturnDate=[String(row.min_date),gate?.starts_on?String(gate.starts_on):String(row.min_date),
     creditEvidence?.minDate??String(row.min_date)].sort().at(-1)!;
  const plan:ReviewedPlan={
    companyId,invoiceId,factId:Number(e.factId),orderId:Number(e.orderId),customerId:Number(e.customerId),
    invoiceJournalId:Number(e.invoiceJournalId),cogsJournalId:e.cogsJournalId==null?null:Number(e.cogsJournalId),
    receivableId:Number(e.receivableId),originalDate:String(e.originalDate),minReturnDate,
    currency:String(e.currency),baseCurrency:String(e.baseCurrency),originalAmount:String(e.originalAmount),
    originalBaseAmount:e.originalBaseAmount==null?null:String(e.originalBaseAmount),
    baseCost:String(e.baseCost),quantityTons:e.quantityTons==null?null:String(e.quantityTons),
     planHash:"",blockers:[...blockers].sort(),postingAllowed:!blockers.size,returned:null,evidence:e,
     ...(settlementPolicy?{settlementPolicy}:{}),
     ...(creditEvidence?{creditEvidence,customerCredit:creditEvidence.walletId?{
       walletId:creditEvidence.walletId,amount:creditEvidence.amount,baseAmount:creditEvidence.baseAmount,
       baseCurrency:creditEvidence.baseCurrency}:undefined}:{}),
  };
  plan.planHash=createHash("sha256").update(JSON.stringify(plan)).digest("hex");
  return plan;
}
export async function readLoadingReturns(input:unknown,callerTx?:AccountingTransaction):Promise<LoadingReturnWorkbench>{
  const parsed=loadingReturnFiltersSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const f=parsed.data,run=async(tx:AccountingTransaction)=>{
    const c=(await tx.execute(sql`select id,name,base_currency from accounting_companies where id=${f.companyId}`)).rows[0];
    if(!c)throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
    const scope=sql`i.company_id=${f.companyId} ${f.orderId?sql`and o.order_id=${f.orderId}`:sql``}`;
    const count=(await tx.execute(sql`select count(*)::integer n from accounting_loading_invoices i
      join accounting_operational_facts o on o.id=i.fact_id where ${scope}`)).rows[0];
    const invoices=(await tx.execute(sql`select i.id from accounting_loading_invoices i
      join accounting_operational_facts o on o.id=i.fact_id where ${scope}
      order by i.id desc limit ${f.pageSize} offset ${(f.page-1)*f.pageSize}`)).rows;
    const rows:LoadingReturnPlan[]=[];
    for(const invoice of invoices)rows.push(await planWithin(tx,f.companyId,Number(invoice.id)));
    const gate=(await tx.execute(sql`select 1 from accounting_loading_return_cutovers g
      join accounting_companies c on c.id=g.company_id and c.is_active
      where g.company_id=${f.companyId} and g.processing_ready`)).rows;
    return {company:{id:Number(c.id),name:String(c.name),baseCurrency:String(c.base_currency)},rows,
      pagination:{page:f.page,pageSize:f.pageSize,totalRows:Number(count.n)},financialGateOpen:gate.length===1};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}
export async function returnLoadingInvoice(input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction){
  const parsed=loadingReturnCommandSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const d=parsed.data,commandHash=createHash("sha256").update(JSON.stringify(d)).digest("hex");
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    await assertPipelineManager(tx,actor);await assertLedgerReady(tx);
    const guards=(await tx.execute(sql`select t.tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
      and c.relname in ('accounting_loading_returns','accounting_loading_return_cutovers','accounting_journal_entries',
        'accounting_wallet_settlements','accounting_receipt_allocations','accounting_receivable_items')
      and t.tgname in ('accounting_loading_return_guard','accounting_loading_return_completion_guard',
        'accounting_loading_return_cutover_guard','accounting_pipeline_reversal_guard',
         'accounting_returned_wallet_settlement_guard','accounting_returned_receipt_allocation_guard','accounting_returned_ar_guard',
         'accounting_loading_credit_completion_guard','accounting_loading_credit_journal_guard','accounting_loading_credit_reversal_guard')
      and t.tgenabled in ('O','A') and not t.tgisinternal`)).rows;
     if(guards.length!==10)throw new AccountingError("Return database guards are missing",503,"RETURN_GUARDS_MISSING");
     const old=(await tx.execute(sql`select id,command_hash,invoice_reversal_id,cogs_reversal_id,customer_credit_journal_id from accounting_loading_returns
      where company_id=${d.companyId} and invoice_id=${d.invoiceId}`)).rows[0];
    if(old){
      if(old.command_hash!==commandHash)throw new AccountingError("Return command cannot be changed",409,"IDEMPOTENCY_CONFLICT");
      return {id:Number(old.id),invoiceReversalId:Number(old.invoice_reversal_id),
       cogsReversalId:old.cogs_reversal_id==null?null:Number(old.cogs_reversal_id),
       customerCreditJournalId:old.customer_credit_journal_id==null?null:Number(old.customer_credit_journal_id),duplicate:true};
    }
    const plan=await planWithin(tx,d.companyId,d.invoiceId);
    if(!plan.postingAllowed)throw new AccountingError(`Return blocked: ${plan.blockers.join(", ")}`,409,"LOADING_RETURN_BLOCKED");
    if(plan.planHash!==d.expectedPlanHash)throw new AccountingError("Return evidence changed; reload and review",409,"STALE_RETURN_PLAN");
     if(plan.customerCredit&&!d.creditToCustomerConfirmed)
       throw new AccountingError("Explicit review of the customer credit is required",409,"CREDIT_CONFIRMATION_REQUIRED");
    if(d.returnDate<plan.minReturnDate)throw new AccountingError("Return cannot precede its invoice or later recorded stock history",409,"RETURN_DATE_INVALID");
    if(!(await tx.execute(sql`select 1 from accounting_companies c join accounting_fiscal_years y
      on y.company_id=c.id and y.status='open' where c.id=${d.companyId}
      and ${d.returnDate}::date between y.starts_on and y.ends_on
      and ${d.returnDate}::date<=(now() at time zone c.timezone)::date`)).rows.length)
      throw new AccountingError("Nonfuture return date in an open fiscal period required",409,"RETURN_DATE_INVALID");
    // The pending command is transaction-local authority, not a bypass flag.
    // Its deferred DB proof cannot commit without both exact monetary reversals.
    await tx.execute(sql`set constraints accounting_foreign_ar_parity,accounting_balance_header,accounting_balance_lines,
       accounting_loading_return_completion_guard,accounting_loading_credit_completion_guard,
       accounting_loading_credit_journal_guard deferred`);
    const saved=(await tx.execute(sql`insert into accounting_loading_returns(company_id,invoice_id,return_date,
      goods_receipt_reference,reason,command_hash,plan,actor_id,actor_type)
      values(${d.companyId},${d.invoiceId},${d.returnDate},${d.goodsReceiptReference},${d.reason},${commandHash},
        ${JSON.stringify(plan)}::jsonb,${actor.actorId},${actor.actorType}) returning id`)).rows[0];
    const reversed=await reverseJournalEntry(plan.invoiceJournalId,d.returnDate,d.reason,actor,tx);
    await tx.execute(sql`set constraints accounting_balance_header,accounting_balance_lines deferred`);
    const cost=plan.cogsJournalId==null?null:await reverseJournalEntry(plan.cogsJournalId,d.returnDate,d.reason,actor,tx);
    if(reversed.duplicate||cost?.duplicate)throw new AccountingError("Existing reversals cannot be adopted without their original return command",409,"RETURN_JOURNAL_CONFLICT");
     let customerCreditJournalId:number|null=null;
     if(plan.customerCredit&&plan.creditEvidence){
       const credit=plan.customerCredit,e=plan.creditEvidence;
       const w=await lockedWallet(tx,credit.walletId,d.companyId);
       await reconciled(tx,w,d.companyId,await account(tx,d.companyId,"WALLET_LIABILITY"));
       if(w.balance!==e.walletBalance&&!decimal(w.balance).eq(e.walletBalance!))
         throw new AccountingError("Customer credit balance changed",409,"STALE_RETURN_PLAN");
       const after=nativeMoney(decimal(w.balance).plus(nativeMoney(credit.amount)).toFixed());
       const posted=await postJournalEntry({companyId:d.companyId,entryDate:d.returnDate,
         sourceType:"LoadingReturnCredit",sourceId:String(saved.id),description:d.reason,lines:[
           {accountId:e.receivableAccountId,currency:plan.currency,debit:credit.amount,credit:"0",partyType:"customer",partyId:plan.customerId},
           {accountId:e.liabilityAccountId,currency:plan.currency,debit:"0",credit:credit.amount,partyType:"customer",partyId:plan.customerId},
         ]},actor,tx);
       customerCreditJournalId=posted.entry.id;
       await tx.execute(sql`insert into wallet_transactions(wallet_id,customer_id,transaction_type,amount,currency,
         balance_before,balance_after,description,reference_type,reference_id,status,processed_by,metadata)
         values(${w.id},${w.customer_id},'credit',${credit.amount},${w.currency},${w.balance},${after},${d.reason},
           'accounting_journal',${customerCreditJournalId},'completed',${actor.actorId},
           ${JSON.stringify({loadingReturnId:saved.id,invoiceId:d.invoiceId,bankPayout:false,
             valuationBasis:"original_receivable_carrying",baseAmount:credit.baseAmount})}::json)`);
       await tx.execute(sql`update customer_wallets set balance=${after},last_activity_date=now(),updated_at=now() where id=${w.id}`);
       await reconciled(tx,{...w,balance:after},d.companyId,e.liabilityAccountId);
     }
     await tx.execute(sql`update accounting_loading_returns set invoice_reversal_id=${reversed.entry.id},
       cogs_reversal_id=${cost?.entry.id??null},customer_credit_journal_id=${customerCreditJournalId} where id=${Number(saved.id)}`);
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,"after")
      values(${d.companyId},${actor.actorId},${actor.actorType},'return_loading_invoice','loading_return',${String(saved.id)},
        ${JSON.stringify({...d,invoiceReversalId:reversed.entry.id,cogsReversalId:cost?.entry.id??null,
           fullReturn:true,physicalStockChanged:false,walletChanged:customerCreditJournalId!=null,orderStatusChanged:false,
           customerCredit:plan.customerCredit??null,customerCreditJournalId,bankPayout:false,originalPaymentsReversed:false,
          incurredFreightReversed:false})}::jsonb)`);
    await tx.execute(sql`set constraints accounting_foreign_ar_parity,accounting_balance_header,accounting_balance_lines,
       accounting_loading_return_completion_guard,accounting_loading_credit_completion_guard,
       accounting_loading_credit_journal_guard immediate`);
     return {id:Number(saved.id),invoiceReversalId:reversed.entry.id,cogsReversalId:cost?.entry.id??null,
       customerCreditJournalId,duplicate:false};
  };
  if(!callerTx)return accountingDb.transaction(run);
  const savepoint=sql.identifier(`loading_return_${randomUUID().replaceAll("-","")}`);
  await callerTx.execute(sql`savepoint ${savepoint}`);
  try{
    const result=await run(callerTx);await callerTx.execute(sql`release savepoint ${savepoint}`);return result;
  }catch(error){
    await callerTx.execute(sql`rollback to savepoint ${savepoint}`);
    await callerTx.execute(sql`release savepoint ${savepoint}`);throw error;
  }
}
