import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CapitalizationWorkbench } from "@shared/accounting-inventory-capitalization";
import { capitalizationCommandSchema, capitalizationQuerySchema } from "@shared/accounting-inventory-capitalization";

export const inventoryCapitalizationsEndpoint = "/api/accounting/v2/inventory-capitalizations";
export const inventoryCapitalizationsKey = (companyId?: number) => [inventoryCapitalizationsEndpoint, companyId ?? null] as const;

export function inventoryCapitalizationsUrl(companyId: number) {
  const parsed = capitalizationQuerySchema.parse({ companyId });
  return `${inventoryCapitalizationsEndpoint}?${new URLSearchParams({ companyId: String(parsed.companyId) })}`;
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
export const fetchInventoryCapitalizations = (companyId: number) =>
  request<CapitalizationWorkbench>(inventoryCapitalizationsUrl(companyId));
export function useInventoryCapitalizations(companyId?: number) {
  return useQuery({
    queryKey: inventoryCapitalizationsKey(companyId),
    enabled: Boolean(companyId),
    queryFn: () => fetchInventoryCapitalizations(companyId!),
    retry: false,
  });
}
export function usePostInventoryCapitalization() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (command: unknown) => request<{ id: number; journalId: number; bookIds: number[] }>(
      inventoryCapitalizationsEndpoint,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(capitalizationCommandSchema.parse(command)) },
    ),
    onSuccess: (_result, variables) => {
      const companyId = (variables as { companyId: number }).companyId;
      return Promise.all([
        client.invalidateQueries({ queryKey: inventoryCapitalizationsKey(companyId) }),
        client.invalidateQueries({ queryKey: ["/api/accounting/v2/stock-books", companyId] }),
        client.invalidateQueries({ queryKey: ["/api/accounting/v2/loading-invoices", companyId] }),
        client.invalidateQueries({ queryKey: ["/api/accounting/v2/inventory-documents", companyId] }),
        client.invalidateQueries({ predicate: query =>
          typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("/api/accounting/") }),
      ]);
    },
  });
}
