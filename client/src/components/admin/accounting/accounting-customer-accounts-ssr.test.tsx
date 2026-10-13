import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AccountingCustomerAccounts } from "@shared/accounting-customer-accounts";
import {
  IndependentAccountFunding,
  IndependentAccountFundingForm,
  getOrCreateFundingSourceId,
  isValidEntryDate,
  isValidFundingAmount,
  persistFundingSourceId,
} from "./accounting-customer-accounts";
import AccountingCustomerCreditLimit, { isValidCreditLimit } from "./accounting-customer-credit-limit";
import { customerAccountsText } from "./accounting-customer-accounts-copy";

Object.assign(globalThis, { React });

const account: AccountingCustomerAccounts["accounts"][number] = {
  id: 4107, currency: "USD", balance: "0.00", reservedBalance: "0.00", creditLimit: "3200.00", status: "active",
};
const mutation = {
  isPending: false,
  mutateAsync: async () => ({ movementId: 21, journalId: 63, duplicate: false }),
} as unknown as ReturnType<typeof import("@/lib/accounting-customer-accounts-api").useFundIndependentCustomerAccount>;
const creditMutation = {
  isPending: false,
  mutateAsync: async () => ({ walletId: 4107, creditLimit: "3500.00", duplicate: false, balanceChanged: false as const }),
} as unknown as ReturnType<typeof import("@/lib/accounting-customer-accounts-api").useSetCustomerAccountCreditLimit>;

function fundingForm(language: string) {
  return renderToStaticMarkup(<IndependentAccountFundingForm account={account} companyId={12} customerCode="9123456"
    mutation={mutation} pendingScopeMutation={false} onRefresh={async () => undefined} language={language}/>);
}

test("funding form SSR identifies the exact wallet and requires real documentary evidence", () => {
  const html = fundingForm("en");
  assert.match(html, /#4107/);
  assert.match(html, /Wallet ID/);
  assert.match(html, /Funding channel/);
  assert.match(html, /Evidence document reference/);
  assert.match(html, /Never invent a receipt or reference/i);
  assert.match(html, /never an opening-balance transfer/i);
  assert.match(html, /No currency conversion or fallback is applied/i);
  assert.match(html, /Stable request ID/);
  assert.doesNotMatch(html, /value="(?:BANK-123|SUPPORT-991|100\.00)"/);
});

test("funding controls are manager-only and remain scoped to the selected connected wallet", () => {
  const readonly = renderToStaticMarkup(<IndependentAccountFunding accounts={[account]} companyId={12} customerCode="9123456"
    canManage={false} scopeMatches={true} mutation={mutation} creditMutation={creditMutation} pendingScopeMutation={false} onRefresh={async () => undefined} language="en"/>);
  assert.match(readonly, /Only managers may post documented funding/);
  assert.doesNotMatch(readonly, /customer-account-funding-date/);

  const manager = renderToStaticMarkup(<IndependentAccountFunding accounts={[account]} companyId={12} customerCode="9123456"
    canManage={true} scopeMatches={true} mutation={mutation} creditMutation={creditMutation} pendingScopeMutation={false} onRefresh={async () => undefined} language="en"/>);
  assert.match(manager, /data-testid="customer-account-funding"/);
  assert.match(manager, /data-testid="customer-account-funding-wallet"/);
  assert.match(manager, /data-testid="customer-account-funding-date"/);
  assert.match(manager, /customer-credit-limit-4107/);
  assert.match(manager, /#4107/);
});

test("funding evidence and confirmation language is present in all supported locales", () => {
  for (const language of ["fa", "ar", "tr", "en"]) {
    const html = fundingForm(language);
    for (const key of ["fundingTitle", "walletId", "entryDate", "fundingAmount", "fundingChannel", "evidenceReference",
      "evidenceHelp", "fundingReason", "fundingConfirm", "foreignFundingWarning", "fundingRequirements", "sourceId"] as const) {
      assert.ok(customerAccountsText(language, key).length > 1, `${language}: ${key} copy`);
    }
    assert.match(html, /#4107/);
    assert.match(html, /USD/);
    assert.doesNotMatch(html, /undefined|null/);
  }
});

test("funding payload inputs require a positive exact decimal and a real ISO calendar date", () => {
  for (const value of ["10", "10.25", "0.0001"]) assert.equal(isValidFundingAmount(value), true, value);
  for (const value of ["0", "-2", "1,000", "1e3", ".25", "1."]) assert.equal(isValidFundingAmount(value), false, value);
  assert.equal(isValidEntryDate("2025-02-28"), true);
  assert.equal(isValidEntryDate("2025-02-30"), false);
  assert.equal(isValidEntryDate("2025/02/28"), false);
});

test("credit-limit policy is manager-only, displays the returned current limit, and keeps balance separate", () => {
  const manager = renderToStaticMarkup(<AccountingCustomerCreditLimit account={account} companyId={12} canManage={true}
    scopeMatches={true} pendingScopeMutation={false} mutation={creditMutation} onRefresh={async () => undefined} language="en"/>);
  assert.match(manager, /data-testid="customer-credit-limit-4107"/);
  assert.match(manager, /Current configured limit/);
  assert.match(manager, /3200\.00 USD/);
  assert.match(manager, /does not create funds/i);
  assert.match(manager, /does not fund the account/i);
  assert.match(manager, /data-testid="customer-credit-limit-input-4107"/);

  const viewer = renderToStaticMarkup(<AccountingCustomerCreditLimit account={account} companyId={12} canManage={false}
    scopeMatches={true} pendingScopeMutation={false} mutation={creditMutation} onRefresh={async () => undefined} language="en"/>);
  assert.doesNotMatch(viewer, /customer-credit-limit-input-4107/);
});

test("credit limit accepts exact nonnegative decimals, including zero, without separators", () => {
  for (const value of ["0", "0.00", "125.75"]) assert.equal(isValidCreditLimit(value), true, value);
  for (const value of ["", "-1", "1,000", "1e4", ".5", "1."]) assert.equal(isValidCreditLimit(value), false, value);
});

test("credit policy review copy is complete in all four languages", () => {
  for (const language of ["fa", "ar", "tr", "en"]) {
    const html = renderToStaticMarkup(<AccountingCustomerCreditLimit account={account} companyId={12} canManage={true}
      scopeMatches={true} pendingScopeMutation={false} mutation={creditMutation} onRefresh={async () => undefined} language={language}/>);
    for (const key of ["creditTitle", "creditIntro", "currentCreditLimit", "creditLimitLabel", "creditLimitHelp",
      "creditReason", "creditReasonHelp", "reviewCreditLimit", "creditSummary", "confirmCreditLimit",
      "saveCreditLimit", "creditLimitDuplicate", "creditBalanceUnchanged"] as const) {
      assert.ok(customerAccountsText(language, key).length > 2, `${language}: ${key}`);
    }
    assert.match(html, /3200\.00 USD/);
    assert.match(html, /customer-credit-limit-input-4107/);
  }
});

test("funding source IDs remain stable for retries and are scoped to each wallet", () => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  } });
  const first = getOrCreateFundingSourceId(12, 4107);
  assert.ok(first.length > 8);
  assert.equal(getOrCreateFundingSourceId(12, 4107), first);
  assert.notEqual(getOrCreateFundingSourceId(12, 4108), first);
  const nextMovement = "next-movement-source";
  persistFundingSourceId(12, 4107, nextMovement);
  assert.equal(getOrCreateFundingSourceId(12, 4107), nextMovement);
});
