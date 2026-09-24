const PICKUP_METHODS = new Set(["pickup", "personal_pickup", "self_pickup", "store_pickup"]);

export function isPickupShippingMethod(method: unknown): boolean {
  return PICKUP_METHODS.has(String(method ?? "").trim().toLowerCase());
}

export function isActivePickupShippingMethod(method: unknown, selectedMethod: any): boolean {
  const canonicalMethod = String(method ?? "").trim().toLowerCase();
  return isPickupShippingMethod(canonicalMethod)
    && selectedMethod?.isActive === true
    && String(selectedMethod.value ?? "").trim().toLowerCase() === canonicalMethod;
}

export function isStandardShippingMethod(method: unknown): boolean {
  const canonicalMethod = String(method ?? "").trim().toLowerCase();
  return canonicalMethod !== ""
    && canonicalMethod !== "smart_vehicle"
    && !isPickupShippingMethod(canonicalMethod);
}