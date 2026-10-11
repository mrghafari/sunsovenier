import React, { useDeferredValue, useEffect, useState } from "react";
import { AlertTriangle, FileText, RefreshCw, Search, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CleanupPreviewDialog } from "@/components/admin/cleanup-preview-dialog";

type Lang = "en" | "fa" | "ar" | "tr";
interface Contract { id: number; number: string; customerName: string; customerCode: string; items: Array<{ productName: string; quantity: number }>; addendumCount: number; orderCount: number; canDelete: boolean; deletionBlockers: string[] }
const text: Record<Lang, Record<string, string>> = {
  en: { title: "Contracts", search: "Search contracts", searchHint: "Number, customer, code", contract: "Contract no.", customer: "Customer", goods: "Goods", quantity: "Quantity", orders: "Orders", addenda: "Addenda", eligibility: "Eligibility", reasons: "Blocking reasons", operations: "Operations", eligible: "Eligible", protected: "Protected", delete: "Delete", loading: "Loading contracts…", empty: "No contracts found", emptyHint: "Try a different search.", refresh: "Refresh", previous: "Previous", next: "Next", page: "Showing", of: "of", FINANCIAL_ACTIVITY: "Financial activity exists.", SIGNED_CONTRACT: "Signed contract — retained by policy.", OPERATIONAL_ACTIVITY: "Operational activity exists.", UNKNOWN_DEPENDENCY: "Unknown dependency prevents deletion.", ACTIVE_ALLOCATION: "Active allocation prevents deletion.", PREVIEW_CHANGED: "Dependencies changed; review the preview again." },
  fa: { title: "قراردادها", search: "جستجوی قراردادها", searchHint: "شماره، مشتری، کد", contract: "شماره قرارداد", customer: "مشتری", goods: "کالاها", quantity: "تعداد", orders: "سفارش‌ها", addenda: "الحاقیه‌ها", eligibility: "وضعیت حذف", reasons: "دلایل منع", operations: "عملیات", eligible: "قابل حذف", protected: "محافظت‌شده", delete: "حذف", loading: "در حال بارگذاری قراردادها…", empty: "قراردادی یافت نشد", emptyHint: "جستجوی دیگری را امتحان کنید.", refresh: "به‌روزرسانی", previous: "قبلی", next: "بعدی", page: "نمایش", of: "از", FINANCIAL_ACTIVITY: "فعالیت مالی وجود دارد.", SIGNED_CONTRACT: "قرارداد امضاشده طبق سیاست حفظ می‌شود.", OPERATIONAL_ACTIVITY: "فعالیت عملیاتی وجود دارد.", UNKNOWN_DEPENDENCY: "وابستگی ناشناخته مانع حذف است.", ACTIVE_ALLOCATION: "تخصیص فعال مانع حذف است.", PREVIEW_CHANGED: "وابستگی‌ها تغییر کرده‌اند؛ پیش‌نمایش را دوباره بررسی کنید." },
  ar: { title: "العقود", search: "بحث في العقود", searchHint: "الرقم، العميل، الرمز", contract: "رقم العقد", customer: "العميل", goods: "السلع", quantity: "الكمية", orders: "الطلبات", addenda: "الملاحق", eligibility: "الأهلية", reasons: "أسباب المنع", operations: "الإجراءات", eligible: "قابل للحذف", protected: "محمي", delete: "حذف", loading: "جار تحميل العقود…", empty: "لم يتم العثور على عقود", emptyHint: "جرّب بحثاً آخر.", refresh: "تحديث", previous: "السابق", next: "التالي", page: "عرض", of: "من", FINANCIAL_ACTIVITY: "يوجد نشاط مالي.", SIGNED_CONTRACT: "يُحتفظ بالعقد الموقّع وفق السياسة.", OPERATIONAL_ACTIVITY: "يوجد نشاط تشغيلي.", UNKNOWN_DEPENDENCY: "تمنع تبعية غير معروفة الحذف.", ACTIVE_ALLOCATION: "يمنع تخصيص نشط الحذف.", PREVIEW_CHANGED: "تغيرت التبعيات؛ راجع المعاينة مجدداً." },
  tr: { title: "Sözleşmeler", search: "Sözleşme ara", searchHint: "Numara, müşteri, kod", contract: "Sözleşme no.", customer: "Müşteri", goods: "Ürünler", quantity: "Miktar", orders: "Siparişler", addenda: "Ek protokoller", eligibility: "Silinebilirlik", reasons: "Engel nedenleri", operations: "İşlemler", eligible: "Silinebilir", protected: "Korunuyor", delete: "Sil", loading: "Sözleşmeler yükleniyor…", empty: "Sözleşme bulunamadı", emptyHint: "Başka bir arama deneyin.", refresh: "Yenile", previous: "Önceki", next: "Sonraki", page: "Gösterilen", of: "/", FINANCIAL_ACTIVITY: "Finansal faaliyet mevcut.", SIGNED_CONTRACT: "İmzalı sözleşme politika gereği korunur.", OPERATIONAL_ACTIVITY: "Operasyonel faaliyet mevcut.", UNKNOWN_DEPENDENCY: "Bilinmeyen bağımlılık silmeyi engelliyor.", ACTIVE_ALLOCATION: "Etkin tahsis silmeyi engelliyor.", PREVIEW_CHANGED: "Bağımlılıklar değişti; önizlemeyi yeniden inceleyin." },
};
const removalText: Record<Lang, Record<string, string>> = {
  en: { eligibility: "Removal eligibility", eligible: "Removable", delete: "Remove", SIGNED_CONTRACT: "Signed contract evidence is retained; signature alone does not prevent removal when wholly unshipped.", SHIPPED: "A shipped order or contract cannot be removed.", ALREADY_REMOVED: "This record has already been removed.", PAYMENT_EVIDENCE_REQUIRED: "Required payment evidence is missing.", WALLET_CURRENCY_MISMATCH: "Customer wallet currency mismatch.", FINANCIAL_RECONCILIATION_REQUIRED: "Financial reconciliation is required.", WALLET_UNAVAILABLE: "Customer wallet is unavailable." },
  fa: { eligibility: "وضعیت خارج‌کردن", eligible: "قابل خارج‌کردن", delete: "خارج‌کردن", SIGNED_CONTRACT: "مدرک قرارداد امضاشده حفظ می‌شود؛ امضا به‌تنهایی مانع خارج‌کردن قرارداد کاملاً ارسال‌نشده نیست.", SHIPPED: "سفارش یا قرارداد ارسال‌شده قابل خارج‌کردن نیست.", ALREADY_REMOVED: "این رکورد قبلاً خارج شده است.", PAYMENT_EVIDENCE_REQUIRED: "مدرک پرداخت لازم موجود نیست.", WALLET_CURRENCY_MISMATCH: "ارز کیف پول مشتری مطابقت ندارد.", FINANCIAL_RECONCILIATION_REQUIRED: "تطبیق مالی لازم است.", WALLET_UNAVAILABLE: "کیف پول مشتری در دسترس نیست." },
  ar: { eligibility: "أهلية الإزالة", eligible: "قابل للإزالة", delete: "إزالة", SIGNED_CONTRACT: "يُحفظ دليل العقد الموقع؛ ولا يمنع التوقيع وحده إزالة العقد غير المشحون بالكامل.", SHIPPED: "لا يمكن إزالة طلب أو عقد تم شحنه.", ALREADY_REMOVED: "تمت إزالة هذا السجل مسبقاً.", PAYMENT_EVIDENCE_REQUIRED: "دليل الدفع المطلوب مفقود.", WALLET_CURRENCY_MISMATCH: "عملة محفظة العميل غير متطابقة.", FINANCIAL_RECONCILIATION_REQUIRED: "تلزم تسوية مالية.", WALLET_UNAVAILABLE: "محفظة العميل غير متاحة." },
  tr: { eligibility: "Kaldırma uygunluğu", eligible: "Kaldırılabilir", delete: "Kaldır", SIGNED_CONTRACT: "İmzalı sözleşme kanıtı saklanır; tamamen sevk edilmemiş sözleşmede imza tek başına kaldırmayı engellemez.", SHIPPED: "Sevk edilmiş sipariş veya sözleşme kaldırılamaz.", ALREADY_REMOVED: "Bu kayıt zaten kaldırılmış.", PAYMENT_EVIDENCE_REQUIRED: "Gerekli ödeme kanıtı eksik.", WALLET_CURRENCY_MISMATCH: "Müşteri cüzdanının para birimi eşleşmiyor.", FINANCIAL_RECONCILIATION_REQUIRED: "Finansal mutabakat gerekli.", WALLET_UNAVAILABLE: "Müşteri cüzdanı kullanılamıyor." },
};
interface Props { language: string; direction: string }

