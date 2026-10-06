import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Archive, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import type { InventoryDocumentInput, InventoryDocumentRow } from "@shared/accounting-inventory-documents";
import type { ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInventoryDocument, useInventoryDocumentAction, useInventoryDocumentMetadata, useInventoryDocuments, useSaveInventoryDocument, type InventoryAction } from "./accounting-inventory-api";
import { inventoryCopy, type InventoryLanguage } from "./inventory-document-copy";
import { blankInventoryDraft, blankInventoryLine, confirmInventoryDocumentAction, createInventorySourceId, inventoryActionAllowed, inventoryDraftFromRow, inventoryDraftInput, isStaleInventoryDocumentError, reloadInventoryStaleRecord, scopedInventoryDocument, validateInventoryDraft, type InventoryDraft, type InventoryDraftLine, type PendingInventoryAction } from "./inventory-document-workflow";

type CompanyOption = { id:number; name:string };
const inputClass = "h-10 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 text-sm text-[#29423f] outline-none focus:border-[#60877a] focus:ring-2 focus:ring-[#60877a]/15 disabled:opacity-60";
const labelClass = "mb-1.5 block text-[11px] font-semibold text-[#607168]";
function safeError(error:unknown, fallback:string) { return error instanceof Error?error.message:fallback; }
function copyFor(language:string) { return inventoryCopy[(language in inventoryCopy?language:"en") as InventoryLanguage]; }
function statusTone(status:InventoryDocumentRow["status"]) {
  return status==="approved"?"bg-[#e4eee4] text-[#46674e]":status==="draft"?"bg-[#f4ead9] text-[#806844]":status==="voided"?"bg-[#f4e1da] text-[#79473f]":"bg-[#ecece6] text-[#70756e]";
}

