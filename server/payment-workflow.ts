import { db } from "./db";
import { eq, and, lte, gte, sql, isNull } from "drizzle-orm";
import { customerOrders, orderItems } from "../shared/customer-schema";
import { orderManagement, orderStatusHistory } from "../shared/order-management-schema";
import { shopProducts } from "../shared/shop-schema";
import { customerWallets, walletTransactions } from "../shared/customer-schema";

// منطق کامل سیستم پرداخت مطابق با خواسته کاربر
export class PaymentWorkflowService {
  
  // 1. محاسبه گزینه‌های پرداخت برای مشتری
  async calculatePaymentOptions(cartItems: any, shippingCost: number, customerId?: number) {
    console.log("💳 [PAYMENT OPTIONS] Starting calculation...");
    
    // محاسبه مجموع سفارش
    let orderTotal = 0;
    const productIds = Object.keys(cartItems).map(id => parseInt(id));
    console.log(`🛒 [CART] Product IDs:`, productIds);
    
    const products = await db
      .select({ id: shopProducts.id, price: shopProducts.price })
      .from(shopProducts)
      .where(sql`${shopProducts.id} IN (${productIds.join(',')})`);
    
    for (const product of products) {
      const quantity = cartItems[product.id.toString()] || 0;
      const productTotal = parseFloat(product.price) * quantity;
      orderTotal += productTotal;
      console.log(`📦 [PRODUCT] ID: ${product.id}, Price: ${product.price}, Qty: ${quantity}, Total: ${productTotal}`);
    }
    
    const totalWithShipping = orderTotal + shippingCost;
    console.log(`💰 [PAYMENT] Order total: ${totalWithShipping} IQD`);
    
    // بررسی موجودی کیف پول
    let walletBalance = 0;
    if (customerId) {
      const [wallet] = await db
        .select({ balance: customerWallets.balance })
        .from(customerWallets)
        .where(and(eq(customerWallets.customerId, customerId),isNull(customerWallets.accountingCompanyId)))
        .limit(1);
      
      walletBalance = parseFloat(wallet?.balance || "0");
      console.log(`💼 [WALLET] Balance: ${walletBalance} IQD`);
    }
    
    // گزینه‌های پرداخت
    const options: Record<string, any> = {
      // گزینه 1: درگاه بانکی
      bankGateway: {
        method: "bank_gateway",
        label: "پرداخت از طریق درگاه بانکی",
        description: "پرداخت آنلاین - تایید خودکار پس از 5 دقیقه",
        amount: totalWithShipping,
        sourceLabel: "پرداخت توسط بانک",
        autoApproval: true,
        approvalMinutes: 5,
        smsReminders: false,
        emailReminders: false
      },
      
      // گزینه 2: کیف پول (اگر موجودی کافی باشد)
      wallet: walletBalance >= totalWithShipping ? {
        method: "wallet",
        label: "پرداخت از کیف پول",
        description: "برداشت از موجودی کیف پول - تایید خودکار پس از 5 دقیقه",
        amount: totalWithShipping,
        walletAmount: totalWithShipping,
        bankAmount: 0,
        sourceLabel: "از طریق کیف پول",
        autoApproval: true,
        approvalMinutes: 5,
        smsReminders: false,
        emailReminders: false
      } : null,
      
      // گزینه 3: ترکیبی کیف پول + بانک
      walletPartial: (walletBalance > 0 && walletBalance < totalWithShipping) ? {
        method: "wallet_partial",
        label: "ترکیبی: کیف پول + درگاه بانکی",
        description: `${walletBalance.toLocaleString()} دینار از کیف پول + ${(totalWithShipping - walletBalance).toLocaleString()} دینار از بانک`,
        amount: totalWithShipping,
        walletAmount: walletBalance,
        bankAmount: totalWithShipping - walletBalance,
        sourceLabel: "ترکیبی: کیف پول + بانک",
        autoApproval: true,
        approvalMinutes: 5,
        smsReminders: false,
        emailReminders: false
      } : null,
      
      // گزینه 4: مهلت‌دار 3 روزه (واریز بانکی)
      gracePeriod: {
        method: "grace_period",
        label: "مهلت‌دار 3 روزه - واریز بانکی",
        description: "واریز به حساب بانکی شرکت - مهلت آپلود فیش 3 روز",
        amount: totalWithShipping,
        sourceLabel: "سفارش مهلت دار 3 روزه",
        autoApproval: false,
        graceDays: 3,
        smsReminders: true,
        emailReminders: true
      }
    };
    
    return {
      orderTotal,
      shippingCost,
      totalAmount: totalWithShipping,
      walletBalance,
      options: Object.fromEntries(
        Object.entries(options).filter(([_, option]) => option !== null)
      )
    };
  }
  
