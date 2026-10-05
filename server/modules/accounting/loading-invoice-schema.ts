import {pgTable,serial,integer,text,numeric,date,boolean,jsonb,timestamp,uniqueIndex} from "drizzle-orm/pg-core";
import {accountingCompanies,accountingJournalEntries,accountingOperationalFacts} from "./schema";
import {accountingInventoryDocuments} from "./inventory-document-schema";
import {accountingReceivableItems} from "./receipt-schema";
import {accountingWalletSettlements} from "./settlement-schema";
const created=()=>timestamp("created_at",{withTimezone:true}).notNull().defaultNow();
const amount=(name:string)=>numeric(name,{precision:38,scale:8}).notNull();
export const accountingInvoiceCutovers=pgTable("accounting_invoice_cutovers",{
  companyId:integer("company_id").primaryKey().references(()=>accountingCompanies.id),
  processingReady:boolean("processing_ready").notNull().default(false),startsOn:date("starts_on"),
  firstOrderId:integer("first_order_id"),reviewedBy:integer("reviewed_by"),evidenceReference:text("evidence_reference"),
});
export const accountingStockBooks=pgTable("accounting_stock_books",{
  id:serial("id").primaryKey(),companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  documentId:integer("document_id").notNull().references(()=>accountingInventoryDocuments.id),
  lineIndex:integer("line_index").notNull(),journalId:integer("journal_id").notNull().references(()=>accountingJournalEntries.id),
  productId:integer("product_id").notNull(),quantityTons:amount("quantity_tons"),baseCost:amount("base_cost"),
  evidenceReference:text("evidence_reference").notNull(),actorId:integer("actor_id").notNull(),actorType:text("actor_type").notNull(),
  createdAt:created(),
},t=>[uniqueIndex("accounting_stock_books_document_id_line_index_key").on(t.documentId,t.lineIndex)]);
export const accountingLoadingInvoices=pgTable("accounting_loading_invoices",{
  id:serial("id").primaryKey(),companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  factId:integer("fact_id").notNull().unique().references(()=>accountingOperationalFacts.id),
  journalId:integer("journal_id").notNull().unique().references(()=>accountingJournalEntries.id),
  cogsJournalId:integer("cogs_journal_id").unique().references(()=>accountingJournalEntries.id),
  receivableId:integer("receivable_id").notNull().unique().references(()=>accountingReceivableItems.id),
  settlementId:integer("settlement_id").references(()=>accountingWalletSettlements.id),baseCost:amount("base_cost"),plan:jsonb("plan").notNull(),
  actorId:integer("actor_id").notNull(),actorType:text("actor_type").notNull(),reason:text("reason").notNull(),
  settleFromHold:boolean("settle_from_hold").notNull().default(false),createdAt:created(),
});
export const accountingStockConsumptions=pgTable("accounting_stock_consumptions",{
  id:serial("id").primaryKey(),invoiceId:integer("invoice_id").notNull().references(()=>accountingLoadingInvoices.id),
  layerId:integer("layer_id").notNull().references(()=>accountingStockBooks.id),orderItemId:integer("order_item_id").notNull(),
  quantityTons:amount("quantity_tons"),baseCost:amount("base_cost"),
},t=>[uniqueIndex("accounting_stock_consumptions_invoice_id_layer_id_order_item_id_key").on(t.invoiceId,t.layerId,t.orderItemId)]);
