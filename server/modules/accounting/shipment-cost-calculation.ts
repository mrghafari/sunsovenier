import {dateString} from "@shared/accounting-api";
import {decimal,exactMoney} from "./money";

const obj=(value:unknown):Record<string,unknown>=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
const positive=(value:unknown)=>{
  if(typeof value!=="string"||!/^\d{1,30}(?:\.\d{1,8})?$/.test(value)||!decimal(value).gt(0))
    throw new Error("A positive exact decimal is required");
  return decimal(value);
};
export function calculateShipmentCost(payload:unknown,loadingPayload:unknown,baseCurrency:string,decimals:number){
  const p=obj(payload),input=obj(p.input),order=obj(p.order),fleet=obj(p.fleet);
  const loading=obj(loadingPayload),measured=obj(loading.input),loadingOrder=obj(loading.order);
  if(input.eventType!=="ShipmentCostRecorded"||measured.eventType!=="LoadingCompleted"
    ||order.version!==1||loadingOrder.version!==1
    ||!Number.isSafeInteger(input.orderId)||input.orderId!==measured.orderId
    ||order.orderId!==input.orderId||loadingOrder.orderId!==input.orderId
    ||order.companyId!==loadingOrder.companyId
    ||input.loadingSourceId!==measured.sourceId
    ||typeof measured.weighbridgeReference!=="string"||!measured.weighbridgeReference.trim()
    ||typeof input.sourceId!=="string"||!input.sourceId.trim()
    ||!dateString.safeParse(input.eventDate).success||!dateString.safeParse(measured.eventDate).success
    ||String(input.eventDate)<String(measured.eventDate))
    throw new Error("Shipment and measured loading identities must match");
  if(order.shippingMode!=="SELLER_ARRANGED"||loadingOrder.shippingMode!=="SELLER_ARRANGED")
    throw new Error("Seller-arranged shipping required");
  const total=positive(measured.actualWeightTons),ids=new Set<number>();
  if(!Array.isArray(measured.lines)||!measured.lines.length)throw new Error("Measured loading lines required");
  const sum=measured.lines.reduce((sum,line)=>{
    const item=obj(line);
    if(!Number.isSafeInteger(item.orderItemId)||Number(item.orderItemId)<=0||ids.has(Number(item.orderItemId)))
      throw new Error("Distinct measured loading lines required");
    ids.add(Number(item.orderItemId));
    return sum.plus(positive(item.actualWeightTons));
  },decimal("0"));
  if(!sum.eq(total))throw new Error("Measured loading total must equal its lines");
  if(input.costType==="EXTERNAL_CARRIER"){
    if(typeof input.carrierReference!=="string"||!input.carrierReference.trim()
      ||typeof input.costDocumentReference!=="string"||!input.costDocumentReference.trim()
      ||typeof input.currency!=="string")throw new Error("Documented carrier cost required");
    const amount=exactMoney(positive(input.actualCost).toFixed(),decimals);
    return {amount,currency:input.currency,costType:"EXTERNAL_CARRIER" as const,
      fleetCostCenterId:null,fleetRate:null,fleetRateBasis:null,quantity:null};
  }
  if(input.costType!=="INTERNAL_FLEET"||fleet.currency!==baseCurrency
    ||!Number.isSafeInteger(fleet.costCenterId)||Number(fleet.costCenterId)<=0)
    throw new Error("Frozen fleet evidence required");
  const rate=positive(fleet.rate);
  const quantity=fleet.basis==="per_ton"?positive(measured.actualWeightTons):
    fleet.basis==="per_km"?positive(input.distanceKm):null;
  if(!quantity)throw new Error("Known frozen fleet rate basis required");
  const amount=rate.mul(quantity).toDecimalPlaces(decimals).toFixed(decimals);
  if(!decimal(amount).gt(0))throw new Error("Rounded cost must remain positive");
  return {amount,currency:baseCurrency,costType:"INTERNAL_FLEET" as const,
    fleetCostCenterId:Number(fleet.costCenterId),fleetRate:rate.toFixed(),
    fleetRateBasis:String(fleet.basis),quantity:quantity.toFixed()};
}
