import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ShoppingCart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import CompanyBrandLogo from "@/components/company-brand-logo";
import { resolveLandingPhone } from "@shared/landing-phone";
import { apiRequest } from "@/lib/queryClient";
import type { LandingContent } from "@shared/landing-content";
import { defaultLandingPageSettings, landingHeaderNavigation, localizedSetting, type LandingLink } from "@shared/landing-page-settings";
import { effectiveLayoutSections } from "@shared/landing-layout";
import LandingLayoutRenderer, { LayoutElements } from "./landing/LandingLayoutRenderer";
import { useLandingMotion } from "./landing/useLandingMotion";
import { useSlideCaptionTransition } from "./landing/useSlideCaptionTransition";
import AboutPhotoWindow from "./landing/AboutPhotoWindow";
import { aboutContent } from "./landing/about-content";
import { categoryCardHeading, categoryCardOrder } from "./landing/category-card-headings";
import { currentPublicProductLink } from "@shared/retired-product-paths";
import OpenGraphTags from "@/components/seo/OpenGraphTags";
import CanonicalUrl from "@/components/seo/CanonicalUrl";
import type { ShopCategory, ShopProduct } from "@shared/shop-schema";
import assets from "./landing/landing-assets.json";
import { BASE_PRODUCTS, LIQUID_PACKAGES, LOCALIZED_PRODUCTS, PACKAGES, PRODUCT_DETAILS_UI } from "./landing/catalog";
import "./landing/landing.css";
import "./landing/landing-layout.css";

type LandingAsset = { url: string; width?: number; height?: number };
const landingAssets = (assets as { images: LandingAsset[] }).images;
const assetUrl = (index: number) => landingAssets[index]?.url ?? "";
const LANGUAGES: Record<string, string> = { en: "English", fa: "فارسی", ar: "العربية", tr: "Türkçe" };

