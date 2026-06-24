import React, { lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import ShopSearch from "./components/ShopSearch";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Home from "@/pages/home";
import About from "@/pages/about";
import Services from "@/pages/services";
import Contact from "@/pages/contact";
import Shop from "@/pages/shop";
import ShopProductPage from "@/pages/shop-product";
import WishlistPage from "@/pages/wishlist";
import Checkout from "@/pages/checkout";
import Payment from "@/pages/payment";
import CheckoutSuccess from "@/pages/checkout-success";
import PaymentOptionsPage from "@/pages/payment-options";
import ShopAdmin from "@/pages/shop-admin";
import InvoiceManagement from "@/pages/admin/invoice-management";
import PaymentSettings from "@/pages/admin/payment-settings";
import PaymentTestPage from "@/pages/PaymentTestPage";
import AdminPage from "@/pages/admin";
import AdminLogin from "@/pages/admin-login";
import AdminUsers from "@/pages/admin-users";

import BarcodeInventory from "@/pages/admin/barcode-inventory";
import DatabaseManagement from "@/pages/admin/database-management";
import UserManagementRedesign from "@/pages/admin/user-management-redesign";
import FactoryManagement from "@/pages/admin/factory-management";
import ProceduresManagement from "@/pages/admin/procedures-management";

import EmailSettingsPage from "@/pages/admin/email-settings";
import AdvancedEmailSettingsPage from "@/pages/admin/advanced-email-settings";
import EmailAddressManagerFixed from "@/pages/admin/email-address-manager-fixed";
import EmailProgressPage from "@/pages/admin/email-progress";
import EmailTemplates from '@/pages/admin/email-templates';
import EmailTemplatesFixed from '@/pages/admin/email-templates-fixed';
import EmailTemplatesCentral from '@/pages/admin/email-templates-central';
import Template05View from '@/pages/admin/template05-view';
import Template05StaticView from '@/pages/admin/template05-static-view';
import MarketingModule from '@/pages/admin/marketing-module';

import EmailRoutingStats from "@/pages/admin/email-routing-stats";
import AutomatedEmailLogs from "@/pages/admin/automated-email-logs";
import InquiryResponses from '@/pages/admin/inquiry-responses';
import ServerConfig from "@/components/admin/server-config";
import AwsS3Settings from "@/pages/admin/aws-s3-settings";
import AdminMissingImages from "@/pages/admin-missing-images";
import FibSettings from "@/pages/admin/fib-settings";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import PasswordReset from "@/pages/password-reset";
import CustomerForgotPassword from "@/pages/customer-forgot-password";
import CustomerResetPassword from "@/pages/customer-reset-password";
import CRMPage from "@/pages/crm";
import CustomerProfile from "@/pages/customer-profile";
import CustomerProfileEdit from "@/pages/customer-profile-edit";
import CustomerRegister from "@/pages/customer-register";
import CustomerLogin from "@/pages/customer-login";
import CompleteProfile from "@/pages/complete-profile";
import CustomerWallet from "@/pages/customer-wallet";
import WalletManagement from "@/pages/admin/wallet-management";
import ProductVariants from "@/pages/admin/product-variants";
import SalesAnalytics from "@/pages/sales-analytics";
import FinancialWorkflowDashboard from "@/pages/admin/financial-workflow-dashboard";
import Products from "@/pages/products";
import ProductsPage from "@/pages/products";
import BatchManagement from "@/pages/batch-management";

import ProductReviews from "@/pages/product-reviews";
import TestProductImageUpload from "@/pages/test-product-image-upload";
import FuelAdditives from "@/pages/products/fuel-additives";
import WaterTreatment from "@/pages/products/water-treatment";
import PaintThinner from "@/pages/products/paint-thinner";
import AgriculturalFertilizers from "@/pages/products/agricultural-fertilizers";
import OtherProducts from "@/pages/products/other";
import TechnicalEquipment from "@/pages/products/technical-equipment";
import CommercialGoods from "@/pages/products/commercial-goods";
import WebRTC from "@/pages/webrtc";
import JitsiMeetPage from "@/pages/jitsi";
import QuotePage from "@/pages/quote";
import Dashboard from "@/pages/dashboard";
import InquiryDetail from "@/pages/inquiry-detail";
import CategoryManagement from "@/pages/category-management";
import SeoManagement from "@/pages/seo-management";
import AdminSmsManagement from "@/pages/admin-sms-management";
import WidgetRecommendations from "@/pages/widget-recommendations";
// Removed AdminOrderManagement - replaced with OrderTrackingManagement for order-management module
import AbandonedCartManagement from "@/pages/abandoned-cart-management";
import FinancialDepartment from "@/pages/financial-department";
import FinanceOrders from "@/pages/admin/finance-orders";
import FinancialLogin from "@/pages/financial-login";
import WarehouseLogin from "@/pages/warehouse-login";
import LogisticsLogin from "@/pages/logistics-login";
import TicketingSystemFixed from "@/pages/admin/ticketing-system-fixed";

import SuperAdminSettings from "@/pages/super-admin-settings";
import SuperAdminOrderManagement from "@/pages/admin/super-admin-order-management";
import SiteManagementFixed from "@/pages/site-management-fixed";
import GeographicReports from "@/pages/geographic-reports";
import GeographicAnalytics from "@/pages/admin/geographic-analytics";
import IraqiGeography from "@/pages/admin/iraqi-geography";
import AISettings from "@/pages/admin/ai-settings";
import DocumentationPage from "@/pages/documentation";
import LogisticsOrders from "@/pages/admin/logistics-orders";
import LogisticsManagement from "@/pages/admin/logistics-management";
import DeliveredOrders from "@/pages/admin/delivered-orders";
import PaymentOptions from "@/pages/payment-options";
import GlobalRefreshSettings from "@/pages/admin/global-refresh-settings";

import InventoryNotificationSettings from "@/pages/admin/inventory-notification-settings";
import WarehouseManagement from "@/pages/admin/warehouse-management";
import WarehouseManagementFixed from "@/pages/admin/warehouse-management-fixed";
import WarehouseInventoryManagement from "@/pages/admin/warehouse-inventory-management";
import ContentManagement from "@/pages/content-management";

import SecurityManagement from "@/pages/security-management-new";
import OrderTrackingManagement from "@/pages/admin/order-tracking-management";
import RemoteDesktop from "@/pages/admin/remote-desktop";
import TawkToChat from "@/components/TawkToChat";

import TemplateDistribution from "@/pages/admin/template-distribution";
import WhatsAppCRM from "@/pages/admin/whatsapp-crm";
import WhatsAppCRMEnglish from "@/pages/admin/whatsapp-crm-en";

import BankReceiptUpload from "@/pages/bank-receipt-upload";
import WalletCorrection from "@/pages/admin/wallet-correction";
import WalletDebugTest from "@/pages/wallet-debug-test";
import TestLogistics from "@/pages/test-logistics";
import KpiDashboard from "@/pages/kpi-dashboard";
import KpiReport from "@/pages/kpi-report";
import ManagementDashboard from "@/pages/management-dashboard";
import AccountingManagement from "@/pages/admin/accounting-management";
import CompanyInformation from "@/pages/admin/company-information";
import VehicleOptimization from "@/pages/admin/vehicle-optimization";
import LogisticsGeography from "@/pages/admin/logistics-geography";
import UserGuide from "@/pages/user-guide";
import HybridPayment from "@/pages/hybrid-payment";
import PaymentCallback from "@/pages/payment-callback";
import OrderSuccess from "@/pages/order-success";
import AdminAbandonedOrders from "@/pages/admin-abandoned-orders";
import FooterManagement from "@/pages/admin/footer-management";
import ShopManagement from "@/pages/admin/shop-management";
import MarketplaceManagement from "@/pages/admin/marketplace-management";
import VendorAccounting from "@/pages/admin/vendor-accounting";
import VendorRegistration from "@/pages/vendor-registration";
import VendorLogin from "@/pages/vendor-login";
import VendorDashboard from "@/pages/vendor-dashboard";
import VendorAddProduct from "@/pages/vendor-add-product";
import VendorEditProduct from "@/pages/vendor-edit-product";
import VendorPortal from "@/pages/vendor-portal";
import VehicleHistoryPage from "@/pages/admin/vehicle-history";
import BlogManagement from "@/pages/admin/blog-management";
import Blog from "@/pages/blog";
import BlogPost from "@/pages/blog-post";
import FibPaymentPage from "@/pages/fib-payment";

import NotFound from "@/pages/not-found";
import AdminRoute from "@/components/AdminRoute";

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/about" component={About} />
          <Route path="/services" component={Services} />
          <Route path="/contact" component={Contact} />
          <Route path="/user-guide" component={UserGuide} />
          <Route path="/help" component={UserGuide} />
          <Route path="/shop" component={Shop} />
          <Route path="/shop/product/:id" component={ShopProductPage} />
          <Route path="/wishlist" component={WishlistPage} />
          <Route path="/vendor" component={VendorPortal} />
          <Route path="/vendor-registration" component={VendorRegistration} />
          <Route path="/become-vendor" component={VendorRegistration} />
          <Route path="/vendor/login" component={VendorLogin} />
          <Route path="/vendor/dashboard" component={VendorDashboard} />
          <Route path="/vendor/products/new" component={VendorAddProduct} />
          <Route path="/vendor/products/edit/:id" component={VendorEditProduct} />
          <Route path="/vendor/products" component={ProductsPage} />
          <Route path="/blog" component={Blog} />
          <Route path="/blog/:slug" component={BlogPost} />
          <Route path="/payment-options" component={PaymentOptionsPage} />
          <Route path="/checkout" component={() => <Checkout cart={[]} products={[]} onOrderComplete={() => {}} />} />
          <Route path="/payment/fib/:paymentId" component={FibPaymentPage} />
          <Route path="/payment/:orderId" component={Payment} />
          <Route path="/payment/:orderNumber" component={HybridPayment} />
          <Route path="/payment-callback" component={PaymentCallback} />
          <Route path="/payment-cancelled" component={PaymentCallback} />
          <Route path="/payment-failed/:orderNumber" component={PaymentCallback} />
          <Route path="/payment-pending/:orderNumber" component={PaymentCallback} />
          <Route path="/checkout/success/:orderId" component={CheckoutSuccess} />
          <Route path="/order-success/:orderNumber" component={OrderSuccess} />
          <Route path="/bank-receipt-upload/:orderId" component={BankReceiptUpload} />
          <Route path="/shop-search" component={ShopSearch} />
          <Route path="/shop-admin" component={() => <AdminRoute><ShopAdmin /></AdminRoute>} />
          <Route path="/admin/shop" component={() => <AdminRoute><ShopAdmin /></AdminRoute>} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/admin/users" component={() => <AdminRoute><AdminUsers /></AdminRoute>} />

          <Route path="/admin/barcode-inventory" component={() => <AdminRoute><BarcodeInventory /></AdminRoute>} />
          <Route path="/admin/database-management" component={() => <AdminRoute><DatabaseManagement /></AdminRoute>} />
          <Route path="/admin/user-management" component={() => <AdminRoute><UserManagementRedesign /></AdminRoute>} />
          <Route path="/user-management" component={() => <AdminRoute><UserManagementRedesign /></AdminRoute>} />
          <Route path="/admin/factory-management" component={() => <AdminRoute><FactoryManagement /></AdminRoute>} />
          <Route path="/admin/procedures-management" component={() => <AdminRoute><ProceduresManagement /></AdminRoute>} />

          <Route path="/admin/email-settings" component={() => <AdminRoute><EmailSettingsPage /></AdminRoute>} />
          <Route path="/admin/advanced-email-settings" component={() => <AdminRoute><AdvancedEmailSettingsPage /></AdminRoute>} />
          <Route path="/admin/email-address-manager" component={() => <AdminRoute><EmailAddressManagerFixed /></AdminRoute>} />
          <Route path="/admin/email-progress" component={() => <AdminRoute><EmailProgressPage /></AdminRoute>} />
          <Route path="/admin/email-templates" component={() => <AdminRoute><EmailTemplates /></AdminRoute>} />
          <Route path="/admin/email-routing-stats" component={() => <AdminRoute><EmailRoutingStats /></AdminRoute>} />

          <Route path="/admin/email-templates-central" component={() => <AdminRoute><EmailTemplatesCentral /></AdminRoute>} />
          <Route path="/admin/automated-email-logs" component={() => <AdminRoute><AutomatedEmailLogs /></AdminRoute>} />
          <Route path="/admin/email-templates-fixed" component={() => <AdminRoute><EmailTemplatesFixed /></AdminRoute>} />
          <Route path="/admin/template-distribution" component={() => <AdminRoute><TemplateDistribution /></AdminRoute>} />
          <Route path="/admin/invoice-management" component={() => <AdminRoute><InvoiceManagement /></AdminRoute>} />
          <Route path="/admin/payment-settings" component={() => <AdminRoute><PaymentSettings /></AdminRoute>} />
          <Route path="/test-payment" component={() => <AdminRoute><PaymentTestPage /></AdminRoute>} />
          <Route path="/admin/wallet-management" component={() => <AdminRoute><WalletManagement /></AdminRoute>} />
          <Route path="/admin/wallet-correction" component={() => <AdminRoute><WalletCorrection /></AdminRoute>} />
          <Route path="/wallet-debug-test" component={() => <AdminRoute><WalletDebugTest /></AdminRoute>} />
          <Route path="/admin/inquiries" component={() => <AdminRoute><Dashboard /></AdminRoute>} />
          <Route path="/admin/inquiry/:id" component={() => <AdminRoute><InquiryDetail /></AdminRoute>} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password/:token" component={ResetPassword} />
          <Route path="/password-reset" component={PasswordReset} />
          <Route path="/customer/forgot-password" component={CustomerForgotPassword} />
          <Route path="/customer/reset-password" component={CustomerResetPassword} />
          <Route path="/customer-reset-password" component={CustomerResetPassword} />
          <Route path="/customer/login" component={CustomerLogin} />
          <Route path="/customer/register" component={CustomerRegister} />
          <Route path="/complete-profile" component={CompleteProfile} />
          <Route path="/crm" component={() => <AdminRoute><CRMPage /></AdminRoute>} />
          <Route path="/customer/profile" component={CustomerProfile} />
          <Route path="/customer-profile" component={CustomerProfile} />
          <Route path="/customer/profile/edit" component={CustomerProfileEdit} />
          <Route path="/customer/profile-edit" component={CustomerProfileEdit} />
          <Route path="/customer-profile-edit" component={CustomerProfileEdit} />
          <Route path="/customer/wallet" component={CustomerWallet} />
          <Route path="/customer/bank-receipt-upload" component={BankReceiptUpload} />
          <Route path="/customer/bank-receipt-upload/:orderId" component={BankReceiptUpload} />
          <Route path="/category-management" component={() => <AdminRoute><CategoryManagement /></AdminRoute>} />
          <Route path="/seo-management" component={() => <AdminRoute><SeoManagement /></AdminRoute>} />
          <Route path="/admin/sms-management" component={() => <AdminRoute><AdminSmsManagement /></AdminRoute>} />
          <Route path="/admin/whatsapp-crm" component={() => <AdminRoute><WhatsAppCRM /></AdminRoute>} />
          <Route path="/admin/whatsapp-crm-en" component={() => <AdminRoute><WhatsAppCRMEnglish /></AdminRoute>} />
          <Route path="/admin/email-logs" component={() => <AdminRoute>{(() => { const Comp = lazy(() => import("@/pages/admin-email-logs")); return <Comp />; })()}</AdminRoute>} />
          <Route path="/admin/sms" component={() => <AdminRoute><AdminSmsManagement /></AdminRoute>} />
          <Route path="/admin/widgets" component={() => <AdminRoute><WidgetRecommendations /></AdminRoute>} />
          <Route path="/admin/order-management" component={() => <AdminRoute><OrderTrackingManagement /></AdminRoute>} />
          <Route path="/admin/order-tracking" component={() => <AdminRoute><OrderTrackingManagement /></AdminRoute>} />
          <Route path="/admin/order-tracking-management" component={() => <AdminRoute><OrderTrackingManagement /></AdminRoute>} />
          <Route path="/admin/abandoned-cart-management" component={() => <AdminRoute><AbandonedCartManagement /></AdminRoute>} />
          <Route path="/site-management" component={() => <AdminRoute><SiteManagementFixed /></AdminRoute>} />
          <Route path="/admin/site-management" component={() => <AdminRoute><SiteManagementFixed /></AdminRoute>} />
          <Route path="/admin/products" component={() => <AdminRoute><ProductsPage /></AdminRoute>} />
          <Route path="/vendor/products" component={ProductsPage} />
          <Route path="/admin/product-variants" component={() => <AdminRoute><ProductVariants /></AdminRoute>} />
          <Route path="/admin/geographic-reports" component={() => <AdminRoute><GeographicReports /></AdminRoute>} />
          <Route path="/admin/geographic-analytics" component={() => <AdminRoute><GeographicAnalytics /></AdminRoute>} />
          <Route path="/admin/iraqi-geography" component={() => <AdminRoute><IraqiGeography /></AdminRoute>} />
          <Route path="/admin/ai-settings" component={() => <AdminRoute><AISettings /></AdminRoute>} />
          <Route path="/documentation" component={DocumentationPage} />
          
          {/* New Department Order Management Pages */}
          <Route path="/admin/finance-orders" component={() => <AdminRoute><FinanceOrders /></AdminRoute>} />
          <Route path="/admin/logistics-orders" component={() => <AdminRoute><LogisticsOrders /></AdminRoute>} />
          <Route path="/admin/logistics-management" component={() => <AdminRoute><LogisticsManagement /></AdminRoute>} />
          <Route path="/admin/logistics" component={() => <AdminRoute><LogisticsManagement /></AdminRoute>} />
          <Route path="/admin/vehicle-types-management" component={() => <AdminRoute>{(() => { const Comp = lazy(() => import("@/pages/admin/vehicle-types-management")); return <Comp />; })()}</AdminRoute>} />
          <Route path="/admin/delivered-orders" component={() => <AdminRoute><DeliveredOrders /></AdminRoute>} />
          <Route path="/admin/financial-workflow" component={() => <AdminRoute><FinancialWorkflowDashboard /></AdminRoute>} />
          <Route path="/payment-options" component={PaymentOptions} />
          <Route path="/admin/global-refresh-settings" component={() => <AdminRoute><GlobalRefreshSettings /></AdminRoute>} />

          <Route path="/admin/inventory-notification-settings" component={() => <AdminRoute><InventoryNotificationSettings /></AdminRoute>} />
          <Route path="/admin/warehouse-management" component={() => <AdminRoute><WarehouseManagementFixed /></AdminRoute>} />
          <Route path="/admin/warehouse-inventory-management" component={() => <AdminRoute><WarehouseInventoryManagement /></AdminRoute>} />

          <Route path="/admin/content-management" component={() => <AdminRoute><ContentManagement /></AdminRoute>} />
          <Route path="/content-management" component={() => <AdminRoute><ContentManagement /></AdminRoute>} />
          <Route path="/admin/footer-management" component={() => <AdminRoute><FooterManagement /></AdminRoute>} />
          <Route path="/admin/shop-management" component={() => <AdminRoute><ShopManagement /></AdminRoute>} />
          <Route path="/admin/marketplace-management" component={() => <AdminRoute><MarketplaceManagement /></AdminRoute>} />
          <Route path="/admin/marketplace_management" component={() => <AdminRoute><MarketplaceManagement /></AdminRoute>} />
          <Route path="/admin/vendor-accounting" component={() => <AdminRoute><VendorAccounting /></AdminRoute>} />
          <Route path="/admin/email-templates" component={() => <AdminRoute><EmailTemplatesFixed /></AdminRoute>} />
          <Route path="/admin/email-templates-fixed" component={() => <AdminRoute><EmailTemplatesFixed /></AdminRoute>} />
          <Route path="/admin/email-templates-central" component={() => <AdminRoute><EmailTemplatesCentral /></AdminRoute>} />
          <Route path="/admin/template05-view" component={() => <AdminRoute><Template05View /></AdminRoute>} />
          <Route path="/admin/template05-static" component={() => <AdminRoute><Template05StaticView /></AdminRoute>} />
          <Route path="/admin/inquiry-responses" component={() => <AdminRoute><InquiryResponses /></AdminRoute>} />
          <Route path="/admin/marketing-module" component={() => <AdminRoute><MarketingModule /></AdminRoute>} />

          <Route path="/admin/security-management" component={() => <AdminRoute><SecurityManagement /></AdminRoute>} />
          <Route path="/admin/ticketing-system" component={() => <AdminRoute><TicketingSystemFixed /></AdminRoute>} />
          <Route path="/admin/abandoned-orders" component={() => <AdminRoute><AdminAbandonedOrders /></AdminRoute>} />
          <Route path="/admin/remote-desktop" component={() => <AdminRoute><RemoteDesktop /></AdminRoute>} />
          <Route path="/admin/server-config" component={() => <AdminRoute><ServerConfig /></AdminRoute>} />
          <Route path="/admin/aws-s3-settings" component={() => <AdminRoute><AwsS3Settings /></AdminRoute>} />
          <Route path="/admin/missing-images" component={() => <AdminRoute><AdminMissingImages /></AdminRoute>} />
          <Route path="/admin/fib-settings" component={() => <AdminRoute><FibSettings /></AdminRoute>} />
          <Route path="/admin/batch-management" component={() => <AdminRoute><BatchManagement /></AdminRoute>} />
          <Route path="/admin/kpi-dashboard" component={() => <AdminRoute><KpiDashboard /></AdminRoute>} />
          <Route path="/admin/kpi-report" component={() => <AdminRoute><KpiReport /></AdminRoute>} />
          <Route path="/admin/management-dashboard" component={() => <AdminRoute><ManagementDashboard /></AdminRoute>} />
          <Route path="/admin/accounting-management" component={() => <AdminRoute><AccountingManagement /></AdminRoute>} />
          <Route path="/admin/company-information" component={() => <AdminRoute><CompanyInformation /></AdminRoute>} />
          <Route path="/admin/vehicle-optimization" component={() => <AdminRoute><VehicleOptimization /></AdminRoute>} />
          <Route path="/admin/vehicle-history" component={() => <AdminRoute><VehicleHistoryPage /></AdminRoute>} />
          <Route path="/admin/logistics-geography" component={() => <AdminRoute><LogisticsGeography /></AdminRoute>} />
          <Route path="/admin/pdf-test" component={() => <AdminRoute>{(() => { const Comp = lazy(() => import("@/pages/admin/pdf-test")); return <Comp />; })()}</AdminRoute>} />
          <Route path="/admin/blog-management" component={() => <AdminRoute><BlogManagement /></AdminRoute>} />


          
          {/* Department-specific routes */}
          <Route path="/financial" component={() => <AdminRoute><FinancialDepartment /></AdminRoute>} />
          <Route path="/financial/login" component={FinancialLogin} />
          <Route path="/warehouse" component={() => <AdminRoute><WarehouseManagementFixed /></AdminRoute>} />
          <Route path="/warehouse/login" component={WarehouseLogin} />
          <Route path="/logistics/login" component={LogisticsLogin} />
          <Route path="/test-logistics" component={TestLogistics} />

          <Route path="/super-admin/settings" component={() => <AdminRoute><SuperAdminSettings /></AdminRoute>} />
          <Route path="/admin/super-admin-settings" component={() => <AdminRoute><SuperAdminSettings /></AdminRoute>} />
          <Route path="/admin/super-admin-order-management" component={() => <AdminRoute><SuperAdminOrderManagement /></AdminRoute>} />
          <Route path="/super-admin/order-management" component={() => <AdminRoute><SuperAdminOrderManagement /></AdminRoute>} />
          
          <Route path="/analytics/sales" component={() => <AdminRoute><SalesAnalytics /></AdminRoute>} />
          <Route path="/products" component={Products} />
          <Route path="/test-product-image-upload" component={TestProductImageUpload} />
          <Route path="/products/fuel-additives" component={FuelAdditives} />
          <Route path="/products/water-treatment" component={WaterTreatment} />
          <Route path="/products/paint-thinner" component={PaintThinner} />
          <Route path="/products/paint-solvents" component={PaintThinner} />
          <Route path="/products/agricultural-fertilizers" component={AgriculturalFertilizers} />
          <Route path="/products/other" component={OtherProducts} />
          <Route path="/products/industrial-chemicals" component={OtherProducts} />
          <Route path="/products/commercial-goods" component={CommercialGoods} />
          <Route path="/products/technical-equipment" component={TechnicalEquipment} />
          <Route path="/product-reviews/:id" component={ProductReviews} />
          <Route path="/quote" component={QuotePage} />
          <Route path="/documentation" component={DocumentationPage} />
          <Route path="/webrtc" component={WebRTC} />
          <Route path="/jitsi" component={JitsiMeetPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <TawkToChat />
            <PWAInstallPrompt />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error('App rendering error:', error);
    return (
      <div style={{ padding: '20px', backgroundColor: 'white', color: 'black' }}>
        <h1>Loading Error</h1>
        <p>There was an error loading the application. Please check the console for details.</p>
        <pre>{String(error)}</pre>
      </div>
    );
  }
}

export default App;
