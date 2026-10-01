import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Activity, AlertTriangle, ArrowLeft, ArrowUpRight, Boxes, BriefcaseBusiness,
  Building2, CircleDollarSign, Clock3, Database, Gauge,
  HardDrive, Mail, Package, RefreshCw, Server, ShoppingBag, ShoppingCart,
  Truck, Users, Wifi, type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { contractTheme } from "@/lib/contract-theme";

type Language = "en" | "ar" | "tr" | "fa";
const salesPeriods = ["week", "month", "quarter", "halfYear", "year", "all"] as const;
type SalesPeriod = typeof salesPeriods[number];
const salesPeriodLabels: Record<Language, Record<SalesPeriod, string>> = {
  en: { week: "Weekly", month: "Monthly", quarter: "3 months", halfYear: "6 months", year: "Yearly", all: "All time" },
  ar: { week: "أسبوعي", month: "شهري", quarter: "3 أشهر", halfYear: "6 أشهر", year: "سنوي", all: "الكل" },
  tr: { week: "Haftalık", month: "Aylık", quarter: "3 ay", halfYear: "6 ay", year: "Yıllık", all: "Tüm zamanlar" },
  fa: { week: "هفتگی", month: "ماهانه", quarter: "سه‌ماهه", halfYear: "شش‌ماهه", year: "سالانه", all: "کلی" },
};
type DashboardPayload = {
  summary: {
    salesByCurrency: { currency: string; amount: string }[];
    activeOrders: number;
    onlineCustomers: number;
    systemAlerts: number;
    activeContracts: number;
    activeVendors: number;
  };
  quickStats: {
    orderStatuses: { pending: number; processing: number; readyToShip: number; delivered: number };
    departmentQueues: { finance: number; warehouse: number; logistics: number };
    criticalInventory: { name: string; stock: number; status: string }[];
    activeContractList: { id: number | string; number: string; customerName: string }[];
    vendorSales: { vendorId: number | string; vendorName: string; currency: string; amount: string; orders: number }[];
  };
};
type HealthPayload = {
  server: { cpu: number; memory: number; disk: number | null; status: string };
  services: { database: string; email: string; sms: string };
  backup: { lastBackup: string | null; status: string; nextScheduled: string | null };
  performance: { responseTime: number; uptime: number };
};
type Envelope<T> = { success: boolean; data: T; message?: string };

