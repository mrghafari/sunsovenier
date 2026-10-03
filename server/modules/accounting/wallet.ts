import {z} from "zod";
import {sql} from "drizzle-orm";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {assertLedgerReady} from "./readiness";
import {decimal,exactMoney} from "./money";
import {postJournalEntry} from "./postJournalEntry";
import {dateString,positiveDecimal,type AccountingAccess} from "@shared/accounting-api";

const id=z.number().int().positive();
export const walletMovementSchema=z.object({
  companyId:id,walletId:id,sourceId:z.string().trim().min(3).max(150),entryDate:dateString,
  amount:positiveDecimal,channel:z.enum(["BANK","GATEWAY"]),
  evidenceReference:z.string().trim().min(5).max(500),
  reason:z.string().trim().min(5).max(500),
}).strict();
type MovementInput=z.input<typeof walletMovementSchema>;
function manager(actor:AccountingAccess) {
  if(!actor.canManage || !Number.isSafeInteger(actor.actorId) || actor.actorId<=0 ||
    !["admin","custom"].includes(actor.actorType)) throw new AccountingError("Wallet management permission required",403,"ACCESS_DENIED");
}
async function ready(tx:AccountingTransaction,companyId:number) {
  await assertLedgerReady(tx);
  const gate=await tx.execute(sql`select enabled_at from accounting_wallet_cutovers
    where company_id=${companyId} and pipeline_ready`);
  if(!gate.rows.length) throw new AccountingError("Wallet financial cutover is blocked until pipeline and opening reconciliation are approved",503,"WALLET_CUTOVER_BLOCKED");
  return gate.rows[0];
}
export async function lockedWallet(tx:AccountingTransaction,walletId:number,companyId:number) {
  const result=await tx.execute(sql`select w.*,l.company_id,c.decimals from customer_wallets w
    join accounting_wallet_links l on l.wallet_id=w.id and l.customer_id=w.customer_id and l.currency=w.currency
    join accounting_currencies c on c.code=w.currency and c.is_active
    where w.id=${walletId} and l.company_id=${companyId} for update of w`);
  const w=result.rows[0];
  if(!w || w.status!=="active") throw new AccountingError("An active, explicitly linked customer wallet is required",409,"WALLET_LINK_REQUIRED");
  return w as typeof w & {id:number;customer_id:number;balance:string;currency:string;decimals:number};
}
export async function account(tx:AccountingTransaction,companyId:number,key:string) {
  const rows=await tx.execute(sql`select a.id,a.type from accounting_posting_rules r
    join accounting_accounts a on a.id=r.account_id and a.company_id=r.company_id and a.is_active and a.is_posting
    where r.company_id=${companyId} and r.key=${key}`);
  const a=rows.rows[0];
  if(!a || a.type!==(key==="WALLET_LIABILITY"?"liability":"asset")) throw new AccountingError(`Configure the ${key} posting account`);
  return a.id as number;
}
export async function available(tx:AccountingTransaction,walletId:number,balance:string) {
  const result=await tx.execute(sql`select
    (select coalesce(sum(amount),0) from accounting_wallet_holds where wallet_id=${walletId} and status='active')::text as held,
    greatest(w.reserved_balance,(select coalesce(sum(amount),0) from wallet_transactions where wallet_id=w.id and status='reserved'))::text as legacy
    from customer_wallets w where w.id=${walletId}`);
  const r=result.rows[0] as {held:string;legacy:string};
  const relation=await tx.execute(sql`select to_regprocedure('accounting_pending_cheque_funds(integer)') as relation`);
  const pending=relation.rows[0].relation?(await tx.execute(sql`select accounting_pending_cheque_funds(${walletId})::text as amount`)).rows[0].amount:"0";
  return decimal(balance).minus(r.held).minus(r.legacy).minus(String(pending));
}
export async function reconciled(tx:AccountingTransaction,w:{customer_id:number;balance:string;currency:string},companyId:number,liability:number) {
  const r=await tx.execute(sql`select coalesce(sum(l.credit-l.debit),0)::text as balance
    from accounting_journal_lines l join accounting_journal_entries e on e.id=l.entry_id and e.status='posted'
    where e.company_id=${companyId} and l.account_id=${liability} and l.party_type='customer'
    and l.party_id=${w.customer_id} and l.currency=${w.currency}`);
  if(!decimal(String(r.rows[0].balance)).eq(w.balance)) throw new AccountingError("Customer balance does not reconcile with company wallet liability",409,"WALLET_RECONCILIATION_REQUIRED");
}
export function nativeMoney(value:string) {
  // Native transaction amounts/before/after are numeric(12,2); never truncate to fit.
  if(decimal(value).gte("10000000000") || decimal(value).decimalPlaces()>2)
    throw new AccountingError("Amount exceeds existing wallet storage precision",422,"NATIVE_WALLET_PRECISION");
  return value;
}
export async function recordWalletMovement(kind:"topup"|"refund",input:MovementInput,actor:AccountingAccess,callerTx?:AccountingTransaction) {
  manager(actor);
  const parsed=walletMovementSchema.safeParse(input);
  if(!parsed.success) throw new AccountingError("Invalid wallet movement; amounts must be exact decimal strings");
  const data=parsed.data;
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    await ready(tx,data.companyId);
    const w=await lockedWallet(tx,data.walletId,data.companyId);
    nativeMoney(w.balance);
    let amount:string;
    try {amount=nativeMoney(exactMoney(data.amount,w.decimals));}
    catch(e){throw new AccountingError(e instanceof Error?e.message:"Invalid currency precision");}
    const normalized={...data,amount};
    const previous=await tx.execute(sql`select id,input,journal_id from accounting_wallet_movements
      where company_id=${data.companyId} and kind=${kind} and source_id=${data.sourceId}`);
    if(previous.rows.length) {
      const same=await tx.execute(sql`select ${JSON.stringify(normalized)}::jsonb=${JSON.stringify(previous.rows[0].input)}::jsonb as same`);
      if(!same.rows[0].same) throw new AccountingError("Wallet source was reused with different data",409,"IDEMPOTENCY_CONFLICT");
      return {movementId:previous.rows[0].id,journalId:previous.rows[0].journal_id,duplicate:true};
    }
    const liability=await account(tx,data.companyId,"WALLET_LIABILITY");
    const funding=await account(tx,data.companyId,data.channel);
    await reconciled(tx,w,data.companyId,liability);
    if(kind==="refund" && (await available(tx,w.id,w.balance)).lt(amount))
      throw new AccountingError("Refund exceeds unblocked customer prepaid balance",409,"INSUFFICIENT_BALANCE");
    const after=nativeMoney((kind==="topup"?decimal(w.balance).plus(amount):decimal(w.balance).minus(amount)).toFixed());
    const {entry}=await postJournalEntry({
      companyId:data.companyId,entryDate:data.entryDate,sourceType:kind==="topup"?"WalletTopUp":"WalletRefund",
      sourceId:data.sourceId,description:data.reason,lines:[
        {accountId:funding,currency:w.currency,debit:kind==="topup"?amount:"0",credit:kind==="refund"?amount:"0"},
        {accountId:liability,currency:w.currency,debit:kind==="refund"?amount:"0",credit:kind==="topup"?amount:"0",
          partyType:"customer",partyId:w.customer_id},
      ],
    },actor,tx);
    const native=await tx.execute(sql`insert into wallet_transactions(wallet_id,customer_id,transaction_type,
      amount,currency,balance_before,balance_after,description,reference_type,reference_id,status,processed_by,metadata)
      values(${w.id},${w.customer_id},${kind==="topup"?"credit":"debit"},${amount},${w.currency},${w.balance},
        ${after},${data.reason},'accounting_journal',${entry.id},'completed',${actor.actorId},
        ${JSON.stringify({evidenceReference:data.evidenceReference,verification:"staff_attestation",channel:data.channel})}::json)
      returning id`);
    await tx.execute(sql`update customer_wallets set balance=${after},last_activity_date=now(),updated_at=now() where id=${w.id}`);
    const movement=await tx.execute(sql`insert into accounting_wallet_movements(company_id,wallet_id,kind,source_id,
      input,amount,journal_id,native_transaction_id) values(${data.companyId},${w.id},${kind},${data.sourceId},
      ${JSON.stringify(normalized)}::jsonb,${amount},${entry.id},${native.rows[0].id}) returning id`);
    await tx.execute(sql`insert into accounting_outbox(company_id,event_type,source_id,payload,status,processed_at)
      values(${data.companyId},${kind==="topup"?"WalletTopUp":"WalletRefund"},${`accounting:${data.sourceId}`},
      ${JSON.stringify({payloadVersion:1,walletId:w.id,customerId:w.customer_id,customerNamespace:"crm_customers",
        amount,currency:w.currency,journalId:entry.id,evidenceReference:data.evidenceReference,verification:"staff_attestation"})}::jsonb,'processed',now())`);
    await reconciled(tx,{...w,balance:after},data.companyId,liability);
    return {movementId:movement.rows[0].id,journalId:entry.id,duplicate:false};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run);
}

