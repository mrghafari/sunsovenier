import { useState } from "react";
import type { ReactNode } from "react";
import { loadingReturnCommandSchema, loadingReturnFiltersSchema, type LoadingReturnPlan, type LoadingReturnWorkbench } from "@shared/accounting-loading-returns";
import { useLanguage } from "@/contexts/LanguageContext";
import { normalizeAccountingDigits } from "./accounting-logic";
import { loadingReturnText as t, accountingProgressCopy } from "./accounting-loading-returns-copy";
import { useLoadingReturns, usePostLoadingReturn } from "./accounting-loading-returns-api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, BadgeCheck, FileText, RefreshCw, ShieldAlert } from "lucide-react";

type Company = { id: number; name: string };
type Filters = { companyId: number; orderId?: number; page: number; pageSize: number };
type Draft = { companyId: string; orderId: string; pageSize: string };
const inputClass = "h-10 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 text-sm text-[#29423f] outline-none focus:border-[#9a7650] focus:ring-2 focus:ring-[#9a7650]/15 disabled:opacity-60";
const rtlLanguages = ["fa", "ar"];
const normalized = (v: string) => normalizeAccountingDigits(v.trim());

export default function AccountingLoadingReturns({ companies, canManage = false }: { companies: Company[]; canManage?: boolean }) {
  const { language } = useLanguage();
  const rtl = rtlLanguages.includes(language);
  const [draft, setDraft] = useState<Draft>({ companyId: "", orderId: "", pageSize: "20" });
  const [applied, setApplied] = useState<Filters>();
  const [formError, setFormError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [receipt, setReceipt] = useState<Record<number, string>>({});
  const [reason, setReason] = useState<Record<number, string>>({});
  const [returnDate, setReturnDate] = useState<Record<number, string>>({});
  const [physicalConfirmed, setPhysicalConfirmed] = useState<Record<number, boolean>>({});
  const [creditConfirmed, setCreditConfirmed] = useState<Record<number, boolean>>({});
  const [refreshedHash, setRefreshedHash] = useState<Record<number, string>>({});
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const query = useLoadingReturns(applied);
  const mutation = usePostLoadingReturn();
  const selected = companies.find(company => company.id === Number(draft.companyId));
  const scopeMatches = Boolean(applied && selected?.id === applied.companyId &&
    Number(normalized(draft.orderId) || 0) === (applied.orderId ?? 0) && Number(draft.pageSize) === applied.pageSize);
  const workbench = query.data;
  const matches = Boolean(scopeMatches && applied && workbench && workbench.company.id === applied.companyId
    && workbench.pagination.page === applied.page && workbench.pagination.pageSize === applied.pageSize
    && workbench.rows.every(row => row.companyId === applied.companyId && (!applied.orderId || row.orderId === applied.orderId)));
  const totalPages = matches && workbench ? Math.max(1, Math.ceil(workbench.pagination.totalRows / workbench.pagination.pageSize)) : 1;
  const busy = mutation.isPending || refreshingId !== null;

  const clearDrafts = () => {
    setReceipt({}); setReason({}); setReturnDate({}); setPhysicalConfirmed({}); setCreditConfirmed({}); setRefreshedHash({});
    setActionError(""); setActionMessage("");
  };
  const changeDraft = (next: Draft) => {
    setDraft(next); setApplied(undefined); setFormError(false); clearDrafts();
  };
  const apply = () => {
    setFormError(false);
    const parsed = loadingReturnFiltersSchema.safeParse({
      companyId: draft.companyId, orderId: draft.orderId.trim() ? normalized(draft.orderId) : undefined,
      page: 1, pageSize: draft.pageSize,
    });
    if (!parsed.success || !companies.some(company => company.id === parsed.data.companyId)) { setFormError(true); return; }
    clearDrafts(); setApplied(parsed.data);
  };
  const changePage = (page: number) => {
    if (applied && page >= 1 && page <= totalPages) { clearDrafts(); setApplied({ ...applied, page }); }
  };
  const refresh = async () => {
    const result = await query.refetch();
    if (!result.isSuccess || !result.data) throw new Error(t(language, "failed"));
    return result.data;
  };
  const post = async (plan: LoadingReturnPlan) => {
    setActionError(""); setActionMessage("");
    const evidenceReference = receipt[plan.invoiceId] ?? "";
    const why = reason[plan.invoiceId] ?? "";
    const date = returnDate[plan.invoiceId] ?? "";
    const credit = plan.customerCredit;
    const requiresCreditConfirmation = Boolean(credit && isPositiveAmount(credit.amount));
    const command = loadingReturnCommandSchema.safeParse({
      companyId: applied?.companyId, invoiceId: plan.invoiceId, expectedPlanHash: plan.planHash,
      returnDate: date, goodsReceiptReference: evidenceReference, reason: why,
      ...(requiresCreditConfirmation && creditConfirmed[plan.invoiceId] ? { creditToCustomerConfirmed: true as const } : {}),
    });
    const reviewFresh = refreshedHash[plan.invoiceId] === plan.planHash;
    if (!canManage || !applied || !matches || !plan.postingAllowed || plan.returned || plan.blockers.length || !command.success
      || evidenceReference.trim().length < 5 || why.trim().length < 5 || date < plan.minReturnDate
      || !physicalConfirmed[plan.invoiceId] || (requiresCreditConfirmation && !creditConfirmed[plan.invoiceId])
      || (refreshedHash[plan.invoiceId] && !reviewFresh)) {
      setActionError(!canManage ? t(language, "permission") : t(language, "validation")); return;
    }
    if (!window.confirm(t(language, requiresCreditConfirmation ? "confirmPaidDialog" : "confirmDialog"))) return;
    try {
      await mutation.mutateAsync(command.data);
      clearDrafts();
      setActionMessage(t(language, "success"));
      await query.refetch();
    } catch (error) {
      if (isPlanChanged(error)) {
        setActionError(t(language, "planChanged"));
        setRefreshingId(plan.invoiceId);
        try {
          const fresh = await refresh();
          const latest = fresh.rows.find(row => row.invoiceId === plan.invoiceId);
          if (!latest) setActionError(t(language, "stale"));
          else {
            setRefreshedHash(current => ({ ...current, [plan.invoiceId]: "pending-review" }));
            setPhysicalConfirmed(current => ({ ...current, [plan.invoiceId]: false }));
            setCreditConfirmed(current => ({ ...current, [plan.invoiceId]: false }));
          }
        } catch { setActionError(t(language, "failed")); }
        finally { setRefreshingId(null); }
      } else setActionError(error instanceof Error ? error.message : t(language, "failedAction"));
    }
  };

  return <section dir={rtl ? "rtl" : "ltr"} className="space-y-4" data-testid="accounting-loading-returns">
    <AccountingProgress language={language}/>
    <header className="overflow-hidden rounded-[22px] border border-[#e2d8ca] bg-[#fbfcf8] shadow-[0_14px_45px_-40px_rgba(67,52,34,.65)]">
      <div className="flex flex-wrap items-start justify-between gap-4 bg-[#f4eee5] px-5 py-5 md:px-7">
        <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#735b3e] text-[#fbf6ed]"><FileText className="h-5 w-5"/></span>
          <div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8c765a]">MOMTAZCHEM · DOCUMENTARY REVERSAL</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.025em] text-[#3f4238]">{t(language,"title")}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#756c5d]">{t(language,"intro")}</p></div>
        </div><span className="inline-flex items-center gap-2 rounded-lg border border-[#e4d6c2] bg-[#fbf8f1] px-3 py-2 text-[10px] font-bold text-[#755c3d]"><BadgeCheck className="h-4 w-4"/>{t(language,"implementation")}</span>
      </div>
       <div role="note" className="flex gap-3 border-t border-[#e4d7c5] bg-[#faf4e8] px-5 py-4 text-[#6f5637] md:px-7"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0"/><div className="space-y-1"><p className="text-xs leading-5">{t(language,"physicalRule")}</p><p className="text-xs leading-5">{t(language,"returnRule")}</p><p className="text-xs leading-5">{t(language,"paidCreditRule")}</p><p className="text-xs font-semibold leading-5">{t(language,"gates")}</p></div></div>
    </header>
    <form onSubmit={event => { event.preventDefault(); apply(); }} className="grid gap-3 rounded-2xl border border-[#e5ded3] bg-[#fbfcf8] p-4 md:grid-cols-[1.15fr_1fr_150px_auto] md:items-end md:p-5">
      <Field label={t(language,"scope")}><select aria-label={t(language,"scope")} value={draft.companyId} disabled={busy} onChange={event=>changeDraft({...draft,companyId:event.target.value})} className={inputClass}><option value="">{t(language,"selectCompany")}</option>{companies.map(company=><option key={company.id} value={company.id}>{company.name} · #{company.id}</option>)}</select></Field>
      <Field label={t(language,"order")}><input inputMode="numeric" aria-label={t(language,"order")} value={draft.orderId} disabled={busy} onChange={event=>changeDraft({...draft,orderId:normalizeAccountingDigits(event.target.value)})} className={inputClass}/></Field>
      <Field label={t(language,"pageSize")}><select aria-label={t(language,"pageSize")} value={draft.pageSize} disabled={busy} onChange={event=>changeDraft({...draft,pageSize:event.target.value})} className={inputClass}>{[10,20,50,100].map(size=><option key={size} value={size}>{size}</option>)}</select></Field>
      <Button type="submit" disabled={!companies.length||busy} className="bg-[#735b3e] text-[#fbf6ed] hover:bg-[#624b32]"><FileText className="me-2 h-4 w-4"/>{t(language,"apply")}</Button>
      {formError && <p role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-sm text-[#883f37] md:col-span-4">{t(language,"invalid")}</p>}
      {!companies.length && <p className="rounded-lg border border-dashed border-[#d7e0d7] bg-[#f7f9f5] p-3 text-sm text-[#66776e] md:col-span-4">{t(language,"noCompanies")}</p>}
    </form>
    {actionError && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language,"failedAction")}</AlertTitle><AlertDescription>{actionError}</AlertDescription></Alert>}
    {actionMessage && <p role="status" className="rounded-lg border border-[#d9d1b8] bg-[#f7f2e5] px-4 py-3 text-sm text-[#695638]">{actionMessage}</p>}
    {!canManage && <p className="rounded-lg border border-[#e6d8b7] bg-[#f6f0df] px-4 py-3 text-xs text-[#695638]">{t(language,"permission")}</p>}
    {!companies.length ? <Empty text={t(language,"noCompanies")}/> : !applied ? <Empty text={t(language,"choose")}/> :
      !scopeMatches ? <div role="status" className="rounded-xl border border-[#e6d9c4] bg-[#f8f1e5] px-4 py-3 text-sm text-[#806844]">{t(language,"stale")}</div> :
      query.isLoading ? <Loading language={language}/> :
      query.isError ? <LoadError message={query.error instanceof Error ? query.error.message : t(language,"failed")} retry={()=>void query.refetch()} language={language}/> :
      !matches ? <div role="status" className="rounded-xl border border-[#e6d9c4] bg-[#f8f1e5] px-4 py-3 text-sm text-[#806844]">{t(language,"stale")}</div> :
      <Workbench workbench={workbench!} language={language} page={applied.page} totalPages={totalPages} changePage={changePage}
        onRefresh={()=>void refresh().catch(()=>setActionError(t(language,"failed")))} canManage={canManage} receipt={receipt} reason={reason} returnDate={returnDate}
        physicalConfirmed={physicalConfirmed} creditConfirmed={creditConfirmed} refreshedHash={refreshedHash} setReceipt={setReceipt} setReason={setReason} setReturnDate={setReturnDate}
        setPhysicalConfirmed={setPhysicalConfirmed} setCreditConfirmed={setCreditConfirmed} setRefreshedHash={setRefreshedHash} onPost={post} busy={busy}/>}
  </section>;
}

function AccountingProgress({language}:{language:string}) {
 const p=accountingProgressCopy(language);
 return <aside className="rounded-2xl border border-[#d8dfd5] bg-[#eaf0e8] p-4 md:p-5" aria-label={p.title}>
  <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-display text-base font-semibold text-[#294540]">{p.title}</h3><span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#806844]">{t(language,"implementation")}</span></div>
  <p className="mt-1 text-[11px] leading-5 text-[#786d5b]">{p.disclaimer}</p>
  <div className="mt-3 grid gap-2 md:grid-cols-2">
    {[p.foundations,p.docs,p.current].map((line,i)=><p key={i} className={`rounded-lg px-3 py-2 text-xs leading-5 ${i===2?"border border-[#d8c9ac] bg-[#f7f0e4] text-[#705638]":"border border-[#dce5d9] bg-[#f7faf5] text-[#52665c]"}`}>{line}</p>)}
    <div className="rounded-lg border border-dashed border-[#d6cbb9] bg-[#f8f5ee] px-3 py-2"><p className="mb-1 text-[10px] font-bold uppercase tracking-[.09em] text-[#806844]">{p.remaining}</p><ul className="space-y-1 text-xs leading-5 text-[#6f6658]">{[p.pending,p.reconciliation,p.e2e,p.prod].map((line,i)=><li key={i}>· {line}</li>)}</ul></div>
  </div>
 </aside>;
}

export function Workbench({workbench,language,page,totalPages,changePage,onRefresh,canManage,receipt,reason,returnDate,physicalConfirmed,creditConfirmed,refreshedHash,setReceipt,setReason,setReturnDate,setPhysicalConfirmed,setCreditConfirmed,setRefreshedHash,onPost,busy}:{
 workbench:LoadingReturnWorkbench;language:string;page:number;totalPages:number;changePage:(page:number)=>void;onRefresh:()=>void;canManage:boolean;
 receipt:Record<number,string>;reason:Record<number,string>;returnDate:Record<number,string>;physicalConfirmed:Record<number,boolean>;creditConfirmed:Record<number,boolean>;refreshedHash:Record<number,string>;
 setReceipt:(v:Record<number,string>)=>void;setReason:(v:Record<number,string>)=>void;setReturnDate:(v:Record<number,string>)=>void;setPhysicalConfirmed:(v:Record<number,boolean>)=>void;setCreditConfirmed:(v:Record<number,boolean>)=>void;setRefreshedHash:(v:Record<number,string>)=>void;
 onPost:(plan:LoadingReturnPlan)=>void;busy:boolean;
}) {
 return <section className="overflow-hidden rounded-2xl border border-[#e3ddd2] bg-[#fbfcf8]">
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8e3da] bg-[#f7f3ec] px-4 py-4 md:px-5">
   <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#897c68]">{workbench.company.name} · #{workbench.company.id} · {workbench.company.baseCurrency}</p><h3 className="font-display text-lg font-semibold text-[#494337]">{t(language,"results")}</h3></div>
   <div className="flex flex-wrap items-center gap-3"><span className="text-xs text-[#7a766c]">{t(language,"page")} {page} / {totalPages} · {workbench.pagination.totalRows} {t(language,"rows")}</span><Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={busy} className="border-[#d9cebd] bg-[#fbf8f1] text-[#67573f]"><RefreshCw className="me-2 h-3.5 w-3.5"/>{t(language,"refresh")}</Button></div>
  </div>
  {!workbench.financialGateOpen && <p className="border-b border-[#e8e3da] bg-[#fcfaf5] px-4 py-2 text-[11px] leading-5 text-[#807663]">{t(language,"gateClosed")}</p>}
   {!workbench.rows.length?<Empty text={t(language,"empty")}/>:<div className="divide-y divide-[#ebe7df]">{workbench.rows.map(plan=><PlanRow key={plan.invoiceId} plan={plan} language={language} canManage={canManage} gateOpen={workbench.financialGateOpen} receipt={receipt[plan.invoiceId]??""} reason={reason[plan.invoiceId]??""}
    returnDate={returnDate[plan.invoiceId]??""} physicalConfirmed={Boolean(physicalConfirmed[plan.invoiceId])}
    creditConfirmed={Boolean(creditConfirmed[plan.invoiceId])}
    onReceipt={v=>setReceipt({...receipt,[plan.invoiceId]:v})} onReason={v=>setReason({...reason,[plan.invoiceId]:v})} onDate={v=>setReturnDate({...returnDate,[plan.invoiceId]:v})}
    onPhysical={v=>setPhysicalConfirmed({...physicalConfirmed,[plan.invoiceId]:v})} onCreditConfirm={v=>setCreditConfirmed({...creditConfirmed,[plan.invoiceId]:v})} refreshedHash={refreshedHash[plan.invoiceId]??""} onFreshConfirm={confirmed=>setRefreshedHash({...refreshedHash,[plan.invoiceId]:confirmed?plan.planHash:"pending-review"})}
    onPost={()=>onPost(plan)} busy={busy}/>)}</div>}
  {workbench.pagination.totalRows>0&&<div className="flex items-center justify-end gap-2 border-t border-[#e8e3da] px-4 py-3"><Button type="button" variant="outline" size="sm" onClick={()=>changePage(page-1)} disabled={page<=1||busy}>{t(language,"previous")}</Button><span className="px-1 text-xs tabular-nums text-[#687970]">{page} / {totalPages}</span><Button type="button" variant="outline" size="sm" onClick={()=>changePage(page+1)} disabled={page>=totalPages||busy}>{t(language,"next")}</Button></div>}
 </section>;
}

function PlanRow({plan,language,canManage,gateOpen,receipt,reason,returnDate,physicalConfirmed,creditConfirmed,refreshedHash,onReceipt,onReason,onDate,onPhysical,onCreditConfirm,onFreshConfirm,onPost,busy}:{
 plan:LoadingReturnPlan;language:string;canManage:boolean;gateOpen:boolean;receipt:string;reason:string;returnDate:string;physicalConfirmed:boolean;creditConfirmed:boolean;refreshedHash:string;
  onReceipt:(v:string)=>void;onReason:(v:string)=>void;onDate:(v:string)=>void;onPhysical:(v:boolean)=>void;onCreditConfirm:(v:boolean)=>void;onFreshConfirm:(confirmed:boolean)=>void;onPost:()=>void;busy:boolean;
}) {
 const blockers=plan.blockers.length>0||!plan.postingAllowed||!gateOpen;
  const customerCredit = plan.customerCredit;
  const requiresCreditConfirmation = Boolean(customerCredit && isPositiveAmount(customerCredit.amount));
 const requiresFreshReview=Boolean(refreshedHash);
  const valid=canManage&&!blockers&&!plan.returned&&!busy&&receipt.trim().length>=5&&reason.trim().length>=5&&returnDate>=plan.minReturnDate&&physicalConfirmed&&(!requiresCreditConfirmation||creditConfirmed)&&(!requiresFreshReview||refreshedHash===plan.planHash);
 return <article className="space-y-4 p-4 md:p-5">
  <div className="flex flex-wrap items-start justify-between gap-4"><div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
   <Fact label={t(language,"invoice")} value={`#${plan.invoiceId}`} mono/><Fact label={t(language,"orderRef")} value={`#${plan.orderId}`} mono/><Fact label={t(language,"customer")} value={`#${plan.customerId}`} mono/>
   <Fact label={t(language,"originalDate")} value={plan.originalDate} mono/><Fact label={t(language,"minDate")} value={plan.minReturnDate} mono/><Fact label={t(language,"currency")} value={plan.currency} mono/><Fact label={t(language,"baseCurrency")} value={plan.baseCurrency} mono/>
  </div><span className={`rounded-lg border px-3 py-2 text-[10px] font-bold ${plan.returned?"border-[#cbdccf] bg-[#edf4eb] text-[#42634e]":blockers?"border-[#e6d9c4] bg-[#f8f1e5] text-[#806844]":"border-[#dfd2bd] bg-[#f7f0e4] text-[#775d3d]"}`}>{plan.returned?t(language,"posted"):blockers?t(language,"statusBlocked"):t(language,"statusAllowed")}</span></div>
  <section className="rounded-xl border border-[#e5ded2] bg-[#faf8f2] p-3"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   <Fact label={t(language,"originalAmount")} value={`${plan.originalAmount} ${plan.currency}`} mono/>
   <LoadingReturnValuation language={language} originalBaseAmount={plan.originalBaseAmount} quantityTons={plan.quantityTons} baseCurrency={plan.baseCurrency}/>
   <Fact label={t(language,"cost")} value={`${plan.baseCost} ${plan.baseCurrency}`} mono/>
   <Fact label={t(language,"receivable")} value={`#${plan.receivableId}`} mono/><Fact label={t(language,"journal")} value={`#${plan.invoiceJournalId}`} mono/><Fact label={t(language,"cogsJournal")} value={plan.cogsJournalId===null?"—":`#${plan.cogsJournalId}`} mono/>
  </div></section>
   {requiresCreditConfirmation&&<section className="rounded-xl border border-[#d8c9ac] bg-[#f7f0e4] p-3" aria-label={t(language,"paidCreditTitle")}>
    <h4 className="mb-3 text-xs font-bold text-[#705638]">{t(language,"paidCreditTitle")}</h4>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
     <Fact label={t(language,"creditWallet")} value={`#${customerCredit!.walletId}`} mono/>
     <Fact label={t(language,"creditNative")} value={`${customerCredit!.amount} ${plan.currency}`} mono/>
     <Fact label={t(language,"creditBase")} value={`${customerCredit!.baseAmount} ${customerCredit!.baseCurrency}`} mono/>
    </div>
    <p className="mt-3 text-xs leading-5 text-[#705638]">{t(language,"paidCreditRule")}</p>
   </section>}
  {plan.blockers.length>0&&<div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#8a785e]">{t(language,"blockers")}</p><div className="flex flex-wrap gap-2">{plan.blockers.map(code=><span key={code} className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-2.5 py-1.5 text-xs text-[#806844]">{t(language,`blocker_${code}`)}</span>)}</div></div>}
  {plan.returned&&<section className="rounded-xl border border-[#cbdccf] bg-[#edf4eb] p-3"><h4 className="mb-3 text-xs font-bold text-[#42634e]">{t(language,"returnRecord")} · #{plan.returned.id}</h4><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   <Fact label={t(language,"returnDate")} value={plan.returned.returnDate} mono/><Fact label={t(language,"receipt")} value={plan.returned.goodsReceiptReference}/><Fact label={t(language,"reason")} value={plan.returned.reason}/>
    <Fact label={t(language,"returnJournal")} value={`#${plan.returned.invoiceReversalId}`} mono/><Fact label={t(language,"returnCogs")} value={plan.returned.cogsReversalId===null?"—":`#${plan.returned.cogsReversalId}`} mono/>
    {plan.returned.customerCreditJournalId!==undefined&&<Fact label={t(language,"customerCreditJournal")} value={plan.returned.customerCreditJournalId===null?"—":`#${plan.returned.customerCreditJournalId}`} mono/>}
    {plan.returned.customerCreditAmount!==undefined&&<Fact label={t(language,"customerCreditAmount")} value={`${plan.returned.customerCreditAmount} ${plan.currency}`} mono/>}
  </div></section>}
  {!plan.returned&&canManage&&!blockers&&<>
   {requiresFreshReview&&<div className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] p-3 text-xs text-[#806844]"><p>{t(language,"planChanged")}</p><label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={refreshedHash===plan.planHash} onChange={e=>onFreshConfirm(e.target.checked)} className="accent-[#735b3e]"/>{t(language,"confirmFresh")}</label></div>}
   <div className="grid gap-3 rounded-xl border border-[#e5ded2] bg-[#fbf9f4] p-3 md:grid-cols-2">
    <Field label={t(language,"returnDate")}><input type="date" min={plan.minReturnDate} value={returnDate} onChange={e=>onDate(e.target.value)} disabled={busy} className={inputClass}/></Field>
    <Field label={t(language,"receiptInput")}><input minLength={5} maxLength={500} value={receipt} onChange={e=>onReceipt(e.target.value)} disabled={busy} className={inputClass}/></Field>
    <Field label={t(language,"reasonInput")}><textarea minLength={5} maxLength={500} value={reason} onChange={e=>onReason(e.target.value)} disabled={busy} className={`${inputClass} min-h-20 py-2`}/></Field>
    <label className="flex items-start gap-2 self-end rounded-lg border border-[#e5ded2] bg-[#fbfcf8] p-3 text-xs leading-5 text-[#52665c]"><input type="checkbox" checked={physicalConfirmed} onChange={e=>onPhysical(e.target.checked)} disabled={busy} className="mt-0.5 accent-[#735b3e]"/>{t(language,"confirmation")}</label>
     {requiresCreditConfirmation&&<label className="flex items-start gap-2 rounded-lg border border-[#d8c9ac] bg-[#f7f0e4] p-3 text-xs leading-5 text-[#705638] md:col-span-2"><input type="checkbox" checked={creditConfirmed} onChange={e=>onCreditConfirm(e.target.checked)} disabled={busy} className="mt-0.5 accent-[#735b3e]"/>{t(language,"creditReview")}</label>}
    <div className="md:col-span-2"><Button type="button" disabled={!valid} onClick={onPost} className="bg-[#735b3e] text-[#fbf6ed] hover:bg-[#624b32]">{busy?t(language,"busy"):t(language,"confirm")}</Button></div>
   </div>
  </>}
  {!canManage&&!plan.returned&&<p className="rounded-lg border border-[#e6d8b7] bg-[#f6f0df] px-3 py-2 text-xs text-[#695638]">{t(language,"permission")}</p>}
 </article>;
}

export function LoadingReturnValuation({language,originalBaseAmount,quantityTons,baseCurrency}:{
 language:string;originalBaseAmount:string|null;quantityTons:string|null;baseCurrency:string;
}) {
 return <>
  <Fact label={t(language,"originalBase")} value={originalBaseAmount===null?t(language,"unavailable"):`${originalBaseAmount} ${baseCurrency}`} mono/>
  <Fact label={t(language,"tons")} value={quantityTons===null?t(language,"unavailable"):`${quantityTons} t`} mono/>
 </>;
}

function isPlanChanged(error:unknown) { return Boolean(error&&typeof error==="object"&&"code"in error&&String((error as {code:unknown}).code).includes("PLAN_CHANGED")); }
function isPositiveAmount(amount:string) { return !amount.trim().startsWith("-") && /[1-9]/.test(amount); }
function Loading({language}:{language:string}) { return <div aria-label={t(language,"loading")} className="space-y-3"><Skeleton className="h-20 rounded-xl bg-[#e8ede7]"/><Skeleton className="h-44 rounded-xl bg-[#e8ede7]"/></div>; }
function LoadError({message,retry,language}:{message:string;retry:()=>void;language:string}) { return <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language,"failed")}</AlertTitle><AlertDescription className="mt-2 flex flex-wrap items-center gap-3"><span>{message}</span><Button type="button" variant="outline" size="sm" onClick={retry}>{t(language,"retry")}</Button></AlertDescription></Alert>; }
function Field({label,children}:{label:string;children:ReactNode}) { return <label className="block space-y-1.5 text-xs font-semibold text-[#53665d]"><span>{label}</span>{children}</label>; }
function Fact({label,value,mono=false}:{label:string;value:string;mono?:boolean}) { return <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#7b887f]">{label}</div><div dir={mono?"ltr":undefined} className={`mt-1 break-words text-xs text-[#344a44] ${mono?"font-mono tabular-nums":"font-medium"}`}>{value}</div></div>; }
function Empty({text}:{text:string}) { return <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-[#e0d6c5] bg-[#faf8f2] px-6 py-7 text-center"><FileText className="mb-3 h-5 w-5 text-[#806847]"/><p className="max-w-lg text-sm leading-6 text-[#687970]">{text}</p></div>; }
