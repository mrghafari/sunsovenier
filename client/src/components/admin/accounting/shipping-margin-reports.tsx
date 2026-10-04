import { useState } from "react";
import type { ReactNode } from "react";
import { shippingReportFiltersSchema, type ShippingReportFilters, type ShippingMarginReport, type ShippingMarginBlock } from "@shared/accounting-shipping-reports";
import type { Language } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAccountingResource } from "@/lib/accounting-api";
import { normalizeAccountingDigits, accountingName, accountingCurrencyName } from "./accounting-logic";
import { exactAmount } from "./accounting-cost-reports";
import { useShippingMarginReport, downloadShippingMarginReport } from "@/lib/accounting-shipping-reports-api";
import { shippingMarginCopy, type ShippingMarginCopyKey } from "./shipping-margin-copy";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowDownToLine, RotateCw, RefreshCw } from "lucide-react";

type Draft = { companyId: string; from: string; to: string; view: "loading" | "order"; orderId: string; loadingSourceId: string; currency: string; costCenterId: string; partyType: string; partyId: string };
const today = () => new Date().toISOString().slice(0, 10);
const blankDraft = (): Draft => { const to = today(); return { companyId:"", from:`${to.slice(0,4)}-01-01`, to, view:"loading", orderId:"", loadingSourceId:"", currency:"", costCenterId:"", partyType:"", partyId:"" }; };
const clean = (value: string) => value.trim() ? normalizeAccountingDigits(value.trim()) : undefined;
export const loadingReference = (value:string) => value.trim() || undefined;
const scopeKeys = ["companyId","from","to","view","orderId","loadingSourceId","currency","costCenterId","partyId","partyType"] as const;
function sameScope(a: ShippingReportFilters, b: ShippingReportFilters) {
  return scopeKeys.every(key => (a[key] ?? null) === (b[key] ?? null));
}
function numberDraft(value: string) { const normalized = clean(value); return normalized ? Number(normalized) : undefined; }

