import { loadingCaptureSchema, type InventoryCostCapture, type LoadingCaptureContext, type LoadingCaptureInput, type LoadingCaptureScope } from "@shared/accounting-loading-capture";
import { normalizeAccountingDigits } from "./accounting-logic";

export type LoadingCaptureDraft = {
  companyId: string; orderId: string; sourceId: string; eventDate: string; weighbridgeReference: string;
  actualWeightTons: string; lines: { orderItemId: number; actualWeightTons: string }[];
  inventoryCosts: InventoryCostCapture[];
};

export function normalizeNumericField(value: string): string {
  return normalizeAccountingDigits(value);
}

function decimalParts(value: string): { integer: bigint; scale: number } {
  const [whole, fraction = ""] = value.split(".");
  return { integer: BigInt(`${whole}${fraction}`), scale: fraction.length };
}

/** Exact decimal equality and summation using integer scales; no JS floating-point arithmetic. */
export function decimalSum(values: string[]): string {
  const normalized = values.map(value => normalizeAccountingDigits(value.trim()));
  if (!normalized.length) return "0";
  const parsed = normalized.map(decimalParts);
  const scale = Math.max(...parsed.map(part => part.scale));
  const sum = parsed.reduce((total, part) => total + part.integer * (10n ** BigInt(scale - part.scale)), 0n);
  const raw = sum.toString().padStart(scale + 1, "0");
  if (!scale) return raw;
  const whole = raw.slice(0, -scale);
  const fraction = raw.slice(-scale).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

export function decimalsEqual(left: string, right: string): boolean {
  try { return decimalSum([left]) === decimalSum([right]); } catch { return false; }
}

export function captureScopeMatchesDraft(scope: LoadingCaptureScope, companyId: string, lookupMode: "id" | "number", orderValue: string, hasCompany: boolean): boolean {
  if (!hasCompany || Number(normalizeAccountingDigits(companyId)) !== scope.companyId) return false;
  return lookupMode === "id"
    ? scope.orderId !== undefined && Number(normalizeAccountingDigits(orderValue)) === scope.orderId
    : scope.orderNumber !== undefined && orderValue.trim() === scope.orderNumber;
}

export function captureContextMatchesScope(scope: LoadingCaptureScope, context: LoadingCaptureContext): boolean {
  return context.company.id === scope.companyId && (scope.orderId !== undefined
    ? context.order.id === scope.orderId
    : scope.orderNumber !== undefined && context.order.number === scope.orderNumber);
}

export function dateIsWithinCompanyDay(eventDate: string, companyToday?: string): boolean {
  return Boolean(eventDate) && (!companyToday || eventDate <= companyToday);
}

export function buildLoadingCapturePayload(draft: LoadingCaptureDraft): LoadingCaptureInput {
  const input: LoadingCaptureInput = {
    companyId: Number(normalizeNumericField(draft.companyId.trim())),
    orderId: Number(normalizeNumericField(draft.orderId.trim())),
    sourceId: draft.sourceId,
    eventDate: normalizeNumericField(draft.eventDate),
    weighbridgeReference: draft.weighbridgeReference,
    actualWeightTons: normalizeNumericField(draft.actualWeightTons.trim()),
    lines: draft.lines.map(line => ({
      orderItemId: line.orderItemId,
      actualWeightTons: normalizeNumericField(line.actualWeightTons.trim()),
    })),
    ...(draft.inventoryCosts.length ? { inventoryCosts: draft.inventoryCosts.map(row => ({
      ...row,
      weightTons: normalizeNumericField(row.weightTons.trim()),
      amount: normalizeNumericField(row.amount.trim()),
    })) } : {}),
  };
  return loadingCaptureSchema.parse(input);
}