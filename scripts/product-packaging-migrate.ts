import { readFile } from "node:fs/promises";
import { pool } from "../server/db";

if (process.env.NODE_ENV !== "development") {
  throw new Error("Development-only additive migration; apply the SQL migration with your production release.");
}
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout='5s'");
  await client.query("SET LOCAL statement_timeout='30s'");
  await client.query("SELECT pg_advisory_xact_lock(718392,20)");
  await client.query(await readFile(new URL("../migrations/0020_product_packaging_specifications.sql", import.meta.url), "utf8"));
  await client.query("COMMIT");
  const result = await client.query(`SELECT column_name,data_type FROM information_schema.columns
    WHERE table_name='showcase_products' AND column_name='packaging_specifications'`);
  if (result.rows.length !== 1) throw new Error("Packaging column was not created.");
  console.log("Packaging specifications column ready:", result.rows[0]);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
