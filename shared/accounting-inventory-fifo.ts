import {loadingPreviewFiltersSchema} from "./accounting-loading-preview";
export const inventoryFifoFiltersSchema=loadingPreviewFiltersSchema;
export type FifoIssue="INVALID_LOADING_HISTORY"|"DOCUMENTED_STOCK_SHORTFALL"|"PREVIOUS_SHORTFALL"|"AMBIGUOUS_LAYER_IDENTITY";
export interface FifoAllocation {
  documentId:number;documentRevision:number;documentReference:string;documentDate:string;
  lineIndex:number;batchReference:string;quantityTons:string;currency:string;documentedCost:string;
}
export interface FifoLine {
  orderItemId:number;productId:number;quantityTons:string;shortfallTons:string|null;
  allocations:FifoAllocation[];issues:FifoIssue[];
}
export interface FifoLoading {
  factId:number;orderId:number;loadingReference:string;eventDate:string|null;
  lines:FifoLine[];issues:FifoIssue[];
  documentedCosts:{currency:string;amount:string}[]|null;
}
export interface InventoryFifoReport {
  company:{id:number;name:string};
  rows:FifoLoading[];pagination:{page:number;pageSize:number;totalRows:number};
  sourceDocumentCount:number;historyCount:number;
  basis:"current_approved_documents";valuationStatus:"documentary_simulation";
  postingAllowed:false;stockChanged:false;readOnly:true;
  pending:["STOCK_OPENING_RECONCILIATION","HISTORICAL_CONSUMPTION_RECONCILIATION","BASE_CARRYING_VALUES","INVOICE_CONSUMER"];
}
