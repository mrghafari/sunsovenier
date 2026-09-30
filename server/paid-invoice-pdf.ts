import { pool } from "./db";
import { generateInvoicePDF } from "./pdfkit-generator";

export type PaidInvoiceLanguage = "en" | "ar" | "tr" | "fa";

export async function loadPaidInvoice(orderId: number) {
  const { rows } = await pool.query(`
    SELECT co.id, co.order_number, co.created_at, co.total_amount, co.currency,
      co.shipping_cost, co.vat_amount, co.surcharge_amount, co.payment_method,
      co.status, c.first_name, c.last_name,
      COALESCE(NULLIF(TRIM(c.email), ''), NULLIF(TRIM(co.guest_email), '')) AS email,
      c.phone, c.address,
      c.city_region, c.province, c.preferred_language
    FROM customer_orders co
    LEFT JOIN crm_customers c ON c.id = co.customer_id
    WHERE co.id = $1
      AND (co.status IN ('completed', 'delivered')
           OR co.payment_method IN ('wallet_full', 'wallet_partial', 'bank_transfer'))
      AND co.status NOT IN ('cancelled', 'failed', 'deleted', 'payment_failed', 'expired')
      AND co.payment_status IS DISTINCT FROM 'failed'
  `, [orderId]);
  if (!rows.length) return null;
  const items = await pool.query(`
    SELECT product_name, quantity, unit_price, total_price
    FROM order_items WHERE order_id = $1 ORDER BY id
  `, [orderId]);
  return { order: rows[0], items: items.rows };
}

export async function createPaidInvoicePdf(
  invoice: NonNullable<Awaited<ReturnType<typeof loadPaidInvoice>>>,
  language: PaidInvoiceLanguage,
) {
  const { order, items } = invoice;
  const shipping = Number(order.shipping_cost || 0);
  const vat = Number(order.vat_amount || 0);
  const surcharge = Number(order.surcharge_amount || 0);
  return generateInvoicePDF({
    invoiceType: "FINAL",
    invoiceNumber: order.order_number,
    orderNumber: order.order_number,
    invoiceDate: order.created_at,
    language,
    customer: {
      name: [order.first_name, order.last_name].filter(Boolean).join(" ") || order.email || "Customer",
      email: order.email || "",
      phone: order.phone || "",
      address: [order.address, order.city_region, order.province].filter(Boolean).join(", "),
    },
    items: items.map(item => ({
      name: item.product_name || "Product",
      quantity: item.quantity,
      unitPrice: item.unit_price,
      total: item.total_price,
    })),
    subtotal: Number(order.total_amount || 0) - shipping - vat - surcharge,
    vatAmount: order.vat_amount || 0,
    dutiesAmount: order.surcharge_amount || 0,
    shippingCost: order.shipping_cost || 0,
    total: order.total_amount,
    currency: order.currency || "IQD",
    paymentMethod: order.payment_method,
    paymentStatus: order.status,
  });
}