  // 2. ایجاد سفارش با روش پرداخت انتخابی
  async createOrderWithPayment(orderData: any, paymentMethod: string) {
    console.log(`📝 [CREATE ORDER] Method: ${paymentMethod}`);
    
    try {
      // ایجاد سفارش در customer_orders
      // برای پرداخت بانکی، شماره سفارش تا تایید پرداخت تخصیص نمی‌یابد
      const orderValues = {
        ...orderData,
        paymentMethod,
        status: this.getInitialStatus(paymentMethod),
        paymentStatus: this.getInitialPaymentStatus(paymentMethod)
      };
      
      // فقط برای پرداخت بانکی، شماره سفارش را حذف کنیم
      if (paymentMethod === 'bank_gateway') {
        delete orderValues.orderNumber;
        console.log(`🏦 [BANK ORDER] Created without order number - will be assigned after payment verification`);
      }
      
      const [customerOrder] = await db
        .insert(customerOrders)
        .values(orderValues)
        .returning();
      
      // ایجاد رکورد در order_management
      const managementData = await this.createOrderManagement(customerOrder, paymentMethod);
      
      // پردازش پرداخت بر اساس روش انتخابی
      await this.processPaymentMethod(customerOrder, managementData, paymentMethod, orderData);
      
      const orderIdentifier = customerOrder.orderNumber || `temp-${customerOrder.id}`;
      console.log(`✅ [CREATE ORDER] Order ${orderIdentifier} created successfully`);
      return customerOrder;
      
    } catch (error) {
      console.error(`❌ [CREATE ORDER] Error:`, error);
      throw error;
    }
  }
  
  // 3. ایجاد رکورد مدیریت سفارش
  private async createOrderManagement(customerOrder: any, paymentMethod: string) {
    const sourceLabel = this.getPaymentSourceLabel(paymentMethod);
    
    const [orderMgmt] = await db
      .insert(orderManagement)
      .values({
        customerOrderId: customerOrder.id,
        currentStatus: this.getInitialManagementStatus(paymentMethod),
        paymentMethod,
        paymentSourceLabel: sourceLabel,
        autoApprovalScheduledAt: this.shouldAutoApprove(paymentMethod) ? 
          new Date(Date.now() + 5 * 60 * 1000) : null, // 5 minutes from now
        isAutoApprovalEnabled: this.shouldAutoApprove(paymentMethod),
        paymentGracePeriodStart: paymentMethod === 'grace_period' ? new Date() : null,
        paymentGracePeriodEnd: paymentMethod === 'grace_period' ? 
          new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : null // 3 days from now
      })
      .returning();
    
    return orderMgmt;
  }
  
  // 4. پردازش روش‌های مختلف پرداخت
  private async processPaymentMethod(customerOrder: any, orderMgmt: any, paymentMethod: string, orderData: any) {
    switch (paymentMethod) {
      case 'bank_gateway':
        await this.processBankGatewayPayment(customerOrder, orderMgmt);
        break;
        
      case 'wallet':
        await this.processWalletPayment(customerOrder, orderMgmt, orderData);
        break;
        
      case 'wallet_partial':
        await this.processPartialWalletPayment(customerOrder, orderMgmt, orderData);
        break;
        
      case 'grace_period':
        await this.processGracePeriodOrder(customerOrder, orderMgmt);
        break;
    }
  }
  
  // 5. پردازش پرداخت درگاه بانکی
  private async processBankGatewayPayment(customerOrder: any, orderMgmt: any) {
    const orderIdentifier = customerOrder.orderNumber || `temp-${customerOrder.id}`;
    console.log(`🏦 [BANK GATEWAY] Processing payment for order ${orderIdentifier}`);
    
    // بروزرسانی وضعیت به pending_payment تا تایید پرداخت
    await db
      .update(orderManagement)
      .set({
        currentStatus: 'pending_payment',
        paymentSourceLabel: 'در انتظار تایید پرداخت بانکی',
        bankAmountPaid: customerOrder.totalAmount
      })
      .where(eq(orderManagement.id, orderMgmt.id));
    
    console.log(`🔄 [BANK GATEWAY] Order ${orderIdentifier} pending payment verification`);
  }
  