export function InventorySafetyNotice({language}:{language:string}) {
  const t=copyFor(language);
  return <aside data-testid="inventory-document-safety" className="flex gap-3 rounded-xl border border-[#e5d9c7] bg-[#f4ead9] p-4 text-[#6d5b41]">
    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#806844]"/>
    <div><strong className="block text-xs">{t.safety}</strong><p className="mt-1 text-xs leading-5">{t.safetyBody}</p><div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold"><span className="rounded-full bg-[#fff9ec] px-2 py-1">{t.postingBlocked}</span><span className="rounded-full bg-[#fff9ec] px-2 py-1">{t.notStock}</span><span className="rounded-full bg-[#fff9ec] px-2 py-1">{t.documentary}</span></div></div>
  </aside>;
}
export function InventoryEmptyState({language}:{language:string}) {
  const t=copyFor(language);
  return <div data-testid="inventory-documents-empty" className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-[#ccd8cc] bg-[#f6f8f3] px-6 py-9 text-center">
    <div className="mb-3 rounded-xl bg-[#e7eee5] p-3 text-[#496b5d]"><Archive className="h-5 w-5"/></div><h3 className="text-sm font-semibold text-[#344a44]">{t.emptyTitle}</h3><p className="mt-2 max-w-md text-xs leading-5 text-[#718077]">{t.empty}</p>
  </div>;
}
function InventoryScopeEmptyState({message}:{message:string}) {
  return <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-[#ccd8cc] bg-[#f6f8f3] px-6 py-9 text-center"><div className="mb-3 rounded-xl bg-[#e7eee5] p-3 text-[#496b5d]"><Archive className="h-5 w-5"/></div><p className="max-w-md text-sm leading-6 text-[#718077]">{message}</p></div>;
}
export function InventoryReadOnlyNotice({language}:{language:string}) {
  const t=copyFor(language);
  return <div data-testid="inventory-documents-readonly" className="flex gap-3 rounded-xl border border-[#e6d8b7] bg-[#f6f0df] px-4 py-3 text-sm text-[#695638]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/><div><strong>{t.readOnly}</strong><p className="mt-1 text-xs">{t.readOnlyHelp}</p></div></div>;
}
export function InventoryStatus({status,language}:{status:InventoryDocumentRow["status"];language:string}) {
  const t=copyFor(language);
  return <span data-testid={`inventory-status-${status}`} className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusTone(status)}`}>{t[`status_${status}`]}</span>;
}
export function InventoryProvenance({row,language}:{row:InventoryDocumentRow;language:string}) {
  const t=copyFor(language);
  return <section data-testid="inventory-document-provenance" className="rounded-xl border border-[#e1e7df] bg-[#f4f7f2] p-3">
    <h4 className="mb-2 text-xs font-semibold text-[#52665c]">{t.provenance}</h4>
    <div className="grid gap-2 text-[11px] sm:grid-cols-2"><Meta label={t.sourceId} value={row.sourceId} ltr/><Meta label={t.revision} value={String(row.revision)} ltr/>
      {row.approval&&<Meta label={t.approval} value={`${row.approval.actorId} · ${row.approval.actorType} · ${row.approval.at} · ${row.approval.reason}`}/>}
      {row.closure&&<Meta label={t.closure} value={`${row.closure.actorId} · ${row.closure.actorType} · ${row.closure.at} · ${row.closure.reason}`}/>}
    </div>
  </section>;
}
export function InventoryDocumentActions({row,language,canManage,busy,onEdit,onApprove,onDiscard,onVoid}:{row:InventoryDocumentRow;language:string;canManage:boolean;busy:boolean;onEdit:()=>void;onApprove:()=>void;onDiscard:()=>void;onVoid:()=>void}) {
  const t=copyFor(language);
  if(!canManage)return null;
  return <div data-testid="inventory-document-actions" className="flex flex-wrap gap-2 border-t border-[#e1e7df] pt-4">
    {row.status==="draft"&&<><button type="button" onClick={onEdit} disabled={busy} className="rounded-lg border border-[#d6dfd6] px-3 py-2 text-xs font-semibold text-[#365750] disabled:opacity-50">{t.edit}</button><button type="button" onClick={onDiscard} disabled={busy} className="rounded-lg border border-[#ead8d1] px-3 py-2 text-xs font-semibold text-[#88564a] disabled:opacity-50">{t.discard}</button><button type="button" onClick={onApprove} disabled={busy} className="rounded-lg bg-[#20484a] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{t.approve}</button></>}
    {row.status==="approved"&&<button type="button" onClick={onVoid} disabled={busy} className="rounded-lg border border-[#ead8d1] px-3 py-2 text-xs font-semibold text-[#88564a] disabled:opacity-50">{t.void}</button>}
  </div>;
}
export function InventoryDocumentDetailView({row,language,canManage,busy,actionError,stale,onReload,onEdit,onApprove,onDiscard,onVoid}:{row:InventoryDocumentRow;language:string;canManage:boolean;busy:boolean;actionError:string;stale:boolean;onReload:()=>void;onEdit:()=>void;onApprove:()=>void;onDiscard:()=>void;onVoid:()=>void}) {
  const t=copyFor(language);
  return <article className="space-y-4 rounded-xl border border-[#dce3db] bg-[#f8faf6] p-4" data-testid="inventory-document-detail">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[10px] text-[#819087]" dir="ltr">{row.documentDate} · {row.reference}</p><h3 className="mt-1 text-base font-semibold text-[#344a44]">{t[`kind_${row.kind}`]}</h3><p className="mt-1 text-xs text-[#718077]">{row.supplier||"—"} · {row.currency}</p></div><InventoryStatus status={row.status} language={language}/></div>
    <div className="grid grid-cols-2 gap-2"><Meta label={t.totalCost} value={`${row.totalCost} ${row.currency}`} ltr/><Meta label={t.totalTons} value={row.totalTons} ltr/><Meta label={t.evidence} value={row.evidenceReference}/><Meta label={t.revision} value={String(row.revision)} ltr/></div>
    <div className="overflow-hidden rounded-lg border border-[#e1e7df]"><div className="border-b border-[#e1e7df] bg-[#f0f4ee] px-3 py-2 text-xs font-semibold text-[#52665c]">{t.lines} · {row.lines.length}</div><div className="divide-y divide-[#e9ede7]">{row.lines.map((line,index)=><div key={`${line.productId}-${line.batchReference}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 p-3 text-xs"><div><div className="font-semibold text-[#344a44]">{line.productName}{line.productSku?` · ${line.productSku}`:""}</div><div className="mt-1 text-[10px] text-[#7b887f]">{t.batch}: {line.batchReference} · {t.tons}: <span dir="ltr">{line.quantityTons}</span></div></div><div className="text-end font-mono text-[11px] tabular-nums text-[#344a44]" dir="ltr">{line.totalCost} {row.currency}</div></div>)}</div></div>
    {row.notes&&<Meta label={t.notes} value={row.notes}/>}
    <InventoryProvenance row={row} language={language}/>
    {row.status==="approved"&&<p className="rounded-lg bg-[#eaf0e8] px-3 py-2 text-[11px] leading-5 text-[#526c5b]">{t.approvedNote}</p>}
    {actionError&&<div role="alert" className="rounded-lg bg-[#f4e1da] p-3 text-xs text-[#79473f]">{actionError}{stale&&<button type="button" onClick={onReload} className="ms-2 font-semibold underline">{t.reload}</button>}</div>}
    <InventoryDocumentActions row={row} language={language} canManage={canManage} busy={busy} onEdit={onEdit} onDiscard={onDiscard} onApprove={onApprove} onVoid={onVoid}/>
  </article>;
}
function Meta({label,value,ltr=false}:{label:string;value:string;ltr?:boolean}) {
  return <div className="min-w-0 rounded-md bg-white/80 px-2.5 py-2"><div className="text-[9px] font-semibold text-[#829087]">{label}</div><div dir={ltr?"ltr":undefined} className={`mt-1 break-words text-[11px] text-[#344a44] ${ltr?"font-mono":""}`}>{value||"—"}</div></div>;
}

export default function AccountingInventoryDocuments({companies,canManage}:{companies:CompanyOption[];canManage:boolean}) {
  const {language,direction}=useLanguage();
  const t=copyFor(language);
  const [companyId,setCompanyId]=useState<number|undefined>(companies[0]?.id);
  const [page,setPage]=useState(1);
  const [selectedId,setSelectedId]=useState<number>();
  const [formOpen,setFormOpen]=useState(false);
  const [form,setForm]=useState<InventoryDraft>(()=>blankInventoryDraft());
  const [formError,setFormError]=useState("");
  const [lineErrors,setLineErrors]=useState<Record<number,string>>({});
  const [actionError,setActionError]=useState("");
  const [pendingAction,setPendingAction]=useState<PendingInventoryAction|null>(null);
  const [reason,setReason]=useState("");
  const [attested,setAttested]=useState(false);
  const [stale,setStale]=useState(false);
  const submitLock=useRef(false);
  const actionLock=useRef(false);
  const metadataQuery=useInventoryDocumentMetadata(companyId);
  const metadata=metadataQuery.data?.companyId===companyId?metadataQuery.data:undefined;
  const listQuery=useInventoryDocuments(companyId,page,20);
  const list=listQuery.data?.rows&&listQuery.data.rows.every(row=>row.companyId===companyId)?listQuery.data:undefined;
  const detailQuery=useInventoryDocument(companyId,selectedId);
  const detail=scopedInventoryDocument(detailQuery.data,companyId,selectedId);
  const saveMutation=useSaveInventoryDocument();
  const actionMutation=useInventoryDocumentAction();
  const busy=saveMutation.isPending||actionMutation.isPending;
  const decimals=metadata?.currencies.find(currency=>currency.code===form.currency)?.decimals;
  const pageCount=Math.max(1,Math.ceil((list?.total??0)/20));
  const products=useMemo(()=>metadata?.products??[],[metadata?.products]);

  useEffect(()=>{if(!companies.some(company=>company.id===companyId))setCompanyId(companies[0]?.id);},[companies,companyId]);
  useEffect(()=>{
    setPage(1);setSelectedId(undefined);setFormOpen(false);setForm(blankInventoryDraft());setFormError("");setLineErrors({});setActionError("");setPendingAction(null);setReason("");setAttested(false);setStale(false);
  },[companyId]);
  const chooseCompany=(id:number|undefined)=>{
    setCompanyId(id);setPage(1);setSelectedId(undefined);setFormOpen(false);setForm(blankInventoryDraft());setFormError("");setLineErrors({});setActionError("");setPendingAction(null);setStale(false);
  };
  const createDraft=()=>{
    if(!canManage||!companyId||!metadata||metadata.companyId!==companyId||busy)return;
    setSelectedId(undefined);setForm({...blankInventoryDraft("purchase"),sourceId:createInventorySourceId()});setFormOpen(true);setFormError("");setLineErrors({});setStale(false);
  };
  const editDraft=(row:InventoryDocumentRow)=>{
    if(!inventoryActionAllowed(canManage,row,companyId,"edit")||busy)return;
    setForm(inventoryDraftFromRow(row));
    setFormOpen(true);setFormError("");setLineErrors({});setStale(false);
  };
  const updateLine=(index:number,key:keyof InventoryDraftLine,value:string)=>setForm(old=>({...old,lines:old.lines.map((line,i)=>i===index?{...line,[key]:value}:line)}));
  const validate=()=>{
    const result=validateInventoryDraft(form,companyId,metadata);
    return {valid:result.valid,errors:Object.fromEntries(Object.keys(result.lineErrors).map(key=>[key,t.lineError])) as Record<number,string>};
  };
  const submit=async(event:FormEvent)=>{
    event.preventDefault();setFormError("");setLineErrors({});
    if(!canManage||busy||submitLock.current||!companyId||!metadata||metadata.companyId!==companyId)return;
    const check=validate();
    if(!check.valid){setLineErrors(check.errors);setFormError(t.errorRequired);return;}
    const payload:InventoryDocumentInput=inventoryDraftInput(form,companyId);
    submitLock.current=true;
    try{
      const saved=await saveMutation.mutateAsync(payload);
      setFormOpen(false);setSelectedId(saved.id);setPage(1);setStale(false);
    }catch(error){
      setFormError(isStaleInventoryDocumentError(error)?t.stale:safeError(error,t.serverError));if(isStaleInventoryDocumentError(error))setStale(true);
    }finally{submitLock.current=false;}
  };
  const beginAction=(action:InventoryAction,row:InventoryDocumentRow)=>{
    if(!inventoryActionAllowed(canManage,row,companyId,action)||busy)return;
    setPendingAction({action,row});setReason("");setAttested(false);setActionError("");setStale(false);
  };
  const confirmAction=async()=>{
    const pending=pendingAction;
    if(!pending||!canManage||busy||actionLock.current||pending.row.companyId!==companyId)return;
    actionLock.current=true;
    try{
      const result=await confirmInventoryDocumentAction({
        canManage,companyId,pending,reason,attested,
        submit:request=>actionMutation.mutateAsync(request),
      });
      if(!result.submitted){setActionError(result.error==="reason"?t.reasonRequired:result.error==="attestation"?t.confirmApproval:t.serverError);return;}
      setPendingAction(null);setSelectedId(pending.row.id);setActionError("");setStale(false);
    }catch(error){
      setActionError(isStaleInventoryDocumentError(error)?t.stale:safeError(error,t.serverError));if(isStaleInventoryDocumentError(error))setStale(true);
    }finally{actionLock.current=false;}
  };
  const selected=detail;
  const actionTitle=pendingAction?t[pendingAction.action==="approve"?"approvePrompt":pendingAction.action==="discard"?"discardPrompt":"voidPrompt"]:"";
  const reload=async()=>{
    setActionError("");setFormError("");
    const outcome=await reloadInventoryStaleRecord({
      selectedId,companyId,formOpen,pendingAction,
      refetchDetail:async()=>{const result=await detailQuery.refetch();return {data:result.isError?undefined:result.data};},
      refetchList:()=>listQuery.refetch(),
    });
    const fresh=outcome.row;
    if(fresh){
      setSelectedId(fresh.id);
      if(outcome.draft)setForm(outcome.draft);
      if(outcome.closeForm){setFormOpen(false);setForm(blankInventoryDraft());}
      setPendingAction(outcome.pendingAction);
      setReason("");setAttested(false);
    }
    if(outcome.resolved)setStale(false);
  };

  return <section dir={direction} className="min-w-0">
    <div className="overflow-hidden rounded-[22px] border border-[#dce2db] bg-[#fbfcf8] shadow-[0_14px_45px_-40px_rgba(29,57,50,.65)]" data-testid="accounting-inventory-documents">
      <header className="border-b border-[#e5e9e2] bg-[#f0f4ee] p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#829087]"><span>MOMTAZCOM · FINANCE</span><span className="h-px w-6 bg-[#d6b66e]"/></div><h2 className="font-display text-2xl font-semibold tracking-[-.025em] text-[#273d3a]">{t.title}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#758179]">{t.intro}</p></div>
          <div className="flex flex-wrap items-end gap-2"><label className="min-w-[200px]"><span className={labelClass}>{t.company}</span><select className={inputClass} aria-label={t.selectCompany} value={companyId??""} disabled={busy||Boolean(pendingAction)} onChange={event=>chooseCompany(event.target.value?Number(event.target.value):undefined)} data-testid="inventory-company-select"><option value="">{t.selectCompany}</option>{companies.map(company=><option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          {canManage&&<button type="button" onClick={createDraft} disabled={!companyId||!metadata||busy||Boolean(pendingAction)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#20484a] px-4 text-sm font-semibold text-[#f4f2e7] transition-colors hover:bg-[#2d5d5c] disabled:opacity-50" data-testid="inventory-new-document"><Plus className="h-4 w-4"/>{t.add}</button>}</div>
        </div>
        <div className="mt-5"><InventorySafetyNotice language={language}/></div>
        {!canManage&&<div className="mt-4"><InventoryReadOnlyNotice language={language}/></div>}
      </header>
      <div className="space-y-4 p-4 md:p-6">
        {!companies.length?<InventoryScopeEmptyState message={t.noCompanies}/>:
          !companyId?<InventoryScopeEmptyState message={t.selectCompany}/>:
          metadataQuery.isLoading?<div className="space-y-3" aria-label={t.loading}><div className="h-16 animate-pulse rounded-xl bg-[#e8ede7]"/><div className="h-40 animate-pulse rounded-xl bg-[#e8ede7]"/></div>:
          metadataQuery.isError||!metadata?<ErrorNotice message={t.metadataError} retry={t.retry} onRetry={()=>void metadataQuery.refetch()}/>:
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#758179]"><span>{t.documentary} · {t.postingBlocked} · {t.notStock}</span>{list&&<span className="font-mono" dir="ltr">{list.total}</span>}</div>
            {listQuery.isLoading&&!list?<div className="space-y-3" aria-label={t.loading}><div className="h-14 animate-pulse rounded-xl bg-[#e8ede7]"/><div className="h-14 animate-pulse rounded-xl bg-[#e8ede7]"/></div>:
            listQuery.isError?<ErrorNotice message={t.listError} retry={t.retry} onRetry={()=>void listQuery.refetch()}/>:
            <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
              <div className="min-w-0">
                {!list?.rows.length?<InventoryEmptyState language={language}/>:
                <div className="overflow-x-auto rounded-xl border border-[#e1e7df]">
                  <table className="w-full min-w-[620px] text-start text-xs"><thead className="bg-[#f0f4ee] text-[10px] font-bold uppercase tracking-[.08em] text-[#6e7e74]"><tr><th className="px-3 py-3">{t.date}</th><th className="px-3 py-3">{t.reference}</th><th className="px-3 py-3">{t.kind}</th><th className="px-3 py-3">{t.totalCost}</th><th className="px-3 py-3">{t.status}</th></tr></thead>
                    <tbody className="divide-y divide-[#e9ede7]">{list.rows.map(row=><tr key={row.id} onClick={()=>{setSelectedId(row.id);setFormOpen(false);setActionError("");}} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();setSelectedId(row.id);setFormOpen(false);}}} tabIndex={0} aria-selected={selectedId===row.id} className={`cursor-pointer transition-colors hover:bg-[#f5f8f3] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#60877a] ${selectedId===row.id?"bg-[#eef3eb]":""}`}>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-[10px] text-[#64756b]" dir="ltr">{row.documentDate}</td><td className="max-w-[180px] px-3 py-3"><div className="truncate font-semibold text-[#344a44]">{row.reference}</div><div className="mt-1 text-[10px] text-[#7b887f]">{row.evidenceReference}</div></td><td className="px-3 py-3 text-[#607168]">{t[`kind_${row.kind}`]}</td><td className="whitespace-nowrap px-3 py-3 font-mono tabular-nums text-[#344a44]" dir="ltr">{row.totalCost} <small>{row.currency}</small></td><td className="px-3 py-3"><InventoryStatus status={row.status} language={language}/></td>
                    </tr>)}</tbody>
                  </table>
                </div>}
                {!!list?.rows.length&&<div className="mt-3 flex items-center justify-between text-xs text-[#718077]"><span>{t.page} {page} / {pageCount}</span><div className="flex gap-2"><button type="button" onClick={()=>setPage(value=>Math.max(1,value-1))} disabled={page<=1||busy} className="rounded-lg border border-[#d6dfd6] px-3 py-2 disabled:opacity-40">{t.previous}</button><button type="button" onClick={()=>setPage(value=>Math.min(pageCount,value+1))} disabled={page>=pageCount||busy} className="rounded-lg border border-[#d6dfd6] px-3 py-2 disabled:opacity-40">{t.next}</button></div></div>}
              </div>
              <div className="min-w-0">
                {formOpen?<form onSubmit={submit} className="space-y-4 rounded-xl border border-[#dce3db] bg-[#f8faf6] p-4" data-testid="inventory-document-form">
                  <div className="flex items-start justify-between gap-3"><div><h3 className="font-display text-lg font-semibold text-[#344a44]">{form.id?t.edit:t.add}</h3><p className="mt-1 break-all font-mono text-[10px] text-[#829087]" dir="ltr">{t.sourceId}: {form.sourceId}</p></div><button type="button" onClick={()=>{setFormOpen(false);setFormError("");}} disabled={busy} className="rounded-lg border border-[#d6dfd6] px-3 py-2 text-xs font-semibold text-[#365750] disabled:opacity-50">{t.cancel}</button></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t.kind}><select className={inputClass} value={form.kind} onChange={e=>setForm(old=>({...old,kind:e.target.value as InventoryDraft["kind"],supplier:e.target.value==="opening"?"":old.supplier}))}><option value="purchase">{t.kind_purchase}</option><option value="opening">{t.kind_opening}</option></select></Field>
                    <Field label={t.reference}><input className={inputClass} value={form.reference} onChange={e=>setForm(old=>({...old,reference:e.target.value}))} maxLength={160}/></Field>
                    <Field label={t.date}><input type="date" className={inputClass} value={form.documentDate} onChange={e=>setForm(old=>({...old,documentDate:e.target.value}))}/></Field>
                    <Field label={t.currency}><select className={inputClass} value={form.currency} onChange={e=>setForm(old=>({...old,currency:e.target.value}))}><option value="">{t.currency}</option>{metadata.currencies.map(currency=><option key={currency.code} value={currency.code}>{currency.code} · {currency.decimals}</option>)}</select></Field>
                    {form.kind==="purchase"&&<Field label={t.supplier}><input className={inputClass} value={form.supplier} onChange={e=>setForm(old=>({...old,supplier:e.target.value}))} maxLength={200}/></Field>}
                    <Field label={t.evidence}><input className={inputClass} value={form.evidenceReference} onChange={e=>setForm(old=>({...old,evidenceReference:e.target.value}))} maxLength={500}/><span className="mt-1 block text-[10px] leading-4 text-[#829087]">{t.evidenceHelp}</span></Field>
                    <Field label={t.notes}><textarea className={`${inputClass} h-20 resize-y py-2`} value={form.notes} onChange={e=>setForm(old=>({...old,notes:e.target.value}))} maxLength={2000}/></Field>
                  </div>
                  <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-xs font-semibold text-[#52665c]">{t.lines}</h4><button type="button" onClick={()=>setForm(old=>old.lines.length<100?{...old,lines:[...old.lines,blankInventoryLine()]}:old)} disabled={form.lines.length>=100} className="inline-flex items-center gap-1 rounded-lg border border-[#d6dfd6] px-3 py-2 text-xs font-semibold text-[#365750] disabled:opacity-50"><Plus className="h-3.5 w-3.5"/>{t.addLine}</button></div>
                    {form.lines.map((line,index)=><div key={index} className="rounded-xl border border-[#e1e7df] bg-white p-3">
                      <div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#829087]">{t.line} {index+1}</span><button type="button" onClick={()=>{setForm(old=>({...old,lines:old.lines.filter((_,i)=>i!==index)}));setLineErrors(old=>{const next={...old};delete next[index];return next;});}} disabled={form.lines.length<=1} className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#88564a] disabled:opacity-40"><Trash2 className="h-3 w-3"/>{t.removeLine}</button></div>
                      <div className="grid gap-2 sm:grid-cols-2"><Field label={t.product}><select className={inputClass} value={line.productId} onChange={e=>updateLine(index,"productId",e.target.value)}><option value="">{t.product}</option>{products.map(product=><option key={product.id} value={product.id}>{product.name}{product.sku?` · ${product.sku}`:""}</option>)}</select></Field>
                        <Field label={t.batch}><input className={inputClass} value={line.batchReference} onChange={e=>updateLine(index,"batchReference",e.target.value)} maxLength={160}/></Field>
                        <Field label={t.tons}><input className={inputClass} inputMode="decimal" value={line.quantityTons} onChange={e=>updateLine(index,"quantityTons",e.target.value)} dir="ltr"/></Field>
                        <Field label={`${t.cost}${decimals===undefined?"":` · ${form.currency} (${decimals})`}`}><input className={inputClass} inputMode="decimal" value={line.totalCost} onChange={e=>updateLine(index,"totalCost",e.target.value)} dir="ltr"/></Field>
                      </div>{lineErrors[index]&&<p role="alert" className="mt-2 text-[11px] text-[#a2473c]">{lineErrors[index]} {decimals!==undefined&&t.amountPrecision}</p>}
                    </div>)}
                  </section>
                  {formError&&<div role="alert" className="flex gap-2 rounded-lg bg-[#f4e1da] p-3 text-xs text-[#79473f]"><AlertCircle className="h-4 w-4 shrink-0"/><span>{formError}</span>{stale&&<button type="button" onClick={reload} className="font-semibold underline">{t.reload}</button>}</div>}
                  <button type="submit" disabled={busy||!canManage} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#20484a] px-4 text-sm font-semibold text-[#f4f2e7] hover:bg-[#2d5d5c] disabled:opacity-50">{busy&&<RefreshCw className="h-4 w-4 animate-spin"/>}{t.save}</button>
                </form>:
                !selectedId?<InventoryEmptyState language={language}/>:
                detailQuery.isLoading&&!selected?<div aria-label={t.loadingDetail} className="space-y-3"><div className="h-20 animate-pulse rounded-xl bg-[#e8ede7]"/><div className="h-40 animate-pulse rounded-xl bg-[#e8ede7]"/></div>:
                detailQuery.isError||!selected?<ErrorNotice message={t.noDetail} retry={t.retry} onRetry={()=>void detailQuery.refetch()}/>:
                <InventoryDocumentDetailView row={selected} language={language} canManage={canManage} busy={busy} actionError={actionError} stale={stale} onReload={()=>void reload()} onEdit={()=>editDraft(selected)} onDiscard={()=>beginAction("discard",selected)} onApprove={()=>beginAction("approve",selected)} onVoid={()=>beginAction("void",selected)}/>}
              </div>
            </div>}
          </>}
      </div>
    </div>
    {pendingAction&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-[#173333]/45 p-4" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="inventory-action-title" className="w-full max-w-lg rounded-2xl border border-[#dce3db] bg-[#fbfcf8] p-5 shadow-xl">
      <h3 id="inventory-action-title" className="font-display text-lg font-semibold text-[#273d3a]">{t.confirm}</h3><p className="mt-2 text-sm leading-6 text-[#718077]">{actionTitle}</p>
      <label className="mt-4 block"><span className={labelClass}>{t.actionReason}</span><textarea className={`${inputClass} h-24 resize-y py-2`} value={reason} maxLength={500} onChange={event=>setReason(event.target.value)} aria-invalid={Boolean(actionError&&reason.trim().length<5)} data-testid="inventory-action-reason"/></label>
      {pendingAction.action==="approve"&&<label className="mt-3 flex items-start gap-2 rounded-lg bg-[#f4ead9] p-3 text-xs leading-5 text-[#6d5b41]"><input type="checkbox" checked={attested} onChange={event=>setAttested(event.target.checked)} className="mt-0.5 accent-[#20484a]"/><span>{t.confirmApproval}</span></label>}
      {actionError&&<p role="alert" className="mt-3 rounded-lg bg-[#f4e1da] p-3 text-xs text-[#79473f]">{actionError}{stale&&<button type="button" onClick={reload} className="ms-2 font-semibold underline">{t.reload}</button>}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setPendingAction(null)} disabled={busy} className="rounded-lg border border-[#d6dfd6] px-4 py-2 text-xs font-semibold text-[#365750]">{t.cancel}</button><button type="button" onClick={()=>void confirmAction()} disabled={busy} className="rounded-lg bg-[#20484a] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy?<RefreshCw className="h-4 w-4 animate-spin"/>:t.confirm}</button></div>
    </div></div>}
  </section>;
}
function Field({label,children}:{label:string;children:ReactNode}) {
  return <label className="block min-w-0"><span className={labelClass}>{label}</span>{children}</label>;
}
function ErrorNotice({message,retry,onRetry}:{message:string;retry:string;onRetry:()=>void}) {
  return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e6c8bc] bg-[#f4e1da] p-4 text-xs text-[#79473f]"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4"/>{message}</span><button type="button" onClick={onRetry} className="inline-flex items-center gap-1 rounded-lg border border-[#d9b8ad] px-3 py-2 font-semibold"><RefreshCw className="h-3.5 w-3.5"/>{retry}</button></div>;
}
