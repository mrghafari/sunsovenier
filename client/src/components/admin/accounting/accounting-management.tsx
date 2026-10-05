import { useEffect, useMemo, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { accountingSettingsSchemas, type AccountingResource, type AccountingRow } from "@shared/accounting-api";
import { accountingRecordId, accountingViewerCapabilities, postingKeyLabel, sanitizeAccountingRecord, accountingName, accountingCurrencyName, normalizeAccountingDigits } from "./accounting-logic";
import {
  useAccountingBootstrap, useAccountingResource, useSaveAccountingResource, useSeedAccounting,
} from "@/lib/accounting-api";
import { accountingCopy, type AccountingCopyKey } from "@/lib/accounting-copy";
import AccountingReports from "./accounting-reports";
import AccountingReceipts from "./accounting-receipts";
import AccountingDocuments from "./accounting-documents";
import AccountingCredit, {creditCopy} from "./accounting-credit";
import AccountingInventoryDocuments from "./accounting-inventory-documents";
import AccountingInventoryFifo from "./accounting-inventory-fifo";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle, ArrowDownLeft, ArrowUpRight, BookOpenCheck, Building2, Check, ChevronDown,
  CircleDollarSign, Landmark, LoaderCircle, Plus, RefreshCw, Search, Settings2, ShieldCheck,
  SlidersHorizontal, WalletCards,
} from "lucide-react";

type FieldSpec = {
  key: string;
  kind?: "text" | "number" | "decimal" | "date" | "select" | "boolean" | "fixed" | "account" | "center";
  options?: { value: string; label: string }[];
  placeholder?: string;
};

const resources: { id: AccountingResource; icon: typeof Building2; step: 1 | 2 }[] = [
  { id: "companies", icon: Building2, step: 1 },
  { id: "currencies", icon: CircleDollarSign, step: 2 },
  { id: "accounts", icon: BookOpenCheck, step: 2 },
  { id: "cost-centers", icon: Landmark, step: 2 },
  { id: "fiscal-years", icon: ArrowUpRight, step: 2 },
  { id: "posting-rules", icon: SlidersHorizontal, step: 2 },
  { id: "exchange-rates", icon: ArrowDownLeft, step: 2 },
  { id: "tax-rules", icon: WalletCards, step: 2 },
  { id: "settings", icon: Settings2, step: 2 },
];
const resourceCopy: Record<AccountingResource, AccountingCopyKey> = {
  companies: "resource_companies", currencies: "resource_currencies", accounts: "resource_accounts",
  "cost-centers": "resource_cost_centers", "fiscal-years": "resource_fiscal_years",
  "posting-rules": "resource_posting_rules", "exchange-rates": "resource_exchange_rates",
  "tax-rules": "resource_tax_rules", settings: "resource_settings",
};
const asText = (row: AccountingRow, key: string) => row[key] === null || row[key] === undefined ? "" : String(row[key]);
const rowId = (row: AccountingRow) => Number(row.id);

function defaultsFor(resource: AccountingResource, companyId: number | undefined,language:string,companyCountry:string): Record<string, unknown> {
  const company = companyId ?? null;
  switch (resource) {
    case "companies": return { name: "", countryCode: language==="fa"?"IR":"IQ", timezone: language==="fa"?"Asia/Tehran":"Asia/Baghdad", baseCurrency: language==="fa"?"IRR":"IQD", isActive: true };
    case "currencies": return { code: "", name: "", decimals: 3, isActive: true };
    case "accounts": return { companyId: company, code: "", nameFa:"", nameAr: "", nameEn: "", type: "asset", parentId: null, isPosting: true, isActive: true };
    case "cost-centers": return { companyId: company, code: "", nameFa:"", nameAr: "", nameEn: "", isActive: true };
    case "fiscal-years": return { companyId: company, name: "", startsOn: "", endsOn: "", status: "open" };
    case "posting-rules": return { companyId: company, key: "", accountId: null };
    case "exchange-rates": return { companyId: company, currency: "USD", effectiveOn: "", rate: "", source: "central_bank", reference: "" };
    case "tax-rules": return { companyId: company, countryCode: companyCountry, productGroup: "", ratePercent: "", validFrom: "", validTo: null, isActive: true };
    case "settings": return { companyId: company, weightTolerancePercent: "0", fleetRate: "0", fleetRateBasis: "per_ton", fleetCostCenterId: null };
  }
}

