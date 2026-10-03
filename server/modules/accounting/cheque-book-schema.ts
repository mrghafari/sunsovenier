import {pgTable,serial,integer,text,date,numeric,jsonb,timestamp,uniqueIndex,check} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";
import {accountingCompanies,accountingCurrencies,accountingAccounts} from "./schema";
import {accountingCustomerReceipts} from "./receipt-schema";
const amount=(name:string)=>numeric(name,{precision:38,scale:8}).notNull();
export const accountingChequeBookValues=pgTable("accounting_cheque_book_values",{
  id:serial("id").primaryKey(),receiptId:integer("receipt_id").notNull().references(()=>accountingCustomerReceipts.id),
  companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),sourceId:text("source_id").notNull(),
  action:text("action").notNull(),entryDate:date("entry_date").notNull(),input:jsonb("input").notNull(),
  fromStatus:text("from_status").notNull(),currency:text("currency").notNull().references(()=>accountingCurrencies.code),
  baseCurrency:text("base_currency").notNull().references(()=>accountingCurrencies.code),
  fromAccountId:integer("from_account_id").notNull().references(()=>accountingAccounts.id),
  toAccountId:integer("to_account_id").references(()=>accountingAccounts.id),
  recoveredNative:amount("recovered_native"),newDebtNative:amount("new_debt_native"),
  assetBase:amount("asset_base"),walletBase:amount("wallet_base"),
  restoredArBase:amount("restored_ar_base"),newDebtBase:amount("new_debt_base"),lines:jsonb("lines").notNull(),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[
  uniqueIndex("accounting_cheque_book_values_receipt_id_action_key").on(t.receiptId,t.action),
  uniqueIndex("accounting_cheque_book_values_company_id_action_source_id_key").on(t.companyId,t.action,t.sourceId),
  check("accounting_cheque_book_values_action_check",sql`${t.action} in ('deposited','cleared','bounced','returned')`),
  check("accounting_cheque_book_values_recovered_native_check",sql`${t.recoveredNative}>=0`),
  check("accounting_cheque_book_values_new_debt_native_check",sql`${t.newDebtNative}>=0`),
  check("accounting_cheque_book_values_asset_base_check",sql`${t.assetBase}>=0`),
  check("accounting_cheque_book_values_wallet_base_check",sql`${t.walletBase}>=0`),
  check("accounting_cheque_book_values_restored_ar_base_check",sql`${t.restoredArBase}>=0`),
  check("accounting_cheque_book_values_new_debt_base_check",sql`${t.newDebtBase}>=0`),
  check("accounting_cheque_book_values_lines_check",sql`jsonb_typeof(${t.lines})='array'`),
]);