import { db } from './db';
import { eq, and, lt } from 'drizzle-orm';
import * as schema from '../shared/schema';

export class IncompletePaymentCleaner {
  private static instance: IncompletePaymentCleaner;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  public static getInstance(): IncompletePaymentCleaner {
    if (!this.instance) {
      this.instance = new IncompletePaymentCleaner();
    }
    return this.instance;
  }

  async startService() {
    if (this.isRunning) return;
    
    console.log('🚮 [INCOMPLETE PAYMENT CLEANER] Service starting...');
    this.isRunning = true;
    
    // Run immediately
    await this.processIncompletePayments();
    
    // Run every 5 minutes
    this.cleanupTimer = setInterval(async () => {
      await this.processIncompletePayments();
    }, 5 * 60 * 1000);
    
    console.log('🚮 [INCOMPLETE PAYMENT CLEANER] Service started - checking every 5 minutes');
  }

  async processIncompletePayments() {
    try {
      console.log('🔍 [INCOMPLETE PAYMENT CLEANER] Processing incomplete payments...');
      
      const { pool } = await import('./db');
      
      // Process online payment failures, grace period expired orders, failed bank payment orphans, expired wallet reservations, and stale wallet_partial orders
      await this.processFailedOnlinePayments(pool);
      await this.processExpiredGracePeriodOrders(pool);
      await this.processFailedBankPaymentOrphans(pool);
      await this.processExpiredWalletReservations(pool);
      await this.processStaleWalletPartialOrders(pool);

      console.log(`✅ [INCOMPLETE PAYMENT CLEANER] Processing completed`);
    } catch (error) {
      console.error('❌ [INCOMPLETE PAYMENT CLEANER] Error processing incomplete payments:', error);
    }
  }

  async processFailedOnlinePayments(pool: any) {
    // Find all incomplete online payment orders - including orders without order_number (never reached callback)
    const result = await pool.query(`
      SELECT 
        co.id,
        co.order_number,
        co.customer_id,
        co.guest_email,
        co.guest_name,
        co.total_amount,
        co.currency,
        co.created_at,
        co.notification_stage,
        EXTRACT(EPOCH FROM (NOW() - co.created_at))/60 as age_minutes,
        om.id as management_id
      FROM customer_orders co
      LEFT JOIN order_management om ON co.id = om.customer_order_id
      WHERE (
        -- Standard pending online payments
        (co.status = 'pending' AND co.payment_status = 'pending' AND co.payment_method = 'online_payment')
        OR
        -- Orders created but never got order_number (failed to reach bank gateway)
        (co.order_number IS NULL AND co.payment_method = 'online_payment' AND co.status IN ('pending', 'processing'))
        OR  
        -- Orders with failed payment status
        (co.payment_status = 'failed' AND co.payment_method = 'online_payment')
      )
      AND (om.current_status = 'pending' OR om.current_status IS NULL OR om.current_status = 'pending_payment')
      ORDER BY co.created_at ASC
    `);

    const incompleteOrders = result.rows;
    console.log(`🔍 [AGGRESSIVE CLEANUP] Found ${incompleteOrders.length} incomplete online payment orders (including orderless)`);

    for (const order of incompleteOrders) {
      const ageMinutes = parseFloat(order.age_minutes);
      const currentStage = order.notification_stage || 0;

      if (ageMinutes >= 10 && currentStage < 3) {
        // After 10 minutes - delete the order completely (reduced from 60 minutes)
        console.log(`🗑️ [AGGRESSIVE CLEANUP] Deleting failed online payment order ${order.id} after ${ageMinutes.toFixed(1)} minutes`);
        await this.deleteIncompleteOrder(order, 'online_payment');
      } else if (ageMinutes >= 5 && currentStage < 2) {
        // After 5 minutes - send second notification
        await this.sendNotification(order, 2, 'Final Warning', 'online_payment');
      } else if (ageMinutes >= 2 && currentStage < 1) {
        // After 2 minutes - send first notification
        await this.sendNotification(order, 1, 'First Warning', 'online_payment');
      }
    }
  }

