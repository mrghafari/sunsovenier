import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AccountingReport, AccountingReportName } from "@shared/accounting-reports";
import { accountingCopy } from "@/lib/accounting-copy";
import { reportCopy } from "./accounting-reports-copy";
import { ReportResult } from "./accounting-report-result";

const huge = "987654321098765432109876543210.12345678901234567890";
const longOpening = "800000000000000000000000000000.000000000000000001";
const languages = ["fa", "ar", "en", "tr"] as const;

function payload(report: AccountingReportName, rows: Record<string, string | null>[], overrides: Partial<AccountingReport> = {}): AccountingReport {
  return {
    report,
    filters: { companyId: 7, from: "2025-01-01", to: "2025-12-31", page: 1, pageSize: 50 },
    company: { id: 7, name: "Caspian Polymer", baseCurrency: "IRR" },
    coverage: { postedEntryCount: 1, walletCutoverReady: false, receiptCutoverReady: false, legacyOpeningVerified: false },
    rows,
    pagination: { page: 1, pageSize: 50, totalRows: rows.length },
    totals: { openingBase: "0", periodBaseDebit: "0", periodBaseCredit: "0", closingBase: "0", closingDebit: "0", closingCredit: "0", balanceScope: "full", isBalanced: false },
    ...overrides,
  };
}
function markup(data: AccountingReport, language: typeof languages[number]) {
  return renderToStaticMarkup(createElement(ReportResult, { report: data.report, data, language, page: data.pagination.page, changePage: () => undefined }));
}
function text(html: string) {
  return html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

const trial = payload("trial-balance", [{
  accountId: "31", accountCode: "110", nameFa: "دارایی نقدی", nameAr: "النقد", nameEn: "Cash", accountType: "asset",
  openingBase: huge, openingDebit: huge, openingCredit: "0", periodBaseDebit: "2", periodBaseCredit: "1",
  closingBase: huge, closingDebit: huge, closingCredit: "0",
}], { totals: { openingBase: huge, periodBaseDebit: "2", periodBaseCredit: "1", closingBase: huge, closingDebit: huge, closingCredit: "0", balanceScope: "full", isBalanced: false } });

const journal = payload("journal", [{
  entryId: "91", entryNumber: "91", entryDate: "2025-06-30", lineId: "901", accountCode: "110",
  nameFa: "دارایی نقدی", nameAr: "النقد", nameEn: "Cash", debit: huge, credit: "0", baseDebit: huge, baseCredit: "0",
  currency: "USD", exchangeRate: "1.000000", valuationBasis: "official_rate", reversalOfId: null,
}]);

const ledger = payload("ledger", [{
  entryId: "90", entryNumber: "90", entryDate: "2025-06-01", lineId: "900", accountCode: "110",
  nameFa: "دارایی نقدی", nameAr: "النقد", nameEn: "Cash", debit: "0", credit: "0", baseDebit: "0", baseCredit: "0",
  currency: "USD", runningNative: huge, runningBase: huge, valuationBasis: "historical_carrying",
}], {
  totals: { openingBase: longOpening, periodBaseDebit: "4", periodBaseCredit: "3", closingBase: longOpening, closingDebit: longOpening, closingCredit: "0", balanceScope: "filtered", isBalanced: false },
  nativeBalances: [
    { currency: "USD", opening: huge, debit: "4", credit: "3", closing: huge },
    { currency: "IQD", opening: "12.000000000000000001", debit: "0", credit: "0", closing: "12.000000000000000001" },
  ],
});

test("report presentation preserves exact amounts and localizes account types and valuation basis in every language", () => {
  for (const language of languages) {
    const trialText = text(markup(trial, language));
    assert.ok(trialText.includes(huge), `exact trial decimal must survive in ${language}`);
    assert.ok(trialText.includes(accountingCopy(language, "type_asset")), `account type is localized in ${language}`);
    const journalText = text(markup(journal, language));
    assert.ok(journalText.includes(huge), `exact journal decimal must survive in ${language}`);
    assert.ok(journalText.includes(reportCopy(language, "valuationOfficial")), `valuation basis is localized in ${language}`);
  }
});

test("ledger presents base totals and separate currency-partitioned native balances", () => {
  const rendered = text(markup(ledger, "en"));
  assert.ok(rendered.includes(longOpening), "opening base amount remains visible exactly");
  assert.ok(rendered.includes(huge), "native USD amount remains exact");
  assert.ok(rendered.includes("USD") && rendered.includes("IQD"), "native currency partitions remain distinct");
  assert.ok(rendered.includes("4") && rendered.includes("3"), "whole-filter base period totals are present");
  assert.ok(rendered.includes(reportCopy("en", "filteredScope")));
});

test("a no-row ledger range still shows nonzero opening totals and currency openings", () => {
  const empty = payload("ledger", [], {
    coverage: { postedEntryCount: 0, walletCutoverReady: false, receiptCutoverReady: false, legacyOpeningVerified: false },
    pagination: { page: 1, pageSize: 50, totalRows: 0 },
    totals: { openingBase: longOpening, periodBaseDebit: "0", periodBaseCredit: "0", closingBase: longOpening, closingDebit: longOpening, closingCredit: "0", balanceScope: "full", isBalanced: true },
    nativeBalances: [{ currency: "IRR", opening: longOpening, debit: "0", credit: "0", closing: longOpening }],
  });
  const rendered = text(markup(empty, "fa"));
  assert.ok(rendered.includes(longOpening));
  assert.ok(rendered.includes(reportCopy("fa", "noRows")));
  assert.ok(rendered.includes(reportCopy("fa", "noRowsHelp")));
  assert.ok(!rendered.includes(reportCopy("fa", "balanced")), "zero-record result must not claim a green balanced confirmation");
});

test("trial scope messaging distinguishes filtered dimensions from a full company balance", () => {
  const filtered = payload("trial-balance", [], { totals: { ...trial.totals, balanceScope: "filtered" } });
  const full = payload("trial-balance", [], { totals: { ...trial.totals, balanceScope: "full" } });
  assert.ok(text(markup(filtered, "tr")).includes(reportCopy("tr", "partialNote")));
  assert.ok(text(markup(filtered, "tr")).includes(reportCopy("tr", "filteredScope")));
  assert.ok(!text(markup(full, "tr")).includes(reportCopy("tr", "partialNote")));
  assert.ok(text(markup(full, "tr")).includes(reportCopy("tr", "fullScope")));
});