import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { receiptEventSchema, receiptInputSchema, receiptListFiltersSchema, allowedReceiptActions, type ReceiptAction, type ReceiptListFilters, type ReceiptMethod, type ReceiptStatus, type ReceiptCustomer, type ReceiptMetadata } from "@shared/accounting-receipts";
import { useAccountingReceipts, useAccountingReceipt, useReceiptCustomers, useReceiptOpenItems, useRecordAccountingReceipt, useAccountingReceiptAction, downloadAccountingReceipts } from "@/lib/accounting-receipts-api";
import { useAccountingResource } from "@/lib/accounting-api";
import { useLanguage } from "@/contexts/LanguageContext";
import { normalizeAccountingDigits } from "./accounting-logic";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { receiptCopy, type ReceiptCopyKey } from "./receipt-copy";
import AccountingPartialReturns from "./accounting-partial-returns";
import { allocationRemainder, allocationTotal, exactAmount, ReceiptDecimal, receiptLabel, receiptWriteAllowed } from "./receipt-presentation";
import type { ReceiptRow } from "@shared/accounting-receipts";
import { AlertCircle, ArrowDownToLine, Banknote, ClipboardList, FileCheck2, Landmark, LoaderCircle, Plus, RefreshCw, Search, ShieldAlert } from "lucide-react";

