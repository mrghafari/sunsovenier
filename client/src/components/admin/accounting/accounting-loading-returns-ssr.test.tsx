import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AccountingLoadingReturns from "./accounting-loading-returns";
import { LoadingReturnValuation, Workbench } from "./accounting-loading-returns";
import { accountingProgressCopy, loadingReturnText } from "./accounting-loading-returns-copy";
import type { LoadingReturnWorkbench } from "@shared/accounting-loading-returns";

function render(canManage: boolean) {
  Object.assign(globalThis, { React });
  const values: Record<string, string> = { "language-manually-selected": "true", language: "en" };
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => values[key] ?? null, setItem: (key: string, value: string) => { values[key] = value; },
    removeItem: (key: string) => { delete values[key]; },
  } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const html = renderToStaticMarkup(<LanguageProvider><QueryClientProvider client={client}>
    <AccountingLoadingReturns companies={[{ id: 9, name: "Tigris Polymers" }]} canManage={canManage}/>
  </QueryClientProvider></LanguageProvider>);
  client.clear();
  return html;
}

test("loading-return SSR shows correctly bounded implementation progress and viewer read-only state", () => {
  const html = render(false);
  assert.match(html, /IMPLEMENTATION status/);
  assert.match(html, /not company balances or financial activation/);
  assert.match(html, /full-goods returns of unpaid and fully\/partly paid loading invoices/);
  assert.match(html, /Partial-goods returns and foreign-currency payouts/);
  assert.match(html, /read-only/i);
  assert.doesNotMatch(html, /Confirm and post full return/);
});

test("four-language progress, reversal rules, and every blocker have copy", () => {
  for (const language of ["en", "fa", "ar", "tr"]) {
    const progress = accountingProgressCopy(language);
    assert.ok(progress.current.length > 10);
    assert.ok(progress.disclaimer.length > 10);
    assert.ok(loadingReturnText(language, "physicalRule").length > 15);
    assert.ok(loadingReturnText(language, "paidCreditRule").length > 30);
    assert.ok(loadingReturnText(language, "creditReview").length > 15);
    assert.ok(loadingReturnText(language, "creditBase").length > 5);
    for (const blocker of ["RETURN_GATE_CLOSED", "PAID_RETURN_GATE_CLOSED", "CREDIT_EVIDENCE_MISMATCH", "CREDIT_WALLET_UNAVAILABLE",
      "COMPANY_INACTIVE", "SETTLEMENT_EXISTS", "RECEIPT_ALLOCATION_EXISTS",
      "ALREADY_REVERSED", "EVIDENCE_MISMATCH", "STOCK_RECONCILIATION_REQUIRED", "ACCOUNT_INACTIVE"]) {
      assert.ok(loadingReturnText(language, `blocker_${blocker}`).length > 5, `${language}/${blocker}`);
    }
  }
});

test("workbench list composes paid-return rows with exact credit evidence and confirmation control", () => {
  const workbench: LoadingReturnWorkbench = {
    company: { id: 9, name: "Tigris Polymers", baseCurrency: "USD" },
    rows: [{
      companyId: 9, invoiceId: 77, factId: 13, orderId: 42, customerId: 18,
      invoiceJournalId: 501, cogsJournalId: 502, receivableId: 503,
      originalDate: "2025-04-18", minReturnDate: "2025-04-18", currency: "IQD", baseCurrency: "USD",
      originalAmount: "1250.75", originalBaseAmount: "17.84", baseCost: "12.50", quantityTons: "0.45",
      planHash: "a".repeat(64), blockers: [], postingAllowed: true, returned: null,
      customerCredit: { walletId: 61, amount: "1250.75", baseAmount: "17.84", baseCurrency: "USD" },
    }],
    pagination: { page: 1, pageSize: 20, totalRows: 1 },
    financialGateOpen: true,
  };
  const html = renderToStaticMarkup(<Workbench
    workbench={workbench} language="en" page={1} totalPages={1} changePage={()=>{}} onRefresh={()=>{}}
    canManage receipt={{}} reason={{}} returnDate={{}} physicalConfirmed={{}} creditConfirmed={{}} refreshedHash={{}}
    setReceipt={()=>{}} setReason={()=>{}} setReturnDate={()=>{}} setPhysicalConfirmed={()=>{}} setCreditConfirmed={()=>{}}
    setRefreshedHash={()=>{}} onPost={()=>{}} busy={false}
  />);
  assert.match(html, /Invoice return plans/);
  assert.match(html, /Paid-return customer credit/);
  assert.match(html, /#61/);
  assert.match(html, /1250\.75 IQD/);
  assert.match(html, /17\.84 USD/);
  assert.match(html, /authorize this customer-credit liability reclassification/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /Confirm and post full return/);
  assert.match(html, /disabled=""/);
});

test("nullable base amount and measured tons render as unavailable, never zero", () => {
  const html = renderToStaticMarkup(React.createElement(LoadingReturnValuation, {
    language: "en", originalBaseAmount: null, quantityTons: null, baseCurrency: "IQD",
  }));
  assert.equal((html.match(/Unavailable/g) ?? []).length, 2);
  assert.doesNotMatch(html, />0(?:\.0+)?(?: IQD| t)?</);
});
