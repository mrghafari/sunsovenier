import type {AccountingReportFilters} from "./accounting-reports";

export interface CostReportAmounts {
  actualCostBase:string;
  allocationChargeBase:string;
  absorbedBase:string;
  netExpenseBase:string;
}
export interface CostCenterReportRow extends CostReportAmounts {
  costCenterId:number|null;code:string|null;nameFa:string|null;nameAr:string|null;nameEn:string|null;
  currency:string;lineCount:number;
  actualNativeDebit:string;actualNativeCredit:string;actualNativeNet:string;
}
export interface AccountingCostReport {
  filters:AccountingReportFilters;
  company:{id:number;name:string;baseCurrency:string};
  currencies:{code:string;decimals:number}[];
  coverage:{
    postedEntryCount:number;periodEntryCount:number;expenseLineCount:number;
    legacyOpeningVerified:false;financialCutoversReady:boolean;
    mappingBasis:"current";includesReversals:true;
  };
  rows:CostCenterReportRow[];
  pagination:{page:number;pageSize:number;totalRows:number};
  totals:CostReportAmounts & {unassignedActualCostBase:string;unassignedLineCount:number};
  fleet:{
    available:boolean;
    blockingReason:"FLEET_CENTER_REQUIRED"|"FLEET_MAPPING_REQUIRED"|"PARTIAL_SCOPE"|"MISPLACED_ABSORPTION"|null;
    center:{id:number;code:string;nameFa:string|null;nameAr:string|null;nameEn:string|null}|null;
    amounts:(CostReportAmounts & {varianceBase:string;underAbsorbedBase:string;overAbsorbedBase:string})|null;
    misplacedAbsorptionLineCount:number;
    absorbedAccountId:number|null;shippingExpenseAccountId:number|null;
  };
}