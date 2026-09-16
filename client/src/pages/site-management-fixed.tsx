import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Settings, Globe, Users, Database, Monitor, Shield, Package, RefreshCw, BarChart3, QrCode, Mail, MessageSquare, Factory, UserCog, DollarSign, BookOpen, Truck, Box, CreditCard, Wallet, MapPin, Barcode, Edit3, Calculator, Ticket, ShoppingCart, Warehouse, Smartphone, Brain, Monitor as RemoteMonitor, FileText, Server, MessageCircle, Cloud, PenTool, Store, GripVertical } from "lucide-react";
import { KardexSyncPanel } from "@/components/KardexSyncPanel";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

type SiteManagementLanguage = "en" | "fa" | "ar" | "tr";
const QUICK_ACTION_ORDER_KEY = "site-management-quick-action-order";

type SiteManagementModuleId =
  | "kpi-dashboard"
  | "management-dashboard"
  | "kardex-sync"
  | "shop"
  | "products"
  | "order-management"
  | "warehouse-management"
  | "crm"
  | "wallet-management"
  | "finance"
  | "accounting-management"
  | "payment-settings"
  | "geography-analytics"
  | "inquiries"
  | "email-settings"
  | "content-management"
  | "ai-settings"
  | "marketplace-management"
  | "company-information"
  | "seo"
  | "blog-management"
  | "categories"
  | "barcode"
  | "database-backup"
  | "user-management"
  | "sms"
  | "factory"
  | "procedures"
  | "refresh-control"
  | "logistics"
  | "ticketing"
  | "remote-desktop"
  | "server-config"
  | "aws-s3-settings"
  | "missing-images"
  | "fib-settings"
  | "user-guide"
  | "marketing-module"
  | "super-admin-order-management"
  | "whatsapp-crm";

interface SiteManagementModuleCopy {
  title: string;
  description: string;
}

interface SiteManagementTranslation {
  backToHome: string;
  title: string;
  resetOrder: string;
  dragInstruction: string;
  dragHandleLabel: string;
  welcome: (username: string) => string;
  quickActions: string;
  modulesAvailable: (count: number) => string;
  loadingSiteManagement: string;
  redirectingToLogin: string;
  loadingModules: string;
  success: string;
  orderReset: string;
  syncingShop: string;
  modules: Record<SiteManagementModuleId, SiteManagementModuleCopy>;
}

