import type {ReceiptList} from "@shared/accounting-receipts";
import {csvCell} from "./report-csv";
const columns=["id","companyId","customerId","customerName","customerCode","currency","entryDate","method","status",
  "amount","walletCredit","chequeNumber","sourceId","reason","evidenceReference"] as const;
export function receiptListCsv(list:ReceiptList){
  const meta=[["report","customer-receipts"],["companyId",list.metadata.company.id],["company",list.metadata.company.name],
    ["baseCurrency",list.metadata.company.baseCurrency],["from",list.filters.from??""],["to",list.filters.to??""],
    ["customerId",list.filters.customerId??""],["currency",list.filters.currency??""],["method",list.filters.method??""],
    ["status",list.filters.status??""],["rows",list.pagination.totalRows],
    ["coverage","Original receipt amounts grouped by current lifecycle status; not net available funds. Received cheques are provisional. Legacy openings not verified."]];
  return "\ufeff"+[...meta.map(r=>r.map(v=>csvCell(v)).join(",")),...list.summaries.map(s=>
    [csvCell(`summary.${s.currency}.${s.method}.${s.status}`),csvCell(s.receiptCount),csvCell(s.amount,true),csvCell(s.walletCredit,true)].join(",")),
    "",columns.map(k=>csvCell(k)).join(","),...list.items.map(row=>columns.map(k=>csvCell(row[k],k==="amount"||k==="walletCredit")).join(","))].join("\r\n")+"\r\n";
}