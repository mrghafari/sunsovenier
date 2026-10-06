import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { shopSettings, simpleSmsTemplates } from "@shared/schema";
import { emailCategories, emailTemplates } from "@shared/email-schema";
import { createSmsService } from "./sms-service";
import { emailService } from "./email-service";

export const READY_NOTIFICATION_CATEGORY = "warehouse_ready_notifications";
export const DEFAULT_READY_SMS_TEXT: Record<string, string> = {
  en: "Your order {{order_number}} is ready and has moved to logistics.",
  fa: "سفارش {{order_number}} شما آماده و به بخش لجستیک منتقل شد.",
  ar: "طلبك {{order_number}} جاهز وتم نقله إلى الخدمات اللوجستية.",
  tr: "{{order_number}} numaralı siparişiniz hazırlandı ve lojistiğe aktarıldı.",
};
export const DEFAULT_READY_EMAIL_SUBJECT: Record<string, string> = {
  en: "Order ready for logistics",
  fa: "آماده شدن سفارش برای ارسال",
  ar: "الطلب جاهز للشحن",
  tr: "Siparişiniz lojistik için hazır",
};
export const DEFAULT_READY_EMAIL_TEXT: Record<string, string> = {
  en: "Your order {{order_number}} is ready and has moved to logistics.",
  fa: "سفارش {{order_number}} شما آماده و به بخش لجستیک منتقل شد.",
  ar: "طلبك {{order_number}} جاهز وتم نقله إلى الخدمات اللوجستية.",
  tr: "{{order_number}} numaralı siparişiniz hazırlandı ve lojistiğe aktarıldı.",
};
const KEYS = {
  emailEnabled: "warehouse_ready_email_enabled",
  smsEnabled: "warehouse_ready_sms_enabled",
  emailTemplateId: "warehouse_ready_email_template_id",
  smsTemplateId: "warehouse_ready_sms_template_id",
  emailTemplateIds: "warehouse_ready_email_template_ids_by_language",
  smsTemplateIds: "warehouse_ready_sms_template_ids_by_language",
  senderCategoryKey: "warehouse_ready_sender_category_key",
} as const;

const LANGUAGES = ["en", "fa", "ar", "tr"] as const;
type Language = typeof LANGUAGES[number];
type TemplateIds = Partial<Record<Language, number | null>>;

export type ReadyNotificationSettings = {
  emailEnabled: boolean; smsEnabled: boolean;
  emailTemplateId: number | null; smsTemplateId: number | null;
  emailTemplateIds: TemplateIds; smsTemplateIds: TemplateIds;
  senderCategoryKey: string;
};

export function readyTemplateIdForLanguage(
  settings: ReadyNotificationSettings, channel: "email" | "sms", language: Language,
): number | null {
  const ids = channel === "email" ? settings.emailTemplateIds : settings.smsTemplateIds;
  if (Object.prototype.hasOwnProperty.call(ids, language)) return ids[language] ?? null;
  return channel === "email" ? settings.emailTemplateId : settings.smsTemplateId;
}

export function readyTemplateMatchesLanguage(template: { language: string } | undefined, language: Language) {
  return template?.language === language;
}

function bool(value: string | undefined, fallback = false) {
  return value == null ? fallback : value === "true";
}
function id(value?: string) {
  const n = value == null || value === "" ? NaN : Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}
function parseTemplateIds(value?: string): TemplateIds {
  if (!value) return {};
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid language template settings");
  const entries = Object.entries(parsed);
  if (entries.some(([language, templateId]) =>
    !LANGUAGES.includes(language as Language) ||
    (templateId !== null && (!Number.isSafeInteger(templateId) || Number(templateId) <= 0))
  )) throw new Error("Invalid language template settings");
  return parsed as TemplateIds;
}

async function validateTemplateIds(
  ids: TemplateIds, channel: "email" | "sms",
) {
  const table = channel === "email" ? emailTemplates : simpleSmsTemplates;
  for (const [language, templateId] of Object.entries(ids)) {
    if (templateId == null) continue;
    const [template] = await db.select({ language: table.language }).from(table)
      .where(and(eq(table.id, templateId), eq(table.isActive, true))).limit(1);
    if (!template || template.language !== language) {
      throw new Error(`Selected ${channel} template does not match ${language}`);
    }
  }
}

export async function getReadyNotificationSettings(): Promise<ReadyNotificationSettings> {
  const rows = await db.select().from(shopSettings)
    .where(eq(shopSettings.category, READY_NOTIFICATION_CATEGORY));
  const values = Object.fromEntries(rows.map(row => [row.settingKey, row.settingValue]));
  return {
    emailEnabled: bool(values[KEYS.emailEnabled], true),
    smsEnabled: bool(values[KEYS.smsEnabled], true),
    emailTemplateId: id(values[KEYS.emailTemplateId]),
    smsTemplateId: id(values[KEYS.smsTemplateId]),
    emailTemplateIds: parseTemplateIds(values[KEYS.emailTemplateIds]),
    smsTemplateIds: parseTemplateIds(values[KEYS.smsTemplateIds]),
    senderCategoryKey: values[KEYS.senderCategoryKey] ?? "notifications",
  };
}

