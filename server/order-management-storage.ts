import { 
  orderManagement, 
  orderStatusHistory, 
  departmentAssignments,
  paymentReceipts,
  deliveryCodes,
  shippingRates,
  orderCounter,
  type OrderManagement,
  type InsertOrderManagement,
  type OrderStatusHistory,
  type InsertOrderStatusHistory,
  type DepartmentAssignment,
  type InsertDepartmentAssignment,
  type PaymentReceipt,
  type InsertPaymentReceipt,
  type DeliveryCode,
  type InsertDeliveryCode,
  type ShippingRate,
  type InsertShippingRate,
  type OrderCounter,
  type InsertOrderCounter,
  type OrderStatus,
  type Department,
  orderStatuses
} from "@shared/order-management-schema";
import { customerOrders, orderItems } from "@shared/customer-schema";
import { crmCustomers } from "@shared/schema";
import { showcaseProducts as products } from "@shared/showcase-schema";
import { shopProducts } from "@shared/shop-schema";
import { db } from "./db";
import { pool as dbPool } from "./db";
import { eq, and, desc, asc, inArray, sql, isNotNull } from "drizzle-orm";
import ProformaInvoiceConverter from "./proforma-invoice-converter";
import { AutoInvoiceConverter } from "./auto-invoice-converter";
import { orderConsolidationService } from "./order-consolidation-service";

export interface IOrderManagementStorage {
  // Order Management
  createOrderManagement(orderData: InsertOrderManagement): Promise<OrderManagement>;
  getOrderManagementById(id: number): Promise<OrderManagement | undefined>;
  getOrderById(id: number): Promise<OrderManagement | undefined>;
  getOrderManagementByCustomerOrderId(customerOrderId: number): Promise<OrderManagement | undefined>;
  updateOrderManagement(id: number, updateData: Partial<InsertOrderManagement>): Promise<OrderManagement>;
  updateOrderStatus(id: number, newStatus: OrderStatus, changedBy: number, department: Department, notes?: string): Promise<OrderManagement>;
  
  // Workflow sequence validation
  canDepartmentViewOrder(orderId: number, department: Department): Promise<boolean>;
  getNextValidStatuses(currentStatus: OrderStatus, department: Department): OrderStatus[];
  
  // Department filtering (respects sequence)
  getOrdersByDepartment(department: Department, status?: OrderStatus[]): Promise<OrderManagement[]>;
  getOrdersByStatus(status: OrderStatus | OrderStatus[]): Promise<OrderManagement[]>;
  getFinancialPendingOrders(): Promise<OrderManagement[]>;
  getFinancialApprovedOrders(): Promise<any[]>;
  getWarehousePendingOrders(): Promise<OrderManagement[]>;
  getLogisticsPendingOrders(): Promise<OrderManagement[]>;
  
  // Delivery information
  updateDeliveryInfo(orderId: number, deliveryData: {
    trackingNumber?: string;
    estimatedDeliveryDate?: string;
    deliveryPersonName?: string;
    deliveryPersonPhone?: string;
    deliveryMethod?: string;
    transportationType?: string;
    postalServiceName?: string;
    postalTrackingCode?: string;
    postalWeight?: string;
    postalPrice?: string;
    postalInsurance?: boolean;
    vehicleType?: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    driverName?: string;
    driverPhone?: string;
    driverLicense?: string;
    deliveryCompanyName?: string;
    deliveryCompanyPhone?: string;
    deliveryCompanyAddress?: string;
  }): Promise<OrderManagement>;
  
  // Payment receipts
  uploadPaymentReceipt(receiptData: InsertPaymentReceipt): Promise<PaymentReceipt>;
  getPaymentReceiptsByOrder(customerOrderId: number): Promise<PaymentReceipt[]>;
  
  // Weight calculation
  calculateOrderWeight(customerOrderId: number): Promise<number>;
  
  // Department assignments
  assignUserToDepartment(assignmentData: InsertDepartmentAssignment): Promise<DepartmentAssignment>;
  getUserDepartments(adminUserId: number): Promise<DepartmentAssignment[]>;
  getDepartmentUsers(department: Department): Promise<DepartmentAssignment[]>;
  
  // Delivery codes
  generateDeliveryCode(orderManagementId: number, customerPhone?: string): Promise<string>;
  verifyDeliveryCode(code: string, verifiedBy: string): Promise<boolean>;
  getDeliveryCodeByOrder(orderManagementId: number): Promise<DeliveryCode | undefined>;
  sendManualDeliveryCode(orderManagementId: number): Promise<{success: boolean, deliveryCode?: string, error?: string}>;
  
  // Status history
  getOrderStatusHistory(orderManagementId: number): Promise<OrderStatusHistory[]>;
  
  // Dashboard stats
  getDepartmentStats(department: Department): Promise<{
    pendingCount: number;
    processedToday: number;
    averageProcessingTime: number;
  }>;
  
  // Admin overview
  getOrdersOverview(): Promise<{
    totalOrders: number;
    pendingFinancial: number;
    pendingWarehouse: number;
    pendingLogistics: number;
    completedToday: number;
    cancelledToday: number;
  }>;

  // Get all orders with details for tracking
  getAllOrdersWithDetails(): Promise<any[]>;

  // Shipping rates management
  getShippingRates(filters?: { cityName?: string; isActive?: boolean }): Promise<ShippingRate[]>;
  createShippingRate(rateData: InsertShippingRate): Promise<ShippingRate>;
  updateShippingRate(id: number, updateData: Partial<InsertShippingRate>): Promise<ShippingRate>;
  deleteShippingRate(id: number): Promise<void>;
  getShippingRateByMethod(deliveryMethod: string, city?: string): Promise<ShippingRate | undefined>;
  getAvailableShippingMethods(criteria: {
    city?: string;
    province?: string;
    orderTotal: number;
  }): Promise<ShippingRate[]>;
  calculateShippingCost(criteria: {
    deliveryMethod: string;
    city?: string;
    province?: string;
    orderTotal: number;
    weight: number;
  }): Promise<number>;
  
  // M[YY][NNNNN] order numbering - SEQUENTIAL & GAP-FREE
  generateOrderNumber(): Promise<string>; // 🚨 DEPRECATED: Can create gaps!
  generateOrderNumberInTransaction(transactionClient?: any): Promise<string>; // ✅ RECOMMENDED: Gap-free
  createOrderWithSequentialNumber(orderData: any): Promise<{ order: any; orderNumber: string }>; // ✅ COMPLETE SOLUTION
  resetOrderCounter(year?: number): Promise<void>;
  
  // Order details with items
  getOrderWithItems(orderId: number): Promise<any>;
  
  // REMOVED: processAutomaticBankPaymentApproval - bank payments now go directly to warehouse
}

export class OrderManagementStorage implements IOrderManagementStorage {
  
  async createOrderManagement(orderData: InsertOrderManagement): Promise<OrderManagement> {
    const [order] = await db
      .insert(orderManagement)
      .values(orderData)
      .returning();
    
    // Log initial status
    await this.logStatusChange(order.id, null, order.currentStatus as OrderStatus, null, null);
    
    return order;
  }
  
  async getOrderManagementById(id: number): Promise<OrderManagement | undefined> {
    const [order] = await db
      .select()
      .from(orderManagement)
      .where(eq(orderManagement.id, id));
    return order;
  }
  
  async getOrderById(id: number): Promise<OrderManagement | undefined> {
    // Alias for getOrderManagementById to maintain compatibility with routes.ts
    return this.getOrderManagementById(id);
  }
  
  async getOrderManagementByCustomerOrderId(customerOrderId: number): Promise<OrderManagement | undefined> {
    const [order] = await db
      .select()
      .from(orderManagement)
      .where(eq(orderManagement.customerOrderId, customerOrderId));
    return order;
  }

  async getOrderByOrderNumber(orderNumber: string): Promise<OrderManagement | undefined> {
    try {
      // Use direct SQL to avoid Drizzle ORM issues
      const result = await dbPool.query(`
        SELECT om.* 
        FROM order_management om
        LEFT JOIN customer_orders co ON om.customer_order_id = co.id
        WHERE co.order_number = $1
        LIMIT 1
      `, [orderNumber]);
      
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Error fetching order by order number:', error);
      return undefined;
    }
  }
  
  async updateOrderManagement(id: number, updateData: Partial<InsertOrderManagement>): Promise<OrderManagement> {
    const dataWithTimestamp = {
      ...updateData,
      updatedAt: new Date()
    };
    
    const [updatedOrder] = await db
      .update(orderManagement)
      .set(dataWithTimestamp)
      .where(eq(orderManagement.id, id))
      .returning();
    
    return updatedOrder;
  }
  
