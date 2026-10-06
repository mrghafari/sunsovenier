import { useQuery } from "@tanstack/react-query";
import type { LoadingFoundation, LoadingModuleStatus } from "@shared/loading/contracts";
import { loadingModuleStatusKey } from "./use-loading-module-status";

export const loadingFoundationKey = ["/api/loading/foundation"] as const;

export async function fetchLoadingFoundation(): Promise<LoadingFoundation> {
  const response = await fetch("/api/loading/foundation", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Loading foundation unavailable (${response.status})`);
  return response.json() as Promise<LoadingFoundation>;
}

export function isLoadingFoundationEnabled(status: LoadingModuleStatus | undefined) {
  return status?.enabled === true;
}

export function useLoadingFoundation(status: LoadingModuleStatus | undefined) {
  return useQuery({
    queryKey: loadingFoundationKey,
    queryFn: fetchLoadingFoundation,
    enabled: isLoadingFoundationEnabled(status),
    staleTime: 30_000,
    retry: 1,
  });
}