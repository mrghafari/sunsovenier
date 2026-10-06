import {sql} from "drizzle-orm";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import type {AccountingAccess} from "@shared/accounting-api";
import {loadingShippingApprovalSchema} from "@shared/accounting-loading-shipping";
import {calculateLoadingInvoicePreview} from "./loading-invoice-calculation";
import {decimal,exactMoney} from "./money";

export async function approveLoadingShipping(input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction){
  if(!actor.canManage||!Number.isSafeInteger(actor.actorId)||actor.actorId<=0||
    !["admin","custom"].includes(actor.actorType))
    throw new AccountingError("Finance management permission required",403,"ACCESS_DENIED");
  const parsed=loadingShippingApprovalSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const d=parsed.data;
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const f=(await tx.execute(sql`select f.id,f.company_id as "companyId",f.order_id as "orderId",
      f.source_id as "sourceId",f.payload from accounting_operational_facts f
      join accounting_companies c on c.id=f.company_id and c.is_active
      where f.id=${d.factId} and f.company_id=${d.companyId} and f.event_type='LoadingCompleted'`)).rows[0];
    if(!f)throw new AccountingError("Captured loading not found in this company",404,"NOT_FOUND");
    const currencies=(await tx.execute(sql`select code,decimals from accounting_currencies where is_active`)).rows as {code:string;decimals:number}[];
    const fact={id:Number(f.id),companyId:Number(f.companyId),orderId:Number(f.orderId),sourceId:String(f.sourceId),payload:f.payload};
    const preview=calculateLoadingInvoicePreview(fact,currencies);
    const order=(f.payload as {order?:{shippingMode?:string;shippingPriceBasis?:string;shippingPrice?:string}})?.order;
    if(!preview.currency||preview.issues.some(code=>code!=="FIXED_SHIPPING_ALLOCATION_REQUIRED")||
      order?.shippingMode!=="SELLER_ARRANGED"||order.shippingPriceBasis!=="fixed"||
      typeof order.shippingPrice!=="string")
      throw new AccountingError("A valid fixed-shipping loading snapshot is required",409,"SHIPPING_SNAPSHOT_REQUIRED");
    const precision=currencies.find(c=>c.code===preview.currency)!.decimals;
    let total:string,amount:string;
    try{total=exactMoney(order.shippingPrice,precision);amount=exactMoney(d.amount,precision);}
    catch{throw new AccountingError("Shipping amounts must match the currency precision",400,"INVALID_SHIPPING_AMOUNT");}
    if(!decimal(total).gt(0))throw new AccountingError("No nonzero fixed shipping requires approval");
    const prior=(await tx.execute(sql`select amount::text as amount,evidence_reference,reason
      from accounting_loading_shipping where fact_id=${d.factId}`)).rows[0];
    if(prior){
      if(!decimal(String(prior.amount)).eq(amount)||prior.evidence_reference!==d.evidenceReference||prior.reason!==d.reason)
        throw new AccountingError("Approved shipping cannot be replaced with different data",409,"IDEMPOTENCY_CONFLICT");
      return {factId:d.factId,amount,duplicate:true,postingAllowed:false};
    }
    const committed=(await tx.execute(sql`select coalesce(sum(amount),0)::text as amount,
      coalesce(bool_or(currency<>${preview.currency} or order_shipping_total<>${total}),false) as conflicting
      from accounting_loading_shipping where company_id=${d.companyId} and order_id=${fact.orderId}`)).rows[0];
    if(committed.conflicting)throw new AccountingError("Order shipping snapshot differs from earlier approvals",409,"ORDER_SNAPSHOT_CONFLICT");
    if(decimal(String(committed.amount)).plus(amount).gt(total))
      throw new AccountingError("Approved shares exceed the fixed order shipping total",409,"FIXED_SHIPPING_LIMIT_EXCEEDED");
    await tx.execute(sql`insert into accounting_loading_shipping(fact_id,company_id,order_id,currency,order_shipping_total,
      amount,evidence_reference,reason,actor_id,actor_type) values(${d.factId},${d.companyId},${fact.orderId},
      ${preview.currency},${total},${amount},${d.evidenceReference},${d.reason},${actor.actorId},${actor.actorType})`);
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,after)
      values(${d.companyId},${actor.actorId},${actor.actorType},'approve_loading_shipping','loading',${String(d.factId)},
      ${JSON.stringify({amount,currency:preview.currency,orderId:fact.orderId,orderShippingTotal:total,
        evidenceReference:d.evidenceReference,reason:d.reason,policy:"reviewed_manual_allocation",postingAllowed:false})}::jsonb)`);
    return {factId:d.factId,amount,duplicate:false,postingAllowed:false};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run);
}
