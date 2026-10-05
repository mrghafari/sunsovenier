import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { loadingInvoiceCommandSchema, stockBookCommandSchema, type LoadingInvoicePlan, type LoadingInvoiceWorkbench } from "@shared/accounting-loading-invoices";
import { loadingPreviewFiltersSchema, type LoadingPreviewFilters } from "@shared/accounting-loading-preview";
import { useLanguage } from "@/contexts/LanguageContext";
import { normalizeAccountingDigits } from "./accounting-logic";
import { loadingInvoiceBlockerText as blockerText, loadingInvoiceText as t } from "./accounting-loading-invoices-copy";
import { useIssueLoadingInvoice, useLoadingInvoices, useRegisterStockBook, useStockBooks } from "./accounting-loading-invoices-api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Archive, BadgeCheck, FileText, ShieldAlert } from "lucide-react";

type Company = { id: number; name: string };
type Draft = { companyId: string; orderId: string };
const inputClass = "h-10 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 text-sm text-[#29423f] outline-none focus:border-[#60877a] focus:ring-2 focus:ring-[#60877a]/15 disabled:opacity-60";
const clean = (value: string) => value.trim() ? normalizeAccountingDigits(value.trim()) : undefined;

export default function AccountingLoadingInvoices({ companies, canManage = false }: { companies: Company[]; canManage?: boolean }) {
  const { language } = useLanguage();
  const [draft, setDraft] = useState<Draft>({ companyId: "", orderId: "" });
  const [applied, setApplied] = useState<LoadingPreviewFilters>();
  const [formError, setFormError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [reason, setReason] = useState<Record<number, string>>({});
  const [settle, setSettle] = useState<Record<number, boolean>>({});
  const selectedCompany = companies.find(company => String(company.id) === draft.companyId);
  const scopeMatches = Boolean(applied && selectedCompany?.id === applied.companyId && Number(clean(draft.orderId) || 0) === (applied.orderId ?? 0));
  const filters = scopeMatches ? applied : undefined;
  const invoiceQuery = useLoadingInvoices(filters);
  const bookQuery = useStockBooks(filters?.companyId);
  const invoiceMutation = useIssueLoadingInvoice();
  const bookMutation = useRegisterStockBook();
  const workbench = invoiceQuery.data;
  const workbenchMatches = Boolean(filters && workbench && workbench.company.id === filters.companyId
    && workbench.pagination.page === filters.page && workbench.pagination.pageSize === filters.pageSize
    && workbench.rows.every(row => row.companyId === filters.companyId)
    && (!filters.orderId || workbench.rows.every(row => row.orderId === filters.orderId)));
  const totalPages = workbenchMatches ? Math.max(1, Math.ceil(workbench!.pagination.totalRows / workbench!.pagination.pageSize)) : 1;
  const parsedCompanyId = filters?.companyId;

  const [docChoice, setDocChoice] = useState("");
  const [lineChoice, setLineChoice] = useState("");
  const [journalChoice, setJournalChoice] = useState("");
  const [cost, setCost] = useState("");
  const [evidence, setEvidence] = useState("");
  const metadata = bookQuery.data;
  const document = metadata?.documents.find(item => String(item.id) === docChoice);
  const journals = useMemo(() => metadata?.journals.filter(item => item.documentId === document?.id) ?? [], [metadata?.journals, document?.id]);
  const lineIndex = lineChoice === "" ? -1 : Number(lineChoice);
  const selectedLine = document && lineIndex >= 0 ? document.lines[lineIndex] : undefined;

  const apply = () => {
    setFormError(false);
    const parsed = loadingPreviewFiltersSchema.safeParse({ companyId: clean(draft.companyId), orderId: clean(draft.orderId), page: 1, pageSize: 20 });
    if (!parsed.success || !companies.some(company => company.id === parsed.data.companyId)) { setFormError(true); return; }
    setApplied(parsed.data);
    setActionError(""); setActionMessage("");
  };
  const changePage = (page: number) => {
    if (filters && page >= 1 && page <= totalPages) setApplied({ ...filters, page });
  };
  const issue = async (plan: LoadingInvoicePlan) => {
    setActionError(""); setActionMessage("");
    const command = loadingInvoiceCommandSchema.safeParse({
      companyId: filters?.companyId, factId: plan.factId, expectedPlanHash: plan.planHash,
      reason: reason[plan.factId] ?? "", settleFromHold: settle[plan.factId] ?? false,
    });
    if (!canManage || !filters || filters.companyId !== plan.companyId || !command.success) {
      setActionError(!canManage ? t(language, "permission") : t(language, "requestFailed")); return;
    }
    if (!window.confirm(t(language, "confirmIssue"))) return;
    try {
      const result = await invoiceMutation.mutateAsync(command.data);
      setActionMessage(`${t(language, "issueSuccess")} · #${result.invoiceId}`);
      await invoiceQuery.refetch();
    } catch (error) { setActionError(error instanceof Error ? error.message : t(language, "issueError")); }
  };
  const register = async () => {
    setActionError(""); setActionMessage("");
    const command = stockBookCommandSchema.safeParse({
      companyId: parsedCompanyId, documentId: Number(docChoice), lineIndex, journalId: Number(journalChoice),
      baseCost: normalizeAccountingDigits(cost.trim()), evidenceReference: evidence,
    });
    if (!canManage || !parsedCompanyId || !metadata || metadata.companyId !== parsedCompanyId || !command.success
      || !document || !selectedLine || !journals.some(journal => journal.id === command.data.journalId)) {
      setActionError(!canManage ? t(language, "permission") : t(language, "requestFailed")); return;
    }
    if (!window.confirm(t(language, "registerConfirm"))) return;
    try {
      await bookMutation.mutateAsync(command.data);
      setActionMessage(t(language, "registered"));
      setCost(""); setEvidence("");
      await bookQuery.refetch();
    } catch (error) { setActionError(error instanceof Error ? error.message : t(language, "registerError")); }
  };

  return <section dir={["fa", "ar", "ku", "tr"].includes(language) ? "rtl" : "ltr"} className="space-y-4" data-testid="accounting-loading-invoices">
    <header className="overflow-hidden rounded-[22px] border border-[#dce3db] bg-[#fbfcf8] shadow-[0_14px_45px_-40px_rgba(29,57,50,.65)]">
      <div className="flex flex-wrap items-start justify-between gap-4 bg-[#f0f4ee] px-5 py-5 md:px-7">
        <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#20484a] text-[#f3f3e8]"><FileText className="h-5 w-5"/></span>
          <div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#829087]">MOMTAZCOM · POSTED VALUE</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.025em] text-[#273d3a]">{t(language,"title")}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#758179]">{t(language,"intro")}</p></div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-lg border border-[#d8dfd7] bg-[#fbfcf8] px-3 py-2 text-[10px] font-bold text-[#52665c]"><BadgeCheck className="h-4 w-4"/>{t(language,"plan")}</span>
      </div>
      <LoadingInvoiceSafetyNotice language={language}/>
    </header>
    <form onSubmit={event => { event.preventDefault(); apply(); }} className="grid gap-3 rounded-2xl border border-[#dfe6de] bg-[#fbfcf8] p-4 md:grid-cols-[1fr_1fr_auto] md:items-end md:p-5">
      <Field label={t(language,"scope")}><select aria-label={t(language,"scope")} value={draft.companyId} onChange={event => setDraft({ ...draft, companyId: event.target.value })} className={inputClass}><option value="">{t(language,"scope")}</option>{companies.map(company=><option key={company.id} value={company.id}>{company.name} · #{company.id}</option>)}</select></Field>
      <Field label={t(language,"order")}><input aria-label={t(language,"order")} inputMode="numeric" value={draft.orderId} onChange={event=>setDraft({...draft,orderId:event.target.value})} className={inputClass}/></Field>
      <Button type="submit" disabled={!companies.length} className="bg-[#20484a] text-white hover:bg-[#2d5d5c]"><FileText className="me-2 h-4 w-4"/>{t(language,"apply")}</Button>
      {formError && <p role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-sm text-[#883f37] md:col-span-3">{t(language,"invalid")}</p>}
      {!companies.length && <p className="rounded-lg border border-dashed border-[#d7e0d7] bg-[#f7f9f5] p-3 text-sm text-[#66776e] md:col-span-3">{t(language,"noCompanies")}</p>}
    </form>
    {actionError && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language,"failed")}</AlertTitle><AlertDescription>{actionError}</AlertDescription></Alert>}
    {actionMessage && <p role="status" className="rounded-lg border border-[#cbdccf] bg-[#edf4eb] px-4 py-3 text-sm text-[#42634e]">{actionMessage}</p>}
    {!companies.length ? <Empty text={t(language,"noCompanies")}/> : !applied ? <Empty text={t(language,"choose")}/> :
      !scopeMatches ? <div role="status" className="rounded-xl border border-[#e6d9c4] bg-[#f8f1e5] px-4 py-3 text-sm text-[#806844]">{t(language,"stale")}</div> :
      invoiceQuery.isLoading ? <div aria-label={t(language,"loading")} className="space-y-3"><Skeleton className="h-20 rounded-xl bg-[#e8ede7]"/><Skeleton className="h-40 rounded-xl bg-[#e8ede7]"/></div> :
      invoiceQuery.isError ? <LoadError message={invoiceQuery.error instanceof Error ? invoiceQuery.error.message : t(language,"failed")} retry={()=>void invoiceQuery.refetch()} language={language}/> :
      !workbenchMatches ? <div role="status" className="rounded-xl border border-[#e6d9c4] bg-[#f8f1e5] px-4 py-3 text-sm text-[#806844]">{t(language,"stale")}</div> :
      <Workbench workbench={workbench!} language={language} page={filters!.page} totalPages={totalPages} changePage={changePage} canManage={canManage}
        reason={reason} setReason={setReason} settle={settle} setSettle={setSettle} onIssue={issue} busy={invoiceMutation.isPending}/>}
    {parsedCompanyId && <StockBooksPanel language={language} expectedCompanyId={parsedCompanyId} metadata={metadata} query={bookQuery} canManage={canManage} docChoice={docChoice} setDocChoice={value=>{setDocChoice(value);setLineChoice("");setJournalChoice("");}}
      lineChoice={lineChoice} setLineChoice={setLineChoice} journalChoice={journalChoice} setJournalChoice={setJournalChoice} cost={cost} setCost={setCost} evidence={evidence} setEvidence={setEvidence} onRegister={register} busy={bookMutation.isPending}/>}
  </section>;
}

export function LoadingInvoiceSafetyNotice({ language }: { language: string }) {
  return <div dir={["fa", "ar", "ku", "tr"].includes(language) ? "rtl" : "ltr"} role="alert" className="flex gap-3 border-t border-[#dfb6a8] bg-[#f7e9e3] px-5 py-4 text-[#743e35] md:px-7">
    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0"/><div><p className="text-xs font-extrabold leading-5 tracking-[.055em]">{t(language,"warningTitle")}</p><p className="mt-1 text-xs leading-5">{t(language,"warning")}</p></div>
  </div>;
}

function Workbench({ workbench, language, page, totalPages, changePage, canManage, reason, setReason, settle, setSettle, onIssue, busy }: {
  workbench: LoadingInvoiceWorkbench; language: string; page: number; totalPages: number; changePage: (page:number)=>void; canManage:boolean;
  reason:Record<number,string>;setReason:(value:Record<number,string>)=>void;settle:Record<number,boolean>;setSettle:(value:Record<number,boolean>)=>void;
  onIssue:(plan:LoadingInvoicePlan)=>void;busy:boolean;
}) {
  return <section className="overflow-hidden rounded-2xl border border-[#dce4dc] bg-[#fbfcf8]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5eae3] bg-[#f3f7f0] px-4 py-4 md:px-5"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#829087]">{workbench.company.name} · #{workbench.company.id}</p><h3 className="font-display text-lg font-semibold text-[#294540]">{t(language,"results")}</h3></div><span className="text-xs text-[#7a887d]">{t(language,"page")} {page} / {totalPages} · {workbench.pagination.totalRows} {t(language,"rows")}</span></div>
    {!workbench.rows.length ? <Empty text={t(language,"empty")}/> : <div className="divide-y divide-[#e8ede6]">{workbench.rows.map(plan=><article key={`${plan.factId}-${plan.planHash}`} className="space-y-4 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><Fact label={t(language,"fact")} value={`#${plan.factId}`} mono/><Fact label={t(language,"order")} value={`#${plan.orderId}`} mono/><Fact label={t(language,"date")} value={plan.eventDate||"—"} mono/><Fact label={t(language,"customer")} value={plan.customerId ? `#${plan.customerId}` : "—"} mono/><Fact label={t(language,"currency")} value={plan.currency||"—"} mono/><Fact label={t(language,"base")} value={plan.baseCurrency} mono/><Fact label={t(language,"baseCost")} value={plan.baseCost===null?"—":`${plan.baseCost} ${plan.baseCurrency}`} mono/></div>
        <span className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-[.08em] ${plan.postingAllowed&&!plan.posted?"border-[#cbdccf] bg-[#edf4eb] text-[#42634e]":"border-[#e6d9c4] bg-[#f8f1e5] text-[#806844]"}`}>{plan.posted?t(language,"posted"):plan.postingAllowed?t(language,"allowed"):t(language,"blocked")}</span></div>
       {plan.amounts ? <div className="rounded-xl border border-[#dce7dc] bg-[#f3f7f0] p-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#758179]">{t(language,"amounts")}</p><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <Amount label={t(language,"goods")} value={plan.amounts.goods} currency={plan.currency}/><Amount label={t(language,"tax")} value={plan.amounts.tax} currency={plan.currency}/><Amount label={t(language,"shipping")} value={plan.amounts.shipping} currency={plan.currency}/><Amount label={t(language,"total")} value={plan.amounts.total} currency={plan.currency} strong/><Fact label={t(language,"due")} value={plan.amounts.dueDate||"—"} mono/>
      </div></div> : <p className="rounded-lg border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-3 py-2 text-xs text-[#758179]">{t(language,"amounts")}: —</p>}
       <ForeignInvoiceValuationPanel plan={plan} language={language}/>
      <div className="rounded-xl border border-[#eadfc9] bg-[#fbf7ee] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-xs font-semibold text-[#664d32]">{t(language,"allocations")} · {plan.allocations.length}</h4><span className="text-[11px] text-[#806844]">{t(language,"allocationHelp")}</span></div>
        {plan.allocations.length ? <div className="mt-3 grid gap-2 md:grid-cols-2">{plan.allocations.map((allocation,index)=><div key={`${allocation.layerId}-${index}`} className="grid gap-2 rounded-lg border border-[#eadfc9] bg-[#fffaf0] p-3 sm:grid-cols-2"><Fact label={t(language,"document")} value={`#${allocation.documentId} · ${allocation.batchReference}`}/><Fact label={t(language,"quantity")} value={`${allocation.quantityTons} t`} mono/><Fact label={t(language,"documentedCost")} value={`${allocation.baseCost} ${plan.baseCurrency}`} mono/><Fact label={t(language,"order")} value={`#${allocation.orderItemId} · #${allocation.productId}`} mono/></div>)}</div> : <p className="mt-2 text-xs text-[#806844]">—</p>}
      </div>
      {!!plan.blockers.length && <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#829087]">{t(language,"blockers")}</p><div className="flex flex-wrap gap-2">{plan.blockers.map(code=><span key={code} className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-2.5 py-1.5 text-xs text-[#806844]">{blockerText(language,code)}</span>)}</div></div>}
       {plan.posted ? <div className="rounded-lg border border-[#cbdccf] bg-[#edf4eb] px-3 py-2 text-xs text-[#42634e]">{t(language,"posted")} · {t(language,"invoiceRef")} #{plan.posted.invoiceId} · {t(language,"journalRef")} #{plan.posted.journalId} · {t(language,"cogsRef")} {plan.posted.cogsJournalId===null?"—":`#${plan.posted.cogsJournalId}`} · {t(language,"receivableRef")} #{plan.posted.receivableId}</div> :
        <div className="grid gap-3 rounded-xl border border-[#dfe6de] bg-[#f8faf6] p-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2"><Field label={t(language,"reason")}><input minLength={5} maxLength={500} value={reason[plan.factId]??""} onChange={event=>setReason({...reason,[plan.factId]:event.target.value})} className={inputClass} disabled={!canManage}/></Field>
            <label className="flex items-center gap-2 text-xs text-[#52665c]"><input type="checkbox" checked={settle[plan.factId]??false} onChange={event=>setSettle({...settle,[plan.factId]:event.target.checked})} disabled={!canManage} className="accent-[#20484a]"/>{t(language,"settle")}</label></div>
          <Button type="button" disabled={!plan.postingAllowed||plan.posted!==null||!canManage||busy||!filtersReason(reason[plan.factId])} onClick={()=>onIssue(plan)} className="bg-[#20484a] text-white hover:bg-[#2d5d5c]">{t(language,"invoice")}</Button>
        </div>}
    </article>)}</div>}
    {workbench.pagination.totalRows>0 && <div className="flex items-center justify-end gap-2 border-t border-[#e5eae3] px-4 py-3"><Button type="button" variant="outline" size="sm" onClick={()=>changePage(page-1)} disabled={page<=1}>{t(language,"previous")}</Button><span className="px-1 text-xs tabular-nums text-[#687970]">{page} / {totalPages}</span><Button type="button" variant="outline" size="sm" onClick={()=>changePage(page+1)} disabled={page>=totalPages}>{t(language,"next")}</Button></div>}
  </section>;
}

export function ForeignInvoiceValuationPanel({ plan, language }: { plan: LoadingInvoicePlan; language: string }) {
  const invoiceCurrency = plan.currency?.trim();
  if (!invoiceCurrency || invoiceCurrency.toLocaleUpperCase() === plan.baseCurrency.trim().toLocaleUpperCase()) return null;

  const valuation = plan.foreignValuation;
  const complete = Boolean(valuation?.available
    && valuation.currency.trim().toUpperCase() === invoiceCurrency.toUpperCase()
    && valuation.baseCurrency.trim().toUpperCase() === plan.baseCurrency.trim().toUpperCase()
    && valuation.officialRate.trim()
    && valuation.effectiveOn.trim()
    && valuation.evidenceReference.trim()
    && valuation.baseTotal !== ""
    && valuation.baseGoods !== ""
    && valuation.baseTax !== ""
    && valuation.baseShipping !== "");

  return <section aria-label={t(language,"foreignValuation")} className="overflow-hidden rounded-xl border border-[#cbd9d1] bg-[#eff5f0]">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d9e5dc] bg-[#e7f0e8] px-3 py-3">
      <div><h4 className="text-xs font-bold text-[#294540]">{t(language,"foreignValuation")}</h4><p className="mt-1 text-[10px] font-semibold uppercase tracking-[.08em] text-[#668074]">{invoiceCurrency} → {plan.baseCurrency}</p></div>
      <span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${complete?"border-[#bdd3c0] bg-[#f7fbf5] text-[#42634e]":"border-[#e2cfad] bg-[#fbf5e9] text-[#806844]"}`}>{complete?t(language,"valuationStatus"):t(language,"notAvailable")}</span>
    </div>
    {complete && valuation ? <div className="space-y-3 p-3">
      {plan.amounts && <Amount label={t(language,"nativeReceivable")} value={plan.amounts.total} currency={plan.currency} strong/>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Fact label={t(language,"officialRate")} value={`${valuation.officialRate} ${valuation.baseCurrency} / ${valuation.currency}`} mono/>
        <Fact label={t(language,"effectiveOn")} value={valuation.effectiveOn} mono/>
        <Fact label={t(language,"evidenceReference")} value={valuation.evidenceReference}/>
        <Fact label={t(language,"rateId")} value={`#${valuation.rateId}`} mono/>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Amount label={t(language,"baseReceivable")} value={valuation.baseTotal} currency={valuation.baseCurrency} strong/>
        <Amount label={t(language,"baseGoods")} value={valuation.baseGoods} currency={valuation.baseCurrency}/>
        <Amount label={t(language,"baseTax")} value={valuation.baseTax} currency={valuation.baseCurrency}/>
        <Amount label={t(language,"baseShipping")} value={valuation.baseShipping} currency={valuation.baseCurrency}/>
      </div>
      <p className="rounded-lg border border-[#d7e2d8] bg-[#f7faf5] px-3 py-2 text-xs leading-5 text-[#52685c]">{t(language,"nativeDebt")} {t(language,"foreignCostSeparation")} {t(language,"rounding")} {plan.posted ? t(language,"postedFrozen") : ""}</p>
      {valuation.lines.length > 0 && <div className="overflow-x-auto rounded-lg border border-[#d9e3da] bg-[#fbfcf8]">
        <table className="w-full min-w-[740px] text-start text-[11px]">
          <thead className="bg-[#eaf1e9] text-[#63776c]"><tr>
            <th className="px-3 py-2">{t(language,"account")}</th><th className="px-3 py-2">{t(language,"party")}</th>
            <th className="px-3 py-2">{t(language,"debit")}</th><th className="px-3 py-2">{t(language,"credit")}</th>
            <th className="px-3 py-2">{t(language,"baseDebit")}</th><th className="px-3 py-2">{t(language,"baseCredit")}</th>
            <th className="px-3 py-2">{t(language,"lineRate")}</th>
          </tr></thead><tbody className="divide-y divide-[#e5ebe4]">{valuation.lines.map((line,index)=><tr key={`${line.accountId}-${index}`}>
            <td dir="ltr" className="px-3 py-2 font-mono">#{line.accountId}</td>
            <td className="px-3 py-2">{line.partyType ? `${line.partyType}${line.partyId === null ? "" : ` #${line.partyId}`}` : "—"}</td>
            <td dir="ltr" className="px-3 py-2 font-mono">{line.debit} {line.currency}</td>
            <td dir="ltr" className="px-3 py-2 font-mono">{line.credit} {line.currency}</td>
            <td dir="ltr" className="px-3 py-2 font-mono">{line.baseDebit} {valuation.baseCurrency}</td>
            <td dir="ltr" className="px-3 py-2 font-mono">{line.baseCredit} {valuation.baseCurrency}</td>
            <td dir="ltr" className="px-3 py-2 font-mono">{line.exchangeRate}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </div> : <p className="px-3 py-3 text-xs leading-5 text-[#786545]">{t(language,"valuationUnavailable")}</p>}
  </section>;
}

function StockBooksPanel({ language, expectedCompanyId, metadata, query, canManage, docChoice, setDocChoice, lineChoice, setLineChoice, journalChoice, setJournalChoice, cost, setCost, evidence, setEvidence, onRegister, busy }: {
  language:string;expectedCompanyId:number;metadata:any;query:any;canManage:boolean;docChoice:string;setDocChoice:(value:string)=>void;lineChoice:string;setLineChoice:(value:string)=>void;journalChoice:string;setJournalChoice:(value:string)=>void;cost:string;setCost:(value:string)=>void;evidence:string;setEvidence:(value:string)=>void;onRegister:()=>void;busy:boolean;
}) {
  const document = metadata?.documents.find((item:any)=>String(item.id)===docChoice);
  const journals = metadata?.journals.filter((journal:any)=>journal.documentId===document?.id)??[];
  return <section className="overflow-hidden rounded-2xl border border-[#dce4dc] bg-[#fbfcf8]">
    <div className="flex items-center gap-3 border-b border-[#e5eae3] bg-[#f3f7f0] px-4 py-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e4eee4] text-[#46674e]"><Archive className="h-4 w-4"/></span><div><h3 className="font-display text-lg font-semibold text-[#294540]">{t(language,"booksTitle")}</h3><p className="text-xs text-[#758179]">{metadata?.baseCurrency ? `${t(language,"base")}: ${metadata.baseCurrency}` : ""}</p></div></div>
    <div className="space-y-4 p-4 md:p-5">
      <p className="rounded-lg border border-[#d8dfd7] bg-[#f7f9f5] px-3 py-2 text-xs leading-5 text-[#66776e]">{t(language,"constraints")}</p>
      {query.isLoading ? <div className="space-y-2"><Skeleton className="h-12 rounded-lg bg-[#e8ede7]"/><Skeleton className="h-20 rounded-lg bg-[#e8ede7]"/></div> :
        query.isError ? <LoadError message={query.error instanceof Error?query.error.message:t(language,"failed")} retry={()=>void query.refetch()} language={language}/> :
        metadata && parsedBookScopeMatches(metadata, expectedCompanyId) ? <>
          {canManage && <div className="grid gap-3 rounded-xl border border-[#dfe6de] bg-[#f8faf6] p-4 md:grid-cols-2">
            <Field label={t(language,"document")}><select className={inputClass} value={docChoice} onChange={event=>setDocChoice(event.target.value)}><option value="">{t(language,"selectDocument")}</option>{metadata.documents.map((doc:any)=><option value={doc.id} key={doc.id}>{doc.reference} · #{doc.id}</option>)}</select></Field>
             <Field label={t(language,"line")}><select className={inputClass} value={lineChoice} onChange={event=>setLineChoice(event.target.value)} disabled={!document}><option value="">{t(language,"selectLine")}</option>{document?.lines.map((line:any,index:number)=><option value={index} key={index}>#{index} · {t(language,"productRef")} #{line.productId} · {line.batchReference} · {line.quantityTons} t · {line.totalCost} {document.currency}</option>)}</select></Field>
            <Field label={t(language,"journal")}><select className={inputClass} value={journalChoice} onChange={event=>setJournalChoice(event.target.value)} disabled={!document||!journals.length}><option value="">{journals.length?t(language,"selectJournal"):t(language,"noJournal")}</option>{journals.map((journal:any)=><option value={journal.id} key={journal.id}>{journal.reference} · #{journal.id} · {journal.inventoryBase}</option>)}</select></Field>
            <Field label={t(language,"baseCostInput")}><input inputMode="decimal" value={cost} onChange={event=>setCost(normalizeAccountingDigits(event.target.value))} className={inputClass}/></Field>
            <Field label={t(language,"evidence")}><input maxLength={500} minLength={5} value={evidence} onChange={event=>setEvidence(event.target.value)} className={inputClass}/></Field>
            <div className="flex items-end"><Button type="button" disabled={busy||!document||!lineChoice||!journalChoice||!cost||evidence.trim().length<5||!journals.length} onClick={onRegister} className="bg-[#20484a] text-white hover:bg-[#2d5d5c]">{busy?t(language,"loading"):t(language,"register")}</Button></div>
          </div>}
          {!canManage && <p className="rounded-lg border border-[#e6d8b7] bg-[#f6f0df] px-3 py-2 text-xs text-[#695638]">{t(language,"permission")}</p>}
          <div><h4 className="mb-2 text-xs font-bold uppercase tracking-[.1em] text-[#758179]">{t(language,"existingBooks")}</h4>{metadata.books.length ? <div className="overflow-x-auto rounded-xl border border-[#e1e7df]"><table className="w-full min-w-[620px] text-start text-xs"><thead className="bg-[#f0f4ee] text-[#6e7e74]"><tr>{["documentRef","line","baseCost","quantity","evidence"].map(key=><th key={key} className="px-3 py-2">{t(language,key)}</th>)}</tr></thead><tbody className="divide-y divide-[#e8ede6]">{metadata.books.map((book:any)=><tr key={book.id??`${book.documentId}-${book.lineIndex}`}><td className="px-3 py-2 font-mono">#{book.documentId}</td><td className="px-3 py-2 font-mono">{book.lineIndex}</td><td dir="ltr" className="px-3 py-2 font-mono">{book.baseCost} {metadata.baseCurrency}</td><td dir="ltr" className="px-3 py-2 font-mono">{book.quantityTons} t</td><td className="px-3 py-2">{book.evidenceReference}</td></tr>)}</tbody></table></div>:<Empty text={t(language,"noBooks")}/>}</div>
          {!metadata.documents.length&&<Empty text={t(language,"noDocuments")}/>}
        </> : <div role="status" className="rounded-xl border border-[#e6d9c4] bg-[#f8f1e5] px-4 py-3 text-sm text-[#806844]">{t(language,"stale")}</div>}
    </div>
  </section>;
}
function parsedBookScopeMatches(metadata: {companyId:number}, expectedCompanyId:number) {
  // Metadata is only rendered under the active query key; this function also rejects malformed payloads.
  return Number.isInteger(metadata.companyId) && metadata.companyId === expectedCompanyId;
}
function filtersReason(value:string|undefined) { return Boolean(value && value.trim().length >= 5); }
function LoadError({message,retry,language}:{message:string;retry:()=>void;language:string}) {
  return <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language,"failed")}</AlertTitle><AlertDescription className="mt-2 flex flex-wrap items-center gap-3"><span>{message}</span><Button type="button" variant="outline" size="sm" onClick={retry}>{t(language,"retry")}</Button></AlertDescription></Alert>;
}
function Field({label,children}:{label:string;children:ReactNode}) { return <label className="block space-y-1.5 text-xs font-semibold text-[#53665d]"><span>{label}</span>{children}</label>; }
function Fact({label,value,mono=false}:{label:string;value:string;mono?:boolean}) { return <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#7b887f]">{label}</div><div dir={mono?"ltr":undefined} className={`mt-1 break-words text-xs text-[#344a44] ${mono?"font-mono tabular-nums":"font-medium"}`}>{value}</div></div>; }
function Amount({label,value,currency,strong=false}:{label:string;value:string;currency:string|null;strong?:boolean}) { return <div className="rounded-lg border border-[#e1e8df] bg-[#fbfcf8] px-3 py-2.5"><div className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#7b887f]">{label}</div><div dir="ltr" className={`mt-1 font-mono text-sm tabular-nums text-[#344a44] ${strong?"font-bold":"font-medium"}`}>{value}<span className="ms-1 text-[10px] text-[#879289]">{currency||""}</span></div></div>; }
function Empty({text}:{text:string}) { return <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-6 py-7 text-center"><Archive className="mb-3 h-5 w-5 text-[#547267]"/><p className="max-w-lg text-sm leading-6 text-[#687970]">{text}</p></div>; }
