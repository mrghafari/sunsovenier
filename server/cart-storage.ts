import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { 
  cartSessions, 
  abandonedCartSettings, 
  abandonedCartNotifications, 
  cartRecoveryAnalytics,
  type CartSession,
  type InsertCartSession,
  type AbandonedCartSettings,
  type InsertAbandonedCartSettings,
  type AbandonedCartNotification,
  type InsertAbandonedCartNotification,
  type CartRecoveryAnalytics
} from "@shared/cart-schema";

const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const sql_client = neon(databaseUrl!);
const cartDb = drizzle(sql_client);

function normalizeCartItems(cartData: unknown): Array<[number, number]> {
  let parsed = cartData;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }

  const entries = Array.isArray(parsed)
    ? parsed.map((item: any) => [
        Number(item?.productId ?? item?.id),
        Number(item?.quantity),
      ] as [number, number])
    : parsed && typeof parsed === 'object'
      ? Object.entries(parsed as Record<string, unknown>).map(([productId, quantity]) => [
          Number(productId),
          Number(quantity),
        ] as [number, number])
      : [];

  return entries
    .filter(([productId, quantity]) =>
      Number.isInteger(productId) && productId > 0 && Number.isFinite(quantity) && quantity > 0,
    )
    .sort(([leftId], [rightId]) => leftId - rightId);
}

function cartsHaveSameItems(left: unknown, right: unknown): boolean {
  return JSON.stringify(normalizeCartItems(left)) === JSON.stringify(normalizeCartItems(right));
}

function totalsAreEqual(left: unknown, right: unknown): boolean {
  const leftTotal = Number(left);
  const rightTotal = Number(right);
  return Number.isFinite(leftTotal) &&
    Number.isFinite(rightTotal) &&
    Math.abs(leftTotal - rightTotal) < 0.0001;
}

export class CartStorage {
  
  // =============================================================================
  // CART SESSION MANAGEMENT
  // =============================================================================

  async createOrUpdateCartSession(data: {
    customerId: number;
    sessionId: string;
    cartData: any;
    itemCount: number;
    totalValue: number;
  }) {
    const existing = await cartDb
      .select()
      .from(cartSessions)
      .where(and(
        eq(cartSessions.customerId, data.customerId),
        eq(cartSessions.isActive, true)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Loading an unchanged cart is not customer activity. Resetting the
      // abandonment clock here lets a stale cart avoid cleanup indefinitely.
      if (
        cartsHaveSameItems(existing[0].cartData, data.cartData) &&
        totalsAreEqual(existing[0].totalValue, data.totalValue)
      ) {
        return existing[0].id;
      }

      // Update existing session
      await cartDb
        .update(cartSessions)
        .set({
          cartData: data.cartData,
          itemCount: data.itemCount,
          totalValue: data.totalValue.toString(),
          lastActivity: new Date(),
          updatedAt: new Date(),
          isAbandoned: false,
          abandonedAt: null
        })
        .where(eq(cartSessions.id, existing[0].id));
      
      return existing[0].id;
    } else {
      // Create new session
      const [newSession] = await cartDb
        .insert(cartSessions)
        .values({
          customerId: data.customerId,
          sessionId: data.sessionId,
          cartData: data.cartData,
          itemCount: data.itemCount,
          totalValue: data.totalValue.toString(),
          lastActivity: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
          isAbandoned: false
        })
        .returning();
      
      return newSession.id;
    }
  }

  async getActiveCartSessions(customerId?: number) {
    let query = cartDb
      .select()
      .from(cartSessions)
      .where(eq(cartSessions.isActive, true));
    
    if (customerId) {
      query = cartDb
        .select()
        .from(cartSessions)
        .where(and(
          eq(cartSessions.isActive, true),
          eq(cartSessions.customerId, customerId)
        ));
    }
    
    return await query.orderBy(desc(cartSessions.lastActivity));
  }

  async markCartAsAbandoned(sessionId: number) {
    await cartDb
      .update(cartSessions)
      .set({
        isAbandoned: true,
        abandonedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(cartSessions.id, sessionId));
  }

  async markCartAsCompleted(sessionId: number) {
    await cartDb
      .update(cartSessions)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(cartSessions.id, sessionId));
  }

  async getAbandonedCarts(timeoutMinutes: number = 30) {
    // Get all carts that are already marked as abandoned OR should be marked as abandoned
    const timeoutDate = new Date();
    timeoutDate.setMinutes(timeoutDate.getMinutes() - timeoutMinutes);

    return await cartDb
      .select()
      .from(cartSessions)
      .where(and(
        gte(cartSessions.itemCount, 1), // Has items in cart
        // Show both: already abandoned carts OR active carts that are now abandoned
        sql`(${cartSessions.isAbandoned} = true OR (${cartSessions.isActive} = true AND ${cartSessions.isAbandoned} = false AND ${cartSessions.lastActivity} <= ${timeoutDate.toISOString()}))`
      ))
      .orderBy(desc(cartSessions.lastActivity));
  }

  async clearCartSession(customerId: number) {
    await cartDb
      .update(cartSessions)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(cartSessions.customerId, customerId));
  }