const copy: Record<Language, Record<string, string>> = {
  en: {
    title: "Management overview", eyebrow: "MOMTAZCHEM · OPERATIONS", subtitle: "A clear read on today's business and the systems behind it.",
    back: "Site management", refresh: "Refresh data", refreshing: "Refreshing", overview: "Overview", operations: "Operations", analytics: "Analytics", system: "System health",
    live: "Live signals", dailySales: "Sales today", activeOrders: "Active orders", onlineCustomers: "Active customer sessions", alerts: "Orders requiring attention", activeContracts: "Active contracts", activeVendors: "Active vendors",
    salesByCurrency: "Sales by currency", currenciesNote: "Each currency is reported separately.", noSales: "No eligible orders in this period.", salesPeriod: "Sales period",
    quickAccess: "Quick access", orders: "Order management", warehouse: "Warehouse", finance: "Finance orders", vendors: "Vendor accounting", contracts: "Contract management",
    orderFlow: "Order flow", pending: "Pending", processing: "Processing", readyToShip: "Ready to ship", delivered: "Delivered",
    queues: "Department queues", financeQueue: "Finance", warehouseQueue: "Warehouse", logistics: "Logistics", queueCount: "items in queue",
    inventory: "Critical inventory", inventoryHint: "Items flagged for attention", stock: "Stock", inventoryStatus: "Stock status", noInventory: "No critical inventory reported.",
    contractsList: "Active contract register", contract: "Contract", customer: "Customer", noContracts: "No active contracts reported.",
    vendorSales: "All-time net vendor sales", vendorSalesNote: "Completed sales less refunds on eligible orders. Currency totals stay separate.", vendor: "Vendor", currency: "Currency", amount: "Net sales", vendorOrders: "Orders", noVendorSales: "No vendor sales reported.",
    systemStatus: "System status", server: "Server", cpu: "Host load estimate (%)", memory: "Host memory usage (%)", disk: "Host disk usage (%)", services: "Services", database: "Database", email: "Email", sms: "SMS",
    backup: "Backup", lastBackup: "Last backup", nextBackup: "Next scheduled", responseTime: "Database probe", uptime: "Process uptime", ms: "ms", dayShort: "d", hourShort: "h", minuteShort: "m", secondShort: "s", unknown: "Unknown", unavailable: "Unavailable",
    configured: "Configured", online: "Online", offline: "Offline", healthy: "Healthy", degraded: "Degraded", error: "Could not load this data.", retry: "Try again",
    loading: "Loading live business signals…", noData: "No data reported", seconds: "ms", minutes: "min", hours: "hr",
    attention: "Attention", clear: "Clear", inventoryCritical: "Critical", inventoryLow: "Low", inventoryWarning: "Warning", since: "Updated",
    authTitle: "Sign-in required", authText: "Sign in to view the management overview.", goToSite: "Return to site management", signalBoard: "Operational signal board",
  },
  ar: {
    title: "نظرة عامة للإدارة", eyebrow: "ممتازكيم · العمليات", subtitle: "قراءة واضحة لأعمال اليوم والأنظمة التي تدعمها.",
    back: "إدارة الموقع", refresh: "تحديث البيانات", refreshing: "جارٍ التحديث", overview: "نظرة عامة", operations: "العمليات", analytics: "التحليلات", system: "صحة النظام",
    live: "مؤشرات مباشرة", dailySales: "مبيعات اليوم", activeOrders: "الطلبات النشطة", onlineCustomers: "جلسات العملاء النشطة", alerts: "طلبات تتطلب الانتباه", activeContracts: "العقود النشطة", activeVendors: "الموردون النشطون",
    salesByCurrency: "المبيعات حسب العملة", currenciesNote: "تُعرض كل عملة بشكل مستقل.", noSales: "لا توجد طلبات مؤهلة في هذه الفترة.", salesPeriod: "فترة المبيعات",
    quickAccess: "وصول سريع", orders: "إدارة الطلبات", warehouse: "المستودع", finance: "الطلبات المالية", vendors: "محاسبة الموردين", contracts: "إدارة العقود", contractsList: "سجل العقود النشطة",
    orderFlow: "تدفق الطلبات", pending: "قيد الانتظار", processing: "قيد المعالجة", readyToShip: "جاهز للشحن", delivered: "تم التسليم",
    queues: "قوائم انتظار الأقسام", financeQueue: "المالية", warehouseQueue: "المستودع", logistics: "الخدمات اللوجستية", queueCount: "عناصر في القائمة",
    inventory: "المخزون الحرج", inventoryHint: "عناصر تتطلب الانتباه", stock: "المخزون", inventoryStatus: "حالة المخزون", noInventory: "لا يوجد مخزون حرج مُبلّغ عنه.",
    contract: "العقد", customer: "العميل", noContracts: "لا توجد عقود نشطة مُبلّغ عنها.",
    vendorSales: "صافي مبيعات الموردين طوال الفترة", vendorSalesNote: "المبيعات المكتملة بعد خصم المبالغ المستردة للطلبات المؤهلة. تُفصل العملات.", vendor: "المورد", currency: "العملة", amount: "صافي المبيعات", vendorOrders: "الطلبات", noVendorSales: "لا توجد مبيعات موردين مُبلّغ عنها.",
    systemStatus: "حالة النظام", server: "الخادم", cpu: "تقدير حمل المضيف (%)", memory: "استخدام ذاكرة المضيف (%)", disk: "استخدام قرص المضيف (%)", services: "الخدمات", database: "قاعدة البيانات", email: "البريد", sms: "الرسائل النصية",
    backup: "النسخ الاحتياطي", lastBackup: "آخر نسخة احتياطية", nextBackup: "المجدولة التالية", responseTime: "زمن فحص قاعدة البيانات", uptime: "مدة تشغيل العملية", ms: "مللي ثانية", dayShort: "ي", hourShort: "س", minuteShort: "د", secondShort: "ث", unknown: "غير معروف", unavailable: "غير متاح",
    configured: "مُهيأ", online: "متصل", offline: "غير متصل", healthy: "سليم", degraded: "متدهور", error: "تعذر تحميل هذه البيانات.", retry: "إعادة المحاولة",
    loading: "جارٍ تحميل مؤشرات الأعمال المباشرة…", noData: "لا توجد بيانات مُبلّغ عنها", seconds: "مللي ثانية", minutes: "دقيقة", hours: "ساعة",
    attention: "يتطلب الانتباه", clear: "سليم", inventoryCritical: "حرج", inventoryLow: "منخفض", inventoryWarning: "تحذير", since: "تم التحديث",
    authTitle: "يلزم تسجيل الدخول", authText: "سجّل الدخول لعرض النظرة العامة للإدارة.", goToSite: "العودة إلى إدارة الموقع", signalBoard: "لوحة المؤشرات التشغيلية",
  },
  tr: {
    title: "Yönetim özeti", eyebrow: "MOMTAZCHEM · OPERASYONLAR", subtitle: "Bugünün işleyişi ve arkasındaki sistemlere net bir bakış.",
    back: "Site yönetimi", refresh: "Verileri yenile", refreshing: "Yenileniyor", overview: "Genel bakış", operations: "Operasyonlar", analytics: "Analizler", system: "Sistem sağlığı",
    live: "Canlı göstergeler", dailySales: "Bugünkü satış", activeOrders: "Aktif siparişler", onlineCustomers: "Aktif müşteri oturumları", alerts: "İlgi gerektiren siparişler", activeContracts: "Aktif sözleşmeler", activeVendors: "Aktif tedarikçiler",
    salesByCurrency: "Para birimine göre satış", currenciesNote: "Her para birimi ayrı raporlanır.", noSales: "Bu dönemde uygun sipariş yok.", salesPeriod: "Satış dönemi",
    quickAccess: "Hızlı erişim", orders: "Sipariş yönetimi", warehouse: "Depo", finance: "Finans siparişleri", vendors: "Tedarikçi muhasebesi", contracts: "Sözleşme yönetimi", contractsList: "Aktif sözleşme kaydı",
    orderFlow: "Sipariş akışı", pending: "Bekliyor", processing: "İşleniyor", readyToShip: "Gönderime hazır", delivered: "Teslim edildi",
    queues: "Departman kuyrukları", financeQueue: "Finans", warehouseQueue: "Depo", logistics: "Lojistik", queueCount: "kuyruk öğesi",
    inventory: "Kritik stok", inventoryHint: "İlgi gerektiren ürünler", stock: "Stok", inventoryStatus: "Stok durumu", noInventory: "Kritik stok bildirilmedi.",
    contract: "Sözleşme", customer: "Müşteri", noContracts: "Aktif sözleşme bildirilmedi.",
    vendorSales: "Tüm zamanlar net tedarikçi satışları", vendorSalesNote: "Uygun siparişlerde tamamlanan satışlardan iadeler düşülür. Para birimleri ayrı tutulur.", vendor: "Tedarikçi", currency: "Para birimi", amount: "Net satış", vendorOrders: "Sipariş", noVendorSales: "Tedarikçi satışı bildirilmedi.",
    systemStatus: "Sistem durumu", server: "Sunucu", cpu: "Sunucu yük tahmini (%)", memory: "Sunucu bellek kullanımı (%)", disk: "Sunucu disk kullanımı (%)", services: "Hizmetler", database: "Veritabanı", email: "E-posta", sms: "SMS",
    backup: "Yedekleme", lastBackup: "Son yedekleme", nextBackup: "Sonraki planlama", responseTime: "Veritabanı sorgu süresi", uptime: "İşlem çalışma süresi", ms: "ms", dayShort: "g", hourShort: "sa", minuteShort: "dk", secondShort: "sn", unknown: "Bilinmiyor", unavailable: "Kullanılamıyor",
    configured: "Yapılandırıldı", online: "Çevrimiçi", offline: "Çevrimdışı", healthy: "Sağlıklı", degraded: "Performansı düşük", error: "Bu veriler yüklenemedi.", retry: "Tekrar dene",
    loading: "Canlı iş göstergeleri yükleniyor…", noData: "Veri bildirilmedi", seconds: "ms", minutes: "dk", hours: "sa",
    attention: "İlgi gerekiyor", clear: "Normal", inventoryCritical: "Kritik", inventoryLow: "Düşük", inventoryWarning: "Uyarı", since: "Güncellendi",
    authTitle: "Oturum açmanız gerekiyor", authText: "Yönetim özetini görmek için oturum açın.", goToSite: "Site yönetimine dön", signalBoard: "Operasyon sinyal panosu",
  },
  fa: {
    title: "نمای کلی مدیریت", eyebrow: "ممتازکیم · عملیات", subtitle: "نگاهی روشن به کسب‌وکار امروز و سامانه‌های پشتیبان آن.",
    back: "مدیریت سایت", refresh: "تازه‌سازی داده‌ها", refreshing: "در حال تازه‌سازی", overview: "نمای کلی", operations: "عملیات", analytics: "تحلیل‌ها", system: "سلامت سیستم",
    live: "سیگنال‌های زنده", dailySales: "فروش امروز", activeOrders: "سفارش‌های فعال", onlineCustomers: "نشست‌های فعال مشتریان", alerts: "سفارش‌های نیازمند رسیدگی", activeContracts: "قراردادهای فعال", activeVendors: "فروشندگان فعال",
    salesByCurrency: "فروش به تفکیک ارز", currenciesNote: "هر ارز جداگانه گزارش می‌شود.", noSales: "در این بازه سفارش واجد شرایطی وجود ندارد.", salesPeriod: "بازهٔ فروش",
    quickAccess: "دسترسی سریع", orders: "مدیریت سفارش‌ها", warehouse: "انبار", finance: "سفارش‌های مالی", vendors: "حسابداری فروشندگان", contracts: "مدیریت قراردادها", contractsList: "فهرست قراردادهای فعال",
    orderFlow: "جریان سفارش‌ها", pending: "در انتظار", processing: "در حال پردازش", readyToShip: "آماده ارسال", delivered: "تحویل‌شده",
    queues: "صف بخش‌ها", financeQueue: "مالی", warehouseQueue: "انبار", logistics: "لجستیک", queueCount: "مورد در صف",
    inventory: "موجودی بحرانی", inventoryHint: "موارد نیازمند توجه", stock: "موجودی", inventoryStatus: "وضعیت موجودی", noInventory: "موجودی بحرانی گزارش نشده است.",
    contract: "قرارداد", customer: "مشتری", noContracts: "قرارداد فعالی گزارش نشده است.",
    vendorSales: "خالص فروش فروشندگان در تمام دوره", vendorSalesNote: "فروش‌های تکمیل‌شده پس از کسر بازپرداخت سفارش‌های واجد شرایط. ارزها جداگانه هستند.", vendor: "فروشنده", currency: "ارز", amount: "فروش خالص", vendorOrders: "سفارش‌ها", noVendorSales: "فروش فروشنده‌ای گزارش نشده است.",
    systemStatus: "وضعیت سیستم", server: "سرور", cpu: "برآورد بار میزبان (%)", memory: "مصرف حافظه میزبان (%)", disk: "مصرف دیسک میزبان (%)", services: "سرویس‌ها", database: "پایگاه داده", email: "ایمیل", sms: "پیامک",
    backup: "پشتیبان‌گیری", lastBackup: "آخرین پشتیبان", nextBackup: "برنامه بعدی", responseTime: "زمان بررسی پایگاه داده", uptime: "مدت فعالیت فرایند", ms: "میلی‌ثانیه", dayShort: "ر", hourShort: "س", minuteShort: "د", secondShort: "ث", unknown: "نامشخص", unavailable: "در دسترس نیست",
    configured: "پیکربندی‌شده", online: "آنلاین", offline: "آفلاین", healthy: "سالم", degraded: "مختل", error: "بارگذاری این داده ناموفق بود.", retry: "تلاش دوباره",
    loading: "در حال بارگذاری سیگنال‌های زنده کسب‌وکار…", noData: "داده‌ای گزارش نشده است", seconds: "میلی‌ثانیه", minutes: "دقیقه", hours: "ساعت",
    attention: "نیازمند توجه", clear: "عادی", inventoryCritical: "بحرانی", inventoryLow: "کم", inventoryWarning: "هشدار", since: "به‌روزرسانی",
    authTitle: "ورود لازم است", authText: "برای مشاهده نمای مدیریت وارد شوید.", goToSite: "بازگشت به مدیریت سایت", signalBoard: "تابلوی سیگنال‌های عملیاتی",
  },
};

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#d7dfd9] bg-[#fffefa] shadow-[0_8px_28px_rgba(25,55,47,0.045)] ${className}`}>{children}</section>;
}

