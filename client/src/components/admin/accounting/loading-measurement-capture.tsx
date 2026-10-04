import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { LoadingCaptureContext, LoadingCaptureInput, LoadingCaptureScope } from "@shared/accounting-loading-capture";
import { loadingCaptureSchema } from "@shared/accounting-loading-capture";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAccountingResource } from "@/lib/accounting-api";
import { useCaptureMeasuredLoading, useLoadingCaptureContext } from "@/lib/accounting-loading-capture-api";
import { normalizeAccountingDigits } from "./accounting-logic";
import { buildLoadingCapturePayload, captureContextMatchesScope, captureScopeMatchesDraft, dateIsWithinCompanyDay, decimalsEqual, decimalSum, normalizeNumericField, type LoadingCaptureDraft } from "./loading-measurement-capture-form";
import { loadingCaptureCopy as t } from "./loading-measurement-capture-copy";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Archive, BadgeCheck, ClipboardCheck, Plus, RotateCw, ShieldAlert, Trash2, Weight } from "lucide-react";

type Company = { id: number; name: string; timezone?: string };
type Currency = { code: string; name?: string; isActive?: boolean };
type CostDraft = { orderItemId: number; batchReference: string; documentReference: string; weightTons: string; amount: string; currency: string };
type LanguageChoice = "en" | "fa" | "ar" | "tr";
const inputStyle = "h-10 w-full rounded-lg border border-[#d3dfd8] bg-[#fbfcf8] px-3 text-sm text-[#29423f] outline-none transition focus:border-[#54796b] focus:ring-2 focus:ring-[#54796b]/15 disabled:cursor-not-allowed disabled:opacity-60";
const panelStyle = "rounded-2xl border border-[#dce5dd] bg-[#fbfcf8] shadow-[0_14px_38px_-30px_rgba(38,74,61,.5)]";
const numeric = (value: string) => normalizeNumericField(value);