  async getAbandonedCartAnalytics() {
    // Get basic analytics for abandoned carts
    const [
      totalAbandoned,
      recentAbandoned,
      totalValue
    ] = await Promise.all([
      // Total abandoned carts
      cartDb
        .select({ count: sql`count(*)` })
        .from(cartSessions)
        .where(and(
          eq(cartSessions.isAbandoned, true),
          gte(cartSessions.itemCount, 1)
        )),
      
      // Recent abandoned carts (last 7 days)
      cartDb
        .select({ count: sql`count(*)` })
        .from(cartSessions)
        .where(and(
          eq(cartSessions.isAbandoned, true),
          gte(cartSessions.itemCount, 1),
          gte(cartSessions.abandonedAt, sql`NOW() - INTERVAL '7 days'`)
        )),
      
      // Total value of abandoned carts
      cartDb
        .select({ sum: sql`COALESCE(SUM(CAST(total_value AS NUMERIC)), 0)` })
        .from(cartSessions)
        .where(and(
          eq(cartSessions.isAbandoned, true),
          gte(cartSessions.itemCount, 1)
        ))
    ]);

    return {
      totalAbandoned: totalAbandoned[0]?.count || 0,
      recentAbandoned: recentAbandoned[0]?.count || 0,
      totalValue: totalValue[0]?.sum || 0,
    };
  }