export async function shouldDeferWalletCheckout(crmCustomerId:number) {
  const tables=await accountingDb.execute(sql`select to_regclass('public.accounting_wallet_cutovers') as relation`);
  if(!tables.rows[0].relation) return false;
  const gate=await accountingDb.execute(sql`select g.company_id from accounting_source_bindings b
    join accounting_wallet_cutovers g on g.company_id=b.company_id and g.pipeline_ready
    where b.source_module='shop' and b.capture_enabled`);
  if(!gate.rows.length) return false;
  const r=await accountingDb.execute(sql`select w.id from accounting_source_bindings b
    join accounting_wallet_cutovers g on g.company_id=b.company_id and g.pipeline_ready
    join accounting_wallet_links l on l.company_id=b.company_id
    join customer_wallets w on w.id=l.wallet_id and w.customer_id=l.customer_id and w.currency=l.currency
    where b.source_module='shop' and b.capture_enabled and l.customer_id=${crmCustomerId}
    and w.status='active' and w.currency='IQD'`);
  if(r.rows.length!==1) throw new AccountingError("An explicitly authenticated CRM prepaid account link is required",409,"WALLET_LINK_REQUIRED");
  return true;
}
export async function prepareWalletOrder(orderId:number,crmCustomerId:number,callerTx?:AccountingTransaction) {
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const r=await tx.execute(sql`select o.id,o.created_at,o.payment_status,o.payment_method,o.contract_id,
      accounting_order_event_snapshot(o.id) as snapshot,w.id as wallet_id,l.company_id,g.enabled_at
      from customer_orders o join accounting_source_bindings b on b.source_module='shop' and b.capture_enabled
      join accounting_wallet_links l on l.company_id=b.company_id and l.customer_id=${crmCustomerId}
      join customer_wallets w on w.id=l.wallet_id
      join accounting_wallet_cutovers g on g.company_id=l.company_id and g.pipeline_ready
      where o.id=${orderId} for update of o`);
    const row=r.rows[0];
    if(!row) throw new AccountingError("New wallet order is not eligible",409,"WALLET_ORDER_INELIGIBLE");
    const snapshot=row.snapshot as {version:number;currency:string;orderTotal:string;lines:unknown[]};
    if(row.payment_status==="paid" || row.payment_method!=="wallet_full" || row.contract_id ||
      new Date(String(row.created_at)).getTime()<new Date(String(row.enabled_at)).getTime() ||
      snapshot.version!==1 || !snapshot.lines?.length)
      throw new AccountingError("Old, paid, contract or incomplete orders cannot enter the new wallet flow",409,"WALLET_ORDER_INELIGIBLE");
    const w=await lockedWallet(tx,row.wallet_id as number,row.company_id as number);
    if(snapshot.currency!==w.currency) throw new AccountingError("Order and prepaid account currencies must match",409,"WALLET_CURRENCY_MISMATCH");
    if((await available(tx,w.id,w.balance)).lt(snapshot.orderTotal)) throw new AccountingError("Insufficient unblocked prepaid balance",409,"INSUFFICIENT_BALANCE");
    await tx.execute(sql`insert into accounting_wallet_orders(order_id,wallet_id,company_id,snapshot)
      values(${orderId},${w.id},${row.company_id},${JSON.stringify({...snapshot,crmCustomerId,walletTiming:"finance_hold_loading_consume"})}::jsonb)
      on conflict(order_id) do nothing`);
    return {deferred:true};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run);
}

