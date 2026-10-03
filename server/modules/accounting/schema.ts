import { pgTable, serial, text, integer, numeric, boolean, date, timestamp, jsonb, uniqueIndex, index, check, type AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const amount = (column: string) => numeric(column, { precision: 38, scale: 8 });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
// Namespaced tables deliberately avoid existing invoices/customer/wallet tables.
export const accountingCurrencies = pgTable("accounting_currencies", {
  code: text("code").primaryKey(), name: text("name").notNull(),
  decimals: integer("decimals").notNull(), isActive: boolean("is_active").notNull().default(true),
}, t => [check("accounting_currency_decimals", sql`${t.decimals} between 0 and 8`)]);
export const accountingCompanies = pgTable("accounting_companies", {
  id: serial("id").primaryKey(), name: text("name").notNull(), countryCode: text("country_code").notNull(),
  timezone: text("timezone").notNull(), baseCurrency: text("base_currency").notNull().references(() => accountingCurrencies.code),
  isActive: boolean("is_active").notNull().default(true), createdAt: createdAt(),
});
export const accountingAccounts = pgTable("accounting_accounts", {
  id: serial("id").primaryKey(), companyId: integer("company_id").notNull().references(() => accountingCompanies.id),
  code: text("code").notNull(), nameAr: text("name_ar").notNull(), nameEn: text("name_en").notNull(),
  type: text("type").notNull(), parentId: integer("parent_id").references((): AnyPgColumn => accountingAccounts.id),
  isPosting: boolean("is_posting").notNull().default(true), isActive: boolean("is_active").notNull().default(true),
}, t => [uniqueIndex("accounting_accounts_company_code").on(t.companyId, t.code),
  check("accounting_account_type", sql`${t.type} in ('asset','liability','equity','revenue','expense')`)]);
export const accountingCostCenters = pgTable("accounting_cost_centers", {
  id: serial("id").primaryKey(), companyId: integer("company_id").notNull().references(() => accountingCompanies.id),
  code: text("code").notNull(), nameAr: text("name_ar").notNull(), nameEn: text("name_en").notNull(),
  isActive: boolean("is_active").notNull().default(true),
}, t => [uniqueIndex("accounting_cost_centers_company_code").on(t.companyId, t.code)]);
export const accountingFiscalYears = pgTable("accounting_fiscal_years", {
  id: serial("id").primaryKey(), companyId: integer("company_id").notNull().references(() => accountingCompanies.id),
  name: text("name").notNull(), startsOn: date("starts_on").notNull(), endsOn: date("ends_on").notNull(),
  status: text("status").notNull().default("open"),
}, t => [uniqueIndex("accounting_fiscal_year_company_name").on(t.companyId, t.name),
  check("accounting_fiscal_year_dates", sql`${t.startsOn} <= ${t.endsOn}`),
  check("accounting_fiscal_year_status", sql`${t.status} in ('open','closed')`)]);
export const accountingPostingRules = pgTable("accounting_posting_rules", {
  id: serial("id").primaryKey(), companyId: integer("company_id").notNull().references(() => accountingCompanies.id),
  key: text("key").notNull(), accountId: integer("account_id").notNull().references(() => accountingAccounts.id),
}, t => [uniqueIndex("accounting_posting_rule_company_key").on(t.companyId, t.key)]);
export const accountingExchangeRates = pgTable("accounting_exchange_rates", {
  id: serial("id").primaryKey(), companyId: integer("company_id").notNull().references(() => accountingCompanies.id),
  currency: text("currency").notNull().references(() => accountingCurrencies.code),
  effectiveOn: date("effective_on").notNull(), rate: numeric("rate", { precision: 38, scale: 12 }).notNull(),
  source: text("source").notNull().default("central_bank"), reference: text("reference").notNull(),
}, t => [uniqueIndex("accounting_exchange_rate_date").on(t.companyId, t.currency, t.effectiveOn),
  check("accounting_exchange_rate_positive", sql`${t.rate} > 0`)]);
export const accountingTaxRules = pgTable("accounting_tax_rules", {
  id: serial("id").primaryKey(), companyId: integer("company_id").notNull().references(() => accountingCompanies.id),
  countryCode: text("country_code").notNull(), productGroup: text("product_group").notNull(),
  ratePercent: numeric("rate_percent", { precision: 12, scale: 8 }).notNull(),
  validFrom: date("valid_from").notNull(), validTo: date("valid_to"), isActive: boolean("is_active").notNull().default(true),
}, t => [check("accounting_tax_percent", sql`${t.ratePercent} between 0 and 100`),
  check("accounting_tax_dates", sql`${t.validTo} is null or ${t.validTo} >= ${t.validFrom}`)]);
export const accountingSettings = pgTable("accounting_settings", {
  id: serial("id").primaryKey(), companyId: integer("company_id").notNull().unique().references(() => accountingCompanies.id),
  weightTolerancePercent: numeric("weight_tolerance_percent", { precision: 12, scale: 8 }).notNull().default("0"),
  fleetRate: amount("fleet_rate").notNull().default("0"),
  fleetRateBasis: text("fleet_rate_basis").notNull().default("per_ton"),
  fleetCostCenterId: integer("fleet_cost_center_id").references(() => accountingCostCenters.id),
}, t => [check("accounting_settings_tolerance", sql`${t.weightTolerancePercent} between 0 and 100`),
  check("accounting_settings_fleet_rate", sql`${t.fleetRate} >= 0`),
  check("accounting_settings_fleet_basis", sql`${t.fleetRateBasis} in ('per_ton','per_km')`)]);
export const accountingJournalEntries = pgTable("accounting_journal_entries", {
  id: serial("id").primaryKey(), companyId: integer("company_id").notNull().references(() => accountingCompanies.id),
  fiscalYearId: integer("fiscal_year_id").notNull().references(() => accountingFiscalYears.id),
  entryDate: date("entry_date").notNull(), description: text("description").notNull(),
  sourceType: text("source_type").notNull(), sourceId: text("source_id").notNull(),
  sourceHash: text("source_hash").notNull(), status: text("status").notNull().default("draft"),
  reversalOfId: integer("reversal_of_id").references((): AnyPgColumn => accountingJournalEntries.id),
  createdBy: integer("created_by").notNull(), actorType: text("actor_type").notNull(), createdAt: createdAt(),
}, t => [uniqueIndex("accounting_journal_idempotency").on(t.companyId, t.sourceType, t.sourceId),
  uniqueIndex("accounting_journal_one_reversal").on(t.reversalOfId),
  check("accounting_journal_status", sql`${t.status} in ('draft','posted')`),
  index("accounting_journal_company_date").on(t.companyId, t.entryDate)]);
export const accountingJournalLines = pgTable("accounting_journal_lines", {
  id: serial("id").primaryKey(), entryId: integer("entry_id").notNull().references(() => accountingJournalEntries.id),
  accountId: integer("account_id").notNull().references(() => accountingAccounts.id),
  currency: text("currency").notNull().references(() => accountingCurrencies.code),
  exchangeRate: numeric("exchange_rate", { precision: 38, scale: 12 }).notNull(),
  debit: amount("debit").notNull().default("0"), credit: amount("credit").notNull().default("0"),
  baseDebit: amount("base_debit").notNull().default("0"), baseCredit: amount("base_credit").notNull().default("0"),
  partyType: text("party_type"), partyId: integer("party_id"),
  costCenterId: integer("cost_center_id").references(() => accountingCostCenters.id),
  description: text("description").notNull().default(""),
}, t => [index("accounting_lines_entry").on(t.entryId), index("accounting_lines_account").on(t.accountId),
  check("accounting_line_amounts", sql`(${t.debit} > 0 and ${t.credit} = 0 and ${t.baseDebit} > 0 and ${t.baseCredit} = 0)
    or (${t.credit} > 0 and ${t.debit} = 0 and ${t.baseCredit} > 0 and ${t.baseDebit} = 0)`),
  check("accounting_line_rate", sql`${t.exchangeRate} > 0`),
  check("accounting_line_party", sql`(${t.partyType} is null and ${t.partyId} is null) or (${t.partyType} in ('customer','carrier') and ${t.partyId} > 0)`)]);
export const accountingAuditLogs = pgTable("accounting_audit_logs", {
  id: serial("id").primaryKey(), companyId: integer("company_id").references(() => accountingCompanies.id),
  actorId: integer("actor_id").notNull(), actorType: text("actor_type").notNull(),
  action: text("action").notNull(), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(),
  before: jsonb("before"), after: jsonb("after"), createdAt: createdAt(),
});
export const accountingOutbox = pgTable("accounting_outbox", {
  id: serial("id").primaryKey(), companyId: integer("company_id").notNull().references(() => accountingCompanies.id),
  eventType: text("event_type").notNull(), sourceId: text("source_id").notNull(), payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("pending"), attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"), nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(), processedAt: timestamp("processed_at", { withTimezone: true }),
}, t => [uniqueIndex("accounting_outbox_event_identity").on(t.companyId, t.eventType, t.sourceId),
  index("accounting_outbox_pending").on(t.status, t.nextAttemptAt)]);