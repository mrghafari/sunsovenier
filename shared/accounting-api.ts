import { z } from "zod";

// Money crosses the API boundary as decimal strings, never JSON numbers.
export const decimalString = z.string().regex(/^(0|[1-9]\d*)(\.\d+)?$/, "Use a non-negative decimal string").max(48);
export const positiveDecimal = decimalString.refine(v => /[1-9]/.test(v), "Must be greater than zero");
export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const date = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === v;
}, "Invalid Gregorian date");
const id = z.number().int().positive();
const code = z.string().trim().min(1).max(40);
const name = z.string().trim().min(1).max(200);
export const currencyCode = z.string().regex(/^[A-Z]{3}$/);
export const POSTING_KEYS = [
  "BANK", "CASH", "CHEQUE_CLEARING", "ACCOUNTS_RECEIVABLE",
  "WALLET_LIABILITY", "SALES_REVENUE", "TAX_PAYABLE", "SHIPPING_REVENUE",
  "SHIPPING_EXPENSE", "CARRIER_PAYABLE", "FLEET_COST_ABSORBED",
  "INVENTORY", "COGS", "BANK_FEES", "FX_GAIN", "FX_LOSS", "OPENING_BALANCE_EQUITY",
] as const;
export type PostingKey = typeof POSTING_KEYS[number];
export const accountTypes = ["asset", "liability", "equity", "revenue", "expense"] as const;
export const accountingSettingsSchemas = {
  companies: z.object({
    name, countryCode: z.literal("IQ"),
    timezone: z.literal("Asia/Baghdad"), baseCurrency: currencyCode.default("IQD"),
    isActive: z.boolean().default(true),
  }).strict(),
  currencies: z.object({ code: currencyCode, name, decimals: z.number().int().min(0).max(8), isActive: z.boolean().default(true) }).strict(),
  accounts: z.object({
    companyId: id, code, nameAr: name, nameEn: name, type: z.enum(accountTypes),
    parentId: id.nullable().default(null), isPosting: z.boolean().default(true), isActive: z.boolean().default(true),
  }).strict(),
  "cost-centers": z.object({ companyId: id, code, nameAr: name, nameEn: name, isActive: z.boolean().default(true) }).strict(),
  "fiscal-years": z.object({ companyId: id, name, startsOn: dateString, endsOn: dateString, status: z.enum(["open", "closed"]).default("open") }).strict(),
  "posting-rules": z.object({ companyId: id, key: z.enum(POSTING_KEYS), accountId: id }).strict(),
  "exchange-rates": z.object({
    companyId: id, currency: currencyCode, effectiveOn: dateString, rate: positiveDecimal,
    source: z.literal("central_bank").default("central_bank"), reference: z.string().trim().min(3).max(1000),
  }).strict(),
  "tax-rules": z.object({
    companyId: id, countryCode: z.literal("IQ"), productGroup: code,
    ratePercent: decimalString, validFrom: dateString, validTo: dateString.nullable().default(null),
    isActive: z.boolean().default(true),
  }).strict(),
  settings: z.object({
    companyId: id, weightTolerancePercent: decimalString,
    fleetRate: decimalString, fleetRateBasis: z.enum(["per_ton", "per_km"]), fleetCostCenterId: id.nullable().default(null),
  }).strict(),
};
export type AccountingResource = keyof typeof accountingSettingsSchemas;
export const accountingResources = Object.keys(accountingSettingsSchemas) as AccountingResource[];
export type AccountingRow = Record<string, string | number | boolean | null>;
export type AccountingAccess = { actorId: number; actorType: "admin" | "custom"; canManage: boolean };
export type AccountingBootstrap = {
  access: AccountingAccess;
  companies: AccountingRow[];
  currencies: AccountingRow[];
  resources: AccountingResource[];
  postingKeys: readonly PostingKey[];
  integrationEnabled: false;
};