import {pgTable,integer,text,date,jsonb,uniqueIndex} from "drizzle-orm/pg-core";
import {accountingCompanies} from "./schema";
import {accountingManualDocuments} from "./manual-document-schema";
import type {ForeignExpenseValuation,ManualDocumentInput} from "@shared/accounting-documents";
export const accountingManualExpenseBooks=pgTable("accounting_manual_expense_books",{
  documentId:integer("document_id").primaryKey().references(()=>accountingManualDocuments.id),
  companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  sourceId:text("source_id").notNull(),entryDate:date("entry_date").notNull(),
  currency:text("currency").notNull(),baseCurrency:text("base_currency").notNull(),
  valuation:jsonb("valuation").$type<ForeignExpenseValuation>().notNull(),
  documentInput:jsonb("document_input").$type<ManualDocumentInput>().notNull(),
},t=>[uniqueIndex("accounting_manual_expense_source").on(t.companyId,t.sourceId)]);