const translations = {
  en: {
    navAbout: "About", navProducts: "Products", navProcess: "Process", navFaq: "FAQ", navShop: "Shop", navAccount: "Customer account", language: "Language",
    eyebrow: "Momtaz Chem Industrial", heroTitle: "Industrial Chemical Solutions & High-Grade Solvents",
    heroDesc: "Advanced chemical solutions for fuel additives, water treatment, paint & thinner products and agricultural fertilizers, with 25+ years of excellence.",
    viewProducts: "VIEW PRODUCTS", getQuote: "GET A QUOTE", quoteTitle: "Get A Free Estimate", product: "Choose product / packaging *", fullName: "Full name *", email: "Email *", phone: "Phone *", address: "Delivery address *", companyOptional: "Company (optional)", submit: "REQUEST ESTIMATE",
    sending: "SENDING…", submitted: "Thank you! Your request was received. We will contact you shortly.", failed: "We couldn’t send your request. Please try again or contact us directly.",
    trusted: "TRUSTED BY", about: "About Us", aboutTitle: "High-Quality Chemical Services & Packaging",
    aboutDesc: "Momtaz Chem provides top-tier chemical manufacturing and standard packaging solutions with an unwavering commitment to quality and safety compliance.",
    explore: "About Us", stats: ["Projects Completed", "Years Of Excellence", "Satisfied Clients"], statsValues: ["500+", "25+", "100%"],
    packaging: "Products & Packaging", packagingTitle: "Full-Scale Chemical Packaging", packagingHint: "Select any item to see its full description and the packaging types available.",
    processEyebrow: "Our Process", processTitle: "From inquiry to delivery",
    process: [["Inspection & Inquiry", "After you contact us, we analyze your chemical requirements."], ["Quality Testing", "Every batch undergoes lab testing to ensure purity compliance."], ["Secure Delivery", "We deliver directly to your industrial site with full documentation."]],
    faqEyebrow: "Support", faqTitle: "Frequently Asked Questions",
    faqs: [["What packaging sizes are available?", "We offer 220L steel drums, 1000L IBC tote containers, and 1500L stainless steel storage tanks."], ["Do you provide Certificates of Analysis?", "Yes, every chemical shipment includes a full Certificate of Analysis (CoA) and safety data sheets."]],
    details: "VIEW DETAILS", company: "Company", services: "Products", connect: "Connect", aboutLink: "About Us", tagline: "High-grade chemical solutions and bulk solvent distribution.",
    account: "Customer account", shop: "Online shop", noCategories: "Product categories are temporarily unavailable.", retry: "Retry", browseProducts: "Browse products",
    formError: "Please complete the required fields and enter a valid email address.", localTitle: "LOCAL SITE PREVIEW", localStatus: "Edits persist in this browser only. They are not published or shared with other visitors.", openEditor: "Open editor", closeEditor: "Close editor",
    imageEdit: "Change image", heroImages: "Hero images", aboutImage: "About image", cardImages: "Product images", textEdit: "Product text", customTitle: "Add product card", title: "Title", short: "Card description", long: "Full product description", packages: "Packaging options", add: "Add card", remove: "Remove", reset: "Reset all local changes", saved: "Local changes saved in this browser.", saveError: "Browser storage failed. Changes have not been saved.", previewCard: "LOCAL PREVIEW",
  },
  fa: {
    navAbout: "درباره ما", navProducts: "محصولات", navProcess: "مراحل کار", navFaq: "پرسش‌ها", navShop: "فروشگاه", navAccount: "حساب مشتری", language: "زبان",
    eyebrow: "صنایع ممتاز شیمی", heroTitle: "راهکارهای صنعتی مواد شیمیایی و حلال‌های باکیفیت",
    heroDesc: "راهکارهای پیشرفته شیمیایی برای افزودنی‌های سوخت، تصفیه آب، رنگ و تینر و کودهای کشاورزی، با بیش از ۲۵ سال تجربه.",
    viewProducts: "مشاهده محصولات", getQuote: "دریافت قیمت", quoteTitle: "دریافت برآورد رایگان", product: "انتخاب محصول / بسته‌بندی *", fullName: "نام کامل *", email: "ایمیل *", phone: "تلفن *", address: "نشانی تحویل *", companyOptional: "شرکت (اختیاری)", submit: "درخواست برآورد",
    sending: "در حال ارسال…", submitted: "سپاسگزاریم! درخواست شما دریافت شد و به‌زودی با شما تماس می‌گیریم.", failed: "ارسال درخواست انجام نشد. دوباره تلاش کنید یا مستقیماً تماس بگیرید.",
    trusted: "مورد اعتماد", about: "درباره ما", aboutTitle: "خدمات و بسته‌بندی باکیفیت مواد شیمیایی",
    aboutDesc: "ممتاز شیمی تولید مواد شیمیایی ممتاز و راهکارهای بسته‌بندی استاندارد را با تعهدی پایدار به کیفیت و رعایت ایمنی ارائه می‌کند.",
    explore: "درباره ما", stats: ["پروژه انجام‌شده", "سال تجربه", "رضایت مشتریان"], statsValues: ["۵۰۰+", "۲۵+", "۱۰۰٪"],
    packaging: "محصولات و بسته‌بندی", packagingTitle: "بسته‌بندی کامل مواد شیمیایی", packagingHint: "برای مشاهده توضیحات کامل و انواع بسته‌بندی، یک مورد را انتخاب کنید.",
    processEyebrow: "فرایند ما", processTitle: "از درخواست تا تحویل",
    process: [["بازبینی و درخواست", "پس از تماس شما، نیازهای شیمیایی‌تان را بررسی می‌کنیم."], ["آزمایش کیفیت", "هر بچ برای اطمینان از خلوص و انطباق، در آزمایشگاه بررسی می‌شود."], ["تحویل ایمن", "محصول را با مستندات کامل مستقیماً به محل صنعتی شما تحویل می‌دهیم."]],
    faqEyebrow: "پشتیبانی", faqTitle: "پرسش‌های متداول", faqs: [["چه اندازه‌هایی برای بسته‌بندی موجود است؟", "بشکه فولادی ۲۲۰ لیتری، مخزن IBC هزار لیتری و مخزن استیل ۱۵۰۰ لیتری ارائه می‌کنیم."], ["آیا گواهی آنالیز ارائه می‌دهید؟", "بله، هر محموله شیمیایی همراه با گواهی کامل آنالیز و برگه اطلاعات ایمنی ارسال می‌شود."]],
    details: "مشاهده جزئیات", company: "شرکت", services: "محصولات", connect: "ارتباط", aboutLink: "درباره ما", tagline: "راهکارهای شیمیایی ممتاز و توزیع عمده حلال.", account: "حساب مشتری", shop: "فروشگاه آنلاین", noCategories: "دسته‌بندی محصولات موقتاً در دسترس نیست.", retry: "تلاش دوباره", browseProducts: "مشاهده محصولات",
    formError: "لطفاً فیلدهای ضروری را تکمیل و ایمیل معتبر وارد کنید.", localTitle: "پیش‌نمایش محلی سایت", localStatus: "تغییرات فقط در همین مرورگر ذخیره می‌شوند؛ منتشر یا با دیگران به اشتراک گذاشته نمی‌شوند.", openEditor: "بازکردن ویرایشگر", closeEditor: "بستن ویرایشگر",
    imageEdit: "تغییر تصویر", heroImages: "تصاویر اصلی", aboutImage: "تصویر درباره ما", cardImages: "تصاویر محصولات", textEdit: "متن محصول", customTitle: "افزودن کارت محصول", title: "عنوان", short: "توضیح کارت", long: "توضیحات کامل محصول", packages: "گزینه‌های بسته‌بندی", add: "افزودن کارت", remove: "حذف", reset: "بازنشانی همه تغییرات محلی", saved: "تغییرات در همین مرورگر ذخیره شد.", saveError: "ذخیره‌سازی مرورگر ناموفق بود؛ تغییرات ذخیره نشده‌اند.", previewCard: "پیش‌نمایش محلی",
  },
  ar: {
    navAbout: "من نحن", navProducts: "المنتجات", navProcess: "آلية العمل", navFaq: "الأسئلة", navShop: "المتجر", navAccount: "حساب العميل", language: "اللغة",
    eyebrow: "ممتاز كيم للصناعة", heroTitle: "حلول كيميائية صناعية ومذيبات عالية الجودة",
    heroDesc: "حلول كيميائية متقدمة لمضافات الوقود ومعالجة المياه والدهانات والمذيبات والأسمدة الزراعية، بخبرة تزيد على 25 عاماً.",
    viewProducts: "عرض المنتجات", getQuote: "اطلب عرض سعر", quoteTitle: "احصل على تقدير مجاني", product: "اختر المنتج / التعبئة *", fullName: "الاسم الكامل *", email: "البريد الإلكتروني *", phone: "الهاتف *", address: "عنوان التسليم *", companyOptional: "الشركة (اختياري)", submit: "اطلب تقديراً",
    sending: "جارٍ الإرسال…", submitted: "شكراً لك! تم استلام طلبك وسنتواصل معك قريباً.", failed: "تعذر إرسال الطلب. حاول مجدداً أو تواصل معنا مباشرة.",
    trusted: "موثوقون لدى", about: "من نحن", aboutTitle: "خدمات وتعبئة كيميائية عالية الجودة",
    aboutDesc: "تقدم ممتاز كيم تصنيعاً كيميائياً متميزاً وحلول تعبئة قياسية مع التزام راسخ بالجودة والامتثال للسلامة.",
    explore: "من نحن", stats: ["مشروع منجز", "سنوات من التميز", "عملاء راضون"], statsValues: ["500+", "25+", "100%"],
    packaging: "المنتجات والتعبئة", packagingTitle: "تعبئة كيميائية متكاملة", packagingHint: "اختر أي منتج للاطلاع على وصفه الكامل وأنواع التعبئة المتاحة.",
    processEyebrow: "آلية العمل", processTitle: "من الاستفسار إلى التسليم",
    process: [["الفحص والاستفسار", "بعد تواصلكم معنا، نحلل متطلباتكم الكيميائية."], ["اختبار الجودة", "تخضع كل دفعة لاختبارات مخبرية دقيقة لضمان مطابقة النقاء."], ["تسليم آمن", "نوصل مباشرة إلى موقعكم الصناعي مع الوثائق الكاملة."]],
    faqEyebrow: "الدعم", faqTitle: "الأسئلة الشائعة", faqs: [["ما أحجام التعبئة المتوفرة؟", "نوفر براميل فولاذية 220 لتر، وحاويات IBC سعة 1000 لتر، وخزانات تخزين من الفولاذ المقاوم للصدأ سعة 1500 لتر."], ["هل توفرون شهادات التحليل؟", "نعم، تتضمن كل شحنة كيميائية شهادة تحليل كاملة ونشرات بيانات السلامة."]],
    details: "عرض التفاصيل", company: "الشركة", services: "المنتجات", connect: "تواصل", aboutLink: "من نحن", tagline: "حلول كيميائية عالية الجودة وتوزيع المذيبات بالجملة.", account: "حساب العميل", shop: "المتجر الإلكتروني", noCategories: "فئات المنتجات غير متاحة مؤقتاً.", retry: "إعادة المحاولة", browseProducts: "تصفح المنتجات",
    formError: "يرجى إكمال الحقول المطلوبة وإدخال بريد إلكتروني صالح.", localTitle: "معاينة محلية للموقع", localStatus: "تُحفظ التعديلات في هذا المتصفح فقط. لا يتم نشرها أو مشاركتها مع الزوار.", openEditor: "فتح المحرر", closeEditor: "إغلاق المحرر",
    imageEdit: "تغيير الصورة", heroImages: "صور الواجهة", aboutImage: "صورة من نحن", cardImages: "صور المنتجات", textEdit: "نص المنتج", customTitle: "إضافة بطاقة منتج", title: "العنوان", short: "وصف البطاقة", long: "الوصف الكامل للمنتج", packages: "خيارات التعبئة", add: "إضافة البطاقة", remove: "حذف", reset: "إعادة ضبط التغييرات المحلية", saved: "تم حفظ التغييرات في هذا المتصفح.", saveError: "تعذر الحفظ في المتصفح؛ لم تُحفظ التغييرات.", previewCard: "معاينة محلية",
  },
  tr: {
    navAbout: "Hakkımızda", navProducts: "Ürünler", navProcess: "Süreç", navFaq: "SSS", navShop: "Mağaza", navAccount: "Müşteri hesabı", language: "Dil",
    eyebrow: "Momtaz Chem Endüstri", heroTitle: "Endüstriyel Kimyasal Çözümler ve Yüksek Kaliteli Solventler",
    heroDesc: "Yakıt katkıları, su arıtma, boya ve tiner ürünleri ile tarımsal gübreler için 25 yılı aşkın deneyimle gelişmiş kimyasal çözümler.",
    viewProducts: "ÜRÜNLERİ GÖR", getQuote: "TEKLİF AL", quoteTitle: "Ücretsiz Teklif Alın", product: "Ürün / ambalaj seçin *", fullName: "Ad Soyad *", email: "E-posta *", phone: "Telefon *", address: "Teslimat adresi *", companyOptional: "Şirket (isteğe bağlı)", submit: "TAHMİN İSTE",
    sending: "GÖNDERİLİYOR…", submitted: "Teşekkürler! Talebiniz alındı. Ekibimiz kısa süre içinde sizinle iletişime geçecek.", failed: "Talebiniz gönderilemedi. Yeniden deneyin veya doğrudan bize ulaşın.",
    trusted: "GÜVENİLİR", about: "HAKKIMIZDA", aboutTitle: "Yüksek Kaliteli Kimyasal Hizmetler ve Ambalaj",
    aboutDesc: "Momtaz Chem, kalite ve güvenlik standartlarına sarsılmaz bağlılıkla üst düzey kimyasal üretim ve standart ambalaj çözümleri sunar.",
    explore: "Hakkımızda", stats: ["Tamamlanan Proje", "Yıllık Deneyim", "Memnun Müşteri"], statsValues: ["500+", "25+", "100%"],
    packaging: "Ürünler ve Ambalaj", packagingTitle: "Kapsamlı Kimyasal Ambalaj", packagingHint: "Tam açıklama ve mevcut ambalaj türleri için bir ürün seçin.",
    processEyebrow: "SÜRECİMİZ", processTitle: "Talep aşamasından teslimata",
    process: [["İnceleme ve Talep", "Bizimle iletişime geçtikten sonra kimyasal gereksinimlerinizi analiz ederiz."], ["Kalite Testi", "Saflık uyumluluğunu doğrulamak için her parti titiz laboratuvar testlerinden geçer."], ["Güvenli Teslimat", "Tam belgelerle doğrudan endüstriyel tesisinize teslimat yaparız."]],
    faqEyebrow: "DESTEK", faqTitle: "Sık Sorulan Sorular", faqs: [["Hangi ambalaj boyutları mevcut?", "220L çelik varil, 1000L IBC konteyner ve 1500L paslanmaz çelik depolama tankı sunuyoruz."], ["Analiz Sertifikası sağlıyor musunuz?", "Evet, her kimyasal sevkiyatında tam Analiz Sertifikası ve güvenlik bilgi formları bulunur."]],
    details: "AYRINTILARI GÖR", company: "Şirket", services: "Ürünler", connect: "İletişim", aboutLink: "Hakkımızda", tagline: "Yüksek kaliteli kimyasal çözümler ve toplu solvent dağıtımı.", account: "Müşteri hesabı", shop: "Çevrimiçi mağaza", noCategories: "Ürün kategorileri geçici olarak kullanılamıyor.", retry: "Yeniden dene", browseProducts: "Ürünlere göz at",
    formError: "Lütfen gerekli alanları doldurun ve geçerli bir e-posta girin.", localTitle: "YEREL SİTE ÖNİZLEMESİ", localStatus: "Düzenlemeler yalnızca bu tarayıcıda saklanır. Yayınlanmaz veya diğer ziyaretçilerle paylaşılmaz.", openEditor: "Düzenleyiciyi aç", closeEditor: "Düzenleyiciyi kapat",
    imageEdit: "Görseli değiştir", heroImages: "Ana görseller", aboutImage: "Hakkımızda görseli", cardImages: "Ürün görselleri", textEdit: "Ürün metni", customTitle: "Ürün kartı ekle", title: "Başlık", short: "Kart açıklaması", long: "Tam ürün açıklaması", packages: "Ambalaj seçenekleri", add: "Kart ekle", remove: "Kaldır", reset: "Yerel değişiklikleri sıfırla", saved: "Değişiklikler bu tarayıcıya kaydedildi.", saveError: "Tarayıcı depolaması başarısız; değişiklikler kaydedilmedi.", previewCard: "YEREL ÖNİZLEME",
  },
} as const;
type Language = keyof typeof translations;