  async updateOrderStatus(
    id: number, 
    newStatus: OrderStatus, 
    changedBy: number, 
    department: Department, 
    notes?: string
  ): Promise<OrderManagement> {
    console.log('🔍 [ORDER STATUS] Looking for order with ID:', id);
    
    // Try to get current order by ID first, then by customerOrderId
    let currentOrder = await this.getOrderManagementById(id);
    if (!currentOrder) {
      console.log('🔍 [ORDER STATUS] Not found by ID, trying customerOrderId:', id);
      currentOrder = await this.getOrderManagementByCustomerOrderId(id);
    }
    
    if (!currentOrder) {
      console.log('❌ [ORDER STATUS] Order not found by ID or customerOrderId:', id);
      throw new Error('Order not found');
    }
    
    console.log('✅ [ORDER STATUS] Found order:', { 
      id: currentOrder.id, 
      customerOrderId: currentOrder.customerOrderId, 
      currentStatus: currentOrder.currentStatus 
    });
    
    // Update order status and department-specific fields
    const updateData: Partial<OrderManagement> = {
      currentStatus: newStatus,
      updatedAt: new Date(),
    };
    
    // Update department-specific fields
    if (department === 'financial') {
      updateData.financialReviewerId = changedBy;
      // 🚨 CRITICAL: Only set financialReviewedAt when explicitly approving (FINANCIAL_APPROVED status)
      // NOT for routine updates or auto-sync transitions like warehouse_pending
      if (newStatus === orderStatuses.FINANCIAL_APPROVED) {
        updateData.financialReviewedAt = new Date();
      }
      if (notes) updateData.financialNotes = notes;
      
      // 📋 CONSOLIDATION: After financial approval, consolidate complete order data
      if (newStatus === orderStatuses.FINANCIAL_APPROVED) {
        try {
          console.log(`📋 [CONSOLIDATION] Starting consolidation for financial approval of order ${currentOrder.id}`);
          await orderConsolidationService.consolidateOrderData(currentOrder.id, currentOrder.customerOrderId);
          console.log(`✅ [CONSOLIDATION] Order data successfully consolidated for order ${currentOrder.id}`);
        } catch (consolidationError) {
          console.error(`❌ [CONSOLIDATION] Failed to consolidate order ${currentOrder.id}:`, consolidationError);
          // Don't fail the order update if consolidation fails - it can be retried later
        }
      }
    } else if (department === 'warehouse') {
      updateData.warehouseAssigneeId = changedBy;
      updateData.warehouseProcessedAt = new Date();
      if (notes) updateData.warehouseNotes = notes;
    } else if (department === 'logistics') {
      updateData.logisticsAssigneeId = changedBy;
      updateData.logisticsProcessedAt = new Date();
      if (notes) updateData.logisticsNotes = notes;
    }
    
    // Generate delivery code when order reaches logistics (from any department) and send SMS using template 3
    console.log(`📱 [DELIVERY CODE CHECK] Status: ${newStatus}, Expected: ${orderStatuses.WAREHOUSE_APPROVED}`);
    console.log(`📱 [DELIVERY CODE CHECK] Condition met: ${newStatus === orderStatuses.LOGISTICS_DISPATCHED || newStatus === orderStatuses.LOGISTICS_ASSIGNED || newStatus === orderStatuses.WAREHOUSE_APPROVED}`);
    
    if (newStatus === orderStatuses.LOGISTICS_DISPATCHED || 
        newStatus === orderStatuses.LOGISTICS_ASSIGNED ||
        newStatus === orderStatuses.WAREHOUSE_APPROVED) {
      console.log(`📱 [DELIVERY CODE] Starting delivery code generation for order ${currentOrder.id}...`);
      try {
        // Get customer information and order details including recipient mobile
        const orderWithCustomer = await db
          .select({
            customerPhone: crmCustomers.phone,
            recipientMobile: customerOrders.recipientMobile,
            customerFirstName: crmCustomers.firstName,
            customerLastName: crmCustomers.lastName,
            customerOrderId: orderManagement.customerOrderId,
            orderNumber: customerOrders.orderNumber
          })
          .from(orderManagement)
          .leftJoin(customerOrders, eq(orderManagement.customerOrderId, customerOrders.id))
          .leftJoin(crmCustomers, eq(customerOrders.customerId, crmCustomers.id))
          .where(eq(orderManagement.id, currentOrder.id))
          .limit(1);

        console.log(`📱 [DELIVERY CODE] Customer lookup result:`, JSON.stringify(orderWithCustomer[0], null, 2));

        if (orderWithCustomer[0]?.customerPhone) {
          const customerData = orderWithCustomer[0];
          const customerName = `${customerData.customerFirstName || ''} ${customerData.customerLastName || ''}`.trim();
          const orderNumber = customerData.orderNumber || `سفارش #${customerData.customerOrderId}`;
          
          // Determine target phone: use recipient mobile if provided, otherwise customer phone
          const targetPhone = customerData.recipientMobile || customerData.customerPhone;
          const phoneSource = customerData.recipientMobile ? 'recipient mobile' : 'customer phone';
          
          // Generate delivery code
          const deliveryCode = await this.generateDeliveryCode(currentOrder.id, targetPhone);
          
          // Send SMS using template 3 to target phone
          await this.sendDeliveryCodeSms(
            targetPhone, 
            deliveryCode, 
            customerData.customerOrderId,
            customerName || 'مشتری عزیز',
            orderNumber
          );
          
          console.log(`✅ [AUTO SMS TEMPLATE 3] Delivery code ${deliveryCode} sent to ${phoneSource}: ${targetPhone} for order ${orderNumber}`);
        } else {
          console.log(`❌ [AUTO SMS] No customer phone found for order ${currentOrder.id}`);
        }
      } catch (smsError) {
        console.error(`❌ [AUTO SMS] Error sending delivery code SMS for order ${currentOrder.id}:`, smsError);
      }
    }
    
    const updatedResult = await db
      .update(orderManagement)
      .set(updateData)
      .where(eq(orderManagement.id, currentOrder.id))
      .returning();
    
    const updatedOrder = updatedResult[0];
    
    console.log('✅ [ORDER STATUS] Order updated successfully:', { 
      id: updatedOrder.id, 
      customerOrderId: updatedOrder.customerOrderId, 
      newStatus: updatedOrder.currentStatus 
    });
    
    // Log status change
    await this.logStatusChange(currentOrder.id, currentOrder.currentStatus as OrderStatus, newStatus, changedBy, department, notes);
    
    // 🧾 AUTO-INVOICE CONVERSION: Check if order status changed to shipped/delivered
    try {
      // Get order number for auto-conversion
      const orderDetails = await db
        .select({ orderNumber: customerOrders.orderNumber })
        .from(customerOrders)
        .where(eq(customerOrders.id, updatedOrder.customerOrderId))
        .limit(1);
      
      if (orderDetails[0]?.orderNumber) {
        const orderNumber = orderDetails[0].orderNumber;
        console.log(`🔍 [AUTO INVOICE] Checking auto-conversion for order ${orderNumber} with new status: ${newStatus}`);
        
        // Trigger auto-conversion if status is shipped or delivered
        await AutoInvoiceConverter.handleOrderStatusChange(orderNumber, newStatus);
      }
    } catch (autoConversionError) {
      console.error(`❌ [AUTO INVOICE] Error in auto-conversion check:`, autoConversionError);
      // Don't fail the order update if auto-conversion fails
    }
    
    return updatedOrder;
  }
  
  // کنترل اینکه آیا بخش مشخص می‌تواند سفارش را ببیند یا نه
  async canDepartmentViewOrder(orderId: number, department: Department): Promise<boolean> {
    const order = await this.getOrderManagementById(orderId);
    if (!order) return false;
    
    const currentStatus = order.currentStatus;
    
    switch (department) {
      case 'financial':
        // بخش مالی سفارشات در انتظار، با رسید پرداخت و در مراحل بررسی مالی را می‌بیند
        // سفارشات تأیید شده (FINANCIAL_APPROVED) از بخش مالی حذف شده و به انبار منتقل می‌شوند
        return [
          'pending', // سفارشات در انتظار که نیاز به بررسی فیش بانکی دارند
          orderStatuses.PENDING_PAYMENT,
          orderStatuses.PAYMENT_UPLOADED,
          orderStatuses.FINANCIAL_REVIEWING,
          orderStatuses.FINANCIAL_REJECTED // فقط سفارشات رد شده در بخش مالی باقی می‌مانند
        ].includes(currentStatus as any);
        
      case 'warehouse':
        // انبار فقط سفارشات در حال پردازش را می‌بیند - تایید شده‌ها به لجستیک منتقل می‌شوند
        return [
          orderStatuses.WAREHOUSE_PENDING,
          orderStatuses.WAREHOUSE_NOTIFIED,
          orderStatuses.WAREHOUSE_PROCESSING,
          'warehouse_verified', // مرحله اول تایید انبار
          // orderStatuses.WAREHOUSE_APPROVED, // حذف: سفارشات تایید شده دیگر در انبار نمایش داده نمی‌شوند
          orderStatuses.WAREHOUSE_REJECTED
        ].includes(currentStatus as any);
        
      case 'logistics':
        // لجستیک فقط سفارشات تایید شده انبار را می‌بیند
        return [
          orderStatuses.WAREHOUSE_APPROVED,
          orderStatuses.LOGISTICS_ASSIGNED,
          orderStatuses.LOGISTICS_PROCESSING,
          orderStatuses.LOGISTICS_DISPATCHED,
          orderStatuses.LOGISTICS_DELIVERED,
          orderStatuses.COMPLETED
        ].includes(currentStatus as any);
        
      default:
        return false;
    }
  }
  
