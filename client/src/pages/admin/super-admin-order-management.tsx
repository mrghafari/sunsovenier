import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Mail, Package, RefreshCw, Search, Shield, Trash2, User, X } from "lucide-react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CleanupPreviewDialog } from "@/components/admin/cleanup-preview-dialog";
import { SuperAdminContractsTab } from "@/components/admin/super-admin-contracts-tab";

interface Order {
  id: number;
  orderNumber: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  fullCustomerName?: string;
  fullCustomerEmail?: string;
  totalAmount: string;
  currency: string;
  status: string;
  paymentStatus?: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  deliveryCode?: string;
  canDelete?: boolean;
  deletionBlockers?: string[];
}

type Lang = "en" | "fa" | "ar" | "tr";
const copy: Record<Lang, Record<string, string>> = {
  en: { title: "Super admin order control", subtitle: "Permanent deletion console. Verify every selection before committing.", orders: "Deletable orders", customer: "Customer orders", contracts: "Contracts", search: "Search orders", searchHint: "Order number, email, phone, delivery code", refresh: "Refresh", strongRefresh: "Force refresh", total: "Total", visible: "Visible", selected: "selected", clear: "Clear selection", bulk: "Delete selected", empty: "No orders found", emptyHint: "Try a different filter or refresh the list.", email: "Customer email", lookup: "Search customer", enterEmail: "Enter an email to load orders", noCustomer: "No orders found for this customer", loading: "Loading orders…", loadingCustomer: "Searching…", order: "Order", customerName: "Customer", amount: "Amount", status: "Status", payment: "Payment", date: "Created", action: "Action", delete: "Delete", confirm: "Delete permanently", cancel: "Cancel", deleting: "Deleting…", deleted: "Order deleted", bulkDeleted: "orders deleted", error: "Operation failed", auth: "Authentication required", authHint: "Sign in with an administrator account to continue.", signIn: "Go to admin sign in", forbidden: "Super admin access required", forbiddenHint: "You are signed in, but this account does not have an active super admin role.", back: "Back to admin panel", statusCompleted: "Completed", statusPending: "Pending", statusCancelled: "Cancelled", statusProcessing: "Processing", unknown: "Unknown", noNumber: "No order number", selectedCount: "selected orders" },
  fa: { title: "کنترل سفارش‌های سوپر ادمین", subtitle: "کنسول حذف دائمی. پیش از ثبت، هر انتخاب را بررسی کنید.", orders: "سفارش‌های قابل حذف", customer: "سفارش‌های مشتری", contracts: "قراردادها", search: "جستجوی سفارش", searchHint: "شماره سفارش، ایمیل، تلفن، کد تحویل", refresh: "به‌روزرسانی", strongRefresh: "به‌روزرسانی کامل", total: "کل", visible: "قابل مشاهده", selected: "انتخاب‌شده", clear: "لغو انتخاب", bulk: "حذف انتخاب‌شده‌ها", empty: "سفارشی یافت نشد", emptyHint: "فیلتر دیگری امتحان کنید یا فهرست را به‌روزرسانی کنید.", email: "ایمیل مشتری", lookup: "جستجوی مشتری", enterEmail: "برای دریافت سفارش‌ها ایمیل وارد کنید", noCustomer: "برای این مشتری سفارشی یافت نشد", loading: "در حال بارگذاری سفارش‌ها…", loadingCustomer: "در حال جستجو…", order: "سفارش", customerName: "مشتری", amount: "مبلغ", status: "وضعیت", payment: "پرداخت", date: "ایجاد شده", action: "عملیات", delete: "حذف", confirm: "حذف دائمی", cancel: "انصراف", deleting: "در حال حذف…", deleted: "سفارش حذف شد", bulkDeleted: "سفارش حذف شد", error: "عملیات ناموفق بود", auth: "احراز هویت لازم است", authHint: "برای ادامه با حساب مدیر وارد شوید.", signIn: "ورود به پنل مدیریت", forbidden: "دسترسی سوپر ادمین لازم است", forbiddenHint: "شما وارد شده‌اید، اما این حساب نقش فعال سوپر ادمین ندارد.", back: "بازگشت به پنل مدیریت", statusCompleted: "تکمیل‌شده", statusPending: "در انتظار", statusCancelled: "لغو شده", statusProcessing: "در حال پردازش", unknown: "نامشخص", noNumber: "بدون شماره سفارش", selectedCount: "سفارش انتخاب‌شده" },
  ar: { title: "التحكم بطلبات المشرف الأعلى", subtitle: "وحدة حذف نهائي. تحقق من كل اختيار قبل التنفيذ.", orders: "الطلبات القابلة للحذف", customer: "طلبات العميل", contracts: "العقود", search: "بحث في الطلبات", searchHint: "رقم الطلب، البريد، الهاتف، رمز التسليم", refresh: "تحديث", strongRefresh: "تحديث كامل", total: "الإجمالي", visible: "الظاهر", selected: "محدد", clear: "إلغاء التحديد", bulk: "حذف المحدد", empty: "لم يتم العثور على طلبات", emptyHint: "جرّب مرشحاً آخر أو حدّث القائمة.", email: "بريد العميل", lookup: "بحث عن العميل", enterEmail: "أدخل بريداً لتحميل الطلبات", noCustomer: "لا توجد طلبات لهذا العميل", loading: "جار تحميل الطلبات…", loadingCustomer: "جار البحث…", order: "الطلب", customerName: "العميل", amount: "المبلغ", status: "الحالة", payment: "الدفع", date: "تاريخ الإنشاء", action: "الإجراء", delete: "حذف", confirm: "حذف نهائي", cancel: "إلغاء", deleting: "جار الحذف…", deleted: "تم حذف الطلب", bulkDeleted: "طلبات تم حذفها", error: "فشلت العملية", auth: "المصادقة مطلوبة", authHint: "سجّل الدخول بحساب مسؤول للمتابعة.", signIn: "الذهاب لتسجيل دخول الإدارة", forbidden: "صلاحية المشرف الأعلى مطلوبة", forbiddenHint: "أنت مسجل الدخول، لكن هذا الحساب لا يملك دور مشرف أعلى نشطاً.", back: "العودة إلى لوحة الإدارة", statusCompleted: "مكتمل", statusPending: "قيد الانتظار", statusCancelled: "ملغى", statusProcessing: "قيد المعالجة", unknown: "غير معروف", noNumber: "بدون رقم طلب", selectedCount: "طلبات محددة" },
  tr: { title: "Süper yönetici sipariş kontrolü", subtitle: "Kalıcı silme konsolu. İşlemi onaylamadan önce her seçimi doğrulayın.", orders: "Silinebilir siparişler", customer: "Müşteri siparişleri", contracts: "Sözleşmeler", search: "Sipariş ara", searchHint: "Sipariş no, e-posta, telefon, teslim kodu", refresh: "Yenile", strongRefresh: "Zorla yenile", total: "Toplam", visible: "Görünen", selected: "seçili", clear: "Seçimi temizle", bulk: "Seçilenleri sil", empty: "Sipariş bulunamadı", emptyHint: "Başka bir filtre deneyin veya listeyi yenileyin.", email: "Müşteri e-postası", lookup: "Müşteri ara", enterEmail: "Siparişleri yüklemek için e-posta girin", noCustomer: "Bu müşteri için sipariş bulunamadı", loading: "Siparişler yükleniyor…", loadingCustomer: "Aranıyor…", order: "Sipariş", customerName: "Müşteri", amount: "Tutar", status: "Durum", payment: "Ödeme", date: "Oluşturuldu", action: "İşlem", delete: "Sil", confirm: "Kalıcı sil", cancel: "İptal", deleting: "Siliniyor…", deleted: "Sipariş silindi", bulkDeleted: "sipariş silindi", error: "İşlem başarısız", auth: "Kimlik doğrulama gerekli", authHint: "Devam etmek için yönetici hesabıyla giriş yapın.", signIn: "Yönetici girişine git", forbidden: "Süper yönetici erişimi gerekli", forbiddenHint: "Oturumunuz açık, ancak bu hesapta etkin bir süper yönetici rolü yok.", back: "Yönetim paneline dön", statusCompleted: "Tamamlandı", statusPending: "Bekliyor", statusCancelled: "İptal", statusProcessing: "İşleniyor", unknown: "Bilinmiyor", noNumber: "Sipariş numarası yok", selectedCount: "seçili sipariş" },
};
const paymentLabels: Record<Lang, Record<string, string>> = {
  en: { wallet_full: "Wallet (full)", wallet_partial: "Wallet (partial)", online_payment: "Online payment", bank_transfer: "Bank transfer", bank_transfer_grace: "Bank transfer (grace)", hybrid: "Hybrid", cash: "Cash", credit: "Credit" },
  fa: { wallet_full: "کیف پول (کامل)", wallet_partial: "کیف پول (جزئی)", online_payment: "پرداخت آنلاین", bank_transfer: "انتقال بانکی", bank_transfer_grace: "انتقال بانکی (مهلت)", hybrid: "ترکیبی", cash: "نقدی", credit: "اعتباری" },
  ar: { wallet_full: "محفظة (كامل)", wallet_partial: "محفظة (جزئي)", online_payment: "دفع إلكتروني", bank_transfer: "تحويل بنكي", bank_transfer_grace: "تحويل بنكي (مهلة)", hybrid: "مختلط", cash: "نقدي", credit: "ائتماني" },
  tr: { wallet_full: "Cüzdan (tam)", wallet_partial: "Cüzdan (kısmi)", online_payment: "Çevrim içi ödeme", bank_transfer: "Banka havalesi", bank_transfer_grace: "Banka havalesi (ek süre)", hybrid: "Karma", cash: "Nakit", credit: "Kredi" },
};
const statusFilterOptions = ["pending", "delivered", "cancelled", "deleted"];
const paymentFilterOptions = [
  { group: "status", values: ["pending", "partial", "paid", "grace_period", "receipt_uploaded"] },
  { group: "method", values: ["online_payment", "bank_transfer_grace", "wallet_full", "wallet_partial"] },
];
const removalCopy: Record<Lang, Record<string, string>> = {
  en: { subtitle: "Remove eligible unshipped orders and wholly unshipped contracts from active lists. Signed PDFs, receipts, and financial evidence stay retained; confirmed, unreturned payments become customer wallet credit.", orders: "Removable orders", bulk: "Remove selected", delete: "Remove", confirm: "Remove from active lists", deleting: "Removing…", deleted: "Removed from active lists; evidence retained", bulkDeleted: "removed from active lists; evidence retained" },
  fa: { subtitle: "سفارش‌های واجد شرایطِ ارسال‌نشده و قراردادهای کاملاً ارسال‌نشده از فهرست فعال خارج می‌شوند. فایل‌های امضاشده، رسیدها و شواهد مالی حفظ می‌شوند؛ پرداخت تأییدشده و بازپرداخت‌نشده به اعتبار کیف پول مشتری تبدیل می‌شود.", orders: "سفارش‌های قابل خارج‌کردن", bulk: "خارج‌کردن انتخاب‌شده‌ها", delete: "خارج‌کردن", confirm: "خارج‌کردن از فهرست فعال", deleting: "در حال خارج‌کردن…", deleted: "از فهرست فعال خارج شد؛ شواهد حفظ شدند", bulkDeleted: "از فهرست فعال خارج شدند؛ شواهد حفظ شدند" },
  ar: { subtitle: "تُزال الطلبات المؤهلة غير المشحونة والعقود غير المشحونة بالكامل من القوائم النشطة. تُحفظ ملفات PDF الموقعة والإيصالات والأدلة المالية؛ وتصبح المدفوعات المؤكدة غير المستردة رصيداً في محفظة العميل.", orders: "الطلبات القابلة للإزالة", bulk: "إزالة المحدد", delete: "إزالة", confirm: "إزالة من القوائم النشطة", deleting: "جارٍ الإزالة…", deleted: "أُزيل من القوائم النشطة مع حفظ الأدلة", bulkDeleted: "أُزيلت من القوائم النشطة مع حفظ الأدلة" },
  tr: { subtitle: "Uygun, sevk edilmemiş siparişler ve tamamen sevk edilmemiş sözleşmeler etkin listelerden kaldırılır. İmzalı PDF'ler, makbuzlar ve finansal kanıtlar saklanır; onaylı ve iade edilmemiş ödemeler müşteri cüzdanına kredi olur.", orders: "Kaldırılabilir siparişler", bulk: "Seçilenleri kaldır", delete: "Kaldır", confirm: "Etkin listelerden kaldır", deleting: "Kaldırılıyor…", deleted: "Etkin listelerden kaldırıldı; kanıtlar saklandı", bulkDeleted: "etkin listelerden kaldırıldı; kanıtlar saklandı" },
};
const removalReasons: Record<Lang, Record<string, string>> = {
  en: { SIGNED_CONTRACT: "Signed contract evidence is retained; signing alone does not block an unshipped removal", SHIPPED: "Shipped order or contract cannot be removed", ALREADY_REMOVED: "Already removed", PAYMENT_EVIDENCE_REQUIRED: "Payment evidence required", WALLET_CURRENCY_MISMATCH: "Wallet currency mismatch", FINANCIAL_RECONCILIATION_REQUIRED: "Financial reconciliation required", WALLET_UNAVAILABLE: "Wallet unavailable" },
  fa: { SIGNED_CONTRACT: "مدرک قرارداد امضاشده حفظ می‌شود؛ امضا به‌تنهایی مانع خارج‌کردن مورد ارسال‌نشده نیست", SHIPPED: "سفارش یا قرارداد ارسال‌شده قابل خارج‌کردن نیست", ALREADY_REMOVED: "قبلاً خارج شده است", PAYMENT_EVIDENCE_REQUIRED: "مدرک پرداخت لازم است", WALLET_CURRENCY_MISMATCH: "عدم تطابق ارز کیف پول", FINANCIAL_RECONCILIATION_REQUIRED: "تطبیق مالی لازم است", WALLET_UNAVAILABLE: "کیف پول در دسترس نیست" },
  ar: { SIGNED_CONTRACT: "يُحفظ دليل العقد الموقع؛ ولا يمنع التوقيع وحده إزالة ما لم يُشحن", SHIPPED: "لا يمكن إزالة طلب أو عقد تم شحنه", ALREADY_REMOVED: "تمت الإزالة مسبقاً", PAYMENT_EVIDENCE_REQUIRED: "دليل الدفع مطلوب", WALLET_CURRENCY_MISMATCH: "عملة المحفظة غير متطابقة", FINANCIAL_RECONCILIATION_REQUIRED: "التسوية المالية مطلوبة", WALLET_UNAVAILABLE: "المحفظة غير متاحة" },
  tr: { SIGNED_CONTRACT: "İmzalı sözleşme kanıtı saklanır; imza tek başına sevk edilmemiş kaydın kaldırılmasını engellemez", SHIPPED: "Sevk edilmiş sipariş veya sözleşme kaldırılamaz", ALREADY_REMOVED: "Zaten kaldırılmış", PAYMENT_EVIDENCE_REQUIRED: "Ödeme kanıtı gerekli", WALLET_CURRENCY_MISMATCH: "Cüzdan para birimi uyuşmuyor", FINANCIAL_RECONCILIATION_REQUIRED: "Finansal mutabakat gerekli", WALLET_UNAVAILABLE: "Cüzdan kullanılamıyor" },
};

