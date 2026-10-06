import { useState } from "react";
import type { AccountingReportFilters } from "@shared/accounting-reports";
import type { AccountingCostReport, CostCenterReportRow } from "@shared/accounting-cost-reports";
import type { Language } from "@/lib/i18n";
import { useAccountingCostReport, downloadAccountingCostReport } from "@/lib/accounting-cost-reports-api";
import { costReportCopy, type CostReportCopyKey } from "./cost-reports-copy";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowDownToLine, RefreshCw, RotateCw } from "lucide-react";

export function exactAmount(value: string | null | undefined, decimals: number | undefined, language: Language): string {
  if (value == null) return "—";
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return value;
  const [, sign, integer, fraction = ""] = match;
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const precision = decimals == null ? fraction.length : Math.max(0, decimals);
  // PostgreSQL numeric sums include trailing storage-scale zeroes. Remove only
  // insignificant zeroes, never round away an unexpected nonzero precision.
  const displayedPrecision = Math.max(precision, fraction.replace(/0+$/, "").length);
  const decimalPart = displayedPrecision ? `.${fraction.slice(0, displayedPrecision).padEnd(displayedPrecision, "0")}` : "";
  const formatted = `${sign}${grouped}${decimalPart}`;
  return language === "fa" ? formatted.replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d.charCodeAt(0) - 48]) : language === "ar" ? formatted.replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d.charCodeAt(0) - 48]) : formatted;
}

function nameFor(row: CostCenterReportRow, language: Language) {
  const names = language === "fa" ? [row.nameFa, row.nameEn, row.nameAr] : language === "ar" ? [row.nameAr, row.nameEn, row.nameFa] : [row.nameEn, row.nameFa, row.nameAr];
  return names.find(name => !!name?.trim()) || row.code || null;
}

function sameFilters(expected: AccountingReportFilters, actual: AccountingReportFilters) {
  const keys = ["companyId", "from", "to", "accountId", "costCenterId", "partyId", "partyType", "entryId", "currency", "page", "pageSize"] as const;
  return keys.every(key => (expected[key] ?? null) === (actual[key] ?? null));
}

