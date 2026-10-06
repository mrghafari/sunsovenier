import { useQuery } from "@tanstack/react-query";
import type { AccountingReportFilters } from "@shared/accounting-reports";
import type { AccountingCostReport } from "@shared/accounting-cost-reports";

const base = "/api/accounting/v2/cost-reports";

function query(filters: AccountingReportFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

async function responseError(res: Response, fallback: string) {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "message" in body && typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
  } catch {
    // A non-JSON gateway error still gets a useful status message.
  }
  return `${fallback} (${res.status})`;
}

export function useAccountingCostReport(filters?: AccountingReportFilters) {
  return useQuery({
    queryKey: [base, filters],
    enabled: !!filters,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`${base}?${query(filters!)}`, { credentials: "include" });
      if (!res.ok) throw new Error(await responseError(res, "Cost report request failed"));
      return await res.json() as AccountingCostReport;
    },
  });
}

export async function downloadAccountingCostReport(filters: AccountingReportFilters) {
  const res = await fetch(`${base}/csv?${query(filters)}`, { credentials: "include" });
  if (!res.ok) throw new Error(await responseError(res, "CSV export failed"));
  const url = URL.createObjectURL(await res.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `accounting-costs-${filters.companyId}-${filters.from}-${filters.to}.csv`;
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}