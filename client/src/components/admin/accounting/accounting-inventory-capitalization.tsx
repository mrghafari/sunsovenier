import { useState, type ReactNode } from "react";
import type { CapitalizationPlan, CapitalizationWorkbench } from "@shared/accounting-inventory-capitalization";
import { capitalizationCommandSchema } from "@shared/accounting-inventory-capitalization";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInventoryCapitalizations, usePostInventoryCapitalization } from "./accounting-inventory-capitalization-api";
import { capitalizationBlockerText, capitalizationText as t } from "./accounting-inventory-capitalization-copy";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Archive, BadgeCheck, FileText, RefreshCw, ShieldAlert } from "lucide-react";

type Company = { id: number; name: string };
const inputClass = "h-10 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 text-sm text-[#29423f] outline-none focus:border-[#60877a] focus:ring-2 focus:ring-[#60877a]/15 disabled:opacity-60";
const rtlLanguages = ["fa", "ar", "ku", "tr"];

export default function AccountingInventoryCapitalization({ companies, canManage = false }: { companies: Company[]; canManage?: boolean }) {
  const { language } = useLanguage();
  const [selected, setSelected] = useState("");
  const [appliedCompanyId, setAppliedCompanyId] = useState<number>();
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [confirmations, setConfirmations] = useState<Record<number, boolean>>({});
  const [actionError, setActionError] = useState("");
  const [actionConflict, setActionConflict] = useState(false);
  const [success, setSuccess] = useState<{ companyId: number; documentId: number; journalId: number }>();
  const query = useInventoryCapitalizations(appliedCompanyId);
  const mutation = usePostInventoryCapitalization();
  const selectedCompany = companies.find(company => String(company.id) === selected);
  const scopeIsCurrent = Boolean(appliedCompanyId && selectedCompany?.id === appliedCompanyId);
  const result = query.data;
  const workbenchMatches = Boolean(scopeIsCurrent && result && result.companyId === appliedCompanyId
    && result.rows.every(row => row.companyId === appliedCompanyId && row.documentId > 0));

  const changeScope = (value: string) => {
    setSelected(value);
    setAppliedCompanyId(undefined);
    setActionError("");
    setActionConflict(false);
    setSuccess(undefined);
    setReasons({});
    setConfirmations({});
  };
  const apply = () => {
    const id = Number(selected);
    setActionError("");
    setActionConflict(false);
    setSuccess(undefined);
    if (!Number.isInteger(id) || !companies.some(company => company.id === id)) return;
    setReasons({});
    setConfirmations({});
    setAppliedCompanyId(id);
  };
  const post = async (plan: CapitalizationPlan) => {
    setActionError("");
    setActionConflict(false);
    setSuccess(undefined);
    const command = capitalizationCommandSchema.safeParse({
      companyId: appliedCompanyId,
      documentId: plan.documentId,
      expectedPlanHash: plan.planHash,
      reason: reasons[plan.documentId] ?? "",
    });
    if (!canManage || !scopeIsCurrent || !workbenchMatches || !result || result.companyId !== appliedCompanyId
      || plan.companyId !== appliedCompanyId || !plan.postingAllowed || plan.posted !== null || !command.success
      || !confirmations[plan.documentId]) {
      setActionError(!canManage ? t(language, "permission") : !command.success ? t(language, "noReason")
        : !confirmations[plan.documentId] ? t(language, "noConfirmation") : t(language, "requestFailed"));
      return;
    }
    if (!window.confirm(t(language, "confirm"))) return;
    try {
      const posted = await mutation.mutateAsync(command.data);
      if (selectedCompany?.id === appliedCompanyId) {
        setSuccess({ companyId: appliedCompanyId, documentId: plan.documentId, journalId: posted.journalId });
      }
      await query.refetch();
      setConfirmations(current => ({ ...current, [plan.documentId]: false }));
    } catch (error) {
      const err = error as Error & { code?: string; status?: number };
      const conflict = err.status === 409 || err.code === "CONFLICT";
      setActionConflict(conflict);
      setActionError(conflict ? t(language, "conflict") : (error instanceof Error ? error.message : t(language, "postError")));
    }
  };
  const visibleSuccess = success?.companyId === appliedCompanyId && scopeIsCurrent ? success : undefined;
  const errorMessage = query.error instanceof Error ? query.error.message : t(language, "failed");

  return <section dir={rtlLanguages.includes(language) ? "rtl" : "ltr"} className="space-y-4" data-testid="accounting-inventory-capitalization">
    <header className="overflow-hidden rounded-[22px] border border-[#dce3db] bg-[#fbfcf8] shadow-[0_14px_45px_-40px_rgba(29,57,50,.65)]">
      <div className="flex flex-wrap items-start justify-between gap-4 bg-[#f0f4ee] px-5 py-5 md:px-7">
        <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#20484a] text-[#f3f3e8]"><Archive className="h-5 w-5"/></span>
          <div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#829087]">MOMTAZCOM · INVENTORY VALUE</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.025em] text-[#273d3a]">{t(language,"title")}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#758179]">{t(language,"intro")}</p></div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-lg border border-[#d8dfd7] bg-[#fbfcf8] px-3 py-2 text-[10px] font-bold text-[#52665c]"><BadgeCheck className="h-4 w-4"/>{t(language,"docs")}</span>
      </div>
      <div role="note" className="flex gap-3 border-t border-[#dfb6a8] bg-[#f7e9e3] px-5 py-4 text-[#743e35] md:px-7"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0"/><p className="text-xs leading-5">{t(language,"warning")}</p></div>
    </header>
    <form onSubmit={event => { event.preventDefault(); apply(); }} className="grid gap-3 rounded-2xl border border-[#dfe6de] bg-[#fbfcf8] p-4 md:grid-cols-[1fr_auto] md:items-end md:p-5">
      <Field label={t(language,"scope")}><select aria-label={t(language,"scope")} value={selected} onChange={event => changeScope(event.target.value)} className={inputClass} data-testid="capitalization-company-select">
        <option value="">{t(language,"scope")}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name} · #{company.id}</option>)}
      </select></Field>
      <Button type="submit" disabled={!selectedCompany} className="bg-[#20484a] text-white hover:bg-[#2d5d5c]"><FileText className="me-2 h-4 w-4"/>{t(language,"apply")}</Button>
      {!companies.length && <p className="rounded-lg border border-dashed border-[#d7e0d7] bg-[#f7f9f5] p-3 text-sm text-[#66776e] md:col-span-2">{t(language,"noCompanies")}</p>}
    </form>
    {actionError && <Alert variant="destructive" role="alert"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language,"postError")}</AlertTitle><AlertDescription className="flex flex-wrap items-center gap-3">{actionError}{actionConflict && scopeIsCurrent && <Button type="button" variant="outline" size="sm" onClick={()=>void query.refetch()}>{t(language,"retry")}</Button>}</AlertDescription></Alert>}
    {visibleSuccess && <div role="status" className="rounded-lg border border-[#cbdccf] bg-[#edf4eb] px-4 py-3 text-sm text-[#42634e]">{t(language,"success")} · #{visibleSuccess.documentId} · {t(language,"journalRef")} #{visibleSuccess.journalId}</div>}
    {!companies.length ? <Empty text={t(language,"noCompanies")}/> :
      !selectedCompany || !appliedCompanyId ? <Empty text={t(language,"choose")}/> :
      !scopeIsCurrent ? <div role="status" className="rounded-xl border border-[#e6d9c4] bg-[#f8f1e5] px-4 py-3 text-sm text-[#806844]">{t(language,"stale")}</div> :
      query.isLoading ? <div aria-label={t(language,"loading")} className="space-y-3"><Skeleton className="h-20 rounded-xl bg-[#e8ede7]"/><Skeleton className="h-40 rounded-xl bg-[#e8ede7]"/></div> :
      query.isError ? <LoadError message={errorMessage} retry={() => void query.refetch()} language={language}/> :
      !workbenchMatches ? <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e6d9c4] bg-[#f8f1e5] px-4 py-3 text-sm text-[#806844]"><span>{t(language,"stale")}</span><Button type="button" variant="outline" size="sm" onClick={()=>void query.refetch()}>{t(language,"retry")}</Button></div> :
      <Workbench workbench={result!} language={language} canManage={canManage} reason={reasons} setReason={setReasons} confirmations={confirmations} setConfirmations={setConfirmations} onPost={post} busy={mutation.isPending}/>
    }
  </section>;
}

