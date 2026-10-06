import { strict as assert } from "node:assert";
import test from "node:test";
import { fetchInventoryFifoPreview, inventoryFifoPreviewQueryKey, inventoryFifoPreviewUrl } from "./accounting-inventory-fifo-api";

test("FIFO preview URL and cache key scope company, optional order, page, and page size", async () => {
  const first = { companyId: 12, page: 2, pageSize: 20 };
  const second = { companyId: 12, orderId: 84, page: 2, pageSize: 20 };
  assert.equal(inventoryFifoPreviewUrl(first), "/api/accounting/v2/inventory-fifo-preview?companyId=12&page=2&pageSize=20");
  assert.equal(inventoryFifoPreviewUrl(second), "/api/accounting/v2/inventory-fifo-preview?companyId=12&page=2&pageSize=20&orderId=84");
  assert.notDeepEqual(inventoryFifoPreviewQueryKey(first), inventoryFifoPreviewQueryKey(second));
  assert.notDeepEqual(inventoryFifoPreviewQueryKey(first), inventoryFifoPreviewQueryKey({ ...first, page: 3 }));
  assert.notDeepEqual(inventoryFifoPreviewQueryKey(first), inventoryFifoPreviewQueryKey({ ...first, companyId: 13 }));

  const originalFetch = globalThis.fetch;
  let call: { url: string; init?: RequestInit } | undefined;
  globalThis.fetch = (async (input, init) => {
    call = { url: String(input), init };
    return { ok: true, status: 200, json: async () => ({ readOnly: true }) } as Response;
  }) as typeof fetch;
  try {
    await fetchInventoryFifoPreview(second);
    assert.equal(call?.url, inventoryFifoPreviewUrl(second));
    assert.equal(call?.init?.credentials, "include");
    assert.equal(call?.init?.method, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("FIFO preview request preserves API errors for the read-only viewer", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({ ok: false, status: 503, json: async () => ({ code: "REPLAY_UNAVAILABLE", message: "Replay unavailable" }) }) as Response) as typeof fetch;
  try {
    await assert.rejects(fetchInventoryFifoPreview({ companyId: 12, page: 1, pageSize: 20 }), error =>
      error instanceof Error && error.message === "Replay unavailable" && "code" in error && error.code === "REPLAY_UNAVAILABLE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
