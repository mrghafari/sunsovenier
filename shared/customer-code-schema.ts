import {pgTable,text,integer,serial,jsonb,timestamp,check,uniqueIndex} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";
export const customerTypeCodeSettings=pgTable("customer_type_code_settings",{
  customerType:text("customer_type").primaryKey(),digit:text("digit").unique(),
  nextNumber:integer("next_number").notNull().default(1),
},t=>[check("customer_type_code_settings_digit_check",sql`${t.digit} is null or ${t.digit} ~ '^[0-9]$'`),
  check("customer_type_code_settings_next_number_check",sql`${t.nextNumber} between 1 and 100000`)]);
export const customerCodeSettingsAudit=pgTable("customer_code_settings_audit",{
  id:serial("id").primaryKey(),actorId:integer("actor_id").notNull(),actorType:text("actor_type").notNull(),
  action:text("action").notNull(),details:jsonb("details").notNull(),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[check("customer_code_settings_audit_actor_type_check",sql`${t.actorType} in ('admin','custom')`)]);
export const customerCodeSchemaMigrations=pgTable("customer_code_schema_migrations",{
  name:text("name").primaryKey(),checksum:text("checksum").notNull(),
  appliedAt:timestamp("applied_at",{withTimezone:true}).notNull().defaultNow(),
});