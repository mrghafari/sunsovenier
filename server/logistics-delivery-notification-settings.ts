import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { shopSettings, simpleSmsTemplates } from "@shared/schema";
import { emailTemplates } from "@shared/email-schema";

const CATEGORY = "logistics_notifications";
const SMS_KEY = "logistics_delivery_sms_template_ids";
const EMAIL_KEY = "logistics_delivery_email_template_ids";
const LANGUAGES = ["en", "fa", "ar", "tr"] as const;
type Language = typeof LANGUAGES[number];
type TemplateIdMap = Record<Language, number | null>;
const TEMPLATE_VARIABLES = new Set(["customer_name", "order_number", "delivery_code"]);

export class LogisticsDeliveryNotificationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LogisticsDeliveryNotificationValidationError";
  }
}

export type LogisticsDeliveryNotificationSettings = {
  smsTemplateIds: TemplateIdMap;
  emailTemplateIds: TemplateIdMap;
};

export const DEFAULT_DELIVERY_SMS_TEXTS: Record<Language, string> = {
  en: "{{customer_name}}, your delivery code for order {{order_number}} is {{delivery_code}}. Please provide this code to the driver upon delivery.",
  fa: "{{customer_name}}، کد تحویل سفارش {{order_number}}: {{delivery_code}}. لطفاً این کد را هنگام تحویل به راننده ارائه دهید.",
  ar: "{{customer_name}}، رمز تسليم الطلب {{order_number}} هو {{delivery_code}}. يرجى تقديم الرمز للسائق عند التسليم.",
  tr: "{{customer_name}}, {{order_number}} numaralı siparişinizin teslimat kodu: {{delivery_code}}. Lütfen teslimat sırasında bu kodu sürücüye verin.",
};

const emptyTemplateIds = (): TemplateIdMap => ({ en: null, fa: null, ar: null, tr: null });

export function renderDeliveryTemplate(
  content: string,
  variables: Record<"customer_name" | "order_number" | "delivery_code", string>,
  html = false,
): string {
  return content.replace(/\{\{\s*(customer_name|order_number|delivery_code)\s*\}\}/g, (_match, key: keyof typeof variables) => {
    const value = variables[key] ?? "";
    return html ? value.replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]!) : value;
  });
}

export function parseTemplateIds(value?: string): TemplateIdMap {
  if (value === undefined) return emptyTemplateIds();
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new LogisticsDeliveryNotificationValidationError("Invalid logistics delivery template settings");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new LogisticsDeliveryNotificationValidationError("Invalid logistics delivery template settings");
  }
  const result = emptyTemplateIds();
  for (const [language, templateId] of Object.entries(parsed)) {
    if (!LANGUAGES.includes(language as Language) ||
      (templateId !== null && (!Number.isSafeInteger(templateId) || Number(templateId) <= 0))) {
      throw new LogisticsDeliveryNotificationValidationError("Invalid logistics delivery template settings");
    }
    result[language as Language] = templateId as number | null;
  }
  return result;
}

export function validateTemplateIdMap(value: unknown, name: string): TemplateIdMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new LogisticsDeliveryNotificationValidationError(`${name} must be a language-to-template-id map`);
  }
  const result = emptyTemplateIds();
  for (const [language, templateId] of Object.entries(value)) {
    if (!LANGUAGES.includes(language as Language)) {
      throw new LogisticsDeliveryNotificationValidationError(`Unsupported ${name} language: ${language}`);
    }
    if (templateId !== null && (!Number.isSafeInteger(templateId) || Number(templateId) <= 0)) {
      throw new LogisticsDeliveryNotificationValidationError(`Invalid ${name} template id for ${language}`);
    }
    result[language as Language] = templateId as number | null;
  }
  return result;
}

export function validateTemplatePlaceholders(content: string, channel: "sms" | "email", language: Language) {
  const placeholders = [...content.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)]
    .map(match => match[1].trim());
  const unsupported = placeholders.find(placeholder => !TEMPLATE_VARIABLES.has(placeholder));
  if (unsupported) {
    throw new LogisticsDeliveryNotificationValidationError(
      `Selected ${channel} template for ${language} uses unsupported placeholder {{${unsupported}}}`,
    );
  }
  return placeholders;
}

export function validateTemplateBody(content: string, channel: "sms" | "email", language: Language) {
  const placeholders = validateTemplatePlaceholders(content, channel, language);
  if (!placeholders.includes("delivery_code")) {
    throw new LogisticsDeliveryNotificationValidationError(
      `Selected ${channel} template for ${language} body must include {{delivery_code}}`,
    );
  }
}

export function validateEmailTemplateBodies(
  htmlContent: string,
  textContent: string | null | undefined,
  language: Language,
) {
  const htmlBody = htmlContent || "";
  const textBody = textContent || "";
  const htmlDerivedText = htmlBody
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]*>/g, "");
  if (!htmlBody && !textBody) {
    throw new LogisticsDeliveryNotificationValidationError(
      `Selected email template for ${language} has no message body`,
    );
  }
  if (htmlBody) validateTemplateBody(htmlBody, "email", language);
  if (textBody) {
    validateTemplateBody(textBody, "email", language);
  } else {
    validateTemplateBody(htmlDerivedText, "email", language);
  }
}

