import {z} from "zod";
import {sql} from "drizzle-orm";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {assertLedgerReady} from "./readiness";
import {decimal,exactMoney,Money} from "./money";
import {postJournalEntry,type JournalInput} from "./postJournalEntry";
import {dateString,type AccountingAccess} from "@shared/accounting-api";
import {receiptInputSchema,receiptEventSchema as chequeSchema} from "@shared/accounting-receipts";
export {receiptInputSchema} from "@shared/accounting-receipts";
import {lockedWallet,account,reconciled,nativeMoney,available} from "./wallet";
import {transitionForeignCheque} from "./foreign-cheques";
function manager(a:AccountingAccess){
  if(!a.canManage||!Number.isSafeInteger(a.actorId)||a.actorId<=0||!["admin","custom"].includes(a.actorType))
    throw new AccountingError("Receipt management permission required",403,"ACCESS_DENIED");
}
async function ready(tx:AccountingTransaction,companyId:number,currency:string){
  await assertLedgerReady(tx);
  const r=await tx.execute(sql`select c.base_currency,cc.decimals from accounting_companies c
    join accounting_currencies cc on cc.code=${currency} and cc.is_active
    join accounting_wallet_cutovers w on w.company_id=c.id and w.pipeline_ready
    join accounting_receipt_cutovers g on g.company_id=c.id and g.processing_ready
    where c.id=${companyId} and c.is_active`);
  if(!r.rows.length)throw new AccountingError("Receipt processing is blocked until financial cutover is approved",503,"RECEIPT_CUTOVER_BLOCKED");
  return r.rows[0].decimals as number;
}
async function same(tx:AccountingTransaction,a:unknown,b:unknown){
  const r=await tx.execute(sql`select ${JSON.stringify(a)}::jsonb=${JSON.stringify(b)}::jsonb as same`);
  if(!r.rows[0].same)throw new AccountingError("Receipt source reused with different data",409,"IDEMPOTENCY_CONFLICT");
}
async function walletForCustomer(tx:AccountingTransaction,companyId:number,customerId:number,currency:string){
  const r=await tx.execute(sql`select l.wallet_id from accounting_wallet_links l where l.company_id=${companyId}
    and l.customer_id=${customerId} and l.currency=${currency}`);
  if(r.rows.length!==1)throw new AccountingError("Unallocated funds require an explicitly linked same-currency CRM wallet",409,"WALLET_LINK_REQUIRED");
  return lockedWallet(tx,r.rows[0].wallet_id as number,companyId);
}
async function walletDelta(tx:AccountingTransaction,w:Awaited<ReturnType<typeof lockedWallet>>,companyId:number,
  journalId:number,amount:string,direction:"credit"|"debit",actor:AccountingAccess,reason:string,metadata:unknown){
  if(decimal(amount).isZero())return;
  nativeMoney(w.balance);nativeMoney(amount);
  const after=nativeMoney((direction==="credit"?decimal(w.balance).plus(amount):decimal(w.balance).minus(amount)).toFixed());
  await tx.execute(sql`insert into wallet_transactions(wallet_id,customer_id,transaction_type,amount,currency,
    balance_before,balance_after,description,reference_type,reference_id,status,processed_by,metadata)
    values(${w.id},${w.customer_id},${direction},${amount},${w.currency},${w.balance},${after},${reason},
      'accounting_journal',${journalId},'completed',${actor.actorId},${JSON.stringify(metadata)}::json)`);
  await tx.execute(sql`update customer_wallets set balance=${after},last_activity_date=now(),updated_at=now() where id=${w.id}`);
  await reconciled(tx,{...w,balance:after},companyId,await account(tx,companyId,"WALLET_LIABILITY"));
}
async function audit(tx:AccountingTransaction,companyId:number,actor:AccountingAccess,action:string,receiptId:number,data:unknown){
  await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,after)
    values(${companyId},${actor.actorId},${actor.actorType},${action},'customer_receipt',${String(receiptId)},${JSON.stringify(data)}::jsonb)`);
}
// Trusted invoice integration, not a route accepting invented amounts.
export async function registerInvoiceReceivable(input:{companyId:number;customerId:number;currency:string;
  invoiceJournalId:number;invoiceReference:string;dueOn:string;orderId?:number},actor:AccountingAccess,tx:AccountingTransaction){
  manager(actor);dateString.parse(input.dueOn);
  await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
   await ready(tx,input.companyId,input.currency);
  const existing=await tx.execute(sql`select * from accounting_receivable_items where company_id=${input.companyId}
    and invoice_journal_id=${input.invoiceJournalId} and customer_id=${input.customerId} and currency=${input.currency}`);
  if(existing.rows.length){
    const r=existing.rows[0];
    if(r.due_on!==input.dueOn||r.invoice_reference!==input.invoiceReference||Number(r.order_id||0)!==Number(input.orderId||0))
      throw new AccountingError("Invoice receivable source conflicts",409,"IDEMPOTENCY_CONFLICT");
    return r;
  }
  const ar=await account(tx,input.companyId,"ACCOUNTS_RECEIVABLE");
  const journal=await tx.execute(sql`select e.entry_date,coalesce(sum(l.debit-l.credit),0)::text as amount
    from accounting_journal_entries e join accounting_journal_lines l on l.entry_id=e.id
    join accounting_wallet_cutovers g on g.company_id=e.company_id and e.created_at>=g.enabled_at
    where e.id=${input.invoiceJournalId} and e.company_id=${input.companyId} and e.status='posted'
    and e.source_type in ('LoadingCompleted','SalesInvoice') and l.account_id=${ar}
    and l.party_type='customer' and l.party_id=${input.customerId} and l.currency=${input.currency}
    group by e.entry_date`);
  const j=journal.rows[0];
  if(!j||!decimal(String(j.amount)).gt(0))throw new AccountingError("A posted new invoice with a matching CRM receivable debit must exist first",409,"POSTED_INVOICE_REQUIRED");
  if(input.dueOn<String(j.entry_date))throw new AccountingError("Due date cannot precede invoice date");
  const created=await tx.execute(sql`insert into accounting_receivable_items(company_id,customer_id,currency,
    invoice_journal_id,invoice_reference,order_id,issued_on,due_on,amount) values(${input.companyId},${input.customerId},
    ${input.currency},${input.invoiceJournalId},${input.invoiceReference},${input.orderId??null},${j.entry_date},${input.dueOn},${j.amount}) returning *`);
  return created.rows[0];
}
export async function recordCustomerReceipt(input:z.input<typeof receiptInputSchema>,actor:AccountingAccess,callerTx?:AccountingTransaction){
  manager(actor);const parsed=receiptInputSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const precision=await ready(tx,parsed.data.companyId,parsed.data.currency);
    const d={...parsed.data,amount:exactMoney(parsed.data.amount,precision),allocations:parsed.data.allocations
      .map(a=>({...a,amount:exactMoney(a.amount,precision)})).sort((a,b)=>a.receivableId-b.receivableId)};
    const previous=await tx.execute(sql`select * from accounting_customer_receipts where company_id=${d.companyId} and source_id=${d.sourceId}`);
    if(previous.rows.length){await same(tx,d,previous.rows[0].input);return {receipt:previous.rows[0],duplicate:true};}
    let total=decimal("0");
    for(const a of d.allocations){
      const result=await tx.execute(sql`select * from accounting_receivable_items where id=${a.receivableId} for update`);
      const r=result.rows[0];
      if(!r||r.company_id!==d.companyId||r.customer_id!==d.customerId||r.currency!==d.currency)
        throw new AccountingError("Allocations must share company, CRM customer and currency",409,"RECEIVABLE_MISMATCH");
      const issued=await tx.execute(sql`select id from accounting_journal_entries e
        where e.id=${r.invoice_journal_id} and e.company_id=${d.companyId} and e.status='posted'
          and not exists(select 1 from accounting_journal_entries rev where rev.reversal_of_id=e.id and rev.status='posted')`);
      if(!issued.rows.length)throw new AccountingError("A posted, unreversed invoice receivable is required",409,"POSTED_INVOICE_REQUIRED");
      if(d.entryDate<String(r.issued_on))throw new AccountingError("Receipt cannot settle an invoice before its issue date");
      if(decimal(a.amount).gt(decimal(String(r.amount)).minus(String(r.settled_amount))))
        throw new AccountingError("Allocation exceeds open invoice amount",409,"OVER_SETTLEMENT");
      total=total.plus(a.amount);
    }
    if(total.gt(d.amount))throw new AccountingError("Allocations exceed the actual receipt amount",409,"OVER_ALLOCATION");
    const excess=decimal(d.amount).minus(total).toFixed();
    const wallet=decimal(excess).gt(0)?await walletForCustomer(tx,d.companyId,d.customerId,d.currency):null;
    const liability=wallet?await account(tx,d.companyId,"WALLET_LIABILITY"):null;
    if(wallet)await reconciled(tx,wallet,d.companyId,liability!);
    const funding=await account(tx,d.companyId,d.method==="CHEQUE"?"CHEQUES_ON_HAND":d.method);
    const ar=await account(tx,d.companyId,"ACCOUNTS_RECEIVABLE");
    const baseCurrency=String((await tx.execute(sql`select base_currency from accounting_companies where id=${d.companyId}`)).rows[0].base_currency);
    const foreign=d.currency!==baseCurrency;
    if(foreign)await tx.execute(sql`set constraints accounting_receipt_book_used,accounting_foreign_receipt_complete deferred`);
    const receipt=(await tx.execute(sql`insert into accounting_customer_receipts(company_id,customer_id,currency,source_id,
      entry_date,method,amount,wallet_credit,wallet_id,input,status) values(${d.companyId},${d.customerId},${d.currency},${d.sourceId},
      ${d.entryDate},${d.method},${d.amount},${excess},${wallet?.id??null},${JSON.stringify(d)}::jsonb,
      ${d.method==="CHEQUE"?"received":"confirmed"}) returning *`)).rows[0];
    const book=foreign?(await tx.execute(sql`insert into accounting_receipt_book_values(receipt_id) values(${receipt.id}) returning *`)).rows[0]:undefined;
    const difference=book?decimal(String(book.receivable_base)).plus(String(book.wallet_base)).minus(String(book.funding_base)):decimal("0");
    const lines:JournalInput["lines"]=[{accountId:funding,currency:d.currency,debit:d.amount,credit:"0"}];
    if(total.gt(0))lines.push({accountId:ar,currency:d.currency,debit:"0",credit:total.toFixed(),partyType:"customer",partyId:d.customerId});
    if(wallet)lines.push({accountId:liability!,currency:d.currency,debit:"0",credit:excess,partyType:"customer",partyId:d.customerId});
    if(!difference.isZero())lines.push({accountId:book!.fx_account_id as number,currency:baseCurrency,
      debit:difference.gt(0)?difference.toFixed():"0",credit:difference.lt(0)?difference.abs().toFixed():"0",
      description:"Realized FX on confirmed receipt and historical receivable"});
    const {entry}=await postJournalEntry({companyId:d.companyId,entryDate:d.entryDate,sourceType:"PaymentReceived",
      sourceId:d.sourceId,description:d.reason,lines},actor,tx);
    for(const a of d.allocations){
      await tx.execute(sql`insert into accounting_receipt_allocations(receipt_id,receivable_id,amount) values(${receipt.id},${a.receivableId},${a.amount})`);
      await tx.execute(sql`update accounting_receivable_items set settled_amount=settled_amount+${a.amount}::numeric where id=${a.receivableId}`);
    }
    if(wallet)await walletDelta(tx,wallet,d.companyId,entry.id,excess,"credit",actor,d.reason,
      {receiptId:receipt.id,evidenceReference:d.evidenceReference,verification:"staff_attestation",provisional:d.method==="CHEQUE"});
    await tx.execute(sql`insert into accounting_receipt_events(receipt_id,action,source_id,input,journal_id)
      values(${receipt.id},'received',${d.sourceId},${JSON.stringify(d)}::jsonb,${entry.id})`);
    const bookValues=book?{baseCurrency,assetBaseBooked:String(book.funding_base),receivableBaseSettled:String(book.receivable_base),
      walletBaseCredited:String(book.wallet_base),officialRate:String(book.official_rate),allocations:book.allocations,
      realizedFx:{gain:difference.lt(0)?difference.abs().toFixed():"0",loss:difference.gt(0)?difference.toFixed():"0"}}:undefined;
    await audit(tx,d.companyId,actor,"record_customer_receipt",receipt.id as number,{...d,journalId:entry.id,walletCredit:excess,bookValues});
    await tx.execute(sql`insert into accounting_outbox(company_id,event_type,source_id,payload,status,processed_at)
      values(${d.companyId},'PaymentReceived',${`receipt:${d.sourceId}`},${JSON.stringify({receiptId:receipt.id,journalId:entry.id,
        amount:d.amount,currency:d.currency,method:d.method,verification:"staff_attestation",
        fundsAvailability:d.method==="CHEQUE"?"uncleared":"confirmed",postingEligible:false,bookValues})}::jsonb,'processed',now())`);
    if(foreign)await tx.execute(sql`set constraints accounting_receipt_book_used,accounting_foreign_receipt_complete,
      accounting_foreign_ar_parity immediate`);
    return {receipt,journalId:entry.id,bookValues,duplicate:false};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run);
}
export async function transitionCheque(receiptId:number,action:"deposited"|"cleared"|"bounced",
  input:z.input<typeof chequeSchema>,actor:AccountingAccess,callerTx?:AccountingTransaction){
  manager(actor);const parsed=chequeSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const d=parsed.data;
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const r=(await tx.execute(sql`select * from accounting_customer_receipts where id=${receiptId} for update`)).rows[0];
    if(!r||r.method!=="CHEQUE")throw new AccountingError("Cheque receipt not found",404,"NOT_FOUND");
    await ready(tx,r.company_id as number,String(r.currency));
    const existing=await tx.execute(sql`select * from accounting_receipt_events where receipt_id=${receiptId} and action=${action}`);
    if(existing.rows.length){await same(tx,d,existing.rows[0].input);return {receiptId,status:r.status,journalId:existing.rows[0].journal_id,duplicate:true};}
    if(action==="deposited"&&r.status!=="received"||action==="cleared"&&r.status!=="deposited"||
      action==="bounced"&&!["received","deposited","cleared"].includes(String(r.status)))
      throw new AccountingError("Invalid cheque lifecycle transition",409,"INVALID_CHEQUE_STATE");
    const latest=await tx.execute(sql`select e.entry_date from accounting_receipt_events ev
      join accounting_journal_entries e on e.id=ev.journal_id where ev.receipt_id=${receiptId} order by ev.id desc limit 1`);
    if(d.entryDate<String(latest.rows[0]?.entry_date||r.entry_date))throw new AccountingError("Cheque event date cannot precede its previous event");
    const baseCurrency=String((await tx.execute(sql`select base_currency from accounting_companies where id=${r.company_id}`)).rows[0].base_currency);
    if(String(r.currency)!==baseCurrency)return transitionForeignCheque(tx,receiptId,action,d,actor);
    const company=r.company_id as number,customer=r.customer_id as number,currency=String(r.currency),amount=String(r.amount);
    let lines:JournalInput["lines"]=[];
    let wallet:Awaited<ReturnType<typeof lockedWallet>>|null=null,recover="0",newDebt="0";
    const allocations=(await tx.execute(sql`select * from accounting_receipt_allocations where receipt_id=${receiptId} order by receivable_id`)).rows;
    if(action==="deposited")lines=[
      {accountId:await account(tx,company,"CHEQUE_CLEARING"),currency,debit:amount,credit:"0"},
      {accountId:await account(tx,company,"CHEQUES_ON_HAND"),currency,debit:"0",credit:amount}];
    if(action==="cleared")lines=[
      {accountId:await account(tx,company,"BANK"),currency,debit:amount,credit:"0"},
      {accountId:await account(tx,company,"CHEQUE_CLEARING"),currency,debit:"0",credit:amount}];
    if(action==="bounced"){
      const excess=String(r.wallet_credit);
      if(decimal(excess).gt(0)){
        wallet=await lockedWallet(tx,r.wallet_id as number,company);
        await reconciled(tx,wallet,company,await account(tx,company,"WALLET_LIABILITY"));
        recover=r.status==="cleared"?Money.min(decimal(excess),await available(tx,wallet.id,wallet.balance)).toFixed():excess;
        newDebt=decimal(excess).minus(recover).toFixed();
      }
      const allocated=allocations.reduce((s,a)=>s.plus(String(a.amount)),decimal("0"));
      const ar=await account(tx,company,"ACCOUNTS_RECEIVABLE");
      if(allocated.gt(0))lines.push({accountId:ar,currency,debit:allocated.toFixed(),credit:"0",partyType:"customer",partyId:customer});
      if(decimal(newDebt).gt(0))lines.push({accountId:ar,currency,debit:newDebt,credit:"0",partyType:"customer",partyId:customer});
      if(wallet&&decimal(recover).gt(0))lines.push({accountId:await account(tx,company,"WALLET_LIABILITY"),currency,
        debit:recover,credit:"0",partyType:"customer",partyId:customer});
      lines.push({accountId:await account(tx,company,r.status==="cleared"?"BANK":r.status==="deposited"?"CHEQUE_CLEARING":"CHEQUES_ON_HAND"),
        currency,debit:"0",credit:amount});
    }
    const {entry}=await postJournalEntry({companyId:company,entryDate:d.entryDate,sourceType:action==="bounced"?"ChequeBounced":
      action==="cleared"?"ChequeCleared":"ChequeDeposited",sourceId:`${receiptId}:${d.sourceId}`,description:d.reason,lines},actor,tx);
    await tx.execute(sql`update accounting_customer_receipts set status=${action} where id=${receiptId}`);
    if(action==="bounced"){
      for(const a of allocations){
        await tx.execute(sql`select id from accounting_receivable_items where id=${a.receivable_id} for update`);
        await tx.execute(sql`update accounting_receivable_items set settled_amount=settled_amount-${a.amount}::numeric where id=${a.receivable_id}`);
        await tx.execute(sql`update accounting_receipt_allocations set status='bounced' where id=${a.id}`);
      }
      if(wallet&&decimal(recover).gt(0))await walletDelta(tx,wallet,company,entry.id,recover,"debit",actor,d.reason,
        {receiptId,verification:"staff_attestation",evidenceReference:d.evidenceReference,chargeback:true});
      if(decimal(newDebt).gt(0))await tx.execute(sql`insert into accounting_receivable_items(company_id,customer_id,currency,
        invoice_journal_id,invoice_reference,issued_on,due_on,amount) values(${company},${customer},${currency},${entry.id},
        ${`Cheque return ${receiptId}`},${d.entryDate},${d.entryDate},${newDebt})`);
    }
    await tx.execute(sql`insert into accounting_receipt_events(receipt_id,action,source_id,input,journal_id)
      values(${receiptId},${action},${d.sourceId},${JSON.stringify(d)}::jsonb,${entry.id})`);
    await audit(tx,company,actor,`cheque_${action}`,receiptId,{...d,journalId:entry.id,recoveredWalletAmount:recover,newReceivable:newDebt});
    return {receiptId,status:action,journalId:entry.id,recoveredWalletAmount:recover,newReceivable:newDebt,duplicate:false};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run);
}
export async function readReceivables(companyId:number){
  const r=await accountingDb.execute(sql`select r.*,
    case when exists(select 1 from accounting_journal_entries x where x.reversal_of_id=r.invoice_journal_id and x.status='posted')
      then '0' else (r.amount-r.settled_amount)::text end as open_amount,
    case when exists(select 1 from accounting_journal_entries x where x.reversal_of_id=r.invoice_journal_id and x.status='posted')
      then 'reversed' when r.settled_amount=r.amount then 'settled' when r.settled_amount>0 then 'partial' else 'open' end as status
    from accounting_receivable_items r where r.company_id=${companyId} order by r.due_on,r.id`);
  return r.rows;
}
// Full, evidence-backed return of one actual BANK/CASH receipt, not a wallet refund.
// Partial refunds and arbitrary outbound amounts are intentionally not accepted here.
export async function returnCustomerReceipt(receiptId:number,input:z.input<typeof chequeSchema>,
  actor:AccountingAccess,callerTx?:AccountingTransaction){
  manager(actor);
  if(!Number.isSafeInteger(receiptId)||receiptId<=0)throw new AccountingError("Valid receipt ID required");
  const parsed=chequeSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const d=parsed.data;
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const r=(await tx.execute(sql`select * from accounting_customer_receipts where id=${receiptId} for update`)).rows[0];
    if(!r||!["BANK","CASH"].includes(String(r.method)))throw new AccountingError("Bank/cash receipt not found",404,"NOT_FOUND");
    await ready(tx,Number(r.company_id),String(r.currency));
    const old=(await tx.execute(sql`select * from accounting_receipt_events where receipt_id=${receiptId} and action='returned'`)).rows[0];
    if(old){await same(tx,d,old.input);return {receiptId,status:r.status,journalId:old.journal_id,duplicate:true};}
    if(r.status!=="confirmed")throw new AccountingError("Only a confirmed receipt can be returned",409,"INVALID_RECEIPT_STATE");
    return transitionForeignCheque(tx,receiptId,"returned",d,actor);
  };
  return callerTx?run(callerTx):accountingDb.transaction(run);
}