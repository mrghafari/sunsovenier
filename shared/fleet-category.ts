export type FleetCategory = "standard" | "contract" | "both";

export function fleetCategoryForContract(contractId: unknown): FleetCategory {
  return Number.isSafeInteger(Number(contractId)) && Number(contractId) > 0 ? "contract" : "standard";
}

export function parseFleetCategory(value: unknown): FleetCategory {
  if (value === undefined || value === null) return "standard";
  if (value === "standard" || value === "contract" || value === "both") return value;
  throw new Error("Invalid fleet category.");
}

export function fleetCategoryLabel(category: FleetCategory, language: string): string {
  const labels: Record<string, Record<FleetCategory, string>> = {
    fa: { standard: "ناوگان عمومی", contract: "ناوگان خریدهای قراردادی", both: "هر دو ناوگان" },
    ar: { standard: "الأسطول العام", contract: "أسطول المشتريات التعاقدية", both: "كلا الأسطولين" },
    tr: { standard: "Genel filo", contract: "Sözleşmeli alışveriş filosu", both: "Her iki filo" },
    en: { standard: "General fleet", contract: "Contract-purchase fleet", both: "Both fleets" },
  };
  return (labels[language] || labels.en)[category];
}

export function assertFleetCategory(contractId: unknown, category: unknown): void {
  if (!eligibleFleetCategories(fleetCategoryForContract(contractId)).includes(parseFleetCategory(category))) {
    throw new Error("برای این سفارش باید خودرو از ناوگان خریدهای قراردادی انتخاب شود.");
  }
}

/** A vehicle has one identity and can be a member of either or both catalogs. */
export function isFleetMember(category: unknown, group: "standard" | "contract"): boolean {
  const membership = parseFleetCategory(category);
  return membership === "both" || membership === group;
}

/** Contract orders require contract membership. Availability is checked separately. */
export function eligibleFleetCategories(orderCategory: FleetCategory): FleetCategory[] {
  return orderCategory === "contract" ? ["contract", "both"] : ["standard", "contract", "both"];
}
