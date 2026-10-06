import { contractQuantityLimit } from "@/lib/contract-cart";

export type CheckoutCartMode = { contractId: number; customerId: number } | null;

const storagePrefix = "shop-checkout-contract-mode";

export function cartModeStorageKey(customerId: number): string {
  return `${storagePrefix}:${customerId}`;
}

export function readCartMode(customerId: number | null | undefined): CheckoutCartMode {
  if (customerId == null || typeof localStorage === "undefined") return null;
  const failClosed: CheckoutCartMode = { customerId: Number(customerId), contractId: -1 };
  try {
    const key = cartModeStorageKey(customerId);
    const raw = localStorage.getItem(key) ??
      (typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(key));
    if (raw === null) return null;
    const value = JSON.parse(raw);
    if (Number(value?.customerId) !== Number(customerId) || !Number.isInteger(Number(value?.contractId))) return failClosed;
    return { customerId: Number(customerId), contractId: Number(value.contractId) };
  } catch {
    return failClosed;
  }
}

export function writeCartMode(customerId: number, contractId: number): CheckoutCartMode {
  const mode = { customerId, contractId };
  if (typeof localStorage !== "undefined") {
    const key = cartModeStorageKey(customerId);
    const value = JSON.stringify(mode);
    try {
      localStorage.setItem(key, value);
    } catch {
      if (typeof sessionStorage === "undefined") throw new Error("Could not persist contract cart mode");
      sessionStorage.setItem(key, value);
    }
  }
  return mode;
}

export function clearCartMode(customerId: number | null | undefined): void {
  if (customerId != null && typeof localStorage !== "undefined") {
    const key = cartModeStorageKey(customerId);
    try { localStorage.removeItem(key); } catch { /* Keep the in-memory mode fail-closed. */ }
    try { if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(key); } catch { /* Session storage may also be unavailable. */ }
  }
}

export function contractAllowsProduct(contract: any, productId: number): boolean {
  const item = contract?.items?.find((entry: any) => Number(entry.productId) === Number(productId));
  const limit = contractQuantityLimit(item);
  return !!contract?.isActive && limit !== null && Number.isFinite(limit) && limit > 0;
}

export function canAddToCartMode(cart: Record<number, number>, mode: CheckoutCartMode, requestedContractId?: number): boolean {
  const populated = Object.values(cart).some(quantity => Number(quantity) > 0);
  if (!populated) return true;
  if (!mode) return requestedContractId == null;
  return requestedContractId === mode.contractId;
}
