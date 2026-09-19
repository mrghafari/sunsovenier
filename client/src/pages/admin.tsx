import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User, Package } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/lib/i18n";

type TimePeriod = "morning" | "afternoon" | "evening" | "night";

type AdminModuleTranslation = {
  key: string;
  title: string;
  description: string;
};

type AdminTranslation = {
  adminLabel: string;
  greetings: Record<TimePeriod, string>;
  motivations: Record<TimePeriod, string>;
  administrativeDashboard: string;
  dashboardDescription: string;
  siteManagement: string;
  welcomeTitle: string;
  welcomeDescription: (moduleCount: number) => string;
  suiteTitle: (moduleCount: number) => string;
  modules: readonly AdminModuleTranslation[];
  enterpriseFeatures: string;
  logout: string;
  usernameFallback: string;
  loading: string;
  fallback: string;
};

const adminTranslations: Record<Language, AdminTranslation> = {
  en: {
    adminLabel: "Administrator",
    greetings: {
      morning: "Good morning",
      afternoon: "Good afternoon",
      evening: "Good evening",
      night: "Good night",
    },
    motivations: {
      morning: "Ready to tackle a new day of management?",
      afternoon: "Keep up the excellent work today!",
      evening: "Your management center awaits",
      night: "Your management center is ready whenever you are",
    },
    administrativeDashboard: "Administrative Dashboard",
    dashboardDescription: "Centralized management and system controls",
    siteManagement: "Site Management",
    welcomeTitle: "Welcome to Comprehensive Site Management System",
    welcomeDescription: (moduleCount) =>
      `Access the complete enterprise-grade administrative platform featuring ${moduleCount} integrated modules for full business operations management. This centralized system provides comprehensive control over all aspects of your chemical solutions business - from production to customer delivery.`,
    suiteTitle: (moduleCount) => `Complete ${moduleCount}-Module Administrative Suite:`,
    modules: [
      { key: "syncing_shop", title: "Syncing Shop", description: "Kardex/Shop synchronization" },
      { key: "inquiries", title: "Inquiries", description: "Customer inquiry & response management" },
      { key: "barcode", title: "Barcode", description: "GS1-compliant EAN-13 generation" },
      { key: "email_settings", title: "Email Settings", description: "Multi-SMTP with 8 department routing" },
      { key: "database_backup", title: "Database Backup", description: "PostgreSQL maintenance & migration" },
      { key: "crm", title: "CRM", description: "Customer relationship & analytics" },
      { key: "seo", title: "SEO", description: "4-language optimization & sitemaps" },
      { key: "categories", title: "Categories", description: "Hierarchical product classification" },
      { key: "sms", title: "SMS", description: "Multilingual customer notifications" },
      { key: "whatsapp_crm", title: "WhatsApp CRM", description: "Customer communication & bulk messaging" },
      { key: "factory", title: "Factory", description: "Production line management" },
      { key: "user_management", title: "User Management", description: "Role-based access control" },
      { key: "shop_management", title: "Shop", description: "E-commerce & inventory administration" },
      { key: "procedures", title: "Procedures", description: "Document & method management" },
      { key: "order_management", title: "Order Management", description: "3-department workflow system" },
      { key: "product_management", title: "Products", description: "Showcase & shop catalog management" },
      { key: "payment_management", title: "Payment Settings", description: "Iraqi banking integration" },
      { key: "finance", title: "Financial Approval", description: "Financial order management & approvals" },
      { key: "wallet_management", title: "Wallet Management", description: "Digital wallet & recharge system" },
      { key: "geography_analytics", title: "Geography Analytics", description: "Regional performance & GPS tracking" },
      { key: "ai_settings", title: "AI Settings", description: "Smart SKU generation & recommendations" },
      { key: "refresh_control", title: "Refresh Control", description: "Centralized timing management" },
      { key: "content_management", title: "Content Management", description: "430+ multilingual content items" },
      { key: "warehouse_management", title: "Warehouse Management", description: "Unified inventory & goods tracking" },
      { key: "logistics_management", title: "Logistics Management", description: "Delivery coordination & verification" },
      { key: "ticketing_system", title: "Ticketing System", description: "Support ticket management" },
      { key: "remote_desktop", title: "Remote Desktop", description: "RustDesk international support" },
      { key: "server_config", title: "Server Config", description: "Production migration & hosting" },
      { key: "aws_s3_settings", title: "AWS S3 Settings", description: "Cloud storage configuration & management" },
      { key: "reports_analytics", title: "Reports Analytics", description: "Advanced business intelligence & KPIs" },
      { key: "security_management", title: "Security Management", description: "Access control & audit trails" },
      { key: "notification_center", title: "Notification Center", description: "System alerts & communication hub" },
      { key: "system_monitoring", title: "System Monitoring", description: "Performance metrics & health checks" },
      { key: "api_management", title: "API Management", description: "External integrations & endpoints" },
      { key: "integration_hub", title: "Integration Hub", description: "Third-party service connections" },
      { key: "vendor_accounting", title: "Vendor Accounting", description: "Vendor sales, commissions & payments" },
    ],
    enterpriseFeatures:
      "🚀 Enterprise Features: Multi-language support (English, Arabic, Kurdish, Turkish), AI-powered automation, comprehensive email routing, GPS delivery tracking, and complete business workflow management - all unified in one powerful platform.",
    logout: "Logout",
    usernameFallback: "Administrator",
    loading: "Loading administrative dashboard…",
    fallback: "Showing translated administrative dashboard defaults.",
  },
  fa: {
    adminLabel: "مدیر",
    greetings: {
      morning: "صبح بخیر",
      afternoon: "ظهر بخیر",
      evening: "عصر بخیر",
      night: "شب بخیر",
    },
    motivations: {
      morning: "برای شروع یک روز جدید مدیریت آماده‌اید؟",
      afternoon: "به کار عالی امروز ادامه دهید!",
      evening: "مرکز مدیریت شما آماده است",
      night: "مرکز مدیریت شما هر زمان آماده خدمت است",
    },
    administrativeDashboard: "داشبورد مدیریت",
    dashboardDescription: "مدیریت متمرکز و کنترل‌های سیستم",
    siteManagement: "مدیریت سایت",
    welcomeTitle: "به سامانه جامع مدیریت سایت خوش آمدید",
    welcomeDescription: (moduleCount) =>
      `به پلتفرم مدیریتی سازمانی کامل با ${moduleCount} ماژول یکپارچه برای مدیریت همه عملیات کسب‌وکار دسترسی دارید. این سامانه متمرکز، کنترل جامعی بر تمام بخش‌های کسب‌وکار راهکارهای شیمیایی شما، از تولید تا تحویل به مشتری، فراهم می‌کند.`,
    suiteTitle: (moduleCount) => `مجموعه مدیریتی کامل ${moduleCount} ماژولی:`,
    modules: [
      { key: "syncing_shop", title: "همگام‌سازی فروشگاه", description: "همگام‌سازی کاردکس و فروشگاه" },
      { key: "inquiries", title: "درخواست‌ها", description: "مدیریت پرسش‌ها و پاسخ‌های مشتریان" },
      { key: "barcode", title: "بارکد", description: "تولید EAN-13 سازگار با GS1" },
      { key: "email_settings", title: "تنظیمات ایمیل", description: "چند SMTP با مسیریابی برای ۸ واحد" },
      { key: "database_backup", title: "پشتیبان‌گیری پایگاه داده", description: "نگهداری و مهاجرت PostgreSQL" },
      { key: "crm", title: "CRM", description: "ارتباط با مشتری و تحلیل داده‌ها" },
      { key: "seo", title: "سئو", description: "بهینه‌سازی چهارزبانه و نقشه‌های سایت" },
      { key: "categories", title: "دسته‌بندی‌ها", description: "طبقه‌بندی سلسله‌مراتبی محصولات" },
      { key: "sms", title: "پیامک", description: "اعلان‌های چندزبانه مشتریان" },
      { key: "whatsapp_crm", title: "CRM واتساپ", description: "ارتباط با مشتری و ارسال پیام گروهی" },
      { key: "factory", title: "کارخانه", description: "مدیریت خطوط تولید" },
      { key: "user_management", title: "مدیریت کاربران", description: "کنترل دسترسی مبتنی بر نقش" },
      { key: "shop_management", title: "فروشگاه", description: "مدیریت تجارت الکترونیک و موجودی" },
      { key: "procedures", title: "رویه‌ها", description: "مدیریت اسناد و روش‌ها" },
      { key: "order_management", title: "مدیریت سفارش‌ها", description: "سامانه گردش کار سه‌واحدی" },
      { key: "product_management", title: "محصولات", description: "مدیریت کاتالوگ نمایشگاهی و فروشگاه" },
      { key: "payment_management", title: "تنظیمات پرداخت", description: "یکپارچه‌سازی بانکی عراق" },
      { key: "finance", title: "تأیید مالی", description: "مدیریت و تأیید سفارش‌های مالی" },
      { key: "wallet_management", title: "مدیریت کیف پول", description: "کیف پول دیجیتال و سامانه شارژ" },
      { key: "geography_analytics", title: "تحلیل جغرافیایی", description: "عملکرد منطقه‌ای و ردیابی GPS" },
      { key: "ai_settings", title: "تنظیمات هوش مصنوعی", description: "تولید هوشمند SKU و پیشنهادها" },
      { key: "refresh_control", title: "کنترل به‌روزرسانی", description: "مدیریت متمرکز زمان‌بندی" },
      { key: "content_management", title: "مدیریت محتوا", description: "بیش از ۴۳۰ محتوای چندزبانه" },
      { key: "warehouse_management", title: "مدیریت انبار", description: "ردیابی یکپارچه موجودی و کالاها" },
      { key: "logistics_management", title: "مدیریت لجستیک", description: "هماهنگی و تأیید تحویل" },
      { key: "ticketing_system", title: "سامانه تیکتینگ", description: "مدیریت تیکت‌های پشتیبانی" },
      { key: "remote_desktop", title: "دسکتاپ راه دور", description: "پشتیبانی بین‌المللی RustDesk" },
      { key: "server_config", title: "تنظیمات سرور", description: "مهاجرت تولید و میزبانی" },
      { key: "aws_s3_settings", title: "تنظیمات AWS S3", description: "پیکربندی و مدیریت فضای ابری" },
      { key: "reports_analytics", title: "گزارش‌ها و تحلیل‌ها", description: "هوش تجاری پیشرفته و شاخص‌های کلیدی" },
      { key: "security_management", title: "مدیریت امنیت", description: "کنترل دسترسی و ردگیری ممیزی" },
      { key: "notification_center", title: "مرکز اعلان‌ها", description: "هشدارهای سیستم و مرکز ارتباطات" },
      { key: "system_monitoring", title: "پایش سیستم", description: "شاخص‌های عملکرد و بررسی سلامت" },
      { key: "api_management", title: "مدیریت API", description: "یکپارچه‌سازی‌ها و نقاط پایانی خارجی" },
      { key: "integration_hub", title: "مرکز یکپارچه‌سازی", description: "اتصال به سرویس‌های شخص ثالث" },
      { key: "vendor_accounting", title: "حسابداری فروشندگان", description: "فروش، کمیسیون و پرداخت فروشندگان" },
    ],
    enterpriseFeatures:
      "🚀 ویژگی‌های سازمانی: پشتیبانی چندزبانه (انگلیسی، عربی، کردی و ترکی)، خودکارسازی مبتنی بر هوش مصنوعی، مسیریابی جامع ایمیل، ردیابی GPS تحویل و مدیریت کامل گردش کار کسب‌وکار؛ همه در یک پلتفرم قدرتمند یکپارچه شده‌اند.",
    logout: "خروج",
    usernameFallback: "مدیر",
    loading: "در حال بارگذاری داشبورد مدیریت…",
    fallback: "نسخه پیش‌فرض ترجمه‌شده داشبورد مدیریت نمایش داده می‌شود.",
  },
  ar: {
    adminLabel: "المسؤول",
    greetings: {
      morning: "صباح الخير",
      afternoon: "مساء الخير",
      evening: "مساء الخير",
      night: "ليلة سعيدة",
    },
    motivations: {
      morning: "هل أنت مستعد ليوم جديد من الإدارة؟",
      afternoon: "واصل عملك الممتاز اليوم!",
      evening: "مركز الإدارة بانتظارك",
      night: "مركز الإدارة جاهز لك في أي وقت",
    },
    administrativeDashboard: "لوحة الإدارة",
    dashboardDescription: "إدارة مركزية وعناصر تحكم النظام",
    siteManagement: "إدارة الموقع",
    welcomeTitle: "مرحباً بك في نظام إدارة الموقع الشامل",
    welcomeDescription: (moduleCount) =>
      `يمكنك الوصول إلى المنصة الإدارية الشاملة بمستوى المؤسسات، والتي تضم ${moduleCount} وحدة متكاملة لإدارة عمليات الأعمال بالكامل. يوفر هذا النظام المركزي تحكماً شاملاً في جميع جوانب أعمال الحلول الكيميائية، من الإنتاج إلى تسليم العملاء.`,
    suiteTitle: (moduleCount) => `الحزمة الإدارية الكاملة المؤلفة من ${moduleCount} وحدة:`,
    modules: [
      { key: "syncing_shop", title: "مزامنة المتجر", description: "مزامنة الكارديكس والمتجر" },
      { key: "inquiries", title: "الاستفسارات", description: "إدارة استفسارات العملاء والردود" },
      { key: "barcode", title: "الباركود", description: "إنشاء EAN-13 المتوافق مع GS1" },
      { key: "email_settings", title: "إعدادات البريد الإلكتروني", description: "خوادم SMTP متعددة مع توجيه لثمانية أقسام" },
      { key: "database_backup", title: "النسخ الاحتياطي لقاعدة البيانات", description: "صيانة وترحيل PostgreSQL" },
      { key: "crm", title: "إدارة علاقات العملاء", description: "علاقات العملاء والتحليلات" },
      { key: "seo", title: "تحسين محركات البحث", description: "تحسين بأربع لغات وخرائط المواقع" },
      { key: "categories", title: "الفئات", description: "تصنيف هرمي للمنتجات" },
      { key: "sms", title: "الرسائل النصية", description: "إشعارات العملاء متعددة اللغات" },
      { key: "whatsapp_crm", title: "إدارة علاقات عملاء واتساب", description: "تواصل العملاء والرسائل الجماعية" },
      { key: "factory", title: "المصنع", description: "إدارة خطوط الإنتاج" },
      { key: "user_management", title: "إدارة المستخدمين", description: "التحكم بالوصول حسب الأدوار" },
      { key: "shop_management", title: "المتجر", description: "إدارة التجارة الإلكترونية والمخزون" },
      { key: "procedures", title: "الإجراءات", description: "إدارة الوثائق والأساليب" },
      { key: "order_management", title: "إدارة الطلبات", description: "نظام سير عمل من ثلاثة أقسام" },
      { key: "product_management", title: "المنتجات", description: "إدارة كتالوج العرض والمتجر" },
      { key: "payment_management", title: "إعدادات الدفع", description: "تكامل الخدمات المصرفية العراقية" },
      { key: "finance", title: "الاعتماد المالي", description: "إدارة الطلبات المالية واعتمادها" },
      { key: "wallet_management", title: "إدارة المحفظة", description: "المحفظة الرقمية ونظام إعادة الشحن" },
      { key: "geography_analytics", title: "التحليلات الجغرافية", description: "الأداء الإقليمي وتتبع GPS" },
      { key: "ai_settings", title: "إعدادات الذكاء الاصطناعي", description: "إنشاء SKU ذكي وتوصيات" },
      { key: "refresh_control", title: "التحكم بالتحديث", description: "إدارة التوقيت المركزية" },
      { key: "content_management", title: "إدارة المحتوى", description: "أكثر من 430 عنصراً متعدد اللغات" },
      { key: "warehouse_management", title: "إدارة المستودعات", description: "تتبع موحد للمخزون والبضائع" },
      { key: "logistics_management", title: "إدارة الخدمات اللوجستية", description: "تنسيق التسليم والتحقق منه" },
      { key: "ticketing_system", title: "نظام التذاكر", description: "إدارة تذاكر الدعم" },
      { key: "remote_desktop", title: "سطح المكتب البعيد", description: "دعم RustDesk الدولي" },
      { key: "server_config", title: "إعدادات الخادم", description: "ترحيل الإنتاج والاستضافة" },
      { key: "aws_s3_settings", title: "إعدادات AWS S3", description: "إعداد وإدارة التخزين السحابي" },
      { key: "reports_analytics", title: "تحليلات التقارير", description: "ذكاء أعمال متقدم ومؤشرات أداء رئيسية" },
      { key: "security_management", title: "إدارة الأمان", description: "التحكم بالوصول ومسارات التدقيق" },
      { key: "notification_center", title: "مركز الإشعارات", description: "تنبيهات النظام ومركز الاتصالات" },
      { key: "system_monitoring", title: "مراقبة النظام", description: "مقاييس الأداء وفحوصات الصحة" },
      { key: "api_management", title: "إدارة API", description: "التكاملات ونقاط النهاية الخارجية" },
      { key: "integration_hub", title: "مركز التكامل", description: "الاتصال بخدمات الجهات الخارجية" },
      { key: "vendor_accounting", title: "محاسبة الموردين", description: "مبيعات الموردين وعمولاتهم ومدفوعاتهم" },
    ],
    enterpriseFeatures:
      "🚀 ميزات المؤسسات: دعم متعدد اللغات (الإنجليزية والعربية والكردية والتركية)، وأتمتة مدعومة بالذكاء الاصطناعي، وتوجيه شامل للبريد الإلكتروني، وتتبع تسليم GPS، وإدارة كاملة لسير عمل الأعمال، كل ذلك في منصة قوية واحدة.",
    logout: "تسجيل الخروج",
    usernameFallback: "المسؤول",
    loading: "جارٍ تحميل لوحة الإدارة…",
    fallback: "يتم عرض الإعدادات الافتراضية المترجمة للوحة الإدارة.",
  },
  tr: {
    adminLabel: "Yönetici",
    greetings: {
      morning: "Günaydın",
      afternoon: "Tünaydın",
      evening: "İyi akşamlar",
      night: "İyi geceler",
    },
    motivations: {
      morning: "Yeni bir yönetim gününe başlamaya hazır mısınız?",
      afternoon: "Bugün de harika çalışmaya devam edin!",
      evening: "Yönetim merkeziniz sizi bekliyor",
      night: "Yönetim merkeziniz istediğiniz zaman hazır",
    },
    administrativeDashboard: "Yönetim Paneli",
    dashboardDescription: "Merkezi yönetim ve sistem kontrolleri",
    siteManagement: "Site Yönetimi",
    welcomeTitle: "Kapsamlı Site Yönetim Sistemine Hoş Geldiniz",
    welcomeDescription: (moduleCount) =>
      `Tüm iş operasyonlarını yönetmek için ${moduleCount} entegre modül içeren, kurumsal düzeyde eksiksiz yönetim platformuna erişin. Bu merkezi sistem, kimyasal çözümler işletmenizin üretimden müşteriye teslimata kadar tüm yönleri üzerinde kapsamlı kontrol sağlar.`,
    suiteTitle: (moduleCount) => `Eksiksiz ${moduleCount} Modüllü Yönetim Paketi:`,
    modules: [
      { key: "syncing_shop", title: "Mağaza Senkronizasyonu", description: "Kardex/Mağaza senkronizasyonu" },
      { key: "inquiries", title: "Sorular", description: "Müşteri soruları ve yanıt yönetimi" },
      { key: "barcode", title: "Barkod", description: "GS1 uyumlu EAN-13 oluşturma" },
      { key: "email_settings", title: "E-posta Ayarları", description: "8 departman yönlendirmeli çoklu SMTP" },
      { key: "database_backup", title: "Veritabanı Yedekleme", description: "PostgreSQL bakım ve geçişi" },
      { key: "crm", title: "CRM", description: "Müşteri ilişkileri ve analizleri" },
      { key: "seo", title: "SEO", description: "4 dilli optimizasyon ve site haritaları" },
      { key: "categories", title: "Kategoriler", description: "Hiyerarşik ürün sınıflandırması" },
      { key: "sms", title: "SMS", description: "Çok dilli müşteri bildirimleri" },
      { key: "whatsapp_crm", title: "WhatsApp CRM", description: "Müşteri iletişimi ve toplu mesajlaşma" },
      { key: "factory", title: "Fabrika", description: "Üretim hattı yönetimi" },
      { key: "user_management", title: "Kullanıcı Yönetimi", description: "Role dayalı erişim kontrolü" },
      { key: "shop_management", title: "Mağaza", description: "E-ticaret ve stok yönetimi" },
      { key: "procedures", title: "Prosedürler", description: "Belge ve yöntem yönetimi" },
      { key: "order_management", title: "Sipariş Yönetimi", description: "3 departmanlı iş akışı sistemi" },
      { key: "product_management", title: "Ürünler", description: "Vitrin ve mağaza kataloğu yönetimi" },
      { key: "payment_management", title: "Ödeme Ayarları", description: "Irak bankacılık entegrasyonu" },
      { key: "finance", title: "Finansal Onay", description: "Finansal sipariş yönetimi ve onayları" },
      { key: "wallet_management", title: "Cüzdan Yönetimi", description: "Dijital cüzdan ve yükleme sistemi" },
      { key: "geography_analytics", title: "Coğrafi Analiz", description: "Bölgesel performans ve GPS takibi" },
      { key: "ai_settings", title: "Yapay Zekâ Ayarları", description: "Akıllı SKU oluşturma ve öneriler" },
      { key: "refresh_control", title: "Yenileme Kontrolü", description: "Merkezi zamanlama yönetimi" },
      { key: "content_management", title: "İçerik Yönetimi", description: "430'dan fazla çok dilli içerik öğesi" },
      { key: "warehouse_management", title: "Depo Yönetimi", description: "Birleşik stok ve mal takibi" },
      { key: "logistics_management", title: "Lojistik Yönetimi", description: "Teslimat koordinasyonu ve doğrulama" },
      { key: "ticketing_system", title: "Bilet Sistemi", description: "Destek bileti yönetimi" },
      { key: "remote_desktop", title: "Uzak Masaüstü", description: "Uluslararası RustDesk desteği" },
      { key: "server_config", title: "Sunucu Yapılandırması", description: "Üretim geçişi ve barındırma" },
      { key: "aws_s3_settings", title: "AWS S3 Ayarları", description: "Bulut depolama yapılandırması ve yönetimi" },
      { key: "reports_analytics", title: "Rapor Analizleri", description: "Gelişmiş iş zekâsı ve KPI'lar" },
      { key: "security_management", title: "Güvenlik Yönetimi", description: "Erişim kontrolü ve denetim izleri" },
      { key: "notification_center", title: "Bildirim Merkezi", description: "Sistem uyarıları ve iletişim merkezi" },
      { key: "system_monitoring", title: "Sistem İzleme", description: "Performans ölçümleri ve sağlık kontrolleri" },
      { key: "api_management", title: "API Yönetimi", description: "Harici entegrasyonlar ve uç noktalar" },
      { key: "integration_hub", title: "Entegrasyon Merkezi", description: "Üçüncü taraf hizmet bağlantıları" },
      { key: "vendor_accounting", title: "Tedarikçi Muhasebesi", description: "Tedarikçi satışları, komisyonları ve ödemeleri" },
    ],
    enterpriseFeatures:
      "🚀 Kurumsal Özellikler: Çok dilli destek (İngilizce, Arapça, Kürtçe, Türkçe), yapay zekâ destekli otomasyon, kapsamlı e-posta yönlendirme, GPS teslimat takibi ve eksiksiz iş akışı yönetimi; hepsi tek güçlü platformda birleşir.",
    logout: "Çıkış yap",
    usernameFallback: "Yönetici",
    loading: "Yönetim paneli yükleniyor…",
    fallback: "Çevrilmiş yönetim paneli varsayılanları gösteriliyor.",
  },
};

