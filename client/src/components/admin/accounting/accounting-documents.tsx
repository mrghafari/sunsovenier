import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { normalizeAccountingDigits } from "./accounting-logic";
import { useManualDocument, useManualDocumentAction, useManualDocumentMetadata, useManualDocuments, usePreviewManualDocument, useSaveManualDocument } from "@/lib/accounting-documents-api";
import type { ManualDocumentDetail, ManualDocumentInput, ManualDocumentMetadata, ManualDocumentRow, ManualDocumentStatus } from "@shared/accounting-documents";
import { accountLabel, documentCapabilities, documentSaveAllowed, equalDocumentAmounts, exactDocumentAmount, preserveExactDecimal, reversalDateAllowed, statusTone, validNonNegativeAmount, validPositiveAmount } from "./document-presentation";
import { documentCopy, type DocumentCopyKey } from "./document-copy";
import { AlertCircle, ArrowLeftRight, BookOpenCheck, Check, ClipboardCheck, FilePlus2, Plus, RefreshCw, RotateCcw, ShieldAlert, Trash2 } from "lucide-react";

type CompanyOption = { id:number; name:string };
type DraftLine = { accountId:string; debit:string; credit:string; costCenterId:string; description:string };
type DraftForm = { kind:"manual"|"expense"; entryDate:string; description:string; evidenceReference:string; lines:DraftLine[]; sourceId:string; id?:number; revision?:number };
const today = () => new Date().toISOString().slice(0,10);
const sourceId = () => `manual-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
const inputClass = "h-10 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 text-sm text-[#29423f] outline-none focus:border-[#60877a] focus:ring-2 focus:ring-[#60877a]/15 disabled:opacity-60";
const labelClass = "mb-1.5 block text-[11px] font-semibold text-[#607168]";
const emptyLine = ():DraftLine => ({ accountId:"", debit:"", credit:"", costCenterId:"", description:"" });
const initialForm = (kind:"manual"|"expense"):DraftForm => ({ kind, entryDate:today(), description:"", evidenceReference:"", lines:kind==="expense"?[emptyLine(),emptyLine()]:[emptyLine(),emptyLine()], sourceId:sourceId() });
const safeError = (error:unknown, fallback:string) => error instanceof Error ? error.message : fallback;
function amountValid(value:string,decimals:number) { return value.trim()==="" || validNonNegativeAmount(value,decimals); }
function statusLabel(language:string,status:ManualDocumentStatus) { return documentCopy(language,status as DocumentCopyKey); }
function nameOf(account:{nameFa:string|null;nameAr:string;nameEn:string},language:string) { return language==="fa" ? account.nameFa || account.nameEn : language==="ar" ? account.nameAr : account.nameEn; }
function eventActionLabel(action:string,language:string) { const value=action.toLowerCase();return value.includes("revers")?documentCopy(language,"reverse"):value.includes("discard")?documentCopy(language,"discard"):value.includes("post")?documentCopy(language,"post"):action; }

export function DocumentRegisterTable({items,language,selectedId,onSelect,currencyDecimals=2}:{items:ManualDocumentRow[];language:string;selectedId?:number;onSelect:(row:ManualDocumentRow)=>void;currencyDecimals?:number}) {
  const t=(key:DocumentCopyKey)=>documentCopy(language,key);
  return <div className="overflow-x-auto rounded-xl border border-[#e1e7df]">
    <table className="w-full min-w-[760px] text-start text-xs">
      <thead className="bg-[#f0f4ee] text-[10px] font-bold uppercase tracking-[.08em] text-[#6e7e74]"><tr><th className="px-3 py-3">{t("date")}</th><th className="px-3 py-3">{t("kind")}</th><th className="px-3 py-3">{t("description")}</th><th className="px-3 py-3">{t("evidence")}</th><th className="px-3 py-3">{t("amount")}</th><th className="px-3 py-3">{t("status")}</th></tr></thead>
      <tbody className="divide-y divide-[#e9ede7]">{items.map(row=><tr key={row.id} onClick={()=>onSelect(row)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onSelect(row);}}} tabIndex={0} aria-selected={selectedId===row.id} className={`cursor-pointer transition-colors hover:bg-[#f5f8f3] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#60877a] ${selectedId===row.id?"bg-[#eef3eb]":""}`}>
        <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] text-[#64756b]" dir="ltr">{row.entryDate}</td><td className="px-3 py-3"><span className="rounded-md bg-[#eaf0e8] px-2 py-1 text-[10px] font-semibold text-[#526c5b]">{t(row.kind)}</span></td>
        <td className="max-w-[240px] px-3 py-3"><div className="line-clamp-2 font-semibold text-[#344a44]">{row.description}</div><div className="mt-1 font-mono text-[10px] text-[#89958d]" dir="ltr">{row.sourceId}</div></td><td className="max-w-[170px] truncate px-3 py-3 text-[#718077]">{row.evidenceReference}</td>
        <td className="whitespace-nowrap px-3 py-3 font-mono font-semibold tabular-nums text-[#344a44]" dir="ltr">{exactDocumentAmount(row.debit,currencyDecimals) ?? "—"} <span className="text-[10px] font-normal">{row.currency}</span></td>
        <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusTone(row.status)}`}>{statusLabel(language,row.status)}</span></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export function DocumentDetailView({detail,language}:{detail:ManualDocumentDetail;language:string}) {
  const t=(key:DocumentCopyKey)=>documentCopy(language,key);
  const currency=detail.metadata.company.baseCurrency;
  const account=(id:number)=>detail.metadata.accounts.find(a=>a.id===id);
  const center=(id:number|null)=>detail.metadata.costCenters.find(c=>c.id===id);
  return <div className="space-y-4" data-testid="document-detail-view">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-mono text-[10px] text-[#819087]" dir="ltr">{detail.row.sourceId}</div><h3 className="mt-1 text-base font-semibold text-[#344a44]">{detail.row.description}</h3><p className="mt-1 text-xs text-[#718077]">{detail.row.entryDate} · {detail.row.evidenceReference}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusTone(detail.row.status)}`}>{t(detail.row.status)}</span></div>
    <div className="grid grid-cols-2 gap-2"><Meta label={t("amount")} value={`${exactDocumentAmount(detail.preview.debit,detail.metadata.currencyDecimals) ?? "—"} ${currency}`} /><Meta label={t("revision")} value={String(detail.row.revision)} /></div>
    <section className="overflow-hidden rounded-lg border border-[#e1e7df]"><div className="border-b border-[#e1e7df] bg-[#f0f4ee] px-3 py-2 text-xs font-semibold text-[#52665c]">{t("lines")} · {detail.document.lines.length}</div><div className="divide-y divide-[#e9ede7]">{detail.document.lines.map((line,i)=>{const a=account(line.accountId);const c=center(line.costCenterId);return <div key={`${line.accountId}-${i}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 p-3 text-xs"><div><div className="font-semibold text-[#344a44]">{a?accountLabel(a,language):`${t("inactiveAccount")} · #${line.accountId}`}</div><div className="mt-1 text-[10px] text-[#7b887f]">{c?`${c.code} · ${nameOf(c,language)}`:""}{line.description?` · ${line.description}`:""}</div></div><div className="space-y-1 text-end font-mono tabular-nums" dir="ltr"><div>{exactDocumentAmount(line.debit,detail.metadata.currencyDecimals) ?? "—"} <small>{currency}</small></div><div className="text-[#748178]">{exactDocumentAmount(line.credit,detail.metadata.currencyDecimals) ?? "—"} <small>{currency}</small></div></div></div>;})}</div></section>
    {detail.history.length>0&&<section><h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#52665c]"><ClipboardCheck className="h-4 w-4"/>{t("history")}</h4><div className="space-y-2">{detail.history.map(event=><div key={event.id} className="rounded-md bg-[#f2f5f0] px-3 py-2 text-[10px] text-[#718077]"><div className="flex justify-between gap-3"><span className="font-semibold text-[#52665c]">{eventActionLabel(event.action,language)} · {event.actorType}</span><span dir="ltr">{event.entryDate}</span></div><p className="mt-1">{event.reason}</p><div className="mt-1 flex flex-wrap justify-between gap-2"><span>{t("evidence")}: {event.evidenceReference}</span><span dir="ltr">{t("journal")}: {event.journalId===null?"—":`#${event.journalId}`}</span></div></div>)}</div></section>}
  </div>;
}

export default function AccountingDocuments({companies,canManage}:{companies:CompanyOption[];canManage:boolean}) {
  const {language,direction}=useLanguage();
  const t=(key:DocumentCopyKey)=>documentCopy(language,key);
  const [companyId,setCompanyId]=useState<number|undefined>(companies[0]?.id);
  const [kind,setKind]=useState("");
  const [status,setStatus]=useState("");
  const [q,setQ]=useState("");
  const [from,setFrom]=useState("");const [to,setTo]=useState("");
  const [applied,setApplied]=useState<{companyId:number;kind?:"manual"|"expense";status?:"draft"|"posted"|"discarded"|"reversed";q:string;from?:string;to?:string;page:number;pageSize:number}>();
  const [selectedId,setSelectedId]=useState<number>();
  const [formOpen,setFormOpen]=useState(false);
  const [form,setForm]=useState<DraftForm>(()=>initialForm("manual"));
  const [formError,setFormError]=useState("");const [uncertain,setUncertain]=useState(false);
  const [previewError,setPreviewError]=useState("");const [actionError,setActionError]=useState("");
  const [previewFingerprint,setPreviewFingerprint]=useState("");
  const [confirmAction,setConfirmAction]=useState<{action:"post"|"discard";row:ManualDocumentRow}|null>(null);
  const [reverseOpen,setReverseOpen]=useState(false);const [reverseDate,setReverseDate]=useState(today());const [reverseReason,setReverseReason]=useState("");const [reverseEvidence,setReverseEvidence]=useState("");const [attested,setAttested]=useState(false);
  const [reverseSnapshot,setReverseSnapshot]=useState<ManualDocumentDetail>();
  const metadataQuery=useManualDocumentMetadata(companyId);
  const metadata=metadataQuery.data?.company.id===companyId?metadataQuery.data:undefined;
  const saveAllowed=documentSaveAllowed(canManage,metadata,companyId);
  const listQuery=useManualDocuments(applied);
  const list=listQuery.data?.metadata.company.id===applied?.companyId?listQuery.data:undefined;
  const detailQuery=useManualDocument(applied?.companyId,selectedId);
  const loadedDetail=detailQuery.data;
  const detail=loadedDetail&&loadedDetail.row.companyId===applied?.companyId&&loadedDetail.metadata.company.id===applied?.companyId?loadedDetail:undefined;
  const previewMutation=usePreviewManualDocument();const saveMutation=useSaveManualDocument();const actionMutation=useManualDocumentAction();
  const pending=saveMutation.isPending||actionMutation.isPending;
  const formBusy=pending||previewMutation.isPending;
  const safeAccounts=metadata?.accounts??[];
  const expenseAccounts=safeAccounts.filter(a=>a.type==="expense");const fundingAccounts=safeAccounts.filter(a=>a.funding);
  const companyName=companies.find(c=>c.id===companyId)?.name;
  const hasDatePair=Boolean(from)===Boolean(to);
  useEffect(()=>{if(!companies.some(c=>c.id===companyId))setCompanyId(companies[0]?.id);},[companies,companyId]);
  useEffect(()=>{setSelectedId(undefined);setFormOpen(false);setReverseOpen(false);setConfirmAction(null);setReverseSnapshot(undefined);setForm(initialForm("manual"));setFormError("");setActionError("");setPreviewError("");setUncertain(false);setApplied(undefined);},[companyId]);
  useEffect(()=>{if(companyId&&companies.some(c=>c.id===companyId))setApplied(old=>old?.companyId===companyId?old:{companyId,page:1,pageSize:50,q:""});},[companyId,companies]);
  useEffect(()=>{if(detailQuery.data&&detailQuery.data.row.companyId!==applied?.companyId)setSelectedId(undefined);},[detailQuery.data,applied?.companyId]);
  const shownItems=useMemo(()=>list?.items??[],[list]);
  const moneyValid=form.lines.every(l=>amountValid(l.debit,metadata?.currencyDecimals??2)&&amountValid(l.credit,metadata?.currencyDecimals??2));
  const createNew=(newKind:"manual"|"expense")=>{if(!saveAllowed||uncertain)return;setForm(initialForm(newKind));setFormOpen(true);setFormError("");setUncertain(false);setPreviewError("");};
  const selectCompany=(id:number|undefined)=>{setCompanyId(id);setApplied(id?{companyId:id,page:1,pageSize:50,q:""}:undefined);setSelectedId(undefined);setFormOpen(false);setReverseOpen(false);setConfirmAction(null);setReverseSnapshot(undefined);setForm(initialForm("manual"));setFormError("");setActionError("");setPreviewError("");setPreviewFingerprint("");setUncertain(false);};
  const apply=()=>{if(!companyId||!hasDatePair||from&&to&&from>to)return;setApplied({companyId,page:1,pageSize:50,q:q.trim(),...(kind?{kind:kind as "manual"|"expense"}:{}),...(status?{status:status as "draft"|"posted"|"discarded"|"reversed"}:{}),...(from&&to?{from,to}:{})});setSelectedId(undefined);};
  const loadDraft=(d:ManualDocumentDetail)=>{if(!saveAllowed||d.row.status!=="draft"||d.row.companyId!==companyId)return;setForm({kind:d.row.kind,entryDate:d.document.entryDate,description:d.document.description,evidenceReference:d.document.evidenceReference,sourceId:d.document.sourceId,id:d.row.id,revision:d.row.revision,lines:d.document.lines.map(l=>({accountId:String(l.accountId),debit:l.debit,credit:l.credit,costCenterId:l.costCenterId?String(l.costCenterId):"",description:l.description}))});setFormOpen(true);setFormError("");setUncertain(false);};
  const updateLine=(index:number,key:keyof DraftLine,value:string)=>setForm(old=>({...old,lines:old.lines.map((line,i)=>i===index?{...line,[key]:value}:line)}));
  const structurallyValid=()=>{
    if(!form.sourceId||form.description.trim().length<5||form.evidenceReference.trim().length<5||!form.entryDate||form.lines.length<(form.kind==="expense"?2:2)||form.lines.length>(form.kind==="expense"?2:100))return false;
    if(form.kind==="expense"&&(form.lines.length!==2||!equalDocumentAmounts(form.lines[0].debit,form.lines[1].credit)))return false;
    return form.lines.every(line=>{
      const debit=normalizeAccountingDigits(line.debit.trim()),credit=normalizeAccountingDigits(line.credit.trim());
      if(!line.accountId||!amountValid(debit,metadata?.currencyDecimals??2)||!amountValid(credit,metadata?.currencyDecimals??2))return false;
      const d=debit?validPositiveAmount(debit):false,c=credit?validPositiveAmount(credit):false;
      if(d===c)return false;
      if(form.kind==="expense"&&line===form.lines[0])return expenseAccounts.some(a=>a.id===Number(line.accountId))&&Boolean(line.costCenterId)&&d;
      if(form.kind==="expense")return fundingAccounts.some(a=>a.id===Number(line.accountId))&&!line.costCenterId&&c;
      return true;
    });
  };
  const toInput=():ManualDocumentInput=>({companyId:companyId!,sourceId:form.sourceId,kind:form.kind,entryDate:form.entryDate,description:form.description.trim(),evidenceReference:form.evidenceReference.trim(),lines:form.lines.map(l=>({accountId:Number(l.accountId),debit:normalizeAccountingDigits(l.debit.trim()||"0"),credit:normalizeAccountingDigits(l.credit.trim()||"0"),costCenterId:l.costCenterId?Number(l.costCenterId):null,description:l.description.trim()}))});
  const submit=async(e:FormEvent)=>{e.preventDefault();setFormError("");if(!saveAllowed||!metadata||metadata.company.id!==companyId||pending)return;if(!structurallyValid()){setFormError(t("required"));return;}try{const payload=toInput();await saveMutation.mutateAsync({document:payload,...(form.id&&form.revision?{id:form.id,revision:form.revision}:{})});setFormOpen(false);setUncertain(false);setApplied(old=>old?{...old,page:1}:old);setSelectedId(undefined);}catch(error){setFormError(safeError(error,t("serverError")));setUncertain(true);}};
  const preview=async()=>{setPreviewError("");if(!metadata||metadata.company.id!==companyId||!structurallyValid()){setPreviewError(t("required"));return;}try{const payload=toInput();const fingerprint=JSON.stringify(payload);await previewMutation.mutateAsync(payload);setPreviewFingerprint(fingerprint);}catch(error){setPreviewError(safeError(error,t("previewError")));}};
  const runAction=async(action:"post"|"discard"|"reverse",row:ManualDocumentRow,extra?:{entryDate:string;reason:string;evidenceReference:string})=>{
    const frozenCompany=row.companyId, frozenId=row.id, frozenRevision=row.revision;
    if(!canManage||!metadata||metadata.company.id!==frozenCompany||applied?.companyId!==frozenCompany||pending)return;
    if(action!=="discard"&&!metadata.postingReady)return;
    if(action==="discard"&&row.status!=="draft")return;
    if(action==="post"&&(row.status!=="draft"||!detail||!detail.preview.balanced||!detail.preview.periodOpen||detail.row.id!==frozenId))return;
    if(action==="reverse"&&(row.status!=="posted"||!extra||!reverseSnapshot||reverseSnapshot.row.id!==frozenId||reverseSnapshot.row.companyId!==frozenCompany||!reverseSnapshot.preview.balanced||!reversalDateAllowed(reverseSnapshot,metadata,extra.entryDate)))return;
    setActionError("");
    const input=action==="reverse"?{companyId:frozenCompany,revision:frozenRevision,attested:true as const,...extra}:{companyId:frozenCompany,revision:frozenRevision,attested:true as const};
    try{await actionMutation.mutateAsync({id:frozenId,action,input});setReverseOpen(false);setConfirmAction(null);setReverseSnapshot(undefined);setSelectedId(undefined);setApplied(old=>old?{...old,page:old.page}:old);}
    catch(error){setActionError(safeError(error,t("serverError")));}
  };
  const startReverse=()=>{if(!detail||!capabilities.reverse)return;setReverseSnapshot(detail);setReverseDate(today());setReverseReason("");setReverseEvidence("");setAttested(false);setActionError("");setReverseOpen(true);};
  const submitReverse=async(e:FormEvent)=>{e.preventDefault();if(!reverseSnapshot||!attested||reverseReason.trim().length<5||reverseEvidence.trim().length<5)return;if(!reversePeriodOpen){setActionError(t("periodClosed"));return;}await runAction("reverse",reverseSnapshot.row,{entryDate:reverseDate,reason:reverseReason.trim(),evidenceReference:reverseEvidence.trim()});};
  const selectedOpen=(row:ManualDocumentRow)=>{if(pending||confirmAction||reverseOpen)return;setSelectedId(row.id);setActionError("");};
  const previewData=previewFingerprint===JSON.stringify(metadata?.company.id===companyId?toInput():null)?previewMutation.data:undefined;
  const gatesOk=Boolean(detail?.preview.balanced&&detail.preview.periodOpen);
  const capabilities=documentCapabilities(canManage,detail,metadata);
  const reversePeriodOpen=reversalDateAllowed(reverseSnapshot,metadata,reverseDate);
  const tDirection=direction;

  return <section dir={tDirection} className="min-w-0">
    <div className="overflow-hidden rounded-[22px] border border-[#dce2db] bg-[#fbfcf8] shadow-[0_14px_45px_-40px_rgba(29,57,50,.65)]">
      <header className="border-b border-[#e5e9e2] bg-[#f0f4ee] p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#829087]"><span>MOMTAZCOM · FINANCE</span><span className="h-px w-6 bg-[#d6b66e]"/></div><h2 className="font-display text-2xl font-semibold tracking-[-.025em] text-[#273d3a]">{t("title")}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#758179]">{t("intro")}</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>createNew("manual")} disabled={!saveAllowed||uncertain||pending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#20484a] px-4 text-sm font-semibold text-[#f4f2e7] transition-colors hover:bg-[#2d5d5c] disabled:opacity-50"><FilePlus2 className="h-4 w-4"/>{t("newManual")}</button><button type="button" onClick={()=>createNew("expense")} disabled={!saveAllowed||uncertain||pending} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd8ce] bg-[#f9faf6] px-4 text-sm font-semibold text-[#365750] hover:bg-[#eaf0e9] disabled:opacity-50"><Plus className="h-4 w-4"/>{t("newExpense")}</button></div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <label><span className={labelClass}>{t("company")}</span><select className={inputClass} disabled={formBusy||Boolean(confirmAction)||reverseOpen} value={companyId??""} onChange={e=>selectCompany(e.target.value?Number(e.target.value):undefined)}><option value="">{t("company")}</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <Meta label={t("metadata")} value={metadata?metadata.postingReady?t("ready"):t("notReady"):metadataQuery.isLoading?t("loading"):t("notReady")} good={Boolean(metadata?.postingReady)}/>
          <Meta label={t("company")} value={metadata&&metadata.company.id===companyId?`${metadata.company.name} · ${metadata.company.baseCurrency}`:companyName??t("noCompany")}/>
          <Meta label={t("period")} value={metadata?.fiscalPeriods.length?metadata.fiscalPeriods.map(p=>`${p.name} · ${p.status==="open"?t("periodOpen"):p.status==="closed"?t("periodClosed"):p.status}`).join(" / "):"—"}/>
        </div>
        {!canManage&&<Notice icon={<ShieldAlert className="h-4 w-4"/>}>{t("viewer")}</Notice>}
        {metadata&&!metadata.postingReady&&<Notice icon={<ShieldAlert className="h-4 w-4"/>}>{t("draftNote")}</Notice>}
        <Notice icon={<ShieldAlert className="h-4 w-4"/>}>{t("scope")}</Notice><Notice>{t("baseOnly")}</Notice>
        {metadata&&(!metadata.company.isActive||!metadata.currencyActive)&&<Notice icon={<ShieldAlert className="h-4 w-4"/>}>{t("inactiveScope")}</Notice>}
      </header>
      <div className="space-y-4 p-4 md:p-6">
        <form onSubmit={e=>{e.preventDefault();apply();}} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <fieldset disabled={pending||Boolean(confirmAction)||reverseOpen} className="contents">
          <label><span className={labelClass}>{t("kind")}</span><select className={inputClass} value={kind} onChange={e=>setKind(e.target.value)}><option value="">{t("kind")}</option><option value="manual">{t("manual")}</option><option value="expense">{t("expense")}</option></select></label>
          <label><span className={labelClass}>{t("status")}</span><select className={inputClass} value={status} onChange={e=>setStatus(e.target.value)}><option value="">{t("status")}</option>{(["draft","posted","discarded","reversed"] as const).map(s=><option key={s} value={s}>{t(s)}</option>)}</select></label>
          <label className="sm:col-span-2"><span className={labelClass}>{t("search")}</span><input className={inputClass} value={q} onChange={e=>setQ(e.target.value)} /></label>
          <label><span className={labelClass}>{t("from")}</span><input className={inputClass} type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label><span className={labelClass}>{t("to")}</span><input className={inputClass} type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
          <div className="flex items-end"><button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#20484a] px-3 text-xs font-semibold text-white hover:bg-[#2d5d5c] disabled:opacity-50" disabled={!companyId||!hasDatePair}><RefreshCw className="h-4 w-4"/>{t("apply")}</button></div>
          </fieldset>
        </form>
        {!hasDatePair&&<Notice>{t("required")}</Notice>}
        {uncertain&&!formOpen&&<Notice icon={<ShieldAlert className="h-4 w-4"/>}>{t("uncertain")}<button type="button" onClick={()=>setFormOpen(true)} className="ms-2 font-bold underline">{t("edit")}</button></Notice>}
        {metadataQuery.isLoading&&<Loading/>}
        {metadataQuery.isError&&<InlineError message={safeError(metadataQuery.error,t("failed"))} retry={t("retry")} onRetry={()=>metadataQuery.refetch()}/>}
        {listQuery.isLoading&&applied&&<Loading/>}
        {listQuery.isError&&<InlineError message={safeError(listQuery.error,t("failed"))} retry={t("retry")} onRetry={()=>listQuery.refetch()}/>}
        {list&&<div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.8fr)]">
          <div className="min-w-0 space-y-3"><div className="flex items-center justify-between rounded-lg bg-[#f3f6f1] px-3 py-2"><span className="text-xs font-semibold text-[#4d6359]">{t("summary")}</span><span className="font-mono text-[10px] text-[#7b887f]">{list.totalRows} {t("rows")}</span></div>
            {shownItems.length?<DocumentRegisterTable items={shownItems} language={language} selectedId={selectedId} onSelect={selectedOpen} currencyDecimals={list.metadata.currencyDecimals}/>:<Empty title={t("empty")} detail={t("emptyHelp")}/>}
            <div className="flex justify-end text-[10px] text-[#718077]"><div className="flex gap-2"><button type="button" disabled={pending||Boolean(confirmAction)||reverseOpen||list.page<=1} onClick={()=>setApplied(old=>old?{...old,page:old.page-1}:old)} className="rounded-md border border-[#d6dfd6] px-3 py-1.5 disabled:opacity-40">‹</button><button type="button" disabled={pending||Boolean(confirmAction)||reverseOpen||list.page*list.pageSize>=list.totalRows} onClick={()=>setApplied(old=>old?{...old,page:old.page+1}:old)} className="rounded-md border border-[#d6dfd6] px-3 py-1.5 disabled:opacity-40">›</button></div></div>
          </div>
          <aside className="min-w-0 rounded-xl border border-[#e1e7df] bg-[#f7f9f5] p-4 md:p-5">
            {!selectedId?<Empty icon={<BookOpenCheck className="h-5 w-5"/>} title={t("detail")} detail={t("selectDetail")}/>:detailQuery.isLoading?<Loading/>:detailQuery.isError?<InlineError message={safeError(detailQuery.error,t("failed"))} retry={t("retry")} onRetry={()=>detailQuery.refetch()}/>:detail?<><DocumentDetailView detail={detail} language={language}/>
              {actionError&&<div role="alert" className="mt-3 rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-xs text-[#883f37]">{actionError}</div>}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[#e1e7df] pt-4">
                {capabilities.edit&&<><button type="button" onClick={()=>loadDraft(detail)} disabled={!saveAllowed||pending||Boolean(confirmAction)||reverseOpen} className="rounded-lg border border-[#d6dfd6] px-3 py-2 text-xs font-semibold text-[#365750] disabled:opacity-50">{t("edit")}</button><button type="button" onClick={()=>{setActionError("");setConfirmAction({action:"discard",row:detail.row});}} disabled={pending||Boolean(confirmAction)||reverseOpen||!capabilities.discard} className="inline-flex items-center gap-1 rounded-lg border border-[#ead8d1] px-3 py-2 text-xs font-semibold text-[#88564a] disabled:opacity-50"><Trash2 className="h-3.5 w-3.5"/>{t("discard")}</button><button type="button" onClick={()=>{setActionError("");setConfirmAction({action:"post",row:detail.row});}} disabled={pending||Boolean(confirmAction)||reverseOpen||!capabilities.post} className="inline-flex items-center gap-1 rounded-lg bg-[#20484a] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><Check className="h-3.5 w-3.5"/>{t("post")}</button></>}
                {capabilities.reverse&&<button type="button" onClick={startReverse} disabled={pending||!capabilities.reverse} className="inline-flex items-center gap-1 rounded-lg border border-[#d6dfd6] px-3 py-2 text-xs font-semibold text-[#365750] disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5"/>{t("reverse")}</button>}
              </div>
              {detail.row.status==="draft"&&!gatesOk&&<Notice icon={<ShieldAlert className="h-4 w-4"/>}>{!detail.preview.balanced?t("unbalanced"):t("periodClosed")}</Notice>}
            </>:null}
          </aside>
        </div>}
        {!applied&&(!metadataQuery.isLoading)&&<Empty title={t("noCompany")} detail={t("noCompany")}/>}
      </div>
    </div>

      <Dialog open={formOpen} onOpenChange={open=>{if(!formBusy){setFormOpen(open);if(!open){setFormError("");setPreviewError("");}}}}>
      <DialogContent dir={direction} className="max-h-[94dvh] max-w-5xl overflow-y-auto border-[#dce3db] bg-[#fbfcf8] p-0 text-[#203735]">
        <div className="border-b border-[#e3e8e1] bg-[#f0f4ee] px-5 py-4 md:px-7"><DialogHeader><DialogTitle className="font-display text-xl text-[#273d3a]">{form.id?t("edit"):t(form.kind)}</DialogTitle><DialogDescription className="text-xs text-[#718077]">{form.kind==="expense"?t("expenseRules"):t("manualLines")}</DialogDescription></DialogHeader></div>
        <form onSubmit={submit} className="space-y-5 p-4 md:p-6">
          <fieldset disabled={formBusy} className="space-y-4">
            <Notice>{t("baseOnly")} · {metadata?.company.baseCurrency ?? ""}</Notice>
            {form.kind==="expense"&&<Notice icon={<ShieldAlert className="h-4 w-4"/>}>{t("scope")}<div className="mt-1">{t("expenseRules")}</div></Notice>}
            <div className="grid gap-3 sm:grid-cols-2"><Field label={t("dateLabel")}><input required type="date" className={inputClass} value={form.entryDate} onChange={e=>setForm({...form,entryDate:e.target.value})}/></Field><Field label={t("source")}><input readOnly className={`${inputClass} font-mono text-xs`} dir="ltr" value={form.sourceId}/></Field><Field label={t("descriptionLabel")}><input required minLength={5} maxLength={2000} className={inputClass} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></Field><Field label={t("evidenceLabel")}><input required minLength={5} maxLength={500} className={inputClass} value={form.evidenceReference} onChange={e=>setForm({...form,evidenceReference:e.target.value})}/></Field></div>
            <div className="overflow-x-auto rounded-xl border border-[#e1e7df]"><table className="w-full min-w-[920px] text-xs"><thead className="bg-[#f0f4ee] text-[10px] font-bold uppercase text-[#6e7e74]"><tr><th className="px-3 py-2 text-start">{t("account")}</th><th className="px-3 py-2 text-start">{t("debit")}</th><th className="px-3 py-2 text-start">{t("credit")}</th><th className="px-3 py-2 text-start">{t("center")}</th><th className="px-3 py-2 text-start">{t("lineMemo")}</th>{form.kind==="manual"&&<th/>}</tr></thead><tbody className="divide-y divide-[#e9ede7]">{form.lines.map((line,i)=>{const allowed=form.kind==="manual"?safeAccounts:i===0?expenseAccounts:fundingAccounts;return <tr key={i} className="align-top"><td className="p-2"><select required aria-label={`${t("account")} ${i+1}`} className={`${inputClass} min-w-[200px]`} value={line.accountId} onChange={e=>updateLine(i,"accountId",e.target.value)}><option value="">{t("choose")}</option>{allowed.map(a=><option key={a.id} value={a.id}>{accountLabel(a,language)} · {a.type}</option>)}</select></td><td className="p-2"><input aria-label={t("debit")} inputMode="decimal" className={`${inputClass} min-w-[130px] font-mono`} placeholder="0" value={line.debit} onChange={e=>updateLine(i,"debit",e.target.value)}/></td><td className="p-2"><input aria-label={t("credit")} inputMode="decimal" className={`${inputClass} min-w-[130px] font-mono`} placeholder="0" value={line.credit} onChange={e=>updateLine(i,"credit",e.target.value)}/></td><td className="p-2"><select aria-label={t("center")} required={form.kind==="expense"&&i===0} disabled={form.kind==="expense"&&i===1} className={`${inputClass} min-w-[150px]`} value={line.costCenterId} onChange={e=>updateLine(i,"costCenterId",e.target.value)}><option value="">{t("choose")}</option>{metadata?.costCenters.map(c=><option key={c.id} value={c.id}>{c.code} · {nameOf(c,language)}</option>)}</select></td><td className="p-2"><input className={`${inputClass} min-w-[140px]`} value={line.description} onChange={e=>updateLine(i,"description",e.target.value)}/></td>{form.kind==="manual"&&<td className="p-2">{form.lines.length>2&&<button type="button" aria-label={t("remove")} onClick={()=>setForm(old=>({...old,lines:old.lines.filter((_,n)=>n!==i)}))} className="rounded-md p-2 text-[#88564a] hover:bg-[#f2e5e0]"><Trash2 className="h-4 w-4"/></button>}</td>}</tr>;})}</tbody></table></div>
            {form.kind==="manual"&&<button type="button" onClick={()=>setForm(old=>old.lines.length<100?{...old,lines:[...old.lines,emptyLine()]}:old)} disabled={form.lines.length>=100} className="inline-flex items-center gap-2 rounded-lg border border-[#d6dfd6] px-3 py-2 text-xs font-semibold text-[#365750] disabled:opacity-40"><Plus className="h-4 w-4"/>{t("addLine")} · {form.lines.length}/100</button>}
            {safeAccounts.length===0&&<Notice>{t("noAccounts")}</Notice>}
            {!moneyValid&&<div role="alert" className="text-xs text-[#a2473c]">{t("malformed")}</div>}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e1e7df] bg-[#f5f7f3] p-3"><button type="button" onClick={preview} disabled={previewMutation.isPending||pending||!structurallyValid()} className="inline-flex items-center gap-2 rounded-lg border border-[#d6dfd6] bg-white px-3 py-2 text-xs font-semibold text-[#365750] disabled:opacity-40"><ArrowLeftRight className="h-4 w-4"/>{t("preview")}</button>
              {previewMutation.isPending&&<div className="h-5 w-32 animate-pulse rounded bg-[#e4eae2]"/>}
              {previewData&&<div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] tabular-nums" dir="ltr"><span>{t("debit")}: {preserveExactDecimal(previewData.debit)??"—"}</span><span>{t("credit")}: {preserveExactDecimal(previewData.credit)??"—"}</span><span>{t("difference")}: {preserveExactDecimal(previewData.difference)??"—"}</span><strong className={previewData.balanced?"text-[#426a4e]":"text-[#9b493d]"}>{previewData.balanced?t("balanced"):t("unbalanced")}</strong></div>}
            </div>
            {previewError&&<div role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-xs text-[#883f37]">{previewError}</div>}
            {metadata?.fiscalPeriods.some(p=>form.entryDate>=p.startsOn&&form.entryDate<=p.endsOn&&p.status==="closed")&&<Notice>{t("closedSave")}</Notice>}
            {uncertain&&<Notice icon={<ShieldAlert className="h-4 w-4"/>}>{t("uncertain")}</Notice>}
            {formError&&<div role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-xs text-[#883f37]">{formError}</div>}
          </fieldset>
          <footer className="flex flex-wrap justify-end gap-2 border-t border-[#e5e9e2] pt-4"><button type="button" disabled={formBusy} onClick={()=>setFormOpen(false)} className="rounded-lg border border-[#d6dfd6] px-4 py-2 text-xs font-semibold text-[#52665c] disabled:opacity-50">{t("close")}</button><button type="submit" disabled={formBusy||!saveAllowed||metadata?.company.id!==companyId} className="inline-flex items-center gap-2 rounded-lg bg-[#20484a] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{pending?<RefreshCw className="h-4 w-4 animate-spin"/>:<Check className="h-4 w-4"/>}{t("save")}</button></footer>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(confirmAction)} onOpenChange={open=>{if(!pending&&!open){setConfirmAction(null);setActionError("");}}}>
      <DialogContent dir={direction} className="max-w-lg border-[#dce3db] bg-[#fbfcf8] text-[#203735]">
        <DialogHeader><DialogTitle>{confirmAction?.action==="discard"?t("discard"):t("confirmPost")}</DialogTitle><DialogDescription>{confirmAction?.action==="discard"?t("confirmDiscard"):t("confirmPost")}</DialogDescription></DialogHeader>
        {confirmAction&&<div className="rounded-lg border border-[#e1e7df] bg-[#f5f7f3] px-3 py-2 font-mono text-[11px] text-[#52665c]" dir="ltr"><div>{confirmAction.row.sourceId}</div><div className="mt-1">{t("revision")} #{confirmAction.row.revision} · #{confirmAction.row.id}</div></div>}
        {actionError&&<div role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-xs text-[#883f37]">{actionError}</div>}
        <div className="flex justify-end gap-2"><button type="button" onClick={()=>setConfirmAction(null)} disabled={pending} className="rounded-lg border border-[#d6dfd6] px-4 py-2 text-xs">{t("cancel")}</button><button type="button" onClick={()=>confirmAction&&runAction(confirmAction.action,confirmAction.row)} disabled={pending||!confirmAction} className="rounded-lg bg-[#20484a] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{pending?<RefreshCw className="inline h-4 w-4 animate-spin"/>:confirmAction?.action==="discard"?t("discard"):t("post")}</button></div>
      </DialogContent>
    </Dialog>
    <Dialog open={reverseOpen} onOpenChange={open=>{if(!pending){setReverseOpen(open);if(!open)setReverseSnapshot(undefined);}}}>
      <DialogContent dir={direction} className="max-w-xl border-[#dce3db] bg-[#fbfcf8] text-[#203735]"><DialogHeader><DialogTitle>{t("reverseTitle")}</DialogTitle><DialogDescription>{t("reverseHelp")}</DialogDescription></DialogHeader>
        {reverseSnapshot&&<div className="rounded-lg border border-[#e1e7df] bg-[#f5f7f3] px-3 py-2 font-mono text-[11px] text-[#52665c]" dir="ltr">{reverseSnapshot.row.sourceId} · {t("revision")} #{reverseSnapshot.row.revision} · #{reverseSnapshot.row.id}</div>}
        <form onSubmit={submitReverse} className="space-y-4"><fieldset disabled={pending} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Field label={t("reverseDate")}><input required type="date" className={inputClass} value={reverseDate} onChange={e=>setReverseDate(e.target.value)}/></Field><Field label={t("evidenceLabel")}><input required minLength={5} className={inputClass} value={reverseEvidence} onChange={e=>setReverseEvidence(e.target.value)}/></Field><Field label={t("reverseReason")}><textarea required minLength={5} className="min-h-20 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 py-2 text-sm" value={reverseReason} onChange={e=>setReverseReason(e.target.value)}/></Field></div>{!reversePeriodOpen&&<Notice>{t("periodClosed")}</Notice>}<label className="flex items-start gap-2 text-xs text-[#52665c]"><input type="checkbox" checked={attested} onChange={e=>setAttested(e.target.checked)} className="mt-0.5 accent-[#20484a]"/>{t("attest")}</label>{actionError&&<div role="alert" className="text-xs text-[#883f37]">{actionError}</div>}<div className="flex justify-end gap-2"><button type="button" onClick={()=>{setReverseOpen(false);setReverseSnapshot(undefined);}} disabled={pending} className="rounded-lg border border-[#d6dfd6] px-4 py-2 text-xs">{t("cancel")}</button><button type="submit" disabled={pending||!attested||!reversePeriodOpen} className="rounded-lg bg-[#20484a] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{t("submitReverse")}</button></div></fieldset></form>
      </DialogContent>
    </Dialog>
  </section>;
}

function Field({label,children}:{label:string;children:ReactNode}) { return <label className="block min-w-0"><span className={labelClass}>{label}</span>{children}</label>; }
function Meta({label,value,good}:{label:string;value:string;good?:boolean}) { return <div className="rounded-lg border border-[#dce4da] bg-[#f8faf6] px-3 py-2"><div className="text-[9px] font-bold uppercase tracking-wide text-[#829087]">{label}</div><div className={`mt-1 truncate text-xs font-semibold ${good===false?"text-[#80663a]":"text-[#3f6751]"}`}>{value}</div></div>; }
function Notice({children,icon}:{children:ReactNode;icon?:ReactNode}) { return <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2.5 text-xs leading-5 text-[#806844]">{icon&&<span className="mt-0.5 shrink-0">{icon}</span>}<div>{children}</div></div>; }
function Empty({title,detail,icon}:{title:string;detail:string;icon?:ReactNode}) { return <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-5 py-7 text-center">{icon&&<div className="mb-2 rounded-xl bg-[#e7eee6] p-2 text-[#547267]">{icon}</div>}<p className="text-sm font-semibold text-[#344a44]">{title}</p><p className="mt-1 max-w-sm text-xs leading-5 text-[#7b887f]">{detail}</p></div>; }
function Loading() { return <div role="status" className="space-y-2 rounded-xl border border-[#e1e7df] p-4"><div className="h-4 w-40 animate-pulse rounded bg-[#e8ede7]"/><div className="h-10 animate-pulse rounded bg-[#e8ede7]"/><div className="h-10 animate-pulse rounded bg-[#e8ede7]"/></div>; }
function InlineError({message,retry,onRetry}:{message:string;retry:string;onRetry:()=>void}) { return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-xs text-[#883f37]"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4"/>{message}</span><button type="button" onClick={onRetry} className="rounded border border-[#dcb9b1] px-2 py-1 font-semibold">{retry}</button></div>; }