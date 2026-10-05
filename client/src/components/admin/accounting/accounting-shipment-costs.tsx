import { useState } from "react";
import type { ReactNode } from "react";
import { shipmentCostCommandSchema, shipmentCostFiltersSchema, type ShipmentCostPlan, type ShipmentCostWorkbench } from "@shared/accounting-shipment-costs";
import { useLanguage } from "@/contexts/LanguageContext";
import { normalizeAccountingDigits } from "./accounting-logic";
import AccountingShipmentCostCapture from "./accounting-shipment-cost-capture";
import { shipmentCostBlockerText, shipmentCostText as t } from "./accounting-shipment-costs-copy";
import { usePostShipmentCost, useShipmentCosts } from "./accounting-shipment-costs-api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeftRight, BadgeCheck, FileText, RefreshCw, ShieldAlert, Truck } from "lucide-react";

type Company = { id: number; name: string };
type Filters = { companyId: number; orderId?: number; page: number; pageSize: number };
type Draft = { companyId: string; orderId: string; pageSize: string };
const inputClass = "h-10 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 text-sm text-[#29423f] outline-none focus:border-[#9a7650] focus:ring-2 focus:ring-[#9a7650]/15 disabled:opacity-60";
const rtlLanguages = ["fa", "ar", "ku"];
const clean = (value: string) => value.trim() ? normalizeAccountingDigits(value.trim()) : undefined;