  async processFailedBankPaymentOrphans(pool: any) {
    // Find all payment_failed orders without order numbers (failed bank payments)
    const result = await pool.query(`
      SELECT 
        co.id,
        co.order_number,
        co.customer_id,
        co.guest_email,
        co.guest_name,
        co.total_amount,
        co.currency,
        co.created_at,
        co.updated_at,
        co.notification_stage,
        EXTRACT(EPOCH FROM (NOW() - co.updated_at))/60 as age_minutes,
        om.id as management_id
      FROM customer_orders co
      LEFT JOIN order_management om ON co.id = om.customer_order_id
      WHERE co.status = 'payment_failed' 
        AND co.payment_status = 'failed'
        AND co.order_number IS NULL
      ORDER BY co.updated_at ASC
    `);

    const orphanOrders = result.rows;
    console.log(`🕐 [ORPHAN CLEANER] Found ${orphanOrders.length} failed bank payment orphan orders`);

    for (const order of orphanOrders) {
      const ageMinutes = parseFloat(order.age_minutes);
      const currentStage = order.notification_stage || 0;

      if (ageMinutes >= 15) {
        // After 15 minutes - delete the orphan order completely (reduced from 60 minutes)
        console.log(`🗑️ [AGGRESSIVE ORPHAN CLEANUP] Deleting orphan order ${order.id} after ${ageMinutes.toFixed(1)} minutes`);
        await this.deleteIncompleteOrder(order, 'failed_bank_payment_orphan');
      } else if (ageMinutes >= 10 && currentStage < 2) {
        // After 10 minutes - send reminder (5 minutes left)
        await this.sendNotification(order, 2, 'Final reminder - 5 minutes until deletion', 'failed_bank_payment');
      } else if (ageMinutes >= 5 && currentStage < 1) {
        // After 5 minutes - first notification
        await this.sendNotification(order, 1, 'Failed bank payment - order will be deleted soon', 'failed_bank_payment');
      }
    }
  }

  async processExpiredGracePeriodOrders(pool: any) {
    // Find all grace period orders with their age
    const result = await pool.query(`
      SELECT 
        co.id,
        co.order_number,
        co.customer_id,
        co.guest_email,
        co.guest_name,
        co.total_amount,
        co.currency,
        co.created_at,
        co.notification_stage,
        EXTRACT(EPOCH FROM (NOW() - co.created_at))/3600 as age_hours,
        EXTRACT(EPOCH FROM (NOW() - co.created_at))/(3600*24) as age_days,
        om.id as management_id,
        om.payment_grace_period_end
      FROM customer_orders co
      LEFT JOIN order_management om ON co.id = om.customer_order_id
      WHERE co.payment_method = 'bank_transfer_grace'
        AND co.status IN ('pending', 'awaiting_payment')
        AND co.payment_status IN ('pending', 'grace_period')
        AND (om.current_status IN ('pending', 'payment_pending') OR om.current_status IS NULL)
      ORDER BY co.created_at ASC
    `);

    const graceOrders = result.rows;
    console.log(`🔍 [INCOMPLETE PAYMENT CLEANER] Found ${graceOrders.length} grace period orders`);

    for (const order of graceOrders) {
      const ageHours = parseFloat(order.age_hours);
      const ageDays = parseFloat(order.age_days);
      const currentStage = order.notification_stage || 0;

      // Grace period notifications and cleanup (3 days = 72 hours)
      // NEW POLICY: Only keep grace period orders with financial confirmation
      if (ageDays >= 3 && currentStage < 4) {
        // After 3 days - delete expired grace period order to free up order number
        console.log(`🗑️ [GRACE PERIOD EXPIRED] Deleting order ${order.order_number} after 3 days - no financial confirmation received`);
        await this.deleteIncompleteOrder(order, 'grace_period_expired');
      } else if (ageHours >= 48 && currentStage < 3) {
        // After 2 days - final warning (24 hours left)
        await this.sendNotification(order, 3, 'Final warning - 24 hours remaining for financial confirmation', 'grace_period');
      } else if (ageHours >= 24 && currentStage < 2) {
        // After 1 day - second notification (48 hours left)
        await this.sendNotification(order, 2, 'Second reminder - 48 hours remaining for financial confirmation', 'grace_period');
      } else if (ageHours >= 6 && currentStage < 1) {
        // After 6 hours - first notification
        await this.sendNotification(order, 1, 'First reminder - financial confirmation required within 3 days', 'grace_period');
      }
    }
  }

