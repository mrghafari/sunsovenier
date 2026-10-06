import {createHash,randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {walletRefundQuoteSchema,walletRefundCommandSchema,type WalletRefundQuote,
  type WalletRefundPlan,type WalletRefundValuation,type WalletRefundHistory} from "@shared/accounting-wallet-refunds";
import {z} from "zod";
import type {AccountingAccess} from "@shared/accounting-api";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {assertLedgerReady} from "./readiness";
import {assertPipelineManager} from "./loading-invoice-stock";
import {lockedWallet,nativeMoney,reconciled,account} from "./wallet";
import {decimal,exactMoney} from "./money";
import {postJournalEntry} from "./postJournalEntry";
async function planWithin(tx:AccountingTransaction,input:WalletRefundQuote):Promise<WalletRefundPlan>{
  const currency=(await tx.execute(sql`select c.decimals from customer_wallets w join accounting_wallet_links l
    on l.wallet_id=w.id and l.customer_id=w.customer_id and l.currency=w.currency
    join accounting_currencies c on c.code=w.currency and c.is_active
    where w.id=${input.walletId} and l.company_id=${input.companyId}`)).rows[0];
  if(!currency)throw new AccountingError("Explicit same-company customer account link required",409,"WALLET_LINK_REQUIRED");
  let amount:string;
  try{amount=nativeMoney(exactMoney(input.amount,Number(currency.decimals)));}
  catch{throw new AccountingError("Invalid refund currency precision",422,"NATIVE_WALLET_PRECISION");}
  const normalized={...input,amount};
  const valuation=(await tx.execute(sql`select accounting_wallet_refund_valuation(${JSON.stringify(normalized)}::jsonb) v`)).rows[0].v as WalletRefundValuation;
  const gate=(await tx.execute(sql`select processing_ready,starts_on::text from accounting_wallet_refund_cutovers
    where company_id=${input.companyId}`)).rows[0];
  const ready=(await tx.execute(sql`select 1 from accounting_wallet_cutovers w
    join accounting_receipt_cutovers r on r.company_id=w.company_id and r.processing_ready
    where w.company_id=${input.companyId} and w.pipeline_ready`)).rows.length===1;
  const financialGateOpen=Boolean(gate?.processing_ready&&gate.starts_on&&ready&&String(gate.starts_on)<=input.entryDate);
  const blockers=[...(!financialGateOpen?["REFUND_GATE_CLOSED"]:[]),...(!valuation.available?[valuation.blockingReason??"REFUND_EVIDENCE_UNAVAILABLE"]:[])];
  const evidence={input:normalized,valuation,financialGateOpen,postingAllowed:!blockers.length,blockers};
  return {...evidence,planHash:createHash("sha256").update(JSON.stringify(evidence)).digest("hex")};
}
export async function readWalletRefundPlan(input:unknown,callerTx?:AccountingTransaction){
  const parsed=walletRefundQuoteSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  return callerTx?planWithin(callerTx,parsed.data):
    accountingDb.transaction(tx=>planWithin(tx,parsed.data),{isolationLevel:"repeatable read",accessMode:"read only"});
}
const historySchema=z.object({companyId:z.coerce.number().int().positive().max(2147483647),
  walletId:z.coerce.number().int().positive().max(2147483647).optional(),
  page:z.coerce.number().int().positive().default(1),pageSize:z.coerce.number().int().min(1).max(100).default(20)}).strict();
export async function readDocumentedWalletRefunds(input:unknown,callerTx?:AccountingTransaction):Promise<WalletRefundHistory>{
  const parsed=historySchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const d=parsed.data,run=async(tx:AccountingTransaction)=>{
    if(!(await tx.execute(sql`select 1 from accounting_companies where id=${d.companyId}`)).rows.length)
      throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
    const scope=sql`company_id=${d.companyId} and journal_id is not null and movement_id is not null
      ${d.walletId?sql`and (input->>'walletId')::integer=${d.walletId}`:sql``}`;
    const total=(await tx.execute(sql`select count(*)::integer n from accounting_wallet_refund_books where ${scope}`)).rows[0];
    const rows=(await tx.execute(sql`select id,(input->>'walletId')::integer as "walletId",input->>'entryDate' as "entryDate",
      input->>'channel' channel,valuation->>'currency' currency,valuation->>'baseCurrency' as "baseCurrency",
      input->>'amount' amount,input->>'payoutReference' as "payoutReference",input->>'evidenceReference' as "evidenceReference",
      input->>'reason' reason,source_id as "sourceId",valuation->>'liabilityBase' as "liabilityBase",
      valuation->>'fundingBase' as "fundingBase",valuation->>'fxGain' as "fxGain",valuation->>'fxLoss' as "fxLoss",
       journal_id as "journalId",movement_id as "movementId",
       (input->>'goodsReturnId')::integer as "goodsReturnId",(input->>'receiptId')::integer as "receiptId"
       from accounting_wallet_refund_books where ${scope}
      order by id desc limit ${d.pageSize} offset ${(d.page-1)*d.pageSize}`)).rows as unknown as WalletRefundHistory["rows"];
    return {rows,pagination:{page:d.page,pageSize:d.pageSize,totalRows:Number(total.n)}};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}
export async function recordDocumentedWalletRefund(input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction){
  const parsed=walletRefundCommandSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    await assertPipelineManager(tx,actor);await assertLedgerReady(tx);
    const guards=(await tx.execute(sql`select tgname from pg_trigger where tgname in
      ('accounting_wallet_refund_cutover_guard','accounting_wallet_refund_book_guard',
       'accounting_wallet_refund_completion_guard','accounting_wallet_refund_journal_guard',
       'accounting_wallet_refund_reversal_guard','accounting_wallet_refund_reference_guard',
       'accounting_wallet_refund_source_guard') and tgenabled in ('O','A') and not tgisinternal`)).rows;
    if(guards.length!==7)throw new AccountingError("Documented payout database guards are missing",503,"REFUND_GUARDS_MISSING");
    const d=parsed.data,w=await lockedWallet(tx,d.walletId,d.companyId);
    let amount:string;
    try{amount=nativeMoney(exactMoney(d.amount,w.decimals));}
    catch{throw new AccountingError("Invalid refund currency precision",422,"NATIVE_WALLET_PRECISION");}
    const normalized={...d,amount};
    const old=(await tx.execute(sql`select id,input,journal_id,movement_id from accounting_wallet_refund_books
      where company_id=${d.companyId} and source_id=${d.sourceId}`)).rows[0];
    if(old){
      const same=(await tx.execute(sql`select ${JSON.stringify(normalized)}::jsonb=${JSON.stringify(old.input)}::jsonb same`)).rows[0].same;
      if(!same)throw new AccountingError("Payout source was reused with different evidence",409,"IDEMPOTENCY_CONFLICT");
      if(old.journal_id==null||old.movement_id==null)throw new AccountingError("Incomplete payout evidence",409,"REFUND_EVIDENCE_UNAVAILABLE");
      return {id:Number(old.id),journalId:Number(old.journal_id),movementId:Number(old.movement_id),duplicate:true};
    }
    if((await tx.execute(sql`select 1 from accounting_wallet_refund_books where company_id=${d.companyId}
      and input->>'channel'=${d.channel} and upper(btrim(input->>'payoutReference'))=${normalized.payoutReference}`)).rows.length)
      throw new AccountingError("This actual bank transaction or cash voucher was already recorded",409,"PAYOUT_REFERENCE_USED");
    const plan=await planWithin(tx,{companyId:d.companyId,walletId:d.walletId,amount:normalized.amount,entryDate:d.entryDate,channel:d.channel,
      ...(d.goodsReturnId!==undefined?{goodsReturnId:d.goodsReturnId}:{}),...(d.receiptId!==undefined?{receiptId:d.receiptId}:{})});
    if(!plan.postingAllowed)throw new AccountingError(`Payout blocked: ${plan.blockers.join(", ")}`,409,"REFUND_BLOCKED");
    if(d.expectedPlanHash!==plan.planHash)throw new AccountingError("Payout balances changed; reload and review",409,"STALE_REFUND_PLAN");
    await reconciled(tx,w,d.companyId,await account(tx,d.companyId,"WALLET_LIABILITY"));
    await tx.execute(sql`set constraints accounting_wallet_refund_completion_guard,accounting_wallet_refund_journal_guard,
      accounting_balance_header,accounting_balance_lines deferred`);
    const book=(await tx.execute(sql`insert into accounting_wallet_refund_books(company_id,source_id,input,valuation,actor_id,actor_type)
      values(${d.companyId},${d.sourceId},${JSON.stringify(normalized)}::jsonb,${JSON.stringify(plan.valuation)}::jsonb,
        ${actor.actorId},${actor.actorType}) returning id`)).rows[0];
    const posted=await postJournalEntry({companyId:d.companyId,entryDate:d.entryDate,sourceType:"WalletRefund",
      sourceId:d.sourceId,description:d.reason,lines:plan.valuation.lines.map(
        ({accountId,currency,debit,credit,partyType,partyId,costCenterId,description})=>
          ({accountId,currency,debit,credit,partyType,partyId,costCenterId,description}))},actor,tx);
    if(posted.duplicate)throw new AccountingError("Existing uncoordinated payout journal cannot be adopted",409,"IDEMPOTENCY_CONFLICT");
    const after=nativeMoney(decimal(w.balance).minus(normalized.amount).toFixed());
    const native=(await tx.execute(sql`insert into wallet_transactions(wallet_id,customer_id,transaction_type,amount,currency,
      balance_before,balance_after,description,reference_type,reference_id,status,processed_by,metadata)
      values(${w.id},${w.customer_id},'debit',${normalized.amount},${w.currency},${w.balance},${after},${d.reason},
        'accounting_journal',${posted.entry.id},'completed',${actor.actorId},
        ${JSON.stringify({refundBookId:book.id,evidenceReference:d.evidenceReference,channel:d.channel,
          verification:"staff_attestation",bankApiCalled:false})}::json) returning id`)).rows[0];
    await tx.execute(sql`update customer_wallets set balance=${after},updated_at=now(),last_activity_date=now() where id=${w.id}`);
    const movement=(await tx.execute(sql`insert into accounting_wallet_movements(company_id,wallet_id,kind,source_id,
      input,amount,journal_id,native_transaction_id) values(${d.companyId},${w.id},'refund',${d.sourceId},
        ${JSON.stringify(normalized)}::jsonb,${normalized.amount},${posted.entry.id},${native.id}) returning id`)).rows[0];
    await tx.execute(sql`update accounting_wallet_refund_books set journal_id=${posted.entry.id},movement_id=${Number(movement.id)} where id=${Number(book.id)}`);
    await reconciled(tx,{...w,balance:after},d.companyId,await account(tx,d.companyId,"WALLET_LIABILITY"));
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,"after")
      values(${d.companyId},${actor.actorId},${actor.actorType},'documented_customer_payout','wallet_refund',${String(book.id)},
        ${JSON.stringify({journalId:posted.entry.id,walletId:w.id,amount:normalized.amount,currency:w.currency,
          evidenceReference:d.evidenceReference,valuation:plan.valuation,bankApiCalled:false,invoiceChanged:false})}::jsonb)`);
    await tx.execute(sql`set constraints accounting_wallet_refund_completion_guard,accounting_wallet_refund_journal_guard,
      accounting_balance_header,accounting_balance_lines immediate`);
    return {id:Number(book.id),journalId:posted.entry.id,movementId:Number(movement.id),duplicate:false};
  };
  if(!callerTx)return accountingDb.transaction(run);
  const sp=sql.identifier(`wallet_refund_${randomUUID().replaceAll("-","")}`);
  await callerTx.execute(sql`savepoint ${sp}`);
  try{const result=await run(callerTx);await callerTx.execute(sql`release savepoint ${sp}`);return result;}
  catch(error){await callerTx.execute(sql`rollback to savepoint ${sp}`);await callerTx.execute(sql`release savepoint ${sp}`);throw error;}
}
