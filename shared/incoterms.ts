/** Standardized delivery-term codes used by sales contracts (Incoterms® 2020). */
export const INCOTERMS_2020 = [
  { code: "EXW", name: "Ex Works" },
  { code: "FCA", name: "Free Carrier" },
  { code: "CPT", name: "Carriage Paid To" },
  { code: "CIP", name: "Carriage and Insurance Paid To" },
  { code: "DAP", name: "Delivered at Place" },
  { code: "DPU", name: "Delivered at Place Unloaded" },
  { code: "DDP", name: "Delivered Duty Paid" },
  { code: "FAS", name: "Free Alongside Ship" },
  { code: "FOB", name: "Free On Board" },
  { code: "CFR", name: "Cost and Freight" },
  { code: "CIF", name: "Cost, Insurance and Freight" },
] as const;

export type IncotermCode = (typeof INCOTERMS_2020)[number]["code"];

export function isIncotermCode(value: unknown): value is IncotermCode {
  return typeof value === "string" && INCOTERMS_2020.some((term) => term.code === value);
}