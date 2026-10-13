import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { AccountingCustomerAccounts } from "@shared/accounting-customer-accounts";
import { useCreateIndependentCustomerAccount, useCustomerAccounts, useFundIndependentCustomerAccount, useSetCustomerAccountCreditLimit } from "@/lib/accounting-customer-accounts-api";
import { useLanguage } from "@/contexts/LanguageContext";
import { normalizeAccountingDigits } from "./accounting-logic";
import { customerAccountsText as t } from "./accounting-customer-accounts-copy";
import AccountingCustomerCreditLimit from "./accounting-customer-credit-limit";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, BadgeCheck, Landmark, LockKeyhole, Plus, ShieldCheck, WalletCards } from "lucide-react";

type Company = { id: number; name: string };
type Props = { companies: Company[]; defaultCompanyId?: number; canManage: boolean };
type Currency = "IQD" | "USD" | "EUR" | "IRR";
const currencies: Currency[] = ["IQD", "USD", "EUR", "IRR"];
const inputClass = "h-11 w-full rounded-xl border border-[#d7e1d9] bg-[#fbfcf8] px-3 text-sm text-[#29423f] outline-none transition focus:border-[#62877a] focus:ring-2 focus:ring-[#62877a]/15 disabled:opacity-60";
const normalizedCode = (value: string) => normalizeAccountingDigits(value.trim());

