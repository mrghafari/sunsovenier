import {pgTable,integer,text,numeric,timestamp,index,check} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";
import {accountingCompanies,accountingCurrencies,accountingOperationalFacts} from "./schema";

export const accountingLoadingShipping=pgTable("accounting_loading_shipping",{
  factId:integer("fact_id").primaryKey().references(()=>accountingOperationalFacts.id),
  companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  orderId:integer("order_id").notNull(),
  currency:text("currency").notNull().references(()=>accountingCurrencies.code),
  orderShippingTotal:numeric("order_shipping_total",{precision:38,scale:8}).notNull(),
  amount:numeric("amount",{precision:38,scale:8}).notNull(),
  evidenceReference:text("evidence_reference").notNull(),
  reason:text("reason").notNull(),actorId:integer("actor_id").notNull(),actorType:text("actor_type").notNull(),
  approvedAt:timestamp("approved_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[
  index("accounting_loading_shipping_order").on(t.companyId,t.orderId),
  check("accounting_loading_shipping_order_shipping_total_check",sql`${t.orderShippingTotal}>0`),
  check("accounting_loading_shipping_amount_check",sql`${t.amount}>=0 and ${t.amount}<=${t.orderShippingTotal}`),
  check("accounting_loading_shipping_evidence_reference_check",sql`length(trim(${t.evidenceReference})) between 5 and 500`),
  check("accounting_loading_shipping_reason_check",sql`length(trim(${t.reason})) between 5 and 500`),
  check("accounting_loading_shipping_actor_id_check",sql`${t.actorId}>0`),
  check("accounting_loading_shipping_actor_type_check",sql`${t.actorType} in ('admin','custom')`),
]);