function Workbench({ workbench, language, canManage, reason, setReason, confirmations, setConfirmations, onPost, busy }: {
  workbench: CapitalizationWorkbench; language: string; canManage: boolean; reason: Record<number,string>; setReason:(value:Record<number,string>)=>void;
  confirmations:Record<number,boolean>;setConfirmations:(value:Record<number,boolean>)=>void;onPost:(plan:CapitalizationPlan)=>void;busy:boolean;
}) {
  return <section className="overflow-hidden rounded-2xl border border-[#dce4dc] bg-[#fbfcf8]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5eae3] bg-[#f3f7f0] px-4 py-4 md:px-5"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#829087]">{t(language,"scope")} · #{workbench.companyId}</p><h3 className="font-display text-lg font-semibold text-[#294540]">{t(language,"docs")}</h3></div><span className="text-xs text-[#7a887d]">{workbench.rows.length}</span></div>
    {!workbench.rows.length ? <Empty text={t(language,"empty")}/> : <div className="divide-y divide-[#e8ede6]">{workbench.rows.map(plan => <PlanCard key={`${plan.documentId}-${plan.planHash}`} plan={plan} language={language} canManage={canManage} reason={reason} setReason={setReason} confirmations={confirmations} setConfirmations={setConfirmations} onPost={onPost} busy={busy}/>)}</div>}
  </section>;
}

