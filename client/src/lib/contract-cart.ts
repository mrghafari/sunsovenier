export function keepContractCartItems(
  cart: Record<number, number>,
  allowedProductIds: readonly number[],
): Record<number, number> {
  const allowed = new Set(allowedProductIds.map(Number));
  return Object.fromEntries(
    Object.entries(cart).filter(([productId]) => allowed.has(Number(productId))),
  );
}