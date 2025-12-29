import {
  vendors,
  vendorUsers,
  showcaseProducts,
  shopProducts,
  type Vendor,
  type InsertVendor,
  type VendorUser,
  type InsertVendorUser,
  type ShowcaseProduct,
  type ShopProduct
} from "@shared/schema";
import {
  customerOrders,
  orderItems,
  type CustomerOrder,
  type OrderItem
} from "@shared/customer-schema";
import {
  orderManagement,
  orderStatuses
} from "@shared/order-management-schema";
import { db } from "./db";
import { eq, desc, and, or, like, sql, count, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IVendorStorage {
  // Vendor management
  getVendors(): Promise<Vendor[]>;
  getActiveVendors(): Promise<Vendor[]>;
  getApprovedVendors(): Promise<Vendor[]>;
  getPendingVendors(): Promise<Vendor[]>;
  getRejectedVendors(): Promise<Vendor[]>;
  getVendorById(id: number): Promise<Vendor | undefined>;
  getVendorByEmail(email: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor>;
  deleteVendor(id: number): Promise<void>;
  approveVendor(id: number, approvedBy: number): Promise<Vendor>;
  rejectVendor(id: number, reason: string): Promise<Vendor>;
  updateVendorStats(vendorId: number): Promise<void>;
  
  // Vendor user management
  getVendorUsers(vendorId: number): Promise<VendorUser[]>;
  getVendorUserById(id: number): Promise<VendorUser | undefined>;
  getVendorUserByUsername(username: string): Promise<VendorUser | undefined>;
  getVendorUserByEmail(email: string): Promise<VendorUser | undefined>;
  createVendorUser(user: InsertVendorUser): Promise<VendorUser>;
  updateVendorUser(id: number, user: Partial<InsertVendorUser>): Promise<VendorUser>;
  deleteVendorUser(id: number): Promise<void>;
  verifyVendorUserPassword(username: string, password: string): Promise<VendorUser | null>;
  updateVendorUserLoginInfo(userId: number, ip: string): Promise<void>;
  incrementFailedLoginAttempts(userId: number): Promise<void>;
  resetFailedLoginAttempts(userId: number): Promise<void>;
  lockVendorUser(userId: number, durationMinutes: number): Promise<void>;
  
  // Vendor products management
  getVendorShowcaseProducts(vendorId: number): Promise<ShowcaseProduct[]>;
  getVendorShopProducts(vendorId: number): Promise<ShopProduct[]>;
  getVendorProductCount(vendorId: number): Promise<number>;
  getAllVendorsProductStats(): Promise<Map<number, {
    inStock: number;
    lowStock: number;
    outOfStock: number;
    hiddenProducts: number;
    totalProducts: number;
  }>>;
  searchVendorProducts(vendorId: number, query: string): Promise<{
    showcaseProducts: ShowcaseProduct[];
    shopProducts: ShopProduct[];
  }>;
  
  // Vendor orders management
  getVendorOrders(vendorId: number): Promise<Array<CustomerOrder & { items: OrderItem[] }>>;
  getVendorOrderStats(vendorId: number): Promise<{
    totalOrders: number;
    totalRevenue: string;
    pendingOrders: number;
    completedOrders: number;
  }>;
}

export class VendorStorage implements IVendorStorage {
  // ============================================================================
  // VENDOR MANAGEMENT
  // ============================================================================
  
  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors).orderBy(desc(vendors.createdAt));
  }
  
  async getActiveVendors(): Promise<Vendor[]> {
    return await db
      .select()
      .from(vendors)
      .where(eq(vendors.isActive, true))
      .orderBy(desc(vendors.createdAt));
  }
  
  async getApprovedVendors(): Promise<Vendor[]> {
    return await db
      .select()
      .from(vendors)
      .where(and(
        eq(vendors.isActive, true),
        eq(vendors.isApproved, true)
      ))
      .orderBy(desc(vendors.createdAt));
  }
  
  async getPendingVendors(): Promise<Vendor[]> {
    return await db
      .select()
      .from(vendors)
      .where(and(
        eq(vendors.isApproved, false),
        sql`${vendors.rejectionReason} IS NULL`
      ))
      .orderBy(desc(vendors.createdAt));
  }
  
  async getRejectedVendors(): Promise<Vendor[]> {
    return await db
      .select()
      .from(vendors)
      .where(sql`${vendors.rejectionReason} IS NOT NULL`)
      .orderBy(desc(vendors.createdAt));
  }
  
  async getVendorById(id: number): Promise<Vendor | undefined> {
    const result = await db.select().from(vendors).where(eq(vendors.id, id));
    return result[0];
  }
  
  async getVendorByEmail(email: string): Promise<Vendor | undefined> {
    const result = await db
      .select()
      .from(vendors)
      .where(eq(vendors.contactEmail, email));
    return result[0];
  }
  
  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const result = await db.insert(vendors).values(vendor).returning();
    return result[0];
  }
  
  async updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor> {
    const result = await db
      .update(vendors)
      .set({
        ...vendor,
        updatedAt: new Date()
      })
      .where(eq(vendors.id, id))
      .returning();
    return result[0];
  }
  
  async deleteVendor(id: number): Promise<void> {
    await db.delete(vendors).where(eq(vendors.id, id));
  }
  
  async approveVendor(id: number, approvedBy: number): Promise<Vendor> {
    const result = await db
      .update(vendors)
      .set({
        isApproved: true,
        isActive: true,
        approvedBy,
        approvedAt: new Date(),
        rejectionReason: null,
        updatedAt: new Date()
      })
      .where(eq(vendors.id, id))
      .returning();
    return result[0];
  }
  
  async rejectVendor(id: number, reason: string): Promise<Vendor> {
    const result = await db
      .update(vendors)
      .set({
        isApproved: false,
        isActive: false,
        rejectionReason: reason,
        updatedAt: new Date()
      })
      .where(eq(vendors.id, id))
      .returning();
    return result[0];
  }
  
  async updateVendorStats(vendorId: number): Promise<void> {
    // Count total products for this vendor
    const showcaseCount = await db
      .select({ count: count() })
      .from(showcaseProducts)
      .where(eq(showcaseProducts.vendorId, vendorId));
    
    const shopCount = await db
      .select({ count: count() })
      .from(shopProducts)
      .where(eq(shopProducts.vendorId, vendorId));
    
    const totalProducts = (showcaseCount[0]?.count || 0) + (shopCount[0]?.count || 0);
    
    // Update vendor stats
    await db
      .update(vendors)
      .set({
        totalProducts,
        updatedAt: new Date()
      })
      .where(eq(vendors.id, vendorId));
  }
  
  // ============================================================================
  // VENDOR USER MANAGEMENT
  // ============================================================================
  
  async getVendorUsers(vendorId: number): Promise<VendorUser[]> {
    return await db
      .select()
      .from(vendorUsers)
      .where(eq(vendorUsers.vendorId, vendorId))
      .orderBy(desc(vendorUsers.createdAt));
  }
  
  async getVendorUserById(id: number): Promise<VendorUser | undefined> {
    const result = await db
      .select()
      .from(vendorUsers)
      .where(eq(vendorUsers.id, id));
    return result[0];
  }
  
  async getVendorUserByUsername(username: string): Promise<VendorUser | undefined> {
    const result = await db
      .select()
      .from(vendorUsers)
      .where(eq(vendorUsers.username, username));
    return result[0];
  }
  
  async getVendorUserByEmail(email: string): Promise<VendorUser | undefined> {
    const result = await db
      .select()
      .from(vendorUsers)
      .where(eq(vendorUsers.email, email));
    return result[0];
  }
  
  async createVendorUser(user: InsertVendorUser): Promise<VendorUser> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    const result = await db
      .insert(vendorUsers)
      .values({
        ...user,
        password: hashedPassword
      })
      .returning();
    return result[0];
  }
  
  async updateVendorUser(id: number, user: Partial<InsertVendorUser>): Promise<VendorUser> {
    const updateData: any = {
      ...user,
      updatedAt: new Date()
    };
    
    // Hash password if it's being updated
    if (user.password) {
      updateData.password = await bcrypt.hash(user.password, 10);
    }
    
    const result = await db
      .update(vendorUsers)
      .set(updateData)
      .where(eq(vendorUsers.id, id))
      .returning();
    return result[0];
  }
  
  async deleteVendorUser(id: number): Promise<void> {
    await db.delete(vendorUsers).where(eq(vendorUsers.id, id));
  }
  
  async verifyVendorUserPassword(username: string, password: string): Promise<VendorUser | null> {
    console.log("🔍 [VENDOR AUTH] Looking up user:", username);
    const user = await this.getVendorUserByUsername(username);
    
    if (!user) {
      console.log("❌ [VENDOR AUTH] User not found");
      return null;
    }
    
    console.log("✅ [VENDOR AUTH] User found:", { id: user.id, isActive: user.isActive });
    
    if (!user.isActive) {
      console.log("❌ [VENDOR AUTH] User is not active");
      return null;
    }
    
    // Check if user is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      console.log("❌ [VENDOR AUTH] User is locked until:", user.lockedUntil);
      return null;
    }
    
    console.log("🔐 [VENDOR AUTH] Comparing passwords...");
    const isValid = await bcrypt.compare(password, user.password);
    console.log("🔐 [VENDOR AUTH] Password valid:", isValid);
    
    if (!isValid) {
      await this.incrementFailedLoginAttempts(user.id);
      return null;
    }
    
    // Reset failed login attempts on successful login
    await this.resetFailedLoginAttempts(user.id);
    
    return user;
  }
  
  async updateVendorUserLoginInfo(userId: number, ip: string): Promise<void> {
    await db
      .update(vendorUsers)
      .set({
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        updatedAt: new Date()
      })
      .where(eq(vendorUsers.id, userId));
  }
  
  async incrementFailedLoginAttempts(userId: number): Promise<void> {
    const user = await this.getVendorUserById(userId);
    if (!user) return;
    
    const attempts = (user.failedLoginAttempts || 0) + 1;
    
    // Lock user after 5 failed attempts for 30 minutes
    if (attempts >= 5) {
      await this.lockVendorUser(userId, 30);
    } else {
      await db
        .update(vendorUsers)
        .set({
          failedLoginAttempts: attempts,
          updatedAt: new Date()
        })
        .where(eq(vendorUsers.id, userId));
    }
  }
  
  async resetFailedLoginAttempts(userId: number): Promise<void> {
    await db
      .update(vendorUsers)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date()
      })
      .where(eq(vendorUsers.id, userId));
  }
  
  async lockVendorUser(userId: number, durationMinutes: number): Promise<void> {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + durationMinutes);
    
    await db
      .update(vendorUsers)
      .set({
        lockedUntil: lockUntil,
        updatedAt: new Date()
      })
      .where(eq(vendorUsers.id, userId));
  }
  
  // ============================================================================
  // VENDOR PRODUCTS MANAGEMENT
  // ============================================================================
  
  async getVendorShowcaseProducts(vendorId: number): Promise<ShowcaseProduct[]> {
    return await db
      .select()
      .from(showcaseProducts)
      .where(eq(showcaseProducts.vendorId, vendorId))
      .orderBy(desc(showcaseProducts.createdAt));
  }
  
  async getVendorShopProducts(vendorId: number): Promise<ShopProduct[]> {
    return await db
      .select()
      .from(shopProducts)
      .where(eq(shopProducts.vendorId, vendorId))
      .orderBy(desc(shopProducts.createdAt));
  }
  
  async getVendorProductCount(vendorId: number): Promise<number> {
    const showcaseCount = await db
      .select({ count: count() })
      .from(showcaseProducts)
      .where(eq(showcaseProducts.vendorId, vendorId));
    
    const shopCount = await db
      .select({ count: count() })
      .from(shopProducts)
      .where(eq(shopProducts.vendorId, vendorId));
    
    return (showcaseCount[0]?.count || 0) + (shopCount[0]?.count || 0);
  }

  async getAllVendorsProductStats(): Promise<Map<number, {
    inStock: number;
    lowStock: number;
    outOfStock: number;
    hiddenProducts: number;
    totalProducts: number;
  }>> {
    const statsMap = new Map<number, {
      inStock: number;
      lowStock: number;
      outOfStock: number;
      hiddenProducts: number;
      totalProducts: number;
    }>();

    const stats = await db.execute(sql`
      SELECT 
        vendor_id,
        COUNT(*) as total_products,
        SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as hidden_products,
        SUM(CASE WHEN is_active = true AND stock_quantity > COALESCE(min_stock_level, 10) THEN 1 ELSE 0 END) as in_stock,
        SUM(CASE WHEN is_active = true AND stock_quantity > 0 AND stock_quantity <= COALESCE(min_stock_level, 10) THEN 1 ELSE 0 END) as low_stock,
        SUM(CASE WHEN is_active = true AND (stock_quantity IS NULL OR stock_quantity <= 0) THEN 1 ELSE 0 END) as out_of_stock
      FROM showcase_products
      WHERE vendor_id IS NOT NULL
      GROUP BY vendor_id
    `);

    for (const row of stats.rows as any[]) {
      statsMap.set(Number(row.vendor_id), {
        inStock: Number(row.in_stock) || 0,
        lowStock: Number(row.low_stock) || 0,
        outOfStock: Number(row.out_of_stock) || 0,
        hiddenProducts: Number(row.hidden_products) || 0,
        totalProducts: Number(row.total_products) || 0,
      });
    }

    return statsMap;
  }
  
  async searchVendorProducts(vendorId: number, query: string): Promise<{
    showcaseProducts: ShowcaseProduct[];
    shopProducts: ShopProduct[];
  }> {
    const searchPattern = `%${query}%`;
    
    const showcaseResults = await db
      .select()
      .from(showcaseProducts)
      .where(and(
        eq(showcaseProducts.vendorId, vendorId),
        or(
          like(showcaseProducts.name, searchPattern),
          like(showcaseProducts.sku, searchPattern),
          like(showcaseProducts.barcode, searchPattern)
        )
      ))
      .orderBy(desc(showcaseProducts.createdAt));
    
    const shopResults = await db
      .select()
      .from(shopProducts)
      .where(and(
        eq(shopProducts.vendorId, vendorId),
        or(
          like(shopProducts.name, searchPattern),
          like(shopProducts.sku, searchPattern),
          like(shopProducts.barcode, searchPattern)
        )
      ))
      .orderBy(desc(shopProducts.createdAt));
    
    return {
      showcaseProducts: showcaseResults,
      shopProducts: shopResults
    };
  }
  
  // ============================================================================
  // VENDOR ORDERS MANAGEMENT
  // ============================================================================
  
  async getVendorOrders(vendorId: number): Promise<Array<CustomerOrder & { items: OrderItem[] }>> {
    // Get order items that reference vendor's showcase products
    const showcaseOrderItems = await db
      .select({
        orderItem: orderItems,
        productId: showcaseProducts.id
      })
      .from(orderItems)
      .innerJoin(showcaseProducts, and(
        eq(orderItems.productId, showcaseProducts.id),
        eq(showcaseProducts.vendorId, vendorId)
      ));
    
    // Get order items that reference vendor's shop products
    const shopOrderItems = await db
      .select({
        orderItem: orderItems,
        productId: shopProducts.id
      })
      .from(orderItems)
      .innerJoin(shopProducts, and(
        eq(orderItems.productId, shopProducts.id),
        eq(shopProducts.vendorId, vendorId)
      ));
    
    // Combine all vendor order items
    const allVendorOrderItems = [
      ...showcaseOrderItems.map(item => item.orderItem),
      ...shopOrderItems.map(item => item.orderItem)
    ];
    
    if (allVendorOrderItems.length === 0) {
      return [];
    }
    
    // Get unique order IDs
    const orderIds = Array.from(new Set(allVendorOrderItems.map(item => item.orderId)));
    
    // Get all orders with these IDs
    const orders = await db
      .select()
      .from(customerOrders)
      .where(inArray(customerOrders.id, orderIds))
      .orderBy(desc(customerOrders.createdAt));
    
    // Group items by order and attach to orders (only vendor's items)
    const ordersWithItems = orders.map(order => {
      const items = allVendorOrderItems.filter(item => item.orderId === order.id);
      
      return {
        ...order,
        items
      };
    });
    
    return ordersWithItems;
  }
  
  async getVendorOrderStats(vendorId: number): Promise<{
    totalOrders: number;
    totalRevenue: string;
    recognizedRevenue: string;
    pendingOrders: number;
    completedOrders: number;
  }> {
    const orders = await this.getVendorOrders(vendorId);
    
    // Get order management data for all vendor orders
    const orderIds = orders.map(o => o.id);
    const orderMgmt = await db
      .select()
      .from(orderManagement)
      .where(inArray(orderManagement.customerOrderId, orderIds));
    
    // Create a map of order ID to current status
    const statusMap = new Map(
      orderMgmt.map(om => [om.customerOrderId, om.currentStatus])
    );
    
    // Statuses that indicate warehouse exit (revenue recognition point)
    const warehouseExitStatuses = [
      orderStatuses.WAREHOUSE_APPROVED,
      orderStatuses.LOGISTICS_ASSIGNED,
      orderStatuses.LOGISTICS_PROCESSING,
      orderStatuses.LOGISTICS_DISPATCHED,
      orderStatuses.LOGISTICS_DELIVERED,
      orderStatuses.COMPLETED
    ];
    
    // Calculate total revenue and recognized revenue from vendor's items only
    let totalRevenue = 0;
    let recognizedRevenue = 0;
    let pendingOrders = 0;
    let completedOrders = 0;
    
    orders.forEach(order => {
      // Sum only vendor's items in this order
      const vendorItemsTotal = order.items.reduce((sum, item) => {
        return sum + parseFloat(item.totalPrice.toString());
      }, 0);
      
      totalRevenue += vendorItemsTotal;
      
      // Get current status from order management
      const currentStatus = statusMap.get(order.id);
      
      // Recognize revenue only after warehouse exit
      if (currentStatus && warehouseExitStatuses.includes(currentStatus as any)) {
        recognizedRevenue += vendorItemsTotal;
      }
      
      // Count order status
      if (currentStatus === orderStatuses.COMPLETED || currentStatus === orderStatuses.LOGISTICS_DELIVERED) {
        completedOrders++;
      } else if (currentStatus !== orderStatuses.CANCELLED) {
        pendingOrders++;
      }
    });
    
    return {
      totalOrders: orders.length,
      totalRevenue: totalRevenue.toFixed(2),
      recognizedRevenue: recognizedRevenue.toFixed(2),
      pendingOrders,
      completedOrders
    };
  }
}

export const vendorStorage = new VendorStorage();