export function PlanCard({ plan, language, canManage, reason, setReason, confirmations, setConfirmations, onPost, busy }: {
  plan:CapitalizationPlan;language:string;canManage:boolean;reason:Record<number,string>;setReason:(value:Record<number,string>)=>void;
  confirmations:Record<number,boolean>;setConfirmations:(value:Record<number,boolean>)=>void;onPost:(plan:CapitalizationPlan)=>void;busy:boolean;
}) {
  const unknown = t(language,"unknown");
  const translatedKind = plan.kind === "purchase" ? t(language,"purchase") : t(language,"opening");
  return <article className="space-y-4 p-4 md:p-5" data-testid={`capitalization-plan-${plan.documentId}`}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="grid min-w-0 flex-1 gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
        <Fact label={t(language,"kind")} value={translatedKind}/><Fact label={t(language,"reference")} value={plan.reference || `#${plan.documentId}`} mono/>
        <Fact label={t(language,"date")} value={plan.documentDate || unknown} mono/><Fact label={t(language,"evidence")} value={plan.evidenceReference || unknown}/>
        <Fact label={t(language,"supplier")} value={plan.supplier || t(language,"noSupplier")}/>
        <Fact label={t(language,"currency")} value={plan.currency || unknown} mono/><Fact label={t(language,"baseCurrency")} value={plan.baseCurrency || unknown} mono/>
        <Fact label={t(language,"nativeTotal")} value={`${plan.nativeTotal} ${plan.currency}`} mono/><Fact label={t(language,"baseTotal")} value={plan.baseTotal === null ? unknown : `${plan.baseTotal} ${plan.baseCurrency}`} mono/>
      </div>
      <span className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-[.08em] ${plan.posted ? "border-[#cbdccf] bg-[#edf4eb] text-[#42634e]" : plan.postingAllowed ? "border-[#cbdccf] bg-[#edf4eb] text-[#42634e]" : "border-[#e6d9c4] bg-[#f8f1e5] text-[#806844]"}`}>{plan.posted ? t(language,"posted") : plan.postingAllowed ? t(language,"allowed") : t(language,"blocked")}</span>
    </div>
    <div className="grid gap-3 rounded-xl border border-[#dce7dc] bg-[#f3f7f0] p-3 md:grid-cols-2 xl:grid-cols-4">
      <Fact label={t(language,"rate")} value={plan.rate?.value ?? t(language,"noRate")} mono/>
      <Fact label={t(language,"rateDate")} value={plan.rate?.effectiveOn ?? t(language,"rateUnknown")} mono/>
      <Fact label={t(language,"rateSource")} value={plan.rate ? plan.rate.source === "base_currency" ? t(language,"baseCurrencyRate") : t(language,"centralBankRate") : t(language,"rateUnknown")}/>
      <Fact label={t(language,"stock")} value={plan.stockAccountId === null ? t(language,"noAccount") : `#${plan.stockAccountId}`} mono/>
      <Fact label={t(language,"counter")} value={plan.counterAccount ? `${plan.counterAccount.code} · ${plan.counterAccount.name} · ${plan.counterAccount.type} · #${plan.counterAccount.id}` : t(language,"noAccount")}/>
    </div>
    <div>
      <h4 className="mb-2 text-xs font-bold uppercase tracking-[.1em] text-[#758179]">{t(language,"lines")} · {plan.lines.length}</h4>
      {plan.lines.length ? <div className="overflow-x-auto rounded-xl border border-[#e1e7df]"><table className="w-full min-w-[760px] text-start text-xs"><thead className="bg-[#f0f4ee] text-[#6e7e74]"><tr>{(["product","batch","quantity","nativeCost","baseCost"] as const).map(key=><th key={key} className="px-3 py-2 font-semibold">{t(language,key)}</th>)}</tr></thead><tbody className="divide-y divide-[#e8ede6]">{plan.lines.map((line,index)=><tr key={`${line.lineIndex}-${line.productId}-${index}`}><td className="px-3 py-2 text-[#344a44]">{line.productName || `#${line.productId}`}</td><td className="px-3 py-2 font-mono">{line.batchReference || "—"}</td><td dir="ltr" className="px-3 py-2 font-mono tabular-nums">{line.quantityTons} t</td><td dir="ltr" className="px-3 py-2 font-mono tabular-nums">{line.nativeCost} {plan.currency}</td><td dir="ltr" className="px-3 py-2 font-mono tabular-nums">{line.baseCost === null ? unknown : `${line.baseCost} ${plan.baseCurrency}`}</td></tr>)}</tbody></table></div> : <p className="rounded-lg border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-3 py-2 text-xs text-[#758179]">{t(language,"noLines")}</p>}
    </div>
    {!!plan.blockers.length && <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#829087]">{t(language,"blockers")}</p><div className="flex flex-wrap gap-2">{plan.blockers.map(code=><span key={code} className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-2.5 py-1.5 text-xs text-[#806844]">{capitalizationBlockerText(language,code)}</span>)}</div></div>}
    {plan.posted ? <div className="rounded-lg border border-[#cbdccf] bg-[#edf4eb] px-3 py-3 text-xs text-[#42634e]">
      <p className="font-bold">{t(language,"posted")} · {t(language,"capitalizationRef")} #{plan.posted.id} · {t(language,"journalRef")} #{plan.posted.journalId}</p>
      <p className="mt-1">{t(language,"bookRefs")}: {plan.posted.bookIds.length ? plan.posted.bookIds.map(id=>`#${id}`).join(" · ") : "—"}</p>
      <p className="mt-1">{t(language,"postedReason")}: {plan.posted.reason}</p>
    </div> : <div className="grid gap-3 rounded-xl border border-[#dfe6de] bg-[#f8faf6] p-3 md:grid-cols-[1fr_auto] md:items-end">
      <div className="space-y-3"><Field label={t(language,"reason")}><textarea minLength={5} maxLength={500} value={reason[plan.documentId] ?? ""} onChange={event=>setReason({...reason,[plan.documentId]:event.target.value})} className={`${inputClass} min-h-20 py-2`} disabled={!canManage || !plan.postingAllowed} aria-describedby={`reason-help-${plan.documentId}`}/></Field>
        <p id={`reason-help-${plan.documentId}`} className="text-[11px] text-[#77867e]">{t(language,"reasonHelp")}</p>
        <label className="flex items-start gap-2 text-xs leading-5 text-[#52665c]"><input type="checkbox" checked={confirmations[plan.documentId] ?? false} onChange={event=>setConfirmations({...confirmations,[plan.documentId]:event.target.checked})} disabled={!canManage || !plan.postingAllowed} className="mt-1 accent-[#20484a]"/><span>{t(language,"confirm")}</span></label>
      </div>
      <Button type="button" disabled={!plan.postingAllowed || !canManage || busy || (reason[plan.documentId] ?? "").trim().length < 5 || (reason[plan.documentId] ?? "").trim().length > 500 || !confirmations[plan.documentId]} onClick={()=>onPost(plan)} className="bg-[#20484a] text-white hover:bg-[#2d5d5c]">{busy ? t(language,"posting") : t(language,"post")}</Button>
    </div>}
    {!canManage && !plan.posted && <p className="rounded-lg border border-[#e6d8b7] bg-[#f6f0df] px-3 py-2 text-xs text-[#695638]">{t(language,"permission")}</p>}
    {plan.posted && <p className="text-[11px] text-[#758179]">{t(language,"postedOnly")}</p>}
  </article>;
}

function Field({label,children}:{label:string;children:ReactNode}) { return <label className="block space-y-1.5 text-xs font-semibold text-[#53665d]"><span>{label}</span>{children}</label>; }
function Fact({label,value,mono=false}:{label:string;value:string;mono?:boolean}) { return <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#7b887f]">{label}</div><div dir={mono?"ltr":undefined} className={`mt-1 break-words text-xs text-[#344a44] ${mono?"font-mono tabular-nums":"font-medium"}`}>{value}</div></div>; }
function Empty({text}:{text:string}) { return <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-6 py-7 text-center"><Archive className="mb-3 h-5 w-5 text-[#547267]"/><p className="max-w-lg text-sm leading-6 text-[#687970]">{text}</p></div>; }
function LoadError({message,retry,language}:{message:string;retry:()=>void;language:string}) { return <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language,"failed")}</AlertTitle><AlertDescription className="mt-2 flex flex-wrap items-center gap-3"><span>{message}</span><Button type="button" variant="outline" size="sm" onClick={retry}><RefreshCw className="me-2 h-4 w-4"/>{t(language,"retry")}</Button></AlertDescription></Alert>; }
