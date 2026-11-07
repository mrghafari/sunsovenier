/** Company contact settings own the header phone; old published pages remain compatible. */
export function resolveLandingPhone(
  settings: { landingPhone?: string } | null | undefined,
  legacy: { phoneLabel: string; phoneHref: string },
) {
  if (typeof settings?.landingPhone !== "string") {
    return { label: legacy.phoneLabel, href: legacy.phoneHref };
  }
  const label = settings.landingPhone.trim();
  const normalized = label
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660));
  const number = normalized.replace(/[^\d+]/g, "");
  return { label, href: `tel:${number.startsWith("+") ? "+" : ""}${number.replace(/\+/g, "")}` };
}
