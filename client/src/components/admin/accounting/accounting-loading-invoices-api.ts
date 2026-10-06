import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LoadingInvoiceWorkbench, StockBookMetadata } from "@shared/accounting-loading-invoices";
import { loadingInvoiceCommandSchema, stockBookCommandSchema } from "@shared/accounting-loading-invoices";
import { loadingPreviewFiltersSchema, type LoadingPreviewFilters } from "@shared/accounting-loading-preview";

export const loadingInvoicesEndpoint = "/api/accounting/v2/loading-invoices";
export const stockBooksEndpoint = "/api/accounting/v2/stock-books";
export const loadingInvoicesKey = (filters?: LoadingPreviewFilters) =>
  [loadingInvoicesEndpoint, filters?.companyId ?? null, filters?.orderId ?? null, filters?.page ?? null, filters?.pageSize ?? null] as const;
export const stockBooksKey = (companyId?: number) => [stockBooksEndpoint, companyId ?? null] as const;

export function loadingInvoicesUrl(filters: LoadingPreviewFilters) {
  const parsed = loadingPreviewFiltersSchema.parse(filters);
  const params = new URLSearchParams({ companyId: String(parsed.companyId), page: String(parsed.page), pageSize: String(parsed.pageSize) });
  if (parsed.orderId !== undefined) params.set("orderId", String(parsed.orderId));
  return `${loadingInvoicesEndpoint}?${params}`;
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
export const fetchLoadingInvoices = (filters: LoadingPreviewFilters) => request<LoadingInvoiceWorkbench>(loadingInvoicesUrl(filters));
export const fetchStockBooks = (companyId: number) => request<StockBookMetadata>(`${stockBooksEndpoint}?${new URLSearchParams({ companyId: String(companyId) })}`);
export function useLoadingInvoices(filters?: LoadingPreviewFilters) {
  return useQuery({ queryKey: loadingInvoicesKey(filters), enabled: Boolean(filters?.companyId), queryFn: () => fetchLoadingInvoices(filters!), retry: false });
}
export function useStockBooks(companyId?: number) {
  return useQuery({ queryKey: stockBooksKey(companyId), enabled: Boolean(companyId), queryFn: () => fetchStockBooks(companyId!), retry: false });
}
export function useIssueLoadingInvoice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (command: unknown) => request<{ invoiceId: number; journalId: number; cogsJournalId: number | null; receivableId: number; settlementId: number | null }>(loadingInvoicesEndpoint, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(loadingInvoiceCommandSchema.parse(command)),
    }),
    onSuccess: (_result, variables) => client.invalidateQueries({ queryKey: [loadingInvoicesEndpoint, (variables as { companyId: number }).companyId] }),
  });
}
export function useRegisterStockBook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (command: unknown) => request<{ id: number }>(stockBooksEndpoint, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(stockBookCommandSchema.parse(command)),
    }),
    onSuccess: (_result, variables) => Promise.all([
      client.invalidateQueries({ queryKey: stockBooksKey((variables as { companyId: number }).companyId) }),
      client.invalidateQueries({ queryKey: [loadingInvoicesEndpoint, (variables as { companyId: number }).companyId] }),
    ]),
  });
}
