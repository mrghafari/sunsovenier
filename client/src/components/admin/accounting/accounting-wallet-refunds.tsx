import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { walletRefundCommandSchema, walletRefundQuoteSchema, type WalletRefundHistory, type WalletRefundPlan, type WalletRefundQuote } from "@shared/accounting-wallet-refunds";
import { useLanguage } from "@/contexts/LanguageContext";
import { normalizeAccountingDigits } from "./accounting-logic";
import { getWalletRefundHistory, previewWalletRefund, postWalletRefund } from "./accounting-wallet-refunds-api";
import { walletRefundText as t } from "./accounting-wallet-refunds-copy";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, BadgeCheck, CircleDollarSign, FileCheck2, ShieldAlert } from "lucide-react";

type Company = { id: number; name: string };
type Receipt = { companyId: number; id: number; journalId: number; movementId: number; duplicate: boolean; payoutReference: string };
type Channel = "BANK" | "CASH";
type Draft = { companyId: string; walletId: string; amount: string; entryDate: string; channel: Channel; payoutReference: string; evidenceReference: string; reason: string; goodsReturnId: string; receiptId: string };
const inputClass = "h-10 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 text-sm text-[#29423f] outline-none focus:border-[#60877a] focus:ring-2 focus:ring-[#60877a]/15 disabled:opacity-60";
const rtlLanguages = ["fa", "ar"];
const emptyDraft = (companyId: number | undefined): Draft => ({
  companyId: companyId ? String(companyId) : "", walletId: "", amount: "", entryDate: "", channel: "BANK", payoutReference: "", evidenceReference: "", reason: "", goodsReturnId: "", receiptId: "",
});
const sameQuote = (a: WalletRefundQuote, b: WalletRefundQuote) =>
  a.companyId === b.companyId && a.walletId === b.walletId && a.amount === b.amount
  && a.entryDate === b.entryDate && a.channel === b.channel
  && a.goodsReturnId === b.goodsReturnId && a.receiptId === b.receiptId;
