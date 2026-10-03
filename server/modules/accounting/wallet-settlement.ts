import {z} from "zod";
import {sql} from "drizzle-orm";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {assertLedgerReady} from "./readiness";
import {account,available,lockedWallet,nativeMoney,reconciled} from "./wallet";
import {decimal,exactMoney} from "./money";
import {postJournalEntry,type JournalInput} from "./postJournalEntry";
import {dateString,positiveDecimal,type AccountingAccess} from "@shared/accounting-api";

const id=z.number().int().positive();
export const walletSettlementSchema=z.object({
  companyId:id,walletId:id,receivableId:id,holdId:id.optional(),
  sourceId:z.string().trim().min(3).max(150),entryDate:dateString,
  amount:positiveDecimal,reason:z.string().trim().min(5).max(500),
}).strict();

// No invented invoice, automatic paid transition, price/stock change or legacy backfill.
export async function settleWalletReceivable(input:z.input<typeof walletSettlementSchema>,actor:AccountingAccess,
  callerTx?:AccountingTransaction){
  if(!actor.canManage||!Number.isSafeInteger(actor.actorId)||actor.actorId<=0||
    !["admin","custom"].includes(actor.actorType))throw new AccountingError("Settlement management permission required",403,"ACCESS_DENIED");
  const parsed=walletSettlementSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    await assertLedgerReady(tx);
    const gate=(await tx.execute(sql`select c.base_currency from accounting_companies c
      join accounting_wallet_cutovers w on w.company_id=c.id and w.pipeline_ready
      join accounting_receipt_cutovers g on g.company_id=c.id and g.processing_ready
      where c.id=${parsed.data.companyId} and c.is_active`)).rows[0];
    if(!gate)throw new AccountingError("Settlement is blocked until financial cutover is approved",503,"SETTLEMENT_CUTOVER_BLOCKED");
    const w=await lockedWallet(tx,parsed.data.walletId,parsed.data.companyId);
    const d={...parsed.data,amount:nativeMoney(exactMoney(parsed.data.amount,w.decimals))};
    const old=(await tx.execute(sql`select * from accounting_wallet_settlements
      where company_id=${d.companyId} and source_id=${d.sourceId}`)).rows[0];
    if(old){
      const same=(await tx.execute(sql`select ${JSON.stringify(d)}::jsonb=${JSON.stringify(old.input)}::jsonb as same`)).rows[0].same;
      if(!same)throw new AccountingError("Settlement source reused with different data",409,"IDEMPOTENCY_CONFLICT");
      return {settlementId:old.id,journalId:old.journal_id,duplicate:true};
    }
    const r=(await tx.execute(sql`select r.*,e.source_type,e.source_id from accounting_receivable_items r
      join accounting_journal_entries e on e.id=r.invoice_journal_id and e.status='posted'
      join accounting_wallet_cutovers g on g.company_id=e.company_id and e.created_at>=g.enabled_at
      where r.id=${d.receivableId} and r.company_id=${d.companyId} and e.company_id=r.company_id
      and e.source_type in ('LoadingCompleted','SalesInvoice','ChequeBounced','ReceiptReturned')
      and not exists(select 1 from accounting_journal_entries v where v.reversal_of_id=e.id)
      for update of r`)).rows[0];
    if(!r||r.customer_id!==w.customer_id||r.currency!==w.currency)
      throw new AccountingError("A posted, unreversed, same-company/CRM/currency receivable is required",409,"RECEIVABLE_MISMATCH");
    if(d.entryDate<String(r.issued_on))throw new AccountingError("Settlement cannot precede invoice date");
    const open=decimal(String(r.amount)).minus(String(r.settled_amount));
    if(decimal(d.amount).gt(open))throw new AccountingError("Settlement exceeds the open receivable",409,"OVER_SETTLEMENT");
    const liability=await account(tx,d.companyId,"WALLET_LIABILITY");
    const ar=await account(tx,d.companyId,"ACCOUNTS_RECEIVABLE");
    const issued=(await tx.execute(sql`select coalesce(sum(debit-credit),0)::text as amount
      from accounting_journal_lines where entry_id=${r.invoice_journal_id} and account_id=${ar}
      and party_type='customer' and party_id=${w.customer_id} and currency=${w.currency}`)).rows[0];
    if(!decimal(String(issued.amount)).gte(String(r.amount)))
      throw new AccountingError("Receivable account mapping needs reconciliation",409,"AR_RECONCILIATION_REQUIRED");
    await reconciled(tx,w,d.companyId,liability);
    let hold:Record<string,unknown>|undefined,remaining=decimal("0");
    if(d.holdId){
      hold=(await tx.execute(sql`select * from accounting_wallet_holds where id=${d.holdId} for update`)).rows[0];
      if(!hold||hold.status!=="active"||hold.company_id!==d.companyId||hold.wallet_id!==w.id||
        hold.currency!==w.currency||hold.order_id!==r.order_id||r.source_type!=="LoadingCompleted")
        throw new AccountingError("Order hold requires its own posted loading invoice",409,"HOLD_INVOICE_MISMATCH");
      const loading=(await tx.execute(sql`select id from accounting_operational_facts where company_id=${d.companyId}
        and order_id=${hold.order_id} and event_type='LoadingCompleted' and source_id=${r.source_id}
        and (payload->'input'->>'eventDate')::date<=${d.entryDate}::date`)).rows[0];
      if(!loading)throw new AccountingError("Persisted measured loading must match the invoice source",409,"LOADING_FACT_REQUIRED");
      remaining=decimal(String(hold.amount)).minus(String(hold.consumed_amount));
    }
    if((await available(tx,w.id,w.balance)).plus(remaining).lt(d.amount))
      throw new AccountingError("Settlement exceeds usable prepaid funds; other holds and uncleared cheques stay blocked",409,"INSUFFICIENT_BALANCE");
    const consumed=decimal(d.amount).gt(remaining)?remaining:decimal(d.amount);
    const after=nativeMoney(decimal(w.balance).minus(d.amount).toFixed());
    await tx.execute(sql`set constraints accounting_wallet_settlement_native_evidence,
      accounting_wallet_settlement_journal_evidence,accounting_wallet_book_used deferred`);
    const book=w.currency!==gate.base_currency?(await tx.execute(sql`insert into accounting_wallet_book_values
      (company_id,source_id,entry_date,wallet_id,receivable_id,amount)
      values(${d.companyId},${d.sourceId},${d.entryDate},${w.id},${r.id},${d.amount}) returning *`)).rows[0]:undefined;
    const lines:JournalInput["lines"]=[
      {accountId:liability,currency:w.currency,debit:d.amount,credit:"0",partyType:"customer",partyId:w.customer_id},
      {accountId:ar,currency:w.currency,debit:"0",credit:d.amount,partyType:"customer",partyId:w.customer_id},
    ];
    const difference=book?decimal(String(book.receivable_base)).minus(String(book.wallet_base)):decimal("0");
    if(!difference.isZero())lines.push({accountId:book!.fx_account_id as number,currency:String(gate.base_currency),
      debit:difference.gt(0)?difference.toFixed():"0",credit:difference.lt(0)?difference.abs().toFixed():"0",
      description:"Realized FX on historical wallet/receivable carrying values"});
    const {entry}=await postJournalEntry({companyId:d.companyId,entryDate:d.entryDate,
      sourceType:"WalletSettlement",sourceId:d.sourceId,description:d.reason,lines},actor,tx);
    const saved=(await tx.execute(sql`insert into accounting_wallet_settlements(company_id,wallet_id,receivable_id,
      hold_id,hold_consumed_amount,source_id,input,amount,currency,journal_id,created_by,actor_type)
      values(${d.companyId},${w.id},${r.id},${d.holdId??null},${consumed.toFixed()},${d.sourceId},
        ${JSON.stringify(d)}::jsonb,${d.amount},${w.currency},${entry.id},${actor.actorId},${actor.actorType}) returning id`)).rows[0];
    if(hold){
      const total=decimal(String(hold.consumed_amount)).plus(consumed);
      await tx.execute(sql`update accounting_wallet_holds set consumed_amount=${total.toFixed()},
        status=${total.eq(String(hold.amount))?"consumed":"active"} where id=${hold.id}`);
    }
    await tx.execute(sql`insert into wallet_transactions(wallet_id,customer_id,transaction_type,amount,currency,
      balance_before,balance_after,description,reference_type,reference_id,status,processed_by,metadata)
      values(${w.id},${w.customer_id},'debit',${d.amount},${w.currency},${w.balance},${after},${d.reason},
        'accounting_journal',${entry.id},'completed',${actor.actorId},
        ${JSON.stringify({settlementId:saved.id,receivableId:r.id,holdId:d.holdId??null,holdConsumed:consumed.toFixed()})}::json)`);
    await tx.execute(sql`update customer_wallets set balance=${after},last_activity_date=now(),updated_at=now() where id=${w.id}`);
    await tx.execute(sql`update accounting_receivable_items set settled_amount=settled_amount+${d.amount}::numeric where id=${r.id}`);
    await reconciled(tx,{...w,balance:after},d.companyId,liability);
    const payload={...d,settlementId:saved.id,journalId:entry.id,currency:w.currency,holdConsumed:consumed.toFixed(),
      remainingHeld:remaining.minus(consumed).toFixed(),remainingReceivable:open.minus(d.amount).toFixed(),
      balance:after,postingEligible:false,
      valuationBasis:book?"historical_carrying":"official_rate",
      walletBaseSettled:book?String(book.wallet_base):d.amount,receivableBaseSettled:book?String(book.receivable_base):d.amount,
      baseCurrency:String(gate.base_currency),
      realizedFx:{gain:difference.lt(0)?difference.abs().toFixed():"0",loss:difference.gt(0)?difference.toFixed():"0"}};
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,after)
      values(${d.companyId},${actor.actorId},${actor.actorType},'settle_wallet_receivable','wallet_settlement',${String(saved.id)},${JSON.stringify(payload)}::jsonb)`);
    await tx.execute(sql`insert into accounting_outbox(company_id,event_type,source_id,payload,status,processed_at)
      values(${d.companyId},'WalletSettlement',${`wallet-settlement:${d.sourceId}`},${JSON.stringify(payload)}::jsonb,'processed',now())`);
    await tx.execute(sql`set constraints accounting_wallet_settlement_native_evidence,
      accounting_wallet_settlement_journal_evidence,accounting_wallet_book_used,accounting_foreign_ar_parity immediate`);
    return {...payload,duplicate:false};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run);
}