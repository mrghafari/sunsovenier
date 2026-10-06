import {z} from "zod";
import {dateString,decimalString,currencyCode} from "./accounting-api";
const id=z.number().int().positive().max(2147483647);
export const manualDocumentSchema=z.object({
  companyId:id,sourceId:z.string().trim().min(3).max(150),kind:z.enum(["manual","expense"]),
  entryDate:dateString,description:z.string().trim().min(5).max(2000),
  evidenceReference:z.string().trim().min(5).max(500),currency:currencyCode.optional(),
  lines:z.array(z.object({accountId:id,debit:decimalString,credit:decimalString,
    costCenterId:id.nullable().default(null),description:z.string().trim().max(500).default("")}).strict()).min(2).max(100),
}).strict();
export type ManualDocumentInput=z.infer<typeof manualDocumentSchema>;
export const saveManualDocumentSchema=z.object({
  document:manualDocumentSchema,id:id.optional(),revision:id.optional(),
}).strict().refine(d=>Boolean(d.id)===Boolean(d.revision),"Editing requires document ID and revision");
export const manualDocumentActionSchema=z.object({companyId:id,revision:id,attested:z.literal(true)}).strict();
export const reverseManualDocumentSchema=manualDocumentActionSchema.extend({
  entryDate:dateString,reason:z.string().trim().min(5).max(2000),evidenceReference:z.string().trim().min(5).max(500),
});
export const manualDocumentFiltersSchema=z.object({
  companyId:z.coerce.number().int().positive().max(2147483647),
  kind:z.enum(["manual","expense"]).optional(),status:z.enum(["draft","posted","discarded","reversed"]).optional(),
  q:z.string().trim().max(100).default(""),from:dateString.optional(),to:dateString.optional(),
  page:z.coerce.number().int().min(1).max(100000).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(50),
}).strict().refine(d=>Boolean(d.from)===Boolean(d.to)&&(!d.from||!d.to||d.from<=d.to),"Valid paired dates required");
export type ManualDocumentFilters=z.infer<typeof manualDocumentFiltersSchema>;
export type ManualDocumentStatus="draft"|"posted"|"discarded"|"reversed";
export interface ManualAccount {
  id:number;code:string;nameFa:string|null;nameAr:string;nameEn:string;type:string;
  funding:boolean;
}
export interface ManualDocumentMetadata {
  company:{id:number;name:string;baseCurrency:string;isActive:boolean};
  currencyDecimals:number;currencyActive:boolean;postingReady:boolean;manualCutoverReady:boolean;
  pipelineReady:boolean;ledgerGuardsReady:boolean;
  accounts:ManualAccount[];
  costCenters:{id:number;code:string;nameFa:string|null;nameAr:string;nameEn:string}[];
  fiscalPeriods:{id:number;name:string;startsOn:string;endsOn:string;status:string}[];
  baseCurrencyOnly:false;
  currencies:{code:string;decimals:number}[];
  foreignExpenseReady:boolean;
}
export interface ManualDocumentPreview {
  currency:string;debit:string;credit:string;difference:string;balanced:boolean;periodOpen:boolean;
  foreignExpense?:ForeignExpenseValuation;
}
export interface ForeignExpenseValuation {
  available:boolean;blockingReason:string|null;baseCurrency:string;
  officialRate:string|null;expenseBase:string|null;fundingBase:string|null;
  fxGain:string|null;fxLoss:string|null;availableNative:string|null;availableBase:string|null;
  lines?:ManualDocumentDetail["postedLines"];
}
export interface ManualDocumentRow {
  id:number;companyId:number;sourceId:string;kind:"manual"|"expense";entryDate:string;description:string;
  evidenceReference:string;status:ManualDocumentStatus;revision:number;journalId:number|null;
  reversalJournalId:number|null;currency:string;debit:string;credit:string;
}
export interface ManualDocumentDetail {
  metadata:ManualDocumentMetadata;row:ManualDocumentRow;document:ManualDocumentInput;
  preview:ManualDocumentPreview;
  history:{id:number;action:string;actorType:string;entryDate:string;createdAt:string;reason:string;evidenceReference:string;journalId:number|null}[];
  postedLines:{accountId:number;currency:string;debit:string;credit:string;baseDebit:string;baseCredit:string;exchangeRate:string;costCenterId:number|null;description:string}[];
  foreignExpense?:ForeignExpenseValuation;
  journalAccounts?:ManualAccount[];
}
export interface ManualDocumentList {
  metadata:ManualDocumentMetadata;items:ManualDocumentRow[];totalRows:number;page:number;pageSize:number;
}