  async getAbandonedCartsByCustomer(customerId: number): Promise<CartSession[]> {
    try {
      console.log(`🛒 [DEBUG] Getting abandoned carts for customer ${customerId}`);
      
      // Return all carts that are already marked as abandoned (regardless of isActive status)
      const abandonedCarts = await cartDb
        .select()
        .from(cartSessions)
        .where(and(
          eq(cartSessions.customerId, customerId),
          gte(cartSessions.itemCount, 1), // Has items in cart
          eq(cartSessions.isAbandoned, true) // Already marked as abandoned
        ))
        .orderBy(desc(cartSessions.lastActivity));
      
      console.log(`🛒 [DEBUG] Found ${abandonedCarts.length} abandoned carts for customer ${customerId}`);
      
      // Also check for carts that should be marked as abandoned (1 hour threshold)
      const settings = await this.getAbandonedCartSettings();
      const thresholdHours = Math.max(settings?.timeoutMinutes ? settings.timeoutMinutes / 60 : 1, 1); // Minimum 1 hour
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - thresholdHours);
      
      const cartsToMark = await cartDb
        .select()
        .from(cartSessions)
        .where(and(
          eq(cartSessions.customerId, customerId),
          eq(cartSessions.isActive, true),
          gte(cartSessions.itemCount, 1), // Has items in cart
          eq(cartSessions.isAbandoned, false), // Not yet marked
          lte(cartSessions.lastActivity, cutoffTime) // Past threshold
        ));
        
      // Mark newly abandoned carts
      for (const cart of cartsToMark) {
        await cartDb
          .update(cartSessions)
          .set({
            isAbandoned: true,
            abandonedAt: new Date()
          })
          .where(eq(cartSessions.id, cart.id));
        console.log(`🛒 [MARKED] Cart ${cart.id} marked as abandoned`);
      }
      
      // Return all abandoned carts (existing + newly marked) regardless of isActive status
      const allAbandonedCarts = await cartDb
        .select()
        .from(cartSessions)
        .where(and(
          eq(cartSessions.customerId, customerId),
          gte(cartSessions.itemCount, 1),
          eq(cartSessions.isAbandoned, true)
        ))
        .orderBy(desc(cartSessions.lastActivity));
      
      console.log(`🛒 [RESULT] Returning ${allAbandonedCarts.length} total abandoned carts`);
      return allAbandonedCarts;
    } catch (error) {
      console.error('Error getting abandoned carts by customer:', error);
      return [];
    }
  }

  // Process abandoned cart notifications and cleanup
  async processAbandonedCartCleanup() {
    try {
      console.log('🛒 [CART CLEANUP] Starting abandoned cart processing...');
      
      const now = new Date();
      const settings = await this.getAbandonedCartSettings();
      const timeoutMinutes = Math.min(
        10080,
        Math.max(1, Number(settings?.timeoutMinutes) || 30),
      );
      const notificationIntervalMinutes = Math.min(
        10080,
        Math.max(1, Number(settings?.notificationIntervalMinutes) || 60),
      );
      
      // Find carts that passed the configured inactivity timeout.
      const abandonmentCutoff = new Date(now.getTime() - timeoutMinutes * 60 * 1000);
      const cartsForFirstNotification = await cartDb
        .select()
        .from(cartSessions)
        .where(and(
          eq(cartSessions.isActive, true),
          gte(cartSessions.itemCount, 1),
          lte(cartSessions.lastActivity, abandonmentCutoff),
          eq(cartSessions.isAbandoned, false)
        ));
      
      // Find abandoned carts that passed the configured notification interval.
      const secondNotificationCutoff = new Date(
        now.getTime() - (timeoutMinutes + notificationIntervalMinutes) * 60 * 1000,
      );
      const cartsForSecondNotification = await cartDb
        .select()
        .from(cartSessions)
        .where(and(
          eq(cartSessions.isActive, true),
          gte(cartSessions.itemCount, 1),
          lte(cartSessions.lastActivity, secondNotificationCutoff),
          eq(cartSessions.isAbandoned, true)
        ));
      
      const autoDeleteAfterHours = Math.min(
        8760,
        Math.max(1, Number(settings?.autoDeleteAfterHours) || 168),
      );
      const deletionCutoff = new Date(
        now.getTime() - (
          timeoutMinutes * 60 * 1000 +
          autoDeleteAfterHours * 60 * 60 * 1000
        ),
      );
      const cartsToDelete = settings?.autoDeleteEnabled
        ? await cartDb
            .select()
            .from(cartSessions)
            .where(and(
              eq(cartSessions.isAbandoned, true),
              lte(cartSessions.lastActivity, deletionCutoff),
            ))
        : [];
      
      console.log(`🛒 [CART CLEANUP] Found ${cartsForFirstNotification.length} carts for first notification`);
      console.log(`🛒 [CART CLEANUP] Found ${cartsForSecondNotification.length} carts for second notification`);
      console.log(`🛒 [CART CLEANUP] Found ${cartsToDelete.length} carts to delete`);
      
      return {
        firstNotifications: cartsForFirstNotification.length,
        secondNotifications: cartsForSecondNotification.length,
        deletedCarts: cartsToDelete.length,
        autoDeleteEnabled: settings?.autoDeleteEnabled === true,
        autoDeleteAfterHours,
        timeoutMinutes,
        cartsForFirstNotification,
        cartsForSecondNotification,
        cartsToDelete
      };
      
    } catch (error) {
      console.error('🛒 [CART CLEANUP] Error in processing:', error);
      return {
        firstNotifications: 0,
        secondNotifications: 0,
        deletedCarts: 0,
        autoDeleteEnabled: false,
        autoDeleteAfterHours: 168,
        timeoutMinutes: 30,
        cartsForFirstNotification: [],
        cartsForSecondNotification: [],
        cartsToDelete: []
      };
    }
  }

  // Mark cart as abandoned after first notification
  async markCartAsAbandonedWithNotification(cartId: number) {
    await cartDb
      .update(cartSessions)
      .set({
        isAbandoned: true,
        abandonedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(cartSessions.id, cartId));
  }

  async getCartSessionById(cartId: number): Promise<CartSession | null> {
    try {
      const cart = await cartDb
        .select()
        .from(cartSessions)
        .where(eq(cartSessions.id, cartId))
        .limit(1);
      
      return cart[0] || null;
    } catch (error) {
      console.error('Error getting cart session by ID:', error);
      return null;
    }
  }

  async updateCartSession(cartId: number, updateData: Partial<CartSession>) {
    try {
      await cartDb
        .update(cartSessions)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(cartSessions.id, cartId));
      
      console.log(`🛒 [UPDATE] Cart session ${cartId} updated`);
    } catch (error) {
      console.error('Error updating cart session:', error);
      throw error;
    }
  }

  async deleteAbandonedCart(cartId: number) {
    const { pool } = await import('./db');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cartResult = await client.query(`
        SELECT customer_id
        FROM cart_sessions
        WHERE id = $1 AND is_abandoned = true
        FOR UPDATE
      `, [cartId]);

      if (cartResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const customerId = cartResult.rows[0].customer_id;
      await client.query(
        'DELETE FROM abandoned_cart_notifications WHERE cart_session_id = $1',
        [cartId],
      );
      await client.query(
        'DELETE FROM persistent_carts WHERE customer_id = $1',
        [customerId],
      );
      await client.query(
        'DELETE FROM cart_sessions WHERE id = $1 AND is_abandoned = true',
        [cartId],
      );
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =============================================================================
  // ABANDONED CART SETTINGS
  // =============================================================================

  async getAbandonedCartSettings(): Promise<AbandonedCartSettings | null> {
    const results = await cartDb
      .select()
      .from(abandonedCartSettings)
      .limit(1);
    
    return results[0] || null;
  }

  async updateAbandonedCartSettings(data: Partial<AbandonedCartSettings>) {
    const existing = await this.getAbandonedCartSettings();
    const sanitizedData = {
      ...data,
      timeoutMinutes: Math.min(10080, Math.max(1, Number(data.timeoutMinutes) || 30)),
      maxNotifications: Math.min(10, Math.max(1, Number(data.maxNotifications) || 3)),
      notificationIntervalMinutes: Math.min(10080, Math.max(30, Number(data.notificationIntervalMinutes) || 60)),
      autoDeleteEnabled: data.autoDeleteEnabled === true,
      autoDeleteAfterHours: Math.min(8760, Math.max(1, Number(data.autoDeleteAfterHours) || 168)),
    };
    
    if (existing) {
      await cartDb
        .update(abandonedCartSettings)
        .set({
          ...sanitizedData,
          updatedAt: new Date()
        })
        .where(eq(abandonedCartSettings.id, existing.id));
    } else {
      await cartDb
        .insert(abandonedCartSettings)
        .values({
          ...sanitizedData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
    }
  }

  // =============================================================================
  // NOTIFICATIONS
  // =============================================================================

  async createNotification(data: {
    cartSessionId: number;
    customerId: number;
    notificationType: string;
    title: string;
    message: string;
  }) {
    const [notification] = await cartDb
      .insert(abandonedCartNotifications)
      .values({
        cartSessionId: data.cartSessionId,
        customerId: data.customerId,
        notificationType: data.notificationType,
        title: data.title,
        message: data.message,
        sentAt: new Date(),
        createdAt: new Date()
      })
      .returning();
    
    return notification;
  }

  async getNotificationsForCart(cartSessionId: number) {
    return await cartDb
      .select()
      .from(abandonedCartNotifications)
      .where(eq(abandonedCartNotifications.cartSessionId, cartSessionId))
      .orderBy(desc(abandonedCartNotifications.sentAt));
  }

  async getCustomerNotifications(customerId: number, limit: number = 10) {
    return await cartDb
      .select()
      .from(abandonedCartNotifications)
      .where(eq(abandonedCartNotifications.customerId, customerId))
      .orderBy(desc(abandonedCartNotifications.sentAt))
      .limit(limit);
  }

  async markNotificationAsRead(notificationId: number) {
    await cartDb
      .update(abandonedCartNotifications)
      .set({
        isRead: true,
        readAt: new Date()
      })
      .where(eq(abandonedCartNotifications.id, notificationId));
  }

  async markNotificationAsClicked(notificationId: number) {
    await cartDb
      .update(abandonedCartNotifications)
      .set({
        clickedAt: new Date()
      })
      .where(eq(abandonedCartNotifications.id, notificationId));
  }

  async markNotificationAsConverted(notificationId: number, conversionValue: number) {
    await cartDb
      .update(abandonedCartNotifications)
      .set({
        converted: true,
        conversionValue: conversionValue.toString()
      })
      .where(eq(abandonedCartNotifications.id, notificationId));
  }

  // =============================================================================
  // ANALYTICS
  // =============================================================================

  async getCartRecoveryAnalytics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await cartDb
      .select()
      .from(cartRecoveryAnalytics)
      .where(gte(cartRecoveryAnalytics.date, startDate))
      .orderBy(desc(cartRecoveryAnalytics.date));
  }

  async createDailyAnalytics(data: {
    totalAbandonedCarts: number;
    notificationsSent: number;
    cartsRecovered: number;
    totalRecoveredValue: number;
    averageAbandonedValue: number;
  }) {
    const recoveryRate = data.totalAbandonedCarts > 0 
      ? (data.cartsRecovered / data.totalAbandonedCarts * 100)
      : 0;

    await cartDb
      .insert(cartRecoveryAnalytics)
      .values({
        date: new Date(),
        totalAbandonedCarts: data.totalAbandonedCarts,
        notificationsSent: data.notificationsSent,
        cartsRecovered: data.cartsRecovered,
        recoveryRate: recoveryRate.toString(),
        totalRecoveredValue: data.totalRecoveredValue.toString(),
        averageAbandonedValue: data.averageAbandonedValue.toString(),
        createdAt: new Date()
      });
  }

  async getOverallStats() {
    const totalAbandonedQuery = await cartDb
      .select({
        count: sql<number>`count(*)`
      })
      .from(cartSessions)
      .where(eq(cartSessions.isAbandoned, true));

    const totalNotificationsQuery = await cartDb
      .select({
        count: sql<number>`count(*)`
      })
      .from(abandonedCartNotifications);

    const totalRecoveredQuery = await cartDb
      .select({
        count: sql<number>`count(*)`
      })
      .from(abandonedCartNotifications)
      .where(eq(abandonedCartNotifications.converted, true));

    return {
      totalAbandonedCarts: totalAbandonedQuery[0]?.count || 0,
      totalNotificationsSent: totalNotificationsQuery[0]?.count || 0,
      totalRecovered: totalRecoveredQuery[0]?.count || 0,
      overallRecoveryRate: totalAbandonedQuery[0]?.count > 0 
        ? ((totalRecoveredQuery[0]?.count || 0) / (totalAbandonedQuery[0]?.count || 1) * 100).toFixed(2)
        : "0.00"
    };
  }
}

export const cartStorage = new CartStorage();