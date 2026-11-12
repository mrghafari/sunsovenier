import { z } from "zod";
import { defaultLandingLayout, landingLayoutSchema } from "./landing-layout";

export const pageLanguages = ["en", "fa", "ar", "tr"] as const;
export const localizedTextSchema = z.record(z.enum(pageLanguages), z.string().trim().max(12000));
export const landingTextGroups = {
  header: ["navAbout", "navProducts", "navProcess", "navFaq", "navShop", "navAccount", "language", "openMenu", "closeMenu"],
  hero: ["eyebrow", "heroTitle", "heroDesc", "viewProducts", "getQuote"],
  form: ["quoteTitle", "product", "fullName", "email", "phone", "address", "companyOptional", "messageLabel", "submit", "sending", "submitted", "failed", "formError", "ratingLabel"],
  about: ["trusted", "about", "aboutTitle", "aboutDesc", "explore", "aboutImageAlt", "aboutFactManufacturing", "aboutFactPackaging", "aboutFactSafety"],
  products: ["packaging", "packagingTitle", "packagingHint", "details", "shop", "noCategories", "retry", "browseProducts"],
  process: ["processEyebrow", "processTitle"],
  faq: ["faqEyebrow", "faqTitle"],
  footer: ["company", "services", "connect", "aboutLink", "tagline", "account", "copyright", "privacyLabel", "termsLabel", "managementLabel"],
  modal: ["modalClose", "modalDetail", "modalPackaging", "modalSpecs", "modalQuote", "modalPackagingHint"],
  seo: ["seoTitle", "seoDescription"],
} as const;
export const landingTextKeys = Object.values(landingTextGroups).flat() as [string, ...string[]];
export const safeLandingLink = z.string().trim().max(1000).refine(value => {
  if (!value || /[\s\\\u0000-\u001f]/u.test(value)) return false;
  if (/^\/(?!\/)/.test(value) || /^#[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) return true;
  if (/^tel:\+?[0-9()-]+$/.test(value) || /^mailto:[^@]+@[^@]+\.[^@]+$/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
}, "Use a local path, section anchor, HTTPS, email or telephone link.");
const idSchema = z.string().regex(/^[a-zA-Z0-9-]{1,80}$/);
const linkSchema = z.object({
  id: idSchema, href: safeLandingLink, textKey: z.string().max(80).optional(),
  labels: localizedTextSchema, isActive: z.boolean(),
}).strict();
export const landingSectionKeys = ["hero", "quote", "trusted", "about", "stats", "services", "categories", "process", "faq", "footer"] as const;
export const landingFormFieldKeys = ["productInterest", "company", "phone", "address", "message"] as const;
const fieldSchema = z.object({ visible: z.boolean(), required: z.boolean() }).strict();
const cardSchema = z.object({
  isActive: z.boolean(), order: z.number().int().min(0).max(1000),
  specs: z.record(z.enum(pageLanguages), z.array(z.string().trim().max(500)).max(30)),
  pack: z.array(z.enum(["drum220", "ibc1000", "tank1500", "bag25", "bigbag"])).min(1).max(5),
}).strict();
export const landingPageSettingsSchema = z.object({
  layout: landingLayoutSchema.default(defaultLandingLayout),
  texts: z.record(z.enum(pageLanguages), z.record(z.enum(landingTextKeys), z.string().trim().max(12000))),
  sections: z.object(Object.fromEntries(landingSectionKeys.map(key => [key, z.boolean()])) as Record<typeof landingSectionKeys[number], z.ZodBoolean>).strict(),
  brandPrimary: z.string().trim().min(1).max(60), brandAccent: z.string().trim().max(60),
  // "illustration" remains accepted for saved content; it now renders the photo window.
  aboutVisual: z.enum(["window", "illustration", "image"]).default("window"),
  phoneLabel: z.string().trim().max(100), phoneHref: safeLandingLink,
  slides: z.array(z.object({
    id: idSchema, isActive: z.boolean(),
    showText: z.boolean().optional(),
    eyebrow: localizedTextSchema, title: localizedTextSchema, description: localizedTextSchema,
  }).strict()).min(1).max(10),
  autoplay: z.boolean(), slideInterval: z.number().int().min(3000).max(60000),
  stats: z.record(z.enum(pageLanguages), z.array(z.object({ label: z.string().trim().max(180), value: z.string().trim().max(80) }).strict()).max(12)),
  process: z.record(z.enum(pageLanguages), z.array(z.object({ title: z.string().trim().max(180), description: z.string().trim().max(2000) }).strict()).max(12)),
  navigation: z.array(linkSchema).max(20),
  footerCompany: z.array(linkSchema).max(20), footerConnect: z.array(linkSchema).max(20),
  social: z.array(linkSchema).max(12),
  actions: z.object({ heroPrimary: safeLandingLink, heroSecondary: safeLandingLink, about: safeLandingLink, shop: safeLandingLink, privacy: safeLandingLink, terms: safeLandingLink }).strict(),
  partners: z.array(z.object({
    id: idSchema, icon: z.enum(["industry", "vial-circle-check", "shield-halved", "truck-fast"]),
    labels: localizedTextSchema, href: safeLandingLink.optional(), isActive: z.boolean(),
  }).strict()).max(20),
  rating: z.object({ enabled: z.boolean(), score: z.string().trim().max(20), stars: z.number().int().min(0).max(5), href: safeLandingLink.optional() }).strict(),
  form: z.object({
    fields: z.object(Object.fromEntries(landingFormFieldKeys.map(key => [key, fieldSchema])) as Record<typeof landingFormFieldKeys[number], typeof fieldSchema>).strict(),
  }).strict(),
  cards: z.record(idSchema, cardSchema),
  packages: z.record(z.enum(["drum220", "ibc1000", "tank1500", "bag25", "bigbag"]), z.object({ name: localizedTextSchema, description: localizedTextSchema, capacity: localizedTextSchema.optional() }).strict()),
}).strict().superRefine((page, context) => {
  for (const key of ["slides", "navigation", "footerCompany", "footerConnect", "social", "partners"] as const) {
    if (new Set(page[key].map(item => item.id)).size !== page[key].length) context.addIssue({ code: "custom", path: [key], message: "IDs must be unique." });
  }
  if (!page.slides.some(item => item.isActive)) context.addIssue({ code: "custom", path: ["slides"], message: "Keep at least one banner active." });
  for (const key of landingFormFieldKeys) {
    if (!page.form.fields[key].visible && page.form.fields[key].required) context.addIssue({ code: "custom", path: ["form", "fields", key], message: "A hidden field cannot be required." });
  }
});
export type LandingPageSettings = z.infer<typeof landingPageSettingsSchema>;
export type LandingLink = LandingPageSettings["navigation"][number];

export function logisticsNavigationLink(): LandingLink {
  return {
    id: "logistics", href: "/logistics", isActive: true,
    labels: { en: "Logistics", fa: "لجستیک", ar: "الخدمات اللوجستية", tr: "Lojistik" },
  };
}

/** Upgrade older saved header links without changing customer-account links elsewhere. */
export function landingHeaderNavigation(links: LandingLink[]): LandingLink[] {
  const hasLogistics = links.some(link => link.id === "logistics" || link.href === "/logistics");
  return links.flatMap(link => {
    if (link.id !== "account" && link.textKey !== "navAccount" && link.href !== "/customer/login") return [link];
    return hasLogistics ? [] : [{ ...logisticsNavigationLink(), isActive: link.isActive }];
  });
}
export function defaultLandingPageSettings(): LandingPageSettings {
  const link = (id: string, href: string, textKey: string): LandingLink => ({ id, href, textKey, labels: {}, isActive: true });
  return {
    layout: defaultLandingLayout(),
    texts: { en: {}, fa: {}, ar: {}, tr: {} },
    sections: { hero: true, quote: true, trusted: true, about: true, stats: true, services: true, categories: true, process: true, faq: true, footer: true },
    brandPrimary: "MOMTAZ", brandAccent: "CHEM", phoneLabel: "+964 (750) 000-0000", phoneHref: "tel:+9647500000000",
    aboutVisual: "window",
    slides: [0, 1, 2].map(index => ({ id: String(index), isActive: true, eyebrow: {}, title: {}, description: {} })),
    autoplay: true, slideInterval: 5000,
    stats: {
      en: [{label:"Projects Completed",value:"500+"},{label:"Years Of Excellence",value:"25+"},{label:"Satisfied Clients",value:"100%"}],
      fa: [{label:"پروژه انجام‌شده",value:"۵۰۰+"},{label:"سال تجربه",value:"۲۵+"},{label:"رضایت مشتریان",value:"۱۰۰٪"}],
      ar: [{label:"مشروع منجز",value:"500+"},{label:"سنوات من التميز",value:"25+"},{label:"عملاء راضون",value:"100%"}],
      tr: [{label:"Tamamlanan Proje",value:"500+"},{label:"Yıllık Deneyim",value:"25+"},{label:"Memnun Müşteri",value:"100%"}],
    },
    process: {
      en: [{title:"Inspection & Inquiry",description:"After you contact us, we analyze your chemical requirements."},{title:"Quality Testing",description:"Every batch undergoes lab testing to ensure purity compliance."},{title:"Secure Delivery",description:"We deliver directly to your industrial site with full documentation."}],
      fa: [{title:"بازبینی و درخواست",description:"پس از تماس شما، نیازهای شیمیایی‌تان را بررسی می‌کنیم."},{title:"آزمایش کیفیت",description:"هر بچ برای اطمینان از خلوص و انطباق، در آزمایشگاه بررسی می‌شود."},{title:"تحویل ایمن",description:"محصول را با مستندات کامل مستقیماً به محل صنعتی شما تحویل می‌دهیم."}],
      ar: [{title:"الفحص والاستفسار",description:"بعد تواصلكم معنا، نحلل متطلباتكم الكيميائية."},{title:"اختبار الجودة",description:"تخضع كل دفعة لاختبارات مخبرية دقيقة لضمان مطابقة النقاء."},{title:"تسليم آمن",description:"نوصل مباشرة إلى موقعكم الصناعي مع الوثائق الكاملة."}],
      tr: [{title:"İnceleme ve Talep",description:"Bizimle iletişime geçtikten sonra kimyasal gereksinimlerinizi analiz ederiz."},{title:"Kalite Testi",description:"Saflık uyumluluğunu doğrulamak için her parti titiz laboratuvar testlerinden geçer."},{title:"Güvenli Teslimat",description:"Tam belgelerle doğrudan endüstriyel tesisinize teslimat yaparız."}],
    },
    navigation: [link("about", "#about", "navAbout"), link("products", "#services", "navProducts"), link("process", "#process", "navProcess"), link("faq", "#faq", "navFaq"), { id: "blog", href: "/blog", labels: { en: "Blog", fa: "بلاگ", ar: "المدونة", tr: "Blog" }, isActive: true }, link("shop", "/shop", "navShop"), logisticsNavigationLink()],
    footerCompany: [link("about", "/about", "aboutLink"), link("services", "/services", "services"), link("contact", "/contact", "getQuote")],
    footerConnect: [link("account", "/customer/login", "account"), link("shop", "/shop", "shop"), link("contact", "/contact", "getQuote"), { ...link("management", "/site-management", "managementLabel") }],
    social: [],
    actions: { heroPrimary: "#services", heroSecondary: "#quote", about: "/about", shop: "/shop", privacy: "/privacy", terms: "/terms" },
    partners: (["industry", "vial-circle-check", "shield-halved", "truck-fast"] as const).map((icon, index) => ({ id: String(index), icon, labels: {}, isActive: true })),
    rating: { enabled: true, score: "5.0", stars: 5 },
    form: { fields: { productInterest: { visible: true, required: true }, company: { visible: true, required: false }, phone: { visible: true, required: true }, address: { visible: true, required: true }, message: { visible: false, required: false } } },
    cards: {}, packages: {},
  };
}
export function localizedSetting(values: Partial<Record<typeof pageLanguages[number], string>>, language: typeof pageLanguages[number], fallback = "") {
  return values[language] ?? values.en ?? Object.values(values)[0] ?? fallback;
}
