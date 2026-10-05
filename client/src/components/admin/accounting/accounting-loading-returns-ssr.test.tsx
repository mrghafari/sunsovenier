import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AccountingLoadingReturns from "./accounting-loading-returns";
import { LoadingReturnValuation } from "./accounting-loading-returns";
import { accountingProgressCopy, loadingReturnText } from "./accounting-loading-returns-copy";

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
  assert.match(html, /full returns of unsettled loading invoices/);
  assert.match(html, /Settled \/ partial returns and FX refunds/);
  assert.match(html, /read-only/i);
  assert.doesNotMatch(html, /Confirm and post full return/);
});

test("four-language progress, reversal rules, and every blocker have copy", () => {
  for (const language of ["en", "fa", "ar", "tr"]) {
    const progress = accountingProgressCopy(language);
    assert.ok(progress.current.length > 10);
    assert.ok(progress.disclaimer.length > 10);
    assert.ok(loadingReturnText(language, "physicalRule").length > 15);
    for (const blocker of ["RETURN_GATE_CLOSED", "COMPANY_INACTIVE", "SETTLEMENT_EXISTS", "RECEIPT_ALLOCATION_EXISTS",
      "ALREADY_REVERSED", "EVIDENCE_MISMATCH", "STOCK_RECONCILIATION_REQUIRED", "ACCOUNT_INACTIVE"]) {
      assert.ok(loadingReturnText(language, `blocker_${blocker}`).length > 5, `${language}/${blocker}`);
    }
  }
});

test("nullable base amount and measured tons render as unavailable, never zero", () => {
  const html = renderToStaticMarkup(React.createElement(LoadingReturnValuation, {
    language: "en", originalBaseAmount: null, quantityTons: null, baseCurrency: "IQD",
  }));
  assert.equal((html.match(/Unavailable/g) ?? []).length, 2);
  assert.doesNotMatch(html, />0(?:\.0+)?(?: IQD| t)?</);
});
