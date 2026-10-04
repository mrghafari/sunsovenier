import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AccountingCostReport } from "@shared/accounting-cost-reports";
import type { Language } from "@/lib/i18n";
import { CostReportResult, exactAmount } from "./accounting-cost-reports";
import { costReportCopy } from "./cost-reports-copy";

test("currency display removes SQL storage zeroes without rounding any significant digit",()=>{
  assert.equal(exactAmount("12.34000000",2,"en"),"12.34");
  assert.equal(exactAmount("50.00000000",0,"en"),"50");
  assert.equal(exactAmount("-0.00100000",2,"en"),"-0.001");
  assert.equal(exactAmount("9007199254740993.00100000",3,"en"),"9,007,199,254,740,993.001");
  assert.equal(exactAmount(null,3,"en"),"—");
  assert.equal(exactAmount("0",3,"fa"),"۰.۰۰۰");
});

const languages: Language[] = ["fa", "ar", "en", "tr"];
const report: AccountingCostReport = {
  filters: { companyId: 7, from: "2025-01-01", to: "2025-01-31", page: 3, pageSize: 50 },
  company: { id: 7, name: "Momtazcom Petrochem", baseCurrency: "IQD" },
  currencies: [{ code: "IQD", decimals: 3 }, { code: "USD", decimals: 2 }],
  coverage: {
    postedEntryCount: 17, periodEntryCount: 8, expenseLineCount: 4,
    legacyOpeningVerified: false, financialCutoversReady: false,
    mappingBasis: "current", includesReversals: true,
  },
  rows: [{
    costCenterId: null, code: null, nameFa: null, nameAr: null, nameEn: null,
    currency: "IQD", lineCount: 4,
    actualCostBase: "-12.500", allocationChargeBase: "0.000", absorbedBase: "0.000", netExpenseBase: "-12.500",
    actualNativeDebit: "0.000", actualNativeCredit: "12.500", actualNativeNet: "-12.500",
  }],
  pagination: { page: 3, pageSize: 50, totalRows: 126 },
  totals: {
    actualCostBase: "123456789012345.678", allocationChargeBase: "10.500", absorbedBase: "2.250",
    netExpenseBase: "123456789012353.928", unassignedActualCostBase: "-12.500", unassignedLineCount: 4,
  },
  fleet: {
    available: true, blockingReason: null, center: { id: 91, code: "FLEET", nameFa: "ناوگان", nameAr: "الأسطول", nameEn: "Fleet" },
    amounts: {
      actualCostBase: "150.125", allocationChargeBase: "0.000", absorbedBase: "100.000", netExpenseBase: "50.125",
      varianceBase: "50.125", underAbsorbedBase: "50.125", overAbsorbedBase: "0.000",
    },
    misplacedAbsorptionLineCount: 0, absorbedAccountId: 61, shippingExpenseAccountId: 62,
  },
};

function html(data: AccountingCostReport, language: Language) {
  return renderToStaticMarkup(createElement(CostReportResult, { report: data, language, page: data.pagination.page, changePage: () => {} }));
}

test("production cost-report result renders localized RTL/LTR views in all supported locales", () => {
  for (const language of languages) {
    const markup = html(report, language);
    assert.match(markup, new RegExp(`dir="${language === "fa" || language === "ar" ? "rtl" : "ltr"}`));
    assert.ok(markup.includes(costReportCopy(language, "totals")));
    assert.ok(markup.includes(costReportCopy(language, "fleet")));
    assert.ok(markup.includes(costReportCopy(language, "legacy")));
    assert.ok(markup.includes(costReportCopy(language, "mappingWarning")));
    assert.ok(markup.includes(costReportCopy(language, "historicalSettings")));
    assert.ok(markup.includes(costReportCopy(language, "scopeCoverage")));
    assert.ok(markup.includes(costReportCopy(language, "formulaNote")));
    assert.ok(markup.includes(costReportCopy(language, "activationNote")));
  }
});

test("empty filtered expense scope warns that zero is not verified historical cost", () => {
  const empty = html({
    ...report,
    rows: [],
    pagination: { ...report.pagination, totalRows: 0 },
    coverage: { ...report.coverage, expenseLineCount: 0 },
    totals: { ...report.totals, actualCostBase: "0.000", allocationChargeBase: "0.000", absorbedBase: "0.000", netExpenseBase: "0.000" },
  }, "en");
  assert.ok(empty.includes("Zero actual cost here can mean no posted expense lines matched"));
  assert.ok(empty.includes("Three recorded financial cutovers"));
  assert.ok(empty.includes("This flag covers only the three recorded financial cutovers."));
  assert.ok(empty.includes("does not indicate a live worker or operational shipping pipeline"));
});

test("positive, negative, and zero variance retain under/over semantics and separate amounts", () => {
  const under = html(report, "en");
  assert.ok(under.includes("Under-absorbed"));
  assert.ok(under.includes("50.125"));
  const over = html({ ...report, fleet: { ...report.fleet, amounts: { ...report.fleet.amounts!, varianceBase: "-8.250", underAbsorbedBase: "0.000", overAbsorbedBase: "8.250" } } }, "en");
  assert.ok(over.includes("Over-absorbed"));
  assert.ok(over.includes("-8.250"));
  assert.ok(over.includes("8.250"));
  const zero = html({ ...report, fleet: { ...report.fleet, amounts: { ...report.fleet.amounts!, varianceBase: "0.000", underAbsorbedBase: "0.000", overAbsorbedBase: "0.000" } } }, "en");
  assert.ok(zero.includes("Balanced variance"));
});

test("unavailable fleet amounts are distinct from a true zero variance", () => {
  const unavailable = html({ ...report, fleet: { ...report.fleet, available: false, blockingReason: "FLEET_MAPPING_REQUIRED", amounts: null } }, "en");
  const zero = html({ ...report, fleet: { ...report.fleet, amounts: { ...report.fleet.amounts!, varianceBase: "0.000", underAbsorbedBase: "0.000", overAbsorbedBase: "0.000" } } }, "en");
  assert.ok(unavailable.includes("Unavailable"));
  assert.ok(unavailable.includes("Fleet account mapping is incomplete."));
  assert.ok(!unavailable.includes("Balanced variance"));
  assert.ok(zero.includes("Balanced variance"));
});

test("a narrowed currency scope blocks a fleet result even if the response marks it available", () => {
  const markup = html({ ...report, filters: { ...report.filters, currency: "USD" } }, "en");
  assert.ok(markup.includes("Fleet comparison is blocked"));
  assert.ok(markup.includes("Currency filter narrows the fleet scope."));
  assert.ok(!markup.includes("Variance · IQD"));
});

test("unassigned reversals, currency precision, exact large totals, coverage and full pagination render", () => {
  const markup = html(report, "en");
  assert.ok(markup.includes("Unassigned"));
  assert.ok(markup.includes("-12.500"));
  assert.ok(markup.includes("123,456,789,012,345.678"));
  assert.ok(markup.includes("Page 3 of 3 · 126 rows"));
  assert.ok(markup.includes("17"));
  assert.ok(markup.includes("8"));
  assert.ok(markup.includes("Reversal lines are included, including negative amounts."));
  const precision = html({ ...report, rows: [{ ...report.rows[0], currency: "IQD", actualNativeCredit: "1250.5", actualNativeNet: "-1250.5" }] }, "en");
  assert.ok(precision.includes("1,250.500"));
  assert.ok(precision.includes("-1,250.500"));
});