export default function Home() {
  const { language, setLanguage, direction } = useLanguage();
  const locale = (language in translations ? language : "en") as Language;
  const [pageDefaults] = useState(defaultLandingPageSettings);
  const localizedProducts = LOCALIZED_PRODUCTS[locale];
  const [slide, setSlide] = useState(0);
  const slideRef = useRef(0);
  slideRef.current = slide;
  const loadedSlides = useRef(new Set<string>([assetUrl(0)]));
  const pendingSlides = useRef(new Map<string, Promise<boolean>>());
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [quoteExpanded, setQuoteExpanded] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);
  const scrollToQuote = useCallback((focusProduct = false) => {
    const quote = quoteRef.current;
    if (!quote || quote.hidden) return;
    const headerHeight = document.querySelector(".mc-header")?.getBoundingClientRect().height ?? 0;
    const top = Math.max(0, quote.getBoundingClientRect().top + window.scrollY - headerHeight - 16);
    // scrollIntoView also scrolls overflow-hidden ancestors, trapping the hero's
    // content above its clip on mobile. Only move the document, never the hero.
    const immediate = window.matchMedia("(max-width: 767px), (prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: immediate ? "instant" : "smooth" });
    if (focusProduct) document.getElementById("mc-product")?.focus({ preventScroll: true });
  }, []);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [formError, setFormError] = useState("");
  const { data: publishedFaqs, isError: faqError, refetch: retryFaq } = useQuery<Record<string, Array<{id: string; question: string; answer: string}>>>({
    queryKey: ["/api/faq"],
    queryFn: async () => {
      const response = await fetch("/api/faq", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load FAQ content.");
      const result = await response.json();
      if (!result.success || !result.data) throw new Error("Unable to load FAQ content.");
      return result.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
  const { data: landingContent, isError: landingError, refetch: retryLanding } = useQuery<LandingContent>({
    queryKey: ["/api/landing-content"],
    queryFn: async () => {
      const response = await fetch("/api/landing-content", { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load published landing content.");
      const result = await response.json();
      if (!result.success || !result.data) throw new Error("Unable to load published landing content.");
      return result.data as LandingContent;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
  useLandingMotion(landingContent?.revision);
  const page = landingContent?.page ?? pageDefaults;
  const { data: companyContact } = useQuery<{ data?: { contactSettings?: { landingPhone?: string } | null } | null }>({
    queryKey: ["/api/company-information"],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
  const headerPhone = resolveLandingPhone(companyContact?.data?.contactSettings, page);
  const extras = {
    en: { messageLabel: "Message", ratingLabel: "Google Rating", copyright: "© 2026 MOMTAZ CHEM. All rights reserved.", privacyLabel: "Privacy Policy", termsLabel: "Terms of Service", managementLabel: "Website management", aboutImageAlt: "Momtaz Chem industrial facility", openMenu: "Open menu", closeMenu: "Close menu", seoTitle: "Momtaz Chem | Industrial Chemical Solutions", seoDescription: translations.en.heroDesc },
    fa: { messageLabel: "پیام", ratingLabel: "امتیاز گوگل", copyright: "© ۲۰۲۶ ممتاز شیمی. تمامی حقوق محفوظ است.", privacyLabel: "حریم خصوصی", termsLabel: "شرایط استفاده", managementLabel: "مدیریت سایت", aboutImageAlt: "تأسیسات صنعتی ممتاز شیمی", openMenu: "باز کردن منو", closeMenu: "بستن منو", seoTitle: "ممتازکم | راهکارهای شیمیایی صنعتی", seoDescription: translations.fa.heroDesc },
    ar: { messageLabel: "الرسالة", ratingLabel: "تقييم Google", copyright: "© 2026 ممتاز كيم. جميع الحقوق محفوظة.", privacyLabel: "سياسة الخصوصية", termsLabel: "شروط الاستخدام", managementLabel: "إدارة الموقع", aboutImageAlt: "منشأة ممتاز كيم الصناعية", openMenu: "فتح القائمة", closeMenu: "إغلاق القائمة", seoTitle: "ممتاز كيم | حلول كيميائية صناعية", seoDescription: translations.ar.heroDesc },
    tr: { messageLabel: "Mesaj", ratingLabel: "Google Puanı", copyright: "© 2026 MOMTAZ CHEM. Tüm hakları saklıdır.", privacyLabel: "Gizlilik Politikası", termsLabel: "Kullanım Şartları", managementLabel: "Site yönetimi", aboutImageAlt: "Momtaz Chem endüstriyel tesisi", openMenu: "Menüyü aç", closeMenu: "Menüyü kapat", seoTitle: "Momtaz Chem | Endüstriyel Kimyasal Çözümler", seoDescription: translations.tr.heroDesc },
  }[locale];
  const c = { ...translations[locale], ...extras, ...page.texts.en, ...page.texts[locale] };
  // Correct old published defaults without discarding a deliberately customized label.
  const aboutLinkLabel = /^(explore packaging|مشاهده بسته‌بندی|استكشف التعبئة|ambalaji keşfet)$/i.test(c.explore.trim())
    ? translations[locale].explore : c.explore;
  const originalDetailLabels = PRODUCT_DETAILS_UI[locale] ?? PRODUCT_DETAILS_UI.en;
  const detailText = (key: string, fallback: string) => page.texts[locale]?.[key] ?? page.texts.en?.[key] ?? fallback;
  const purchaseLabel = detailText("purchase", { en: "Purchase", fa: "خرید", ar: "شراء", tr: "Satın Al" }[locale]);
  const detailLabels = { ...originalDetailLabels,
    close: detailText("modalClose", originalDetailLabels.close),
    detail: detailText("modalDetail", originalDetailLabels.detail),
    packaging: detailText("modalPackaging", originalDetailLabels.packaging),
    specifications: detailText("modalSpecs", originalDetailLabels.specifications),
    request: detailText("modalQuote", originalDetailLabels.request),
  };
  const packages = Object.fromEntries(Object.entries(PACKAGES).map(([id, item]) => [id, {
    ...item,
    name: localizedSetting(page.packages[id as keyof typeof PACKAGES]?.name ?? {}, locale, item.name),
    description: localizedSetting(page.packages[id as keyof typeof PACKAGES]?.description ?? {}, locale, item.description),
    capacity: localizedSetting(page.packages[id as keyof typeof PACKAGES]?.capacity ?? {}, locale, item.capacity),
  }])) as typeof PACKAGES;
  const sections = effectiveLayoutSections(page.layout, page.sections);
  const detached = new Set(page.layout.rows.flatMap(row => row.blocks.map(block => block.type)));
  const visibleSlides = page.slides.filter(item => item.isActive);
  const slideKey = visibleSlides[slide]?.id ?? visibleSlides[0]?.id ?? "0";
  const currentSlide = visibleSlides[slide] ?? visibleSlides[0];
  const { caption: slideCaption, phase: captionPhase } = useSlideCaptionTransition({
    key: `${slideKey}:${locale}`,
    eyebrow: localizedSetting(currentSlide?.eyebrow ?? {}, locale, c.eyebrow),
    title: localizedSetting(currentSlide?.title ?? {}, locale, c.heroTitle),
    description: localizedSetting(currentSlide?.description ?? {}, locale, c.heroDesc),
    visible: currentSlide?.showText !== false,
  });
  const linkLabel = (link: LandingLink) => localizedSetting(link.labels, locale, (c as unknown as Record<string, string>)[link.textKey ?? ""] ?? link.id);
  const sectionForAnchor: Record<string, keyof typeof sections> = { "#about": "about", "#services": "services", "#process": "process", "#faq": "faq", "#quote": "quote" };
  const effectiveHref = (href: string) => sectionForAnchor[href] && !sections[sectionForAnchor[href]] ? "/contact" : currentPublicProductLink(href);
  const renderLinks = (links: LandingLink[]) => links.filter(link => link.isActive).map(link =>
    <li key={link.id}><a href={effectiveHref(link.href)}>{linkLabel(link)}</a></li>,
  );
  const { data: categoriesResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/public/categories"],
    queryFn: async () => {
      const response = await fetch("/api/public/categories");
      if (!response.ok) throw new Error("Unable to load categories");
      const data = await response.json();
      return data.success ? data.data as ShopCategory[] : [];
    },
  });
  const { data: productsResponse } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Unable to load products");
      return response.json() as Promise<ShopProduct[]>;
    },
  });
  const categories = Array.isArray(categoriesResponse) ? categoriesResponse : [];
  const shopProducts = Array.isArray(productsResponse) ? productsResponse : [];
  const categoryCounts = useMemo(() => {
    const result: Record<string, number> = {};
    shopProducts.forEach((product) => { result[product.category] = (result[product.category] ?? 0) + 1; });
    return result;
  }, [shopProducts]);
  const categorySamples = useMemo(() => {
    const result: Record<string, string[]> = {};
    shopProducts.forEach((product) => {
      result[product.category] ??= [];
      if (result[product.category].length < 2) result[product.category].push(product.name);
    });
    return result;
  }, [shopProducts]);
  const imageFor = useCallback((key: string, assetIndex: number) => landingContent?.images[key] || assetUrl(assetIndex), [landingContent?.images]);
  const products = useMemo(() => BASE_PRODUCTS.map((product, index) => {
    const localized = localizedProducts?.[index];
    const localeOverride = landingContent?.edits?.[locale]?.[product.id];
    const englishOverride = landingContent?.edits?.en?.[product.id];
    return {
      ...product,
      title: localeOverride?.title ?? englishOverride?.title ?? categoryCardHeading(product.id, locale, localized?.[0] ?? product.title),
      short: localeOverride?.short ?? englishOverride?.short ?? localized?.[1] ?? product.short,
      long: localeOverride?.long ?? englishOverride?.long ?? product.long,
    };
  }).concat((landingContent?.custom ?? []).map((product) => {
    const localized = landingContent?.edits?.[locale]?.[product.id];
    const english = landingContent?.edits?.en?.[product.id];
    return {
      ...product,
      title: localized?.title ?? english?.title ?? product.title,
      short: localized?.short ?? english?.short ?? product.short,
      long: localized?.long ?? english?.long ?? product.long,
      categoryPath: "/contact",
      custom: true as const,
    };
  })).filter(product => product.id !== "logistics" && page.cards[product.id]?.isActive !== false).map(product => ({
    ...product, pack: page.cards[product.id]?.pack ?? product.pack,
    specs: page.cards[product.id]?.specs[locale] ?? page.cards[product.id]?.specs.en ?? product.specs,
  })).sort((a,b) => {
    const originals = [...BASE_PRODUCTS, ...(landingContent?.custom ?? [])];
    return (page.cards[a.id]?.order ?? categoryCardOrder(a.id, originals.findIndex(item=>item.id===a.id)))
      - (page.cards[b.id]?.order ?? categoryCardOrder(b.id, originals.findIndex(item=>item.id===b.id)));
  }),
  [landingContent, localizedProducts, locale, page.cards]);

  const ensureHeroLoaded = useCallback((index: number): Promise<boolean> => {
    const id = visibleSlides[index]?.id;
    if (id === undefined) return Promise.resolve(false);
    const url = landingContent?.images[`hero-${id}`] || (["0","1","2"].includes(id) ? assetUrl(Number(id)) : "");
    if (!url) return Promise.resolve(false);
    if (loadedSlides.current.has(url)) return Promise.resolve(true);
    const pending = pendingSlides.current.get(url);
    if (pending) return pending;
    const task = new Promise<boolean>((resolve) => {
      const image = new Image();
      image.onload = () => { loadedSlides.current.add(url); resolve(true); };
      image.onerror = () => resolve(false);
      image.src = url;
    }).finally(() => pendingSlides.current.delete(url));
    pendingSlides.current.set(url, task);
    return task;
  }, [landingContent?.images, page.slides]);

  useEffect(() => {
    let active = true;
    let timeout = 0;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const schedule = () => {
      window.clearTimeout(timeout);
      if (!active || !page.autoplay || visibleSlides.length < 2 || motion.matches || document.visibilityState !== "visible") return;
      timeout = window.setTimeout(async () => {
        const next = (slideRef.current + 1) % visibleSlides.length;
        const ready = await ensureHeroLoaded(next);
        if (active && ready && document.visibilityState === "visible" && !motion.matches) setSlide(next);
        schedule();
      }, page.slideInterval);
    };
    const firstFrame = requestAnimationFrame(() => {
      void ensureHeroLoaded(0);
      void ensureHeroLoaded(1);
      schedule();
    });
    document.addEventListener("visibilitychange", schedule);
    motion.addEventListener?.("change", schedule);
    return () => {
      active = false; window.clearTimeout(timeout); cancelAnimationFrame(firstFrame);
      document.removeEventListener("visibilitychange", schedule);
      motion.removeEventListener?.("change", schedule);
    };
  }, [ensureHeroLoaded, page.autoplay, page.slideInterval]);
  useEffect(() => { setSlide(0); }, [page.slides]);

  useEffect(() => {
    if (!sections.quote) return;

    const openFromHash = () => {
      if (window.location.hash === "#quote") {
        setQuoteExpanded(true);
        requestAnimationFrame(() => scrollToQuote());
      }
    };
    const handleQuoteLink = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const target = new URL(anchor.href, window.location.href);
      if (target.origin !== window.location.origin || target.pathname !== window.location.pathname || target.hash !== "#quote") return;

      event.preventDefault();
      setQuoteExpanded(true);
      if (window.location.hash !== "#quote") window.history.pushState(null, "", "#quote");
      requestAnimationFrame(() => {
        scrollToQuote();
      });
    };

    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    document.addEventListener("click", handleQuoteLink);
    return () => {
      window.removeEventListener("hashchange", openFromHash);
      document.removeEventListener("click", handleQuoteLink);
    };
  }, [sections.quote, scrollToQuote]);

  useEffect(() => {
    if (activeProductId && modalRef.current && !modalRef.current.open) modalRef.current.showModal();
  }, [activeProductId]);
  useEffect(() => {
    if (activeProductId && !products.some((product) => product.id === activeProductId)) {
      modalRef.current?.close();
      setActiveProductId(null);
    }
    if (selectedProduct && !products.some((product) => product.id === selectedProduct)) setSelectedProduct("");
  }, [activeProductId, products, selectedProduct]);

  function openProduct(id: string) {
    setActiveProductId(id);
  }
  function closeProduct() {
    modalRef.current?.close();
    setActiveProductId(null);
  }
  function requestProductQuote(id: string) {
    if (!sections.quote) { window.location.assign("/contact"); return; }
    setSelectedProduct(id);
    setQuoteExpanded(true);
    closeProduct();
    window.setTimeout(() => {
      scrollToQuote(true);
    }, 80);
  }

  async function submitEstimate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("sending"); setFormError("");
    const data = new FormData(form);
    const fullName = String(data.get("fullName") ?? "").trim();
    const [firstName] = fullName.split(/\s+/);
    const emailValue = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const address = String(data.get("address") ?? "").trim();
    const productInterest = String(data.get("productInterest") ?? "").trim();
    const company = String(data.get("company") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    if (!form.checkValidity() || !firstName || !emailValue) {
      setStatus("error"); setFormError(c.formError); return;
    }
    try {
      const response = await apiRequest("/api/landing-estimate", {
        method: "POST",
        body: { fullName, email: emailValue, company, productInterest, phone, address, message, language: locale },
      });
      if (!response?.success) throw new Error("Request not accepted.");
      setStatus("success"); setSelectedProduct(""); form.reset();
    } catch {
      setStatus("error"); setFormError(c.failed);
    }
  }

  const activeProduct = products.find((product) => product.id === activeProductId);
  const packageProductIds = new Set(products.map((product) => product.id));
  const heroImages = visibleSlides;
  const stats = page.stats[locale] ?? page.stats.en ?? c.stats.map((label, index) => ({label, value: c.statsValues[index]}));
  const processSteps = page.process[locale] ?? page.process.en ?? c.process.map(([title, description]) => ({title, description}));
  const formFields = page.form.fields;
  const quoteBlock = sections.quote && <div className="mc-estimate-card mc-reveal" id="quote" ref={quoteRef} data-home-part="quote" hidden={!quoteExpanded}>
    <h2 className="mc-estimate-heading">
      <button
        className="mc-estimate-toggle"
        type="button"
        aria-expanded={quoteExpanded}
        aria-controls="mc-estimate-content"
        onClick={() => {
          setQuoteExpanded(false);
          document.querySelector<HTMLAnchorElement>('.mc-hero-buttons a[href="#quote"]')?.focus({ preventScroll: true });
        }}
      >
        <span>{c.getQuote}</span>
        <i className="fa-solid fa-chevron-down" aria-hidden="true" />
      </button>
    </h2>
    <div id="mc-estimate-content" className="mc-estimate-content" hidden={!quoteExpanded}>
    <form onSubmit={submitEstimate} noValidate>
      <LayoutElements order={page.layout.elements.form}>
        {formFields.productInterest.visible && <div className="mc-layout-field" data-home-part="productInterest"><label className="mc-sr-only" htmlFor="mc-product">{c.product}</label>
          <select id="mc-product" name="productInterest" className="mc-control" value={selectedProduct} onChange={event => setSelectedProduct(event.target.value)} required={formFields.productInterest.required}>
            <option value="" disabled>{c.product}</option>{products.map(product => <option key={product.id} value={product.id}>{product.title}</option>)}
          </select></div>}
        <div className="mc-layout-field" data-home-part="fullName"><label className="mc-sr-only" htmlFor="mc-name">{c.fullName}</label><input id="mc-name" className="mc-control" name="fullName" autoComplete="name" placeholder={c.fullName} required /></div>
        <div className="mc-layout-field" data-home-part="email"><label className="mc-sr-only" htmlFor="mc-email">{c.email}</label><input id="mc-email" className="mc-control" type="email" name="email" autoComplete="email" placeholder={c.email} required /></div>
        {formFields.company.visible && <div className="mc-layout-field" data-home-part="company"><label className="mc-sr-only" htmlFor="mc-company">{c.companyOptional}</label><input id="mc-company" className="mc-control" name="company" autoComplete="organization" placeholder={c.companyOptional} required={formFields.company.required} /></div>}
        {formFields.phone.visible && <div className="mc-layout-field" data-home-part="phone"><label className="mc-sr-only" htmlFor="mc-phone">{c.phone}</label><input id="mc-phone" className="mc-control" type="tel" name="phone" autoComplete="tel" placeholder={c.phone} required={formFields.phone.required} /></div>}
        {formFields.address.visible && <div className="mc-layout-field" data-home-part="address"><label className="mc-sr-only" htmlFor="mc-address">{c.address}</label><input id="mc-address" className="mc-control" name="address" autoComplete="street-address" placeholder={c.address} required={formFields.address.required} /></div>}
        {formFields.message.visible && <div className="mc-layout-field" data-home-part="message"><label className="mc-sr-only" htmlFor="mc-message">{c.messageLabel}</label><textarea id="mc-message" className="mc-control" name="message" placeholder={c.messageLabel} maxLength={5000} required={formFields.message.required} /></div>}
        <button data-home-part="submit" className="mc-button mc-submit" type="submit" disabled={status === "sending"}>{status === "sending" ? c.sending : c.submit}</button>
      </LayoutElements>
      <p className={`mc-form-feedback ${status}`} role="status" aria-live="polite">{status === "success" ? c.submitted : status === "error" ? formError : ""}</p>
    </form>
    {page.rating.enabled && <div className="mc-rating"><span>{page.rating.href ? <a href={page.rating.href}>{page.rating.score} {c.ratingLabel}</a> : <>{page.rating.score} {c.ratingLabel}</>}</span><span className="mc-stars" aria-label={`${page.rating.stars} stars`}>{Array.from({length:page.rating.stars},(_,index)=><i key={index} className="fa-solid fa-star" />)}</span></div>}
    </div>
  </div>;
  const statsBlock = sections.stats && <div data-home-part="stats" className="mc-stats mc-reveal">{stats.map((item,index)=><div key={index}><strong>{item.value}</strong><span>{item.label}</span></div>)}</div>;
  const categoryBlock = sections.categories && <div data-home-part="categories">
    {isLoading ? <div className="mc-category-row" aria-label="Loading product categories">{[0,1,2].map(item=><div className="mc-category-skeleton" key={item}/>)}</div>
      : isError ? <div className="mc-category-error"><p>{c.noCategories}</p><button type="button" onClick={()=>void refetch()}>{c.retry}</button></div>
      : categories.length ? <div className="mc-category-row" aria-label="Shop product categories">{categories.map(category=>{
        return <Link className="mc-category-link" key={category.id} href="/shop"><span>{category.name}</span><small>{categoryCounts[category.name]??0} {locale==="fa"?"محصول":locale==="ar"?"منتج":locale==="tr"?"ürün":"products"}</small>{categorySamples[category.name]?.length?<small className="mc-category-samples">{categorySamples[category.name].join(" · ")}</small>:null}<i className="fa-solid fa-arrow-right" aria-hidden="true"/></Link>;
      })}</div>:<div className="mc-category-empty"><span>{c.noCategories}</span><Link href="/shop">{c.browseProducts}</Link></div>}
  </div>;
  return (
    <div className="mc-landing" dir={direction} lang={locale}>
      <OpenGraphTags title={c.seoTitle} description={c.seoDescription} type="website" image={landingContent?.images.seo ?? "https://momtazchem.com/og-home.jpg"} locale={locale === "fa" ? "fa_IR" : locale === "ar" ? "ar_IQ" : locale === "tr" ? "tr_TR" : "en_US"} />
      <CanonicalUrl path="/" />
      {landingError && <div className="mc-category-error" role="alert"><p>{locale === "fa" ? "بارگذاری محتوای به‌روز سایت ناموفق بود؛ ممکن است نسخه ذخیره‌شده قدیمی باشد." : "Could not refresh published site content. Previously loaded content is not being replaced."}</p><button type="button" onClick={() => void retryLanding()}>{c.retry}</button></div>}
      <header className="mc-header">
        <div className="mc-container mc-nav">
          <Link href="/" className="mc-logo" aria-label={`${page.brandPrimary} ${page.brandAccent}`}><CompanyBrandLogo /><span>{page.brandPrimary}<span>{page.brandAccent}</span></span></Link>
          <nav className={`mc-nav-links ${mobileMenu ? "is-open" : ""}`} aria-label="Main navigation">
            {landingHeaderNavigation(page.navigation).filter(link => link.isActive && (!sectionForAnchor[link.href] || sections[sectionForAnchor[link.href]])).map(link =>
              <a key={link.id} href={effectiveHref(link.href)} onClick={() => setMobileMenu(false)}>{linkLabel(link)}</a>)}
          </nav>
          <div className="mc-nav-actions">
            <label className="mc-language" aria-label={c.language}><i className="fa-solid fa-globe" aria-hidden="true" />
              <select value={locale} onChange={(event) => setLanguage(event.target.value as Language)} aria-label={c.language}>{Object.entries(LANGUAGES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>
            </label>
            {headerPhone.label && <a className="mc-phone" href={headerPhone.href} dir="ltr"><i className="fa-solid fa-phone" aria-hidden="true" /><span>{headerPhone.label}</span></a>}
            <button className="mc-menu-toggle" type="button" aria-label={mobileMenu ? c.closeMenu : c.openMenu} aria-expanded={mobileMenu} onClick={() => setMobileMenu((value) => !value)}><i className={`fa-solid ${mobileMenu ? "fa-xmark" : "fa-bars"}`} aria-hidden="true" /></button>
          </div>
        </div>
      </header>

      <main id="top">
        <LandingLayoutRenderer layout={page.layout} language={locale} images={landingContent?.images??{}} extraSections={{
          quote: sections.quote && <section className="mc-layout-standalone mc-layout-quote"><div className="mc-container">{quoteBlock}</div></section>,
          stats: sections.stats && <section className="mc-layout-standalone"><div className="mc-container">{statsBlock}</div></section>,
          categories: sections.categories && <section className="mc-services mc-layout-standalone"><div className="mc-container">{categoryBlock}</div></section>,
        }}>
        {(sections.hero || sections.quote) && <section data-home-section="hero" className="mc-hero">
          <div className="mc-hero-slider" aria-hidden="true">
            {heroImages.map((item, index) => {
              const background = landingContent?.images[`hero-${item.id}`] || (["0","1","2"].includes(item.id) ? assetUrl(Number(item.id)) : "");
              return <div key={item.id} className={`mc-hero-slide ${slideKey === item.id ? "is-active" : ""}`} style={background ? { backgroundImage: `url("${background}")` } : undefined} />;
            })}
          </div>
          <div className="mc-hero-overlay" />
          <div className="mc-container mc-hero-grid">
            <LayoutElements order={page.layout.elements.hero}>
            {sections.hero && <div data-home-part="copy" className="mc-hero-copy mc-reveal"
              data-slide-text-visible={slideCaption.visible} data-caption-phase={captionPhase} data-caption-key={slideCaption.key}>
              <span className="mc-eyebrow" aria-hidden={!slideCaption.visible || undefined}>{slideCaption.eyebrow}</span>
              <h1 aria-hidden={!slideCaption.visible || undefined}>{slideCaption.title}</h1>
              <p aria-hidden={!slideCaption.visible || undefined}>{slideCaption.description}</p>
            </div>}
            {!detached.has("quote")&&quoteBlock}
            </LayoutElements>
          </div>
          {sections.hero && <div className="mc-container mc-hero-controls">
            <div className="mc-hero-buttons">
              <a className="mc-button mc-button-gold" href={effectiveHref(page.actions.heroPrimary)}>{c.viewProducts}</a>
              <a className="mc-button mc-button-outline" href={effectiveHref(page.actions.heroSecondary)}>{c.getQuote}</a>
            </div>
            <div className="mc-slide-dots" aria-label="Hero slides">{heroImages.map((item, index) => <button key={item.id} type="button" aria-label={`Show slide ${index + 1}`} aria-pressed={slideKey === item.id} onClick={async () => { if (await ensureHeroLoaded(index)) setSlide(index); }} />)}</div>
          </div>}
        </section>}

        {sections.trusted && <section data-home-section="trusted" className="mc-trusted"><div className="mc-container mc-trusted-row mc-reveal"><LayoutElements order={page.layout.elements.trusted}><span data-home-part="label">{c.trusted}</span><div data-home-part="partners" className="mc-partner-marquee"><div className="mc-partner-marquee-track"><div className="mc-partner-track">{page.partners.filter(item=>item.isActive).map(item=>{
          const label=localizedSetting(item.labels,locale);
          const content=<>{landingContent?.images[`partner-${item.id}`] ? <img src={landingContent.images[`partner-${item.id}`]} alt={label} style={{maxWidth:120,maxHeight:48,objectFit:"contain"}} loading="lazy" /> : <i className={`fa-solid fa-${item.icon}`} aria-hidden="true" />}{label&&<span>{label}</span>}</>;
          return item.href?<a href={item.href} key={item.id}>{content}</a>:<span key={item.id}>{content}</span>;
        })}</div><div className="mc-partner-track mc-partner-track-copy" aria-hidden="true">{page.partners.filter(item=>item.isActive).map(item=>{
          const label=localizedSetting(item.labels,locale);
          return <span key={item.id}>{landingContent?.images[`partner-${item.id}`] ? <img src={landingContent.images[`partner-${item.id}`]} alt="" style={{maxWidth:120,maxHeight:48,objectFit:"contain"}} loading="lazy" /> : <i className={`fa-solid fa-${item.icon}`} aria-hidden="true" />}{label&&<span>{label}</span>}</span>;
        })}</div></div></div></LayoutElements></div></section>}
        {(sections.about || sections.stats) && <section data-home-section="about" className="mc-about" id="about"><div className="mc-container">
          <div className="mc-about-grid"><LayoutElements order={page.layout.elements.about}>
            {sections.about&&<div data-home-part="image" className={`${page.aboutVisual === "image" ? "mc-about-image" : "mc-about-art"} mc-reveal`}>
              {page.aboutVisual === "image" ? <img src={imageFor("about", 3)} alt={c.aboutImageAlt} loading="lazy" /> : <AboutPhotoWindow label={detailText("aboutImageAlt", aboutContent[locale].imageAlt)} image={{
                src: imageFor("about", 3),
                alt: detailText("aboutImageAlt", aboutContent[locale].imageAlt),
              }} />}
            </div>}
            {sections.about&&<div data-home-part="copy" className="mc-about-copy mc-reveal"><span className="mc-eyebrow mc-eyebrow-dark">{c.about}</span><h2>{c.aboutTitle}</h2><p>{c.aboutDesc}</p>
              <ul className="mc-about-facts">{(["aboutFactManufacturing", "aboutFactPackaging", "aboutFactSafety"] as const).map((key, index) => <li key={key}>{detailText(key, aboutContent[locale].facts[index])}</li>)}</ul>
              <a className="mc-button mc-button-dark" href={effectiveHref(page.actions.about)}>{aboutLinkLabel}</a></div>}
            {!detached.has("stats")&&statsBlock}
          </LayoutElements></div>
        </div></section>}

        {sections.services && <section data-home-section="services" className="mc-services" id="services"><div className="mc-container"><LayoutElements order={page.layout.elements.services}>
          <div data-home-part="heading" className="mc-section-heading mc-reveal"><div><span className="mc-eyebrow">{c.packaging}</span><h2>{c.packagingTitle}</h2><p>{c.packagingHint}</p></div><a href={effectiveHref(page.actions.shop)} className="mc-text-link">{c.shop}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></a></div>
          {!detached.has("categories")&&categoryBlock}
          <div data-home-part="cards" className="mc-services-grid">{products.map((product, index) => {
            const assetIndex = product.asset;
            const imageKey = product.id;
            return <article className={`mc-service-card mc-reveal mc-delay-${index % 3 + 1}`} key={product.id}>
              <div className="mc-service-image"><img src={imageFor(imageKey, assetIndex)} alt={product.title} loading="lazy" /></div>
              <div className="mc-service-body"><h3>{product.title}</h3><p>{product.short}</p>
                <div className="mc-card-actions">
                  <button type="button" className="mc-detail-link" dir={direction} onClick={() => openProduct(product.id)}>{c.details}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
                  <a href="/shop" className="mc-purchase-button" dir={direction} aria-label={purchaseLabel} title={purchaseLabel} data-testid={`card-purchase-${product.id}`}><ShoppingCart size={21} aria-hidden="true" /></a>
                </div>
              </div>
            </article>;
          })}</div>
        </LayoutElements></div></section>}

        {sections.process && <section data-home-section="process" className="mc-process" id="process"><div className="mc-container"><LayoutElements order={page.layout.elements.process}><div data-home-part="heading" className="mc-reveal"><span className="mc-eyebrow mc-eyebrow-dark">{c.processEyebrow}</span><h2 className="mc-section-title">{c.processTitle}</h2></div>
          <div data-home-part="steps" className="mc-process-grid">{processSteps.map(({title, description}, index) => <article className="mc-process-card mc-reveal" key={index}><span className="mc-process-number">{String(index + 1).padStart(2,"0")}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
        </LayoutElements></div></section>}
        {sections.faq && <section data-home-section="faq" className="mc-faq" id="faq"><div className="mc-container mc-reveal"><LayoutElements order={page.layout.elements.faq}><div data-home-part="heading"><span className="mc-eyebrow mc-eyebrow-dark">{c.faqEyebrow}</span><h2 className="mc-section-title">{c.faqTitle}</h2></div>
          <div data-home-part="items">
          {faqError && <p role="alert"><button type="button" onClick={() => void retryFaq()}>{locale === "fa" ? "دریافت سؤالات متداول ناموفق بود؛ تلاش دوباره" : locale === "ar" ? "تعذر تحميل الأسئلة؛ أعد المحاولة" : locale === "tr" ? "Sorular yüklenemedi; tekrar deneyin" : "Could not load FAQs. Retry"}</button></p>}
          <div className="mc-faq-list">{(publishedFaqs?.[locale] ?? []).map(({id, question, answer}, index) => <div className={`mc-faq-item ${openFaq === index ? "is-open" : ""}`} key={id}>
            <h3><button className="mc-faq-toggle" type="button" aria-expanded={openFaq === index} aria-controls={`mc-faq-${index}`} onClick={() => setOpenFaq((current) => current === index ? null : index)}>{question}<i className="fa-solid fa-plus" aria-hidden="true" /></button></h3>
            <div className="mc-faq-answer" id={`mc-faq-${index}`} hidden={openFaq !== index}><p style={{whiteSpace: "pre-wrap"}}>{answer}</p></div>
          </div>)}</div></div>
        </LayoutElements></div></section>}
      {sections.footer && <footer data-home-section="footer" className="mc-footer"><div className="mc-container">
        <div className="mc-footer-grid mc-reveal"><LayoutElements order={page.layout.elements.footer}>
          <div data-home-part="brand"><Link href="/" className="mc-logo"><CompanyBrandLogo /><span>{page.brandPrimary}<span>{page.brandAccent}</span></span></Link><p className="mc-footer-tagline">{c.tagline}</p><a className="mc-footer-cta" href={effectiveHref(page.actions.shop)}>{c.shop}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></a></div>
          <div data-home-part="company"><h3>{c.company}</h3><ul>{renderLinks(page.footerCompany)}</ul></div>
          <div data-home-part="packages"><h3>{c.packaging}</h3><ul>{Array.from(new Set(products.flatMap((product) => product.pack))).map((packId) => <li key={packId}><button className="mc-footer-product" type="button" onClick={() => { const target = products.find((product) => product.id === packId) ?? products.find((product) => product.pack.includes(packId)); if (target) openProduct(target.id); }}>{packages[packId].name}</button></li>)}</ul></div>
          <div data-home-part="connect"><h3>{c.connect}</h3><ul>{renderLinks(page.footerConnect)}{renderLinks(page.social)}</ul></div>
          <div data-home-part="bottom" className="mc-footer-bottom"><span>{c.copyright}</span><span><a href={page.actions.privacy}>{c.privacyLabel}</a><i /> <a href={page.actions.terms}>{c.termsLabel}</a></span></div>
        </LayoutElements></div>
      </div></footer>}
        </LandingLayoutRenderer>
      </main>

      <dialog className="mc-modal" ref={modalRef} aria-labelledby="mc-modal-title" onCancel={() => setActiveProductId(null)} onClick={(event) => { if (event.target === modalRef.current) closeProduct(); }} onClose={() => setActiveProductId(null)}>
        <button className="mc-modal-close" type="button" aria-label={detailLabels.close} onClick={closeProduct}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
        {activeProduct && <div className="mc-modal-grid">
          <div className="mc-modal-image"><img src={imageFor(activeProduct.id, activeProduct.asset)} alt={activeProduct.title} /></div>
          <div className="mc-modal-body"><span className="mc-eyebrow mc-eyebrow-dark">{detailLabels.detail}</span><h2 id="mc-modal-title">{activeProduct.title}</h2><p>{activeProduct.long}</p>
            {activeProduct.specs.length > 0 && <><h3>{detailLabels.specifications}</h3><ul className="mc-specs">{activeProduct.specs.map((spec) => <li key={spec}><i className="fa-solid fa-check" aria-hidden="true" /><span>{spec}</span></li>)}</ul></>}
            <h3>{detailLabels.packaging}</h3>{detailText("modalPackagingHint","") && <p>{detailText("modalPackagingHint","")}</p>}<div className="mc-packs">{activeProduct.pack.map((packId) => {
              const pack = packages[packId];
              const linked = packageProductIds.has(packId);
              return <button key={packId} className={`mc-pack ${activeProduct.id === packId ? "current" : ""}`} type="button" disabled={!linked || activeProduct.id === packId} onClick={() => linked && openProduct(packId)} title={pack.description}>
                <span className="mc-pack-icon">{linked ? <img src={imageFor(packId, products.find((item) => item.id === packId)?.asset ?? 9)} alt="" /> : <i className={`fa-solid ${pack.icon}`} aria-hidden="true" />}</span>
                <span><b>{pack.name}</b><small>{pack.capacity}</small></span>
              </button>;
            })}</div>
            <div className="mc-modal-actions">
              <button type="button" className="mc-button mc-button-gold" dir={direction} onClick={() => requestProductQuote(activeProduct.id)}>{detailLabels.request}</button>
              <a href="/shop" className="mc-purchase-button" dir={direction} aria-label={purchaseLabel} title={purchaseLabel} data-testid="modal-purchase"><ShoppingCart size={21} aria-hidden="true" /></a>
            </div>
          </div>
        </div>}
      </dialog>
    </div>
  );
}
