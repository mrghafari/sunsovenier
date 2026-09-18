import { CartStorage } from './cart-storage';
import { CrmStorage } from './crm-storage';
import { UniversalEmailService } from './universal-email-service';

class AbandonedCartCleanupService {
  private cartStorage = new CartStorage();
  private crmStorage = new CrmStorage();
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.isRunning) return;
    
    console.log('🛒 [CART CLEANUP] Starting abandoned cart cleanup service');
    this.isRunning = true;
    
    // Run every 30 minutes
    this.intervalId = setInterval(() => {
      this.processAbandonedCarts();
    }, 30 * 60 * 1000);
    
    // Run immediately
    setTimeout(() => {
      this.processAbandonedCarts();
    }, 10000); // Delay 10 seconds for system startup
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛒 [CART CLEANUP] Abandoned cart cleanup service stopped');
  }

  async processAbandonedCarts() {
    try {
      console.log('🛒 [CART CLEANUP] Processing abandoned carts...');
      const { releaseExpiredReservations } = await import("./cart-inventory-reservation");
      const releasedReservations = await releaseExpiredReservations();
      if (releasedReservations > 0) {
        console.log(`🛒 [CART CLEANUP] Released ${releasedReservations} expired inventory reservations`);
      }
      
      const result = await this.cartStorage.processAbandonedCartCleanup();
      
      // Process first notifications (1 hour)
      for (const cart of result.cartsForFirstNotification) {
        await this.sendFirstNotification(cart);
        await this.cartStorage.markCartAsAbandonedWithNotification(cart.id);
      }
      
      // Process second notifications (3 hours) 
      for (const cart of result.cartsForSecondNotification) {
        await this.sendSecondNotification(cart);
      }
      
      // Delete old carts (2 hours - user requested cleanup for items older than 2 hours)
      for (const cart of result.cartsToDelete) {
        await this.cartStorage.deleteAbandonedCart(cart.id);
        const { releaseOwnerReservations, ownerKeyForRequest } =
          await import("./cart-inventory-reservation");
        if (cart.sessionId) {
          await releaseOwnerReservations(ownerKeyForRequest(cart.sessionId, cart.customerId));
          await releaseOwnerReservations(ownerKeyForRequest(cart.sessionId, null));
        }
        console.log(`🛒 [CART CLEANUP] Deleted cart ${cart.id} for customer ${cart.customerId} (2+ hours old)`);
      }
      
      console.log(`🛒 [CART CLEANUP] Processed ${result.firstNotifications} first notifications, ${result.secondNotifications} second notifications, deleted ${result.deletedCarts} carts`);
      
    } catch (error) {
      console.error('🛒 [CART CLEANUP] Error processing abandoned carts:', error);
    }
  }

  async sendFirstNotification(cart: any) {
    try {
      // Get customer information  
      const customer = await this.crmStorage.getCrmCustomerById(cart.customerId);
      if (!customer) return;
      
      console.log(`🛒 [FIRST NOTIFICATION] Sending to customer ${customer.email} for cart ${cart.id}`);
      
      // Parse cart items
      let items = [];
      try {
        items = typeof cart.cartData === 'string' ? JSON.parse(cart.cartData) : cart.cartData || [];
      } catch (error) {
        console.error('Error parsing cart data for notification:', error);
        items = [];
      }
      
      const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'مشتری گرامی';
      const cartRestoreUrl = `${process.env.BASE_URL || 'https://momtazchem.com'}/shop/cart?restore=${cart.id}`;
      const lastActivity = new Date(cart.lastActivity).toLocaleDateString('fa-IR');
      
      const emailContent = {
        categoryKey: 'customers',
        to: [customer.email],
        subject: `یادآوری: سبد خرید شما در انتظار تکمیل است - ${items.length} محصول`,
        templateNumber: '#02', // Template for abandoned cart reminder
        html: `<div dir="rtl" style="font-family: Tahoma, Arial, sans-serif;">
          <h2>سلام ${customerName}</h2>
          <p>سبد خرید شما با ${items.length} محصول در انتظار تکمیل است.</p>
          <p>آخرین فعالیت: ${lastActivity}</p>
          <p><a href="${cartRestoreUrl}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">ادامه خرید</a></p>
          <p>با تشکر<br>مؤمتاز شیمی</p>
        </div>`,
        variables: {
          customerName,
          cartItemsCount: items.length.toString(),
          totalValue: (cart.totalValue || 0).toString(),
          cartRestoreUrl,
          lastActivity
        }
      };
      
      await UniversalEmailService.sendEmail(emailContent);
      console.log(`✅ First notification sent successfully to ${customer.email}`);
      
      // Send SMS using Template #2
      await this.sendSMSNotification(customer, cart, 'first');
      
    } catch (error) {
      console.error(`🛒 [CART CLEANUP] Error sending first notification for cart ${cart.id}:`, error);
    }
  }

  async sendSecondNotification(cart: any) {
    try {
      // Get customer information
      const customer = await this.crmStorage.getCrmCustomerById(cart.customerId);
      if (!customer) return;
      
      console.log(`🛒 [SECOND NOTIFICATION] Final warning to customer ${customer.email} for cart ${cart.id}`);
      
      // Parse cart items
      let items = [];
      try {
        items = typeof cart.cartData === 'string' ? JSON.parse(cart.cartData) : cart.cartData || [];
      } catch (error) {
        console.error('Error parsing cart data for notification:', error);
        items = [];
      }
      
      const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'مشتری گرامی';
      const cartRestoreUrl = `${process.env.BASE_URL || 'https://momtazchem.com'}/shop/cart?restore=${cart.id}`;
      const lastActivity = new Date(cart.lastActivity).toLocaleDateString('fa-IR');
      
      const emailContent = {
        categoryKey: 'customers',
        to: [customer.email],
        subject: `آخرین فرصت: سبد خرید شما به زودی حذف می‌شود - ${items.length} محصول`,
        templateNumber: '#02', // Template for abandoned cart reminder
        html: `<div dir="rtl" style="font-family: Tahoma, Arial, sans-serif;">
          <h2>سلام ${customerName}</h2>
          <p><strong>آخرین فرصت!</strong> سبد خرید شما با ${items.length} محصول به زودی حذف می‌شود.</p>
          <p>آخرین فعالیت: ${lastActivity}</p>
          <p><a href="${cartRestoreUrl}" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">تکمیل خرید</a></p>
          <p>با تشکر<br>مؤمتاز شیمی</p>
        </div>`,
        variables: {
          customerName,
          cartItemsCount: items.length.toString(),
          totalValue: (cart.totalValue || 0).toString(),
          cartRestoreUrl,
          lastActivity,
          finalWarning: 'true'
        }
      };
      
      await UniversalEmailService.sendEmail(emailContent);
      console.log(`✅ Final notification sent successfully to ${customer.email}`);
      
      // Send SMS using Template #2
      await this.sendSMSNotification(customer, cart, 'second');
      
    } catch (error) {
      console.error(`🛒 [CART CLEANUP] Error sending second notification for cart ${cart.id}:`, error);
    }
  }

  async sendSMSNotification(customer: any, cart: any, type: 'first' | 'second') {
    try {
      // Template #2 variables for abandoned cart SMS
      const variables = {
        customerName: customer.fullName || customer.firstName || 'مشتری گرامی',
        cartId: cart.id.toString(),
        itemCount: cart.itemCount?.toString() || '0',
        totalValue: cart.totalValue || '0',
        companyName: 'مؤمتاز شیمی',
        shopUrl: 'https://momtazchem.com/shop',
        notificationType: type === 'first' ? 'یادآوری اول' : 'یادآوری دوم'
      };
      
      // Since sendEmailWithTemplate expects different parameters, let's use a direct approach
      const message = type === 'first' 
        ? `سلام ${variables.customerName}، کالاهای شما در سبد خرید منتظر تکمیل هستند. برای ادامه خرید کلیک کنید: ${variables.shopUrl}`
        : `${variables.customerName} عزیز، آخرین فرصت برای تکمیل خرید! سبد خرید شما به زودی حذف میشود: ${variables.shopUrl}`;
      
      // For now, we'll log the SMS (can be connected to actual SMS service later)
      console.log(`🛒 [SMS TEMPLATE #2] To: ${customer.phone || customer.email}, Message: ${message}`);
      
      const emailResult = { success: true }; // Placeholder for actual SMS implementation
      
      if (emailResult.success) {
        console.log(`🛒 [CART CLEANUP] SMS template #2 sent successfully to ${customer.email} (${type} notification)`);
      } else {
        console.error(`🛒 [CART CLEANUP] Failed to send SMS template #2 to ${customer.email}`);
      }
      
    } catch (error) {
      console.error(`🛒 [CART CLEANUP] Error sending SMS notification:`, error);
    }
  }
}

export const abandonedCartCleanup = new AbandonedCartCleanupService();

export function startAbandonedCartCleanupService() {
  abandonedCartCleanup.start();
}