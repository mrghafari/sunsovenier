import {z} from "zod";
import {loadingPreviewFiltersSchema,type LoadingInvoiceAmounts} from "./accounting-loading-preview";
export const loadingInvoiceFiltersSchema=loadingPreviewFiltersSchema;
const id=z.number().int().positive().max(2147483647);
export const loadingInvoiceCommandSchema=z.object({
  companyId:id,factId:id,expectedPlanHash:z.string().regex(/^[a-f0-9]{64}$/),
  reason:z.string().trim().min(5).max(500),settleFromHold:z.boolean().default(false),
}).strict();
export const stockBookCommandSchema=z.object({
  companyId:id,documentId:id,lineIndex:z.number().int().min(0).max(99),journalId:id,
  baseCost:z.string().regex(/^(0|[1-9]\d{0,21})(\.\d{1,8})?$/),
  evidenceReference:z.string().trim().min(5).max(500),
}).strict();
export type LoadingInvoiceBlocker="CUTOVER_CLOSED"|"INVALID_CAPTURE"|"FOREIGN_INVOICE_VALUATION_REQUIRED"|
  "CUSTOMER_BINDING_REQUIRED"|"LEGACY_OR_PAID_ORDER"|"FINANCE_APPROVAL_REQUIRED"|"COMMERCIAL_REVIEW_REQUIRED"|
  "POSTING_MAPPING_REQUIRED"|"OPEN_PERIOD_REQUIRED"|"EARLIER_LOADING_PENDING"|"VERIFIED_STOCK_SHORTFALL"|"ORDER_WEIGHT_REQUIRED"|
  "BACKDATED_HISTORY_RECONCILIATION_REQUIRED"|"STOCK_RECONCILIATION_REQUIRED";
export interface StockBookAllocation {
  layerId:number;documentId:number;lineIndex:number;productId:number;orderItemId:number;
  batchReference:string;quantityTons:string;baseCost:string;
}
export interface LoadingInvoicePlan {
  companyId:number;factId:number;orderId:number;sourceId:string;eventDate:string|null;
  currency:string|null;baseCurrency:string;customerId:number|null;
  amounts:LoadingInvoiceAmounts|null;allocations:StockBookAllocation[];baseCost:string|null;
  blockers:LoadingInvoiceBlocker[];planHash:string;postingAllowed:boolean;
  posted:{invoiceId:number;journalId:number;cogsJournalId:number|null;receivableId:number;settlementId:number|null}|null;
}
export interface LoadingInvoiceWorkbench {
  company:{id:number;name:string;baseCurrency:string};rows:LoadingInvoicePlan[];
  pagination:{page:number;pageSize:number;totalRows:number};activationEnabled:boolean;
}
export interface StockBookMetadata {
  companyId:number;baseCurrency:string;
  documents:{id:number;reference:string;currency:string;lines:{productId:number;batchReference:string;quantityTons:string;totalCost:string}[]}[];
  journals:{id:number;documentId:number;reference:string;inventoryBase:string}[];
  books:{id:number;documentId:number;lineIndex:number;baseCost:string;quantityTons:string;evidenceReference:string}[];
}
