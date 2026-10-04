import {Money} from "./money";
import type {CapturedPricingLine} from "@shared/accounting-loading-capture";
const tons=new Set(["ton","tons","tonne","tonnes","t","طن","تن"]);
const kg=new Set(["kg","kilogram","kilograms","كيلوغرام","کیلوگرم"]);
export function capturedMetricPricing(order:unknown):CapturedPricingLine[]{
  if(!order||typeof order!=="object")return [];
  const o=order as Record<string,unknown>;
  if(o.version!==1||!Array.isArray(o.lines))return [];
  return o.lines.flatMap(raw=>{
    if(!raw||typeof raw!=="object")return [];
    const l=raw as Record<string,unknown>;
    if(l.version!==1||typeof l.orderItemId!=="number"||!Number.isInteger(l.orderItemId)||l.orderItemId<=0||
      typeof l.lockedUnitPrice!=="string"||!/^[0-9]{1,30}([.][0-9]{1,8})?$/.test(l.lockedUnitPrice))return [];
    const nativeUnit=typeof l.unit==="string"?l.unit:"",normal=nativeUnit.trim().toLowerCase();
    const factor=l.priceBasis==="per_ton"?"1":l.priceBasis==="native_order_unit"&&tons.has(normal)?"1":
      l.priceBasis==="native_order_unit"&&kg.has(normal)?"1000":null;
    if(!factor)return [];
    return [{orderItemId:l.orderItemId,nativeUnit,tonsToPriceUnits:factor as "1"|"1000",lockedUnitPrice:l.lockedUnitPrice,
      pricePerTon:new Money(l.lockedUnitPrice).times(factor).toFixed(),basis:"frozen-explicit-metric-unit" as const}];
  });
}