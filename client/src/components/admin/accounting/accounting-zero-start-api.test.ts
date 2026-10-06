import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { zeroStartCommandSchema } from "@shared/accounting-zero-start";
import { fetchZeroStart, postZeroStart, zeroStartEndpoint } from "./accounting-zero-start-api";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

const state = {
  companyId: 41, approved: true, active: false, startsOn: "2026-10-06",
  firstOrderId: 901, excludedWalletCount: 17, excludedDocumentCount: 8,
};
const command = {
  companyId: 41, startsOn: "2026-10-06", reason: "Management-approved independent zero start",
  preserveLegacyConfirmed: true as const, zeroOpeningConfirmed: true as const,
};

test("zero-start status is company-scoped, same-origin authenticated, no-store and validated", async () => {
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  globalThis.fetch = (async (url, init) => {
    requestedUrl = String(url);
    requestedInit = init;
    return new Response(JSON.stringify(state), { status: 200 });
  }) as typeof fetch;
  assert.deepEqual(await fetchZeroStart(41), state);
  assert.equal(requestedUrl, `${zeroStartEndpoint}?companyId=41`);
  assert.equal(requestedInit?.method, "GET");
  assert.equal(requestedInit?.credentials, "include");
  assert.equal(requestedInit?.cache, "no-store");
  await assert.rejects(fetchZeroStart(0), /Valid company required/);
  globalThis.fetch = (async () => new Response(JSON.stringify({ ...state, companyId: 42 }), { status: 200 })) as typeof fetch;
  await assert.rejects(fetchZeroStart(41), /Invalid zero-opening status response/);
});

test("activation requires both independent confirmations and posts the exact declared date with session credentials", async () => {
  assert.equal(zeroStartCommandSchema.safeParse(command).success, true);
  assert.equal(zeroStartCommandSchema.safeParse({ ...command, zeroOpeningConfirmed: false }).success, false);
  assert.equal(zeroStartCommandSchema.safeParse({ ...command, preserveLegacyConfirmed: false }).success, false);
  assert.equal(zeroStartCommandSchema.safeParse({ ...command, reason: "no" }).success, false);
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  globalThis.fetch = (async (url, init) => {
    requestedUrl = String(url);
    requestedInit = init;
    return new Response(JSON.stringify({ ...state, active: true, duplicate: false }), { status: 200 });
  }) as typeof fetch;
  const result = await postZeroStart(command);
  assert.equal(requestedUrl, zeroStartEndpoint);
  assert.equal(requestedInit?.method, "POST");
  assert.equal(requestedInit?.credentials, "include");
  assert.equal(requestedInit?.cache, "no-store");
  assert.deepEqual(JSON.parse(String(requestedInit?.body)), command);
  assert.equal(result.active, true);
  assert.throws(() => postZeroStart({ ...command, preserveLegacyConfirmed: false }), /Invalid literal value, expected true/);
});

test("authorization and immutable-date API failures retain the server code and message", async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({
    message: "Used zero opening is immutable", code: "ZERO_START_CONFLICT",
  }), { status: 409 })) as typeof fetch;
  await assert.rejects(postZeroStart(command), error => {
    assert.match((error as Error).message, /Used zero opening is immutable/);
    assert.equal((error as Error & { code?: string }).code, "ZERO_START_CONFLICT");
    assert.equal((error as Error & { status?: number }).status, 409);
    return true;
  });
});

test("activation response cannot be cached against a different company", async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ ...state, companyId: 42 }), { status: 200 })) as typeof fetch;
  await assert.rejects(postZeroStart(command), /outside the requested company scope/);
});
