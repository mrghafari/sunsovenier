const KILOGRAM_FACTORS: Record<string, number> = {
  kg: 1,
  g: 0.001,
  lb: 0.45359237,
  oz: 0.028349523125,
  t: 1000,
};

export function shippingWeightKg(product: {
  grossWeight?: unknown;
  weight?: unknown;
  weightKg?: unknown;
  weight_kg?: unknown;
  weightUnit?: unknown;
}): number | null {
  const rawWeight = product.grossWeight ?? product.weight ?? product.weightKg ?? product.weight_kg;
  if (rawWeight === null || rawWeight === undefined || String(rawWeight).trim() === "") return null;
  const weight = Number(rawWeight);
  const unit = String(product.weightUnit || "kg").trim().toLowerCase();
  const factor = KILOGRAM_FACTORS[unit];
  if (!Number.isFinite(weight) || weight < 0 || factor === undefined) return null;
  return weight * factor;
}