  private async sendNotification(order: any, stage: number, stageLabel: string, orderType: string = 'online_payment') {
    try {
      console.log(`📧 [INCOMPLETE PAYMENT CLEANER] Sending ${stageLabel} notification for order ${order.order_number}`);
      
      const { pool } = await import('./db');
      
      // Update notification stage
      await pool.query(`
        UPDATE customer_orders 
        SET notification_stage = $1, updated_at = NOW()
        WHERE id = $2
      `, [stage, order.id]);

      // Determine recipient email and check if customer is online
      const recipientEmail = order.guest_email || await this.getCustomerEmail(order.customer_id);
      const recipientName = order.guest_name || await this.getCustomerName(order.customer_id);
      const isCustomerOnline = await this.isCustomerOnline(order.customer_id);

      if (!recipientEmail) {
        console.log(`⚠️ [INCOMPLETE PAYMENT CLEANER] No email found for order ${order.order_number}`);
        return;
      }

      // Check if customer is online - if online, just announce, if offline, skip notifications and proceed to deletion
      if (isCustomerOnline) {
        console.log(`🌐 [ONLINE CUSTOMER] Customer ${order.customer_id} is online - announcing only`);
        console.log(`📢 [ONLINE ANNOUNCEMENT] ${stageLabel} - Order ${order.order_number} for ${recipientName} (${order.total_amount} ${order.currency})`);
        return;
      }

      console.log(`📡 [OFFLINE CUSTOMER] Customer ${order.customer_id} is offline - no notifications needed, will proceed to deletion per schedule`);
      
      // For offline customers, we don't send any notifications, just proceed to deletion schedule
      return;

    } catch (error) {
      console.error(`❌ [INCOMPLETE PAYMENT CLEANER] Error processing notification for order ${order.order_number}:`, error);
    }
  }

  private async deleteIncompleteOrder(order: any, orderType: string = 'online_payment') {
    try {
      // Determine cancellation reason based on order type
      let cancellationReason: string;
      switch (orderType) {
        case 'grace_period_expired':
          cancellationReason = 'سفارش پس از اتمام مهلت ۳ روزه پرداخت بانکی توسط سیستم لغو شد';
          break;
        case 'online_payment':
          cancellationReason = 'عدم موفقیت در پرداخت آنلاین - سفارش توسط سیستم لغو شد';
          break;
        case 'failed_bank_payment_orphan':
          cancellationReason = 'عدم موفقیت در پرداخت بانکی - سفارش توسط سیستم لغو شد';
          break;
        case 'wallet_reservation_expired':
          cancellationReason = 'رزرو کیف پول منقضی شد - پرداخت بانکی تکمیل نشد';
          break;
        case 'wallet_partial_stale':
          cancellationReason = 'عدم تکمیل پرداخت بانکی در مهلت ۳۰ دقیقه - سفارش توسط سیستم لغو شد';
          break;
        default:
          cancellationReason = 'سفارش توسط سیستم لغو شد';
      }
      
      console.log(`🚫 [ORDER CANCEL] Cancelling order ${order.order_number} - Reason: ${cancellationReason}`);
      
      const { pool } = await import('./db');
      
      // Start transaction for safe cancellation and refund
      await pool.query('BEGIN');
      
      try {
        // Check if this order used wallet payment and needs refund
        const orderQuery = await pool.query(`
          SELECT payment_method, customer_id, order_number, total_amount
          FROM customer_orders 
          WHERE id = $1
        `, [order.id]);
        
        const orderDetails = orderQuery.rows[0];
        if (orderDetails && orderDetails.payment_method === 'wallet_partial') {
          console.log(`💰 [WALLET CLEANUP] Order ${order.order_number} used partial wallet payment - processing cleanup`);
          
          try {
            // Import wallet storage to process refund/release
            const { walletStorage } = await import('./wallet-storage');
            
            // PRIORITY 1: Check for reserved (not yet deducted) wallet transactions
            // With the new 2-phase wallet system, wallet_partial orders should have reservations, not completed debits
            const reservation = await walletStorage.getReservationByOrder(order.id);
            if (reservation) {
              // Release reservation - no balance change needed since funds were never deducted
              await walletStorage.releaseReservation(reservation.id, `Order ${order.order_number} cleanup - bank payment never completed`);
              console.log(`🔓 [WALLET RELEASE] Released reservation ${reservation.id} for order ${order.order_number} - ${reservation.amount} IQD was never deducted`);
            } else {
              // FALLBACK: Check for old-style completed debit transactions (pre-reservation system)
              // This handles orders created before the reservation system was implemented
              const allTransactions = await walletStorage.getTransactionsByCustomer(orderDetails.customer_id, 100);
              const debitTransactions = allTransactions.filter(t => 
                t.transactionType === 'debit' && 
                t.status === 'completed' && 
                t.referenceId === order.id &&
                t.referenceType === 'order'
              );
              
              if (debitTransactions.length > 0) {
                // Calculate total amount to refund
                const totalDebitAmount = debitTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
                console.log(`💰 [WALLET REFUND] Refunding ${totalDebitAmount} IQD to customer ${orderDetails.customer_id}`);
                
                // Process wallet refund
                await walletStorage.creditWallet(
                  orderDetails.customer_id,
                  totalDebitAmount,
                  `بازگشت وجه سفارش لغو شده ${order.order_number || 'بدون شماره'} - ${cancellationReason}`,
                  'cancellation_refund',
                  order.id
                );
                
                console.log(`✅ [WALLET REFUND] Successfully refunded ${totalDebitAmount} IQD for cancelled order ${order.order_number}`);
              } else {
                console.log(`ℹ️ [WALLET CLEANUP] No wallet transactions (reservations or debits) found for order ${order.order_number}`);
              }
            }
          } catch (refundError) {
            console.error(`❌ [WALLET CLEANUP] Error processing wallet cleanup for order ${order.order_number}:`, refundError);
            // Continue with cancellation even if refund fails
          }
        } else {
          console.log(`ℹ️ [PAYMENT METHOD] Order ${order.order_number} payment method: ${orderDetails?.payment_method || 'unknown'} - no wallet cleanup needed`);
        }

        // 1. Update customer_orders to cancelled status with reason
        await pool.query(`
          UPDATE customer_orders 
          SET status = 'cancelled', 
              rejection_reason = $1,
              updated_at = NOW()
          WHERE id = $2
        `, [cancellationReason, order.id]);
        console.log(`🚫 [ORDER CANCEL] Updated customer_orders status to cancelled for ${order.order_number}`);

        // 2. Update order_management to cancelled status with reason
        if (order.management_id) {
          await pool.query(`
            UPDATE order_management 
            SET current_status = 'cancelled',
                financial_notes = $1,
                updated_at = NOW()
            WHERE id = $2
          `, [cancellationReason, order.management_id]);
          console.log(`🚫 [ORDER CANCEL] Updated order_management status to cancelled for ${order.order_number}`);
        }

        await pool.query('COMMIT');
        console.log(`✅ [ORDER CANCEL] Successfully cancelled order ${order.order_number} with reason preserved in history`);

      } catch (cancelError) {
        await pool.query('ROLLBACK');
        throw cancelError;
      }

    } catch (error) {
      console.error(`❌ [ORDER CANCEL] Error cancelling order ${order.order_number}:`, error);
    }
  }

