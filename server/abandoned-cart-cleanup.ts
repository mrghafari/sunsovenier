import { CartStorage } from './cart-storage';
import { CrmStorage } from './crm-storage';
import { UniversalEmailService } from './universal-email-service';
import { abandonedCartEmailContent, abandonedCartShopUrl } from './abandoned-cart-email';

class AbandonedCartCleanupService {
  private cartStorage = new CartStorage();
  private crmStorage = new CrmStorage();
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.isRunning) return;
    
    console.log('🛒 [CART CLEANUP] Starting abandoned cart cleanup service');
    this.isRunning = true;
    
    // Run every minute so short admin-configured timeouts are respected.
    this.intervalId = setInterval(() => {
      this.processAbandonedCarts();
    }, 60 * 1000);
    
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
      
      // Process carts that passed the configured inactivity timeout.
      for (const cart of result.cartsForFirstNotification) {
        await this.sendFirstNotification(cart);
        await this.cartStorage.markCartAsAbandonedWithNotification(cart.id);
      }
      
      // Process carts that passed the configured notification interval.
      const cartsNotifiedThisRun = new Set<number>();
      for (const cart of result.cartsForSecondNotification) {
        const notificationCreated = await this.sendSecondNotification(cart);
        if (notificationCreated) {
          cartsNotifiedThisRun.add(cart.id);
        }
      }
      
      // Permanently delete both the tracked session and the customer-visible persistent cart.
      for (const cart of result.cartsToDelete) {
        // When the final notification and deletion thresholds coincide, keep the
        // cart until the next worker run so the warning is not deleted immediately.
        if (cartsNotifiedThisRun.has(cart.id)) {
          console.log(`🛒 [CART CLEANUP] Deferred deletion of cart ${cart.id} until the next run after final notification`);
          continue;
        }
        const { releaseOwnerReservations, ownerKeyForRequest } =
          await import("./cart-inventory-reservation");
        if (cart.sessionId) {
          await releaseOwnerReservations(ownerKeyForRequest(cart.sessionId, cart.customerId));
          await releaseOwnerReservations(ownerKeyForRequest(cart.sessionId, null));
        }
        const deleted = await this.cartStorage.deleteAbandonedCart(cart.id);
        if (deleted) {
          console.log(`🛒 [CART CLEANUP] Permanently deleted cart ${cart.id} for customer ${cart.customerId} (${result.timeoutMinutes} minutes inactivity + ${result.autoDeleteAfterHours} hours)`);
        }
      }
      
      console.log(`🛒 [CART CLEANUP] Processed ${result.firstNotifications} first notifications, ${result.secondNotifications} second notifications, deleted ${result.deletedCarts} carts`);
      
    } catch (error) {
      console.error('🛒 [CART CLEANUP] Error processing abandoned carts:', error);
    }
  }

  private async createInAppNotification(
    cart: any,
    notificationType: 'first' | 'second',
    title: string,
    message: string,
  ): Promise<boolean> {
    const existingNotifications = await this.cartStorage.getNotificationsForCart(cart.id);
    if (existingNotifications.some(
      (notification) => notification.notificationType === notificationType,
    )) {
      return false;
    }

    await this.cartStorage.createNotification({
      cartSessionId: cart.id,
      customerId: cart.customerId,
      notificationType,
      title,
      message,
    });
    return true;
  }

  async sendFirstNotification(cart: any) {
    try {
      const title = 'سبد خرید شما منتظر است!';
      const message = 'محصولات انتخابی شما در سبد خرید منتظر تکمیل خرید هستند. برای ادامه خرید کلیک کنید.';
      const notificationCreated = await this.createInAppNotification(
        cart,
        'first',
        title,
        message,
      );
      if (!notificationCreated) {
        console.log(`🛒 [FIRST NOTIFICATION] Notification already exists for cart ${cart.id}`);
        return;
      }

      // Get customer information  
      const customer = await this.crmStorage.getCrmCustomerById(cart.customerId);
      if (!customer) {
        console.warn(`🛒 [FIRST NOTIFICATION] Customer ${cart.customerId} not found; in-app notification was created`);
        return;
      }
      
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
      const emailLink = abandonedCartEmailContent('سبد خرید شما در انتظار تکمیل است.');
      const cartRestoreUrl = abandonedCartShopUrl();
      const lastActivity = new Date(cart.lastActivity).toLocaleDateString('fa-IR');
      
      const emailContent = {
        categoryKey: 'customers',
        to: [customer.email],
        subject: `یادآوری: سبد خرید شما در انتظار تکمیل است - ${items.length} محصول`,
        text: emailLink.text,
        html: `<div dir="rtl" style="font-family: Tahoma, Arial, sans-serif;">
          <h2>سلام ${customerName}</h2>
          <p>سبد خرید شما با ${items.length} محصول در انتظار تکمیل است.</p>
          <p>آخرین فعالیت: ${lastActivity}</p>
          <p><a href="${cartRestoreUrl}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">ادامه خرید</a></p>
          <p><a href="${cartRestoreUrl}">${cartRestoreUrl}</a></p>
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
      
      const emailSent = customer.email
        ? await UniversalEmailService.sendEmail(emailContent)
        : false;
      if (emailSent) {
        console.log(`✅ First notification email sent successfully to ${customer.email}`);
      } else {
        console.warn(`⚠️ First notification email was not sent for cart ${cart.id}; in-app notification is available`);
      }
      
      // Send SMS using Template #2
      await this.sendSMSNotification(customer, cart, 'first');
      
    } catch (error) {
      console.error(`🛒 [CART CLEANUP] Error sending first notification for cart ${cart.id}:`, error);
    }
  }

  async sendSecondNotification(cart: any): Promise<boolean> {
    try {
      const title = 'آخرین فرصت برای تکمیل خرید';
      const message = 'سبد خرید شما به زودی حذف می‌شود. برای تکمیل خرید وارد فروشگاه شوید.';
      const notificationCreated = await this.createInAppNotification(
        cart,
        'second',
        title,
        message,
      );
      if (!notificationCreated) {
        console.log(`🛒 [SECOND NOTIFICATION] Notification already exists for cart ${cart.id}`);
        return false;
      }

      // Get customer information
      const customer = await this.crmStorage.getCrmCustomerById(cart.customerId);
      if (!customer) {
        console.warn(`🛒 [SECOND NOTIFICATION] Customer ${cart.customerId} not found; in-app notification was created`);
        return true;
      }
      
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
      const emailLink = abandonedCartEmailContent('سبد خرید شما به زودی حذف می‌شود.');
      const cartRestoreUrl = abandonedCartShopUrl();
      const lastActivity = new Date(cart.lastActivity).toLocaleDateString('fa-IR');
      
      const emailContent = {
        categoryKey: 'customers',
        to: [customer.email],
        subject: `آخرین فرصت: سبد خرید شما به زودی حذف می‌شود - ${items.length} محصول`,
        text: emailLink.text,
        html: `<div dir="rtl" style="font-family: Tahoma, Arial, sans-serif;">
          <h2>سلام ${customerName}</h2>
          <p><strong>آخرین فرصت!</strong> سبد خرید شما با ${items.length} محصول به زودی حذف می‌شود.</p>
          <p>آخرین فعالیت: ${lastActivity}</p>
          <p><a href="${cartRestoreUrl}" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">تکمیل خرید</a></p>
          <p><a href="${cartRestoreUrl}">${cartRestoreUrl}</a></p>
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
      
      const emailSent = customer.email
        ? await UniversalEmailService.sendEmail(emailContent)
        : false;
      if (emailSent) {
        console.log(`✅ Final notification email sent successfully to ${customer.email}`);
      } else {
        console.warn(`⚠️ Final notification email was not sent for cart ${cart.id}; in-app notification is available`);
      }
      
      // Send SMS using Template #2
      await this.sendSMSNotification(customer, cart, 'second');
      return true;
      
    } catch (error) {
      console.error(`🛒 [CART CLEANUP] Error sending second notification for cart ${cart.id}:`, error);
      return false;
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
      
      console.warn(`🛒 [CART CLEANUP] SMS delivery is not configured; template #2 was not sent (${type} notification)`);
      
    } catch (error) {
      console.error(`🛒 [CART CLEANUP] Error sending SMS notification:`, error);
    }
  }
}

export const abandonedCartCleanup = new AbandonedCartCleanupService();

export function startAbandonedCartCleanupService() {
  abandonedCartCleanup.start();
}