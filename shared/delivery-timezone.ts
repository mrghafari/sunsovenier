const COUNTRY_TIME_ZONES: Record<string, string> = {
  iran: "Asia/Tehran",
  ir: "Asia/Tehran",
  ایران: "Asia/Tehran",
  iraq: "Asia/Baghdad",
  iq: "Asia/Baghdad",
  عراق: "Asia/Baghdad",
  turkey: "Europe/Istanbul",
  türkiye: "Europe/Istanbul",
  tr: "Europe/Istanbul",
  ترکیه: "Europe/Istanbul",
  "united arab emirates": "Asia/Dubai",
  uae: "Asia/Dubai",
  ae: "Asia/Dubai",
  امارات: "Asia/Dubai",
};

export function getDestinationTimeZone(country: unknown): string | null {
  if (typeof country !== "string") return null;
  return COUNTRY_TIME_ZONES[country.trim().toLowerCase()] ?? null;
}

export function formatDeliveryAppointment(
  value: string | Date,
  timeZone: string,
  locale: string,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new RangeError("Invalid delivery appointment instant");
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date);
}