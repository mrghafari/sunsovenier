import {pgTable,serial,integer,text,boolean,date,jsonb,timestamp} from "drizzle-orm/pg-core";
import {accountingCompanies,accountingJournalEntries} from "./schema";
import {accountingLoadingInvoices} from "./loading-invoice-schema";
export const accountingLoadingReturnCutovers=pgTable("accounting_loading_return_cutovers",{
  companyId:integer("company_id").primaryKey().references(()=>accountingCompanies.id),
  processingReady:boolean("processing_ready").notNull().default(false),
  startsOn:date("starts_on"),reviewedBy:integer("reviewed_by"),evidenceReference:text("evidence_reference"),
});
export const accountingLoadingReturns=pgTable("accounting_loading_returns",{
  id:serial("id").primaryKey(),companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  invoiceId:integer("invoice_id").notNull().unique().references(()=>accountingLoadingInvoices.id),
  returnDate:date("return_date").notNull(),goodsReceiptReference:text("goods_receipt_reference").notNull(),
  reason:text("reason").notNull(),commandHash:text("command_hash").notNull(),plan:jsonb("plan").notNull(),
  invoiceReversalId:integer("invoice_reversal_id").unique().references(()=>accountingJournalEntries.id),
  cogsReversalId:integer("cogs_reversal_id").unique().references(()=>accountingJournalEntries.id),
  actorId:integer("actor_id").notNull(),actorType:text("actor_type").notNull(),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
});
