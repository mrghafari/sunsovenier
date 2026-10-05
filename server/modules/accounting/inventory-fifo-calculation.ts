import {dateString} from "@shared/accounting-api";
import type {FifoLoading,FifoIssue} from "@shared/accounting-inventory-fifo";
import {decimal,exactMoney,Money} from "./money";

export interface FifoSource {
  id:number;revision:number;reference:string;documentDate:string;currency:string;
  lines:{productId:number;batchReference:string;quantityTons:string;totalCost:string}[];
}
export interface FifoFact {id:number;companyId:number;orderId:number;sourceId:string;payload:unknown}
const obj=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
const validId=(n:unknown):n is number=>typeof n==="number"&&Number.isSafeInteger(n)&&n>0&&n<=2147483647;
const positive=(s:unknown):s is string=>typeof s==="string"&&/^(0|[1-9]\d{0,21})(\.\d{1,8})?$/.test(s)&&decimal(s).gt(0);
function measured(f:FifoFact){
  const p=obj(f.payload),input=obj(p.input),order=obj(p.order);
  if(!dateString.safeParse(input.eventDate).success||input.eventType!=="LoadingCompleted"||
    input.orderId!==f.orderId||order.orderId!==f.orderId||order.companyId!==f.companyId||order.version!==1||
    typeof input.sourceId!=="string"||!input.sourceId.trim()||f.sourceId!==`${f.orderId}:${input.sourceId}`||
    typeof input.weighbridgeReference!=="string"||!input.weighbridgeReference.trim()||
    !Array.isArray(input.lines)||!input.lines.length||!Array.isArray(order.lines))return null;
  const snapshots=order.lines.map(obj);
  const ids=new Set<number>();
  for(const line of snapshots){
    if(!validId(line.orderItemId)||!validId(line.productId)||ids.has(line.orderItemId))return null;
    ids.add(line.orderItemId);
  }
  const seen=new Set<number>(),lines=[];
  for(const raw of input.lines){
    const l=obj(raw),source=snapshots.find(s=>s.orderItemId===l.orderItemId);
    if(!validId(l.orderItemId)||seen.has(l.orderItemId)||!source||!positive(l.actualWeightTons))return null;
    seen.add(l.orderItemId);
    lines.push({orderItemId:l.orderItemId,productId:source.productId as number,quantityTons:l.actualWeightTons});
  }
  if(!positive(input.actualWeightTons)||!lines.reduce((v,l)=>v.plus(l.quantityTons),new Money(0)).eq(input.actualWeightTons))return null;
  return {date:input.eventDate as string,reference:input.sourceId,lines};
}

