import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { fetchPostingQueueHistory, postingQueueEndpoint, postingQueueHistoryUrl, previewPostingSource, runPostingQueue, submitPostingQueue } from "./accounting-posting-queue-api";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("queue history scope uses the controlled processing endpoint", async () => {
  let url = "";
  let init: RequestInit | undefined;
  const history = { companyId: 21, processingEnabled: false, rows: [], pagination: { page: 1, pageSize: 20, totalRows: 0 } };
  globalThis.fetch = (async (requested, options) => {
    url = String(requested); init = options;
    return new Response(JSON.stringify(history), { status: 200 });
  }) as typeof fetch;
  assert.deepEqual(await fetchPostingQueueHistory(21), history);
  assert.equal(url, `${postingQueueEndpoint}?companyId=21&page=1&pageSize=20`);
  assert.equal(init?.credentials, "include");
  assert.throws(() => postingQueueHistoryUrl(0), /Invalid posting queue scope/);
});

test("preview, immutable enqueue and manager batch use exact controlled endpoint payloads", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = (async (requested, init) => {
    calls.push({ url: String(requested), init });
    const body = String(init?.body ?? "");
    const result = calls.length === 1 ? { factId: 7, planHash: "a".repeat(64) }
      : calls.length === 2 ? { id: 2, sourceId: "stable-source-uuid", status: "pending" }
        : { companyId: 21, paused: false, processed: 0, completed: 0, retry: 0, review: 0 };
    return new Response(JSON.stringify(result), { status: 200 });
  }) as typeof fetch;
  const source = { companyId: 21, factId: 7, kind: "LOADING_INVOICE" as const };
  await previewPostingSource(source);
  const submit = { sourceId: "stable-source-uuid", reviewConfirmed: true as const,
    posting: { kind: "LOADING_INVOICE" as const, command: { companyId: 21, factId: 7, expectedPlanHash: "a".repeat(64), reason: "Reviewed documentary source", settleFromHold: false } } };
  await submitPostingQueue(submit);
  await runPostingQueue(21);
  assert.equal(calls[0].url, `${postingQueueEndpoint}/preview`);
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), source);
  assert.equal(calls[1].url, postingQueueEndpoint);
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), submit);
  assert.equal(calls[2].url, `${postingQueueEndpoint}/run`);
  assert.deepEqual(JSON.parse(String(calls[2].init?.body)), { companyId: 21 });
  assert.ok(calls.every(call => call.init?.credentials === "include"));
});

test("queue rejects malformed command and never silently retries POST", async () => {
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response("{}", { status: 201 }); }) as typeof fetch;
  assert.throws(() => submitPostingQueue({ sourceId: "", reviewConfirmed: true, posting: { kind: "LOADING_INVOICE", command: {} } } as never));
  assert.equal(calls, 0);
});
