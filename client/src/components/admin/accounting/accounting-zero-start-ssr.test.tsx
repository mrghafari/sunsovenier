import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import type { ZeroStartState } from "@shared/accounting-zero-start";
import AccountingZeroStart from "./accounting-zero-start";
import { independentZeroStartDate, zeroStartSelectionIsCurrent } from "./accounting-zero-start";
import { zeroStartQueryKey } from "./accounting-zero-start-api";
import { zeroStartText } from "./accounting-zero-start-copy";

Object.assign(globalThis, { React });

const unapproved: ZeroStartState = {
  companyId: 41, approved: false, active: false, startsOn: null,
  firstOrderId: null, excludedWalletCount: 17, excludedDocumentCount: 8,
};
const approvedInactive: ZeroStartState = {
  ...unapproved, approved: true, startsOn: independentZeroStartDate, firstOrderId: 901,
};

function render(canManage: boolean, language: string, state?: ZeroStartState, companyId?: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (state) client.setQueryData(zeroStartQueryKey(state.companyId), state);
  const markup = renderToStaticMarkup(<QueryClientProvider client={client}>
    <AccountingZeroStart companyId={companyId} canManage={canManage} language={language}/>
  </QueryClientProvider>);
  client.clear();
  return markup;
}

test("zero opening clearly preserves legacy records, starts on the declared date and never creates a zero journal", () => {
  const html = render(true, "en", unapproved, 41);
  assert.match(html, /All existing customer balances and credit, orders, and inventory are preserved unchanged/);
  assert.match(html, /Only actual purchases on or after the start date supply cost/);
  assert.match(html, /No zero-value journal or placeholder opening entry is created/);
  assert.match(html, /does not activate foreign-currency processing gates/);
  assert.match(html, new RegExp(`value="${independentZeroStartDate}"`));
  assert.match(html, /data-testid="zero-start-preserve-confirm"/);
  assert.match(html, /data-testid="zero-start-open-confirm"/);
  assert.match(html, /<button(?=[^>]*data-testid="zero-start-activate")(?=[^>]*disabled)[^>]*>/);
});

test("viewer cannot activate, server approval and active status remain distinct, and approved date is immutable", () => {
  const viewer = render(false, "en", unapproved, 41);
  assert.match(viewer, /data-testid="zero-start-viewer"/);
  assert.doesNotMatch(viewer, /data-testid="zero-start-controls"/);
  const manager = render(true, "en", approvedInactive, 41);
  assert.match(manager, /data-testid="zero-start-approved-inactive"/);
  assert.match(manager, /Opening approved/);
  assert.match(manager, /Financial processing inactive/);
  assert.match(manager, /data-testid="zero-start-immutable"/);
  assert.doesNotMatch(manager, /data-testid="zero-start-activate"/);
});

test("actual zero-start copy and RTL direction exist in all four locales", () => {
  for (const language of ["en", "fa", "ar", "tr"]) {
    const html = render(false, language, unapproved, 41);
    assert.ok(html.includes(zeroStartText(language, "title")), `${language} title`);
    assert.ok(html.includes(zeroStartText(language, "preserve")), `${language} legacy balance protection`);
    assert.ok(html.includes(zeroStartText(language, "foreign")), `${language} foreign gates`);
    assert.match(html, new RegExp(`dir="${language === "fa" || language === "ar" ? "rtl" : "ltr"}"`));
  }
});

test("company selection prompt is inert and performs no activation request", () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response("{}", { status: 200 }); }) as typeof fetch;
  try {
    const html = render(true, "en");
    assert.match(html, /data-testid="zero-start-no-company"/);
    assert.doesNotMatch(html, /data-testid="zero-start-activate"/);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("late responses are ignored across company switches, including switching back to the original company", () => {
  const requestAtCompanyA = { companyId: 41, generation: 0 };
  assert.equal(zeroStartSelectionIsCurrent(requestAtCompanyA, requestAtCompanyA), true);
  const selectedCompanyB = { companyId: 42, generation: 1 };
  assert.equal(zeroStartSelectionIsCurrent(selectedCompanyB, requestAtCompanyA), false);
  const selectedCompanyAAgain = { companyId: 41, generation: 2 };
  assert.equal(zeroStartSelectionIsCurrent(selectedCompanyAAgain, requestAtCompanyA), false);
});