  // تعیین وضعیت‌های مجاز بعدی برای هر بخش
  getNextValidStatuses(currentStatus: OrderStatus, department: Department): OrderStatus[] {
    switch (department) {
      case 'financial':
        if (currentStatus === orderStatuses.PAYMENT_UPLOADED) {
          return [orderStatuses.FINANCIAL_REVIEWING, orderStatuses.FINANCIAL_REJECTED];
        }
        if (currentStatus === orderStatuses.FINANCIAL_REVIEWING) {
          return [orderStatuses.FINANCIAL_APPROVED, orderStatuses.FINANCIAL_REJECTED];
        }
        break;
        
      case 'warehouse':
        if (currentStatus === orderStatuses.FINANCIAL_APPROVED) {
          return [orderStatuses.WAREHOUSE_NOTIFIED, orderStatuses.WAREHOUSE_PROCESSING];
        }
        if (currentStatus === orderStatuses.WAREHOUSE_PROCESSING) {
          return ['warehouse_verified' as OrderStatus, orderStatuses.WAREHOUSE_REJECTED];
        }
        if (currentStatus === 'warehouse_verified') {
          return [orderStatuses.WAREHOUSE_APPROVED, orderStatuses.WAREHOUSE_REJECTED];
        }
        break;
        
      case 'logistics':
        if (currentStatus === orderStatuses.WAREHOUSE_APPROVED) {
          return [orderStatuses.LOGISTICS_ASSIGNED];
        }
        if (currentStatus === orderStatuses.LOGISTICS_ASSIGNED) {
          return [orderStatuses.LOGISTICS_PROCESSING];
        }
        if (currentStatus === orderStatuses.LOGISTICS_PROCESSING) {
          return [orderStatuses.LOGISTICS_DISPATCHED];
        }
        if (currentStatus === orderStatuses.LOGISTICS_DISPATCHED) {
          return [orderStatuses.LOGISTICS_DELIVERED];
        }
        if (currentStatus === orderStatuses.LOGISTICS_DELIVERED) {
          return [orderStatuses.COMPLETED];
        }
        break;
    }
    
    return [];
  }
  
  private async logStatusChange(
    orderManagementId: number,
    fromStatus: OrderStatus | null,
    toStatus: OrderStatus,
    changedBy: number | null,
    department: Department | null,
    notes?: string
  ): Promise<void> {
    await db.insert(orderStatusHistory).values({
      orderManagementId,
      fromStatus,
      toStatus,
      changedBy,
      changedByDepartment: department,
      notes,
    });
  }
  
  // Helper method to calculate order weight from items
  async calculateOrderWeight(customerOrderId: number): Promise<number> {
    try {
      console.log('🏋️ [WEIGHT] Calculating weight for customer order:', customerOrderId);
      
      const items = await db.select({
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        productWeight: shopProducts.weight // وزن از جدول shop_products
      })
      .from(orderItems)
      .leftJoin(shopProducts, eq(orderItems.productId, shopProducts.id))
      .where(eq(orderItems.orderId, customerOrderId));
      
      let totalWeight = 0;
      
      for (const item of items) {
        const weight = parseFloat(item.productWeight || '0');
        const quantity = item.quantity;
        const itemTotalWeight = weight * quantity;
        
        console.log(`🏋️ [WEIGHT] Item ${item.productId}: ${weight}kg x ${quantity} = ${itemTotalWeight}kg`);
        totalWeight += itemTotalWeight;
      }
      
      console.log(`🏋️ [WEIGHT] Total calculated weight for order ${customerOrderId}: ${totalWeight}kg`);
      return totalWeight;
    } catch (error) {
      console.error('❌ [WEIGHT] Error calculating order weight:', error);
      return 0;
    }
  }

  async getOrdersByDepartment(department: Department, statuses?: OrderStatus[]): Promise<any[]> {
    console.log('🔍 [DEPARTMENT] getOrdersByDepartment called with department:', department);
    
    let query = db.select({
      // Order Management fields
      id: orderManagement.id,
      customerOrderId: orderManagement.customerOrderId,
      currentStatus: orderManagement.currentStatus,
      deliveryCode: orderManagement.deliveryCode,
      financialReviewerId: orderManagement.financialReviewerId,
      financialReviewedAt: orderManagement.financialReviewedAt,
      financialNotes: orderManagement.financialNotes,
      paymentReceiptUrl: orderManagement.paymentReceiptUrl,
      
      // Warehouse department fields
      warehouseAssigneeId: orderManagement.warehouseAssigneeId,
      warehouseProcessedAt: orderManagement.warehouseProcessedAt,
      warehouseNotes: orderManagement.warehouseNotes,
      
      // Logistics department fields  
      logisticsAssigneeId: orderManagement.logisticsAssigneeId,
      logisticsProcessedAt: orderManagement.logisticsProcessedAt,
      logisticsNotes: orderManagement.logisticsNotes,
      
      createdAt: orderManagement.createdAt,
      updatedAt: orderManagement.updatedAt,
      
      // Weight and delivery information
      totalWeight: orderManagement.totalWeight,
      weightUnit: orderManagement.weightUnit,
      deliveryMethod: orderManagement.deliveryMethod,
      transportationType: orderManagement.transportationType,
      trackingNumber: orderManagement.trackingNumber,
      estimatedDeliveryDate: orderManagement.estimatedDeliveryDate,
      actualDeliveryDate: orderManagement.actualDeliveryDate,
      deliveryPersonName: orderManagement.deliveryPersonName,
      deliveryPersonPhone: orderManagement.deliveryPersonPhone,
      postalServiceName: orderManagement.postalServiceName,
      postalTrackingCode: orderManagement.postalTrackingCode,
      vehicleType: orderManagement.vehicleType,
      vehiclePlate: orderManagement.vehiclePlate,
      vehicleModel: orderManagement.vehicleModel,
      vehicleColor: orderManagement.vehicleColor,
      driverName: orderManagement.driverName,
      driverPhone: orderManagement.driverPhone,
      deliveryCompanyName: orderManagement.deliveryCompanyName,
      deliveryCompanyPhone: orderManagement.deliveryCompanyPhone,
      
      // Customer Order fields - مبلغ و کارنسی و شماره سفارش
      totalAmount: customerOrders.totalAmount,
      shippingCost: customerOrders.shippingCost, // هزینه حمل
      currency: customerOrders.currency,
      orderNumber: customerOrders.orderNumber, // شماره سفارش M[YY][NNNNN]
      paymentMethod: customerOrders.paymentMethod, // نوع تسویه حساب
      
      // Customer info
      customerFirstName: crmCustomers.firstName,
      customerLastName: crmCustomers.lastName,
      customerEmail: crmCustomers.email,
      customerPhone: crmCustomers.phone,
      
      // Delivery Address info - JSON fields from customer_orders
      shippingAddress: customerOrders.shippingAddress,
      billingAddress: customerOrders.billingAddress,
      recipientName: customerOrders.recipientName,
      recipientPhone: customerOrders.recipientPhone,
      recipientAddress: customerOrders.recipientAddress,
      deliveryNotes: customerOrders.deliveryNotes,
      
      // GPS Location data for logistics coordination
      gpsLatitude: customerOrders.gpsLatitude,
      gpsLongitude: customerOrders.gpsLongitude,
      locationAccuracy: customerOrders.locationAccuracy,
      
      // Payment Receipt info - FIXED: Use customer_orders.receipt_path as primary source
      receiptUrl: customerOrders.receiptPath, // Primary source for receipts
      receiptFileName: paymentReceipts.originalFileName,
      receiptMimeType: paymentReceipts.mimeType,
    })
    .from(orderManagement)
    .leftJoin(customerOrders, eq(orderManagement.customerOrderId, customerOrders.id))
    .leftJoin(crmCustomers, eq(customerOrders.customerId, crmCustomers.id))
    .leftJoin(paymentReceipts, eq(paymentReceipts.customerOrderId, customerOrders.id));
    
    if (department === 'financial') {
      // بخش مالی فقط سفارشات در مراحل مالی را می‌بیند - جلوگیری از تکرار
      const financialStatuses = statuses || [
        'pending', // سفارشات در انتظار - مهم: این status در ابتدای سفارش ست می‌شود
        'finance_pending', // سفارشات آماده بررسی مالی - CRITICAL: اضافه شد برای M2511214
        orderStatuses.PENDING_PAYMENT,
        orderStatuses.PAYMENT_UPLOADED, 
        orderStatuses.FINANCIAL_REVIEWING,
        orderStatuses.FINANCIAL_APPROVED, // نمایش سفارشات تایید شده برای visibility
        orderStatuses.FINANCIAL_REJECTED // فقط سفارشات رد شده در مالی باقی می‌مانند
      ];
      
      console.log('🔍 [FINANCIAL] Searching for orders with statuses (financial stage only):', financialStatuses);
      console.log('🚫 [DUPLICATION FIX] Financial department shows only financial-stage orders to prevent duplication');
      
      query = query.where(inArray(orderManagement.currentStatus, financialStatuses));
    } else if (department === 'warehouse') {
      // انبار فقط سفارشات در مراحل انبار را می‌بیند - جلوگیری از تکرار
      const warehouseStatuses = statuses || [
        orderStatuses.WAREHOUSE_PENDING, // سفارشات منتظر انبار
        orderStatuses.FINANCIAL_APPROVED, // تایید شده توسط مالی و آماده ورود به انبار
        orderStatuses.WAREHOUSE_NOTIFIED,
        orderStatuses.WAREHOUSE_PROCESSING,
        'warehouse_verified', // مرحله اول تایید انبار
        orderStatuses.WAREHOUSE_APPROVED, // تایید نهایی انبار
        orderStatuses.WAREHOUSE_REJECTED // رد شده توسط انبار
      ];
      console.log('🔍 [WAREHOUSE] Searching for orders with statuses (warehouse stage only):', warehouseStatuses);
      console.log('🚫 [DUPLICATION FIX] Warehouse department shows only warehouse-stage orders to prevent duplication');
      query = query.where(inArray(orderManagement.currentStatus, warehouseStatuses));
    } else if (department === 'logistics') {
      // لجستیک فقط سفارشات در مراحل لجستیک را می‌بیند - جلوگیری از تکرار
      const logisticsStatuses = statuses || [
        orderStatuses.WAREHOUSE_APPROVED, // تایید شده توسط انبار و آماده ورود به لجستیک
        'in_transit', // در حال ارسال
        'shipped', // ارسال شده
        orderStatuses.LOGISTICS_ASSIGNED,
        orderStatuses.LOGISTICS_PROCESSING,
        orderStatuses.LOGISTICS_DISPATCHED
      ];
      console.log('🔍 [LOGISTICS] Searching for orders with statuses (logistics stage only):', logisticsStatuses);
      console.log('🚫 [DUPLICATION FIX] Logistics department shows only logistics-stage orders to prevent duplication');
      query = query.where(inArray(orderManagement.currentStatus, logisticsStatuses));
    }
    
    const results = await query.orderBy(asc(orderManagement.createdAt)); // سفارشات قدیمی‌تر در بالای لیست
    
    console.log('📊 [DEPARTMENT] Retrieved', results.length, 'orders for department:', department);
    if (results.length > 0) {
      console.log('📊 [DEPARTMENT] First order sample:', JSON.stringify(results[0], null, 2));
    } else {
      console.log('📊 [DEPARTMENT] No orders found - checking basic count...');
      const basicCount = await db.select({ count: sql`count(*)` }).from(orderManagement);
      console.log('📊 [DEPARTMENT] Total orders in order_management table:', basicCount[0]);
    }
    
    // Transform results to include customer info, receipt info, and calculated weight
    const transformedResults = await Promise.all(results.map(async (row) => {
      // Calculate weight if not already stored
      const calculatedWeight = row.totalWeight || await this.calculateOrderWeight(row.customerOrderId);
      
      return {
        id: row.id,
        customerOrderId: row.customerOrderId,
        currentStatus: row.currentStatus,
        deliveryCode: row.deliveryCode,
        totalAmount: row.totalAmount,
        currency: row.currency,
        orderNumber: row.orderNumber, // شماره سفارش M[YY][NNNNN] یا فرمت قدیمی
        paymentMethod: row.paymentMethod, // 🔥 CRITICAL: Include payment method from database
        
        // Weight and delivery information - with calculated weight
        totalWeight: calculatedWeight,
        calculatedWeight: calculatedWeight, // For frontend compatibility
        weightUnit: row.weightUnit || 'kg',
        deliveryMethod: row.deliveryMethod,
        transportationType: row.transportationType,
        trackingNumber: row.trackingNumber,
        estimatedDeliveryDate: row.estimatedDeliveryDate,
        actualDeliveryDate: row.actualDeliveryDate,
        deliveryPersonName: row.deliveryPersonName,
        deliveryPersonPhone: row.deliveryPersonPhone,
        postalServiceName: row.postalServiceName,
        postalTrackingCode: row.postalTrackingCode,
        vehicleType: row.vehicleType,
        vehiclePlate: row.vehiclePlate,
        vehicleModel: row.vehicleModel,
        vehicleColor: row.vehicleColor,
        driverName: row.driverName,
        driverPhone: row.driverPhone,
        deliveryCompanyName: row.deliveryCompanyName,
        deliveryCompanyPhone: row.deliveryCompanyPhone,
        
        financialReviewerId: row.financialReviewerId,
        financialReviewedAt: row.financialReviewedAt,
        financialNotes: row.financialNotes,
        paymentReceiptUrl: row.paymentReceiptUrl || row.receiptUrl, // Use receipt from payment_receipts if available
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        customer: {
          firstName: row.customerFirstName,
          lastName: row.customerLastName,
          email: row.customerEmail,
          phone: row.customerPhone,
        },
        
        // Delivery Address information - Extract from JSON if recipient fields are empty  
        shippingAddress: row.shippingAddress,
        billingAddress: row.billingAddress,
        recipientName: (() => {
          if (row.recipientName) return row.recipientName;
          try {
            const shippingData = typeof row.shippingAddress === 'string' 
              ? JSON.parse(row.shippingAddress) 
              : row.shippingAddress;
            return shippingData?.name || null;
          } catch { return null; }
        })(),
        recipientPhone: (() => {
          if (row.recipientPhone) return row.recipientPhone;
          try {
            const shippingData = typeof row.shippingAddress === 'string' 
              ? JSON.parse(row.shippingAddress) 
              : row.shippingAddress;
            return shippingData?.phone || null;
          } catch { return null; }
        })(),
        recipientAddress: (() => {
          if (row.recipientAddress) return row.recipientAddress;
          try {
            const shippingData = typeof row.shippingAddress === 'string' 
              ? JSON.parse(row.shippingAddress) 
              : row.shippingAddress;
            return shippingData?.address || null;
          } catch { return null; }
        })(),
        deliveryNotes: row.deliveryNotes,
        
        // GPS Location data for distribution partner coordination
        gpsLatitude: row.gpsLatitude,
        gpsLongitude: row.gpsLongitude,
        locationAccuracy: row.locationAccuracy,
        hasGpsLocation: !!(row.gpsLatitude && row.gpsLongitude),
        
        receipt: row.receiptUrl ? {
          url: row.receiptUrl,
          fileName: row.receiptFileName,
          mimeType: row.receiptMimeType,
        } : null
      };
    }));
    
    return transformedResults;
  }
  