export default function AccountingManagement() {
  const { language, direction } = useLanguage();
  const txt = (key: AccountingCopyKey) => accountingCopy(language, key);
  const bootstrap = useAccountingBootstrap();
  const companiesQuery = useAccountingResource("companies");
  const currenciesQuery = useAccountingResource("currencies");
  const [companyId, setCompanyId] = useState<number | undefined>();
  const accountsQuery = useAccountingResource("accounts", companyId);
  const centersQuery = useAccountingResource("cost-centers", companyId);
  const fiscalQuery = useAccountingResource("fiscal-years", companyId);
  const postingQuery = useAccountingResource("posting-rules", companyId);
  const ratesQuery = useAccountingResource("exchange-rates", companyId);
  const taxesQuery = useAccountingResource("tax-rules", companyId);
  const settingsQuery = useAccountingResource("settings", companyId);
  const saveCompanies = useSaveAccountingResource("companies");
  const saveCurrencies = useSaveAccountingResource("currencies");
  const saveAccounts = useSaveAccountingResource("accounts");
  const saveCenters = useSaveAccountingResource("cost-centers");
  const saveFiscal = useSaveAccountingResource("fiscal-years");
  const savePosting = useSaveAccountingResource("posting-rules");
  const saveRates = useSaveAccountingResource("exchange-rates");
  const saveTaxes = useSaveAccountingResource("tax-rules");
  const saveSettings = useSaveAccountingResource("settings");
  const seedMutation = useSeedAccounting();
  const [seedCountry,setSeedCountry]=useState<"IR"|"IQ">(language==="fa"?"IR":"IQ");
  const [activeResource, setActiveResource] = useState<AccountingResource>("companies");
  const [activePanel, setActivePanel] = useState<"setup" | "reports" | "receipts" | "documents" | "inventory" | "fifo" | "credit">("setup");
  const [record, setRecord] = useState<AccountingRow | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [serverError, setServerError] = useState("");
  const [seedError, setSeedError] = useState("");
  const [seedDone, setSeedDone] = useState(false);

  const companyRows = (companiesQuery.data ?? bootstrap.data?.companies ?? []) as AccountingRow[];
  const currencyRows = (currenciesQuery.data ?? bootstrap.data?.currencies ?? []) as AccountingRow[];
  useEffect(() => {
    if (companyId === undefined && companyRows.length) setCompanyId(rowId(companyRows[0]));
  }, [companyId, companyRows]);

  const dataByResource: Record<AccountingResource, { data?: AccountingRow[]; isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown }> = {
    companies: companiesQuery, currencies: currenciesQuery, accounts: accountsQuery, "cost-centers": centersQuery,
    "fiscal-years": fiscalQuery, "posting-rules": postingQuery, "exchange-rates": ratesQuery,
    "tax-rules": taxesQuery, settings: settingsQuery,
  };
  const selectedQuery = dataByResource[activeResource];
  const rows = useMemo(() => selectedQuery.data ?? [], [selectedQuery.data]);
  const filteredRows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    if (!q) return rows;
    return rows.filter(row => Object.values(row).some(value => String(value ?? "").toLocaleLowerCase().includes(q)));
  }, [rows, search]);
  const canManage = Boolean(bootstrap.data?.access?.canManage);
  const viewer = accountingViewerCapabilities(canManage);
  const isCompanyScoped = !["companies", "currencies"].includes(activeResource);
  const hasCompany = Boolean(companyId);
  const mutations = {
    companies: saveCompanies, currencies: saveCurrencies, accounts: saveAccounts, "cost-centers": saveCenters,
    "fiscal-years": saveFiscal, "posting-rules": savePosting, "exchange-rates": saveRates,
    "tax-rules": saveTaxes, settings: saveSettings,
  };
  const activeMutation = mutations[activeResource];

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(accountingSettingsSchemas[activeResource]) as Resolver<Record<string, unknown>>,
    defaultValues: defaultsFor(activeResource, companyId,language,String(companyRows.find(row=>rowId(row)===companyId)?.countryCode??"IQ")),
    mode: "onSubmit",
  });
  const { reset } = form;
  useEffect(() => {
    if (dialogOpen) {
      const schemaKeys = Object.keys(accountingSettingsSchemas[activeResource].shape);
      reset(sanitizeAccountingRecord(schemaKeys, defaultsFor(activeResource, companyId,language,String(companyRows.find(row=>rowId(row)===companyId)?.countryCode??"IQ")), record));
    }
  }, [dialogOpen, record, activeResource, reset]);

  const openForm = (row?: AccountingRow) => {
    setServerError("");
    setRecord(row);
    setDialogOpen(true);
  };
  const onSubmit = async (values: Record<string, unknown>) => {
    setServerError("");
    const payload = Object.fromEntries(Object.keys(accountingSettingsSchemas[activeResource].shape).map(key => [key, values[key]]));
    if(["accounts","cost-centers"].includes(activeResource)&&!["nameFa","nameAr","nameEn"].some(key=>String(payload[key]??"").trim())){
      form.setError(language==="fa"?"nameFa":language==="ar"?"nameAr":"nameEn",{type:"manual",message:txt("errorRequired")});
      return;
    }
    if (activeResource === "fiscal-years" && record?.status === "closed" && payload.status === "open") {
      setServerError(txt("closeBlocked"));
      return;
    }
    if (activeResource === "fiscal-years" && payload.status === "closed" && record?.status !== "closed" && !window.confirm(txt("closeConfirm"))) return;
    try {
      const mutate = activeMutation.mutateAsync as (input: { id?: number | string; values: Record<string, unknown> }) => Promise<unknown>;
      await mutate({ id: record ? accountingRecordId(activeResource, record) : undefined, values: payload });
      setDialogOpen(false);
      setRecord(undefined);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : txt("saveError"));
    }
  };
  const onSeed = async () => {
    setSeedError("");
    setSeedDone(false);
    try {
      const result=await seedMutation.mutateAsync(seedCountry);
      setCompanyId(result.companyId);
      setSeedDone(true);
    } catch (error) {
      setSeedError(error instanceof Error ? error.message : txt("seedError"));
    }
  };

  if (bootstrap.isLoading) return <main className="min-h-[100dvh] bg-[#f2f4ef] p-4 md:p-8" dir={direction}><div className="mx-auto max-w-7xl space-y-6"><Skeleton className="h-40 rounded-2xl bg-[#e1e7e0]" /><div className="grid gap-4 md:grid-cols-[260px_1fr]"><Skeleton className="h-[560px] rounded-2xl bg-[#e1e7e0]" /><Skeleton className="h-[560px] rounded-2xl bg-[#e1e7e0]" /></div></div></main>;
  if (bootstrap.isError || !bootstrap.data) return (
    <main className="min-h-[100dvh] bg-[#f2f4ef] p-5 md:p-10" dir={direction}>
      <div className="mx-auto max-w-3xl"><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>{txt("bootstrapError")}</AlertTitle><AlertDescription className="mt-3 flex flex-wrap items-center gap-3"><span>{bootstrap.error instanceof Error ? bootstrap.error.message : txt("resourceError")}</span><Button variant="outline" size="sm" onClick={() => bootstrap.refetch()} data-testid="accounting-bootstrap-retry">{txt("retry")}</Button></AlertDescription></Alert></div>
    </main>
  );

  const fields: Record<AccountingResource, FieldSpec[]> = {
    companies: [
      { key: "name" }, { key: "countryCode", kind: "select",options:[{value:"IR",label:txt("iran")},{value:"IQ",label:txt("iraq")}] }, { key: "timezone", kind: "fixed" },
      { key: "baseCurrency", kind: "select", options: currencyRows.filter(row => row.isActive !== false).map(row => ({ value: asText(row, "code"), label: `${asText(row, "code")} · ${accountingCurrencyName(asText(row,"code"),language,asText(row,"name"))}` })) },
      { key: "isActive", kind: "boolean" },
    ],
    currencies: [{ key: "code" }, { key: "name" }, { key: "decimals", kind: "number" }, { key: "isActive", kind: "boolean" }],
    accounts: [
      { key: "companyId", kind: "select", options: companyRows.map(row => ({ value: asText(row, "id"), label: asText(row, "name") })) },
      { key: "code" }, { key:"nameFa" }, { key: "nameAr" }, { key: "nameEn" },
      { key: "type", kind: "select", options: ["asset", "liability", "equity", "revenue", "expense"].map(value => ({ value, label: txt(`type_${value}` as AccountingCopyKey) })) },
      { key: "parentId", kind: "account" }, { key: "isPosting", kind: "boolean" }, { key: "isActive", kind: "boolean" },
    ],
    "cost-centers": [
      { key: "companyId", kind: "select", options: companyRows.map(row => ({ value: asText(row, "id"), label: asText(row, "name") })) },
      { key: "code" }, { key:"nameFa" }, { key: "nameAr" }, { key: "nameEn" }, { key: "isActive", kind: "boolean" },
    ],
    "fiscal-years": [
      { key: "companyId", kind: "select", options: companyRows.map(row => ({ value: asText(row, "id"), label: asText(row, "name") })) },
      { key: "name" }, { key: "startsOn", kind: "date" }, { key: "endsOn", kind: "date" },
      { key: "status", kind: "select", options: [{ value: "open", label: txt("open") }, { value: "closed", label: txt("closed") }] },
    ],
    "posting-rules": [
      { key: "companyId", kind: "select", options: companyRows.map(row => ({ value: asText(row, "id"), label: asText(row, "name") })) },
      { key: "key", kind: "select", options: bootstrap.data.postingKeys.map(value => ({ value, label: postingKeyLabel(value, language) })) },
      { key: "accountId", kind: "account" },
    ],
    "exchange-rates": [
      { key: "companyId", kind: "select", options: companyRows.map(row => ({ value: asText(row, "id"), label: asText(row, "name") })) },
      { key: "currency", kind: "select", options: currencyRows.filter(row => row.isActive !== false).map(row => ({ value: asText(row, "code"), label: `${asText(row, "code")} · ${accountingCurrencyName(asText(row,"code"),language,asText(row,"name"))}` })) },
      { key: "effectiveOn", kind: "date" }, { key: "rate", kind: "decimal" },
      { key: "source", kind: "fixed" }, { key: "reference", kind: "text" },
    ],
    "tax-rules": [
      { key: "companyId", kind: "select", options: companyRows.map(row => ({ value: asText(row, "id"), label: asText(row, "name") })) },
      { key: "countryCode", kind: "fixed" }, { key: "productGroup" }, { key: "ratePercent", kind: "decimal" },
      { key: "validFrom", kind: "date" }, { key: "validTo", kind: "date" }, { key: "isActive", kind: "boolean" },
    ],
    settings: [
      { key: "companyId", kind: "select", options: companyRows.map(row => ({ value: asText(row, "id"), label: asText(row, "name") })) },
      { key: "weightTolerancePercent", kind: "decimal" }, { key: "fleetRate", kind: "decimal" },
      { key: "fleetRateBasis", kind: "select", options: ["per_ton", "per_km"].map(value => ({ value, label: txt(`basis_${value}` as AccountingCopyKey) })) },
      { key: "fleetCostCenterId", kind: "center" },
    ],
  };
  const formTitle = `${record ? txt(canManage ? "edit" : "view") : txt("create")} · ${txt(resourceCopy[activeResource])}`;
  const activeAccounts = (accountsQuery.data ?? []).filter(row => row.isActive !== false && row.isPosting !== false && Number(row.companyId) === Number(companyId));
  const parentAccounts = (accountsQuery.data ?? []).filter(row => row.isActive !== false && Number(row.companyId) === Number(companyId) && (!record || row.id !== record.id));
  const activeCenters = (centersQuery.data ?? []).filter(row => row.isActive !== false && Number(row.companyId) === Number(companyId));
  const headerError = selectedQuery.isError ? (selectedQuery.error instanceof Error ? selectedQuery.error.message : txt("resourceError")) : "";

  return (
    <main dir={direction} className="min-h-[100dvh] bg-[#f2f4ef] text-[#182c32]">
      <div className="mx-auto max-w-[1480px] px-4 py-5 md:px-8 md:py-9">
        <header className="relative overflow-hidden rounded-[26px] bg-[#16363b] px-6 py-7 text-[#f2f3e9] shadow-[0_20px_55px_-35px_rgba(19,48,53,.7)] md:px-10 md:py-9">
          <div className="absolute -right-10 -top-24 h-64 w-64 rounded-full border border-[#86a397]/20" />
          <div className="absolute -right-2 -top-16 h-48 w-48 rounded-full border border-[#86a397]/20" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.22em] text-[#bbd0bf]"><span className="h-px w-7 bg-[#d6b66e]" />{txt("step")}</div>
              <h1 className="font-display text-3xl font-semibold tracking-[-.035em] md:text-[42px]">{txt("title")}</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#c1d0ca] md:text-base">{txt("subtitle")}</p>
            </div>
      {viewer.canCreate && <div className="flex max-w-md flex-col gap-2 rounded-2xl border border-[#8da89b]/25 bg-[#20454a] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-[#d6b66e]" />{txt("seed")}</div>
              <p className="text-xs leading-5 text-[#c1d0ca]">{txt("seedHelp")}</p>
              <label className="mt-2 flex items-center gap-2 text-xs">{txt("seedCountry")}
                <select aria-label={txt("seedCountry")} value={seedCountry} disabled={seedMutation.isPending} onChange={e=>setSeedCountry(e.target.value as "IR"|"IQ")} className="rounded border border-[#d8e1d8] bg-white px-2 py-1" data-testid="accounting-seed-country">
                  <option value="IR">{txt("iran")} · IRR</option><option value="IQ">{txt("iraq")} · IQD</option>
                </select>
              </label>
              <Button onClick={onSeed} disabled={seedMutation.isPending} className="mt-1 h-9 w-fit bg-[#d6b66e] text-[#263b3a] hover:bg-[#e3c985]" data-testid="accounting-seed">
                {seedMutation.isPending ? <LoaderCircle className="me-2 h-4 w-4 animate-spin" /> : <RefreshCw className="me-2 h-4 w-4" />}
                {seedMutation.isPending ? txt("seeding") : txt("seed")}
              </Button>
            </div>}
          </div>
          {seedError && <p role="alert" className="relative mt-4 rounded-lg bg-[#713d3e] px-3 py-2 text-sm text-white">{seedError}</p>}
          {seedDone && <p role="status" className="relative mt-4 rounded-lg bg-[#2a5d4f] px-3 py-2 text-sm text-white">{txt("seedSuccess")}</p>}
        </header>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div className="flex items-start gap-3 rounded-2xl border border-[#d8dfd7] bg-[#e6ece4] p-4">
            <div className="rounded-xl bg-[#d4e0d4] p-2 text-[#315750]"><Settings2 className="h-4 w-4" /></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#61736a]">{txt("configured")}</p><p className="mt-1 text-xs leading-5 text-[#50625b]">{txt("integrationTitle")}</p></div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-[#e5d9c7] bg-[#f4ead9] p-4">
            <div className="rounded-xl bg-[#e8d4b7] p-2 text-[#735b37]"><CircleDollarSign className="h-4 w-4" /></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#806844]">{txt("posted")}</p><p className="mt-1 text-xs leading-5 text-[#6d5b41]">{txt("postedNote")}</p></div>
          </div>
          <div className="flex items-center rounded-2xl border border-[#e6c8bc] bg-[#f4e1da] px-4 py-3 text-xs leading-5 text-[#79473f] md:max-w-[270px]">{txt("integrationOff")}</div>
        </div>

        {!canManage && <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#e6d8b7] bg-[#f6f0df] px-4 py-3 text-sm text-[#695638]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>{txt("readOnly")}</strong><p className="mt-1 text-xs">{txt("readOnlyHelp")}</p></div></div>}

        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label={txt("title")}>
          <button type="button" role="tab" aria-selected={activePanel === "credit"} onClick={() => setActivePanel("credit")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activePanel === "credit" ? "bg-[#20484a] text-[#f4f2e7]" : "bg-[#e6ece4] text-[#52655b]"}`}>{(creditCopy[language as keyof typeof creditCopy]??creditCopy.en).title}</button>
          <button type="button" role="tab" aria-selected={activePanel === "setup"} onClick={() => setActivePanel("setup")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activePanel === "setup" ? "bg-[#20484a] text-[#f4f2e7]" : "bg-[#e6ece4] text-[#52655b]"}`}>{txt("setupNav")}</button>
          <button type="button" role="tab" aria-selected={activePanel === "reports"} onClick={() => setActivePanel("reports")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activePanel === "reports" ? "bg-[#20484a] text-[#f4f2e7]" : "bg-[#e6ece4] text-[#52655b]"}`}>{txt("reportsNav")}</button>
          <button type="button" role="tab" aria-selected={activePanel === "receipts"} onClick={() => setActivePanel("receipts")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activePanel === "receipts" ? "bg-[#20484a] text-[#f4f2e7]" : "bg-[#e6ece4] text-[#52655b]"}`}>{language === "fa" ? "رسیدها و چک‌ها" : language === "ar" ? "الإيصالات والشيكات" : language === "tr" ? "Tahsilatlar ve çekler" : "Receipts & cheques"}</button>
          <button type="button" role="tab" aria-selected={activePanel === "documents"} onClick={() => setActivePanel("documents")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activePanel === "documents" ? "bg-[#20484a] text-[#f4f2e7]" : "bg-[#e6ece4] text-[#52655b]"}`}>{language === "fa" ? "اسناد دستی و هزینه‌ها" : language === "ar" ? "المستندات اليدوية والمصروفات" : language === "tr" ? "Manuel belgeler ve giderler" : "Manual docs & expenses"}</button>
          <button type="button" role="tab" aria-selected={activePanel === "inventory"} onClick={() => setActivePanel("inventory")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activePanel === "inventory" ? "bg-[#20484a] text-[#f4f2e7]" : "bg-[#e6ece4] text-[#52655b]"}`}>{language === "fa" ? "فاکتور خرید و موجودی افتتاحیه" : language === "ar" ? "فواتير الشراء والمخزون الافتتاحي" : language === "tr" ? "Alış faturaları ve açılış stoku" : "Purchase & opening inventory"}</button>
          <button type="button" role="tab" aria-selected={activePanel === "fifo"} onClick={() => setActivePanel("fifo")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activePanel === "fifo" ? "bg-[#20484a] text-[#f4f2e7]" : "bg-[#e6ece4] text-[#52655b]"}`}>{language === "fa" ? "ردیابی مستند FIFO" : language === "ar" ? "تتبع FIFO المستندي" : language === "tr" ? "FIFO belge izi" : "FIFO documentary trace"}</button>
        </div>
        {activePanel === "credit" ? <div className="mt-5"><AccountingCredit companies={companyRows.map(row => ({ id: rowId(row), name: asText(row, "name") }))} canManage={canManage}/></div> :
         activePanel === "reports" ? <div className="mt-5"><AccountingReports companies={companyRows.map(row => ({ id: rowId(row), name: asText(row, "name") }))} onSetup={() => setActivePanel("setup")} canManage={canManage}/></div> :
         activePanel === "receipts" ? <div className="mt-5"><AccountingReceipts companies={companyRows.map(row => ({ id: rowId(row), name: asText(row, "name") }))} canManage={canManage} onReports={() => setActivePanel("reports")} /></div> :
         activePanel === "documents" ? <div className="mt-5"><AccountingDocuments companies={companyRows.map(row => ({ id: rowId(row), name: asText(row, "name") }))} canManage={canManage} /></div> :
          activePanel === "inventory" ? <div className="mt-5"><AccountingInventoryDocuments companies={companyRows.map(row => ({ id: rowId(row), name: asText(row, "name") }))} canManage={canManage} /></div> :
          activePanel === "fifo" ? <div className="mt-5"><AccountingInventoryFifo companies={companyRows.map(row => ({ id: rowId(row), name: asText(row, "name") }))} /></div> :
        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-[22px] border border-[#dce2db] bg-[#e8ede7] p-3">
            <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[.2em] text-[#718078]">{txt("stepOne")}</p>
            {resources.filter(item => item.step === 1).map(item => {
              const Icon = item.icon;
              return <ResourceNav key={item.id} active={activeResource === item.id} label={txt(resourceCopy[item.id])} icon={<Icon className="h-4 w-4" />} count={dataByResource[item.id].data?.length} onClick={() => { setActiveResource(item.id); setSearch(""); }} />;
            })}
            <p className="px-3 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[.2em] text-[#718078]">{txt("stepTwo")}</p>
            {resources.filter(item => item.step === 2).map(item => {
              const Icon = item.icon;
              return <ResourceNav key={item.id} active={activeResource === item.id} label={txt(resourceCopy[item.id])} icon={<Icon className="h-4 w-4" />} count={dataByResource[item.id].data?.length} onClick={() => { setActiveResource(item.id); setSearch(""); }} />;
            })}
            <div className="mt-5 rounded-xl border border-[#d7dfd8] bg-[#f0f3ef] p-3 text-xs leading-5 text-[#63736a]">{txt("integrationBody")}</div>
          </aside>

          <section className="min-w-0 rounded-[22px] border border-[#dce2db] bg-[#fbfcf8] shadow-[0_14px_45px_-40px_rgba(29,57,50,.65)]">
            <div className="flex flex-col gap-4 border-b border-[#e5e9e2] p-5 md:p-7">
              <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#829087]"><span>{txt(activeResource === "companies" ? "stepOne" : "stepTwo")}</span><span className="h-px w-6 bg-[#d6b66e]" /></div>
                  <h2 className="font-display text-2xl font-semibold tracking-[-.025em]">{txt(resourceCopy[activeResource])}</h2>
                  <p className="mt-1 text-sm text-[#758179]">{txt("integrationBody")}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {isCompanyScoped && <label className="relative min-w-[220px]">
                    <span className="sr-only">{txt("selectCompany")}</span>
                    <select value={companyId ?? ""} onChange={event => setCompanyId(event.target.value ? Number(event.target.value) : undefined)} className="h-10 w-full appearance-none rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 pe-9 text-sm text-[#29423f] outline-none focus:border-[#60877a] focus:ring-2 focus:ring-[#60877a]/15" data-testid="accounting-company-select">
                      <option value="">{txt("selectCompany")}</option>{companyRows.map(row => <option key={String(row.id)} value={String(row.id)}>{asText(row, "name")}</option>)}
                    </select><ChevronDown className="pointer-events-none absolute end-3 top-3 h-4 w-4 text-[#77867e]" />
                  </label>}
            {viewer.canCreate && <Button onClick={() => openForm()} disabled={isCompanyScoped && !hasCompany} className="h-10 gap-2 bg-[#20484a] text-[#f4f2e7] hover:bg-[#2d5d5c]" data-testid="accounting-add-record"><Plus className="h-4 w-4" />{txt("newRecord")}</Button>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <Badge className="border-0 bg-[#e4eee4] text-[#46674e] hover:bg-[#e4eee4]">{txt("configured")}</Badge>
                <span className="text-[#87918a]">{txt("integrationTitle")}</span>
              </div>
            </div>

            <div className="p-4 md:p-6">
              {headerError && <Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertTitle>{txt("resourceError")}</AlertTitle><AlertDescription className="mt-2 flex flex-wrap items-center gap-3"><span>{headerError}</span><Button variant="outline" size="sm" onClick={() => selectedQuery.refetch()} data-testid="accounting-resource-retry">{txt("retry")}</Button></AlertDescription></Alert>}
              {selectedQuery.isLoading && !selectedQuery.isError ? <div className="space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl bg-[#e8ede7]" />)}</div> :
                (isCompanyScoped && !hasCompany) ? <EmptyState title={txt(companyRows.length ? "selectCompany" : "noCompanies")} description={txt(companyRows.length ? "noCompanySelected" : "noCompanies")} /> :
                headerError ? null :
                <>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="relative w-full max-w-sm"><Search className="absolute start-3 top-2.5 h-4 w-4 text-[#829087]" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder={txt("search")} className="h-9 border-[#dce3db] bg-[#f7f9f5] ps-9 text-sm" data-testid="accounting-search" /></div>
                    <span className="whitespace-nowrap text-xs tabular-nums text-[#758179]">{filteredRows.length}</span>
                  </div>
                  {filteredRows.length === 0 ? <EmptyState title={txt("empty")} description={txt("emptyHelp")} /> :
                    <div className="overflow-x-auto rounded-xl border border-[#e1e7df]">
                      <table className="w-full min-w-[620px] text-start text-sm">
                        <thead className="bg-[#f0f4ee] text-[10px] font-bold uppercase tracking-[.12em] text-[#6e7e74]">
                          <tr><th className="px-4 py-3">{txt("tableCode")}</th><th className="px-4 py-3">{txt("tableName")}</th><th className="px-4 py-3">{txt("tableDetails")}</th><th className="px-4 py-3">{txt("tableStatus")}</th><th className="px-4 py-3">{txt("tableActions")}</th></tr>
                        </thead>
                        <tbody className="divide-y divide-[#e9ede7]">
                          {filteredRows.map((row, index) => <tr key={String(row.id ?? index)} className="transition-colors hover:bg-[#f7f9f5]">
                            <td className="px-4 py-4 font-mono text-xs font-semibold text-[#345b55]">{row.code ? asText(row, "code") : row.key ? asText(row, "key").replaceAll("_", " ") : row.currency ? asText(row, "currency") : row.productGroup ? asText(row, "productGroup") : `#${String(row.id ?? "")}`}</td>
                            <td className="px-4 py-4 font-medium text-[#273d3a]">{displayName(row, activeResource, companyRows, currencyRows, language)}</td>
                            <td className="max-w-[340px] px-4 py-4 text-xs leading-5 text-[#6b7970]">{detailsFor(row, activeResource, txt)}</td>
                            <td className="px-4 py-4"><StatusPill row={row} resource={activeResource} txt={txt} /></td>
                            <td className="px-4 py-4"><Button variant="outline" size="sm" onClick={() => openForm(row)} className="h-8 border-[#d9e1d8] bg-[#fbfcf8] text-xs text-[#365750] hover:bg-[#e9f0e9]" data-testid={`accounting-${viewer.rowAction}-${String(accountingRecordId(activeResource, row))}`}>{txt(viewer.rowAction)}</Button></td>
                          </tr>)}
                        </tbody>
                      </table>
                    </div>}
                </>}
            </div>
          </section>
        </div>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) { setServerError(""); setRecord(undefined); } }}>
        <DialogContent dir={direction} className="max-h-[92dvh] max-w-2xl overflow-y-auto border-[#dce3db] bg-[#fbfcf8] p-0 text-[#203735]">
          <div className="border-b border-[#e3e8e1] bg-[#f0f4ee] px-6 py-5">
            <DialogHeader><DialogTitle className="font-display text-xl">{formTitle}</DialogTitle><DialogDescription className="text-[#718077]">{txt("integrationBody")}</DialogDescription></DialogHeader>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 px-6 py-5">
            {activeResource === "exchange-rates" && <div className="flex items-start gap-3 rounded-xl border border-[#e9ddc7] bg-[#f7f0e2] p-3 text-sm text-[#755e39]"><Landmark className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>{txt("officialRate")}</strong><p className="mt-1 text-xs">{txt("rateReferenceHelp")}</p></div></div>}
            {activeResource === "fiscal-years" && <div className="rounded-xl border border-[#e6dfca] bg-[#f5f1e5] p-3 text-xs leading-5 text-[#6e6243]">{txt("closeConfirm")}</div>}
            {fields[activeResource].map(spec => <FormField
              key={spec.key} spec={spec} resource={activeResource} form={form} txt={txt}
              accountOptions={spec.key === "parentId" ? parentAccounts : activeAccounts}
              centerOptions={activeCenters}
              onCompanyChange={value => { if (spec.key === "companyId") setCompanyId(Number(value)); }} language={language}
              disabled={viewer.fieldsDisabled || Boolean(record && spec.key === "companyId") || (activeResource === "fiscal-years" && record?.status === "closed" && spec.key === "status")}
            />)}
            {serverError && <div role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-sm text-[#883f37]">{serverError}</div>}
            {Object.keys(form.formState.errors).length > 0 && <div role="alert" className="text-xs font-medium text-[#9b493d]">{txt("validationTitle")}</div>}
            <div className="flex justify-end gap-2 border-t border-[#e5e9e2] pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-[#d6dfd6]">{txt("cancel")}</Button>
              {viewer.showSave && <Button type="submit" disabled={activeMutation.isPending} className="min-w-28 bg-[#20484a] text-white hover:bg-[#2d5d5c]" data-testid="accounting-save">
                {activeMutation.isPending ? <LoaderCircle className="me-2 h-4 w-4 animate-spin" /> : <Check className="me-2 h-4 w-4" />}{txt("save")}
              </Button>}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ResourceNav({ active, label, icon, count, onClick }: { active: boolean; label: string; icon: ReactNode; count?: number; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm transition-colors ${active ? "bg-[#20484a] font-semibold text-[#f3f2e9] shadow-sm" : "text-[#52655b] hover:bg-[#dce6dc]"}`}>
    <span className={active ? "text-[#d6b66e]" : "text-[#829087]"}>{icon}</span><span className="flex-1">{label}</span>{count !== undefined && <span className={`font-mono text-[10px] ${active ? "text-[#c9d5c9]" : "text-[#8d9a91]"}`}>{count}</span>}
  </button>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-[#d7e0d7] bg-[#f7f9f5] px-6 py-8 text-center">
    <div className="mb-3 rounded-2xl bg-[#e7eee6] p-3 text-[#547267]"><BookOpenCheck className="h-5 w-5" /></div>
    <p className="text-sm font-semibold text-[#344a44]">{title}</p><p className="mt-1 max-w-md text-xs leading-5 text-[#7b887f]">{description}</p>
  </div>;
}

function StatusPill({ row, resource, txt }: { row: AccountingRow; resource: AccountingResource; txt: (key: AccountingCopyKey) => string }) {
  const status = asText(row, "status");
  if (resource === "fiscal-years") return <Badge className={`border-0 ${status === "closed" ? "bg-[#eee6d6] text-[#735d37]" : "bg-[#e0eee2] text-[#426a4e]"}`}>{status === "closed" ? txt("closed") : txt("open")}</Badge>;
  if (row.isActive !== undefined) return <Badge className={`border-0 ${row.isActive ? "bg-[#e0eee2] text-[#426a4e]" : "bg-[#f1e7e3] text-[#85554b]"}`}>{row.isActive ? txt("active") : txt("inactive")}</Badge>;
  return <span className="text-xs text-[#829087]">—</span>;
}

function displayName(row: AccountingRow, resource: AccountingResource, companies: AccountingRow[], currencies: AccountingRow[], language: string) {
  if (resource === "accounts" || resource === "cost-centers") {
    return accountingName(row,language);
  }
  if (resource==="currencies")return accountingCurrencyName(asText(row,"code"),language,asText(row,"name"));
  if (resource === "companies" || resource === "fiscal-years") return asText(row, "name");
  if (resource === "exchange-rates") return accountingCurrencyName(asText(row,"currency"),language,String(currencies.find(item=>item.code===row.currency)?.name??row.currency));
  if (resource === "posting-rules") return postingKeyLabel(asText(row, "key"), language);
  if (resource === "tax-rules") return asText(row, "productGroup");
  return companies.find(item => Number(item.id) === Number(row.companyId))?.name as string ?? `#${String(row.companyId ?? "")}`;
}
function detailsFor(row: AccountingRow, resource: AccountingResource, txt: (key: AccountingCopyKey) => string) {
  if (resource === "accounts") return `${txt(`type_${asText(row, "type")}` as AccountingCopyKey)} · ${row.isPosting ? txt("yes") : txt("no")}`;
  if (resource === "cost-centers") return asText(row, "code");
  if (resource === "companies") return `${asText(row, "countryCode")} · ${asText(row, "baseCurrency")}`;
  if (resource === "currencies") return `${asText(row, "decimals")} ${txt("decimals")}`;
  if (resource === "fiscal-years") return `${asText(row, "startsOn")} — ${asText(row, "endsOn")}`;
  if (resource === "exchange-rates") return `${asText(row, "rate")} ${asText(row, "currency")} · ${asText(row, "effectiveOn")}`;
  if (resource === "tax-rules") return `${asText(row, "ratePercent")}% · ${asText(row, "validFrom")}`;
  if (resource === "posting-rules") return `${txt("account")} ${asText(row, "accountId")}`;
  if (resource === "settings") return `${asText(row, "fleetRate")} · ${txt(`basis_${asText(row, "fleetRateBasis")}` as AccountingCopyKey)}`;
  return "";
}

function FormField({
  spec, resource, form, txt, accountOptions, centerOptions, disabled, onCompanyChange, language,
}: {
  spec: FieldSpec; resource: AccountingResource; form: ReturnType<typeof useForm<Record<string, unknown>>>;
  txt: (key: AccountingCopyKey) => string; accountOptions: AccountingRow[]; centerOptions: AccountingRow[];
  disabled: boolean; onCompanyChange: (value: string) => void; language: string;
}) {
  const { register, formState: { errors }, setValue, watch } = form;
  const name = spec.key;
  const error = (errors as Record<string, { message?: string }>)[name];
  const label = txt(name as AccountingCopyKey);
  const commonLabel = <Label htmlFor={`accounting-${name}`} className="text-xs font-semibold text-[#53665d]">{label}</Label>;
  const fieldError = error ? <span className="mt-1 block text-xs text-[#a2473c]">{txt("errorInvalid")}</span> : null;
  const currentCompany = Number(watch("companyId") ?? 0);
  const fixedValue = name === "countryCode" ? String(watch("countryCode")??"IQ") : name === "timezone" ? watch("countryCode")==="IR"?"Asia/Tehran":"Asia/Baghdad" : name === "source" ? "central_bank" : "IQ";
  useEffect(() => {
    if (spec.kind === "fixed") setValue(name, fixedValue, { shouldValidate: false });
  }, [fixedValue, name, setValue, spec.kind]);
  let controlView: ReactNode;

  if (spec.kind === "boolean") {
    controlView = <select id={`accounting-${name}`} disabled={disabled} value={watch(name) === false ? "false" : "true"} onChange={event => setValue(name, event.target.value === "true", { shouldValidate: true })} className="h-10 w-full rounded-lg border border-[#d8e1d8] bg-white px-3 text-sm outline-none focus:border-[#6a8e7d] disabled:bg-[#f0f2ee]" data-testid={`accounting-field-${name}`}>
      <option value="true">{txt("yes")}</option><option value="false">{txt("no")}</option>
    </select>;
  } else if (spec.kind === "select" || spec.kind === "account" || spec.kind === "center") {
    let options = spec.options ?? [];
    let nullable = false;
    if (spec.kind === "account") {
    options = accountOptions.filter(row => Number(row.companyId) === currentCompany).map(row => ({ value: asText(row, "id"), label: `${asText(row, "code")} · ${accountingName(row,language)}` }));
      nullable = name === "parentId";
    }
    if (spec.kind === "center") {
      options = centerOptions.filter(row => Number(row.companyId) === currentCompany).map(row => ({ value: asText(row, "id"), label: `${asText(row, "code")} · ${accountingName(row,language)}` }));
      nullable = true;
    }
    if ((spec.kind === "account" && options.length === 0 && !nullable) || (spec.kind === "center" && options.length === 0 && !nullable)) {
      const emptyMessage = spec.kind === "center" ? txt("noActiveCenters") : txt("noneActiveAccounts");
      controlView = <><select id={`accounting-${name}`} disabled className="h-10 w-full rounded-lg border border-[#d8e1d8] bg-[#f0f2ee] px-3 text-sm text-[#7b887f]"><option>{emptyMessage}</option></select><span className="mt-1 block text-xs text-[#a2473c]">{emptyMessage}</span></>;
    } else {
      controlView = <select id={`accounting-${name}`} disabled={disabled} value={String(watch(name) ?? "")} onChange={event => {
        const value = event.target.value;
        if (name === "companyId") { setValue(name, value ? Number(value) : null, { shouldValidate: true }); onCompanyChange(value); }
        else if (name === "accountId" || name === "parentId" || name === "fleetCostCenterId") setValue(name, value ? Number(value) : null, { shouldValidate: true });
        else setValue(name, value, { shouldValidate: true });
      }} className="h-10 w-full rounded-lg border border-[#d8e1d8] bg-white px-3 text-sm outline-none focus:border-[#6a8e7d] disabled:bg-[#f0f2ee]" data-testid={`accounting-field-${name}`}>
        <option value="">{txt(nullable ? "none" : "select")}</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>;
    }
  } else if (spec.kind === "fixed") {
    controlView = <Input id={`accounting-${name}`} value={name === "source" ? txt("source_central_bank") : fixedValue} readOnly className="border-[#d8e1d8] bg-[#f0f2ee] text-[#687970]" data-testid={`accounting-field-${name}`} />;
  } else {
    const date = spec.kind === "date";
    const numeric = spec.kind === "number";
    const nullableDate = name === "validTo";
    const inputProps = {
      id: `accounting-${name}`,
      ...register(name, numeric ? { setValueAs: (value: string) => value === "" ? NaN : Number(normalizeAccountingDigits(value)) } : spec.kind==="decimal"?{setValueAs:(value:string)=>normalizeAccountingDigits(value)}:nullableDate ? { setValueAs: (value: string) => value === "" ? null : value } : {}),
      readOnly: disabled, disabled,
      "data-testid": `accounting-field-${name}`,
    };
    controlView = name === "reference" ? <Textarea {...inputProps} rows={3} className="border-[#d8e1d8] bg-white text-[#29423f] placeholder:text-[#a3ada5] focus-visible:ring-[#6a8e7d]/20 disabled:bg-[#f0f2ee]" /> : <Input
      {...inputProps} type={date ? "date" : numeric ? "number" : "text"}
      inputMode={spec.kind === "decimal" ? "decimal" : undefined}
      step={numeric ? "1" : undefined} min={numeric ? "0" : undefined}
      className="border-[#d8e1d8] bg-white text-[#29423f] placeholder:text-[#a3ada5] focus-visible:ring-[#6a8e7d]/20 disabled:bg-[#f0f2ee]"
    />;
  }

  return <div className="space-y-1.5">{commonLabel}{controlView}{fieldError}</div>;
}