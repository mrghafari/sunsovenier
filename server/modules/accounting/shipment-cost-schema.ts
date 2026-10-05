import {pgTable,serial,integer,boolean,date,text,jsonb,timestamp,check} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";
import {accountingCompanies,accountingJournalEntries,accountingOperationalFacts} from "./schema";
export const accountingShipmentCutovers=pgTable("accounting_shipment_cutovers",{
  companyId:integer("company_id").primaryKey().references(()=>accountingCompanies.id),
  processingReady:boolean("processing_ready").notNull().default(false),
  foreignProcessingReady:boolean("foreign_processing_ready").notNull().default(false),
  startsOn:date("starts_on"),reviewedBy:integer("reviewed_by"),evidenceReference:text("evidence_reference"),
},t=>[
  check("accounting_shipment_cutovers_check",sql`not ${t.foreignProcessingReady} or ${t.processingReady}`),
  check("accounting_shipment_cutovers_check1",sql`not ${t.processingReady} or (${t.startsOn} is not null
    and ${t.reviewedBy} is not null and ${t.evidenceReference} is not null and ${t.reviewedBy}>0
    and length(btrim(${t.evidenceReference})) between 5 and 500)`),
]);
export const accountingShipmentCosts=pgTable("accounting_shipment_costs",{
  id:serial("id").primaryKey(),companyId:integer("company_id").notNull().references(()=>accountingCompanies.id),
  factId:integer("fact_id").notNull().unique().references(()=>accountingOperationalFacts.id),
  journalId:integer("journal_id").notNull().unique().references(()=>accountingJournalEntries.id),
  carrierPartyId:integer("carrier_party_id"),reason:text("reason").notNull(),
  commandHash:text("command_hash").notNull(),plan:jsonb("plan").notNull(),
  actorId:integer("actor_id").notNull(),actorType:text("actor_type").notNull(),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[
  check("accounting_shipment_costs_carrier_party_id_check",sql`${t.carrierPartyId}>0`),
  check("accounting_shipment_costs_reason_check",sql`length(btrim(${t.reason})) between 5 and 500`),
  check("accounting_shipment_costs_command_hash_check",sql`${t.commandHash} ~ '^[a-f0-9]{64}$'`),
  check("accounting_shipment_costs_actor_type_check",sql`${t.actorType} in ('admin','custom')`),
]);
