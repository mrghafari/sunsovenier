import { z } from "zod";

export const faqLanguages = ["en", "fa", "ar", "tr"] as const;
export type FaqLanguage = typeof faqLanguages[number];
export const faqMoreDetailsLabels = {
  en: "More details", fa: "جزئیات بیشتر", ar: "المزيد من التفاصيل", tr: "Daha fazla bilgi",
};
export function isSafeFaqLink(value: string): boolean {
  if (/[\s\\\u0000-\u001f]/u.test(value)) return false;
  if (/^\/(?!\/)/.test(value)) return true;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}
const translationSchema = z.object({
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(10000),
  moreInfoUrl: z.string().trim().max(2000).refine(value => !value || isSafeFaqLink(value), "Invalid details link.").optional(),
}).strict();
export const faqItemSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-]{1,100}$/),
  isActive: z.boolean(),
  translations: z.record(z.enum(faqLanguages), translationSchema)
    .refine(value => Object.keys(value).length > 0, "At least one complete translation is required."),
}).strict();
export const faqContentSchema = z.object({
  revision: z.number().int().min(0),
  items: z.array(faqItemSchema).max(100),
}).strict().superRefine((value, context) => {
  if (new Set(value.items.map(item => item.id)).size !== value.items.length) {
    context.addIssue({ code: "custom", path: ["items"], message: "Duplicate FAQ IDs." });
  }
});
export type FaqContent = z.infer<typeof faqContentSchema>;
export type FaqItem = z.infer<typeof faqItemSchema>;

// Preserve the original landing-page questions until an editor first saves.
export function defaultFaqContent(): FaqContent {
  return {
    revision: 0,
    items: [
      {
        id: "packaging", isActive: true, translations: {
          en: { question: "What packaging sizes are available?", answer: "We offer 220L steel drums, 1000L IBC tote containers, and 1500L stainless steel storage tanks." },
          fa: { question: "چه اندازه‌هایی برای بسته‌بندی موجود است؟", answer: "بشکه فولادی ۲۲۰ لیتری، مخزن IBC هزار لیتری و مخزن استیل ۱۵۰۰ لیتری ارائه می‌کنیم." },
          ar: { question: "ما أحجام التعبئة المتوفرة؟", answer: "نوفر براميل فولاذية 220 لتر، وحاويات IBC سعة 1000 لتر، وخزانات تخزين من الفولاذ المقاوم للصدأ سعة 1500 لتر." },
          tr: { question: "Hangi ambalaj boyutları mevcut?", answer: "220L çelik varil, 1000L IBC konteyner ve 1500L paslanmaz çelik depolama tankı sunuyoruz." },
        },
      },
      {
        id: "analysis", isActive: true, translations: {
          en: { question: "Do you provide Certificates of Analysis?", answer: "Yes, every chemical shipment includes a full Certificate of Analysis (CoA) and safety data sheets." },
          fa: { question: "آیا گواهی آنالیز ارائه می‌دهید؟", answer: "بله، هر محموله شیمیایی همراه با گواهی کامل آنالیز و برگه اطلاعات ایمنی ارسال می‌شود." },
          ar: { question: "هل توفرون شهادات التحليل؟", answer: "نعم، تتضمن كل شحنة كيميائية شهادة تحليل كاملة ونشرات بيانات السلامة." },
          tr: { question: "Analiz Sertifikası sağlıyor musunuz?", answer: "Evet, her kimyasal sevkiyatında tam Analiz Sertifikası ve güvenlik bilgi formları bulunur." },
        },
      },
    ],
  };
}

export function localizedFaqs(content: FaqContent, language: FaqLanguage) {
  return content.items.filter(item => item.isActive).flatMap(item => {
    const text = item.translations[language] || item.translations.en
      || faqLanguages.map(key => item.translations[key]).find(Boolean);
    return text ? [{ id: item.id, ...text }] : [];
  });
}
