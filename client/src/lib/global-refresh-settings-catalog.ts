import type { Language } from "@/lib/i18n";

export const GLOBAL_REFRESH_LOCALES: Record<Language, string> = {
  en: "en-US",
  fa: "fa-IR",
  ar: "ar-IQ",
  tr: "tr-TR",
};

export type RefreshDepartmentKey =
  | "financial"
  | "warehouse"
  | "logistics"
  | "email"
  | "inventory"
  | "crm"
  | "orders"
  | "inquiries";

export interface GlobalRefreshCopy {
  title: string;
  help: string;
  globalCard: string;
  syncUnits: string;
  syncOn: string;
  syncOff: string;
  globalInterval: string;
  active: string;
  inactive: string;
  separateSettings: string;
  autoRefresh: string;
  interval: string;
  helpTitle: string;
  helpSyncOn: string;
  helpSyncOff: string;
  helpImmediate: string;
  saved: string;
  newInterval: string;
  syncEnabled: string;
  syncDisabled: string;
  departmentsShared: string;
  departmentsSeparate: string;
  autoEnabled: string;
  autoDisabled: string;
  departmentNames: Record<RefreshDepartmentKey, { name: string; description: string }>;
  units: { minute: string; minutes: string; hour: string };
}

export const globalRefreshCatalog = {
  en: {
    title: "Central refresh control",
    help: "Set refresh timing for every organization unit.",
    globalCard: "Global settings",
    syncUnits: "Sync departments",
    syncOn: "All departments refresh on one shared interval.",
    syncOff: "Each department uses its own interval.",
    globalInterval: "Global interval",
    active: "Active",
    inactive: "Inactive",
    separateSettings: "Separate settings",
    autoRefresh: "Automatic refresh",
    interval: "Refresh interval",
    helpTitle: "How it works",
    helpSyncOn: "When sync is on, every department uses the shared interval.",
    helpSyncOff: "When sync is off, each department can use its own interval.",
    helpImmediate: "Changes are applied immediately across department pages.",
    saved: "Settings saved",
    newInterval: "New interval",
    syncEnabled: "Synchronization enabled",
    syncDisabled: "Synchronization disabled",
    departmentsShared: "All departments now use one shared interval.",
    departmentsSeparate: "Each department now has its own settings.",
    autoEnabled: "Automatic refresh enabled",
    autoDisabled: "Automatic refresh disabled",
    departmentNames: {
      financial: { name: "Finance", description: "Payments and financial operations" },
      warehouse: { name: "Warehouse", description: "Stock receiving and storage" },
      logistics: { name: "Logistics", description: "Delivery and shipment operations" },
      email: { name: "Email system", description: "Outbound messages and notifications" },
      inventory: { name: "Inventory management", description: "Product availability and counts" },
      crm: { name: "Customer management", description: "Customer records and relationships" },
      orders: { name: "Order management", description: "Order review and fulfillment" },
      inquiries: { name: "Inquiry tracking", description: "Quotes and incoming inquiries" },
    },
    units: { minute: "minute", minutes: "minutes", hour: "hour" },
  },
  fa: {
    title: "کنترل مرکزی به‌روزرسانی",
    help: "زمان‌بندی به‌روزرسانی همه واحدهای سازمان را تنظیم کنید.",
    globalCard: "تنظیمات کلی",
    syncUnits: "همگام‌سازی واحدها",
    syncOn: "همه واحدها با یک فاصله زمانی مشترک به‌روزرسانی می‌شوند.",
    syncOff: "هر واحد فاصله زمانی مخصوص خود را دارد.",
    globalInterval: "فاصله زمانی کلی",
    active: "فعال",
    inactive: "غیرفعال",
    separateSettings: "تنظیمات جداگانه",
    autoRefresh: "به‌روزرسانی خودکار",
    interval: "فاصله زمانی",
    helpTitle: "راهنما",
    helpSyncOn: "با فعال بودن همگام‌سازی، همه واحدها از فاصله زمانی مشترک استفاده می‌کنند.",
    helpSyncOff: "با غیرفعال بودن همگام‌سازی، هر واحد فاصله زمانی خودش را دارد.",
    helpImmediate: "تغییرات بلافاصله در صفحه‌های واحدها اعمال می‌شوند.",
    saved: "تنظیمات ذخیره شد",
    newInterval: "فاصله زمانی جدید",
    syncEnabled: "همگام‌سازی فعال شد",
    syncDisabled: "همگام‌سازی غیرفعال شد",
    departmentsShared: "همه واحدها اکنون از یک فاصله زمانی مشترک استفاده می‌کنند.",
    departmentsSeparate: "هر واحد اکنون تنظیمات جداگانه دارد.",
    autoEnabled: "به‌روزرسانی خودکار فعال شد",
    autoDisabled: "به‌روزرسانی خودکار غیرفعال شد",
    departmentNames: {
      financial: { name: "واحد مالی", description: "پرداخت‌ها و عملیات مالی" },
      warehouse: { name: "واحد انبار", description: "دریافت و نگهداری موجودی" },
      logistics: { name: "واحد لجستیک", description: "عملیات ارسال و تحویل" },
      email: { name: "سیستم ایمیل", description: "پیام‌ها و اعلان‌های ارسالی" },
      inventory: { name: "مدیریت موجودی", description: "موجودی و تعداد محصولات" },
      crm: { name: "مدیریت مشتریان", description: "پرونده و ارتباط با مشتریان" },
      orders: { name: "مدیریت سفارشات", description: "بررسی و تکمیل سفارش‌ها" },
      inquiries: { name: "پیگیری استعلامات", description: "پیشنهادها و استعلام‌های دریافتی" },
    },
    units: { minute: "دقیقه", minutes: "دقیقه", hour: "ساعت" },
  },
  ar: {
    title: "التحكم المركزي بالتحديث",
    help: "اضبط توقيت التحديث لكل وحدات المؤسسة.",
    globalCard: "الإعدادات العامة",
    syncUnits: "مزامنة الوحدات",
    syncOn: "تتحدث جميع الوحدات وفق فترة زمنية مشتركة.",
    syncOff: "تستخدم كل وحدة فترة زمنية خاصة بها.",
    globalInterval: "الفترة الزمنية العامة",
    active: "نشط",
    inactive: "غير نشط",
    separateSettings: "إعدادات منفصلة",
    autoRefresh: "التحديث التلقائي",
    interval: "فترة التحديث",
    helpTitle: "طريقة العمل",
    helpSyncOn: "عند تفعيل المزامنة تستخدم جميع الوحدات الفترة المشتركة.",
    helpSyncOff: "عند إيقاف المزامنة يمكن لكل وحدة استخدام فترتها الخاصة.",
    helpImmediate: "تُطبق التغييرات فوراً في صفحات الوحدات.",
    saved: "تم حفظ الإعدادات",
    newInterval: "الفترة الجديدة",
    syncEnabled: "تم تفعيل المزامنة",
    syncDisabled: "تم إيقاف المزامنة",
    departmentsShared: "تستخدم جميع الوحدات الآن فترة زمنية مشتركة.",
    departmentsSeparate: "لكل وحدة الآن إعداداتها الخاصة.",
    autoEnabled: "تم تفعيل التحديث التلقائي",
    autoDisabled: "تم إيقاف التحديث التلقائي",
    departmentNames: {
      financial: { name: "المالية", description: "المدفوعات والعمليات المالية" },
      warehouse: { name: "المستودع", description: "استلام المخزون وتخزينه" },
      logistics: { name: "اللوجستيات", description: "عمليات الشحن والتسليم" },
      email: { name: "نظام البريد", description: "الرسائل والإشعارات الصادرة" },
      inventory: { name: "إدارة المخزون", description: "توفر المنتجات وكمياتها" },
      crm: { name: "إدارة العملاء", description: "سجلات العملاء وعلاقاتهم" },
      orders: { name: "إدارة الطلبات", description: "مراجعة الطلبات وتنفيذها" },
      inquiries: { name: "متابعة الاستفسارات", description: "العروض والاستفسارات الواردة" },
    },
    units: { minute: "دقيقة", minutes: "دقائق", hour: "ساعة" },
  },
  tr: {
    title: "Merkezi yenileme kontrolü",
    help: "Tüm kurum birimleri için yenileme zamanını belirleyin.",
    globalCard: "Genel ayarlar",
    syncUnits: "Birimleri senkronize et",
    syncOn: "Tüm birimler ortak bir aralıkla yenilenir.",
    syncOff: "Her birim kendi aralığını kullanır.",
    globalInterval: "Genel aralık",
    active: "Etkin",
    inactive: "Devre dışı",
    separateSettings: "Ayrı ayarlar",
    autoRefresh: "Otomatik yenileme",
    interval: "Yenileme aralığı",
    helpTitle: "Nasıl çalışır",
    helpSyncOn: "Senkronizasyon açıkken tüm birimler ortak aralığı kullanır.",
    helpSyncOff: "Senkronizasyon kapalıyken her birim kendi aralığını kullanabilir.",
    helpImmediate: "Değişiklikler birim sayfalarına hemen uygulanır.",
    saved: "Ayarlar kaydedildi",
    newInterval: "Yeni aralık",
    syncEnabled: "Senkronizasyon etkinleştirildi",
    syncDisabled: "Senkronizasyon devre dışı bırakıldı",
    departmentsShared: "Tüm birimler artık ortak bir aralık kullanıyor.",
    departmentsSeparate: "Her birimin artık kendi ayarları var.",
    autoEnabled: "Otomatik yenileme etkinleştirildi",
    autoDisabled: "Otomatik yenileme devre dışı bırakıldı",
    departmentNames: {
      financial: { name: "Finans", description: "Ödemeler ve finans işlemleri" },
      warehouse: { name: "Depo", description: "Stok kabulü ve depolama" },
      logistics: { name: "Lojistik", description: "Teslimat ve sevkiyat işlemleri" },
      email: { name: "E-posta sistemi", description: "Giden mesajlar ve bildirimler" },
      inventory: { name: "Envanter yönetimi", description: "Ürün bulunurluğu ve adetleri" },
      crm: { name: "Müşteri yönetimi", description: "Müşteri kayıtları ve ilişkileri" },
      orders: { name: "Sipariş yönetimi", description: "Sipariş inceleme ve hazırlama" },
      inquiries: { name: "Talep takibi", description: "Teklifler ve gelen talepler" },
    },
    units: { minute: "dakika", minutes: "dakika", hour: "saat" },
  },
} satisfies Record<Language, GlobalRefreshCopy>;