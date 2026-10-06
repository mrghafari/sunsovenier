import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  partialReturnCommandSchema, partialReturnQuoteSchema,
  type PartialReturnCommand, type PartialReturnHistory, type PartialReturnPlan,
  type PartialReturnQuote, type PartialReturnTargets,
} from "@shared/accounting-partial-returns";

export const partialReturnsEndpoint = "/api/accounting/v2/partial-returns";
const rootKey = [partialReturnsEndpoint] as const;
const params = (values: Record<string, string | number>) => new URLSearchParams(
  Object.entries(values).map(([key, value]) => [key, String(value)]),
).toString();
const canonical = (value: unknown): string => Array.isArray(value)
  ? `[${value.map(canonical).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`
    : JSON.stringify(value);

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...init, credentials: "include", cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || `Accounting request failed (${response.status})`);
    Object.assign(error, { code: body.code, status: response.status });
    throw error;
  }
  return body as T;
}

export function previewPartialReturn(quote: PartialReturnQuote, signal?: AbortSignal) {
  const data = partialReturnQuoteSchema.parse(quote);
  return request<PartialReturnPlan>(`${partialReturnsEndpoint}/preview`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal,
  }).then(plan => {
    if (!plan || plan.input.companyId !== data.companyId || plan.input.kind !== data.kind
      || canonical(plan.input) !== canonical(data) || !/^[a-f0-9]{64}$/.test(plan.planHash)
      || plan.valuation.companyId !== data.companyId) {
      throw new Error("Preview response did not match the requested financial scope");
    }
    return plan;
  });
}

export function postPartialReturn(command: PartialReturnCommand) {
  const data = partialReturnCommandSchema.parse(command);
  return request<{ id: number; journalId: number; duplicate: boolean }>(partialReturnsEndpoint, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
}

export async function getPartialReturnTargets(companyId: number, signal?: AbortSignal) {
  const result = await request<PartialReturnTargets>(`${partialReturnsEndpoint}/targets?${params({ companyId })}`, { signal });
  if (result.companyId !== companyId || !Array.isArray(result.invoices) || !Array.isArray(result.receipts)
    || result.invoices.some(row => !row || row.id < 1 || !Array.isArray(row.items))
    || result.receipts.some(row => !row || row.id < 1 || !Array.isArray(row.allocations))) {
    throw new Error("Partial return targets contain invalid or out-of-scope records");
  }
  return result;
}

export async function getPartialReturnHistory(companyId: number, page: number, pageSize: number, signal?: AbortSignal) {
  const result = await request<PartialReturnHistory>(
    `${partialReturnsEndpoint}/history?${params({ companyId, page, pageSize })}`, { signal },
  );
  if (!result || !Array.isArray(result.rows) || result.rows.length > pageSize
    || result.pagination?.page !== page || result.pagination?.pageSize !== pageSize
    || !Number.isSafeInteger(result.pagination?.totalRows) || result.pagination.totalRows < 0
    || result.rows.some(row => !row || !Number.isSafeInteger(row.id) || row.id < 1
      || !["GOODS", "RECEIPT"].includes(row.kind) || !Number.isSafeInteger(row.journalId) || row.journalId < 1
      || row.valuation.companyId !== companyId)) {
    throw new Error("Partial return history contains invalid or out-of-scope records");
  }
  return result;
}

export async function findPartialReturnBySource(companyId: number, sourceId: string) {
  const pageSize = 100;
  const first = await getPartialReturnHistory(companyId, 1, pageSize);
  const found = first.rows.find(row => row.sourceId === sourceId);
  if (found) return found;
  const pages = Math.ceil(first.pagination.totalRows / pageSize);
  for (let page = 2; page <= pages; page++) {
    const history = await getPartialReturnHistory(companyId, page, pageSize);
    const row = history.rows.find(entry => entry.sourceId === sourceId);
    if (row) return row;
  }
  return undefined;
}

export function usePartialReturnTargets(companyId?: number) {
  return useQuery({
    queryKey: [...rootKey, "targets", companyId], enabled: Boolean(companyId), retry: false,
    queryFn: ({ signal }) => getPartialReturnTargets(companyId!, signal),
  });
}

export function usePartialReturnHistory(companyId?: number, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...rootKey, "history", companyId, page, pageSize], enabled: Boolean(companyId), retry: false,
    queryFn: ({ signal }) => getPartialReturnHistory(companyId!, page, pageSize, signal),
  });
}

export function usePreviewPartialReturn() {
  return useMutation({ retry: false, mutationFn: ({ quote, signal }: { quote: PartialReturnQuote; signal?: AbortSignal }) => previewPartialReturn(quote, signal) });
}

export function usePostPartialReturn() {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: postPartialReturn,
    onSuccess: () => client.invalidateQueries({ queryKey: rootKey }),
  });
}