  // 6. پردازش پرداخت کیف پول
  private async processWalletPayment(customerOrder: any, orderMgmt: any, orderData: any) {
    console.log(`💼 [WALLET] Processing payment for order ${customerOrder.orderNumber}`);
    
    const totalAmount = parseFloat(customerOrder.totalAmount);
    
    // برداشت از کیف پول
    await this.deductFromWallet(orderData.customerId, totalAmount, customerOrder.orderNumber, customerOrder.id);
    
    // بروزرسانی وضعیت
    await db
      .update(orderManagement)
      .set({
        currentStatus: 'financial_reviewing',
        paymentSourceLabel: 'از طریق کیف پول',
        walletAmountUsed: totalAmount.toString()
      })
      .where(eq(orderManagement.id, orderMgmt.id));
    
    // زمان‌بندی تایید خودکار
    this.scheduleAutoApproval(orderMgmt.id, 5);
  }
  
  // 7. پردازش پرداخت ترکیبی
  private async processPartialWalletPayment(customerOrder: any, orderMgmt: any, orderData: any) {
    console.log(`🔄 [PARTIAL] Processing hybrid payment for order ${customerOrder.orderNumber}`);
    
    const totalAmount = parseFloat(customerOrder.totalAmount);
    const walletAmount = parseFloat(orderData.walletAmount || "0");
    const bankAmount = totalAmount - walletAmount;
    
    // برداشت از کیف پول
    if (walletAmount > 0) {
      await this.deductFromWallet(orderData.customerId, walletAmount, customerOrder.orderNumber, customerOrder.id);
    }
    
    // بروزرسانی وضعیت
    await db
      .update(orderManagement)
      .set({
        currentStatus: 'financial_reviewing',
        paymentSourceLabel: 'ترکیبی: کیف پول + بانک',
        walletAmountUsed: walletAmount.toString(),
        bankAmountPaid: bankAmount.toString()
      })
      .where(eq(orderManagement.id, orderMgmt.id));
    
    // زمان‌بندی تایید خودکار
    this.scheduleAutoApproval(orderMgmt.id, 5);
  }
  
  // 8. پردازش سفارش مهلت‌دار
  private async processGracePeriodOrder(customerOrder: any, orderMgmt: any) {
    console.log(`⏰ [GRACE PERIOD] Setting up 3-day grace period for order ${customerOrder.orderNumber}`);
    
    // بروزرسانی وضعیت
    await db
      .update(orderManagement)
      .set({
        currentStatus: 'payment_grace_period',
        paymentSourceLabel: 'سفارش مهلت دار 3 روزه'
      })
      .where(eq(orderManagement.id, orderMgmt.id));
    
    // زمان‌بندی یادآوری SMS و ایمیل
    this.scheduleGracePeriodReminders(customerOrder, orderMgmt);
  }
  
  // 9. برداشت از کیف پول
  private async deductFromWallet(customerId: number, amount: number, orderNumber: string, customerOrderId: number) {
    // This is the legacy immediate-debit workflow. New independent accounts
    // must use finance holds/loading settlement, even if legacy funds remain.
    const controlled=await db.execute(sql`select o.id from customer_orders o
      join accounting_wallet_cutovers g on g.company_id=o.accounting_company_id and g.pipeline_ready
      where o.id=${customerOrderId} and not accounting_legacy_wallet_order(o.id)`);
    if(controlled.rows.length)throw new Error("Independent prepaid orders require accounting finance approval; legacy debit is prohibited");
    console.log(`💰 [WALLET DEDUCT] ${amount} IQD from customer ${customerId} for order ${customerOrderId}`);
    
    // بروزرسانی موجودی
    await db
      .update(customerWallets)
      .set({
        balance: sql`${customerWallets.balance} - ${amount}`,
        updatedAt: new Date()
      })
      .where(and(eq(customerWallets.customerId, customerId),isNull(customerWallets.accountingCompanyId)));
    
    // ثبت تراکنش
    await db
      .insert(walletTransactions)
      .values({
        walletId: sql`(SELECT id FROM customer_wallets WHERE customer_id = ${customerId} AND accounting_company_id IS NULL)`,
        customerId,
        transactionType: 'debit',
        amount: amount.toString(),
        currency: 'IQD',
        balanceBefore: sql`(SELECT balance FROM customer_wallets WHERE customer_id = ${customerId} AND accounting_company_id IS NULL) + ${amount}`,
        balanceAfter: sql`(SELECT balance FROM customer_wallets WHERE customer_id = ${customerId} AND accounting_company_id IS NULL)`,
        description: `برداشت برای سفارش ${orderNumber}`,
        referenceType: 'order',
        referenceId: customerOrderId,
        status: 'completed'
      });
  }
  
