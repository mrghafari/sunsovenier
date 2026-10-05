import { useState } from "react";
import type { ReactNode } from "react";
import type { LoadingPreviewFilters, LoadingPreviewReport } from "@shared/accounting-loading-preview";
import { loadingPreviewFiltersSchema } from "@shared/accounting-loading-preview";
import { useLoadingPreviews } from "@/lib/accounting-loading-preview-api";
import { useLanguage } from "@/contexts/LanguageContext";
import { normalizeAccountingDigits } from "./accounting-logic";
import { loadingPreviewCopy as t, loadingPreviewIssueCopy, loadingPreviewPending } from "./accounting-loading-preview-copy";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Calculator, ShieldAlert, RotateCw } from "lucide-react";
import {LoadingShippingApproval} from "./loading-shipping-approval";

type Draft = { companyId: string; orderId: string };
const blankDraft = (): Draft => ({ companyId: "", orderId: "" });
const clean = (value: string) => value.trim() ? normalizeAccountingDigits(value.trim()) : undefined;
const inputClass = "h-10 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 text-sm text-[#29423f] outline-none focus:border-[#60877a] focus:ring-2 focus:ring-[#60877a]/15 disabled:opacity-60";

export default function AccountingLoadingPreview({ companies,canManage=false }: { companies: { id: number; name: string }[];canManage?:boolean }) {
  const { language, direction } = useLanguage();
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [applied, setApplied] = useState<LoadingPreviewFilters>();
  const [formError, setFormError] = useState(false);
  const selectedCompany = companies.find(company => String(company.id) === draft.companyId);
  const scopeMatches = !!applied && !!selectedCompany
    && selectedCompany.id === applied.companyId
    && Number(clean(draft.orderId) || 0) === (applied.orderId ?? 0);
  const currentFilters = scopeMatches ? applied : undefined;
  const query = useLoadingPreviews(currentFilters);
  const report = query.data;
  const reportMatches = !!currentFilters && !!report && report.readOnly === true && report.postingAllowed === false
    && report.company.id === currentFilters.companyId
    && report.filters.companyId === currentFilters.companyId
    && report.filters.orderId === currentFilters.orderId
    && report.filters.page === currentFilters.page && report.filters.pageSize === currentFilters.pageSize;
  const totalPages = reportMatches ? Math.max(1, Math.ceil(report!.pagination.totalRows / report!.pagination.pageSize)) : 1;

  const apply = () => {
    setFormError(false);
    const parsed = loadingPreviewFiltersSchema.safeParse({
      companyId: clean(draft.companyId), orderId: clean(draft.orderId), page: 1, pageSize: 25,
    });
    if (!parsed.success || !companies.some(company => company.id === parsed.data.companyId)) {
      setFormError(true);
      return;
    }
    setApplied(parsed.data);
  };
  const changePage = (page: number) => {
    if (currentFilters && page >= 1 && page <= totalPages) setApplied({ ...currentFilters, page });
  };

  return <section dir={direction} className="space-y-5">
    <header className="overflow-hidden rounded-2xl border border-[#d9e3dc] bg-[#f3f7f0]">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5 md:px-6">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#20484a] text-[#f3f3e8]"><Calculator className="h-5 w-5"/></span>
          <div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#829087]">MOMTAZCOM · READ ONLY</div>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.025em] text-[#273d3a]">{t(language, "title")}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#758179]">{t(language, "intro")}</p>
          </div>
        </div>
        {reportMatches && <Button type="button" variant="outline" size="sm" disabled={query.isFetching} onClick={() => query.refetch()} className="border-[#d6dfd6] text-[#365750]">
          <RotateCw className={`me-2 h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`}/>{t(language, "refresh")}
        </Button>}
      </div>
      <LoadingPreviewSafetyNotice language={language}/>
    </header>

    <form onSubmit={event => { event.preventDefault(); apply(); }} className="grid gap-3 rounded-2xl border border-[#dfe6de] bg-[#fbfcf8] p-4 md:grid-cols-2 md:p-5">
      <Field label={t(language, "company")}><select value={draft.companyId} onChange={event => setDraft({ ...draft, companyId: event.target.value })} className={inputClass}>
        <option value="">{t(language, "company")}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name} · #{company.id}</option>)}
      </select></Field>
      <Field label={t(language, "orderId")}><input inputMode="numeric" value={draft.orderId} onChange={event => setDraft({ ...draft, orderId: event.target.value })} className={inputClass}/></Field>
      {formError && <div role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-sm text-[#883f37] md:col-span-2">{t(language, "invalid")}</div>}
      {!companies.length && <div className="rounded-lg border border-dashed border-[#d7e0d7] bg-[#f7f9f5] p-3 text-sm text-[#66776e] md:col-span-2">{t(language, "noCompanies")}</div>}
      <div className="flex items-center gap-2 md:col-span-2"><Button type="submit" disabled={!companies.length} className="bg-[#20484a] text-white hover:bg-[#2d5d5c]"><Calculator className="me-2 h-4 w-4"/>{t(language, "apply")}</Button></div>
    </form>

    {!companies.length ? <Empty text={t(language, "noCompanies")}/> :
      !applied ? <Empty text={t(language, "choose")}/> :
      !scopeMatches ? <div role="status" className="rounded-xl border border-[#e6d9c4] bg-[#f8f1e5] px-4 py-3 text-sm leading-6 text-[#806844]">{t(language, "stale")}</div> :
      query.isLoading ? <div className="space-y-3" aria-label={t(language, "loading")}>{[0,1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl bg-[#e8ede7]"/>)}</div> :
      query.isError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language, "failed")}</AlertTitle>
        <AlertDescription className="mt-2 flex flex-wrap items-center gap-3"><span>{query.error instanceof Error ? query.error.message : t(language, "failed")}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()}>{t(language, "retry")}</Button></AlertDescription></Alert> :
      !reportMatches ? <div role="status" className="rounded-xl border border-[#e6d9c4] bg-[#f8f1e5] px-4 py-3 text-sm leading-6 text-[#806844]">{t(language, "stale")}</div> :
       <LoadingPreviewResult report={report!} language={language} page={currentFilters!.page} totalPages={totalPages} changePage={changePage} canManage={canManage} onApproved={()=>query.refetch()}/>}
  </section>;
}

export function LoadingPreviewResult({ report, language, page, totalPages, changePage,canManage=false,onApproved }: {
  report: LoadingPreviewReport; language: ReturnType<typeof useLanguage>["language"]; page: number; totalPages: number; changePage: (page: number) => void;
  canManage?:boolean;onApproved?:()=>Promise<unknown>;
}) {
  return <div dir={language === "fa" || language === "ar" ? "rtl" : "ltr"} className="space-y-5">
    <section className="overflow-hidden rounded-2xl border border-[#dce4dc] bg-[#fbfcf8]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5eae3] bg-[#f3f7f0] px-4 py-4 md:px-5">
        <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#829087]">{report.company.name} · #{report.company.id}</p><h3 className="font-display text-lg font-semibold text-[#294540]">{t(language, "result")}</h3></div>
        <span className="text-xs text-[#7a887d]">{t(language, "page")} {page} {t(language, "of")} {totalPages} · {report.pagination.totalRows} {t(language, "rows")}</span>
      </div>
      {report.rows.length === 0 ? <Empty text={t(language, "noRows")}/> : <div className="divide-y divide-[#e8ede6]">
        {report.rows.map(row => <article key={row.factId} className="p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid min-w-0 flex-1 gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
              <Fact label={t(language, "fact")} value={`#${row.factId}`} mono/>
              <Fact label={t(language, "order")} value={`${row.orderNumber || "—"} · #${row.orderId}`} mono/>
              <Fact label={t(language, "reference")} value={row.loadingReference || "—"}/>
              <Fact label={t(language, "date")} value={row.eventDate || "—"} mono/>
              <Fact label={t(language, "currency")} value={row.currency || "—"} mono/>
            </div>
            <div className="rounded-xl border border-[#dfe6de] bg-[#f7f9f5] px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#758179]">
              {report.readOnly ? t(language, "readOnly") : "—"} · {report.postingAllowed === false ? t(language, "postingOff") : "—"}
            </div>
          </div>
          {row.amounts ? <div className="mt-4 rounded-xl border border-[#dce7dc] bg-[#f3f7f0] p-3 md:p-4">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <Amount label={t(language, "goods")} value={row.amounts.goods} currency={row.currency}/>
              <Amount label={t(language, "tax")} value={row.amounts.tax} currency={row.currency}/>
              <Amount label={t(language, "shipping")} value={row.amounts.shipping} currency={row.currency}/>
              <Amount label={t(language, "total")} value={row.amounts.total} currency={row.currency} strong/>
              <Fact label={t(language, "due")} value={row.amounts.dueDate || "—"} mono/>
            </div>
            <div className="mt-3 overflow-x-auto rounded-lg border border-[#e1e8df]">
              <table className="w-full min-w-[480px] text-start text-xs">
                <thead className="bg-[#eaf1e9] text-[10px] font-bold uppercase text-[#6d7c71]"><tr>
                  <th className="px-3 py-2">#{t(language, "order")}</th><th className="px-3 py-2 text-end">{t(language, "weight")}</th>
                  <th className="px-3 py-2 text-end">{t(language, "goods")}</th><th className="px-3 py-2 text-end">{t(language, "tax")}</th>
                </tr></thead>
                <tbody className="divide-y divide-[#e8ede6]">{row.amounts.lines.map(line => <tr key={line.orderItemId}>
                  <td dir="ltr" className="px-3 py-2 font-mono text-[#52635a]">#{line.orderItemId}</td>
                  <td dir="ltr" className="px-3 py-2 text-end font-mono tabular-nums text-[#52635a]">{line.weightTons} t</td>
                  <td dir="ltr" className="px-3 py-2 text-end font-mono tabular-nums text-[#52635a]">{line.goods} {row.currency}</td>
                  <td dir="ltr" className="px-3 py-2 text-end font-mono tabular-nums text-[#52635a]">{line.tax} {row.currency}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </div> : <div className="mt-4 rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-xs leading-5 text-[#806844]">{t(language, "nullAmounts")}</div>}
          {row.fixedShipping&&<LoadingShippingApproval row={row} companyId={report.company.id} language={language} canManage={canManage} onApproved={onApproved}/>}
          <div className="mt-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#829087]">{t(language, "issues")}</p>
            {row.issues.length ? <div className="flex flex-wrap gap-2">{row.issues.map((issue, index) =>
              <span key={`${issue}-${index}`} className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-2.5 py-1.5 text-xs leading-5 text-[#806844]">{loadingPreviewIssueCopy(language, issue)}</span>)}</div>
              : <p className="text-xs text-[#496b57]">{t(language, "noIssues")}</p>}
          </div>
        </article>)}
      </div>}
      {report.pagination.totalRows > 0 && <div className="flex items-center justify-end gap-2 border-t border-[#e5eae3] px-4 py-3">
        <Button type="button" variant="outline" size="sm" onClick={() => changePage(page - 1)} disabled={page <= 1}>{t(language, "previous")}</Button>
        <span className="px-1 text-xs tabular-nums text-[#687970]">{page} / {totalPages}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => changePage(page + 1)} disabled={page >= totalPages}>{t(language, "next")}</Button>
      </div>}
    </section>
    <section className="rounded-2xl border border-[#e6d9c4] bg-[#f8f1e5] p-4 md:p-5">
      <h3 className="font-display text-sm font-semibold text-[#664d32]">{t(language, "pendingTitle")}</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{loadingPreviewPending(language).map(item =>
        <div key={item} className="rounded-lg border border-[#eadfc9] bg-[#fbf7ee] px-3 py-2 text-xs leading-5 text-[#806844]">{item}</div>)}</div>
    </section>
  </div>;
}
export function LoadingPreviewSafetyNotice({ language }: { language: ReturnType<typeof useLanguage>["language"] }) {
  return <div role="alert" className="flex gap-3 border-t border-[#dfb6a8] bg-[#f7e9e3] px-5 py-4 text-[#743e35] md:px-6">
    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0"/>
    <div><p className="text-xs font-extrabold uppercase leading-5 tracking-[.055em]">{t(language, "safety")}</p><p className="mt-1 text-xs leading-5">{t(language, "safetyDetail")}</p></div>
  </div>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5 text-xs font-semibold text-[#53665d]"><span>{label}</span>{children}</label>;
}
function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#7b887f]">{label}</div>
    <div dir={mono ? "ltr" : undefined} className={`mt-1 break-words text-sm text-[#344a44] ${mono ? "font-mono tabular-nums" : "font-medium"}`}>{value}</div></div>;
}
function Amount({ label, value, currency, strong = false }: { label: string; value: string; currency: string | null; strong?: boolean }) {
  return <div className="min-w-0 rounded-lg border border-[#e1e8df] bg-[#fbfcf8] px-3 py-2.5">
    <div className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#7b887f]">{label}</div>
    <div dir="ltr" className={`mt-1 font-mono text-sm tabular-nums text-[#344a44] ${strong ? "font-bold" : "font-medium"}`}>{value}<span className="ms-1 text-[10px] text-[#879289]">{currency || ""}</span></div>
  </div>;
}
function Empty({ text }: { text: string }) {
  return <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-6 py-7 text-center">
    <Calculator className="mb-3 h-5 w-5 text-[#547267]"/><p className="max-w-lg text-sm leading-6 text-[#687970]">{text}</p></div>;
}