async function validateTemplateIds(ids: TemplateIdMap, channel: "sms" | "email") {
  for (const language of LANGUAGES) {
    const templateId = ids[language];
    if (templateId == null) continue;
    if (channel === "sms") {
      const [template] = await db.select({
        id: simpleSmsTemplates.id,
        language: simpleSmsTemplates.language,
        content: simpleSmsTemplates.templateContent,
      }).from(simpleSmsTemplates).where(and(
        eq(simpleSmsTemplates.id, templateId),
        eq(simpleSmsTemplates.isActive, true),
      )).limit(1);
      if (!template || template.language !== language) {
        throw new LogisticsDeliveryNotificationValidationError(
          `Selected SMS template for ${language} is inactive, missing, or has the wrong language`,
        );
      }
      validateTemplateBody(template.content, "sms", language);
    } else {
      const [template] = await db.select({
        id: emailTemplates.id,
        language: emailTemplates.language,
        subject: emailTemplates.subject,
        htmlContent: emailTemplates.htmlContent,
        textContent: emailTemplates.textContent,
      }).from(emailTemplates).where(and(
        eq(emailTemplates.id, templateId),
        eq(emailTemplates.isActive, true),
      )).limit(1);
      if (!template || template.language !== language) {
        throw new LogisticsDeliveryNotificationValidationError(
          `Selected email template for ${language} is inactive, missing, or has the wrong language`,
        );
      }
      validateTemplatePlaceholders(template.subject, "email", language);
      validateEmailTemplateBodies(template.htmlContent, template.textContent, language);
    }
  }
}

export async function readSettings(): Promise<LogisticsDeliveryNotificationSettings> {
  const rows = await db.select({
    settingKey: shopSettings.settingKey,
    settingValue: shopSettings.settingValue,
  }).from(shopSettings).where(eq(shopSettings.category, CATEGORY));
  const values = Object.fromEntries(rows.map(row => [row.settingKey, row.settingValue]));
  return {
    smsTemplateIds: parseTemplateIds(values[SMS_KEY]),
    emailTemplateIds: parseTemplateIds(values[EMAIL_KEY]),
  };
}

export async function updateSettings(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new LogisticsDeliveryNotificationValidationError("Request body must be a non-empty object");
  }
  const entries = Object.entries(input);
  if (!entries.length) throw new LogisticsDeliveryNotificationValidationError("Request body must not be empty");
  const unknownKey = entries.find(([key]) => key !== "smsTemplateIds" && key !== "emailTemplateIds");
  if (unknownKey) throw new LogisticsDeliveryNotificationValidationError(`Unknown setting: ${unknownKey[0]}`);
  if (entries.some(([, value]) => value === undefined)) {
    throw new LogisticsDeliveryNotificationValidationError("Template maps must not be undefined");
  }
  const body = input as Partial<LogisticsDeliveryNotificationSettings>;
  const current = await readSettings();
  const next = {
    smsTemplateIds: !Object.prototype.hasOwnProperty.call(body, "smsTemplateIds")
      ? current.smsTemplateIds : validateTemplateIdMap(body.smsTemplateIds, "smsTemplateIds"),
    emailTemplateIds: !Object.prototype.hasOwnProperty.call(body, "emailTemplateIds")
      ? current.emailTemplateIds : validateTemplateIdMap(body.emailTemplateIds, "emailTemplateIds"),
  };
  await validateTemplateIds(next.smsTemplateIds, "sms");
  await validateTemplateIds(next.emailTemplateIds, "email");

  await db.transaction(async tx => {
    for (const [settingKey, settingValue] of [
      [SMS_KEY, JSON.stringify(next.smsTemplateIds)],
      [EMAIL_KEY, JSON.stringify(next.emailTemplateIds)],
    ]) {
      await tx.insert(shopSettings).values({
        settingKey,
        settingValue,
        settingType: "text",
        displayName: `Logistics delivery ${settingKey === SMS_KEY ? "SMS" : "email"} templates`,
        category: CATEGORY,
        isPublic: false,
      }).onConflictDoUpdate({
        target: shopSettings.settingKey,
        set: { settingValue, updatedAt: new Date() },
      });
    }
  });
  return next;
}

export async function getOptions() {
  const [smsTemplates, allEmailTemplates, defaultEmailTemplates] = await Promise.all([
    db.select({
      id: simpleSmsTemplates.id,
      name: simpleSmsTemplates.templateName,
      language: simpleSmsTemplates.language,
      content: simpleSmsTemplates.templateContent,
    }).from(simpleSmsTemplates).where(eq(simpleSmsTemplates.isActive, true)),
    db.select({
      id: emailTemplates.id,
      name: emailTemplates.name,
      language: emailTemplates.language,
      subject: emailTemplates.subject,
      htmlContent: emailTemplates.htmlContent,
      textContent: emailTemplates.textContent,
    }).from(emailTemplates).where(eq(emailTemplates.isActive, true)),
    (async () => {
      const { emailService } = await import("./email-service");
      return await Promise.all(LANGUAGES.map(async language => ({
        language,
        template: await emailService.getEmailTemplateByNumber("#20", language),
      })));
    })(),
  ]);
  const defaultEmailSubjects = Object.fromEntries(
    defaultEmailTemplates.map(({ language, template }) => [language, template?.subject ?? null]),
  ) as Record<Language, string | null>;
  const defaultEmailTexts = Object.fromEntries(
    defaultEmailTemplates.map(({ language, template }) => [
      language,
      template
        ? (template.textContent?.trim()
          ? template.textContent
          : template.htmlContent.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]*>/g, ""))
        : null,
    ]),
  ) as Record<Language, string | null>;
  return {
    smsTemplates: smsTemplates.filter(template => LANGUAGES.includes(template.language as Language)),
    emailTemplates: allEmailTemplates
      .filter(template => LANGUAGES.includes(template.language as Language))
      .map(({ htmlContent, textContent, ...template }) => ({
        ...template,
        content: textContent || htmlContent.replace(/<[^>]*>/g, ""),
      })),
    defaultSmsTexts: DEFAULT_DELIVERY_SMS_TEXTS,
    defaultEmailSubjects,
    defaultEmailTexts,
  };
}