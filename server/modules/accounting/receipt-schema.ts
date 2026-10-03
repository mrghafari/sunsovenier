import {pgTable,serial,integer,text,numeric,date,boolean,jsonb,timestamp,uniqueIndex,index} from "drizzle-orm/pg-core";
import {accountingCompanies,accountingCurrencies,accountingJournalEntries} from "./schema";
import {accountingWalletLinks} from "./wallet-schema";
import {crmCustomers} from "../../../shared/schema";
const created=()=>timestamp("created_at",{withTimezone:true}).notNull().defaultNow();
const money=(name:string)=>numeric(name,{precision:38,scale:8}).notNull();
export const accountingReceiptCutovers=pgTable("accounting_receipt_cutovers",{
  companyId:integer("company_id").primaryKey().references(()=>accountingCompanies.id),
  processingReady:boolean("processing_ready").notNull().default(false),
});
export const accountingReceivableItems=pgTable("accounting_receivable_items",{
  id:serial("id").primaryKey(),companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  customerId:integer("customer_id").notNull().references(()=>crmCustomers.id),
  currency:text("currency").notNull().references(()=>accountingCurrencies.code),
  invoiceJournalId:integer("invoice_journal_id").notNull().references(()=>accountingJournalEntries.id),
  invoiceReference:text("invoice_reference").notNull(),orderId:integer("order_id"),
  issuedOn:date("issued_on").notNull(),dueOn:date("due_on").notNull(),amount:money("amount"),
  settledAmount:money("settled_amount").default("0"),createdAt:created(),
},t=>[uniqueIndex("accounting_receivable_invoice_party").on(t.companyId,t.invoiceJournalId,t.customerId,t.currency),
  index("accounting_receivable_party").on(t.companyId,t.customerId,t.currency)]);
export const accountingCustomerReceipts=pgTable("accounting_customer_receipts",{
  id:serial("id").primaryKey(),companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  customerId:integer("customer_id").notNull().references(()=>crmCustomers.id),
  currency:text("currency").notNull().references(()=>accountingCurrencies.code),
  sourceId:text("source_id").notNull(),entryDate:date("entry_date").notNull(),method:text("method").notNull(),
  amount:money("amount"),walletCredit:money("wallet_credit"),
  walletId:integer("wallet_id").references(()=>accountingWalletLinks.walletId),
  input:jsonb("input").notNull(),status:text("status").notNull(),createdAt:created(),
},t=>[uniqueIndex("accounting_customer_receipt_source").on(t.companyId,t.sourceId),
  index("accounting_uncleared_cheque_wallet").on(t.walletId,t.status)]);
export const accountingReceiptAllocations=pgTable("accounting_receipt_allocations",{
  id:serial("id").primaryKey(),receiptId:integer("receipt_id").notNull().references(()=>accountingCustomerReceipts.id),
  receivableId:integer("receivable_id").notNull().references(()=>accountingReceivableItems.id),
  amount:money("amount"),status:text("status").notNull().default("active"),createdAt:created(),
},t=>[uniqueIndex("accounting_receipt_allocation_item").on(t.receiptId,t.receivableId)]);
export const accountingReceiptEvents=pgTable("accounting_receipt_events",{
  id:serial("id").primaryKey(),receiptId:integer("receipt_id").notNull().references(()=>accountingCustomerReceipts.id),
  action:text("action").notNull(),sourceId:text("source_id").notNull(),input:jsonb("input").notNull(),
  journalId:integer("journal_id").notNull().references(()=>accountingJournalEntries.id),createdAt:created(),
},t=>[uniqueIndex("accounting_receipt_event_action").on(t.receiptId,t.action)]);