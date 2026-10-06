import {sql} from "drizzle-orm";
import {aggregateWeightAllowanceSchema} from "@shared/contract-draft";
import type {LoadingWeightControl} from "@shared/accounting-loading-preview";
import type {AccountingTransaction} from "./db";
import {decimal} from "./money";

type Obj=Record<string,unknown>;
const obj=(v:unknown):Obj=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as Obj:{};
function positive(v:unknown) {
  if(typeof v!=="string"||! /^(?:0|[1-9]\d{0,29})(?:\.\d{1,8})?$/.test(v))throw new Error("Invalid weight");
  const n=decimal(v);if(!n.gt(0))throw new Error("Positive weight required");return n;
}
function metricQuantity(line:Obj) {
  const quantity=positive(line.quantity);
  if(typeof line.unit!=="string")throw new Error("Unknown unit");
  const unit=line.unit.trim().toLowerCase();
  if(["ton","tons","tonne","tonnes","t","طن","تن"].includes(unit))return quantity;
  if(["kg","kilogram","kilograms","کیلوگرم","كيلوغرام","کيلوغرام"].includes(unit))return quantity.div(1000);
  // A package's catalog weight can change and is not contract evidence.
  throw new Error("Persisted metric quantity required");
}
export interface LoadingContractEvidence {
  orderId:number;contractId:number;contractNumber:string;
  allowance:{basis:"percent";value:string};
  provenance:"order-contract-snapshot";
}

export function capturedContractEvidence(payloads:unknown[],fallback:LoadingContractEvidence|null):LoadingContractEvidence|null {
  const captured=payloads.map(p=>obj(p));
  if(!captured.some(p=>Object.prototype.hasOwnProperty.call(p,"contractEvidence")))return fallback;
  const evidence=captured.map(p=>obj(p.contractEvidence));
  const first=evidence[0];
  if(!first||!Number.isSafeInteger(first.contractId)||Number(first.contractId)<=0||
    !Number.isSafeInteger(first.orderId)||Number(first.orderId)<=0||
    typeof first.contractNumber!=="string"||!first.contractNumber.trim()||
    first.provenance!=="order-contract-snapshot"||!aggregateWeightAllowanceSchema.safeParse(first.allowance).success)return null;
  const identity=JSON.stringify([first.orderId,first.contractId,first.contractNumber,first.allowance]);
  if(evidence.some(e=>e.provenance!==first.provenance||
    JSON.stringify([e.orderId,e.contractId,e.contractNumber,e.allowance])!==identity))return null;
  return first as unknown as LoadingContractEvidence;
}

/** Read the order's saved agreement only, never shop_contracts' current draft. */
export async function readLoadingContractEvidence(tx:AccountingTransaction,orderId:number):Promise<LoadingContractEvidence|null> {
  const r=(await tx.execute(sql`select os.contract_id as id,os.contract_snapshot as snapshot
    from shop_contract_order_snapshots os join customer_orders o on o.id=os.order_id and o.contract_id=os.contract_id
    where os.order_id=${orderId}`)).rows[0];
  const snapshot=obj(r?.snapshot),draft=obj(snapshot.draftData);
  const allowance=aggregateWeightAllowanceSchema.safeParse(draft.aggregateWeightAllowance);
  if(!r||!Number.isSafeInteger(Number(r.id))||Number(r.id)<=0||snapshot.id!==Number(r.id)||
    typeof snapshot.number!=="string"||!snapshot.number.trim()||!allowance.success)return null;
  return {orderId,contractId:Number(r.id),contractNumber:snapshot.number,allowance:allowance.data,
    provenance:"order-contract-snapshot"};
}

