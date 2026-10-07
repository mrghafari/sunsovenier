type ShippingMode = "automatic_vehicle" | "self_transport" | null | undefined;

/** Company delivery uses automatic templates; customers can instead arrange their own transport. */
export function isContractShippingMethodAllowed(mode: ShippingMode, value: unknown): boolean {
  const method = String(value ?? "").trim().toLowerCase();
  if (mode === "automatic_vehicle") return method === "smart_vehicle" || method === "self_pickup";
  if (mode === "self_transport") return method === "self_pickup";
  return true;
}

/** Preserve an allowed choice across rerenders; only replace missing or forbidden selections. */
export function preferredContractShippingMethod(mode: ShippingMode, current: unknown): string | null {
  if (!mode) return null;
  const method = String(current ?? "").trim().toLowerCase();
  if (method && isContractShippingMethodAllowed(mode, method)) return method;
  return mode === "self_transport" ? "self_pickup" : "smart_vehicle";
}
