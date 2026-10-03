import { defineConfig } from "drizzle-kit";

// Generation only. Does not connect to or alter any database.
export default defineConfig({
  dialect: "postgresql",
  schema: "./server/modules/accounting/schema.ts",
  out: "./migrations/accounting",
});