export default function AccountingCustomerAccounts({ companies, defaultCompanyId, canManage }: Props) {
  const { language, direction } = useLanguage();
  const [companyId, setCompanyId] = useState(String(defaultCompanyId ?? ""));
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ companyId: number; customerCode: string }>();
  const [formError, setFormError] = useState(false);
  const [reason, setReason] = useState("");
  const [currency, setCurrency] = useState<Currency>("IQD");
  const [confirmed, setConfirmed] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionResult, setActionResult] = useState<"created" | "duplicate" | "">("");
  const submitLock = useRef(false);
  const selectedCompany = companies.find(company => String(company.id) === companyId);
  const parsedCode = normalizedCode(code);
  const scopeMatches = Boolean(applied && selectedCompany && applied.companyId === selectedCompany.id && applied.customerCode === parsedCode);
  const filters = scopeMatches ? applied : undefined;
  const query = useCustomerAccounts(filters);
  const mutation = useCreateIndependentCustomerAccount();
  const fundingMutation = useFundIndependentCustomerAccount();
  const creditLimitMutation = useSetCustomerAccountCreditLimit();
  const anyMutationPending = mutation.isPending || fundingMutation.isPending || creditLimitMutation.isPending;
  const accounts = query.data;
  const responseMatches = Boolean(filters && accounts && accounts.companyId === filters.companyId
    && accounts.customer.code === filters.customerCode && accounts.readOnly === true);
  const verifiedAccounts = responseMatches ? accounts : undefined;
  const canCreate = Boolean(canManage && responseMatches && accounts?.independentOpeningApproved
    && reason.trim().length >= 5 && confirmed && !anyMutationPending);

  const requestLookup = (event: FormEvent) => {
    event.preventDefault();
    setFormError(false);
    setActionError("");
    setActionResult("");
    const normalized = normalizedCode(code);
    if (!selectedCompany || !/^9[0-9]{6}$/.test(normalized)) {
      setFormError(true);
      setApplied(undefined);
      return;
    }
    setApplied({ companyId: selectedCompany.id, customerCode: normalized });
  };

  const createAccount = async () => {
    if (submitLock.current || !canCreate || !filters || !accounts
      || filters.companyId !== selectedCompany?.id || filters.customerCode !== parsedCode) return;
    submitLock.current = true;
    setActionError("");
    setActionResult("");
    const submittedScope = { ...filters };
    try {
      const result = await mutation.mutateAsync({
        ...submittedScope, currency, reason: reason.trim(), independentConfirmed: true,
      });
      if (submittedScope.companyId === Number(companyId) && submittedScope.customerCode === normalizedCode(code)) {
        setActionResult(result.duplicate ? "duplicate" : "created");
      }
    } catch (error) {
      if (submittedScope.companyId === Number(companyId) && submittedScope.customerCode === normalizedCode(code)) {
        setActionError(error instanceof Error ? error.message : t(language, "createFailed"));
      }
    } finally {
      submitLock.current = false;
    }
  };

  const retry = () => void query.refetch();
  const stale = !!applied && !scopeMatches;

  return <section dir={direction} data-testid="accounting-customer-accounts" className="space-y-5">
    <header className="relative overflow-hidden rounded-[24px] border border-[#20484a] bg-[#173b3c] px-5 py-6 text-[#f2f4e9] shadow-[0_18px_44px_-34px_rgba(25,57,53,.8)] md:px-8 md:py-7">
      <div aria-hidden="true" className="absolute -end-10 -top-20 h-56 w-56 rounded-full border border-[#b9c6a5]/15"/>
      <div className="relative flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#d6b66e]/30 bg-[#d6b66e]/10 text-[#e0c476]"><WalletCards className="h-6 w-6"/></span>
        <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#c9bc8a]">{t(language, "eyebrow")}</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-.03em] md:text-[30px]">{t(language, "title")}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#c5d2c9]">{t(language, "intro")}</p></div>
      </div>
    </header>

    <form onSubmit={requestLookup} className="grid gap-4 rounded-2xl border border-[#dce4dc] bg-[#fbfcf8] p-4 md:grid-cols-[1fr_1fr_auto] md:items-end md:p-5">
      <Field label={t(language, "company")}><select aria-label={t(language, "company")} value={companyId} disabled={anyMutationPending} onChange={event => setCompanyId(event.target.value)} className={inputClass}>
        <option value="">{t(language, "company")}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name} · #{company.id}</option>)}
      </select></Field>
      <Field label={t(language, "customerCode")}><input aria-label={t(language, "customerCode")} dir="ltr" inputMode="numeric" autoComplete="off" value={code} disabled={anyMutationPending} onChange={event => setCode(event.target.value)} className={inputClass}/>
        <span className="block text-xs font-normal text-[#758179]">{t(language, "codeHelp")}</span></Field>
      <Button type="submit" disabled={!companies.length || anyMutationPending} className="h-11 bg-[#20484a] text-white hover:bg-[#2d5d5c]"><ShieldCheck className="me-2 h-4 w-4"/>{t(language, "lookup")}</Button>
      {formError && <p role="alert" className="rounded-xl border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-sm text-[#883f37] md:col-span-3">{t(language, "invalid")}</p>}
      {!companies.length && <p className="rounded-xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] p-3 text-sm text-[#66776e] md:col-span-3">{t(language, "noCompanies")}</p>}
    </form>

    {actionError && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language, "createFailed")}</AlertTitle><AlertDescription>{actionError}</AlertDescription></Alert>}
    {actionResult && <p role="status" className="rounded-xl border border-[#cbdccf] bg-[#edf4eb] px-4 py-3 text-sm text-[#42634e]">{t(language, actionResult === "duplicate" ? "duplicate" : "success")}</p>}

    {!companies.length ? <Empty icon={<Landmark className="h-5 w-5"/>} text={t(language, "noCompanies")}/> :
      !applied ? <Empty icon={<LockKeyhole className="h-5 w-5"/>} text={t(language, "choose")}/> :
      stale ? <Notice text={t(language, "stale")}/> :
      query.isLoading ? <div className="space-y-3" aria-label={t(language, "loading")}><Skeleton className="h-24 rounded-2xl bg-[#e8ede7]"/><Skeleton className="h-52 rounded-2xl bg-[#e8ede7]"/></div> :
      query.isError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language, "failed")}</AlertTitle><AlertDescription className="mt-2 flex flex-wrap items-center gap-3"><span>{query.error instanceof Error ? query.error.message : t(language, "failed")}</span><Button type="button" variant="outline" size="sm" onClick={retry}>{t(language, "retry")}</Button></AlertDescription></Alert> :
      !verifiedAccounts ? <Notice text={t(language, "stale")}/> :
      <div className="space-y-4">
        <section className="rounded-2xl border border-[#dce4dc] bg-[#f1f5ef] p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#7e8d82]">{t(language, "customer")}</p>
              <h3 className="mt-1 text-lg font-semibold text-[#294540]">{verifiedAccounts.customer.name}</h3></div>
            <span dir="ltr" className="rounded-lg border border-[#d7e1d9] bg-[#fbfcf8] px-3 py-2 font-mono text-sm tabular-nums text-[#42634e]">{verifiedAccounts.customer.code}</span>
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-[#e5d9c7] bg-[#faf4e9] px-3 py-3 text-xs leading-5 text-[#786344]"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0"/>{t(language, "readOnly")}</p>
        </section>
        <AccountList title={t(language, "connected")} accounts={verifiedAccounts.accounts} empty={t(language, "noConnected")} language={language}/>
        <IndependentAccountFunding accounts={verifiedAccounts.accounts} companyId={filters!.companyId} customerCode={filters!.customerCode}
          canManage={canManage} scopeMatches={scopeMatches && responseMatches} mutation={fundingMutation}
          creditMutation={creditLimitMutation} pendingScopeMutation={anyMutationPending}
          onRefresh={async () => { await query.refetch(); }} language={language}/>
        <AccountList title={t(language, "legacy")} accounts={verifiedAccounts.legacyAccounts} empty={t(language, "noLegacy")} language={language} legacy/>
        <p className="rounded-xl border border-[#e6d9c4] bg-[#f8f1e5] px-4 py-3 text-xs leading-5 text-[#806844]">{t(language, "legacyNote")}</p>
        {canManage && <section className="overflow-hidden rounded-2xl border border-[#d9e4da] bg-[#fbfcf8]">
          <div className="flex items-start gap-3 border-b border-[#e5ebe4] bg-[#f0f5ee] px-4 py-4 md:px-5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#dce9dc] text-[#456c53]"><Plus className="h-5 w-5"/></span>
            <div><h3 className="font-display text-lg font-semibold text-[#294540]">{t(language, "createTitle")}</h3><p className="mt-1 text-xs leading-5 text-[#758179]">{t(language, "createHelp")}</p></div>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-2 md:p-5">
            {!verifiedAccounts.independentOpeningApproved && <p role="status" className="rounded-xl border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-sm text-[#806844] md:col-span-2">{t(language, "notApproved")}</p>}
            <Field label={t(language, "currencyPick")}><select value={currency} disabled={!verifiedAccounts.independentOpeningApproved || anyMutationPending} onChange={event => setCurrency(event.target.value as Currency)} className={inputClass}>{currencies.map(item => <option key={item} value={item}>{item}</option>)}</select></Field>
            <Field label={t(language, "reason")}><input maxLength={500} value={reason} disabled={!verifiedAccounts.independentOpeningApproved || anyMutationPending} onChange={event => setReason(event.target.value)} className={inputClass}/><span className="block text-xs font-normal text-[#758179]">{t(language, "reasonHelp")}</span></Field>
            <label className="flex items-start gap-3 rounded-xl border border-[#dce4dc] bg-[#f6f8f4] p-3 text-xs leading-5 text-[#53665d] md:col-span-2">
              <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#20484a]" checked={confirmed} disabled={!verifiedAccounts.independentOpeningApproved || anyMutationPending} onChange={event => setConfirmed(event.target.checked)}/>
              <span>{t(language, "confirm")}</span>
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
              <p className="flex items-center gap-2 text-xs text-[#64746b]"><BadgeCheck className="h-4 w-4 text-[#557764]"/>{verifiedAccounts.independentOpeningApproved ? t(language, "createHelp") : t(language, "notApproved")}</p>
              <Button type="button" disabled={!canCreate || !scopeMatches} onClick={createAccount} className="min-h-10 bg-[#20484a] text-white hover:bg-[#2d5d5c]">{mutation.isPending ? t(language, "creating") : t(language, "create")}</Button>
            </div>
          </div>
        </section>}
        {!canManage && <p className="rounded-xl border border-[#e6d8b7] bg-[#f6f0df] px-4 py-3 text-sm text-[#695638]">{t(language, "permission")}</p>}
      </div>}
  </section>;
}