export default function LoadingMeasurementCapture() {
  const { language: contextLanguage, direction } = useLanguage();
  const language: LanguageChoice = (["en", "fa", "ar", "tr"].includes(contextLanguage) ? contextLanguage : "en") as LanguageChoice;
  const companyResource = useAccountingResource("companies");
  const currencyResource = useAccountingResource("currencies");
  const capture = useCaptureMeasuredLoading();
  const companyRows = (companyResource.data ?? []) as Company[];
  const companies = companyRows.filter(row => Number.isInteger(row.id) && row.id > 0 && typeof row.name === "string");
  const currencies = ((currencyResource.data ?? []) as Currency[]).filter(row => typeof row.code === "string" && /^[A-Z]{3}$/.test(row.code) && row.isActive !== false);
  const [draft, setDraft] = useState({ companyId: "", lookupMode: "number" as "id" | "number", orderValue: "" });
  const [applied, setApplied] = useState<LoadingCaptureScope>();
  const [scopeError, setScopeError] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [ticket, setTicket] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [selectedLines, setSelectedLines] = useState<number[]>([]);
  const [lineWeights, setLineWeights] = useState<Record<number, string>>({});
  const [costRows, setCostRows] = useState<Record<number, CostDraft[]>>({});
  const [formError, setFormError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState<{ scope: { companyId: number; orderId: number }; body: LoadingCaptureInput }>();
  const [success, setSuccess] = useState<{ scope: { companyId: number; orderId: number }; factId: number; duplicate: boolean }>();
  const scopeMatches = !!applied && captureScopeMatchesDraft(applied, draft.companyId, draft.lookupMode, draft.orderValue, companies.some(company => company.id === applied.companyId));
  const filters = useMemo(() => scopeMatches && applied ? { ...applied } : undefined, [scopeMatches, applied]);
  const contextQuery = useLoadingCaptureContext(filters);
  const context = contextQuery.data;
  const contextMatches = !!filters && !!context && context.captureOnly === true && context.financialPostingAllowed === false
    && captureContextMatchesScope(filters, context);
  const safeContext = contextMatches ? context as LoadingCaptureContext : undefined;
  const canCapture = safeContext?.permissions.canCapture === true;
  const inFlight = capture.isPending;
  const successMatches = !!success && !!safeContext && success.scope.companyId === safeContext.company.id && success.scope.orderId === safeContext.order.id;
  const queryDenied = contextQuery.error instanceof Error && /403|forbidden|permission|access denied/i.test(contextQuery.error.message);
  const captureErrorMatches = !!submitted && !!safeContext && submitted.scope.companyId === safeContext.company.id && submitted.scope.orderId === safeContext.order.id;
  const selectedCompany = companies.find(company => company.id === Number(normalizeAccountingDigits(draft.companyId)));
  const companyToday = (() => {
    if (!selectedCompany?.timezone) return undefined;
    try {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: selectedCompany.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      const part = (type: string) => parts.find(item => item.type === type)?.value ?? "";
      return `${part("year")}-${part("month")}-${part("day")}`;
    } catch { return undefined; }
  })();

  const applyScope = (event: FormEvent) => {
    event.preventDefault();
    if (inFlight) return;
    setScopeError(false);
    const companyId = Number(normalizeAccountingDigits(draft.companyId.trim()));
    const lookup = draft.orderValue.trim();
    let scope: LoadingCaptureScope | undefined;
    if (draft.lookupMode === "id") {
      const orderId = Number(normalizeAccountingDigits(lookup));
      if (Number.isSafeInteger(orderId) && orderId > 0) scope = { companyId, orderId };
    } else if (lookup.length > 0 && lookup.length <= 150) {
      scope = { companyId, orderNumber: lookup };
    }
    if (!Number.isSafeInteger(companyId) || companyId <= 0 || !companies.some(company => company.id === companyId) || !scope) {
      setScopeError(true);
      return;
    }
    setApplied(scope);
    setSelectedLines([]);
    setLineWeights({});
    setCostRows({});
    setSourceId("");
    setTicket("");
    setEventDate("");
    setTotalWeight("");
    setFormError("");
    setSuccess(undefined);
    setSubmitted(undefined);
    capture.reset();
  };

  const updateCost = (lineId: number, index: number, field: keyof CostDraft, value: string) => {
    setCostRows(current => ({
      ...current,
      [lineId]: (current[lineId] ?? []).map((row, rowIndex) => rowIndex === index
        ? { ...row, [field]: field === "amount" || field === "weightTons" ? numeric(value) : value }
        : row),
    }));
  };
  const addCost = (lineId: number) => setCostRows(current => ({
    ...current,
    [lineId]: [...(current[lineId] ?? []), { orderItemId: lineId, batchReference: "", documentReference: "", weightTons: "", amount: "", currency: "" }],
  }));
  const removeCost = (lineId: number, index: number) => setCostRows(current => ({
    ...current, [lineId]: (current[lineId] ?? []).filter((_, rowIndex) => rowIndex !== index),
  }));
  const attemptSave = () => {
    setFormError("");
    if (!safeContext || !canCapture || !filters) return;
    if (!dateIsWithinCompanyDay(eventDate, companyToday)) {
      setFormError(t(language, "futureDate")); return;
    }
    if (!selectedLines.length || selectedLines.some(id => !lineWeights[id]?.trim())) {
      setFormError(t(language, "requiredLines")); return;
    }
    try {
      if (!decimalsEqual(totalWeight.trim(), decimalSum(selectedLines.map(id => lineWeights[id])))) {
        setFormError(t(language, "totalMismatch")); return;
      }
    } catch {
      setFormError(t(language, "invalidForm")); return;
    }
    const costs = selectedLines.flatMap(id => costRows[id] ?? []);
    const partialCost = costs.some(row => !row.batchReference.trim() || !row.documentReference.trim()
      || !row.weightTons.trim() || !row.amount.trim() || !row.currency);
    if (partialCost) { setFormError(t(language, "costIncomplete")); return; }
    for (const lineId of selectedLines) {
      const rows = costRows[lineId] ?? [];
      if (!rows.length) continue;
      try {
        if (!decimalsEqual(decimalSum(rows.map(row => row.weightTons)), lineWeights[lineId])) {
          setFormError(t(language, "costIncomplete")); return;
        }
      } catch { setFormError(t(language, "costIncomplete")); return; }
    }
    const draftPayload: LoadingCaptureDraft = {
      companyId: String(safeContext.company.id), orderId: String(safeContext.order.id), sourceId, eventDate, weighbridgeReference: ticket,
      actualWeightTons: totalWeight, lines: selectedLines.map(orderItemId => ({ orderItemId, actualWeightTons: lineWeights[orderItemId] })),
      inventoryCosts: costs.map(({ orderItemId, batchReference, documentReference, weightTons, amount, currency }) => ({
        orderItemId, batchReference, documentReference, weightTons, amount, currency,
      })),
    };
    let built: LoadingCaptureInput;
    try { built = buildLoadingCapturePayload(draftPayload); }
    catch { setFormError(t(language, "invalidForm")); return; }
    const parsed = loadingCaptureSchema.safeParse(built);
    if (!parsed.success) { setFormError(t(language, "invalidForm")); return; }
    setSubmitted({ scope: { companyId: safeContext.company.id, orderId: safeContext.order.id }, body: parsed.data });
    setConfirmOpen(true);
  };
  const submit = () => {
    if (!submitted || !safeContext || submitted.scope.companyId !== safeContext.company.id || submitted.scope.orderId !== safeContext.order.id || inFlight) return;
    setConfirmOpen(false);
    capture.mutate(submitted.body, {
      onSuccess: result => setSuccess({ scope: submitted.scope, factId: result.factId, duplicate: result.duplicate }),
    });
  };
  const retryExact = () => {
    if (!submitted || !safeContext || submitted.scope.companyId !== safeContext.company.id || submitted.scope.orderId !== safeContext.order.id || inFlight) return;
    capture.mutate(submitted.body, {
      onSuccess: result => setSuccess({ scope: submitted.scope, factId: result.factId, duplicate: result.duplicate }),
    });
  };
  const selected = useMemo(() => new Set(selectedLines), [selectedLines]);

  return <section dir={direction} className="space-y-5 text-[#304940]">
    <header className="overflow-hidden rounded-2xl border border-[#cfded3] bg-[#eaf1e9]">
      <div className="relative flex flex-wrap items-start justify-between gap-4 px-5 py-5 md:px-7 md:py-6">
        <div className="flex gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#244d4a] text-[#f1f1df] shadow-[0_10px_24px_-15px_rgba(25,63,56,.7)]"><Weight className="h-6 w-6"/></span>
          <div><p className="text-[10px] font-extrabold uppercase tracking-[.19em] text-[#7b8a7d]">MOMTAZCOM · LOGISTICS EVIDENCE</p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.035em] text-[#263f3a] md:text-3xl">{t(language, "title")}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#687a70]">{t(language, "intro")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[#cedbd0] bg-[#f8faf5] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#4c6d5e]">{t(language, "captureOnly")}</span>
          <span className="rounded-full border border-[#e5d4bd] bg-[#fbf4e7] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#806a49]">{t(language, "postingOff")}</span>
        </div>
      </div>
      <div role="alert" className="flex gap-3 border-t border-[#dec0ad] bg-[#f6e9dc] px-5 py-4 text-[#70483b] md:px-7">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0"/>
        <div><p className="text-xs font-extrabold uppercase tracking-[.07em]">{t(language, "safetyTitle")}</p><p className="mt-1 text-xs leading-5">{t(language, "safety")}</p></div>
      </div>
    </header>

    <form onSubmit={applyScope} className={`${panelStyle} grid gap-3 p-4 md:grid-cols-[1.1fr_.8fr_1.2fr_auto] md:items-end md:p-5`}>
      <Field label={t(language, "company")}><select className={inputStyle} value={draft.companyId} disabled={inFlight} onChange={event => setDraft(current => ({ ...current, companyId: event.target.value }))}>
        <option value="">{t(language, "company")}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name} · #{company.id}</option>)}
      </select></Field>
      <Field label={t(language, "scope")}><select className={inputStyle} value={draft.lookupMode} disabled={inFlight} onChange={event => setDraft(current => ({ ...current, lookupMode: event.target.value as "id" | "number", orderValue: "" }))}>
        <option value="number">{t(language, "lookupByNumber")}</option><option value="id">{t(language, "lookupById")}</option>
      </select></Field>
      <Field label={t(language, draft.lookupMode === "number" ? "orderNumber" : "order")}>
        <input className={inputStyle} dir="ltr" inputMode={draft.lookupMode === "id" ? "numeric" : "text"} autoComplete="off"
          placeholder={draft.lookupMode === "number" ? "M2601303" : undefined} value={draft.orderValue} disabled={inFlight}
          onChange={event => setDraft(current => ({ ...current, orderValue: current.lookupMode === "id" ? numeric(event.target.value) : event.target.value }))}/>
      </Field>
      <Button type="submit" disabled={!companies.length || inFlight} className="h-10 bg-[#244d4a] px-5 text-white hover:bg-[#35645b]"><ClipboardCheck className="me-2 h-4 w-4"/>{t(language, "apply")}</Button>
      <p className="text-xs leading-5 text-[#738178] md:col-span-4">{t(language, draft.lookupMode === "number" ? "orderNumberHint" : "orderHint")}</p>
      {scopeError && <p role="alert" className="text-sm text-[#9a493f] md:col-span-3">{t(language, "invalidScope")}</p>}
      {companyResource.isLoading && <Skeleton className="h-8 rounded-lg bg-[#e5ece4] md:col-span-3"/>}
      {companyResource.isError && <Alert variant="destructive" className="md:col-span-3"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language, "companiesFailed")}</AlertTitle><AlertDescription>{companyResource.error instanceof Error ? companyResource.error.message : ""}</AlertDescription></Alert>}
      {!companyResource.isLoading && !companyResource.isError && !companies.length && <p className="text-sm text-[#806a49] md:col-span-3">{t(language, "noCompanies")}</p>}
    </form>

    {!scopeMatches && applied ? <div role="status" className="rounded-xl border border-[#e5d4bd] bg-[#fbf4e7] px-4 py-3 text-sm leading-6 text-[#806a49]">{t(language, "stale")}</div> :
      !filters ? <Empty icon={<Archive className="h-5 w-5"/>} text={t(language, "choose")}/> :
      contextQuery.isLoading ? <div className="space-y-3" aria-label={t(language, "loading")}>{[0,1,2].map(item => <Skeleton key={item} className="h-20 rounded-xl bg-[#e5ece4]"/> )}</div> :
      contextQuery.isError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{queryDenied ? t(language, "permissionDenied") : t(language, "contextFailed")}</AlertTitle>
        <AlertDescription className="mt-2 flex flex-wrap items-center gap-3"><span>{contextQuery.error instanceof Error ? contextQuery.error.message : t(language, "contextError")}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => contextQuery.refetch()}><RotateCw className="me-2 h-3.5 w-3.5"/>{t(language, "retry")}</Button></AlertDescription></Alert> :
      !contextMatches ? <div role="status" className="rounded-xl border border-[#e5d4bd] bg-[#fbf4e7] px-4 py-3 text-sm leading-6 text-[#806a49]">{t(language, "stale")}</div> :
      <>
        <section className={`${panelStyle} overflow-hidden`}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e3eae2] bg-[#f3f7f0] px-4 py-4 md:px-6">
            <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#859187]">{safeContext!.company.name} · #{safeContext!.company.id}</p>
              <h3 className="mt-1 font-display text-lg font-semibold text-[#294540]">{t(language, "captureHeading")}</h3>
              <p className="mt-1 text-xs text-[#758179]">{t(language, "contextBadge")} · {t(language, "orderLabel")} #{safeContext!.order.id} {safeContext!.order.number ? <bdi dir="auto">· {safeContext!.order.number}</bdi> : ""}</p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.1em] ${canCapture ? "bg-[#e5efe4] text-[#436b52]" : "bg-[#f8eee0] text-[#806a49]"}`}>{canCapture ? t(language, "captureOnly") : t(language, "readOnly")}</span>
          </div>
          {!canCapture && <div role="alert" className="border-b border-[#eadfc9] bg-[#fbf4e7] px-4 py-3 text-sm leading-6 text-[#806a49] md:px-6">{t(language, "noPermission")}</div>}
          {currencies.length === 0 && <div role="status" className="border-b border-[#eadfc9] bg-[#fbf4e7] px-4 py-3 text-xs leading-5 text-[#806a49]">{t(language, "currenciesEmpty")}</div>}
          {currencyResource.isError && <Alert variant="destructive" className="m-4"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language, "currenciesFailed")}</AlertTitle><AlertDescription>{currencyResource.error instanceof Error ? currencyResource.error.message : ""}</AlertDescription></Alert>}

          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4 md:p-6">
            <Field label={t(language, "reference")}><input className={inputStyle} value={sourceId} disabled={!canCapture || inFlight} onChange={event => setSourceId(event.target.value)}/></Field>
            <Field label={t(language, "ticket")}><input className={inputStyle} value={ticket} disabled={!canCapture || inFlight} onChange={event => setTicket(event.target.value)}/></Field>
            <Field label={t(language, "date")}><input className={inputStyle} type="date" dir="ltr" max={companyToday} value={eventDate} disabled={!canCapture || inFlight} onChange={event => setEventDate(numeric(event.target.value))}/></Field>
            <Field label={t(language, "total")}><input className={`${inputStyle} font-mono tabular-nums`} dir="ltr" inputMode="decimal" value={totalWeight} disabled={!canCapture || inFlight} onChange={event => setTotalWeight(numeric(event.target.value))}/></Field>
            <p className="text-xs leading-5 text-[#738178] md:col-span-2 xl:col-span-4">{t(language, "selectLines")}</p>
          </div>

          <div className="border-t border-[#e3eae2] px-4 py-4 md:px-6">
            <h4 className="text-sm font-semibold text-[#34554b]">{t(language, "lines")}</h4>
            {!safeContext!.lines.length ? <div className="mt-3 rounded-xl border border-dashed border-[#d4dfd4] bg-[#f7f9f5] p-5 text-sm text-[#78857b]">{t(language, "noLines")}</div> :
              <div className="mt-3 space-y-3">{safeContext!.lines.map(line => {
                const active = selected.has(line.orderItemId);
                const pricing = safeContext!.pricing.find(item => item.orderItemId === line.orderItemId && item.basis === "frozen-explicit-metric-unit");
                const evidence = costRows[line.orderItemId] ?? [];
                return <article key={line.orderItemId} className={`rounded-xl border p-4 transition-colors ${active ? "border-[#afc9b5] bg-[#f4f8f1]" : "border-[#e4eae2] bg-[#fcfdf9]"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <label className="flex min-w-[230px] flex-1 cursor-pointer items-start gap-3">
                      <input type="checkbox" checked={active} disabled={!canCapture || inFlight} onChange={event => setSelectedLines(current => event.target.checked ? [...current, line.orderItemId] : current.filter(id => id !== line.orderItemId))} className="mt-1 h-4 w-4 accent-[#315c50]"/>
                      <span><span className="block text-sm font-semibold text-[#344d44]">{t(language, "line")} #{line.orderItemId} · {line.name || `${t(language, "product")} #${line.productId ?? "—"}`}</span>
                        <span className="mt-1 block text-xs text-[#77847b]">{t(language, "nativeUnit")}: {line.unit || "—"} · {t(language, "frozenPrice")}: <bdi dir="ltr" className="font-mono">{line.lockedUnitPrice ?? "—"}</bdi></span></span>
                    </label>
                    <div className="min-w-[220px] rounded-lg border border-[#e2e8df] bg-[#fbfcf8] px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[.05em] text-[#839087]">{t(language, "metricPrice")}</p>
                      <p dir="ltr" className="mt-1 font-mono text-sm tabular-nums text-[#3a5d50]">{pricing ? `${pricing.pricePerTon} / t` : t(language, "unresolved")}</p>
                      {pricing && <p className="mt-1 text-[10px] text-[#879189]">{line.unit || pricing.nativeUnit} · {pricing.tonsToPriceUnits} · frozen</p>}
                    </div>
                  </div>
                  {active && <div className="mt-4 grid gap-3 border-t border-[#e0e9df] pt-3 sm:grid-cols-[1fr_2fr]">
                    <Field label={t(language, "weight")}><input className={inputStyle} dir="ltr" inputMode="decimal" value={lineWeights[line.orderItemId] ?? ""} disabled={!canCapture || inFlight} onChange={event => setLineWeights(current => ({ ...current, [line.orderItemId]: numeric(event.target.value) }))}/></Field>
                    <div className="rounded-lg border border-[#dfe8dc] bg-[#f8faf5] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2"><h5 className="text-xs font-bold text-[#586f61]">{t(language, "costsTitle")}</h5>
                        <Button type="button" variant="outline" size="sm" disabled={!canCapture || inFlight} onClick={() => addCost(line.orderItemId)} className="h-8 border-[#d1ddd1] text-[#426253]"><Plus className="me-1.5 h-3.5 w-3.5"/>{t(language, "addCost")}</Button></div>
                      <p className="mt-2 text-[11px] leading-5 text-[#78857b]">{evidence.length ? t(language, "costWeightCoverage") : t(language, "noEvidence")}</p>
                      {!!evidence.length && <div className="mt-3 space-y-3">{evidence.map((row, index) => <div key={`${line.orderItemId}-${index}`} className="rounded-lg border border-[#e0e7dd] bg-[#fbfcf8] p-3">
                        <div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.1em] text-[#839087]">{t(language, "evidenceRow")} · {index + 1}</span>
                          <button type="button" disabled={!canCapture || inFlight} onClick={() => removeCost(line.orderItemId, index)} className="inline-flex items-center gap-1 text-[11px] text-[#9a5548] disabled:opacity-50"><Trash2 className="h-3.5 w-3.5"/>{t(language, "removeCost")}</button></div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Field label={t(language, "batch")}><input className={inputStyle} value={row.batchReference} disabled={!canCapture || inFlight} onChange={event => updateCost(line.orderItemId, index, "batchReference", event.target.value)}/></Field>
                          <Field label={t(language, "document")}><input className={inputStyle} value={row.documentReference} disabled={!canCapture || inFlight} onChange={event => updateCost(line.orderItemId, index, "documentReference", event.target.value)}/></Field>
                          <Field label={t(language, "costWeight")}><input className={inputStyle} dir="ltr" inputMode="decimal" value={row.weightTons} disabled={!canCapture || inFlight} onChange={event => updateCost(line.orderItemId, index, "weightTons", event.target.value)}/></Field>
                          <Field label={t(language, "amount")}><input className={inputStyle} dir="ltr" inputMode="decimal" value={row.amount} disabled={!canCapture || inFlight} onChange={event => updateCost(line.orderItemId, index, "amount", event.target.value)}/></Field>
                          <Field label={t(language, "currency")}><select className={inputStyle} value={row.currency} disabled={!canCapture || inFlight || !currencies.length} onChange={event => updateCost(line.orderItemId, index, "currency", event.target.value)}>
                            <option value="">{t(language, "currency")}</option>{currencies.map(currency => <option key={currency.code} value={currency.code}>{currency.code}{currency.name ? ` · ${currency.name}` : ""}</option>)}
                          </select></Field>
                        </div>
                      </div>)}</div>}
                    </div>
                  </div>}
                </article>;
              })}</div>}
          </div>

          <div className="border-t border-[#e3eae2] px-4 py-4 md:px-6">
            <div className="rounded-xl border border-[#e5d4bd] bg-[#fbf4e7] p-4">
              <h4 className="text-xs font-extrabold uppercase tracking-[.08em] text-[#745b3c]">{t(language, "costsTitle")}</h4>
              <p className="mt-1 text-xs leading-5 text-[#806a49]">{t(language, "costWarning")}</p>
            </div>
            {formError && <p role="alert" className="mt-3 rounded-lg border border-[#e1b9b0] bg-[#faece8] px-3 py-2 text-sm text-[#8e453b]">{formError}</p>}
            {capture.isError && captureErrorMatches && <Alert variant="destructive" className="mt-3"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language, "error")}</AlertTitle>
              <AlertDescription className="mt-1 flex flex-wrap items-center justify-between gap-3"><span>{capture.error instanceof Error ? capture.error.message : t(language, "error")}</span>
                {submitted && <Button type="button" variant="outline" size="sm" disabled={inFlight} onClick={retryExact}>{t(language, "retrySubmit")}</Button>}</AlertDescription></Alert>}
            {successMatches && <div role="status" className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#bfd5c2] bg-[#edf5e9] px-4 py-3 text-sm text-[#3e684c]"><BadgeCheck className="h-4 w-4"/><b>{success!.duplicate ? t(language, "duplicate") : t(language, "success")}</b><span>{t(language, "fact")} #{success!.factId}</span></div>}
            {canCapture && <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-2xl text-[11px] leading-5 text-[#7b867c]">{t(language, "safety")}</p>
              <Button type="button" disabled={!safeContext!.lines.length || inFlight} onClick={attemptSave} className="bg-[#244d4a] text-white hover:bg-[#35645b]"><ClipboardCheck className="me-2 h-4 w-4"/>{inFlight ? t(language, "saving") : t(language, "save")}</Button>
            </div>}
          </div>
        </section>

        <LoadingCaptureHistory language={language} loadings={safeContext!.loadings} refreshing={contextQuery.isFetching} onRefresh={() => contextQuery.refetch()}/>
      </>}

    {confirmOpen && <div role="presentation" className="fixed inset-0 z-[100] grid place-items-center bg-[#203a35]/45 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setConfirmOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="loading-capture-confirm-title" dir={direction} className="w-full max-w-xl rounded-2xl border border-[#d8e2d8] bg-[#fbfcf8] p-5 shadow-2xl md:p-6">
        <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f6e9dc] text-[#815344]"><ShieldAlert className="h-5 w-5"/></span>
          <div><h3 id="loading-capture-confirm-title" className="font-display text-xl font-semibold text-[#304b42]">{t(language, "confirmTitle")}</h3><p className="mt-2 text-sm leading-6 text-[#65776d]">{t(language, "confirmBody")}</p></div></div>
        <p className="mt-4 rounded-xl border border-[#e5d4bd] bg-[#fbf4e7] px-3 py-2 text-xs leading-5 text-[#806a49]">{t(language, "safety")}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={inFlight} onClick={() => setConfirmOpen(false)}>{t(language, "cancel")}</Button>
          <Button type="button" disabled={inFlight || !submitted} onClick={submit} className="bg-[#244d4a] text-white hover:bg-[#35645b]">{inFlight ? t(language, "saving") : t(language, "confirm")}</Button></div>
      </section>
    </div>}
  </section>;
}

export function LoadingCaptureHistory({ language, loadings, refreshing = false, onRefresh }: {
  language: LanguageChoice;
  loadings: LoadingCaptureContext["loadings"];
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const direction = language === "fa" || language === "ar" ? "rtl" : "ltr";
  return <section dir={direction} className={`${panelStyle} overflow-hidden`}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3eae2] bg-[#f3f7f0] px-4 py-4 md:px-6">
      <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#859187]">{t(language, "captureOnly")}</p><h3 className="font-display text-lg font-semibold text-[#294540]">{t(language, "history")}</h3></div>
      {onRefresh && <Button type="button" variant="outline" size="sm" disabled={refreshing} onClick={onRefresh} className="border-[#d6dfd6] text-[#365750]"><RotateCw className={`me-2 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}/>{t(language, "refresh")}</Button>}
    </div>
    <p className="border-b border-[#eadfc9] bg-[#fbf4e7] px-4 py-3 text-xs leading-5 text-[#806a49] md:px-6">{t(language, "costWarning")}</p>
    {!loadings.length ? <Empty icon={<Archive className="h-5 w-5"/>} text={t(language, "noHistory")}/> : <div className="divide-y divide-[#e7ece5]">
      {loadings.map(record => <article key={record.factId} className="p-4 md:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label={t(language, "fact")} value={`#${record.factId}`} mono/>
          <Fact label={t(language, "reference")} value={record.reference}/>
          <Fact label={t(language, "date")} value={record.eventDate || "—"} mono/>
          <Fact label={t(language, "total")} value={record.weightTons ? `${record.weightTons} t` : "—"} mono/>
        </div>
        <div className="mt-4 rounded-xl border border-[#e3e9e0] bg-[#f7f9f4] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-[#516c5e]">{t(language, "inventoryCosts")}</p><span className="text-[10px] text-[#829087]">{record.inventoryCostCount} {t(language, "costCount")}</span></div>
          {record.inventoryCosts.length ? <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[680px] text-start text-xs">
            <thead className="text-[10px] font-bold uppercase tracking-[.06em] text-[#849087]"><tr>
              <th className="px-2 py-2 text-start">{t(language, "line")}</th><th className="px-2 py-2 text-start">{t(language, "batch")}</th><th className="px-2 py-2 text-start">{t(language, "document")}</th><th className="px-2 py-2 text-end">{t(language, "costWeight")}</th><th className="px-2 py-2 text-end">{t(language, "amount")}</th><th className="px-2 py-2 text-start">{t(language, "currency")}</th>
            </tr></thead><tbody className="divide-y divide-[#e5ebe2]">{record.inventoryCosts.map((cost, index) => <tr key={`${record.factId}-${index}`}>
              <td dir="ltr" className="px-2 py-2 font-mono">#{cost.orderItemId}</td><td className="px-2 py-2">{cost.batchReference}</td><td className="px-2 py-2">{cost.documentReference}</td><td dir="ltr" className="px-2 py-2 text-end font-mono">{cost.weightTons}</td><td dir="ltr" className="px-2 py-2 text-end font-mono">{cost.amount}</td><td dir="ltr" className="px-2 py-2 font-mono">{cost.currency}</td>
            </tr>)}</tbody></table></div> : <p className="mt-2 text-xs text-[#7b867c]">{t(language, "noEvidence")}</p>}
        </div>
      </article>)}
    </div>}
  </section>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0 space-y-1.5 text-xs font-semibold text-[#586c60]"><span>{label}</span>{children}</label>;
}
function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.07em] text-[#859087]">{label}</p><p dir={mono ? "ltr" : undefined} className={`mt-1 break-words text-sm text-[#3e554a] ${mono ? "font-mono tabular-nums" : "font-medium"}`}>{value}</p></div>;
}
function Empty({ text, icon }: { text: string; icon: ReactNode }) {
  return <div className="flex min-h-36 flex-col items-center justify-center px-6 py-7 text-center"><span className="mb-3 text-[#718379]">{icon}</span><p className="max-w-lg text-sm leading-6 text-[#78857b]">{text}</p></div>;
}