// Function to get the actual Site Management modules count
const getSiteManagementModulesCount = () => {
  const modules = [
    "syncing_shop", "shop_management", "product_management", "order_management", 
    "warehouse_management", "crm", "wallet_management", "finance", "payment_management",
    "geography_analytics", "inquiries", "email_settings", "content_management", 
    "seo", "categories", "barcode", "database_backup", "ai_settings", 
    "user_management", "sms", "whatsapp_crm", "factory", "procedures", "refresh_control", 
    "logistics_management", "ticketing_system", "remote_desktop", "server_config",
    "reports_analytics", "security_management", "notification_center", "system_monitoring", 
    "api_management", "integration_hub", "aws_s3_settings", "vendor_accounting"
  ];
  return modules.length;
};

const getTimePeriod = (): TimePeriod => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
};

const getAdminGreeting = (language: Language, copy: AdminTranslation) => {
  const greeting = copy.greetings[getTimePeriod()];
  return language === "fa" || language === "ar"
    ? `${greeting}، ${copy.adminLabel}!`
    : `${greeting}, ${copy.adminLabel}!`;
};

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const copy = adminTranslations[language] ?? adminTranslations.en;
  
  // Get the actual module count dynamically
  const moduleCount = getSiteManagementModulesCount();
  
  // Fetch admin dashboard content from Content Management
  const { data: adminContent, isLoading: contentLoading } = useQuery({
    queryKey: ['/api/content-management/items'],
    queryFn: () => fetch('/api/content-management/items?section=admin_dashboard')
      .then(res => res.json())
      .then(data => data.success ? data.data : []),
  });

  // Helper function to get content by key
  const getContent = (key: string, defaultValue = copy.fallback) => {
    if (!Array.isArray(adminContent)) return defaultValue;
    const content = adminContent.find(
      (item: any) => item?.key === key && item?.language === language,
    );
    return typeof content?.content === "string" && content.content.trim()
      ? content.content
      : defaultValue;
  };

  return (
    <AuthGuard requireAuth={true} redirectTo="/mrg/login">
      <AdminDashboardContent 
        user={user}
        logout={logout}
        setLocation={setLocation}
        moduleCount={moduleCount}
        getContent={getContent}
        contentLoading={contentLoading}
        copy={copy}
      />
    </AuthGuard>
  );
}

