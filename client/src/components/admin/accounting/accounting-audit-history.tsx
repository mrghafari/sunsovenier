import { useState } from "react";
import type { ReactNode } from "react";
import type { AccountingAuditFilters, AccountingAuditReport } from "@shared/accounting-audit";
import { accountingAuditFiltersSchema } from "@shared/accounting-audit";
import { useAccountingAudit, downloadAccountingAudit } from "@/lib/accounting-audit-api";
import { useLanguage } from "@/contexts/LanguageContext";
import { normalizeAccountingDigits } from "./accounting-logic";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Download, RotateCw, ShieldCheck } from "lucide-react";

export type Copy = {
  title: string; intro: string; safety: string; company: string; from: string; to: string; actorId: string;
  actorType: string; action: string; entityType: string; apply: string; refresh: string; export: string;
  exporting: string; exportError: string; choose: string; noCompanies: string; invalid: string; loading: string;
  failed: string; retry: string; stale: string; noRows: string; who: string; what: string; when: string;
  entityId: string; before: string; after: string; yes: string; no: string; page: string; of: string;
  previous: string; next: string; rows: string; scope: string; exportLimit: string;
};
export const accountingAuditCopy: Record<"en" | "fa" | "ar" | "tr", Copy> = {
  en: {
    title: "Accounting audit history", intro: "Metadata-only trail for the selected company and local-day range.",
    safety: "Selected-company accounting actions only. Global, unbound, and other-module events are excluded. Snapshot payloads and contact details are never shown.",
    company: "Company", from: "From local day", to: "Through local day", actorId: "Actor ID (0 is valid)",
    actorType: "Actor type · exact", action: "Action · exact", entityType: "Entity type · exact",
    apply: "Apply filters", refresh: "Refresh", export: "Download full CSV", exporting: "Preparing CSV…",
    exportError: "CSV download failed", choose: "Choose a company and date range, then apply filters.",
    noCompanies: "No companies are available for this view.", invalid: "Enter a valid company, date range, and optional non-negative actor ID.",
    loading: "Loading audit history…", failed: "Could not load audit history", retry: "Retry",
    stale: "The draft scope changed. Apply again to view the new scope.",
    noRows: "No accounting audit metadata matches this scope.", who: "Who", what: "What", when: "When",
    entityId: "Entity ID", before: "Before snapshot", after: "After snapshot", yes: "Present", no: "Absent",
    page: "Page", of: "of", previous: "Previous", next: "Next", rows: "events",
    scope: "Company-local dates · timezone", exportLimit: "Full-scope export is limited to 10,000 events. Narrow the filters to download.",
  },
  fa: {
    title: "تاریخچهٔ حسابرسی حسابداری", intro: "ردپای فراداده‌ای فقط برای شرکت انتخاب‌شده و روزهای محلی.",
    safety: "فقط اقدامات حسابداری شرکت انتخاب‌شده. رویدادهای سراسری، بدون شرکت و ماژول‌های دیگر حذف شده‌اند. محتوای تصویرها و اطلاعات تماس هرگز نمایش داده نمی‌شود.",
    company: "شرکت", from: "از روز محلی", to: "تا روز محلی", actorId: "شناسه عامل (۰ معتبر است)",
    actorType: "نوع عامل · دقیق", action: "عمل · دقیق", entityType: "نوع موجودیت · دقیق",
    apply: "اعمال فیلترها", refresh: "به‌روزرسانی", export: "دریافت CSV کامل", exporting: "آماده‌سازی CSV…",
    exportError: "دریافت CSV ناموفق بود", choose: "شرکت و محدودهٔ تاریخ را انتخاب و فیلترها را اعمال کنید.",
    noCompanies: "شرکتی برای این نما موجود نیست.", invalid: "شرکت، محدودهٔ تاریخ و شناسهٔ عامل نامنفی معتبر وارد کنید.",
    loading: "در حال بارگذاری تاریخچه…", failed: "بارگذاری تاریخچهٔ حسابرسی ممکن نشد", retry: "تلاش دوباره",
    stale: "محدودهٔ پیش‌نویس تغییر کرده است. برای نمایش محدودهٔ جدید دوباره اعمال کنید.",
    noRows: "فرادادهٔ حسابرسی حسابداری برای این محدوده پیدا نشد.", who: "چه کسی", what: "چه چیزی", when: "چه زمانی",
    entityId: "شناسه موجودیت", before: "تصویر قبل", after: "تصویر بعد", yes: "موجود", no: "ناموجود",
    page: "صفحه", of: "از", previous: "قبلی", next: "بعدی", rows: "رویداد",
    scope: "تاریخ محلی شرکت · منطقهٔ زمانی", exportLimit: "خروجی کامل به ۱۰٬۰۰۰ رویداد محدود است. برای دریافت، فیلترها را محدود کنید.",
  },
  ar: {
    title: "سجل تدقيق المحاسبة", intro: "سجل بيانات وصفية للشركة المحددة والأيام المحلية فقط.",
    safety: "إجراءات محاسبية للشركة المحددة فقط. تُستبعد الأحداث العامة وغير المرتبطة بشركة والوحدات الأخرى. لا تُعرض بيانات اللقطات أو معلومات الاتصال مطلقًا.",
    company: "الشركة", from: "من اليوم المحلي", to: "حتى اليوم المحلي", actorId: "رقم الفاعل (الصفر صالح)",
    actorType: "نوع الفاعل · مطابق", action: "الإجراء · مطابق", entityType: "نوع الكيان · مطابق",
    apply: "تطبيق المرشحات", refresh: "تحديث", export: "تنزيل CSV كامل", exporting: "جارٍ إعداد CSV…",
    exportError: "فشل تنزيل CSV", choose: "اختر شركة ونطاق تاريخ ثم طبّق المرشحات.",
    noCompanies: "لا توجد شركات لهذا العرض.", invalid: "أدخل شركة ونطاق تاريخ صالحين ورقم فاعل غير سالب عند إدخاله.",
    loading: "جارٍ تحميل سجل التدقيق…", failed: "تعذر تحميل سجل التدقيق", retry: "إعادة المحاولة",
    stale: "تغير نطاق المسودة. طبّق المرشحات لعرض النطاق الجديد.",
    noRows: "لا تطابق بيانات تدقيق المحاسبة هذا النطاق.", who: "من", what: "ماذا", when: "متى",
    entityId: "رقم الكيان", before: "لقطة قبل", after: "لقطة بعد", yes: "موجود", no: "غير موجود",
    page: "صفحة", of: "من", previous: "السابق", next: "التالي", rows: "أحداث",
    scope: "التاريخ المحلي للشركة · المنطقة الزمنية", exportLimit: "يقتصر التصدير الكامل على ١٠٬٠٠٠ حدث. قلّص المرشحات للتنزيل.",
  },
  tr: {
    title: "Muhasebe denetim geçmişi", intro: "Seçili şirket ve yerel gün aralığı için yalnızca üstveri kaydı.",
    safety: "Yalnızca seçili şirketin muhasebe işlemleri. Genel, şirkete bağlı olmayan ve diğer modül olayları hariçtir. Anlık görüntü verileri ve iletişim bilgileri gösterilmez.",
    company: "Şirket", from: "Yerel başlangıç günü", to: "Yerel bitiş günü", actorId: "İşlemi yapan kimliği (0 geçerlidir)",
    actorType: "İşlemi yapan türü · tam", action: "İşlem · tam", entityType: "Varlık türü · tam",
    apply: "Filtreleri uygula", refresh: "Yenile", export: "Tam CSV indir", exporting: "CSV hazırlanıyor…",
    exportError: "CSV indirilemedi", choose: "Şirket ve tarih aralığı seçip filtreleri uygulayın.",
    noCompanies: "Bu görünüm için şirket bulunmuyor.", invalid: "Geçerli şirket, tarih aralığı ve isteğe bağlı negatif olmayan işlemci kimliği girin.",
    loading: "Denetim geçmişi yükleniyor…", failed: "Denetim geçmişi yüklenemedi", retry: "Yeniden dene",
    stale: "Taslak kapsamı değişti. Yeni kapsam için filtreleri yeniden uygulayın.",
    noRows: "Bu kapsamla eşleşen muhasebe denetim üstverisi yok.", who: "Kim", what: "Ne", when: "Ne zaman",
    entityId: "Varlık kimliği", before: "Önceki görüntü", after: "Sonraki görüntü", yes: "Var", no: "Yok",
    page: "Sayfa", of: "/", previous: "Önceki", next: "Sonraki", rows: "olay",
    scope: "Şirket yerel tarihi · saat dilimi", exportLimit: "Tam dışa aktarma 10.000 olayla sınırlıdır. İndirmek için filtreleri daraltın.",
  },
};
const clean = (value: string) => value.trim() ? normalizeAccountingDigits(value.trim()) : undefined;
const today = () => new Date().toISOString().slice(0, 10);
type Draft = { companyId: string; from: string; to: string; actorId: string; actorType: string; action: string; entityType: string };
const blankDraft = (): Draft => { const to = today(); return { companyId: "", from: `${to.slice(0, 4)}-01-01`, to, actorId: "", actorType: "", action: "", entityType: "" }; };
const inputClass = "h-10 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 text-sm text-[#29423f] outline-none focus:border-[#60877a] focus:ring-2 focus:ring-[#60877a]/15 disabled:opacity-60";

