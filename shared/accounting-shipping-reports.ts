import {z} from "zod";
import {dateString,currencyCode} from "./accounting-api";
const id=z.preprocess(v=>v===""?undefined:v,z.coerce.number().int().positive().max(2147483647).optional());
export const shippingReportFiltersSchema=z.object({
  companyId:z.coerce.number().int().positive().max(2147483647),
  from:dateString,to:dateString,view:z.enum(["loading","order"]).default("loading"),
  orderId:id,loadingSourceId:z.string().trim().min(1).max(150).optional(),
  currency:currencyCode.optional(),costCenterId:id,partyId:id,partyType:z.enum(["customer","carrier"]).optional(),
  page:z.coerce.number().int().min(1).max(100000).default(1),
  pageSize:z.coerce.number().int().min(1).max(200).default(50),
}).strict().superRefine((v,c)=>{
  if(v.from>v.to||v.from<"0001-01-01")c.addIssue({code:"custom",message:"Invalid report date range",path:["from"]});
  if(Boolean(v.partyId)!==Boolean(v.partyType))c.addIssue({code:"custom",message:"Party type and ID are required together",path:["partyId"]});
  if(v.loadingSourceId&&!v.orderId)c.addIssue({code:"custom",message:"Choose an order for a loading reference",path:["orderId"]});
  if(v.view==="order"&&v.loadingSourceId)c.addIssue({code:"custom",message:"Loading selection is only supported in the loading view",path:["loadingSourceId"]});
});
export type ShippingReportFilters=z.infer<typeof shippingReportFiltersSchema>;
export type ShippingMarginBlock="MAPPINGS_REQUIRED"|"PARTIAL_SCOPE"|"REVENUE_NOT_POSTED"|"COST_NOT_POSTED"|"UNPOSTED_COST_FACTS"|"COST_EVIDENCE_MISMATCH";
export interface ShippingMarginRow{
  orderId:number;orderNumber:string|null;loadingSourceId:string|null;
  loadingCount:number;revenueEntryCount:number;costEntryCount:number;unpostedLoadingCount:number;unpostedCostLoadingCount:number;unpostedCostCount:number;costEvidenceIssueCount:number;
  revenueBase:string|null;costBase:string|null;marginBase:string|null;
  periodRevenueBase:string;periodCostBase:string;
  blockedReasons:ShippingMarginBlock[];
}
export interface ShippingMarginReport{
  filters:ShippingReportFilters;
  company:{id:number;name:string;baseCurrency:string};currencies:{code:string;decimals:number}[];
  rows:ShippingMarginRow[];pagination:{page:number;pageSize:number;totalRows:number};
  totals:{knownRevenueBase:string;knownCostBase:string;knownMarginBase:string;marginBase:string|null;
    periodRevenueBase:string;periodCostBase:string;incompleteGroupCount:number;completeGroupCount:number;};
  coverage:{mappingReady:boolean;mappingBasis:"current";legacyOpeningVerified:false;includesReversals:true;
    amountsBasis:"selected-groups-as-of-to";periodBasis:"posted-entry-date";
    unattributedScope:"company-period-line-filters";unattributedPeriodLineCount:number;
    unattributedPeriodRevenueBase:string;unattributedPeriodCostBase:string;postedEntryCount:number;
    capturedLoadingCount:number;unlinkedFactCount:number;financialCutoversReady:boolean;};
}