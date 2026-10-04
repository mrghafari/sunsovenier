import { useQuery } from "@tanstack/react-query";
import type { ShippingReportFilters, ShippingMarginReport } from "@shared/accounting-shipping-reports";

const base = "/api/accounting/v2/shipping-margin";

function query(filters: ShippingReportFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

async function responseError(res: Response, fallback: string) {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "message" in body && typeof body.message === "string" && body.message.trim()) return body.message;
  } catch { /* Non-JSON gateway errors still get a useful status. */ }
  return `${fallback} (${res.status})`;
}

export function useShippingMarginReport(filters?: ShippingReportFilters) {
  return useQuery({
    queryKey: [base, filters],
    enabled: !!filters,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`${base}?${query(filters!)}`, { credentials: "include" });
      if (!res.ok) throw new Error(await responseError(res, "Shipping margin report request failed"));
      return await res.json() as ShippingMarginReport;
    },
  });
}

export async function downloadShippingMarginReport(filters: ShippingReportFilters) {
  const res = await fetch(`${base}/csv?${query(filters)}`, { credentials: "include" });
  if (!res.ok) throw new Error(await responseError(res, "CSV export failed"));
  const url = URL.createObjectURL(await res.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `shipping-margin-${filters.companyId}-${filters.from}-${filters.to}.csv`;
  document.body.appendChild(anchor);
  try { anchor.click(); }
  finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}