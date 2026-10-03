import type {CustomerAccountingReport} from "@shared/accounting-customer-reports";
import {csvCell} from "./report-csv";
const statement=["customerId","customerCode","customerName","entryId","entryNumber","entryDate","lineId","accountId","accountCode",
  "nameFa","nameAr","nameEn","sourceType","sourceId","description","lineDescription","reversalOfId","currency","debit","credit",
  "baseDebit","baseCredit","exchangeRate","valuationBasis","runningNative","runningBase","partyType","partyId","costCenterId","costCenterCode"];
const aging=["kind","customerId","customerCode","customerName","receivableId","invoiceReference","invoiceJournalId","issuedOn",
  "dueOn","daysOverdue","currency","bucket","invoiceAmount","settledAmount","outstanding"];
const money=new Set(["debit","credit","baseDebit","baseCredit","exchangeRate","runningNative","runningBase","invoiceAmount","settledAmount","outstanding"]);
export function customerReportCsv(r:CustomerAccountingReport){
  const metadata=[["report",r.report],["companyId",r.company.id],["company",r.company.name],["baseCurrency",r.company.baseCurrency],
    ["customerId",r.filters.customerId??""],["from",r.filters.from??""],["to",r.filters.to??""],["asOf",r.filters.asOf??""],
    ["currency",r.filters.currency??""],["postedEntryCount",r.coverage.postedEntryCount],["receivableAccountCount",r.coverage.receivableAccountCount],
    ["coverage","Posted AR only; legacy openings not verified. Aging uses invoice due dates and historical posted settlements. Unknown due debt and unapplied credits remain separate."]];
  const summaries=[...r.balances.flatMap(b=>Object.entries(b).filter(([k])=>k!=="currency")
    .map(([k,v])=>[csvCell(`balance.${b.currency}.${k}`),csvCell(v,true)].join(","))),
    ...r.agingSummaries.flatMap(b=>Object.entries(b).filter(([k])=>k!=="currency")
    .map(([k,v])=>[csvCell(`aging.${b.currency}.${k}`),csvCell(v,true)].join(",")))];
  const columns=r.report==="customer-statement"?statement:aging;
  return "\ufeff"+[...metadata.map(pair=>pair.map(v=>csvCell(v)).join(",")),...summaries,"",columns.map(k=>csvCell(k)).join(","),
    ...r.rows.map(row=>columns.map(k=>csvCell(row[k],money.has(k))).join(","))].join("\r\n")+"\r\n";
}