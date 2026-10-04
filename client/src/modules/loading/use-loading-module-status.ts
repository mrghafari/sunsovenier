import { useQuery } from "@tanstack/react-query";
import type { LoadingModuleStatus } from "@shared/loading/contracts";

export const loadingModuleStatusKey = ["/api/loading/module-status"] as const;

export async function fetchLoadingModuleStatus(): Promise<LoadingModuleStatus> {
  const response = await fetch("/api/loading/module-status", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Loading module status unavailable (${response.status})`);
  return response.json() as Promise<LoadingModuleStatus>;
}

export function useLoadingModuleStatus() {
  return useQuery({
    queryKey: loadingModuleStatusKey,
    queryFn: fetchLoadingModuleStatus,
    staleTime: 30_000,
    refetchInterval: 15_000,
    retry: 1,
  });
}