  private async getCustomerEmail(customerId: number | null): Promise<string | null> {
    if (!customerId) return null;
    
    try {
      const { pool } = await import('./db');
      const result = await pool.query(`
        SELECT email FROM crm_customers WHERE id = $1
        UNION ALL
        SELECT email FROM customers WHERE id = $1
        LIMIT 1
      `, [customerId]);
      
      return result.rows[0]?.email || null;
    } catch (error) {
      console.error('Error getting customer email:', error);
      return null;
    }
  }

  private async isCustomerOnline(customerId: number | null): Promise<boolean> {
    if (!customerId) return false;
    
    try {
      const { pool } = await import('./db');
      
      // Check if customer has an active session in the last 5 minutes
      const result = await pool.query(`
        SELECT s.id 
        FROM security_sessions s 
        WHERE s.user_id = $1 
          AND s.is_active = true
          AND s.expires_at > NOW()
          AND s.last_activity > NOW() - INTERVAL '5 minutes'
        LIMIT 1
      `, [customerId]);
      
      const isOnline = result.rows.length > 0;
      console.log(`🔍 [ONLINE CHECK] Customer ${customerId} online status: ${isOnline}`);
      
      return isOnline;
    } catch (error) {
      console.error('Error checking customer online status:', error);
      return false; // Default to offline if error
    }
  }

  private async getCustomerName(customerId: number | null): Promise<string> {
    if (!customerId) return 'Dear Customer';
    
    try {
      const { pool } = await import('./db');
      const result = await pool.query(`
        SELECT first_name, last_name FROM crm_customers WHERE id = $1
        UNION ALL
        SELECT first_name, last_name FROM customers WHERE id = $1
        LIMIT 1
      `, [customerId]);
      
      const customer = result.rows[0];
      if (customer) {
        return `${customer.first_name} ${customer.last_name}`.trim();
      }
      return 'Dear Customer';
    } catch (error) {
      console.error('Error getting customer name:', error);
      return 'Dear Customer';
    }
  }

