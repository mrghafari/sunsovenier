import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AccountingLoadingReturns from "./accounting-loading-returns";
import { LoadingReturnSettlementSimulator, LoadingReturnValuation, Workbench } from "./accounting-loading-returns";
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
  assert.match(html, /documentary full\/partial returns, linked wallet-credit payouts and a reviewed controlled posting queue/);
  assert.match(html, /Documentary opening and opening-balance reconciliation/);
  assert.match(html, /Financial activation and separately authorized processing-engine start/);
  assert.match(html, /Authenticated end-to-end verification/);
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
    assert.ok(loadingReturnText(language, "settlementNotice").length > 50);
    assert.ok(loadingReturnText(language, "settlementInvalid").length > 20);
    assert.ok(loadingReturnText(language, "settlementRecordedCounter").length > 5);
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
      settlementPolicy: { kind: "UNPAID_FIRST", invoiceAmount: "100", settledAmount: "60", currencyDecimals: 2 },
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
  assert.match(html, /UNPAID_FIRST native-currency settlement simulator/);
  assert.match(html, /not partial-goods pricing/i);
  assert.match(html, /Maximum: full invoice amount: <span dir="ltr">100 IQD/);
  assert.match(html, /Confirm and post full return/);
  assert.match(html, /disabled=""/);
});

test("four-language simulator SSR shows unpaid-first examples as native-currency calculation only", () => {
  const plan: LoadingReturnWorkbench["rows"][number] = {
    companyId: 9, invoiceId: 77, factId: 13, orderId: 42, customerId: 18,
    invoiceJournalId: 501, cogsJournalId: 502, receivableId: 503,
    originalDate: "2025-04-18", minReturnDate: "2025-04-18", currency: "IQD", baseCurrency: "USD",
    originalAmount: "100", originalBaseAmount: "1.31", baseCost: "0.90", quantityTons: "0.45",
    planHash: "a".repeat(64), blockers: [], postingAllowed: true, returned: null,
    settlementPolicy: { kind: "UNPAID_FIRST", invoiceAmount: "100", settledAmount: "60", currencyDecimals: 2 },
  };
  for (const language of ["en", "fa", "ar", "tr"]) {
    const noExcess = renderToStaticMarkup(<LoadingReturnSettlementSimulator plan={plan} language={language} amount="40" onAmountChange={()=>{}}/>);
    assert.match(noExcess, /40 IQD/);
    assert.match(noExcess, /0 IQD/);
    const excess = renderToStaticMarkup(<LoadingReturnSettlementSimulator plan={plan} language={language} amount="50" onAmountChange={()=>{}}/>);
    assert.match(excess, /10 IQD/);
    assert.match(excess, /100 IQD/);
    assert.match(excess, /role="status"/);
    assert.doesNotMatch(excess, /<button/);
    if(language==="en") {
      const noExcessText=noExcess.replace(/<[^>]*>/g," ");
      const excessText=excess.replace(/<[^>]*>/g," ");
      assert.match(noExcessText,/Applied to this invoice’s unpaid debt\s+40 IQD.*Unpaid debt remaining\s+0 IQD.*Excess customer account credit\s+0 IQD/);
      assert.match(excessText,/Applied to this invoice’s unpaid debt\s+40 IQD.*Unpaid debt remaining\s+0 IQD.*Excess customer account credit\s+10 IQD/);
    }
  }
});

test("simulator normalizes Persian and Arabic digits, rejects over-limit input, and disables returned invoices", () => {
  const plan: LoadingReturnWorkbench["rows"][number] = {
    companyId: 9, invoiceId: 78, factId: 14, orderId: 43, customerId: 18,
    invoiceJournalId: 511, cogsJournalId: 512, receivableId: 513,
    originalDate: "2025-04-18", minReturnDate: "2025-04-18", currency: "IQD", baseCurrency: "USD",
    originalAmount: "100", originalBaseAmount: "1.31", baseCost: "0.90", quantityTons: "0.45",
    planHash: "b".repeat(64), blockers: [], postingAllowed: true,
    settlementPolicy: { kind: "UNPAID_FIRST", invoiceAmount: "100", settledAmount: "60", currencyDecimals: 2 },
    returned: { id: 1, invoiceReversalId: 2, cogsReversalId: null, returnDate: "2025-04-20", goodsReceiptReference: "GRN-001", reason: "Goods returned" },
  };
  const activePlan = { ...plan, returned: null };
  for (const amount of ["۵۰", "٥٠"]) {
    const normalized = renderToStaticMarkup(<LoadingReturnSettlementSimulator plan={activePlan} language="en" amount={amount} onAmountChange={()=>{}}/>);
    assert.match(normalized, /10 IQD/);
  }
  const outOfBounds = renderToStaticMarkup(<LoadingReturnSettlementSimulator plan={activePlan} language="en" amount="101" onAmountChange={()=>{}}/>);
  assert.match(outOfBounds, /role="alert"/);
  assert.match(outOfBounds, /Enter a valid amount above zero/);
  const html = renderToStaticMarkup(<LoadingReturnSettlementSimulator plan={plan} language="en" amount="50" onAmountChange={()=>{}}/>);
  assert.match(html, /disabled=""/);
  assert.match(html, /already returned/);
  assert.doesNotMatch(html, /10 IQD/);
});

test("nullable base amount and measured tons render as unavailable, never zero", () => {
  const html = renderToStaticMarkup(React.createElement(LoadingReturnValuation, {
    language: "en", originalBaseAmount: null, quantityTons: null, baseCurrency: "IQD",
  }));
  assert.equal((html.match(/Unavailable/g) ?? []).length, 2);
  assert.doesNotMatch(html, />0(?:\.0+)?(?: IQD| t)?</);
});
