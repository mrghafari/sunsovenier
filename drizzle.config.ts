import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: ["./shared/schema.ts", "./server/modules/accounting/schema.ts", "./server/modules/accounting/migration-schema.ts", "./server/modules/accounting/wallet-schema.ts", "./shared/customer-code-schema.ts", "./server/modules/accounting/receipt-schema.ts", "./server/modules/accounting/settlement-schema.ts", "./server/modules/accounting/receipt-book-schema.ts", "./server/modules/accounting/cheque-book-schema.ts"],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
