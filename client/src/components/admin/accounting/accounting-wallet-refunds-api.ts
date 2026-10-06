import {
  walletRefundCommandSchema,
  walletRefundQuoteSchema,
  type WalletRefundCommand,
  type WalletRefundHistory,
  type WalletRefundPlan,
  type WalletRefundQuote,
} from "@shared/accounting-wallet-refunds";

export const walletRefundsEndpoint = "/api/accounting/v2/wallet-refunds";
export const walletRefundPreviewEndpoint = `${walletRefundsEndpoint}/preview`;
export const walletRefundHistoryEndpoint = `${walletRefundsEndpoint}/history`;

export type WalletRefundHistoryQuery = {
  companyId: number;
  walletId?: number;
  page?: number;
  pageSize?: number;
};

function positiveInteger(value: number, name: string, maximum = 2147483647) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw new Error(`Invalid wallet payout history ${name}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 2147483647;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function validateWalletRefundHistory(payload: unknown, query: Required<Pick<WalletRefundHistoryQuery, "companyId" | "page" | "pageSize">> & Pick<WalletRefundHistoryQuery, "walletId">): WalletRefundHistory {
  if (!isRecord(payload) || !Array.isArray(payload.rows) || !isRecord(payload.pagination)) {
    throw new Error("Invalid wallet payout history response");
  }
  const pagination = payload.pagination;
  if (pagination.page !== query.page || pagination.pageSize !== query.pageSize
    || typeof pagination.totalRows !== "number" || !Number.isSafeInteger(pagination.totalRows) || pagination.totalRows < 0
    || payload.rows.length > query.pageSize) {
    throw new Error("Wallet payout history response is outside the requested page scope");
  }
  for (const row of payload.rows) {
    if (!isRecord(row)
      || !isPositiveInteger(row.id) || !isPositiveInteger(row.walletId)
      || !isNonEmptyString(row.entryDate) || !["BANK", "CASH"].includes(String(row.channel))
      || !isNonEmptyString(row.currency) || !isNonEmptyString(row.baseCurrency)
      || !isNonEmptyString(row.amount) || !isNonEmptyString(row.payoutReference)
      || !isNonEmptyString(row.evidenceReference) || !isNonEmptyString(row.reason)
      || !isNonEmptyString(row.sourceId) || !isNonEmptyString(row.liabilityBase)
      || !isNonEmptyString(row.fundingBase) || !isNonEmptyString(row.fxGain) || !isNonEmptyString(row.fxLoss)
      || !isPositiveInteger(row.journalId) || !isPositiveInteger(row.movementId)
      || (query.walletId !== undefined && row.walletId !== query.walletId)) {
      throw new Error("Wallet payout history contains an invalid or out-of-scope row");
    }
  }
  return payload as unknown as WalletRefundHistory;
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `Accounting request failed (${response.status})`);
    Object.assign(error, { code: payload.code, status: response.status });
    throw error;
  }
  return payload as T;
}

export function previewWalletRefund(quote: WalletRefundQuote, signal?: AbortSignal) {
  const data = walletRefundQuoteSchema.parse(quote);
  return request<WalletRefundPlan>(walletRefundPreviewEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    signal,
  });
}

export function postWalletRefund(command: WalletRefundCommand) {
  const data = walletRefundCommandSchema.parse(command);
  return request<{ id: number; journalId: number; movementId: number; duplicate: boolean; payoutReference?: string }>(walletRefundsEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function getWalletRefundHistory(query: WalletRefundHistoryQuery, signal?: AbortSignal) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  positiveInteger(query.companyId, "company");
  if (query.walletId !== undefined) positiveInteger(query.walletId, "wallet");
  positiveInteger(page, "page");
  positiveInteger(pageSize, "page size", 100);
  const params = new URLSearchParams({
    companyId: String(query.companyId),
    page: String(page),
    pageSize: String(pageSize),
  });
  if (query.walletId !== undefined) params.set("walletId", String(query.walletId));
  const validatedQuery = { ...query, page, pageSize };
  return request<unknown>(`${walletRefundHistoryEndpoint}?${params.toString()}`, { method: "GET", signal })
    .then(payload => validateWalletRefundHistory(payload, validatedQuery));
}