  async getFinancialPendingOrders(): Promise<OrderManagement[]> {
    return this.getOrdersByDepartment('financial');
  }

  // Add customer order to order management system
  async addCustomerOrderToManagement(customerOrderId: number): Promise<OrderManagement> {
    console.log(`📋 [ORDER MANAGEMENT] Adding customer order ${customerOrderId} to management system`);
    
    // Check if already exists
    const existing = await this.getOrderManagementByCustomerOrderId(customerOrderId);
    if (existing) {
      console.log(`📋 [ORDER MANAGEMENT] Order ${customerOrderId} already exists in management system`);
      return existing;
    }

    // Get customer order details to check payment method
    const [customerOrder] = await db
      .select({
        paymentMethod: customerOrders.paymentMethod,
        orderNumber: customerOrders.orderNumber,
        paymentStatus: customerOrders.paymentStatus
      })
      .from(customerOrders)
      .where(eq(customerOrders.id, customerOrderId));

    if (!customerOrder) {
      throw new Error(`Customer order ${customerOrderId} not found`);
    }

    // Determine initial status based on payment method
    let initialStatus = 'pending' as OrderStatus;
    
    // For wallet payments that are already paid, set to payment_uploaded for immediate financial review
    if ((customerOrder.paymentMethod === 'wallet_full' || customerOrder.paymentMethod === 'wallet_partial') 
        && customerOrder.paymentStatus === 'paid') {
      initialStatus = 'payment_uploaded';
      console.log(`💰 [WALLET ORDER] Setting wallet order ${customerOrder.orderNumber} to payment_uploaded status for financial review`);
    }

    // Create new order management entry with payment method from customer order
    const orderData: InsertOrderManagement = {
      customerOrderId,
      currentStatus: initialStatus,
      deliveryMethod: 'courier',
      weightUnit: 'kg',
      paymentMethod: customerOrder.paymentMethod // 🔥 CRITICAL: Copy payment method from customer order
    };

    const newOrder = await this.createOrderManagement(orderData);
    console.log(`✅ [ORDER MANAGEMENT] Added customer order ${customerOrderId} to management system with ID ${newOrder.id}`);
    
    // IMPORTANT: تایید خودکار کیف پول غیرفعال شده - همه پرداخت‌ها نیاز به تایید دستی دارند
    if ((customerOrder.paymentMethod === 'wallet_full' || customerOrder.paymentMethod === 'wallet_partial') 
        && customerOrder.paymentStatus === 'paid') {
      console.log(`🚫 [AUTO-APPROVAL] DISABLED for wallet order ${customerOrder.orderNumber} - requires manual financial approval`);
      // this.scheduleWalletAutoApproval(customerOrderId); // DISABLED
    }
    
    return newOrder;
  }

  // Auto-approval scheduler for wallet payments - DISABLED
  private scheduleWalletAutoApproval(customerOrderId: number) {
    console.log(`🚫 [AUTO-APPROVAL] DISABLED - Wallet order ${customerOrderId} requires manual financial approval`);
    console.log(`💡 [AUTO-APPROVAL] All wallet payments must be manually approved by financial department`);
    // ALL AUTO-APPROVAL FUNCTIONALITY DISABLED
    return;
  }

  // Migrate all customer orders to order management system
  async migrateCustomerOrdersToManagement(): Promise<void> {
    console.log(`🔄 [MIGRATION] Starting customer orders migration to order management system`);
    
    // Get all customer orders that are not in order management using isNull
    const customerOrdersWithoutManagement = await db
      .select({
        id: customerOrders.id,
        orderNumber: customerOrders.orderNumber,
        status: customerOrders.status,
        paymentStatus: customerOrders.paymentStatus
      })
      .from(customerOrders)
      .leftJoin(orderManagement, eq(customerOrders.id, orderManagement.customerOrderId))
      .where(sql`${orderManagement.id} IS NULL`);

    console.log(`🔄 [MIGRATION] Found ${customerOrdersWithoutManagement.length} customer orders to migrate`);

    let migratedCount = 0;
    for (const customerOrder of customerOrdersWithoutManagement) {
      try {
        await this.addCustomerOrderToManagement(customerOrder.id);
        migratedCount++;
        console.log(`✅ [MIGRATION] Migrated order ${customerOrder.orderNumber} (${migratedCount}/${customerOrdersWithoutManagement.length})`);
      } catch (error) {
        console.error(`❌ [MIGRATION] Failed to migrate order ${customerOrder.orderNumber}:`, error);
      }
    }

    console.log(`🎉 [MIGRATION] Completed migration: ${migratedCount}/${customerOrdersWithoutManagement.length} orders migrated`);
  }

