export function isSiteAdminDeliveryRole(roleName: unknown): boolean {
  if (typeof roleName !== "string") return false;
  const role = roleName.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ["admin", "super_admin", "supper_admin"].includes(role);
}

export function normalizeDeliveryConfirmationCode(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660));
}

export function isFourDigitDeliveryCode(value: unknown): boolean {
  return /^[0-9]{4}$/.test(normalizeDeliveryConfirmationCode(value));
}

export function canAdminConfirmDelivery(order: {
  currentStatus?: string | null; vehiclePlate?: string | null; isVerified?: boolean | null;
}): boolean {
  if (order.isVerified) return false;
  if (order.currentStatus === "logistics_dispatched") return true;
  return order.currentStatus === "logistics_assigned" && Boolean(order.vehiclePlate?.trim());
}
