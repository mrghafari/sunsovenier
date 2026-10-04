import { useState, type ReactNode } from "react";
import type { AccountingReportFilters, AccountingReportName } from "@shared/accounting-reports";
import { useAccountingReport, downloadAccountingReport } from "@/lib/accounting-reports-api";
import { useAccountingResource } from "@/lib/accounting-api";
import { useLanguage } from "@/contexts/LanguageContext";
import { normalizeAccountingDigits, accountingName, accountingCurrencyName } from "./accounting-logic";
import { reportCopy, reportPartyType } from "./accounting-reports-copy";
import type { ReportCopyKey } from "./accounting-reports-copy";
import { ReportResult } from "./accounting-report-result";
import CustomerAccountingReports from "./customer-accounting-reports";
import { customerReportCopy } from "./customer-reports-copy";
import { AccountingCostReports } from "./accounting-cost-reports";
import { costReportCopy } from "./cost-reports-copy";
import ShippingMarginReports from "./shipping-margin-reports";
import { shippingMarginCopy } from "./shipping-margin-copy";
import AccountingLoadingPreview from "./accounting-loading-preview";
import AccountingAuditHistory from "./accounting-audit-history";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowDownToLine, BookOpenCheck, RefreshCw } from "lucide-react";

type Draft = { companyId: string; from: string; to: string; accountId: string; costCenterId: string; currency: string; partyType: string; partyId: string; entryId: string; };
const today = () => new Date().toISOString().slice(0, 10);
const blankDraft = (): Draft => { const to = today(); return { companyId: "", from: `${to.slice(0, 4)}-01-01`, to, accountId: "", costCenterId: "", currency: "", partyType: "", partyId: "", entryId: "" }; };
const nonBlank = (v: string) => v.trim() ? normalizeAccountingDigits(v.trim()) : undefined;
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
const validId = (v: string) => /^[1-9]\d*$/.test(v) && Number(v) <= 2147483647;

