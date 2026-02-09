import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as customerSchema from "@shared/customer-schema";

neonConfig.webSocketConstructor = ws;

const neonDbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!neonDbUrl) {
  throw new Error(
    "NEON_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const customerPool = new Pool({ 
  connectionString: neonDbUrl,
  ssl: true
});

export const customerDb = drizzle({ client: customerPool, schema: customerSchema });