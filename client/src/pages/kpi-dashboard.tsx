import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingCart,
  Users,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Period = 7 | 30 | 90;
type Language = "en" | "ar" | "tr" | "fa";

type CurrencyGroup = {
  currency: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
};

type KpiData = {
  asOf: string;
  period: Period;
  sales: {
    current: CurrencyGroup[];
    previous: CurrencyGroup[];
    growth: number | null;
    headline: CurrencyGroup | null;
  };
  customers: {
    active: number;
    total: number;
    new: number;
    withEligibleOrders: number;
    repeat: number;
  };
  operations: {
    statusCounts: Record<string, number>;
    pendingPayment: number;
    paid: number;
    paymentSuccessRate: number | null;
    cancellationFailureCount: number;
    cancellationFailureRate: number | null;
    delivered: number;
    averageDeliveryLeadTimeDays: number | null;
  };
  inventory: {
    total: number;
    active: number;
    lowStock: number;
    outOfStock: number;
    valueByCurrency: Array<{ currency: string; value: number }>;
  };
  alerts: Array<{ type: string; count: number; href?: string }>;
};

const copy: Record<string, Record<Language, string>> = {
  title: { en: "KPI dashboard", ar: "لوحة مؤشرات الأداء", tr: "KPI panosu", fa: "داشبورد شاخص‌ها" },
  subtitle: { en: "Canonical business data, measured from database time.", ar: "بيانات الأعمال الأساسية محسوبة من وقت قاعدة البيانات.", tr: "Temel iş verileri veritabanı zamanına göre hesaplanır.", fa: "داده‌های اصلی کسب‌وکار بر پایه زمان پایگاه داده محاسبه شده‌اند." },
  period: { en: "Period", ar: "الفترة", tr: "Dönem", fa: "دوره" },
  days: { en: "days", ar: "أيام", tr: "gün", fa: "روز" },
  refresh: { en: "Refresh", ar: "تحديث", tr: "Yenile", fa: "به‌روزرسانی" },
  lastUpdated: { en: "As of", ar: "حتى", tr: "Tarih", fa: "تا" },
  overview: { en: "Overview", ar: "نظرة عامة", tr: "Genel bakış", fa: "نمای کلی" },
  sales: { en: "Sales", ar: "المبيعات", tr: "Satış", fa: "فروش" },
  customers: { en: "Customers", ar: "العملاء", tr: "Müşteriler", fa: "مشتریان" },
  operations: { en: "Operations", ar: "العمليات", tr: "Operasyonlar", fa: "عملیات" },
  inventory: { en: "Inventory", ar: "المخزون", tr: "Stok", fa: "موجودی" },
  revenue: { en: "Eligible revenue", ar: "الإيرادات المؤهلة", tr: "Uygun gelir", fa: "درآمد واجد شرایط" },
  orders: { en: "Eligible orders", ar: "الطلبات المؤهلة", tr: "Uygun sipariş", fa: "سفارش‌های واجد شرایط" },
  orderCount: { en: "orders", ar: "طلب", tr: "sipariş", fa: "سفارش" },
  aov: { en: "Average order value", ar: "متوسط قيمة الطلب", tr: "Ortalama sipariş değeri", fa: "میانگین ارزش سفارش" },
  growth: { en: "Compared with previous period", ar: "مقارنة بالفترة السابقة", tr: "Önceki dönemle karşılaştırma", fa: "در مقایسه با دوره قبل" },
  activeCustomers: { en: "Active customers", ar: "العملاء النشطون", tr: "Aktif müşteriler", fa: "مشتریان فعال" },
  totalCustomers: { en: "Total customers", ar: "إجمالي العملاء", tr: "Toplam müşteri", fa: "کل مشتریان" },
  newCustomers: { en: "New customers", ar: "العملاء الجدد", tr: "Yeni müşteriler", fa: "مشتریان جدید" },
  repeatCustomers: { en: "Repeat customers", ar: "العملاء المتكررون", tr: "Tekrarlayan müşteriler", fa: "مشتریان تکراری" },
  withOrders: { en: "Customers with eligible orders", ar: "العملاء ذوو الطلبات المؤهلة", tr: "Uygun sipariş veren müşteriler", fa: "مشتریان دارای سفارش واجد شرایط" },
  statuses: { en: "Order statuses", ar: "حالات الطلبات", tr: "Sipariş durumları", fa: "وضعیت سفارش‌ها" },
  pendingPayment: { en: "Pending payment", ar: "في انتظار الدفع", tr: "Ödeme bekliyor", fa: "در انتظار پرداخت" },
  paid: { en: "Paid", ar: "مدفوع", tr: "Ödendi", fa: "پرداخت‌شده" },
  paymentSuccess: { en: "Payment success rate", ar: "نسبة نجاح الدفع", tr: "Ödeme başarı oranı", fa: "نرخ موفقیت پرداخت" },
  cancellationFailure: { en: "Cancellation / failure", ar: "الإلغاء / الفشل", tr: "İptal / başarısız", fa: "لغو / شکست" },
  delivered: { en: "Delivered", ar: "تم التسليم", tr: "Teslim edildi", fa: "تحویل‌شده" },
  leadTime: { en: "Average delivery lead time", ar: "متوسط مدة التسليم", tr: "Ortalama teslim süresi", fa: "میانگین زمان تحویل" },
  products: { en: "Products", ar: "المنتجات", tr: "Ürünler", fa: "محصولات" },
  active: { en: "Active", ar: "نشط", tr: "Aktif", fa: "فعال" },
  lowStock: { en: "Low stock", ar: "مخزون منخفض", tr: "Düşük stok", fa: "موجودی کم" },
  outOfStock: { en: "Out of stock", ar: "نفد المخزون", tr: "Stokta yok", fa: "ناموجود" },
  inventoryValue: { en: "Inventory value", ar: "قيمة المخزون", tr: "Stok değeri", fa: "ارزش موجودی" },
  alerts: { en: "Alerts", ar: "التنبيهات", tr: "Uyarılar", fa: "هشدارها" },
  noAlerts: { en: "No active alerts from canonical data.", ar: "لا توجد تنبيهات نشطة من البيانات الأساسية.", tr: "Temel verilerden aktif uyarı yok.", fa: "هشدار فعالی از داده‌های اصلی وجود ندارد." },
  loading: { en: "Loading dashboard data…", ar: "جارٍ تحميل بيانات اللوحة…", tr: "Pano verileri yükleniyor…", fa: "داده‌های داشبورد در حال بارگذاری است…" },
  error: { en: "Dashboard data could not be loaded.", ar: "تعذر تحميل بيانات اللوحة.", tr: "Pano verileri yüklenemedi.", fa: "بارگذاری داده‌های داشبورد ممکن نیست." },
  retry: { en: "Try again", ar: "حاول مرة أخرى", tr: "Tekrar dene", fa: "تلاش دوباره" },
  empty: { en: "No canonical records match this period.", ar: "لا توجد سجلات أساسية لهذه الفترة.", tr: "Bu dönem için temel kayıt yok.", fa: "رکورد اصلی برای این دوره وجود ندارد." },
  back: { en: "Back to site management", ar: "العودة إلى إدارة الموقع", tr: "Site yönetimine dön", fa: "بازگشت به مدیریت سایت" },
  status: { en: "Status", ar: "الحالة", tr: "Durum", fa: "وضعیت" },
  unknown: { en: "Unknown", ar: "غير معروف", tr: "Bilinmiyor", fa: "نامشخص" },
};