export default function AccountingReports({ companies, onSetup }: { companies: { id: number; name: string }[]; onSetup: () => void }) {
 const { language, direction } = useLanguage();
 const t = (k: ReportCopyKey) => reportCopy(language, k);
 const [report, setReport] = useState<AccountingReportName>("journal");
 const [customerView, setCustomerView] = useState(false);
  const [costView, setCostView] = useState(false);
  const [shippingView, setShippingView] = useState(false);
  const [loadingPreviewView, setLoadingPreviewView] = useState(false);
  const [auditView, setAuditView] = useState(false);
 const [draft, setDraft] = useState<Draft>(blankDraft);
 const [applied, setApplied] = useState<AccountingReportFilters>();
 const [formError, setFormError] = useState("");
 const [exportError, setExportError] = useState("");
 const [exporting, setExporting] = useState(false);
 const accountsQ = useAccountingResource("accounts", draft.companyId ? Number(draft.companyId) : undefined);
 const centersQ = useAccountingResource("cost-centers", draft.companyId ? Number(draft.companyId) : undefined);
 const currenciesQ = useAccountingResource("currencies");
  const accounts = accountsQ.data ?? [];
  const centers = centersQ.data ?? [];
  const query = useAccountingReport(report, costView || shippingView || loadingPreviewView || auditView ? undefined : applied);
 const data = query.data;
 const companyChange = (companyId: string) => {
    setDraft(d => ({ ...d, companyId, accountId: "", costCenterId: "", partyType: "", partyId: "", entryId: "" }));
   setApplied(undefined); setFormError(""); setExportError("");
 };
 const apply = () => {
   setFormError(""); setExportError("");
   if (!draft.companyId) return setFormError(t("companyRequired"));
   if (!isDate(draft.from) || !isDate(draft.to) || draft.from > draft.to) return setFormError(t("dateRange"));
    if (!costView && report === "ledger" && !draft.accountId) return setFormError(t("accountRequired"));
   if (Boolean(draft.partyType) !== Boolean(nonBlank(draft.partyId)) || (draft.partyId && !validId(nonBlank(draft.partyId) ?? ""))) return setFormError(t("partyPair"));
     if ((report === "journal" || costView) && draft.entryId && !validId(nonBlank(draft.entryId) ?? "")) return setFormError(t("entryIdInvalid"));
   const filters: AccountingReportFilters = {
     companyId: Number(draft.companyId), from: draft.from, to: draft.to, page: 1, pageSize: 50,
     ...(nonBlank(draft.accountId) ? { accountId: Number(nonBlank(draft.accountId)) } : {}),
     ...(nonBlank(draft.costCenterId) ? { costCenterId: Number(nonBlank(draft.costCenterId)) } : {}),
     ...(draft.currency ? { currency: draft.currency.toUpperCase() } : {}),
     ...(draft.partyType && nonBlank(draft.partyId) ? { partyType: draft.partyType as AccountingReportFilters["partyType"], partyId: Number(nonBlank(draft.partyId)) } : {}),
      ...((report === "journal" || costView) && nonBlank(draft.entryId) ? { entryId: Number(nonBlank(draft.entryId)) } : {}),
   };
   setApplied(filters);
 };
 const changePage = (page: number) => { if (applied) setApplied({ ...applied, page }); };
 const exportCsv = async () => {
   if (!applied) return;
   setExportError(""); setExporting(true);
    try {
      // Export the whole applied scope, not the current on-screen page.
      const scope = Object.fromEntries(Object.entries(applied).filter(([key]) => key !== "page" && key !== "pageSize")) as AccountingReportFilters;
      await downloadAccountingReport(report, scope as AccountingReportFilters);
    }
   catch (e) { setExportError(e instanceof Error ? e.message : t("exportError")); }
   finally { setExporting(false); }
 };
 const selectedCompany = companies.find(x => String(x.id) === draft.companyId);
  const draftMatchesApplied = !!applied
    && Number(draft.companyId) === applied.companyId
    && draft.from === applied.from && draft.to === applied.to
    && (nonBlank(draft.accountId) ? Number(nonBlank(draft.accountId)) : undefined) === applied.accountId
    && (nonBlank(draft.costCenterId) ? Number(nonBlank(draft.costCenterId)) : undefined) === applied.costCenterId
    && (draft.currency ? draft.currency.toUpperCase() : undefined) === applied.currency
    && (draft.partyType || undefined) === applied.partyType
    && (nonBlank(draft.partyId) ? Number(nonBlank(draft.partyId)) : undefined) === applied.partyId
    && (nonBlank(draft.entryId) ? Number(nonBlank(draft.entryId)) : undefined) === applied.entryId;
 const reportTabs: { id: AccountingReportName; label: ReportCopyKey }[] = [
  { id: "journal", label: "journal" }, { id: "ledger", label: "ledger" }, { id: "trial-balance", label: "trial" },
 ];
 return <section dir={direction} className="min-w-0">
   <div className="rounded-[22px] border border-[#dce2db] bg-[#fbfcf8] shadow-[0_14px_45px_-40px_rgba(29,57,50,.65)]">
    <div className="border-b border-[#e5e9e2] p-5 md:p-7">
     <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#829087]">MOMTAZCOM · RECORDS</div><h2 className="font-display text-2xl font-semibold tracking-[-.025em] text-[#273d3a]">{t("reports")}</h2><p className="mt-1 text-sm text-[#758179]">{t("reportsIntro")}</p></div>
      <Button variant="outline" onClick={onSetup} className="border-[#d6dfd6] text-[#365750]"><BookOpenCheck className="me-2 h-4 w-4"/>{t("setup")}</Button>
     </div>
          <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label={t("reports")}>
            {reportTabs.map(tab=><button key={tab.id} type="button" role="tab" aria-selected={!customerView&&!costView&&!shippingView&&!loadingPreviewView&&!auditView&&report===tab.id} onClick={()=>{setCustomerView(false);setCostView(false);setShippingView(false);setLoadingPreviewView(false);setAuditView(false);setReport(tab.id);setApplied(undefined);setExportError("");setFormError("");setDraft(d=>({...d,entryId:""}));}} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${!customerView&&!costView&&!shippingView&&!loadingPreviewView&&!auditView&&report===tab.id?"bg-[#20484a] text-[#f4f2e7]":"bg-[#edf1eb] text-[#52655b] hover:bg-[#e0e8df]"}`}>{t(tab.label)}</button>)}
            <button type="button" role="tab" aria-selected={costView} onClick={()=>{setCustomerView(false);setShippingView(false);setLoadingPreviewView(false);setAuditView(false);setCostView(true);setApplied(undefined);setExportError("");setFormError("");}} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${costView?"bg-[#20484a] text-[#f4f2e7]":"bg-[#edf1eb] text-[#52655b] hover:bg-[#e0e8df]"}`}>{costReportCopy(language,"title")}</button>
            <button type="button" role="tab" aria-selected={customerView} onClick={()=>{setCustomerView(true);setCostView(false);setShippingView(false);setLoadingPreviewView(false);setAuditView(false);}} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${customerView?"bg-[#20484a] text-[#f4f2e7]":"bg-[#edf1eb] text-[#52655b] hover:bg-[#e0e8df]"}`}>{customerReportCopy(language, "title")}</button>
            <button type="button" role="tab" aria-selected={shippingView} onClick={()=>{setCustomerView(false);setCostView(false);setShippingView(true);setLoadingPreviewView(false);setAuditView(false);}} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${shippingView?"bg-[#20484a] text-[#f4f2e7]":"bg-[#edf1eb] text-[#52655b] hover:bg-[#e0e8df]"}`}>{shippingMarginCopy(language,"title")}</button>
            <button type="button" role="tab" aria-selected={loadingPreviewView} onClick={()=>{setCustomerView(false);setCostView(false);setShippingView(false);setLoadingPreviewView(true);setAuditView(false);setApplied(undefined);setExportError("");setFormError("");}} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${loadingPreviewView?"bg-[#20484a] text-[#f4f2e7]":"bg-[#edf1eb] text-[#52655b] hover:bg-[#e0e8df]"}`}>{language==="fa"?"پیش‌نمایش بارگیری":language==="ar"?"معاينة التحميل":language==="tr"?"Yükleme önizlemesi":"Loading preview"}</button>
            <button type="button" role="tab" aria-selected={auditView} onClick={()=>{setCustomerView(false);setCostView(false);setShippingView(false);setLoadingPreviewView(false);setAuditView(true);setApplied(undefined);setExportError("");setFormError("");}} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${auditView?"bg-[#20484a] text-[#f4f2e7]":"bg-[#edf1eb] text-[#52655b] hover:bg-[#e0e8df]"}`}>{language==="fa"?"تاریخچه حسابرسی":language==="ar"?"سجل التدقيق":language==="tr"?"Denetim geçmişi":"Audit history"}</button>
          </div>
    </div>
      {customerView ? <div className="p-4 md:p-6"><CustomerAccountingReports companies={companies}/></div> : shippingView ? <div className="p-4 md:p-6"><ShippingMarginReports companies={companies}/></div> : loadingPreviewView ? <div className="p-4 md:p-6"><AccountingLoadingPreview companies={companies}/></div> : auditView ? <div className="p-4 md:p-6"><AccountingAuditHistory companies={companies}/></div> : <div className="space-y-5 p-4 md:p-6">
     <div role="note" className="rounded-xl border border-[#e6c8bc] bg-[#f8ece6] px-4 py-3 text-xs leading-5 text-[#79473f]">{t("warning")}</div>
     <form onSubmit={e=>{e.preventDefault();apply();}} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Field label={t("company")}><select value={draft.companyId} onChange={e=>companyChange(e.target.value)} className={inputClass}><option value="">{t("company")}</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label={t("from")}><input type="date" value={draft.from} onChange={e=>setDraft({...draft,from:e.target.value})} className={inputClass}/></Field>
      <Field label={t("to")}><input type="date" value={draft.to} onChange={e=>setDraft({...draft,to:e.target.value})} className={inputClass}/></Field>
      <Field label={t("account")}><select value={draft.accountId} onChange={e=>setDraft({...draft,accountId:e.target.value})} className={inputClass} disabled={!draft.companyId}><option value="">{report==="ledger"?t("allAccounts"):t("allAccounts")}</option>{accounts.map(a=><option key={String(a.id)} value={String(a.id)}>{String(a.code??"")} · {accountingName(a,language)}</option>)}</select></Field>
      <Field label={t("costCenter")}><select value={draft.costCenterId} onChange={e=>setDraft({...draft,costCenterId:e.target.value})} className={inputClass} disabled={!draft.companyId}><option value="">{t("allCenters")}</option>{centers.map(x=><option key={String(x.id)} value={String(x.id)}>{String(x.code??"")} · {accountingName(x,language)}</option>)}</select></Field>
       <Field label={t("currency")}><select value={draft.currency} onChange={e=>setDraft({...draft,currency:e.target.value})} className={inputClass}><option value="">{t("anyCurrency")}</option>{(currenciesQ.data??[]).map(x=><option key={String(x.code)} value={String(x.code)}>{String(x.code)} · {accountingCurrencyName(String(x.code),language,String(x.name??x.code))}</option>)}</select></Field>
      <Field label={t("partyType")}><select value={draft.partyType} onChange={e=>setDraft({...draft,partyType:e.target.value})} className={inputClass}><option value="">{t("partyType")}</option>{(["customer","carrier"] as const).map(x=><option key={x} value={x}>{reportPartyType(language,x)}</option>)}</select></Field>
      <Field label={t("party")}><input inputMode="numeric" value={draft.partyId} onChange={e=>setDraft({...draft,partyId:e.target.value})} className={inputClass}/></Field>
       {(report==="journal"||costView)&&<Field label={t("entryId")}><input inputMode="numeric" value={draft.entryId} onChange={e=>setDraft({...draft,entryId:e.target.value})} className={inputClass}/></Field>}
      {accountsQ.isError&&<div role="alert" className="text-xs text-[#883f37]">{t("failed")} <button type="button" onClick={()=>accountsQ.refetch()} className="underline">{t("retry")}</button></div>}
      {centersQ.isError&&<div role="alert" className="text-xs text-[#883f37]">{t("failed")} <button type="button" onClick={()=>centersQ.refetch()} className="underline">{t("retry")}</button></div>}
      {currenciesQ.isError&&<div role="alert" className="text-xs text-[#883f37]">{t("failed")} <button type="button" onClick={()=>currenciesQ.refetch()} className="underline">{t("retry")}</button></div>}
      {draft.companyId&&!accountsQ.isLoading&&!accountsQ.isError&&accounts.length===0&&<div className="text-xs text-[#806844]">{t("noAccount")}</div>}
      {draft.companyId&&!centersQ.isLoading&&!centersQ.isError&&centers.length===0&&<div className="text-xs text-[#7b887f]">{t("noCenters")}</div>}
      {formError&&<div role="alert" className="sm:col-span-2 xl:col-span-4 rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-sm text-[#883f37]">{formError}</div>}
      {!companies.length&&<div className="sm:col-span-2 xl:col-span-4 rounded-lg border border-dashed border-[#d7e0d7] bg-[#f7f9f5] p-4 text-sm text-[#66776e]">{t("noCompanies")}</div>}
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-4"><Button type="submit" disabled={!companies.length} className="bg-[#20484a] text-white hover:bg-[#2d5d5c]"><RefreshCw className="me-2 h-4 w-4"/>{t("apply")}</Button>{!costView&&<Button type="button" variant="outline" disabled={!applied||exporting} onClick={exportCsv} className="border-[#d6dfd6] text-[#365750]"><ArrowDownToLine className="me-2 h-4 w-4"/>{exporting?t("exporting"):t("export")}</Button>}</div>
     </form>
     {exportError&&<Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{t("exportError")}</AlertTitle><AlertDescription>{exportError}</AlertDescription></Alert>}
      {costView ? (!selectedCompany ? <Empty title={companies.length?t("chooseCompany"):t("noCompanies")} detail={companies.length?t("companyRequired"):t("noCompanies")}/> :
       !applied ? <Empty title={costReportCopy(language,"intro")} detail={t("apply")}/> :
       <AccountingCostReports filters={applied} language={language} isCurrent={draftMatchesApplied} onPageChange={changePage}/>) :
       !selectedCompany ? <Empty title={companies.length?t("chooseCompany"):t("noCompanies")} detail={companies.length?t("companyRequired"):t("noCompanies")}/> :
      !applied ? <Empty title={t("reportsIntro")} detail={t("apply")}/> :
      query.isLoading ? <div className="space-y-3" aria-label={t("loading")}>{[0,1,2].map(i=><Skeleton key={i} className="h-14 rounded-xl bg-[#e8ede7]"/>)}</div> :
      query.isError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{t("failed")}</AlertTitle><AlertDescription className="mt-2 flex flex-wrap items-center gap-3"><span>{query.error instanceof Error?query.error.message:t("failed")}</span><Button variant="outline" size="sm" onClick={()=>query.refetch()}>{t("retry")}</Button></AlertDescription></Alert> :
       data ? <ReportResult report={report} data={data} language={language} page={applied.page??1} changePage={changePage}/> : null}
     </div>}
   </div>
 </section>;
}
const inputClass="h-10 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 text-sm text-[#29423f] outline-none focus:border-[#60877a] focus:ring-2 focus:ring-[#60877a]/15 disabled:opacity-60";
function Field({label,children}:{label:string;children:ReactNode}){return <label className="block space-y-1.5 text-xs font-semibold text-[#53665d]"><span>{label}</span>{children}</label>}
function Empty({title,detail}:{title:string;detail:string}){return <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-6 py-8 text-center"><BookOpenCheck className="mb-3 h-5 w-5 text-[#547267]"/><p className="text-sm font-semibold text-[#344a44]">{title}</p><p className="mt-1 max-w-md text-xs leading-5 text-[#7b887f]">{detail}</p></div>}