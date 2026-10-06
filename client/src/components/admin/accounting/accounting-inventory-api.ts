import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InventoryDocumentInput, InventoryDocumentList, InventoryDocumentMetadata, InventoryDocumentRow } from "@shared/accounting-inventory-documents";

const base = "/api/accounting/v2/inventory-documents";
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    credentials: "include", ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `Inventory document request failed (${response.status})`);
    Object.assign(error, { code: payload.code, status: response.status });
    throw error;
  }
  return payload as T;
}
export function saveInventoryDocumentRequest(input: InventoryDocumentInput): Promise<InventoryDocumentRow> {
  return request<InventoryDocumentRow>("", { method: "POST", body: JSON.stringify(input) });
}
const companyKey = (companyId?: number) => [base, companyId] as const;
export function useInventoryDocumentMetadata(companyId?: number) {
  return useQuery({
    queryKey: [...companyKey(companyId), "metadata"], enabled: Boolean(companyId),
    queryFn: () => request<InventoryDocumentMetadata>(`/metadata?companyId=${companyId}`), retry: false,
  });
}
export function useInventoryDocuments(companyId?: number, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...companyKey(companyId), "list", page, pageSize], enabled: Boolean(companyId),
    queryFn: () => request<InventoryDocumentList>(`?companyId=${companyId}&page=${page}&pageSize=${pageSize}`), retry: false,
  });
}
export function useInventoryDocument(companyId?: number, id?: number) {
  return useQuery({
    queryKey: [...companyKey(companyId), "detail", id], enabled: Boolean(companyId && id),
    queryFn: async () => {
      const result = await request<InventoryDocumentRow | { row: InventoryDocumentRow }>(`/${id}?companyId=${companyId}`);
      return "row" in result ? result.row : result;
    }, retry: false,
  });
}
export function useSaveInventoryDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: saveInventoryDocumentRequest,
    onSuccess: (_row, input) => client.invalidateQueries({ queryKey: companyKey(input.companyId) }),
  });
}
export type InventoryAction = "approve" | "discard" | "void";
export function useInventoryDocumentAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, companyId, revision, reason }: { id: number; action: InventoryAction; companyId: number; revision: number; reason: string }) =>
      request<InventoryDocumentRow>(`/${id}/${action}`, { method: "POST", body: JSON.stringify({ companyId, revision, reason }) }),
    onSuccess: (_row, input) => client.invalidateQueries({ queryKey: companyKey(input.companyId) }),
  });
}
