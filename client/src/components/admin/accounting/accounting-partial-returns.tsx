import { useMemo, useRef, useState, type ReactNode } from "react";
import type { PartialReturnCommand, PartialReturnPlan, PartialReturnQuote, PartialReturnTargets } from "@shared/accounting-partial-returns";
import { partialReturnCommandSchema, partialReturnQuoteSchema } from "@shared/accounting-partial-returns";
import { normalizeAccountingDigits } from "./accounting-logic";
import { findPartialReturnBySource, usePartialReturnHistory, usePartialReturnTargets, usePostPartialReturn, usePreviewPartialReturn } from "./accounting-partial-returns-api";
import { partialReturnText as t } from "./accounting-partial-returns-copy";
import { AlertCircle, BadgeCheck, FileText, RefreshCw, ShieldAlert } from "lucide-react";

type Company = { id: number; name: string };
type Kind = "GOODS" | "RECEIPT";
type Draft = { companyId: string; kind: Kind; targetId: string; entryDate: string; itemAmounts: Record<string, string>; allocations: Record<string, string>; walletAmount: string; evidence: string; reason: string; payout: string };
type UncertainSubmission = { command: PartialReturnCommand; quoteKey: string; companyId: number };
const pendingStorageKey = "accounting-partial-returns:pending-command:v1";
const completedStorageKey = "accounting-partial-returns:completed-plans:v2";
const inputClass = "h-10 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 text-sm text-[#29423f] outline-none focus:border-[#60877a] focus:ring-2 focus:ring-[#60877a]/15 disabled:opacity-60";
const clean = (value: string) => normalizeAccountingDigits(value.trim());
const decimalSyntax = /^\d+(?:\.\d+)?$/;
export function partialReturnPayoutReferenceValid(kind: Kind, payoutReference: string) {
  return kind !== "RECEIPT" || payoutReference.trim().length >= 5;
}
function positiveDecimal(value: string) {
  const normalized = clean(value);
  return decimalSyntax.test(normalized) && /[1-9]/.test(normalized);
}
function todayLocal() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function makeSourceId() {
  return globalThis.crypto?.randomUUID?.() ?? "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, token => {
    const random = Math.floor(Math.random() * 16);
    return (token === "x" ? random : (random & 3) | 8).toString(16);
  });
}
const displayAmount = (value: string) => value;
export function partialReturnPlanFingerprint(quoteKey: string, planHash: string) {
  return JSON.stringify([quoteKey, planHash]);
}
export function canReviewPartialReturn(hasValidQuote: boolean, busy: boolean, unresolved: boolean) {
  return hasValidQuote && !busy && !unresolved;
}
export function partialReturnPlanAlreadyPosted(fingerprints: Set<string>, quoteKey: string, planHash: string) {
  return fingerprints.has(partialReturnPlanFingerprint(quoteKey, planHash));
}
function quoteFromCommand(command: PartialReturnCommand): PartialReturnQuote {
  return command.kind === "GOODS"
    ? partialReturnQuoteSchema.parse({ kind: command.kind, companyId: command.companyId, invoiceId: command.invoiceId, entryDate: command.entryDate, items: command.items })
    : partialReturnQuoteSchema.parse({ kind: command.kind, companyId: command.companyId, receiptId: command.receiptId, entryDate: command.entryDate, allocations: command.allocations, walletAmount: command.walletAmount });
}
function loadPendingSubmission(): UncertainSubmission | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(pendingStorageKey);
    if (!raw) return undefined;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("command" in value)) return undefined;
    const parsed = partialReturnCommandSchema.safeParse((value as { command: unknown }).command);
    if (!parsed.success) { window.sessionStorage.removeItem(pendingStorageKey); return undefined; }
    const command = parsed.data;
    const quote = quoteFromCommand(command);
    return { command, quoteKey: JSON.stringify(quote), companyId: command.companyId };
  } catch {
    try { window.sessionStorage.removeItem(pendingStorageKey); } catch { /* storage can be unavailable */ }
    return undefined;
  }
}
function persistPendingSubmission(value: UncertainSubmission | undefined) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.sessionStorage.setItem(pendingStorageKey, JSON.stringify(value));
    else window.sessionStorage.removeItem(pendingStorageKey);
  } catch { /* in-memory retry remains available when browser storage is unavailable */ }
}
function loadCompletedPlanFingerprints() {
  if (typeof window === "undefined") return [];
  try {
    const values: unknown = JSON.parse(window.sessionStorage.getItem(completedStorageKey) || "[]");
    return Array.isArray(values) ? values.filter((value): value is string => typeof value === "string") : [];
  } catch { return []; }
}
function persistCompletedPlanFingerprint(fingerprint: string) {
  if (typeof window === "undefined") return;
  try {
    const fingerprints = new Set(loadCompletedPlanFingerprints());
    fingerprints.add(fingerprint);
    window.sessionStorage.setItem(completedStorageKey, JSON.stringify([...fingerprints]));
  } catch { /* current-page guard remains active if storage is unavailable */ }
}
function draftFromPending(pending: UncertainSubmission | undefined): Draft | undefined {
  const command = pending?.command;
  if (!command) return undefined;
  return command.kind === "GOODS" ? {
    companyId: String(command.companyId), kind: "GOODS", targetId: String(command.invoiceId), entryDate: command.entryDate,
    itemAmounts: Object.fromEntries(command.items.map(item => [String(item.orderItemId), item.quantityTons])),
    allocations: {}, walletAmount: "0", evidence: command.evidenceReference, reason: command.reason, payout: command.payoutReference,
  } : {
    companyId: String(command.companyId), kind: "RECEIPT", targetId: String(command.receiptId), entryDate: command.entryDate,
    itemAmounts: {}, allocations: Object.fromEntries(command.allocations.map(item => [String(item.receivableId), item.amount])),
    walletAmount: command.walletAmount, evidence: command.evidenceReference, reason: command.reason, payout: command.payoutReference,
  };
}