type CompanyOption = { id: number; name: string };
type DraftFilters = { companyId: string; customerId: string; currency: string; method: string; status: string; from: string; to: string };
type AllocationDraft = Record<string, string>;
const today = () => new Date().toISOString().slice(0, 10);
const newSourceId = () => `receipt-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
const inputClass = "h-10 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 text-sm text-[#29423f] outline-none focus:border-[#60877a] focus:ring-2 focus:ring-[#60877a]/15 disabled:opacity-60";
const textareaClass = "min-h-20 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 py-2 text-sm text-[#29423f] outline-none focus:border-[#60877a] focus:ring-2 focus:ring-[#60877a]/15";
const methods: ReceiptMethod[] = ["BANK", "CASH", "CHEQUE"];
const statuses: ReceiptStatus[] = ["confirmed", "received", "deposited", "cleared", "bounced", "returned"];
const safeError = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const cleanMoney = (s: string) => normalizeAccountingDigits(s.trim());
const validDecimal = (s: string) => /^\d+(\.\d+)?$/.test(cleanMoney(s)) && new ReceiptDecimal(cleanMoney(s)).gt(0);

export default function AccountingReceipts({ companies, canManage, onReports }: { companies: CompanyOption[]; canManage: boolean; onReports: () => void }) {
  const { language, direction } = useLanguage();
  const t = (key: ReceiptCopyKey) => receiptCopy(language, key);
  const currenciesQuery = useAccountingResource("currencies");
  const [draft, setDraft] = useState<DraftFilters>({ companyId: companies[0] ? String(companies[0].id) : "", customerId: "", currency: "", method: "", status: "", from: "", to: "" });
  const [filterCustomerSearch, setFilterCustomerSearch] = useState("");
  const [applied, setApplied] = useState<ReceiptListFilters>();
  const [selectedId, setSelectedId] = useState<number>();
  const [formOpen, setFormOpen] = useState(false);
  const [entry, setEntry] = useState({ companyId: "", customerId: "", customerLabel: "", customerQuery: "", currency: "", amount: "", method: "BANK" as ReceiptMethod, entryDate: today(), reason: "", evidenceReference: "", chequeNumber: "", sourceId: "", attested: false });
  const [allocations, setAllocations] = useState<AllocationDraft>({});
  const [allocationCaps, setAllocationCaps] = useState<Record<string, string>>({});
  const [openPage, setOpenPage] = useState(1);
  const [formError, setFormError] = useState("");
  const [recordUncertain, setRecordUncertain] = useState(false);
  const [notice, setNotice] = useState("");
  const [eventAction, setEventAction] = useState<ReceiptAction>();
  const [eventDraft, setEventDraft] = useState({ entryDate: today(), reason: "", evidenceReference: "", sourceId: "", attested: false });
  const [eventError, setEventError] = useState("");
  const [eventUncertain, setEventUncertain] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const receiptsQuery = useAccountingReceipts(applied);
  const metadata = receiptsQuery.data?.metadata;
  const companyId = applied?.companyId;
  const detailQuery = useAccountingReceipt(companyId, selectedId);
  const customerQuery = useReceiptCustomers(formOpen && entry.customerQuery.trim().length >= 2 ? Number(entry.companyId) || undefined : undefined, entry.customerQuery.trim());
  const filterCustomersQuery = useReceiptCustomers(filterCustomerSearch.trim().length >= 2 ? Number(draft.companyId) || undefined : undefined, filterCustomerSearch.trim());
  const openItemsQuery = useReceiptOpenItems(formOpen ? Number(entry.companyId) || undefined : undefined, formOpen ? Number(entry.customerId) || undefined : undefined, entry.currency, openPage);
  const recordReceipt = useRecordAccountingReceipt();
  const receiptAction = useAccountingReceiptAction();
  const companiesForFilter = companies;
  const availableCurrencies = useMemo(() => {
    const active = metadata?.activeCurrencies ?? [];
    const currencyRows = (currenciesQuery.data ?? []).filter(row => row.isActive !== false).map(row => String(row.code ?? "")).filter(Boolean);
    return active.filter(code => currencyRows.length === 0 || currencyRows.includes(code));
  }, [metadata?.activeCurrencies, currenciesQuery.data]);
  const writeReason = gateReason(canManage, metadata, entry.currency, Number(entry.companyId) || undefined, t);
  const canWrite = receiptWriteAllowed(canManage, metadata, entry.currency, Number(entry.companyId) || undefined);
  const actionMetadata = detailQuery.data?.metadata ?? metadata;
  const actionCurrency = detailQuery.data?.receipt.currency ?? "";
  const actionWriteReason = gateReason(canManage, actionMetadata, actionCurrency, detailQuery.data?.receipt.companyId, t);
  const actionCanWrite = receiptWriteAllowed(canManage, actionMetadata, actionCurrency, detailQuery.data?.receipt.companyId);

  useEffect(() => {
    if (!draft.companyId && companies.length) setDraft(d => ({ ...d, companyId: String(companies[0].id) }));
  }, [companies, draft.companyId]);
  useEffect(() => {
    if (draft.companyId && !applied) {
      applyFilters();
    }
    // Keep company scope fresh automatically; the remaining filter edits require explicit apply.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.companyId]);
  useEffect(() => { setSelectedId(undefined); setNotice(""); }, [applied?.companyId]);
  useEffect(() => {
    if (!openItemsQuery.data) return;
    setAllocationCaps(old => {
      const next = { ...old };
      for (const item of openItemsQuery.data.items) next[String(item.id)] = item.openAmount;
      return next;
    });
  }, [openItemsQuery.data]);

  function applyFilters() {
    setFormError(""); setExportError("");
    if (!draft.companyId) { setApplied(undefined); return; }
    const parsed = receiptListFiltersSchema.safeParse({
      companyId: Number(draft.companyId), page: 1, pageSize: 50,
      ...(draft.customerId ? { customerId: Number(draft.customerId) } : {}),
      ...(draft.currency ? { currency: draft.currency } : {}),
      ...(draft.method ? { method: draft.method } : {}),
      ...(draft.status ? { status: draft.status } : {}),
      ...(draft.from ? { from: draft.from } : {}), ...(draft.to ? { to: draft.to } : {}),
    });
    if (!parsed.success) { setFormError(t("required")); return; }
    setApplied(parsed.data);
    setSelectedId(undefined);
    setNotice("");
  }
  const changePage = (page: number) => { if (applied) setApplied({ ...applied, page }); };
  const startRecord = () => {
    if (!draft.companyId || applied?.companyId !== Number(draft.companyId) || metadata?.company.id !== Number(draft.companyId)) return;
    const firstCurrency = availableCurrencies[0] ?? "";
    setEntry({ companyId: draft.companyId, customerId: "", customerLabel: "", customerQuery: "", currency: firstCurrency, amount: "", method: "BANK", entryDate: today(), reason: "", evidenceReference: "", chequeNumber: "", sourceId: newSourceId(), attested: false });
    setAllocations({}); setAllocationCaps({}); setOpenPage(1); setFormError(""); setRecordUncertain(false); setFormOpen(true);
  };
  const chooseCustomer = (customer: ReceiptCustomer) => {
    setEntry(old => ({ ...old, customerId: String(customer.id), customerLabel: `${customer.code ? `${customer.code} · ` : ""}${customer.name}`, customerQuery: `${customer.code ? `${customer.code} · ` : ""}${customer.name}` }));
    setAllocations({}); setAllocationCaps({}); setOpenPage(1);
  };
  const setCompanyFilter = (value: string) => {
    setDraft(d => ({ ...d, companyId: value, customerId: "", currency: "" }));
    setFilterCustomerSearch("");
    setApplied(undefined); setSelectedId(undefined); setNotice("");
    setAllocations({}); setAllocationCaps({});
    if (formOpen) setFormOpen(false);
  };
  const allocationValues = Object.values(allocations).filter(Boolean).map(cleanMoney);
  const allocatedTotal = allocationTotal(allocationValues);
  const remainder = allocationRemainder(cleanMoney(entry.amount), allocationValues);
  const remainderIsCredit = (() => { try { return remainder !== null && new ReceiptDecimal(remainder).gt(0); } catch { return false; } })();
  const amountValid = validDecimal(entry.amount);
  const allocationValid = allocationValues.every(validDecimal) && Object.entries(allocations).every(([id, value]) => {
    if (!value) return true;
    const cap = allocationCaps[id];
    try { return Boolean(cap && new ReceiptDecimal(cleanMoney(value)).lte(cap)); } catch { return false; }
  }) && (() => {
    try { return new ReceiptDecimal(cleanMoney(entry.amount) || "0").gte(allocationValues.reduce((sum, value) => sum.plus(cleanMoney(value) || "0"), new ReceiptDecimal(0))); } catch { return false; }
  })();
  const sumOver = amountValid && !allocationValid;
  const currencyList = availableCurrencies.length ? availableCurrencies : (currenciesQuery.data ?? []).filter(row => row.isActive !== false).map(row => String(row.code ?? "")).filter(Boolean);

  async function submitReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError("");
    if (!canWrite || !entry.attested || Number(entry.companyId) !== metadata?.company.id || applied?.companyId !== Number(entry.companyId)) return;
    const cleanAllocations = Object.entries(allocations).filter(([, amount]) => amount.trim()).map(([receivableId, amount]) => ({ receivableId: Number(receivableId), amount: cleanMoney(amount) }));
    if (!entry.customerId || !entry.currency || !amountValid || !allocationValid || !entry.sourceId || !entry.attested) { setFormError(t("required")); return; }
    const parsed = receiptInputSchema.safeParse({
      companyId: Number(entry.companyId), customerId: Number(entry.customerId), currency: entry.currency,
      sourceId: entry.sourceId, entryDate: entry.entryDate, amount: cleanMoney(entry.amount), method: entry.method,
      evidenceReference: entry.evidenceReference.trim(), reason: entry.reason.trim(),
      ...(entry.method === "CHEQUE" ? { chequeNumber: entry.chequeNumber.trim() } : {}),
      allocations: cleanAllocations,
    });
    if (!parsed.success) { setFormError(t("malformed")); return; }
    try {
      await recordReceipt.mutateAsync(parsed.data);
      setNotice(t("saved")); setFormOpen(false); setSelectedId(undefined); setApplied(old => old ? { ...old, page: 1 } : old); setRecordUncertain(false);
    } catch { setFormError(t("errorSafe")); setRecordUncertain(true); }
  }
  function startAction(action: ReceiptAction) {
    if (!actionCanWrite || !detailQuery.data || !allowedReceiptActions(detailQuery.data.receipt.method, detailQuery.data.receipt.status).includes(action)) return;
    setEventAction(action); setEventDraft({ entryDate: today(), reason: "", evidenceReference: "", sourceId: newSourceId(), attested: false }); setEventError(""); setEventUncertain(false);
  }
  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setEventError("");
    const detail = detailQuery.data;
    if (!detail || !eventAction || !actionCanWrite || !eventDraft.attested || detail.receipt.companyId !== detail.metadata.company.id) return;
    const parsed = receiptEventSchema.safeParse({ sourceId: eventDraft.sourceId, entryDate: eventDraft.entryDate, evidenceReference: eventDraft.evidenceReference.trim(), reason: eventDraft.reason.trim() });
    if (!parsed.success) { setEventError(t("malformed")); return; }
    try {
      await receiptAction.mutateAsync({ id: detail.receipt.id, action: eventAction, input: parsed.data });
      setNotice(t("eventSaved")); setEventAction(undefined); setEventUncertain(false);
    } catch { setEventError(t("errorSafe")); setEventUncertain(true); }
  }
  async function exportCsv() {
    if (!applied) return;
    setExportError(""); setExporting(true);
    try {
      // The CSV endpoint ignores page offsets and exports the entire filter scope.
      await downloadAccountingReceipts(applied);
    }
    catch (error) { setExportError(`${t("exportError")} ${safeError(error, "")}`); }
    finally { setExporting(false); }
  }

  return <section dir={direction} className="min-w-0">
    <div className="overflow-hidden rounded-[22px] border border-[#dce2db] bg-[#fbfcf8] shadow-[0_14px_45px_-40px_rgba(29,57,50,.65)]">
      <div className="border-b border-[#e5e9e2] bg-[#f0f4ee] p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#829087]"><span>MOMTAZCOM · FINANCE</span><span className="h-px w-6 bg-[#d6b66e]" /></div><h2 className="font-display text-2xl font-semibold tracking-[-.025em] text-[#273d3a]">{t("title")}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#758179]">{t("intro")}</p></div>
          <button type="button" onClick={startRecord} disabled={!draft.companyId || applied?.companyId !== Number(draft.companyId) || metadata?.company.id !== Number(draft.companyId)} title={t("applyCompanyFirst")} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#20484a] px-4 text-sm font-semibold text-[#f4f2e7] transition-colors hover:bg-[#2d5d5c] disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4"/>{t("new")}</button>
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          {metadata && <><Meta label={t("company")} value={`${metadata.company.name} · ${metadata.company.baseCurrency}`} good={metadata.company.isActive}/><Meta label={t("processing")} value={metadata.processingReady ? t("ready") : t("notReady")} good={metadata.processingReady}/><Meta label={t("ledgerGuards")} value={metadata.ledgerGuardsReady ? t("ready") : t("notReady")} good={metadata.ledgerGuardsReady}/><Meta label={t("walletCutover")} value={metadata.walletCutoverReady ? t("ready") : t("notReady")} good={metadata.walletCutoverReady}/><Meta label={t("receiptCutover")} value={metadata.receiptCutoverReady ? t("ready") : t("notReady")} good={metadata.receiptCutoverReady}/><Meta label={t("legacy")} value={t("notVerified")} good={false}/></>}
          {!metadata && <div className="md:col-span-2 xl:col-span-6 rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-xs text-[#806844]">{t("metadata")}: {t("notReady")} · {t("blockedReason")}</div>}
        </div>
        {(!canManage || !metadata?.processingReady) && <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2.5 text-xs leading-5 text-[#806844]"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0"/><div><strong>{!canManage ? t("viewer") : t("blocked")}</strong><p>{!canManage ? t("viewerReason") : t("blockedReason")}</p></div></div>}
      </div>
      <div className="space-y-5 p-4 md:p-6">
        <form onSubmit={e => { e.preventDefault(); applyFilters(); }} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <Field label={t("company")}><select value={draft.companyId} onChange={e => setCompanyFilter(e.target.value)} className={inputClass}><option value="">{t("selectCompany")}</option>{companiesForFilter.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label={t("currency")}><select value={draft.currency} onChange={e => { setDraft({ ...draft, currency: e.target.value }); setSelectedId(undefined); }} className={inputClass}><option value="">{t("any")}</option>{(metadata?.activeCurrencies ?? []).map(code => <option key={code} value={code}>{code}</option>)}</select></Field>
          <Field label={t("customer")}><input value={filterCustomerSearch} onChange={e => { setFilterCustomerSearch(e.target.value); setDraft(d => ({ ...d, customerId: "" })); setSelectedId(undefined); }} placeholder={t("searchCustomer")} className={inputClass}/></Field>
          <Field label={t("method")}><select value={draft.method} onChange={e => setDraft({ ...draft, method: e.target.value })} className={inputClass}><option value="">{t("any")}</option>{methods.map(x => <option key={x} value={x}>{receiptLabel(language, x)}</option>)}</select></Field>
          <Field label={t("status")}><select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })} className={inputClass}><option value="">{t("any")}</option>{statuses.map(x => <option key={x} value={x}>{receiptLabel(language, x)}</option>)}</select></Field>
          <Field label={t("from")}><input type="date" value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })} className={inputClass}/></Field>
          <Field label={t("to")}><input type="date" value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} className={inputClass}/></Field>
          <div className="flex items-end gap-2 xl:col-span-2"><button type="submit" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#20484a] px-4 text-sm font-semibold text-white hover:bg-[#2d5d5c]"><RefreshCw className="h-4 w-4"/>{t("apply")}</button><button type="button" onClick={exportCsv} disabled={!applied || exporting} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d6dfd6] px-3 text-xs font-semibold text-[#365750] hover:bg-[#eef3ed] disabled:opacity-50"><ArrowDownToLine className="h-4 w-4"/>{exporting ? t("exporting") : t("export")}</button></div>
        </form>
        {filterCustomerSearch.trim().length >= 2 && <div className="flex flex-wrap gap-2 text-xs">
          {filterCustomersQuery.isError && <InlineError message={t("customerError")} retry={t("retry")} onRetry={() => filterCustomersQuery.refetch()}/>}
          {filterCustomersQuery.data?.items.map(customer => <button key={customer.id} type="button" onClick={() => { setDraft(d => ({ ...d, customerId: String(customer.id) })); setFilterCustomerSearch(`${customer.code ? `${customer.code} · ` : ""}${customer.name}`); setSelectedId(undefined); }} className={`rounded-full border px-3 py-1.5 ${draft.customerId === String(customer.id) ? "border-[#547267] bg-[#e4eee4] text-[#365750]" : "border-[#d6dfd6] text-[#63736a]"}`}>{customer.code ? `${customer.code} · ` : ""}{customer.name}</button>)}
        </div>}
        {draft.companyId && applied?.companyId !== Number(draft.companyId) && <Notice>{t("scopeMismatch")}</Notice>}
        {formError && !formOpen && <InlineError message={formError}/>}
        {!companies.length && <Empty icon={<Landmark className="h-5 w-5"/>} title={t("noCompanies")} detail={t("noCompany")}/>}
        {exportError && <InlineError message={exportError}/>}
        {notice && <div role="status" className="rounded-lg border border-[#dce7dc] bg-[#f0f5ef] px-3 py-2 text-sm text-[#526b55]">{notice}</div>}
        {receiptsQuery.isLoading && <Loading label={t("loading")}/>}
        {receiptsQuery.isError && <QueryError title={t("failed")} detail={safeError(receiptsQuery.error, t("failed"))} retry={t("retry")} onRetry={() => receiptsQuery.refetch()}/>}
        {receiptsQuery.data && <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,.85fr)]">
          <div className="min-w-0 space-y-4">
            {!applied?.companyId ? <Empty icon={<Landmark className="h-5 w-5"/>} title={t("noCompany")} detail={t("selectCompany")}/> : <>
              <section className="rounded-xl border border-[#e1e7df] bg-[#f6f8f4] p-4">
                <div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-[#547267]"/><h3 className="text-sm font-semibold text-[#344a44]">{t("summary")}</h3></div><button type="button" onClick={() => receiptsQuery.refetch()} disabled={receiptsQuery.isFetching} className="inline-flex items-center gap-1.5 rounded-md border border-[#d6dfd6] px-2.5 py-1.5 text-[10px] font-semibold text-[#365750] disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${receiptsQuery.isFetching ? "animate-spin" : ""}`}/>{t("refresh")}</button></div>
                {receiptsQuery.data.summaries.length === 0 ? <p className="text-xs text-[#7b887f]">{t("noSummaries")}</p> : <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{receiptsQuery.data.summaries.map((s, i) => <div key={`${s.currency}-${s.method}-${s.status}-${i}`} className="rounded-lg border border-[#e3e9e1] bg-[#fbfcf8] p-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-wide text-[#718077]"><span>{s.currency}</span><span>·</span><span>{receiptLabel(language, s.method)}</span><span>·</span><span>{receiptLabel(language, s.status)}</span></div>
                  <div className="mt-2 flex items-baseline justify-between gap-2"><span className="font-mono text-lg font-semibold tabular-nums text-[#263f3b]" dir="ltr">{exactAmount(s.amount)} <small className="text-xs">{s.currency}</small></span><span className="text-[10px] text-[#7b887f]">{s.receiptCount} {t("rows")}</span></div>
                  <div className="mt-1 text-[10px] text-[#7b887f]">{t("walletCredit")}: <span className="font-mono tabular-nums" dir="ltr">{exactAmount(s.walletCredit)} {s.currency}</span></div>
                </div>)}</div>}
              </section>
              {receiptsQuery.data.items.length === 0 ? <Empty icon={<Banknote className="h-5 w-5"/>} title={t("empty")} detail={t("emptyHelp")}/> : <>
                <div className="overflow-x-auto rounded-xl border border-[#e1e7df]">
                  <table className="w-full min-w-[850px] text-start text-xs">
                    <thead className="bg-[#f0f4ee] text-[10px] font-bold uppercase tracking-[.08em] text-[#6e7e74]"><tr><th className="px-3 py-3">{t("date")}</th><th className="px-3 py-3">{t("customer")}</th><th className="px-3 py-3">{t("amount")}</th><th className="px-3 py-3">{t("method")}</th><th className="px-3 py-3">{t("status")}</th><th className="px-3 py-3">{t("source")}</th></tr></thead>
                    <tbody className="divide-y divide-[#e9ede7]">{receiptsQuery.data.items.map(row => <ReceiptTableRow key={row.id} row={row} language={language} selected={row.id === selectedId} onSelect={() => setSelectedId(row.id)} t={t}/>)}</tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#687970]"><span>{receiptsQuery.data.pagination.totalRows} {t("rows")} · {t("page")} {receiptsQuery.data.pagination.page} / {Math.max(1, Math.ceil(receiptsQuery.data.pagination.totalRows / receiptsQuery.data.pagination.pageSize))}</span><div className="flex gap-2"><button type="button" onClick={() => changePage((applied?.page ?? 1) - 1)} disabled={(applied?.page ?? 1) <= 1} className="rounded-md border border-[#d6dfd6] px-3 py-1.5 disabled:opacity-40">{t("previous")}</button><button type="button" onClick={() => changePage((applied?.page ?? 1) + 1)} disabled={(applied?.page ?? 1) >= Math.ceil(receiptsQuery.data.pagination.totalRows / receiptsQuery.data.pagination.pageSize)} className="rounded-md border border-[#d6dfd6] px-3 py-1.5 disabled:opacity-40">{t("next")}</button></div></div>
              </>}
            </>}
          </div>
          <aside className="min-w-0 rounded-xl border border-[#e1e7df] bg-[#f7f9f5] p-4 md:p-5">
            {!selectedId ? <Empty icon={<FileCheck2 className="h-5 w-5"/>} title={t("detailTitle")} detail={t("noDetail")}/> :
              detailQuery.isLoading ? <Loading label={t("detailLoading")}/> :
              detailQuery.isError ? <QueryError title={t("detailError")} detail={safeError(detailQuery.error, t("detailError"))} retry={t("retry")} onRetry={() => detailQuery.refetch()}/> :
              detailQuery.data ? <ReceiptDetailView detail={detailQuery.data} language={language} t={t} canWrite={actionCanWrite} writeReason={actionWriteReason} onAction={startAction} onReports={onReports}/> : null}
          </aside>
        </div>}
      </div>
    </div>

    <AccountingPartialReturns companies={companies} canManage={canManage} language={language}/>
    {formOpen && <Modal title={t("recordTitle")} closeLabel={t("close")} onClose={() => { if (!recordReceipt.isPending) setFormOpen(false); }} direction={direction}>
      <form onSubmit={submitReceipt} className="space-y-4 p-5">
        <fieldset disabled={recordReceipt.isPending} className="contents">
        <div className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] p-3 text-xs leading-5 text-[#806844]">{t("postedNote")}<p className="mt-1">{t("customerHint")}</p></div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={t("customer")}><div className="relative"><Search className="absolute start-3 top-3 h-4 w-4 text-[#829087]"/><input autoComplete="off" value={entry.customerQuery} onChange={e => { setEntry(old => ({ ...old, customerQuery: e.target.value, customerId: "", customerLabel: "" })); setAllocations({}); setAllocationCaps({}); }} placeholder={t("searchCustomer")} className={`${inputClass} ps-9`}/></div></Field>
          <Field label={t("currency")}><select value={entry.currency} onChange={e => { setEntry(old => ({ ...old, currency: e.target.value })); setAllocations({}); setAllocationCaps({}); setOpenPage(1); }} className={inputClass}><option value="">{t("currency")}</option>{currencyList.map(code => <option key={code} value={code}>{code}</option>)}</select></Field>
          <Field label={t("amount")}><input value={entry.amount} onChange={e => setEntry({ ...entry, amount: e.target.value })} inputMode="decimal" className={inputClass} placeholder="0.00"/></Field>
          <Field label={t("method")}><select value={entry.method} onChange={e => setEntry({ ...entry, method: e.target.value as ReceiptMethod })} className={inputClass}>{methods.map(x => <option key={x} value={x}>{receiptLabel(language, x)}</option>)}</select></Field>
          <Field label={t("date")}><input type="date" value={entry.entryDate} onChange={e => setEntry({ ...entry, entryDate: e.target.value })} className={inputClass}/></Field>
          {entry.method === "CHEQUE" && <Field label={t("chequeNumber")}><input value={entry.chequeNumber} onChange={e => setEntry({ ...entry, chequeNumber: e.target.value })} className={inputClass}/></Field>}
          <Field label={t("evidence")}><input value={entry.evidenceReference} onChange={e => setEntry({ ...entry, evidenceReference: e.target.value })} className={inputClass}/></Field>
          <Field label={t("reason")}><input value={entry.reason} onChange={e => setEntry({ ...entry, reason: e.target.value })} className={inputClass}/></Field>
        </div>
        <p className="text-[11px] leading-5 text-[#7b887f]">{t("amountHelp")}</p>
        {currenciesQuery.isError && <InlineError message={t("failed")} retry={t("retry")} onRetry={() => currenciesQuery.refetch()}/>}
        {customerQuery.isError && <InlineError message={t("customerError")} retry={t("retry")} onRetry={() => customerQuery.refetch()}/>}
        {customerQuery.isLoading && <div role="status" aria-label={t("loading")} className="space-y-2"><div className="h-9 animate-pulse rounded-lg bg-[#e8ede7]"/><div className="h-9 animate-pulse rounded-lg bg-[#e8ede7]"/></div>}
        {entry.customerQuery.trim().length >= 2 && !customerQuery.isLoading && customerQuery.data && customerQuery.data.items.length === 0 && <p className="text-xs text-[#7b887f]">{t("noSearchResults")}</p>}
        {entry.customerQuery.trim().length >= 2 && customerQuery.data && (
          <div className="space-y-1">
            {customerQuery.data.items.map(customer => (
              <button key={customer.id} type="button" onClick={() => chooseCustomer(customer)} className="block w-full rounded-lg border border-[#e1e7df] bg-[#f7f9f5] px-3 py-2 text-start text-sm hover:bg-[#eaf0e9]">
                <span className="font-semibold text-[#344a44]">{customer.name}</span>
                {customer.code && <span className="ms-2 font-mono text-xs text-[#718077]">{customer.code}</span>}
              </button>
            ))}
          </div>
        )}
        {entry.customerId && <section className="rounded-xl border border-[#e1e7df] bg-[#f7f9f5] p-3">
          <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-[#344a44]">{t("allocation")} · {entry.currency}</h3><span className="text-xs text-[#718077]">{entry.customerLabel}</span></div>
          {openItemsQuery.isLoading && <div className="mt-3 space-y-2" role="status" aria-label={t("itemsLoading")}><div className="h-14 animate-pulse rounded-lg bg-[#e8ede7]"/><div className="h-14 animate-pulse rounded-lg bg-[#e8ede7]"/></div>}
          {openItemsQuery.isError && <InlineError message={t("openItemsError")} retry={t("retry")} onRetry={() => openItemsQuery.refetch()}/>}
          {openItemsQuery.data?.items.length === 0 && <p className="mt-3 text-xs text-[#7b887f]">{t("noOpenItems")}</p>}
          {openItemsQuery.data?.items.map(item => <div key={item.id} className="mt-3 grid gap-2 rounded-lg border border-[#e3e9e1] bg-[#fbfcf8] p-3 md:grid-cols-[1fr_140px]">
            <div className="min-w-0"><div className="text-xs font-semibold text-[#344a44]">{t("invoice")} · {item.invoiceReference} <span className="font-mono text-[#718077]">#{item.invoiceJournalId}</span></div><div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-[#7b887f]"><span>{t("openAmount")}: <b className="font-mono" dir="ltr">{exactAmount(item.openAmount)} {item.currency}</b></span><span>{t("invoiceAmount")}: {exactAmount(item.amount)}</span><span>{t("settled")}: {exactAmount(item.settledAmount)}</span></div></div>
            <Field label={`${t("allocate")} · ${item.currency}`}><input value={allocations[String(item.id)] ?? ""} onChange={e => setAllocations(old => ({ ...old, [String(item.id)]: e.target.value }))} inputMode="decimal" placeholder="0.00" className={`${inputClass} h-9 font-mono`} /></Field>
          </div>)}
          {openItemsQuery.data && Math.ceil(openItemsQuery.data.totalRows / openItemsQuery.data.pageSize) > 1 && <div className="mt-3 flex items-center justify-end gap-2"><button type="button" onClick={() => setOpenPage(p => Math.max(1, p - 1))} disabled={openPage <= 1} className="rounded border px-2 py-1 text-xs disabled:opacity-40">{t("previousPage")}</button><span className="text-xs">{openPage} / {Math.ceil(openItemsQuery.data.totalRows / openItemsQuery.data.pageSize)}</span><button type="button" onClick={() => setOpenPage(p => p + 1)} disabled={openPage >= Math.ceil(openItemsQuery.data.totalRows / openItemsQuery.data.pageSize)} className="rounded border px-2 py-1 text-xs disabled:opacity-40">{t("nextPage")}</button></div>}
          <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${sumOver ? "bg-[#f8ece6] text-[#79473f]" : "bg-[#eef3ed] text-[#526b55]"}`}><span>{t("allocated")}: <b dir="ltr" className="font-mono">{allocatedTotal ?? "—"} {allocatedTotal === null ? "" : entry.currency}</b></span>{remainderIsCredit && <p className="mt-1">{t("remaining")}: <b dir="ltr" className="font-mono">{remainder} {entry.currency}</b></p>}{sumOver && <p className="mt-1">{t("over")}</p>}</div>
        </section>}
        {entry.method === "CHEQUE" && <Notice>{t("effectCheque")}</Notice>}
        <div className="rounded-lg border border-[#e1e7df] bg-[#f7f9f5] p-3"><strong className="text-xs text-[#344a44]">{t("effects")}</strong><p className="mt-1 text-xs leading-5 text-[#63736a]">{t("effectReceipt")}</p><p className="text-xs leading-5 text-[#63736a]">{t("effectExcess")}</p><p className="mt-2 break-all font-mono text-[10px] text-[#829087]">{t("sourceHelp")} · {entry.sourceId}</p></div>
        {writeReason && <Notice>{writeReason}</Notice>}
        <label className="flex items-start gap-2 rounded-lg border border-[#dce7dc] bg-[#f0f5ef] p-3 text-xs leading-5 text-[#526b55]"><input type="checkbox" checked={entry.attested} onChange={e => setEntry({ ...entry, attested: e.target.checked })} className="mt-1 accent-[#315e55]"/><span>{t("attestation")}</span></label>
        {formError && <InlineError message={formError}/>}
        {recordUncertain && <Notice>{t("retryConflictWarning")}</Notice>}
        </fieldset>
        <div className="flex justify-end gap-2 border-t border-[#e5e9e2] pt-4"><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-[#d6dfd6] px-4 py-2 text-sm text-[#365750]">{t("cancel")}</button><button type="submit" disabled={!canWrite || !entry.attested || recordReceipt.isPending || !amountValid || !allocationValid || !entry.customerId} title={writeReason || undefined} className="inline-flex items-center gap-2 rounded-lg bg-[#20484a] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">{recordReceipt.isPending && <LoaderCircle className="h-4 w-4 animate-spin"/>}{t("submit")}</button></div>
      </form>
    </Modal>}
    {eventAction && <Modal title={`${t("eventTitle")} · ${actionLabel(language, eventAction)}`} closeLabel={t("close")} onClose={() => { if (!receiptAction.isPending) setEventAction(undefined); }} direction={direction}>
      <form onSubmit={submitAction} className="space-y-4 p-5">
        <fieldset disabled={receiptAction.isPending} className="contents">
        <Notice>{t(eventAction === "deposited" ? "eventDeposit" : eventAction === "cleared" ? "eventClear" : eventAction === "bounced" ? "eventBounce" : "eventReturn")}</Notice>
        <div className="rounded-lg border border-[#e1e7df] bg-[#f7f9f5] p-3 text-xs leading-5 text-[#63736a]">{t("eventHelp")} {detailQuery.data && <p className="mt-1 font-semibold">{t("amount")}: <span className="font-mono" dir="ltr">{exactAmount(detailQuery.data.receipt.amount)} {detailQuery.data.receipt.currency}</span></p>}</div>
        <div className="grid gap-3 md:grid-cols-2"><Field label={t("eventDate")}><input type="date" value={eventDraft.entryDate} onChange={e => setEventDraft({ ...eventDraft, entryDate: e.target.value })} className={inputClass}/></Field><Field label={t("evidence")}><input value={eventDraft.evidenceReference} onChange={e => setEventDraft({ ...eventDraft, evidenceReference: e.target.value })} className={inputClass}/></Field><div className="md:col-span-2"><Field label={t("eventReason")}><textarea value={eventDraft.reason} onChange={e => setEventDraft({ ...eventDraft, reason: e.target.value })} className={textareaClass}/></Field></div></div>
        <p className="break-all font-mono text-[10px] text-[#829087]">{t("sourceHelp")} · {eventDraft.sourceId}</p>
        {actionWriteReason && <Notice>{actionWriteReason}</Notice>}
        <label className="flex items-start gap-2 rounded-lg border border-[#dce7dc] bg-[#f0f5ef] p-3 text-xs leading-5 text-[#526b55]"><input type="checkbox" checked={eventDraft.attested} onChange={e => setEventDraft({ ...eventDraft, attested: e.target.checked })} className="mt-1 accent-[#315e55]"/><span>{t("eventAttest")}</span></label>
        {eventError && <InlineError message={eventError}/>}
        {eventUncertain && <Notice>{t("retryConflictWarning")}</Notice>}
        </fieldset>
        <div className="flex justify-end gap-2 border-t border-[#e5e9e2] pt-4"><button type="button" onClick={() => setEventAction(undefined)} className="rounded-lg border border-[#d6dfd6] px-4 py-2 text-sm text-[#365750]">{t("cancel")}</button><button type="submit" disabled={!actionCanWrite || !eventDraft.attested || receiptAction.isPending} title={actionWriteReason || undefined} className="inline-flex items-center gap-2 rounded-lg bg-[#20484a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-45">{receiptAction.isPending && <LoaderCircle className="h-4 w-4 animate-spin"/>}{t("eventSubmit")}</button></div>
      </form>
    </Modal>}
  </section>;
}

export function ReceiptTableRow({ row, language, selected, onSelect, t }: { row: ReceiptRow; language: ReturnType<typeof useLanguage>["language"]; selected: boolean; onSelect: () => void; t: (key: ReceiptCopyKey) => string }) {
  return <tr onClick={onSelect} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onSelect(); }} tabIndex={0} aria-selected={selected} className={`cursor-pointer align-top transition-colors hover:bg-[#f7f9f5] ${selected ? "bg-[#edf3ed]" : ""}`}>
    <td className="whitespace-nowrap px-3 py-3 text-[#4d6158]" dir="ltr">{row.entryDate}</td>
    <td className="px-3 py-3"><button type="button" onClick={e => { e.stopPropagation(); onSelect(); }} className="text-start"><span className="block font-semibold text-[#344a44]">{row.customerName}</span>{row.customerCode && <span className="font-mono text-[10px] text-[#718077]">{t("customerCode")}: {row.customerCode}</span>}</button></td>
    <td className="whitespace-nowrap px-3 py-3 text-end font-mono font-semibold tabular-nums text-[#263f3b]" dir="ltr">{exactAmount(row.amount)} <span className="text-[10px]">{row.currency}</span>{new ReceiptDecimal(row.walletCredit || "0").gt(0) && <span className="mt-1 block text-[10px] font-normal text-[#718077]">{t("walletCredit")}: {exactAmount(row.walletCredit)} {row.currency}</span>}</td>
    <td className="whitespace-nowrap px-3 py-3 text-[#4d6158]">{receiptLabel(language, row.method)}{row.chequeNumber && <span className="mt-1 block font-mono text-[10px]">{row.chequeNumber}</span>}</td>
    <td className="px-3 py-3"><Status status={row.status} language={language}/></td><td className="max-w-[130px] truncate px-3 py-3 font-mono text-[10px] text-[#718077]" title={row.sourceId}>{row.sourceId}</td>
  </tr>;
}

export function ReceiptDetailView({ detail, language, t, canWrite, writeReason, onAction, onReports }: { detail: NonNullable<ReturnType<typeof useAccountingReceipt>["data"]>; language: ReturnType<typeof useLanguage>["language"]; t: (key: ReceiptCopyKey) => string; canWrite: boolean; writeReason: string; onAction: (action: ReceiptAction) => void; onReports: () => void }) {
  const { receipt, allocations, events, metadata } = detail;
  const permitted = allowedReceiptActions(receipt.method, receipt.status);
  const titleAction: Record<ReceiptAction, ReceiptCopyKey> = { deposited:"deposit", cleared:"clear", bounced:"bounce", returned:"return" };
  return <div className="space-y-4">
    <div className="border-b border-[#e3e9e1] pb-3"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-[.15em] text-[#829087]">{t("detailTitle")} · #{receipt.id}</div><h3 className="mt-1 text-lg font-semibold text-[#273d3a]">{receipt.customerName}</h3>{receipt.customerCode && <p className="font-mono text-xs text-[#718077]">{receipt.customerCode}</p>}</div><Status status={receipt.status} language={language}/></div>
      <div className="mt-3 grid grid-cols-2 gap-2"><Metric label={t("amount")} value={`${exactAmount(receipt.amount)} ${receipt.currency}`}/><Metric label={t("methodLabel")} value={`${receiptLabel(language, receipt.method)}${receipt.chequeNumber ? ` · ${receipt.chequeNumber}` : ""}`}/><Metric label={t("date")} value={receipt.entryDate}/><Metric label={t("walletCredit")} value={`${exactAmount(receipt.walletCredit)} ${receipt.currency}`}/></div>
      <div className="mt-3 rounded-lg bg-[#f0f4ee] px-3 py-2 text-xs leading-5 text-[#63736a]">{receipt.reason}<p>{t("evidenceRef")}: {receipt.evidenceReference}</p><p className="break-all font-mono text-[10px]">{t("source")}: {receipt.sourceId}</p></div>
    </div>
    <section><h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#53665d]">{t("allocations")}</h4>{allocations.length === 0 ? <p className="rounded-lg border border-dashed border-[#d7e0d7] p-3 text-xs text-[#7b887f]">{t("noAllocations")}</p> : <div className="space-y-2">{allocations.map(a => <div key={a.id} className="rounded-lg border border-[#e3e9e1] bg-[#fbfcf8] p-3"><div className="flex items-start justify-between gap-2 text-xs"><strong className="text-[#344a44]">{a.invoiceReference}</strong><b className="font-mono tabular-nums text-[#263f3b]" dir="ltr">{exactAmount(a.amount)} {receipt.currency}</b></div><div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-[#718077]"><span>{t("invoiceJournal")} #{a.invoiceJournalId}</span><span>{t("date")}: {a.issuedOn}</span><span>{t("openAmount")}: {exactAmount(a.openAmount)} {receipt.currency}</span></div></div>)}</div>}</section>
    <section><h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#53665d]">{t("events")}</h4>{events.length === 0 ? <p className="rounded-lg border border-dashed border-[#d7e0d7] p-3 text-xs text-[#7b887f]">{t("noEvents")}</p> : <ol className="space-y-2">{[...events].sort((a,b) => a.entryDate.localeCompare(b.entryDate) || a.id-b.id).map(ev => <li key={ev.id} className="relative rounded-lg border border-[#e3e9e1] bg-[#fbfcf8] p-3"><div className="flex justify-between gap-2"><strong className="text-xs text-[#344a44]">{actionLabel(language, ev.action as ReceiptAction) || ev.action}</strong><span className="text-[10px] text-[#718077]" dir="ltr">{ev.entryDate}</span></div><div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-[#718077]"><span>{t("journal")} #{ev.journalId} · {ev.journalStatus}</span>{ev.reversalId && <span>{t("reversal")} #{ev.reversalId}</span>}</div><p className="mt-1 text-xs text-[#63736a]">{ev.reason}</p><p className="text-[10px] text-[#718077]">{t("evidenceRef")}: {ev.evidenceReference}</p><p className="break-all font-mono text-[9px] text-[#829087]">{t("eventSource")}: {ev.sourceId}</p></li>)}</ol>}</section>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] p-3 text-[10px] leading-4 text-[#806844]"><span>{t("noJournalRoute")}</span><button type="button" onClick={onReports} className="shrink-0 rounded-md border border-[#d9cbaa] px-2.5 py-1.5 font-semibold text-[#755e39] hover:bg-[#f3ead7]">{t("openReports")}</button></div>
    {permitted.length > 0 && <section className="space-y-2 border-t border-[#e3e9e1] pt-3"><p className="text-xs font-semibold text-[#344a44]">{t("actions")}</p>{writeReason && <Notice>{writeReason}</Notice>}{permitted.map(action => <button key={action} type="button" disabled={!canWrite} title={writeReason || undefined} onClick={() => onAction(action)} className="w-full rounded-lg border border-[#d6dfd6] bg-[#f7f9f5] px-3 py-2 text-start text-xs font-semibold text-[#365750] hover:bg-[#eef3ed] disabled:cursor-not-allowed disabled:opacity-45">{t(titleAction[action])}</button>)}</section>}
  </div>;
}

function actionLabel(language: ReturnType<typeof useLanguage>["language"], action: ReceiptAction) {
  const key: Record<ReceiptAction, ReceiptCopyKey> = { deposited:"deposited", cleared:"cleared", bounced:"bounced", returned:"returned" };
  return receiptCopy(language, key[action]);
}
function gateReason(canManage: boolean, metadata: ReceiptMetadata | undefined, currency: string, companyId: number | undefined, t: (key: ReceiptCopyKey) => string): string {
  if (!canManage) return t("viewerReason");
  if (!metadata) return t("blockedReason");
  if (!companyId || metadata.company.id !== companyId) return t("scopeMismatch");
  if (!metadata.processingReady) return t("blockedReason");
  if (!metadata.company.isActive) return t("companyInactive");
  if (!currency || !metadata.activeCurrencies.includes(currency)) return t("currencyBlocked");
  return "";
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block min-w-0 space-y-1.5 text-xs font-semibold text-[#53665d]"><span>{label}</span>{children}</label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-lg border border-[#e3e9e1] bg-[#f7f9f5] px-3 py-2"><div className="text-[9px] font-semibold uppercase tracking-wide text-[#7b887f]">{label}</div><div className="mt-1 truncate text-xs font-semibold text-[#344a44]" dir="auto">{value}</div></div>; }
function Meta({ label, value, good }: { label: string; value: string; good: boolean }) { return <div className={`rounded-lg border px-3 py-2 text-[10px] ${good ? "border-[#dce7dc] bg-[#f0f5ef] text-[#526b55]" : "border-[#e6d9c4] bg-[#f8f1e5] text-[#806844]"}`}><span className="block font-semibold uppercase tracking-wide opacity-75">{label}</span><span className="mt-1 block font-semibold">{value}</span></div>; }
function Status({ status, language }: { status: ReceiptStatus; language: ReturnType<typeof useLanguage>["language"] }) { const tone = status === "cleared" || status === "confirmed" ? "bg-[#e4eee4] text-[#46674e]" : status === "bounced" || status === "returned" ? "bg-[#f8ece6] text-[#79473f]" : "bg-[#f7f0e2] text-[#755e39]"; return <span className={`inline-flex max-w-[150px] rounded-full px-2 py-1 text-[10px] font-semibold leading-4 ${tone}`}>{receiptLabel(language, status)}</span>; }
function Notice({ children }: { children: ReactNode }) { return <div role="note" className="rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-xs leading-5 text-[#806844]">{children}</div>; }
function Empty({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) { return <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-5 py-7 text-center"><div className="mb-3 rounded-xl bg-[#e7eee6] p-2 text-[#547267]">{icon}</div><strong className="text-sm text-[#344a44]">{title}</strong><p className="mt-1 max-w-sm text-xs leading-5 text-[#7b887f]">{detail}</p></div>; }
function Loading({ label }: { label: string }) { return <div role="status" className="space-y-3" aria-label={label}><p className="text-xs text-[#718077]">{label}</p><div className="h-12 animate-pulse rounded-lg bg-[#e8ede7]"/><div className="h-12 animate-pulse rounded-lg bg-[#e8ede7]"/><div className="h-12 animate-pulse rounded-lg bg-[#e8ede7]"/></div>; }
function QueryError({ title, detail, retry, onRetry }: { title: string; detail: string; retry: string; onRetry: () => void }) { return <div role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] p-3 text-sm text-[#883f37]"><div className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4"/>{title}</div><p className="mt-1 break-words text-xs">{detail}</p><button type="button" onClick={onRetry} className="mt-2 rounded border border-[#dfb8b0] px-3 py-1.5 text-xs font-semibold">{retry}</button></div>; }
function InlineError({ message, retry, onRetry }: { message: string; retry?: string; onRetry?: () => void }) { return <div role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-xs text-[#883f37]">{message}{retry && onRetry && <button type="button" onClick={onRetry} className="ms-2 underline">{retry}</button>}</div>; }
function Modal({ title, children, onClose, closeLabel, direction }: { title: string; children: ReactNode; onClose: () => void; closeLabel: string; direction: string }) {
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent dir={direction} className="max-h-[94dvh] max-w-3xl overflow-y-auto rounded-2xl border-[#dce3db] bg-[#fbfcf8] p-0 text-[#203735] shadow-[0_24px_80px_-30px_rgba(15,38,34,.55)] [&>button:last-child]:hidden">
      <DialogHeader className="sticky top-0 z-10 flex-row items-center justify-between gap-3 border-b border-[#e3e8e1] bg-[#f0f4ee] px-5 py-4">
        <DialogTitle className="font-display text-lg font-semibold text-[#273d3a]">{title}</DialogTitle>
        <DialogDescription className="sr-only">{title}</DialogDescription>
        <button type="button" onClick={onClose} aria-label={closeLabel} className="rounded-md p-2 text-[#63736a] hover:bg-[#e3eae2]">×</button>
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>;
}