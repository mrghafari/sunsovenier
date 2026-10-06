import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zeroStartCommandSchema, type ZeroStartState } from "@shared/accounting-zero-start";

export const zeroStartEndpoint = "/api/accounting/v2/zero-start";
export const zeroStartQueryKey = (companyId?: number) => [zeroStartEndpoint, companyId ?? null] as const;
export type ZeroStartResult = ZeroStartState & { duplicate?: boolean };

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", cache: "no-store", ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof payload.message === "string" ? payload.message : `Accounting request failed (${response.status})`);
    Object.assign(error, { code: payload.code, status: response.status });
    throw error;
  }
  return payload as T;
}

export async function fetchZeroStart(companyId: number): Promise<ZeroStartState> {
  if (!Number.isSafeInteger(companyId) || companyId < 1 || companyId > 2147483647) throw new Error("Valid company required");
  const state = await request<ZeroStartState>(`${zeroStartEndpoint}?${new URLSearchParams({ companyId: String(companyId) })}`, { method: "GET" });
  if (state.companyId !== companyId || typeof state.approved !== "boolean" || typeof state.active !== "boolean"
    || (state.startsOn !== null && !/^\d{4}-\d{2}-\d{2}$/.test(state.startsOn))) {
    throw new Error("Invalid zero-opening status response");
  }
  return state;
}

export function postZeroStart(command: unknown): Promise<ZeroStartResult> {
  const parsed = zeroStartCommandSchema.parse(command);
  return request<ZeroStartResult>(zeroStartEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  }).then(result => {
    if (result.companyId !== parsed.companyId) throw new Error("Zero-opening response is outside the requested company scope");
    return result;
  });
}

export function useZeroStartState(companyId?: number) {
  return useQuery({
    queryKey: zeroStartQueryKey(companyId),
    enabled: Number.isSafeInteger(companyId) && Boolean(companyId && companyId > 0),
    queryFn: () => fetchZeroStart(companyId!),
    retry: false,
  });
}

export function useActivateZeroStart() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: postZeroStart,
    retry: false,
    onSuccess: (state) => client.setQueryData(zeroStartQueryKey(state.companyId), state),
  });
}
