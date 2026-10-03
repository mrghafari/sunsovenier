import {pgTable,serial,integer,text,date,numeric,jsonb,timestamp,uniqueIndex,check} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";
import {accountingCompanies,accountingCurrencies,accountingAccounts} from "./schema";
import {accountingCustomerReceipts} from "./receipt-schema";
import {crmCustomers} from "../../../shared/schema";

const amount=(name:string)=>numeric(name,{precision:38,scale:8}).notNull();
export const accountingReceiptBookValues=pgTable("accounting_receipt_book_values",{
  id:serial("id").primaryKey(),receiptId:integer("receipt_id").notNull().unique().references(()=>accountingCustomerReceipts.id),
  companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),sourceId:text("source_id").notNull(),
  entryDate:date("entry_date").notNull(),customerId:integer("customer_id").notNull().references(()=>crmCustomers.id),
  currency:text("currency").notNull().references(()=>accountingCurrencies.code),
  baseCurrency:text("base_currency").notNull().references(()=>accountingCurrencies.code),
  fundingAccountId:integer("funding_account_id").notNull().references(()=>accountingAccounts.id),
  receivableAccountId:integer("receivable_account_id").notNull().references(()=>accountingAccounts.id),
  liabilityAccountId:integer("liability_account_id").references(()=>accountingAccounts.id),
  fxAccountId:integer("fx_account_id").references(()=>accountingAccounts.id),
  amount:amount("amount"),allocated:amount("allocated"),walletCredit:amount("wallet_credit"),
  fundingBase:amount("funding_base"),receivableBase:amount("receivable_base"),walletBase:amount("wallet_base"),
  officialRate:numeric("official_rate",{precision:38,scale:12}).notNull(),
  receivableRate:numeric("receivable_rate",{precision:38,scale:12}).notNull(),
  allocations:jsonb("allocations").notNull(),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[uniqueIndex("accounting_receipt_book_values_company_id_source_id_key").on(t.companyId,t.sourceId),
  check("accounting_receipt_book_values_amount_check",sql`${t.amount}>0`),
  check("accounting_receipt_book_values_allocated_check",sql`${t.allocated}>=0`),
  check("accounting_receipt_book_values_wallet_credit_check",sql`${t.walletCredit}>=0`),
  check("accounting_receipt_book_values_funding_base_check",sql`${t.fundingBase}>=0`),
  check("accounting_receipt_book_values_receivable_base_check",sql`${t.receivableBase}>=0`),
  check("accounting_receipt_book_values_wallet_base_check",sql`${t.walletBase}>=0`),
  check("accounting_receipt_book_values_official_rate_check",sql`${t.officialRate}>0`),
  check("accounting_receipt_book_values_receivable_rate_check",sql`${t.receivableRate}>0`),
  check("accounting_receipt_book_values_allocations_check",sql`jsonb_typeof(${t.allocations})='array'`),
  check("accounting_receipt_book_values_check",sql`${t.allocated}+${t.walletCredit}=${t.amount}`)]);