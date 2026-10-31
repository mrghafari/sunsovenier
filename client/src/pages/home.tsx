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
import "./landing/landing.css";
import "./landing/landing-fonts.css";

type LandingAsset = { url: string; width?: number; height?: number };
const landingAssets = (assets as { images: LandingAsset[] }).images;
const assetUrl = (index: number) => landingAssets[index]?.url ?? "";

const copy = {
  en: {
    navServices: "Services", navProcess: "Process", navFaq: "FAQ", navShop: "Shop", navAccount: "Customer account", language: "Language",
    eyebrow: "MOMTAZ CHEM INDUSTRIAL", heroTitle: "Industrial Chemical Solutions & High-Grade Solvents",
    heroDesc: "At Momtaz Chem, our goal is to provide reliable, high-purity chemical manufacturing and bulk distribution tailored for your industrial operations.",
    learn: "LEARN MORE", contact: "CONTACT US", quoteTitle: "Get A Free Estimate", product: "Choose Chemical / Solvent *", fullName: "Full Name *", email: "Email *", phone: "Phone *", address: "Full Address *", submit: "BOOK SCHEDULE",
    sending: "SENDING…", submitted: "Your request has been sent. Our team will be in touch.", failed: "We couldn’t send your request. Please try again or contact us directly.",
    trusted: "TRUSTED BY", about: "ABOUT US", aboutTitle: "High-Quality Chemical Services & Packaging",
    aboutDesc: "Momtaz Chem provides top-tier chemical manufacturing and standard packaging solutions with an unwavering commitment to quality and safety compliance.", moreAbout: "MORE ABOUT US",
    stats: ["Projects Completed", "Years Of Excellence", "Satisfied Clients"],
    packaging: "PACKAGING OPTIONS", packagingTitle: "Full-Scale Chemical Packaging",
    processEyebrow: "OUR PROCESS", processTitle: "Our Process", faqEyebrow: "SUPPORT", faqTitle: "Frequently Asked Questions",
    faqs: [
      ["What packaging sizes are available?", "We offer 220L steel drums, 1000L IBC tote containers, and 1500L stainless steel storage tanks."],
      ["Do you provide Certificates of Analysis?", "Yes, every chemical shipment includes a full Certificate of Analysis (CoA) and safety data sheets."],
    ],
    process: [
      ["Inspection & Inquiry", "After you contact us, we will analyze your chemical requirements."],
      ["Quality Testing", "Every batch undergoes rigorous lab testing to ensure purity compliance."],
      ["Secure Delivery", "We deliver directly to your industrial site with full documentation."],
    ],
    cards: [
      ["220L Standard Drums", "Heavy-duty steel drums designed for secure transport of liquid solvents and chemical fluids.", "220L Drums"],
      ["1000L IBC Containers", "Intermediate Bulk Containers with high-density polyethylene and steel grid frame.", "1000L IBC"],
      ["1500L Stainless Storage Tank", "Specialized 304L stainless steel heavy-duty chemical storage tanks branded for bulk handling.", "1500L Tanks"],
      ["Agricultural fertilizers", "Nitrogen, Phosphorus, Potassium (NPK)", "Agricultural fertilizers"],
      ["Logistics", "Industrial Packaging & Printing Optimization:", "Logistics"],
      ["Water", "Water is a clear, odorless", "Water"],
    ],
    details: "MORE DETAILS", company: "Company", services: "Services", connect: "Connect", aboutLink: "About Us",
    tagline: "High-grade chemical solutions and bulk solvent distribution.", account: "Customer account", shop: "Online shop", noCategories: "Product categories are temporarily unavailable.",
    requestError: "Please complete the required fields and enter a valid email address.", retry: "Retry", browseProducts: "Browse products", productsWord: "products",
  },
  fa: {
    navServices: "خدمات", navProcess: "مراحل کار", navFaq: "پرسش‌ها", navShop: "فروشگاه", navAccount: "حساب مشتری", language: "زبان",
    eyebrow: "صنایع ممتاز شیمی", heroTitle: "راهکارهای صنعتی مواد شیمیایی و حلال‌های باکیفیت",
    heroDesc: "در ممتاز شیمی، هدف ما تولید قابل‌اعتماد مواد شیمیایی خالص و توزیع عمده متناسب با عملیات صنعتی شماست.",
    learn: "بیشتر بدانید", contact: "تماس با ما", quoteTitle: "دریافت برآورد رایگان", product: "ماده شیمیایی / حلال *", fullName: "نام کامل *", email: "ایمیل *", phone: "تلفن *", address: "نشانی کامل *", submit: "درخواست زمان‌بندی",
    sending: "در حال ارسال…", submitted: "درخواست شما ارسال شد. همکاران ما با شما تماس می‌گیرند.", failed: "ارسال درخواست انجام نشد. دوباره تلاش کنید یا مستقیماً تماس بگیرید.",
    trusted: "مورد اعتماد", about: "درباره ما", aboutTitle: "خدمات و بسته‌بندی باکیفیت مواد شیمیایی",
    aboutDesc: "ممتاز شیمی تولید مواد شیمیایی ممتاز و راهکارهای بسته‌بندی استاندارد را با تعهدی پایدار به کیفیت و رعایت ایمنی ارائه می‌کند.", moreAbout: "درباره ما بیشتر بدانید",
    stats: ["پروژه انجام‌شده", "سال تجربه", "رضایت مشتریان"], packaging: "گزینه‌های بسته‌بندی", packagingTitle: "بسته‌بندی کامل مواد شیمیایی",
    processEyebrow: "فرایند ما", processTitle: "مراحل کار", faqEyebrow: "پشتیبانی", faqTitle: "پرسش‌های متداول",
    faqs: [["چه اندازه‌هایی برای بسته‌بندی موجود است؟", "بشکه فولادی ۲۲۰ لیتری، مخزن IBC هزار لیتری و مخزن استیل ۱۵۰۰ لیتری ارائه می‌کنیم."], ["آیا گواهی آنالیز ارائه می‌دهید؟", "بله، هر محموله شیمیایی همراه با گواهی کامل آنالیز و برگه اطلاعات ایمنی ارسال می‌شود."]],
    process: [["بازبینی و درخواست", "پس از تماس شما، نیازهای شیمیایی‌تان را بررسی می‌کنیم."], ["آزمایش کیفیت", "هر بچ برای اطمینان از خلوص و انطباق، در آزمایشگاه بررسی می‌شود."], ["تحویل ایمن", "محصول را با مستندات کامل مستقیماً به محل صنعتی شما تحویل می‌دهیم."]],
    cards: [["بشکه استاندارد ۲۲۰ لیتری", "بشکه‌های فولادی مقاوم برای حمل ایمن حلال‌ها و مایعات شیمیایی.", "بشکه ۲۲۰ لیتری"], ["مخزن IBC هزار لیتری", "مخزن‌های IBC از پلی‌اتیلن سنگین با قاب شبکه‌ای فولادی.", "IBC هزار لیتری"], ["مخزن استیل ۱۵۰۰ لیتری", "مخازن نگهداری سنگین از استیل 304L برای جابه‌جایی عمده.", "مخزن ۱۵۰۰ لیتری"], ["کودهای کشاورزی", "نیتروژن، فسفر و پتاسیم (NPK)", "کود کشاورزی"], ["لجستیک", "بهینه‌سازی بسته‌بندی و چاپ صنعتی:", "لجستیک"], ["آب", "آب شفاف و بی‌بو", "آب"]],
    details: "جزئیات بیشتر", company: "شرکت", services: "خدمات", connect: "ارتباط", aboutLink: "درباره ما", tagline: "راهکارهای شیمیایی ممتاز و توزیع عمده حلال.", account: "حساب مشتری", shop: "فروشگاه آنلاین", noCategories: "دسته‌بندی محصولات موقتاً در دسترس نیست.",
    requestError: "لطفاً فیلدهای ضروری را تکمیل و ایمیل معتبر وارد کنید.", retry: "تلاش دوباره", browseProducts: "مشاهده محصولات", productsWord: "محصول",
  },
  ar: {
    navServices: "الخدمات", navProcess: "آلية العمل", navFaq: "الأسئلة", navShop: "المتجر", navAccount: "حساب العميل", language: "اللغة",
    eyebrow: "ممتاز كيم للصناعة", heroTitle: "حلول كيميائية صناعية ومذيبات عالية الجودة",
    heroDesc: "في ممتاز كيم، نهدف إلى توفير تصنيع كيميائي موثوق وعالي النقاء وتوزيع بالجملة يناسب عملياتكم الصناعية.",
    learn: "اعرف المزيد", contact: "اتصل بنا", quoteTitle: "احصل على تقدير مجاني", product: "اختر المادة الكيميائية / المذيب *", fullName: "الاسم الكامل *", email: "البريد الإلكتروني *", phone: "الهاتف *", address: "العنوان الكامل *", submit: "احجز موعداً",
    sending: "جارٍ الإرسال…", submitted: "تم إرسال طلبك. سيتواصل فريقنا معك.", failed: "تعذر إرسال الطلب. حاول مجدداً أو تواصل معنا مباشرة.",
    trusted: "موثوقون لدى", about: "من نحن", aboutTitle: "خدمات وتعبئة كيميائية عالية الجودة",
    aboutDesc: "تقدم ممتاز كيم تصنيعاً كيميائياً متميزاً وحلول تعبئة قياسية مع التزام راسخ بالجودة والامتثال للسلامة.", moreAbout: "المزيد عنا",
    stats: ["مشروع منجز", "سنوات من التميز", "عملاء راضون"], packaging: "خيارات التعبئة", packagingTitle: "تعبئة كيميائية متكاملة",
    processEyebrow: "آلية العمل", processTitle: "آلية العمل", faqEyebrow: "الدعم", faqTitle: "الأسئلة الشائعة",
    faqs: [["ما أحجام التعبئة المتوفرة؟", "نوفر براميل فولاذية 220 لتر، وحاويات IBC سعة 1000 لتر، وخزانات تخزين من الفولاذ المقاوم للصدأ سعة 1500 لتر."], ["هل توفرون شهادات التحليل؟", "نعم، تتضمن كل شحنة كيميائية شهادة تحليل كاملة ونشرات بيانات السلامة."]],
    process: [["الفحص والاستفسار", "بعد تواصلكم معنا، نحلل متطلباتكم الكيميائية."], ["اختبار الجودة", "تخضع كل دفعة لاختبارات مخبرية دقيقة لضمان مطابقة النقاء."], ["تسليم آمن", "نوصل مباشرة إلى موقعكم الصناعي مع الوثائق الكاملة."]],
    cards: [["براميل قياسية 220 لتر", "براميل فولاذية شديدة التحمل لنقل المذيبات والسوائل الكيميائية بأمان.", "براميل 220 لتر"], ["حاويات IBC سعة 1000 لتر", "حاويات IBC من البولي إيثيلين عالي الكثافة بإطار شبكي فولاذي.", "IBC 1000 لتر"], ["خزان تخزين مقاوم للصدأ 1500 لتر", "خزانات كيميائية متينة من الفولاذ المقاوم للصدأ 304L للتعامل بالجملة.", "خزانات 1500 لتر"], ["أسمدة زراعية", "النيتروجين والفوسفور والبوتاسيوم (NPK)", "الأسمدة الزراعية"], ["الخدمات اللوجستية", "تحسين التعبئة والطباعة الصناعية:", "الخدمات اللوجستية"], ["المياه", "الماء صافٍ وعديم الرائحة", "المياه"]],
    details: "مزيد من التفاصيل", company: "الشركة", services: "الخدمات", connect: "تواصل", aboutLink: "من نحن", tagline: "حلول كيميائية عالية الجودة وتوزيع المذيبات بالجملة.", account: "حساب العميل", shop: "المتجر الإلكتروني", noCategories: "فئات المنتجات غير متاحة مؤقتاً.",
    requestError: "يرجى إكمال الحقول المطلوبة وإدخال بريد إلكتروني صالح.", retry: "إعادة المحاولة", browseProducts: "تصفح المنتجات", productsWord: "منتجات",
  },
  tr: {
    navServices: "Hizmetler", navProcess: "Süreç", navFaq: "SSS", navShop: "Mağaza", navAccount: "Müşteri hesabı", language: "Dil",
    eyebrow: "MOMTAZ CHEM ENDÜSTRİ", heroTitle: "Endüstriyel Kimyasal Çözümler ve Yüksek Kaliteli Solventler",
    heroDesc: "Momtaz Chem olarak hedefimiz, endüstriyel operasyonlarınıza özel güvenilir, yüksek saflıkta kimyasal üretimi ve toplu dağıtım sağlamaktır.",
    learn: "DAHA FAZLA BİLGİ", contact: "BİZE ULAŞIN", quoteTitle: "Ücretsiz Teklif Alın", product: "Kimyasal / Solvent Seçin *", fullName: "Ad Soyad *", email: "E-posta *", phone: "Telefon *", address: "Tam Adres *", submit: "RANDEVU AL",
    sending: "GÖNDERİLİYOR…", submitted: "Talebiniz gönderildi. Ekibimiz sizinle iletişime geçecek.", failed: "Talebiniz gönderilemedi. Yeniden deneyin veya doğrudan bize ulaşın.",
    trusted: "GÜVENİLİR", about: "HAKKIMIZDA", aboutTitle: "Yüksek Kaliteli Kimyasal Hizmetler ve Ambalaj",
    aboutDesc: "Momtaz Chem, kalite ve güvenlik standartlarına sarsılmaz bağlılıkla üst düzey kimyasal üretim ve standart ambalaj çözümleri sunar.", moreAbout: "HAKKIMIZDA DAHA FAZLA",
    stats: ["Tamamlanan Proje", "Yıllık Deneyim", "Memnun Müşteri"], packaging: "AMBALAJ SEÇENEKLERİ", packagingTitle: "Kapsamlı Kimyasal Ambalaj",
    processEyebrow: "SÜRECİMİZ", processTitle: "Sürecimiz", faqEyebrow: "DESTEK", faqTitle: "Sık Sorulan Sorular",
    faqs: [["Hangi ambalaj boyutları mevcut?", "220L çelik varil, 1000L IBC konteyner ve 1500L paslanmaz çelik depolama tankı sunuyoruz."], ["Analiz Sertifikası sağlıyor musunuz?", "Evet, her kimyasal sevkiyatında tam Analiz Sertifikası ve güvenlik bilgi formları bulunur."]],
    process: [["İnceleme ve Talep", "Bizimle iletişime geçtikten sonra kimyasal gereksinimlerinizi analiz ederiz."], ["Kalite Testi", "Saflık uyumluluğunu doğrulamak için her parti titiz laboratuvar testlerinden geçer."], ["Güvenli Teslimat", "Tam belgelerle doğrudan endüstriyel tesisinize teslimat yaparız."]],
    cards: [["220L Standart Variller", "Sıvı solventlerin ve kimyasal akışkanların güvenli taşınması için ağır hizmet tipi çelik variller.", "220L Variller"], ["1000L IBC Konteynerler", "Yüksek yoğunluklu polietilen ve çelik kafes çerçeveli IBC konteynerler.", "1000L IBC"], ["1500L Paslanmaz Depolama Tankı", "Toplu taşıma için 304L paslanmaz çelikten özel ağır hizmet kimyasal tankları.", "1500L Tanklar"], ["Tarımsal gübreler", "Azot, Fosfor, Potasyum (NPK)", "Tarımsal gübreler"], ["Lojistik", "Endüstriyel Ambalaj ve Baskı Optimizasyonu:", "Lojistik"], ["Su", "Su berrak ve kokusuzdur", "Su"]],
    details: "AYRINTILAR", company: "Şirket", services: "Hizmetler", connect: "İletişim", aboutLink: "Hakkımızda", tagline: "Yüksek kaliteli kimyasal çözümler ve toplu solvent dağıtımı.", account: "Müşteri hesabı", shop: "Çevrimiçi mağaza", noCategories: "Ürün kategorileri geçici olarak kullanılamıyor.",
    requestError: "Lütfen gerekli alanları doldurun ve geçerli bir e-posta girin.", retry: "Yeniden dene", browseProducts: "Ürünlere göz at", productsWord: "ürün",
  },
};