export async function approveWalletOrder(orderId:number,notes:string,actor:AccountingAccess,callerTx?:AccountingTransaction) {
  manager(actor);
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const found=await tx.execute(sql`select o.* from accounting_wallet_orders o where o.order_id=${orderId}`);
    const link=found.rows[0];
    if(!link) throw new AccountingError("New wallet order not found",404,"NOT_FOUND");
    await ready(tx,link.company_id as number);
    const before=await tx.execute(sql`select id,current_status from order_management where customer_order_id=${orderId} for update`);
    const management=before.rows[0];
    if(!management) throw new AccountingError("Native order management is missing",409,"ORDER_MANAGEMENT_MISSING");
    const held=await tx.execute(sql`select status from accounting_wallet_holds where order_id=${orderId}`);
    if(held.rows[0]?.status==="active") return {orderId,holdCreated:true,duplicate:true};
    if(!["finance_pending","financial_pending","pending"].includes(String(management.current_status)))
      throw new AccountingError("Order is not awaiting financial approval",409,"INVALID_ORDER_STATE");
    await tx.execute(sql`update order_management set current_status='warehouse_pending',financial_reviewer_id=${actor.actorId},
      financial_reviewed_at=now(),financial_notes=${notes},updated_at=now() where id=${management.id}`);
    // The BEFORE trigger creates the hold atomically; payment remains pending until actual loading.
    await tx.execute(sql`update customer_orders set status='warehouse_ready',updated_at=now() where id=${orderId}`);
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,after)
      values(${link.company_id},${actor.actorId},${actor.actorType},'approve_prepaid_hold','order',${String(orderId)},
      ${JSON.stringify({notes,holdCreated:true,paymentStatus:"pending"})}::jsonb)`);
    return {orderId,holdCreated:true,duplicate:false};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run);
}

export async function releaseWalletHold(orderId:number,reason:string,actor:AccountingAccess) {
  manager(actor);
  if(typeof reason!=="string" || reason.trim().length<5) throw new AccountingError("A release reason is required");
  return accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const found=await tx.execute(sql`select * from accounting_wallet_holds where order_id=${orderId}`);
    const h=found.rows[0];
    if(!h) throw new AccountingError("Hold not found",404,"NOT_FOUND");
    await ready(tx,h.company_id as number);
    await lockedWallet(tx,h.wallet_id as number,h.company_id as number);
    if(h.status==="released") return {holdId:h.id,duplicate:true};
    await tx.execute(sql`update accounting_wallet_holds set status='released',released_at=now(),release_reason=${reason.trim()} where id=${h.id}`);
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,after)
      values(${h.company_id},${actor.actorId},${actor.actorType},'manual_hold_release','wallet_hold',${String(h.id)},
        ${JSON.stringify({reason:reason.trim()})}::jsonb)`);
    return {holdId:h.id,duplicate:false};
  });
}

