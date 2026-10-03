import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import type { CustomerAccountingReport, CustomerReportName } from "@shared/accounting-customer-reports";
import type { Language } from "@/lib/i18n";
import { CustomerReportResult } from "./customer-report-result";
import { customerReportCopy } from "./customer-reports-copy";

const coverage = {
  postedEntryCount: 17,
  receivableAccountCount: 2,
  legacyOpeningVerified: false as const,
  walletCutoverReady: false,
  receiptCutoverReady: true,
};
const base = {
  filters: { companyId: 4, page: 1, pageSize: 50 },
  company: { id: 4, name: "Sahand Trading", baseCurrency: "IRR" },
  customer: { id: 913, name: "Narin Metals", code: "NR-07" },
  coverage,
  balances: [{
    currency: "USD",
    opening: "999999999999999999999999999999.000000001",
    periodDebit: "0", periodCredit: "0", closing: "999999999999999999999999999999.000000001",
    openingBase: "818181818181818181818181818181.123456789",
    periodBaseDebit: "0", periodBaseCredit: "0", closingBase: "818181818181818181818181818181.123456789",
  }],
  agingSummaries: [],
  pagination: { page: 1, pageSize: 50, totalRows: 1 },
};
const statement: CustomerAccountingReport = {
  ...base, report: "customer-statement",
  filters: { companyId: 4, customerId: 913, from: "2025-01-01", to: "2025-12-31", page: 1, pageSize: 50 },
  rows: [{
    entryDate: "2025-02-03", entryNumber: "JE-003", lineId: "9001", accountCode: "1210",
    description: "Opening movement", lineDescription: null, debit: "999999999999999999999999999999.000000001",
    credit: null, baseDebit: "818181818181818181818181818181.123456789", baseCredit: null,
    runningNative: "999999999999999999999999999999.000000001", runningBase: "818181818181818181818181818181.123456789",
    currency: "USD", customerId: "913", customerCode: "NR-07", customerName: "Narin Metals",
  }],
};
const aging: CustomerAccountingReport = {
  ...base, report: "receivables-aging",
  filters: { companyId: 4, asOf: "2025-12-31", page: 1, pageSize: 50 },
  rows: [
    { kind: "unclassified", receivableId: "881", customerId: "913", customerCode: "NR-07", customerName: "Narin Metals", currency: "USD", invoiceReference: null, invoiceJournalId: null, issuedOn: null, dueOn: null, daysOverdue: null, bucket: "unknown", invoiceAmount: null, settledAmount: null, outstanding: "1000000000000000000000000000001.25" },
    { kind: "unclassified", receivableId: "882", customerId: "913", customerCode: "NR-07", customerName: "Narin Metals", currency: "USD", invoiceReference: null, invoiceJournalId: null, issuedOn: null, dueOn: null, daysOverdue: null, bucket: "credit", invoiceAmount: null, settledAmount: null, outstanding: "-0.000000000000000000000000000001" },
    { kind: "invoice", receivableId: "883", customerId: "913", customerCode: "NR-07", customerName: "Narin Metals", currency: "USD", invoiceReference: "INV-22", invoiceJournalId: "6002", issuedOn: "2025-01-01", dueOn: "2025-01-10", daysOverdue: "355", bucket: "over-90", invoiceAmount: "31.25000000000000000001", settledAmount: "0", outstanding: "31.25000000000000000001" },
  ],
  agingSummaries: [{
    currency: "USD", current: "0", days1to30: "0", days31to60: "0", days61to90: "0",
    over90: "31.25000000000000000001", trackedOutstanding: "31.25000000000000000001",
    unclassifiedDebit: "1000000000000000000000000000001.25", unclassifiedCredit: "0.000000000000000000000000000001",
    ledgerClosing: "1000000000000000000000000000032.5",
  }],
};
function render(report: CustomerReportName, data: CustomerAccountingReport, language: Language) {
  return renderToStaticMarkup(<CustomerReportResult report={report} data={data} language={language} page={1} changePage={() => undefined} />);
}

test("customer report copy and results render in all supported languages", () => {
  const languages: Language[] = ["fa", "ar", "en", "tr"];
  for (const language of languages) {
    const html = render("customer-statement", statement, language);
    assert.ok(html.includes("NR-07"), `business code visible for ${language}`);
    assert.ok(html.includes("Narin Metals"), `customer name visible for ${language}`);
    assert.ok(html.includes("999999999999999999999999999999.000000001"), `exact amount preserved for ${language}`);
    assert.ok(html.includes(customerReportCopy(language, "postedEntries")), `localized coverage labels included for ${language}`);
    assert.ok(html.includes(customerReportCopy(language, "legacyWarning")), `legacy warning localized for ${language}`);
  }
});

test("aging displays unknown due dates, credits, overdue buckets and exact scope totals", () => {
  for (const language of ["fa", "ar", "en", "tr"] as const) {
    const html = render("receivables-aging", aging, language);
    assert.ok(html.includes(customerReportCopy(language, "unknown")), `unknown due state visible for ${language}`);
    assert.ok(html.includes(customerReportCopy(language, "creditBucket")), `credit bucket visible for ${language}`);
    assert.ok(html.includes(customerReportCopy(language, "overBucket")), `overdue bucket visible for ${language}`);
    assert.ok(html.includes("1000000000000000000000000000001.25"), `large summary remains exact for ${language}`);
    assert.ok(html.includes("0.000000000000000000000000000001"), `small credit remains exact for ${language}`);
  }
});

test("empty statement still renders currency opening balance and honest empty warning", () => {
  const empty: CustomerAccountingReport = {
    ...statement,
    rows: [],
    pagination: { page: 1, pageSize: 50, totalRows: 0 },
    balances: [{
      currency: "IQD", opening: "437500000000000000000000.125", periodDebit: "0", periodCredit: "0",
      closing: "437500000000000000000000.125", openingBase: "12", periodBaseDebit: "0",
      periodBaseCredit: "0", closingBase: "12",
    }],
  };
  for (const language of ["fa", "ar", "en", "tr"] as const) {
    const html = render("customer-statement", empty, language);
    assert.ok(html.includes("437500000000000000000000.125"), `opening is preserved for ${language}`);
    assert.ok(html.includes(customerReportCopy(language, "empty")), `empty state localized for ${language}`);
    assert.ok(html.includes(customerReportCopy(language, "emptyHelp")), `opening balance caution localized for ${language}`);
  }
});