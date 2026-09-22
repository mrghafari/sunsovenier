import { customerDb } from "./customer-db";
import { customerPool } from "./customer-db";
import { orderItems } from "@shared/customer-schema";
import { eq, sql } from "drizzle-orm";

/**
 * خدمت تمیزکاری خودکار سفارشات منقضی شده
 * Automatic cleanup service for expired orders
 */
export class ExpiredOrdersCleanup {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * شروع سرویس تمیزکاری خودکار
   * Start automatic cleanup service
   */
  start() {
    if (this.isRunning) {
      console.log('🔄 [EXPIRED CLEANUP] Service is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 [EXPIRED CLEANUP] Starting expired orders cleanup service');

    // Run cleanup every hour to catch expired orders more quickly
    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup();
    }, 1 * 60 * 60 * 1000); // 1 hour

    // Run initial cleanup
    setTimeout(() => {
      this.performCleanup();
    }, 30000); // After 30 seconds of startup
  }

  /**
   * توقف سرویس تمیزکاری
   * Stop cleanup service
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 [EXPIRED CLEANUP] Cleanup service stopped');
  }

  /**
   * اجرای تمیزکاری سفارشات منقضی شده
   * Perform cleanup of expired orders
   */
  async performCleanup() {
    try {
      console.log('🧹 [EXPIRED CLEANUP] Starting cleanup process...');

      // The stored deadline is authoritative. Never infer expiry from the order
      // creation time or a hard-coded payment-method label.
      const expiredResult = await customerPool.query(`
        SELECT
          co.id,
          co.order_number AS "orderNumber",
          co.customer_id AS "customerId",
          co.payment_method AS "paymentMethod",
          om.id AS "orderManagementId",
          om.current_status AS "currentStatus",
          om.payment_grace_period_end AS "paymentGracePeriodEnd"
        FROM customer_orders co
        JOIN order_management om ON om.customer_order_id = co.id
        WHERE co.payment_method = 'bank_transfer_grace'
          AND om.payment_grace_period_end IS NOT NULL
          AND om.payment_grace_period_end <= NOW()
          AND co.status IN ('pending', 'payment_grace_period')
          AND om.current_status IN ('finance_pending', 'pending_payment', 'payment_grace_period', 'pending')
          AND COALESCE(co.payment_status, 'pending') IN ('pending', 'unpaid', 'awaiting_payment')
          AND COALESCE(co.receipt_path, '') = ''
          AND COALESCE(om.payment_receipt_url, '') = ''
        ORDER BY om.payment_grace_period_end
      `);
      const expiredOrders = expiredResult.rows;

      if (expiredOrders.length === 0) {
        console.log('✅ [EXPIRED CLEANUP] No expired orders found');
        return;
      }

      console.log(`🔍 [EXPIRED CLEANUP] Found ${expiredOrders.length} expired orders to clean up`);

      let cleanedCount = 0;
      let releasedProductsTotal = 0;

      for (const order of expiredOrders) {
        try {
          // Get order items to release reservations
          const items = await customerDb
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id));

          // Reservation-backed orders never changed physical stock before
          // payment, so expiration only releases the exact ledger rows.
          // Keep the legacy stock restoration only for orders created before
          // the reservation ledger existed.
          const { releaseOrderReservations, orderHasReservations } = await import("./cart-inventory-reservation");
          const releasedReservationCount = await releaseOrderReservations(order.id);
          const hasReservationLedger = releasedReservationCount > 0 || await orderHasReservations(order.id);
          if (!hasReservationLedger && items.length > 0) {
            const { db } = await import('./db');
            const { shopProducts } = await import('@shared/shop-schema');
            
            for (const item of items) {
              if (item.productId && item.quantity) {
                // Add quantity back to shop product inventory
                await db
                  .update(shopProducts)
                  .set({
                    stockQuantity: sql`stock_quantity + ${parseFloat(item.quantity)}`,
                    updatedAt: new Date()
                  })
                  .where(eq(shopProducts.id, item.productId));

                releasedProductsTotal++;
              }
            }
          }

          const reason = `مهلت پرداخت سفارش در ${new Date(order.paymentGracePeriodEnd).toISOString()} منقضی شد و سفارش به‌صورت خودکار حذف شد`;
          const client = await customerPool.connect();
          try {
            await client.query('BEGIN');
            const eligible = await client.query(`
              SELECT om.id, om.current_status, om.payment_grace_period_end
              FROM customer_orders co
              JOIN order_management om ON om.customer_order_id = co.id
              WHERE co.id = $1
                AND co.payment_method = 'bank_transfer_grace'
                AND om.payment_grace_period_end IS NOT NULL
                AND om.payment_grace_period_end <= NOW()
                AND co.status IN ('pending', 'payment_grace_period')
                AND om.current_status IN ('finance_pending', 'pending_payment', 'payment_grace_period', 'pending')
                AND COALESCE(co.payment_status, 'pending') IN ('pending', 'unpaid', 'awaiting_payment')
                AND COALESCE(co.receipt_path, '') = ''
                AND COALESCE(om.payment_receipt_url, '') = ''
              FOR UPDATE OF co, om
            `, [order.id]);
            if (!eligible.rows.length) {
              await client.query('ROLLBACK');
              console.log(`🛡️ [EXPIRED CLEANUP] Order ${order.orderNumber} changed before deletion; skipped`);
              continue;
            }

            const lockedOrder = eligible.rows[0];
            await client.query('DELETE FROM order_items WHERE order_id = $1', [order.id]);
            await client.query(`
              UPDATE order_management
              SET current_status = 'cancelled',
                  sync_notes = CONCAT_WS(E'\\n', NULLIF(sync_notes, ''), $2),
                  updated_at = NOW()
              WHERE id = $1
            `, [lockedOrder.id, reason]);
            await client.query(`
              INSERT INTO order_status_history
                (order_management_id, from_status, to_status, changed_by_department, notes, created_at)
              VALUES ($1, $2, 'cancelled', 'system', $3, NOW())
            `, [lockedOrder.id, lockedOrder.current_status, reason]);
            await client.query(`
              UPDATE customer_orders
              SET status = 'deleted',
                  notes = CONCAT_WS(' - ', NULLIF(notes, ''), $2),
                  updated_at = NOW()
              WHERE id = $1
            `, [order.id, reason]);
            await client.query('COMMIT');
          } catch (transactionError) {
            await client.query('ROLLBACK');
            throw transactionError;
          } finally {
            client.release();
          }

          cleanedCount++;
          console.log(`🗑️ [EXPIRED CLEANUP] Cleaned expired order: ${order.orderNumber} (Customer: ${order.customerId}, Deadline: ${order.paymentGracePeriodEnd})`);

        } catch (error) {
          console.error(`❌ [EXPIRED CLEANUP] Error cleaning order ${order.orderNumber}:`, error);
        }
      }

      console.log(`✅ [EXPIRED CLEANUP] Cleanup completed: ${cleanedCount} orders cleaned, ${releasedProductsTotal} products released`);

    } catch (error) {
      console.error('❌ [EXPIRED CLEANUP] Error during cleanup process:', error);
    }
  }

  /**
   * اجرای دستی تمیزکاری
   * Manual cleanup execution
   */
  async manualCleanup() {
    console.log('🎯 [EXPIRED CLEANUP] Manual cleanup requested');
    await this.performCleanup();
  }

  /**
   * وضعیت سرویس
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: this.cleanupInterval !== null
    };
  }
}

// Export singleton instance
export const expiredOrdersCleanup = new ExpiredOrdersCleanup();