const statusLabels: Record<string, Record<Language, string>> = {
  pending: { en: "Pending", ar: "قيد الانتظار", tr: "Bekliyor", fa: "در انتظار" },
  confirmed: { en: "Confirmed", ar: "مؤكد", tr: "Onaylandı", fa: "تأییدشده" },
  processing: { en: "Processing", ar: "قيد المعالجة", tr: "İşleniyor", fa: "در حال پردازش" },
  shipped: { en: "Shipped", ar: "تم الشحن", tr: "Kargoya verildi", fa: "ارسال‌شده" },
  delivered: { en: "Delivered", ar: "تم التسليم", tr: "Teslim edildi", fa: "تحویل‌شده" },
  cancelled: { en: "Cancelled", ar: "ملغى", tr: "İptal edildi", fa: "لغوشده" },
  failed: { en: "Failed", ar: "فشل", tr: "Başarısız", fa: "ناموفق" },
};

function Metric({ label, value, detail, icon }: { label: string; value: string; detail?: string; icon: React.ReactNode }) {
  return <Card className="border-slate-200/80 shadow-sm"><CardContent className="flex items-start justify-between gap-4 p-5"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>{detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}</div><div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">{icon}</div></CardContent></Card>;
}

export default function KPIDashboard() {
  const [, setLocation] = useLocation();
  const { language, direction } = useLanguage();
  const [period, setPeriod] = useState<Period>(30);
  const locale = language === "fa" ? "fa-IR" : language === "ar" ? "ar" : language === "tr" ? "tr-TR" : "en-GB";
  const tr = (key: string) => copy[key]?.[language] ?? copy[key]?.en ?? key;
  const number = (value: number | null | undefined, options?: Intl.NumberFormatOptions) => value == null ? "—" : new Intl.NumberFormat(locale, options).format(value);
  const percent = (value: number | null | undefined) => value == null ? "—" : `${number(value, { maximumFractionDigits: 1 })}%`;
  const currency = (value: number, code: string) => { try { return new Intl.NumberFormat(locale, { style: "currency", currency: code, maximumFractionDigits: 2 }).format(value); } catch { return `${number(value)} ${code}`; } };
  const { data, isLoading, isError, refetch, isFetching } = useQuery<KpiData>({
    queryKey: ["/api/admin/kpi-dashboard", period],
    queryFn: async () => {
      const response = await fetch(`/api/admin/kpi-dashboard?period=${period}`, { credentials: "include" });
      if (!response.ok) throw new Error("kpi-dashboard");
      const payload = await response.json();
      return payload.data ?? payload;
    },
  });
  const headline = data?.sales.headline;
  const hasRecords = useMemo(() => Boolean(data && ((headline?.orders ?? 0) > 0 || data.customers.total > 0 || data.inventory.total > 0)), [data, headline]);
  const backIcon = direction === "rtl" ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />;

  return <main dir={direction} className="min-h-[100dvh] bg-[#f4f7f8] px-4 py-6 text-slate-900 sm:px-6 lg:px-10">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3"><Button variant="ghost" size="icon" aria-label={tr("back")} onClick={() => setLocation("/admin/site-management")}>{backIcon}</Button><div><p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-teal-700">MOMTAZCHEM / ADMIN</p><h1 className="text-3xl font-semibold tracking-tight">{tr("title")}</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">{tr("subtitle")}</p></div></div>
        <div className="flex flex-wrap items-center gap-2"><div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1"><span className="px-2 text-xs text-slate-500">{tr("period")}</span>{([7, 30, 90] as Period[]).map(days => <Button key={days} size="sm" variant={period === days ? "default" : "ghost"} onClick={() => setPeriod(days)}>{days} {tr("days")}</Button>)}</div><Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`me-2 size-4 ${isFetching ? "animate-spin" : ""}`} />{tr("refresh")}</Button></div>
      </header>
      {data?.asOf && <p className="text-xs text-slate-500">{tr("lastUpdated")}: {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.asOf))}</p>}
      {isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200/70" />)}</div> :
       isError ? <Card><CardContent className="flex flex-col items-center gap-3 py-14 text-center"><AlertTriangle className="size-10 text-amber-600" /><p>{tr("error")}</p><Button onClick={() => refetch()}>{tr("retry")}</Button></CardContent></Card> :
       !data || !hasRecords ? <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center"><Activity className="size-10 text-slate-300" /><p className="text-slate-600">{tr("empty")}</p></CardContent></Card> :
       <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-slate-200/70 p-1 sm:grid-cols-5"><TabsTrigger value="overview">{tr("overview")}</TabsTrigger><TabsTrigger value="sales">{tr("sales")}</TabsTrigger><TabsTrigger value="customers">{tr("customers")}</TabsTrigger><TabsTrigger value="operations">{tr("operations")}</TabsTrigger><TabsTrigger value="inventory">{tr("inventory")}</TabsTrigger></TabsList>
        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label={tr("revenue")} value={headline ? currency(headline.revenue, headline.currency) : "—"} detail={headline?.currency} icon={<DollarSign className="size-5" />} /><Metric label={tr("orders")} value={number(headline?.orders)} detail={headline ? `${headline.currency}` : undefined} icon={<ShoppingCart className="size-5" />} /><Metric label={tr("activeCustomers")} value={number(data.customers.active)} icon={<Users className="size-5" />} /><Metric label={tr("lowStock")} value={number(data.inventory.lowStock)} icon={<AlertTriangle className="size-5" />} /></div>
          <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]"><StatusCard data={data} language={language} tr={tr} number={number} /><AlertsCard data={data} tr={tr} number={number} setLocation={setLocation} /></div>
        </TabsContent>
        <TabsContent value="sales"><section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Metric label={tr("revenue")} value={headline ? currency(headline.revenue, headline.currency) : "—"} icon={<DollarSign className="size-5" />} /><Metric label={tr("aov")} value={headline ? currency(headline.averageOrderValue, headline.currency) : "—"} icon={<Activity className="size-5" />} /><Metric label={tr("growth")} value={percent(data.sales.growth)} icon={<RefreshCw className="size-5" />} /></section><CurrencyCard data={data} tr={tr} currency={currency} number={number} /></TabsContent>
        <TabsContent value="customers"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Metric label={tr("totalCustomers")} value={number(data.customers.total)} icon={<Users className="size-5" />} /><Metric label={tr("activeCustomers")} value={number(data.customers.active)} icon={<CheckCircle2 className="size-5" />} /><Metric label={tr("newCustomers")} value={number(data.customers.new)} icon={<Users className="size-5" />} /><Metric label={tr("withOrders")} value={number(data.customers.withEligibleOrders)} icon={<ShoppingCart className="size-5" />} /><Metric label={tr("repeatCustomers")} value={number(data.customers.repeat)} icon={<RefreshCw className="size-5" />} /></div></TabsContent>
        <TabsContent value="operations"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Metric label={tr("pendingPayment")} value={number(data.operations.pendingPayment)} icon={<Clock3 className="size-5" />} /><Metric label={tr("paid")} value={number(data.operations.paid)} icon={<CheckCircle2 className="size-5" />} /><Metric label={tr("paymentSuccess")} value={percent(data.operations.paymentSuccessRate)} icon={<CheckCircle2 className="size-5" />} /><Metric label={tr("cancellationFailure")} value={number(data.operations.cancellationFailureCount)} detail={percent(data.operations.cancellationFailureRate)} icon={<AlertTriangle className="size-5" />} /><Metric label={tr("delivered")} value={number(data.operations.delivered)} icon={<Package className="size-5" />} /><Metric label={tr("leadTime")} value={data.operations.averageDeliveryLeadTimeDays == null ? "—" : `${number(data.operations.averageDeliveryLeadTimeDays, { maximumFractionDigits: 1 })} ${tr("days")}`} icon={<Clock3 className="size-5" />} /></div><StatusCard data={data} language={language} tr={tr} number={number} /></TabsContent>
        <TabsContent value="inventory"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label={tr("products")} value={number(data.inventory.total)} icon={<Package className="size-5" />} /><Metric label={tr("active")} value={number(data.inventory.active)} icon={<CheckCircle2 className="size-5" />} /><Metric label={tr("lowStock")} value={number(data.inventory.lowStock)} icon={<AlertTriangle className="size-5" />} /><Metric label={tr("outOfStock")} value={number(data.inventory.outOfStock)} icon={<Package className="size-5" />} /></div><Card className="mt-5"><CardHeader><CardTitle>{tr("inventoryValue")}</CardTitle></CardHeader><CardContent><CurrencyBreakdown values={data.inventory.valueByCurrency} currency={currency} number={number} /></CardContent></Card></TabsContent>
       </Tabs>}
    </div>
  </main>;
}

