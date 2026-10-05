import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { loadingReturnCommandSchema } from "@shared/accounting-loading-returns";
import { fetchLoadingReturns, loadingReturnsKey, loadingReturnsUrl, postLoadingReturn } from "./accounting-loading-returns-api";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("loading-return GET validates its filters and preserves optional order scope", () => {
  assert.equal(loadingReturnsUrl({ companyId: 9, page: 2, pageSize: 50 }),
    "/api/accounting/v2/loading-returns?companyId=9&page=2&pageSize=50");
  assert.equal(loadingReturnsUrl({ companyId: 9, orderId: 42, page: 1, pageSize: 20 }),
    "/api/accounting/v2/loading-returns?companyId=9&page=1&pageSize=20&orderId=42");
  assert.notDeepEqual(loadingReturnsKey({ companyId: 9, page: 1, pageSize: 20 }), loadingReturnsKey({ companyId: 9, page: 2, pageSize: 20 }));
  assert.throws(() => loadingReturnsUrl({ companyId: 0, page: 1, pageSize: 20 }));
});

test("loading-return workbench uses session credentials and consumes the direct response", async () => {
  const payload = { company: { id: 9, name: "Tigris Polymers", baseCurrency: "IQD" }, rows: [], pagination: { page: 1, pageSize: 20, totalRows: 0 }, financialGateOpen: false };
  let calledInit: RequestInit | undefined;
  globalThis.fetch = (async (_input, init) => {
    calledInit = init;
    return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  assert.deepEqual(await fetchLoadingReturns({ companyId: 9, page: 1, pageSize: 20 }), payload);
  assert.equal(calledInit?.credentials, "include");
});

test("return command requires documentary confirmation and keeps exact amount-independent inputs", () => {
  const parsed = loadingReturnCommandSchema.safeParse({
    companyId: 9, invoiceId: 77, expectedPlanHash: "a".repeat(64), returnDate: "2025-05-03",
    goodsReceiptReference: "GRN-RETURN-208", reason: "All measured goods physically returned",
  });
  assert.equal(parsed.success, true);
  assert.equal(loadingReturnCommandSchema.safeParse({ ...parsed.data, goodsReceiptReference: "no" }).success, false);
  assert.equal(loadingReturnCommandSchema.safeParse({ ...parsed.data, expectedPlanHash: "stale" }).success, false);
});

test("return POST sends only the validated evidence command with session credentials and no automatic retry", async () => {
  const command = {
    companyId: 9, invoiceId: 77, expectedPlanHash: "b".repeat(64), returnDate: "2025-05-03",
    goodsReceiptReference: "GRN-RETURN-208", reason: "All measured goods physically returned",
  };
  let sentBody = "";
  let sentInit: RequestInit | undefined;
  globalThis.fetch = (async (_input, init) => {
    sentInit = init;
    sentBody = String(init?.body ?? "");
    return new Response(JSON.stringify({ id: 5 }), { status: 201, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  await postLoadingReturn(command);
  assert.deepEqual(JSON.parse(sentBody), command);
  assert.equal(sentInit?.credentials, "include");
  assert.equal(sentInit?.method, "POST");
});

test("server error message is surfaced without a retry", async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ message: "Plan changed" }), { status: 409 })) as typeof fetch;
  await assert.rejects(fetchLoadingReturns({ companyId: 9, page: 1, pageSize: 20 }), /Plan changed/);
});
