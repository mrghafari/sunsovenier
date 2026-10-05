import {z} from "zod";

const id=z.coerce.number().int().positive().max(2147483647);
export const shipmentCostFiltersSchema=z.object({
  companyId:id,orderId:id.optional(),page:id.default(1),
  pageSize:z.coerce.number().int().min(1).max(100).default(20),
}).strict();
export const shipmentCostCommandSchema=z.object({
  companyId:z.number().int().positive().max(2147483647),factId:z.number().int().positive().max(2147483647),
  carrierPartyId:z.number().int().positive().max(2147483647).nullable().default(null),
  expectedPlanHash:z.string().regex(/^[a-f0-9]{64}$/),
  reason:z.string().trim().min(5).max(500),
}).strict();
export type ShipmentCostBlocker="INVALID_CAPTURE"|"LOADING_REQUIRED"|"CUSTOMER_ARRANGED"
  |"CURRENCY_REQUIRED"|"FLEET_CENTER_REQUIRED"|"POSTING_MAPPING_REQUIRED"
  |"OFFICIAL_RATE_REQUIRED"|"BASE_AMOUNT_ZERO"|"PERIOD_CLOSED"
  |"CUTOVER_CLOSED"|"FOREIGN_CUTOVER_CLOSED"|"COMPANY_INACTIVE";
export interface ShipmentCostPlan {
  factId:number;orderId:number;sourceId:string;loadingSourceId:string|null;eventDate:string|null;
  planHash:string;
  costType:"EXTERNAL_CARRIER"|"INTERNAL_FLEET"|null;
  carrierReference:string|null;costDocumentReference:string|null;
  currency:string|null;decimals:number|null;amount:string|null;baseAmount:string|null;
  baseCurrency:string;rate:string|null;rateReference:string|null;
  rateEffectiveOn:string|null;fleetCostCenterId:number|null;
  fleetRate:string|null;fleetRateBasis:string|null;quantity:string|null;
  blockers:ShipmentCostBlocker[];
  // A plan never permits automatic posting. A manager command rechecks all gates.
  postingAllowed:false;
  posted:{id:number;journalId:number;carrierPartyId:number|null;reason:string}|null;
}
export interface ShipmentCostWorkbench {
  company:{id:number;name:string;baseCurrency:string};
  rows:ShipmentCostPlan[];
  pagination:{page:number;pageSize:number;totalRows:number};
  activationEnabled:false;
}
