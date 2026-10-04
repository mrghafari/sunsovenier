import type {ShippingMarginReport} from "@shared/accounting-shipping-reports";
import {csvCell} from "./report-csv";
export function shippingMarginCsv(r:ShippingMarginReport){
  const metadata:unknown[][]=[
    ["report","shipping-margin"],["companyId",r.company.id],["company",r.company.name],["baseCurrency",r.company.baseCurrency],
    ...Object.entries(r.filters).filter(([key])=>key!=="page"&&key!=="pageSize"),
    ["coverage","Immutable linked facts and posted GL only; captures are not journals; legacy history and physical operations not verified"],
    ["classification","Current shipping account mappings; never infer past rates/prices or spread an unlinked invoice across trucks"],
    ["totalRows",r.pagination.totalRows],...Object.entries(r.coverage),...Object.entries(r.totals),
  ];
  const columns=["orderId","orderNumber","loadingSourceId","loadingCount","revenueEntryCount","costEntryCount","unpostedLoadingCount",
    "unpostedCostLoadingCount","unpostedCostCount","costEvidenceIssueCount","revenueBase","costBase","marginBase","periodRevenueBase","periodCostBase","blockedReasons"] as const;
  const cell=(key:unknown,value:unknown)=>csvCell(value,String(key).endsWith("Base"));
  return "\ufeff"+[...metadata.map(([key,value])=>[csvCell(key),cell(key,value)].join(",")),"",columns.join(","),
    ...r.rows.map(row=>columns.map(key=>cell(key,key==="blockedReasons"?row.blockedReasons.join("|"):row[key])).join(","))].join("\r\n")+"\r\n";
}