function AdminDashboardContent({
  user,
  logout,
  setLocation,
  moduleCount,
  getContent,
  contentLoading,
  copy,
}: {
  user: any;
  logout: () => void;
  setLocation: (path: string) => void;
  moduleCount: number;
  getContent: (key: string, defaultValue?: string) => string;
  contentLoading: boolean;
  copy: AdminTranslation;
}) {
  const { language } = useLanguage();
  const direction = language === "fa" || language === "ar" ? "rtl" : "ltr";
  const timePeriod = getTimePeriod();

  return (
    <div
      dir={direction}
      className="container mx-auto p-6 space-y-8 bg-white dark:bg-gray-900 min-h-screen"
    >
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {getAdminGreeting(language, copy)}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {copy.motivations[timePeriod]}
            </p>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {getContent("administrative_dashboard_title", copy.administrativeDashboard)}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1 mb-4">
                  {getContent("administrative_dashboard_description", copy.dashboardDescription)}
                </p>
                <Button 
                  onClick={() => setLocation("/admin/site-management")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                >
                  <Package className="w-4 h-4 me-2" />
                  {getContent("site_management", copy.siteManagement)}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4" />
              <span className="text-sm">{user?.username || copy.usernameFallback}</span>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                logout();
                setLocation("/admin/login");
              }}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 me-2" />
              {getContent("logout", copy.logout)}
            </Button>
            {contentLoading && (
              <span className="text-xs text-gray-500" role="status">
                {getContent("loading", copy.loading)}
              </span>
            )}
          </div>
        </div>

        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {getContent("welcome_title", copy.welcomeTitle)}
          </h2>
          <p className="text-gray-600 mb-4">
            {getContent("welcome_description", copy.welcomeDescription(moduleCount))}
          </p>
          
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {getContent("module_suite_title", copy.suiteTitle(moduleCount))}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm font-bold text-gray-700">
              {copy.modules.map((module) => (
                <div key={module.key}>
                  • <strong>{getContent(`${module.key}_title`, module.title)}</strong> -{" "}
                  {getContent(`${module.key}_description`, module.description)}
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              {getContent("enterprise_features", copy.enterpriseFeatures)}
            </p>
          </div>
          


        </div>


      </div>
    </div>
  );
}

