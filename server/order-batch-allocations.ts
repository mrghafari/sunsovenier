import { pool } from "./db";

export interface SoldBatchAllocation {
  batchNumber: string;
  quantity: number;
  expiryDate: Date | string | null;
}

export async function getSoldBatchAllocationsByProduct(
  orderId: number,
): Promise<Record<number, SoldBatchAllocation[]>> {
  const finalizedReservations = await pool.query<{
    product_id: number;
    showcase_product_id: number;
    batch_number: string | null;
    quantity: number;
    expiry_date: Date | null;
    status: string;
  }>(`
    SELECT
      cir.shop_product_id AS product_id,
      cir.showcase_product_id,
      sp.batch_number,
      cir.quantity,
      sp.expiry_date,
      cir.status
    FROM cart_inventory_reservations cir
    JOIN showcase_products sp ON sp.id = cir.showcase_product_id
    WHERE cir.order_id = $1
    ORDER BY cir.id ASC
  `, [orderId]);

  const allocations = finalizedReservations.rows.length > 0
    ? finalizedReservations.rows
      .filter(row => row.status === 'finalized')
      .map(row => ({
        productId: row.product_id,
        batchNumber: row.batch_number?.trim() || `#${row.showcase_product_id}`,
        quantity: Number(row.quantity),
        expiryDate: row.expiry_date,
      }))
    : (await pool.query<{
        product_id: number;
        batch_number: string;
        quantity_sold: number;
        batch_expiry_date: Date | null;
      }>(`
        SELECT
          shop.id AS product_id,
          tracking.batch_number,
          tracking.quantity AS quantity_sold,
          NULL::timestamp AS batch_expiry_date
        FROM batch_sales_tracking tracking
        JOIN shop_products shop
          ON TRIM(shop.barcode) = TRIM(tracking.product_barcode)
        WHERE tracking.order_id = $1
        ORDER BY tracking.id ASC
      `, [orderId])).rows.map(row => ({
        productId: row.product_id,
        batchNumber: row.batch_number,
        quantity: Number(row.quantity_sold),
        expiryDate: row.batch_expiry_date,
      }));

  return allocations.reduce<Record<number, SoldBatchAllocation[]>>((grouped, allocation) => {
    if (!grouped[allocation.productId]) grouped[allocation.productId] = [];
    grouped[allocation.productId].push({
      batchNumber: allocation.batchNumber,
      quantity: allocation.quantity,
      expiryDate: allocation.expiryDate,
    });
    return grouped;
  }, {});
}