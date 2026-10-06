import { getDestinationTimeZone } from "../shared/delivery-timezone";

type LocalDateTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function utcFromParts(parts: LocalDateTime): number {
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(parts.hour, parts.minute, 0, 0);
  return date.getTime();
}

export function isValidIanaTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== "string" || !timeZone.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

function parseLocalDateTime(value: unknown): LocalDateTime {
  if (typeof value !== "string") throw new Error("estimatedDeliveryLocal must use YYYY-MM-DDTHH:mm format");
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);
  if (!match) throw new Error("estimatedDeliveryLocal must use YYYY-MM-DDTHH:mm format");
  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const parts = {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
  };
  const checked = new Date(utcFromParts(parts));
  if (
    parts.year < 1 || checked.getUTCFullYear() !== parts.year ||
    checked.getUTCMonth() !== parts.month - 1 || checked.getUTCDate() !== parts.day ||
    parts.hour > 23 || parts.minute > 59
  ) {
    throw new Error("estimatedDeliveryLocal is not a valid calendar date and time");
  }
  return parts;
}

function zonedParts(instant: Date, timeZone: string): LocalDateTime {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const parts = Object.fromEntries(values.map(({ type, value }) => [type, value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function sameLocalTime(left: LocalDateTime, right: LocalDateTime): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day &&
    left.hour === right.hour && left.minute === right.minute;
}

/** Converts wall-clock local time to one unambiguous instant; gaps and folds are errors. */
export function resolveLocalDeliveryAppointment(local: unknown, timeZone: unknown): Date {
  const requested = parseLocalDateTime(local);
  if (!isValidIanaTimeZone(timeZone)) throw new Error("deliveryTimeZone must be a valid IANA time zone");

  const wallTime = utcFromParts(requested);
  const possibleInstants = new Map<number, Date>();

  // Collect every offset in the surrounding three days, then verify candidates by
  // formatting them back into the requested zone. This detects DST gaps and folds.
  for (let deltaMinutes = -36 * 60; deltaMinutes <= 36 * 60; deltaMinutes += 15) {
    const sample = new Date(wallTime + deltaMinutes * 60_000);
    const represented = zonedParts(sample, timeZone);
    const representedAsUtc = utcFromParts(represented);
    const offset = representedAsUtc - sample.getTime();
    const candidate = new Date(wallTime - offset);
    if (sameLocalTime(zonedParts(candidate, timeZone), requested)) {
      possibleInstants.set(candidate.getTime(), candidate);
    }
  }

  if (possibleInstants.size === 0) {
    throw new Error("The requested local delivery time does not exist in this time zone");
  }
  if (possibleInstants.size > 1) {
    throw new Error("The requested local delivery time is ambiguous in this time zone");
  }
  return possibleInstants.values().next().value as Date;
}

export function getCheckoutDestination(address: unknown): { country: string | null; city: string | null } {
  let snapshot: unknown = address;
  if (typeof snapshot === "string") {
    try {
      snapshot = JSON.parse(snapshot);
    } catch {
      return { country: null, city: null };
    }
  }
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return { country: null, city: null };
  }
  const record = snapshot as Record<string, unknown>;
  const firstString = (...keys: string[]) => {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  };
  return {
    country: firstString("country", "countryName", "country_name"),
    city: firstString("city", "cityName", "city_name"),
  };
}

export function resolveDestinationDeliveryAppointment(
  local: unknown,
  timeZone: unknown,
  destinationCountry: unknown,
): Date {
  if (!isValidIanaTimeZone(timeZone)) {
    throw new Error("deliveryTimeZone must be a valid IANA time zone");
  }
  const expectedTimeZone = getDestinationTimeZone(destinationCountry);
  if (expectedTimeZone && timeZone !== expectedTimeZone) {
    throw new Error(`deliveryTimeZone must match the destination country (${expectedTimeZone})`);
  }
  return resolveLocalDeliveryAppointment(local, timeZone);
}