const siteManagementTranslations: Record<SiteManagementLanguage, SiteManagementTranslation> = {
  en: {
    backToHome: "Back to Home",
    title: "Site Management",
    resetOrder: "Reset order",
    dragInstruction: "Drag the handle to arrange your quick actions.",
    dragHandleLabel: "Drag to reorder",
    welcome: (username) => `Welcome, ${username}`,
    quickActions: "Quick Actions",
    modulesAvailable: (count) => `${count} modules available`,
    loadingSiteManagement: "Loading Site Management...",
    redirectingToLogin: "Redirecting to login...",
    loadingModules: "Loading modules...",
    success: "Success",
    orderReset: "Quick action order has been reset",
    syncingShop: "Syncing Shop",
    modules: {
      "kpi-dashboard": { title: "KPI Dashboard", description: "Monitor key performance indicators." },
      "management-dashboard": { title: "Management Dashboard", description: "Review high-level business performance." },
      "kardex-sync": { title: "Syncing Shop", description: "Synchronize shop data with Kardex." },
      shop: { title: "Shop", description: "Manage shop operations and settings." },
      products: { title: "Products", description: "Manage products, stock, and details." },
      "order-management": { title: "Order Management", description: "Review and process customer orders." },
      "warehouse-management": { title: "Warehouse Management", description: "Control warehouses and inventory movement." },
      crm: { title: "CRM", description: "Manage customer relationships and records." },
      "wallet-management": { title: "Wallet Management", description: "Manage customer wallets and balances." },
      finance: { title: "Financial Approval", description: "Review and approve financial orders." },
      "accounting-management": { title: "Accounting Management", description: "Manage accounting records and reports." },
      "payment-settings": { title: "Payment Settings", description: "Configure payment methods and rules." },
      "geography-analytics": { title: "Geography Analytics", description: "Analyze activity by location." },
      inquiries: { title: "Inquiries", description: "Review and respond to incoming inquiries." },
      "email-settings": { title: "Email Settings", description: "Configure email delivery and templates." },
      "content-management": { title: "Content Management", description: "Create and manage site content." },
      "ai-settings": { title: "AI Settings", description: "Configure artificial intelligence features." },
      "marketplace-management": { title: "Marketplace Management", description: "Manage marketplace channels and listings." },
      "company-information": { title: "Company Information", description: "Update company details and identity." },
      seo: { title: "SEO Management", description: "Improve search visibility and metadata." },
      "blog-management": { title: "Blog Management", description: "Publish and organize blog articles." },
      categories: { title: "Categories", description: "Organize products into categories." },
      barcode: { title: "Barcode", description: "Manage barcode inventory and labels." },
      "database-backup": { title: "Database Backup", description: "Create and manage database backups." },
      "user-management": { title: "User Management", description: "Manage users, roles, and access." },
      sms: { title: "SMS Management", description: "Configure SMS messaging and delivery." },
      factory: { title: "Factory Management", description: "Manage factory operations and production." },
      procedures: { title: "Procedures", description: "Maintain operational procedures." },
      "refresh-control": { title: "Refresh Control", description: "Control global data refresh settings." },
      logistics: { title: "Logistics Management", description: "Coordinate shipping and logistics." },
      ticketing: { title: "Ticketing System", description: "Track support tickets and requests." },
      "remote-desktop": { title: "Remote Desktop", description: "Access approved remote workstations." },
      "server-config": { title: "Server Config", description: "Configure server and runtime settings." },
      "aws-s3-settings": { title: "AWS S3 Settings", description: "Configure cloud storage settings." },
      "missing-images": { title: "Missing Images", description: "Find and resolve missing product images." },
      "fib-settings": { title: "FIB Payment Gateway", description: "Configure the FIB payment gateway." },
      "user-guide": { title: "User Guide", description: "Read guidance for using the platform." },
      "marketing-module": { title: "Marketing Module", description: "Plan and manage marketing activities." },
      "super-admin-order-management": { title: "Super Admin Order Management", description: "Manage orders with super-admin access." },
      "whatsapp-crm": { title: "WhatsApp CRM", description: "Manage customer conversations on WhatsApp." },
    },
  },
  fa: {
    backToHome: "بازگشت به خانه",
    title: "مدیریت سایت",
    resetOrder: "بازنشانی ترتیب",
    dragInstruction: "برای مرتب‌سازی، دستگیره را بکشید.",
    dragHandleLabel: "کشیدن برای مرتب‌سازی",
    welcome: (username) => `خوش آمدید، ${username}`,
    quickActions: "عملیات سریع",
    modulesAvailable: (count) => `${count} ماژول در دسترس است`,
    loadingSiteManagement: "در حال بارگذاری مدیریت سایت...",
    redirectingToLogin: "در حال انتقال به صفحه ورود...",
    loadingModules: "در حال بارگذاری ماژول‌ها...",
    success: "موفق",
    orderReset: "ترتیب عملیات سریع بازنشانی شد",
    syncingShop: "همگام‌سازی فروشگاه",
    modules: {
      "kpi-dashboard": { title: "داشبورد شاخص‌ها", description: "شاخص‌های کلیدی عملکرد را پایش کنید." },
      "management-dashboard": { title: "داشبورد مدیریت", description: "عملکرد کلی کسب‌وکار را بررسی کنید." },
      "kardex-sync": { title: "همگام‌سازی فروشگاه", description: "داده‌های فروشگاه را با کاردکس همگام کنید." },
      shop: { title: "فروشگاه", description: "عملیات و تنظیمات فروشگاه را مدیریت کنید." },
      products: { title: "محصولات", description: "محصولات، موجودی و جزئیات را مدیریت کنید." },
      "order-management": { title: "مدیریت سفارش‌ها", description: "سفارش‌های مشتریان را بررسی و پردازش کنید." },
      "warehouse-management": { title: "مدیریت انبار", description: "انبارها و جابه‌جایی موجودی را کنترل کنید." },
      crm: { title: "مدیریت ارتباط با مشتری", description: "ارتباط با مشتریان و سوابق آن‌ها را مدیریت کنید." },
      "wallet-management": { title: "مدیریت کیف پول", description: "کیف پول و موجودی مشتریان را مدیریت کنید." },
      finance: { title: "تأیید مالی", description: "سفارش‌های مالی را بررسی و تأیید کنید." },
      "accounting-management": { title: "مدیریت حسابداری", description: "سوابق و گزارش‌های حسابداری را مدیریت کنید." },
      "payment-settings": { title: "تنظیمات پرداخت", description: "روش‌ها و قوانین پرداخت را پیکربندی کنید." },
      "geography-analytics": { title: "تحلیل جغرافیایی", description: "فعالیت‌ها را بر اساس موقعیت تحلیل کنید." },
      inquiries: { title: "درخواست‌ها", description: "درخواست‌های ورودی را بررسی و پاسخ دهید." },
      "email-settings": { title: "تنظیمات ایمیل", description: "ارسال ایمیل و قالب‌ها را پیکربندی کنید." },
      "content-management": { title: "مدیریت محتوا", description: "محتوای سایت را ایجاد و مدیریت کنید." },
      "ai-settings": { title: "تنظیمات هوش مصنوعی", description: "قابلیت‌های هوش مصنوعی را پیکربندی کنید." },
      "marketplace-management": { title: "مدیریت بازارگاه", description: "کانال‌ها و فهرست‌های بازارگاه را مدیریت کنید." },
      "company-information": { title: "اطلاعات شرکت", description: "جزئیات و هویت شرکت را به‌روزرسانی کنید." },
      seo: { title: "مدیریت سئو", description: "نمایش در جست‌وجو و فراداده‌ها را بهبود دهید." },
      "blog-management": { title: "مدیریت وبلاگ", description: "مقاله‌های وبلاگ را منتشر و سازمان‌دهی کنید." },
      categories: { title: "دسته‌بندی‌ها", description: "محصولات را در دسته‌ها سازمان‌دهی کنید." },
      barcode: { title: "بارکد", description: "موجودی و برچسب‌های بارکد را مدیریت کنید." },
      "database-backup": { title: "پشتیبان‌گیری پایگاه داده", description: "نسخه‌های پشتیبان پایگاه داده را مدیریت کنید." },
      "user-management": { title: "مدیریت کاربران", description: "کاربران، نقش‌ها و دسترسی‌ها را مدیریت کنید." },
      sms: { title: "مدیریت پیامک", description: "پیامک و ارسال آن را پیکربندی کنید." },
      factory: { title: "مدیریت کارخانه", description: "عملیات و تولید کارخانه را مدیریت کنید." },
      procedures: { title: "رویه‌ها", description: "رویه‌های عملیاتی را نگهداری کنید." },
      "refresh-control": { title: "کنترل تازه‌سازی", description: "تنظیمات تازه‌سازی کلی داده‌ها را کنترل کنید." },
      logistics: { title: "مدیریت لجستیک", description: "حمل‌ونقل و لجستیک را هماهنگ کنید." },
      ticketing: { title: "سامانه تیکتینگ", description: "تیکت‌ها و درخواست‌های پشتیبانی را پیگیری کنید." },
      "remote-desktop": { title: "دسکتاپ راه دور", description: "به ایستگاه‌های کاری مجاز دسترسی پیدا کنید." },
      "server-config": { title: "پیکربندی سرور", description: "تنظیمات سرور و اجرا را پیکربندی کنید." },
      "aws-s3-settings": { title: "تنظیمات AWS S3", description: "تنظیمات فضای ذخیره‌سازی ابری را پیکربندی کنید." },
      "missing-images": { title: "تصاویر گمشده", description: "تصاویر محصول گمشده را پیدا و رفع کنید." },
      "fib-settings": { title: "درگاه پرداخت FIB", description: "درگاه پرداخت FIB را پیکربندی کنید." },
      "user-guide": { title: "راهنمای کاربر", description: "راهنمای استفاده از سامانه را بخوانید." },
      "marketing-module": { title: "ماژول بازاریابی", description: "فعالیت‌های بازاریابی را برنامه‌ریزی و مدیریت کنید." },
      "super-admin-order-management": { title: "مدیریت سفارش مدیر ارشد", description: "سفارش‌ها را با دسترسی مدیر ارشد مدیریت کنید." },
      "whatsapp-crm": { title: "CRM واتساپ", description: "گفت‌وگوهای مشتریان در واتساپ را مدیریت کنید." },
    },
  },
  ar: {
    backToHome: "العودة إلى الرئيسية",
    title: "إدارة الموقع",
    resetOrder: "إعادة ضبط الترتيب",
    dragInstruction: "اسحب المقبض لترتيب الإجراءات السريعة.",
    dragHandleLabel: "اسحب لإعادة الترتيب",
    welcome: (username) => `مرحباً، ${username}`,
    quickActions: "إجراءات سريعة",
    modulesAvailable: (count) => `${count} وحدة متاحة`,
    loadingSiteManagement: "جارٍ تحميل إدارة الموقع...",
    redirectingToLogin: "جارٍ التحويل إلى تسجيل الدخول...",
    loadingModules: "جارٍ تحميل الوحدات...",
    success: "نجاح",
    orderReset: "تمت إعادة ضبط ترتيب الإجراءات السريعة",
    syncingShop: "مزامنة المتجر",
    modules: {
      "kpi-dashboard": { title: "لوحة مؤشرات الأداء", description: "راقب مؤشرات الأداء الرئيسية." },
      "management-dashboard": { title: "لوحة الإدارة", description: "راجع أداء العمل على مستوى عالٍ." },
      "kardex-sync": { title: "مزامنة المتجر", description: "زامن بيانات المتجر مع Kardex." },
      shop: { title: "المتجر", description: "أدر عمليات المتجر وإعداداته." },
      products: { title: "المنتجات", description: "أدر المنتجات والمخزون والتفاصيل." },
      "order-management": { title: "إدارة الطلبات", description: "راجع طلبات العملاء وعالجها." },
      "warehouse-management": { title: "إدارة المستودعات", description: "تحكم بالمستودعات وحركة المخزون." },
      crm: { title: "إدارة علاقات العملاء", description: "أدر علاقات العملاء وسجلاتهم." },
      "wallet-management": { title: "إدارة المحافظ", description: "أدر محافظ العملاء وأرصدتهم." },
      finance: { title: "الاعتماد المالي", description: "راجع الطلبات المالية واعتمدها." },
      "accounting-management": { title: "إدارة المحاسبة", description: "أدر السجلات والتقارير المحاسبية." },
      "payment-settings": { title: "إعدادات الدفع", description: "اضبط طرق الدفع وقواعدها." },
      "geography-analytics": { title: "التحليلات الجغرافية", description: "حلل النشاط حسب الموقع." },
      inquiries: { title: "الاستفسارات", description: "راجع الاستفسارات الواردة وأجب عنها." },
      "email-settings": { title: "إعدادات البريد الإلكتروني", description: "اضبط إرسال البريد والقوالب." },
      "content-management": { title: "إدارة المحتوى", description: "أنشئ محتوى الموقع وأدره." },
      "ai-settings": { title: "إعدادات الذكاء الاصطناعي", description: "اضبط ميزات الذكاء الاصطناعي." },
      "marketplace-management": { title: "إدارة السوق", description: "أدر قنوات السوق والقوائم." },
      "company-information": { title: "معلومات الشركة", description: "حدّث تفاصيل الشركة وهويتها." },
      seo: { title: "إدارة تحسين محركات البحث", description: "حسّن الظهور في البحث والبيانات الوصفية." },
      "blog-management": { title: "إدارة المدونة", description: "انشر مقالات المدونة ونظّمها." },
      categories: { title: "الفئات", description: "نظّم المنتجات ضمن فئات." },
      barcode: { title: "الباركود", description: "أدر مخزون الباركود وملصقاته." },
      "database-backup": { title: "نسخ قاعدة البيانات الاحتياطية", description: "أنشئ نسخ قاعدة البيانات الاحتياطية وأدرها." },
      "user-management": { title: "إدارة المستخدمين", description: "أدر المستخدمين والأدوار والصلاحيات." },
      sms: { title: "إدارة الرسائل النصية", description: "اضبط الرسائل النصية وإرسالها." },
      factory: { title: "إدارة المصنع", description: "أدر عمليات المصنع والإنتاج." },
      procedures: { title: "الإجراءات", description: "حافظ على الإجراءات التشغيلية." },
      "refresh-control": { title: "التحكم بالتحديث", description: "تحكم بإعدادات تحديث البيانات العامة." },
      logistics: { title: "إدارة الخدمات اللوجستية", description: "نسّق الشحن والخدمات اللوجستية." },
      ticketing: { title: "نظام التذاكر", description: "تابع تذاكر الدعم والطلبات." },
      "remote-desktop": { title: "سطح المكتب البعيد", description: "ادخل إلى محطات العمل المصرح بها." },
      "server-config": { title: "إعدادات الخادم", description: "اضبط إعدادات الخادم وبيئة التشغيل." },
      "aws-s3-settings": { title: "إعدادات AWS S3", description: "اضبط إعدادات التخزين السحابي." },
      "missing-images": { title: "الصور المفقودة", description: "اعثر على صور المنتجات المفقودة وأصلحها." },
      "fib-settings": { title: "بوابة دفع FIB", description: "اضبط بوابة دفع FIB." },
      "user-guide": { title: "دليل المستخدم", description: "اقرأ إرشادات استخدام المنصة." },
      "marketing-module": { title: "وحدة التسويق", description: "خطط للأنشطة التسويقية وأدرها." },
      "super-admin-order-management": { title: "إدارة طلبات المدير العام", description: "أدر الطلبات بصلاحيات المدير العام." },
      "whatsapp-crm": { title: "إدارة عملاء واتساب", description: "أدر محادثات العملاء عبر واتساب." },
    },
  },
  tr: {
    backToHome: "Ana Sayfaya Dön",
    title: "Site Yönetimi",
    resetOrder: "Sırayı Sıfırla",
    dragInstruction: "Hızlı işlemleri düzenlemek için tutamacı sürükleyin.",
    dragHandleLabel: "Yeniden sıralamak için sürükle",
    welcome: (username) => `Hoş geldiniz, ${username}`,
    quickActions: "Hızlı İşlemler",
    modulesAvailable: (count) => `${count} modül kullanılabilir`,
    loadingSiteManagement: "Site yönetimi yükleniyor...",
    redirectingToLogin: "Giriş sayfasına yönlendiriliyor...",
    loadingModules: "Modüller yükleniyor...",
    success: "Başarılı",
    orderReset: "Hızlı işlem sırası sıfırlandı",
    syncingShop: "Mağazayı Senkronize Et",
    modules: {
      "kpi-dashboard": { title: "KPI Paneli", description: "Temel performans göstergelerini izleyin." },
      "management-dashboard": { title: "Yönetim Paneli", description: "Genel iş performansını inceleyin." },
      "kardex-sync": { title: "Mağaza Senkronizasyonu", description: "Mağaza verilerini Kardex ile senkronize edin." },
      shop: { title: "Mağaza", description: "Mağaza işlemlerini ve ayarlarını yönetin." },
      products: { title: "Ürünler", description: "Ürünleri, stoğu ve ayrıntıları yönetin." },
      "order-management": { title: "Sipariş Yönetimi", description: "Müşteri siparişlerini inceleyin ve işleyin." },
      "warehouse-management": { title: "Depo Yönetimi", description: "Depoları ve stok hareketlerini kontrol edin." },
      crm: { title: "CRM", description: "Müşteri ilişkilerini ve kayıtlarını yönetin." },
      "wallet-management": { title: "Cüzdan Yönetimi", description: "Müşteri cüzdanlarını ve bakiyelerini yönetin." },
      finance: { title: "Finansal Onay", description: "Finansal siparişleri inceleyin ve onaylayın." },
      "accounting-management": { title: "Muhasebe Yönetimi", description: "Muhasebe kayıtlarını ve raporlarını yönetin." },
      "payment-settings": { title: "Ödeme Ayarları", description: "Ödeme yöntemlerini ve kurallarını yapılandırın." },
      "geography-analytics": { title: "Coğrafi Analiz", description: "Etkinliği konuma göre analiz edin." },
      inquiries: { title: "Başvurular", description: "Gelen başvuruları inceleyin ve yanıtlayın." },
      "email-settings": { title: "E-posta Ayarları", description: "E-posta gönderimini ve şablonlarını yapılandırın." },
      "content-management": { title: "İçerik Yönetimi", description: "Site içeriği oluşturun ve yönetin." },
      "ai-settings": { title: "Yapay Zekâ Ayarları", description: "Yapay zekâ özelliklerini yapılandırın." },
      "marketplace-management": { title: "Pazar Yeri Yönetimi", description: "Pazar kanallarını ve listelerini yönetin." },
      "company-information": { title: "Şirket Bilgileri", description: "Şirket bilgilerini ve kimliğini güncelleyin." },
      seo: { title: "SEO Yönetimi", description: "Arama görünürlüğünü ve meta verileri geliştirin." },
      "blog-management": { title: "Blog Yönetimi", description: "Blog yazılarını yayınlayın ve düzenleyin." },
      categories: { title: "Kategoriler", description: "Ürünleri kategorilerde düzenleyin." },
      barcode: { title: "Barkod", description: "Barkod stoğunu ve etiketlerini yönetin." },
      "database-backup": { title: "Veritabanı Yedekleme", description: "Veritabanı yedekleri oluşturun ve yönetin." },
      "user-management": { title: "Kullanıcı Yönetimi", description: "Kullanıcıları, rolleri ve erişimleri yönetin." },
      sms: { title: "SMS Yönetimi", description: "SMS mesajlaşmasını ve gönderimini yapılandırın." },
      factory: { title: "Fabrika Yönetimi", description: "Fabrika operasyonlarını ve üretimi yönetin." },
      procedures: { title: "Prosedürler", description: "Operasyonel prosedürleri yönetin." },
      "refresh-control": { title: "Yenileme Kontrolü", description: "Genel veri yenileme ayarlarını yönetin." },
      logistics: { title: "Lojistik Yönetimi", description: "Sevkiyat ve lojistiği koordine edin." },
      ticketing: { title: "Bilet Sistemi", description: "Destek biletlerini ve taleplerini takip edin." },
      "remote-desktop": { title: "Uzak Masaüstü", description: "Yetkili uzak iş istasyonlarına erişin." },
      "server-config": { title: "Sunucu Yapılandırması", description: "Sunucu ve çalışma ayarlarını yapılandırın." },
      "aws-s3-settings": { title: "AWS S3 Ayarları", description: "Bulut depolama ayarlarını yapılandırın." },
      "missing-images": { title: "Eksik Görseller", description: "Eksik ürün görsellerini bulun ve düzeltin." },
      "fib-settings": { title: "FIB Ödeme Geçidi", description: "FIB ödeme geçidini yapılandırın." },
      "user-guide": { title: "Kullanıcı Rehberi", description: "Platform kullanım kılavuzunu okuyun." },
      "marketing-module": { title: "Pazarlama Modülü", description: "Pazarlama faaliyetlerini planlayın ve yönetin." },
      "super-admin-order-management": { title: "Süper Yönetici Sipariş Yönetimi", description: "Siparişleri süper yönetici erişimiyle yönetin." },
      "whatsapp-crm": { title: "WhatsApp CRM", description: "WhatsApp müşteri görüşmelerini yönetin." },
    },
  },
};

