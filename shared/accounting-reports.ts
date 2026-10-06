import {z} from "zod";
import {dateString,currencyCode} from "./accounting-api";

export const accountingReportNames=["journal","ledger","trial-balance"] as const;
export type AccountingReportName=typeof accountingReportNames[number];
const optionalId=z.preprocess(v=>v===""?undefined:v,z.coerce.number().int().positive().max(2147483647).optional());
export const accountingReportFiltersSchema=z.object({
  companyId:z.coerce.number().int().positive().max(2147483647),
  from:dateString,to:dateString,
  accountId:optionalId,costCenterId:optionalId,partyId:optionalId,entryId:optionalId,
  partyType:z.enum(["customer","carrier"]).optional(),
  currency:currencyCode.optional(),
  page:z.coerce.number().int().min(1).max(100000).default(1),
  pageSize:z.coerce.number().int().min(1).max(200).default(50),
}).strict().superRefine((v,c)=>{
  if(v.from>v.to)c.addIssue({code:"custom",message:"Start date must not follow end date",path:["from"]});
  if(v.from<"0001-01-01"||v.to<"0001-01-01")c.addIssue({code:"custom",message:"Invalid report year",path:["from"]});
  if(Boolean(v.partyId)!==Boolean(v.partyType))c.addIssue({code:"custom",message:"Party type and ID are required together",path:["partyId"]});
});
export type AccountingReportFilters=z.infer<typeof accountingReportFiltersSchema>;
export type AccountingReportRow=Record<string,string|null>;
export interface AccountingReport {
  report:AccountingReportName;
  filters:AccountingReportFilters;
  company:{id:number;name:string;baseCurrency:string};
  coverage:{postedEntryCount:number;walletCutoverReady:boolean;receiptCutoverReady:boolean;legacyOpeningVerified:false};
  rows:AccountingReportRow[];
  nativeBalances?:{currency:string;opening:string;debit:string;credit:string;closing:string}[];
  pagination:{page:number;pageSize:number;totalRows:number};
  totals:{
    openingBase:string;periodBaseDebit:string;periodBaseCredit:string;closingBase:string;
    closingDebit:string;closingCredit:string;
    balanceScope:"full"|"filtered";isBalanced:boolean;
  };
}