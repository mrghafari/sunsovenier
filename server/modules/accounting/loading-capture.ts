import {sql} from "drizzle-orm";
import {z} from "zod";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import type {AccountingAccess} from "@shared/accounting-api";
import {loadingCaptureSchema,inventoryCostCaptureSchema,type LoadingCaptureContext,type LoadingCaptureResult} from "@shared/accounting-loading-capture";
import {capturedMetricPricing} from "./loading-pricing-evidence";
import {recordOperationalEvent} from "./events";
const contextSchema=z.object({companyId:z.coerce.number().int().positive().max(2147483647),
  orderId:z.coerce.number().int().positive().max(2147483647).optional(),
  orderNumber:z.string().trim().min(1).max(150).optional()}).strict().refine(f=>Boolean(f.orderId)!==Boolean(f.orderNumber),
    "Exactly one order ID or order number is required");
export async function readLoadingCaptureContext(input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction):Promise<LoadingCaptureContext>{
  const parsed=contextSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const f=parsed.data;
  const run=async(tx:AccountingTransaction):Promise<LoadingCaptureContext>=>{
    const row=(await tx.execute(sql`select o.id,o.order_number as number,accounting_order_event_snapshot(o.id) as snapshot,
      c.id as company_id,c.name as company_name
      from customer_orders o left join accounting_source_bindings b on b.source_module='shop' and b.capture_enabled
      join accounting_companies c on c.id=coalesce(o.accounting_company_id,b.company_id)
      where ${f.orderId?sql`o.id=${f.orderId}`:sql`o.order_number=${f.orderNumber!}`} and c.id=${f.companyId}`)).rows[0];
    if(!row)throw new AccountingError("Order is not bound to the selected accounting company",404,"ORDER_SCOPE");
    const order=(row.snapshot??{}) as Record<string,unknown>;
    const orderId=Number(row.id);
    const nativeLines=(await tx.execute(sql`select id,product_name from order_items where order_id=${orderId}`)).rows;
    const lines=(Array.isArray(order.lines)?order.lines:[]) as Record<string,unknown>[];
    const loadings=(await tx.execute(sql`select id,payload->'input'->>'sourceId' as reference,
      payload->'input'->>'eventDate' as date,payload->'input'->>'actualWeightTons' as weight,
      case when jsonb_typeof(payload->'input'->'inventoryCosts')='array' then jsonb_array_length(payload->'input'->'inventoryCosts') else 0 end as costs,
      payload->'input'->'inventoryCosts' as evidence
      from accounting_operational_facts where company_id=${f.companyId} and order_id=${orderId}
      and event_type='LoadingCompleted' order by id desc`)).rows;
    return {company:{id:Number(row.company_id),name:String(row.company_name)},
      order:{id:orderId,number:row.number==null?null:String(row.number),currency:typeof order.currency==="string"?order.currency:null,
        snapshotVersion:typeof order.version==="number"?order.version:null},
      lines:lines.map(l=>({orderItemId:Number(l.orderItemId),productId:typeof l.productId==="number"?l.productId:null,
        name:nativeLines.find(n=>Number(n.id)===l.orderItemId)?.product_name as string|null??null,
        quantity:typeof l.quantity==="string"?l.quantity:null,unit:typeof l.unit==="string"?l.unit:null,
        lockedUnitPrice:typeof l.lockedUnitPrice==="string"?l.lockedUnitPrice:null,taxRate:typeof l.taxRate==="string"?l.taxRate:null})),
      pricing:capturedMetricPricing(order),
      loadings:loadings.map(l=>({factId:Number(l.id),reference:String(l.reference??""),eventDate:l.date==null?null:String(l.date),
        weightTons:l.weight==null?null:String(l.weight),inventoryCostCount:Number(l.costs),
        inventoryCosts:Array.isArray(l.evidence)?l.evidence.flatMap(v=>{const p=inventoryCostCaptureSchema.safeParse(v);return p.success?[p.data]:[];}):[]})),
      permissions:{canCapture:actor.canManage},captureOnly:true,financialPostingAllowed:false,
      inventoryEvidenceBasis:"staff-document-attestation-not-verified-stock-valuation"};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}
export async function captureMeasuredLoading(input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction):Promise<LoadingCaptureResult>{
  if(!actor.canManage)throw new AccountingError("Accounting management permission is required to attest loading measurements",403,"FORBIDDEN");
  const parsed=loadingCaptureSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const {companyId,...measurement}=parsed.data;
  const run=async(tx:AccountingTransaction):Promise<LoadingCaptureResult>=>{
    // Serialize this order's entry/retry. The fact, cost evidence, audit and
    // trigger-emitted outbox event commit together; no native balance/status changes.
    await tx.execute(sql`select pg_advisory_xact_lock(718393,${measurement.orderId})`);
    await readLoadingCaptureContext({companyId,orderId:measurement.orderId},actor,tx);
    const future=(await tx.execute(sql`select (${measurement.eventDate}::date>(now() at time zone timezone)::date) as future
      from accounting_companies where id=${companyId}`)).rows[0];
    if(future?.future===true)throw new AccountingError("An actual loading cannot be recorded in the company's future calendar day");
    const result=await recordOperationalEvent(tx,{...measurement,eventType:"LoadingCompleted"},actor);
    const fact=(await tx.execute(sql`select company_id from accounting_operational_facts where id=${result.factId}`)).rows[0];
    if(Number(fact?.company_id)!==companyId)throw new AccountingError("Source company changed while recording; reload the order",409,"ORDER_SCOPE");
    return {...result,captureOnly:true};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run);
}