// Documentary planning only. All captured history must be replayed before filtering.
// Costs stay in source currency. No sale prices, FX estimates or catalog quantities.
export function calculateInventoryFifo(sources:FifoSource[],facts:FifoFact[],currencies:{code:string;decimals:number}[]):FifoLoading[]{
  const layers=sources.flatMap(d=>{
    if(!validId(d.id)||!validId(d.revision)||!dateString.safeParse(d.documentDate).success||!d.lines.length)
      throw new Error("Invalid approved inventory document");
    const precision=currencies.find(c=>c.code===d.currency)?.decimals;
    if(precision===undefined)throw new Error("Unknown inventory source currency");
    return d.lines.map((l,index)=>{
      if(!validId(l.productId)||!positive(l.quantityTons)||!positive(l.totalCost)||!l.batchReference.trim())
        throw new Error("Invalid approved inventory line");
      exactMoney(l.totalCost,precision);
      return {d,l,index,precision,consumed:new Money(0),allocated:new Money(0)};
    });
  }).sort((a,b)=>a.d.documentDate.localeCompare(b.d.documentDate)||a.d.id-b.d.id||a.index-b.index);
  // Same product/batch in multiple documents may be an opening + purchase
  // overlap, not additional stock. Do not double-count unverifiable layers.
  const identities=new Set<string>(),ambiguous=new Set<number>();
  const byProduct=new Map<number,typeof layers>();
  for(const layer of layers){
    const key=JSON.stringify([layer.l.productId,layer.l.batchReference]);
    if(identities.has(key))ambiguous.add(layer.l.productId);identities.add(key);
    const group=byProduct.get(layer.l.productId)??[];group.push(layer);byProduct.set(layer.l.productId,group);
  }
  const cursors=new Map<number,number>();
  const prepared=facts.map(f=>({f,m:measured(f)}));
  // Unlocated invalid history could precede any valid shipment. Never omit it.
  let historyUnknown=prepared.some(x=>!x.m&&!dateString.safeParse(obj(obj(x.f.payload).input).eventDate).success);
  const tainted=new Set<number>(),result:FifoLoading[]=[];
  const factIds=new Set<number>(),sourceIds=new Set<string>();
  prepared.sort((a,b)=>String(obj(obj(a.f.payload).input).eventDate??"").localeCompare(String(obj(obj(b.f.payload).input).eventDate??""))||a.f.id-b.f.id);
  for(const {f,m} of prepared){
    const duplicate=factIds.has(f.id)||sourceIds.has(f.sourceId);
    factIds.add(f.id);sourceIds.add(f.sourceId);
    if(!m||duplicate)historyUnknown=true;
    const r:FifoLoading={factId:f.id,orderId:f.orderId,loadingReference:m?.reference??f.sourceId,
      eventDate:dateString.safeParse(obj(obj(f.payload).input).eventDate).success?String(obj(obj(f.payload).input).eventDate):null,
      lines:[],issues:[],documentedCosts:null};
    if(historyUnknown){r.issues=["INVALID_LOADING_HISTORY"];result.push(r);continue;}
    const totals=new Map<string,InstanceType<typeof Money>>();
    for(const line of m!.lines){
      const issues:FifoIssue[]=ambiguous.has(line.productId)?["AMBIGUOUS_LAYER_IDENTITY"]:tainted.has(line.productId)?["PREVIOUS_SHORTFALL"]:[];
      let missing=decimal(line.quantityTons);
      const allocations=[];
      const candidates=byProduct.get(line.productId)??[];
      if(!issues.length)for(let index=cursors.get(line.productId)??0;index<candidates.length;index++){
        const layer=candidates[index];
        if(layer.d.documentDate>m!.date)break;
        const available=decimal(layer.l.quantityTons).minus(layer.consumed);
        if(!available.gt(0)){cursors.set(line.productId,index+1);continue;}
        const take=Money.min(available,missing);
        // Difference of rounded cumulative costs guarantees the final split
        // consumes exactly the original currency-precise amount (no penny drift).
        const cumulative=layer.consumed.plus(take);
        const cumulativeCost=decimal(layer.l.totalCost).times(cumulative).div(layer.l.quantityTons).toDecimalPlaces(layer.precision);
        const cost=cumulativeCost.minus(layer.allocated);
        layer.consumed=cumulative;layer.allocated=cumulativeCost;
        if(cumulative.eq(layer.l.quantityTons))cursors.set(line.productId,index+1);
        allocations.push({documentId:layer.d.id,documentRevision:layer.d.revision,documentReference:layer.d.reference,
          documentDate:layer.d.documentDate,lineIndex:layer.index,batchReference:layer.l.batchReference,
          quantityTons:take.toFixed(),currency:layer.d.currency,documentedCost:exactMoney(cost.toFixed(),layer.precision)});
        totals.set(layer.d.currency,(totals.get(layer.d.currency)??new Money(0)).plus(cost));
        missing=missing.minus(take);if(missing.isZero())break;
      }
      if(!issues.length&&missing.gt(0)){issues.push("DOCUMENTED_STOCK_SHORTFALL");tainted.add(line.productId);}
      r.lines.push({...line,shortfallTons:issues.includes("PREVIOUS_SHORTFALL")||issues.includes("AMBIGUOUS_LAYER_IDENTITY")?null:missing.toFixed(),allocations,issues});
      for(const issue of issues)if(!r.issues.includes(issue))r.issues.push(issue);
    }
    if(!r.issues.length)r.documentedCosts=[...totals].sort(([a],[b])=>a.localeCompare(b)).map(([currency,n])=>({
      currency,amount:exactMoney(n.toFixed(),currencies.find(c=>c.code===currency)!.decimals)}));
    result.push(r);
  }
  return result;
}
