import { createHash } from "node:crypto";
import { pool } from "./db";
import { releaseHoldWithinTransaction } from "./shop-contracts";
import { ensureCleanupEvidenceGuard } from "./super-admin-cleanup-evidence-guard";
import {
  CleanupError, cleanupSchema, cleanupUnion, dependencyWhere, financialTables, operationalTables,
  ordersEligibility, quoted, removableTables, type CleanupClient, type CleanupSchema,
} from "./super-admin-cleanup-policy";

export type CleanupKind = "orders" | "contract";
export type CleanupActor = { namespace: "admin" | "custom"; id: string };
type Dependency = { table: string; where: string; values: any[]; count: number };
export type CleanupPlan = {
  kind: CleanupKind; ids: number[];
  targets: Array<{ id: number; number: string }>;
  canDelete: boolean; deletionBlockers: string[];
  linkedOrders: Array<{ id: number; orderNumber: string | null }>;
  effects: Array<{ table: string; count: number }>;
  fingerprint: string; dependencies: Dependency[]; holds: any[];
};

export function cleanupIds(kind: unknown, rawIds: unknown): { kind: CleanupKind; ids: number[] } {
  if (!["orders", "contract"].includes(String(kind)) || !Array.isArray(rawIds)
    || !rawIds.length || rawIds.length > 100 || rawIds.some(id => !Number.isSafeInteger(id) || id < 1 || id > 2147483647)
    || (kind === "contract" && rawIds.length !== 1)) throw new CleanupError("INVALID_TARGETS", 400);
  return { kind: kind as CleanupKind, ids: [...new Set<number>(rawIds)].sort((a, b) => a - b) };
}

export async function verifyCleanupActor(client: CleanupClient, actor: CleanupActor) {
  const custom = actor.namespace === "custom";
  const result = await client.query(`SELECT r.name FROM ${custom ? "custom_users" : "users"} u
    JOIN ${custom ? "custom_roles" : "admin_roles"} r ON r.id=u.role_id
    WHERE u.id::text=$1 AND u.is_active=true AND r.is_active=true FOR SHARE OF u,r`, [actor.id]);
  const name = String(result.rows[0]?.name || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!["super_admin", "supper_admin"].includes(name)) throw new CleanupError("SUPER_ADMIN_REQUIRED", 403);
}

