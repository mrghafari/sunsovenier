export const storeSalesTabs = ["orders", "discounts", "inventory", "returns", "abandoned-cart", "bulk-purchases", "proforma-deadline"];
const formerProcurementTabs = ["bulk-purchases", "proforma-deadline"];
export type SalesSection = "store" | "reports" | "invoices" | "weight-reviews";

export function isLegacyContractsDeepLink(search: string): boolean {
  const params = new URLSearchParams(search);
  if (params.get("unit") !== "sales") return false;
  return params.get("tab") === "contracts" ||
    (params.get("group") === "contractual" && !params.has("tab"));
}

export function commercialSelectionFromUrl(search: string): { section: SalesSection; tab: string } {
  const params = new URLSearchParams(search);
  const unit = params.get("unit");
  const tab = params.get("tab");
  if (isLegacyContractsDeepLink(search)) return { section: "store", tab: "orders" };
  if (unit === "procurement" && (!tab || formerProcurementTabs.includes(tab))) {
    return { section: "store", tab: tab || "bulk-purchases" };
  }
  if (unit === "sales") {
    if (tab === "reports" || (!tab && params.get("group") === "reports")) return { section: "reports", tab: "reports" };
    if (tab === "invoices" || (!tab && params.get("group") === "invoices")) return { section: "invoices", tab: "invoices" };
    if (tab === "weight-reviews") return { section: "weight-reviews", tab: "weight-reviews" };
    if (tab && storeSalesTabs.includes(tab)) return { section: "store", tab };
  }
  return { section: "store", tab: "orders" };
}
