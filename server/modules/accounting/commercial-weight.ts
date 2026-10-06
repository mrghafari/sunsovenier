import {createHash} from "node:crypto";
import {sql} from "drizzle-orm";
import type {Request} from "express";
import {pool} from "../../db";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {commercialWeightQuerySchema,commercialWeightApprovalSchema,type CommercialWeightReview} from "@shared/accounting-commercial-weight";
import {calculateLoadingWeightControl,readLoadingContractEvidence,capturedContractEvidence} from "./loading-weight-control";

export interface CommercialActor {actorId:string;actorType:"admin"|"custom";canApprove:boolean;}
export async function resolveCommercialAccess(req:Request):Promise<CommercialActor> {
  const session=req.session,admin=Boolean(session?.adminId),custom=Boolean(session?.customUserId);
  if(!session?.isAuthenticated||admin===custom)throw new AccountingError("Management sign-in required",401,"AUTH_REQUIRED");
  const actorId=String(admin?session.adminId:session.customUserId);
  if(admin?(!/^[1-9]\d*$/.test(actorId)||!Number.isSafeInteger(Number(actorId))):
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(actorId))
    throw new AccountingError("Invalid management identity",401,"AUTH_REQUIRED");
  const role=(await pool.query(admin?
    `select ar.id,ar.name,null::jsonb as permissions from users u join admin_roles ar on ar.id=u.role_id
      where u.id=$1 and u.is_active and ar.is_active`:
    `select cr.id,cr.name,to_jsonb(cr.permissions) as permissions from custom_users cu join custom_roles cr on cr.id=cu.role_id
      where cu.id=$1 and cu.is_active and cr.is_active`,[actorId])).rows[0];
  if(!role)throw new AccountingError("Active management role required",403,"ACCESS_DENIED");
  const normalized=String(role.name).trim().toLowerCase().replace(/[\s-]+/g,"_");
  const superAdmin=["super_admin","supper_admin","superadmin"].includes(normalized);
  let authorized=superAdmin,canApprove=superAdmin;
  if(admin&&!superAdmin){
    const permissions=(await pool.query(`select can_view,can_approve from module_permissions
      where role_id=$1 and module_id='shop_management'`,[role.id])).rows;
    authorized=permissions.some(p=>p.can_view===true);
    canApprove=permissions.some(p=>p.can_approve===true);
    // Existing Commercial management grants remain compatible.
    const legacy=(await pool.query(`select exists(select 1 from role_permissions rp join admin_permissions ap on ap.id=rp.permission_id
      where rp.role_id=$1 and ap.is_active and (ap.name='shop_management' or ap.module='shop_management')) as granted`,[role.id])).rows[0];
    if(legacy.granted){authorized=true;canApprove=true;}
  }else if(custom&&!superAdmin){
    const permissions=typeof role.permissions==="string"?JSON.parse(role.permissions):role.permissions;
    authorized=Array.isArray(permissions)&&permissions.includes("shop_management");
    canApprove=authorized;
  }
  if(!authorized)throw new AccountingError("Commercial permission required",403,"ACCESS_DENIED");
  return {actorId,actorType:admin?"admin":"custom",canApprove};
}
export async function readCommercialWeight(input:unknown,actor:CommercialActor,callerTx?:AccountingTransaction):Promise<CommercialWeightReview>{
  const parsed=commercialWeightQuerySchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const d=parsed.data;
  const run=async(tx:AccountingTransaction):Promise<CommercialWeightReview>=>{
    const order=(await tx.execute(sql`select o.id,o.order_number from customer_orders o
      left join accounting_source_bindings b on b.source_module='shop' and b.capture_enabled
      where ${d.orderId?sql`o.id=${d.orderId}`:sql`o.order_number=${d.orderNumber!}`}
      and coalesce(o.accounting_company_id,b.company_id)=${d.companyId}`)).rows[0];
    if(!order)throw new AccountingError("Order not bound to this company",404,"ORDER_SCOPE");
    const orderId=Number(order.id);
    const history=(await tx.execute(sql`select id,payload from accounting_operational_facts
      where company_id=${d.companyId} and order_id=${orderId} and event_type='LoadingCompleted' order by id`)).rows;
    const evidence=capturedContractEvidence(history.map(h=>h.payload),await readLoadingContractEvidence(tx,orderId));
    const weightControl=calculateLoadingWeightControl(history.map(h=>h.payload),evidence);
    const historyKey=createHash("sha256").update(JSON.stringify({companyId:d.companyId,orderId,
      factIds:history.map(h=>Number(h.id)),weightControl,evidence})).digest("hex");
    const approval=(await tx.execute(sql`select evidence_reference,reason,actor_id,actor_type,approved_at
      from accounting_loading_weight_reviews where company_id=${d.companyId} and order_id=${orderId} and history_key=${historyKey}`)).rows[0];
    return {companyId:d.companyId,orderId,orderNumber:order.order_number==null?null:String(order.order_number),
      weightControl,historyKey,canApprove:actor.canApprove,approved:Boolean(approval),postingAllowed:false,
      approval:approval?{evidenceReference:String(approval.evidence_reference),reason:String(approval.reason),
        actorId:String(approval.actor_id),actorType:String(approval.actor_type),approvedAt:new Date(String(approval.approved_at)).toISOString()}:null};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}
export async function approveCommercialWeight(input:unknown,actor:CommercialActor,callerTx?:AccountingTransaction){
  const validIdentity=actor.actorType==="admin"?/^[1-9]\d*$/.test(actor.actorId)&&Number.isSafeInteger(Number(actor.actorId)):
    actor.actorType==="custom"&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(actor.actorId);
  if(!actor.canApprove||!validIdentity)
    throw new AccountingError("Commercial approval permission required",403,"ACCESS_DENIED");
  const parsed=commercialWeightApprovalSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const d=parsed.data;
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    if(!(await tx.execute(sql`select id from accounting_companies where id=${d.companyId} and is_active`)).rows.length)
      throw new AccountingError("Active company required",409,"INACTIVE_COMPANY");
    const state=(await tx.execute(sql`select status,payment_status from customer_orders where id=${d.orderId}`)).rows[0];
    if(state&&(["cancelled","deleted"].includes(String(state.status))||["failed","cancelled"].includes(String(state.payment_status))))
      throw new AccountingError("Cancelled or failed orders cannot be approved",409,"INVALID_ORDER_STATE");
    const review=await readCommercialWeight({companyId:d.companyId,orderId:d.orderId},actor,tx);
    if(review.historyKey!==d.historyKey)throw new AccountingError("Loading history changed; review the new total",409,"STALE_WEIGHT_REVIEW");
    if(review.weightControl.status!=="WITHIN_CONTRACT")
      throw new AccountingError("Contract terms and valid measured weights within the contractual limit are required",409,"CONTRACT_WEIGHT_BLOCKED");
    if(review.approval){
      if(review.approval.evidenceReference!==d.evidenceReference||review.approval.reason!==d.reason)
        throw new AccountingError("Approved weight review is immutable",409,"IDEMPOTENCY_CONFLICT");
      return {...review,duplicate:true};
    }
    await tx.execute(sql`insert into accounting_loading_weight_reviews(company_id,order_id,history_key,basis,
      evidence_reference,reason,actor_id,actor_type) values(${d.companyId},${d.orderId},${d.historyKey},
      ${JSON.stringify(review.weightControl)}::jsonb,${d.evidenceReference},${d.reason},${actor.actorId},${actor.actorType})`);
    // The immutable review itself is the authoritative Commercial audit record
    // for both namespaces. The legacy accounting audit supports numeric IDs only;
    // never substitute a fake numeric identity for a custom user's UUID.
    if(actor.actorType==="admin")await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,after)
      values(${d.companyId},${Number(actor.actorId)},${actor.actorType},'approve_contract_loading_weight','order',${String(d.orderId)},
      ${JSON.stringify({historyKey:d.historyKey,basis:review.weightControl,evidenceReference:d.evidenceReference,reason:d.reason,postingAllowed:false})}::jsonb)`);
    return {...await readCommercialWeight({companyId:d.companyId,orderId:d.orderId},actor,tx),duplicate:false};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run);
}