export default function SuperAdminOrderManagement() {
  const { language, direction } = useLanguage();
  const lang = (["en", "fa", "ar", "tr"].includes(language) ? language : "en") as Lang;
  const c = { ...copy[lang], ...removalCopy[lang] };
  const locale = language === "fa" ? "fa-IR" : language === "ar" ? "ar" : language === "tr" ? "tr-TR" : "en-US";
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("orders");
  const [filter, setFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState({
    orderNumber: "",
    customer: "",
    amount: "",
    status: "",
    payment: "",
    date: "",
  });
  const [email, setEmail] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selected, setSelected] = useState<Record<string, Set<number>>>({ orders: new Set(), customer: new Set() });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cleanupIds, setCleanupIds] = useState<number[]>([]);
  const [cleanupKind, setCleanupKind] = useState<"orders" | "contract">("orders");
  const [cleanupBulk, setCleanupBulk] = useState(false);
  const [, setTarget] = useState<Order | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const deferredFilter = useDeferredValue(filter);
  const deferredColumnFilters = useDeferredValue(columnFilters);

  const ordersQuery = useInfiniteQuery({
    queryKey: ["/api/super-admin/deletable-orders", deferredFilter, deferredColumnFilters],
    retry: false,
    refetchInterval: 30000,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        offset: String(pageParam),
        limit: "100",
      });
      if (deferredFilter.trim()) params.set("q", deferredFilter.trim());
      Object.entries(deferredColumnFilters).forEach(([key, value]) => {
        if (value.trim()) params.set(key, value.trim());
      });
      const response = await fetch(`/api/super-admin/deletable-orders?${params}`, { credentials: "include" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(`${response.status}: ${payload?.message || c.error}`);
      }
      return payload;
    },
    getNextPageParam: (lastPage) => lastPage?.pagination?.hasMore
      ? lastPage.pagination.nextOffset
      : undefined,
  });
  const customerQuery = useInfiniteQuery({ queryKey: ["/api/super-admin/customer-orders-by-email", email], enabled: tab === "customer" && !!email.trim(), retry: false, initialPageParam: 0, queryFn: async ({ pageParam }) => {
    const params = new URLSearchParams({ limit: "100", offset: String(pageParam) });
    const r = await fetch(`/api/super-admin/customer-orders-by-email/${encodeURIComponent(email.trim())}?${params}`, { credentials: "include" });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }, getNextPageParam: (lastPage) => lastPage?.pagination?.hasMore ? lastPage.pagination.nextOffset : undefined });
  const suggestionQuery = useQuery({ queryKey: ["/api/super-admin/email-suggestions", email], enabled: email.trim().length >= 3, queryFn: async () => {
    const r = await fetch(`/api/super-admin/email-suggestions?q=${encodeURIComponent(email.trim())}`, { credentials: "include" });
    if (!r.ok) throw new Error("suggestions");
    return r.json();
  }, staleTime: 5000 });
  useEffect(() => { const list = suggestionQuery.data?.data || []; setSuggestions(list); setShowSuggestions(list.length > 0); }, [suggestionQuery.data]);

  const orders = useMemo<Order[]>(
    () => ordersQuery.data?.pages.flatMap(page => Array.isArray(page?.data) ? page.data : []) || [],
    [ordersQuery.data?.pages],
  );
  const customerOrders = useMemo<Order[]>(
    () => customerQuery.data?.pages.flatMap(page => Array.isArray(page?.data) ? page.data : []) || [],
    [customerQuery.data?.pages],
  );
  const visibleOrders = orders;
  const current = tab === "orders" ? visibleOrders : customerOrders;
  const currentKey = tab === "orders" ? "orders" : "customer";
  // Once bulk confirmation opens, freeze the destructive target. This prevents
  // a refetch, filter change, or tab switch from changing what the confirm
  // action sends to the server.
  const currentSelected = dialogOpen
    ? new Set(cleanupIds)
    : selected[currentKey] || new Set<number>();
  const eligibleRows = current.filter(o => o.canDelete === true);
  const allVisibleSelected = eligibleRows.length > 0 && eligibleRows.every(o => currentSelected.has(o.id));
  const setCurrentSelection = (next: Set<number>) => setSelected(prev => ({ ...prev, [currentKey]: next }));
  useEffect(() => { setSelected(prev => ({ ...prev, orders: new Set([...prev.orders].filter(id => visibleOrders.some(o => o.id === id && o.canDelete === true))), customer: new Set([...prev.customer].filter(id => customerOrders.some(o => o.id === id && o.canDelete === true))) })); }, [visibleOrders, customerOrders]);
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(entries => {
      const query = tab === "orders" ? ordersQuery : customerQuery;
      if (entries[0]?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage();
      }
    }, { rootMargin: "300px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [tab, ordersQuery.hasNextPage, ordersQuery.isFetchingNextPage, ordersQuery.fetchNextPage, customerQuery.hasNextPage, customerQuery.isFetchingNextPage, customerQuery.fetchNextPage]);

  const errors = [ordersQuery.error, customerQuery.error].map(error => String(error || ""));
  const isUnauthenticated = errors.some(error => error.includes("401"));
  const isForbidden = errors.some(error => error.includes("403"));
  const formatDate = (v: string) => new Date(v).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  const formatMoney = (v: string, currency: string) => `${Number(v || 0).toLocaleString(locale, { maximumFractionDigits: 2 })} ${currency}`;
  const deletionReason = (codes: string[] = []) => {
    const reasons: Record<Lang, Record<string, string>> = {
      en: { FINANCIAL_ACTIVITY: "Financial activity", SIGNED_CONTRACT: "Protected by signed contract", OPERATIONAL_ACTIVITY: "Operational activity", UNKNOWN_DEPENDENCY: "Unknown dependency", ACTIVE_ALLOCATION: "Active allocation" },
      fa: { FINANCIAL_ACTIVITY: "دارای فعالیت مالی", SIGNED_CONTRACT: "محافظت‌شده با قرارداد امضاشده", OPERATIONAL_ACTIVITY: "دارای فعالیت عملیاتی", UNKNOWN_DEPENDENCY: "وابستگی ناشناخته", ACTIVE_ALLOCATION: "تخصیص فعال" },
      ar: { FINANCIAL_ACTIVITY: "يوجد نشاط مالي", SIGNED_CONTRACT: "محمي بعقد موقّع", OPERATIONAL_ACTIVITY: "يوجد نشاط تشغيلي", UNKNOWN_DEPENDENCY: "تبعية غير معروفة", ACTIVE_ALLOCATION: "تخصيص نشط" },
      tr: { FINANCIAL_ACTIVITY: "Finansal faaliyet mevcut", SIGNED_CONTRACT: "İmzalı sözleşmeyle korunuyor", OPERATIONAL_ACTIVITY: "Operasyonel faaliyet mevcut", UNKNOWN_DEPENDENCY: "Bilinmeyen bağımlılık", ACTIVE_ALLOCATION: "Etkin tahsis" },
    };
    if (!codes.length) return reasons[lang]?.UNKNOWN_DEPENDENCY || reasons.en.UNKNOWN_DEPENDENCY;
    return codes.map(code => removalReasons[lang]?.[code] || reasons[lang]?.[code] || code).join(", ");
  };
  const status = (s: string) => <Badge variant="outline" className="whitespace-nowrap">{c[`status${s.charAt(0).toUpperCase()}${s.slice(1)}`] || s || c.unknown}</Badge>;
  const payment = (method: string | null | undefined) => {
    const raw = method || c.unknown;
    const label = paymentLabels[language as Lang]?.[raw.toLowerCase()] || raw;
    return <Badge variant="outline" className="whitespace-nowrap">{label}</Badge>;
  };

  if (isUnauthenticated || isForbidden) return <div dir={direction} className="min-h-[100dvh] bg-slate-950 p-6 flex items-center justify-center"><Card className="max-w-md w-full border-red-900 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="flex items-center gap-2 text-red-300"><Shield />{isForbidden ? c.forbidden : c.auth}</CardTitle></CardHeader><CardContent><p className="text-slate-300 mb-5">{isForbidden ? c.forbiddenHint : c.authHint}</p><Button onClick={() => window.location.href = isForbidden ? "/mrg" : "/mrg/login"}>{isForbidden ? c.back : c.signIn}</Button></CardContent></Card></div>;

  const updateColumnFilter = (key: keyof typeof columnFilters, value: string) => setColumnFilters(previous => ({ ...previous, [key]: value }));
  const filterInput = (key: keyof typeof columnFilters, placeholder: string, type = "text") => {
    if (key === "status") {
      return selectFilter("status", statusFilterOptions.map(value => (
        <option key={value} value={value}>{optionLabel(value)}</option>
      )));
    }
    if (key === "payment") {
      return selectFilter("payment", paymentFilterOptions.map(group => (
        <optgroup key={group.group} label={group.group === "status" ? `${c.payment} status` : `${c.payment} method`}>
          {group.values.map(value => <option key={value} value={value}>{optionLabel(value)}</option>)}
        </optgroup>
      )));
    }
    return <Input type={type} value={columnFilters[key]} onChange={event => updateColumnFilter(key, event.target.value)} placeholder={placeholder} className="mt-2 h-8 min-w-[110px] bg-white text-xs font-normal text-slate-900" />;
  };
  const optionLabel = (value: string) => {
    const translatedStatus = c[`status${value.charAt(0).toUpperCase()}${value.slice(1)}`];
    return paymentLabels[language as Lang]?.[value] || translatedStatus || value.replaceAll("_", " ");
  };
  const selectFilter = (key: "status" | "payment", options: React.ReactNode) => (
    <select value={columnFilters[key]} onChange={event => updateColumnFilter(key, event.target.value)} className="mt-2 h-8 min-w-[135px] rounded-md border border-input bg-white px-2 text-xs font-normal text-slate-900" aria-label={key === "status" ? c.status : c.payment}>
      <option value="">{language === "fa" ? "همه" : language === "ar" ? "الكل" : language === "tr" ? "Tümü" : "All"}</option>
      {options}
    </select>
  );
  const table = (rows: Order[], loading: boolean, emptyText = c.empty) => <Card className="border-slate-200 shadow-sm"><CardHeader className="border-b bg-slate-50/80 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-red-700" />{tab === "orders" ? c.orders : c.customer} <span className="text-slate-500 font-normal">({rows.length})</span></CardTitle><div className="flex items-center gap-2">{currentSelected.size > 0 && <><span className="text-sm font-medium text-red-800">{currentSelected.size} {c.selected}</span><Button variant="ghost" size="sm" onClick={() => setCurrentSelection(new Set())}><X className="h-4 w-4" />{c.clear}</Button><Button variant="destructive" size="sm" onClick={() => { const selectedRows = rows.filter(o => currentSelected.has(o.id) && o.canDelete === true); const ids = selectedRows.map(o => o.id); if (!ids.length) return; setCleanupIds(ids); setCleanupBulk(true); setCleanupKind("orders"); setDialogOpen(true); }}><Trash2 className="h-4 w-4" />{c.bulk}</Button></>}</div></div></CardHeader><CardContent className="p-0">{loading ? <div className="p-8 space-y-3"><div className="h-4 bg-slate-100 animate-pulse rounded" /><div className="h-4 bg-slate-100 animate-pulse rounded" /><div className="h-4 bg-slate-100 animate-pulse rounded" /></div> : rows.length === 0 ? <div className="py-16 text-center text-slate-500"><Package className="mx-auto mb-3 h-9 w-9 text-slate-300" /><p className="font-medium">{emptyText}</p><p className="text-sm mt-1">{c.emptyHint}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-sm"><thead className="bg-slate-50 text-slate-500"><tr className="align-top"><th className="w-12 px-4 py-3"><Checkbox checked={allVisibleSelected} onCheckedChange={(v) => setCurrentSelection(v === true ? new Set(eligibleRows.map(o => o.id)) : new Set())} aria-label={c.selected} /></th><th className="px-3 py-3 text-start">{c.order}{tab === "orders" && filterInput("orderNumber", c.order)}</th><th className="px-3 py-3 text-start">{c.customerName}{tab === "orders" && filterInput("customer", c.customerName)}</th><th className="px-3 py-3 text-start">{c.amount}{tab === "orders" && filterInput("amount", c.amount)}</th><th className="px-3 py-3 text-start">{c.status}{tab === "orders" && filterInput("status", c.status)}</th><th className="px-3 py-3 text-start">{c.payment}{tab === "orders" && filterInput("payment", c.payment)}</th><th className="px-3 py-3 text-start">{c.date}{tab === "orders" && filterInput("date", c.date, "date")}</th><th className="px-4 py-3 text-end">{c.action}</th></tr></thead><tbody>{rows.map(o => <tr key={o.id} className="border-t hover:bg-slate-50/70"><td className="px-4 py-3"><Checkbox checked={currentSelected.has(o.id)} disabled={o.canDelete !== true} onCheckedChange={(v) => { if (o.canDelete !== true) return; const next = new Set(currentSelected); v ? next.add(o.id) : next.delete(o.id); setCurrentSelection(next); }} /></td><td className="px-3 py-3 font-semibold text-slate-900">{o.orderNumber || <span className="text-slate-400">{c.noNumber}</span>}<div className="text-xs text-slate-400">ID {o.id}</div>{o.canDelete !== true && <div className="mt-1 max-w-[260px] text-xs font-normal text-amber-800">{deletionReason(o.deletionBlockers || [])}</div>}</td><td className="px-3 py-3"><div className="font-medium">{o.customerName || o.fullCustomerName || c.unknown}</div><div className="text-xs text-slate-500">{o.customerEmail || o.fullCustomerEmail || "—"}</div>{o.customerPhone && <div className="text-xs text-slate-400">{o.customerPhone}</div>}</td><td className="px-3 py-3 font-medium whitespace-nowrap">{formatMoney(o.totalAmount, o.currency)}</td><td className="px-3 py-3">{status(o.status)}</td><td className="px-3 py-3">{payment(o.paymentMethod)}</td><td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDate(o.createdAt)}</td><td className="px-4 py-3 text-end"><Button variant="outline" size="sm" className="text-red-700 border-red-200 hover:bg-red-50" disabled={o.canDelete !== true} title={o.canDelete !== true ? deletionReason(o.deletionBlockers || []) : undefined} onClick={() => { if (o.canDelete !== true) return; setTarget(o); setCleanupIds([o.id]); setCleanupBulk(false); setCleanupKind("orders"); setDialogOpen(true); }}><Trash2 className="h-4 w-4" />{c.delete}</Button></td></tr>)}</tbody></table></div>}</CardContent></Card>;

  return <div dir={direction} className="min-h-[100dvh] bg-[#f4f6f8] text-slate-900">
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <header className="mb-7 flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3"><div className="rounded-md bg-red-100 p-2 text-red-700"><Shield className="h-6 w-6" /></div><div><h1 className="text-2xl font-bold tracking-tight">{c.title}</h1><p className="mt-1 text-sm text-slate-500">{c.subtitle}</p></div></div>
        <Button variant="outline" onClick={() => { qc.invalidateQueries({ queryKey: ["/api/super-admin/deletable-orders"] }); void ordersQuery.refetch(); }} disabled={ordersQuery.isFetching}><RefreshCw className={`h-4 w-4 ${ordersQuery.isFetching ? "animate-spin" : ""}`} />{c.strongRefresh}</Button>
      </header>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5 bg-slate-200/70"><TabsTrigger value="orders"><Package className="h-4 w-4" />{c.orders}</TabsTrigger><TabsTrigger value="customer"><User className="h-4 w-4" />{c.customer}</TabsTrigger><TabsTrigger value="contracts"><FileText className="h-4 w-4" />{c.contracts}</TabsTrigger></TabsList>
        <TabsContent value="orders">
          <Card className="mb-5 border-slate-200"><CardContent className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1"><Label htmlFor="order-filter">{c.search}</Label><div className="relative mt-1"><Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" /><Input id="order-filter" className="ps-9" value={filter} onChange={e => setFilter(e.target.value)} placeholder={c.searchHint} /></div></div><Button variant="outline" onClick={() => void ordersQuery.refetch()}><RefreshCw className="h-4 w-4" />{c.refresh}</Button></div><div className="mt-4 flex gap-6 text-sm text-slate-500"><span>{c.total}: <strong className="text-slate-900">{ordersQuery.data?.pages[0]?.pagination?.total ?? orders.length}</strong></span><span>{c.visible}: <strong className="text-slate-900">{visibleOrders.length}</strong></span></div></CardContent></Card>
          {ordersQuery.error && !isUnauthenticated && !isForbidden && <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{String(ordersQuery.error)} <Button variant="link" onClick={() => void ordersQuery.refetch()}>{c.refresh}</Button></div>}
          {table(visibleOrders, ordersQuery.isLoading)}
          <div ref={loadMoreRef} className="flex min-h-20 items-center justify-center py-5 text-sm text-slate-500">{ordersQuery.isFetchingNextPage ? <><RefreshCw className="me-2 h-4 w-4 animate-spin" />{c.loading}</> : ordersQuery.hasNextPage ? c.loading : null}</div>
        </TabsContent>
        <TabsContent value="customer">
          <Card className="mb-5 border-slate-200"><CardContent className="p-4"><Label htmlFor="customer-email">{c.email}</Label><div className="relative mt-1 flex gap-2"><div className="relative flex-1"><Mail className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" /><Input id="customer-email" className="ps-9" value={email} onChange={e => { setEmail(e.target.value); setShowSuggestions(true); }} onFocus={() => suggestions.length && setShowSuggestions(true)} placeholder="customer@example.com" type="email" />{showSuggestions && suggestions.length > 0 && <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow-lg">{suggestions.map(s => <button type="button" key={s} className="block w-full px-3 py-2 text-start text-sm hover:bg-slate-50" onMouseDown={() => { setEmail(s); setShowSuggestions(false); }}><Mail className="me-2 inline h-4 w-4 text-slate-400" />{s}</button>)}</div>}</div><Button disabled={!email.trim()} onClick={() => void customerQuery.refetch()}><Search className="h-4 w-4" />{c.lookup}</Button></div></CardContent></Card>
          {!email.trim() ? <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500"><Mail className="mx-auto mb-3 h-9 w-9 text-slate-300" /><p>{c.enterEmail}</p></div> : table(customerOrders, customerQuery.isLoading, c.noCustomer)}
          {email.trim() && <div ref={loadMoreRef} className="flex min-h-20 items-center justify-center py-5 text-sm text-slate-500">{customerQuery.isFetchingNextPage ? <><RefreshCw className="me-2 h-4 w-4 animate-spin" />{c.loadingCustomer}</> : customerQuery.hasNextPage ? c.loadingCustomer : null}</div>}
        </TabsContent>
        <TabsContent value="contracts"><SuperAdminContractsTab language={language} direction={direction} /></TabsContent>
      </Tabs>
    </div>
    <CleanupPreviewDialog open={dialogOpen} kind={cleanupKind} ids={cleanupIds} bulk={cleanupBulk} onClose={() => { setDialogOpen(false); setTarget(null); }} onSuccess={deleted => {
      const deletedSet = new Set(deleted);
      setSelected(prev => ({ orders: new Set([...prev.orders].filter(id => !deletedSet.has(id))), customer: new Set([...prev.customer].filter(id => !deletedSet.has(id))) }));
      setDialogOpen(false);
       toast({ title: cleanupIds.length === 1 ? c.deleted : `${deleted.length} ${c.bulkDeleted}` });
    }} />
  </div>;
}