import {pgTable,serial,integer,text,numeric,jsonb,timestamp,uniqueIndex,index,check} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";
import {accountingCompanies,accountingCurrencies,accountingJournalEntries} from "./schema";
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