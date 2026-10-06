import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";
import { accountingCopy, type AccountingCopyKey } from "@/lib/accounting-copy";
import type { AccountingReport, AccountingReportName, AccountingReportRow } from "@shared/accounting-reports";
import { reportCopy } from "./accounting-reports-copy";
import type { ReportCopyKey } from "./accounting-reports-copy";
import { BookOpenCheck } from "lucide-react";

const val = (row: AccountingReportRow, key: string) => row[key] ?? "";

export function ReportResult({ report, data, language, page, changePage }: {
  report: AccountingReportName;
  data: AccountingReport;
  language: Language;
  page: number;
  changePage: (page: number) => void;
}) {
  const t = (key: ReportCopyKey) => reportCopy(language, key);
  const trial = report === "trial-balance";
  const totalRows = data.pagination.totalRows;
  const maxPage = Math.max(1, Math.ceil(totalRows / data.pagination.pageSize));
  const currency = data.company.baseCurrency;
  const totalKeys: [string, ReportCopyKey][] = [
    ["openingBase", "opening"], ["periodBaseDebit", "periodDebit"], ["periodBaseCredit", "periodCredit"],
    ["closingBase", "closing"], ["closingDebit", "closingDebit"], ["closingCredit", "closingCredit"],
  ];
  const totals = data.totals;
  const rows = data.rows;
  const runningColumns: [string, ReportCopyKey][] = report === "ledger"
    ? [["runningNative", "nativeRunning"], ["runningBase", "baseRunning"]] : [];
  const columns: [string, ReportCopyKey][] = trial
    ? [["accountCode", "code"], ["nameEn", "name"], ["accountType", "type"], ["openingBase", "opening"], ["openingDebit", "debit"], ["openingCredit", "credit"], ["periodBaseDebit", "periodDebit"], ["periodBaseCredit", "periodCredit"], ["closingBase", "closing"], ["closingDebit", "closingDebit"], ["closingCredit", "closingCredit"]]
    : [["entryDate", "entryDate"], ["entryNumber", "entryNumber"], ["lineId", "lineId"], ["accountCode", "code"], ["nameEn", "name"], ["description", "description"], ["lineDescription", "line"], ["debit", "debit"], ["credit", "credit"], ["baseDebit", "baseDebit"], ["baseCredit", "baseCredit"], ...runningColumns, ["currency", "currencyCol"], ["exchangeRate", "rate"], ["valuationBasis", "valuation"], ["partyType", "partyCol"], ["partyId", "party"], ["costCenterCode", "center"], ["sourceType", "source"], ["sourceId", "source"], ["reversalOfId", "reversal"]];
  const amountKeys = new Set(["openingBase", "openingDebit", "openingCredit", "periodBaseDebit", "periodBaseCredit", "closingBase", "closingDebit", "closingCredit", "debit", "credit", "baseDebit", "baseCredit", "runningNative", "runningBase"]);

  return <div dir={language === "fa" || language === "ar" ? "rtl" : "ltr"} className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label={t("company")} value={data.company.name} />
      <Metric label={t("companyBase")} value={currency} />
      <Metric label={t("postedCount")} value={String(data.coverage.postedEntryCount)} />
      <Metric label={t("legacy")} value={data.coverage.legacyOpeningVerified ? t("ready") : t("notVerified")} warning={!data.coverage.legacyOpeningVerified} />
    </div>
    <div className="grid gap-2 sm:grid-cols-3">
      <Coverage label={t("wallet")} value={data.coverage.walletCutoverReady ? t("ready") : t("notReady")} ready={data.coverage.walletCutoverReady} />
      <Coverage label={t("receipt")} value={data.coverage.receiptCutoverReady ? t("ready") : t("notReady")} ready={data.coverage.receiptCutoverReady} />
      <Coverage label={t("inactive")} value={t("notVerified")} ready={false} />
    </div>
    {report === "ledger" && <section className="rounded-xl border border-[#e2e7df] bg-[#f6f8f4] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#344a44]">{t("ledger")} · {t("companyBase")} ({currency})</h3>
        <span className="rounded-full bg-[#f5ead7] px-3 py-1 text-xs font-semibold text-[#806844]">{data.totals.balanceScope === "full" ? t("fullScope") : t("filteredScope")}</span>
      </div>
      {data.totals.balanceScope === "filtered" && <p className="mt-2 text-xs leading-5 text-[#806844]">{t("partialNote")}</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {totalKeys.map(([key, label]) => <Metric key={key} label={`${t(label)} · ${currency}`} value={String(totals[key as keyof typeof totals] ?? "")} />)}
      </div>
      {!!data.nativeBalances?.length && <div className="mt-4 border-t border-[#e0e7de] pt-4">
        <h4 className="text-xs font-semibold text-[#53665d]">{t("nativeBalances")}</h4>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {data.nativeBalances.map(balance => <div key={balance.currency} className="rounded-lg border border-[#e3e9e1] bg-[#fbfcf8] p-3">
            <div className="mb-2 font-mono text-xs font-bold text-[#365750]">{balance.currency}</div>
            <div className="grid grid-cols-2 gap-2">
              {([["opening", balance.opening], ["periodDebit", balance.debit], ["periodCredit", balance.credit], ["closing", balance.closing]] as const).map(([label, value]) => <Metric key={label} label={`${t(label)} · ${balance.currency}`} value={value} />)}
            </div>
          </div>)}
        </div>
      </div>}
    </section>}
    {trial && <section className="rounded-xl border border-[#e2e7df] bg-[#f6f8f4] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#344a44]">{t("trial")} · {currency}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${data.totals.isBalanced && data.totals.balanceScope === "full" && data.coverage.postedEntryCount > 0 ? "bg-[#e8eee5] text-[#55705a]" : "bg-[#f5ead7] text-[#806844]"}`}>{data.totals.balanceScope === "full" ? t("fullScope") : t("filteredScope")}</span>
      </div>
      {data.totals.balanceScope === "filtered" && <p className="mt-2 text-xs leading-5 text-[#806844]">{t("partialNote")}</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {totalKeys.map(([key, label]) => <Metric key={key} label={`${t(label)} · ${currency}`} value={String(totals[key as keyof typeof totals] ?? "")} />)}
      </div>
      {data.coverage.postedEntryCount > 0 && <p className="mt-3 text-xs font-semibold text-[#53665d]">{data.totals.isBalanced ? t("balanced") : t("notBalanced")}</p>}
    </section>}
    {totalRows === 0 ? <Empty title={t("noRows")} detail={t("noRowsHelp")} /> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#687970]">
        <span>{t("paginationNote")} · {t("transaction")} ≠ {t("companyBase")}</span>
        <span>{t("page")} {page} {t("of")} {maxPage} · {totalRows}</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#e1e7df]">
        <table className="w-full min-w-[1250px] text-start text-xs">
          <thead className="bg-[#f0f4ee] text-[10px] font-bold uppercase tracking-[.08em] text-[#6e7e74]"><tr>{columns.map(([key, label]) => <th key={key} className="whitespace-nowrap px-3 py-3 text-start">{t(label)}{amountKeys.has(key) ? ` · ${["debit", "credit"].includes(key) ? t("transaction") : key === "runningNative" ? t("currencyCol") : currency}` : ""}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#e9ede7]">{rows.map((row, index) => <tr key={`${val(row, "lineId")}-${index}`} className="align-top hover:bg-[#f7f9f5]">{columns.map(([key]) => {
            let value = val(row, key);
            if (key === "nameEn") value = language === "fa" ? (val(row, "nameFa") || val(row, "nameEn") || val(row, "nameAr")) : language === "ar" ? (val(row, "nameAr") || val(row, "nameEn") || val(row, "nameFa")) : (val(row, "nameEn") || val(row, "nameFa") || val(row, "nameAr"));
            if (key === "accountType") {
              const raw = val(row, "accountType");
              const keyName = `type_${raw}` as AccountingCopyKey;
              value = ["asset", "liability", "equity", "revenue", "expense"].includes(raw) ? accountingCopy(language, keyName) : raw;
            }
            if (key === "valuationBasis") {
              const raw = val(row, "valuationBasis");
              value = raw === "official_rate" ? t("valuationOfficial") : raw === "historical_carrying" ? t("valuationHistorical") : raw;
            }
            if (key === "reversalOfId" && !value) value = t("noReversal");
            return <td key={key} dir={amountKeys.has(key) || ["entryDate", "entryNumber", "lineId", "partyId", "reversalOfId"].includes(key) ? "ltr" : undefined} className={`max-w-[260px] whitespace-nowrap px-3 py-3 ${amountKeys.has(key) ? "text-end font-mono tabular-nums text-[#263f3b]" : "text-[#4d6158]"}`} title={value || undefined}>{value || "—"}</td>;
          })}</tr>)}</tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => changePage(page - 1)} disabled={page <= 1}>{t("previous")}</Button>
        <span className="px-2 text-xs tabular-nums text-[#687970]">{t("page")} {page} / {maxPage}</span>
        <Button variant="outline" size="sm" onClick={() => changePage(page + 1)} disabled={page >= maxPage}>{t("next")}</Button>
      </div>
    </>}
  </div>;
}

function Metric({ label, value, warning = false }: { label: string; value: string | number | undefined; warning?: boolean }) {
  return <div className={`min-w-0 rounded-lg border px-3 py-2.5 ${warning ? "border-[#e6d9c4] bg-[#f8f1e5]" : "border-[#e3e9e1] bg-[#f7f9f5]"}`}>
    <div className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#7b887f]">{label}</div>
    <div dir="auto" className={`mt-1 truncate text-sm font-semibold ${warning ? "text-[#806844]" : "text-[#344a44]"}`}>{value ?? "—"}</div>
  </div>;
}
function Coverage({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return <div className={`rounded-lg border px-3 py-2 text-xs ${ready ? "border-[#dce7dc] bg-[#f0f5ef] text-[#526b55]" : "border-[#e6d9c4] bg-[#f8f1e5] text-[#806844]"}`}><span className="font-semibold">{label}:</span> {value}</div>;
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-6 py-8 text-center">
    <BookOpenCheck className="mb-3 h-5 w-5 text-[#547267]" />
    <p className="text-sm font-semibold text-[#344a44]">{title}</p>
    <p className="mt-1 max-w-md text-xs leading-5 text-[#7b887f]">{detail}</p>
  </div>;
}