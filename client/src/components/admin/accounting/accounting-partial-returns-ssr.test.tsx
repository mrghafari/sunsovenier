import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PartialReturnPlan } from "@shared/accounting-partial-returns";
import AccountingPartialReturns, { canReviewPartialReturn, partialReturnPlanAlreadyPosted, partialReturnPlanFingerprint, partialReturnPayoutReferenceValid, PartialReturnPlanReview } from "./accounting-partial-returns";
import { partialReturnText } from "./accounting-partial-returns-copy";

const plan: PartialReturnPlan = {
  input: { kind: "GOODS", companyId: 12, invoiceId: 71, entryDate: "2025-05-15", items: [{ orderItemId: 91, quantityTons: "1.250" }] },
  postingAllowed: false, financialGateOpen: false, blockers: ["FINANCIAL_GATE_CLOSED"], planHash: "c".repeat(64),
  valuation: {
    available: true, blockingReason: null, kind: "GOODS", companyId: 12, invoiceId: 71, currency: "USD", baseCurrency: "IQD",
    customerId: 28, amount: "125.00", baseAmount: "162500.00", debtReduction: "100.00", debtBase: "130000.00",
    customerCredit: "25.00", creditBase: "32500.00", baseCost: "90000.00", walletId: null, walletBefore: null,
    walletAmount: "0", walletAfter: null, goods: "118.00", tax: "7.00", goodsBase: "153400.00",
    taxBase: "9100.00", items: [{ orderItemId: 91, quantityTons: "1.250", goods: "118.00", tax: "7.00" }], lines: [],
  },
};
function html(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderToStaticMarkup(createElement(QueryClientProvider, { client }, node));
}

test("four localized entry points show scoped company selection, disabled-gate copy and safe empty states", () => {
  for (const language of ["en", "fa", "ar", "tr"]) {
    const output = html(<AccountingPartialReturns companies={[]} canManage={false} language={language}/>);
    assert.ok(output.replaceAll("&amp;", "&").includes(partialReturnText(language, "title")), language);
    assert.match(output, /data-testid="accounting-partial-returns"/);
  }
});

test("valuation review renders documentary financial ordering and exact historical strings even when blocked", () => {
  const output = html(<PartialReturnPlanReview plan={plan} language="en"/>);
  assert.match(output, /100\.00 USD/);
  assert.match(output, /25\.00 USD/);
  assert.match(output, /90,?000\.00 IQD/);
  assert.match(output, /Plan hash/);
  assert.match(output, /No automatic bank payout/i);
  assert.match(output, /Blocked/);
  assert.doesNotMatch(output, /undefined|null USD/);
});

test("receipt actual payout references must be at least five characters; goods have no payout requirement", () => {
  assert.equal(partialReturnPayoutReferenceValid("RECEIPT", "ABC"), false);
  assert.equal(partialReturnPayoutReferenceValid("RECEIPT", "ABCDE"), true);
  assert.equal(partialReturnPayoutReferenceValid("GOODS", ""), true);
});

test("only an already-posted quote/hash pair is suppressed; a fresh cumulative preview remains reviewable", () => {
  const quoteKey = JSON.stringify(plan.input);
  const oldHash = plan.planHash;
  const posted = new Set([partialReturnPlanFingerprint(quoteKey, oldHash)]);
  assert.equal(partialReturnPlanAlreadyPosted(posted, quoteKey, oldHash), true);
  assert.equal(partialReturnPlanAlreadyPosted(posted, quoteKey, "d".repeat(64)), false);
  assert.equal(canReviewPartialReturn(true, false, false), true);
  assert.equal(canReviewPartialReturn(true, false, true), false);
});
