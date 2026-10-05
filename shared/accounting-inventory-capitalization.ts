import {z} from "zod";
const id=z.number().int().positive().max(2147483647);
export const capitalizationQuerySchema=z.object({companyId:z.coerce.number().int().positive().max(2147483647)}).strict();
export const capitalizationCommandSchema=z.object({
  companyId:id,documentId:id,expectedPlanHash:z.string().regex(/^[a-f0-9]{64}$/),
  reason:z.string().trim().min(5).max(500),
}).strict();
export type CapitalizationBlocker="CAPITALIZATION_CLOSED"|"DOCUMENT_NOT_APPROVED"|"OPEN_PERIOD_REQUIRED"|
  "STOCK_ACCOUNT_REQUIRED"|"COUNTER_ACCOUNT_REQUIRED"|"OFFICIAL_RATE_REQUIRED"|"FOREIGN_OPENING_CARRYING_REQUIRED"|
  "BASE_VALUE_TOO_SMALL"|"EXISTING_STOCK_PROOF"|"BACKDATED_STOCK_RECONCILIATION_REQUIRED"|"INACTIVE_CURRENCY";
export interface CapitalizationPlan{
  companyId:number;documentId:number;revision:number;reference:string;kind:"purchase"|"opening";
  documentDate:string;supplier:string;evidenceReference:string;currency:string;baseCurrency:string;nativeTotal:string;
  baseTotal:string|null;rate:null|{id:number|null;value:string;effectiveOn:string;source:"base_currency"|"central_bank"};
  stockAccountId:number|null;counterAccount:null|{id:number;code:string;name:string;type:string};
  lines:{lineIndex:number;productId:number;productName:string;batchReference:string;quantityTons:string;
    nativeCost:string;baseCost:string|null}[];
  blockers:CapitalizationBlocker[];postingAllowed:boolean;planHash:string;
  posted:null|{id:number;journalId:number;bookIds:number[];reason:string};
}
export interface CapitalizationWorkbench{
  companyId:number;activationEnabled:boolean;rows:CapitalizationPlan[];stockChanged:false;
}