export default function AccountingPartialReturns({ companies, canManage = false, language = "en", onWalletPayout }: {
  companies: Company[]; canManage?: boolean; language?: string; onWalletPayout?: () => void;
}) {
  const [uncertain, setUncertain] = useState<UncertainSubmission | undefined>(() => loadPendingSubmission());
  const [draft, setDraft] = useState<Draft>(() => draftFromPending(uncertain) ?? ({
    companyId: companies[0] ? String(companies[0].id) : "", kind: "GOODS", targetId: "", entryDate: todayLocal(),
    itemAmounts: {}, allocations: {}, walletAmount: "0", evidence: "", reason: "", payout: "",
  }));
  const [page, setPage] = useState(1);
  const [plan, setPlan] = useState<PartialReturnPlan>();
  const [planKey, setPlanKey] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [sourceId, setSourceId] = useState(() => uncertain?.command.sourceId ?? "");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ id: number; journalId: number; duplicate: boolean }>();
  const [historyResolution, setHistoryResolution] = useState<"idle" | "checking" | "missing" | "error">("idle");
  const generation = useRef(0);
  const postedPlanFingerprints = useRef(new Set(loadCompletedPlanFingerprints()));
  const companyId = Number(draft.companyId);
  const companiesScope = companies.some(company => company.id === companyId);
  const targetsQuery = usePartialReturnTargets(companiesScope ? companyId : undefined);
  const historyQuery = usePartialReturnHistory(companiesScope ? companyId : undefined, page, 20);
  const previewMutation = usePreviewPartialReturn();
  const postMutation = usePostPartialReturn();
  const targets: PartialReturnTargets | undefined = targetsQuery.data?.companyId === companyId ? targetsQuery.data : undefined;
  const invoice = targets?.invoices.find(row => row.id === Number(draft.targetId));
  const receipt = targets?.receipts.find(row => row.id === Number(draft.targetId));

  const quote = useMemo<PartialReturnQuote | undefined>(() => {
    if (!companiesScope || !draft.targetId || !draft.entryDate || draft.entryDate > todayLocal()) return undefined;
    if (draft.kind === "GOODS") {
      const raw: PartialReturnQuote = {
        companyId, kind: "GOODS", invoiceId: Number(draft.targetId), entryDate: draft.entryDate,
        items: Object.entries(draft.itemAmounts).filter(([, amount]) => amount.trim()).map(([orderItemId, quantityTons]) => ({ orderItemId: Number(orderItemId), quantityTons: clean(quantityTons) })),
      };
      const parsed = partialReturnQuoteSchema.safeParse(raw);
      if (!parsed.success || !raw.items.length || !raw.items.every(row => positiveDecimal(row.quantityTons))) return undefined;
      return parsed.data;
    }
    const raw: PartialReturnQuote = {
      companyId, kind: "RECEIPT", receiptId: Number(draft.targetId), entryDate: draft.entryDate,
      allocations: Object.entries(draft.allocations).filter(([, amount]) => amount.trim()).map(([receivableId, amount]) => ({ receivableId: Number(receivableId), amount: clean(amount) })),
      walletAmount: clean(draft.walletAmount || "0"),
    };
    const parsed = partialReturnQuoteSchema.safeParse(raw);
    if (!parsed.success) return undefined;
    if (!raw.allocations.every(row => positiveDecimal(row.amount))
      || !decimalSyntax.test(raw.walletAmount) || (raw.allocations.length === 0 && !positiveDecimal(raw.walletAmount))) return undefined;
    return parsed.data;
  }, [companiesScope, companyId, draft]);
  const quoteKey = quote ? JSON.stringify(quote) : "";
  const currentPlan = plan && quoteKey && quoteKey === planKey ? plan : undefined;
  const currentPlanFingerprint = currentPlan ? partialReturnPlanFingerprint(quoteKey, currentPlan.planHash) : "";
  const latestScope = useRef({ companyId, quoteKey });
  latestScope.current = { companyId, quoteKey };
  const gateOpen = Boolean(currentPlan?.financialGateOpen);
  const valuation = currentPlan?.valuation;
  const receiptPayoutValid = partialReturnPayoutReferenceValid(draft.kind, draft.payout);
  const commandPreviewAvailable = Boolean(currentPlan && currentPlan.planHash && currentPlan.input.companyId === companyId
    && currentPlan.input.kind === draft.kind);
  const commandFieldsValid = draft.evidence.trim().length >= 5 && draft.reason.trim().length >= 5 && receiptPayoutValid;
  const canPost = Boolean(canManage && gateOpen && currentPlan?.postingAllowed && currentPlan.blockers.length === 0
    && valuation?.available && !valuation.blockingReason && confirmed && !uncertain
    && !partialReturnPlanAlreadyPosted(postedPlanFingerprints.current, quoteKey, currentPlan?.planHash ?? "")
    && draft.evidence.trim().length >= 5
    && draft.reason.trim().length >= 5 && receiptPayoutValid && commandPreviewAvailable && !postMutation.isPending);
  const history = historyQuery.data;
  const totalPages = history ? Math.max(1, Math.ceil(history.pagination.totalRows / history.pagination.pageSize)) : 1;
  const busy = previewMutation.isPending || postMutation.isPending;
  const formLocked = busy || Boolean(uncertain);
  const alreadyPosted = Boolean(currentPlanFingerprint && partialReturnPlanAlreadyPosted(postedPlanFingerprints.current, quoteKey, currentPlan?.planHash ?? ""));

  function changeFinancial(next: Partial<Draft>) {
    generation.current++;
    setDraft(old => ({ ...old, ...next }));
    setPlan(undefined); setPlanKey(""); setConfirmed(false); setSourceId(""); setResult(undefined); setMessage(""); setError("");
  }
  function updateText(next: Partial<Pick<Draft, "evidence" | "reason" | "payout">>) {
    setDraft(old => ({ ...old, ...next })); setConfirmed(false); setMessage(""); setError("");
  }
  async function refreshPreview() {
    setError(""); setMessage(""); setResult(undefined); setConfirmed(false);
    if (uncertain) { setError(t(language, "uncertainHelp")); return; }
    if (!quote || !companiesScope || quote.companyId !== companyId) { setError(t(language, "invalid")); return; }
    const requestGeneration = ++generation.current;
    const fingerprint = JSON.stringify(quote);
    try {
      const reviewed = await previewMutation.mutateAsync({ quote });
      if (generation.current !== requestGeneration || JSON.stringify(quote) !== fingerprint) return;
      setPlan(reviewed); setPlanKey(fingerprint);
    } catch (cause) {
      if (generation.current === requestGeneration) setError(cause instanceof Error ? cause.message : t(language, "failed"));
    }
  }
  async function submit() {
    setError(""); setMessage("");
    if (!quote || !currentPlan || !canPost || !companiesScope || currentPlan.input.companyId !== companyId) {
      setError(!canManage ? t(language, "readonly") : t(language, "previewRequired")); return;
    }
    const frozenKey = JSON.stringify(quote);
    const stableSource = sourceId || makeSourceId();
    setSourceId(stableSource);
    const raw = { ...quote, sourceId: stableSource, expectedPlanHash: currentPlan.planHash,
      evidenceReference: draft.evidence.trim(), reason: draft.reason.trim(), payoutReference: draft.kind === "RECEIPT" ? draft.payout.trim() : "",
      evidenceConfirmed: true as const };
    const parsed = partialReturnCommandSchema.safeParse(raw);
    if (!parsed.success) { setError(t(language, "invalid")); return; }
    const immutableCommand = JSON.parse(JSON.stringify(parsed.data)) as PartialReturnCommand;
    const pending = { command: immutableCommand, quoteKey: frozenKey, companyId: parsed.data.companyId };
    persistPendingSubmission(pending);
    setUncertain(pending);
    setHistoryResolution("idle");
    try {
      const posted = await postMutation.mutateAsync(immutableCommand);
      if (latestScope.current.quoteKey !== frozenKey || latestScope.current.companyId !== pending.companyId) return;
      const completedFingerprint = partialReturnPlanFingerprint(frozenKey, immutableCommand.expectedPlanHash);
      postedPlanFingerprints.current.add(completedFingerprint);
      persistCompletedPlanFingerprint(completedFingerprint);
      persistPendingSubmission(undefined);
      setUncertain(undefined);
      setResult(posted); setMessage(posted.duplicate ? t(language, "duplicate") : t(language, "success"));
      setPlan(undefined); setPlanKey(""); setConfirmed(false); setSourceId("");
      void Promise.all([targetsQuery.refetch(), historyQuery.refetch()]).catch(() => undefined);
    } catch (cause) {
      if (latestScope.current.quoteKey === frozenKey && latestScope.current.companyId === pending.companyId) setError(cause instanceof Error ? cause.message : t(language, "failedPost"));
    }
  }
  async function resolveUncertainFromHistory() {
    const pending = uncertain;
    if (!pending || historyResolution === "checking" || !companies.some(company => company.id === pending.companyId)) return;
    setError(""); setMessage(""); setHistoryResolution("checking");
    try {
      const row = await findPartialReturnBySource(pending.companyId, pending.command.sourceId);
      if (latestScope.current.companyId !== pending.companyId || latestScope.current.quoteKey !== pending.quoteKey) return;
      if (row) {
        const completedFingerprint = partialReturnPlanFingerprint(pending.quoteKey, pending.command.expectedPlanHash);
        postedPlanFingerprints.current.add(completedFingerprint);
        persistCompletedPlanFingerprint(completedFingerprint);
        persistPendingSubmission(undefined);
        setUncertain(undefined); setHistoryResolution("idle");
        setResult({ id: row.id, journalId: row.journalId, duplicate: true });
        setMessage(t(language, "historyFound"));
        setPlan(undefined); setPlanKey(""); setConfirmed(false); setSourceId("");
        void Promise.all([targetsQuery.refetch(), historyQuery.refetch()]).catch(() => undefined);
      } else {
        setHistoryResolution("missing");
        setMessage(t(language, "historyMissing"));
      }
    } catch (cause) {
      if (latestScope.current.companyId === pending.companyId && latestScope.current.quoteKey === pending.quoteKey) {
        setHistoryResolution("error");
        setError(cause instanceof Error ? cause.message : t(language, "historyCheckFailed"));
      }
    }
  }
  async function retryOriginalCommand() {
    const pending = uncertain;
    if (!pending || historyResolution === "idle" || historyResolution === "checking" || !companies.some(company => company.id === pending.companyId)) return;
    setError(""); setMessage("");
    try {
      const posted = await postMutation.mutateAsync(pending.command);
      if (latestScope.current.companyId !== pending.companyId || latestScope.current.quoteKey !== pending.quoteKey) return;
      const completedFingerprint = partialReturnPlanFingerprint(pending.quoteKey, pending.command.expectedPlanHash);
      postedPlanFingerprints.current.add(completedFingerprint);
      persistCompletedPlanFingerprint(completedFingerprint);
      persistPendingSubmission(undefined);
      setUncertain(undefined); setHistoryResolution("idle");
      setResult(posted); setMessage(posted.duplicate ? t(language, "duplicate") : t(language, "success"));
      setPlan(undefined); setPlanKey(""); setConfirmed(false); setSourceId("");
      void Promise.all([targetsQuery.refetch(), historyQuery.refetch()]).catch(() => undefined);
    } catch (cause) {
      if (latestScope.current.companyId === pending.companyId && latestScope.current.quoteKey === pending.quoteKey) {
        setError(cause instanceof Error ? cause.message : t(language, "failedPost"));
        setHistoryResolution("idle");
      }
    }
  }

  return <section dir={language === "fa" || language === "ar" ? "rtl" : "ltr"} data-testid="accounting-partial-returns" className="mt-5 overflow-hidden rounded-[22px] border border-[#dce2db] bg-[#fbfcf8] shadow-[0_14px_45px_-40px_rgba(29,57,50,.55)]">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e5e9e2] bg-[#f0f4ee] px-5 py-5 md:px-7">
      <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#20484a] text-[#f4f2e7]"><FileText className="h-5 w-5"/></span>
        <div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#829087]">MOMTAZCHEM · DOCUMENTED COMMAND</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.025em] text-[#273d3a]">{t(language,"title")}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#758179]">{t(language,"intro")}</p></div>
      </div><span className="inline-flex items-center gap-2 rounded-lg border border-[#dce7dc] bg-[#f7faf5] px-3 py-2 text-[10px] font-bold text-[#526b55]"><BadgeCheck className="h-4 w-4"/>HISTORY PRESERVED</span>
    </header>
    <div className="space-y-5 p-4 md:p-6">
      <div role="note" className="flex gap-3 rounded-xl border border-[#e6d9c4] bg-[#f8f1e5] p-3 text-xs leading-5 text-[#806844]"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0"/><div><p>{t(language,"noAutomaticPayout")}</p><p className="mt-1">{t(language,"blocked")}</p></div></div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label={t(language,"scope")}><select className={inputClass} value={draft.companyId} disabled={formLocked} onChange={e => { setPage(1); changeFinancial({ companyId: e.target.value, targetId: "", itemAmounts: {}, allocations: {} }); }}><option value="">{t(language,"chooseCompany")}</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name} · #{c.id}</option>)}</select></Field>
        <Field label={t(language,"kind")}><select className={inputClass} value={draft.kind} disabled={formLocked} onChange={e => changeFinancial({ kind: e.target.value as Kind, targetId: "", itemAmounts: {}, allocations: {} })}><option value="GOODS">{t(language,"goods")}</option><option value="RECEIPT">{t(language,"receipt")}</option></select></Field>
        <Field label={draft.kind === "GOODS" ? t(language,"invoice") : t(language,"receiptTarget")}>
          <select className={inputClass} value={draft.targetId} disabled={!targets || formLocked} onChange={e => changeFinancial({ targetId: e.target.value, itemAmounts: {}, allocations: {} })}>
            <option value="">{t(language,"chooseTarget")}</option>
            {draft.kind === "GOODS"
              ? targets?.invoices.map(row => <option key={row.id} value={row.id}>#{row.id} · {t(language,"customer")} #{row.customerId} · {row.currency} · {row.openAmount}</option>)
              : targets?.receipts.map(row => <option key={row.id} value={row.id}>#{row.id} · {t(language,"customer")} #{row.customerId} · {row.currency} · {row.amount}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label={t(language,"date")}><input type="date" max={todayLocal()} value={draft.entryDate} disabled={formLocked} onChange={e => changeFinancial({ entryDate: e.target.value })} className={inputClass}/></Field>
        <Fact label={t(language,"source")} value={sourceId || "—"} mono/>
      </div>
      {!companies.length && <Empty text={t(language,"noCompanies")}/>}
      {companies.length > 0 && !draft.companyId && <Empty text={t(language,"selectCompanyFirst")}/>}
      {targetsQuery.isLoading && companiesScope && <SkeletonBlock text={t(language,"loading")}/>}
      {targetsQuery.isError && companiesScope && <InlineError text={targetsQuery.error instanceof Error ? targetsQuery.error.message : t(language,"failed")} retry={t(language,"retry")} onClick={() => void targetsQuery.refetch()}/>}
      {companiesScope && draft.targetId && !quote && <p role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-xs text-[#883f37]">{t(language,"invalid")}</p>}
      {targets && draft.kind === "GOODS" && invoice && <section className="rounded-xl border border-[#e1e7df] bg-[#f7f9f5] p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-semibold text-[#344a44]">{t(language,"items")}</h3><Fact label={t(language,"invoice")} value={`#${invoice.id} · ${invoice.currency} ${invoice.amount} · open ${invoice.openAmount}`} mono/></div>
        <div className="space-y-2">{invoice.items.map(item => <div key={item.orderItemId} className="grid gap-2 rounded-lg border border-[#e3e9e1] bg-[#fbfcf8] p-3 sm:grid-cols-[1fr_1fr_1fr] sm:items-center">
          <Fact label={t(language,"id")} value={`Order item #${item.orderItemId}`} mono/><Fact label={t(language,"original")} value={`${item.originalTons} t`} mono/><div className="grid gap-2 sm:grid-cols-2"><Fact label={t(language,"returned")} value={`${item.returnedTons} t`} mono/><Field label={t(language,"returnQty")}><input inputMode="decimal" type="text" value={draft.itemAmounts[String(item.orderItemId)] ?? ""} disabled={formLocked} onChange={e => changeFinancial({ itemAmounts: { ...draft.itemAmounts, [String(item.orderItemId)]: clean(e.target.value) } })} className={`${inputClass} font-mono tabular-nums`}/></Field></div>
        </div>)}</div><p className="mt-3 text-xs text-[#806844]">{t(language,"noAutomaticPayout")}</p>
      </section>}
      {targets && draft.kind === "RECEIPT" && receipt && <section className="space-y-3 rounded-xl border border-[#e1e7df] bg-[#f7f9f5] p-4">
        <div className="grid gap-3 sm:grid-cols-3"><Fact label={t(language,"receiptOriginalAmount")} value={`${receipt.amount} ${receipt.currency}`} mono/><Fact label={t(language,"amountReturned")} value={`${receipt.returnedAmount} ${receipt.currency}`} mono/><Fact label={t(language,"customer")} value={`#${receipt.customerId} · ${receipt.method}`} mono/></div>
        <h3 className="text-sm font-semibold text-[#344a44]">{t(language,"allocations")}</h3>
        {receipt.allocations.map(item => <div key={item.receivableId} className="grid gap-2 rounded-lg border border-[#e3e9e1] bg-[#fbfcf8] p-3 sm:grid-cols-[1fr_1fr_1fr_1fr] sm:items-center">
          <Fact label={t(language,"id")} value={`Receivable #${item.receivableId}`} mono/><Fact label={t(language,"original")} value={`${item.amount} ${receipt.currency}`} mono/><Fact label={t(language,"returned")} value={`${item.returnedAmount} ${receipt.currency}`} mono/>
          <Field label={t(language,"amount")}><input type="text" inputMode="decimal" value={draft.allocations[String(item.receivableId)] ?? ""} disabled={formLocked} onChange={e => changeFinancial({ allocations: { ...draft.allocations, [String(item.receivableId)]: clean(e.target.value) } })} className={`${inputClass} font-mono tabular-nums`}/></Field>
        </div>)}
        <div className="grid gap-3 md:grid-cols-2"><Field label={t(language,"wallet")}><input type="text" inputMode="decimal" value={draft.walletAmount} disabled={formLocked} onChange={e => changeFinancial({ walletAmount: clean(e.target.value) })} className={`${inputClass} font-mono tabular-nums`}/></Field><p className="self-end text-xs leading-5 text-[#758179]">{t(language,"walletNote")} · {t(language,"amountReturned")}: {receipt.walletReturned} / {receipt.walletCredit} {receipt.currency}</p></div>
        {onWalletPayout && <aside className="space-y-2 rounded-lg border border-[#e6d9c4] bg-[#fcfaf5] p-3 md:col-span-2">
          <p className="text-xs leading-5 text-[#806844]">{t(language,"linkedPayoutPath")}</p>
          <button type="button" onClick={onWalletPayout} className="inline-flex h-9 items-center rounded-lg bg-[#735b3e] px-3 text-xs font-semibold text-[#fbf6ed] hover:bg-[#624b32]" data-testid="partial-return-wallet-payout-link">{t(language,"openWalletPayout")}</button>
        </aside>}
      </section>}
      {targets && !invoice && draft.kind === "GOODS" && draft.targetId && <Empty text={t(language,"selectTargetFirst")}/>}
      {targets && !receipt && draft.kind === "RECEIPT" && draft.targetId && <Empty text={t(language,"selectTargetFirst")}/>}
      <section className="grid gap-3 rounded-xl border border-[#e1e7df] bg-[#f7f9f5] p-4 md:grid-cols-2">
        <Field label={t(language,"evidence")}><input value={draft.evidence} maxLength={500} disabled={formLocked} onChange={e => updateText({ evidence: e.target.value })} className={inputClass}/></Field>
        <Field label={t(language,"reason")}><input value={draft.reason} maxLength={500} disabled={formLocked} onChange={e => updateText({ reason: e.target.value })} className={inputClass}/></Field>
        {draft.kind === "RECEIPT" && <div className="md:col-span-2"><Field label={t(language,"payout")}><input value={draft.payout} maxLength={150} disabled={formLocked} onChange={e => updateText({ payout: e.target.value })} className={inputClass}/></Field><p className="mt-1 text-[11px] text-[#758179]">{t(language,"payoutNote")}</p></div>}
        <div className="flex flex-wrap items-end gap-2 md:col-span-2"><button type="button" disabled={!canReviewPartialReturn(Boolean(quote), busy, Boolean(uncertain))} onClick={() => void refreshPreview()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#20484a] px-4 text-sm font-semibold text-[#f4f2e7] hover:bg-[#2d5d5c] disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className="h-4 w-4"/>{previewMutation.isPending ? t(language,"reviewing") : t(language,"preview")}</button>
          {quoteKey && planKey && quoteKey !== planKey && <span role="status" className="text-xs text-[#806844]">{t(language,"stale")}</span>}
          {alreadyPosted && <span role="status" className="text-xs text-[#526b55]">{t(language,"alreadyPosted")}</span>}
        </div>
      </section>
      {currentPlan && !uncertain && <PartialReturnPlanReview plan={currentPlan} language={language}/>}
      {currentPlan && !uncertain && <div className="space-y-3 rounded-xl border border-[#dce7dc] bg-[#f7faf5] p-4">
        {!currentPlan.financialGateOpen && <p role="note" className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] p-3 text-xs leading-5 text-[#806844]">{t(language,"gateClosed")}</p>}
        {!canManage && <p role="note" className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] p-3 text-xs text-[#806844]">{t(language,"readonly")}</p>}
        {(currentPlan.blockers.length > 0 || !currentPlan.postingAllowed || !valuation?.available) && <div><p className="mb-2 text-xs font-bold text-[#806844]">{t(language,"blockers")}</p><div className="flex flex-wrap gap-2">{[...currentPlan.blockers, ...(valuation?.blockingReason ? [valuation.blockingReason] : [])].map((item, i) => <span key={`${item}-${i}`} className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-2.5 py-1.5 text-xs text-[#806844]">{item}</span>)}</div></div>}
        {!commandFieldsValid && <p role="alert" className="text-xs text-[#883f37]">{t(language,"invalid")}</p>}
        <label className="flex items-start gap-2 rounded-lg border border-[#e3e9e1] bg-[#fbfcf8] p-3 text-xs leading-5 text-[#52665c]"><input type="checkbox" checked={confirmed} disabled={!commandPreviewAvailable || busy} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5 accent-[#20484a]"/>{t(language,"confirmEvidence")}</label>
        <button type="button" onClick={() => void submit()} disabled={!canPost || busy} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#20484a] px-4 text-sm font-semibold text-[#f4f2e7] hover:bg-[#2d5d5c] disabled:cursor-not-allowed disabled:opacity-50">{postMutation.isPending ? t(language,"posting") : t(language,"post")}</button>
      </div>}
      {uncertain && <section role="alert" className="space-y-3 rounded-xl border border-[#e6d9c4] bg-[#fcfaf5] p-4">
        <div><h3 className="text-sm font-semibold text-[#705638]">{t(language,"uncertainTitle")}</h3><p className="mt-1 text-xs leading-5 text-[#806844]">{t(language,"uncertainHelp")}</p><p className="mt-2 font-mono text-[11px] text-[#687970]" dir="ltr">Source · {uncertain.command.sourceId}</p></div>
        <details open className="rounded-lg border border-[#e5ded2] bg-[#fbfcf8]">
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-[#52665c]">{t(language,"originalCommand")}</summary>
          <pre dir="ltr" className="max-h-48 overflow-auto border-t border-[#e5ded2] p-3 text-[10px] leading-5 text-[#344a44]">{JSON.stringify(uncertain.command, null, 2)}</pre>
        </details>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || historyResolution === "checking" || !companiesScope} onClick={() => void resolveUncertainFromHistory()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d6dfd6] bg-[#fbfcf8] px-3 text-xs font-semibold text-[#365750] disabled:opacity-50">{historyResolution === "checking" ? t(language,"historyLoading") : t(language,"resolveHistory")}</button>
          <button type="button" disabled={busy || historyResolution === "idle" || historyResolution === "checking" || !companiesScope} onClick={() => void retryOriginalCommand()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#735b3e] px-3 text-xs font-semibold text-[#fbf6ed] disabled:opacity-50">{t(language,"retryOriginal")}</button>
        </div>
        {historyResolution === "missing" && <p role="status" className="text-xs text-[#806844]">{t(language,"historyMissing")}</p>}
        {historyResolution === "error" && <p role="status" className="text-xs text-[#806844]">{t(language,"historyCheckFailed")}</p>}
      </section>}
      {error && <div role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] p-3 text-sm text-[#883f37]"><div className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4"/>{t(language,"failed")}</div><p className="mt-1 break-words text-xs">{error}</p></div>}
      {message && result && <div role="status" className="rounded-lg border border-[#dce7dc] bg-[#f0f5ef] p-3 text-sm text-[#526b55]"><strong>{message}</strong><p className="mt-1 font-mono text-xs" dir="ltr">Return #{result.id} · {t(language,"journal")} #{result.journalId}</p></div>}
      <HistoryPanel query={historyQuery} language={language} page={page} totalPages={totalPages} onPage={setPage} companySelected={companiesScope}/>
    </div>
  </section>;
}

export function PartialReturnPlanReview({plan,language}:{plan:PartialReturnPlan;language:string}) {
  const v = plan.valuation;
  const positive = plan.postingAllowed && plan.financialGateOpen && v.available && !plan.blockers.length;
  return <section className={`space-y-3 rounded-xl border p-4 ${positive ? "border-[#dce7dc] bg-[#f7faf5]" : "border-[#e6d9c4] bg-[#fcfaf5]"}`} data-testid="partial-return-preview">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold text-[#344a44]">{t(language,"valuation")}</h3><span className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold ${positive ? "border-[#dce7dc] bg-[#eaf2e8] text-[#526b55]" : "border-[#e6d9c4] bg-[#f8f1e5] text-[#806844]"}`}>{positive ? t(language,"allowedStatus") : t(language,"blockedStatus")}</span></div>
    {!v.available && <p className="text-xs text-[#806844]">{v.blockingReason || t(language,"unavailable")}</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Fact label={t(language,"amount")} value={`${v.amount} ${v.currency}`} mono/><Fact label={t(language,"amountBase")} value={`${v.baseAmount} ${v.baseCurrency}`} mono/>
      <Fact label={t(language,"debtReduction")} value={`${v.debtReduction} ${v.currency} · ${v.debtBase} ${v.baseCurrency}`} mono/>
      <Fact label={t(language,"customerCredit")} value={`${v.customerCredit} ${v.currency} · ${v.creditBase} ${v.baseCurrency}`} mono/>
      <Fact label={t(language,"historical")} value={`${v.goods ?? "—"} ${v.currency} · ${v.goodsBase ?? "—"} ${v.baseCurrency}`} mono/>
      <Fact label={t(language,"tax")} value={`${v.tax ?? "—"} ${v.currency} · ${v.taxBase ?? "—"} ${v.baseCurrency}`} mono/>
      <Fact label={t(language,"cost")} value={`${v.baseCost} ${v.baseCurrency}`} mono/>
      {v.walletBefore !== null && <Fact label={`${t(language,"wallet")} · #${v.walletId ?? "—"}`} value={`${v.walletBefore} → ${v.walletAfter ?? "—"} ${v.currency}`} mono/>}
    </div>
    {v.items?.length ? <div className="overflow-x-auto rounded-lg border border-[#e3e9e1]"><table className="w-full min-w-[480px] text-start text-xs"><thead className="bg-[#f0f4ee]"><tr><th className="p-2">{t(language,"id")}</th><th className="p-2">{t(language,"returnQty")}</th><th className="p-2">{t(language,"goods")}</th><th className="p-2">{t(language,"tax")}</th></tr></thead><tbody className="divide-y divide-[#e9ede7]">{v.items.map(row => <tr key={row.orderItemId}><td className="p-2 font-mono">#{row.orderItemId}</td><td className="p-2 font-mono">{row.quantityTons} t</td><td className="p-2 font-mono">{row.goods} {v.currency}</td><td className="p-2 font-mono">{row.tax} {v.currency}</td></tr>)}</tbody></table></div> : null}
    <p className="font-mono text-[10px] text-[#718077]" dir="ltr">Plan hash · {plan.planHash}</p>
    <p className="text-xs font-medium text-[#806844]">{t(language,"noAutomaticPayout")}</p>
  </section>;
}

function HistoryPanel({query,language,page,totalPages,onPage,companySelected}:{query:ReturnType<typeof usePartialReturnHistory>;language:string;page:number;totalPages:number;onPage:(page:number)=>void;companySelected:boolean}) {
  const data = companySelected && query.data?.pagination.page === page && query.data.pagination.pageSize === 20 ? query.data : undefined;
  return <section className="overflow-hidden rounded-xl border border-[#e1e7df]">
    <header className="border-b border-[#e5e9e2] bg-[#f0f4ee] px-4 py-3"><h3 className="text-sm font-semibold text-[#344a44]">{t(language,"history")}</h3><p className="mt-1 text-xs text-[#758179]">{t(language,"historyIntro")}</p></header>
    {!companySelected ? <div className="p-4"><Empty text={t(language,"selectCompanyFirst")}/></div> :
      query.isLoading ? <SkeletonBlock text={t(language,"historyLoading")}/> :
      query.isError ? <div className="p-4"><InlineError text={query.error instanceof Error ? query.error.message : t(language,"failed")} retry={t(language,"retry")} onClick={() => void query.refetch()}/></div> :
      !data ? <div className="p-4"><Empty text={t(language,"historyLoading")}/></div> :
      !data.rows.length ? <div className="p-4"><Empty text={t(language,"empty")}/></div> :
      <div className="divide-y divide-[#e9ede7]">{data.rows.map(row => <article key={row.id} className="space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-xs text-[#344a44]">{row.kind === "GOODS" ? t(language,"kindGoods") : t(language,"kindReceipt")} · #{row.id} · {row.entryDate}</strong><span className="font-mono text-xs text-[#718077]" dir="ltr">{t(language,"journal")} #{row.journalId}</span></div>
        <div className="grid gap-x-5 gap-y-2 sm:grid-cols-2 xl:grid-cols-4"><Fact label={t(language,"amount")} value={`${row.valuation.amount} ${row.valuation.currency}`} mono/><Fact label={t(language,"debtReduction")} value={`${row.valuation.debtReduction} ${row.valuation.currency}`} mono/><Fact label={t(language,"evidence")} value={row.evidenceReference}/><Fact label={t(language,"reason")} value={row.reason}/><Fact label={t(language,"payout")} value={row.payoutReference || "—"}/><Fact label={t(language,"source")} value={row.sourceId} mono/></div>
      </article>)}
      </div>}
    {companySelected && data && data.pagination.totalRows > 0 && <footer className="flex items-center justify-between border-t border-[#e5e9e2] px-4 py-3 text-xs text-[#687970]"><span>{t(language,"page")} {page} / {totalPages} · {data.pagination.totalRows} {t(language,"rows")}</span><div className="flex gap-2"><button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className="rounded-md border border-[#d6dfd6] px-3 py-1.5 disabled:opacity-40">{t(language,"previous")}</button><button type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages} className="rounded-md border border-[#d6dfd6] px-3 py-1.5 disabled:opacity-40">{t(language,"next")}</button></div></footer>}
  </section>;
}

function Field({label,children}:{label:string;children:ReactNode}) { return <label className="block min-w-0 space-y-1.5 text-xs font-semibold text-[#53665d]"><span>{label}</span>{children}</label>; }
function Fact({label,value,mono=false}:{label:string;value:string;mono?:boolean}) { return <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#7b887f]">{label}</div><div dir={mono?"ltr":undefined} className={`mt-1 break-words text-xs text-[#344a44] ${mono?"font-mono tabular-nums":"font-medium"}`}>{displayAmount(value)}</div></div>; }
function Empty({text}:{text:string}) { return <div className="flex min-h-24 flex-col items-center justify-center rounded-xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-5 py-6 text-center"><FileText className="mb-2 h-5 w-5 text-[#547267]"/><p className="max-w-lg text-sm leading-6 text-[#687970]">{text}</p></div>; }
function SkeletonBlock({text}:{text:string}) { return <div role="status" className="space-y-3 p-4" aria-label={text}><p className="text-xs text-[#718077]">{text}</p><div className="h-10 animate-pulse rounded-lg bg-[#e8ede7]"/><div className="h-10 animate-pulse rounded-lg bg-[#e8ede7]"/></div>; }
function InlineError({text,retry,onClick}:{text:string;retry:string;onClick:()=>void}) { return <div role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] p-3 text-xs text-[#883f37]"><p>{text}</p><button type="button" onClick={onClick} className="mt-2 rounded border border-[#dfb8b0] px-3 py-1.5 font-semibold">{retry}</button></div>; }
