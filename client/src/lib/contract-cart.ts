export function keepContractCartItems(
  cart: Record<number, number>,
  allowedProductIds: readonly number[],
): Record<number, number> {
  const allowed = new Set(allowedProductIds.map(Number));
  return Object.fromEntries(
    Object.entries(cart).filter(([productId]) => allowed.has(Number(productId))),
  );
}

export function contractQuantityLimit(item: { maxQuantity: number; remainingQuantity: number } | undefined): number | null {
  if (!item || item.maxQuantity == null || item.remainingQuantity == null) return null;
  const maximum = Number(item.maxQuantity);
  const remaining = Number(item.remainingQuantity);
  if (!Number.isFinite(maximum) || !Number.isFinite(remaining) || maximum < 0 || remaining < 0) return null;
  return Math.floor(Math.min(maximum, remaining));
}