  // 10. زمان‌بندی تایید خودکار 5 دقیقه‌ای
  private async scheduleAutoApproval(orderMgmtId: number, minutes: number) {
    console.log(`⏰ [AUTO APPROVAL] Scheduled for ${minutes} minutes`);
    
    // در پروژه واقعی از job queue استفاده می‌شود
    // اینجا تنها autoApprovalScheduledAt را به‌روزرسانی می‌کنیم
    await db
      .update(orderManagement)
      .set({
        autoApprovalScheduledAt: new Date(Date.now() + minutes * 60 * 1000),
        isAutoApprovalEnabled: true
      })
      .where(eq(orderManagement.id, orderMgmtId));
  }
  
  // 11. زمان‌بندی یادآوری مهلت‌دار
  private async scheduleGracePeriodReminders(customerOrder: any, orderMgmt: any) {
    console.log(`📅 [GRACE REMINDERS] Setting up reminders for order ${customerOrder.orderNumber}`);
    
    // در پروژه واقعی SMS و ایمیل یادآوری ارسال می‌شود
    // روز 1، 2، و 3 یادآوری
  }
  
  // توابع کمکی
  private getInitialStatus(paymentMethod: string): string {
    switch (paymentMethod) {
      case 'bank_gateway':
      case 'wallet':
      case 'wallet_partial':
        return 'confirmed';
      case 'grace_period':
        return 'pending_payment';
      default:
        return 'pending';
    }
  }
  
  private getInitialPaymentStatus(paymentMethod: string): string {
    switch (paymentMethod) {
      case 'bank_gateway':
      case 'wallet':
      case 'wallet_partial':
        return 'processing';
      case 'grace_period':
        return 'pending';
      default:
        return 'pending';
    }
  }
  
  private getInitialManagementStatus(paymentMethod: string): string {
    switch (paymentMethod) {
      case 'bank_gateway':
        return 'pending_payment'; // Bank payments wait for verification, then go directly to warehouse
      case 'wallet':
      case 'wallet_partial':
        return 'financial_reviewing';
      case 'grace_period':
        return 'payment_grace_period';
      default:
        return 'pending';
    }
  }
  
  private getPaymentSourceLabel(paymentMethod: string): string {
    switch (paymentMethod) {
      case 'bank_gateway':
        return 'پرداخت توسط بانک';
      case 'wallet':
        return 'از طریق کیف پول';
      case 'wallet_partial':
        return 'ترکیبی: کیف پول + بانک';
      case 'grace_period':
        return 'سفارش مهلت دار 3 روزه';
      default:
        return 'نامشخص';
    }
  }
  
  private shouldAutoApprove(paymentMethod: string): boolean {
    // Bank payments don't use auto-approval - they go directly to warehouse after verification
    return ['wallet', 'wallet_partial'].includes(paymentMethod);
  }

  // تخصیص شماره سفارش پس از تایید موفق پرداخت بانکی
  async assignOrderNumberAfterPaymentSuccess(customerOrderId: number): Promise<string> {
    console.log(`🏦 [PAYMENT SUCCESS] Assigning order number for customer order ${customerOrderId}`);
    
    try {
      // Generate new order number using transaction-safe method
      const orderNumber = await db.transaction(async (tx) => {
        // Import the order management storage to use its transaction-safe method
        const { orderManagementStorage } = await import('./order-management-storage');
        
        // Generate order number within transaction
        const newOrderNumber = await orderManagementStorage.generateOrderNumberInTransaction(tx);
        
        // Update customer order with the new order number
        await tx
          .update(customerOrders)
          .set({ 
            orderNumber: newOrderNumber,
            status: 'confirmed',
            paymentStatus: 'paid'
          })
          .where(eq(customerOrders.id, customerOrderId));
        
        // Update order management status - send directly to warehouse after successful bank payment
        await tx
          .update(orderManagement)
          .set({
            currentStatus: 'warehouse_pending',
            paymentSourceLabel: 'پرداخت موفق بانکی - ارسال مستقیم به انبار',
            financialReviewedAt: new Date(),
            warehouseQueuedAt: new Date()
          })
          .where(eq(orderManagement.customerOrderId, customerOrderId));
        
        return newOrderNumber;
      });
      
      console.log(`✅ [PAYMENT SUCCESS] Order number ${orderNumber} assigned and sent directly to warehouse`);
      return orderNumber;
      
    } catch (error) {
      console.error(`❌ [PAYMENT SUCCESS] Error assigning order number:`, error);
      throw error;
    }
  }
}

export const paymentWorkflow = new PaymentWorkflowService();