function StatusCard({ data, language, tr, number }: { data: KpiData; language: Language; tr: (key: string) => string; number: (value: number | null | undefined, options?: Intl.NumberFormatOptions) => string }) {
  const entries = Object.entries(data.operations.statusCounts);
  return <Card><CardHeader><CardTitle>{tr("statuses")}</CardTitle></CardHeader><CardContent className="space-y-3">{entries.length ? entries.map(([status, count]) => <div key={status} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0"><span className="text-sm text-slate-600">{statusLabels[status]?.[language] ?? tr("unknown")}</span><Badge variant="secondary">{number(count)}</Badge></div>) : <p className="text-sm text-slate-500">{tr("empty")}</p>}</CardContent></Card>;
}

function CurrencyCard({ data, tr, currency, number }: { data: KpiData; tr: (key: string) => string; currency: (value: number, code: string) => string; number: (value: number | null | undefined) => string }) {
  return <Card className="mt-5"><CardHeader><CardTitle>{tr("revenue")}</CardTitle></CardHeader><CardContent><CurrencyBreakdown values={data.sales.current.map(item => ({ currency: item.currency, value: item.revenue, orders: item.orders }))} currency={currency} number={number} orderLabel={tr("orderCount")} /></CardContent></Card>;
}

function CurrencyBreakdown({ values, currency, number, orderLabel }: { values: Array<{ currency: string; value: number; orders?: number }>; currency: (value: number, code: string) => string; number: (value: number | null | undefined) => string; orderLabel?: string }) {
  return values.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{values.map(item => <div key={item.currency} className="rounded-lg bg-slate-50 p-4"><p className="text-xs font-medium uppercase tracking-wider text-slate-500">{item.currency}</p><p className="mt-2 text-lg font-semibold">{currency(item.value, item.currency)}</p>{item.orders != null && <p className="text-xs text-slate-500">{number(item.orders)} {orderLabel ?? ""}</p>}</div>)}</div> : <p className="text-sm text-slate-500">—</p>;
}

function AlertsCard({ data, tr, number, setLocation }: { data: KpiData; tr: (key: string) => string; number: (value: number | null | undefined) => string; setLocation: (path: string) => void }) {
  const alertLabel = (type: string) => {
    const labels: Record<string, string> = {
      low_stock: tr("lowStock"),
      pending_payment: tr("pendingPayment"),
      out_of_stock: tr("outOfStock"),
      cancellation_failure: tr("cancellationFailure"),
    };
    return labels[type] ?? tr("unknown");
  };
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-amber-600" />{tr("alerts")}</CardTitle></CardHeader><CardContent className="space-y-3">{data.alerts.length ? data.alerts.map((alert, index) => <button key={`${alert.type}-${index}`} type="button" onClick={() => alert.href && setLocation(alert.href)} className="flex w-full items-center justify-between rounded-lg border border-amber-100 bg-amber-50 p-3 text-start"><span className="text-sm text-amber-950">{alertLabel(alert.type)}</span><Badge variant="outline">{number(alert.count)}</Badge></button>) : <p className="text-sm text-slate-500">{tr("noAlerts")}</p>}</CardContent></Card>;
}