  // Get orders that have been approved by financial and transferred to warehouse
  async getFinancialApprovedOrders(): Promise<any[]> {
    console.log('🔍 [FINANCIAL APPROVED] Getting orders transferred to warehouse...');
    
    // Use the same approach as getOrdersByDepartment but for warehouse statuses
    return this.getOrdersByDepartment('warehouse');
  }
  
  async getWarehousePendingOrders(): Promise<OrderManagement[]> {
    return this.getOrdersByDepartment('warehouse');
  }
  
  async getOrdersByStatus(status: OrderStatus | OrderStatus[]): Promise<OrderManagement[]> {
    const statuses = Array.isArray(status) ? status : [status];
    
    const query = db.select({
      // Order Management fields
      id: orderManagement.id,
      customerOrderId: orderManagement.customerOrderId,
      currentStatus: orderManagement.currentStatus,
      deliveryCode: orderManagement.deliveryCode,
      financialReviewerId: orderManagement.financialReviewerId,
      financialReviewedAt: orderManagement.financialReviewedAt,
      financialNotes: orderManagement.financialNotes,
      paymentReceiptUrl: orderManagement.paymentReceiptUrl,
      createdAt: orderManagement.createdAt,
      updatedAt: orderManagement.updatedAt,
      
      // Weight and delivery information
      totalWeight: orderManagement.totalWeight,
      weightUnit: orderManagement.weightUnit,
      deliveryMethod: orderManagement.deliveryMethod,
      transportationType: orderManagement.transportationType,
      trackingNumber: orderManagement.trackingNumber,
      estimatedDeliveryDate: orderManagement.estimatedDeliveryDate,
      actualDeliveryDate: orderManagement.actualDeliveryDate,
      deliveryPersonName: orderManagement.deliveryPersonName,
      deliveryPersonPhone: orderManagement.deliveryPersonPhone,
      postalServiceName: orderManagement.postalServiceName,
      postalTrackingCode: orderManagement.postalTrackingCode,
      vehicleType: orderManagement.vehicleType,
      vehiclePlate: orderManagement.vehiclePlate,
      vehicleModel: orderManagement.vehicleModel,
      vehicleColor: orderManagement.vehicleColor,
      driverName: orderManagement.driverName,
      driverPhone: orderManagement.driverPhone,
      deliveryCompanyName: orderManagement.deliveryCompanyName,
      deliveryCompanyPhone: orderManagement.deliveryCompanyPhone,
      
      // Customer Order fields
      totalAmount: customerOrders.totalAmount,
      currency: customerOrders.currency,
      orderNumber: customerOrders.orderNumber,
      
      // Customer info
      customerFirstName: crmCustomers.firstName,
      customerLastName: crmCustomers.lastName,
      customerEmail: crmCustomers.email,
      customerPhone: crmCustomers.phone,
      
      // Payment Receipt info - FIXED: Use customer_orders.receipt_path as primary source  
      receiptUrl: customerOrders.receiptPath, // Primary source for receipts
      receiptFileName: paymentReceipts.originalFileName,
      receiptMimeType: paymentReceipts.mimeType,
    })
    .from(orderManagement)
    .leftJoin(customerOrders, eq(orderManagement.customerOrderId, customerOrders.id))
    .leftJoin(crmCustomers, eq(customerOrders.customerId, crmCustomers.id))
    .leftJoin(paymentReceipts, eq(paymentReceipts.customerOrderId, customerOrders.id))
    .where(inArray(orderManagement.currentStatus, statuses))
    .orderBy(desc(orderManagement.createdAt));
    
    const results = await query;
    
    // Transform results and calculate weight for orders without weight
    const transformedResults = results.map(row => ({
      id: row.id,
      customerOrderId: row.customerOrderId,
      currentStatus: row.currentStatus,
      deliveryCode: row.deliveryCode,
      totalAmount: row.totalAmount,
      currency: row.currency,
      orderNumber: row.orderNumber,
      
      // Weight and delivery information
      totalWeight: row.totalWeight,
      weightUnit: row.weightUnit,
      deliveryMethod: row.deliveryMethod,
      transportationType: row.transportationType,
      trackingNumber: row.trackingNumber,
      estimatedDeliveryDate: row.estimatedDeliveryDate,
      actualDeliveryDate: row.actualDeliveryDate,
      deliveryPersonName: row.deliveryPersonName,
      deliveryPersonPhone: row.deliveryPersonPhone,
      postalServiceName: row.postalServiceName,
      postalTrackingCode: row.postalTrackingCode,
      vehicleType: row.vehicleType,
      vehiclePlate: row.vehiclePlate,
      vehicleModel: row.vehicleModel,
      vehicleColor: row.vehicleColor,
      driverName: row.driverName,
      driverPhone: row.driverPhone,
      deliveryCompanyName: row.deliveryCompanyName,
      deliveryCompanyPhone: row.deliveryCompanyPhone,
      
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customer: {
        firstName: row.customerFirstName,
        lastName: row.customerLastName,
        email: row.customerEmail,
        phone: row.customerPhone,
      },
      receipt: row.receiptUrl ? {
        url: row.receiptUrl,
        fileName: row.receiptFileName,
        mimeType: row.receiptMimeType,
      } : null
    }));

    // Calculate weight for orders that don't have it calculated yet (check status to determine if needed)
    const needsWeightCalculation = statuses.some(status => 
      status.includes('warehouse') || status.includes('logistics') || status.includes('dispatched')
    );
    
    if (needsWeightCalculation) {
      for (const order of transformedResults) {
        if (!order.totalWeight || order.totalWeight === '0.000') {
          await this.calculateAndUpdateOrderWeight(order.customerOrderId);
          // Update the order object with calculated weight
          const calculatedWeight = await this.calculateOrderWeight(order.customerOrderId);
          if (calculatedWeight > 0) {
            order.totalWeight = calculatedWeight.toFixed(3);
            order.weightUnit = 'kg';
          }
        }
      }
    }

    return transformedResults;
  }

  async getLogisticsPendingOrders(): Promise<OrderManagement[]> {
    const orders = await this.getOrdersByDepartment('logistics');
    
    // Calculate total weight for each order if not already calculated
    for (const order of orders) {
      if (!order.totalWeight) {
        await this.calculateAndUpdateOrderWeight(order.customerOrderId);
        // Refresh order data after weight calculation
        const updatedOrders = await this.getOrdersByDepartment('logistics');
        const updatedOrder = updatedOrders.find(o => o.customerOrderId === order.customerOrderId);
        if (updatedOrder) {
          order.totalWeight = updatedOrder.totalWeight;
          order.weightUnit = updatedOrder.weightUnit;
        }
      }
    }
    
    return orders;
  }
  
  async calculateAndUpdateOrderWeight(customerOrderId: number): Promise<void> {
    try {
      // Get all order items for this order
      const orderItemsData = await db
        .select({
          productId: orderItems.productId,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, customerOrderId));
      
      if (orderItemsData.length === 0) {
        return;
      }
      
      let totalWeightKg = 0;
      
      // Calculate total weight from all products in the order
      for (const item of orderItemsData) {
        if (item.productId) {
          // Get product weight from shop_products table - prioritize gross weight for logistics
          const productWeight = await db
            .select({
              grossWeight: shopProducts.grossWeight,
              netWeight: shopProducts.netWeight,
              weight: shopProducts.weight, // Legacy fallback
              weightUnit: shopProducts.weightUnit,
            })
            .from(shopProducts)
            .where(eq(shopProducts.id, item.productId))
            .limit(1);
          
          if (productWeight.length > 0) {
            let weight = 0;
            
            // Priority: Use gross weight (وزن ناخالص) for logistics calculations
            if (productWeight[0].grossWeight) {
              weight = parseFloat(productWeight[0].grossWeight.toString());
            } else if (productWeight[0].weight) {
              weight = parseFloat(productWeight[0].weight.toString());
            } else {
              continue; // Skip if no weight available
            }
            
            // Skip if weight is not a valid number
            if (isNaN(weight) || weight <= 0) {
              continue;
            }
            const unit = productWeight[0].weightUnit || 'kg';
            const quantity = parseFloat(item.quantity);
            
            // Convert weight to kg if needed
            let weightInKg = weight;
            if (unit === 'g' || unit === 'gram') {
              weightInKg = weight / 1000;
            } else if (unit === 'ton') {
              weightInKg = weight * 1000;
            }
            
            totalWeightKg += weightInKg * quantity;
          }
        }
      }
      
      // Update order management with calculated weight
      if (totalWeightKg > 0) {
        await db
          .update(orderManagement)
          .set({
            totalWeight: totalWeightKg.toFixed(3),
            weightUnit: 'kg',
          })
          .where(eq(orderManagement.customerOrderId, customerOrderId));
      }
    } catch (error) {
      console.error('Error calculating order weight:', error);
    }
  }
  

  
  async uploadPaymentReceipt(receiptData: InsertPaymentReceipt): Promise<PaymentReceipt> {
    const [receipt] = await db
      .insert(paymentReceipts)
      .values(receiptData)
      .returning();
    return receipt;
  }
  
