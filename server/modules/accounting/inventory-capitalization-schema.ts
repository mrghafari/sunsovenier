import {boolean,integer,jsonb,pgTable,serial,text,timestamp} from "drizzle-orm/pg-core";
import {accountingCompanies,accountingAccounts,accountingJournalEntries} from "./schema";
import {accountingInventoryDocuments} from "./inventory-document-schema";
export const accountingInventoryCapitalizationCutovers=pgTable("accounting_inventory_capitalization_cutovers",{
  companyId:integer("company_id").primaryKey().references(()=>accountingCompanies.id),
  processingReady:boolean("processing_ready").notNull().default(false),
  purchasePayableAccountId:integer("purchase_payable_account_id").references(()=>accountingAccounts.id),
  reviewedBy:integer("reviewed_by"),evidenceReference:text("evidence_reference"),
});
export const accountingInventoryCapitalizations=pgTable("accounting_inventory_capitalizations",{
  id:serial("id").primaryKey(),companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  documentId:integer("document_id").notNull().unique().references(()=>accountingInventoryDocuments.id),
  journalId:integer("journal_id").notNull().unique().references(()=>accountingJournalEntries.id),
  commandHash:text("command_hash").notNull(),plan:jsonb("plan").notNull(),actorId:integer("actor_id").notNull(),
  actorType:text("actor_type").notNull(),reason:text("reason").notNull(),createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
});
