import { useRef, useState, type ReactNode } from "react";
import type { PostingQueueCommand } from "@shared/accounting-posting-queue";
import { postingQueueSubmitSchema, POSTING_QUEUE_STAGEABLE_BLOCKERS } from "@shared/accounting-posting-queue";
import { useLanguage } from "@/contexts/LanguageContext";
import { normalizeAccountingDigits } from "./accounting-logic";
import { postingQueueText as t } from "./accounting-posting-queue-copy";
import { previewPostingSource, usePostingQueueHistory, usePostingQueueSubmit, useRunPostingQueue, type PostingPlan, type PostingSource } from "./accounting-posting-queue-api";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, FileCheck2, RefreshCw, ShieldAlert } from "lucide-react";
import AccountingZeroStart from "./accounting-zero-start";

type Company = { id: number; name: string };
type Pending = { payload: { sourceId: string; reviewConfirmed: true; posting: PostingQueueCommand }; companyId: number };
const inputClass = "h-10 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 text-sm text-[#29423f] outline-none focus:border-[#60877a] focus:ring-2 focus:ring-[#60877a]/15 disabled:opacity-60";
export function postingBlockersAreClosedGates(blockers: readonly string[]) {
  return blockers.length > 0 && blockers.every(code => POSTING_QUEUE_STAGEABLE_BLOCKERS.has(code));
}
export function postingSourceCanBeStaged(blockers:readonly string[]) {
  return blockers.length===0||postingBlockersAreClosedGates(blockers);
}
const makeSourceId = () => globalThis.crypto?.randomUUID?.() ?? `posting-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const pendingKey = "accounting-posting-queue:pending:v1";
function readPending(): Pending | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const parsed = postingQueueSubmitSchema.safeParse(JSON.parse(window.sessionStorage.getItem(pendingKey) || "null"));
    if (!parsed.success) return undefined;
    const command = parsed.data.posting.command;
    return { payload: parsed.data, companyId: command.companyId };
  } catch { return undefined; }
}
function storePending(value?: Pending) {
  if (typeof window === "undefined") return;
  try { value ? window.sessionStorage.setItem(pendingKey, JSON.stringify(value.payload)) : window.sessionStorage.removeItem(pendingKey); } catch { /* in-memory command remains locked */ }
}

export default function AccountingPostingQueue({ companies, defaultCompanyId, canManage = false }: {
  companies: Company[]; defaultCompanyId?: number; canManage?: boolean;
}) {
  const { language } = useLanguage();
  const [pending, setPending] = useState<Pending | undefined>(readPending);
  const pendingCommand = pending?.payload.posting.command;
  const pendingLoadingCommand = pending?.payload.posting.kind === "LOADING_INVOICE" ? pending.payload.posting.command : undefined;
  const pendingShipmentCommand = pending?.payload.posting.kind === "SHIPMENT_COST" ? pending.payload.posting.command : undefined;
  const [companyText, setCompanyText] = useState(String(pending?.companyId ?? defaultCompanyId ?? companies[0]?.id ?? ""));
  const [kind, setKind] = useState<PostingSource["kind"]>(pending?.payload.posting.kind ?? "LOADING_INVOICE");
  const [factText, setFactText] = useState(pendingCommand ? String(pendingCommand.factId) : "");
  const [reason, setReason] = useState(pendingCommand?.reason ?? "");
  const [settleFromHold, setSettleFromHold] = useState(pendingLoadingCommand?.settleFromHold ?? false);
  const [carrierText, setCarrierText] = useState(pendingShipmentCommand?.carrierPartyId != null ? String(pendingShipmentCommand.carrierPartyId) : "");
  const [plan, setPlan] = useState<PostingPlan>();
  const [reviewedScope, setReviewedScope] = useState("");
  const [approval, setApproval] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const previewGeneration = useRef(0);
  const [page, setPage] = useState(1);
  const [batchText, setBatchText] = useState("");
  const companyId = Number(normalizeAccountingDigits(companyText));
  const factId = Number(normalizeAccountingDigits(factText));
  const company = companies.find(row => row.id === companyId);
  const source: PostingSource | undefined = company && Number.isSafeInteger(factId) && factId > 0
    ? { companyId, factId, kind } : undefined;
  const scopeFingerprint = source ? JSON.stringify(source) : "";
  const currentPlan = plan && scopeFingerprint && reviewedScope === scopeFingerprint ? plan : undefined;
  const gateOnly = Boolean(currentPlan && postingSourceCanBeStaged(currentPlan.blockers));
  const notPosted = Boolean(currentPlan && !currentPlan.posted);
  const reasonValid = reason.trim().length >= 5 && reason.trim().length <= 500;
  const carrierValid = kind !== "SHIPMENT_COST" || carrierText.trim() === "" || (/^\d+$/.test(normalizeAccountingDigits(carrierText.trim())) && Number(normalizeAccountingDigits(carrierText.trim())) > 0);
  const stageEnabled = Boolean(canManage && !pending && currentPlan && gateOnly && notPosted && reasonValid && carrierValid && approval);
  const historyQuery = usePostingQueueHistory(company?.id, page, 20);
  const submitMutation = usePostingQueueSubmit();
  const runMutation = useRunPostingQueue();
  const history = historyQuery.data;
  const pageCount = history ? Math.max(1, Math.ceil(history.pagination.totalRows / history.pagination.pageSize)) : 1;

  function clearPreview() {
    previewGeneration.current += 1;
    setPreviewBusy(false);
    setPlan(undefined); setReviewedScope(""); setApproval(false); setError(""); setMessage("");
  }
  async function preview() {
    setError(""); setMessage(""); setApproval(false);
    if (!source || pending) { setError(t(language, "previewRequired")); return; }
    const requested = JSON.stringify(source);
    const requestGeneration = ++previewGeneration.current;
    setPreviewBusy(true);
    setPlan(undefined); setReviewedScope("");
    try {
      const fresh = await previewPostingSource(source);
      if (requestGeneration !== previewGeneration.current) return;
      if (fresh.factId !== source.factId || !/^[a-f0-9]{64}$/.test(fresh.planHash)
        || (kind === "LOADING_INVOICE" && (!("companyId" in fresh) || fresh.companyId !== companyId))) throw new Error(t(language, "invalid"));
      setPlan(fresh); setReviewedScope(requested);
    } catch (cause) { if (requestGeneration === previewGeneration.current) setError(cause instanceof Error ? cause.message : t(language, "previewError")); }
    finally { if (requestGeneration === previewGeneration.current) setPreviewBusy(false); }
  }
  function buildPayload(): Pending | undefined {
    if (!currentPlan || !source) return undefined;
    const command = kind === "LOADING_INVOICE"
      ? { companyId, factId, expectedPlanHash: currentPlan.planHash, reason: reason.trim(), settleFromHold }
      : { companyId, factId, expectedPlanHash: currentPlan.planHash, reason: reason.trim(), carrierPartyId: carrierText.trim() ? Number(normalizeAccountingDigits(carrierText.trim())) : null };
    try {
      const parsedCommand = kind === "LOADING_INVOICE"
        ? { kind, command: (awaitlessLoadingCommand(command)) }
        : { kind, command: (awaitlessShipmentCommand(command)) };
      const parsed = postingQueueSubmitSchema.parse({ sourceId: makeSourceId(), reviewConfirmed: true, posting: parsedCommand });
      return { payload: parsed, companyId };
    } catch { return undefined; }
  }
  async function enqueue(retry = false) {
    setError(""); setMessage("");
    if (!canManage) { setError(t(language, "permission")); return; }
    let frozen = pending;
    if (!frozen) {
      if (!stageEnabled || !window.confirm(t(language, "confirmEnqueue"))) { if (!stageEnabled) setError(t(language, "invalid")); return; }
      frozen = buildPayload();
      if (!frozen) { setError(t(language, "invalid")); return; }
      setPending(frozen); storePending(frozen);
    } else if (!retry) return;
    try {
      await submitMutation.mutateAsync(frozen.payload);
      setPending(undefined); storePending(undefined); setMessage(t(language, "staged"));
      void historyQuery.refetch();
    } catch (cause) { setError(cause instanceof Error ? cause.message : t(language, "enqueueError")); }
  }
  async function runBatch() {
    setError(""); setBatchText("");
    if (!canManage || !history?.processingEnabled || !company) return;
    if (!window.confirm(t(language, "confirmRun"))) return;
    try {
      const result = await runMutation.mutateAsync(company.id);
      setBatchText(`${t(language, "batchResult")}: ${JSON.stringify(result)}`);
      await historyQuery.refetch();
    } catch (cause) { setError(cause instanceof Error ? cause.message : t(language, "runError")); }
  }
  function refreshHistory() {
    void historyQuery.refetch().then(result => {
      const row = pending && result.data?.rows.find(item => item.sourceId === pending.payload.sourceId);
      if (row) { setPending(undefined); storePending(undefined); setMessage(`${t(language, "staged")} · ${row.status}`); }
    });
  }

  return <section dir={["fa", "ar"].includes(language) ? "rtl" : "ltr"} className="space-y-4" data-testid="accounting-posting-queue">
    <header className="overflow-hidden rounded-[22px] border border-[#dce3db] bg-[#fbfcf8] shadow-[0_14px_45px_-40px_rgba(29,57,50,.65)]">
      <div className="flex flex-wrap items-start justify-between gap-4 bg-[#f0f4ee] px-5 py-5 md:px-7">
        <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#20484a] text-[#f4f2e7]"><FileCheck2 className="h-5 w-5"/></span>
          <div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#829087]">MOMTAZCHEM · CONTROLLED POSTING</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.025em] text-[#273d3a]">{t(language,"title")}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#758179]">{t(language,"intro")}</p></div>
        </div>
      </div>
      <div role="note" className="flex gap-3 border-t border-[#dfb6a8] bg-[#f7e9e3] px-5 py-4 text-[#743e35] md:px-7"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0"/><div className="space-y-1"><p className="text-xs font-bold leading-5">{t(language,"disclaimer")}</p><p className="text-xs leading-5">{t(language,"closedGateOnly")}</p><p className="text-xs leading-5">{t(language,"historicalOutbox")}</p></div></div>
    </header>
    {!canManage && <p className="rounded-lg border border-[#e6d8b7] bg-[#f6f0df] px-4 py-3 text-xs text-[#695638]" data-testid="posting-queue-viewer">{t(language,"permission")}</p>}
    <section className="space-y-4 rounded-2xl border border-[#dfe6de] bg-[#fbfcf8] p-4 md:p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label={t(language,"company")}><select className={inputClass} value={companyText} disabled={Boolean(pending) || submitMutation.isPending} onChange={e=>{setCompanyText(e.target.value);setPage(1);clearPreview();}} data-testid="posting-queue-company"><option value="">{t(language,"company")}</option>{companies.map(item=><option key={item.id} value={item.id}>{item.name} · #{item.id}</option>)}</select></Field>
        <Field label={t(language,"kind")}><select className={inputClass} value={kind} disabled={Boolean(pending) || submitMutation.isPending} onChange={e=>{setKind(e.target.value as PostingSource["kind"]);clearPreview();}} data-testid="posting-queue-kind"><option value="LOADING_INVOICE">{t(language,"loadingInvoice")}</option><option value="SHIPMENT_COST">{t(language,"shipmentCost")}</option></select></Field>
        <Field label={t(language,"factId")}><input inputMode="numeric" value={factText} disabled={Boolean(pending) || submitMutation.isPending} onChange={e=>{setFactText(normalizeAccountingDigits(e.target.value));clearPreview();}} className={inputClass} data-testid="posting-queue-fact"/></Field>
      </div>
      <Button type="button" disabled={!source || previewBusy || Boolean(pending)} onClick={()=>void preview()} className="bg-[#20484a] text-[#f4f2e7] hover:bg-[#2d5d5c]" data-testid="posting-queue-preview"><RefreshCw className="me-2 h-4 w-4"/>{previewBusy?t(language,"previewing"):t(language,"preview")}</Button>
      {previewBusy && <div aria-label={t(language,"previewing")} className="space-y-2"><Skeleton className="h-12 rounded-lg bg-[#e8ede7]"/><Skeleton className="h-32 rounded-lg bg-[#e8ede7]"/></div>}
      {currentPlan && <section className="space-y-3 rounded-xl border border-[#dce5d9] bg-[#f7f9f5] p-4" data-testid="posting-queue-plan">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-display text-lg font-semibold text-[#294540]">{t(language,"preview")}</h3><span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${gateOnly&&notPosted?"border-[#d8c9ac] bg-[#faf5e9] text-[#705638]":"border-[#e4b9b2] bg-[#f9eae6] text-[#883f37]"}`}>{gateOnly&&notPosted?"CLOSED GATE":currentPlan.posted?t(language,"posted"):t(language,"notGate")}</span></div>
        <p className="break-all font-mono text-[11px] text-[#758179]" dir="ltr">SHA-256 · {currentPlan.planHash}</p>
        <pre dir="ltr" className="max-h-80 overflow-auto rounded-lg border border-[#e1e7df] bg-[#fbfcf8] p-3 text-[10px] leading-5 text-[#344a44]">{JSON.stringify(currentPlan,null,2)}</pre>
        {currentPlan.blockers.length > 0 && <div className="flex flex-wrap gap-2">{currentPlan.blockers.map(code=><span key={code} className="rounded-md border border-[#e6d9c4] bg-[#f8f1e5] px-2 py-1 text-xs text-[#806844]">{code}</span>)}</div>}
        {currentPlan.posted && <p role="status" className="rounded-lg border border-[#cbdccf] bg-[#edf4eb] p-3 text-xs text-[#42634e]">{t(language,"posted")}</p>}
      </section>}
      {currentPlan && gateOnly && notPosted && canManage && !pending && <div className="grid gap-3 rounded-xl border border-[#e5ded2] bg-[#faf8f2] p-4 md:grid-cols-2">
        {kind==="LOADING_INVOICE" ? <label className="flex items-start gap-2 rounded-lg border border-[#e5ded2] bg-[#fbfcf8] p-3 text-xs leading-5 text-[#52665c]"><input type="checkbox" checked={settleFromHold} onChange={e=>{setSettleFromHold(e.target.checked);setApproval(false);}} className="mt-0.5 accent-[#20484a]"/>{t(language,"settle")}</label>
          : <Field label={t(language,"carrier")}><input inputMode="numeric" value={carrierText} onChange={e=>{setCarrierText(normalizeAccountingDigits(e.target.value));setApproval(false);}} className={inputClass} data-testid="posting-queue-carrier"/></Field>}
        <Field label={t(language,"reason")}><input maxLength={500} value={reason} onChange={e=>{setReason(e.target.value);setApproval(false);}} className={inputClass} data-testid="posting-queue-reason"/></Field>
        <label className="flex items-start gap-2 rounded-lg border border-[#e5ded2] bg-[#fbfcf8] p-3 text-xs leading-5 text-[#52665c] md:col-span-2"><input type="checkbox" checked={approval} onChange={e=>setApproval(e.target.checked)} className="mt-0.5 accent-[#20484a]" data-testid="posting-queue-approval"/>{t(language,"approval")}</label>
        <Button type="button" disabled={!stageEnabled || submitMutation.isPending} onClick={()=>void enqueue()} className="bg-[#735b3e] text-[#fbf6ed] hover:bg-[#624b32]" data-testid="posting-queue-enqueue">{submitMutation.isPending?t(language,"enqueuing"):t(language,"enqueue")}</Button>
      </div>}
      {currentPlan && !gateOnly && !currentPlan.posted && <p role="alert" className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] p-3 text-xs text-[#806844]">{t(language,"notGate")}</p>}
      {pending && <section role="alert" className="space-y-3 rounded-xl border border-[#e6d9c4] bg-[#fcfaf5] p-4" data-testid="posting-queue-uncertain">
        <p className="text-xs leading-5 text-[#806844]">{t(language,"enqueueError")}</p><p dir="ltr" className="font-mono text-[11px]">{pending.payload.sourceId}</p>
        <details className="rounded-lg border border-[#e5ded2] bg-[#fbfcf8]"><summary className="cursor-pointer px-3 py-2 text-xs font-semibold">{t(language,"command")}</summary><pre dir="ltr" className="max-h-48 overflow-auto border-t border-[#e5ded2] p-3 text-[10px]">{JSON.stringify(pending.payload,null,2)}</pre></details>
        <Button type="button" variant="outline" disabled={!canManage || submitMutation.isPending} onClick={()=>void enqueue(true)} data-testid="posting-queue-retry">{t(language,"retrySame")}</Button>
      </section>}
    </section>
    <AccountingZeroStart companyId={company?.id} canManage={canManage} language={language}/>
    <Button asChild variant="outline" className="my-3">
      <a href="/accounting-guide-fa.html" target="_blank" rel="noopener noreferrer" data-testid="accounting-persian-guide">
        {({fa:"دفترچهٔ فارسی حسابداری",ar:"دليل المحاسبة باللغة الفارسية",en:"Persian accounting guide",tr:"Farsça muhasebe kılavuzu"} as Record<string,string>)[language] ?? "Persian accounting guide"}
      </a>
    </Button>
    {error && <Alert variant="destructive" role="alert"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language,"error")}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    {message && <p role="status" className="rounded-lg border border-[#cbdccf] bg-[#edf4eb] p-3 text-xs text-[#42634e]">{message}</p>}
    <section className="overflow-hidden rounded-2xl border border-[#dfe6de] bg-[#fbfcf8]" data-testid="posting-queue-history">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e5eae3] bg-[#f3f7f0] px-4 py-4 md:px-5">
        <div><h3 className="font-display text-lg font-semibold text-[#294540]">{t(language,"history")}</h3><p className="mt-1 text-xs leading-5 text-[#687970]">{t(language,"historyHelp")}</p></div>
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={!company || historyQuery.isFetching} onClick={refreshHistory}><RefreshCw className="me-2 h-3.5 w-3.5"/>{t(language,"refresh")}</Button>
          <Button type="button" disabled={!canManage || !history?.processingEnabled || runMutation.isPending || !company} onClick={()=>void runBatch()} className="bg-[#735b3e] text-[#fbf6ed] hover:bg-[#624b32]" data-testid="posting-queue-run">{runMutation.isPending?t(language,"running"):t(language,"run")}</Button></div>
      </header>
      {!history?.processingEnabled && <p className="border-b border-[#e8e3da] bg-[#fcfaf5] px-4 py-3 text-xs text-[#806844]" data-testid="posting-queue-gate-closed">{t(language,"gateOff")}</p>}
      {history?.rows.some(row=>row.status==="review") && <p className="border-b border-[#e8e3da] bg-[#fcfaf5] px-4 py-3 text-xs leading-5 text-[#806844]">{t(language,"terminalReview")}</p>}
      <div className="space-y-3 p-4 md:p-5">
        {batchText && <p role="status" className="rounded-lg border border-[#cbdccf] bg-[#edf4eb] p-3 text-xs text-[#42634e]">{batchText}</p>}
        {historyQuery.isLoading && <div aria-label={t(language,"loading")} className="space-y-2"><Skeleton className="h-10 rounded-lg bg-[#e8ede7]"/><Skeleton className="h-32 rounded-lg bg-[#e8ede7]"/></div>}
        {historyQuery.isError && <Alert variant="destructive" role="alert"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language,"error")}</AlertTitle><AlertDescription className="flex items-center justify-between gap-3"><span>{historyQuery.error instanceof Error?historyQuery.error.message:t(language,"error")}</span><Button type="button" variant="outline" size="sm" onClick={()=>void historyQuery.refetch()}>{t(language,"retry")}</Button></AlertDescription></Alert>}
        {!company && <p role="status" className="rounded-lg border border-dashed border-[#d7e0d7] p-3 text-sm text-[#687970]">{t(language,"company")}</p>}
        {history && history.rows.length===0 && <p role="status" className="rounded-lg border border-dashed border-[#d7e0d7] p-3 text-sm text-[#687970]">{t(language,"empty")}</p>}
        {history && history.rows.map(row=><article key={row.id} className="space-y-3 rounded-xl border border-[#e1e7df] bg-[#f7f9f5] p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Fact label={t(language,"source")} value={row.sourceId} mono/><Fact label={t(language,"type")} value={row.kind}/><Fact label={t(language,"fact")} value={`#${row.factId}`} mono/><Fact label={t(language,"status")} value={t(language,row.status==="retry"?"retryStatus":row.status)}/><Fact label={t(language,"attempts")} value={String(row.attempts)} mono/><Fact label={t(language,"nextAttempt")} value={row.nextAttemptAt} mono/><Fact label={t(language,"errors")} value={`${row.errorCode??"—"} / ${row.errorStep??"—"}`}/></div>
          {row.result && <pre dir="ltr" className="max-h-28 overflow-auto rounded border border-[#dce5d9] bg-[#fbfcf8] p-2 text-[10px]">{JSON.stringify(row.result,null,2)}</pre>}
          <details className="rounded-lg border border-[#e5ded2] bg-[#fbfcf8]"><summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-[#52665c]">{t(language,"command")}</summary><pre dir="ltr" className="max-h-48 overflow-auto border-t border-[#e5ded2] p-3 text-[10px] leading-5">{JSON.stringify(row.posting,null,2)}</pre></details>
        </article>)}
        {history && history.pagination.totalRows>0 && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#687970]">{t(language,"page")} {history.pagination.page} / {pageCount} · {history.pagination.totalRows} {t(language,"rows")}</p><div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={page<=1} onClick={()=>setPage(page-1)}>{t(language,"previous")}</Button><Button type="button" variant="outline" size="sm" disabled={page>=pageCount} onClick={()=>setPage(page+1)}>{t(language,"next")}</Button></div></div>}
      </div>
    </section>
  </section>;
}

function awaitlessLoadingCommand(value: Record<string, unknown>) { return value; }
function awaitlessShipmentCommand(value: Record<string, unknown>) { return value; }
function Field({label,children}:{label:string;children:ReactNode}) { return <label className="block space-y-1.5 text-xs font-semibold text-[#53665d]"><span>{label}</span>{children}</label>; }
function Fact({label,value,mono=false}:{label:string;value:string;mono?:boolean}) { return <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#7b887f]">{label}</div><div dir={mono?"ltr":undefined} className={`mt-1 break-words text-xs text-[#344a44] ${mono?"font-mono tabular-nums":"font-medium"}`}>{value}</div></div>; }
