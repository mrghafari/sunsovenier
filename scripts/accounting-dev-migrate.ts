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
    "server/modules/accounting/0003_transactional_outbox.sql",
    "server/modules/accounting/0004_event_capture_hardening.sql",
    "server/modules/accounting/0005_wallet_liability.sql",
    "server/modules/accounting/0006_wallet_write_guards.sql",
    "server/modules/accounting/0007_receipts.sql",
    "server/modules/accounting/0008_receipt_wallet_guard_hardening.sql",
    "server/modules/accounting/0009_persian_rial.sql",
    "server/modules/accounting/0010_wallet_settlement.sql",
    "server/modules/accounting/0011_wallet_settlement_evidence.sql",
    "server/modules/accounting/0012_wallet_carrying_values.sql",
    "server/modules/accounting/0013_foreign_receipts.sql",
    "server/modules/accounting/0014_receipt_guard_alias.sql",
    "server/modules/accounting/0015_foreign_cheques.sql",
    "server/modules/accounting/0016_cheque_debt_settlement.sql",
    "server/modules/accounting/0017_receipt_returns.sql",
    "server/modules/accounting/0018_manual_documents.sql",
    "server/modules/accounting/0019_foreign_manual_expenses.sql",
    "server/modules/accounting/0020_manual_expense_revenue_mapping.sql",
    "server/modules/accounting/0021_manual_expense_trigger_rows.sql",
    "server/modules/accounting/0022_credit_approval.sql",
    "server/modules/accounting/0023_credit_orders.sql",
    "server/modules/accounting/0024_loading_shipping.sql",
    "server/modules/accounting/0025_contract_loading_weight.sql",
    "server/modules/accounting/0026_contract_weight_review_guards.sql",
    "server/modules/accounting/0027_commercial_actor_namespaces.sql",
    "server/modules/accounting/0028_weight_review_active_company.sql",
    "server/modules/accounting/0029_inventory_documents.sql",
    "server/modules/accounting/0030_inventory_review_timestamp.sql",
    "server/modules/accounting/0031_mixed_role_identity_comparison.sql",
    "server/modules/accounting/0032_inventory_line_alias.sql",
    "server/modules/accounting/0033_loading_invoice_pipeline.sql",
    "server/modules/accounting/0034_loading_live_gate_guard.sql",
    "server/modules/accounting/0035_stock_book_currency_guard.sql",
    "server/modules/accounting/0036_loading_fifo_chronology.sql",
    "server/modules/accounting/0037_stock_ledger_parity.sql",
    "server/modules/accounting/0038_inventory_capitalization.sql",
    "server/modules/accounting/0039_capitalization_document_cost_cast.sql",
    "server/modules/accounting/0040_foreign_loading_invoices.sql",
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