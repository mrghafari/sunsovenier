import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { loadingReturnCommandSchema, loadingReturnFiltersSchema, type LoadingReturnWorkbench } from "@shared/accounting-loading-returns";
import type { z } from "zod";

export const loadingReturnsEndpoint = "/api/accounting/v2/loading-returns";
export type LoadingReturnFilters = z.infer<typeof loadingReturnFiltersSchema>;
export type LoadingReturnCommand = z.infer<typeof loadingReturnCommandSchema>;
export const loadingReturnsKey = (filters?: LoadingReturnFilters) => [
  loadingReturnsEndpoint, filters?.companyId ?? null, filters?.orderId ?? null, filters?.page ?? null, filters?.pageSize ?? null,
] as const;

export function loadingReturnsUrl(filters: LoadingReturnFilters) {
  const parsed = loadingReturnFiltersSchema.parse(filters);
  const params = new URLSearchParams({ companyId: String(parsed.companyId), page: String(parsed.page), pageSize: String(parsed.pageSize) });
  if (parsed.orderId !== undefined) params.set("orderId", String(parsed.orderId));
  return `${loadingReturnsEndpoint}?${params}`;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `Accounting request failed (${response.status})`);
    Object.assign(error, { code: payload.code, status: response.status });
    throw error;
  }
  return payload as T;
}

export const fetchLoadingReturns = (filters: LoadingReturnFilters) => request<LoadingReturnWorkbench>(loadingReturnsUrl(filters));
export const postLoadingReturn = (command: LoadingReturnCommand) => request<unknown>(loadingReturnsEndpoint, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(loadingReturnCommandSchema.parse(command)),
});
export function useLoadingReturns(filters?: LoadingReturnFilters) {
  return useQuery({ queryKey: loadingReturnsKey(filters), enabled: Boolean(filters?.companyId), queryFn: () => fetchLoadingReturns(filters!), retry: false });
}

export function usePostLoadingReturn() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: postLoadingReturn,
    retry: false,
    onSuccess: () => client.invalidateQueries({
      predicate: query => typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("/api/accounting/v2/"),
    }),
  });
}
