import {z} from "zod";
import {dateString,currencyCode,decimalString} from "./accounting-api";
const id=z.number().int().positive().max(2147483647);
const weight=decimalString.refine(v=>/^(0|[1-9][0-9]{0,29})([.][0-9]{1,8})?$/.test(v)&&/[1-9]/.test(v),"Positive measured decimal weight required");
const amount=decimalString.refine(v=>/^(0|[1-9][0-9]{0,29})([.][0-9]{1,8})?$/.test(v),"Bounded decimal amount required");
const reference=z.string().trim().min(1).max(150);
export const inventoryCostCaptureSchema=z.object({
  orderItemId:id,batchReference:reference,documentReference:reference,
  weightTons:weight,amount,currency:currencyCode,
}).strict();
export const loadingCaptureSchema=z.object({
  companyId:id,orderId:id,sourceId:reference,eventDate:dateString.refine(v=>v>="0001-01-01"),weighbridgeReference:reference,
  actualWeightTons:weight,lines:z.array(z.object({orderItemId:id,actualWeightTons:weight}).strict()).min(1).max(500),
  inventoryCosts:z.array(inventoryCostCaptureSchema).min(1).max(500).optional(),
}).strict();
export type LoadingCaptureInput=z.infer<typeof loadingCaptureSchema>;
export type InventoryCostCapture=z.infer<typeof inventoryCostCaptureSchema>;
export interface CapturedPricingLine {
  orderItemId:number;nativeUnit:string;tonsToPriceUnits:"1"|"1000";lockedUnitPrice:string;pricePerTon:string;
  basis:"frozen-explicit-metric-unit";
}
export interface LoadingCaptureContext{
  company:{id:number;name:string};order:{id:number;number:string|null;currency:string|null;snapshotVersion:number|null};
  lines:{orderItemId:number;productId:number|null;name:string|null;quantity:string|null;unit:string|null;lockedUnitPrice:string|null;taxRate:string|null}[];
  pricing:CapturedPricingLine[];
  loadings:{factId:number;reference:string;eventDate:string|null;weightTons:string|null;inventoryCostCount:number;inventoryCosts:InventoryCostCapture[]}[];
  permissions:{canCapture:boolean};captureOnly:true;financialPostingAllowed:false;
  inventoryEvidenceBasis:"staff-document-attestation-not-verified-stock-valuation";
}
export interface LoadingCaptureResult{factId:number;duplicate:boolean;captureOnly:true}
export type LoadingCaptureScope={companyId:number;orderId?:number;orderNumber?:string};