const makeSourceId = () => globalThis.crypto?.randomUUID
  ? globalThis.crypto.randomUUID()
  : `wallet-refund-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function walletRefundSourceForCommand(fingerprint: string, sourceIds: Map<string, string>) {
  const previous = sourceIds.get(fingerprint);
  if (previous) return previous;
  const sourceId = makeSourceId();
  sourceIds.set(fingerprint, sourceId);
  return sourceId;
}
function parseWalletIdFilter(value: string): number | undefined {
  const normalized = normalizeAccountingDigits(value.trim());
  if (!/^\d+$/.test(normalized)) return undefined;
  const id = Number(normalized);
  return Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? id : undefined;
}

export default function AccountingWalletRefunds({ companies, defaultCompanyId, canManage = false }: {
  companies: Company[]; defaultCompanyId?: number; canManage?: boolean;
}) {
  const { language } = useLanguage();
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(defaultCompanyId ?? companies[0]?.id));
  const [plan, setPlan] = useState<WalletRefundPlan>();
  const [planLanguage, setPlanLanguage] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [postBusy, setPostBusy] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [receipt, setReceipt] = useState<Receipt>();
  const generation = useRef(0);
  const activeController = useRef<AbortController | undefined>(undefined);
  const lastDefaultCompanyId = useRef(defaultCompanyId);
  const manualCompanySelection = useRef(false);
  const postLock = useRef(false);
  const sourceIdsForCommand = useRef(new Map<string, string>());
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const invalidateQuote = useCallback(() => {
    generation.current += 1;
    activeController.current?.abort();
    activeController.current = undefined;
    setPreviewBusy(false);
    setPlan(undefined);
    setPlanLanguage("");
    setPreviewError("");
    setConfirmed(false);
  }, []);

  useEffect(() => {
    if (defaultCompanyId && defaultCompanyId !== lastDefaultCompanyId.current) {
      lastDefaultCompanyId.current = defaultCompanyId;
      manualCompanySelection.current = false;
      invalidateQuote();
      setDraft(current => ({ ...current, companyId: String(defaultCompanyId) }));
      setReceipt(undefined);
      setActionError("");
    }
  }, [defaultCompanyId, invalidateQuote]);

  useEffect(() => {
    invalidateQuote();
  }, [language, invalidateQuote]);

  useEffect(() => () => {
    generation.current += 1;
    activeController.current?.abort();
  }, []);

  const selectedCompanyId = Number(normalizeAccountingDigits(draft.companyId));
  const selectedCompany = companies.find(company => company.id === selectedCompanyId);
  const companyScopeSyncing = Boolean(defaultCompanyId && (lastDefaultCompanyId.current !== defaultCompanyId
    || (!manualCompanySelection.current && draft.companyId !== String(defaultCompanyId))));
  const quoteResult = walletRefundQuoteSchema.safeParse({
    companyId: selectedCompanyId,
    walletId: Number(normalizeAccountingDigits(draft.walletId.trim())),
    amount: normalizeAccountingDigits(draft.amount.trim()),
    entryDate: draft.entryDate,
    channel: draft.channel,
    ...(draft.goodsReturnId.trim() || draft.receiptId.trim() ? {
      goodsReturnId: Number(normalizeAccountingDigits(draft.goodsReturnId.trim())),
      receiptId: Number(normalizeAccountingDigits(draft.receiptId.trim())),
    } : {}),
  });
  const linkageEmpty = !draft.goodsReturnId.trim() && !draft.receiptId.trim();
  const linkageComplete = Boolean(draft.goodsReturnId.trim() && draft.receiptId.trim());
  const linkageValid = linkageEmpty || (linkageComplete && /^\d+$/.test(normalizeAccountingDigits(draft.goodsReturnId.trim()))
    && /^\d+$/.test(normalizeAccountingDigits(draft.receiptId.trim())));
  const currentPlan = plan && linkageValid && !companyScopeSyncing && planLanguage === language && quoteResult.success && sameQuote(plan.input, quoteResult.data)
    && plan.valuation.amount === quoteResult.data.amount && plan.valuation.walletId === quoteResult.data.walletId ? plan : undefined;
  const valuation = currentPlan?.valuation;
  const completeValuation = Boolean(valuation && valuation.available && !valuation.blockingReason
    && valuation.currency && valuation.baseCurrency && valuation.amount !== null
    && valuation.availableNative !== null && valuation.walletNativeBefore !== null && valuation.walletBaseBefore !== null
    && valuation.fundingNativeBefore !== null && valuation.fundingBaseBefore !== null
    && valuation.liabilityBase !== null && valuation.fundingBase !== null
    && valuation.fxGain !== null && valuation.fxLoss !== null && valuation.lines.length > 0);
  const eligiblePlan = Boolean(currentPlan && completeValuation && currentPlan.financialGateOpen
    && currentPlan.postingAllowed && currentPlan.blockers.length === 0);
  const payoutReferenceResult = walletRefundCommandSchema.shape.payoutReference.safeParse(draft.payoutReference);
  const payoutReferenceValid = payoutReferenceResult.success;
  const referenceValid = draft.evidenceReference.trim().length >= 5 && draft.evidenceReference.trim().length <= 500;
  const reasonValid = draft.reason.trim().length >= 5 && draft.reason.trim().length <= 500;
  const canPost = Boolean(canManage && eligiblePlan && payoutReferenceValid && referenceValid && reasonValid && confirmed && !postBusy);
  const currentReceipt = receipt;
  const historyWalletId = parseWalletIdFilter(draft.walletId);

  const edit = (patch: Partial<Draft>) => {
    if (patch.companyId !== undefined) manualCompanySelection.current = true;
    invalidateQuote();
    setDraft(current => ({ ...current, ...patch }));
    setActionError("");
    setReceipt(undefined);
  };

  const preview = async () => {
    setActionError("");
    setPreviewError("");
    setReceipt(undefined);
    const parsed = walletRefundQuoteSchema.safeParse({
      companyId: selectedCompanyId,
      walletId: Number(normalizeAccountingDigits(draft.walletId.trim())),
      amount: normalizeAccountingDigits(draft.amount.trim()),
      entryDate: draft.entryDate,
      channel: draft.channel,
      ...(draft.goodsReturnId.trim() || draft.receiptId.trim() ? {
        goodsReturnId: Number(normalizeAccountingDigits(draft.goodsReturnId.trim())),
        receiptId: Number(normalizeAccountingDigits(draft.receiptId.trim())),
      } : {}),
    });
    if (!selectedCompany || companyScopeSyncing || !linkageValid || !parsed.success) {
      setPreviewError(t(language, "validation"));
      return;
    }
    generation.current += 1;
    const thisGeneration = generation.current;
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    setPlan(undefined);
    setPlanLanguage("");
    setConfirmed(false);
    setPreviewBusy(true);
    try {
      const next = await previewWalletRefund(parsed.data, controller.signal);
      if (generation.current !== thisGeneration) return;
      if (!next || !next.input || !next.valuation || !sameQuote(next.input, parsed.data)
        || next.valuation.amount !== parsed.data.amount || next.valuation.walletId !== parsed.data.walletId
        || !/^[a-f0-9]{64}$/.test(next.planHash)) {
        setPreviewError(t(language, "quoteMismatch"));
        return;
      }
      setPlan(next);
      setPlanLanguage(language);
    } catch (error) {
      if (generation.current !== thisGeneration) return;
      if (error instanceof DOMException && error.name === "AbortError") return;
      setPreviewError(error instanceof Error ? error.message : t(language, "previewError"));
    } finally {
      if (generation.current === thisGeneration) {
        activeController.current = undefined;
        setPreviewBusy(false);
      }
    }
  };

  const post = async () => {
    if (postLock.current) return;
    setActionError("");
    const quote = quoteResult.success ? quoteResult.data : undefined;
    if (!canManage || !currentPlan || !quote || !linkageValid || !sameQuote(currentPlan.input, quote)
      || !eligiblePlan || !payoutReferenceValid || !referenceValid || !reasonValid || !confirmed || !selectedCompany || postBusy) {
      setActionError(!canManage ? t(language, "permission") : t(language, "gateRequirement"));
      return;
    }
    if (!window.confirm(t(language, "confirm"))) return;

    const commandWithoutSource = {
      ...quote,
      payoutReference: payoutReferenceResult.success ? payoutReferenceResult.data : "",
      expectedPlanHash: currentPlan.planHash,
      evidenceReference: draft.evidenceReference.trim(),
      reason: draft.reason.trim(),
      payoutDocumentConfirmed: true as const,
    };
    const fingerprint = JSON.stringify(commandWithoutSource);
    const sourceId = walletRefundSourceForCommand(fingerprint, sourceIdsForCommand.current);
    const command = walletRefundCommandSchema.safeParse({ ...commandWithoutSource, sourceId });
    if (!command.success) {
      setActionError(t(language, "validation"));
      return;
    }
    postLock.current = true;
    setPostBusy(true);
    try {
      const result = await postWalletRefund(command.data);
      setReceipt({ companyId: quote.companyId, ...result, payoutReference: result.payoutReference ?? command.data.payoutReference });
      setHistoryRefreshToken(current => current + 1);
      setPlan(undefined);
      setPlanLanguage("");
      setConfirmed(false);
      setActionError("");
    } catch (error) {
      const status = error && typeof error === "object" && "status" in error ? Number((error as { status: unknown }).status) : 0;
      const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code).toUpperCase() : "";
      const serverMessage = error instanceof Error ? error.message : "";
      const referenceConflict = `${code} ${serverMessage}`.toUpperCase();
      if (status === 409 && (referenceConflict.includes("PAYOUT_REFERENCE")
        || (referenceConflict.includes("DUPLICATE") && referenceConflict.includes("REFERENCE")))) {
        setActionError(t(language, "duplicateReference"));
      } else if (status === 409) {
        invalidateQuote();
        setActionError(t(language, "quoteInvalidated"));
      } else setActionError(error instanceof Error ? error.message : t(language, "actionError"));
    } finally {
      postLock.current = false;
      setPostBusy(false);
    }
  };

  return <section dir={rtlLanguages.includes(language) ? "rtl" : "ltr"} className="space-y-4" data-testid="accounting-wallet-refunds">
    <header className="overflow-hidden rounded-[22px] border border-[#e0d8ca] bg-[#fbfcf8] shadow-[0_14px_45px_-40px_rgba(29,57,50,.65)]">
      <div className="flex flex-wrap items-start justify-between gap-4 bg-[#f3f5ee] px-5 py-5 md:px-7">
        <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#20484a] text-[#f4f2e7]"><CircleDollarSign className="h-5 w-5"/></span>
          <div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#829087]">MOMTAZCHEM · CUSTOMER LIABILITY</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.025em] text-[#273d3a]">{t(language, "title")}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#758179]">{t(language, "intro")}</p></div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-lg border border-[#d8dfd7] bg-[#fbfcf8] px-3 py-2 text-[10px] font-bold text-[#52665c]"><BadgeCheck className="h-4 w-4"/>BANK / CASH · DOCUMENTED</span>
      </div>
      <div role="note" className="flex gap-3 border-t border-[#dfb6a8] bg-[#f7e9e3] px-5 py-4 text-[#743e35] md:px-7"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0"/><div className="space-y-2"><p className="text-xs font-bold leading-5">{t(language, "warning")}</p><p className="text-xs leading-5">{t(language, "openingEvidence")}</p></div></div>
    </header>

    <form onSubmit={event => { event.preventDefault(); void preview(); }} className="grid gap-3 rounded-2xl border border-[#dfe6de] bg-[#fbfcf8] p-4 md:grid-cols-2 xl:grid-cols-4 md:p-5">
      <Field label={t(language, "company")}><select aria-label={t(language, "company")} value={draft.companyId} disabled={postBusy} onChange={event => edit({ companyId: event.target.value })} className={inputClass} data-testid="wallet-refund-company">
        <option value="">{t(language, "chooseCompany")}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name} · #{company.id}</option>)}
      </select></Field>
      <Field label={t(language, "walletId")}><input required inputMode="numeric" autoComplete="off" maxLength={16} value={draft.walletId} onChange={event => edit({ walletId: normalizeAccountingDigits(event.target.value) })} disabled={postBusy} className={inputClass} data-testid="wallet-refund-wallet"/></Field>
      <Field label={t(language, "amount")}><input required inputMode="decimal" autoComplete="off" maxLength={80} value={draft.amount} onChange={event => edit({ amount: normalizeAccountingDigits(event.target.value) })} disabled={postBusy} className={inputClass} data-testid="wallet-refund-amount"/></Field>
      <Field label={t(language, "entryDate")}><input required type="date" value={draft.entryDate} onChange={event => edit({ entryDate: event.target.value })} disabled={postBusy} className={inputClass} data-testid="wallet-refund-date"/></Field>
      <Field label={t(language, "channel")}><select aria-label={t(language, "channel")} value={draft.channel} onChange={event => edit({ channel: event.target.value as Channel })} disabled={postBusy} className={inputClass} data-testid="wallet-refund-channel">
        <option value="BANK">{t(language, "bank")}</option><option value="CASH">{t(language, "cash")}</option>
      </select></Field>
      <div className="grid gap-3 rounded-xl border border-[#d8c9ac] bg-[#faf5e9] p-3 sm:grid-cols-2 md:col-span-2 xl:col-span-4">
        <p className="text-xs leading-5 text-[#705638] sm:col-span-2">{t(language, "returnLinkHelp")}</p>
        <Field label={t(language, "goodsReturnId")}><input inputMode="numeric" autoComplete="off" value={draft.goodsReturnId} onChange={event => edit({ goodsReturnId: normalizeAccountingDigits(event.target.value) })} disabled={postBusy} className={inputClass} data-testid="wallet-refund-goods-return-id"/></Field>
        <Field label={t(language, "receiptId")}><input inputMode="numeric" autoComplete="off" value={draft.receiptId} onChange={event => edit({ receiptId: normalizeAccountingDigits(event.target.value) })} disabled={postBusy} className={inputClass} data-testid="wallet-refund-receipt-id"/></Field>
        <p className="text-[11px] leading-5 text-[#806844] sm:col-span-2">{t(language, "returnCreditLimitation")}</p>
      </div>
      <Field label={t(language, "payoutReference")}><input required minLength={5} maxLength={150} autoComplete="off" value={draft.payoutReference} onChange={event => edit({ payoutReference: event.target.value })} disabled={postBusy} className={inputClass} data-testid="wallet-refund-payout-reference"/><span className="block text-[10px] font-normal leading-4 text-[#77867e]">{t(language, "payoutReferenceHelp")}</span></Field>
      <Field label={t(language, "evidenceReference")}><input required minLength={5} maxLength={500} value={draft.evidenceReference} onChange={event => edit({ evidenceReference: event.target.value })} disabled={postBusy} className={inputClass} data-testid="wallet-refund-evidence"/></Field>
      <Field label={t(language, "reason")}><textarea required minLength={5} maxLength={500} value={draft.reason} onChange={event => edit({ reason: event.target.value })} disabled={postBusy} className={`${inputClass} min-h-20 py-2`} data-testid="wallet-refund-reason"/></Field>
      <div className="flex items-end"><Button type="submit" disabled={!selectedCompany || companyScopeSyncing || !quoteResult.success || previewBusy || postBusy} className="w-full bg-[#20484a] text-[#f4f2e7] hover:bg-[#2d5d5c]" data-testid="wallet-refund-preview">
        <FileCheck2 className="me-2 h-4 w-4"/>{previewBusy ? t(language, "previewing") : t(language, "preview")}
      </Button></div>
      {!companies.length && <p className="rounded-lg border border-dashed border-[#d7e0d7] bg-[#f7f9f5] p-3 text-sm text-[#66776e] md:col-span-2 xl:col-span-4">{t(language, "noCompanies")}</p>}
    </form>

    {!canManage && <p className="rounded-lg border border-[#e6d8b7] bg-[#f6f0df] px-4 py-3 text-xs text-[#695638]">{t(language, "permission")}</p>}
    {previewError && <Alert variant="destructive" role="alert"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language, "previewError")}</AlertTitle><AlertDescription>{previewError}</AlertDescription></Alert>}
    {actionError && <Alert variant="destructive" role="alert"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language, "actionError")}</AlertTitle><AlertDescription>{actionError}</AlertDescription></Alert>}
    {currentReceipt && <section role="status" className="rounded-xl border border-[#cbdccf] bg-[#edf4eb] p-4 text-sm text-[#42634e]" data-testid="wallet-refund-receipt">
      <h3 className="font-bold">{t(language, "success")}</h3>
      {currentReceipt.duplicate && <p className="mt-1 text-xs">{t(language, "duplicate")}</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Fact label={t(language, "refundId")} value={`#${currentReceipt.id}`} mono/><Fact label={t(language, "journalId")} value={`#${currentReceipt.journalId}`} mono/><Fact label={t(language, "movementId")} value={`#${currentReceipt.movementId}`} mono/>
        <Fact label={t(language, "payoutReference")} value={currentReceipt.payoutReference} mono/>
      </div>
    </section>}
    {previewBusy && <div aria-label={t(language, "previewing")} className="space-y-3"><Skeleton className="h-16 rounded-xl bg-[#e8ede7]"/><Skeleton className="h-44 rounded-xl bg-[#e8ede7]"/></div>}
    {currentPlan ? <WalletRefundPlanCard plan={currentPlan} language={language}/> :
      !previewBusy && <div role="status" className="rounded-xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-4 py-4 text-sm leading-6 text-[#687970]">{currentReceipt ? t(language, "noPlan") : t(language, "choose")}</div>}
    {currentPlan && <section className="grid gap-4 rounded-2xl border border-[#dfe6de] bg-[#fbfcf8] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-[.1em] text-[#758179]">{t(language, "confirmTitle")}</h3>
        <label className="flex items-start gap-2 rounded-lg border border-[#e5ded2] bg-[#f8faf6] p-3 text-xs leading-5 text-[#52665c]">
          <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={!canManage || postBusy} className="mt-0.5 accent-[#20484a]" data-testid="wallet-refund-confirm"/>
          <span>{t(language, "confirm")}</span>
        </label>
        <p className="text-[11px] leading-5 text-[#77867e]">{t(language, "gateRequirement")}</p>
      </div>
      <Button type="button" disabled={!canPost} onClick={() => void post()} className="min-w-48 bg-[#735b3e] text-[#fbf6ed] hover:bg-[#624b32]" data-testid="wallet-refund-post">
        {postBusy ? t(language, "posting") : t(language, "post")}
      </Button>
    </section>}
    <WalletRefundHistoryPanel companyId={selectedCompany?.id} companyName={selectedCompany?.name} walletId={historyWalletId} language={language} refreshToken={historyRefreshToken}/>
  </section>;
}

