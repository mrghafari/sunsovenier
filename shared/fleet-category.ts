export type FleetCategory = "standard" | "contract";

export function fleetCategoryForContract(contractId: unknown): FleetCategory {
  return Number.isSafeInteger(Number(contractId)) && Number(contractId) > 0 ? "contract" : "standard";
}

export function parseFleetCategory(value: unknown): FleetCategory {
  if (value === undefined || value === null) return "standard";
  if (value === "standard" || value === "contract") return value;
  throw new Error("Invalid fleet category.");
}

export function fleetCategoryLabel(category: FleetCategory, language: string): string {
  const labels: Record<string, Record<FleetCategory, string>> = {
    fa: { standard: "ناوگان عمومی", contract: "ناوگان خریدهای قراردادی" },
    ar: { standard: "الأسطول العام", contract: "أسطول المشتريات التعاقدية" },
    tr: { standard: "Genel filo", contract: "Sözleşmeli alışveriş filosu" },
    en: { standard: "General fleet", contract: "Contract-purchase fleet" },
  };
  return (labels[language] || labels.en)[category];
}

export function assertFleetCategory(contractId: unknown, category: unknown): void {
  if (parseFleetCategory(category) !== fleetCategoryForContract(contractId)) {
    throw new Error(fleetCategoryForContract(contractId) === "contract"
      ? "برای این سفارش باید خودرو از ناوگان خریدهای قراردادی انتخاب شود."
      : "برای این سفارش باید خودرو از ناوگان عمومی انتخاب شود.");
  }
}
