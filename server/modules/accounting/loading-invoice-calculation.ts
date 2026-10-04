import {z} from "zod";
import {dateString} from "@shared/accounting-api";
import type {LoadingPreviewRow,LoadingPreviewIssue,LoadingInvoiceAmounts} from "@shared/accounting-loading-preview";
import {Money,decimal,exactMoney} from "./money";
import {capturedMetricPricing} from "./loading-pricing-evidence";

type Obj=Record<string,unknown>;
const object=(v:unknown):Obj=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as Obj:{};
const positiveId=(v:unknown):v is number=>typeof v==="number"&&Number.isInteger(v)&&v>0&&v<=2147483647;
const amount=(v:unknown)=>{if(typeof v!=="string"||! /^[0-9]{1,30}([.][0-9]{1,8})?$/.test(v))throw new Error("Invalid decimal");
  return decimal(new Money(v).toFixed());};
const unit=z.enum(["ton","tons","tonne","tonnes","t","طن","تن"]);

// Read-only arithmetic, never an invoice or proof of posting readiness.
// Prices/taxes come ONLY from the immutable order embedded in a captured fact.
// No catalog lookups, historical repricing, estimated weights or shipping split.
export function calculateLoadingInvoicePreview(fact:{id:number;companyId:number;orderId:number;sourceId:string;payload:unknown},
  currencies:{code:string;decimals:number}[]):LoadingPreviewRow {
  const p=object(fact.payload),input=object(p.input),order=object(p.order),issues=new Set<LoadingPreviewIssue>();
  const fail=(code:LoadingPreviewIssue)=>issues.add(code);
  const reference=typeof input.sourceId==="string"?input.sourceId:"";
  const date=dateString.safeParse(input.eventDate);
  const currency=typeof order.currency==="string"?order.currency:null;
  const precision=currencies.find(c=>c.code===currency)?.decimals;
  if(!date.success||(date.success&&date.data<"0001-01-01")||input.eventType!=="LoadingCompleted"||!reference.trim()||reference.length>150||
    fact.sourceId!==`${fact.orderId}:${reference}`||input.orderId!==fact.orderId||
    typeof input.weighbridgeReference!=="string"||!input.weighbridgeReference.trim())fail("INVALID_CAPTURE");
  if(order.version!==1)fail("LEGACY_SNAPSHOT");
  if(order.companyId!==fact.companyId||order.orderId!==fact.orderId)fail("SNAPSHOT_IDENTITY");
  if(precision===undefined||!Number.isInteger(precision)||precision<0||precision>8)fail("UNKNOWN_CURRENCY");
  const snapshotLines=Array.isArray(order.lines)?order.lines.map(object):[];
  const metricPricing=capturedMetricPricing(order);
  const capturedPricing=Array.isArray(p.pricingEvidence)?p.pricingEvidence.map(object):[];
  const measured=Array.isArray(input.lines)?input.lines.map(object):[];
  if(!snapshotLines.length)fail("LINE_SNAPSHOT_REQUIRED");
  if(!measured.length)fail("INVALID_MEASUREMENTS");
  const snapshotIds=new Set<number>(),measuredIds=new Set<number>();
  for(const line of snapshotLines){
    if(!positiveId(line.orderItemId)||snapshotIds.has(line.orderItemId))fail("LINE_SNAPSHOT_REQUIRED");
    else snapshotIds.add(line.orderItemId);
  }
  let goods=new Money(0),tax=new Money(0),shipping=new Money(0),weight=new Money(0);
  const resultLines:LoadingInvoiceAmounts["lines"]=[];
  for(const load of measured){
    if(!positiveId(load.orderItemId)||measuredIds.has(load.orderItemId)){fail("INVALID_MEASUREMENTS");continue;}
    measuredIds.add(load.orderItemId);
    const line=snapshotLines.find(s=>s.orderItemId===load.orderItemId);
    if(!line||line.version!==1){fail("LINE_SNAPSHOT_REQUIRED");continue;}
    // Native prices need either explicit tons or new immutable metric conversion
    // evidence. Per-kg/package prices are never directly multiplied by tons.
    const metric=metricPricing.find(l=>l.orderItemId===load.orderItemId);
    const evidenced=metric&&capturedPricing.some(e=>e.orderItemId===metric.orderItemId&&e.basis===metric.basis&&
      e.nativeUnit===metric.nativeUnit&&e.lockedUnitPrice===metric.lockedUnitPrice&&e.pricePerTon===metric.pricePerTon&&
      e.tonsToPriceUnits===metric.tonsToPriceUnits);
    if(!evidenced&&line.priceBasis!=="per_ton"&&!(line.priceBasis==="native_order_unit"&&unit.safeParse(line.unit).success))
      fail("PRICE_BASIS_REQUIRED");
    try{
      const tons=amount(load.actualWeightTons);
      if(!tons.gt(0)){fail("INVALID_MEASUREMENTS");continue;}
      weight=weight.plus(tons);
      const price=amount(evidenced?metric!.pricePerTon:line.lockedUnitPrice);
      const net=tons.times(price).toDecimalPlaces(precision??0);
      let lineTax=new Money(0);
      try{
        const rate=amount(line.taxRate);
        if(rate.gt(100))fail("TAX_SNAPSHOT_REQUIRED");
        lineTax=net.times(rate).div(100).toDecimalPlaces(precision??0);
      }catch{fail("TAX_SNAPSHOT_REQUIRED");}
      goods=goods.plus(net);tax=tax.plus(lineTax);
      resultLines.push({orderItemId:load.orderItemId,weightTons:tons.toFixed(),goods:net.toFixed(precision??0),tax:lineTax.toFixed(precision??0)});
    }catch{fail("LINE_SNAPSHOT_REQUIRED");}
  }
  try{if(!amount(input.actualWeightTons).gt(0)||!amount(input.actualWeightTons).eq(weight))fail("INVALID_MEASUREMENTS");}
  catch{fail("INVALID_MEASUREMENTS");}
  try{
    if(order.shippingMode==="CUSTOMER_ARRANGED"){
      if(!amount(order.shippingPrice).isZero())fail("SHIPPING_SNAPSHOT_REQUIRED");
    }else if(order.shippingMode==="SELLER_ARRANGED"){
      const price=amount(order.shippingPrice);
      if(order.shippingPriceBasis==="per_ton")shipping=price.times(weight).toDecimalPlaces(precision??0);
      else if(order.shippingPriceBasis==="fixed"){
        // A zero fixed price needs no allocation. Nonzero fixed-order shipping needs
        // an approved cross-loading allocation/residual policy; do not invent one.
        if(!price.isZero())fail("FIXED_SHIPPING_ALLOCATION_REQUIRED");
      }else fail("SHIPPING_SNAPSHOT_REQUIRED");
    }else fail("SHIPPING_SNAPSHOT_REQUIRED");
  }catch{fail("SHIPPING_SNAPSHOT_REQUIRED");}
  let dueDate="";
  const terms=order.paymentTermsDays;
  if(typeof terms!=="number"||!Number.isInteger(terms)||terms<0||terms>3650||!date.success)fail("TERMS_REQUIRED");
  else{
    const d=new Date(`${date.data}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate()+terms);
    const iso=d.toISOString().slice(0,10);
    if(!dateString.safeParse(iso).success)fail("TERMS_REQUIRED");else dueDate=iso;
  }
  let amounts:LoadingInvoiceAmounts|null=null;
  if(!issues.size){
    try{
      const total=goods.plus(tax).plus(shipping);
      if(!total.gt(0))throw new Error("Invoice total must be positive");
      amounts={goods:exactMoney(goods.toFixed(),precision!),tax:exactMoney(tax.toFixed(),precision!),
        shipping:exactMoney(shipping.toFixed(),precision!),total:exactMoney(total.toFixed(),precision!),dueDate,lines:resultLines};
    }catch{fail("AMOUNT_OUT_OF_RANGE");}
  }
  return {factId:fact.id,orderId:fact.orderId,orderNumber:typeof order.orderNumber==="string"?order.orderNumber:null,
    loadingReference:reference,eventDate:date.success?date.data:null,currency,issues:[...issues],amounts};
}