export function SuperAdminContractsTab({ language, direction }: Props) {
  const lang = (["en", "fa", "ar", "tr"].includes(language) ? language : "en") as Lang;
  const t = { ...text[lang], ...removalText[lang] };
  const [search, setSearch] = useState("");
  const q = useDeferredValue(search.trim());
  const [offset, setOffset] = useState(0);
  const [target, setTarget] = useState<Contract | null>(null);
   const limit = 25;
  const query = useQuery({
    queryKey: ["/api/super-admin/contracts", q, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({ q, limit: String(limit), offset: String(offset) });
      const response = await fetch(`/api/super-admin/contracts?${params}`, { credentials: "include" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.message || "Could not load contracts");
      return payload;
    },
    retry: false,
  });
  useEffect(() => { setOffset(0); }, [q]);
  const data = query.data?.data as Contract[] | undefined;
  const pagination = query.data?.pagination;
  const formatReasons = (codes: string[]) => codes?.length ? codes.map(code => t[code] || code).join(" ") : "—";
  return <div dir={direction} className="space-y-4">
    <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-center">
      <div className="relative flex-1"><Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="ps-9" aria-label={t.search} placeholder={t.searchHint} value={search} onChange={event => setSearch(event.target.value)} /></div>
      <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />{t.refresh}</Button>
    </div>
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full min-w-[1050px] text-sm">
        <thead className="bg-slate-50 text-slate-600"><tr>
          {[t.contract, t.customer, t.goods, t.quantity, t.orders, t.addenda, t.eligibility, t.reasons, t.operations].map(item => <th key={item} className="px-3 py-3 text-start font-semibold">{item}</th>)}
        </tr></thead>
        <tbody>
          {query.isLoading ? <tr><td colSpan={9} className="p-6"><div className="space-y-3"><div className="h-4 animate-pulse rounded bg-slate-100" /><div className="h-4 animate-pulse rounded bg-slate-100" /><div className="h-4 animate-pulse rounded bg-slate-100" /></div></td></tr>
            : query.isError ? <tr><td colSpan={9} className="p-8 text-center"><AlertTriangle className="mx-auto mb-2 h-6 w-6 text-amber-700" /><p className="mb-3 text-sm text-red-700">{String(query.error)}</p><Button variant="outline" onClick={() => query.refetch()}>{t.refresh}</Button></td></tr>
            : !data?.length ? <tr><td colSpan={9} className="p-12 text-center text-slate-500"><FileText className="mx-auto mb-3 h-8 w-8 text-slate-300" /><p className="font-medium">{t.empty}</p><p className="mt-1 text-xs">{t.emptyHint}</p></td></tr>
            : data.map(contract => {
              const goods = contract.items?.map(item => item.productName).filter(Boolean).join(", ") || "—";
              const quantity = contract.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
              return <tr key={contract.id} className="border-t align-top hover:bg-slate-50/70">
                <td className="px-3 py-3 font-semibold">{contract.number || `ID ${contract.id}`}<div className="text-xs font-normal text-slate-400">ID {contract.id}</div></td>
                <td className="px-3 py-3"><div>{contract.customerName || "—"}</div><div className="text-xs text-slate-500">{contract.customerCode || "—"}</div></td>
                <td className="max-w-[240px] whitespace-normal px-3 py-3">{goods}</td><td className="px-3 py-3 tabular-nums">{quantity}</td>
                <td className="px-3 py-3 tabular-nums">{contract.orderCount}</td><td className="px-3 py-3 tabular-nums">{contract.addendumCount}</td>
                <td className="px-3 py-3"><Badge variant={contract.canDelete === true ? "secondary" : "outline"} className={contract.canDelete === true ? "bg-emerald-50 text-emerald-800" : "text-amber-800"}>{contract.canDelete === true ? t.eligible : t.protected}</Badge></td>
                <td className="max-w-[260px] whitespace-normal px-3 py-3 text-xs text-slate-600">{formatReasons(contract.deletionBlockers || [])}</td>
                <td className="px-3 py-3"><Button size="sm" variant="outline" disabled={contract.canDelete !== true} className="text-red-700" onClick={() => setTarget(contract)}><Trash2 className="h-3.5 w-3.5" />{t.delete}</Button></td>
              </tr>;
            })}
        </tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
      <span>{t.page} {Math.min(offset + 1, pagination?.total || 0)}–{Math.min(offset + (data?.length || 0), pagination?.total || 0)} {t.of} {pagination?.total || 0}</span>
      <div className="flex gap-2"><Button variant="outline" size="sm" disabled={offset <= 0 || query.isFetching} onClick={() => setOffset(Math.max(0, offset - (pagination?.limit || limit)))}>{t.previous}</Button><Button variant="outline" size="sm" disabled={!pagination?.hasMore || query.isFetching} onClick={() => setOffset(pagination?.nextOffset ?? offset + (pagination?.limit || limit))}>{t.next}</Button></div>
    </div>
    <CleanupPreviewDialog open={!!target} kind="contract" ids={target ? [target.id] : []} onClose={() => setTarget(null)} onSuccess={() => { setTarget(null); void query.refetch(); }} />
  </div>;
}