export default function ShippingMarginReports({ companies }: { companies: { id: number; name: string }[] }) {
  const { language, direction } = useLanguage();
  const t = (key: ShippingMarginCopyKey) => shippingMarginCopy(language, key);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [applied, setApplied] = useState<ShippingReportFilters>();
  const [formError, setFormError] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const centersQ = useAccountingResource("cost-centers", draft.companyId ? Number(draft.companyId) : undefined);
  const currenciesQ = useAccountingResource("currencies");
  const centers = centersQ.data ?? [];
  const currencies = currenciesQ.data ?? [];
  const selectedCompany = companies.find(company => String(company.id) === draft.companyId);
  const appliedCompanyExists = !!applied && companies.some(company => company.id === applied.companyId);
  const draftMatchesApplied = !!applied && !!selectedCompany && selectedCompany.id === applied.companyId
    && draft.from === applied.from && draft.to === applied.to && draft.view === applied.view
    && numberDraft(draft.orderId) === applied.orderId
    && loadingReference(draft.loadingSourceId) === applied.loadingSourceId
    && (draft.currency ? draft.currency.toUpperCase() : undefined) === applied.currency
    && numberDraft(draft.costCenterId) === applied.costCenterId
    && (draft.partyType || undefined) === applied.partyType
    && numberDraft(draft.partyId) === applied.partyId;
  const currentFilters = draftMatchesApplied && appliedCompanyExists ? applied : undefined;
  const query = useShippingMarginReport(currentFilters);
  const report = query.data;
  const reportMatches = !!currentFilters && !!report && sameScope(currentFilters, report.filters)
    && report.filters.page === currentFilters.page && report.filters.pageSize === currentFilters.pageSize
    && report.company.id === currentFilters.companyId;
  const isStale = !!applied && !currentFilters;

  const set = (key: keyof Draft, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const apply = () => {
    setFormError(false); setExportError("");
    if (!draft.companyId || !companies.some(company => String(company.id) === draft.companyId)) { setFormError(true); return; }
    const parsed = shippingReportFiltersSchema.safeParse({
      companyId: clean(draft.companyId), from: draft.from, to: draft.to, view: draft.view,
      orderId: clean(draft.orderId), loadingSourceId: loadingReference(draft.loadingSourceId),
      currency: draft.currency ? draft.currency.trim().toUpperCase() : undefined,
      costCenterId: clean(draft.costCenterId), partyType: draft.partyType || undefined,
      partyId: clean(draft.partyId), page: 1, pageSize: 50,
    });
    if (!parsed.success) { setFormError(true); return; }
    setApplied(parsed.data);
  };
  const changePage = (page: number) => {
    if (currentFilters && page >= 1) setApplied({ ...currentFilters, page });
  };
  const exportCsv = async () => {
    if (!currentFilters || !reportMatches || !companies.some(company => company.id === currentFilters.companyId)) return;
    setExporting(true); setExportError("");
    const fullScope = Object.fromEntries(Object.entries(currentFilters).filter(([key]) => key !== "page" && key !== "pageSize")) as ShippingReportFilters;
    try { await downloadShippingMarginReport(fullScope); }
    catch (error) { setExportError(error instanceof Error ? error.message : t("exportFailed")); }
    finally { setExporting(false); }
  };
  const currencyOptions = currencies as { code: string; name?: string }[];

  return <section dir={direction} className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#d9e3dc] bg-[#f3f7f0] px-5 py-5 md:px-6">
      <div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#829087]">MOMTAZCOM · EVIDENCE</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.025em] text-[#273d3a]">{t("title")}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#758179]">{t("intro")}</p></div>
      {reportMatches && <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={query.isFetching} onClick={() => query.refetch()} className="border-[#d6dfd6] text-[#365750]"><RotateCw className={`me-2 h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />{t("refresh")}</Button>
        <Button type="button" variant="outline" size="sm" disabled={exporting || !reportMatches} onClick={exportCsv} className="border-[#d6dfd6] text-[#365750]"><ArrowDownToLine className="me-2 h-3.5 w-3.5"/>{exporting ? t("exporting") : t("export")}</Button>
      </div>}
    </header>
    <form onSubmit={event => { event.preventDefault(); apply(); }} className="grid gap-3 rounded-2xl border border-[#dfe6de] bg-[#fbfcf8] p-4 md:grid-cols-2 xl:grid-cols-4 md:p-5">
      <Field label={t("company")}><select value={draft.companyId} onChange={event => { setDraft({ ...draft, companyId:event.target.value, costCenterId:"" }); setApplied(undefined); setExportError(""); }} className={inputClass}><option value="">{t("company")}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></Field>
      <Field label={t("from")}><input type="date" value={draft.from} onChange={event => set("from",event.target.value)} className={inputClass}/></Field>
      <Field label={t("to")}><input type="date" value={draft.to} onChange={event => set("to",event.target.value)} className={inputClass}/></Field>
      <Field label={t("view")}><select value={draft.view} onChange={event => setDraft({...draft,view:event.target.value as Draft["view"],loadingSourceId:""})} className={inputClass}><option value="loading">{t("loading")}</option><option value="order">{t("order")}</option></select></Field>
      <Field label={t("orderId")}><input inputMode="numeric" value={draft.orderId} onChange={event => set("orderId",event.target.value)} className={inputClass}/></Field>
      {draft.view === "loading" && <Field label={t("loadingId")}><input value={draft.loadingSourceId} onChange={event => set("loadingSourceId",event.target.value)} className={inputClass}/></Field>}
      <Field label={t("currency")}><select value={draft.currency} onChange={event => set("currency",event.target.value)} className={inputClass}><option value="">{t("anyCurrency")}</option>{currencyOptions.map(currency => <option key={currency.code} value={currency.code}>{currency.code} · {accountingCurrencyName(currency.code,language,currency.name ?? currency.code)}</option>)}</select></Field>
      <Field label={t("center")}><select value={draft.costCenterId} onChange={event => set("costCenterId",event.target.value)} disabled={!draft.companyId} className={inputClass}><option value="">{t("anyCenter")}</option>{centers.map(center => <option key={String(center.id)} value={String(center.id)}>{String(center.code ?? "")} · {accountingName(center,language)}</option>)}</select></Field>
      <Field label={t("partyType")}><select value={draft.partyType} onChange={event => set("partyType",event.target.value)} className={inputClass}><option value="">{t("anyParty")}</option><option value="customer">{t("customer")}</option><option value="carrier">{t("carrier")}</option></select></Field>
      <Field label={t("partyId")}><input inputMode="numeric" value={draft.partyId} onChange={event => set("partyId",event.target.value)} className={inputClass}/></Field>
      {(centersQ.isError || currenciesQ.isError) && <div role="alert" className="text-xs text-[#883f37]">{t("failed")} {centersQ.isError && <button type="button" className="underline" onClick={() => centersQ.refetch()}>{t("retry")}</button>} {currenciesQ.isError && <button type="button" className="underline" onClick={() => currenciesQ.refetch()}>{t("retry")}</button>}</div>}
      {formError && <div role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-sm text-[#883f37] md:col-span-2 xl:col-span-4">{t("invalid")}</div>}
      {!companies.length && <div className="rounded-lg border border-dashed border-[#d7e0d7] bg-[#f7f9f5] p-3 text-sm text-[#66776e] md:col-span-2 xl:col-span-4">{t("noCompanies")}</div>}
      <div className="flex flex-wrap items-center gap-2 md:col-span-2 xl:col-span-4"><Button type="submit" disabled={!companies.length} className="bg-[#20484a] text-white hover:bg-[#2d5d5c]"><RefreshCw className="me-2 h-4 w-4"/>{t("apply")}</Button></div>
    </form>
    {exportError && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{t("exportFailed")}</AlertTitle><AlertDescription>{exportError}</AlertDescription></Alert>}
    {!companies.length ? <Empty text={t("noCompanies")}/> :
      applied && !appliedCompanyExists ? <Notice text={t("invalidCompany")}/> :
      !applied ? <Empty text={t("choose")}/> :
      isStale ? <Notice text={t("stale")}/> :
      query.isLoading ? <div className="space-y-3" aria-label={t("loadingState")}>{[0,1,2].map(i=><Skeleton key={i} className="h-16 rounded-xl bg-[#e8ede7]"/>)}</div> :
      query.isError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{t("failed")}</AlertTitle><AlertDescription className="mt-2 flex flex-wrap items-center gap-3"><span>{query.error instanceof Error ? query.error.message : t("failed")}</span><Button type="button" variant="outline" size="sm" onClick={() => query.refetch()}><RefreshCw className="me-2 h-3.5 w-3.5"/>{t("retry")}</Button></AlertDescription></Alert> :
      !reportMatches ? <Notice text={t("stale")}/> :
      <ShippingMarginReportResult report={report!} language={language} page={currentFilters!.page ?? 1} changePage={changePage}/>}
  </section>;
}

export function ShippingMarginReportResult({ report, language, page, changePage }: { report: ShippingMarginReport; language: Language; page: number; changePage: (page:number)=>void }) {
  const t = (key: ShippingMarginCopyKey) => shippingMarginCopy(language,key);
  const base = report.company.baseCurrency;
  const decimals = report.currencies.find(currency => currency.code === base)?.decimals;
  const totalPages = Math.max(1,Math.ceil(report.pagination.totalRows / report.pagination.pageSize));
  const marginValue = report.totals.marginBase;
  const marginTone = marginValue == null ? "text-[#7a8179]" : isZero(marginValue) ? "text-[#496b57]" : marginValue.startsWith("-") ? "text-[#963f32]" : "text-[#365750]";
  const fullMarginProblem = report.totals.marginBase == null;
  const partialFinancialScope = !!(report.filters.currency || report.filters.costCenterId || report.filters.partyId);
  const blockLabel: Record<ShippingMarginBlock, ShippingMarginCopyKey> = {
    MAPPINGS_REQUIRED:"block_MAPPINGS_REQUIRED", PARTIAL_SCOPE:"block_PARTIAL_SCOPE",
    REVENUE_NOT_POSTED:"block_REVENUE_NOT_POSTED", COST_NOT_POSTED:"block_COST_NOT_POSTED",
    UNPOSTED_COST_FACTS:"block_UNPOSTED_COST_FACTS", COST_EVIDENCE_MISMATCH:"block_COST_EVIDENCE_MISMATCH",
  };
  const amount = (value:string|null) => exactAmount(value,decimals,language);
  return <div dir={language === "fa" || language === "ar" ? "rtl" : "ltr"} className="space-y-5">
    <section className="rounded-2xl border border-[#dce4dc] bg-[#f3f7f0] p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#77877a]">{report.company.name} · {t("mappingBasis")}</p><h3 className="mt-1 font-display text-xl font-semibold text-[#294540]">{t("totals")}</h3></div><span className="rounded-full border border-[#dce6dc] bg-[#eaf1e9] px-3 py-1 text-xs text-[#526c5c]">{base}</span></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label={t("knownRevenue")} value={amount(report.totals.knownRevenueBase)} currency={base}/>
        <Metric label={t("knownCost")} value={amount(report.totals.knownCostBase)} currency={base}/>
        <Metric label={t("knownMargin")} value={amount(report.totals.knownMarginBase)} currency={base}/>
        <Metric label={t("margin")} value={amount(marginValue)} currency={base} tone={marginTone} strong/>
        <Metric label={t("groups")} value={`${report.totals.completeGroupCount} ${t("complete")} · ${report.totals.incompleteGroupCount} ${t("incomplete")}`}/>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Metric label={t("periodRevenue")} value={amount(report.totals.periodRevenueBase)} currency={base}/>
        <Metric label={t("periodCost")} value={amount(report.totals.periodCostBase)} currency={base}/>
      </div>
      {fullMarginProblem && <p role="note" className="mt-3 rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-xs leading-5 text-[#806844]">
        {report.totals.incompleteGroupCount > 0 ? t("totalIncomplete") : report.coverage.unattributedPeriodLineCount > 0 ? t("totalUnmatched") : report.coverage.unlinkedFactCount > 0 ? t("totalUnlinked") : t("totalEmpty")}
      </p>}
      {report.coverage.unattributedPeriodLineCount > 0 && <p role="note" className="mt-2 rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-xs leading-5 text-[#806844]">{t("totalUnmatched")}</p>}
      {report.coverage.unlinkedFactCount > 0 && <p role="note" className="mt-2 rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-xs leading-5 text-[#806844]">{t("totalUnlinked")}</p>}
    </section>

    <section className="overflow-hidden rounded-2xl border border-[#dce4dc] bg-[#fbfcf8]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5eae3] px-4 py-4 md:px-5"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#829087]">{report.company.name} · {base}</p><h3 className="font-display text-lg font-semibold text-[#294540]">{t("rows")}</h3></div><span className="text-xs text-[#7a887d]">{t("page")} {page} {t("of")} {totalPages} · {report.pagination.totalRows}</span></div>
      {report.rows.length === 0 ? <Empty text={t("noRowsHelp")} title={t("noRows")}/> : <div className="overflow-x-auto">
        <table className="w-full min-w-[1520px] text-start text-xs">
          <thead className="bg-[#eff4ee] text-[10px] font-bold uppercase tracking-[.06em] text-[#6d7c71]"><tr>{[t("orderId"),t("loadingId"),t("loadingCount"),t("revenueEntries"),t("costEntries"),t("unpostedLoading"),t("unpostedCostLoadings"),t("unpostedCost"),t("costEvidenceIssues"),`${t("revenueAsOf")} · ${base}`,`${t("costAsOf")} · ${base}`,`${t("marginAsOf")} · ${base}`,`${t("revenuePeriod")} · ${base}`,`${t("costPeriod")} · ${base}`,t("blocked")].map((label,i)=><th key={`${label}-${i}`} className={`whitespace-nowrap px-3 py-3 ${i > 1 ? "text-end" : "text-start"}`}>{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#e8ede6]">{report.rows.map((row,index) => <tr key={`${row.orderId}-${row.loadingSourceId ?? index}`} className="align-top hover:bg-[#f5f8f3]">
            <td className="px-3 py-3"><div className="font-semibold text-[#344a44]">{row.orderNumber || `#${row.orderId}`}</div><div dir="ltr" className="mt-0.5 font-mono text-[10px] text-[#879289]">#{row.orderId}</div></td>
            <td dir="ltr" className="max-w-40 break-all px-3 py-3 font-mono text-[10px] text-[#58685e]">{row.loadingSourceId ?? "—"}</td>
            {[row.loadingCount,row.revenueEntryCount,row.costEntryCount,row.unpostedLoadingCount,row.unpostedCostLoadingCount,row.unpostedCostCount,row.costEvidenceIssueCount].map((value,i)=><td key={i} className="px-3 py-3 text-end font-mono tabular-nums text-[#58685e]">{value}</td>)}
            {[row.revenueBase,row.costBase,row.marginBase].map((value,i)=><td key={i} dir="ltr" className={`px-3 py-3 text-end font-mono tabular-nums ${i===2?"font-semibold text-[#294540]":"text-[#52635a]"}`}>{amount(value)}</td>)}
            {[row.periodRevenueBase,row.periodCostBase].map((value,i)=><td key={i} dir="ltr" className="px-3 py-3 text-end font-mono tabular-nums text-[#52635a]">{amount(value)}</td>)}
            <td className="max-w-[260px] px-3 py-3 text-start"><div className="space-y-1">{row.blockedReasons.length ? row.blockedReasons.map(reason=><div key={reason} className="rounded-md bg-[#f8f1e5] px-2 py-1 leading-4 text-[#806844]">{t(blockLabel[reason])}</div>) : <span className="text-[#496b57]">{t("complete")}</span>}</div></td>
          </tr>)}</tbody>
        </table>
        <div className="border-t border-[#e5eae3] bg-[#fafbf8] px-4 py-3 text-[11px] text-[#687970]">{t("basis")}</div>
      </div>}
      {report.pagination.totalRows > 0 && <div className="flex items-center justify-end gap-2 border-t border-[#e5eae3] px-4 py-3"><Button type="button" variant="outline" size="sm" onClick={()=>changePage(page-1)} disabled={page<=1}>{t("previous")}</Button><span className="px-1 text-xs tabular-nums text-[#687970]">{page} / {totalPages}</span><Button type="button" variant="outline" size="sm" onClick={()=>changePage(page+1)} disabled={page>=totalPages}>{t("next")}</Button></div>}
    </section>

    <section className="rounded-2xl border border-[#dfe6de] bg-[#fbfcf8] p-4 md:p-5">
      <h3 className="font-display text-base font-semibold text-[#344a44]">{t("evidenceTitle")}</h3>
      <p className="mt-2 text-xs leading-5 text-[#687970]">{t("basis")}</p><p className="mt-2 text-xs leading-5 text-[#687970]">{t("unknownNote")}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Coverage label={t("mappingBasis")} value={report.coverage.mappingReady?t("mapReady"):t("mapMissing")} warning={!report.coverage.mappingReady}/>
        <Coverage label={t("legacy")} value={t("unverified")} warning/>
        <Coverage label={t("captured")} value={report.coverage.capturedLoadingCount}/>
        <Coverage label={t("cutovers")} value={report.coverage.financialCutoversReady?t("recorded"):t("notReady")} warning={!report.coverage.financialCutoversReady}/>
        <Coverage label={t("unlinkedFacts")} value={report.coverage.unlinkedFactCount} warning={report.coverage.unlinkedFactCount>0}/>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Metric label={t("unattributedCount")} value={String(report.coverage.unattributedPeriodLineCount)}/>
        <Metric label={t("unattributedRevenue")} value={amount(report.coverage.unattributedPeriodRevenueBase)} currency={base}/>
        <Metric label={t("unattributedCost")} value={amount(report.coverage.unattributedPeriodCostBase)} currency={base}/>
      </div>
      <p className="mt-3 rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-xs leading-5 text-[#806844]">{t("unmatchedScope")}</p>
      <p className="mt-2 rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-xs leading-5 text-[#806844]">{t("unlinkedFactScope")}</p>
      {partialFinancialScope && <p className="mt-2 text-xs leading-5 text-[#806844]">{t("partial")}</p>}
      <p className="mt-2 text-xs leading-5 text-[#687970]">{t("mapping")}</p><p className="mt-1 text-xs leading-5 text-[#806844]">{t("legacy")}</p><p className="mt-1 text-xs leading-5 text-[#687970]">{t("cutoverNote")}</p><p className="mt-1 text-xs leading-5 text-[#687970]">{t("reversals")}</p>
      {!report.coverage.mappingReady && <Flag text={t("mapMissing")}/>}
      <Flag text={t("unverified")}/>
      {report.coverage.capturedLoadingCount > 0 && report.coverage.postedEntryCount === 0 && <Flag text={t("capturedOnly")}/>}
      {report.coverage.unattributedPeriodLineCount > 0 && <Flag text={t("unattributedFlag")}/>}
      {report.coverage.unlinkedFactCount > 0 && <Flag text={t("unlinkedFacts")}/>}
      {report.coverage.capturedLoadingCount === 0 && report.coverage.postedEntryCount === 0 && <Flag text={t("emptyEvidence")}/>}
    </section>
  </div>;
}

