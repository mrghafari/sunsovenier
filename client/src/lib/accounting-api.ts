import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountingBootstrap, AccountingResource, AccountingRow } from "@shared/accounting-api";

const base = "/api/accounting/v2";
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    credentials: "include", ...options,
    headers: {"Content-Type":"application/json",...options?.headers},
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || `Accounting request failed (${response.status})`) as Error & { code?: string; status?: number };
    error.code = typeof data.code === "string" ? data.code : typeof data.error === "string" ? data.error : undefined;
    error.status = response.status;
    throw error;
  }
  return data as T;
}
export function useAccountingBootstrap() {
  return useQuery({queryKey:[base,"bootstrap"],queryFn:()=>request<AccountingBootstrap>("/bootstrap"),retry:false});
}
export function useAccountingResource(resource: AccountingResource, companyId?: number) {
  return useQuery({
    queryKey:[base,resource,companyId], enabled: ["companies","currencies"].includes(resource)||Boolean(companyId),
    queryFn:()=>request<AccountingRow[]>(`/settings/${resource}${companyId?`?companyId=${companyId}`:""}`),retry:false,
  });
}
export function useSaveAccountingResource(resource: AccountingResource) {
  const client = useQueryClient();
  return useMutation({
    mutationFn:({id,values}:{id?:number|string;values:Record<string,unknown>}) =>
      request<AccountingRow>(`/settings/${resource}${id===undefined?"":`/${encodeURIComponent(id)}`}`,{method:id===undefined?"POST":"PUT",body:JSON.stringify(values)}),
    onSuccess:()=>client.invalidateQueries({queryKey:[base]}),
  });
}
export function useSeedAccounting() {
  const client = useQueryClient();
  return useMutation({
    mutationFn:(countryCode:"IQ"|"IR")=>request<{companyId:number;postingKeyCount:number}>("/seed",{method:"POST",body:JSON.stringify({countryCode})}),
    onSuccess:()=>client.invalidateQueries({queryKey:[base]}),
  });
}

export type DeleteAccountingCompanyResult = { companyId: number; deleted: true; duplicate: boolean };
export async function deleteAccountingCompanyRequest(companyId: number, confirmationName: string): Promise<DeleteAccountingCompanyResult> {
  return request<DeleteAccountingCompanyResult>(`/settings/companies/${encodeURIComponent(companyId)}`, {
    method: "DELETE",
    body: JSON.stringify({ confirmationName, deleteConfirmed: true }),
  });
}
export function useDeleteAccountingCompany() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, confirmationName }: { companyId: number; confirmationName: string }) =>
      deleteAccountingCompanyRequest(companyId, confirmationName),
    onSuccess: () => client.invalidateQueries({ queryKey: [base] }),
  });
}