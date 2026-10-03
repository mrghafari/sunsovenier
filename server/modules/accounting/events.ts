import { z } from "zod";
import { and,eq,sql } from "drizzle-orm";
import { dateString,decimalString,currencyCode,type AccountingAccess } from "@shared/accounting-api";
import { accountingDb,type AccountingTransaction } from "./db";
import { accountingOperationalFacts as facts,accountingAuditLogs as audits } from "./schema";
import { AccountingError } from "./access";
import { decimal,exactMoney } from "./money";
import { assertLedgerReady,assertEventBridgeReady } from "./readiness";

const positiveDecimal = decimalString.refine(v=>{
  try { return decimal(v).gt(0) && decimal(v).lt("1e30") && decimal(v).decimalPlaces()<=8; }
  catch { return false; }
}, "A positive decimal string within numeric(38,8) is required").transform(v=>decimal(v).toFixed());
const reference = z.string().trim().min(1).max(150);
const common = {orderId:z.number().int().positive(),sourceId:reference,eventDate:dateString};
export const operationalEventSchema = z.union([
  z.object({...common,eventType:z.literal("LoadingCompleted"),weighbridgeReference:reference,
    actualWeightTons:positiveDecimal,
    lines:z.array(z.object({orderItemId:z.number().int().positive(),actualWeightTons:positiveDecimal}).strict()).min(1).max(500),
  }).strict(),
  z.object({...common,eventType:z.literal("ShipmentCostRecorded"),loadingSourceId:reference,
    costType:z.literal("EXTERNAL_CARRIER"),carrierReference:reference,
    actualCost:positiveDecimal,currency:currencyCode,costDocumentReference:reference,
  }).strict(),
  z.object({...common,eventType:z.literal("ShipmentCostRecorded"),loadingSourceId:reference,
    costType:z.literal("INTERNAL_FLEET"),distanceKm:positiveDecimal.optional(),
  }).strict(),
]);
export type OperationalEventInput = z.input<typeof operationalEventSchema>;

// A required caller transaction keeps the native operational fact, event and audit atomic.
// Never derive LoadingCompleted from dispatch/delivery statuses or estimated shop weights.
export async function recordOperationalEvent(tx:AccountingTransaction,input:OperationalEventInput,actor:AccountingAccess) {
  if (!actor.canManage || !Number.isSafeInteger(actor.actorId) || actor.actorId<=0 ||
      !["admin","custom"].includes(actor.actorType)) throw new AccountingError("Operational event management permission required",403,"ACCESS_DENIED");
  const parsed = operationalEventSchema.safeParse(input);
  if (!parsed.success) throw new AccountingError(parsed.error.issues.map(i=>`${i.path.join(".")}: ${i.message}`).join("; "));
  const data = parsed.data;
  await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
  await assertLedgerReady(tx);
  await assertEventBridgeReady(tx);
  const orderResult = await tx.execute(sql`
    select accounting_order_event_snapshot(o.id) as snapshot,
      coalesce(o.accounting_company_id,b.company_id) as company_id
    from customer_orders o left join accounting_source_bindings b on b.source_module='shop' and b.capture_enabled
    where o.id=${data.orderId} for share of o`);
  if (!orderResult.rows.length) throw new AccountingError("Order not found",404,"NOT_FOUND");
  const companyId = orderResult.rows[0].company_id as number|null;
  if (!companyId) throw new AccountingError("Accounting source company must be configured",503,"SOURCE_NOT_CONFIGURED");
  const order = orderResult.rows[0].snapshot as {orderDate?:string;lines?:{orderItemId:number}[]}|null;
  if (!order?.lines?.length) throw new AccountingError("An order with persisted line snapshots is required",409,"ORDER_SNAPSHOT_INCOMPLETE");
  const identity = `${data.orderId}:${data.sourceId}`;
  // Compare original immutable input first: later rate/settings/order changes cannot rewrite retries.
  const [existing] = await tx.select().from(facts).where(and(
    eq(facts.companyId,companyId),eq(facts.eventType,data.eventType),eq(facts.sourceId,identity),
  ));
  if (existing) {
    const same = await tx.execute(sql`select (${JSON.stringify(data)}::jsonb = ${JSON.stringify((existing.payload as {input:unknown}).input)}::jsonb) as same`);
    if (!same.rows[0].same) throw new AccountingError("Event identity was reused for a different payload",409,"IDEMPOTENCY_CONFLICT");
    return {factId:existing.id,duplicate:true,captureOnly:true};
  }
  if (order.orderDate && data.eventDate<order.orderDate) {
    throw new AccountingError("An operational event cannot precede the order date");
  }
  let fleet:Record<string,unknown>|null=null;
  if (data.eventType==="LoadingCompleted") {
    const ids = data.lines.map(l=>l.orderItemId);
    if (new Set(ids).size!==ids.length || ids.some(id=>!order.lines!.some(l=>l.orderItemId===id))) {
      throw new AccountingError("Loading lines must be distinct lines from this order");
    }
    if (!data.lines.reduce((sum,l)=>sum.plus(l.actualWeightTons),decimal("0")).eq(data.actualWeightTons)) {
      throw new AccountingError("Actual loading line weights must equal measured total weight");
    }
  } else {
    const [loading] = await tx.select().from(facts).where(and(
      eq(facts.companyId,companyId),eq(facts.eventType,"LoadingCompleted"),
      eq(facts.sourceId,`${data.orderId}:${data.loadingSourceId}`),eq(facts.orderId,data.orderId),
    ));
    if (!loading) throw new AccountingError("Shipment cost must refer to a recorded loading of this order");
    if (data.costType==="EXTERNAL_CARRIER") {
      const active = await tx.execute(sql`select code,decimals from accounting_currencies where code=${data.currency} and is_active`);
      if (!active.rows.length) throw new AccountingError("Active cost currency required");
      try { exactMoney(data.actualCost,active.rows[0].decimals as number); }
      catch { throw new AccountingError("Shipment cost must respect the currency's decimal precision"); }
    } else {
      const settings = await tx.execute(sql`select s.fleet_rate::text as rate,s.fleet_rate_basis as basis,
        s.fleet_cost_center_id as "costCenterId",c.base_currency as currency
        from accounting_settings s join accounting_companies c on c.id=s.company_id
        join accounting_cost_centers cc on cc.id=s.fleet_cost_center_id and cc.is_active and cc.company_id=s.company_id
        where s.company_id=${companyId}`);
      fleet=settings.rows[0]??null;
      if (!fleet || !decimal(String(fleet.rate)).gt(0)) throw new AccountingError("Configure a positive internal fleet rate and active cost center");
      if (fleet.basis==="per_km" && !data.distanceKm) throw new AccountingError("Measured distance is required for a per-km fleet rate");
    }
  }
  const [fact] = await tx.insert(facts).values({
    companyId,orderId:data.orderId,eventType:data.eventType,sourceId:identity,
    payload:{origin:"operator_recorded_measurement",input:data,order,fleet,actor:{id:actor.actorId,type:actor.actorType}},
    actorId:actor.actorId,actorType:actor.actorType,
  }).returning({id:facts.id});
  await tx.insert(audits).values({companyId,actorId:actor.actorId,actorType:actor.actorType,
    action:"capture_operational_event",entityType:data.eventType,entityId:String(fact.id),
    after:{sourceId:identity,orderId:data.orderId,captureOnly:true}});
  return {factId:fact.id,duplicate:false,captureOnly:true};
}
export async function captureOperationalEvent(input:OperationalEventInput,actor:AccountingAccess) {
  return accountingDb.transaction(tx=>recordOperationalEvent(tx,input,actor));
}