function AccountList({ title, accounts, empty, language, legacy = false }: {
  title: string; accounts: AccountingCustomerAccounts["accounts"]; empty: string; language: string; legacy?: boolean;
}) {
  return <section className={`overflow-hidden rounded-2xl border ${legacy ? "border-[#e5d9c7]" : "border-[#dce4dc]"} bg-[#fbfcf8]`}>
    <div className={`flex items-center gap-3 border-b px-4 py-3.5 ${legacy ? "border-[#eee3d1] bg-[#faf4e9]" : "border-[#e5ebe4] bg-[#f0f5ee]"}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${legacy ? "bg-[#eee0c6] text-[#856a3c]" : "bg-[#dce9dc] text-[#456c53]"}`}><WalletCards className="h-4 w-4"/></span>
      <h3 className="font-display text-base font-semibold text-[#294540]">{title}</h3>
      <span className="ms-auto rounded-full bg-white/70 px-2.5 py-1 text-xs font-mono tabular-nums text-[#66776e]">{accounts.length}</span>
    </div>
    {!accounts.length ? <div className="px-4 py-7 text-center text-sm text-[#758179]">{empty}</div> :
      <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-start text-sm">
        <thead className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7b887f]"><tr>
          <th className="px-4 py-3">{t(language, "currency")}</th><th className="px-4 py-3 text-end">{t(language, "balance")}</th>
          <th className="px-4 py-3 text-end">{t(language, "reserved")}</th><th className="px-4 py-3 text-end">{t(language, "creditLimitLabel")}</th>
          <th className="px-4 py-3 text-end">{t(language, "status")}</th>
        </tr></thead>
        <tbody className="divide-y divide-[#e8ede6]">{accounts.map(account => <tr key={account.id} className="text-[#465b52]">
          <td dir="ltr" className="px-4 py-3 font-mono font-semibold tabular-nums">{account.currency}</td>
          <td dir="ltr" className="px-4 py-3 text-end font-mono tabular-nums">{account.balance}</td>
          <td dir="ltr" className="px-4 py-3 text-end font-mono tabular-nums">{account.reservedBalance}</td>
          <td dir="ltr" className="px-4 py-3 text-end font-mono tabular-nums">{account.creditLimit} {account.currency}</td>
          <td className="px-4 py-3 text-end"><span className="inline-flex rounded-full border border-[#d9e2d9] bg-[#f3f7f0] px-2.5 py-1 text-xs">{account.status}</span></td>
        </tr>)}</tbody>
      </table></div>}
  </section>;
}