const sliderImages = [assetUrl(0), assetUrl(1), assetUrl(2)];
const staticCards = [4, 5, 6, 7, 8, 9];
const languageNames: Record<string, string> = { en: "English", fa: "فارسی", ar: "العربية", tr: "Türkçe" };

export default function Home() {
  const { language, setLanguage, direction } = useLanguage();
  const { isAuthenticated } = useAuth();
  const c = copy[language as keyof typeof copy] ?? copy.en;
  const [slide, setSlide] = useState(2);
  const slideRef = useRef(slide);
  slideRef.current = slide;
  const loadedHeroSlidesRef = useRef(new Set<number>([2]));
  const pendingHeroLoadsRef = useRef(new Map<number, Promise<boolean>>());
  const [loadedHeroSlides, setLoadedHeroSlides] = useState<number[]>([2]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({});
  const previewUrls = useRef(new Map<string, string>());
  const previewCardId = useRef(0);
  const [previewCards, setPreviewCards] = useState<{ id: number; title: string; description: string; image: string }[]>([]);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDescription, setNewCardDescription] = useState("");
  const [managerMessage, setManagerMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [formError, setFormError] = useState("");
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
  const products = Array.isArray(productsResponse) ? productsResponse : [];
  const categoryCounts = useMemo(() => {
    const result: Record<string, number> = {};
    products.forEach((product) => { result[product.category] = (result[product.category] ?? 0) + 1; });
    return result;
  }, [products]);
  const categorySamples = useMemo(() => {
    const result: Record<string, string[]> = {};
    products.forEach((product) => {
      if (!result[product.category]) result[product.category] = [];
      if (result[product.category].length < 2) result[product.category].push(product.name);
    });
    return result;
  }, [products]);

  const ensureHeroSlideLoaded = useCallback((index: number): Promise<boolean> => {
    if (loadedHeroSlidesRef.current.has(index)) return Promise.resolve(true);
    const pending = pendingHeroLoadsRef.current.get(index);
    if (pending) return pending;
    const promise = new Promise<boolean>((resolve) => {
      const image = new Image();
      image.onload = () => {
        loadedHeroSlidesRef.current.add(index);
        setLoadedHeroSlides((loaded) => loaded.includes(index) ? loaded : [...loaded, index]);
        resolve(true);
      };
      image.onerror = () => resolve(false);
      image.src = assetUrl(index);
    }).finally(() => pendingHeroLoadsRef.current.delete(index));
    pendingHeroLoadsRef.current.set(index, promise);
    return promise;
  }, []);

  function setLocalImage(key: string, file?: File) {
    if (file && !file.type.startsWith("image/")) {
      setManagerMessage("Please choose an image file.");
      return;
    }
    const previousUrl = previewUrls.current.get(key);
    if (previousUrl) {
      URL.revokeObjectURL(previousUrl);
      previewUrls.current.delete(key);
    }
    if (!file) {
      setPreviewImages((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      return;
    }
    const url = URL.createObjectURL(file);
    previewUrls.current.set(key, url);
    setPreviewImages((current) => ({ ...current, [key]: url }));
    setManagerMessage("Local preview updated. Nothing has been saved.");
  }

  function handlePreviewImage(key: string, event: ChangeEvent<HTMLInputElement>) {
    setLocalImage(key, event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  function addPreviewCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("newCategoryImage");
    const id = ++previewCardId.current;
    let image = assetUrl(9);
    if (file instanceof File && file.size > 0) {
      if (!file.type.startsWith("image/")) {
        setManagerMessage("Please choose an image file.");
        return;
      }
      image = URL.createObjectURL(file);
      previewUrls.current.set(`preview-card-${id}`, image);
    }
    setPreviewCards((cards) => [...cards, {
      id,
      title: newCardTitle.trim() || "New Category Tank",
      description: newCardDescription.trim() || "High purity chemical storage container.",
      image,
    }]);
    setNewCardTitle("");
    setNewCardDescription("");
    form.reset();
    setManagerMessage("Preview card added locally. Nothing has been saved.");
  }

  function resetLocalPreviews() {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
    setPreviewImages({});
    setPreviewCards([]);
    setSlide(2);
    setNewCardTitle("");
    setNewCardDescription("");
    setManagerMessage("Local previews reset to the supplied original images.");
  }

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  }, []);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timeout: number | undefined;
    let active = true;
    let idleTimer: number | undefined;
    const stop = () => { if (timeout !== undefined) window.clearTimeout(timeout); };
    const advance = async () => {
      if (!active || document.visibilityState !== "visible" || motionPreference.matches) return;
      const next = (slideRef.current + 1) % sliderImages.length;
      const ready = await ensureHeroSlideLoaded(next);
      if (!active) return;
      if (document.visibilityState !== "visible" || motionPreference.matches) {
        schedule();
        return;
      }
      if (ready) setSlide(next);
      schedule();
    };
    const schedule = () => {
      stop();
      if (active && document.visibilityState === "visible" && !motionPreference.matches) {
        timeout = window.setTimeout(advance, 4000);
      }
    };
    const firstPaint = window.requestAnimationFrame(() => {
      void ensureHeroSlideLoaded(0);
      idleTimer = window.setTimeout(() => { void ensureHeroSlideLoaded(1); }, 1200);
      schedule();
    });
    document.addEventListener("visibilitychange", schedule);
    motionPreference.addEventListener?.("change", schedule);
    return () => {
      active = false;
      stop();
      window.cancelAnimationFrame(firstPaint);
      if (idleTimer !== undefined) window.clearTimeout(idleTimer);
      document.removeEventListener("visibilitychange", schedule);
      motionPreference.removeEventListener?.("change", schedule);
    };
  }, [ensureHeroSlideLoaded]);

  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>(".mc-landing .mc-reveal");
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    document.documentElement.classList.add("mc-reveal-ready");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("is-visible", entry.isIntersecting));
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    nodes.forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("mc-reveal-ready");
      nodes.forEach((node) => node.classList.add("is-visible"));
    };
  }, []);

  async function submitEstimate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("sending");
    setFormError("");
    const data = new FormData(form);
    const fullName = String(data.get("fullName") ?? "").trim();
    const [firstName, ...rest] = fullName.split(/\s+/);
    const phone = String(data.get("phone") ?? "").trim();
    const address = String(data.get("address") ?? "").trim();
    const productInterest = String(data.get("productInterest") ?? "").trim();
    const message = `Estimate request — ${productInterest}. Phone: ${phone}. Address: ${address}.`;
    if (!form.checkValidity() || !firstName || !data.get("email") || !phone || !address || !productInterest) {
      setStatus("error");
      setFormError(c.requestError);
      return;
    }
    try {
      await apiRequest("/api/contact", {
        method: "POST",
        body: { firstName, lastName: rest.join(" "), email: String(data.get("email")), company: "", productInterest, message },
      });
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setFormError(c.failed);
    }
  }

  const linkTo = (path: string) => path;

  return (
    <div className="mc-landing" dir={direction}>
      <OpenGraphTags title={language === "fa" ? "ممتازکم | راهکارهای شیمیایی صنعتی" : "Momtaz Chem | Industrial Chemical Solutions"} description="Reliable, high-purity chemical manufacturing and bulk distribution for industrial operations." type="website" image="https://momtazchem.com/og-home.jpg" locale="en_US" />
      <CanonicalUrl path="/" />
      {isAuthenticated && <div className="mc-manager">
        <div className="mc-manager-bar">
          <span><i className="fa-solid fa-sliders" aria-hidden="true" /> WEBSITE DYNAMIC MANAGER PANEL <small>LOCAL PREVIEW ONLY · NOT SAVED</small></span>
          <button type="button" aria-expanded={managerOpen} aria-controls="mc-manager-panel" onClick={() => setManagerOpen((open) => !open)}><i className={`fa-solid ${managerOpen ? "fa-xmark" : "fa-gear"}`} aria-hidden="true" /> {managerOpen ? "Close panel" : "Open admin panel"}</button>
        </div>
        {managerOpen && <section className="mc-manager-panel" id="mc-manager-panel" aria-label="Local-only website image previews">
          <p className="mc-manager-note">LOCAL PREVIEW ONLY — Image changes and new cards exist only in this browser session. They are not uploaded, shared, or saved. Reset restores the original supplied images.</p>
          <h2>1. Change Hero Background Slides</h2>
          <div className="mc-manager-grid">
            {[0, 1, 2].map((index) => {
              const key = `hero-${index}`;
              return <label className="mc-manager-field" key={key}>Slide Image #{index + 1}<input type="file" accept="image/*" onChange={(event) => handlePreviewImage(key, event)} /><img src={previewImages[key] ?? assetUrl(index)} alt={`Slide ${index + 1} current preview`} /></label>;
            })}
          </div>
          <h2>2. Change Packaging / Tank Sizes Images</h2>
          <div className="mc-manager-grid">
            {[["pack-220l", "220L Steel Drum Image", 4], ["pack-1000l", "1000L IBC Tank Image", 5], ["pack-1500l", "1500L Storage Tank Image", 6]].map(([key, label, imageIndex]) => (
              <label className="mc-manager-field" key={key as string}>{label as string}<input type="file" accept="image/*" onChange={(event) => handlePreviewImage(key as string, event)} /><img src={previewImages[key as string] ?? assetUrl(imageIndex as number)} alt={`${label} current preview`} /></label>
            ))}
          </div>
          <h2>3. Change About Us Image</h2>
          <div className="mc-manager-grid">
            <label className="mc-manager-field">About Us Image<input type="file" accept="image/*" onChange={(event) => handlePreviewImage("about", event)} /><img src={previewImages.about ?? assetUrl(3)} alt="About us current preview" /></label>
          </div>
          <h2>4. Add New Category Card</h2>
          <form className="mc-manager-add-form" onSubmit={addPreviewCard}>
            <label className="mc-manager-field">Category Title<input type="text" value={newCardTitle} onChange={(event) => setNewCardTitle(event.target.value)} placeholder="e.g., 2000L Tank" /></label>
            <label className="mc-manager-field">Description<input type="text" value={newCardDescription} onChange={(event) => setNewCardDescription(event.target.value)} placeholder="Chemical specs..." /></label>
            <label className="mc-manager-field">Upload Image<input type="file" name="newCategoryImage" accept="image/*" /></label>
            <button type="submit" className="mc-manager-add"><i className="fa-solid fa-plus" aria-hidden="true" /> Add Category Card Preview</button>
          </form>
          <div className="mc-manager-actions"><p role="status" aria-live="polite">{managerMessage}</p><button type="button" onClick={resetLocalPreviews}>Reset local previews</button></div>
        </section>}
      </div>}
      <header className="mc-header">
        <div className="mc-container mc-nav">
          <Link href="/" className="mc-logo" aria-label="Momtaz Chem home"><i className="fa-solid fa-flask" aria-hidden="true" /> <span>MOMTAZ<span>CHEM</span></span></Link>
          <nav className={`mc-nav-links ${mobileMenu ? "is-open" : ""}`} aria-label="Main navigation">
            <a href="#services" onClick={() => setMobileMenu(false)}>{c.navServices}</a>
            <a href="#process" onClick={() => setMobileMenu(false)}>{c.navProcess}</a>
            <a href="#faq" onClick={() => setMobileMenu(false)}>{c.navFaq}</a>
            <Link href="/shop" onClick={() => setMobileMenu(false)}>{c.navShop}</Link>
            <Link href="/customer/login" onClick={() => setMobileMenu(false)}>{c.navAccount}</Link>
          </nav>
          <div className="mc-nav-actions">
            <label className="mc-language" aria-label={c.language}>
              <i className="fa-solid fa-globe" aria-hidden="true" />
              <select value={language} onChange={(event) => setLanguage(event.target.value as "en" | "fa" | "ar" | "tr")} aria-label={c.language}>
                {Object.entries(languageNames).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
              <i className="fa-solid fa-chevron-down mc-chevron" aria-hidden="true" />
            </label>
            <a className="mc-phone" href="tel:+9647500000000"><i className="fa-solid fa-phone" aria-hidden="true" /><span>+964 (750) 000-0000</span></a>
            <button className="mc-menu-toggle" type="button" aria-label={mobileMenu ? "Close menu" : "Open menu"} aria-expanded={mobileMenu} onClick={() => setMobileMenu((value) => !value)}><i className={`fa-solid ${mobileMenu ? "fa-xmark" : "fa-bars"}`} aria-hidden="true" /></button>
          </div>
        </div>
      </header>

      <section className="mc-hero">
        <div className="mc-hero-slider" aria-hidden="true">
          {sliderImages.map((image, index) => {
            const displayedImage = previewImages[`hero-${index}`] ?? (loadedHeroSlides.includes(index) ? image : "");
            return <div className={`mc-hero-slide ${slide === index ? "is-active" : ""}`} key={image || index} style={{ backgroundImage: displayedImage ? `url("${displayedImage}")` : undefined }} />;
          })}
        </div>
        <div className="mc-hero-overlay" />
        <div className="mc-container mc-hero-grid">
          <div className="mc-hero-copy mc-reveal mc-from-left">
            <span className="mc-eyebrow">{c.eyebrow}</span>
            <h1>{c.heroTitle}</h1>
            <p>{c.heroDesc}</p>
            <div className="mc-hero-buttons"><a className="mc-button mc-button-gold" href="#services">{c.learn}</a><Link className="mc-button mc-button-outline" href="/contact">{c.contact}</Link></div>
            <div className="mc-slide-dots" aria-label="Hero slides">
              {sliderImages.map((_, index) => <button key={index} type="button" aria-label={`Show slide ${index + 1}`} aria-pressed={slide === index} onClick={async () => { const ready = await ensureHeroSlideLoaded(index); if (ready) setSlide(index); }} />)}
            </div>
          </div>
          <div className="mc-estimate-card mc-reveal mc-from-right">
            <h2>{c.quoteTitle}</h2>
            <form onSubmit={submitEstimate} noValidate>
              <label className="mc-sr-only" htmlFor="mc-product">{c.product}</label>
              <select id="mc-product" name="productInterest" className="mc-control" defaultValue="" required>
                <option value="" disabled>{c.product}</option><option value="Petroleum Solvents">Petroleum Solvents</option><option value="Industrial Polymers">Industrial Polymers</option>
              </select>
              <label className="mc-sr-only" htmlFor="mc-name">{c.fullName}</label>
              <input id="mc-name" className="mc-control" name="fullName" autoComplete="name" placeholder={c.fullName} required />
              <label className="mc-sr-only" htmlFor="mc-email">{c.email}</label>
              <input id="mc-email" className="mc-control" type="email" name="email" autoComplete="email" placeholder={c.email} required />
              <label className="mc-sr-only" htmlFor="mc-phone">{c.phone}</label>
              <input id="mc-phone" className="mc-control" type="tel" name="phone" autoComplete="tel" placeholder={c.phone} required />
              <label className="mc-sr-only" htmlFor="mc-address">{c.address}</label>
              <input id="mc-address" className="mc-control" name="address" autoComplete="street-address" placeholder={c.address} required />
              <button className="mc-button mc-submit" type="submit" disabled={status === "sending"}>{status === "sending" ? c.sending : c.submit}</button>
              <p className={`mc-form-feedback ${status}`} role="status" aria-live="polite">{status === "success" ? c.submitted : status === "error" ? formError : ""}</p>
            </form>
            <div className="mc-rating"><span><i className="fa-brands fa-google mc-google-mark" aria-hidden="true" /> 5.0 Google Rating</span><span className="mc-stars" aria-label="5 stars"><i className="fa-solid fa-star" /><i className="fa-solid fa-star" /><i className="fa-solid fa-star" /><i className="fa-solid fa-star" /><i className="fa-solid fa-star" /></span></div>
          </div>
        </div>
      </section>
      <section className="mc-trusted">
        <div className="mc-container mc-trusted-row mc-reveal mc-scale"><span>{c.trusted}</span><div><i className="fa-solid fa-industry" /><i className="fa-solid fa-vial-circle-check" /><i className="fa-solid fa-shield-halved" /><i className="fa-solid fa-truck-fast" /></div></div>
      </section>

      <section className="mc-about" id="about">
        <div className="mc-container">
          <div className="mc-about-grid">
            <div className="mc-about-image mc-reveal mc-from-left"><img src={previewImages.about ?? assetUrl(3)} alt="Momtaz Chem industrial facility" loading="lazy" /></div>
            <div className="mc-about-copy mc-reveal mc-from-right">
              <span className="mc-eyebrow mc-eyebrow-dark">{c.about}</span><h2>{c.aboutTitle}</h2>
              <p>{c.aboutDesc}</p><Link className="mc-button mc-button-dark" href="/about">{c.moreAbout}</Link>
            </div>
          </div>
          <div className="mc-stats mc-reveal">
            {[["500+", c.stats[0]], ["10+", c.stats[1]], ["100%", c.stats[2]]].map(([value, label]) => <div key={value}><strong>{value}</strong><span>{label}</span></div>)}
          </div>
        </div>
      </section>

      <section className="mc-services" id="services">
        <div className="mc-container">
          <div className="mc-section-heading mc-reveal"><div><span className="mc-eyebrow">{c.packaging}</span><h2>{c.packagingTitle}</h2></div><Link href="/shop" className="mc-text-link">{c.shop}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></div>
          {isLoading ? <div className="mc-category-row" aria-label="Loading product categories">{[0, 1, 2].map((item) => <div className="mc-category-skeleton" key={item} />)}</div> : isError ? <div className="mc-category-error"><p>{c.noCategories}</p><button type="button" onClick={() => refetch()}>{c.retry}</button></div> : categories.length > 0 ? <div className="mc-category-row" aria-label="Shop product categories">
            {categories.slice(0, 8).map((category) => {
              const slug = category.slug || category.name.toLowerCase().replace(/\s+/g, "-");
              const count = categoryCounts[category.name] ?? 0;
              const faCategoryNames: Record<string, string> = { "fuel-additives": "افزودنی‌های سوخت", "water-treatment": "تصفیه آب", "paint-thinner": "رنگ و تینر", "paint-solvents": "حلال‌های رنگ", "agricultural-fertilizers": "کودهای کشاورزی", "industrial-chemicals": "مواد شیمیایی صنعتی", "technical-equipment": "تجهیزات فنی", "commercial-goods": "کالاهای تجاری" };
              const categoryName = language === "fa" ? faCategoryNames[slug] ?? category.name : category.name;
              const routes = ["fuel-additives", "water-treatment", "paint-thinner", "paint-solvents", "agricultural-fertilizers", "industrial-chemicals", "technical-equipment", "commercial-goods", "other"];
              const categoryHref = routes.includes(slug) ? `/products/${slug}` : "/products";
              return <Link className="mc-category-link" key={category.id} href={linkTo(categoryHref)}><span>{categoryName}</span><small>{count} {c.productsWord}</small>{categorySamples[category.name]?.length ? <small className="mc-category-samples">{categorySamples[category.name].join(" · ")}</small> : null}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>;
            })}
          </div> : <div className="mc-category-empty"><span>{c.noCategories}</span><Link href="/products">{c.browseProducts} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></div>}
          <div className="mc-services-grid">
            {staticCards.map((assetIndex, index) => {
              const [title, description, categoryLabel] = c.cards[index];
              const packagingKey = index < 3 ? `pack-${["220l", "1000l", "1500l"][index]}` : "";
              return <article className={`mc-service-card mc-reveal mc-delay-${Math.min(index % 3 + 1, 3)}`} key={title}>
                <div className="mc-service-image"><img src={previewImages[packagingKey] ?? assetUrl(assetIndex)} alt={categoryLabel} loading="lazy" /></div>
                <div className="mc-service-body"><h3>{title}</h3><p>{description}</p><Link href={index < 3 ? "/shop" : index === 3 ? "/products/agricultural-fertilizers" : index === 4 ? "/services" : "/products/water-treatment"} className="mc-detail-link">{c.details}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></div>
              </article>;
            })}
            {previewCards.map((card) => <article className="mc-service-card mc-reveal is-visible is-local-preview" key={`preview-${card.id}`}>
              <div className="mc-service-image"><img src={card.image} alt={card.title} /></div>
              <div className="mc-service-body"><h3>{card.title}</h3><p>{card.description}</p><Link href="/shop" className="mc-detail-link">{c.details}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link><span className="mc-preview-card-tag">LOCAL PREVIEW</span></div>
            </article>)}
          </div>
        </div>
      </section>

      <section className="mc-process" id="process">
        <div className="mc-container"><div className="mc-reveal"><span className="mc-eyebrow mc-eyebrow-dark">{c.processEyebrow}</span><h2 className="mc-section-title">{c.processTitle}</h2></div>
          <div className="mc-process-grid">{c.process.map(([title, description], index) => <article className={`mc-process-card mc-reveal mc-delay-${index + 1}`} key={title}><span className="mc-process-number">0{index + 1}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
        </div>
      </section>

      <section className="mc-faq" id="faq">
        <div className="mc-container mc-reveal"><span className="mc-eyebrow mc-eyebrow-dark">{c.faqEyebrow}</span><h2 className="mc-section-title">{c.faqTitle}</h2>
          <div className="mc-faq-list">{c.faqs.map(([question, answer], index) => <div className={`mc-faq-item ${openFaq === index ? "is-open" : ""}`} key={question}>
            <h3><button className="mc-faq-toggle" type="button" aria-expanded={openFaq === index} aria-controls={`mc-faq-${index}`} onClick={() => setOpenFaq((current) => current === index ? null : index)}>{question}<i className="fa-solid fa-plus" aria-hidden="true" /></button></h3>
            <div className="mc-faq-answer" id={`mc-faq-${index}`} hidden={openFaq !== index}><p>{answer}</p></div>
          </div>)}</div>
        </div>
      </section>

      <footer className="mc-footer">
        <div className="mc-container">
          <div className="mc-footer-grid">
            <div><Link href="/" className="mc-logo"><i className="fa-solid fa-flask" aria-hidden="true" /><span>MOMTAZ<span>CHEM</span></span></Link><p className="mc-footer-tagline">{c.tagline}</p><Link className="mc-footer-cta" href="/shop">{c.shop}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></div>
            <div><h3>{c.company}</h3><ul><li><Link href="/about">{c.aboutLink}</Link></li><li><Link href="/services">{c.services}</Link></li><li><Link href="/contact">{c.contact}</Link></li></ul></div>
            <div><h3>{c.services}</h3><ul><li><a href="#services">{c.cards[0][2]}</a></li><li><a href="#services">{c.cards[1][2]}</a></li><li><a href="#services">{c.cards[2][2]}</a></li></ul></div>
            <div><h3>{c.connect}</h3><ul><li><Link href="/customer/login">{c.account}</Link></li><li><Link href="/shop">{c.shop}</Link></li><li><Link href="/contact">{c.contact}</Link></li><li><Link href="/site-management">Website management</Link></li></ul></div>
          </div>
          <div className="mc-footer-bottom"><span>© 2026 MOMTAZ CHEM. All rights reserved.</span><span><Link href="/privacy">Privacy Policy</Link><i /> <Link href="/terms">Terms of Service</Link></span></div>
        </div>
      </footer>
    </div>
  );
}
