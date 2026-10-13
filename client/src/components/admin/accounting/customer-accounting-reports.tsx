import { useState, type ReactNode } from "react";
import { accountingCustomerCodeSchema, type CustomerAccountingReport, type CustomerReportFilters, type CustomerReportName } from "@shared/accounting-customer-reports";
import { useCustomerAccountingReport, downloadCustomerAccountingReport } from "@/lib/accounting-customer-reports-api";
import { useAccountingResource } from "@/lib/accounting-api";
import { useLanguage } from "@/contexts/LanguageContext";
import { accountingCurrencyName, normalizeAccountingDigits } from "./accounting-logic";
import { customerReportCopy, type CustomerReportCopyKey } from "./customer-reports-copy";
import { CustomerReportResult } from "./customer-report-result";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowDownToLine, BookOpenCheck, RefreshCw } from "lucide-react";

type Draft = { companyId: string; customerId: string; from: string; to: string; asOf: string; currency: string };
const today = () => new Date().toISOString().slice(0, 10);
const initialDraft = (): Draft => {
  const to = today();
  return { companyId: "", customerId: "", from: `${to.slice(0, 4)}-01-01`, to, asOf: to, currency: "" };
};
const inputClass = "h-10 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 text-sm text-[#29423f] outline-none focus:border-[#60877a] focus:ring-2 focus:ring-[#60877a]/15 disabled:opacity-60";
const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

