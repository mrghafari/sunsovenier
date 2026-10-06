import {pgTable,integer,serial,text,boolean,date,jsonb,uniqueIndex,check} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";
import {accountingCompanies,accountingJournalEntries} from "./schema";
import {accountingWalletMovements} from "./wallet-schema";
export const accountingWalletRefundCutovers=pgTable("accounting_wallet_refund_cutovers",{
  companyId:integer("company_id").primaryKey().references(()=>accountingCompanies.id),
  processingReady:boolean("processing_ready").notNull().default(false),
  startsOn:date("starts_on"),reviewedBy:integer("reviewed_by"),evidenceReference:text("evidence_reference"),
},t=>[check("accounting_wallet_refund_cutovers_check",sql`not ${t.processingReady} or (${t.startsOn} is not null and ${t.reviewedBy}>0 and length(btrim(${t.evidenceReference})) between 5 and 500)`)]);
export const accountingWalletRefundBooks=pgTable("accounting_wallet_refund_books",{
  id:serial("id").primaryKey(),companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  sourceId:text("source_id").notNull(),input:jsonb("input").notNull(),valuation:jsonb("valuation").notNull(),
  actorId:integer("actor_id").notNull(),actorType:text("actor_type").notNull(),
  journalId:integer("journal_id").references(()=>accountingJournalEntries.id),
  movementId:integer("movement_id").references(()=>accountingWalletMovements.id),
},t=>[uniqueIndex("accounting_wallet_refund_books_company_source").on(t.companyId,t.sourceId),
  uniqueIndex("accounting_wallet_refund_books_journal").on(t.journalId),
  uniqueIndex("accounting_wallet_refund_books_movement").on(t.movementId),
  uniqueIndex("accounting_wallet_refund_payout_reference").on(t.companyId,sql`(${t.input}->>'channel')`,sql`upper(btrim(${t.input}->>'payoutReference'))`),
  check("accounting_wallet_refund_books_actor_type_check",sql`${t.actorType} in ('admin','custom')`)]);