export async function updateReadyNotificationSettings(input: Partial<ReadyNotificationSettings>) {
  const current = await getReadyNotificationSettings();
  const next = { ...current, ...input };
  if (next.emailTemplateId != null) {
    const [t] = await db.select({ id: emailTemplates.id }).from(emailTemplates)
      .where(and(eq(emailTemplates.id, next.emailTemplateId), eq(emailTemplates.isActive, true))).limit(1);
    if (!t) throw new Error("Selected email template is not active or does not exist");
  }
  if (next.smsTemplateId != null) {
    const [t] = await db.select({ id: simpleSmsTemplates.id }).from(simpleSmsTemplates)
      .where(and(eq(simpleSmsTemplates.id, next.smsTemplateId), eq(simpleSmsTemplates.isActive, true))).limit(1);
    if (!t) throw new Error("Selected SMS template is not active or does not exist");
  }
  const emailTemplateIds = parseTemplateIds(JSON.stringify(next.emailTemplateIds));
  const smsTemplateIds = parseTemplateIds(JSON.stringify(next.smsTemplateIds));
  await validateTemplateIds(emailTemplateIds, "email");
  await validateTemplateIds(smsTemplateIds, "sms");
  const effectiveSenderCategoryKey = next.senderCategoryKey || "notifications";
  if (!/^[a-z0-9_-]+$/i.test(effectiveSenderCategoryKey)) throw new Error("Invalid sender category key");
  const [category] = await db.select({ key: emailCategories.categoryKey }).from(emailCategories)
    .where(and(eq(emailCategories.categoryKey, effectiveSenderCategoryKey), eq(emailCategories.isActive, true))).limit(1);
  if (!category) throw new Error("Sender category is not active or does not exist");
  const values: Record<string, string> = {
    [KEYS.emailEnabled]: String(next.emailEnabled),
    [KEYS.smsEnabled]: String(next.smsEnabled),
    [KEYS.emailTemplateId]: next.emailTemplateId == null ? "" : String(next.emailTemplateId),
    [KEYS.smsTemplateId]: next.smsTemplateId == null ? "" : String(next.smsTemplateId),
    [KEYS.emailTemplateIds]: JSON.stringify(emailTemplateIds),
    [KEYS.smsTemplateIds]: JSON.stringify(smsTemplateIds),
    [KEYS.senderCategoryKey]: next.senderCategoryKey,
  };
  for (const [settingKey, settingValue] of Object.entries(values)) {
    const [existing] = await db.select({ id: shopSettings.id }).from(shopSettings)
      .where(eq(shopSettings.settingKey, settingKey)).limit(1);
    if (existing) await db.update(shopSettings).set({ settingValue, updatedAt: new Date() }).where(eq(shopSettings.id, existing.id));
    else await db.insert(shopSettings).values({
      settingKey, settingValue, settingType: settingKey.includes("enabled") ? "boolean" : "text",
      displayName: `Warehouse ready notification: ${settingKey}`, category: READY_NOTIFICATION_CATEGORY,
      isPublic: false,
    });
  }
  return next;
}

export async function getReadyNotificationOptions() {
  const [sms, email, categories] = await Promise.all([
    db.select({ id: simpleSmsTemplates.id, name: simpleSmsTemplates.templateName, language: simpleSmsTemplates.language, content: simpleSmsTemplates.templateContent })
      .from(simpleSmsTemplates).where(eq(simpleSmsTemplates.isActive, true)),
    db.select({ id: emailTemplates.id, name: emailTemplates.name, language: emailTemplates.language, subject: emailTemplates.subject, textContent: emailTemplates.textContent, htmlContent: emailTemplates.htmlContent })
      .from(emailTemplates).where(eq(emailTemplates.isActive, true)),
    db.select({ categoryKey: emailCategories.categoryKey, name: emailCategories.categoryName })
      .from(emailCategories).where(eq(emailCategories.isActive, true)),
  ]);
  const [senderCategories, defaultSender] = await Promise.all([
    Promise.all(categories.map(async category => ({
      ...category,
      sender: await emailService.getSenderDetails(category.categoryKey),
    }))),
    emailService.getSenderDetails("notifications"),
  ]);
  return {
    smsTemplates: sms,
    emailTemplates: email.map(({ htmlContent, textContent, ...template }) => ({
      ...template,
      content: textContent || htmlContent.replace(/<[^>]+>/g, ""),
    })),
    emailCategories: senderCategories,
    defaultSender,
    defaultSmsTexts: DEFAULT_READY_SMS_TEXT,
    defaultEmailSubjects: DEFAULT_READY_EMAIL_SUBJECT,
    defaultEmailTexts: DEFAULT_READY_EMAIL_TEXT,
  };
}

