import {z} from "zod";
import {dateString,positiveDecimal,currencyCode} from "./accounting-api";
const id=z.number().int().positive();
export const receiptInputSchema=z.object({
  companyId:id,customerId:id,currency:currencyCode,sourceId:z.string().trim().min(3).max(150),
  entryDate:dateString,amount:positiveDecimal,method:z.enum(["BANK","CASH","CHEQUE"]),
  evidenceReference:z.string().trim().min(5).max(500),reason:z.string().trim().min(5).max(500),
  chequeNumber:z.string().trim().min(1).max(100).optional(),
  allocations:z.array(z.object({receivableId:id,amount:positiveDecimal}).strict()).max(100).default([]),
}).strict().superRefine((d,c)=>{
  if(d.method==="CHEQUE"&&!d.chequeNumber)c.addIssue({code:"custom",message:"Cheque number required"});
  if(new Set(d.allocations.map(a=>a.receivableId)).size!==d.allocations.length)c.addIssue({code:"custom",message:"Duplicate receivable allocation"});
});
export const receiptEventSchema=z.object({sourceId:z.string().trim().min(3).max(150),entryDate:dateString,
  evidenceReference:z.string().trim().min(5).max(500),reason:z.string().trim().min(5).max(500)}).strict();
export type ReceiptInput=z.input<typeof receiptInputSchema>;
export type ReceiptEventInput=z.input<typeof receiptEventSchema>;
export type ReceiptMethod="BANK"|"CASH"|"CHEQUE";
export type ReceiptStatus="confirmed"|"received"|"deposited"|"cleared"|"bounced"|"returned";
export type ReceiptAction="deposited"|"cleared"|"bounced"|"returned";
export function allowedReceiptActions(method:ReceiptMethod,status:ReceiptStatus):ReceiptAction[]{
  if(method!=="CHEQUE")return status==="confirmed"?["returned"]:[];
  if(status==="received")return ["deposited","bounced"];
  if(status==="deposited")return ["cleared","bounced"];
  return status==="cleared"?["bounced"]:[];
}
const queryId=z.coerce.number().int().positive().max(2147483647);
export const receiptListFiltersSchema=z.object({
  companyId:queryId,customerId:queryId.optional(),currency:currencyCode.optional(),
  method:z.enum(["BANK","CASH","CHEQUE"]).optional(),
  status:z.enum(["confirmed","received","deposited","cleared","bounced","returned"]).optional(),
  from:dateString.optional(),to:dateString.optional(),
  page:z.coerce.number().int().min(1).max(100000).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(50),
}).strict().superRefine((d,c)=>{
  if(Boolean(d.from)!==Boolean(d.to)||d.from&&d.to&&d.from>d.to)
    c.addIssue({code:"custom",message:"Choose a valid paired date range"});
  if(d.from&&d.from<"0001-01-01"||d.to&&d.to<"0001-01-01")c.addIssue({code:"custom",message:"Invalid report year"});
});
export type ReceiptListFilters=z.infer<typeof receiptListFiltersSchema>;
export interface ReceiptMetadata {
  company:{id:number;name:string;baseCurrency:string;isActive:boolean};
  walletCutoverReady:boolean;receiptCutoverReady:boolean;ledgerGuardsReady:boolean;processingReady:boolean;
  activeCurrencies:string[];legacyOpeningVerified:false;
}
export interface ReceiptRow {
  id:number;companyId:number;customerId:number;customerName:string;customerCode:string|null;currency:string;
  sourceId:string;entryDate:string;method:ReceiptMethod;status:ReceiptStatus;amount:string;walletCredit:string;
  chequeNumber:string|null;reason:string;evidenceReference:string;
}
export interface ReceiptSummary {
  currency:string;method:ReceiptMethod;status:ReceiptStatus;receiptCount:number;amount:string;walletCredit:string;
}
export interface ReceiptList {
  metadata:ReceiptMetadata;filters:ReceiptListFilters;items:ReceiptRow[];summaries:ReceiptSummary[];
  pagination:{page:number;pageSize:number;totalRows:number};
}
export interface ReceiptAllocation {
  id:number;receivableId:number;amount:string;status:string;invoiceReference:string;invoiceJournalId:number;
  issuedOn:string;dueOn:string;invoiceAmount:string;settledAmount:string;openAmount:string;
}
export interface ReceiptEvent {
  id:number;action:string;sourceId:string;entryDate:string;journalId:number;journalStatus:string;reversalId:number|null;
  reason:string;evidenceReference:string;
}
export interface ReceiptDetail {metadata:ReceiptMetadata;receipt:ReceiptRow;allocations:ReceiptAllocation[];events:ReceiptEvent[]}
export interface ReceiptCustomer {id:number;name:string;code:string|null}
export interface ReceiptOpenItem {
  id:number;customerId:number;currency:string;invoiceReference:string;invoiceJournalId:number;
  issuedOn:string;dueOn:string;amount:string;settledAmount:string;openAmount:string;
}
export interface ReceiptOpenItems {items:ReceiptOpenItem[];totalRows:number;page:number;pageSize:number}