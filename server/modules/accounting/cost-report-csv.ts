import type {AccountingCostReport} from "@shared/accounting-cost-reports";
import {csvCell} from "./report-csv";
const money=["actualCostBase","allocationChargeBase","absorbedBase","netExpenseBase","actualNativeDebit","actualNativeCredit","actualNativeNet","unassignedActualCostBase","varianceBase","underAbsorbedBase","overAbsorbedBase"];
export function accountingCostReportCsv(r:AccountingCostReport){
  const metadata:unknown[][]=[
    ["report","cost-centers-and-fleet"],["companyId",r.company.id],["company",r.company.name],["baseCurrency",r.company.baseCurrency],
    ["from",r.filters.from],["to",r.filters.to],["accountId",r.filters.accountId??""],["costCenterId",r.filters.costCenterId??""],
    ["currency",r.filters.currency??""],["partyType",r.filters.partyType??""],["partyId",r.filters.partyId??""],["entryId",r.filters.entryId??""],
    ["coverage","Posted expense ledger only; includes original and reversal journals; legacy openings and physical operations not verified"],
    ["classification","Current posting mappings and configured fleet center, not historical configuration"],
    ["financialCutoversReady",r.coverage.financialCutoversReady],["postedEntryCount",r.coverage.postedEntryCount],
    ["periodEntryCount",r.coverage.periodEntryCount],["expenseLineCount",r.coverage.expenseLineCount],
    ["totalRows",r.pagination.totalRows],["fleetAvailable",r.fleet.available],["fleetBlockingReason",r.fleet.blockingReason??""],
    ["fleetCenterId",r.fleet.center?.id??""],["fleetMisplacedAbsorptionLines",r.fleet.misplacedAbsorptionLineCount],
    ...Object.entries(r.totals),
    ...(r.fleet.amounts?Object.entries(r.fleet.amounts).map(([k,v])=>[`fleet.${k}`,v]):[["fleetAmounts","unavailable"]]),
  ];
  const columns=["costCenterId","code","nameFa","nameAr","nameEn","currency","lineCount",...money.slice(0,7)] as const;
  return "\ufeff"+[...metadata.map(([key,value])=>[csvCell(key),csvCell(value,money.includes(String(key).replace(/^fleet\./,"")))].join(",")),
    "",columns.join(","),...r.rows.map(row=>columns.map(key=>csvCell(row[key as keyof typeof row],money.includes(key))).join(","))].join("\r\n")+"\r\n";
}