type FundingMutation = ReturnType<typeof useFundIndependentCustomerAccount>;
type CreditMutation = ReturnType<typeof useSetCustomerAccountCreditLimit>;
type FundingAccount = AccountingCustomerAccounts["accounts"][number];
type FundingPayload = {
  companyId: number; walletId: number; sourceId: string; entryDate: string; amount: string;
  channel: "BANK" | "GATEWAY"; evidenceReference: string; reason: string;
};
let fallbackSourceCounter = 0;

export function IndependentAccountFunding({ accounts, companyId, customerCode, canManage, scopeMatches, mutation, creditMutation, pendingScopeMutation, onRefresh, language }: {
  accounts: FundingAccount[]; companyId: number; customerCode: string; canManage: boolean; scopeMatches: boolean;
  mutation: FundingMutation; creditMutation: CreditMutation; pendingScopeMutation: boolean; onRefresh: () => Promise<unknown>; language: string;
}) {
  const [selectedWalletId, setSelectedWalletId] = useState(String(accounts[0]?.id ?? ""));
  const selected = accounts.find(account => String(account.id) === selectedWalletId);
  useEffect(() => {
    if (!accounts.some(account => String(account.id) === selectedWalletId)) {
      setSelectedWalletId(String(accounts[0]?.id ?? ""));
    }
  }, [accounts, selectedWalletId]);

  return <section data-testid="customer-account-funding" className="overflow-hidden rounded-2xl border border-[#dce4dc] bg-[#fbfcf8]">
    <div className="border-b border-[#e5ebe4] bg-[#f0f5ee] px-4 py-4 md:px-5">
      <h3 className="font-display text-lg font-semibold text-[#294540]">{t(language, "fundingTitle")}</h3>
      <p className="mt-1 text-xs leading-5 text-[#758179]">{t(language, "fundingIntro")}</p>
    </div>
    <div className="space-y-4 p-4 md:p-5">
      <p className="rounded-xl border border-[#d9e3d9] bg-[#f5f8f3] px-3 py-3 text-xs leading-5 text-[#52685c]">{t(language, "fundingRequirements")}</p>
      {!canManage ? <p className="rounded-xl border border-[#e6d8b7] bg-[#f6f0df] px-3 py-2 text-sm text-[#695638]">{t(language, "fundingPermission")}</p> :
        !accounts.length ? <p className="rounded-xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-4 py-7 text-center text-sm text-[#758179]">{t(language, "noConnected")}</p> : <>
          <Field label={t(language, "selectFundingAccount")}><select data-testid="customer-account-funding-wallet" value={selectedWalletId} disabled={pendingScopeMutation} onChange={event => setSelectedWalletId(event.target.value)} className={inputClass}>
            {accounts.map(account => <option key={account.id} value={account.id}>{account.currency} · wallet #{account.id} · {account.status}</option>)}
          </select></Field>
          {!scopeMatches ? <Notice text={t(language, "stale")}/> :
            selected ? <IndependentAccountFundingForm key={`${companyId}:${selected.id}:${customerCode}`} account={selected}
              companyId={companyId} customerCode={customerCode} mutation={mutation} pendingScopeMutation={pendingScopeMutation}
              onRefresh={onRefresh} language={language}/> : <Notice text={t(language, "stale")}/>}
          {scopeMatches && selected && canManage && <AccountingCustomerCreditLimit account={selected} companyId={companyId}
            canManage={canManage} scopeMatches={scopeMatches} pendingScopeMutation={pendingScopeMutation}
            mutation={creditMutation} onRefresh={onRefresh} language={language}/>}
        </>}
    </div>
  </section>;
}

export function IndependentAccountFundingForm({ account, companyId, customerCode, mutation, pendingScopeMutation, onRefresh, language }: {
  account: FundingAccount; companyId: number; customerCode: string; mutation: FundingMutation;
  pendingScopeMutation: boolean; onRefresh: () => Promise<unknown>; language: string;
}) {
  const [sourceId, setSourceId] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState<"BANK" | "GATEWAY" | "">("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [reason, setReason] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [actionError, setActionError] = useState("");
  const [refreshWarning, setRefreshWarning] = useState(false);
  const [result, setResult] = useState<{ movementId: number; journalId: number; duplicate: boolean; sourceId: string }>();
  const pendingPayload = useRef<FundingPayload>();
  const submitLock = useRef(false);
  const scopeStillMatches = scopeMatchesForFunding(companyId, account.id, customerCode, pendingScopeMutation);

  useEffect(() => {
    const pending = readPendingFunding(companyId, account.id);
    if (pending) {
      setSourceId(pending.sourceId);
      setEntryDate(pending.entryDate);
      setAmount(pending.amount);
      setChannel(pending.channel);
      setEvidenceReference(pending.evidenceReference);
      setReason(pending.reason);
      pendingPayload.current = pending;
      setAttempted(true);
      setActionError(t(language, "fundingRetryPending"));
      return;
    }
    setSourceId(getOrCreateFundingSourceId(companyId, account.id));
  }, [companyId, account.id]);

  const normalizedAmount = normalizeAccountingDigits(amount.trim());
  const amountValid = isValidFundingAmount(normalizedAmount);
  const dateValid = isValidEntryDate(entryDate);
  const channelValid = channel === "BANK" || channel === "GATEWAY";
  const evidenceValid = evidenceReference.trim().length >= 5;
  const reasonValid = reason.trim().length >= 5;
  const formValid = Boolean(sourceId && scopeStillMatches && amountValid && dateValid && channelValid && evidenceValid && reasonValid
    && !mutation.isPending && !pendingScopeMutation && !attempted);
  const blocked = mutation.isPending || pendingScopeMutation || attempted || !scopeStillMatches;
  const currency = account.currency.toUpperCase();

  const payload = (): FundingPayload => ({
    companyId, walletId: account.id, sourceId, entryDate,
    amount: normalizedAmount, channel: channel as FundingPayload["channel"], evidenceReference: evidenceReference.trim(), reason: reason.trim(),
  });

  const postFunding = async (command: FundingPayload) => {
    if (submitLock.current || !canManageFunding(scopeStillMatches, pendingScopeMutation, mutation.isPending)) return;
    submitLock.current = true;
    setActionError("");
    setRefreshWarning(false);
    try {
      const posted = await mutation.mutateAsync(command);
      clearPendingFunding(companyId, account.id);
      setResult({ movementId: posted.movementId, journalId: posted.journalId, duplicate: posted.duplicate, sourceId: command.sourceId });
      setReviewing(false);
      setAttempted(true);
      setConfirmed(false);
      if (!posted.duplicate) {
        const nextSourceId = createFundingSourceId();
        persistFundingSourceId(companyId, account.id, nextSourceId);
        setSourceId(nextSourceId);
      }
      try {
        await onRefresh();
      } catch {
        setRefreshWarning(true);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t(language, "fundingError"));
    } finally {
      submitLock.current = false;
    }
  };

  const beginReview = (event: FormEvent) => {
    event.preventDefault();
    setActionError("");
    setReviewing(false);
    if (!canManageFunding(scopeStillMatches,pendingScopeMutation,mutation.isPending) || !amountValid || !dateValid || !channelValid || !evidenceValid || !reasonValid || !sourceId) {
      setActionError(!dateValid ? t(language, "entryDateInvalid") :
        !amountValid ? t(language, "amountInvalid") :
        !channelValid ? t(language, "channelRequired") :
        !evidenceValid ? t(language, "evidenceInvalid") :
        !reasonValid ? t(language, "fundingReasonInvalid") : t(language, "stale"));
      return;
    }
    pendingPayload.current = payload();
    persistPendingFunding(payload());
    setReviewing(true);
    setConfirmed(false);
  };

  const confirmAndPost = () => {
    if (!confirmed || !formValid) {
      setActionError(t(language, "confirmationRequired"));
      return;
    }
    const command = pendingPayload.current ?? payload();
    pendingPayload.current = command;
    setAttempted(true);
    void postFunding(command);
  };
  const retrySameRequest = () => {
    if (!pendingPayload.current || pendingScopeMutation || !scopeStillMatches) return;
    void postFunding(pendingPayload.current);
  };
  const prepareAnotherFunding = () => {
    if (!result || result.duplicate) return;
    setResult(undefined);
    setActionError("");
    setRefreshWarning(false);
    setEntryDate("");
    setAmount("");
    setChannel("");
    setEvidenceReference("");
    setReason("");
    setReviewing(false);
    setConfirmed(false);
    setAttempted(false);
    pendingPayload.current = undefined;
  };
  const retryPreview = pendingPayload.current;

  return <div className="space-y-4 rounded-xl border border-[#dce4dc] bg-[#f8faf6] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#758179]">{t(language, "walletId")}</p>
        <p dir="ltr" className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#294540]">#{account.id}</p></div>
      <span dir="ltr" className="rounded-lg border border-[#d7e1d9] bg-[#fbfcf8] px-3 py-2 font-mono text-xs">{account.currency}</span>
    </div>
    <p className="text-xs leading-5 text-[#758179]">{t(language, "fundingRequirements")}</p>
    {currency !== "IQD" && <p role="note" className="rounded-lg border border-[#e7d8b8] bg-[#faf4e9] px-3 py-2 text-xs leading-5 text-[#786344]">{t(language, "foreignFundingWarning")}</p>}
    <form onSubmit={beginReview} className="grid gap-3 md:grid-cols-2">
      <Field label={t(language, "entryDate")}><input data-testid="customer-account-funding-date" type="date" value={entryDate} disabled={blocked} onChange={event => setEntryDate(event.target.value)} className={inputClass}/></Field>
      <Field label={`${t(language, "fundingAmount")} · ${account.currency}`}><input data-testid="customer-account-funding-amount" type="text" inputMode="decimal" autoComplete="off" maxLength={40} value={amount}
        disabled={blocked} onChange={event => setAmount(event.target.value)} placeholder="0.00" className={inputClass}/>
        <span className="block text-xs font-normal text-[#758179]">{t(language, "amountInvalid")}</span>
      </Field>
      <Field label={t(language, "fundingChannel")}><select data-testid="customer-account-funding-channel" value={channel} disabled={blocked} onChange={event => setChannel(event.target.value as "BANK" | "GATEWAY" | "")} className={inputClass}>
        <option value="">{t(language, "selectChannel")}</option><option value="BANK">{t(language, "bank")}</option><option value="GATEWAY">{t(language, "gateway")}</option>
      </select></Field>
      <Field label={t(language, "evidenceReference")}><input data-testid="customer-account-funding-evidence" maxLength={500} minLength={5} value={evidenceReference} disabled={blocked}
        onChange={event => setEvidenceReference(event.target.value)} className={inputClass}/><span className="block text-xs font-normal text-[#758179]">{t(language, "evidenceHelp")}</span>
      </Field>
      <Field label={t(language, "fundingReason")}><textarea data-testid="customer-account-funding-reason" maxLength={500} minLength={5} value={reason} disabled={blocked} onChange={event => setReason(event.target.value)}
        className={`${inputClass} min-h-24 py-3 md:col-span-2`}/><span className="block text-xs font-normal text-[#758179]">{t(language, "fundingReasonHelp")}</span></Field>
      <div className="md:col-span-2">
        <p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#758179]">{t(language, "sourceId")}</p>
        <code dir="ltr" className="mt-1 block break-all rounded-lg border border-[#e0e7df] bg-[#f1f5ef] px-3 py-2 font-mono text-[11px] text-[#53665d]">{sourceId || "…"}</code>
      </div>
      {actionError && <div role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-sm text-[#883f37] md:col-span-2">
        <p>{actionError}</p>{attempted && <Button type="button" variant="outline" size="sm" disabled={mutation.isPending || pendingScopeMutation}
          onClick={retrySameRequest} className="mt-2">{mutation.isPending ? t(language, "postingFunding") : t(language, "retryFunding")}</Button>}
      </div>}
      {result && <div role="status" className="rounded-lg border border-[#cbdccf] bg-[#edf4eb] px-3 py-3 text-sm text-[#42634e] md:col-span-2">
        <p className="font-semibold">{t(language, result.duplicate ? "duplicateFunding" : "fundingSuccess")}</p>
        <p className="mt-1 font-mono text-xs">{t(language, "movementId")} #{result.movementId} · {t(language, "journalId")} #{result.journalId}</p>
        <p dir="ltr" className="mt-1 break-all font-mono text-[10px]">{result.sourceId}</p>
        {refreshWarning && <p className="mt-2 text-xs">{t(language, "refreshWarning")}</p>}
        {!result.duplicate && <Button type="button" size="sm" variant="outline" className="mt-3" onClick={prepareAnotherFunding}>{t(language, "newFunding")}</Button>}
      </div>}
      {attempted && !result && retryPreview && <section className="space-y-3 rounded-xl border border-[#d9e3d9] bg-[#f2f6f0] p-4 md:col-span-2">
        <h4 className="font-semibold text-[#294540]">{t(language, "fundingReview")}</h4>
        <p className="text-xs leading-5 text-[#63766a]">{t(language, "fundingSummary")}</p>
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          <ReviewFact label={t(language, "walletId")} value={`#${retryPreview.walletId}`}/>
          <ReviewFact label={t(language, "fundingAmount")} value={`${retryPreview.amount} ${account.currency}`}/>
          <ReviewFact label={t(language, "entryDate")} value={retryPreview.entryDate}/>
          <ReviewFact label={t(language, "fundingChannel")} value={t(language, retryPreview.channel === "BANK" ? "bank" : "gateway")}/>
          <ReviewFact label={t(language, "evidenceReference")} value={retryPreview.evidenceReference}/>
          <ReviewFact label={t(language, "fundingReason")} value={retryPreview.reason}/>
          <ReviewFact label={t(language, "sourceId")} value={retryPreview.sourceId}/>
        </dl>
      </section>}
      {!result && !attempted && <Button type="submit" data-testid="customer-account-funding-review" disabled={!scopeStillMatches || pendingScopeMutation || mutation.isPending} className="md:col-span-2 bg-[#20484a] text-white hover:bg-[#2d5d5c]">{t(language, "reviewFunding")}</Button>}
      {reviewing && !attempted && <section className="space-y-3 rounded-xl border border-[#d9e3d9] bg-[#f2f6f0] p-4 md:col-span-2">
        <h4 className="font-semibold text-[#294540]">{t(language, "fundingReview")}</h4>
        <p className="text-xs leading-5 text-[#63766a]">{t(language, "fundingSummary")}</p>
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          <ReviewFact label={t(language, "walletId")} value={`#${account.id}`}/>
          <ReviewFact label={t(language, "fundingAmount")} value={`${normalizedAmount} ${account.currency}`}/>
          <ReviewFact label={t(language, "entryDate")} value={entryDate}/>
          <ReviewFact label={t(language, "fundingChannel")} value={t(language, channel === "BANK" ? "bank" : "gateway")}/>
          <ReviewFact label={t(language, "evidenceReference")} value={evidenceReference.trim()}/>
          <ReviewFact label={t(language, "fundingReason")} value={reason.trim()}/>
          <ReviewFact label={t(language, "sourceId")} value={sourceId}/>
        </dl>
        <label className="flex items-start gap-3 rounded-lg border border-[#dce4dc] bg-[#fbfcf8] p-3 text-xs leading-5 text-[#52685c]">
          <input type="checkbox" data-testid="customer-account-funding-confirm" className="mt-1 h-4 w-4 shrink-0 accent-[#20484a]" checked={confirmed} disabled={blocked} onChange={event => setConfirmed(event.target.checked)}/>
          <span>{t(language, "fundingConfirm")}</span>
        </label>
        <Button type="button" data-testid="customer-account-funding-post" disabled={!confirmed || !formValid || !scopeStillMatches} onClick={confirmAndPost} className="w-full bg-[#20484a] text-white hover:bg-[#2d5d5c]">
          {mutation.isPending ? t(language, "postingFunding") : t(language, "postFunding")}
        </Button>
      </section>}
    </form>
    {mutation.isPending && <p role="status" className="rounded-lg border border-[#dce4dc] bg-[#f2f6f0] px-3 py-2 text-xs text-[#53665d]">{t(language, "fundingPending")}</p>}
  </div>;
}

function scopeMatchesForFunding(companyId: number, walletId: number, customerCode: string, pending: boolean) {
  return Number.isInteger(companyId) && companyId > 0 && Number.isInteger(walletId) && walletId > 0
    && /^9[0-9]{6}$/.test(customerCode) && !pending;
}
function canManageFunding(scopeMatches: boolean, pendingScopeMutation: boolean, pending: boolean) {
  return scopeMatches && !pendingScopeMutation && !pending;
}
export function isValidFundingAmount(value: string) {
  return /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(value) && Number(value) > 0 && Number.isFinite(Number(value));
}
export function isValidEntryDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function sourceStorageKey(companyId: number, walletId: number) { return `momtazchem:accounting:independent-funding:${companyId}:${walletId}`; }
function pendingStorageKey(companyId: number, walletId: number) { return `momtazchem:accounting:independent-funding-pending:${companyId}:${walletId}`; }
function createFundingSourceId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  fallbackSourceCounter += 1;
  return `indfund-${Date.now()}-${fallbackSourceCounter}`;
}
export function getOrCreateFundingSourceId(companyId: number, walletId: number) {
  if (typeof window !== "undefined") {
    try {
      const existing = window.localStorage.getItem(sourceStorageKey(companyId, walletId));
      if (existing) return existing;
    } catch { /* fall back to an in-memory id if storage is unavailable */ }
  }
  const created = createFundingSourceId();
  persistFundingSourceId(companyId, walletId, created);
  return created;
}
export function persistFundingSourceId(companyId: number, walletId: number, sourceId: string) {
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(sourceStorageKey(companyId, walletId), sourceId); } catch { /* retain in component state */ }
  }
}
function readPendingFunding(companyId: number, walletId: number): FundingPayload | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const serialized = window.sessionStorage.getItem(pendingStorageKey(companyId, walletId));
    if (!serialized) return undefined;
    const pending = JSON.parse(serialized) as FundingPayload;
    if (pending.companyId !== companyId || pending.walletId !== walletId || !pending.sourceId
      || !isValidEntryDate(pending.entryDate) || !isValidFundingAmount(pending.amount)
      || !(pending.channel === "BANK" || pending.channel === "GATEWAY")
      || pending.evidenceReference.trim().length < 5 || pending.reason.trim().length < 5) return undefined;
    return pending;
  } catch { return undefined; }
}
function persistPendingFunding(payload: FundingPayload) {
  if (typeof window !== "undefined") {
    try { window.sessionStorage.setItem(pendingStorageKey(payload.companyId, payload.walletId), JSON.stringify(payload)); } catch { /* the in-memory retry remains available */ }
  }
}
function clearPendingFunding(companyId: number, walletId: number) {
  if (typeof window !== "undefined") {
    try { window.sessionStorage.removeItem(pendingStorageKey(companyId, walletId)); } catch { /* ignore storage restrictions */ }
  }
}
function ReviewFact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-lg border border-[#e0e7df] bg-[#fbfcf8] px-3 py-2">
    <dt className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#7b887f]">{label}</dt>
    <dd dir="auto" className="mt-1 break-all font-mono text-xs text-[#344a44]">{value}</dd>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5 text-xs font-semibold text-[#53665d]"><span>{label}</span>{children}</label>;
}
function Empty({ icon, text }: { icon: ReactNode; text: string }) {
  return <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-6 py-7 text-center">
    <span className="mb-3 text-[#547267]">{icon}</span><p className="max-w-lg text-sm leading-6 text-[#687970]">{text}</p></div>;
}
function Notice({ text }: { text: string }) {
  return <p role="status" className="rounded-xl border border-[#e6d9c4] bg-[#f8f1e5] px-4 py-3 text-sm leading-6 text-[#806844]">{text}</p>;
}
