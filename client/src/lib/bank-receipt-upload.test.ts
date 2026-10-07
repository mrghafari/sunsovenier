import { test } from "node:test";
import assert from "node:assert/strict";
import { uploadBankReceiptFile, submitBankReceipt } from "./bank-receipt-upload";

test("file upload uses authenticated same-origin multipart, not browser storage PUT", async (t) => {
  const oldFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = oldFetch; });
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "/api/payment/receipt-file");
    assert.equal(init?.method, "POST");
    assert.equal(init?.credentials, "include");
    assert.ok(init?.body instanceof FormData);
    assert.equal(init.body.get("file") instanceof File, true);
    assert.equal(init.headers, undefined);
    return Response.json({ success: true, receiptUrl: "/files/bank-receipts/1/file.pdf", uploadToken: "token" });
  };
  const receipt = await uploadBankReceiptFile(new File(["%PDF-1.4"], "bank.pdf", { type: "application/pdf" }));
  assert.equal(receipt.uploadToken, "token");
});
test("upload failures, login expiry and malformed responses never report success", async (t) => {
  const oldFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = oldFetch; });
  const file = new File(["test"], "bank.pdf");
  for (const status of [401, 413, 415, 422, 503]) {
    globalThis.fetch = async () => Response.json({ success: false, message: `failure-${status}` }, { status });
    await assert.rejects(uploadBankReceiptFile(file), new RegExp(`failure-${status}`));
  }
  globalThis.fetch = async () => new Response("<html>error</html>", { status: 500 });
  await assert.rejects(uploadBankReceiptFile(file), /500/);
  globalThis.fetch = async () => Response.json({ success: true, receiptUrl: "/file.pdf" });
  await assert.rejects(uploadBankReceiptFile(file));
});
test("receipt registration sends JSON and server evidence with the order identifier", async (t) => {
  const oldFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = oldFetch; });
  const data = { orderId: "M123", receiptUrl: "/files/bank-receipts/1/file.pdf", uploadToken: "token", notes: "test" };
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "/api/payment/upload-receipt");
    assert.equal(init?.credentials, "include");
    assert.deepEqual(JSON.parse(String(init?.body)), data);
    return Response.json({ success: true });
  };
  assert.equal((await submitBankReceipt(data)).success, true);
});
test("registration rejects 401 and business failures even when response is HTTP 200", async (t) => {
  const oldFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = oldFetch; });
  const data = { orderId: 1, receiptUrl: "/file.pdf", uploadToken: "token" };
  for (const status of [200, 400, 401, 404, 409, 500]) {
    globalThis.fetch = async () => Response.json({ success: false, message: "registration-failed" }, { status });
    await assert.rejects(submitBankReceipt(data), /registration-failed/);
  }
});
