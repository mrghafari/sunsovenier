import {z} from "zod";
import {sql} from "drizzle-orm";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {lockedWallet} from "./wallet";
import {readCreditExposure} from "./credit-exposure";
import {decimal,exactMoney} from "./money";
import type {AccountingAccess} from "@shared/accounting-api";
import {assertLedgerReady} from "./readiness";

const id=z.number().int().positive();
export const creditOrderSchema=z.object({
  companyId:id,walletId:id,orderId:id,evidenceReference:z.string().trim().min(5).max(500),
}).strict();
function manager(actor:AccountingAccess){
  if(!actor.canManage||!Number.isSafeInteger(actor.actorId)||actor.actorId<=0||
    !["admin","custom"].includes(actor.actorType))throw new AccountingError("Credit management permission required",403,"ACCESS_DENIED");
}
async function eligible(tx:AccountingTransaction,orderId:number,companyId:number){
  await assertLedgerReady(tx);
  const row=(await tx.execute(sql`select o.*,accounting_order_event_snapshot(o.id) as snapshot,g.enabled_at
    from customer_orders o join accounting_credit_cutovers g on g.company_id=o.accounting_company_id and g.processing_ready
    join accounting_source_bindings b on b.company_id=g.company_id and b.source_module='shop' and b.capture_enabled
    join accounting_wallet_cutovers w on w.company_id=g.company_id and w.pipeline_ready
    join accounting_receipt_cutovers r on r.company_id=g.company_id and r.processing_ready
    where o.id=${orderId} and o.accounting_company_id=${companyId} for update of o`)).rows[0];
  const snapshot=row?.snapshot as {version?:number;lines?:unknown[];orderTotal?:string;currency?:string}|undefined;
  if(!row||row.accounting_snapshot_version!==1||snapshot?.version!==1||!snapshot.lines?.length||
    row.payment_status==="paid"||row.contract_id||row.status==="cancelled"||
    !["bank_transfer","cash"].includes(String(row.payment_method))||
    new Date(String(row.created_at)).getTime()<new Date(String(row.enabled_at)).getTime())
    throw new AccountingError("Only explicitly enrolled new, unpaid, non-contract bank/cash orders may use credit",409,"CREDIT_ORDER_INELIGIBLE");
  if(!snapshot.orderTotal||!decimal(snapshot.orderTotal).gt(0)||!decimal(snapshot.orderTotal).eq(String(row.total_amount))||
    snapshot.currency!==row.currency)
    throw new AccountingError("Order differs from its immutable accounting snapshot",409,"ORDER_SNAPSHOT_CONFLICT");
  return {row,snapshot};
}
export async function registerCreditOrder(input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction){
  manager(actor);const parsed=creditOrderSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const d=parsed.data;
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const w=await lockedWallet(tx,d.walletId,d.companyId);
    const {snapshot}=await eligible(tx,d.orderId,d.companyId);
    if(snapshot.currency!==w.currency)throw new AccountingError("Order and CRM credit policy currencies must match",409,"CREDIT_CURRENCY_MISMATCH");
    const prior=(await tx.execute(sql`select * from accounting_credit_orders where order_id=${d.orderId}`)).rows[0];
    if(prior){
      if(prior.company_id!==d.companyId||prior.wallet_id!==d.walletId||prior.evidence_reference!==d.evidenceReference)
        throw new AccountingError("Credit source was reused with different data",409,"IDEMPOTENCY_CONFLICT");
      return {orderId:d.orderId,status:prior.status,duplicate:true};
    }
    const amount=exactMoney(snapshot.orderTotal!,w.decimals);
    await tx.execute(sql`insert into accounting_credit_orders(order_id,company_id,wallet_id,customer_id,currency,amount,
      order_snapshot,evidence_reference,actor_id,actor_type) values(${d.orderId},${d.companyId},${w.id},${w.customer_id},
      ${w.currency},${amount},${JSON.stringify(snapshot)}::jsonb,${d.evidenceReference},${actor.actorId},${actor.actorType})`);
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,after)
      values(${d.companyId},${actor.actorId},${actor.actorType},'register_credit_order','order',${String(d.orderId)},
      ${JSON.stringify({customerId:w.customer_id,customerNamespace:"crm_customers",customerLinkBasis:"explicit_staff_review",
        evidenceReference:d.evidenceReference,amount,currency:w.currency,status:"registered"})}::jsonb)`);
    return {orderId:d.orderId,status:"registered",duplicate:false};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run);
}
export async function approveCreditOrder(orderId:number,notes:string,actor:AccountingAccess,callerTx?:AccountingTransaction){
  manager(actor);
  if(!Number.isSafeInteger(orderId)||orderId<=0||typeof notes!=="string"||notes.trim().length<5||notes.length>500)
    throw new AccountingError("Valid order and financial approval reason required");
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const credit=(await tx.execute(sql`select * from accounting_credit_orders where order_id=${orderId} for update`)).rows[0];
    if(!credit)throw new AccountingError("Explicit CRM credit registration required",409,"CREDIT_ENROLLMENT_REQUIRED");
    if(credit.status==="approved")return {orderId,duplicate:true,paymentStatus:"pending",creditApproved:true};
    const w=await lockedWallet(tx,Number(credit.wallet_id),Number(credit.company_id));
    const current=await eligible(tx,orderId,Number(credit.company_id));
    const unchanged=(await tx.execute(sql`select ${JSON.stringify(current.snapshot)}::jsonb=${JSON.stringify(credit.order_snapshot)}::jsonb as same`)).rows[0];
    if(!unchanged.same)throw new AccountingError("Registered credit order snapshot changed",409,"ORDER_SNAPSHOT_CONFLICT");
    const exposure=await readCreditExposure(Number(credit.company_id),w.id,tx);
    if(exposure.blockingCodes.length)
      throw new AccountingError(`Credit approval blocked: ${exposure.blockingCodes.join(", ")}`,409,exposure.blockingCodes[0]);
    if(decimal(exposure.exposure).plus(String(credit.amount)).gt(exposure.creditLimit!))
      throw new AccountingError("Open receivables, uncleared allocations and approved unbilled orders exceed the currency credit limit",409,"CREDIT_LIMIT_EXCEEDED");
    const management=(await tx.execute(sql`select * from order_management where customer_order_id=${orderId} for update`)).rows[0];
    if(!management||!["finance_pending","financial_pending","pending"].includes(String(management.current_status)))
      throw new AccountingError("Order is not awaiting finance approval",409,"INVALID_ORDER_STATE");
    await tx.execute(sql`update accounting_credit_orders set status='approved' where order_id=${orderId}`);
    await tx.execute(sql`update order_management set current_status='warehouse_pending',financial_reviewer_id=${actor.actorId},
      financial_reviewed_at=now(),financial_notes=${notes.trim()},updated_at=now() where id=${management.id}`);
    await tx.execute(sql`update customer_orders set status='warehouse_ready',updated_at=now() where id=${orderId}`);
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,after)
      values(${credit.company_id},${actor.actorId},${actor.actorType},'approve_credit_order','order',${String(orderId)},
      ${JSON.stringify({notes:notes.trim(),exposureBefore:exposure,approvedCredit:String(credit.amount),paymentStatus:"pending",
        walletDebited:false,invoiceIssued:false})}::jsonb)`);
    return {orderId,duplicate:false,paymentStatus:"pending",creditApproved:true};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run);
}