import { pool } from "./db";

export type CleanupClient = { query: (sql: string, values?: any[]) => Promise<any> };
export type CleanupSchema = Map<string, Set<string>>;
export class CleanupError extends Error {
  constructor(public code: string, public status = 409) { super(code); }
}
export const quoted = (name: string) => `"${name.replaceAll('"', '""')}"`;
export async function cleanupUnion(client: CleanupClient, parts: Array<{ sql: string; values: any[] }>) {
  if (!parts.length) return [];
  const values: any[] = [];
  const queries = parts.map(part => {
    const offset = values.length;
    values.push(...part.values);
    return part.sql.replace(/\$(\d+)/g, (_match, position) => `$${Number(position) + offset}`);
  });
  return (await client.query(queries.join(" UNION ALL "), values)).rows;
}

export async function cleanupSchema(client: CleanupClient): Promise<CleanupSchema> {
  const result = await client.query(`SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema=current_schema() AND table_name IN
      (SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_type='BASE TABLE')
    ORDER BY table_name, ordinal_position`);
  const schema: CleanupSchema = new Map();
  for (const row of result.rows) {
    if (!schema.has(row.table_name)) schema.set(row.table_name, new Set());
    schema.get(row.table_name)!.add(row.column_name);
  }
  for (const table of ["customer_orders", "order_management", "shop_contracts", "shop_contract_holds",
    "shop_contract_items", "shop_contract_hold_items", "shop_contract_order_snapshots",
    "shop_contract_addenda", "order_items", "electronic_contract_signatures", "signed_contract_documents"]) {
    if (!schema.has(table)) throw new CleanupError("SCHEMA_UNAVAILABLE", 503);
  }
  return schema;
}

/** All financial evidence is protected, including failed/released/refunded history. */
export const financialTables = new Set([
  "payment_receipts", "wallet_transactions", "fib_payments", "financial_transactions",
  "invoices", "vendor_transactions", "accounting_operational_facts", "accounting_credit_orders",
  "accounting_wallet_orders", "accounting_wallet_holds", "accounting_receivable_items",
  "accounting_loading_shipping", "accounting_loading_weight_reviews",
]);
export const operationalTables = new Set([
  "gps_delivery_confirmations", "goods_in_transit", "shop_inventory_movements",
  "batch_sales_tracking", "inventory_transactions", "inventory_movements",
]);
export const removableTables = [
  "order_status_history", "workflow_transitions", "delivery_codes", "order_locks", "delivery_verification_codes",
  "consolidated_order_data", "logistics_orders", "vehicle_delivery_history",
  "vehicle_selection_history", "production_orders", "abandoned_orders",
  "proforma_reminder_logs", "shipping_calculation_logs", "cart_inventory_reservations",
  "order_items", "shop_contract_order_snapshots", "shop_contract_hold_items",
  "shop_contract_holds", "contract_signing_challenges", "shop_contract_addenda",
  "shop_contract_items", "order_management",
];

export function orderBlockers(order: any, management?: any): string[] {
  const reasons = new Set<string>();
  if (!["pending", "failed", "cancelled", "canceled", "deleted", "grace_period", "unpaid"].includes(
    String(order.payment_status || "pending").toLowerCase())
    || order.receipt_path || order.payment_transaction_id || order.invoice_converted_at
    || /^(wallet_full|wallet_partial|hybrid|online_payment)$/.test(String(order.payment_method))
    || ["official_invoice", "official"].includes(String(order.invoice_type))
    || management?.financial_reviewed_at || management?.financial_reviewer_id || management?.payment_receipt_url
    || ["wallet_amount_used", "bank_amount_paid", "excess_amount_credited"].some(key => {
      const amount = Number(management?.[key] ?? 0);
      return !Number.isFinite(amount) || amount !== 0;
    })) {
    reasons.add("FINANCIAL_ACTIVITY");
  }
  if (order.shipped_at || order.delivered_at || order.actual_delivery
    || management?.warehouse_processed_at || management?.logistics_processed_at
    || management?.carrier_dispatched_at || management?.verified_at
    || /^(shipped|in_transit|delivered|completed|logistics_dispatched|logistics_delivered)$/.test(String(order.status))) {
    reasons.add("OPERATIONAL_ACTIVITY");
  }
  return [...reasons];
}

export type CleanupScope = {
  orderIds: number[]; orderNumbers: string[]; managementIds: number[];
  contractIds: number[]; holdIds: string[];
};

