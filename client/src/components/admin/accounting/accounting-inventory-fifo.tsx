import { useState } from "react";
import type { ReactNode } from "react";
import type { FifoIssue, InventoryFifoReport } from "@shared/accounting-inventory-fifo";
import { loadingPreviewFiltersSchema, type LoadingPreviewFilters } from "@shared/accounting-loading-preview";
import { useLanguage } from "@/contexts/LanguageContext";
import { normalizeAccountingDigits } from "./accounting-logic";
import { useInventoryFifoPreview } from "./accounting-inventory-fifo-api";
import { inventoryFifoCopy as t, inventoryFifoIssueCopy } from "./accounting-inventory-fifo-copy";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Archive, Calculator, ShieldAlert, ShieldCheck } from "lucide-react";

type CompanyOption = { id: number; name: string };
type Draft = { companyId: string; orderId: string };
const inputClass = "h-10 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 text-sm text-[#29423f] outline-none focus:border-[#60877a] focus:ring-2 focus:ring-[#60877a]/15 disabled:opacity-60";
const clean = (value: string) => value.trim() ? normalizeAccountingDigits(value.trim()) : undefined;

export function inventoryFifoScopeMatches(draft: Draft, applied: LoadingPreviewFilters | undefined, companies: CompanyOption[]): boolean {
  const selected = companies.find(company => String(company.id) === draft.companyId);
  return Boolean(applied && selected && selected.id === applied.companyId
    && Number(clean(draft.orderId) || 0) === (applied.orderId ?? 0));
}

