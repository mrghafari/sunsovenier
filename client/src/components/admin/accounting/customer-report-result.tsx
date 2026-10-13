import type { CustomerAccountingReport, CustomerReportName, CustomerReportRow } from "@shared/accounting-customer-reports";
import type { Language } from "@/lib/i18n";
import { customerReportCopy, type CustomerReportCopyKey } from "./customer-reports-copy";
import { Button } from "@/components/ui/button";
import { BookOpenCheck } from "lucide-react";

const value = (row: CustomerReportRow, key: string) => row[key] ?? "";
const amountFields = new Set([
  "debit", "credit", "baseDebit", "baseCredit", "runningNative", "runningBase",
  "invoiceAmount", "settledAmount", "outstanding", "daysOverdue",
]);

export function CustomerReportResult({ report, data, language, page, changePage }: {
  report: CustomerReportName;
  data: CustomerAccountingReport;
  language: Language;
  page: number;
  changePage: (page: number) => void;
}) {
  const t = (key: CustomerReportCopyKey) => customerReportCopy(language, key);
  const rtl = language === "fa" || language === "ar";
  const maxPage = Math.max(1, Math.ceil(data.pagination.totalRows / data.pagination.pageSize));
  const statement = report === "customer-statement";
  const statementColumns: [string, CustomerReportCopyKey][] = [
    ["entryDate", "date"], ["entryNumber", "entry"], ["lineId", "line"], ["accountCode", "code"], ["nameEn", "name"],
    ["description", "description"], ["lineDescription", "lineDescription"], ["debit", "nativeDebit"],
    ["credit", "nativeCredit"], ["baseDebit", "baseDebit"], ["baseCredit", "baseCredit"],
    ["runningNative", "runningNative"], ["runningBase", "runningBase"], ["currency", "currencyCol"], ["exchangeRate", "rate"],
    ["valuationBasis", "valuation"], ["partyType", "partyType"], ["partyId", "partyId"], ["costCenterCode", "center"],
    ["sourceType", "source"], ["sourceId", "sourceId"], ["reversalOfId", "reversal"],
    ["customerCode", "customerRef"], ["customerName", "customer"],
  ];
  const agingColumns: [string, CustomerReportCopyKey][] = [
    ["kind", "bucket"], ["customerCode", "customerCode"], ["customerName", "customer"],
    ["currency", "currencyCol"], ["invoiceReference", "invoiceReference"], ["invoiceJournalId", "entry"],
    ["issuedOn", "issued"], ["dueOn", "due"], ["daysOverdue", "daysOverdue"], ["bucket", "bucket"],
    ["invoiceAmount", "invoiceAmount"], ["settledAmount", "settled"], ["outstanding", "outstanding"],
  ];
  const columns = statement ? statementColumns : agingColumns;
  const rowLabel = (row: CustomerReportRow) => {
    const kind = value(row, "kind");
    if (kind === "unclassified") return t("unclassified");
    if (kind === "invoice") return t("invoice");
    return kind;
  };
  const bucketLabel = (bucket: string) => ({
    current: t("currentBucket"), "1-30": t("d1Bucket"), "31-60": t("d2Bucket"),
    "61-90": t("d3Bucket"), "over-90": t("overBucket"), unknown: t("unknown"),
    credit: t("creditBucket"),
  }[bucket] ?? bucket);

  return <div dir={rtl ? "rtl" : "ltr"} className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label={t("company")} value={data.company.name} />
      <Metric label={t("customer")} value={data.customer ? `${data.customer.code ? `${data.customer.code} · ` : ""}${data.customer.name}` : "—"} />
      <Metric label={t("customerRef")} value={data.customer?.code ?? "—"} />
      <Metric label={t("companyBase")} value={data.company.baseCurrency} />
      <Metric label={statement ? t("statementPeriod") : t("agingAsOf")} value={statement ? `${data.filters.from ?? "—"} — ${data.filters.to ?? "—"}` : data.filters.asOf ?? "—"} />
    </div>
    <Coverage data={data} language={language} />
    {!data.coverage.legacyOpeningVerified && <Notice tone="amber">{t("legacyWarning")}</Notice>}
    {data.coverage.receivableAccountCount === 0 && <Notice tone="rose">{t("noArWarning")}</Notice>}
    {(!data.coverage.walletCutoverReady || !data.coverage.receiptCutoverReady) && <Notice tone="amber">{t("pipelineWarning")}</Notice>}
    <p className="text-xs leading-5 text-[#718077]">{t("amountScope")}</p>

    {statement ? <section className="rounded-xl border border-[#e2e7df] bg-[#f6f8f4] p-4">
      <h3 className="text-sm font-semibold text-[#344a44]">{t("balances")}</h3>
      {data.balances.length === 0 ? <p className="mt-3 text-xs text-[#7b887f]">{t("emptyHelp")}</p> :
        <div className="mt-3 grid gap-3 xl:grid-cols-2">{data.balances.map(balance => <div key={balance.currency} className="rounded-lg border border-[#e3e9e1] bg-[#fbfcf8] p-3">
          <div className="mb-2 flex items-center justify-between gap-2"><strong className="font-mono text-xs text-[#365750]">{balance.currency}</strong><span className="text-[10px] font-semibold uppercase tracking-wide text-[#7b887f]">{t("opening")} → {t("closing")}</span></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label={t("opening")} value={balance.opening} />
            <Metric label={t("debit")} value={balance.periodDebit} />
            <Metric label={t("credit")} value={balance.periodCredit} />
            <Metric label={t("closing")} value={balance.closing} />
          </div>
          <div className="mt-3 border-t border-[#e7ebe4] pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#7b887f]">{t("companyBase")} · {data.company.baseCurrency} ({t("historicalBase")})</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label={`${t("openingBase")} · ${data.company.baseCurrency}`} value={balance.openingBase} />
              <Metric label={`${t("debitBase")} · ${data.company.baseCurrency}`} value={balance.periodBaseDebit} />
              <Metric label={`${t("creditBase")} · ${data.company.baseCurrency}`} value={balance.periodBaseCredit} />
              <Metric label={`${t("closingBase")} · ${data.company.baseCurrency}`} value={balance.closingBase} />
            </div>
          </div>
        </div>)}</div>}
      <p className="mt-3 text-xs leading-5 text-[#806844]">{t("historicalBase")}</p>
    </section> : <section className="rounded-xl border border-[#e2e7df] bg-[#f6f8f4] p-4">
      <h3 className="text-sm font-semibold text-[#344a44]">{t("agingSummary")}</h3>
      {data.agingSummaries.length === 0 ? <p className="mt-3 text-xs text-[#7b887f]">{t("emptyHelp")}</p> :
        <div className="mt-3 space-y-3">{data.agingSummaries.map(summary => <div key={summary.currency} className="rounded-lg border border-[#e3e9e1] bg-[#fbfcf8] p-3">
          <div className="mb-2 font-mono text-xs font-bold text-[#365750]">{summary.currency}</div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {([
              ["current", summary.current], ["d1_30", summary.days1to30], ["d31_60", summary.days31to60],
              ["d61_90", summary.days61to90], ["over90", summary.over90], ["tracked", summary.trackedOutstanding],
              ["unclassifiedDebit", summary.unclassifiedDebit], ["unclassifiedCredit", summary.unclassifiedCredit],
              ["ledgerClosing", summary.ledgerClosing],
            ] as [CustomerReportCopyKey, string][]).map(([label, amount]) => <Metric key={label} label={`${t(label)} · ${summary.currency}`} value={amount} warning={label === "unclassifiedDebit" || label === "unclassifiedCredit"} />)}
          </div>
        </div>)}</div>}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Notice tone="amber">{t("unknownNote")}</Notice>
        <Notice tone="amber">{t("creditNote")}</Notice>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#806844]">{t("historicalBase")}</p>
    </section>}

    {data.pagination.totalRows === 0 ? <Empty title={t("empty")} detail={t("emptyHelp")} /> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#687970]">
        <span>{data.pagination.totalRows} {t("rows")} · {t("page")} {page} {t("of")} {maxPage}</span>
        {!statement && <span>{t("unknownNote")}</span>}
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#e1e7df]">
        <table className="w-full min-w-[1100px] text-start text-xs">
          <thead className="bg-[#f0f4ee] text-[10px] font-bold uppercase tracking-[.08em] text-[#6e7e74]"><tr>
            {columns.map(([key, label]) => <th key={key} className="whitespace-nowrap px-3 py-3 text-start">{t(label)}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-[#e9ede7]">{data.rows.map((row, index) => <tr key={`${value(row, "lineId") || value(row, "receivableId")}-${index}`} className="align-top hover:bg-[#f7f9f5]">
            {columns.map(([key]) => {
              let cell = value(row, key);
              if (key === "kind") cell = rowLabel(row);
              if (key === "bucket") cell = bucketLabel(value(row, "bucket"));
              if (key === "nameEn") cell = language === "fa"
                ? value(row, "nameFa") || value(row, "nameEn") || value(row, "nameAr")
                : language === "ar" ? value(row, "nameAr") || value(row, "nameEn") || value(row, "nameFa")
                  : value(row, "nameEn") || value(row, "nameFa") || value(row, "nameAr");
              if (key === "valuationBasis") {
                const valuation = value(row, key);
                cell = valuation === "official_rate" ? t("valuationOfficial") : valuation === "historical_carrying" ? t("valuationHistorical") : valuation;
              }
              if (key === "reversalOfId" && !cell) cell = t("noReversal");
              if (!cell) cell = "—";
              const credit = value(row, "bucket") === "credit" || (value(row, "kind") === "unclassified" && key === "outstanding" && cell.startsWith("-"));
              return <td key={key} dir={amountFields.has(key) || ["entryDate", "entryNumber", "lineId", "invoiceJournalId", "issuedOn", "dueOn", "customerId", "partyId", "sourceId", "reversalOfId"].includes(key) ? "ltr" : undefined}
                className={`max-w-[280px] whitespace-nowrap px-3 py-3 ${amountFields.has(key) ? `text-end font-mono tabular-nums ${credit ? "text-[#9a594d]" : "text-[#263f3b]"}` : "text-[#4d6158]"}`}
                title={cell}>{cell}</td>;
            })}
          </tr>)}</tbody>
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

function Coverage({ data, language }: { data: CustomerAccountingReport; language: Language }) {
  const t = (key: CustomerReportCopyKey) => customerReportCopy(language, key);
  const items: [string, string, boolean][] = [
    [t("postedEntries"), String(data.coverage.postedEntryCount), data.coverage.postedEntryCount > 0],
    [t("arAccounts"), String(data.coverage.receivableAccountCount), data.coverage.receivableAccountCount > 0],
    [t("legacy"), t("notVerified"), false],
    [t("wallet"), data.coverage.walletCutoverReady ? t("ready") : t("notReady"), data.coverage.walletCutoverReady],
    [t("receipt"), data.coverage.receiptCutoverReady ? t("ready") : t("notReady"), data.coverage.receiptCutoverReady],
  ];
  return <section className="rounded-xl border border-[#e2e7df] bg-[#f6f8f4] p-4">
    <h3 className="mb-3 text-sm font-semibold text-[#344a44]">{t("coverage")}</h3>
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">{items.map(([label, value, ready]) => <div key={label} className={`rounded-lg border px-3 py-2 text-xs ${ready ? "border-[#dce7dc] bg-[#f0f5ef] text-[#526b55]" : "border-[#e6d9c4] bg-[#f8f1e5] text-[#806844]"}`}><span className="font-semibold">{label}:</span> {value}</div>)}</div>
  </section>;
}

function Notice({ children, tone }: { children: string; tone: "amber" | "rose" }) {
  return <div role="note" className={`rounded-lg border px-3 py-2 text-xs leading-5 ${tone === "rose" ? "border-[#e6c8bc] bg-[#f8ece6] text-[#79473f]" : "border-[#e6d9c4] bg-[#f8f1e5] text-[#806844]"}`}>{children}</div>;
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-6 py-8 text-center">
    <BookOpenCheck className="mb-3 h-5 w-5 text-[#547267]" /><p className="text-sm font-semibold text-[#344a44]">{title}</p>
    <p className="mt-1 max-w-md text-xs leading-5 text-[#7b887f]">{detail}</p>
  </div>;
}