export default function AccountingAuditHistory({ companies }: { companies: { id: number; name: string }[] }) {
  const { language, direction } = useLanguage();
  const words = accountingAuditCopy[language];
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [applied, setApplied] = useState<AccountingAuditFilters>();
  const [formError, setFormError] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const selectedCompany = companies.find(company => String(company.id) === draft.companyId);
  const sameScope = !!applied && !!selectedCompany && selectedCompany.id === applied.companyId
    && draft.from === applied.from && draft.to === applied.to
    && (clean(draft.actorId) === undefined ? undefined : Number(clean(draft.actorId))) === applied.actorId
    && (draft.actorType.trim() || undefined) === applied.actorType
    && (draft.action.trim() || undefined) === applied.action
    && (draft.entityType.trim() || undefined) === applied.entityType;
  const activeFilters = sameScope ? applied : undefined;
  const query = useAccountingAudit(activeFilters);
  const report = query.data;
  const reportMatches = !!activeFilters && !!report
    && report.company.id === activeFilters.companyId
    && report.filters.companyId === activeFilters.companyId
    && report.filters.from === activeFilters.from && report.filters.to === activeFilters.to
    && report.filters.actorId === activeFilters.actorId && report.filters.actorType === activeFilters.actorType
    && report.filters.action === activeFilters.action && report.filters.entityType === activeFilters.entityType
    && report.filters.page === activeFilters.page && report.filters.pageSize === activeFilters.pageSize
    && report.scope === "selected-company-accounting-only" && report.dateBasis === "company-local-day"
    && report.includesGlobalActions === false && report.snapshotPayloadsExposed === false;
  const totalPages = reportMatches ? Math.max(1, Math.ceil(report!.pagination.totalRows / report!.pagination.pageSize)) : 1;
  const exportOverLimit = !!reportMatches && report!.pagination.totalRows > 10000;
  const set = (key: keyof Draft, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const apply = () => {
    setFormError(false); setExportError("");
    const parsed = accountingAuditFiltersSchema.safeParse({
      companyId: clean(draft.companyId), from: draft.from, to: draft.to,
      actorId: clean(draft.actorId), actorType: draft.actorType.trim() || undefined,
      action: draft.action.trim() || undefined, entityType: draft.entityType.trim() || undefined,
      page: 1, pageSize: 50,
    });
    if (!parsed.success || !companies.some(company => company.id === parsed.data.companyId)) { setFormError(true); return; }
    setApplied(parsed.data);
  };
  const page = (value: number) => { if (activeFilters && value >= 1 && value <= totalPages) setApplied({ ...activeFilters, page: value }); };
  const download = async () => {
    if (!activeFilters || !reportMatches) return;
    setExporting(true); setExportError("");
    try {
      const filters = { ...activeFilters, page: 1, pageSize: Math.min(200, Math.max(1, report!.pagination.totalRows)) };
      await downloadAccountingAudit(filters);
    } catch (error) { setExportError(error instanceof Error ? error.message : words.exportError); }
    finally { setExporting(false); }
  };
  const nowLoading = query.isLoading;

  return <section dir={direction} className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#d9e3dc] bg-[#f3f7f0] px-5 py-5 md:px-6">
      <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#20484a] text-[#f3f3e8]"><ShieldCheck className="h-5 w-5"/></span>
        <div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#829087]">MOMTAZCOM · AUDIT METADATA</div>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.025em] text-[#273d3a]">{words.title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#758179]">{words.intro}</p></div>
      </div>
      {reportMatches && <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={query.isFetching} onClick={() => query.refetch()} className="border-[#d6dfd6] text-[#365750]"><RotateCw className="me-2 h-3.5 w-3.5"/>{words.refresh}</Button>
        <Button type="button" variant="outline" size="sm" disabled={exporting || exportOverLimit} onClick={download} className="border-[#d6dfd6] text-[#365750]"><Download className="me-2 h-3.5 w-3.5"/>{exporting ? words.exporting : words.export}</Button>
      </div>}
    </header>
    <div role="note" className="rounded-xl border border-[#dce7dc] bg-[#f0f5ef] px-4 py-3 text-xs leading-5 text-[#526b55]">{words.safety}</div>
    <form onSubmit={event => { event.preventDefault(); apply(); }} className="grid gap-3 rounded-2xl border border-[#dfe6de] bg-[#fbfcf8] p-4 md:grid-cols-2 xl:grid-cols-4 md:p-5">
      <Field label={words.company}><select value={draft.companyId} onChange={event => set("companyId", event.target.value)} className={inputClass}>
        <option value="">{words.company}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name} · #{company.id}</option>)}
      </select></Field>
      <Field label={words.from}><input type="date" value={draft.from} onChange={event => set("from", event.target.value)} className={inputClass}/></Field>
      <Field label={words.to}><input type="date" value={draft.to} onChange={event => set("to", event.target.value)} className={inputClass}/></Field>
      <Field label={words.actorId}><input inputMode="numeric" value={draft.actorId} onChange={event => set("actorId", event.target.value)} className={inputClass}/></Field>
      <Field label={words.actorType}><input value={draft.actorType} onChange={event => set("actorType", event.target.value)} className={inputClass}/></Field>
      <Field label={words.action}><input value={draft.action} onChange={event => set("action", event.target.value)} className={inputClass}/></Field>
      <Field label={words.entityType}><input value={draft.entityType} onChange={event => set("entityType", event.target.value)} className={inputClass}/></Field>
      {formError && <div role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-sm text-[#883f37] md:col-span-2 xl:col-span-4">{words.invalid}</div>}
      {!companies.length && <div className="rounded-lg border border-dashed border-[#d7e0d7] bg-[#f7f9f5] p-3 text-sm text-[#66776e] md:col-span-2 xl:col-span-4">{words.noCompanies}</div>}
      <div className="flex items-center gap-2 md:col-span-2 xl:col-span-4"><Button type="submit" disabled={!companies.length} className="bg-[#20484a] text-white hover:bg-[#2d5d5c]">{words.apply}</Button></div>
    </form>
    {exportError && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{words.exportError}</AlertTitle><AlertDescription>{exportError}</AlertDescription></Alert>}
    {exportOverLimit && <div role="note" className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-xs leading-5 text-[#806844]">{words.exportLimit}</div>}
    {!companies.length ? <Empty text={words.noCompanies}/> :
      !applied ? <Empty text={words.choose}/> :
      !sameScope ? <Notice text={words.stale}/> :
      nowLoading ? <div className="space-y-3" aria-label={words.loading}>{[0,1,2].map(i => <Skeleton key={i} className="h-16 rounded-xl bg-[#e8ede7]"/>)}</div> :
      query.isError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{words.failed}</AlertTitle><AlertDescription className="mt-2 flex flex-wrap items-center gap-3">
        <span>{query.error instanceof Error ? query.error.message : words.failed}</span><Button type="button" variant="outline" size="sm" onClick={() => query.refetch()}>{words.retry}</Button>
      </AlertDescription></Alert> :
      !reportMatches ? <Notice text={words.stale}/> :
      <AccountingAuditResult report={report!} language={language} words={words} page={activeFilters!.page} totalPages={totalPages} changePage={page}/>}
  </section>;
}

export function AccountingAuditResult({ report, language, words, page, totalPages, changePage }: {
  report: AccountingAuditReport; language: "en" | "fa" | "ar" | "tr"; words: Copy; page: number; totalPages: number; changePage: (page: number) => void;
}) {
  const locale = language === "fa" ? "fa-IR-u-ca-gregory" : language === "ar" ? "ar-u-ca-gregory" : language === "tr" ? "tr-TR-u-ca-gregory" : "en-US-u-ca-gregory";
  const date = (value: string) => {
    try {
      return new Intl.DateTimeFormat(locale, { timeZone: report.company.timezone, year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(value));
    } catch {
      return new Intl.DateTimeFormat(locale, { timeZone: "UTC", year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(new Date(value));
    }
  };
  return <div dir={language === "fa" || language === "ar" ? "rtl" : "ltr"} className="overflow-hidden rounded-2xl border border-[#dce4dc] bg-[#fbfcf8]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5eae3] bg-[#f3f7f0] px-4 py-4 md:px-5">
      <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#829087]">{report.company.name} · #{report.company.id}</p>
        <h3 className="font-display text-lg font-semibold text-[#294540]">{words.title}</h3>
        <p className="mt-1 text-xs text-[#758179]">{words.scope}: <b dir="ltr" className="font-mono">{report.company.timezone}</b></p></div>
      <span className="text-xs text-[#7a887d]">{words.page} {page} {words.of} {totalPages} · {report.pagination.totalRows} {words.rows}</span>
    </div>
    {report.rows.length === 0 ? <Empty text={words.noRows}/> : <div className="divide-y divide-[#e8ede6]">
      {report.rows.map(row => <article key={row.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_1.5fr_1.25fr] md:p-5">
        <section><Caption>{words.who}</Caption><p className="mt-1 text-sm font-semibold text-[#344a44]">{row.actorType} · <b dir="ltr" className="font-mono">#{row.actorId}</b></p></section>
        <section className="min-w-0"><Caption>{words.what}</Caption>
          <p dir="ltr" className="mt-1 break-all text-sm font-semibold text-[#344a44]"><code>{row.action}</code></p>
          <p dir="ltr" className="mt-1 break-all text-xs text-[#64766a]"><code>{row.entityType} · {row.entityId}</code></p>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px]"><Flag label={words.before} value={row.hasBefore ? words.yes : words.no}/><Flag label={words.after} value={row.hasAfter ? words.yes : words.no}/></div>
        </section>
        <section><Caption>{words.when}</Caption><time dateTime={row.createdAt} dir="ltr" className="mt-1 block text-sm font-mono tabular-nums text-[#344a44]">{date(row.createdAt)}</time></section>
      </article>)}
    </div>}
    {report.pagination.totalRows > 0 && <div className="flex items-center justify-end gap-2 border-t border-[#e5eae3] px-4 py-3">
      <Button type="button" variant="outline" size="sm" onClick={() => changePage(page - 1)} disabled={page <= 1}>{words.previous}</Button>
      <span className="px-1 text-xs tabular-nums text-[#687970]">{page} / {totalPages}</span>
      <Button type="button" variant="outline" size="sm" onClick={() => changePage(page + 1)} disabled={page >= totalPages}>{words.next}</Button>
    </div>}
  </div>;
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-1.5 text-xs font-semibold text-[#53665d]"><span>{label}</span>{children}</label>; }
function Caption({ children }: { children: ReactNode }) { return <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#829087]">{children}</p>; }
function Flag({ label, value }: { label: string; value: string }) { return <span className="rounded-md border border-[#e1e8df] bg-[#f7f9f5] px-2 py-1 text-[#64766a]">{label}: <b>{value}</b></span>; }
function Empty({ text }: { text: string }) { return <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-6 py-7 text-center text-sm leading-6 text-[#687970]">{text}</div>; }
function Notice({ text }: { text: string }) { return <div role="status" className="rounded-xl border border-[#e6d9c4] bg-[#f8f1e5] px-4 py-3 text-sm leading-6 text-[#806844]">{text}</div>; }