function Metric({label,value,currency,tone="",strong=false}:{label:string;value:string;currency?:string;tone?:string;strong?:boolean}) {
  return <div className="min-w-0 rounded-xl border border-[#e1e8df] bg-[#fbfcf8] px-3 py-2.5"><div className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#7b887f]">{label}</div><div dir="ltr" className={`mt-1 truncate font-mono text-sm tabular-nums ${strong?"font-bold":"font-medium"} ${tone || "text-[#344a44]"}`}>{value}{currency&&value!=="—"?<span className="ms-1 text-[10px] text-[#879289]">{currency}</span>:null}</div></div>;
}
function Coverage({label,value,warning=false}:{label:string;value:number|string;warning?:boolean}) {
  return <div className={`rounded-lg border px-3 py-2 text-xs ${warning?"border-[#e6d9c4] bg-[#f8f1e5] text-[#806844]":"border-[#dce7dc] bg-[#f0f5ef] text-[#526b55]"}`}><span className="font-semibold">{label}:</span> <b className="font-mono tabular-nums">{value}</b></div>;
}
function Flag({text}:{text:string}) { return <div className="mt-2 inline-flex rounded-full border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-1 text-[10px] font-semibold text-[#806844]">{text}</div>; }
function Empty({text,title}:{text:string;title?:string}) { return <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-6 py-7 text-center"><p className="text-sm font-semibold text-[#344a44]">{title ?? text}</p>{title&&<p className="mt-1 max-w-lg text-xs leading-5 text-[#7b887f]">{text}</p>}</div>; }
function Notice({text}:{text:string}) { return <div role="status" className="rounded-xl border border-[#e6d9c4] bg-[#f8f1e5] px-4 py-3 text-sm leading-6 text-[#806844]">{text}</div>; }
function Field({label,children}:{label:string;children:ReactNode}) { return <label className="block space-y-1.5 text-xs font-semibold text-[#53665d]"><span>{label}</span>{children}</label>; }
const inputClass = "h-10 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 text-sm text-[#29423f] outline-none focus:border-[#60877a] focus:ring-2 focus:ring-[#60877a]/15 disabled:opacity-60";
function isZero(value:string) { return /^-?0+(?:\.0*)?$/.test(value); }