export default function CustomerAccountingReports({ companies }: { companies: { id: number; name: string }[] }) {
  const { language, direction } = useLanguage();
  const t = (key: CustomerReportCopyKey) => customerReportCopy(language, key);
  const [report, setReport] = useState<CustomerReportName>("customer-statement");
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [applied, setApplied] = useState<CustomerReportFilters>();
  const [formError, setFormError] = useState("");
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const currenciesQ = useAccountingResource("currencies");
  const query = useCustomerAccountingReport(report, applied);
  const data = query.data as CustomerAccountingReport | undefined;
  const selectedCompany = companies.find(company => String(company.id) === draft.companyId);
  const isStatement = report === "customer-statement";
  const changeReport = (next: CustomerReportName) => {
    setReport(next);
    setApplied(undefined);
    setFormError("");
    setExportError("");
  };
  const applyFilters = () => {
    setFormError("");
    setExportError("");
    if (!draft.companyId) return setFormError(t("required"));
    const customerIdText = normalizeAccountingDigits(draft.customerId.trim());
    if (customerIdText && !accountingCustomerCodeSchema.safeParse(customerIdText).success) return setFormError(t("invalidId"));
    if (isStatement && !customerIdText) return setFormError(t("required"));
    if (isStatement && (!isDate(draft.from) || !isDate(draft.to) || draft.from > draft.to)) return setFormError(t("dateRange"));
    if (!isStatement && !draft.asOf) return setFormError(t("required"));
    if (!isStatement && !isDate(draft.asOf)) return setFormError(t("dateRange"));

    // Build only fields applicable to the selected report; never send statement dates to aging or vice versa.
    const filters: CustomerReportFilters = isStatement
      ? {
          companyId: Number(draft.companyId), customerCode: customerIdText,
          from: draft.from, to: draft.to, page: 1, pageSize: 50,
          ...(draft.currency ? { currency: draft.currency.toUpperCase() } : {}),
        }
      : {
          companyId: Number(draft.companyId), page: 1, pageSize: 50,
          ...(customerIdText ? { customerCode: customerIdText } : {}),
          ...(draft.asOf ? { asOf: draft.asOf } : {}),
          ...(draft.currency ? { currency: draft.currency.toUpperCase() } : {}),
        };
    setApplied(filters);
  };
  const changePage = (page: number) => { if (applied) setApplied({ ...applied, page }); };
  const exportCsv = async () => {
    if (!applied) return;
    setExportError("");
    setExporting(true);
    try {
      await downloadCustomerAccountingReport(report, applied);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : t("exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  return <section dir={direction} className="min-w-0">
    <div className="rounded-[22px] border border-[#dce2db] bg-[#fbfcf8] shadow-[0_14px_45px_-40px_rgba(29,57,50,.65)]">
      <header className="border-b border-[#e5e9e2] p-5 md:p-7">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#829087]">MOMTAZCOM · CUSTOMER LEDGER</div>
        <h2 className="font-display text-2xl font-semibold tracking-[-.025em] text-[#273d3a]">{t("title")}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[#758179]">{t("intro")}</p>
        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label={t("title")}>
          {(["customer-statement", "receivables-aging"] as const).map(id => <button key={id} type="button" role="tab" aria-selected={report === id}
            onClick={() => changeReport(id)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${report === id ? "bg-[#20484a] text-[#f4f2e7]" : "bg-[#edf1eb] text-[#52655b] hover:bg-[#e0e8df]"}`}>
            {t(id === "customer-statement" ? "statement" : "aging")}
          </button>)}
        </div>
      </header>
      <div className="space-y-5 p-4 md:p-6">
        <form onSubmit={event => { event.preventDefault(); applyFilters(); }} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label={t("company")}><select value={draft.companyId} onChange={event => { setDraft({ ...draft, companyId: event.target.value }); setApplied(undefined); }} className={inputClass}>
            <option value="">{t("company")}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
          </select></Field>
          <Field label={t("customerId")} hint={t("customerHelp")}><input inputMode="numeric" value={draft.customerId} onChange={event => setDraft({ ...draft, customerId: event.target.value })} className={inputClass} placeholder={t("customerRef")} /></Field>
          {isStatement ? <>
            <Field label={t("from")}><input type="date" value={draft.from} onChange={event => setDraft({ ...draft, from: event.target.value })} className={inputClass} /></Field>
            <Field label={t("to")}><input type="date" value={draft.to} onChange={event => setDraft({ ...draft, to: event.target.value })} className={inputClass} /></Field>
          </> : <Field label={t("asOf")}><input type="date" value={draft.asOf} onChange={event => setDraft({ ...draft, asOf: event.target.value })} className={inputClass} /></Field>}
          <Field label={t("currency")}><select value={draft.currency} onChange={event => setDraft({ ...draft, currency: event.target.value })} className={inputClass}>
            <option value="">{t("anyCurrency")}</option>{(currenciesQ.data ?? []).map(currency => <option key={String(currency.code)} value={String(currency.code)}>{String(currency.code)} · {accountingCurrencyName(String(currency.code), language, String(currency.name ?? currency.code))}</option>)}
          </select></Field>
          {currenciesQ.isError && <p role="alert" className="text-xs text-[#883f37]">{t("failed")} <button type="button" onClick={() => currenciesQ.refetch()} className="underline">{t("retry")}</button></p>}
          {!companies.length && <div className="rounded-lg border border-dashed border-[#d7e0d7] bg-[#f7f9f5] p-3 text-sm text-[#66776e] sm:col-span-2 xl:col-span-4">{t("noCompanies")}</div>}
          {formError && <div role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-sm text-[#883f37] sm:col-span-2 xl:col-span-4">{formError}</div>}
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-4">
            <Button type="submit" disabled={!companies.length} className="bg-[#20484a] text-white hover:bg-[#2d5d5c]"><RefreshCw className="me-2 h-4 w-4" />{t("apply")}</Button>
            <Button type="button" variant="outline" disabled={!applied || exporting} onClick={exportCsv} className="border-[#d6dfd6] text-[#365750]"><ArrowDownToLine className="me-2 h-4 w-4" />{exporting ? t("exporting") : t("export")}</Button>
          </div>
        </form>
        {exportError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>{t("exportFailed")}</AlertTitle><AlertDescription>{exportError}</AlertDescription></Alert>}
        {!selectedCompany ? <Empty title={companies.length ? t("chooseCompany") : t("noCompanies")} detail={t("applyFilters")} /> :
          !applied ? <Empty title={t("applyFilters")} detail={t(isStatement ? "customerHelp" : "intro")} /> :
          query.isLoading ? <div className="space-y-3" aria-label={t("loading")}>{[0, 1, 2].map(index => <Skeleton key={index} className="h-14 rounded-xl bg-[#e8ede7]" />)}</div> :
          query.isError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>{t("failed")}</AlertTitle><AlertDescription className="mt-2 flex flex-wrap items-center gap-3"><span>{query.error instanceof Error ? query.error.message : t("failed")}</span><Button variant="outline" size="sm" onClick={() => query.refetch()}>{t("retry")}</Button></AlertDescription></Alert> :
          data ? <CustomerReportResult report={report} data={data} language={language} page={applied.page ?? 1} changePage={changePage} /> : null}
      </div>
    </div>
  </section>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block min-w-0 space-y-1.5 text-xs font-semibold text-[#53665d]">
    <span>{label}</span>{children}{hint && <span className="block font-normal leading-5 text-[#758179]">{hint}</span>}
  </label>;
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-6 py-8 text-center">
    <BookOpenCheck className="mb-3 h-5 w-5 text-[#547267]" /><p className="text-sm font-semibold text-[#344a44]">{title}</p>
    <p className="mt-1 max-w-md text-xs leading-5 text-[#7b887f]">{detail}</p>
  </div>;
}