// Define the structure for Quick Action buttons
interface QuickActionButton {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  className: string;
  moduleId?: string; // Optional module ID for role-based access control
}

export default function SiteManagement() {
  console.log('🔍 [DEBUG] Site Management component initialized');
  
  // All hooks at the top - never conditional
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { language, direction } = useLanguage();
  const siteManagementCopy = siteManagementTranslations[language];
  const [showKardexSync, setShowKardexSync] = useState(false);
  const [buttons, setButtons] = useState<QuickActionButton[]>([]);

  // All useQuery hooks - never conditional
  const { data: userPermissions, isLoading: isLoadingPermissions, error: permissionsError, refetch: refetchPermissions } = useQuery({
    queryKey: ['/api/user/permissions'], // Remove timestamp to prevent infinite re-renders
    staleTime: 30000, // Cache for 30 seconds
    retry: 3,
    retryDelay: 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    enabled: isAuthenticated, // Only run when authenticated
  });

  const { data: activeUsersData, isLoading: isLoadingActiveUsers, refetch: refetchActiveUsers, error } = useQuery({
    queryKey: ['/api/active-users'],
    enabled: false,
  });

  // All useEffect hooks - never conditional
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authLoading && !isAuthenticated) {
        console.log("Not authenticated, redirecting to admin login");
        setLocation("/admin/login");
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [authLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    // Clear cache and refetch permissions on mount (only once)
    if (isAuthenticated) {
      queryClient.invalidateQueries({ queryKey: ['/api/user/permissions'] });
      refetchPermissions();
    }
  }, [isAuthenticated]); // Only depend on authentication status

  useEffect(() => {
    if (userPermissions && typeof userPermissions === 'object' && 'success' in userPermissions && userPermissions.success) {
      const filteredButtons = getFilteredButtons();
      setButtons(mergeSavedOrder(filteredButtons));
    }
  }, [userPermissions, language]);

  // Helper functions
  const getModuleText = (id: SiteManagementModuleId) => ({
    label: siteManagementCopy.modules[id].title,
  });

  const trackButtonClick = (_buttonId: string, action: () => void) => action();

  const getInitialButtons = (): QuickActionButton[] => [
    {
      id: "kpi-dashboard",
      ...getModuleText("kpi-dashboard"),
      icon: BarChart3,
      onClick: () => trackButtonClick("kpi-dashboard", () => setLocation("/admin/kpi-dashboard")),
      className: "border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-800",
      moduleId: "kpi_dashboard"
    },
    {
      id: "management-dashboard",
      ...getModuleText("management-dashboard"),
      icon: Monitor,
      onClick: () => trackButtonClick("management-dashboard", () => setLocation("/admin/management-dashboard")),
      className: "border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800",
      moduleId: "management_dashboard"
    },
    {
      id: "kardex-sync",
      ...getModuleText("kardex-sync"),
      icon: Database,
      onClick: () => trackButtonClick("kardex-sync", () => setShowKardexSync(true)),
      className: "border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-800",
      moduleId: "syncing_shop"
    },
    {
      id: "shop",
      ...getModuleText("shop"),
      icon: DollarSign,
      onClick: () => trackButtonClick("shop", () => setLocation("/admin/shop")),
      className: "border-green-300 text-green-600 hover:bg-green-50 hover:text-green-800",
      moduleId: "shop_management"
    },
    {
      id: "products",
      ...getModuleText("products"),
      icon: Package,
      onClick: () => trackButtonClick("products", () => setLocation("/admin/products")),
      className: "border-purple-300 text-purple-600 hover:bg-purple-50 hover:text-purple-800",
      moduleId: "product_management"
    },
    {
      id: "order-management",
      ...getModuleText("order-management"),
      icon: ShoppingCart,
      onClick: () => trackButtonClick("order-management", () => setLocation("/admin/order-management")),
      className: "border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-800",
      moduleId: "order_management"
    },
    {
      id: "warehouse-management",
      ...getModuleText("warehouse-management"),
      icon: Warehouse,
      onClick: () => trackButtonClick("warehouse-management", () => setLocation("/admin/warehouse-management")),
      className: "border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800",
      moduleId: "warehouse_management"
    },


    {
      id: "crm",
      ...getModuleText("crm"),
      icon: Users,
      onClick: () => trackButtonClick("crm", () => setLocation("/crm")),
      className: "border-pink-300 text-pink-600 hover:bg-pink-50 hover:text-pink-800",
      moduleId: "crm"
    },
    {
      id: "wallet-management",
      ...getModuleText("wallet-management"),
      icon: Wallet,
      onClick: () => trackButtonClick("wallet-management", () => setLocation("/admin/wallet-management")),
      className: "border-yellow-300 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-800",
      moduleId: "wallet_management"
    },

    {
      id: "finance",
      ...getModuleText("finance"),
      icon: DollarSign,
      onClick: () => trackButtonClick("finance", () => setLocation("/admin/finance-orders")),
      className: "border-green-300 text-green-600 hover:bg-green-50 hover:text-green-800",
      moduleId: "finance"
    },
    {
      id: "accounting-management",
      ...getModuleText("accounting-management"),
      icon: Calculator,
      onClick: () => trackButtonClick("accounting-management", () => setLocation("/admin/accounting-management")),
      className: "border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800",
      moduleId: "accounting_management"
    },
    {
      id: "payment-settings",
      ...getModuleText("payment-settings"),
      icon: CreditCard,
      onClick: () => trackButtonClick("payment-settings", () => setLocation("/admin/payment-settings")),
      className: "border-red-300 text-red-600 hover:bg-red-50 hover:text-red-800",
      moduleId: "payment_management"
    },
    {
      id: "geography-analytics",
      ...getModuleText("geography-analytics"),
      icon: MapPin,
      onClick: () => trackButtonClick("geography-analytics", () => setLocation("/admin/geographic-analytics")),
      className: "border-teal-300 text-teal-600 hover:bg-teal-50 hover:text-teal-800",
      moduleId: "geography_analytics"
    },
    {
      id: "inquiries",
      ...getModuleText("inquiries"),
      icon: MessageSquare,
      onClick: () => trackButtonClick("inquiries", () => setLocation("/admin/inquiries")),
      className: "border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-800",
      moduleId: "inquiries"
    },
    {
      id: "email-settings",
      ...getModuleText("email-settings"),
      icon: Mail,
      onClick: () => trackButtonClick("email-settings", () => setLocation("/admin/advanced-email-settings")),
      className: "border-cyan-300 text-cyan-600 hover:bg-cyan-50 hover:text-cyan-800",
      moduleId: "email_settings"
    },
    {
      id: "content-management",
      ...getModuleText("content-management"),
      icon: Edit3,
      onClick: () => trackButtonClick("content-management", () => setLocation("/content-management")),
      className: "border-lime-300 text-lime-600 hover:bg-lime-50 hover:text-lime-800",
      moduleId: "content_management"
    },
    {
      id: "ai-settings",
      ...getModuleText("ai-settings"),
      icon: Brain,
      onClick: () => trackButtonClick("ai-settings", () => setLocation("/admin/ai-settings")),
      className: "border-violet-300 text-violet-600 hover:bg-violet-50 hover:text-violet-800",
      moduleId: "ai_settings"
    },
    {
      id: "marketplace-management",
      ...getModuleText("marketplace-management"),
      icon: Store,
      onClick: () => trackButtonClick("marketplace-management", () => setLocation("/admin/marketplace-management")),
      className: "border-purple-300 text-purple-600 hover:bg-purple-50 hover:text-purple-800",
      moduleId: "marketplace_management"
    },
    {
      id: "company-information",
      ...getModuleText("company-information"),
      icon: FileText,
      onClick: () => trackButtonClick("company-information", () => setLocation("/admin/company-information")),
      className: "border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800",
      moduleId: "company_information"
    },
    {
      id: "seo",
      ...getModuleText("seo"),
      icon: Globe,
      onClick: () => trackButtonClick("seo", () => setLocation("/seo-management")),
      className: "border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800",
      moduleId: "seo"
    },
    {
      id: "blog-management",
      ...getModuleText("blog-management"),
      icon: PenTool,
      onClick: () => trackButtonClick("blog-management", () => setLocation("/admin/blog-management")),
      className: "border-fuchsia-300 text-fuchsia-600 hover:bg-fuchsia-50 hover:text-fuchsia-800",
      moduleId: "blog"
    },
    {
      id: "categories",
      ...getModuleText("categories"),
      icon: Box,
      onClick: () => trackButtonClick("categories", () => setLocation("/category-management")),
      className: "border-violet-300 text-violet-600 hover:bg-violet-50 hover:text-violet-800",
      moduleId: "categories"
    },
    {
      id: "barcode",
      ...getModuleText("barcode"),
      icon: QrCode,
      onClick: () => trackButtonClick("barcode", () => setLocation("/admin/barcode-inventory")),
      className: "border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-800",
      moduleId: "barcode"
    },
    {
      id: "database-backup",
      ...getModuleText("database-backup"),
      icon: Database,
      onClick: () => trackButtonClick("database-backup", () => setLocation("/admin/database-management")),
      className: "border-stone-300 text-stone-600 hover:bg-stone-50 hover:text-stone-800",
      moduleId: "database_backup"
    },
    {
      id: "user-management",
      ...getModuleText("user-management"),
      icon: UserCog,
      onClick: () => trackButtonClick("user-management", () => setLocation("/admin/user-management")),
      className: "border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800",
      moduleId: "user_management"
    },
    {
      id: "sms",
      ...getModuleText("sms"),
      icon: Smartphone,
      onClick: () => trackButtonClick("sms", () => setLocation("/admin/sms-management")),
      className: "border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-800",
      moduleId: "sms"
    },
    {
      id: "factory",
      ...getModuleText("factory"),
      icon: Factory,
      onClick: () => trackButtonClick("factory", () => setLocation("/admin/factory-management")),
      className: "border-neutral-300 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800",
      moduleId: "factory"
    },
    {
      id: "procedures",
      ...getModuleText("procedures"),
      icon: BookOpen,
      onClick: () => trackButtonClick("procedures", () => setLocation("/admin/procedures-management")),
      className: "border-zinc-300 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800",
      moduleId: "procedures"
    },
    {
      id: "refresh-control",
      ...getModuleText("refresh-control"),
      icon: RefreshCw,
      onClick: () => trackButtonClick("refresh-control", () => setLocation("/admin/global-refresh-settings")),
      className: "border-green-300 text-green-600 hover:bg-green-50 hover:text-green-800",
      moduleId: "refresh_control"
    },
    {
      id: "logistics",
      ...getModuleText("logistics"),
      icon: Truck,
      onClick: () => trackButtonClick("logistics", () => setLocation("/admin/logistics-management")),
      className: "border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-800",
      moduleId: "logistics_management"
    },
    {
      id: "ticketing",
      ...getModuleText("ticketing"),
      icon: Ticket,
      onClick: () => trackButtonClick("ticketing", () => setLocation("/admin/ticketing-system")),
      className: "border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-800",
      moduleId: "ticketing_system"
    },

    {
      id: "remote-desktop",
      ...getModuleText("remote-desktop"),
      icon: RemoteMonitor,
      onClick: () => trackButtonClick("remote-desktop", () => setLocation("/admin/remote-desktop")),
      className: "border-cyan-300 text-cyan-600 hover:bg-cyan-50 hover:text-cyan-800",
      moduleId: "remote_desktop"
    },
    {
      id: "server-config",
      ...getModuleText("server-config"),
      icon: Server,
      onClick: () => trackButtonClick("server-config", () => setLocation("/admin/server-config")),
      className: "border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-800",
      moduleId: "server_config"
    },
    {
      id: "aws-s3-settings",
      ...getModuleText("aws-s3-settings"),
      icon: Cloud,
      onClick: () => trackButtonClick("aws-s3-settings", () => setLocation("/admin/aws-s3-settings")),
      className: "border-sky-300 text-sky-600 hover:bg-sky-50 hover:text-sky-800",
      moduleId: "aws_s3_settings"
    },
    {
      id: "missing-images",
      ...getModuleText("missing-images"),
      icon: Cloud,
      onClick: () => trackButtonClick("missing-images", () => setLocation("/admin/missing-images")),
      className: "border-red-300 text-red-600 hover:bg-red-50 hover:text-red-800",
      moduleId: "missing_images_management"
    },
    {
      id: "fib-settings",
      ...getModuleText("fib-settings"),
      icon: CreditCard,
      onClick: () => trackButtonClick("fib-settings", () => setLocation("/admin/fib-settings")),
      className: "border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800",
      moduleId: "fib_payment_settings"
    },
    {
      id: "user-guide",
      ...getModuleText("user-guide"),
      icon: BookOpen,
      onClick: () => trackButtonClick("user-guide", () => setLocation("/user-guide")),
      className: "border-teal-300 text-teal-600 hover:bg-teal-50 hover:text-teal-800",
      moduleId: "user_guide"
    },
    {
      id: "marketing-module",
      ...getModuleText("marketing-module"),
      icon: BarChart3,
      onClick: () => trackButtonClick("marketing-module", () => setLocation("/admin/marketing-module")),
      className: "border-purple-300 text-purple-600 hover:bg-purple-50 hover:text-purple-800",
      moduleId: "marketing_module"
    },
    {
      id: "super-admin-order-management",
      ...getModuleText("super-admin-order-management"),
      icon: Shield,
      onClick: () => trackButtonClick("super-admin-order-management", () => setLocation("/admin/super-admin-order-management")),
      className: "border-red-300 text-red-600 hover:bg-red-50 hover:text-red-800 font-semibold",
      moduleId: "order_management"
    },
    {
      id: "whatsapp-crm",
      ...getModuleText("whatsapp-crm"),
      icon: MessageCircle,
      onClick: () => trackButtonClick("whatsapp-crm", () => setLocation("/admin/whatsapp-crm")),
      className: "border-green-400 text-green-600 hover:bg-green-50 hover:text-green-800",
      moduleId: "whatsapp_crm"
    }

  ];

  const getFilteredButtons = () => {
    if (isLoadingPermissions || !userPermissions || typeof userPermissions !== 'object' || !('success' in userPermissions) || !userPermissions.success) return [];
    
    const permissions = userPermissions as any;
    console.log('🔍 [DEBUG] Full userPermissions response:', permissions);
    console.log('🔍 [DEBUG] userPermissions.modules:', permissions.modules);
    console.log('🔍 [DEBUG] userPermissions.permissions:', permissions.permissions);
    
    // Try both the modules array and permissions array for compatibility
    const allowedModules = permissions.modules || permissions.permissions?.map((p: any) => p.moduleId) || [];
    const allButtons = getInitialButtons();
    console.log('🔍 [DEBUG] Total allButtons count:', allButtons.length);
    console.log('🔍 [DEBUG] AI Settings exists in allButtons:', !!allButtons.find(b => b.id === 'ai-settings'));
    console.log('🔍 [DEBUG] Content Management exists in allButtons:', !!allButtons.find(b => b.id === 'content-management'));
    
    console.log('🔍 [DEBUG] allowedModules:', allowedModules);
    console.log('🔍 [DEBUG] kpi_dashboard in allowedModules?', allowedModules.includes('kpi_dashboard'));
    console.log('🔍 [DEBUG] management_dashboard in allowedModules?', allowedModules.includes('management_dashboard'));
    console.log('🔍 [DEBUG] finance in allowedModules?', allowedModules.includes('finance'));
    console.log('🔍 [DEBUG] geography_analytics in allowedModules?', allowedModules.includes('geography_analytics'));
    console.log('🔍 [DEBUG] ai_settings in allowedModules?', allowedModules.includes('ai_settings'));
    console.log('🔍 [DEBUG] content_management in allowedModules?', allowedModules.includes('content_management'));
    
    const filtered = allButtons.filter(button => 
      !button.moduleId || allowedModules.includes(button.moduleId)
    );
    
    console.log('🔍 [CRITICAL] Missing button detection:');
    const missingButtons = allButtons.filter(button => {
      const included = !button.moduleId || allowedModules.includes(button.moduleId);
      if (!included) {
        console.log('🔍 [MISSING]', button.id, button.label, 'moduleId:', button.moduleId);
      }
      return !included;
    });
    console.log('🔍 [CRITICAL] Missing buttons count:', missingButtons.length);
    
    console.log('🔍 [DEBUG] finance button found in allButtons?', allButtons.find(b => b.moduleId === 'finance'));
    console.log('🔍 [DEBUG] geography_analytics button found in allButtons?', allButtons.find(b => b.moduleId === 'geography_analytics'));
    console.log('🔍 [DEBUG] ai_settings button found in allButtons?', allButtons.find(b => b.moduleId === 'ai_settings'));
    console.log('🔍 [DEBUG] content_management button found in allButtons?', allButtons.find(b => b.moduleId === 'content_management'));
    console.log('🔍 [DEBUG] finance button in filtered?', filtered.find(b => b.moduleId === 'finance'));
    console.log('🔍 [DEBUG] geography_analytics button in filtered?', filtered.find(b => b.moduleId === 'geography_analytics'));
    console.log('🔍 [DEBUG] ai_settings button in filtered?', filtered.find(b => b.moduleId === 'ai_settings'));
    console.log('🔍 [DEBUG] content_management button in filtered?', filtered.find(b => b.moduleId === 'content_management'));
    
    return filtered;
  };

  const mergeSavedOrder = (allowedButtons: QuickActionButton[]) => {
    try {
      const savedIds = JSON.parse(localStorage.getItem(QUICK_ACTION_ORDER_KEY) || "[]");
      if (!Array.isArray(savedIds)) return allowedButtons;
      const byId = new Map(allowedButtons.map((button) => [button.id, button]));
      const savedAllowed = savedIds
        .filter((id): id is string => typeof id === "string" && byId.has(id))
        .map((id) => byId.get(id)!);
      const savedSet = new Set(savedAllowed.map((button) => button.id));
      return [...savedAllowed, ...allowedButtons.filter((button) => !savedSet.has(button.id))];
    } catch {
      return allowedButtons;
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    setButtons((currentButtons) => {
      const nextButtons = [...currentButtons];
      const [movedButton] = nextButtons.splice(result.source.index, 1);
      nextButtons.splice(result.destination!.index, 0, movedButton);
      localStorage.setItem(QUICK_ACTION_ORDER_KEY, JSON.stringify(nextButtons.map((button) => button.id)));
      return nextButtons;
    });
  };

  const resetButtonOrder = () => {
    localStorage.removeItem(QUICK_ACTION_ORDER_KEY);
    const filteredButtons = getFilteredButtons();
    setButtons(filteredButtons);
    toast({ title: siteManagementCopy.success, description: siteManagementCopy.orderReset });
  };

  // Show loading while authenticating
  if (authLoading) {
    return (
      <div
        lang={language}
        dir={direction}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">{siteManagementCopy.loadingSiteManagement}</p>
        </div>
      </div>
    );
  }

  // Show not authenticated message
  if (!isAuthenticated) {
    return (
      <div
        lang={language}
        dir={direction}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
      >
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300 text-lg">{siteManagementCopy.redirectingToLogin}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      lang={language}
      dir={direction}
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>{siteManagementCopy.backToHome}</span>
            </Button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              {siteManagementCopy.title}
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={resetButtonOrder}
              variant="outline"
              size="sm"
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
            >
               {siteManagementCopy.resetOrder}
            </Button>
            <div className="text-sm text-gray-500 dark:text-gray-400">
               {siteManagementCopy.welcome(user?.username || "")}
            </div>
          </div>
        </div>

         {/* Quick Actions Grid */}
        <Card className="p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              {siteManagementCopy.quickActions}
            </h2>
             <div className="text-sm text-gray-500 dark:text-gray-400 text-right">
               <div>{siteManagementCopy.modulesAvailable(buttons.length)}</div>
               <div className="text-xs mt-1">{siteManagementCopy.dragInstruction}</div>
             </div>
          </div>

          {isLoadingPermissions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">{siteManagementCopy.loadingModules}</p>
            </div>
          ) : (
             <DragDropContext onDragEnd={handleDragEnd}>
               <Droppable droppableId="quick-actions" direction="horizontal">
                 {(dropProvided) => (
                   <div
                     ref={dropProvided.innerRef}
                     {...dropProvided.droppableProps}
                     className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
                   >
                     {buttons.map((button, index) => (
                       <Draggable key={button.id} draggableId={button.id} index={index}>
                         {(dragProvided, snapshot) => (
                           <div
                             ref={dragProvided.innerRef}
                             {...dragProvided.draggableProps}
                             className={`relative flex min-w-0 items-stretch ${snapshot.isDragging ? "z-10" : ""}`}
                           >
                             <Button
                               onClick={button.onClick}
                               variant="outline"
                               className={`min-w-0 flex-1 h-24 rounded-e-none flex flex-col items-center justify-center space-y-2 transition-transform duration-200 hover:scale-[1.02] ${button.className}`}
                             >
                               <button.icon className="w-6 h-6" />
                               <span className="text-xs font-medium text-center leading-tight">
                                 {button.label}
                               </span>
                             </Button>
                             <button
                               type="button"
                               aria-label={siteManagementCopy.dragHandleLabel}
                               title={siteManagementCopy.dragHandleLabel}
                               {...dragProvided.dragHandleProps}
                               className={`flex w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-e-md border border-s-0 border-current/20 bg-slate-100/80 text-slate-500 transition-colors hover:bg-slate-200 active:cursor-grabbing dark:bg-slate-700/80 dark:text-slate-300 dark:hover:bg-slate-600 ${button.className}`}
                             >
                               <GripVertical className="h-4 w-4" aria-hidden="true" />
                             </button>
                           </div>
                         )}
                       </Draggable>
                     ))}
                     {dropProvided.placeholder}
                   </div>
                 )}
               </Droppable>
             </DragDropContext>
          )}
        </Card>

        {/* Kardex Sync Dialog */}
        <Dialog open={showKardexSync} onOpenChange={setShowKardexSync}>
          <DialogContent dir={direction} className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{siteManagementCopy.syncingShop}</DialogTitle>
            </DialogHeader>
            <KardexSyncPanel />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}