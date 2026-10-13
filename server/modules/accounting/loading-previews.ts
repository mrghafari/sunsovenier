import {sql} from "drizzle-orm";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {loadingPreviewFiltersSchema,type LoadingPreviewReport} from "@shared/accounting-loading-preview";
import {calculateLoadingInvoicePreview} from "./loading-invoice-calculation";
import {decimal,exactMoney} from "./money";
import {calculateLoadingWeightControl,readLoadingContractEvidence,capturedContractEvidence} from "./loading-weight-control";
import {resolveAccountingOrderNumber} from "./order-number-scope";
export async function readLoadingPreviews(input:unknown,callerTx?:AccountingTransaction):Promise<LoadingPreviewReport>{
  const parsed=loadingPreviewFiltersSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const f=parsed.data;
  const run=async(tx:AccountingTransaction):Promise<LoadingPreviewReport>=>{
    const c=(await tx.execute(sql`select id,name from accounting_companies where id=${f.companyId}`)).rows[0];
    if(!c)throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
    const currencies=(await tx.execute(sql`select code,decimals from accounting_currencies order by code`)).rows as LoadingPreviewReport["currencies"];
    const orderId=f.orderNumber?await resolveAccountingOrderNumber(tx,f.companyId,f.orderNumber):f.orderId;
    const where=sql`company_id=${f.companyId} and event_type='LoadingCompleted' ${orderId?sql`and order_id=${orderId}`:sql``}`;
    const count=(await tx.execute(sql`select count(*)::integer n from accounting_operational_facts where ${where}`)).rows[0];
    const facts=(await tx.execute(sql`select id,company_id as "companyId",order_id as "orderId",source_id as "sourceId",payload
      from accounting_operational_facts where ${where} order by id desc limit ${f.pageSize} offset ${(f.page-1)*f.pageSize}`)).rows;
    const orderIds=[...new Set(facts.map(x=>Number(x.orderId)))];
    // Do not calculate aggregate weight from a paginated subset.
    const history=orderIds.length?(await tx.execute(sql`select order_id as "orderId",payload
      from accounting_operational_facts where company_id=${f.companyId} and event_type='LoadingCompleted'
      and order_id in (${sql.join(orderIds.map(id=>sql`${id}`),sql`,`)}) order by id`)).rows:[];
    const weightControls=new Map<number,ReturnType<typeof calculateLoadingWeightControl>>();
    for(const orderId of orderIds){
      const entries=history.filter(h=>Number(h.orderId)===orderId).map(h=>h.payload);
      weightControls.set(orderId,calculateLoadingWeightControl(entries,capturedContractEvidence(entries,await readLoadingContractEvidence(tx,orderId))));
    }
    const approvals=orderIds.length?(await tx.execute(sql`select fact_id as "factId",order_id as "orderId",currency,
      order_shipping_total::text as "orderTotal",amount::text as amount,evidence_reference as "evidenceReference",
      reason,actor_id as "actorId",actor_type as "actorType",approved_at as "approvedAt"
      from accounting_loading_shipping where company_id=${f.companyId}
      and order_id in (${sql.join(orderIds.map(id=>sql`${id}`),sql`,`)})`)).rows:[];
    const rows=facts.map(x=>{
      const fact={id:Number(x.id),companyId:Number(x.companyId),orderId:Number(x.orderId),sourceId:String(x.sourceId),payload:x.payload};
      const approval=approvals.find(a=>Number(a.factId)===fact.id);
      const row=calculateLoadingInvoicePreview(fact,currencies,approval?{
        factId:fact.id,companyId:fact.companyId,orderId:fact.orderId,currency:String(approval.currency),
        orderTotal:String(approval.orderTotal),amount:String(approval.amount),
      }:undefined);
      row.weightControl=weightControls.get(fact.orderId);
      const order=(x.payload as {order?:{shippingMode?:string;shippingPriceBasis?:string;shippingPrice?:string}})?.order;
      if(row.currency&&order?.shippingMode==="SELLER_ARRANGED"&&order.shippingPriceBasis==="fixed"&&
        row.issues.filter(issue=>issue!=="FIXED_SHIPPING_ALLOCATION_REQUIRED").length===0){
        const precision=currencies.find(currency=>currency.code===row.currency)?.decimals;
        if(precision!==undefined&&typeof order.shippingPrice==="string"){
          try{
          const total=exactMoney(order.shippingPrice,precision);
          if(decimal(total).gt(0)){
            const shares=approvals.filter(a=>Number(a.orderId)===fact.orderId);
            const committed=shares.reduce((sum,a)=>sum.plus(String(a.amount)),decimal("0"));
            if(shares.some(a=>a.currency!==row.currency||!decimal(String(a.orderTotal)).eq(total))||committed.gt(total)){
              row.issues.push("SHIPPING_SNAPSHOT_REQUIRED");row.amounts=null;
            }else row.fixedShipping={
              orderTotal:total,approvedTotal:exactMoney(committed.toFixed(),precision),
              remaining:exactMoney(decimal(total).minus(committed).toFixed(),precision),
              allocation:approval?exactMoney(String(approval.amount),precision):null,
              evidenceReference:approval?String(approval.evidenceReference):null,
              reason:approval?String(approval.reason):null,
              approvedAt:approval?(approval.approvedAt instanceof Date?approval.approvedAt:new Date(String(approval.approvedAt))).toISOString():null,
              actorId:approval?Number(approval.actorId):null,actorType:approval?String(approval.actorType):null,
            };
          }
          }catch{row.issues.push("SHIPPING_SNAPSHOT_REQUIRED");row.amounts=null;}
        }
      }
      return row;
    });
    return {company:{id:Number(c.id),name:String(c.name)},filters:f,currencies,
      rows,
      pagination:{page:f.page,pageSize:f.pageSize,totalRows:Number(count.n)},postingAllowed:false,readOnly:true,
      pending:["INVENTORY_COST_EVIDENCE","WEIGHT_TOLERANCE_APPROVAL","AR_AND_SETTLEMENT","OPENING_AND_CUTOVER"]};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}