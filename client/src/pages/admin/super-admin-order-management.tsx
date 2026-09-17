import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Database, Mail, Package, RefreshCw, Search, Shield, Trash2, User, X } from "lucide-react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
}

type Lang = "en" | "fa" | "ar" | "tr";
const copy: Record<Lang, Record<string, string>> = {
  en: { title: "Super admin order control", subtitle: "Permanent deletion console. Verify every selection before committing.", orders: "Deletable orders", customer: "Customer orders", search: "Search orders", searchHint: "Order number, email, phone, delivery code", refresh: "Refresh", strongRefresh: "Force refresh", production: "Production reset", total: "Total", visible: "Visible", selected: "selected", clear: "Clear selection", bulk: "Delete selected", empty: "No orders found", emptyHint: "Try a different filter or refresh the list.", email: "Customer email", lookup: "Search customer", enterEmail: "Enter an email to load orders", noCustomer: "No orders found for this customer", loading: "Loading orders…", loadingCustomer: "Searching…", order: "Order", customerName: "Customer", amount: "Amount", status: "Status", payment: "Payment", date: "Created", action: "Action", delete: "Delete", deleteTitle: "Permanently delete this order?", bulkTitle: "Permanently delete selected orders?", permanent: "This cannot be undone. All related records will be removed.", confirm: "Delete permanently", cancel: "Cancel", deleting: "Deleting…", deleted: "Order deleted", bulkDeleted: "orders deleted", error: "Operation failed", auth: "Authentication required", authHint: "Sign in with an administrator account to continue.", signIn: "Go to admin sign in", forbidden: "Super admin access required", forbiddenHint: "You are signed in, but this account does not have an active super admin role.", back: "Back to admin panel", resetTitle: "Reset production data", resetText: "This permanently clears test orders, transactions and related records.", preserve: "Preserve customer records", reset: "Reset production", resetting: "Resetting…", resetDone: "Production reset complete", statusCompleted: "Completed", statusPending: "Pending", statusCancelled: "Cancelled", statusProcessing: "Processing", unknown: "Unknown", noNumber: "No order number", selectedCount: "selected orders" },
  fa: { title: "کنترل سفارش‌های سوپر ادمین", subtitle: "کنسول حذف دائمی. پیش از ثبت، هر انتخاب را بررسی کنید.", orders: "سفارش‌های قابل حذف", customer: "سفارش‌های مشتری", search: "جستجوی سفارش", searchHint: "شماره سفارش، ایمیل، تلفن، کد تحویل", refresh: "به‌روزرسانی", strongRefresh: "به‌روزرسانی کامل", production: "پاک‌سازی تولید", total: "کل", visible: "قابل مشاهده", selected: "انتخاب‌شده", clear: "لغو انتخاب", bulk: "حذف انتخاب‌شده‌ها", empty: "سفارشی یافت نشد", emptyHint: "فیلتر دیگری امتحان کنید یا فهرست را به‌روزرسانی کنید.", email: "ایمیل مشتری", lookup: "جستجوی مشتری", enterEmail: "برای دریافت سفارش‌ها ایمیل وارد کنید", noCustomer: "برای این مشتری سفارشی یافت نشد", loading: "در حال بارگذاری سفارش‌ها…", loadingCustomer: "در حال جستجو…", order: "سفارش", customerName: "مشتری", amount: "مبلغ", status: "وضعیت", payment: "پرداخت", date: "ایجاد شده", action: "عملیات", delete: "حذف", deleteTitle: "این سفارش برای همیشه حذف شود؟", bulkTitle: "سفارش‌های انتخاب‌شده برای همیشه حذف شوند؟", permanent: "این عملیات برگشت‌پذیر نیست و همه رکوردهای مرتبط حذف می‌شوند.", confirm: "حذف دائمی", cancel: "انصراف", deleting: "در حال حذف…", deleted: "سفارش حذف شد", bulkDeleted: "سفارش حذف شد", error: "عملیات ناموفق بود", auth: "احراز هویت لازم است", authHint: "برای ادامه با حساب مدیر وارد شوید.", signIn: "ورود به پنل مدیریت", forbidden: "دسترسی سوپر ادمین لازم است", forbiddenHint: "شما وارد شده‌اید، اما این حساب نقش فعال سوپر ادمین ندارد.", back: "بازگشت به پنل مدیریت", resetTitle: "پاک‌سازی داده‌های تولید", resetText: "این عملیات سفارش‌های آزمایشی، تراکنش‌ها و رکوردهای مرتبط را حذف می‌کند.", preserve: "حفظ رکوردهای مشتریان", reset: "پاک‌سازی تولید", resetting: "در حال پاک‌سازی…", resetDone: "پاک‌سازی تولید انجام شد", statusCompleted: "تکمیل‌شده", statusPending: "در انتظار", statusCancelled: "لغو شده", statusProcessing: "در حال پردازش", unknown: "نامشخص", noNumber: "بدون شماره سفارش", selectedCount: "سفارش انتخاب‌شده" },
  ar: { title: "التحكم بطلبات المشرف الأعلى", subtitle: "وحدة حذف نهائي. تحقق من كل اختيار قبل التنفيذ.", orders: "الطلبات القابلة للحذف", customer: "طلبات العميل", search: "بحث في الطلبات", searchHint: "رقم الطلب، البريد، الهاتف، رمز التسليم", refresh: "تحديث", strongRefresh: "تحديث كامل", production: "إعادة ضبط الإنتاج", total: "الإجمالي", visible: "الظاهر", selected: "محدد", clear: "إلغاء التحديد", bulk: "حذف المحدد", empty: "لم يتم العثور على طلبات", emptyHint: "جرّب مرشحاً آخر أو حدّث القائمة.", email: "بريد العميل", lookup: "بحث عن العميل", enterEmail: "أدخل بريداً لتحميل الطلبات", noCustomer: "لا توجد طلبات لهذا العميل", loading: "جار تحميل الطلبات…", loadingCustomer: "جار البحث…", order: "الطلب", customerName: "العميل", amount: "المبلغ", status: "الحالة", payment: "الدفع", date: "تاريخ الإنشاء", action: "الإجراء", delete: "حذف", deleteTitle: "حذف هذا الطلب نهائياً؟", bulkTitle: "حذف الطلبات المحددة نهائياً؟", permanent: "لا يمكن التراجع. ستُحذف كل السجلات المرتبطة.", confirm: "حذف نهائي", cancel: "إلغاء", deleting: "جار الحذف…", deleted: "تم حذف الطلب", bulkDeleted: "طلبات تم حذفها", error: "فشلت العملية", auth: "المصادقة مطلوبة", authHint: "سجّل الدخول بحساب مسؤول للمتابعة.", signIn: "الذهاب لتسجيل دخول الإدارة", forbidden: "صلاحية المشرف الأعلى مطلوبة", forbiddenHint: "أنت مسجل الدخول، لكن هذا الحساب لا يملك دور مشرف أعلى نشطاً.", back: "العودة إلى لوحة الإدارة", resetTitle: "إعادة ضبط بيانات الإنتاج", resetText: "يمسح هذا طلبات الاختبار والمعاملات والسجلات المرتبطة نهائياً.", preserve: "الحفاظ على سجلات العملاء", reset: "إعادة ضبط الإنتاج", resetting: "جار إعادة الضبط…", resetDone: "اكتملت إعادة ضبط الإنتاج", statusCompleted: "مكتمل", statusPending: "قيد الانتظار", statusCancelled: "ملغى", statusProcessing: "قيد المعالجة", unknown: "غير معروف", noNumber: "بدون رقم طلب", selectedCount: "طلبات محددة" },
  tr: { title: "Süper yönetici sipariş kontrolü", subtitle: "Kalıcı silme konsolu. İşlemi onaylamadan önce her seçimi doğrulayın.", orders: "Silinebilir siparişler", customer: "Müşteri siparişleri", search: "Sipariş ara", searchHint: "Sipariş no, e-posta, telefon, teslim kodu", refresh: "Yenile", strongRefresh: "Zorla yenile", production: "Üretim sıfırlama", total: "Toplam", visible: "Görünen", selected: "seçili", clear: "Seçimi temizle", bulk: "Seçilenleri sil", empty: "Sipariş bulunamadı", emptyHint: "Başka bir filtre deneyin veya listeyi yenileyin.", email: "Müşteri e-postası", lookup: "Müşteri ara", enterEmail: "Siparişleri yüklemek için e-posta girin", noCustomer: "Bu müşteri için sipariş bulunamadı", loading: "Siparişler yükleniyor…", loadingCustomer: "Aranıyor…", order: "Sipariş", customerName: "Müşteri", amount: "Tutar", status: "Durum", payment: "Ödeme", date: "Oluşturuldu", action: "İşlem", delete: "Sil", deleteTitle: "Bu sipariş kalıcı olarak silinsin mi?", bulkTitle: "Seçilen siparişler kalıcı olarak silinsin mi?", permanent: "Bu işlem geri alınamaz. Tüm ilişkili kayıtlar silinir.", confirm: "Kalıcı sil", cancel: "İptal", deleting: "Siliniyor…", deleted: "Sipariş silindi", bulkDeleted: "sipariş silindi", error: "İşlem başarısız", auth: "Kimlik doğrulama gerekli", authHint: "Devam etmek için yönetici hesabıyla giriş yapın.", signIn: "Yönetici girişine git", forbidden: "Süper yönetici erişimi gerekli", forbiddenHint: "Oturumunuz açık, ancak bu hesapta etkin bir süper yönetici rolü yok.", back: "Yönetim paneline dön", resetTitle: "Üretim verilerini sıfırla", resetText: "Test siparişleri, işlemleri ve ilişkili kayıtları kalıcı olarak temizler.", preserve: "Müşteri kayıtlarını koru", reset: "Üretimi sıfırla", resetting: "Sıfırlanıyor…", resetDone: "Üretim sıfırlama tamamlandı", statusCompleted: "Tamamlandı", statusPending: "Bekliyor", statusCancelled: "İptal", statusProcessing: "İşleniyor", unknown: "Bilinmiyor", noNumber: "Sipariş numarası yok", selectedCount: "seçili sipariş" },
};
const paymentLabels: Record<Lang, Record<string, string>> = {
  en: { wallet_full: "Wallet (full)", wallet_partial: "Wallet (partial)", online_payment: "Online payment", bank_transfer: "Bank transfer", bank_transfer_grace: "Bank transfer (grace)", hybrid: "Hybrid", cash: "Cash", credit: "Credit" },
  fa: { wallet_full: "کیف پول (کامل)", wallet_partial: "کیف پول (جزئی)", online_payment: "پرداخت آنلاین", bank_transfer: "انتقال بانکی", bank_transfer_grace: "انتقال بانکی (مهلت)", hybrid: "ترکیبی", cash: "نقدی", credit: "اعتباری" },
  ar: { wallet_full: "محفظة (كامل)", wallet_partial: "محفظة (جزئي)", online_payment: "دفع إلكتروني", bank_transfer: "تحويل بنكي", bank_transfer_grace: "تحويل بنكي (مهلة)", hybrid: "مختلط", cash: "نقدي", credit: "ائتماني" },
  tr: { wallet_full: "Cüzdan (tam)", wallet_partial: "Cüzdan (kısmi)", online_payment: "Çevrim içi ödeme", bank_transfer: "Banka havalesi", bank_transfer_grace: "Banka havalesi (ek süre)", hybrid: "Karma", cash: "Nakit", credit: "Kredi" },
};

