import { and, eq, sql } from "drizzle-orm";
import {
  accountingSettingsSchemas, accountingResources, POSTING_KEYS,
  type AccountingResource, type AccountingAccess, type PostingKey,
} from "@shared/accounting-api";
import { accountingDb } from "./db";
import * as schema from "./schema";
import { AccountingError } from "./access";
import { decimal } from "./money";
import { assertLedgerReady } from "./readiness";

export const tables = {
  companies: schema.accountingCompanies, currencies: schema.accountingCurrencies,
  accounts: schema.accountingAccounts, "cost-centers":schema.accountingCostCenters,
  "fiscal-years":schema.accountingFiscalYears, "posting-rules":schema.accountingPostingRules,
  "exchange-rates":schema.accountingExchangeRates, "tax-rules":schema.accountingTaxRules,
  settings:schema.accountingSettings,
};
export const expectedAccountTypes: Record<PostingKey,string> = {
  BANK:"asset", GATEWAY:"asset", CASH:"asset", CHEQUE_CLEARING:"asset", ACCOUNTS_RECEIVABLE:"asset",
  INVENTORY:"asset", WALLET_LIABILITY:"liability", TAX_PAYABLE:"liability", CARRIER_PAYABLE:"liability",
  SALES_REVENUE:"revenue", SHIPPING_REVENUE:"revenue", FX_GAIN:"revenue",
  SHIPPING_EXPENSE:"expense", FLEET_COST_ABSORBED:"expense", COGS:"expense", BANK_FEES:"expense",
  FX_LOSS:"expense", OPENING_BALANCE_EQUITY:"equity",
};
export function resourceName(value: string): AccountingResource {
  if (!accountingResources.includes(value as AccountingResource)) throw new AccountingError("Unknown accounting resource",404,"NOT_FOUND");
  return value as AccountingResource;
}
export async function listResource(resource: AccountingResource, companyId?: number) {
  // Tables are drawn only from a fixed allowlist, never from user-provided SQL.
  const table = tables[resource];
  if ("companyId" in table) {
    if (!companyId) throw new AccountingError("Select a company",422,"COMPANY_REQUIRED");
    return accountingDb.select().from(table).where(eq(table.companyId,companyId));
  }
  return accountingDb.select().from(table);
}
export async function saveResource(resource: AccountingResource, input: unknown, actor: AccountingAccess, rowId?: number | string) {
  if (!actor.canManage) throw new AccountingError("Finance management permission required",403,"ACCESS_DENIED");
  const parsed = accountingSettingsSchemas[resource].safeParse(input);
  if (!parsed.success) throw new AccountingError(parsed.error.issues.map(i=>`${i.path.join(".")}: ${i.message}`).join("; "));
  const data = parsed.data;
  if ("ratePercent" in data && decimal(data.ratePercent).gt("100")) throw new AccountingError("Tax percentage must be between 0 and 100");
  if ("weightTolerancePercent" in data && decimal(data.weightTolerancePercent).gt("100")) throw new AccountingError("Weight tolerance must be between 0 and 100");
  for (const [key,value] of Object.entries(data)) {
    if (typeof value === "string" && ["rate","ratePercent","weightTolerancePercent","fleetRate"].includes(key)) {
      const allowedScale = key === "rate" ? 12 : 8;
      if ((value.split(".")[1]?.length || 0) > allowedScale || decimal(value).gte(key === "rate" ? "1e26" : key === "fleetRate" ? "1e30" : "1e4")) {
        throw new AccountingError(`Invalid precision for ${key}`);
      }
    }
  }
  return accountingDb.transaction(async tx => {
    // Serializes settings edits and journal postings; guards also enforce this for direct SQL.
    await tx.execute(sql`select pg_advisory_xact_lock(718392, 0)`);
    await assertLedgerReady(tx);
    const table = tables[resource];
    const identity = resource === "currencies" ? schema.accountingCurrencies.code : (table as Exclude<typeof table,typeof schema.accountingCurrencies>).id;
    const [before] = rowId === undefined ? [] : await tx.select().from(table).where(eq(identity,rowId as never)).limit(1);
    if (rowId !== undefined && !before) throw new AccountingError("Record not found",404,"NOT_FOUND");
    if ("companyId" in data && before && "companyId" in before && data.companyId !== before.companyId) throw new AccountingError("A record cannot move between companies");
    if (resource === "currencies" && before && "code" in data && data.code !== rowId) throw new AccountingError("Currency codes cannot be renamed");
    if ("companyId" in data) {
      const [company] = await tx.select().from(schema.accountingCompanies).where(eq(schema.accountingCompanies.id,data.companyId));
      if (!company?.isActive) throw new AccountingError("Active company required");
    }
    if (resource === "companies" && "baseCurrency" in data) {
      const [currency] = await tx.select().from(schema.accountingCurrencies).where(eq(schema.accountingCurrencies.code,data.baseCurrency));
      if (!currency?.isActive) throw new AccountingError("Active base currency required");
    }
    if (resource === "accounts" && "companyId" in data && "parentId" in data && data.parentId) {
      const rows = await tx.select().from(schema.accountingAccounts).where(eq(schema.accountingAccounts.companyId,data.companyId));
      let parent = rows.find(a=>a.id===data.parentId);
      if (!parent || parent.isPosting || !parent.isActive) throw new AccountingError("Parent must be an active non-posting account in the same company");
      const seen = new Set<number>();
      while (parent) {
        if (parent.id===rowId || seen.has(parent.id)) throw new AccountingError("Account hierarchy cannot contain a cycle");
        seen.add(parent.id); parent = rows.find(a=>a.id===parent!.parentId);
      }
    }
    if (resource === "posting-rules" && "accountId" in data) {
      const [account] = await tx.select().from(schema.accountingAccounts).where(eq(schema.accountingAccounts.id,data.accountId));
      if (!account?.isActive || !account.isPosting || account.companyId!==data.companyId || account.type!==expectedAccountTypes[data.key]) {
        throw new AccountingError("Posting rule requires an active posting account of the correct type in the same company");
      }
    }
    if (resource === "settings" && "fleetCostCenterId" in data && data.fleetCostCenterId) {
      const [center] = await tx.select().from(schema.accountingCostCenters).where(eq(schema.accountingCostCenters.id,data.fleetCostCenterId));
      if (!center?.isActive || center.companyId!==data.companyId) throw new AccountingError("Active fleet cost center must belong to this company");
    }
    if (resource === "exchange-rates" && "currency" in data) {
      const [currency] = await tx.select().from(schema.accountingCurrencies).where(eq(schema.accountingCurrencies.code,data.currency));
      if (!currency?.isActive) throw new AccountingError("Active transaction currency required");
    }
    let saved;
    // All fields are strictly parsed and column names come from the schema.
    if (rowId !== undefined) [saved] = await tx.update(table).set(data).where(eq(identity,rowId as never)).returning();
    else [saved] = await tx.insert(table).values(data as never).returning();
    const companyId = "companyId" in data ? data.companyId : resource === "companies" && "id" in saved ? Number(saved.id) : null;
    await tx.insert(schema.accountingAuditLogs).values({companyId,actorId:actor.actorId,actorType:actor.actorType,
      action:before?"update":"create",entityType:resource,entityId:String("id" in saved?saved.id:"code" in saved?saved.code:""),
      before:before??null,after:saved});
    return saved;
  });
}