export default function AccountingInventoryFifo({ companies }: { companies: CompanyOption[] }) {
  const { language, direction } = useLanguage();
  const [draft, setDraft] = useState<Draft>({ companyId: "", orderId: "" });
  const [applied, setApplied] = useState<LoadingPreviewFilters>();
  const [formError, setFormError] = useState(false);
  const matches = inventoryFifoScopeMatches(draft, applied, companies);
  const filters = matches ? applied : undefined;
  const query = useInventoryFifoPreview(filters);
  const report = query.data;
  const reportMatches = Boolean(filters && report && report.readOnly === true && report.postingAllowed === false
    && report.stockChanged === false && report.basis === "current_approved_documents"
    && report.valuationStatus === "documentary_simulation" && report.company.id === filters.companyId
    && report.pagination.page === filters.page && report.pagination.pageSize === filters.pageSize);
  const totalPages = reportMatches ? Math.max(1, Math.ceil(report!.pagination.totalRows / report!.pagination.pageSize)) : 1;
  const apply = () => {
    setFormError(false);
    const parsed = loadingPreviewFiltersSchema.safeParse({
      companyId: clean(draft.companyId), orderId: clean(draft.orderId), page: 1, pageSize: 20,
    });
    if (!parsed.success || !companies.some(company => company.id === parsed.data.companyId)) {
      setFormError(true);
      return;
    }
    setApplied(parsed.data);
  };
  const changePage = (page: number) => {
    if (filters && page >= 1 && page <= totalPages) setApplied({ ...filters, page });
  };
  return <section dir={direction} className="space-y-4" data-testid="accounting-inventory-fifo">
    <header className="overflow-hidden rounded-[22px] border border-[#dce3db] bg-[#fbfcf8] shadow-[0_14px_45px_-40px_rgba(29,57,50,.65)]">
      <div className="flex flex-wrap items-start justify-between gap-4 bg-[#f0f4ee] px-5 py-5 md:px-7">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#20484a] text-[#f3f3e8]"><Calculator className="h-5 w-5"/></span>
          <div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#829087]">MOMTAZCOM · DOCUMENTARY FIFO</div>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.025em] text-[#273d3a]">{t(language, "title")}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#758179]">{t(language, "intro")}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-lg border border-[#d8dfd7] bg-[#fbfcf8] px-3 py-2 text-[10px] font-bold tracking-[.08em] text-[#52665c]"><ShieldCheck className="h-4 w-4 text-[#547267]"/>{t(language, "permissions")}</span>
      </div>
      <InventoryFifoSafetyNotice language={language}/>
    </header>
    <form onSubmit={event => { event.preventDefault(); apply(); }} className="grid gap-3 rounded-2xl border border-[#dfe6de] bg-[#fbfcf8] p-4 md:grid-cols-[1fr_1fr_auto] md:items-end md:p-5">
      <Field label={t(language, "company")}><select aria-label={t(language, "company")} value={draft.companyId} onChange={event => setDraft({ ...draft, companyId: event.target.value })} className={inputClass}>
        <option value="">{t(language, "company")}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name} · #{company.id}</option>)}
      </select></Field>
      <Field label={t(language, "orderId")}><input aria-label={t(language, "orderId")} inputMode="numeric" value={draft.orderId} onChange={event => setDraft({ ...draft, orderId: event.target.value })} className={inputClass}/></Field>
      <Button type="submit" disabled={!companies.length} className="bg-[#20484a] text-white hover:bg-[#2d5d5c]"><Calculator className="me-2 h-4 w-4"/>{t(language, "apply")}</Button>
      {formError && <p role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-sm text-[#883f37] md:col-span-3">{t(language, "invalid")}</p>}
      {!companies.length && <p className="rounded-lg border border-dashed border-[#d7e0d7] bg-[#f7f9f5] p-3 text-sm text-[#66776e] md:col-span-3">{t(language, "noCompanies")}</p>}
    </form>
    {!companies.length ? <Empty text={t(language, "noCompanies")}/> :
      !applied ? <Empty text={t(language, "choose")}/> :
      !matches ? <InventoryFifoStaleScopeNotice language={language}/> :
      query.isLoading ? <div className="space-y-3" aria-label={t(language, "loading")}><Skeleton className="h-24 rounded-xl bg-[#e8ede7]"/><Skeleton className="h-36 rounded-xl bg-[#e8ede7]"/></div> :
      query.isError ? <InventoryFifoError message={query.error instanceof Error ? query.error.message : t(language, "failed")} language={language} onRetry={() => void query.refetch()}/> :
      !reportMatches ? <div role="status" className="rounded-xl border border-[#e6d9c4] bg-[#f8f1e5] px-4 py-3 text-sm leading-6 text-[#806844]">{t(language, "stale")}</div> :
      <InventoryFifoResult report={report!} language={language} page={filters!.page} totalPages={totalPages} changePage={changePage}/>}
  </section>;
}

export function InventoryFifoError({ message, language, onRetry }: { message: string; language: ReturnType<typeof useLanguage>["language"]; onRetry: () => void }) {
  return <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language, "failed")}</AlertTitle>
    <AlertDescription className="mt-2 flex flex-wrap items-center gap-3"><span>{message}</span>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>{t(language, "retry")}</Button></AlertDescription></Alert>;
}

export function InventoryFifoStaleScopeNotice({ language }: { language: ReturnType<typeof useLanguage>["language"] }) {
  return <div role="status" className="rounded-xl border border-[#e6d9c4] bg-[#f8f1e5] px-4 py-3 text-sm leading-6 text-[#806844]">{t(language, "stale")}</div>;
}

export function InventoryFifoSafetyNotice({ language }: { language: ReturnType<typeof useLanguage>["language"] }) {
  return <>
    <div role="alert" className="flex gap-3 border-t border-[#dfb6a8] bg-[#f7e9e3] px-5 py-4 text-[#743e35] md:px-7">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0"/>
      <div><p className="text-xs font-extrabold leading-5 tracking-[.055em]">{t(language, "safetyTitle")}</p><p className="mt-1 text-xs leading-5">{t(language, "safetyBody")}</p></div>
    </div>
    <div className="border-t border-[#e5e9e2] bg-[#f8faf6] px-5 py-3 text-xs leading-5 text-[#66776e] md:px-7">
      <strong className="text-[#52665c]">{t(language, "permissionBody")}</strong>
    </div>
  </>;
}