export async function cleanupPlan(
  kind: CleanupKind, ids: number[], client: CleanupClient = pool, suppliedSchema?: CleanupSchema,
): Promise<CleanupPlan> {
  const schema = suppliedSchema || await cleanupSchema(client);
  const contracts = kind === "contract"
    ? (await client.query("SELECT * FROM shop_contracts WHERE id=ANY($1::int[]) ORDER BY id", [ids])).rows : [];
  const orders = (await client.query(kind === "contract"
    ? `SELECT * FROM customer_orders WHERE contract_id=ANY($1::int[])
        OR id IN (SELECT order_id FROM shop_contract_order_snapshots WHERE contract_id=ANY($1::int[]))
        OR id IN (SELECT order_id FROM shop_contract_holds WHERE contract_id=ANY($1::int[])) ORDER BY id`
    : "SELECT * FROM customer_orders WHERE id=ANY($1::int[]) ORDER BY id", [ids])).rows;
  if ((kind === "contract" ? contracts.length : orders.length) !== ids.length) throw new CleanupError("TARGET_NOT_FOUND", 404);
  const orderIds = orders.map((row: any) => Number(row.id));
  const management = orderIds.length
    ? (await client.query("SELECT * FROM order_management WHERE customer_order_id=ANY($1::int[]) ORDER BY id", [orderIds])).rows : [];
  const holds = (await client.query(kind === "contract"
    ? "SELECT * FROM shop_contract_holds WHERE contract_id=ANY($1::int[]) OR order_id=ANY($2::int[]) ORDER BY id"
    : "SELECT * FROM shop_contract_holds WHERE order_id=ANY($1::int[]) ORDER BY id",
  kind === "contract" ? [ids, orderIds] : [orderIds])).rows;
  const scope = {
    orderIds, orderNumbers: orders.map((row: any) => row.order_number).filter(Boolean),
    managementIds: management.map((row: any) => Number(row.id)),
    contractIds: kind === "contract" ? ids : [], holdIds: holds.map((row: any) => String(row.id)),
  };
  const reasons = new Set<string>();
  // Legacy shop-order IDs have a different namespace. Never purge an ambiguous
  // identity that a legacy financial writer could still legitimately reference.
  if (schema.has("orders") && orderIds.length) {
    const ambiguous = await client.query("SELECT id FROM orders WHERE id=ANY($1::int[]) LIMIT 1", [orderIds]);
    if (ambiguous.rows.length) reasons.add("UNKNOWN_DEPENDENCY");
  }
  if (kind === "contract" && orders.some((row: any) => row.contract_id != null && !ids.includes(Number(row.contract_id))))
    reasons.add("UNKNOWN_DEPENDENCY");
  if (kind === "contract") {
    const unaccounted = await client.query(`SELECT ci.id FROM shop_contract_items ci
      WHERE ci.contract_id=ANY($1::int[]) AND ci.used_quantity <>
        COALESCE((SELECT sum(hi.quantity) FROM shop_contract_hold_items hi
          JOIN shop_contract_holds h ON h.id=hi.hold_id
          WHERE h.contract_id=ci.contract_id AND hi.product_id=ci.product_id AND h.status<>'released'),0)
      LIMIT 1`, [ids]);
    if (unaccounted.rows.length) reasons.add("ACTIVE_ALLOCATION");
  }
  const eligibility = await ordersEligibility(orderIds, client, schema);
  for (const entry of eligibility.values()) entry.deletionBlockers.forEach(reason => reasons.add(reason));
  const dependencies: Dependency[] = [];
  const candidates: Dependency[] = [];
  const countParts: Array<{ sql: string; values: any[] }> = [];
  // Discover explicit references, including new tables. Unknown dependencies block rather than disappear.
  for (const [table, columns] of schema) {
    if (["customer_orders", "shop_contracts"].includes(table)) continue;
    const where = dependencyWhere(table, columns, scope);
    if (!where.sql) continue;
    candidates.push({ table, where: where.sql, values: where.values, count: 0 });
    const started = table === "cart_inventory_reservations" ? "status='finalized'"
      : table === "production_orders" ? "quantity_produced>0 OR actual_start_date IS NOT NULL OR status NOT IN ('pending','planned','cancelled')"
      : table === "vehicle_delivery_history" ? "delivery_datetime IS NOT NULL OR actual_delivery_time IS NOT NULL OR delivery_status IN ('in_transit','delivered','completed')"
      : "false";
    countParts.push({ sql: `SELECT '${table.replaceAll("'", "''")}'::text AS source,count(*)::int AS count,
      COALESCE(bool_or(${started}),false) AS started FROM ${quoted(table)} WHERE ${where.sql}`, values: where.values });
  }
  for (const row of await cleanupUnion(client, countParts)) {
    const table = String(row.source), count = Number(row.count);
    if (!count) continue;
    dependencies.push({ ...candidates.find(entry => entry.table === table)!, count });
    if (["electronic_contract_signatures", "signed_contract_documents"].includes(table)) reasons.add("SIGNED_CONTRACT");
    else if (financialTables.has(table) || table.startsWith("accounting_")) reasons.add("FINANCIAL_ACTIVITY");
    else if (operationalTables.has(table)) reasons.add("OPERATIONAL_ACTIVITY");
    else if (!removableTables.includes(table)) reasons.add("UNKNOWN_DEPENDENCY");
    if (row.started) reasons.add("OPERATIONAL_ACTIVITY");
  }
  // Also inspect real FK edges, so a new CASCADE child cannot silently erase
  // financial/signed evidence merely because its column has a different name.
  const foreignKeys = (await client.query(`SELECT child.relname AS child,parent.relname AS parent,
      ca.attname AS child_column,pa.attname AS parent_column,array_length(fk.conkey,1) AS key_count
    FROM pg_constraint fk JOIN pg_class child ON child.oid=fk.conrelid
    JOIN pg_class parent ON parent.oid=fk.confrelid
    JOIN pg_namespace ns ON ns.oid=child.relnamespace
    JOIN pg_attribute ca ON ca.attrelid=child.oid AND ca.attnum=fk.conkey[1]
    JOIN pg_attribute pa ON pa.attrelid=parent.oid AND pa.attnum=fk.confkey[1]
    WHERE fk.contype='f' AND ns.nspname=current_schema()`)).rows;
  const parents = new Map(dependencies.map(entry => [entry.table, entry]));
  if (orderIds.length) parents.set("customer_orders", { table: "customer_orders", where: "id=ANY($1::int[])", values: [orderIds], count: orderIds.length });
  if (kind === "contract") parents.set("shop_contracts", { table: "shop_contracts", where: "id=ANY($1::int[])", values: [ids], count: ids.length });
  const fkParts: Array<{ sql: string; values: any[] }> = [];
  for (const fk of foreignKeys) {
    const parent = parents.get(fk.parent);
    if (!parent) continue;
    if (Number(fk.key_count) !== 1) { reasons.add("UNKNOWN_DEPENDENCY"); continue; }
    fkParts.push({ sql: `SELECT '${String(fk.child).replaceAll("'", "''")}'::text AS child,
      count(*)::int AS count FROM ${quoted(fk.child)}
      WHERE ${quoted(fk.child_column)} IN (SELECT ${quoted(fk.parent_column)} FROM ${quoted(parent.table)} WHERE ${parent.where})`,
    values: parent.values });
  }
  for (const fk of await cleanupUnion(client, fkParts)) {
    const count = Number(fk.count);
    if (!count) continue;
    if (["electronic_contract_signatures", "signed_contract_documents"].includes(fk.child)) reasons.add("SIGNED_CONTRACT");
    else if (financialTables.has(fk.child) || fk.child.startsWith("accounting_")) reasons.add("FINANCIAL_ACTIVITY");
    else if (count > (parents.get(fk.child)?.count || 0)) reasons.add("UNKNOWN_DEPENDENCY");
  }
  const targets = (kind === "contract" ? contracts : orders).map((row: any) => ({
    id: Number(row.id), number: String(row.number ?? row.order_number ?? `ID ${row.id}`),
  }));
  const effects = dependencies.map(({ table, count }) => ({ table, count }));
  if (orders.length) effects.push({ table: "customer_orders", count: orders.length });
  if (contracts.length) effects.push({ table: "shop_contracts", count: contracts.length });
  const deletionBlockers = [...reasons].sort();
  const fingerprint = createHash("sha256").update(JSON.stringify({
    kind, ids, orders, contracts, management, holds, effects, deletionBlockers,
  })).digest("hex");
  return { kind, ids, targets, canDelete: !reasons.size, deletionBlockers,
    linkedOrders: orders.map((row: any) => ({ id: Number(row.id), orderNumber: row.order_number })),
    effects, fingerprint, dependencies, holds };
}