export function WalletRefundPlanCard({ plan, language }: { plan: WalletRefundPlan; language: string }) {
  const value = plan.valuation;
  const currency = value.currency;
  const base = value.baseCurrency;
  const unavailable = t(language, "unavailable");
  const money = (amount: string | null, code: string | null) => amount === null || code === null ? unavailable : `${amount} ${code}`;
  const complete = value.available && !value.blockingReason && currency !== null && base !== null && value.amount !== null
    && value.availableNative !== null && value.walletNativeBefore !== null && value.walletBaseBefore !== null
    && value.fundingNativeBefore !== null && value.fundingBaseBefore !== null && value.liabilityBase !== null
    && value.fundingBase !== null && value.fxGain !== null && value.fxLoss !== null && value.lines.length > 0;
  const ready = complete && plan.financialGateOpen && plan.postingAllowed && plan.blockers.length === 0;
  return <section className="overflow-hidden rounded-2xl border border-[#dce3db] bg-[#fbfcf8]" data-testid="wallet-refund-plan">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5eae3] bg-[#f3f7f0] px-4 py-4 md:px-5">
      <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#829087]">{t(language, "policy")} · #{plan.input.walletId}</p><h3 className="font-display text-lg font-semibold text-[#294540]">{ready ? t(language, "planReady") : t(language, "planBlocked")}</h3></div>
      <span className={`rounded-lg border px-3 py-2 text-[10px] font-bold ${plan.financialGateOpen ? "border-[#cbdccf] bg-[#edf4eb] text-[#42634e]" : "border-[#e6d9c4] bg-[#f8f1e5] text-[#806844]"}`}>{plan.financialGateOpen ? t(language, "gateOpen") : t(language, "gateClosed")}</span>
    </header>
    <div className="space-y-4 p-4 md:p-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Fact label={t(language, "amountQuoted")} value={money(value.amount, currency)} mono/>
        <Fact label={t(language, "walletQuoted")} value={`#${value.walletId}${value.customerId === null ? "" : ` · customer #${value.customerId}`}`} mono/>
        <Fact label={t(language, "channelQuoted")} value={plan.input.channel}/>
        <Fact label={t(language, "available")} value={value.available ? money(value.availableNative, currency) : unavailable} mono/>
      </div>
      {value.returnCredit && <section className="rounded-xl border border-[#d8c9ac] bg-[#faf5e9] p-3" data-testid="wallet-refund-return-credit">
        <h4 className="mb-3 text-xs font-bold text-[#705638]">{t(language, "returnCreditTitle")}</h4>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Fact label={t(language, "goodsReturnId")} value={`#${value.returnCredit.goodsReturnId}`} mono/>
          <Fact label={t(language, "receiptId")} value={`#${value.returnCredit.receiptId}`} mono/>
          <Fact label={t(language, "originalCredit")} value={money(value.returnCredit.originalCredit, currency)} mono/>
          <Fact label={t(language, "availableCredit")} value={money(value.returnCredit.availableCredit, currency)} mono/>
          <Fact label={t(language, "receiptAvailable")} value={money(value.returnCredit.receiptAvailable, currency)} mono/>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-[#705638]">{t(language, "returnCreditLimitation")}</p>
      </section>}
      <div className="rounded-xl border border-[#dce7dc] bg-[#f3f7f0] p-3">
        <h4 className="mb-3 text-xs font-bold text-[#294540]">{t(language, "policy")}</h4>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Fact label={t(language, "walletNative")} value={money(value.walletNativeBefore, currency)} mono/>
          <Fact label={t(language, "walletBase")} value={money(value.walletBaseBefore, base)} mono/>
          <Fact label={`${t(language, "fundingTitle")} · ${plan.input.channel} · native`} value={money(value.fundingNativeBefore, currency)} mono/>
          <Fact label={`${t(language, "fundingTitle")} · ${plan.input.channel} · base`} value={money(value.fundingBaseBefore, base)} mono/>
        </div>
      </div>
      <div className="grid gap-3 rounded-xl border border-[#e5ded2] bg-[#faf8f2] p-3 md:grid-cols-2">
        <div><h4 className="mb-3 text-xs font-bold text-[#494337]">{t(language, "consumedTitle")}</h4><div className="grid gap-3 sm:grid-cols-2">
          <Fact label={t(language, "liabilityConsumed")} value={money(value.liabilityBase, base)} mono/>
          <Fact label={t(language, "fundingConsumed")} value={money(value.fundingBase, base)} mono/>
        </div></div>
        <div><h4 className="mb-3 text-xs font-bold text-[#494337]">{t(language, "fxTitle")}</h4><div className="grid gap-3 sm:grid-cols-2">
          <Fact label={t(language, "fxGainNative")} value={t(language, "fxNativeNotApplicable")}/>
          <Fact label={t(language, "fxGain")} value={money(value.fxGain, base)} mono/>
          <Fact label={t(language, "fxLossNative")} value={t(language, "fxNativeNotApplicable")}/>
          <Fact label={t(language, "fxLoss")} value={money(value.fxLoss, base)} mono/>
        </div><p className="mt-2 text-[11px] leading-5 text-[#77867e]">{t(language, "fxNativeNotApplicable")}</p></div>
      </div>
      {value.blockingReason && <p role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-xs text-[#883f37]">{value.blockingReason}</p>}
      {!complete && <p role="alert" className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-xs text-[#806844]">{t(language, "valuationIncomplete")}</p>}
      {!value.available && <p role="alert" className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-xs text-[#806844]">{t(language, "unavailable")}</p>}
      {!plan.financialGateOpen && <p role="alert" className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-xs text-[#806844]">{t(language, "gateClosed")}</p>}
       {plan.blockers.length > 0 && <div><h4 className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#829087]">{t(language, "blockers")}</h4><ul className="space-y-1">{plan.blockers.map((blocker, index) => { const key = `blocker_${blocker}`; const text = t(language, key); return <li key={`${blocker}-${index}`} className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-xs text-[#806844]">{text === key ? blocker.replaceAll("_", " ") : text}</li>; })}</ul></div>}
      <div>
        <h4 className="mb-2 text-xs font-bold text-[#294540]">{t(language, "linesTitle")}</h4>
        {value.lines.length ? <div className="overflow-x-auto rounded-xl border border-[#e1e7df]"><table className="w-full min-w-[800px] text-start text-xs">
          <thead className="bg-[#f0f4ee] text-[#6e7e74]"><tr>{["account","nativeCurrency","debit","credit","baseDebit","baseCredit","description"].map(key=><th key={key} className="px-3 py-2 font-semibold">{t(language,key)}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#e8ede6]">{value.lines.map((line,index)=><tr key={`${line.accountId}-${index}`}><td className="px-3 py-2 font-mono">#{line.accountId}</td><td className="px-3 py-2">{line.currency}</td><td dir="ltr" className="px-3 py-2 font-mono tabular-nums">{line.debit} {line.currency}</td><td dir="ltr" className="px-3 py-2 font-mono tabular-nums">{line.credit} {line.currency}</td><td dir="ltr" className="px-3 py-2 font-mono tabular-nums">{line.baseDebit} {base ?? ""}</td><td dir="ltr" className="px-3 py-2 font-mono tabular-nums">{line.baseCredit} {base ?? ""}</td><td className="px-3 py-2">{line.description}</td></tr>)}</tbody>
        </table></div> : <p className="rounded-lg border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-3 py-2 text-xs text-[#758179]">{t(language, "missingLines")}</p>}
      </div>
    </div>
  </section>;
}

function WalletRefundHistoryPanel({ companyId, companyName, walletId, language, refreshToken }: {
  companyId?: number; companyName?: string; walletId?: number; language: string; refreshToken: number;
}) {
  const [pageState, setPageState] = useState<{ scope: string; page: number }>({ scope: "", page: 1 });
  const [retryToken, setRetryToken] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; history: WalletRefundHistory }>();
  const [failed, setFailed] = useState<{ key: string; message: string }>();
  const generation = useRef(0);
  const scope = `${companyId ?? ""}:${walletId ?? ""}`;
  const page = pageState.scope === scope ? pageState.page : 1;
  const queryKey = `${scope}:${page}:${refreshToken}:${retryToken}`;
  const currentHistory = loaded?.key === queryKey ? loaded.history : undefined;
  const currentError = failed?.key === queryKey ? failed.message : undefined;

  useEffect(() => {
    if (!companyId) return;
    const requestId = ++generation.current;
    let active = true;
    const controller = new AbortController();
    let request: Promise<WalletRefundHistory>;
    try {
      request = getWalletRefundHistory({ companyId, walletId, page, pageSize: 20 }, controller.signal);
    } catch (error) {
      setFailed({ key: queryKey, message: error instanceof Error ? error.message : t(language, "historyError") });
      return () => { active = false; generation.current += 1; controller.abort(); };
    }
    void request.then(history => {
      if (active && generation.current === requestId) setLoaded({ key: queryKey, history });
    }).catch(error => {
      if (!active || generation.current !== requestId || (error instanceof DOMException && error.name === "AbortError")) return;
      setFailed({ key: queryKey, message: error instanceof Error ? error.message : t(language, "historyError") });
    });
    return () => {
      active = false;
      generation.current += 1;
      controller.abort();
    };
  }, [companyId, walletId, page, queryKey, language]);

  const pageCount = currentHistory ? Math.max(1, Math.ceil(currentHistory.pagination.totalRows / currentHistory.pagination.pageSize)) : 1;
  const loading = Boolean(companyId && !currentHistory && !currentError);
  return <section className="overflow-hidden rounded-2xl border border-[#dfe6de] bg-[#fbfcf8]" data-testid="wallet-refund-history">
    <header className="border-b border-[#e5eae3] bg-[#f3f7f0] px-4 py-4 md:px-5">
      <h3 className="font-display text-lg font-semibold text-[#294540]">{t(language, "historyTitle")}</h3>
      <p className="mt-1 text-xs leading-5 text-[#687970]">{t(language, "historyIntro")}</p>
      <p className="mt-1 text-[11px] leading-5 text-[#77867e]">{t(language, "historyImmutable")}</p>
      {companyId && <p className="mt-1 text-[10px] font-semibold text-[#758179]">{t(language, "historyScope")} · {companyName} · #{companyId}{walletId ? ` · #${walletId}` : ""}</p>}
    </header>
    <div className="space-y-3 p-4 md:p-5">
      {!companyId && <p role="status" className="rounded-lg border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-3 py-3 text-sm text-[#687970]">{t(language, "historyNoCompany")}</p>}
      {loading && <div aria-label={t(language, "historyLoading")} className="space-y-2"><Skeleton className="h-8 rounded-lg bg-[#e8ede7]"/><Skeleton className="h-32 rounded-lg bg-[#e8ede7]"/></div>}
      {currentError && <Alert variant="destructive" role="alert"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language, "historyError")}</AlertTitle><AlertDescription className="flex flex-wrap items-center justify-between gap-3"><span>{currentError}</span><Button type="button" variant="outline" size="sm" onClick={() => setRetryToken(value => value + 1)}>{t(language, "historyRetry")}</Button></AlertDescription></Alert>}
      {currentHistory && currentHistory.rows.length === 0 && currentHistory.pagination.totalRows === 0
        && <p role="status" className="rounded-lg border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-3 py-3 text-sm text-[#687970]">{t(language, "historyEmpty")}</p>}
      {currentHistory && currentHistory.rows.length === 0 && currentHistory.pagination.totalRows > 0
        && <p role="status" className="rounded-lg border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-3 py-3 text-sm text-[#687970]">{t(language, "historyEmptyPage")}</p>}
      {currentHistory && currentHistory.rows.length > 0 && <WalletRefundHistoryTable rows={currentHistory.rows} language={language}/>}
      {currentHistory && currentHistory.pagination.totalRows > 0 && <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#687970]">{t(language, "historyPage")} {currentHistory.pagination.page} {t(language, "historyOf")} {pageCount} · {currentHistory.pagination.totalRows} {t(language, "historyRows")}</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPageState({ scope, page: Math.max(1, page - 1) })}>{t(language, "historyPrevious")}</Button>
          <Button type="button" variant="outline" size="sm" disabled={page >= pageCount || loading} onClick={() => setPageState({ scope, page: Math.min(pageCount, page + 1) })}>{t(language, "historyNext")}</Button>
        </div>
      </div>}
    </div>
  </section>;
}

export function WalletRefundHistoryTable({ rows, language }: { rows: WalletRefundHistory["rows"]; language: string }) {
  const columns = [
    ["entryDate", (row: WalletRefundHistory["rows"][number]) => row.entryDate],
    ["channel", (row: WalletRefundHistory["rows"][number]) => row.channel],
    ["walletId", (row: WalletRefundHistory["rows"][number]) => `#${row.walletId}`],
    ["amount", (row: WalletRefundHistory["rows"][number]) => `${row.amount} ${row.currency}`],
    ["liabilityConsumed", (row: WalletRefundHistory["rows"][number]) => `${row.liabilityBase} ${row.baseCurrency}`],
    ["fundingConsumed", (row: WalletRefundHistory["rows"][number]) => `${row.fundingBase} ${row.baseCurrency}`],
    ["fxGain", (row: WalletRefundHistory["rows"][number]) => `${row.fxGain} ${row.baseCurrency}`],
    ["fxLoss", (row: WalletRefundHistory["rows"][number]) => `${row.fxLoss} ${row.baseCurrency}`],
    ["payoutReference", (row: WalletRefundHistory["rows"][number]) => row.payoutReference],
    ["evidenceReference", (row: WalletRefundHistory["rows"][number]) => row.evidenceReference],
    ["reason", (row: WalletRefundHistory["rows"][number]) => row.reason],
    ["journalId", (row: WalletRefundHistory["rows"][number]) => `#${row.journalId}`],
    ["movementId", (row: WalletRefundHistory["rows"][number]) => `#${row.movementId}`],
    ["goodsReturnId", (row: WalletRefundHistory["rows"][number]) => row.goodsReturnId ? `#${row.goodsReturnId}` : "—"],
    ["receiptId", (row: WalletRefundHistory["rows"][number]) => row.receiptId ? `#${row.receiptId}` : "—"],
  ] as const;
  return <div className="overflow-x-auto rounded-xl border border-[#e1e7df]">
    <table className="w-full min-w-[1700px] text-start text-xs">
      <thead className="bg-[#f0f4ee] text-[#6e7e74]"><tr>{columns.map(([key]) => <th key={key} className="px-3 py-2 font-semibold">{t(language, key)}</th>)}</tr></thead>
      <tbody className="divide-y divide-[#e8ede6]">{rows.map(row => <tr key={row.id}>
        {columns.map(([key, value]) => <td key={key} dir={["amount","liabilityConsumed","fundingConsumed","fxGain","fxLoss","journalId","movementId","walletId","entryDate","channel","payoutReference","evidenceReference"].includes(key) ? "ltr" : key === "reason" ? "auto" : undefined}
          className={`max-w-72 px-3 py-2 align-top ${["amount","liabilityConsumed","fundingConsumed","fxGain","fxLoss","journalId","movementId","walletId"].includes(key) ? "font-mono tabular-nums" : "whitespace-normal"}`}>{value(row)}</td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5 text-xs font-semibold text-[#53665d]"><span>{label}</span>{children}</label>;
}
function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#7b887f]">{label}</div><div dir={mono ? "ltr" : undefined} className={`mt-1 break-words text-xs text-[#344a44] ${mono ? "font-mono tabular-nums" : "font-medium"}`}>{value}</div></div>;
}
