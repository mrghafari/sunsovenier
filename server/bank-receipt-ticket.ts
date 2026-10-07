import { createHmac, timingSafeEqual } from "node:crypto";

export interface BankReceiptEvidence {
  customerId: number;
  receiptUrl: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
}

export function issueBankReceiptTicket(evidence: BankReceiptEvidence, secret: string): string {
  if (!secret) throw new Error("Receipt signing is not configured");
  const payload = Buffer.from(JSON.stringify({ ...evidence, purpose: "bank-receipt" })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}

export function verifyBankReceiptTicket(
  ticket: unknown, customerId: number, receiptUrl: unknown, secret: string,
): BankReceiptEvidence | null {
  if (!secret || typeof ticket !== "string" || ticket.length > 6000) return null;
  try {
    const parts = ticket.split(".");
    if (parts.length !== 2) return null;
    const expected = createHmac("sha256", secret).update(parts[0]).digest();
    const signature = Buffer.from(parts[1], "base64url");
    if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;
    const evidence = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    if (evidence.purpose !== "bank-receipt" || evidence.customerId !== customerId ||
        evidence.receiptUrl !== receiptUrl || !Number.isSafeInteger(evidence.fileSize) ||
        evidence.fileSize <= 0 || typeof evidence.originalFileName !== "string" ||
        typeof evidence.mimeType !== "string" ||
        !evidence.receiptUrl.startsWith(`/files/bank-receipts/${customerId}/`)) return null;
    return evidence;
  } catch {
    return null;
  }
}