  async processExpiredWalletReservations(pool: any) {
    try {
      // Find wallet reservations older than 30 minutes that are still in 'reserved' status
      const result = await pool.query(`
        SELECT 
          wt.id,
          wt.customer_id,
          wt.amount,
          wt.notes,
          wt.description,
          wt.reference_id,
          wt.created_at,
          EXTRACT(EPOCH FROM (NOW() - wt.created_at))/60 as age_minutes
        FROM wallet_transactions wt
        WHERE wt.status = 'reserved'
          AND wt.reference_type = 'order'
          AND wt.created_at < NOW() - INTERVAL '30 minutes'
        ORDER BY wt.created_at ASC
      `);

      const expiredReservations = result.rows;
      console.log(`🔍 [WALLET CLEANUP] Found ${expiredReservations.length} expired wallet reservations (>30 min)`);

      for (const reservation of expiredReservations) {
        try {
          const { walletStorage } = await import('./wallet-storage');
          
          await walletStorage.releaseReservation(
            reservation.id, 
            `Reservation expired after ${Math.round(reservation.age_minutes)} minutes - no bank payment confirmation received`
          );
          
          console.log(`🔓 [WALLET CLEANUP] Released expired reservation ${reservation.id}: ${reservation.amount} IQD for customer ${reservation.customer_id}`);
          
          // Also cancel the related order if it exists
          if (reservation.reference_id) {
            const cancellationReason = 'رزرو کیف پول منقضی شد - پرداخت بانکی تکمیل نشد';
            
            // Get order info first
            const orderResult = await pool.query(`
              SELECT co.id, co.order_number, om.id as management_id
              FROM customer_orders co
              LEFT JOIN order_management om ON co.id = om.customer_order_id
              WHERE co.id = $1 AND co.status NOT IN ('cancelled', 'delivered', 'financial_rejected')
            `, [reservation.reference_id]);
            
            if (orderResult.rows.length > 0) {
              const order = orderResult.rows[0];
              
              // Update customer_orders to cancelled
              await pool.query(`
                UPDATE customer_orders 
                SET status = 'cancelled', 
                    rejection_reason = $1,
                    updated_at = NOW()
                WHERE id = $2
              `, [cancellationReason, order.id]);
              
              // Update order_management to cancelled
              if (order.management_id) {
                await pool.query(`
                  UPDATE order_management 
                  SET current_status = 'cancelled',
                      financial_notes = $1,
                      updated_at = NOW()
                  WHERE id = $2
                `, [cancellationReason, order.management_id]);
              }
              
              console.log(`🚫 [WALLET CLEANUP] Cancelled order ${order.order_number || order.id} due to expired wallet reservation`);
            }
          }
        } catch (releaseError) {
          console.error(`❌ [WALLET CLEANUP] Failed to release reservation ${reservation.id}:`, releaseError);
        }
      }
    } catch (error) {
      console.error('❌ [WALLET CLEANUP] Error processing expired wallet reservations:', error);
    }
  }

  async processStaleWalletPartialOrders(pool: any) {
    try {
      // Find wallet_partial orders that have been pending for more than 30 minutes
      // These are orders where customer started with wallet but never completed bank payment
      const result = await pool.query(`
        SELECT 
          co.id,
          co.order_number,
          co.customer_id,
          co.guest_email,
          co.guest_name,
          co.total_amount,
          co.currency,
          co.created_at,
          co.notification_stage,
          EXTRACT(EPOCH FROM (NOW() - co.created_at))/60 as age_minutes,
          om.id as management_id
        FROM customer_orders co
        LEFT JOIN order_management om ON co.id = om.customer_order_id
        WHERE co.payment_method = 'wallet_partial'
          AND co.status = 'pending'
          AND co.payment_status = 'pending'
          AND (om.current_status = 'pending' OR om.current_status IS NULL)
          AND co.created_at < NOW() - INTERVAL '30 minutes'
        ORDER BY co.created_at ASC
      `);

      const staleOrders = result.rows;
      console.log(`🔍 [WALLET PARTIAL CLEANUP] Found ${staleOrders.length} stale wallet_partial orders (>30 min)`);

      for (const order of staleOrders) {
        const ageMinutes = parseFloat(order.age_minutes);
        console.log(`🚫 [WALLET PARTIAL CLEANUP] Cancelling stale order ${order.order_number} after ${ageMinutes.toFixed(1)} minutes`);
        await this.deleteIncompleteOrder(order, 'wallet_partial_stale');
      }
    } catch (error) {
      console.error('❌ [WALLET PARTIAL CLEANUP] Error processing stale wallet_partial orders:', error);
    }
  }

  async stopService() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.isRunning = false;
    console.log('🚮 [INCOMPLETE PAYMENT CLEANER] Service stopped');
  }
}

// Export singleton instance
export const incompletePaymentCleaner = IncompletePaymentCleaner.getInstance();