/** Only explicit identity columns, never customer-wide or substring matching. */
export function dependencyWhere(table: string, columns: Set<string>, scope: CleanupScope) {
  // This independent module uses UUID loading-order identities, not shop orders.
  if (table.startsWith("loading_")) return { sql: "", values: [] as any[] };
  const clauses: string[] = [], values: any[] = [];
  const add = (column: string, ids: Array<number | string>) => {
    if (!columns.has(column) || !ids.length) return;
    values.push(ids.map(String));
    clauses.push(`${quoted(column)}::text = ANY($${values.length}::text[])`);
  };
  add("customer_order_id", scope.orderIds);
  add("order_id", scope.orderIds);
  add("order_management_id", scope.managementIds);
  // Standalone loading orders and numbered procedure outlines have their own namespaces.
  if (["orders", "vehicle_selection_history", "vehicle_delivery_history", "production_orders",
    "consolidated_order_data", "fib_payments"].includes(table)) add("order_number", scope.orderNumbers);
  if (table === "abandoned_orders") add("hybrid_order_number", scope.orderNumbers);
  add("contract_id", scope.contractIds);
  add("parent_contract_id", scope.contractIds);
  add("hold_id", scope.holdIds);
  if (["wallet_transactions", "inventory_movements", "inventory_transactions"].includes(table)
    && columns.has("reference_id") && columns.has("reference_type") && scope.orderIds.length) {
    values.push(scope.orderIds.map(String));
    clauses.push(`(reference_id::text = ANY($${values.length}::text[]) AND reference_type IN ('order','customer_order'))`);
  }
  return { sql: clauses.length ? clauses.map(clause => `(${clause})`).join(" OR ") : "", values };
}

export async function ordersEligibility(
  ids: number[], client: CleanupClient = pool, providedSchema?: CleanupSchema,
): Promise<Map<number, { canDelete: boolean; deletionBlockers: string[] }>> {
  if (!ids.length) return new Map();
  const schema = providedSchema || await cleanupSchema(client);
  const orders = (await client.query("SELECT * FROM customer_orders WHERE id=ANY($1::int[])", [ids])).rows;
  const management = (await client.query("SELECT * FROM order_management WHERE customer_order_id=ANY($1::int[])", [ids])).rows;
  const results = new Map<number, Set<string>>();
  for (const order of orders) results.set(Number(order.id), new Set(orderBlockers(order,
    management.find((row: any) => Number(row.customer_order_id) === Number(order.id)))));
  const extraParents = (await client.query(`SELECT contract_id FROM shop_contract_order_snapshots WHERE order_id=ANY($1::int[])
    UNION SELECT contract_id FROM shop_contract_holds WHERE order_id=ANY($1::int[])`, [ids])).rows;
  const parentIds = [...new Set<number>([...orders, ...extraParents].map((row: any) => Number(row.contract_id)).filter(Boolean))];
  const scope: CleanupScope = { orderIds: ids, orderNumbers: orders.map((row: any) => row.order_number).filter(Boolean),
    managementIds: management.map((row: any) => Number(row.id)), contractIds: [], holdIds: [] };
  const evidenceParts: Array<{ sql: string; values: any[] }> = [];
  for (const [table, columns] of schema) {
    if (!financialTables.has(table) && !operationalTables.has(table)) continue;
    const where = dependencyWhere(table, columns, scope);
    if (!where.sql) continue;
    const keys = ["customer_order_id", "order_id", "order_number", "reference_id", "reference_type"].filter(column => columns.has(column));
    evidenceParts.push({ sql: `SELECT DISTINCT '${table.replaceAll("'", "''")}'::text AS source,
      jsonb_build_object(${keys.map(key => `'${key}',${quoted(key)}`).join(",")}) AS evidence
      FROM ${quoted(table)} WHERE ${where.sql}`, values: where.values });
  }
  for (const evidence of await cleanupUnion(client, evidenceParts)) {
    const row = evidence.evidence;
    for (const order of orders) {
      const matches = Number(row.customer_order_id ?? row.order_id) === Number(order.id)
        || (row.order_number && row.order_number === order.order_number)
        || (["order", "customer_order"].includes(row.reference_type) && Number(row.reference_id) === Number(order.id));
      if (matches) results.get(Number(order.id))!.add(financialTables.has(evidence.source) ? "FINANCIAL_ACTIVITY" : "OPERATIONAL_ACTIVITY");
    }
  }
  if (parentIds.length) {
    for (const table of ["electronic_contract_signatures", "signed_contract_documents"]) {
      const signed = (await client.query(`SELECT DISTINCT contract_id FROM ${quoted(table)} WHERE contract_id=ANY($1::int[])`, [parentIds])).rows;
      const signedIds = new Set(signed.map((row: any) => Number(row.contract_id)));
      for (const order of orders) if (signedIds.has(Number(order.contract_id))) results.get(Number(order.id))!.add("SIGNED_CONTRACT");
    }
  }
  return new Map([...results].map(([id, reasons]) => [id, { canDelete: !reasons.size, deletionBlockers: [...reasons].sort() }]));
}
