import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { AccountingCustomerAccounts } from "@shared/accounting-customer-accounts";
import { useSetCustomerAccountCreditLimit } from "@/lib/accounting-customer-accounts-api";
import { normalizeAccountingDigits } from "./accounting-logic";
import { customerAccountsText as t } from "./accounting-customer-accounts-copy";
import { Button } from "@/components/ui/button";

type Account = AccountingCustomerAccounts["accounts"][number];
type Mutation = ReturnType<typeof useSetCustomerAccountCreditLimit>;

export default function AccountingCustomerCreditLimit({ account, companyId, canManage, scopeMatches, pendingScopeMutation, mutation, onRefresh, language }: {
  account: Account; companyId: number; canManage: boolean; scopeMatches: boolean; pendingScopeMutation: boolean;
  mutation: Mutation; onRefresh: () => Promise<unknown>; language: string;
}) {
  const [limit, setLimit] = useState(account.creditLimit);
  const [reason, setReason] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ creditLimit: string; duplicate: boolean }>();
  const [refreshFailed, setRefreshFailed] = useState(false);
  const submitLock = useRef(false);
  const currentLimit = result?.creditLimit ?? account.creditLimit;
  const normalizedLimit = normalizeAccountingDigits(limit.trim());
  const scopeReady = Number.isInteger(companyId) && companyId > 0 && Number.isInteger(account.id) && account.id > 0
    && scopeMatches && !pendingScopeMutation && !mutation.isPending;
  const valid = isValidCreditLimit(normalizedLimit) && reason.trim().length >= 5;
  const disabled = !canManage || !scopeReady || Boolean(result);

  const review = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!scopeReady || !canManage) return;
    if (!isValidCreditLimit(normalizedLimit)) { setError(t(language, "creditLimitInvalid")); return; }
    if (reason.trim().length < 5) { setError(t(language, "creditReasonHelp")); return; }
    setReviewing(true);
    setConfirmed(false);
  };
  const save = async () => {
    if (submitLock.current || !scopeReady || !canManage || !reviewing || !confirmed || !valid) {
      if (!confirmed) setError(t(language, "confirmationRequired"));
      return;
    }
    submitLock.current = true;
    setError("");
    setRefreshFailed(false);
    try {
      const updated = await mutation.mutateAsync({ companyId, walletId: account.id, creditLimit: normalizedLimit, reason: reason.trim(), confirmed: true });
      setResult({ creditLimit: updated.creditLimit, duplicate: updated.duplicate });
      setReviewing(false);
      setConfirmed(false);
      try { await onRefresh(); } catch { setRefreshFailed(true); }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t(language, "creditLimitError"));
      setReviewing(false);
      setConfirmed(false);
    } finally {
      submitLock.current = false;
    }
  };

  return <section data-testid={`customer-credit-limit-${account.id}`} className="rounded-xl border border-[#dce4dc] bg-[#fbfcf8] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h4 className="font-display text-sm font-semibold text-[#294540]">{t(language, "creditTitle")}</h4>
        <p className="mt-1 text-xs leading-5 text-[#758179]">{t(language, "creditIntro")}</p></div>
      <span dir="ltr" className="rounded-lg border border-[#d7e1d9] bg-[#f3f7f0] px-3 py-2 font-mono text-xs">#{account.id} · {account.currency}</span>
    </div>
    <p className="mt-3 rounded-lg border border-[#dce4dc] bg-[#f5f8f3] px-3 py-2 text-xs leading-5 text-[#52685c]">{t(language, "creditBalanceUnchanged")}</p>
    {!canManage ? <p className="mt-3 text-xs text-[#695638]">{t(language, "fundingPermission")}</p> :
      <form onSubmit={review} className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-[#e0e7df] bg-[#f5f8f3] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#7b887f]">{t(language, "currentCreditLimit")}</p>
          <p dir="ltr" className="mt-1 font-mono text-sm tabular-nums text-[#344a44]">{currentLimit} {account.currency}</p>
        </div>
        <label className="block space-y-1.5 text-xs font-semibold text-[#53665d]">
          <span>{t(language, "creditLimitLabel")} · {account.currency}</span>
          <input data-testid={`customer-credit-limit-input-${account.id}`} type="text" inputMode="decimal" maxLength={40} value={limit}
            disabled={disabled || reviewing} onChange={event => setLimit(event.target.value)}
            className="h-11 w-full rounded-xl border border-[#d7e1d9] bg-[#fbfcf8] px-3 font-mono text-sm text-[#29423f] outline-none focus:border-[#62877a] focus:ring-2 focus:ring-[#62877a]/15 disabled:opacity-60"/>
          <span className="block font-normal text-[#758179]">{t(language, "creditLimitHelp")}</span>
        </label>
        <label className="block space-y-1.5 text-xs font-semibold text-[#53665d] md:col-span-2">
          <span>{t(language, "creditReason")}</span>
          <textarea data-testid={`customer-credit-limit-reason-${account.id}`} maxLength={500} value={reason}
            disabled={disabled || reviewing} onChange={event => setReason(event.target.value)}
            className="min-h-20 w-full rounded-xl border border-[#d7e1d9] bg-[#fbfcf8] px-3 py-2.5 text-sm text-[#29423f] outline-none focus:border-[#62877a] focus:ring-2 focus:ring-[#62877a]/15 disabled:opacity-60"/>
          <span className="block font-normal text-[#758179]">{t(language, "creditReasonHelp")}</span>
        </label>
        {error && <p role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-sm text-[#883f37] md:col-span-2">{error}</p>}
        {result && <p role="status" className="rounded-lg border border-[#cbdccf] bg-[#edf4eb] px-3 py-3 text-sm text-[#42634e] md:col-span-2">
          {t(language, result.duplicate ? "creditLimitDuplicate" : "creditLimitSuccess")}
          <span dir="ltr" className="mt-1 block font-mono text-xs">{result.creditLimit} {account.currency}</span>
          {refreshFailed && <span className="mt-1 block text-xs">{t(language, "refreshWarning")}</span>}
        </p>}
        {!result && !reviewing && <Button type="submit" disabled={!scopeReady || !canManage} className="md:col-span-2 bg-[#735b3e] text-white hover:bg-[#866d4e]">
          {t(language, "reviewCreditLimit")}
        </Button>}
        {reviewing && !result && <div className="space-y-3 rounded-xl border border-[#e7ddca] bg-[#faf4e9] p-4 md:col-span-2">
          <h5 className="text-sm font-semibold text-[#664d32]">{t(language, "creditReview")}</h5>
          <p className="text-xs leading-5 text-[#806844]">{t(language, "creditSummary")}</p>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <ReviewLine label={t(language, "walletId")} value={`#${account.id}`}/>
            <ReviewLine label={t(language, "currentCreditLimit")} value={`${currentLimit} ${account.currency}`}/>
            <ReviewLine label={t(language, "creditLimitLabel")} value={`${normalizedLimit} ${account.currency}`}/>
            <ReviewLine label={t(language, "creditReason")} value={reason.trim()}/>
          </dl>
          <label className="flex items-start gap-3 rounded-lg border border-[#e8dfcf] bg-[#fffdf8] p-3 text-xs leading-5 text-[#695638]">
            <input data-testid={`customer-credit-limit-confirm-${account.id}`} type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#735b3e]"
              checked={confirmed} disabled={!scopeReady || mutation.isPending} onChange={event => setConfirmed(event.target.checked)}/>
            <span>{t(language, "confirmCreditLimit")}</span>
          </label>
          <Button type="button" data-testid={`customer-credit-limit-save-${account.id}`} disabled={!confirmed || !valid || !scopeReady || mutation.isPending}
            onClick={() => void save()} className="w-full bg-[#735b3e] text-white hover:bg-[#866d4e]">
            {mutation.isPending ? t(language, "savingCreditLimit") : t(language, "saveCreditLimit")}
          </Button>
        </div>}
      </form>}
  </section>;
}

export function isValidCreditLimit(value: string) {
  return /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(value) && Number.isFinite(Number(value));
}
function ReviewLine({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-[#e8dfcf] bg-[#fffdf8] px-3 py-2">
    <dt className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#8b795d]">{label}</dt>
    <dd dir="auto" className="mt-1 break-all font-mono text-xs text-[#513f29]">{value}</dd>
  </div>;
}