export async function newWalletAccountingState(walletId:number):Promise<{held:string;controlled:boolean}> {
  const exists=await accountingDb.execute(sql`select to_regclass('public.accounting_wallet_holds') as relation`);
  if(!exists.rows[0].relation) return {held:"0",controlled:false}; // Pre-migration legacy compatibility, never a financial fallback.
  const r=await accountingDb.execute(sql`select
    (select coalesce(sum(amount),0)::text from accounting_wallet_holds where wallet_id=${walletId} and status='active') as held,
    exists(select 1 from accounting_wallet_links l where l.wallet_id=${walletId} and (
      exists(select 1 from accounting_wallet_cutovers g where g.company_id=l.company_id and g.pipeline_ready)
      or exists(select 1 from accounting_wallet_movements m where m.wallet_id=l.wallet_id)
      or exists(select 1 from accounting_wallet_holds h where h.wallet_id=l.wallet_id and h.status='active'))) as controlled`);
  const pendingFunction=await accountingDb.execute(sql`select to_regprocedure('accounting_pending_cheque_funds(integer)') as relation`);
  if(!pendingFunction.rows[0].relation)return {held:String(r.rows[0].held),controlled:Boolean(r.rows[0].controlled)};
  const state=await accountingDb.execute(sql`select accounting_pending_cheque_funds(${walletId})::text as pending,
    accounting_wallet_controlled(${walletId}) as controlled`);
  return {held:decimal(String(r.rows[0].held)).plus(String(state.rows[0].pending)).toFixed(),controlled:Boolean(state.rows[0].controlled)};
}

export async function linkWallet(companyId:number,walletId:number,actor:AccountingAccess,callerTx?:AccountingTransaction) {
  manager(actor);
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    await assertLedgerReady(tx);
    const r=await tx.execute(sql`select w.id,w.customer_id,w.currency from customer_wallets w
      join accounting_companies c on c.id=${companyId} and c.is_active
      join accounting_currencies curr on curr.code=w.currency and curr.is_active
      where w.id=${walletId} and w.status='active' for update of w`);
    const w=r.rows[0];
    if(!w) throw new AccountingError("Active company and native customer wallet required");
    const old=await tx.execute(sql`select company_id from accounting_wallet_links where wallet_id=${walletId}`);
    if(old.rows.length) {
      if(old.rows[0].company_id!==companyId) throw new AccountingError("Wallet belongs to another company",409,"WALLET_COMPANY_CONFLICT");
      return {walletId,duplicate:true};
    }
    await tx.execute(sql`insert into accounting_wallet_links(wallet_id,company_id,customer_id,currency)
      values(${walletId},${companyId},${w.customer_id},${w.currency})`);
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,after)
      values(${companyId},${actor.actorId},${actor.actorType},'link_customer_prepaid_account','wallet',${String(walletId)},
        ${JSON.stringify({customerId:w.customer_id,customerNamespace:"crm_customers",currency:w.currency,openingBalanceCreated:false})}::jsonb)`);
    return {walletId,duplicate:false};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run);
}