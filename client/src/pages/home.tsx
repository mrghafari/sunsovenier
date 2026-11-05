import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import OpenGraphTags from "@/components/seo/OpenGraphTags";
import CanonicalUrl from "@/components/seo/CanonicalUrl";
import type { ShopCategory, ShopProduct } from "@shared/shop-schema";
import assets from "./landing/landing-assets.json";
import { BASE_PRODUCTS, LIQUID_PACKAGES, LOCALIZED_PRODUCTS, PACKAGES, PRODUCT_DETAILS_UI, type LandingProduct, type PackageId } from "./landing/catalog";
import { imageFileToDataUrl, readLocalLanding, writeLocalLanding, type LocalLandingState } from "./landing/local-editor";
import "./landing/landing.css";

type LandingAsset = { url: string; width?: number; height?: number };
const landingAssets = (assets as { images: LandingAsset[] }).images;
const assetUrl = (index: number) => landingAssets[index]?.url ?? "";
const LANGUAGES: Record<string, string> = { en: "English", fa: "فارسی", ar: "العربية", tr: "Türkçe" };
const EMPTY_EDITOR: LocalLandingState = { images: {}, edits: {}, custom: [] };

const translations = {
  en: {
    navAbout: "About", navProducts: "Products", navProcess: "Process", navFaq: "FAQ", navShop: "Shop", navAccount: "Customer account", language: "Language",
    eyebrow: "Momtaz Chem Industrial", heroTitle: "Industrial Chemical Solutions & High-Grade Solvents",
    heroDesc: "Advanced chemical solutions for fuel additives, water treatment, paint & thinner products and agricultural fertilizers, with 25+ years of excellence.",
    viewProducts: "VIEW PRODUCTS", getQuote: "GET A QUOTE", quoteTitle: "Get A Free Estimate", product: "Choose product / packaging *", fullName: "Full name *", email: "Email *", phone: "Phone *", address: "Delivery address *", companyOptional: "Company (optional)", submit: "REQUEST ESTIMATE",
    sending: "SENDING…", submitted: "Thank you! Your request was received. We will contact you shortly.", failed: "We couldn’t send your request. Please try again or contact us directly.",
    trusted: "TRUSTED BY", about: "About Us", aboutTitle: "High-Quality Chemical Services & Packaging",
    aboutDesc: "Momtaz Chem provides top-tier chemical manufacturing and standard packaging solutions with an unwavering commitment to quality and safety compliance.",
    explore: "EXPLORE PACKAGING", stats: ["Projects Completed", "Years Of Excellence", "Satisfied Clients"], statsValues: ["500+", "25+", "100%"],
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
    explore: "مشاهده بسته‌بندی", stats: ["پروژه انجام‌شده", "سال تجربه", "رضایت مشتریان"], statsValues: ["۵۰۰+", "۲۵+", "۱۰۰٪"],
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
    explore: "استكشف التعبئة", stats: ["مشروع منجز", "سنوات من التميز", "عملاء راضون"], statsValues: ["500+", "25+", "100%"],
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
    explore: "AMBALAJI KEŞFET", stats: ["Tamamlanan Proje", "Yıllık Deneyim", "Memnun Müşteri"], statsValues: ["500+", "25+", "100%"],
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
  const { isAuthenticated } = useAuth();
  const locale = (language in translations ? language : "en") as Language;
  const c = translations[locale];
  const localizedProducts = LOCALIZED_PRODUCTS[locale];
  const detailLabels = PRODUCT_DETAILS_UI[locale] ?? PRODUCT_DETAILS_UI.en;
  const [slide, setSlide] = useState(0);
  const slideRef = useRef(0);
  slideRef.current = slide;
  const loadedSlides = useRef(new Set<number>([0]));
  const pendingSlides = useRef(new Map<number, Promise<boolean>>());
  const [loadedSlideState, setLoadedSlideState] = useState<number[]>([0]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDialogElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [formError, setFormError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<LocalLandingState>(EMPTY_EDITOR);
  const [editorReady, setEditorReady] = useState(false);
  const [editorMessage, setEditorMessage] = useState("");
  const [newCard, setNewCard] = useState({ title: "", short: "", long: "", pack: [] as PackageId[] });
  const [newCardImage, setNewCardImage] = useState("");
  const previewId = useRef(0);

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
  const imageFor = useCallback((key: string, assetIndex: number) => isAuthenticated ? editor.images[key] || assetUrl(assetIndex) : assetUrl(assetIndex), [editor.images, isAuthenticated]);
  const products = useMemo(() => BASE_PRODUCTS.map((product, index) => {
    const localized = localizedProducts?.[index];
    const override = isAuthenticated ? editor.edits[product.id] : undefined;
    return { ...product, title: override?.title || localized?.[0] || product.title, short: override?.short || localized?.[1] || product.short, long: override?.long || product.long };
  }).concat(isAuthenticated ? editor.custom : []), [editor.custom, editor.edits, isAuthenticated, localizedProducts]);

  const ensureHeroLoaded = useCallback((index: number): Promise<boolean> => {
    if (loadedSlides.current.has(index)) return Promise.resolve(true);
    const pending = pendingSlides.current.get(index);
    if (pending) return pending;
    const task = new Promise<boolean>((resolve) => {
      const image = new Image();
      image.onload = () => { loadedSlides.current.add(index); setLoadedSlideState((items) => items.includes(index) ? items : [...items, index]); resolve(true); };
      image.onerror = () => resolve(false);
      image.src = assetUrl(index);
    }).finally(() => pendingSlides.current.delete(index));
    pendingSlides.current.set(index, task);
    return task;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) { setEditor(EMPTY_EDITOR); setEditorReady(false); return; }
    let active = true;
    readLocalLanding().then((saved) => {
      if (active) { setEditor(saved ?? EMPTY_EDITOR); setEditorReady(true); setEditorMessage(""); }
    }).catch(() => {
      // Never overwrite a saved preview with empty defaults after a failed read.
      if (active) { setEditorReady(false); setEditorMessage(c.saveError); }
    });
    return () => { active = false; };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !editorReady) return;
    const timeout = window.setTimeout(() => {
      writeLocalLanding(editor).then(() => setEditorMessage(c.saved)).catch(() => setEditorMessage(c.saveError));
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [c.saveError, c.saved, editor, editorReady, isAuthenticated]);

  useEffect(() => {
    let active = true;
    let timeout = 0;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const schedule = () => {
      window.clearTimeout(timeout);
      if (!active || motion.matches || document.visibilityState !== "visible") return;
      timeout = window.setTimeout(async () => {
        const next = (slideRef.current + 1) % 3;
        const ready = await ensureHeroLoaded(next);
        if (active && ready && document.visibilityState === "visible" && !motion.matches) setSlide(next);
        schedule();
      }, 5000);
    };
    const firstFrame = requestAnimationFrame(() => {
      void ensureHeroLoaded(1);
      window.setTimeout(() => { void ensureHeroLoaded(2); }, 1100);
      schedule();
    });
    document.addEventListener("visibilitychange", schedule);
    motion.addEventListener?.("change", schedule);
    return () => {
      active = false; window.clearTimeout(timeout); cancelAnimationFrame(firstFrame);
      document.removeEventListener("visibilitychange", schedule);
      motion.removeEventListener?.("change", schedule);
    };
  }, [ensureHeroLoaded]);

  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>(".mc-landing .mc-reveal");
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    document.documentElement.classList.add("mc-reveal-ready");
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.1, rootMargin: "0px 0px -35px 0px" });
    nodes.forEach((node) => observer.observe(node));
    return () => { observer.disconnect(); document.documentElement.classList.remove("mc-reveal-ready"); };
  }, []);

  useEffect(() => {
    if (activeProductId && modalRef.current && !modalRef.current.open) modalRef.current.showModal();
  }, [activeProductId]);

  async function onEditorImage(key: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      const dataUrl = await imageFileToDataUrl(file);
      setEditor((state) => ({ ...state, images: { ...state.images, [key]: dataUrl } }));
      setEditorMessage(c.saved);
    } catch (error) { setEditorMessage(error instanceof Error ? error.message : c.saveError); }
  }

  function setProductText(id: string, field: "title" | "short" | "long", value: string) {
    setEditor((state) => ({ ...state, edits: { ...state.edits, [id]: { ...state.edits[id], [field]: value } } }));
  }

  async function addCustomProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("customImage");
    let image = newCardImage;
    if (file instanceof File && file.size) {
      try { image = await imageFileToDataUrl(file); } catch (error) { setEditorMessage(error instanceof Error ? error.message : c.saveError); return; }
    }
    if (!newCard.title.trim() || !newCard.short.trim() || !newCard.long.trim() || !newCard.pack.length) {
      setEditorMessage(c.formError); return;
    }
    const id = `custom-${Date.now()}-${++previewId.current}`;
    const product: LandingProduct = {
      id, title: newCard.title.trim(), short: newCard.short.trim(), long: newCard.long.trim(),
      specs: [], pack: newCard.pack, asset: 9, categoryPath: "/shop", custom: true,
    };
    setEditor((state) => ({ ...state, custom: [...state.custom, product], images: image ? { ...state.images, [id]: image } : state.images }));
    setNewCard({ title: "", short: "", long: "", pack: [] });
    setNewCardImage("");
    form.reset();
    setEditorMessage(c.saved);
  }

  function removeCustomProduct(id: string) {
    setEditor((state) => {
      const images = { ...state.images }; delete images[id];
      return { ...state, custom: state.custom.filter((product) => product.id !== id), images };
    });
  }

  async function resetEditor() {
    setEditor(EMPTY_EDITOR);
    try {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("momtazchem-home-preview-v2", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("local-content", "readwrite");
        transaction.objectStore("local-content").delete("landing");
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      setEditorMessage(c.saved);
    } catch { setEditorMessage(c.saveError); }
  }

  function openProduct(id: string) {
    setActiveProductId(id);
  }
  function closeProduct() {
    modalRef.current?.close();
    setActiveProductId(null);
  }
  function requestProductQuote(id: string) {
    setSelectedProduct(id);
    closeProduct();
    window.setTimeout(() => {
      quoteRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      document.getElementById("mc-product")?.focus({ preventScroll: true });
    }, 80);
  }

  async function submitEstimate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("sending"); setFormError("");
    const data = new FormData(form);
    const fullName = String(data.get("fullName") ?? "").trim();
    const [firstName, ...lastNameParts] = fullName.split(/\s+/);
    const emailValue = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const address = String(data.get("address") ?? "").trim();
    const productInterest = String(data.get("productInterest") ?? "").trim();
    const company = String(data.get("company") ?? "").trim();
    const productLabel = products.find((item) => item.id === productInterest)?.title ?? productInterest;
    const message = `Estimate request — ${productLabel}. Phone: ${phone}. Address: ${address}.`;
    if (!form.checkValidity() || !firstName || !emailValue || !phone || !address || !productInterest) {
      setStatus("error"); setFormError(c.formError); return;
    }
    try {
      await apiRequest("/api/contact", {
        method: "POST",
        body: { firstName, lastName: lastNameParts.join(" "), email: emailValue, company, productInterest: productLabel, message },
      });
      setStatus("success"); setSelectedProduct(""); form.reset();
    } catch {
      setStatus("error"); setFormError(c.failed);
    }
  }

  const activeProduct = products.find((product) => product.id === activeProductId);
  const packageProductIds = new Set(products.map((product) => product.id));
  const heroImages = [0, 1, 2];
  const imageKeys: Array<[string, string, number]> = [
    ["drum220", "220L Steel Drum", 4], ["ibc1000", "1000L IBC Container", 5], ["tank1500", "1500L Stainless Tank", 6],
    ["fert", "Agricultural Fertilizers", 7], ["logistics", "Logistics", 8], ["water", "Water", 9],
  ];

  return (
    <div className="mc-landing" dir={direction} lang={locale}>
      <OpenGraphTags title={locale === "fa" ? "ممتازکم | راهکارهای شیمیایی صنعتی" : "Momtaz Chem | Industrial Chemical Solutions"} description="Advanced chemical solutions for fuel additives, water treatment, paint & thinner products, and agricultural fertilizers." type="website" image="https://momtazchem.com/og-home.jpg" locale={locale === "fa" ? "fa_IR" : "en_US"} />
      <CanonicalUrl path="/" />
      {isAuthenticated && <div className="mc-manager">
        <div className="mc-manager-bar">
          <span><i className="fa-solid fa-sliders" aria-hidden="true" /> {c.localTitle} <small>· {c.localStatus}</small></span>
          <button type="button" aria-expanded={editorOpen} aria-controls="mc-manager-panel" onClick={() => setEditorOpen((open) => !open)}><i className={`fa-solid ${editorOpen ? "fa-xmark" : "fa-gear"}`} aria-hidden="true" /> {editorOpen ? c.closeEditor : c.openEditor}</button>
        </div>
        {editorOpen && <section className="mc-manager-panel" id="mc-manager-panel" aria-label={c.localTitle}>
          <p className="mc-manager-note">{c.localStatus}</p>
          <h2>{c.heroImages}</h2>
          <div className="mc-manager-grid">{heroImages.map((index) => <label className="mc-manager-field" key={index}>{`Slide ${index + 1}`}<input type="file" accept="image/*" onChange={(event) => void onEditorImage(`hero-${index}`, event)} /><img src={imageFor(`hero-${index}`, index)} alt={`Hero slide ${index + 1} preview`} /></label>)}</div>
          <h2>{c.aboutImage}</h2>
          <div className="mc-manager-grid"><label className="mc-manager-field">{c.aboutImage}<input type="file" accept="image/*" onChange={(event) => void onEditorImage("about", event)} /><img src={imageFor("about", 3)} alt="About section preview" /></label></div>
          <h2>{c.cardImages}</h2>
          <div className="mc-manager-grid">{imageKeys.map(([key, label, index]) => <label className="mc-manager-field" key={key}>{label}<input type="file" accept="image/*" onChange={(event) => void onEditorImage(key, event)} /><img src={imageFor(key, index)} alt={`${label} preview`} /></label>)}</div>
          <h2>{c.textEdit}</h2>
          {BASE_PRODUCTS.map((product) => {
            const localTitle = editor.edits[product.id]?.title || product.title;
            return <div className="mc-manager-field" key={product.id} style={{ marginBottom: 16 }}>
              <strong>{localTitle}</strong>
              <label>{c.title}<input value={editor.edits[product.id]?.title ?? product.title} onChange={(event) => setProductText(product.id, "title", event.target.value)} /></label>
              <label>{c.short}<input value={editor.edits[product.id]?.short ?? product.short} onChange={(event) => setProductText(product.id, "short", event.target.value)} /></label>
              <label>{c.long}<textarea rows={3} value={editor.edits[product.id]?.long ?? product.long} onChange={(event) => setProductText(product.id, "long", event.target.value)} /></label>
            </div>;
          })}
          {editor.custom.map((product) => <div className="mc-admin-product" key={product.id}><img src={imageFor(product.id, product.asset)} alt="" /><span>{product.title}</span><button type="button" onClick={() => removeCustomProduct(product.id)}>{c.remove}</button></div>)}
          <h2>{c.customTitle}</h2>
          <form className="mc-manager-add-form" onSubmit={(event) => void addCustomProduct(event)}>
            <label className="mc-manager-field">{c.title}<input required value={newCard.title} onChange={(event) => setNewCard((value) => ({ ...value, title: event.target.value }))} /></label>
            <label className="mc-manager-field">{c.short}<input required value={newCard.short} onChange={(event) => setNewCard((value) => ({ ...value, short: event.target.value }))} /></label>
            <label className="mc-manager-field">{c.long}<textarea required rows={2} value={newCard.long} onChange={(event) => setNewCard((value) => ({ ...value, long: event.target.value }))} /></label>
            <label className="mc-manager-field">{c.imageEdit}<input type="file" name="customImage" accept="image/*" onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (!file) return;
              void imageFileToDataUrl(file).then(setNewCardImage).catch(() => setEditorMessage(c.saveError));
            }} /></label>
            <fieldset className="mc-manager-field" style={{ border: 0, padding: 0, gridColumn: "1 / -1" }}><legend>{c.packages}</legend><div className="mc-field-pair">{Object.entries(PACKAGES).map(([id, pack]) => <label key={id}><input type="checkbox" checked={newCard.pack.includes(id as PackageId)} onChange={(event) => setNewCard((value) => ({ ...value, pack: event.target.checked ? [...value.pack, id as PackageId] : value.pack.filter((item) => item !== id) }))} /> {pack.name}</label>)}</div></fieldset>
            <button type="submit" className="mc-manager-add"><i className="fa-solid fa-plus" aria-hidden="true" /> {c.add}</button>
          </form>
          <div className="mc-manager-actions"><p role="status" aria-live="polite">{editorMessage || c.localStatus}</p><button type="button" onClick={() => void resetEditor()}>{c.reset}</button></div>
        </section>}
      </div>}

      <header className="mc-header">
        <div className="mc-container mc-nav">
          <Link href="/" className="mc-logo" aria-label="Momtaz Chem home"><i className="fa-solid fa-flask" aria-hidden="true" /><span>MOMTAZ<span>CHEM</span></span></Link>
          <nav className={`mc-nav-links ${mobileMenu ? "is-open" : ""}`} aria-label="Main navigation">
            <a href="#about" onClick={() => setMobileMenu(false)}>{c.navAbout}</a>
            <a href="#services" onClick={() => setMobileMenu(false)}>{c.navProducts}</a>
            <a href="#process" onClick={() => setMobileMenu(false)}>{c.navProcess}</a>
            <a href="#faq" onClick={() => setMobileMenu(false)}>{c.navFaq}</a>
            <Link href="/shop" onClick={() => setMobileMenu(false)}>{c.navShop}</Link>
            <Link href="/customer/login" onClick={() => setMobileMenu(false)}>{c.navAccount}</Link>
          </nav>
          <div className="mc-nav-actions">
            <label className="mc-language" aria-label={c.language}><i className="fa-solid fa-globe" aria-hidden="true" />
              <select value={locale} onChange={(event) => setLanguage(event.target.value as Language)} aria-label={c.language}>{Object.entries(LANGUAGES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>
              <i className="fa-solid fa-chevron-down" aria-hidden="true" />
            </label>
            <a className="mc-phone" href="tel:+9647500000000"><i className="fa-solid fa-phone" aria-hidden="true" /><span>+964 (750) 000-0000</span></a>
            <button className="mc-menu-toggle" type="button" aria-label={mobileMenu ? "Close menu" : "Open menu"} aria-expanded={mobileMenu} onClick={() => setMobileMenu((value) => !value)}><i className={`fa-solid ${mobileMenu ? "fa-xmark" : "fa-bars"}`} aria-hidden="true" /></button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="mc-hero">
          <div className="mc-hero-slider" aria-hidden="true">
            {heroImages.map((index) => {
              const source = isAuthenticated ? editor.images[`hero-${index}`] : "";
              const background = source || (loadedSlideState.includes(index) ? assetUrl(index) : "");
              return <div key={index} className={`mc-hero-slide ${slide === index ? "is-active" : ""}`} style={background ? { backgroundImage: `url("${background}")` } : undefined} />;
            })}
          </div>
          <div className="mc-hero-overlay" />
          <div className="mc-container mc-hero-grid">
            <div className="mc-hero-copy mc-reveal">
              <span className="mc-eyebrow">{c.eyebrow}</span>
              <h1>{c.heroTitle}</h1>
              <p>{c.heroDesc}</p>
              <div className="mc-hero-buttons"><a className="mc-button mc-button-gold" href="#services">{c.viewProducts}</a><a className="mc-button mc-button-outline" href="#quote">{c.getQuote}</a></div>
              <div className="mc-slide-dots" aria-label="Hero slides">{heroImages.map((index) => <button key={index} type="button" aria-label={`Show slide ${index + 1}`} aria-pressed={slide === index} onClick={async () => { if (await ensureHeroLoaded(index)) setSlide(index); }} />)}</div>
            </div>
            <div className="mc-estimate-card mc-reveal" id="quote" ref={quoteRef}>
              <h2>{c.quoteTitle}</h2>
              <form onSubmit={submitEstimate} noValidate>
                <label className="mc-sr-only" htmlFor="mc-product">{c.product}</label>
                <select id="mc-product" name="productInterest" className="mc-control" value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)} required>
                  <option value="" disabled>{c.product}</option>{products.map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}
                </select>
                <label className="mc-sr-only" htmlFor="mc-name">{c.fullName}</label><input id="mc-name" className="mc-control" name="fullName" autoComplete="name" placeholder={c.fullName} required />
                <label className="mc-sr-only" htmlFor="mc-email">{c.email}</label><input id="mc-email" className="mc-control" type="email" name="email" autoComplete="email" placeholder={c.email} required />
                <label className="mc-sr-only" htmlFor="mc-company">{c.companyOptional}</label><input id="mc-company" className="mc-control" name="company" autoComplete="organization" placeholder={c.companyOptional} />
                <label className="mc-sr-only" htmlFor="mc-phone">{c.phone}</label><input id="mc-phone" className="mc-control" type="tel" name="phone" autoComplete="tel" placeholder={c.phone} required />
                <label className="mc-sr-only" htmlFor="mc-address">{c.address}</label><input id="mc-address" className="mc-control" name="address" autoComplete="street-address" placeholder={c.address} required />
                <button className="mc-button mc-submit" type="submit" disabled={status === "sending"}>{status === "sending" ? c.sending : c.submit}</button>
                <p className={`mc-form-feedback ${status}`} role="status" aria-live="polite">{status === "success" ? c.submitted : status === "error" ? formError : ""}</p>
              </form>
              <div className="mc-rating"><span><i className="fa-brands fa-google mc-google-mark" aria-hidden="true" /> 5.0 Google Rating</span><span className="mc-stars" aria-label="5 stars"><i className="fa-solid fa-star" /><i className="fa-solid fa-star" /><i className="fa-solid fa-star" /><i className="fa-solid fa-star" /><i className="fa-solid fa-star" /></span></div>
            </div>
          </div>
        </section>

        <section className="mc-trusted"><div className="mc-container mc-trusted-row mc-reveal"><span>{c.trusted}</span><div aria-hidden="true"><i className="fa-solid fa-industry" /><i className="fa-solid fa-vial-circle-check" /><i className="fa-solid fa-shield-halved" /><i className="fa-solid fa-truck-fast" /></div></div></section>
        <section className="mc-about" id="about"><div className="mc-container">
          <div className="mc-about-grid">
            <div className="mc-about-image mc-reveal"><img src={imageFor("about", 3)} alt="Momtaz Chem industrial facility" loading="lazy" /></div>
            <div className="mc-about-copy mc-reveal"><span className="mc-eyebrow mc-eyebrow-dark">{c.about}</span><h2>{c.aboutTitle}</h2><p>{c.aboutDesc}</p><Link className="mc-button mc-button-dark" href="/about">{c.explore}</Link></div>
          </div>
          <div className="mc-stats mc-reveal">{c.stats.map((label, index) => <div key={label}><strong>{c.statsValues[index]}</strong><span>{label}</span></div>)}</div>
        </div></section>

        <section className="mc-services" id="services"><div className="mc-container">
          <div className="mc-section-heading mc-reveal"><div><span className="mc-eyebrow">{c.packaging}</span><h2>{c.packagingTitle}</h2><p>{c.packagingHint}</p></div><Link href="/shop" className="mc-text-link">{c.shop}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></div>
          {isLoading ? <div className="mc-category-row" aria-label="Loading product categories">{[0,1,2].map((item) => <div className="mc-category-skeleton" key={item} />)}</div>
            : isError ? <div className="mc-category-error"><p>{c.noCategories}</p><button type="button" onClick={() => void refetch()}>{c.retry}</button></div>
              : categories.length > 0 ? <div className="mc-category-row" aria-label="Shop product categories">{categories.slice(0,8).map((category) => {
                const slug = category.slug || category.name.toLowerCase().replace(/\s+/g, "-");
                const count = categoryCounts[category.name] ?? 0;
                const faNames: Record<string, string> = { "fuel-additives": "افزودنی‌های سوخت", "water-treatment": "تصفیه آب", "paint-thinner": "رنگ و تینر", "paint-solvents": "حلال‌های رنگ", "agricultural-fertilizers": "کودهای کشاورزی", "industrial-chemicals": "مواد شیمیایی صنعتی", "technical-equipment": "تجهیزات فنی", "commercial-goods": "کالاهای تجاری" };
                const categoryName = locale === "fa" ? faNames[slug] ?? category.name : category.name;
                const validRoutes = ["fuel-additives","water-treatment","paint-thinner","paint-solvents","agricultural-fertilizers","industrial-chemicals","technical-equipment","commercial-goods","other"];
                const categoryHref = validRoutes.includes(slug) ? `/products/${slug}` : "/products";
                return <Link className="mc-category-link" key={category.id} href={categoryHref}><span>{categoryName}</span><small>{count} {locale === "fa" ? "محصول" : locale === "ar" ? "منتج" : locale === "tr" ? "ürün" : "products"}</small>{categorySamples[category.name]?.length ? <small className="mc-category-samples">{categorySamples[category.name].join(" · ")}</small> : null}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>;
              })}</div> : <div className="mc-category-empty"><span>{c.noCategories}</span><Link href="/products">{c.browseProducts} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></div>}
          <div className="mc-services-grid">{products.map((product, index) => {
            const assetIndex = product.asset;
            const imageKey = product.id;
            return <article className={`mc-service-card mc-reveal mc-delay-${index % 3 + 1}`} key={product.id}>
              <div className="mc-service-image"><img src={imageFor(imageKey, assetIndex)} alt={product.title} loading="lazy" /></div>
              <div className="mc-service-body"><h3>{product.title}</h3><p>{product.short}</p>
                <button type="button" className="mc-detail-link" onClick={() => openProduct(product.id)}>{c.details}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
                {product.custom && <span className="mc-preview-card-tag">{c.previewCard}</span>}
              </div>
            </article>;
          })}</div>
        </div></section>

        <section className="mc-process" id="process"><div className="mc-container"><div className="mc-reveal"><span className="mc-eyebrow mc-eyebrow-dark">{c.processEyebrow}</span><h2 className="mc-section-title">{c.processTitle}</h2></div>
          <div className="mc-process-grid">{c.process.map(([title, description], index) => <article className="mc-process-card mc-reveal" key={title}><span className="mc-process-number">0{index + 1}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
        </div></section>
        <section className="mc-faq" id="faq"><div className="mc-container mc-reveal"><span className="mc-eyebrow mc-eyebrow-dark">{c.faqEyebrow}</span><h2 className="mc-section-title">{c.faqTitle}</h2>
          <div className="mc-faq-list">{c.faqs.map(([question, answer], index) => <div className={`mc-faq-item ${openFaq === index ? "is-open" : ""}`} key={question}>
            <h3><button className="mc-faq-toggle" type="button" aria-expanded={openFaq === index} aria-controls={`mc-faq-${index}`} onClick={() => setOpenFaq((current) => current === index ? null : index)}>{question}<i className="fa-solid fa-plus" aria-hidden="true" /></button></h3>
            <div className="mc-faq-answer" id={`mc-faq-${index}`} hidden={openFaq !== index}><p>{answer}</p></div>
          </div>)}</div>
        </div></section>
      </main>
      <footer className="mc-footer"><div className="mc-container">
        <div className="mc-footer-grid">
          <div><Link href="/" className="mc-logo"><i className="fa-solid fa-flask" aria-hidden="true" /><span>MOMTAZ<span>CHEM</span></span></Link><p className="mc-footer-tagline">{c.tagline}</p><Link className="mc-footer-cta" href="/shop">{c.shop}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></div>
          <div><h3>{c.company}</h3><ul><li><Link href="/about">{c.aboutLink}</Link></li><li><Link href="/services">{c.services}</Link></li><li><Link href="/contact">{c.getQuote}</Link></li></ul></div>
          <div><h3>{c.packaging}</h3><ul>{LIQUID_PACKAGES.map((packId) => <li key={packId}><button className="mc-footer-product" type="button" onClick={() => openProduct(packId)}>{PACKAGES[packId].name}</button></li>)}</ul></div>
          <div><h3>{c.connect}</h3><ul><li><Link href="/customer/login">{c.account}</Link></li><li><Link href="/shop">{c.shop}</Link></li><li><Link href="/contact">{c.getQuote}</Link></li><li><Link href="/site-management">Website management</Link></li></ul></div>
        </div>
        <div className="mc-footer-bottom"><span>© 2026 MOMTAZ CHEM. All rights reserved.</span><span><Link href="/privacy">Privacy Policy</Link><i /> <Link href="/terms">Terms of Service</Link></span></div>
      </div></footer>

      <dialog className="mc-modal" ref={modalRef} aria-labelledby="mc-modal-title" onCancel={() => setActiveProductId(null)} onClick={(event) => { if (event.target === modalRef.current) closeProduct(); }} onClose={() => setActiveProductId(null)}>
        <button className="mc-modal-close" type="button" aria-label={detailLabels.close} onClick={closeProduct}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
        {activeProduct && <div className="mc-modal-grid">
          <div className="mc-modal-image"><img src={imageFor(activeProduct.id, activeProduct.asset)} alt={activeProduct.title} /></div>
          <div className="mc-modal-body"><span className="mc-eyebrow mc-eyebrow-dark">{detailLabels.detail}</span><h2 id="mc-modal-title">{activeProduct.title}</h2><p>{activeProduct.long}</p>
            {activeProduct.specs.length > 0 && <><h3>{detailLabels.specifications}</h3><ul className="mc-specs">{activeProduct.specs.map((spec) => <li key={spec}><i className="fa-solid fa-check" aria-hidden="true" /><span>{spec}</span></li>)}</ul></>}
            <h3>{detailLabels.packaging}</h3><div className="mc-packs">{activeProduct.pack.map((packId) => {
              const pack = PACKAGES[packId];
              const linked = packageProductIds.has(packId);
              return <button key={packId} className={`mc-pack ${activeProduct.id === packId ? "current" : ""}`} type="button" disabled={!linked || activeProduct.id === packId} onClick={() => linked && openProduct(packId)} title={pack.description}>
                <span className="mc-pack-icon">{linked ? <img src={imageFor(packId, products.find((item) => item.id === packId)?.asset ?? 9)} alt="" /> : <i className={`fa-solid ${pack.icon}`} aria-hidden="true" />}</span>
                <span><b>{pack.name}</b><small>{pack.capacity}</small></span>
              </button>;
            })}</div>
            <button type="button" className="mc-button mc-button-gold" onClick={() => requestProductQuote(activeProduct.id)}>{detailLabels.request}</button>
          </div>
        </div>}
      </dialog>
    </div>
  );
}
