import type {AccountingReport} from "@shared/accounting-reports";
// Every CSV field is quoted. Prevent spreadsheet formulas in staff-authored text,
// including formula prefixes concealed behind whitespace/control characters.
export function csvCell(value:unknown,trustedDecimal=false){
  let text=value===null||value===undefined?"":String(value);
  if(!(trustedDecimal&&/^-?\d+(\.\d+)?$/.test(text))&&
    (/^[\s\u0000-\u001f]*[=+\-@]/u.test(text)||/^[\t\r\n]/u.test(text)))text="'"+text;
  return `"${text.replaceAll('"','""')}"`;
}
const trialColumns=["accountId","accountCode","nameFa","nameAr","nameEn","accountType","openingBase",
  "openingDebit","openingCredit","periodBaseDebit","periodBaseCredit","closingBase","closingDebit","closingCredit"];
const lineColumns=["entryId","entryNumber","entryDate","sourceType","sourceId","description","reversalOfId",
  "lineId","accountId","accountCode","nameFa","nameAr","nameEn","lineDescription","currency","debit","credit",
  "baseDebit","baseCredit","exchangeRate","valuationBasis","partyType","partyId","costCenterId","costCenterCode",
  "costCenterNameFa","costCenterNameAr","costCenterNameEn"];
const amountColumns=new Set(["openingBase","openingDebit","openingCredit","periodBaseDebit","periodBaseCredit",
  "closingBase","closingDebit","closingCredit","debit","credit","baseDebit","baseCredit","exchangeRate","runningNative","runningBase"]);
export function accountingReportCsv(report:AccountingReport){
  const columns=report.report==="trial-balance"?trialColumns:report.report==="ledger"?[...lineColumns,"runningNative","runningBase"]:lineColumns;
  // Metadata rows label coverage and currency even when the requested range is empty.
  const metadata=[
    ["report",report.report],["companyId",report.company.id],["company",report.company.name],
    ["baseCurrency",report.company.baseCurrency],["from",report.filters.from],["to",report.filters.to],
    ["scope",report.totals.balanceScope],["accountId",report.filters.accountId??""],["currency",report.filters.currency??""],
    ["partyType",report.filters.partyType??""],["partyId",report.filters.partyId??""],
    ["costCenterId",report.filters.costCenterId??""],["entryId",report.filters.entryId??""],
    ["postedEntryCount",report.coverage.postedEntryCount],
    ["coverage","Posted ledger only; legacy openings not verified by this report; includes original and reversal journals"],
    ["openingBase",report.totals.openingBase],["periodBaseDebit",report.totals.periodBaseDebit],
    ["periodBaseCredit",report.totals.periodBaseCredit],["closingBase",report.totals.closingBase],
    ["closingDebit",report.totals.closingDebit],["closingCredit",report.totals.closingCredit],
  ];
  const native=(report.nativeBalances??[]).flatMap(b=>["opening","debit","credit","closing"].map(key=>
    [csvCell(`native.${b.currency}.${key}`),csvCell(b[key as keyof typeof b],true)].join(",")));
  return "\ufeff"+[...metadata.map(([key,value])=>[csvCell(key),csvCell(value,amountColumns.has(String(key)))].join(",")),...native,
    "",columns.map(key=>csvCell(key)).join(","),
    ...report.rows.map(row=>columns.map(key=>csvCell(row[key],amountColumns.has(key))).join(","))].join("\r\n")+"\r\n";
}