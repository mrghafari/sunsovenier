import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pool } from "../server/db";

// Explicit developer operation only; never imported by application startup/build.
if (process.env.NODE_ENV !== "development") throw new Error("This migration runner is development-only");
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(718392, 0)");
  await client.query(`CREATE TABLE IF NOT EXISTS accounting_schema_migrations (
    name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const files = [
    "migrations/accounting/0000_strange_praxagora.sql",
    "server/modules/accounting/0001_ledger_guards.sql",
    "server/modules/accounting/0002_ledger_hardening.sql",
  ];
  for (const file of files) {
    const content = await readFile(file,"utf8");
    const checksum = createHash("sha256").update(content).digest("hex");
    const done = await client.query("SELECT checksum FROM accounting_schema_migrations WHERE name=$1",[file]);
    if (done.rows[0]) {
      if (done.rows[0].checksum !== checksum) throw new Error(`Applied migration was changed: ${file}`);
      console.log(`Already applied: ${file}`); continue;
    }
    await client.query(content);
    await client.query("INSERT INTO accounting_schema_migrations(name,checksum) VALUES($1,$2)",[file,checksum]);
    console.log(`Applied: ${file}`);
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK"); throw error;
} finally { client.release(); await pool.end(); }