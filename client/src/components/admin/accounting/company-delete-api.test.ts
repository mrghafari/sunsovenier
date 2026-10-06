import assert from "node:assert/strict";
import { test } from "node:test";
import { deleteAccountingCompanyRequest } from "@/lib/accounting-api";

test("company deletion sends the exact confirmation contract and returns the server result", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let requestInit: RequestInit | undefined;
  globalThis.fetch = (async (input, init) => {
    requestedUrl = String(input);
    requestInit = init;
    return new Response(JSON.stringify({ companyId: 73, deleted: true, duplicate: false }), { status: 200 });
  }) as typeof fetch;
  try {
    const result = await deleteAccountingCompanyRequest(73, "Kabul Trading");
    assert.equal(requestedUrl, "/api/accounting/v2/settings/companies/73");
    assert.equal(requestInit?.method, "DELETE");
    assert.equal(requestInit?.credentials, "include");
    assert.deepEqual(JSON.parse(String(requestInit?.body)), { confirmationName: "Kabul Trading", deleteConfirmed: true });
    assert.deepEqual(result, { companyId: 73, deleted: true, duplicate: false });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("company deletion preserves the backend error code for focused dialog messaging", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ code: "COMPANY_IN_USE", message: "Company is in use" }), { status: 409 })) as typeof fetch;
  try {
    await assert.rejects(deleteAccountingCompanyRequest(8, "North"), (error: Error & { code?: string; status?: number }) => {
      assert.equal(error.code, "COMPANY_IN_USE");
      assert.equal(error.status, 409);
      assert.equal(error.message, "Company is in use");
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