function PanelHeading({ icon: Icon, title, note }: { icon: LucideIcon; title: string; note?: string }) {
  return <div className="flex items-start gap-3 px-5 pb-4 pt-5 sm:px-6">
    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eaf1eb] text-[#24584b]"><Icon size={17} strokeWidth={1.8} /></span>
    <div className="min-w-0"><h2 className="font-semibold tracking-[-0.02em] text-[#173b34]">{title}</h2>{note && <p className="mt-0.5 text-xs leading-relaxed text-[#71817a]">{note}</p>}</div>
  </div>;
}

function DataError({ text, retry, label }: { text: string; retry: () => void; label: string }) {
  return <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-[#e6c6b6] bg-[#fff7f2] p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3"><span className="rounded-lg bg-[#f8e7dd] p-2 text-[#a04d2e]"><AlertTriangle size={17} /></span><div><p className="text-sm font-semibold text-[#713d2a]">{text}</p></div></div>
    <Button variant="outline" size="sm" className="border-[#d9b9a9] bg-transparent text-[#713d2a] hover:bg-[#f9e9df]" onClick={retry}>{/* label translated at call site */}<RefreshCw className="me-2 h-3.5 w-3.5" />{label}</Button>
  </div>;
}

function SkeletonBlock({ rows = 3 }: { rows?: number }) {
  return <div className="animate-pulse space-y-3 px-5 pb-5 sm:px-6">{Array.from({ length: rows }, (_, i) => <div key={i} className="h-10 rounded-lg bg-[#edf1ec]" />)}</div>;
}

const ManagementDashboard = () => {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { language: selectedLanguage, direction } = useLanguage();
  const language = (selectedLanguage in copy ? selectedLanguage : "en") as Language;
  const t = (key: string) => copy[language][key] || copy.en[key] || key;
  const locale = language === "fa" ? "fa-IR-u-ca-persian" : language === "ar" ? "ar-IQ" : language === "tr" ? "tr-TR" : "en-US";
  const [salesPeriod, setSalesPeriod] = React.useState<SalesPeriod>("all");
  const dashboard = useQuery<Envelope<DashboardPayload>>({
    queryKey: ["/api/management/dashboard", salesPeriod],
    enabled: !!user,
    queryFn: async () => {
      const response = await fetch(`/api/management/dashboard?period=${salesPeriod}`, { credentials: "include" });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const result = await response.json();
      if (!result?.success) throw new Error(result?.message || "Dashboard request failed");
      return result;
    },
    staleTime: 45_000,
    refetchInterval: 60_000,
  });
  const health = useQuery<Envelope<HealthPayload>>({
    queryKey: ["/api/management/system-health"],
    enabled: !!user,
    queryFn: async () => {
      const response = await fetch("/api/management/system-health", { credentials: "include" });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const result = await response.json();
      if (!result?.success) throw new Error(result?.message || "System health request failed");
      return result;
    },
    staleTime: 45_000,
    refetchInterval: 60_000,
  });
  const formatNumber = (value: number | string | null | undefined) =>
    value === null || value === undefined || value === "" ? "—" : Number(value).toLocaleString(locale);
  const formatDuration = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined || !Number.isFinite(Number(seconds))) return "—";
    let remaining = Math.max(0, Math.floor(Number(seconds)));
    const parts: string[] = [];
    for (const [size, label] of [[86_400, "dayShort"], [3_600, "hourShort"], [60, "minuteShort"], [1, "secondShort"]] as [number, string][]) {
      const count = Math.floor(remaining / size);
      remaining %= size;
      if (count > 0) parts.push(`${formatNumber(count)} ${t(label)}`);
    }
    return parts.length ? parts.join(" ") : `0 ${t("secondShort")}`;
  };
  const formatDate = (value: string | null | undefined) => value
    ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })
    : t("unavailable");
  const retryDashboard = () => { void dashboard.refetch(); };
  const retryHealth = () => { void health.refetch(); };
  const retryBoth = () => { void Promise.all([dashboard.refetch(), health.refetch()]); };
  const payload = dashboard.data?.data;
  const system = health.data?.data;
  const isRefreshing = dashboard.isFetching || health.isFetching;
  const back = () => setLocation("/mrg/site-management");
  const SalesHeading = () => <div className="flex flex-wrap items-start justify-between gap-2 pe-5 sm:pe-6">
    <PanelHeading icon={CircleDollarSign} title={t("salesByCurrency")} note={t("currenciesNote")} />
    <div className="pb-4 pt-5">
      <Select value={salesPeriod} onValueChange={(value: SalesPeriod) => setSalesPeriod(value)}>
        <SelectTrigger className="h-9 w-[150px] border-[#cbd8ce] bg-[#fffefa] text-xs" aria-label={t("salesPeriod")} data-testid="sales-period-filter">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{salesPeriods.map(period => <SelectItem key={period} value={period}>{salesPeriodLabels[language][period]}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  </div>;

  if (!user) return <div dir={direction} className="min-h-[75dvh] bg-[#f2f5ef] px-5 py-20 text-center text-[#173b34]">
    <div className="mx-auto max-w-md rounded-3xl border border-[#d7dfd9] bg-[#fffefa] p-10 shadow-sm"><Building2 className="mx-auto mb-5 h-8 w-8 text-[#3c7862]" /><h1 className="text-2xl font-semibold">{t("authTitle")}</h1><p className="mt-2 text-sm text-[#71817a]">{t("authText")}</p><Button onClick={back} className="mt-6 bg-[#1e5145] text-white hover:bg-[#173f36]"><ArrowLeft className="me-2 h-4 w-4" />{t("goToSite")}</Button></div>
  </div>;

  const LinkItem = ({ icon: Icon, label, href }: { icon: LucideIcon; label: string; href: string }) =>
    <button type="button" onClick={() => setLocation(href)} className="group flex min-h-[64px] items-center gap-3 rounded-xl border border-[#e0e7e0] bg-[#fffefa] px-4 text-start transition-all duration-200 hover:-translate-y-0.5 hover:border-[#93b5a3] hover:bg-[#f4f8f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e8b70]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eaf1eb] text-[#24584b] transition-colors group-hover:bg-[#dcebe0]"><Icon size={17} /></span><span className="min-w-0 flex-1 text-sm font-medium text-[#25463d]">{label}</span><ArrowUpRight size={15} className="text-[#82928a] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </button>;

  const Metric = ({ title, value, icon: Icon, accent = false }: { title: string; value: number | string | null | undefined; icon: LucideIcon; accent?: boolean }) =>
    <div className={`relative overflow-hidden rounded-2xl border p-5 transition-transform duration-200 hover:-translate-y-0.5 ${accent ? "border-[#1e5145] bg-[#1e5145] text-[#f6f5e9]" : "border-[#d7dfd9] bg-[#fffefa] text-[#173b34]"}`}>
      <span className={`absolute -right-3 -top-4 h-24 w-24 rounded-full ${accent ? "bg-[#d6df73]/10" : "bg-[#d6df73]/20"}`} /><div className="relative flex items-start justify-between gap-3"><div><p className={`text-xs font-medium ${accent ? "text-[#c1d3c5]" : "text-[#73837c]"}`}>{title}</p><p className="mt-3 font-mono text-3xl font-semibold tracking-[-0.055em]">{typeof value === "number" ? formatNumber(value) : value ?? "—"}</p></div><span className={`rounded-xl p-2.5 ${accent ? "bg-[#d6df73] text-[#1a443b]" : "bg-[#edf2e9] text-[#356957]"}`}><Icon size={18} strokeWidth={1.8} /></span></div>
    </div>;

  const statusName = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === "online" || normalized === "connected") return t("online");
    if (normalized === "offline" || normalized === "disconnected") return t("offline");
    if (normalized === "configured") return t("configured");
    if (normalized === "healthy" || normalized === "ok") return t("healthy");
    if (normalized === "degraded" || normalized === "warning") return t("degraded");
    if (normalized === "unavailable" || normalized === "unknown") return t(normalized);
    return status;
  };
  const StatusPill = ({ status, label }: { status: string; label?: string }) => {
    const normalized = status.toLowerCase();
    const positive = ["online", "connected", "healthy", "ok"].includes(normalized);
    const concern = ["offline", "disconnected", "degraded", "error", "failed", "critical", "low", "warning"].includes(normalized);
    return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${positive ? "bg-[#e6f1e6] text-[#28624c]" : concern ? "bg-[#f9e8dc] text-[#965032]" : "bg-[#f0f2eb] text-[#6c786f]"}`}><span className={`h-1.5 w-1.5 rounded-full ${positive ? "bg-[#4e8b64]" : concern ? "bg-[#c46b42]" : "bg-[#9ba79e]"}`} />{label || statusName(status)}</span>;
  };
  const EmptyRow = ({ children }: { children: React.ReactNode }) =>
    <div className="mx-5 mb-5 rounded-xl border border-dashed border-[#d7dfd9] bg-[#f7f8f3] px-4 py-6 text-center text-sm text-[#78867d] sm:mx-6">{children}</div>;
  const RequestError = ({ query, retry }: { query: typeof dashboard | typeof health; retry: () => void }) =>
    query.isError ? <DataError text={t("error")} label={t("retry")} retry={retry} /> : null;

  return <div dir={direction} className="min-h-[100dvh] bg-[#f2f5ef] text-[#173b34]">
    <div className="pointer-events-none fixed inset-0 opacity-[0.23]" style={{ backgroundImage: "radial-gradient(#91a99a 0.55px, transparent 0.55px)", backgroundSize: "17px 17px" }} />
    <main className="relative mx-auto w-full max-w-[1480px] px-4 pb-12 pt-5 sm:px-7 sm:pt-8 lg:px-10">
      <header className="mb-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={back} type="button" aria-label={t("back")} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4ded5] bg-[#fffefa] text-[#356957] transition-colors hover:bg-[#e7efe6]"><ArrowLeft size={17} /></button>
            <span className="hidden h-9 w-px bg-[#d4ded5] sm:block" />
            <div className="leading-tight"><p className="text-[10px] font-bold tracking-[0.18em] text-[#74877b]">{t("eyebrow")}</p><p className="mt-1 text-xs text-[#87938b]">{t("signalBoard")}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-end sm:block"><p className="text-[10px] uppercase tracking-[0.11em] text-[#819087]">{t("since")}</p><p className="mt-1 font-mono text-xs text-[#51685d]">{dashboard.dataUpdatedAt ? new Date(dashboard.dataUpdatedAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : "—"}</p></div>
            <Button variant="outline" onClick={retryBoth} disabled={isRefreshing} className="h-10 border-[#cbd8ce] bg-[#fffefa] text-[#285747] hover:bg-[#e9f0e8]">
              <RefreshCw className={`me-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />{isRefreshing ? t("refreshing") : t("refresh")}
            </Button>
          </div>
        </div>
        <div className="mt-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#cbd9cc] bg-[#e8f0e7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#386c55]"><span className="h-1.5 w-1.5 rounded-full bg-[#70a06e]" />{t("live")}</p><h1 className="text-[clamp(2rem,4.2vw,3.3rem)] font-semibold leading-[1.08] tracking-[-0.06em] text-[#163b32]">{t("title")}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-[#6d7f75]">{t("subtitle")}</p></div>
          <div className="flex items-center gap-2 text-xs text-[#6a7a71]"><Activity size={15} className="text-[#53866e]" /><span>{t("signalBoard")}</span></div>
        </div>
      </header>

      {(dashboard.isError || health.isError) && <div className="mb-5 grid gap-3 md:grid-cols-2">
        {dashboard.isError && <RequestError query={dashboard} retry={retryDashboard} />}
        {health.isError && <RequestError query={health} retry={retryHealth} />}
      </div>}

      <Tabs defaultValue="overview" dir={direction} className="space-y-5">
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-[#d9e1d9] bg-[#e9eee7] p-1 sm:w-fit">
          {[["overview", "overview"], ["operations", "operations"], ["analytics", "analytics"], ["system", "system"]].map(([key, label]) =>
            <TabsTrigger key={key} value={key} className="rounded-lg px-4 py-2 text-sm text-[#65766c] transition-all data-[state=active]:bg-[#fffefa] data-[state=active]:text-[#1e5145] data-[state=active]:shadow-sm">{t(label)}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-5 focus-visible:outline-none">
          <div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#859189]">{t("live")}</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-[#23483c]">{t("signalBoard")}</h2></div><div className="hidden items-center gap-2 rounded-lg bg-[#e6ede5] px-3 py-2 text-[11px] text-[#60746a] sm:flex"><Wifi size={13} />{t("since")}: {dashboard.dataUpdatedAt ? new Date(dashboard.dataUpdatedAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : "—"}</div></div>
          {dashboard.isLoading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl border border-[#d7dfd9] bg-[#e9eee7]" />)}</div> :
            payload ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Metric title={t("activeOrders")} value={payload.summary?.activeOrders} icon={ShoppingCart} accent />
              <Metric title={t("onlineCustomers")} value={payload.summary?.onlineCustomers} icon={Users} />
              <Metric title={t("alerts")} value={payload.summary?.systemAlerts} icon={AlertTriangle} />
              <Metric title={t("activeContracts")} value={payload.summary?.activeContracts} icon={BriefcaseBusiness} />
              <Metric title={t("activeVendors")} value={payload.summary?.activeVendors} icon={Building2} />
            </div> : null}

          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <Panel>
               <SalesHeading />
               {dashboard.isLoading ? <SkeletonBlock rows={2} /> : payload ? (payload.summary?.salesByCurrency?.length ?
                 <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2 sm:px-6">{payload.summary.salesByCurrency.map((sale, index) =>
                  <div key={`${sale.currency}-${index}`} className="flex min-w-0 items-center justify-between gap-4 rounded-xl border border-[#e1e8df] bg-[#f7f8f3] px-4 py-3.5 transition-colors hover:bg-[#eff4ec]">
                    <span className="flex min-w-0 items-center gap-2"><span className="h-2 w-2 rounded-sm bg-[#b3c65c]" /><span className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-[#6e7e74]">{sale.currency}</span></span>
                    <span className="font-mono text-lg font-semibold tracking-tight text-[#214c3e]">{formatNumber(sale.amount)} <small className="text-[10px] font-medium text-[#76867c]">{sale.currency}</small></span>
                  </div>)}</div> : <EmptyRow>{t("noSales")}</EmptyRow>) : null}
            </Panel>
            <Panel>
              <PanelHeading icon={ArrowUpRight} title={t("quickAccess")} />
              <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2 sm:px-6">
                <LinkItem icon={ShoppingCart} label={t("orders")} href="/mrg/order-management" />
                <LinkItem icon={Package} label={t("warehouse")} href="/mrg/warehouse-management" />
                <LinkItem icon={CircleDollarSign} label={t("finance")} href="/mrg/finance-orders" />
                <LinkItem icon={Building2} label={t("vendors")} href="/mrg/marketplace-management" />
                <LinkItem icon={BriefcaseBusiness} label={t("contracts")} href="/mrg/legal-affairs" />
              </div>
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel><PanelHeading icon={Boxes} title={t("orderFlow")} />
              {dashboard.isLoading ? <SkeletonBlock rows={4} /> : payload ? <div className="grid grid-cols-2 gap-2 px-5 pb-5 sm:grid-cols-4 sm:px-6">
                {[
                  [t("pending"), payload.quickStats?.orderStatuses?.pending, "text-[#a2713f]", "bg-[#faf0df]"],
                  [t("processing"), payload.quickStats?.orderStatuses?.processing, "text-[#437591]", "bg-[#e8f1f4]"],
                  [t("readyToShip"), payload.quickStats?.orderStatuses?.readyToShip, "text-[#776994]", "bg-[#f0edf6]"],
                  [t("delivered"), payload.quickStats?.orderStatuses?.delivered, "text-[#467b5d]", "bg-[#e8f2e8]"],
                ].map(([label, value, color, bg]) => <div key={String(label)} className="rounded-xl border border-[#e1e7df] p-3"><p className="truncate text-xs text-[#75837b]">{label}</p><p className={`mt-2 font-mono text-2xl font-semibold ${color}`}>{formatNumber(value as number)}</p><span className={`mt-2 inline-block h-1 w-8 rounded-full ${bg}`} /></div>)}
              </div> : null}
            </Panel>
            <Panel><PanelHeading icon={Gauge} title={t("queues")} note={t("queueCount")} />
              {dashboard.isLoading ? <SkeletonBlock rows={3} /> : payload ? <div className="space-y-3 px-5 pb-5 sm:px-6">
                {([
                  { label: t("financeQueue"), value: payload.quickStats?.departmentQueues?.finance, icon: CircleDollarSign },
                  { label: t("warehouseQueue"), value: payload.quickStats?.departmentQueues?.warehouse, icon: Package },
                  { label: t("logistics"), value: payload.quickStats?.departmentQueues?.logistics, icon: Truck },
                ] as { label: string; value: number | undefined; icon: LucideIcon }[]).map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef2e9] text-[#52816a]"><Icon size={16} /></span>
                  <span className="flex-1 text-sm font-medium text-[#52665b]">{label}</span><span className="font-mono text-base font-semibold text-[#274f41]">{formatNumber(value as number)}</span>
                </div>)}
              </div> : null}
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="mt-0 space-y-5 focus-visible:outline-none">
          <div className="grid gap-5 xl:grid-cols-2">
            <Panel><PanelHeading icon={Boxes} title={t("orderFlow")} />
              {dashboard.isLoading ? <SkeletonBlock rows={4} /> : payload ? <div className="grid grid-cols-2 gap-2 px-5 pb-5 sm:grid-cols-4 sm:px-6">{[
                [t("pending"), payload.quickStats?.orderStatuses?.pending], [t("processing"), payload.quickStats?.orderStatuses?.processing],
                [t("readyToShip"), payload.quickStats?.orderStatuses?.readyToShip], [t("delivered"), payload.quickStats?.orderStatuses?.delivered],
              ].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-[#e1e7df] bg-[#f8f9f5] p-4"><p className="text-xs text-[#75837b]">{label}</p><p className="mt-3 font-mono text-2xl font-semibold text-[#27513f]">{formatNumber(value as number)}</p></div>)}</div> : null}
            </Panel>
            <Panel><PanelHeading icon={Gauge} title={t("queues")} note={t("queueCount")} />
              {dashboard.isLoading ? <SkeletonBlock rows={3} /> : payload ? <div className="space-y-4 px-5 pb-6 sm:px-6">{([
                { label: t("financeQueue"), value: payload.quickStats?.departmentQueues?.finance, icon: CircleDollarSign },
                { label: t("warehouseQueue"), value: payload.quickStats?.departmentQueues?.warehouse, icon: Package },
                { label: t("logistics"), value: payload.quickStats?.departmentQueues?.logistics, icon: Truck },
              ] as { label: string; value: number | undefined; icon: LucideIcon }[]).map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center gap-3 rounded-xl bg-[#f7f8f3] p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e9f0e8] text-[#52816a]"><Icon size={16} /></span><span className="flex-1 text-sm font-medium text-[#52665b]">{label}</span><span className="font-mono text-lg font-semibold text-[#274f41]">{formatNumber(value as number)}</span>
              </div>)}</div> : null}
            </Panel>
            <Panel className="xl:col-span-2"><PanelHeading icon={Package} title={t("inventory")} note={t("inventoryHint")} />
              {dashboard.isLoading ? <SkeletonBlock rows={3} /> : payload ? (payload.quickStats?.criticalInventory?.length ?
                <div className="overflow-x-auto px-5 pb-5 sm:px-6"><table className="w-full min-w-[460px] text-start text-sm"><thead><tr className="border-b border-[#e4e9e2] text-[11px] uppercase tracking-[0.1em] text-[#87938b]"><th className="py-3 font-medium">{t("inventory")}</th><th className="py-3 font-medium">{t("stock")}</th><th className="py-3 font-medium">{t("inventoryStatus")}</th></tr></thead><tbody>{payload.quickStats.criticalInventory.map((item, i) => <tr key={`${item.name}-${i}`} className="border-b border-[#edf0ea] last:border-0"><td className="py-3.5 font-medium text-[#314e41]">{item.name}</td><td className="py-3.5 font-mono text-[#577066]">{formatNumber(item.stock)}</td><td className="py-3.5"><StatusPill status={item.status} label={item.status === "critical" ? t("inventoryCritical") : item.status === "low" ? t("inventoryLow") : item.status === "warning" ? t("inventoryWarning") : item.status} /></td></tr>)}</tbody></table></div>
                : <EmptyRow>{t("noInventory")}</EmptyRow>) : null}
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-0 space-y-5 focus-visible:outline-none">
          <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
             <Panel><SalesHeading />
               {dashboard.isLoading ? <SkeletonBlock rows={3} /> : payload ? (payload.summary?.salesByCurrency?.length ?
                 <div className="space-y-2 px-5 pb-5 sm:px-6">{payload.summary.salesByCurrency.map((sale, i) => <div key={`${sale.currency}-${i}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#e1e8df] bg-[#f7f8f3] p-4"><span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#718178]">{sale.currency}</span><strong className="font-mono text-xl text-[#214c3e]">{formatNumber(sale.amount)} <small className="text-[10px]">{sale.currency}</small></strong></div>)}</div> : <EmptyRow>{t("noSales")}</EmptyRow>) : null}
            </Panel>
            <Panel><PanelHeading icon={ShoppingBag} title={t("vendorSales")} note={t("vendorSalesNote")} />
              {dashboard.isLoading ? <SkeletonBlock rows={4} /> : payload ? (payload.quickStats?.vendorSales?.length ?
                <div className="overflow-x-auto px-5 pb-5 sm:px-6"><table className="w-full min-w-[520px] text-start text-sm"><thead><tr className="border-b border-[#e4e9e2] text-[11px] uppercase tracking-[0.1em] text-[#87938b]"><th className="py-3 font-medium">{t("vendor")}</th><th className="py-3 font-medium">{t("currency")}</th><th className="py-3 font-medium">{t("amount")}</th><th className="py-3 font-medium">{t("vendorOrders")}</th></tr></thead><tbody>{payload.quickStats.vendorSales.map((sale, i) => <tr key={`${sale.vendorId}-${sale.currency}-${i}`} className="border-b border-[#edf0ea] last:border-0"><td className="py-3.5 font-medium text-[#314e41]">{sale.vendorName}</td><td className="py-3.5 text-xs font-semibold uppercase tracking-wide text-[#6c7b72]">{sale.currency}</td><td className="py-3.5 font-mono text-[#315a49]">{formatNumber(sale.amount)} <small>{sale.currency}</small></td><td className="py-3.5 font-mono text-[#566b60]">{formatNumber(sale.orders)}</td></tr>)}</tbody></table></div>
                : <EmptyRow>{t("noVendorSales")}</EmptyRow>) : null}
            </Panel>
            <Panel className="xl:col-span-2"><PanelHeading icon={BriefcaseBusiness} title={t("contractsList")} />
              {dashboard.isLoading ? <SkeletonBlock rows={3} /> : payload ? <>
                <div className="px-5 pb-3 sm:px-6"><div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${contractTheme.panel} ${contractTheme.text}`}><BriefcaseBusiness size={14} />{t("activeContracts")} <strong className="font-mono">{formatNumber(payload.summary?.activeContracts)}</strong></div></div>
                {payload.quickStats?.activeContractList?.length ?
                  <div className="overflow-x-auto px-5 pb-5 sm:px-6"><table className={`min-w-[480px] text-start ${contractTheme.table}`}><thead className={contractTheme.tableHead}><tr><th className="px-3 py-3 font-medium">{t("contract")}</th><th className="px-3 py-3 font-medium">{t("customer")}</th></tr></thead><tbody>{payload.quickStats.activeContractList.map((contract) => <tr key={contract.id} className={contractTheme.tableRow}><td className={`px-3 py-3.5 font-mono font-semibold ${contractTheme.text}`}>{contract.number}</td><td className="px-3 py-3.5">{contract.customerName}</td></tr>)}</tbody></table></div>
                  : <EmptyRow>{t("noContracts")}</EmptyRow>}
              </> : null}
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="system" className="mt-0 space-y-5 focus-visible:outline-none">
          {health.isLoading ? <div className="grid gap-5 lg:grid-cols-2"><div className="h-72 animate-pulse rounded-2xl bg-[#e4ebe3]" /><div className="h-72 animate-pulse rounded-2xl bg-[#e4ebe3]" /></div> : system ? <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric title={t("responseTime")} value={system.performance?.responseTime === undefined ? undefined : `${formatNumber(system.performance.responseTime)} ${t("ms")}`} icon={Activity} />
              <Metric title={t("uptime")} value={formatDuration(system.performance?.uptime)} icon={Clock3} />
              <Metric title={t("server")} value={statusName(system.server?.status || t("unknown"))} icon={Server} />
              <Metric title={t("backup")} value={statusName(system.backup?.status || t("unknown"))} icon={Database} />
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <Panel><PanelHeading icon={Server} title={t("serverStatus")} />
                <div className="space-y-5 px-5 pb-6 sm:px-6">
                  {([
                    { name: t("cpu"), value: system.server?.cpu, icon: Gauge },
                    { name: t("memory"), value: system.server?.memory, icon: Activity },
                    { name: t("disk"), value: system.server?.disk, icon: HardDrive },
                  ] as { name: string; value: number | null | undefined; icon: LucideIcon }[]).map(({ name, value, icon: Icon }) => <div key={name}>
                    <div className="mb-2 flex items-center gap-2"><Icon size={14} className="text-[#658374]" /><span className="flex-1 text-sm text-[#52675b]">{name}</span><span className="font-mono text-sm font-semibold text-[#315b48]">{value === null || value === undefined ? t("unavailable") : `${formatNumber(value as number)}%`}</span></div>
                    {value !== null && value !== undefined && <div className="h-2 overflow-hidden rounded-full bg-[#e8eee6]"><div className="h-full rounded-full bg-[#73955e] transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, Number(value)))}%` }} /></div>}
                  </div>)}
                </div>
              </Panel>
              <Panel><PanelHeading icon={Wifi} title={t("services")} />
                <div className="space-y-2 px-5 pb-6 sm:px-6">{([
                  { name: t("database"), status: system.services?.database, icon: Database },
                  { name: t("email"), status: system.services?.email, icon: Mail },
                  { name: t("sms"), status: system.services?.sms, icon: Activity },
                ] as { name: string; status: string | undefined; icon: LucideIcon }[]).map(({ name, status, icon: Icon }) => <div key={name} className="flex items-center gap-3 rounded-xl border border-[#e5eae3] bg-[#f8f9f5] px-4 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eaf0e8] text-[#527b63]"><Icon size={15} /></span><span className="flex-1 text-sm font-medium text-[#425c4e]">{name}</span><StatusPill status={String(status || t("unknown"))} />
                </div>)}</div>
              </Panel>
              <Panel className="xl:col-span-2"><PanelHeading icon={Database} title={t("backup")} />
                <div className="grid gap-3 px-5 pb-6 sm:grid-cols-2 sm:px-6">
                  <div className="rounded-xl border border-[#e3e9e1] bg-[#f8f9f5] p-4"><p className="text-xs text-[#78877f]">{t("lastBackup")}</p><p className="mt-2 font-mono text-sm font-medium text-[#315444]">{formatDate(system.backup?.lastBackup)}</p></div>
                  <div className="rounded-xl border border-[#e3e9e1] bg-[#f8f9f5] p-4"><p className="text-xs text-[#78877f]">{t("nextBackup")}</p><p className="mt-2 font-mono text-sm font-medium text-[#315444]">{formatDate(system.backup?.nextScheduled)}</p></div>
                </div>
              </Panel>
            </div>
          </> : null}
        </TabsContent>
      </Tabs>
    </main>
  </div>;
};

export default ManagementDashboard;