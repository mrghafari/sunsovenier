import { pool } from "./db";
import { cleanupSchema, cleanupUnion, quoted, type CleanupClient, type CleanupSchema } from "./super-admin-cleanup-policy";

const shippedStatuses = /^(shipped|in_transit|delivered|completed|logistics_dispatched|logistics_delivered|carrier_dispatched|delivery_in_progress)$/i;
export function shipmentBlockers(order: any, management?: any) {
  if (order.status === "deleted") return ["ALREADY_REMOVED"];
  return order.shipped_at || order.delivered_at || order.actual_delivery ||
    management?.carrier_dispatched_at || management?.verified_at ||
    shippedStatuses.test(String(order.status || "")) || shippedStatuses.test(String(management?.current_status || ""))
    ? ["SHIPPED"] : [];
}
export async function removalEligibility(ids: number[], client: CleanupClient = pool, supplied?: CleanupSchema) {
  const result = new Map<number, { canDelete: boolean; deletionBlockers: string[] }>();
  if (!ids.length) return result;
  const schema = supplied || await cleanupSchema(client);
  const orders = (await client.query("SELECT * FROM customer_orders WHERE id=ANY($1::int[])", [ids])).rows;
  const management = (await client.query("SELECT * FROM order_management WHERE customer_order_id=ANY($1::int[])", [ids])).rows;
  const numbers = orders.map(row => row.order_number);
  const evidence: Array<{ sql: string; values: any[] }> = [];
  const conditions: Record<string, string[]> = {
    vehicle_delivery_history: ["actual_delivery_time IS NOT NULL",
      "delivery_status IN ('in_transit','shipped','delivered','completed')"],
    gps_delivery_confirmations: ["true"],
    goods_in_transit: ["actual_delivery_date IS NOT NULL", "status IN ('in_transit','shipped','delivered','completed')"],
    logistics_orders: ["shipped_at IS NOT NULL", "dispatched_at IS NOT NULL",
      "status IN ('shipped','in_transit','delivered','completed','dispatched')"],
    order_status_history: ["new_status IN ('shipped','in_transit','delivered','completed','logistics_dispatched','logistics_delivered')"],
    workflow_transitions: ["to_status IN ('shipped','in_transit','delivered','completed','logistics_dispatched','logistics_delivered')"],
    accounting_operational_facts: ["event_type IN ('OrderShipped','OrderDelivered')"],
  };
  for (const [table, expressions] of Object.entries(conditions)) {
    const columns = schema.get(table);
    if (!columns) continue;
    const checks = expressions.filter(expression => expression === "true" || columns.has(expression.split(" ")[0]))
      .map(expression => expression === "true" ? expression : `e.${expression}`);
    if (!checks.length) continue;
    const orderColumn = columns.has("customer_order_id") ? "customer_order_id" : columns.has("order_id") ? "order_id" : null;
    if (orderColumn) evidence.push({ sql: `SELECT e.${quoted(orderColumn)} AS id FROM ${quoted(table)} e
      WHERE e.${quoted(orderColumn)}=ANY($1::int[]) AND (${checks.join(" OR ")})`, values: [ids] });
    else if (columns.has("order_management_id")) evidence.push({ sql: `SELECT m.customer_order_id AS id FROM ${quoted(table)} e
      JOIN order_management m ON m.id=e.order_management_id WHERE m.customer_order_id=ANY($1::int[]) AND (${checks.join(" OR ")})`, values: [ids] });
    else if (columns.has("order_number")) evidence.push({ sql: `SELECT o.id FROM ${quoted(table)} e
      JOIN customer_orders o ON o.order_number=e.order_number WHERE e.order_number=ANY($1::text[]) AND (${checks.join(" OR ")})`, values: [numbers] });
  }
  const historicalShipped = new Set((await cleanupUnion(client, evidence)).map(row => Number(row.id)));
  const removed = new Set((await client.query(
    "SELECT target_id FROM super_admin_removals WHERE kind='orders' AND target_id=ANY($1::int[])", [ids])).rows.map(row => Number(row.target_id)));
  for (const order of orders) {
    const reasons = new Set(shipmentBlockers(order, management.find(row => Number(row.customer_order_id) === Number(order.id))));
    if (historicalShipped.has(Number(order.id))) reasons.add("SHIPPED");
    if (removed.has(Number(order.id))) reasons.add("ALREADY_REMOVED");
    result.set(Number(order.id), { canDelete: !reasons.size, deletionBlockers: [...reasons].sort() });
  }
  return result;
}