export async function updateReadySmsTemplate(id: number, content: string, expectedContent: string) {
  const text = content.trim();
  const variables = [...new Set(Array.from(text.matchAll(/\{\{([^{}]+)\}\}/g), match => match[1].trim()).filter(Boolean))];
  const [updated] = await db.update(simpleSmsTemplates)
    .set({ templateContent: text, variables, updatedAt: new Date() })
    .where(and(
      eq(simpleSmsTemplates.id, id),
      eq(simpleSmsTemplates.isActive, true),
      eq(simpleSmsTemplates.templateContent, expectedContent),
    ))
    .returning({
      id: simpleSmsTemplates.id,
      name: simpleSmsTemplates.templateName,
      language: simpleSmsTemplates.language,
      content: simpleSmsTemplates.templateContent,
    });
  return updated ?? null;
}

export async function dispatchWarehouseReadyNotification(order: {
  orderNumber?: string; customerName: string; customerPhone?: string | null;
  recipientPhone?: string | null; customerEmail?: string | null; language?: string;
}) {
  const settings = await getReadyNotificationSettings();
  const language: Language = LANGUAGES.includes(order.language as Language) ? order.language as Language : "en";
  const vars: Record<string, string> = {
    customer_name: order.customerName, order_number: order.orderNumber || "",
  };
  const results: { channel: string; success: boolean; error?: string }[] = [];
  if (settings.smsEnabled && (order.recipientPhone || order.customerPhone)) {
    try {
      const phone = order.recipientPhone || order.customerPhone!;
      let message = DEFAULT_READY_SMS_TEXT[language];
      const templateId = readyTemplateIdForLanguage(settings, "sms", language);
      if (templateId) {
        const [template] = await db.select().from(simpleSmsTemplates).where(and(eq(simpleSmsTemplates.id, templateId), eq(simpleSmsTemplates.isActive, true))).limit(1);
        if (readyTemplateMatchesLanguage(template, language)) message = template.templateContent;
      }
      for (const [key, value] of Object.entries(vars)) message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
      const result = await (await createSmsService()).sendSms({ to: phone, message });
      results.push({ channel: "sms", success: result.success, error: result.error });
    } catch (error) {
      results.push({ channel: "sms", success: false, error: error instanceof Error ? error.message : "SMS provider failed" });
    }
  } else if (settings.smsEnabled) {
    results.push({ channel: "sms", success: false, error: "No recipient phone number available" });
  }
  if (settings.emailEnabled && order.customerEmail) {
    try {
      let result: boolean;
      const templateId = readyTemplateIdForLanguage(settings, "email", language);
      if (templateId) {
        const [template] = await db.select().from(emailTemplates).where(and(eq(emailTemplates.id, templateId), eq(emailTemplates.isActive, true))).limit(1);
        if (readyTemplateMatchesLanguage(template, language)) {
          result = await emailService.sendEmail({ to: order.customerEmail, subject: replace(template.subject, vars), text: replace(template.textContent || template.htmlContent.replace(/<[^>]+>/g, ""), vars), html: replace(template.htmlContent, vars, true) }, settings.senderCategoryKey || "notifications");
        } else {
          // A selected template in another language must not be sent to this customer.
          const subject = DEFAULT_READY_EMAIL_SUBJECT[language] || DEFAULT_READY_EMAIL_SUBJECT.en;
          const text = replace(DEFAULT_READY_EMAIL_TEXT[language], vars);
          result = await emailService.sendEmail({ to: order.customerEmail, subject, text, html: `<p>${escapeHtml(text)}</p>` }, settings.senderCategoryKey || "notifications");
        }
      } else {
        const subject = DEFAULT_READY_EMAIL_SUBJECT[language] || DEFAULT_READY_EMAIL_SUBJECT.en;
        const text = replace(DEFAULT_READY_EMAIL_TEXT[language], vars);
        result = await emailService.sendEmail({ to: order.customerEmail, subject, text, html: `<p>${escapeHtml(text)}</p>` }, settings.senderCategoryKey || "notifications");
      }
      results.push({ channel: "email", success: result, error: result ? undefined : "Email provider failed" });
    } catch (error) {
      results.push({ channel: "email", success: false, error: error instanceof Error ? error.message : "Email provider failed" });
    }
  } else if (settings.emailEnabled) {
    results.push({ channel: "email", success: false, error: "No purchaser email available" });
  }
  return results;
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
function replace(content: string, vars: Record<string, string>, html = false) {
  return Object.entries(vars).reduce((text, [key, value]) => text.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), () => html ? escapeHtml(value) : value), content);
}