/** All captured loadings for the order are required, including those off the current page. */
export function calculateLoadingWeightControl(
  payloads:unknown[],evidence:LoadingContractEvidence|null,
):LoadingWeightControl {
  const result:LoadingWeightControl={status:"ORDER_WEIGHT_REQUIRED",orderedWeightTons:null,loadedWeightTons:null,
    excessWeightTons:null,allowedWeightTons:null,allowancePercent:null,contractNumber:null,
    loadingCount:payloads.length,reviewDepartment:"commercial",postingAllowed:false};
  if(!payloads.length)return result;
  let loaded=decimal("0"),ordered=decimal("0"),orderId:unknown,companyId:unknown;
  let signature:string|undefined;
  try {
    for(const p of payloads){
      const {input:rawInput,order:rawOrder}=obj(p),input=obj(rawInput),order=obj(rawOrder);
      if(order.version!==1||!Array.isArray(order.lines)||!order.lines.length)throw new Error("Order snapshot missing");
      const lines=order.lines.map(obj);
      if(!Number.isSafeInteger(order.orderId)||Number(order.orderId)<=0||
        !Number.isSafeInteger(order.companyId)||Number(order.companyId)<=0)throw new Error("Invalid order identity");
      const ids=new Set<unknown>();
      for(const line of lines){
        if(!Number.isSafeInteger(line.orderItemId)||Number(line.orderItemId)<=0||ids.has(line.orderItemId))
          throw new Error("Invalid order line");
        ids.add(line.orderItemId);
      }
      const nextSignature=JSON.stringify(lines.map(l=>[l.orderItemId,metricQuantity(l).toFixed()]).sort((a,b)=>Number(a[0])-Number(b[0])));
      if(signature!==undefined&&(signature!==nextSignature||orderId!==order.orderId||companyId!==order.companyId))
        throw new Error("Conflicting order weights");
      signature=nextSignature;orderId=order.orderId;companyId=order.companyId;
      ordered=lines.reduce((sum,l)=>sum.plus(metricQuantity(l)),decimal("0"));
    }
    result.orderedWeightTons=ordered.toFixed();
  }catch{return result;}
  try {
    const references=new Set<string>(),tickets=new Set<string>();
    for(const p of payloads){
      const input=obj(obj(p).input);
      if(input.orderId!==orderId||input.eventType!=="LoadingCompleted"||
        typeof input.sourceId!=="string"||!input.sourceId.trim()||references.has(input.sourceId)||
        typeof input.weighbridgeReference!=="string"||!input.weighbridgeReference.trim()||tickets.has(input.weighbridgeReference)||
        !Array.isArray(input.lines)||!input.lines.length)throw new Error("Invalid loading");
      references.add(input.sourceId);tickets.add(input.weighbridgeReference);
      const ids=new Set<unknown>();
      const snapshotLines=obj(obj(p).order).lines as unknown[];
      const total=input.lines.reduce((sum:ReturnType<typeof decimal>,raw:unknown)=>{
        const line=obj(raw);
        if(ids.has(line.orderItemId)||!snapshotLines.some(s=>obj(s).orderItemId===line.orderItemId))throw new Error("Invalid measured line");
        ids.add(line.orderItemId);return sum.plus(positive(line.actualWeightTons));
      },decimal("0"));
      if(!total.eq(positive(input.actualWeightTons)))throw new Error("Weight mismatch");
      loaded=loaded.plus(total);
    }
    result.loadedWeightTons=loaded.toFixed();
    result.excessWeightTons=loaded.minus(ordered).greaterThan(0)?loaded.minus(ordered).toFixed():"0";
  }catch{result.status="INVALID_LOADING_HISTORY";return result;}
  const clause=aggregateWeightAllowanceSchema.safeParse(evidence?.allowance);
  if(!evidence||evidence.orderId!==orderId||evidence.provenance!=="order-contract-snapshot"||
    !clause.success){result.status="CONTRACT_TERMS_REQUIRED";return result;}
  result.allowancePercent=clause.data.value;result.contractNumber=evidence.contractNumber;
  const allowed=ordered.times(decimal("1").plus(decimal(clause.data.value).div(100)));
  result.allowedWeightTons=allowed.toFixed();
  result.status=loaded.gt(allowed)?"CONTRACT_LIMIT_EXCEEDED":"WITHIN_CONTRACT";
  return result;
}