export function CostReportResult({ report, language, page, changePage }: {
  report: AccountingCostReport;
  language: Language;
  page: number;
  changePage: (page: number) => void;
}) {
  const t = (key: CostReportCopyKey) => costReportCopy(language, key);
  const decimals = (currency: string) => report.currencies.find(item => item.code === currency)?.decimals;
  const base = report.company.baseCurrency;
  const totalRows = report.pagination.totalRows;
  const maxPage = Math.max(1, Math.ceil(totalRows / report.pagination.pageSize));
  const fleet = report.fleet;
  const narrowed = [
    report.filters.accountId ? "partialAccount" : null,
    report.filters.partyId ? "partialParty" : null,
    report.filters.entryId ? "partialEntry" : null,
    report.filters.currency ? "partialCurrency" : null,
    report.filters.costCenterId && fleet.center && report.filters.costCenterId !== fleet.center.id ? "centerMismatch" : null,
  ].filter((key): key is CostReportCopyKey => !!key);
  const reasonKey: Record<NonNullable<typeof fleet.blockingReason>, CostReportCopyKey> = {
    FLEET_CENTER_REQUIRED: "blockCenter",
    FLEET_MAPPING_REQUIRED: "blockMapping",
    PARTIAL_SCOPE: "blockScope",
    MISPLACED_ABSORPTION: "blockMisplaced",
  };
  const partialScope = !!(report.filters.accountId || report.filters.partyId || report.filters.entryId || report.filters.currency);
  const centerMismatch = !!(report.filters.costCenterId && fleet.center && report.filters.costCenterId !== fleet.center.id);
  const missingCenter = !fleet.center || fleet.blockingReason === "FLEET_CENTER_REQUIRED";
  const missingMapping = fleet.blockingReason === "FLEET_MAPPING_REQUIRED" || fleet.absorbedAccountId == null || fleet.shippingExpenseAccountId == null;
  const misplacedAbsorption = fleet.blockingReason === "MISPLACED_ABSORPTION" || fleet.misplacedAbsorptionLineCount > 0;
  const blocked = !fleet.available || partialScope || centerMismatch || missingCenter || missingMapping || misplacedAbsorption;
  const reasons = blocked ? [...new Set([
    ...(fleet.blockingReason ? [reasonKey[fleet.blockingReason]] : []),
    ...(partialScope ? narrowed.filter(key => key !== "centerMismatch") : []),
    ...(centerMismatch ? ["centerMismatch" as const] : []),
    ...(misplacedAbsorption && fleet.blockingReason !== "MISPLACED_ABSORPTION" ? ["blockMisplaced" as const] : []),
    ...(missingCenter && fleet.blockingReason !== "FLEET_CENTER_REQUIRED" ? ["blockCenter" as const] : []),
    ...(missingMapping && fleet.blockingReason !== "FLEET_MAPPING_REQUIRED" ? ["blockMapping" as const] : []),
  ])] : [];
  const amounts = fleet.amounts;
  const variance = amounts?.varianceBase ?? null;
  const varianceTone = variance == null ? "text-[#7a8179]" : variance.startsWith("-") && !/^-(?:0+(?:\.0*)?)$/.test(variance) ? "text-[#963f32]" : /^-?0+(?:\.0*)?$/.test(variance) ? "text-[#496b57]" : "text-[#9a6530]";
  const varianceStatus = variance == null ? t("unavailable") : /^-?0+(?:\.0*)?$/.test(variance) ? t("zero") : variance.startsWith("-") ? t("overState") : t("underState");

  return <div dir={language === "fa" || language === "ar" ? "rtl" : "ltr"} className="space-y-5">
    <section className="rounded-2xl border border-[#dce4dc] bg-[#f5f8f3] p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#77877a]">{report.company.name} · {t("baseCurrency")} {base}</p><h3 className="mt-1 font-display text-xl font-semibold text-[#294540]">{t("totals")}</h3></div>
        <span className="rounded-full border border-[#dce6dc] bg-[#edf3ec] px-3 py-1 text-xs text-[#526c5c]">{t("decimalsNote")}</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={`${t("actualCost")} · ${base}`} value={exactAmount(report.totals.actualCostBase, decimals(base), language)} />
        <Metric label={`${t("allocation")} · ${base}`} value={exactAmount(report.totals.allocationChargeBase, decimals(base), language)} />
        <Metric label={`${t("absorbed")} · ${base}`} value={exactAmount(report.totals.absorbedBase, decimals(base), language)} />
        <Metric label={`${t("netExpense")} · ${base}`} value={exactAmount(report.totals.netExpenseBase, decimals(base), language)} strong />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#6d7c71]">
        <span>{t("unassignedActual")}: <b dir="ltr" className="font-mono tabular-nums text-[#344a44]">{exactAmount(report.totals.unassignedActualCostBase, decimals(base), language)}</b></span>
        <span>{t("unassignedLines")}: <b className="font-mono tabular-nums text-[#344a44]">{report.totals.unassignedLineCount}</b></span>
      </div>
      <p className="mt-3 border-t border-[#e3e9e1] pt-3 text-xs leading-5 text-[#687970]">{t("formulaNote")} {t("noFleetInference")}</p>
      {report.coverage.expenseLineCount === 0 && <p className="mt-2 rounded-lg border border-[#e6d9c4] bg-[#f8f1e5] px-3 py-2 text-xs leading-5 text-[#806844]">{t("emptyCoverage")}</p>}
    </section>

    <section className="overflow-hidden rounded-2xl border border-[#dce4dc] bg-[#fbfcf8]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5eae3] px-4 py-4 md:px-5">
        <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#829087]">{report.company.name}</p><h3 className="font-display text-lg font-semibold text-[#294540]">{t("center")}</h3></div>
        <span className="text-xs text-[#7a887d]">{t("page")} {page} {t("of")} {maxPage} · {totalRows} {t("rows")}</span>
      </div>
      {report.rows.length === 0 ? <Empty title={t("noRows")} detail={t("noRowsHelp")} /> : <div className="overflow-x-auto">
        <table className="w-full min-w-[1060px] text-start text-xs">
          <thead className="bg-[#eff4ee] text-[10px] font-bold uppercase tracking-[.08em] text-[#6d7c71]"><tr>
            {[t("center"), t("lines"), `${t("actualCost")} · ${base}`, `${t("allocation")} · ${base}`, `${t("absorbed")} · ${base}`, `${t("netExpense")} · ${base}`, `${t("nativeDebit")}`, `${t("nativeCredit")}`, `${t("nativeNet")}`].map((label, i) => <th key={`${label}-${i}`} className={`whitespace-nowrap px-3 py-3 ${i > 0 ? "text-end" : "text-start"}`}>{label}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-[#e8ede6]">{report.rows.map((row, i) => {
            const currencyDecimals = decimals(row.currency);
            return <tr key={`${row.costCenterId ?? "unassigned"}-${row.currency}-${i}`} className="hover:bg-[#f5f8f3]">
              <td className="max-w-[260px] px-3 py-3"><div className="font-semibold text-[#344a44]">{row.costCenterId == null ? t("unassigned") : nameFor(row, language) || "—"}</div>{row.costCenterId != null && <div dir="ltr" className="mt-0.5 font-mono text-[10px] text-[#879289]">{row.code || `#${row.costCenterId}`}</div>}</td>
              <td className="px-3 py-3 text-end font-mono tabular-nums text-[#58685e]">{row.lineCount}</td>
              {[row.actualCostBase, row.allocationChargeBase, row.absorbedBase, row.netExpenseBase].map((value, j) => <td key={j} dir="ltr" className={`px-3 py-3 text-end font-mono tabular-nums ${j === 3 ? "font-semibold text-[#294540]" : "text-[#52635a]"}`}>{exactAmount(value, decimals(base), language)}</td>)}
              {[row.actualNativeDebit, row.actualNativeCredit, row.actualNativeNet].map((value, j) => <td key={j} dir="ltr" className="px-3 py-3 text-end font-mono tabular-nums text-[#52635a]">{exactAmount(value, currencyDecimals, language)} <span className="text-[9px] text-[#869188]">{row.currency}</span></td>)}
            </tr>;
          })}</tbody>
        </table>
      </div>}
      {totalRows > 0 && <div className="flex items-center justify-end gap-2 border-t border-[#e5eae3] px-4 py-3">
        <Button variant="outline" size="sm" onClick={() => changePage(page - 1)} disabled={page <= 1}>{t("previous")}</Button>
        <span className="px-1 text-xs tabular-nums text-[#687970]">{page} / {maxPage}</span>
        <Button variant="outline" size="sm" onClick={() => changePage(page + 1)} disabled={page >= maxPage}>{t("next")}</Button>
      </div>}
    </section>

    <section className={`rounded-2xl border p-4 md:p-5 ${blocked ? "border-[#e5d7c1] bg-[#faf4e9]" : "border-[#dce4dc] bg-[#f5f8f3]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#829087]">{fleet.center ? `${fleet.center.code} · ${fleet.center.id}` : t("fleet")}</div><h3 className="mt-1 font-display text-lg font-semibold text-[#294540]">{t("fleet")}</h3></div>
        {blocked ? <span className="rounded-full bg-[#f2e5ce] px-3 py-1 text-xs font-semibold text-[#846139]">{t("unavailable")}</span> : <span className={`rounded-full px-3 py-1 text-xs font-semibold ${varianceTone} bg-[#edf1e9]`}>{varianceStatus}</span>}
      </div>
      {blocked ? <div className="mt-4 space-y-2" role="status"><p className="text-sm font-semibold text-[#745631]">{t("blocked")}</p>{reasons.map(key => <p key={key} className="flex gap-2 text-xs leading-5 text-[#755e3f]"><span aria-hidden="true" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#af8854]" />{t(key)}</p>)}{fleet.misplacedAbsorptionLineCount > 0 && <p className="text-xs text-[#755e3f]">{t("wrongCenterCount")}: {fleet.misplacedAbsorptionLineCount}</p>}</div> :
        amounts && <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label={`${t("variance")} · ${base}`} value={exactAmount(amounts.varianceBase, decimals(base), language)} valueClass={varianceTone} />
          <Metric label={`${t("under")} · ${base}`} value={exactAmount(amounts.underAbsorbedBase, decimals(base), language)} />
          <Metric label={`${t("over")} · ${base}`} value={exactAmount(amounts.overAbsorbedBase, decimals(base), language)} />
          <Metric label={`${t("netExpense")} · ${base}`} value={exactAmount(amounts.netExpenseBase, decimals(base), language)} />
        </div>}
      {fleet.available && amounts && <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Metric label={`${t("actualCost")} · ${base}`} value={exactAmount(amounts.actualCostBase, decimals(base), language)} />
        <Metric label={`${t("allocation")} · ${base}`} value={exactAmount(amounts.allocationChargeBase, decimals(base), language)} />
        <Metric label={`${t("absorbed")} · ${base}`} value={exactAmount(amounts.absorbedBase, decimals(base), language)} />
      </div>}
      {fleet.available && fleet.misplacedAbsorptionLineCount > 0 && <p className="mt-3 text-xs text-[#8a503b]">{t("wrongCenterCount")}: {fleet.misplacedAbsorptionLineCount}</p>}
    </section>

    <section className="rounded-2xl border border-[#e3e8e1] bg-[#f7f9f5] p-4">
      <h3 className="text-sm font-semibold text-[#344a44]">{t("coverage")}</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Coverage label={t("posted")} value={report.coverage.postedEntryCount} />
        <Coverage label={t("periodEntries")} value={report.coverage.periodEntryCount} />
        <Coverage label={t("expenseLines")} value={report.coverage.expenseLineCount} />
        <Coverage label={t("activationReady")} value={report.coverage.financialCutoversReady ? t("ready") : t("notReady")} warning={!report.coverage.financialCutoversReady} />
      </div>
      <p className="mt-3 text-xs leading-5 text-[#687970]">{t("scopeCoverage")}</p>
      <p className="mt-3 text-xs leading-5 text-[#806844]">{t("legacy")}</p>
      <p className="mt-1 text-xs leading-5 text-[#687970]">{t("mappingWarning")}</p>
      <p className="mt-1 text-xs leading-5 text-[#687970]">{t("historicalSettings")}</p>
      <p className="mt-1 text-xs leading-5 text-[#687970]">{t("reversals")} {t("activationNote")}</p>
    </section>
  </div>;
}

export function AccountingCostReports({ filters, language, isCurrent, onPageChange }: {
  filters?: AccountingReportFilters;
  language: Language;
  isCurrent: boolean;
  onPageChange: (page: number) => void;
}) {
  const t = (key: CostReportCopyKey) => costReportCopy(language, key);
  const query = useAccountingCostReport(isCurrent ? filters : undefined);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const report = query.data;
  const reportMatches = !!filters && !!report && sameFilters(filters, report.filters) && report.company.id === filters.companyId;
  const exportCsv = async () => {
    if (!filters || !isCurrent || !reportMatches) return;
    const scope = Object.fromEntries(Object.entries(filters).filter(([key]) => key !== "page" && key !== "pageSize"));
    setExporting(true);
    setExportError("");
    try {
      await downloadAccountingCostReport(scope as AccountingReportFilters);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : t("exportFailed"));
    } finally {
      setExporting(false);
    }
  };
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="max-w-2xl text-xs leading-5 text-[#748176]">{t("intro")}</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!reportMatches || query.isFetching} onClick={() => query.refetch()} className="border-[#d6dfd6] text-[#365750]"><RotateCw className={`me-2 h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />{t("refresh")}</Button>
        <Button type="button" variant="outline" size="sm" disabled={!reportMatches || exporting} onClick={exportCsv} className="border-[#d6dfd6] text-[#365750]"><ArrowDownToLine className="me-2 h-3.5 w-3.5" />{exporting ? t("exporting") : t("export")}</Button>
      </div>
    </div>
    {exportError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>{t("exportFailed")}</AlertTitle><AlertDescription>{exportError}</AlertDescription></Alert>}
    {!isCurrent ? <Empty title={t("stale")} detail={t("stale")} /> :
      query.isLoading ? <div className="space-y-3" aria-label={t("loading")}>{[0, 1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl bg-[#e8ede7]" />)}</div> :
      query.isError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>{t("failed")}</AlertTitle><AlertDescription className="mt-2 flex flex-wrap items-center gap-3"><span>{query.error instanceof Error ? query.error.message : t("failed")}</span><Button type="button" variant="outline" size="sm" onClick={() => query.refetch()}><RefreshCw className="me-2 h-3.5 w-3.5" />{t("retry")}</Button></AlertDescription></Alert> :
      !reportMatches ? <Empty title={t("stale")} detail={t("stale")} /> :
      <CostReportResult report={report} language={language} page={filters?.page ?? 1} changePage={onPageChange} />}
  </div>;
}

function Metric({ label, value, strong = false, valueClass = "" }: { label: string; value: string; strong?: boolean; valueClass?: string }) {
  return <div className="min-w-0 rounded-xl border border-[#e1e8df] bg-[#fbfcf8] px-3 py-2.5">
    <div className="text-[10px] font-semibold uppercase tracking-[.07em] text-[#7b887f]">{label}</div>
    <div dir="ltr" className={`mt-1 truncate font-mono text-sm tabular-nums ${strong ? "font-bold" : "font-medium"} ${valueClass || "text-[#344a44]"}`}>{value}</div>
  </div>;
}

function Coverage({ label, value, warning = false }: { label: string; value: number | string; warning?: boolean }) {
  return <div className={`rounded-lg border px-3 py-2 text-xs ${warning ? "border-[#e6d9c4] bg-[#f8f1e5] text-[#806844]" : "border-[#dce7dc] bg-[#f0f5ef] text-[#526b55]"}`}><span className="font-semibold">{label}:</span> <b className="font-mono tabular-nums">{value}</b></div>;
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-6 py-7 text-center"><p className="text-sm font-semibold text-[#344a44]">{title}</p><p className="mt-1 max-w-lg text-xs leading-5 text-[#7b887f]">{detail}</p></div>;
}