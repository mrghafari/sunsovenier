import {pgTable,serial,integer,text,jsonb,boolean,numeric,index,uniqueIndex,check} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";
import {accountingCompanies,accountingJournalEntries} from "./schema";
import type {ManualDocumentInput} from "@shared/accounting-documents";
export const accountingManualCutovers=pgTable("accounting_manual_cutovers",{
  companyId:integer("company_id").primaryKey().references(()=>accountingCompanies.id),
  processingReady:boolean("processing_ready").notNull().default(false),
});
export const accountingManualDocuments=pgTable("accounting_manual_documents",{
  id:serial("id").primaryKey(),companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  sourceId:text("source_id").notNull(),kind:text("kind").notNull(),input:jsonb("input").$type<ManualDocumentInput>().notNull(),
  status:text("status").notNull().default("draft"),revision:integer("revision").notNull().default(1),
  currency:text("currency").notNull(),debit:numeric("debit",{precision:38,scale:8}).notNull(),credit:numeric("credit",{precision:38,scale:8}).notNull(),
  journalId:integer("journal_id").references(()=>accountingJournalEntries.id),
  reversalJournalId:integer("reversal_journal_id").references(()=>accountingJournalEntries.id),
  reversalEvidence:jsonb("reversal_evidence"),
},t=>[uniqueIndex("accounting_manual_source").on(t.companyId,t.sourceId),
  uniqueIndex("accounting_manual_journal").on(t.journalId),
  uniqueIndex("accounting_manual_reversal").on(t.reversalJournalId),
  index("accounting_manual_company").on(t.companyId,t.status),
  check("accounting_manual_kind",sql`${t.kind} in ('manual','expense')`),
  check("accounting_manual_status",sql`${t.status} in ('draft','posted','discarded')`),
  check("accounting_manual_revision",sql`${t.revision}>0`),
  check("accounting_manual_totals",sql`${t.debit}>0 and ${t.credit}>0`),
  check("accounting_manual_link",sql`(${t.status}='posted')=(${t.journalId} is not null)
    and (${t.reversalJournalId} is null)=(${t.reversalEvidence} is null)
    and (${t.reversalJournalId} is null or ${t.status}='posted')`)]);