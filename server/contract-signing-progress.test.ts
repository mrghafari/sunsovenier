import assert from "node:assert/strict";
import test from "node:test";
import { customerContractProgress } from "./contract-signing-progress";

test("contract progress counts dispatched items, not reservations or pending/cancelled orders", async () => {
  const statements: Array<{ sql: string; values: any[] }> = [];
  const client = { query: async (sql: string, values: any[] = []) => {
    statements.push({ sql, values });
    if (sql.includes("FROM shop_contracts WHERE")) return { rows: [
      { id: 1, number: "TEST-C", draft_data: { delivery: { date: "2026-12-01" } }, is_active: true, ended_at: null },
      { id: 2, number: "TEST-ENDED", draft_data: { delivery: { date: "invalid" } }, is_active: false, ended_at: "2026-01-01" },
      { id: 3, number: "TEST-EMPTY", draft_data: null, is_active: false, ended_at: null },
    ] };
    if (sql.includes("FROM shop_contract_items")) return { rows: [
      { contract_id: 1, product_id: 10, product_name: "Product A", max_quantity: 100 },
      { contract_id: 1, product_id: 20, product_name: "Product B", max_quantity: 20 },
      { contract_id: 2, product_id: 10, product_name: "Product A", max_quantity: 10 },
    ] };
    return { rows: [
      { contract_id: 1, product_id: 10, quantity: "15.5", status: "shipped" },
      { contract_id: 1, product_id: 10, quantity: "4.5", status: "processing", workflow_status: "logistics_delivered" },
      { contract_id: 1, product_id: 10, quantity: "30", status: "pending" },
      { contract_id: 1, product_id: 10, quantity: "40", status: "cancelled", workflow_status: "logistics_dispatched" },
      { contract_id: 1, product_id: 10, quantity: "10", status: "deleted", workflow_status: "logistics_dispatched" },
      { contract_id: 1, product_id: 10, quantity: "10", status: "shipped", payment_status: "failed" },
      { contract_id: 1, product_id: 20, quantity: "25", status: "in_transit" },
      { contract_id: 2, product_id: 10, quantity: "6", status: "completed" },
    ] };
  } };
  const progress = await customerContractProgress(123, client);
  assert.deepEqual(progress.get(1)?.items, [
    { productId: 10, productName: "Product A", quantity: 100, shippedQuantity: 20, remainingQuantity: 80 },
    { productId: 20, productName: "Product B", quantity: 20, shippedQuantity: 25, remainingQuantity: 0 },
  ]);
  assert.equal(progress.get(1)?.deliveryDate, "2026-12-01");
  assert.equal(progress.get(2)?.deliveryDateStatus, "unparseable");
  assert.equal(progress.get(2)?.items[0].shippedQuantity, 6);
  assert.equal(progress.get(2)?.endedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(progress.get(3)?.deliveryDateStatus, "unset");
  assert.deepEqual(progress.get(3)?.items, []);
  assert.equal(statements.length, 3, "queries must be batched, not per document");
  assert.ok(statements.every(({ values }) => values[0] === 123));
  assert.match(statements[2].sql, /c.customer_id=\$1 AND o.customer_id=\$1/);
});
