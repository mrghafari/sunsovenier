import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountingBootstrap, AccountingResource, AccountingRow } from "@shared/accounting-api";

const base = "/api/accounting/v2";
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    credentials: "include", ...options,
    headers: {"Content-Type":"application/json",...options?.headers},
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || `Accounting request failed (${response.status})`);
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