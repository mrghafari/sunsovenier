import { pool } from "./db";
import { resolveOrderStatus } from "../shared/order-status";
import { buildShopContractSummary } from "../shared/shop-contract-summary";
import type { ContractSigningProgress } from "../shared/contract-signing-progress";

type Queryable = { query: (sql: string, values?: any[]) => Promise<any> };

/** Read-only operational data; never used in the signed document/version hash. */
export async function customerContractProgress(
  customerId: number,
  client: Queryable = pool,
): Promise<Map<number, ContractSigningProgress>> {
  const [contracts, items, orders] = await Promise.all([
    client.query(`SELECT id, number, draft_data, is_active, ended_at
      FROM shop_contracts WHERE customer_id=$1`, [customerId]),
    client.query(`SELECT ci.contract_id, ci.product_id, p.name AS product_name, ci.max_quantity
      FROM shop_contract_items ci
      JOIN shop_contracts c ON c.id=ci.contract_id
      JOIN shop_products p ON p.id=ci.product_id
      WHERE c.customer_id=$1 ORDER BY ci.id`, [customerId]),
    client.query(`SELECT o.contract_id, oi.product_id, oi.quantity, o.status, o.payment_status,
        om.current_status AS workflow_status
      FROM customer_orders o
      JOIN shop_contracts c ON c.id=o.contract_id
      JOIN order_items oi ON oi.order_id=o.id
      LEFT JOIN order_management om ON om.customer_order_id=o.id
      WHERE c.customer_id=$1 AND o.customer_id=$1`, [customerId]),
  ]);
  const shipped = new Map<string, number>();
  for (const row of orders.rows) {
    if (["cancelled", "canceled", "deleted", "failed"].includes(String(row.status).toLowerCase())) continue;
    const status = resolveOrderStatus({
      // This historical dispatch spelling is still present in logistics records.
      orderStatus: row.status === "in_transit" ? "shipped" : row.status,
      workflowStatus: row.workflow_status === "in_transit" ? "logistics_dispatched" : row.workflow_status,
      paymentStatus: row.payment_status,
    }).status;
    // Buying/allocating capacity is not evidence that goods have been shipped.
    if (!["logistics_dispatched", "logistics_delivered", "completed"].includes(status)
      || row.payment_status === "failed") continue;
    const key = `${row.contract_id}:${row.product_id}`;
    shipped.set(key, (shipped.get(key) || 0) + Number(row.quantity));
  }
  return new Map(contracts.rows.map((contract: any) => {
    const summary = buildShopContractSummary({
      id: contract.id, number: contract.number, draftData: contract.draft_data,
      isActive: contract.is_active, endedAt: contract.ended_at,
    }, []);
    const progress: ContractSigningProgress = {
      deliveryDate: summary.deliveryDate, deliveryDateStatus: summary.deliveryDateStatus,
      endedAt: summary.endedAt, isActive: summary.isActive,
      items: items.rows.filter((row: any) => Number(row.contract_id) === Number(contract.id)).map((row: any) => {
        const quantity = Number(row.max_quantity);
        const shippedQuantity = shipped.get(`${row.contract_id}:${row.product_id}`) || 0;
        return {
          productId: Number(row.product_id), productName: row.product_name,
          quantity, shippedQuantity, remainingQuantity: Math.max(0, quantity - shippedQuantity),
        };
      }),
    };
    return [Number(contract.id), progress];
  }));
}
