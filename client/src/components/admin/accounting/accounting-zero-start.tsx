import { useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { zeroStartCommandSchema } from "@shared/accounting-zero-start";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CalendarDays, ShieldCheck, ShieldAlert } from "lucide-react";
import { useActivateZeroStart, useZeroStartState } from "./accounting-zero-start-api";
import { zeroStartText as t } from "./accounting-zero-start-copy";

export const independentZeroStartDate = "2026-10-06";

type SelectionGuard = { companyId?: number; generation: number };
export function zeroStartSelectionIsCurrent(current: SelectionGuard, captured: SelectionGuard) {
  return current.companyId === captured.companyId && current.generation === captured.generation;
}

export default function AccountingZeroStart(props: {
  companyId?: number; canManage: boolean; language: string;
}) {
  const selectionGuard = useRef<SelectionGuard>({ companyId: props.companyId, generation: 0 });
  if (selectionGuard.current.companyId !== props.companyId) {
    selectionGuard.current = { companyId: props.companyId, generation: selectionGuard.current.generation + 1 };
  }
  return <ZeroStartCompanyPanel key={props.companyId ?? "no-company"} {...props} selectionGuard={selectionGuard}/>;
}

function ZeroStartCompanyPanel({ companyId, canManage, language, selectionGuard }: {
  companyId?: number; canManage: boolean; language: string; selectionGuard: MutableRefObject<SelectionGuard>;
}) {
  const rtl = language === "fa" || language === "ar";
  const stateQuery = useZeroStartState(companyId);
  const activation = useActivateZeroStart();
  const [reason, setReason] = useState("");
  const [preserveLegacyConfirmed, setPreserveLegacyConfirmed] = useState(false);
  const [zeroOpeningConfirmed, setZeroOpeningConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const state = stateQuery.data;
  const reasonValid = reason.trim().length >= 5 && reason.trim().length <= 500;
  const canActivate = Boolean(companyId && state && !state.approved && canManage
    && reasonValid && preserveLegacyConfirmed && zeroOpeningConfirmed && !activation.isPending);

  async function activate() {
    setMessage("");
    if (!companyId || !state || state.approved || !canManage || !reasonValid || !preserveLegacyConfirmed || !zeroOpeningConfirmed) return;
    const parsed = zeroStartCommandSchema.safeParse({
      companyId,
      startsOn: independentZeroStartDate,
      reason: reason.trim(),
      preserveLegacyConfirmed: true,
      zeroOpeningConfirmed: true,
    });
    if (!parsed.success) return;
    if (!window.confirm(t(language, "confirmation"))) return;
    const capturedSelection = { ...selectionGuard.current };
    try {
      const result = await activation.mutateAsync(parsed.data);
      if (!zeroStartSelectionIsCurrent(selectionGuard.current, capturedSelection)) return;
      setMessage(result.duplicate ? t(language, "duplicate") : t(language, "submitSuccess"));
    } catch {
      if (!zeroStartSelectionIsCurrent(selectionGuard.current, capturedSelection)) return;
      // The mutation error is rendered verbatim below, including server authorization/conflict codes.
    }
  }

  return <section dir={rtl ? "rtl" : "ltr"} className="space-y-4 overflow-hidden rounded-[22px] border border-[#dce3db] bg-[#fbfcf8] shadow-[0_14px_45px_-40px_rgba(29,57,50,.55)]" data-testid="accounting-zero-start">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e5eae3] bg-[#f3f7f0] px-5 py-5 md:px-7">
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#20484a] text-[#f4f2e7]"><CalendarDays className="h-5 w-5"/></span>
        <div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#829087]">MOMTAZCHEM · CONTROLLED START</div>
          <h3 className="mt-1 font-display text-xl font-semibold tracking-[-.02em] text-[#273d3a]">{t(language, "title")}</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#758179]">{t(language, "intro")}</p>
        </div>
      </div>
      {companyId && <span className="rounded-lg border border-[#d8dfd7] bg-[#fbfcf8] px-3 py-2 text-[10px] font-bold text-[#52665c]" dir="ltr">COMPANY · #{companyId}</span>}
    </header>

    <div className="space-y-4 px-4 pb-4 md:px-5 md:pb-5">
      <div className="grid gap-3 md:grid-cols-3">
        <PolicyCard icon={<ShieldAlert className="h-4 w-4"/>} title={t(language, "preserveTitle")} text={t(language, "preserve")} tone="warning"/>
        <PolicyCard icon={<ShieldCheck className="h-4 w-4"/>} title={t(language, "date")} text={`${independentZeroStartDate} · ${t(language, "cost")}`} tone="neutral"/>
        <PolicyCard icon={<ShieldAlert className="h-4 w-4"/>} title={t(language, "foreignTitle")} text={t(language, "foreign")} tone="warning"/>
      </div>

      {!companyId && <p role="status" className="rounded-lg border border-dashed border-[#d7e0d7] bg-[#f7f9f5] p-3 text-sm text-[#687970]" data-testid="zero-start-no-company">{t(language, "chooseCompany")}</p>}
      {companyId && stateQuery.isLoading && <div aria-label={t(language, "loading")} className="space-y-2" data-testid="zero-start-loading"><Skeleton className="h-12 rounded-lg bg-[#e8ede7]"/><Skeleton className="h-20 rounded-lg bg-[#e8ede7]"/></div>}
      {companyId && stateQuery.isError && <Alert variant="destructive" role="alert" data-testid="zero-start-state-error">
        <AlertCircle className="h-4 w-4"/><AlertTitle>{t(language, "error")}</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3"><span>{formatApiError(stateQuery.error, t(language, "stateError"))}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void stateQuery.refetch()}>{t(language, "retry")}</Button></AlertDescription>
      </Alert>}

      {state && <section className="space-y-3 rounded-xl border border-[#dfe6de] bg-[#f7f9f5] p-4" data-testid="zero-start-server-state">
        <h4 className="text-xs font-bold uppercase tracking-[.1em] text-[#758179]">{t(language, "status")}</h4>
        <div className="grid gap-2 sm:grid-cols-2">
          <Status label={t(language, "approved")} value={state.approved ? t(language, "approved") : t(language, "notApproved")} active={state.approved}/>
          <Status label={t(language, "active")} value={state.active ? t(language, "active") : t(language, "inactive")} active={state.active}/>
          <Datum label={t(language, "effectiveDate")} value={state.startsOn ?? "—"}/>
          <Datum label={t(language, "firstOrder")} value={state.firstOrderId === null ? "—" : `#${state.firstOrderId}`}/>
          <Datum label={t(language, "wallets")} value={String(state.excludedWalletCount)}/>
          <Datum label={t(language, "documents")} value={String(state.excludedDocumentCount)}/>
        </div>
        {state.approved && !state.active && <p className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-xs leading-5 text-[#806844]" data-testid="zero-start-approved-inactive">{t(language, "approvedInactive")}</p>}
        {state.approved && <p className="text-xs leading-5 text-[#687970]" data-testid="zero-start-immutable">{t(language, "noChange")}</p>}
      </section>}

      {companyId && state && !state.approved && <>
        {!canManage && <p className="rounded-lg border border-[#e6d8b7] bg-[#f6f0df] px-4 py-3 text-xs leading-5 text-[#695638]" data-testid="zero-start-viewer">{t(language, "viewer")}</p>}
        {canManage && <div className="space-y-3 rounded-xl border border-[#dfe6de] bg-[#faf8f2] p-4" data-testid="zero-start-controls">
          <label className="block space-y-1.5 text-xs font-semibold text-[#53665d]">
            <span>{t(language, "date")}</span>
            <input type="date" readOnly value={independentZeroStartDate} className="h-10 w-full rounded-lg border border-[#d4ddd4] bg-[#f1f3ed] px-3 text-sm font-mono text-[#29423f]" data-testid="zero-start-date"/>
          </label>
          <label className="block space-y-1.5 text-xs font-semibold text-[#53665d]">
            <span>{t(language, "reason")}</span>
            <textarea maxLength={500} value={reason} disabled={activation.isPending} onChange={event => setReason(event.target.value)}
              placeholder={t(language, "reasonPlaceholder")} className="min-h-20 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 py-2 text-sm text-[#29423f] outline-none focus:border-[#60877a] focus:ring-2 focus:ring-[#60877a]/15 disabled:opacity-60" data-testid="zero-start-reason"/>
          </label>
          {reason.length > 0 && !reasonValid && <p className="text-xs text-[#806844]" role="status">{t(language, "noReason")}</p>}
          <label className="flex items-start gap-2 rounded-lg border border-[#e5ded2] bg-[#fbfcf8] p-3 text-xs leading-5 text-[#52665c]">
            <input type="checkbox" checked={preserveLegacyConfirmed} disabled={activation.isPending} onChange={event => setPreserveLegacyConfirmed(event.target.checked)} className="mt-0.5 accent-[#20484a]" data-testid="zero-start-preserve-confirm"/>
            <span>{t(language, "preserveConfirm")}</span>
          </label>
          <label className="flex items-start gap-2 rounded-lg border border-[#e5ded2] bg-[#fbfcf8] p-3 text-xs leading-5 text-[#52665c]">
            <input type="checkbox" checked={zeroOpeningConfirmed} disabled={activation.isPending} onChange={event => setZeroOpeningConfirmed(event.target.checked)} className="mt-0.5 accent-[#20484a]" data-testid="zero-start-open-confirm"/>
            <span>{t(language, "zeroConfirm")}</span>
          </label>
          <p className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-xs leading-5 text-[#806844]">{t(language, "foreign")}</p>
          <Button type="button" disabled={!canActivate} onClick={() => void activate()} className="bg-[#735b3e] text-[#fbf6ed] hover:bg-[#624b32]" data-testid="zero-start-activate">
            {activation.isPending ? t(language, "submitting") : t(language, "submit")}
          </Button>
        </div>}
      </>}

      {message && <p role="status" className="rounded-lg border border-[#cbdccf] bg-[#edf4eb] p-3 text-xs leading-5 text-[#42634e]" data-testid="zero-start-success">{message}</p>}
      {activation.isError && <Alert variant="destructive" role="alert" data-testid="zero-start-activation-error">
        <AlertCircle className="h-4 w-4"/><AlertTitle>{t(language, "error")}</AlertTitle>
        <AlertDescription>{formatApiError(activation.error, t(language, "activationFallback"))}</AlertDescription>
      </Alert>}
    </div>
  </section>;
}

function PolicyCard({ icon, title, text, tone }: { icon: ReactNode; title: string; text: string; tone: "warning" | "neutral" }) {
  const style = tone === "warning" ? "border-[#e6d9c4] bg-[#fcfaf5] text-[#705638]" : "border-[#dce5d9] bg-[#f7faf5] text-[#52665c]";
  return <article className={`rounded-xl border p-3 ${style}`}><h4 className="mb-1 flex items-center gap-2 text-xs font-bold">{icon}<span>{title}</span></h4><p className="text-[11px] leading-5">{text}</p></article>;
}

function Status({ label, value, active }: { label: string; value: string; active: boolean }) {
  return <div className="rounded-lg border border-[#e1e7df] bg-[#fbfcf8] p-3"><dt className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#7b887f]">{label}</dt><dd className={`mt-1 text-xs font-bold ${active ? "text-[#42634e]" : "text-[#806844]"}`}>{value}</dd></div>;
}

function Datum({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-[#e1e7df] bg-[#fbfcf8] p-3"><dt className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#7b887f]">{label}</dt><dd dir="ltr" className="mt-1 text-xs font-mono tabular-nums text-[#344a44]">{value}</dd></div>;
}

function formatApiError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const details = error as Error & { code?: unknown; status?: unknown };
  return [
    typeof details.status === "number" ? `HTTP ${details.status}` : "",
    typeof details.code === "string" ? details.code : "",
    details.message,
  ].filter(Boolean).join(" · ");
}
