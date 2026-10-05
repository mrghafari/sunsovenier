import {pgTable,serial,integer,text,jsonb,timestamp,uniqueIndex} from "drizzle-orm/pg-core";
import {accountingCompanies} from "./schema";
export const accountingLoadingWeightReviews=pgTable("accounting_loading_weight_reviews",{
  id:serial("id").primaryKey(),companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  orderId:integer("order_id").notNull(),historyKey:text("history_key").notNull(),basis:jsonb("basis").notNull(),
  evidenceReference:text("evidence_reference").notNull(),reason:text("reason").notNull(),actorId:text("actor_id").notNull(),
  actorType:text("actor_type").notNull(),approvedAt:timestamp("approved_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[uniqueIndex("accounting_loading_weight_reviews_company_id_order_id_history_key_key").on(t.companyId,t.orderId,t.historyKey)]);
