// =============================================================================
// AUTOMATIC INVOICE CONVERSION SERVICE
// =============================================================================
// This service automatically converts proforma invoices to invoices
// when orders are shipped or delivered from warehouse

import { db, pool } from './db';
import { customerOrders } from '@shared/customer-schema';
import { eq } from 'drizzle-orm';
import ProformaInvoiceConverter from './proforma-invoice-converter';

export class AutoInvoiceConverter {
  /**
   * Auto-convert proforma to invoice when order status changes to shipped/delivered
   */
  static async handleOrderStatusChange(orderNumber: string, newStatus: string): Promise<boolean> {
    try {
      // These workflow aliases all represent an order that has left warehouse.
      if (![
        'warehouse_approved',
        'logistics_approved',
        'logistics_assigned',
        'logistics_dispatched',
        'in_transit',
        'shipped',
        'delivered',
        'logistics_delivered',
        'completed',
      ].includes(newStatus)) {
        return false;
      }

      console.log(`🚀 [AUTO INVOICE] Order ${orderNumber} status changed to ${newStatus} - checking for conversion`);

      // Get order details
      const [order] = await db
        .select()
        .from(customerOrders)
        .where(eq(customerOrders.orderNumber, orderNumber));

      if (!order) {
        console.log(`❌ [AUTO INVOICE] Order not found: ${orderNumber}`);
        return false;
      }

      // Check if it's currently a proforma
      if (order.invoiceType !== 'proforma') {
        console.log(`ℹ️ [AUTO INVOICE] Order ${orderNumber} is already ${order.invoiceType} - no conversion needed`);
        return false;
      }

      // Convert proforma to invoice
      console.log(`🔄 [AUTO INVOICE] Converting order ${orderNumber} from proforma to invoice automatically`);
      
      const success = await ProformaInvoiceConverter.convertProformaToInvoice(orderNumber);
      
      if (success) {
        console.log(`✅ [AUTO INVOICE] Successfully auto-converted order ${orderNumber} to invoice`);
        return true;
      } else {
        console.log(`❌ [AUTO INVOICE] Failed to auto-convert order ${orderNumber}`);
        return false;
      }

    } catch (error) {
      console.error(`💥 [AUTO INVOICE] Error in auto-conversion for order ${orderNumber}:`, error);
      return false;
    }
  }

  /**
   * Batch convert all shipped/delivered orders that are still proforma
   */
  static async convertAllEligibleOrders(): Promise<number> {
    try {
      console.log(`🔍 [AUTO INVOICE] Checking for shipped/delivered proforma orders...`);

      // Finalized batch allocations are the authoritative sale signal. Workflow
      // aliases remain as a fallback for legacy orders without reservations.
      const eligibleResult = await pool.query<{ order_number: string }>(`
        SELECT DISTINCT co.order_number
        FROM customer_orders co
        LEFT JOIN order_management om ON om.customer_order_id = co.id
        WHERE co.invoice_type = 'proforma'
          AND (
            EXISTS (
              SELECT 1
              FROM cart_inventory_reservations cir
              WHERE cir.order_id = co.id
                AND cir.status = 'finalized'
            )
            OR co.status IN ('warehouse_ready', 'in_transit', 'shipped', 'delivered', 'completed')
            OR om.current_status IN (
              'warehouse_approved',
              'logistics_approved',
              'logistics_assigned',
              'logistics_dispatched',
              'in_transit',
              'shipped',
              'delivered',
              'logistics_delivered',
              'completed'
            )
          )
        ORDER BY co.order_number
      `);
      const eligibleOrders = eligibleResult.rows;

      if (eligibleOrders.length === 0) {
        console.log(`✅ [AUTO INVOICE] No eligible proforma orders found for conversion`);
        return 0;
      }

      console.log(`📋 [AUTO INVOICE] Found ${eligibleOrders.length} eligible proforma orders for auto-conversion`);

      let convertedCount = 0;
      for (const order of eligibleOrders) {
        const success = await ProformaInvoiceConverter.convertProformaToInvoice(order.order_number);
        if (success) {
          convertedCount++;
          console.log(`✅ [AUTO INVOICE] Auto-converted ${order.order_number} (${convertedCount}/${eligibleOrders.length})`);
        }
      }

      console.log(`🎯 [AUTO INVOICE] Auto-conversion completed: ${convertedCount}/${eligibleOrders.length} orders converted`);
      return convertedCount;

    } catch (error) {
      console.error(`💥 [AUTO INVOICE] Error in batch auto-conversion:`, error);
      return 0;
    }
  }

  /**
   * Start periodic check for auto-conversion (every 10 minutes)
   */
  static startPeriodicCheck(): void {
    console.log(`🕐 [AUTO INVOICE] Starting periodic auto-conversion check (every 10 minutes)`);
    
    // Run immediately on startup
    this.convertAllEligibleOrders();
    
    // Then run every 10 minutes
    setInterval(async () => {
      try {
        await this.convertAllEligibleOrders();
      } catch (error) {
        console.error(`💥 [AUTO INVOICE] Error in periodic check:`, error);
      }
    }, 10 * 60 * 1000); // 10 minutes
  }
}

export default AutoInvoiceConverter;