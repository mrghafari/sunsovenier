import {pgTable,integer,text,boolean,numeric,timestamp,jsonb,index,check} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";
import {accountingCompanies,accountingCurrencies} from "./schema";
import {accountingWalletLinks} from "./wallet-schema";
import {customerOrders} from "../../../shared/customer-schema";
import {crmCustomers} from "../../../shared/schema";

export const accountingCreditCutovers=pgTable("accounting_credit_cutovers",{
  companyId:integer("company_id").primaryKey().references(()=>accountingCompanies.id),
  processingReady:boolean("processing_ready").notNull().default(false),
  enabledAt:timestamp("enabled_at",{withTimezone:true}),openingReference:text("opening_reference"),reviewedBy:integer("reviewed_by"),
},t=>[check("accounting_credit_cutovers_check",sql`not ${t.processingReady} or
  (${t.enabledAt} is not null and length(trim(${t.openingReference}))>=5 and ${t.reviewedBy}>0)`)]);
export const accountingCreditOrders=pgTable("accounting_credit_orders",{
  orderId:integer("order_id").primaryKey().references(()=>customerOrders.id),
  companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  walletId:integer("wallet_id").notNull().references(()=>accountingWalletLinks.walletId),
  customerId:integer("customer_id").notNull().references(()=>crmCustomers.id),
  currency:text("currency").notNull().references(()=>accountingCurrencies.code),
  amount:numeric("amount",{precision:38,scale:8}).notNull(),orderSnapshot:jsonb("order_snapshot").notNull(),
  evidenceReference:text("evidence_reference").notNull(),actorId:integer("actor_id").notNull(),
  actorType:text("actor_type").notNull(),status:text("status").notNull().default("registered"),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[
  index("accounting_credit_order_party").on(t.companyId,t.customerId,t.currency,t.status),
  check("accounting_credit_orders_amount_check",sql`${t.amount}>0`),
  check("accounting_credit_orders_evidence_reference_check",sql`length(trim(${t.evidenceReference}))>=5`),
  check("accounting_credit_orders_actor_id_check",sql`${t.actorId}>0`),
  check("accounting_credit_orders_actor_type_check",sql`${t.actorType} in ('admin','custom')`),
  check("accounting_credit_orders_status_check",sql`${t.status} in ('registered','approved')`),
]);