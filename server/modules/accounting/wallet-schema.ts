import {pgTable,integer,serial,text,boolean,numeric,timestamp,jsonb,uniqueIndex,index,check} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";
import {accountingCompanies,accountingCurrencies,accountingJournalEntries} from "./schema";
import {customerWallets,walletTransactions} from "../../../shared/customer-schema";
import {crmCustomers} from "../../../shared/schema";
const created=()=>timestamp("created_at",{withTimezone:true}).notNull().defaultNow();
const amount=()=>numeric("amount",{precision:38,scale:8}).notNull();
export const accountingWalletCutovers=pgTable("accounting_wallet_cutovers",{
  companyId:integer("company_id").primaryKey().references(()=>accountingCompanies.id),
  pipelineReady:boolean("pipeline_ready").notNull().default(false),
  enabledAt:timestamp("enabled_at",{withTimezone:true}),openingReference:text("opening_reference"),reviewedBy:integer("reviewed_by"),
},t=>[check("accounting_wallet_cutovers_check",sql`not ${t.pipelineReady} or
  (${t.enabledAt} is not null and length(trim(${t.openingReference}))>=5 and ${t.reviewedBy}>0)`)]);
export const accountingWalletLinks=pgTable("accounting_wallet_links",{
  walletId:integer("wallet_id").primaryKey().references(()=>customerWallets.id),
  companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  customerId:integer("customer_id").notNull().references(()=>crmCustomers.id),
  currency:text("currency").notNull().references(()=>accountingCurrencies.code),createdAt:created(),
});
export const accountingWalletOrders=pgTable("accounting_wallet_orders",{
  orderId:integer("order_id").primaryKey(),walletId:integer("wallet_id").notNull().references(()=>accountingWalletLinks.walletId),
  companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  snapshot:jsonb("snapshot").notNull(),createdAt:created(),
});
export const accountingWalletHolds=pgTable("accounting_wallet_holds",{
  id:serial("id").primaryKey(),companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  walletId:integer("wallet_id").notNull().references(()=>accountingWalletLinks.walletId),
  orderId:integer("order_id").notNull().unique().references(()=>accountingWalletOrders.orderId),
  amount:amount(),currency:text("currency").notNull().references(()=>accountingCurrencies.code),
  consumedAmount:numeric("consumed_amount",{precision:38,scale:8}).notNull().default("0"),
  status:text("status").notNull().default("active"),createdBy:integer("created_by").notNull(),createdAt:created(),
  releasedAt:timestamp("released_at",{withTimezone:true}),releaseReason:text("release_reason"),
},t=>[index("accounting_wallet_active_holds").on(t.walletId,t.status),
  check("accounting_wallet_holds_amount_check",sql`${t.amount}>0`),
  check("accounting_wallet_holds_consumed_amount_check",sql`${t.consumedAmount}>=0 and ${t.consumedAmount}<=${t.amount}`),
  check("accounting_wallet_holds_status_check",sql`${t.status} in ('active','released','consumed')`),
  check("accounting_wallet_holds_check",sql`(${t.status}='active' and ${t.consumedAmount}<${t.amount} and ${t.releasedAt} is null and ${t.releaseReason} is null) or
    (${t.status}='consumed' and ${t.consumedAmount}=${t.amount} and ${t.releasedAt} is null and ${t.releaseReason} is null) or
    (${t.status}='released' and ${t.consumedAmount}<${t.amount} and ${t.releasedAt} is not null and length(trim(${t.releaseReason}))>=5)`)]);
export const accountingWalletMovements=pgTable("accounting_wallet_movements",{
  id:serial("id").primaryKey(),companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  walletId:integer("wallet_id").notNull().references(()=>accountingWalletLinks.walletId),
  kind:text("kind").notNull(),sourceId:text("source_id").notNull(),input:jsonb("input").notNull(),amount:amount(),
  journalId:integer("journal_id").notNull().references(()=>accountingJournalEntries.id),
  nativeTransactionId:integer("native_transaction_id").notNull().references(()=>walletTransactions.id),createdAt:created(),
},t=>[uniqueIndex("accounting_wallet_movements_company_id_kind_source_id_key").on(t.companyId,t.kind,t.sourceId),
  check("accounting_wallet_movements_kind_check",sql`${t.kind} in ('topup','refund')`),
  check("accounting_wallet_movements_amount_check",sql`${t.amount}>0`)]);