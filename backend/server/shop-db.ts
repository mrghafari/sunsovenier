import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as shopSchema from "@shared/shop-schema";

neonConfig.webSocketConstructor = ws;

const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "NEON_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const shopPool = new Pool({ 
  connectionString: databaseUrl,
  max: 1, // Limit concurrent connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Handle pool errors to prevent unhandled rejections
shopPool.on('error', (err) => {
  console.error('Database pool error:', err);
});

export const shopDb = drizzle({ client: shopPool, schema: shopSchema });