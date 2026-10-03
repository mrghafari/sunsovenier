import {pgTable,serial,integer,text,numeric,jsonb,timestamp,date,uniqueIndex,index,check} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";
import {accountingCompanies,accountingCurrencies,accountingJournalEntries,accountingAccounts} from "./schema";
import {crmCustomers} from "../../../shared/schema";
import {accountingWalletLinks,accountingWalletHolds} from "./wallet-schema";
import {accountingReceivableItems} from "./receipt-schema";
export const accountingWalletSettlements=pgTable("accounting_wallet_settlements",{
  id:serial("id").primaryKey(),companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  walletId:integer("wallet_id").notNull().references(()=>accountingWalletLinks.walletId),
  receivableId:integer("receivable_id").notNull().references(()=>accountingReceivableItems.id),
  holdId:integer("hold_id").references(()=>accountingWalletHolds.id),
  holdConsumedAmount:numeric("hold_consumed_amount",{precision:38,scale:8}).notNull(),
  sourceId:text("source_id").notNull(),input:jsonb("input").notNull(),
  amount:numeric("amount",{precision:38,scale:8}).notNull(),currency:text("currency").notNull().references(()=>accountingCurrencies.code),
  journalId:integer("journal_id").notNull().unique().references(()=>accountingJournalEntries.id),
  createdBy:integer("created_by").notNull(),actorType:text("actor_type").notNull(),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[uniqueIndex("accounting_wallet_settlements_company_id_source_id_key").on(t.companyId,t.sourceId),
  index("accounting_wallet_settlement_receivable").on(t.receivableId),
  check("accounting_wallet_settlements_amount_check",sql`${t.amount}>0`),
  check("accounting_wallet_settlements_hold_consumed_amount_check",sql`${t.holdConsumedAmount}>=0`),
  check("accounting_wallet_settlements_check",sql`${t.holdConsumedAmount}<=${t.amount} and (${t.holdId} is not null or ${t.holdConsumedAmount}=0)`),
  check("accounting_wallet_settlements_created_by_check",sql`${t.createdBy}>0`),
  check("accounting_wallet_settlements_actor_type_check",sql`${t.actorType} in ('admin','custom')`)]);

const bookAmount=(name:string)=>numeric(name,{precision:38,scale:8}).notNull();
export const accountingWalletBookValues=pgTable("accounting_wallet_book_values",{
  id:serial("id").primaryKey(),companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  sourceId:text("source_id").notNull(),entryDate:date("entry_date").notNull(),
  walletId:integer("wallet_id").notNull().references(()=>accountingWalletLinks.walletId),
  receivableId:integer("receivable_id").notNull().references(()=>accountingReceivableItems.id),
  amount:bookAmount("amount"),currency:text("currency").notNull().references(()=>accountingCurrencies.code),
  baseCurrency:text("base_currency").notNull().references(()=>accountingCurrencies.code),
  customerId:integer("customer_id").notNull().references(()=>crmCustomers.id),
  liabilityAccountId:integer("liability_account_id").notNull().references(()=>accountingAccounts.id),
  receivableAccountId:integer("receivable_account_id").notNull().references(()=>accountingAccounts.id),
  fxAccountId:integer("fx_account_id").references(()=>accountingAccounts.id),
  walletNativeBefore:bookAmount("wallet_native_before"),walletBaseBefore:bookAmount("wallet_base_before"),
  receivableNativeBefore:bookAmount("receivable_native_before"),receivableBaseBefore:bookAmount("receivable_base_before"),
  walletBase:bookAmount("wallet_base"),receivableBase:bookAmount("receivable_base"),
  walletRate:numeric("wallet_rate",{precision:38,scale:12}).notNull(),
  receivableRate:numeric("receivable_rate",{precision:38,scale:12}).notNull(),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[uniqueIndex("accounting_wallet_book_values_company_id_source_id_key").on(t.companyId,t.sourceId),
  index("accounting_wallet_book_receivable").on(t.receivableId),
  check("accounting_wallet_book_values_amount_check",sql`${t.amount}>0`),
  check("accounting_wallet_book_values_wallet_native_before_check",sql`${t.walletNativeBefore}>0`),
  check("accounting_wallet_book_values_wallet_base_before_check",sql`${t.walletBaseBefore}>=0`),
  check("accounting_wallet_book_values_receivable_native_before_check",sql`${t.receivableNativeBefore}>0`),
  check("accounting_wallet_book_values_receivable_base_before_check",sql`${t.receivableBaseBefore}>=0`),
  check("accounting_wallet_book_values_wallet_base_check",sql`${t.walletBase}>=0`),
  check("accounting_wallet_book_values_receivable_base_check",sql`${t.receivableBase}>=0`),
  check("accounting_wallet_book_values_wallet_rate_check",sql`${t.walletRate}>0`),
  check("accounting_wallet_book_values_receivable_rate_check",sql`${t.receivableRate}>0`)]);