export async function deleteCleanup(
  kind: CleanupKind, ids: number[], expectedFingerprint: string, actor: CleanupActor,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout='5s'");
    await verifyCleanupActor(client, actor);
    const schema = await cleanupSchema(client);
    // Parent contracts first, matching edits and signing completion's lock order.
    const parentIds = kind === "contract" ? ids : (await client.query(
      `SELECT contract_id FROM customer_orders WHERE id=ANY($1::int[]) AND contract_id IS NOT NULL
       UNION SELECT contract_id FROM shop_contract_order_snapshots WHERE order_id=ANY($1::int[])
       UNION SELECT contract_id FROM shop_contract_holds WHERE order_id=ANY($1::int[])`, [ids])).rows.map(row => Number(row.contract_id));
    if (parentIds.length) await client.query("SELECT id FROM shop_contracts WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE", [parentIds]);
    await client.query(kind === "contract"
      ? `SELECT id FROM customer_orders WHERE contract_id=ANY($1::int[])
          OR id IN (SELECT order_id FROM shop_contract_order_snapshots WHERE contract_id=ANY($1::int[]))
          OR id IN (SELECT order_id FROM shop_contract_holds WHERE contract_id=ANY($1::int[])) ORDER BY id FOR UPDATE`
      : "SELECT id FROM customer_orders WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE", [ids]);
    // Keep financial/dependent writes out of the check-to-delete window.
    const lockTables = [...schema.keys()].filter(table => !table.startsWith("loading_")
      && !["customer_orders", "shop_contracts"].includes(table)
      && (financialTables.has(table) || operationalTables.has(table) || removableTables.includes(table)
        || ["order_id", "customer_order_id", "order_management_id", "contract_id", "parent_contract_id", "hold_id"]
          .some(column => schema.get(table)!.has(column)))).sort();
    if (lockTables.length) await client.query(`LOCK TABLE ${lockTables.map(quoted).join(",")} IN SHARE ROW EXCLUSIVE MODE`);
    const plan = await cleanupPlan(kind, ids, client, schema);
    if (!plan.canDelete) throw new CleanupError(plan.deletionBlockers[0]);
    if (plan.fingerprint !== expectedFingerprint) throw new CleanupError("PREVIEW_CHANGED");
    await ensureCleanupEvidenceGuard(client, schema);
    for (const hold of plan.holds) await releaseHoldWithinTransaction(client, hold.id);
    // Holds release capacity; they never reverse payments or deduct physical stock.
    for (const table of removableTables) {
      const dependency = plan.dependencies.find(entry => entry.table === table);
      if (dependency) await client.query(`DELETE FROM ${quoted(table)} WHERE ${dependency.where}`, dependency.values);
    }
    const orderIds = plan.linkedOrders.map(row => row.id);
    if (orderIds.length) await client.query("DELETE FROM customer_orders WHERE id=ANY($1::int[])", [orderIds]);
    if (kind === "contract") await client.query("DELETE FROM shop_contracts WHERE id=ANY($1::int[])", [ids]);
    await client.query("COMMIT");
    return { deletedIds: ids, deletedCount: ids.length };
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (error?.code === "23503") throw new CleanupError("UNKNOWN_DEPENDENCY");
    if (["55P03", "40P01", "40001"].includes(error?.code)) throw new CleanupError("PREVIEW_CHANGED");
    throw error;
  } finally { client.release(); }
}