  async getPaymentReceiptsByOrder(customerOrderId: number): Promise<PaymentReceipt[]> {
    return db
      .select()
      .from(paymentReceipts)
      .where(eq(paymentReceipts.customerOrderId, customerOrderId))
      .orderBy(desc(paymentReceipts.uploadedAt));
  }
  
  async assignUserToDepartment(assignmentData: InsertDepartmentAssignment): Promise<DepartmentAssignment> {
    const [assignment] = await db
      .insert(departmentAssignments)
      .values(assignmentData)
      .returning();
    return assignment;
  }
  
  async getUserDepartments(adminUserId: number): Promise<DepartmentAssignment[]> {
    return db
      .select()
      .from(departmentAssignments)
      .where(and(
        eq(departmentAssignments.adminUserId, adminUserId),
        eq(departmentAssignments.isActive, true)
      ));
  }
  
  async getDepartmentUsers(department: Department): Promise<DepartmentAssignment[]> {
    return db
      .select()
      .from(departmentAssignments)
      .where(and(
        eq(departmentAssignments.department, department),
        eq(departmentAssignments.isActive, true)
      ));
  }
  
  async generateDeliveryCode(orderManagementId: number, customerPhone: string): Promise<string> {
    try {
      // Import logistics storage for sequential code generation
      const { LogisticsStorage } = await import('./logistics-storage');
      const logisticsStorage = new LogisticsStorage();
      
      // Generate sequential 4-digit code
      const sequentialCode = await logisticsStorage.generateSequentialDeliveryCode(orderManagementId, customerPhone);
      
      console.log(`✅ [DELIVERY CODE] Generated sequential code ${sequentialCode} for order ${orderManagementId}`);
      
      // Update order with delivery code
      await db
        .update(orderManagement)
        .set({ deliveryCode: sequentialCode })
        .where(eq(orderManagement.id, orderManagementId));
      
      return sequentialCode;
    } catch (error) {
      console.error('❌ [DELIVERY CODE] Error generating delivery code:', error);
      throw error;
    }
  }

  async sendDeliveryCodeSms(customerPhone: string, deliveryCode: string, customerOrderId: number, customerName: string, orderNumber: string): Promise<boolean> {
    try {
      const { createSmsService } = await import('./sms-service');
      const smsService = await createSmsService();
      
      // Use template 3 for delivery code (قالب شماره 3 - کد تحویل سفارش) 
      const result = await smsService.sendSmsUsingTemplate(3, customerPhone, {
        customer_name: customerName,
        order_number: orderNumber,
        delivery_code: deliveryCode
      });
      
      console.log(`📱 [SMS TEMPLATE 3] Delivery code ${deliveryCode} sent to ${customerPhone} for order ${orderNumber}:`, result);
      
      return result.success;
    } catch (error) {
      console.error('❌ [SMS] Error sending delivery code using template 3:', error);
      return false;
    }
  }

  // Manual delivery code sending - used by logistics for resending codes
  async sendManualDeliveryCode(orderManagementId: number): Promise<{success: boolean, deliveryCode?: string, error?: string}> {
    try {
      console.log('📱 [DELIVERY CODE] Manual send request for order management ID:', orderManagementId);
      
      // Get order details
      const order = await db
        .select({
          id: orderManagement.id,
          customerOrderId: orderManagement.customerOrderId,
          deliveryCode: orderManagement.deliveryCode,
          currentStatus: orderManagement.currentStatus
        })
        .from(orderManagement)
        .where(eq(orderManagement.id, orderManagementId))
        .limit(1);

      if (!order.length) {
        return { success: false, error: 'سفارش یافت نشد' };
      }

      const orderData = order[0];
      console.log('📱 [DELIVERY CODE] Found order:', { 
        id: orderData.id, 
        customerOrderId: orderData.customerOrderId, 
        hasDeliveryCode: !!orderData.deliveryCode 
      });

      // Get customer information including recipient mobile
      const { pool } = await import('./db');
      const customerQuery = `
        SELECT 
          co.order_number as orderNumber,
          co.recipient_mobile as recipientMobile,
          c.first_name as firstName,
          c.last_name as lastName,
          c.phone as phone
        FROM customer_orders co
        LEFT JOIN crm_customers c ON co.customer_id = c.id
        WHERE co.id = $1
      `;
      
      const customerResult = await pool.query(customerQuery, [orderData.customerOrderId]);
      
      if (!customerResult.rows.length) {
        return { success: false, error: 'اطلاعات مشتری یافت نشد' };
      }

      const customer = customerResult.rows[0];
      const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
      
      // Determine target phone: use recipient mobile if provided, otherwise customer phone
      const targetPhone = customer.recipientmobile || customer.phone;
      const phoneSource = customer.recipientmobile ? 'recipient mobile' : 'customer phone';
      
      console.log('📱 [DELIVERY CODE] Customer info:', { 
        name: customerName, 
        customerPhone: customer.phone,
        recipientMobile: customer.recipientmobile,
        targetPhone: targetPhone,
        phoneSource: phoneSource,
        orderNumber: customer.orderNumber 
      });

      // Generate delivery code if not exists
      let deliveryCode = orderData.deliveryCode;
      if (!deliveryCode) {
        deliveryCode = await this.generateDeliveryCode(orderManagementId, targetPhone);
        console.log('📱 [DELIVERY CODE] Generated new code:', deliveryCode);
      } else {
        console.log('📱 [DELIVERY CODE] Using existing code:', deliveryCode);
      }

      // Send SMS using template 3 to target phone (recipient mobile if provided, otherwise customer phone)
      const smsSuccess = await this.sendDeliveryCodeSms(
        targetPhone,
        deliveryCode,
        orderData.customerOrderId,
        customerName,
        customer.orderNumber
      );
      
      console.log(`📱 [SMS ROUTING] Delivery code sent to ${phoneSource}: ${targetPhone}`);

      if (smsSuccess) {
        console.log('✅ [DELIVERY CODE] Manual SMS sent successfully');
        return { success: true, deliveryCode };
      } else {
        return { success: false, error: 'خطا در ارسال پیامک' };
      }

    } catch (error) {
      console.error('❌ [DELIVERY CODE] Manual send error:', error);
      return { success: false, error: 'خطا در سرور هنگام ارسال کد تحویل' };
    }
  }
  
  async verifyDeliveryCode(code: string, verifiedBy: string): Promise<boolean> {
    const [deliveryCode] = await db
      .select()
      .from(deliveryCodes)
      .where(and(
        eq(deliveryCodes.code, code),
        eq(deliveryCodes.isUsed, false)
      ));
    
    if (!deliveryCode || deliveryCode.expiresAt < new Date()) {
      return false;
    }
    
    // Mark code as used
    await db
      .update(deliveryCodes)
      .set({
        isUsed: true,
        usedAt: new Date(),
        verifiedBy,
      })
      .where(eq(deliveryCodes.id, deliveryCode.id));
    
    return true;
  }
  
  async getDeliveryCodeByOrder(orderManagementId: number): Promise<DeliveryCode | undefined> {
    const [deliveryCode] = await db
      .select()
      .from(deliveryCodes)
      .where(eq(deliveryCodes.orderManagementId, orderManagementId));
    return deliveryCode;
  }
  
