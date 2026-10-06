import {pgTable,serial,integer,text,jsonb,date,timestamp,uniqueIndex,index} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";
import {accountingCompanies} from "./schema";
export const accountingInventoryDocuments=pgTable("accounting_inventory_documents",{
  id:serial("id").primaryKey(),companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  sourceId:text("source_id").notNull(),revision:integer("revision").notNull().default(1),
  kind:text("kind").notNull(),reference:text("reference").notNull(),documentDate:date("document_date").notNull(),
  supplier:text("supplier").notNull(),currency:text("currency").notNull(),evidenceReference:text("evidence_reference").notNull(),
  notes:text("notes").notNull(),lines:jsonb("lines").notNull(),inputHash:text("input_hash").notNull(),
  totalCost:text("total_cost").notNull(),totalTons:text("total_tons").notNull(),status:text("status").notNull().default("draft"),
  createdBy:integer("created_by").notNull(),actorType:text("actor_type").notNull(),
  updatedBy:integer("updated_by").notNull(),updatedActorType:text("updated_actor_type").notNull(),
  approval:jsonb("approval"),closure:jsonb("closure"),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
  updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[uniqueIndex("accounting_inventory_document_source").on(t.companyId,t.sourceId),
  uniqueIndex("accounting_inventory_document_reference").on(t.companyId,t.kind,t.reference).where(sql`${t.status} in ('draft','approved')`),
  index("accounting_inventory_document_company").on(t.companyId,t.id)]);
