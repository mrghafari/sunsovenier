import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LoadingInvoicePlan } from "@shared/accounting-loading-invoices";
import { loadingInvoiceCommandSchema } from "@shared/accounting-loading-invoices";
import type { ShipmentCostPlan } from "@shared/accounting-shipment-costs";
import { shipmentCostCommandSchema } from "@shared/accounting-shipment-costs";
import type { PostingBatchResult, PostingQueueCommand, PostingQueueHistory } from "@shared/accounting-posting-queue";
import { postingQueueSubmitSchema } from "@shared/accounting-posting-queue";

export const postingQueueEndpoint = "/api/accounting/v2/processing";
export const postingQueueKey = (companyId?: number, page = 1, pageSize = 20) =>
  [postingQueueEndpoint, companyId ?? null, page, pageSize] as const;
export type PostingPlan = LoadingInvoicePlan | ShipmentCostPlan;
export type PostingSource = { companyId: number; factId: number; kind: "LOADING_INVOICE" | "SHIPMENT_COST" };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", cache: "no-store", ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `Accounting request failed (${response.status})`);
    Object.assign(error, { code: payload.code, status: response.status });
    throw error;
  }
  return payload as T;
}

export function postingQueueHistoryUrl(companyId: number, page = 1, pageSize = 20) {
  if (!Number.isSafeInteger(companyId) || companyId < 1 || !Number.isSafeInteger(page) || page < 1
    || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error("Invalid posting queue scope");
  return `${postingQueueEndpoint}?${new URLSearchParams({ companyId: String(companyId), page: String(page), pageSize: String(pageSize) })}`;
}
export const fetchPostingQueueHistory = (companyId: number, page = 1, pageSize = 20) =>
  request<PostingQueueHistory>(postingQueueHistoryUrl(companyId, page, pageSize));
export function usePostingQueueHistory(companyId?: number, page = 1, pageSize = 20) {
  return useQuery({ queryKey: postingQueueKey(companyId, page, pageSize), enabled: Boolean(companyId), retry: false,
    queryFn: () => fetchPostingQueueHistory(companyId!, page, pageSize) });
}
export function previewPostingSource(source: PostingSource, signal?: AbortSignal) {
  return request<PostingPlan>(`${postingQueueEndpoint}/preview`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(source), signal,
  });
}
export function submitPostingQueue(payload: { sourceId: string; reviewConfirmed: true; posting: PostingQueueCommand }) {
  const parsed = postingQueueSubmitSchema.parse(payload);
  return request<{ id: number; sourceId: string; status: string }>(postingQueueEndpoint, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed),
  });
}
export function runPostingQueue(companyId: number) {
  return request<PostingBatchResult>(`${postingQueueEndpoint}/run`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId }),
  });
}
export function validatePostingCommand(kind: PostingSource["kind"], command: unknown) {
  return kind === "LOADING_INVOICE" ? loadingInvoiceCommandSchema.parse(command) : shipmentCostCommandSchema.parse(command);
}
export function usePostingQueueSubmit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: submitPostingQueue,
    retry: false,
    onSuccess: () => client.invalidateQueries({ queryKey: [postingQueueEndpoint] }),
  });
}
export function useRunPostingQueue() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: runPostingQueue,
    retry: false,
    onSuccess: (_result, companyId) => client.invalidateQueries({ queryKey: postingQueueKey(companyId) }),
  });
}