export function InventoryFifoResult({ report, language, page, totalPages, changePage }: {
  report: InventoryFifoReport; language: ReturnType<typeof useLanguage>["language"]; page: number; totalPages: number; changePage: (page: number) => void;
}) {
  const tFor = (key: Parameters<typeof t>[1]) => t(language, key);
  return <div dir={language === "fa" || language === "ar" ? "rtl" : "ltr"} className="space-y-4">
    <section className="overflow-hidden rounded-2xl border border-[#dce4dc] bg-[#fbfcf8]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5eae3] bg-[#f3f7f0] px-4 py-4 md:px-5">
        <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#829087]">{report.company.name} · #{report.company.id}</p><h3 className="font-display text-lg font-semibold text-[#294540]">{tFor("result")}</h3></div>
        <span className="text-xs text-[#7a887d]">{tFor("page")} {page} {tFor("of")} {totalPages} · {report.pagination.totalRows} {tFor("rows")}</span>
      </div>
      <section className="grid gap-3 border-b border-[#e5eae3] bg-[#f8faf6] p-4 md:p-5">
        <div className="rounded-xl border border-[#dfe6de] bg-[#fbfcf8] p-3"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#829087]">{tFor("companyReplay")}</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs"><span>{tFor("sourceDocuments")}: <b className="font-mono" dir="ltr">{report.sourceDocumentCount}</b></span><span>{tFor("history")}: <b className="font-mono" dir="ltr">{report.historyCount}</b></span></div>
          <p className="mt-2 text-[10px] leading-4 text-[#758179]">{tFor("replayHelp")}</p>
        </div>
        <div className="rounded-xl border border-[#eadfc9] bg-[#fbf7ee] p-3"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#806844]">{tFor("costs")}</p>
          <p className="mt-1 text-[10px] leading-4 text-[#806844]">{tFor("perLoadingCosts")}</p>
          {!report.rows.length ? <p className="mt-2 text-xs text-[#806844]">{tFor("noCosts")}</p> :
            <div className="mt-2 space-y-2">{report.rows.map(row => <div key={`costs-${row.factId}`} className="rounded-lg border border-[#eadfc9] bg-[#fffaf0] px-3 py-2">
              <p className="text-[10px] font-semibold text-[#806844]">{row.loadingReference || `#${row.factId}`}</p>
              {row.documentedCosts?.length ? <div className="mt-1 flex flex-wrap gap-2">{row.documentedCosts.map((cost, index) =>
                <span key={`${row.factId}-${cost.currency}-${index}`} className="rounded-lg border border-[#eadfc9] bg-[#fbf7ee] px-2.5 py-1 font-mono text-xs tabular-nums text-[#664d32]" dir="ltr">{cost.amount} {cost.currency}</span>)}</div>
                : <p className="mt-1 text-xs text-[#806844]">{tFor("noCosts")}</p>}
            </div>)}</div>}
        </div>
      </section>
      {report.rows.length === 0 ? <Empty text={tFor("empty")}/> : <div className="divide-y divide-[#e8ede6]">
        {report.rows.map(row => <article key={`${row.factId}-${row.orderId}`} className="p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs"><Fact label={tFor("order")} value={`#${row.orderId}`} mono/><Fact label={tFor("reference")} value={row.loadingReference || "—"}/><Fact label={tFor("date")} value={row.eventDate || "—"} mono/><Fact label={tFor("fact")} value={`#${row.factId}`} mono/></div>
            <span className="rounded-lg border border-[#d8dfd7] bg-[#f7f9f5] px-2.5 py-1.5 text-[10px] font-bold text-[#52665c]">{tFor("permissions")}</span>
          </div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#52665c]"><Archive className="h-4 w-4"/>{tFor("measuredLines")} · {row.lines.length}</div>
          {row.lines.map((line, index) => <section key={`${line.orderItemId}-${index}`} className="mb-3 rounded-xl border border-[#e1e7df] bg-[#f8faf6] p-3 md:p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Fact label={tFor("orderItem")} value={`#${line.orderItemId}`} mono/>
              <Fact label={tFor("product")} value={`#${line.productId}`} mono/>
              <Fact label={tFor("tons")} value={`${line.quantityTons} t`} mono/>
              <Fact label={tFor("shortage")} value={line.shortfallTons === null ? tFor("noShortage") : `${line.shortfallTons} t`} mono emphasized={line.shortfallTons !== null}/>
            </div>
            <div className="mt-4 border-t border-[#e1e7df] pt-3">
              <h4 className="text-xs font-semibold text-[#52665c]">{tFor("allocations")} · {line.allocations.length}</h4>
              {!line.allocations.length ? <p className="mt-2 rounded-lg border border-dashed border-[#d7e0d7] bg-[#fbfcf8] px-3 py-2 text-xs text-[#758179]">{tFor("noAllocations")}</p> :
                <div className="mt-2 space-y-2">{line.allocations.map((allocation, allocationIndex) => <div key={`${allocation.documentId}-${allocation.lineIndex}-${allocationIndex}`} className="rounded-lg border border-[#dfe6de] bg-[#fbfcf8] p-3">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Fact label={tFor("document")} value={`#${allocation.documentId}`} mono/>
                    <Fact label={tFor("revision")} value={String(allocation.documentRevision)} mono/>
                    <Fact label={tFor("reference")} value={allocation.documentReference}/>
                    <Fact label={tFor("date")} value={allocation.documentDate} mono/>
                    <Fact label={tFor("batch")} value={allocation.batchReference} mono/>
                    <Fact label={tFor("quantity")} value={`${allocation.quantityTons} t`} mono/>
                    <AllocationCost allocation={allocation} language={language}/>
                  </div>
                </div>)}</div>}
            </div>
            {line.issues.length > 0 && <IssueList issues={line.issues} language={language}/>}
          </section>)}
          {row.issues.length > 0 && <IssueList issues={row.issues} language={language}/>}
          {(row.issues.includes("INVALID_LOADING_HISTORY" as FifoIssue) || row.lines.some(line => line.issues.includes("INVALID_LOADING_HISTORY" as FifoIssue))) &&
            <p className="mt-2 rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-xs leading-5 text-[#806844]">{tFor("invalidHistory")}</p>}
        </article>)}
      </div>}
      {report.pagination.totalRows > 0 && <div className="flex items-center justify-end gap-2 border-t border-[#e5eae3] px-4 py-3">
        <Button type="button" variant="outline" size="sm" onClick={() => changePage(page - 1)} disabled={page <= 1}>{tFor("previous")}</Button>
        <span className="px-1 text-xs tabular-nums text-[#687970]">{page} / {totalPages}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => changePage(page + 1)} disabled={page >= totalPages}>{tFor("next")}</Button>
      </div>}
    </section>
  </div>;
}
function AllocationCost({ allocation, language }: { allocation: InventoryFifoReport["rows"][number]["lines"][number]["allocations"][number]; language: ReturnType<typeof useLanguage>["language"] }) {
  return <Fact label={t(language, "cost")} value={`${allocation.documentedCost} ${allocation.currency}`} mono emphasized/>;
}
function IssueList({ issues, language }: { issues: string[]; language: ReturnType<typeof useLanguage>["language"] }) {
  return <div className="mt-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#829087]">{t(language, "issues")}</p>
    <div className="flex flex-wrap gap-2">{issues.map((issue, index) => <span key={`${issue}-${index}`} className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-2.5 py-1.5 text-xs leading-5 text-[#806844]">{inventoryFifoIssueCopy(language, issue)}</span>)}</div>
  </div>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5 text-xs font-semibold text-[#53665d]"><span>{label}</span>{children}</label>;
}
function Fact({ label, value, mono = false, emphasized = false }: { label: string; value: string; mono?: boolean; emphasized?: boolean }) {
  return <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#7b887f]">{label}</div>
    <div dir={mono ? "ltr" : undefined} className={`mt-1 break-words text-xs ${mono ? "font-mono tabular-nums" : "font-medium"} ${emphasized ? "font-bold text-[#79473f]" : "text-[#344a44]"}`}>{value}</div></div>;
}
function Empty({ text }: { text: string }) {
  return <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-6 py-7 text-center">
    <Calculator className="mb-3 h-5 w-5 text-[#547267]"/><p className="max-w-lg text-sm leading-6 text-[#687970]">{text}</p></div>;
}
