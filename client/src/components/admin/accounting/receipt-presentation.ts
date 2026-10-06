import Decimal from "decimal.js";
import type { ReceiptMethod, ReceiptStatus } from "@shared/accounting-receipts";
import type { Language } from "@/lib/i18n";
import { receiptCopy, type ReceiptCopyKey } from "./receipt-copy";
import type { ReceiptMetadata } from "@shared/accounting-receipts";

export const ReceiptDecimal = Decimal.clone({ precision: 128 });

export function receiptLabel(language: Language, value: ReceiptMethod | ReceiptStatus | string): string {
  const keys: Record<string, ReceiptCopyKey> = {
    BANK:"bank", CASH:"cash", CHEQUE:"cheque", confirmed:"confirmed", received:"received",
    deposited:"deposited", cleared:"cleared", bounced:"bounced", returned:"returned",
  };
  return keys[value] ? receiptCopy(language, keys[value]) : value;
}

export function exactAmount(value: string): string {
  try { return new ReceiptDecimal(value).toFixed(); } catch { return value; }
}

export function allocationRemainder(amount: string, allocations: string[]): string | null {
  try { return new ReceiptDecimal(amount || "0").minus(allocations.reduce((sum, value) => sum.plus(value || "0"), new ReceiptDecimal(0))).toFixed(); }
  catch { return null; }
}

export function allocationTotal(allocations: string[]): string | null {
  try { return allocations.reduce((sum, value) => sum.plus(value || "0"), new ReceiptDecimal(0)).toFixed(); }
  catch { return null; }
}

export function receiptWriteAllowed(canManage: boolean, metadata: ReceiptMetadata | undefined, currency: string, companyId: number | undefined): boolean {
  return Boolean(canManage && companyId && metadata?.company.id === companyId && metadata.company.isActive && metadata.processingReady && currency && metadata.activeCurrencies.includes(currency));
}

export function isChequeProvisional(status: ReceiptStatus): boolean {
  return status === "received" || status === "deposited";
}

export function receiptEmptyLabel(language: Language): string {
  return receiptCopy(language, "empty");
}