import { customerDb } from "./customer-db";
import { customerOrders, orderItems } from "@shared/customer-schema";
import { eq, and, lt, sql, or, ne } from "drizzle-orm";

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

      // Find expired temporary orders (unpaid orders after specified time)
      const expiredOrders = await customerDb
        .select({
          id: customerOrders.id,
          orderNumber: customerOrders.orderNumber,
          customerId: customerOrders.customerId,
          status: customerOrders.status,
          paymentStatus: customerOrders.paymentStatus,
          paymentMethod: customerOrders.paymentMethod,
          receiptPath: customerOrders.receiptPath,
          createdAt: customerOrders.createdAt
        })
        .from(customerOrders)
        .where(
          and(
            // Status is pending or payment_grace_period (temporary orders)
            sql`${customerOrders.status} IN ('pending', 'payment_grace_period')`,
            // Payment status is not paid (must be unpaid)
            or(
              sql`${customerOrders.paymentStatus} IS NULL`,
              sql`${customerOrders.paymentStatus} IN ('pending', 'unpaid')`
            ),
            // No receipt uploaded (receiptPath is null) - CRITICAL: Never delete if receipt exists
            sql`${customerOrders.receiptPath} IS NULL`,
            // Additional safety: Never delete if payment status indicates any form of payment
            sql`${customerOrders.paymentStatus} != 'paid'`,
            sql`${customerOrders.paymentStatus} != 'processing'`,
            sql`${customerOrders.paymentStatus} != 'confirmed'`,
            // Grace period expired based on payment method:
            // - Bank transfer: 3 days + 1 hour buffer
            // - Other methods: 24 hours + 1 hour buffer
            or(
              and(
                eq(customerOrders.paymentMethod, 'واریز بانکی با مهلت 3 روزه'),
                lt(customerOrders.createdAt, sql`NOW() - INTERVAL '73 hours'`) // 3 days + 1 hour
              ),
              and(
                ne(customerOrders.paymentMethod, 'واریز بانکی با مهلت 3 روزه'),
                lt(customerOrders.createdAt, sql`NOW() - INTERVAL '25 hours'`) // 24 hours + 1 hour
              )
            )
          )
        );

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

          // Delete order items first (foreign key constraint)
          await customerDb
            .delete(orderItems)
            .where(eq(orderItems.orderId, order.id));

          // Mark order as deleted instead of hard deletion to preserve numbering
          const timeLimitNote = order.paymentMethod === 'واریز بانکی با مهلت 3 روزه' ? '3 روزه' : '24 ساعته';
          const timeLimitLog = order.paymentMethod === 'واریز بانکی با مهلت 3 روزه' ? '3 روز' : '24 ساعت';
          
          await customerDb
            .update(customerOrders)
            .set({
              status: 'deleted',
              notes: sql`COALESCE(${customerOrders.notes}, '') || ' - سفارش موقت ' || ${timeLimitNote} || ' منقضی شده حذف شد در ' || NOW()`,
              updatedAt: new Date()
            })
            .where(eq(customerOrders.id, order.id));

          cleanedCount++;
          console.log(`🗑️ [EXPIRED CLEANUP] Cleaned expired order: ${order.orderNumber} (Customer: ${order.customerId}, Method: ${order.paymentMethod}, Limit: ${timeLimitLog})`);

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