  async getOrderStatusHistory(orderManagementId: number): Promise<OrderStatusHistory[]> {
    return db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderManagementId, orderManagementId))
      .orderBy(asc(orderStatusHistory.createdAt));
  }
  
  async getDepartmentStats(department: Department): Promise<{
    pendingCount: number;
    processedToday: number;
    averageProcessingTime: number;
  }> {
    // For now, return mock stats - implement real calculations later
    return {
      pendingCount: 0,
      processedToday: 0,
      averageProcessingTime: 0,
    };
  }
  
  async getOrdersOverview(): Promise<{
    totalOrders: number;
    pendingFinancial: number;
    pendingWarehouse: number;
    pendingLogistics: number;
    completedToday: number;
    cancelledToday: number;
  }> {
    // For now, return mock stats - implement real calculations later
    return {
      totalOrders: 0,
      pendingFinancial: 0,
      pendingWarehouse: 0,
      pendingLogistics: 0,
      completedToday: 0,
      cancelledToday: 0,
    };
  }

  // =============================================================================
  // SHIPPING RATES MANAGEMENT
  // =============================================================================

  async getShippingRates(filters?: { cityName?: string; isActive?: boolean }): Promise<ShippingRate[]> {
    let query = db.select().from(shippingRates);

    if (filters) {
      const conditions = [];
      
      if (filters.cityName) {
        conditions.push(eq(shippingRates.cityName, filters.cityName));
      }
      
      if (filters.isActive !== undefined) {
        conditions.push(eq(shippingRates.isActive, filters.isActive));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }

    return query.orderBy(asc(shippingRates.deliveryMethod), asc(shippingRates.createdAt));
  }

  async createShippingRate(rateData: InsertShippingRate): Promise<ShippingRate> {
    const [newRate] = await db
      .insert(shippingRates)
      .values({
        ...rateData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newRate;
  }

  async updateShippingRate(id: number, updateData: Partial<InsertShippingRate>): Promise<ShippingRate> {
    const [updatedRate] = await db
      .update(shippingRates)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(shippingRates.id, id))
      .returning();
    return updatedRate;
  }

  async deleteShippingRate(id: number): Promise<void> {
    await db
      .delete(shippingRates)
      .where(eq(shippingRates.id, id));
  }

  async getShippingRateByMethod(deliveryMethod: string, city?: string): Promise<ShippingRate | undefined> {
    let query = db
      .select()
      .from(shippingRates)
      .where(
        and(
          eq(shippingRates.deliveryMethod, deliveryMethod),
          eq(shippingRates.isActive, true)
        )
      );

    if (city) {
      query = query.where(eq(shippingRates.cityName, city));
    }

    const [rate] = await query.limit(1);
    return rate;
  }

  async getAvailableShippingMethods(criteria: {
    city?: string;
    province?: string;
    orderTotal: number;
  }): Promise<ShippingRate[]> {
    let query = db
      .select()
      .from(shippingRates)
      .where(eq(shippingRates.isActive, true));

    // Filter by city if specified
    if (criteria.city) {
      query = query.where(
        eq(shippingRates.cityName, criteria.city)
      );
    }

    // Filter by province if specified
    if (criteria.province) {
      query = query.where(
        eq(shippingRates.provinceName, criteria.province)
      );
    }

    const availableMethods = await query.orderBy(asc(shippingRates.basePrice));

    // Filter methods that qualify for free shipping
    return availableMethods.filter(method => {
      if (!method.freeShippingThreshold) return true;
      const threshold = parseFloat(method.freeShippingThreshold);
      return criteria.orderTotal < threshold; // Only show if not qualifying for free shipping
    });
  }

  async calculateShippingCost(criteria: {
    deliveryMethod: string;
    city?: string;
    province?: string;
    orderTotal: number;
    weight: number;
  }): Promise<number> {
    // Find matching shipping rate
    let query = db
      .select()
      .from(shippingRates)
      .where(
        and(
          eq(shippingRates.deliveryMethod, criteria.deliveryMethod),
          eq(shippingRates.isActive, true)
        )
      );

    // Add location filters if specified
    if (criteria.city) {
      query = query.where(eq(shippingRates.cityName, criteria.city));
    }
    if (criteria.province) {
      query = query.where(eq(shippingRates.provinceName, criteria.province));
    }

    const [shippingRate] = await query.limit(1);
    
    if (!shippingRate) {
      throw new Error('Shipping method not available for this location');
    }

    // Check for free shipping threshold
    if (shippingRate.freeShippingThreshold) {
      const threshold = parseFloat(shippingRate.freeShippingThreshold);
      if (criteria.orderTotal >= threshold) {
        return 0; // Free shipping
      }
    }

    // Calculate base cost
    let totalCost = parseFloat(shippingRate.basePrice);

    // Add weight-based cost if applicable
    if (shippingRate.pricePerKg && criteria.weight > 0) {
      const weightCost = parseFloat(shippingRate.pricePerKg) * criteria.weight;
      totalCost += weightCost;
    }

    return Math.round(totalCost);
  }

  // Enhanced updateDeliveryInfo method
  async updateDeliveryInfo(orderId: number, deliveryData: {
    trackingNumber?: string;
    estimatedDeliveryDate?: string;
    deliveryPersonName?: string;
    deliveryPersonPhone?: string;
    deliveryMethod?: string;
    transportationType?: string;
    postalServiceName?: string;
    postalTrackingCode?: string;
    postalWeight?: string;
    postalPrice?: string;
    postalInsurance?: boolean;
    vehicleType?: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    driverName?: string;
    driverPhone?: string;
    driverLicense?: string;
    deliveryCompanyName?: string;
    deliveryCompanyPhone?: string;
    deliveryCompanyAddress?: string;
  }): Promise<OrderManagement> {
    const updateData: Partial<OrderManagement> = {
      ...deliveryData,
      estimatedDeliveryDate: deliveryData.estimatedDeliveryDate ? new Date(deliveryData.estimatedDeliveryDate) : undefined,
      postalWeight: deliveryData.postalWeight ? deliveryData.postalWeight : undefined,
      postalPrice: deliveryData.postalPrice ? deliveryData.postalPrice : undefined,
      updatedAt: new Date(),
    };

    const [updatedOrder] = await db
      .update(orderManagement)
      .set(updateData)
      .where(eq(orderManagement.id, orderId))
      .returning();

    return updatedOrder;
  }

  // Get all orders with detailed customer information for tracking
  async getAllOrdersWithDetails(): Promise<any[]> {
    try {
      // First get all order management records
      const allOrders = await db
        .select()
        .from(orderManagement)
        .orderBy(desc(orderManagement.createdAt));

      const ordersWithDetails = [];

      for (const order of allOrders) {
        let customerInfo = null;
        
        // Try to get customer info from customer_orders first
        if (order.customerOrderId) {
          try {
            const [customerOrder] = await db
              .select()
              .from(customerOrders)
              .where(eq(customerOrders.id, order.customerOrderId));
            
            if (customerOrder) {
              customerInfo = {
                customerName: customerOrder.customerName,
                customerEmail: customerOrder.customerEmail,
                customerPhone: customerOrder.customerPhone,
              };
            }
          } catch (error) {
            console.log('Error fetching customer order:', error);
          }
        }

        // If no customer info found, use order management data
        if (!customerInfo) {
          customerInfo = {
            customerName: order.customerName || 'نامشخص',
            customerEmail: order.customerEmail || '',
            customerPhone: order.customerPhone || '',
          };
        }

        ordersWithDetails.push({
          ...order,
          ...customerInfo,
        });
      }

      return ordersWithDetails;
    } catch (error) {
      console.error('Error in getAllOrdersWithDetails:', error);
      // Return empty array with proper structure for frontend
      return [];
    }
  }

  async calculateOrderWeight(customerOrderId: number): Promise<number> {
    try {
      console.log(`🔍 [WEIGHT] Calculating weight for order ${customerOrderId}`);
      
      // Get order items and join with both shop_products and showcase_products to get weight
      const items = await db
        .select({
          productId: orderItems.productId,
          productName: orderItems.productName,
          quantity: orderItems.quantity,
          shopGrossWeight: shopProducts.grossWeight,
          shopNetWeight: shopProducts.netWeight,
          shopWeight: shopProducts.weight,
          shopBarcode: shopProducts.barcode
        })
        .from(orderItems)
        .leftJoin(shopProducts, eq(orderItems.productId, shopProducts.id))
        .where(eq(orderItems.orderId, customerOrderId));

      console.log(`📊 [WEIGHT] Found ${items.length} items for order ${customerOrderId}`);

      // Calculate total weight using gross weight (وزن ناخالص) for logistics calculations
      let totalWeight = 0;
      
      for (const item of items) {
        let productWeight = 0;
        const quantity = parseFloat(item.quantity?.toString() || '1');
        
        console.log(`🏷️ [WEIGHT] Processing item: ${item.productName} (ID: ${item.productId}) x${quantity}`);
        
        // First try to get weight from shop_products
        if (item.shopGrossWeight) {
          productWeight = parseFloat(item.shopGrossWeight.toString());
          console.log(`⚖️ [WEIGHT] Using shop gross weight: ${productWeight} kg`);
        } else if (item.shopWeight) {
          productWeight = parseFloat(item.shopWeight.toString());
          console.log(`⚖️ [WEIGHT] Using shop legacy weight: ${productWeight} kg`);
        } else if (item.shopBarcode) {
          // If no weight in shop, try to get from showcase_products by barcode
          console.log(`🔍 [WEIGHT] No weight in shop, searching Kardex by barcode: ${item.shopBarcode}`);
          
          const { showcaseProducts } = await import('../shared/showcase-schema');
          const showcaseWeight = await db
            .select({
              grossWeight: showcaseProducts.grossWeight,
              netWeight: showcaseProducts.netWeight,
              weight: showcaseProducts.weight
            })
            .from(showcaseProducts)
            .where(eq(showcaseProducts.barcode, item.shopBarcode))
            .limit(1);

          if (showcaseWeight.length > 0 && showcaseWeight[0].grossWeight) {
            productWeight = parseFloat(showcaseWeight[0].grossWeight.toString());
            console.log(`⚖️ [WEIGHT] Using Kardex gross weight: ${productWeight} kg`);
          } else if (showcaseWeight.length > 0 && showcaseWeight[0].weight) {
            productWeight = parseFloat(showcaseWeight[0].weight.toString());
            console.log(`⚖️ [WEIGHT] Using Kardex legacy weight: ${productWeight} kg`);
          }
        }
        
        const itemTotalWeight = productWeight * quantity;
        totalWeight += itemTotalWeight;
        
        console.log(`📦 [WEIGHT] Item total: ${productWeight} kg x ${quantity} = ${itemTotalWeight} kg`);
      }

      const finalWeight = Math.round(totalWeight * 100) / 100; // Round to 2 decimal places
      console.log(`🎯 [WEIGHT] Final calculated weight for order ${customerOrderId}: ${finalWeight} kg`);
      
      return finalWeight;
    } catch (error) {
      console.error(`❌ [WEIGHT] Error calculating weight for order ${customerOrderId}:`, error);
      return 0;
    }
  }

  async updateOrderWeight(customerOrderId: number, weight: number): Promise<void> {
    try {
      console.log(`📝 [WEIGHT] Updating order ${customerOrderId} weight to ${weight} kg`);
      
      // Update the weight in order_management table
      await db
        .update(orderManagement)
        .set({
          totalWeight: weight.toString(),
          weightUnit: 'kg',
          updatedAt: new Date()
        })
        .where(eq(orderManagement.customerOrderId, customerOrderId));

      console.log(`✅ [WEIGHT] Successfully updated weight for order ${customerOrderId}`);
    } catch (error) {
      console.error(`❌ [WEIGHT] Error updating weight for order ${customerOrderId}:`, error);
      throw error;
    }
  }

  // M[YY][NNNNN] order numbering functions - M2511111, M2511112, etc.
  // 🚨 DEPRECATED: This function can create gaps if order creation fails after number generation
  // Use generateOrderNumberInTransaction() instead for truly sequential numbering
  async generateOrderNumber(): Promise<string> {
    console.warn('⚠️ [ORDER NUMBER] Using deprecated generateOrderNumber() - may create gaps!');
    console.warn('⚠️ [ORDER NUMBER] Use generateOrderNumberInTransaction() for gap-free sequential numbering');
    
    try {
      const currentYear = new Date().getFullYear();
      const yearSuffix = (currentYear % 100).toString().padStart(2, '0'); // Get last 2 digits of year
      
      // Check if we need to create/reset counter for current year
      const yearCounterCheck = await db.execute(sql`
        SELECT * FROM order_counter WHERE year = ${currentYear}
      `);
      
      if (yearCounterCheck.rows.length === 0) {
        // Create new counter for current year starting from 01111
        await db.execute(sql`
          INSERT INTO order_counter (year, counter, prefix, last_reset)
          VALUES (${currentYear}, 1111, 'M', CURRENT_TIMESTAMP)
        `);
        return `M${yearSuffix}01111`;
      }
      
      // Increment counter for current year atomically
      const result = await db.execute(sql`
        UPDATE order_counter 
        SET counter = counter + 1, 
            updated_at = CURRENT_TIMESTAMP
        WHERE year = ${currentYear}
        RETURNING counter, prefix
      `);
      
      const row = result.rows[0] as { counter: number; prefix: string };
      if (row) {
        // Format: M + YY + NNNNN (e.g., M2511111, M2511112)
        const paddedCounter = row.counter.toString().padStart(5, '0');
        return `${row.prefix}${yearSuffix}${paddedCounter}`;
      }
      
      // Fallback if something goes wrong
      console.error('❌ Failed to generate order number, using fallback');
      return `M${yearSuffix}${Date.now().toString().slice(-5)}`;
    } catch (error) {
      console.error('❌ Error generating order number:', error);
      const currentYear = new Date().getFullYear();
      const yearSuffix = (currentYear % 100).toString().padStart(2, '0');
      return `M${yearSuffix}${Date.now().toString().slice(-5)}`;
    }
  }

  // 🔒 TRANSACTION-SAFE ORDER NUMBER GENERATION
  // This function generates order numbers within a database transaction
  // If order creation fails, the entire transaction (including counter) is rolled back
  async generateOrderNumberInTransaction(transactionClient?: any): Promise<string> {
    console.log('✅ [SEQUENTIAL] Using transaction-safe order number generation');
    
    try {
      const currentYear = new Date().getFullYear();
      const yearSuffix = (currentYear % 100).toString().padStart(2, '0');
      
      // Use provided transaction client or create a new transaction
      const client = transactionClient || db;
      
      // Check if we need to create/reset counter for current year
      const yearCounterCheck = await client.execute(sql`
        SELECT * FROM order_counter WHERE year = ${currentYear} FOR UPDATE
      `);
      
      if (yearCounterCheck.rows.length === 0) {
        // Create new counter for current year starting from 01111
        await client.execute(sql`
          INSERT INTO order_counter (year, counter, prefix, last_reset)
          VALUES (${currentYear}, 1111, 'M', CURRENT_TIMESTAMP)
        `);
        console.log(`🔢 [SEQUENTIAL] New year counter created for ${currentYear}, starting from M${yearSuffix}01111`);
        return `M${yearSuffix}01111`;
      }
      
      // Increment counter atomically within transaction
      const result = await client.execute(sql`
        UPDATE order_counter 
        SET counter = counter + 1, 
            updated_at = CURRENT_TIMESTAMP
        WHERE year = ${currentYear}
        RETURNING counter, prefix
      `);
      
      const row = result.rows[0] as { counter: number; prefix: string };
      if (row) {
        const paddedCounter = row.counter.toString().padStart(5, '0');
        const orderNumber = `${row.prefix}${yearSuffix}${paddedCounter}`;
        console.log(`🔢 [SEQUENTIAL] Generated order number: ${orderNumber} (counter: ${row.counter})`);
        return orderNumber;
      }
      
      throw new Error('Failed to increment order counter');
    } catch (error) {
      console.error('❌ [SEQUENTIAL] Error in transaction-safe order number generation:', error);
      throw error; // Re-throw to let transaction rollback handle it
    }
  }

  // 🔧 UTILITY: Create order with sequential numbering (transaction-safe)
  async createOrderWithSequentialNumber(orderData: any): Promise<{ order: any; orderNumber: string }> {
    console.log('🔒 [SEQUENTIAL] Starting transaction-safe order creation...');
    
    // Start database transaction
    return await db.transaction(async (tx) => {
      try {
        // Generate sequential order number within transaction
        const orderNumber = await this.generateOrderNumberInTransaction(tx);
        
        // Create order with the generated number
        const order = await tx.insert(customerOrders).values({
          ...orderData,
          orderNumber
        }).returning();
        
        console.log(`✅ [SEQUENTIAL] Order created successfully with number: ${orderNumber}`);
        
        return { 
          order: order[0], 
          orderNumber 
        };
      } catch (error) {
        console.error('❌ [SEQUENTIAL] Transaction failed, rolling back order number:', error);
        throw error; // This will cause transaction rollback including counter increment
      }
    });
  }

  async resetOrderCounter(year?: number): Promise<void> {
    try {
      const targetYear = year || new Date().getFullYear();
      
      // Check if counter exists for the year
      const existingCounter = await db.execute(sql`
        SELECT id FROM order_counter WHERE year = ${targetYear}
      `);
      
      if (existingCounter.rows.length > 0) {
        // Reset existing counter
        await db.execute(sql`
          UPDATE order_counter 
          SET counter = 11111, 
              last_reset = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE year = ${targetYear}
        `);
        console.log(`✅ Reset order counter for year ${targetYear} to 11111`);
      } else {
        // Create new counter for the year
        await db.execute(sql`
          INSERT INTO order_counter (year, counter, prefix, last_reset)
          VALUES (${targetYear}, 11111, 'M', CURRENT_TIMESTAMP)
        `);
        console.log(`✅ Created new order counter for year ${targetYear} starting at 11111`);
      }
    } catch (error) {
      console.error('❌ Error resetting order counter:', error);
      throw error;
    }
  }
  
  // Get order with complete details including items
  async getOrderWithItems(orderId: number): Promise<any> {
    console.log('🔍 [ORDER ITEMS] Getting order with items for order ID:', orderId);
    
    try {
      // Get order management details
      const orderManagement = await this.getOrderManagementByCustomerOrderId(orderId);
      if (!orderManagement) {
        throw new Error('سفارش یافت نشد');
      }
      
      // Get customer order details
      const customerOrderResult = await db
        .select()
        .from(customerOrders)
        .where(eq(customerOrders.id, orderId));
      
      if (customerOrderResult.length === 0) {
        throw new Error('جزئیات سفارش مشتری یافت نشد');
      }
      
      const customerOrder = customerOrderResult[0];
      
      // Get order items
      const orderItemsResult = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));
      
      // Get customer details
      let customerDetails = null;
      if (customerOrder.customerId) {
        const customerResult = await db
          .select()
          .from(crmCustomers)
          .where(eq(crmCustomers.id, customerOrder.customerId));
        
        if (customerResult.length > 0) {
          customerDetails = customerResult[0];
        }
      }
      
      // Calculate total weight from order items
      const totalWeight = await this.calculateOrderWeight(orderId);
      
      const result = {
        // Order management info
        orderManagement: orderManagement,
        
        // Customer order info
        customerOrder: customerOrder,
        
        // Order items
        items: orderItemsResult,
        
        // Customer details
        customer: customerDetails,
        
        // Calculated fields
        totalItems: orderItemsResult.length,
        totalQuantity: orderItemsResult.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: customerOrder.totalAmount,
        totalWeight: totalWeight,
        weightUnit: 'kg',
        orderDate: customerOrder.createdAt,
        
        // Status info
        currentStatus: orderManagement.currentStatus,
        // 💰 WALLET LOGIC: سفارشات wallet-paid که کاملاً پرداخت شده‌اند نیاز به تایید مالی ندارند
        financialApproved: orderManagement.financialReviewedAt ? true : 
          (customerOrder.paymentMethod === 'wallet_full' && customerOrder.paymentStatus === 'paid') ? true : false,
        warehouseProcessed: orderManagement.warehouseProcessedAt ? true : false,
        logisticsProcessed: orderManagement.logisticsProcessedAt ? true : false
      };
      
      console.log('✅ [ORDER ITEMS] Successfully retrieved order with items:', {
        orderId,
        itemsCount: orderItemsResult.length,
        totalAmount: customerOrder.totalAmount,
        totalWeight: totalWeight,
        customerName: customerDetails?.firstName + ' ' + customerDetails?.lastName
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ [ORDER ITEMS] Error getting order with items:', error);
      throw error;
    }
  }

  // REMOVED: processAutomaticBankPaymentApproval function
  // Bank payments now go directly to warehouse after verification in payment-workflow.ts
}

export const orderManagementStorage = new OrderManagementStorage();