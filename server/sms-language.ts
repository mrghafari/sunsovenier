import type { Pool } from "pg";

export const SMS_LANGUAGES = ["en", "fa", "ar", "tr"] as const;
export type SmsLanguage = (typeof SMS_LANGUAGES)[number];
export const SMS_LANGUAGE_FALLBACK: SmsLanguage = "en";

export function normalizeSmsLanguage(value: unknown): SmsLanguage {
  const language = String(value ?? "").trim().toLowerCase().split(/[-_]/)[0];
  return (SMS_LANGUAGES as readonly string[]).includes(language)
    ? language as SmsLanguage
    : SMS_LANGUAGE_FALLBACK;
}

/**
 * Resolve only persisted customer preferences. Phone prefixes and country
 * are deliberately not considered. English is the documented fallback when
 * no authoritative preference exists or the stored value is unsupported.
 */
export async function resolveSmsLanguage(
  pool: Pool,
  customerId?: number,
  phone?: string,
  fallback?: unknown,
): Promise<SmsLanguage> {
  if (customerId) {
    const crm = await pool.query(
      "SELECT preferred_language FROM crm_customers WHERE id = $1 LIMIT 1",
      [customerId],
    );
    if (crm.rows[0]?.preferred_language) {
      return normalizeSmsLanguage(crm.rows[0].preferred_language);
    }
    const portal = await pool.query(
      "SELECT preferred_language FROM customers WHERE id = $1 LIMIT 1",
      [customerId],
    );
    if (portal.rows[0]?.preferred_language) {
      return normalizeSmsLanguage(portal.rows[0].preferred_language);
    }
  }
  if (phone) {
    const crm = await pool.query(
      "SELECT preferred_language FROM crm_customers WHERE phone = $1 LIMIT 1",
      [phone],
    );
    if (crm.rows[0]?.preferred_language) {
      return normalizeSmsLanguage(crm.rows[0].preferred_language);
    }
    const portal = await pool.query(
      "SELECT preferred_language FROM customers WHERE phone = $1 LIMIT 1",
      [phone],
    );
    if (portal.rows[0]?.preferred_language) {
      return normalizeSmsLanguage(portal.rows[0].preferred_language);
    }
  }
  return fallback == null
    ? SMS_LANGUAGE_FALLBACK
    : normalizeSmsLanguage(fallback);
}

export async function resolveEmailLanguage(
  pool: Pool,
  email?: string,
  fallback?: unknown,
): Promise<SmsLanguage> {
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  if (normalizedEmail) {
    const crm = await pool.query(
      'SELECT preferred_language FROM crm_customers WHERE LOWER(email) = $1 LIMIT 1',
      [normalizedEmail],
    );
    if (crm.rows[0]?.preferred_language) {
      return normalizeSmsLanguage(crm.rows[0].preferred_language);
    }
    const portal = await pool.query(
      'SELECT preferred_language FROM customers WHERE LOWER(email) = $1 LIMIT 1',
      [normalizedEmail],
    );
    if (portal.rows[0]?.preferred_language) {
      return normalizeSmsLanguage(portal.rows[0].preferred_language);
    }
  }
  return fallback == null
    ? SMS_LANGUAGE_FALLBACK
    : normalizeSmsLanguage(fallback);
}

export function selectLocalizedSms(
  messages: Partial<Record<SmsLanguage, string>>,
  language: SmsLanguage,
): string | undefined {
  return messages[language] ?? messages[SMS_LANGUAGE_FALLBACK];
}