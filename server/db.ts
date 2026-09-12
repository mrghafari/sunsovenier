import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as baseSchema from "@shared/schema";
import * as orderManagementSchema from "@shared/order-management-schema";
import * as showcaseSchema from "@shared/showcase-schema";

neonConfig.webSocketConstructor = ws;

const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "NEON_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 1, // Limit concurrent connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Handle pool errors to prevent unhandled rejections
pool.on('error', (err) => {
  console.error('Main database pool error:', err);
});

const schema = {
  ...baseSchema,
  ...orderManagementSchema,
};

export const db = drizzle({ client: pool, schema });
export const showcaseDb = drizzle({ client: pool, schema: showcaseSchema });