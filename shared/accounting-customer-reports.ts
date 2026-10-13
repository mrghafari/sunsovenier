import {z} from "zod";
import {dateString,currencyCode} from "./accounting-api";
export const customerReportNames=["customer-statement","receivables-aging"] as const;
export type CustomerReportName=typeof customerReportNames[number];
const id=z.coerce.number().int().positive().max(2147483647);
export const accountingCustomerCodeSchema=z.string().trim().transform(value=>value.replace(/[۰-۹٠-٩]/g,
  digit=>String("۰۱۲۳۴۵۶۷۸۹".includes(digit)?"۰۱۲۳۴۵۶۷۸۹".indexOf(digit):"٠١٢٣٤٥٦٧٨٩".indexOf(digit))))
  .pipe(z.string().regex(/^9[0-9]{6}$/,"Enter the seven-digit customer number starting with 9"));
export const customerReportFiltersSchema=z.object({
  companyId:id,customerId:z.preprocess(v=>v===""?undefined:v,id.optional()),currency:currencyCode.optional(),
  customerCode:z.preprocess(v=>typeof v==="string"&&v.trim()===""?undefined:v,accountingCustomerCodeSchema.optional()),
  from:dateString.optional(),to:dateString.optional(),asOf:dateString.optional(),
  page:z.coerce.number().int().min(1).max(100000).default(1),
  pageSize:z.coerce.number().int().min(1).max(200).default(50),
}).strict().superRefine((v,c)=>{
  if(v.customerId&&v.customerCode)c.addIssue({code:"custom",message:"Use either customer number or internal ID, not both",path:["customerCode"]});
  if(v.from&&v.to&&v.from>v.to)c.addIssue({code:"custom",message:"Invalid date range",path:["from"]});
  for(const key of ["from","to","asOf"] as const)if(v[key]&&v[key]!<"0001-01-01")
    c.addIssue({code:"custom",message:"Invalid report year",path:[key]});
});
export type CustomerReportFilters=z.infer<typeof customerReportFiltersSchema>;
export type CustomerReportRow=Record<string,string|null>;
export interface CustomerReportBalance {
  currency:string;opening:string;periodDebit:string;periodCredit:string;closing:string;
  openingBase:string;periodBaseDebit:string;periodBaseCredit:string;closingBase:string;
}
export interface CustomerAgingSummary {
  currency:string;current:string;days1to30:string;days31to60:string;days61to90:string;over90:string;
  trackedOutstanding:string;unclassifiedDebit:string;unclassifiedCredit:string;ledgerClosing:string;
}
export interface CustomerAccountingReport {
  report:CustomerReportName;filters:CustomerReportFilters;
  company:{id:number;name:string;baseCurrency:string};
  customer:{id:number;name:string;code:string|null}|null;
  coverage:{postedEntryCount:number;receivableAccountCount:number;legacyOpeningVerified:false;
    walletCutoverReady:boolean;receiptCutoverReady:boolean};
  rows:CustomerReportRow[];balances:CustomerReportBalance[];agingSummaries:CustomerAgingSummary[];
  pagination:{page:number;pageSize:number;totalRows:number};
}