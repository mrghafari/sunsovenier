import assert from "node:assert/strict";
import { test } from "node:test";
import type { PartialReturnPlan, PartialReturnQuote } from "@shared/accounting-partial-returns";
import { getPartialReturnHistory, getPartialReturnTargets, previewPartialReturn, postPartialReturn } from "./accounting-partial-returns-api";

const quote: PartialReturnQuote = {
  kind: "GOODS", companyId: 12, invoiceId: 71, entryDate: "2025-05-15",
  items: [{ orderItemId: 91, quantityTons: "1.25" }],
};
const plan: PartialReturnPlan = {
  input: quote, postingAllowed: false, financialGateOpen: false, blockers: ["FINANCIAL_GATE_CLOSED"], planHash: "a".repeat(64),
  valuation: {
    available: true, blockingReason: null, kind: "GOODS", companyId: 12, invoiceId: 71, currency: "USD", baseCurrency: "IQD",
    customerId: 28, amount: "125.00", baseAmount: "162500.00", debtReduction: "100.00", debtBase: "130000.00",
    customerCredit: "25.00", creditBase: "32500.00", baseCost: "90000.00", walletId: null, walletBefore: null,
    walletAmount: "0", walletAfter: null, goods: "118.00", tax: "7.00", goodsBase: "153400.00",
    taxBase: "9100.00", lines: [],
  },
};
const originalFetch = globalThis.fetch;
function useFetch(handler: (url: string, init?: RequestInit) => unknown) {
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); calls.push({ url, init });
    const body = await handler(url, init);
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return calls;
}
test.afterEach(() => { globalThis.fetch = originalFetch; });

test("preview sends schema-validated exact quote with cookie credentials and rejects mismatched scope", async () => {
  const calls = useFetch(() => plan);
  const result = await previewPartialReturn(quote);
  assert.equal(result.planHash, plan.planHash);
  assert.equal(calls[0].url, "/api/accounting/v2/partial-returns/preview");
  assert.equal(calls[0].init?.credentials, "include");
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), quote);
  useFetch(() => ({ ...plan, valuation: { ...plan.valuation, companyId: 99 } }));
  await assert.rejects(previewPartialReturn(quote), /scope/);
});

test("preview canonicalizes 0.4000 and sorts item IDs before matching the backend plan", async () => {
  const unsorted: PartialReturnQuote = {
    kind: "GOODS", companyId: 12, invoiceId: 71, entryDate: "2025-05-15",
    items: [{ orderItemId: 91, quantityTons: "0.4000" }, { orderItemId: 17, quantityTons: "2.000" }],
  };
  const canonicalQuote: PartialReturnQuote = {
    ...unsorted,
    items: [{ orderItemId: 17, quantityTons: "2" }, { orderItemId: 91, quantityTons: "0.4" }],
  };
  const canonicalPlan = { ...plan, input: canonicalQuote };
  const calls = useFetch(() => canonicalPlan);
  const result = await previewPartialReturn(unsorted);
  assert.deepEqual(result.input, canonicalQuote);
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), canonicalQuote);
});

test("target and history endpoints are real company-scoped GETs and reject out-of-scope payloads", async () => {
  const calls = useFetch(() => ({ companyId: 12, invoices: [], receipts: [] }));
  assert.deepEqual(await getPartialReturnTargets(12), { companyId: 12, invoices: [], receipts: [] });
  assert.match(calls[0].url, /companyId=12/);
  useFetch(() => ({ companyId: 13, invoices: [], receipts: [] }));
  await assert.rejects(getPartialReturnTargets(12), /out-of-scope/);
  useFetch(() => ({ rows: [], pagination: { page: 2, pageSize: 20, totalRows: 0 } }));
  await assert.rejects(getPartialReturnHistory(12, 1, 20), /out-of-scope/);
});

test("post command uses the accounting endpoint and preserves duplicate response", async () => {
  const calls = useFetch(() => ({ id: 41, journalId: 87, duplicate: true }));
  const result = await postPartialReturn({
    ...quote, sourceId: "stable-partial-return-source", expectedPlanHash: plan.planHash,
    evidenceReference: "SCAN-2025-0041", reason: "Customer returned sealed material",
    payoutReference: "", evidenceConfirmed: true,
  });
  assert.equal(result.duplicate, true);
  assert.equal(calls[0].url, "/api/accounting/v2/partial-returns");
  assert.equal(calls[0].init?.credentials, "include");
});