export default function AccountingShipmentCosts({ companies, canManage = false }: { companies: Company[]; canManage?: boolean }) {
  const { language } = useLanguage();
  const rtl = rtlLanguages.includes(language);
  const [draft, setDraft] = useState<Draft>({ companyId: "", orderId: "", pageSize: "20" });
  const [applied, setApplied] = useState<Filters>();
  const [formError, setFormError] = useState(false);
  const [reason, setReason] = useState<Record<number, string>>({});
  const [carrierIds, setCarrierIds] = useState<Record<number, string>>({});
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [reviewRequired, setReviewRequired] = useState<Record<number, boolean>>({});
  const [reviewReady, setReviewReady] = useState<Record<number, boolean>>({});
  const [reviewedHashes, setReviewedHashes] = useState<Record<number, string>>({});
  const [refreshingFactId, setRefreshingFactId] = useState<number | null>(null);
  const query = useShipmentCosts(applied);
  const mutation = usePostShipmentCost();
  const workbench = query.data;
  const selectedCompany = companies.find(company => String(company.id) === draft.companyId);
  const scopeMatches = Boolean(applied && selectedCompany?.id === applied.companyId
    && Number(clean(draft.orderId) || 0) === (applied.orderId ?? 0) && Number(draft.pageSize) === applied.pageSize);
  const matches = Boolean(scopeMatches && applied && workbench && workbench.company.id === applied.companyId
    && workbench.pagination.page === applied.page && workbench.pagination.pageSize === applied.pageSize
    && workbench.rows.every(row => row.factId > 0 && row.orderId > 0 && (!applied.orderId || row.orderId === applied.orderId)));
  const totalPages = matches && workbench ? Math.max(1, Math.ceil(workbench.pagination.totalRows / workbench.pagination.pageSize)) : 1;

  const apply = () => {
    setFormError(false);
    const parsed = shipmentCostFiltersSchema.safeParse({
      companyId: draft.companyId, orderId: draft.orderId.trim() || undefined, page: 1, pageSize: draft.pageSize,
    });
    if (!parsed.success || !companies.some(company => company.id === parsed.data.companyId)) { setFormError(true); return; }
    setApplied(parsed.data);
    setActionError(""); setActionMessage("");
    setReviewRequired({}); setReviewReady({}); setReviewedHashes({});
  };
  const changePage = (page: number) => {
    if (applied && page >= 1 && page <= totalPages) setApplied({ ...applied, page });
  };
  const markFreshReviewsReady = () => setReviewReady(current=>{
    const next = {...current};
    Object.keys(reviewRequired).forEach(id=>{if(reviewRequired[Number(id)])next[Number(id)]=true;});
    return next;
  });
  const reloadWorkbench = async () => {
    const refreshed = await query.refetch();
    if (refreshed.isSuccess) markFreshReviewsReady();
    return refreshed;
  };
  const confirmFreshReview = (plan:ShipmentCostPlan) => {
    setReviewedHashes(current=>({...current,[plan.factId]:plan.planHash}));
    setActionError("");
  };
  const post = async (plan: ShipmentCostPlan) => {
    setActionError(""); setActionMessage("");
    const carrierPartyId = plan.costType === "EXTERNAL_CARRIER" ? Number(carrierIds[plan.factId]) : null;
    const command = shipmentCostCommandSchema.safeParse({
      companyId: applied?.companyId, factId: plan.factId, carrierPartyId, expectedPlanHash:plan.planHash, reason: reason[plan.factId] ?? "",
    });
    const needsReview = reviewRequired[plan.factId] && (reviewedHashes[plan.factId] !== plan.planHash || !reviewReady[plan.factId]);
    if (!canManage || !applied || !matches || plan.blockers.length || plan.posted || needsReview || !command.success) {
      setActionError(!canManage ? t(language, "permission") : plan.costType === "EXTERNAL_CARRIER" && (!Number.isInteger(carrierPartyId) || carrierPartyId! <= 0)
        ? t(language, "carrierRequired") : plan.costType === "EXTERNAL_CARRIER" && !plan.carrierReference?.trim()
          ? t(language, "referenceRequired") : (reason[plan.factId] ?? "").trim().length < 5
          ? t(language, "reasonRequired") : needsReview ? t(language, "reviewRequired") : t(language, "notPostable"));
      return;
    }
    if (!window.confirm(t(language, "confirm"))) return;
    try {
      const result = await mutation.mutateAsync(command.data);
      setActionMessage(`${result.duplicate ? t(language, "duplicate") : t(language, "success")} · #${result.id} · ${t(language, "journal")} #${result.journalId}`);
      await query.refetch();
    } catch (error) {
      if (getErrorCode(error) === "SHIPMENT_PLAN_CHANGED") {
        setReviewRequired(current=>({...current,[plan.factId]:true}));
        setReviewReady(current=>({...current,[plan.factId]:false}));
        setReviewedHashes(current=>{const next={...current};delete next[plan.factId];return next;});
        setActionError(t(language,"planChanged"));
        setRefreshingFactId(plan.factId);
        try {
          const refreshed = await query.refetch();
          if (refreshed.isSuccess && refreshed.data) setReviewReady(current=>({...current,[plan.factId]:true}));
          else setActionError(t(language,"refreshFailed"));
        } catch {
          setActionError(t(language,"refreshFailed"));
        } finally { setRefreshingFactId(null); }
      } else setActionError(error instanceof Error ? error.message : t(language, "failedAction"));
    }
  };

  return <section dir={rtl ? "rtl" : "ltr"} className="space-y-4" data-testid="accounting-shipment-costs">
    <header className="overflow-hidden rounded-[22px] border border-[#e2d8ca] bg-[#fbfcf8] shadow-[0_14px_45px_-40px_rgba(67,52,34,.65)]">
      <div className="flex flex-wrap items-start justify-between gap-4 bg-[#f4eee5] px-5 py-5 md:px-7">
        <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#735b3e] text-[#fbf6ed]"><Truck className="h-5 w-5"/></span>
          <div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8c765a]">MOMTAZCOM · COST EVIDENCE</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.025em] text-[#3f4238]">{t(language,"title")}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#756c5d]">{t(language,"intro")}</p></div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-lg border border-[#e4d6c2] bg-[#fbf8f1] px-3 py-2 text-[10px] font-bold text-[#755c3d]"><BadgeCheck className="h-4 w-4"/>{t(language,"manualOnly")}</span>
      </div>
      <div role="note" className="flex gap-3 border-t border-[#e4d7c5] bg-[#faf4e8] px-5 py-4 text-[#6f5637] md:px-7">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0"/><div><p className="text-xs font-bold leading-5">{t(language,"notice")}</p><p className="mt-1 text-xs leading-5">{t(language,"provenance")}</p></div>
      </div>
    </header>
    <form onSubmit={event => { event.preventDefault(); apply(); }} className="grid gap-3 rounded-2xl border border-[#e5ded3] bg-[#fbfcf8] p-4 md:grid-cols-[1.15fr_1fr_150px_auto] md:items-end md:p-5">
      <Field label={t(language,"company")}><select aria-label={t(language,"company")} value={draft.companyId} disabled={mutation.isPending||refreshingFactId!==null} onChange={event=>setDraft({...draft,companyId:event.target.value})} className={inputClass}><option value="">{t(language,"selectCompany")}</option>{companies.map(company=><option key={company.id} value={company.id}>{company.name} · #{company.id}</option>)}</select></Field>
      <Field label={t(language,"order")}><input inputMode="numeric" aria-label={t(language,"order")} value={draft.orderId} disabled={mutation.isPending||refreshingFactId!==null} onChange={event=>setDraft({...draft,orderId:normalizeAccountingDigits(event.target.value)})} className={inputClass}/></Field>
      <Field label={t(language,"pageSize")}><select aria-label={t(language,"pageSize")} value={draft.pageSize} disabled={mutation.isPending||refreshingFactId!==null} onChange={event=>setDraft({...draft,pageSize:event.target.value})} className={inputClass}>{[10,20,50,100].map(size=><option key={size} value={size}>{size}</option>)}</select></Field>
      <Button type="submit" disabled={!companies.length||mutation.isPending||refreshingFactId!==null} className="bg-[#735b3e] text-[#fbf6ed] hover:bg-[#624b32]"><FileText className="me-2 h-4 w-4"/>{t(language,"apply")}</Button>
      {formError && <p role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-sm text-[#883f37] md:col-span-4">{t(language,"invalid")}</p>}
      {!companies.length && <p className="rounded-lg border border-dashed border-[#d7e0d7] bg-[#f7f9f5] p-3 text-sm text-[#66776e] md:col-span-4">{t(language,"noCompanies")}</p>}
    </form>
    {actionError && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language,"failedAction")}</AlertTitle><AlertDescription>{actionError}</AlertDescription></Alert>}
    {actionMessage && <p role="status" className="rounded-lg border border-[#d9d1b8] bg-[#f7f2e5] px-4 py-3 text-sm text-[#695638]">{actionMessage}</p>}
    {!canManage && <p className="rounded-lg border border-[#e6d8b7] bg-[#f6f0df] px-4 py-3 text-xs text-[#695638]">{t(language,"permission")}</p>}
    {applied && scopeMatches && <AccountingShipmentCostCapture companyId={applied.companyId}
      companyName={companies.find(company=>company.id===applied.companyId)?.name??""} canManage={canManage}/>}
    {!companies.length ? <Empty text={t(language,"noCompanies")} language={language}/> : !applied ? <Empty text={t(language,"choose")} language={language}/> :
      query.isLoading ? <Loading language={language}/> :
      query.isError ? <LoadError message={query.error instanceof Error ? query.error.message : t(language,"failed")} retry={()=>void reloadWorkbench()} language={language}/> :
      !matches ? <div role="status" className="rounded-xl border border-[#e6d9c4] bg-[#f8f1e5] px-4 py-3 text-sm text-[#806844]">{t(language,"stale")}</div> :
      <Workbench workbench={workbench!} language={language} page={applied.page} totalPages={totalPages} changePage={changePage}
        onRefresh={()=>void reloadWorkbench()} canManage={canManage} reasons={reason} setReasons={setReason}
        carrierIds={carrierIds} setCarrierIds={setCarrierIds} onPost={post} busy={mutation.isPending||refreshingFactId!==null}
        reviewRequired={reviewRequired} reviewReady={reviewReady} reviewedHashes={reviewedHashes} onReview={confirmFreshReview}/>}
  </section>;
}

function Workbench({ workbench, language, page, totalPages, changePage, onRefresh, canManage, reasons, setReasons, carrierIds, setCarrierIds, onPost, busy, reviewRequired, reviewReady, reviewedHashes, onReview }: {
  workbench: ShipmentCostWorkbench; language: string; page: number; totalPages: number; changePage: (page:number)=>void; onRefresh:()=>void; canManage:boolean;
  reasons:Record<number,string>;setReasons:(value:Record<number,string>)=>void;carrierIds:Record<number,string>;setCarrierIds:(value:Record<number,string>)=>void;
  onPost:(plan:ShipmentCostPlan)=>void;busy:boolean;reviewRequired:Record<number,boolean>;reviewReady:Record<number,boolean>;reviewedHashes:Record<number,string>;onReview:(plan:ShipmentCostPlan)=>void;
}) {
  return <section className="overflow-hidden rounded-2xl border border-[#e3ddd2] bg-[#fbfcf8]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8e3da] bg-[#f7f3ec] px-4 py-4 md:px-5">
      <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#897c68]">{workbench.company.name} · #{workbench.company.id} · {workbench.company.baseCurrency}</p><h3 className="font-display text-lg font-semibold text-[#494337]">{t(language,"results")}</h3></div>
      <div className="flex flex-wrap items-center gap-3"><span className="text-xs text-[#7a766c]">{t(language,"page")} {page} / {totalPages} · {workbench.pagination.totalRows} {t(language,"rows")}</span><Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={busy} className="border-[#d9cebd] bg-[#fbf8f1] text-[#67573f]"><RefreshCw className="me-2 h-3.5 w-3.5"/>{t(language,"refresh")}</Button></div>
    </div>
    <p className="border-b border-[#e8e3da] bg-[#fcfaf5] px-4 py-2 text-[11px] leading-5 text-[#807663]">{t(language,"amountNote")}</p>
    {!workbench.rows.length ? <Empty text={t(language,"empty")} language={language}/> :
      <div className="divide-y divide-[#ebe7df]">{workbench.rows.map(plan=><PlanRow key={plan.factId} plan={plan} language={language} canManage={canManage} reason={reasons[plan.factId]??""}
        carrierId={carrierIds[plan.factId]??""} onReason={value=>setReasons({...reasons,[plan.factId]:value})} onCarrierId={value=>setCarrierIds({...carrierIds,[plan.factId]:value})}
        onPost={()=>onPost(plan)} busy={busy} requiresReview={Boolean(reviewRequired[plan.factId])} reviewReady={Boolean(reviewReady[plan.factId])}
        reviewed={reviewedHashes[plan.factId]===plan.planHash} onReview={()=>onReview(plan)}/>)}</div>}
    {workbench.pagination.totalRows>0 && <div className="flex items-center justify-end gap-2 border-t border-[#e8e3da] px-4 py-3"><Button type="button" variant="outline" size="sm" onClick={()=>changePage(page-1)} disabled={page<=1||busy}>{t(language,"previous")}</Button><span className="px-1 text-xs tabular-nums text-[#687970]">{page} / {totalPages}</span><Button type="button" variant="outline" size="sm" onClick={()=>changePage(page+1)} disabled={page>=totalPages||busy}>{t(language,"next")}</Button></div>}
  </section>;
}

function PlanRow({plan,language,canManage,reason,carrierId,onReason,onCarrierId,onPost,busy,requiresReview,reviewReady,reviewed,onReview}:{
  plan:ShipmentCostPlan;language:string;canManage:boolean;reason:string;carrierId:string;onReason:(value:string)=>void;onCarrierId:(value:string)=>void;onPost:()=>void;busy:boolean;
  requiresReview:boolean;reviewReady:boolean;reviewed:boolean;onReview:()=>void;
}) {
  const internal = plan.costType === "INTERNAL_FLEET";
  const blocked = plan.blockers.length > 0 || plan.costType === null;
  const postable = canManage && plan.costType !== null && !blocked && !plan.posted && !busy && (!requiresReview || (reviewReady && reviewed)) && reason.trim().length >= 5
    && (internal || (Boolean(plan.carrierReference?.trim()) && Number.isInteger(Number(carrierId)) && Number(carrierId) > 0));
  return <article className="space-y-4 p-4 md:p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Fact label={t(language,"fact")} value={`#${plan.factId}`} mono/><Fact label={t(language,"orderRef")} value={`#${plan.orderId}`} mono/>
        <Fact label={t(language,"date")} value={plan.eventDate||"—"} mono/><Fact label={t(language,"type")} value={plan.costType===null?"—":t(language,internal?"internal":"external")}/>
        <Fact label={t(language,"source")} value={plan.sourceId} mono/><Fact label={t(language,"loadingSource")} value={plan.loadingSourceId??"—"} mono/>
      </div>
      <span className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-[.08em] ${plan.posted?"border-[#cbdccf] bg-[#edf4eb] text-[#42634e]":blocked?"border-[#e6d9c4] bg-[#f8f1e5] text-[#806844]":"border-[#dfd2bd] bg-[#f7f0e4] text-[#775d3d]"}`}>
        {plan.posted?t(language,"posted"):blocked?t(language,"blocked"):t(language,"clear")}
      </span>
    </div>
    <section className="rounded-xl border border-[#e5ded2] bg-[#faf8f2] p-3">
      <h4 className="mb-3 flex items-center gap-2 text-xs font-bold text-[#67583f]"><ArrowLeftRight className="h-4 w-4"/>{t(language,"nativeProvenance")}</h4>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Fact label={t(language,"carrierReference")} value={plan.carrierReference??"—"}/>
        <Fact label={t(language,"documentReference")} value={plan.costDocumentReference??"—"}/>
        <Fact label={t(language,"currency")} value={plan.currency??"—"} mono/>
        <Fact label={t(language,"amount")} value={plan.amount===null?"—":`${plan.amount} ${plan.currency??""}`} mono/>
        <Fact label={t(language,"decimals")} value={plan.decimals===null?"—":String(plan.decimals)} mono/>
      </div>
    </section>
    <section className="rounded-xl border border-[#dce4dd] bg-[#f3f7f1] p-3">
      <h4 className="mb-3 text-xs font-bold text-[#4e6856]">{t(language,"baseProvenance")}</h4>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Fact label={t(language,"baseAmount")} value={plan.baseAmount===null?"—":`${plan.baseAmount} ${plan.baseCurrency}`} mono/>
        <Fact label={t(language,"baseCurrency")} value={plan.baseCurrency} mono/>
        <Fact label={t(language,"rate")} value={plan.rate??"—"} mono/>
        <Fact label={t(language,"rateReference")} value={plan.rateReference??"—"}/>
        <Fact label={t(language,"rateDate")} value={plan.rateEffectiveOn??"—"} mono/>
        <Fact label={t(language,"center")} value={plan.fleetCostCenterId===null?"—":`#${plan.fleetCostCenterId}`} mono/>
      </div>
      {internal && <div className="mt-3 grid gap-3 rounded-lg border border-[#dce5d9] bg-[#f8faf5] p-3 sm:grid-cols-3">
        <Fact label={t(language,"internalBasis")} value={plan.fleetRate===null?"—":plan.fleetRate} mono/>
        <Fact label={t(language,"basis")} value={plan.fleetRateBasis??"—"}/>
        <Fact label={t(language,"quantity")} value={plan.quantity??"—"} mono/>
      </div>}
    </section>
    {blocked && <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#8a785e]">{t(language,"blockers")}</p><div className="flex flex-wrap gap-2">{plan.blockers.map(code=><span key={code} className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-2.5 py-1.5 text-xs text-[#806844]">{shipmentCostBlockerText(language,code)}</span>)}</div></div>}
    {plan.posted && <div role="status" className="rounded-lg border border-[#cbdccf] bg-[#edf4eb] px-3 py-2 text-xs text-[#42634e]">{t(language,"posted")} · {t(language,"journal")} <bdi dir="ltr">#{plan.posted.journalId}</bdi> · {plan.posted.reason}</div>}
    {plan.costType === null && <p className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-xs text-[#806844]">{t(language,"unknownType")}</p>}
    {requiresReview && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2">
      <p role="status" className="text-xs leading-5 text-[#806844]">{t(language,"reviewRequired")}</p>
      <Button type="button" size="sm" variant="outline" disabled={!reviewReady||busy} onClick={onReview} className="border-[#d9cebd] bg-[#fbf8f1] text-[#67573f]">{t(language,"reviewPlan")}</Button>
    </div>}
    {!plan.posted && <div className="grid gap-3 rounded-xl border border-[#e5ded2] bg-[#fbf9f4] p-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
      {!internal && <Field label={t(language,"carrierId")}><input inputMode="numeric" value={carrierId} onChange={event=>onCarrierId(event.target.value)} className={inputClass} disabled={!canManage||busy}/><span className="block pt-1 text-[10px] font-normal leading-4 text-[#827663]">{t(language,"carrierIdHelp")}</span></Field>}
      <Field label={t(language,"reason")}><input minLength={5} maxLength={500} value={reason} onChange={event=>onReason(event.target.value)} className={inputClass} disabled={!canManage||busy}/></Field>
      <Button type="button" disabled={!postable} onClick={onPost} className="bg-[#735b3e] text-[#fbf6ed] hover:bg-[#624b32]">{busy?t(language,"requesting"):t(language,"request")}</Button>
      {!blocked && canManage && (!reason.trim() || reason.trim().length < 5 || (!internal && (!Number.isInteger(Number(carrierId)) || Number(carrierId) <= 0 || !plan.carrierReference?.trim()))) &&
        <p className="text-[11px] leading-5 text-[#81745f] md:col-span-3">{!internal && !plan.carrierReference?.trim() ? t(language,"referenceRequired") : !internal && (!Number.isInteger(Number(carrierId)) || Number(carrierId) <= 0) ? t(language,"carrierRequired") : t(language,"reasonRequired")}</p>}
    </div>}
  </article>;
}

function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}
function Loading({language}:{language:string}) { return <div aria-label={t(language,"loading")} className="space-y-3"><Skeleton className="h-20 rounded-xl bg-[#e8ede7]"/><Skeleton className="h-44 rounded-xl bg-[#e8ede7]"/></div>; }
function LoadError({message,retry,language}:{message:string;retry:()=>void;language:string}) { return <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language,"failed")}</AlertTitle><AlertDescription className="mt-2 flex flex-wrap items-center gap-3"><span>{message}</span><Button type="button" variant="outline" size="sm" onClick={retry}>{t(language,"retry")}</Button></AlertDescription></Alert>; }
function Field({label,children}:{label:string;children:ReactNode}) { return <label className="block space-y-1.5 text-xs font-semibold text-[#53665d]"><span>{label}</span>{children}</label>; }
function Fact({label,value,mono=false}:{label:string;value:string;mono?:boolean}) { return <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#7b887f]">{label}</div><div dir={mono?"ltr":undefined} className={`mt-1 break-words text-xs text-[#344a44] ${mono?"font-mono tabular-nums":"font-medium"}`}>{value}</div></div>; }
function Empty({text,language}:{text:string;language:string}) { return <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-[#e0d6c5] bg-[#faf8f2] px-6 py-7 text-center"><Truck className="mb-3 h-5 w-5 text-[#806847]"/><p className="max-w-lg text-sm leading-6 text-[#687970]">{text}</p></div>; }