export default function SuperAdminOrderManagement() {
  const { language, direction } = useLanguage();
  const c = { ...(copy[language as Lang] || copy.en) };
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
  const [dialog, setDialog] = useState<"single" | "bulk" | "reset" | null>(null);
  const [target, setTarget] = useState<Order | null>(null);
  const [bulkSnapshot, setBulkSnapshot] = useState<{ ids: number[]; labels: string[] } | null>(null);
  const [preserve, setPreserve] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const deferredFilter = useDeferredValue(filter);
  const deferredColumnFilters = useDeferredValue(columnFilters);
  if (dialog === "single" && target) {
    c.deleteTitle = `${c.deleteTitle} ${target.orderNumber || c.noNumber} (ID ${target.id})`;
  }
  if (dialog === "bulk" && bulkSnapshot) {
    c.selectedCount = `${bulkSnapshot.labels.slice(0, 8).join(", ")}${bulkSnapshot.labels.length > 8 ? ` … +${bulkSnapshot.labels.length - 8}` : ""}`;
  }

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
  const customerQuery = useQuery({ queryKey: ["/api/super-admin/customer-orders-by-email", email], enabled: tab === "customer" && !!email.trim(), retry: false, queryFn: async () => {
    const r = await fetch(`/api/super-admin/customer-orders-by-email/${encodeURIComponent(email.trim())}`, { credentials: "include" });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }});
  const suggestionQuery = useQuery({ queryKey: ["/api/super-admin/email-suggestions", email], enabled: email.trim().length >= 3, queryFn: async () => {
    const r = await fetch(`/api/super-admin/email-suggestions?q=${encodeURIComponent(email.trim())}`, { credentials: "include" });
    if (!r.ok) throw new Error("suggestions");
    return r.json();
  }, staleTime: 5000 });
  useEffect(() => { const list = suggestionQuery.data?.data || []; setSuggestions(list); setShowSuggestions(list.length > 0); }, [suggestionQuery.data]);

  const customerResponse = customerQuery.data as { data?: Order[] } | undefined;
  const orders = useMemo<Order[]>(
    () => ordersQuery.data?.pages.flatMap(page => Array.isArray(page?.data) ? page.data : []) || [],
    [ordersQuery.data?.pages],
  );
  const customerOrders = useMemo<Order[]>(
    () => Array.isArray(customerResponse?.data) ? customerResponse.data : [],
    [customerResponse?.data],
  );
  const visibleOrders = orders;
  const current = tab === "orders" ? visibleOrders : customerOrders;
  const currentKey = tab === "orders" ? "orders" : "customer";
  // Once bulk confirmation opens, freeze the destructive target. This prevents
  // a refetch, filter change, or tab switch from changing what the confirm
  // action sends to the server.
  const currentSelected = dialog === "bulk" && bulkSnapshot
    ? new Set(bulkSnapshot.ids)
    : selected[currentKey] || new Set<number>();
  const allVisibleSelected = current.length > 0 && current.every(o => currentSelected.has(o.id));
  const setCurrentSelection = (next: Set<number>) => setSelected(prev => ({ ...prev, [currentKey]: next }));
  useEffect(() => { setSelected(prev => ({ ...prev, orders: new Set([...prev.orders].filter(id => visibleOrders.some(o => o.id === id))), customer: new Set([...prev.customer].filter(id => customerOrders.some(o => o.id === id))) })); }, [visibleOrders, customerOrders]);
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || tab !== "orders") return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && ordersQuery.hasNextPage && !ordersQuery.isFetchingNextPage) {
        ordersQuery.fetchNextPage();
      }
    }, { rootMargin: "300px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [tab, ordersQuery.hasNextPage, ordersQuery.isFetchingNextPage, ordersQuery.fetchNextPage]);

  const mutation = useMutation({ mutationFn: async (payload: { kind: "single" | "bulk"; order?: Order; ids?: number[] }) => {
    const endpoint = payload.kind === "bulk" ? "/api/super-admin/orders/bulk-delete" : payload.order?.orderNumber && payload.order.orderNumber !== "null" ? `/api/super-admin/orders/${encodeURIComponent(payload.order.orderNumber)}` : `/api/super-admin/orders-by-id/${payload.order?.id}`;
    const r = await fetch(endpoint, { method: payload.kind === "bulk" ? "POST" : "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: payload.kind === "bulk" ? JSON.stringify({ orderIds: payload.ids }) : undefined });
    if (!r.ok) throw new Error((await r.json().catch(() => null))?.message || c.error);
    return r.json();
  }, onSuccess: (_, vars) => {
    const count = vars.kind === "bulk" ? vars.ids?.length || 0 : 1;
    toast({ title: vars.kind === "bulk" ? `${count} ${c.bulkDeleted}` : c.deleted });
    const deletedIds = new Set(vars.kind === "bulk" ? vars.ids || [] : vars.order ? [vars.order.id] : []);
    setDialog(null);
    setTarget(null);
    setSelected(prev => ({
      orders: new Set([...prev.orders].filter(id => !deletedIds.has(id))),
      customer: new Set([...prev.customer].filter(id => !deletedIds.has(id))),
    }));
    qc.invalidateQueries({ queryKey: ["/api/super-admin/deletable-orders"] });
    qc.invalidateQueries({ queryKey: ["/api/super-admin/customer-orders-by-email"] });
  }, onError: (e: Error) => toast({ title: c.error, description: e.message, variant: "destructive" }) });
  const resetMutation = useMutation({ mutationFn: async () => { const r = await fetch("/api/super-admin/reset-for-production", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preserveCustomers: preserve }) }); if (!r.ok) throw new Error((await r.json().catch(() => null))?.message || c.error); return r.json(); }, onSuccess: () => { toast({ title: c.resetDone }); setDialog(null); qc.invalidateQueries({ queryKey: ["/api/super-admin/deletable-orders"] }); }, onError: (e: Error) => toast({ title: c.error, description: e.message, variant: "destructive" }) });

  const errors = [ordersQuery.error, customerQuery.error].map(error => String(error || ""));
  const isUnauthenticated = errors.some(error => error.includes("401"));
  const isForbidden = errors.some(error => error.includes("403"));
  const formatDate = (v: string) => new Date(v).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  const formatMoney = (v: string, currency: string) => `${Number(v || 0).toLocaleString(locale, { maximumFractionDigits: 2 })} ${currency}`;
  const status = (s: string) => <Badge variant="outline" className="whitespace-nowrap">{c[`status${s.charAt(0).toUpperCase()}${s.slice(1)}`] || s || c.unknown}</Badge>;
  const payment = (method: string | null | undefined) => {
    const raw = method || c.unknown;
    const label = paymentLabels[language as Lang]?.[raw.toLowerCase()] || raw;
    return <Badge variant="outline" className="whitespace-nowrap">{label}</Badge>;
  };

  if (isUnauthenticated || isForbidden) return <div dir={direction} className="min-h-[100dvh] bg-slate-950 p-6 flex items-center justify-center"><Card className="max-w-md w-full border-red-900 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="flex items-center gap-2 text-red-300"><Shield />{isForbidden ? c.forbidden : c.auth}</CardTitle></CardHeader><CardContent><p className="text-slate-300 mb-5">{isForbidden ? c.forbiddenHint : c.authHint}</p><Button onClick={() => window.location.href = isForbidden ? "/admin" : "/admin/login"}>{isForbidden ? c.back : c.signIn}</Button></CardContent></Card></div>;

  const updateColumnFilter = (key: keyof typeof columnFilters, value: string) => setColumnFilters(previous => ({ ...previous, [key]: value }));
  const filterInput = (key: keyof typeof columnFilters, placeholder: string, type = "text") => (
    <Input type={type} value={columnFilters[key]} onChange={event => updateColumnFilter(key, event.target.value)} placeholder={placeholder} className="mt-2 h-8 min-w-[110px] bg-white text-xs font-normal text-slate-900" />
  );
  const table = (rows: Order[], loading: boolean, emptyText = c.empty) => <Card className="border-slate-200 shadow-sm"><CardHeader className="border-b bg-slate-50/80 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-red-700" />{tab === "orders" ? c.orders : c.customer} <span className="text-slate-500 font-normal">({rows.length})</span></CardTitle><div className="flex items-center gap-2">{currentSelected.size > 0 && <><span className="text-sm font-medium text-red-800">{currentSelected.size} {c.selected}</span><Button variant="ghost" size="sm" onClick={() => setCurrentSelection(new Set())}><X className="h-4 w-4" />{c.clear}</Button><Button variant="destructive" size="sm" disabled={mutation.isPending} onClick={() => { const selectedRows = rows.filter(o => currentSelected.has(o.id)); setBulkSnapshot({ ids: selectedRows.map(o => o.id), labels: selectedRows.map(o => o.orderNumber ? `${o.orderNumber} (ID ${o.id})` : `ID ${o.id}`) }); setDialog("bulk"); }}><Trash2 className="h-4 w-4" />{c.bulk}</Button></>}</div></div></CardHeader><CardContent className="p-0">{loading ? <div className="p-8 space-y-3"><div className="h-4 bg-slate-100 animate-pulse rounded" /><div className="h-4 bg-slate-100 animate-pulse rounded" /><div className="h-4 bg-slate-100 animate-pulse rounded" /></div> : rows.length === 0 ? <div className="py-16 text-center text-slate-500"><Package className="mx-auto mb-3 h-9 w-9 text-slate-300" /><p className="font-medium">{emptyText}</p><p className="text-sm mt-1">{c.emptyHint}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-sm"><thead className="bg-slate-50 text-slate-500"><tr className="align-top"><th className="w-12 px-4 py-3"><Checkbox checked={allVisibleSelected} onCheckedChange={(v) => setCurrentSelection(v === true ? new Set(rows.map(o => o.id)) : new Set())} aria-label={c.selected} /></th><th className="px-3 py-3 text-start">{c.order}{tab === "orders" && filterInput("orderNumber", c.order)}</th><th className="px-3 py-3 text-start">{c.customerName}{tab === "orders" && filterInput("customer", c.customerName)}</th><th className="px-3 py-3 text-start">{c.amount}{tab === "orders" && filterInput("amount", c.amount)}</th><th className="px-3 py-3 text-start">{c.status}{tab === "orders" && filterInput("status", c.status)}</th><th className="px-3 py-3 text-start">{c.payment}{tab === "orders" && filterInput("payment", c.payment)}</th><th className="px-3 py-3 text-start">{c.date}{tab === "orders" && filterInput("date", c.date, "date")}</th><th className="px-4 py-3 text-end">{c.action}</th></tr></thead><tbody>{rows.map(o => <tr key={o.id} className="border-t hover:bg-slate-50/70"><td className="px-4 py-3"><Checkbox checked={currentSelected.has(o.id)} onCheckedChange={(v) => { const next = new Set(currentSelected); v ? next.add(o.id) : next.delete(o.id); setCurrentSelection(next); }} /></td><td className="px-3 py-3 font-semibold text-slate-900">{o.orderNumber || <span className="text-slate-400">{c.noNumber}</span>}<div className="text-xs text-slate-400">ID {o.id}</div></td><td className="px-3 py-3"><div className="font-medium">{o.customerName || o.fullCustomerName || c.unknown}</div><div className="text-xs text-slate-500">{o.customerEmail || o.fullCustomerEmail || "—"}</div>{o.customerPhone && <div className="text-xs text-slate-400">{o.customerPhone}</div>}</td><td className="px-3 py-3 font-medium whitespace-nowrap">{formatMoney(o.totalAmount, o.currency)}</td><td className="px-3 py-3">{status(o.status)}</td><td className="px-3 py-3">{payment(o.paymentMethod)}</td><td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDate(o.createdAt)}</td><td className="px-4 py-3 text-end"><Button variant="outline" size="sm" className="text-red-700 border-red-200 hover:bg-red-50" disabled={mutation.isPending} onClick={() => { setTarget(o); setDialog("single"); }}><Trash2 className="h-4 w-4" />{c.delete}</Button></td></tr>)}</tbody></table></div>}</CardContent></Card>;

  return <div dir={direction} className="min-h-[100dvh] bg-[#f4f6f8] text-slate-900"><div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8"><header className="mb-7 flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-3"><div className="rounded-md bg-red-100 p-2 text-red-700"><Shield className="h-6 w-6" /></div><div><h1 className="text-2xl font-bold tracking-tight">{c.title}</h1><p className="mt-1 text-sm text-slate-500">{c.subtitle}</p></div></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { qc.invalidateQueries({ queryKey: ["/api/super-admin/deletable-orders"] }); ordersQuery.refetch(); }} disabled={ordersQuery.isFetching}><RefreshCw className={`h-4 w-4 ${ordersQuery.isFetching ? "animate-spin" : ""}`} />{c.strongRefresh}</Button><Button variant="destructive" onClick={() => setDialog("reset")}><Database className="h-4 w-4" />{c.production}</Button></div></header><Tabs value={tab} onValueChange={setTab}><TabsList className="mb-5 bg-slate-200/70"><TabsTrigger value="orders"><Package className="h-4 w-4" />{c.orders}</TabsTrigger><TabsTrigger value="customer"><User className="h-4 w-4" />{c.customer}</TabsTrigger></TabsList><TabsContent value="orders"><Card className="mb-5 border-slate-200"><CardContent className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1"><Label htmlFor="order-filter">{c.search}</Label><div className="relative mt-1"><Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" /><Input id="order-filter" className="ps-9" value={filter} onChange={e => setFilter(e.target.value)} placeholder={c.searchHint} /></div></div><Button variant="outline" onClick={() => ordersQuery.refetch()}><RefreshCw className="h-4 w-4" />{c.refresh}</Button></div><div className="mt-4 flex gap-6 text-sm text-slate-500"><span>{c.total}: <strong className="text-slate-900">{ordersQuery.data?.pages[0]?.pagination?.total ?? orders.length}</strong></span><span>{c.visible}: <strong className="text-slate-900">{visibleOrders.length}</strong></span></div></CardContent></Card>{table(visibleOrders, ordersQuery.isLoading)}<div ref={loadMoreRef} className="flex min-h-20 items-center justify-center py-5 text-sm text-slate-500">{ordersQuery.isFetchingNextPage ? <><RefreshCw className="me-2 h-4 w-4 animate-spin" />{c.loading}</> : ordersQuery.hasNextPage ? c.loading : null}</div></TabsContent><TabsContent value="customer"><Card className="mb-5 border-slate-200"><CardContent className="p-4"><Label htmlFor="customer-email">{c.email}</Label><div className="relative mt-1 flex gap-2"><div className="relative flex-1"><Mail className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" /><Input id="customer-email" className="ps-9" value={email} onChange={e => { setEmail(e.target.value); setShowSuggestions(true); }} onFocus={() => suggestions.length && setShowSuggestions(true)} placeholder="customer@example.com" type="email" />{showSuggestions && suggestions.length > 0 && <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow-lg">{suggestions.map(s => <button type="button" key={s} className="block w-full px-3 py-2 text-start text-sm hover:bg-slate-50" onMouseDown={() => { setEmail(s); setShowSuggestions(false); }}><Mail className="me-2 inline h-4 w-4 text-slate-400" />{s}</button>)}</div>}</div><Button disabled={!email.trim()} onClick={() => customerQuery.refetch()}><Search className="h-4 w-4" />{c.lookup}</Button></div></CardContent></Card>{!email.trim() ? <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500"><Mail className="mx-auto mb-3 h-9 w-9 text-slate-300" /><p>{c.enterEmail}</p></div> : table(customerOrders, customerQuery.isLoading, c.noCustomer)}</TabsContent></Tabs></div><AlertDialog open={!!dialog} onOpenChange={v => !v && setDialog(null)}><AlertDialogContent dir={direction}><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2 text-red-700"><AlertTriangle className="h-5 w-5" />{dialog === "reset" ? c.resetTitle : dialog === "bulk" ? `${currentSelected.size} ${c.selectedCount}` : c.deleteTitle}</AlertDialogTitle><AlertDialogDescription>{dialog === "reset" ? c.resetText : c.permanent}</AlertDialogDescription></AlertDialogHeader>{dialog === "reset" && <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"><Checkbox id="preserve" checked={preserve} onCheckedChange={v => setPreserve(v === true)} /><Label htmlFor="preserve">{c.preserve}</Label></div>}<AlertDialogFooter><AlertDialogCancel disabled={mutation.isPending || resetMutation.isPending}>{c.cancel}</AlertDialogCancel><AlertDialogAction className="bg-red-700 hover:bg-red-800" disabled={mutation.isPending || resetMutation.isPending} onClick={() => dialog === "reset" ? resetMutation.mutate() : mutation.mutate(dialog === "bulk" ? { kind: "bulk", ids: [...currentSelected] } : { kind: "single", order: target || undefined })}>{mutation.isPending || resetMutation.isPending ? <><RefreshCw className="h-4 w-4 animate-spin" />{dialog === "reset" ? c.resetting : c.deleting}</> : <><Trash2 className="h-4 w-4" />{dialog === "reset" ? c.reset : c.confirm}</>}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>;
}