import assert from "node:assert/strict";
import { test } from "node:test";
import React, { type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type { WalletRefundHistory, WalletRefundPlan } from "@shared/accounting-wallet-refunds";
import AccountingWalletRefunds, { WalletRefundHistoryTable, WalletRefundPlanCard, walletRefundSourceForCommand } from "./accounting-wallet-refunds";
import { walletRefundText } from "./accounting-wallet-refunds-copy";

Object.defineProperty(globalThis, "React", { configurable: true, value: React });

const plan: WalletRefundPlan = {
  input: { companyId: 12, walletId: 44, amount: "75.50", entryDate: "2025-05-15", channel: "BANK" },
  planHash: "a".repeat(64), financialGateOpen: true, postingAllowed: true, blockers: [],
  valuation: {
    available: true, blockingReason: null, currency: "USD", baseCurrency: "IQD", amount: "75.50",
    walletId: 44, customerId: 93, walletNativeBefore: "125.50", walletBaseBefore: "163150.00", availableNative: "125.50",
    fundingNativeBefore: "1000.00", fundingBaseBefore: "1300000.00", liabilityBase: "97500.00", fundingBase: "97500.00",
    fxGain: "0", fxLoss: "0",
    lines: [{ accountId: 5, currency: "USD", debit: "75.50", credit: "0", baseDebit: "97500.00", baseCredit: "0", exchangeRate: "1300", partyType: "customer", partyId: 93, costCenterId: null, description: "Documented wallet payout" }],
  },
};
const history: WalletRefundHistory = {
  rows: [{
    id: 31, walletId: 44, entryDate: "2025-05-15", channel: "BANK", currency: "USD", baseCurrency: "IQD",
    amount: "75.50", payoutReference: "BANK-123", evidenceReference: "SUPPORT-991", reason: "Documented customer payout",
    sourceId: "stable-source-44", liabilityBase: "97500.00", fundingBase: "97500.00", fxGain: "0.00", fxLoss: "0.00",
    journalId: 207, movementId: 119, goodsReturnId: 65, receiptId: 22,
  }],
  pagination: { page: 1, pageSize: 20, totalRows: 1 },
};

function withLanguage(language: string, children: ReactNode) {
  const values: Record<string, string> = { "language-manually-selected": "true", language };
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => values[key] ?? null,
    setItem: (key: string, value: string) => { values[key] = value; },
    removeItem: (key: string) => { delete values[key]; },
  } });
  return renderToStaticMarkup(<LanguageProvider>{children}</LanguageProvider>);
}

test("wallet payout workbench SSR clearly separates actual payment evidence from returns and shows no posting path for viewers", () => {
  const html = withLanguage("en", <AccountingWalletRefunds companies={[{ id: 12, name: "Tigris Polymers" }]} defaultCompanyId={12} canManage={false}/>);
  assert.match(html, /Customer wallet payout/);
  assert.match(html, /ALREADY documented actual bank or cash payout/);
  assert.match(html, /does not send money, return goods, reverse a receipt or invoice/i);
  assert.match(html, /Tigris Polymers/);
  assert.match(html, /Linked customer wallet ID/);
  assert.match(html, /Gregorian evidence date/);
  assert.match(html, /Supporting evidence document reference · separate from payout reference/);
  assert.match(html, /Actual BANK transaction reference \/ CASH voucher number/);
  assert.match(html, /data-testid="wallet-refund-payout-reference"/);
  assert.match(html, /command source ID/);
  assert.match(html, /immutable historical posting snapshots/i);
  assert.match(html, /reason/);
  assert.match(html, /read-only|only managers may post/i);
  assert.match(html, /type="date"/);
  assert.match(html, /value="BANK"/);
});

test("required actual payout reference is localized and distinct from supporting evidence in all four locales", () => {
  for (const language of ["en", "fa", "ar", "tr"]) {
    const html = withLanguage(language, <AccountingWalletRefunds companies={[{ id: 12, name: "Tigris Polymers" }]} defaultCompanyId={12} canManage/>);
    assert.ok(html.includes(walletRefundText(language, "payoutReference")), `${language} actual payout reference label`);
    assert.ok(html.includes(walletRefundText(language, "payoutReferenceHelp")), `${language} no-verification/attestation help`);
    assert.ok(html.includes(walletRefundText(language, "evidenceReference")), `${language} separate evidence reference`);
    assert.match(html, /data-testid="wallet-refund-payout-reference"/);
  }
});

