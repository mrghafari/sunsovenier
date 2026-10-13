import {z} from "zod";
import type {LoadingFixedShipping} from "./accounting-loading-shipping";
export const accountingOrderNumberSchema=z.string().trim().transform(value=>value.replace(/[۰-۹٠-٩]/g,
  digit=>String("۰۱۲۳۴۵۶۷۸۹".includes(digit)?"۰۱۲۳۴۵۶۷۸۹".indexOf(digit):"٠١٢٣٤٥٦٧٨٩".indexOf(digit))).toUpperCase())
  .pipe(z.string().max(150).regex(/^M[0-9]+$/,"Enter the order number, for example M2601287"));
export const loadingPreviewFiltersSchema=z.object({
  companyId:z.coerce.number().int().positive().max(2147483647),
  orderId:z.coerce.number().int().positive().max(2147483647).optional(),
  orderNumber:accountingOrderNumberSchema.optional(),
  page:z.coerce.number().int().min(1).max(100000).default(1),
  pageSize:z.coerce.number().int().min(1).max(100).default(25),
}).strict().refine(f=>!(f.orderId&&f.orderNumber),"Use either an order number or an internal order ID, not both");
export type LoadingPreviewFilters=z.infer<typeof loadingPreviewFiltersSchema>;
export type LoadingPreviewIssue="INVALID_CAPTURE"|"LEGACY_SNAPSHOT"|"SNAPSHOT_IDENTITY"|"UNKNOWN_CURRENCY"|
  "INVALID_MEASUREMENTS"|"LINE_SNAPSHOT_REQUIRED"|"PRICE_BASIS_REQUIRED"|"TAX_SNAPSHOT_REQUIRED"|
  "SHIPPING_SNAPSHOT_REQUIRED"|"FIXED_SHIPPING_ALLOCATION_REQUIRED"|"TERMS_REQUIRED"|"AMOUNT_OUT_OF_RANGE";
export interface LoadingInvoiceAmounts {
  goods:string;tax:string;shipping:string;total:string;dueDate:string;
  lines:{orderItemId:number;weightTons:string;goods:string;tax:string}[];
}
export interface LoadingPreviewRow {
  factId:number;orderId:number;orderNumber:string|null;loadingReference:string;eventDate:string|null;currency:string|null;
  issues:LoadingPreviewIssue[];amounts:LoadingInvoiceAmounts|null;
  fixedShipping?:LoadingFixedShipping;
  weightControl?:LoadingWeightControl;
}
export interface LoadingWeightControl {
  status:"WITHIN_CONTRACT"|"CONTRACT_LIMIT_EXCEEDED"|"CONTRACT_TERMS_REQUIRED"|
    "ORDER_WEIGHT_REQUIRED"|"INVALID_LOADING_HISTORY";
  orderedWeightTons:string|null;loadedWeightTons:string|null;excessWeightTons:string|null;
  allowedWeightTons:string|null;allowancePercent:string|null;contractNumber:string|null;
  loadingCount:number;reviewDepartment:"commercial";postingAllowed:false;
}
export interface LoadingPreviewReport {
  company:{id:number;name:string};
  filters:LoadingPreviewFilters;currencies:{code:string;decimals:number}[];
  rows:LoadingPreviewRow[];pagination:{page:number;pageSize:number;totalRows:number};
  postingAllowed:false;readOnly:true;
  pending:["INVENTORY_COST_EVIDENCE","WEIGHT_TOLERANCE_APPROVAL","AR_AND_SETTLEMENT","OPENING_AND_CUTOVER"];
}