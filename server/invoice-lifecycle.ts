import { pool } from "./db";

/**
 * Rejected financial payments invalidate a proforma. Keep an auditable marker
 * instead of deleting the order, while ensuring it cannot be downloaded or
 * picked up by automatic invoice conversion later.
 */
export async function voidRejectedOrderProforma(customerOrderId: number): Promise<boolean> {
  const result = await pool.query(`
    UPDATE customer_orders
    SET invoice_type = 'voided',
        invoice_converted_at = NULL,
        updated_at = NOW()
    WHERE id = $1
      AND invoice_type = 'proforma'
    RETURNING id
  `, [customerOrderId]);

  return (result.rowCount || 0) > 0;
}