test("four-language plan SSR shows exact native/base evidence, blockers, and never renders null values as zero", () => {
  for (const language of ["en", "fa", "ar", "tr"]) {
    const html = renderToStaticMarkup(<WalletRefundPlanCard plan={plan} language={language}/>);
    assert.match(html, /75\.50 USD/);
    assert.match(html, /125\.50 USD/);
    assert.match(html, /163150\.00 IQD/);
    assert.match(html, /1000\.00 USD/);
    assert.match(html, /1300000\.00 IQD/);
    assert.match(html, /97500\.00 IQD/);
    assert.match(html, /foreign-exchange|kur fark|صرف/i);
    assert.ok(html.includes(walletRefundText(language, "fxNativeNotApplicable")), `${language} native FX dimension is explicitly not applicable`);
    assert.doesNotMatch(html, /null|undefined/);
    const blocked = renderToStaticMarkup(<WalletRefundPlanCard plan={{ ...plan, financialGateOpen: false, postingAllowed: false, blockers: ["OPENING_EVIDENCE_REQUIRED"] }} language={language}/>);
    assert.match(blocked, /OPENING EVIDENCE REQUIRED/);
  }
  const unknownPlan: WalletRefundPlan = {
    ...plan,
    valuation: { ...plan.valuation, available: false, blockingReason: "Opening balance evidence required", availableNative: null, fundingNativeBefore: null, fxGain: null, fxLoss: null },
  };
  const unknown = renderToStaticMarkup(<WalletRefundPlanCard plan={unknownPlan} language="en"/>);
  assert.match(unknown, /Unavailable · opening evidence not supplied/);
  assert.doesNotMatch(unknown, /null USD/);
});

test("warning, explicit acknowledgement, actual payout and monetary evidence labels are translated for EN/FA/AR/TR", () => {
  for (const language of ["en", "fa", "ar", "tr"]) {
    for (const key of ["warning", "openingEvidence", "confirm", "available", "walletBase", "fundingTitle", "liabilityConsumed", "fundingConsumed", "fxGain", "fxLoss", "fxGainNative", "fxLossNative", "fxNativeNotApplicable", "gateRequirement", "movementId", "linesTitle", "valuationIncomplete", "payoutReference", "payoutReferenceHelp", "evidenceReference", "duplicateReference", "historyTitle", "historyIntro", "historyImmutable", "historyScope", "historyNoCompany", "historyEmpty", "historyEmptyPage", "historyLoading", "historyError", "historyRetry", "historyPrevious", "historyNext", "historyPage", "historyOf", "historyRows"]) {
      assert.ok(walletRefundText(language, key).length > 0, `${language} ${key}`);
    }
  }
});

test("idempotency source ID is reused for an unchanged command and changes only with its fingerprint", () => {
  const sources = new Map<string, string>();
  const first = walletRefundSourceForCommand("command-a", sources);
  const retry = walletRefundSourceForCommand("command-a", sources);
  const changedCommand = walletRefundSourceForCommand("command-b", sources);
  const switchedBackAfterUncertainFailure = walletRefundSourceForCommand("command-a", sources);
  assert.equal(retry, first);
  assert.notEqual(changedCommand, first);
  assert.equal(switchedBackAfterUncertainFailure, first);
});

test("linked wallet-credit payout IDs are part of the immutable retry fingerprint and localized workbench", () => {
  const sources = new Map<string, string>();
  const initial = { companyId: 12, walletId: 44, amount: "75.50", entryDate: "2025-05-15", channel: "BANK", goodsReturnId: 65, receiptId: 22 };
  const fingerprint = JSON.stringify(initial);
  const first = walletRefundSourceForCommand(fingerprint, sources);
  assert.equal(walletRefundSourceForCommand(JSON.stringify(initial), sources), first);
  assert.notEqual(walletRefundSourceForCommand(JSON.stringify({ ...initial, goodsReturnId: 66 }), sources), first);
  assert.notEqual(walletRefundSourceForCommand(JSON.stringify({ ...initial, receiptId: 23 }), sources), first);
  for (const language of ["en", "fa", "ar", "tr"]) {
    const html = withLanguage(language, <AccountingWalletRefunds companies={[{ id: 12, name: "Tigris Polymers" }]} defaultCompanyId={12} canManage/>);
    assert.match(html, /data-testid="wallet-refund-goods-return-id"/);
    assert.match(html, /data-testid="wallet-refund-receipt-id"/);
    assert.ok(html.includes(walletRefundText(language, "returnCreditLimitation")));
    for (const key of ["blocker_RETURN_CREDIT_LINK_REQUIRED", "blocker_RETURN_CREDIT_LINK_INVALID", "blocker_RETURN_CREDIT_EXHAUSTED"]) {
      assert.ok(walletRefundText(language, key).length > 10);
    }
    const table = renderToStaticMarkup(<WalletRefundHistoryTable rows={history.rows} language={language}/>);
    assert.match(table, />#65</);
    assert.match(table, />#22</);
  }
});

test("immutable history SSR exposes payout snapshots, supporting documents, base FX and IDs without mutation actions", () => {
  for (const language of ["en", "fa", "ar", "tr"]) {
    const html = renderToStaticMarkup(<WalletRefundHistoryTable rows={history.rows} language={language}/>);
    for (const value of ["2025-05-15", "BANK", "#44", "75.50 USD", "97500.00 IQD", "0.00 IQD", "BANK-123", "SUPPORT-991", "Documented customer payout", "#207", "#119"]) {
      assert.ok(html.includes(value), `${language} history includes ${value}`);
    }
    assert.doesNotMatch(html, /<button|<a\b/i);
    const immutableCopy = walletRefundText(language, "historyImmutable");
    assert.ok(immutableCopy.length > 30);
  }
});
