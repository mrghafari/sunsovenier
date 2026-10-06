export function calculateAuthoritativeShippingCost(input: {
  basePrice: unknown;
  pricePerKg: unknown;
  totalWeightKg: number;
  itemSubtotal: number;
  freeShippingThreshold?: unknown;
}): number {
  const basePrice = Number(input.basePrice);
  const pricePerKg = Number(input.pricePerKg ?? 0);
  const threshold = Number(input.freeShippingThreshold ?? 0);
  if (
    !Number.isFinite(basePrice) || basePrice < 0
    || !Number.isFinite(pricePerKg) || pricePerKg < 0
    || !Number.isFinite(input.totalWeightKg) || input.totalWeightKg < 0
    || !Number.isFinite(input.itemSubtotal) || input.itemSubtotal < 0
    || !Number.isFinite(threshold) || threshold < 0
  ) {
    throw new Error("The selected delivery method has no valid server-side price.");
  }
  if (threshold > 0 && input.itemSubtotal >= threshold) return 0;
  return Math.round(basePrice + pricePerKg * input.totalWeightKg);
}

/** Match an active delivery method by its canonical value, never by a seeded ID. */
export function isActiveCanonicalShippingMethod(
  method: { value?: unknown; isActive?: unknown } | null | undefined,
  canonicalValue: unknown,
): boolean {
  const expected = String(canonicalValue ?? "").trim().toLowerCase();
  const actual = String(method?.value ?? "").trim().toLowerCase();
  return Boolean(expected) && method?.isActive === true && actual === expected;
}