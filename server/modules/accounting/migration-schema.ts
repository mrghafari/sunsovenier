import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
export * from "./credit-schema";
export * from "./loading-weight-schema";
export * from "./inventory-document-schema";
export * from "./loading-invoice-schema";
export * from "./inventory-capitalization-schema";
export * from "./shipment-cost-schema";
export * from "./loading-return-schema";
// Created by the explicit dev migration runner before applying module migrations.
// Include in the main schema inventory so db:push never mistakes it for a retired table.
export const accountingSchemaMigrations = pgTable("accounting_schema_migrations", {
  name: text("name").primaryKey(),
  checksum: text("checksum").notNull(),
  appliedAt: timestamp("applied_at", {withTimezone:true}).notNull().defaultNow(),
});