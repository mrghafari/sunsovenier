import { test } from "node:test";
import assert from "node:assert/strict";
import { issueBankReceiptTicket, verifyBankReceiptTicket } from "./bank-receipt-ticket";

const evidence = {
  customerId: 123, receiptUrl: "/files/bank-receipts/123/123456-abcd.pdf",
  originalFileName: "bank.pdf", fileSize: 1234, mimeType: "application/pdf",
};
const secret = "test-only-receipt-signing-secret";

test("receipt evidence preserves server-verified file metadata", () => {
  const result = verifyBankReceiptTicket(issueBankReceiptTicket(evidence, secret), 123, evidence.receiptUrl, secret);
  assert.equal(result?.fileSize, 1234);
  assert.equal(result?.mimeType, "application/pdf");
  assert.equal(result?.originalFileName, "bank.pdf");
});
test("receipt from another customer cannot be submitted", () => {
  assert.equal(verifyBankReceiptTicket(issueBankReceiptTicket(evidence, secret), 124, evidence.receiptUrl, secret), null);
});
test("a receipt ticket cannot authorize a different file", () => {
  assert.equal(verifyBankReceiptTicket(issueBankReceiptTicket(evidence, secret), 123, "/other.pdf", secret), null);
});
test("tampered metadata is rejected", () => {
  const ticket = issueBankReceiptTicket(evidence, secret);
  const changed = Buffer.from(JSON.stringify({ ...evidence, customerId: 124 })).toString("base64url");
  assert.equal(verifyBankReceiptTicket(`${changed}.${ticket.split(".")[1]}`, 124, evidence.receiptUrl, secret), null);
});
test("missing, malformed and foreign-key tickets are rejected", () => {
  for (const ticket of [null, "", "payload.signature.extra", "invalid.invalid", "x".repeat(6001)]) {
    assert.equal(verifyBankReceiptTicket(ticket, 123, evidence.receiptUrl, secret), null);
  }
  assert.equal(verifyBankReceiptTicket(issueBankReceiptTicket(evidence, secret), 123, evidence.receiptUrl, "other-secret"), null);
});
test("missing signing configuration fails closed", () => {
  assert.throws(() => issueBankReceiptTicket(evidence, ""));
  assert.equal(verifyBankReceiptTicket("payload.signature", 123, evidence.receiptUrl, ""), null);
});
test("evidence cannot authorize external or another owner's paths", () => {
  for (const receiptUrl of ["https://example.com/bank.pdf", "/files/bank-receipts/124/bank.pdf"]) {
    const ticket = issueBankReceiptTicket({ ...evidence, receiptUrl }, secret);
    assert.equal(verifyBankReceiptTicket(ticket, 123, receiptUrl, secret), null);
  }
});
