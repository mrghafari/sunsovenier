import { financialTables, quoted, type CleanupClient, type CleanupSchema } from "./super-admin-cleanup-policy";

/**
 * Install transactionally before the first purge. Table locks cover in-flight
 * evidence writes; key-share reference checks cover stale writers after commit.
 * These guards create no business/audit/tombstone rows and never change balances.
 */
export async function ensureCleanupEvidenceGuard(client: CleanupClient, schema: CleanupSchema) {
  const namespace = String((await client.query("SELECT current_schema() AS name")).rows[0].name);
  const functionName = `${quoted(namespace)}.super_admin_cleanup_live_order`;
  const statements = [`CREATE OR REPLACE FUNCTION ${functionName}() RETURNS trigger
    LANGUAGE plpgsql SET search_path TO ${quoted(namespace)},pg_catalog AS $cleanup_guard$
    DECLARE source_order_id bigint;
    BEGIN
      IF TG_ARGV[0]='reference_id' AND
        COALESCE(to_jsonb(NEW)->>'reference_type','') NOT IN ('order','customer_order') THEN
        RETURN NEW;
      END IF;
      source_order_id := NULLIF(to_jsonb(NEW)->>TG_ARGV[0],'')::bigint;
      IF source_order_id IS NULL THEN RETURN NEW; END IF;
      PERFORM id FROM customer_orders WHERE id=source_order_id FOR KEY SHARE;
      IF FOUND THEN RETURN NEW; END IF;
      IF TG_ARGV[1]='legacy_shop' THEN
        PERFORM id FROM orders WHERE id=source_order_id FOR KEY SHARE;
        IF FOUND THEN RETURN NEW; END IF;
      END IF;
      RAISE EXCEPTION USING ERRCODE='23503',MESSAGE='The referenced order no longer exists.';
    END;
    $cleanup_guard$`];
  for (const [table, columns] of schema) {
    if (!financialTables.has(table) && !table.startsWith("accounting_")) continue;
    const column = table === "wallet_transactions" ? "reference_id"
      : columns.has("customer_order_id") ? "customer_order_id" : "order_id";
    if (!columns.has(column)) continue;
    const legacy = ["financial_transactions", "invoices"].includes(table) && schema.has("orders");
    const changedColumns = column === "reference_id" ? '"reference_id","reference_type"' : quoted(column);
    statements.push(`DROP TRIGGER IF EXISTS super_admin_cleanup_order_reference ON ${quoted(table)}`);
    statements.push(`CREATE TRIGGER super_admin_cleanup_order_reference
      BEFORE INSERT OR UPDATE OF ${changedColumns} ON ${quoted(table)}
      FOR EACH ROW EXECUTE FUNCTION ${functionName}('${column}','${legacy ? "legacy_shop" : "customer"}')`);
  }
  await client.query(statements.join(";\n"));
}
