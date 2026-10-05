import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shipmentCostCommandSchema, shipmentCostFiltersSchema, type ShipmentCostWorkbench } from "@shared/accounting-shipment-costs";
import type { z } from "zod";

export const shipmentCostsEndpoint = "/api/accounting/v2/shipment-costs";
export type ShipmentCostFilters = z.infer<typeof shipmentCostFiltersSchema>;
export type ShipmentCostCommand = z.infer<typeof shipmentCostCommandSchema>;
export type ShipmentCostCaptureEvent =
  | {
    eventType: "ShipmentCostRecorded"; orderId: number; sourceId: string; eventDate: string; loadingSourceId: string;
    costType: "EXTERNAL_CARRIER"; carrierReference: string; costDocumentReference: string; actualCost: string; currency: string;
  }
  | {
    eventType: "ShipmentCostRecorded"; orderId: number; sourceId: string; eventDate: string; loadingSourceId: string;
    costType: "INTERNAL_FLEET"; distanceKm?: string;
  };
export type ShipmentCostCaptureCommand = { companyId: number; event: ShipmentCostCaptureEvent };
export const shipmentCostsKey = (filters?: ShipmentCostFilters) => [
  shipmentCostsEndpoint, filters?.companyId ?? null, filters?.orderId ?? null, filters?.page ?? null, filters?.pageSize ?? null,
] as const;

export function shipmentCostsUrl(filters: ShipmentCostFilters) {
  const parsed = shipmentCostFiltersSchema.parse(filters);
  const params = new URLSearchParams({
    companyId: String(parsed.companyId), page: String(parsed.page), pageSize: String(parsed.pageSize),
  });
  if (parsed.orderId !== undefined) params.set("orderId", String(parsed.orderId));
  return `${shipmentCostsEndpoint}?${params}`;
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

export const fetchShipmentCosts = (filters: ShipmentCostFilters) =>
  request<ShipmentCostWorkbench>(shipmentCostsUrl(filters));

export function useShipmentCosts(filters?: ShipmentCostFilters) {
  return useQuery({
    queryKey: shipmentCostsKey(filters),
    enabled: Boolean(filters?.companyId),
    queryFn: () => fetchShipmentCosts(filters!),
    retry: false,
  });
}

export function usePostShipmentCost() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (command: ShipmentCostCommand) => request<{ id: number; journalId: number; duplicate: boolean }>(
      shipmentCostsEndpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shipmentCostCommandSchema.parse(command)),
      },
    ),
    retry: false,
    onSuccess: (_result, command) => Promise.all([
      client.invalidateQueries({ queryKey: [shipmentCostsEndpoint, command.companyId] }),
      client.invalidateQueries({ queryKey: ["/api/accounting/v2/reports", "journal"] }),
      client.invalidateQueries({ queryKey: ["/api/accounting/v2/reports", "ledger"] }),
      client.invalidateQueries({ queryKey: ["/api/accounting/v2/reports", "trial-balance"] }),
      client.invalidateQueries({ queryKey: ["/api/accounting/v2/shipping-margin"] }),
      client.invalidateQueries({ queryKey: ["/api/accounting/v2/cost-reports"] }),
      client.invalidateQueries({ queryKey: ["/api/accounting/v2/audit"] }),
    ]),
  });
}

export function useCaptureShipmentCost() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (command: ShipmentCostCaptureCommand) => request<{ factId: number; duplicate: boolean; captureOnly: true }>(
      `${shipmentCostsEndpoint}/capture`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      },
    ),
    retry: false,
    onSuccess: (_result, command) => client.invalidateQueries({ queryKey: [shipmentCostsEndpoint, command.companyId] }),
  });
}
