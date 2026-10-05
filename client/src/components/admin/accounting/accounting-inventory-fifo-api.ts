import { useQuery } from "@tanstack/react-query";
import type { InventoryFifoReport } from "@shared/accounting-inventory-fifo";
import { loadingPreviewFiltersSchema, type LoadingPreviewFilters } from "@shared/accounting-loading-preview";

export const inventoryFifoPreviewEndpoint = "/api/accounting/v2/inventory-fifo-preview";
export const inventoryFifoPreviewQueryKey = (filters?: LoadingPreviewFilters) =>
  [inventoryFifoPreviewEndpoint, filters?.companyId, filters?.orderId ?? null, filters?.page, filters?.pageSize] as const;

export function inventoryFifoPreviewUrl(filters: LoadingPreviewFilters): string {
  const parsed = loadingPreviewFiltersSchema.parse(filters);
  const params = new URLSearchParams({
    companyId: String(parsed.companyId),
    page: String(parsed.page),
    pageSize: String(parsed.pageSize),
  });
  if (parsed.orderId !== undefined) params.set("orderId", String(parsed.orderId));
  return `${inventoryFifoPreviewEndpoint}?${params.toString()}`;
}

export async function fetchInventoryFifoPreview(filters: LoadingPreviewFilters): Promise<InventoryFifoReport> {
  const response = await fetch(inventoryFifoPreviewUrl(filters), { credentials: "include" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `FIFO preview request failed (${response.status})`);
    Object.assign(error, { code: payload.code, status: response.status });
    throw error;
  }
  return payload as InventoryFifoReport;
}

export function useInventoryFifoPreview(filters?: LoadingPreviewFilters) {
  return useQuery({
    queryKey: inventoryFifoPreviewQueryKey(filters),
    enabled: Boolean(filters?.companyId),
    queryFn: () => fetchInventoryFifoPreview(filters!),
    retry: false,
  });
}
