import React, { lazy, Suspense } from "react";
import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from "wouter";
import { useBrowserLocation } from "wouter/use-browser-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import ShopSearch from "./components/ShopSearch";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Home from "@/pages/home";
import About from "@/pages/about";
import Logistics from "@/pages/logistics";
import Services from "@/pages/services";
import Contact from "@/pages/contact";
import { PrivacyPolicy, TermsOfService } from "@/pages/legal-pages";
import Shop from "@/pages/shop";
import ShopProductPage from "@/pages/shop-product";
import WishlistPage from "@/pages/wishlist";
import Checkout from "@/pages/checkout";
import Payment from "@/pages/payment";
import CheckoutSuccess from "@/pages/checkout-success";
import PaymentOptionsPage from "@/pages/payment-options";
const ShopAdmin = lazy(() => import("@/pages/shop-admin"));
const LegalAffairs = lazy(() => import("@/pages/legal-affairs"));
const InvoiceManagement = lazy(() => import("@/pages/admin/invoice-management"));
const PaymentSettings = lazy(() => import("@/pages/admin/payment-settings"));
const PaymentTestPage = lazy(() => import("@/pages/PaymentTestPage"));
const AdminPage = lazy(() => import("@/pages/admin"));
import AdminLogin from "@/pages/admin-login";
const AdminUsers = lazy(() => import("@/pages/admin-users"));

const BarcodeInventory = lazy(() => import("@/pages/admin/barcode-inventory"));
const DatabaseManagement = lazy(() => import("@/pages/admin/database-management"));
const UserManagementRedesign = lazy(() => import("@/pages/admin/user-management-redesign"));
const FactoryManagement = lazy(() => import("@/pages/admin/factory-management"));
const ProceduresManagement = lazy(() => import("@/pages/admin/procedures-management"));

const EmailSettingsPage = lazy(() => import("@/pages/admin/email-settings"));
const AdvancedEmailSettingsPage = lazy(() => import("@/pages/admin/advanced-email-settings"));
const EmailAddressManagerFixed = lazy(() => import("@/pages/admin/email-address-manager-fixed"));
const EmailProgressPage = lazy(() => import("@/pages/admin/email-progress"));
const EmailTemplates = lazy(() => import("@/pages/admin/email-templates"));
const EmailTemplatesFixed = lazy(() => import("@/pages/admin/email-templates-fixed"));
const EmailTemplatesCentral = lazy(() => import("@/pages/admin/email-templates-central"));
const Template05View = lazy(() => import("@/pages/admin/template05-view"));
const Template05StaticView = lazy(() => import("@/pages/admin/template05-static-view"));
const MarketingModule = lazy(() => import("@/pages/admin/marketing-module"));

const EmailRoutingStats = lazy(() => import("@/pages/admin/email-routing-stats"));
const AutomatedEmailLogs = lazy(() => import("@/pages/admin/automated-email-logs"));
const AdminEmailLogs = lazy(() => import("@/pages/admin-email-logs"));
const InquiryResponses = lazy(() => import("@/pages/admin/inquiry-responses"));
const ServerConfig = lazy(() => import("@/components/admin/server-config"));
const AwsS3Settings = lazy(() => import("@/pages/admin/aws-s3-settings"));
const AdminMissingImages = lazy(() => import("@/pages/admin-missing-images"));
const FibSettings = lazy(() => import("@/pages/admin/fib-settings"));
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import PasswordReset from "@/pages/password-reset";
import CustomerForgotPassword from "@/pages/customer-forgot-password";
import CustomerResetPassword from "@/pages/customer-reset-password";
const CRMPage = lazy(() => import("@/pages/crm"));
import CustomerProfile from "@/pages/customer-profile";
import CustomerProfileEdit from "@/pages/customer-profile-edit";
import CustomerRegister from "@/pages/customer-register";
import CustomerLogin from "@/pages/customer-login";
import CompleteProfile from "@/pages/complete-profile";
import CustomerWallet from "@/pages/customer-wallet";
const WalletManagement = lazy(() => import("@/pages/admin/wallet-management"));
const ProductVariants = lazy(() => import("@/pages/admin/product-variants"));
const SalesAnalytics = lazy(() => import("@/pages/sales-analytics"));
const FinancialWorkflowDashboard = lazy(() => import("@/pages/admin/financial-workflow-dashboard"));
const ProductsPage = lazy(() => import("@/pages/products"));
const BatchManagement = lazy(() => import("@/pages/batch-management"));

import ProductReviews from "@/pages/product-reviews";
const TestProductImageUpload = lazy(() => import("@/pages/test-product-image-upload"));
const WebRTC = lazy(() => import("@/pages/webrtc"));
const JitsiMeetPage = lazy(() => import("@/pages/jitsi"));
import QuotePage from "@/pages/quote";
const Dashboard = lazy(() => import("@/pages/dashboard"));
const InquiryDetail = lazy(() => import("@/pages/inquiry-detail"));
const CategoryManagement = lazy(() => import("@/pages/category-management"));
const SeoManagement = lazy(() => import("@/pages/seo-management"));
const AdminSmsManagement = lazy(() => import("@/pages/admin-sms-management"));
const WidgetRecommendations = lazy(() => import("@/pages/widget-recommendations"));
// Removed AdminOrderManagement - replaced with OrderTrackingManagement for order-management module
const AbandonedCartManagement = lazy(() => import("@/pages/abandoned-cart-management"));
const FinancialDepartment = lazy(() => import("@/pages/financial-department"));
const FinanceOrders = lazy(() => import("@/pages/admin/finance-orders"));
import FinancialLogin from "@/pages/financial-login";
import WarehouseLogin from "@/pages/warehouse-login";
import LogisticsLogin from "@/pages/logistics-login";
const TicketingSystemFixed = lazy(() => import("@/pages/admin/ticketing-system-fixed"));

const SuperAdminSettings = lazy(() => import("@/pages/super-admin-settings"));
const SuperAdminOrderManagement = lazy(() => import("@/pages/admin/super-admin-order-management"));
const SiteManagementFixed = lazy(() => import("@/pages/site-management-fixed"));
const GeographicReports = lazy(() => import("@/pages/geographic-reports"));
const GeographicAnalytics = lazy(() => import("@/pages/admin/geographic-analytics"));
const IraqiGeography = lazy(() => import("@/pages/admin/iraqi-geography"));
const AISettings = lazy(() => import("@/pages/admin/ai-settings"));
const DocumentationPage = lazy(() => import("@/pages/documentation"));
const LogisticsOrders = lazy(() => import("@/pages/admin/logistics-orders"));
const LogisticsManagement = lazy(() => import("@/pages/admin/logistics-management"));
const DeliveredOrders = lazy(() => import("@/pages/admin/delivered-orders"));
import PaymentOptions from "@/pages/payment-options";
const GlobalRefreshSettings = lazy(() => import("@/pages/admin/global-refresh-settings"));

const InventoryNotificationSettings = lazy(() => import("@/pages/admin/inventory-notification-settings"));
const WarehouseManagement = lazy(() => import("@/pages/admin/warehouse-management"));
const WarehouseManagementFixed = lazy(() => import("@/pages/admin/warehouse-management-fixed"));
const WarehouseInventoryManagement = lazy(() => import("@/pages/admin/warehouse-inventory-management"));
const ContentManagement = lazy(() => import("@/pages/content-management"));

const SecurityManagement = lazy(() => import("@/pages/security-management-new"));
const RemoteDesktop = lazy(() => import("@/pages/admin/remote-desktop"));
import TawkToChat from "@/components/TawkToChat";

const TemplateDistribution = lazy(() => import("@/pages/admin/template-distribution"));
const WhatsAppCRM = lazy(() => import("@/pages/admin/whatsapp-crm"));

import BankReceiptUpload from "@/pages/bank-receipt-upload";
const WalletCorrection = lazy(() => import("@/pages/admin/wallet-correction"));
const WalletDebugTest = lazy(() => import("@/pages/wallet-debug-test"));
const TestLogistics = lazy(() => import("@/pages/test-logistics"));
const KpiDashboard = lazy(() => import("@/pages/kpi-dashboard"));
const KpiReport = lazy(() => import("@/pages/kpi-report"));
const ManagementDashboard = lazy(() => import("@/pages/management-dashboard"));
const AccountingManagement = lazy(() => import("@/pages/admin/accounting-management"));
const CompanyInformation = lazy(() => import("@/pages/admin/company-information"));
const VehicleOptimization = lazy(() => import("@/pages/admin/vehicle-optimization"));
const LogisticsGeography = lazy(() => import("@/pages/admin/logistics-geography"));
import UserGuide from "@/pages/user-guide";
import HybridPayment from "@/pages/hybrid-payment";
import PaymentCallback from "@/pages/payment-callback";
import OrderSuccess from "@/pages/order-success";
const AdminAbandonedOrders = lazy(() => import("@/pages/admin-abandoned-orders"));
const FooterManagement = lazy(() => import("@/pages/admin/footer-management"));
const ShopManagement = lazy(() => import("@/pages/admin/shop-management"));
const MarketplaceManagement = lazy(() => import("@/pages/admin/marketplace-management"));
import VendorRegistration from "@/pages/vendor-registration";
import VendorLogin from "@/pages/vendor-login";
import VendorForgotPassword from "@/pages/vendor-forgot-password";
import VendorResetPassword from "@/pages/vendor-reset-password";
const VendorDashboard = lazy(() => import("@/pages/vendor-dashboard"));
const VendorAddProduct = lazy(() => import("@/pages/vendor-add-product"));
const VendorEditProduct = lazy(() => import("@/pages/vendor-edit-product"));
import VendorPortal from "@/pages/vendor-portal";
const VehicleHistoryPage = lazy(() => import("@/pages/admin/vehicle-history"));
const BlogManagement = lazy(() => import("@/pages/admin/blog-management"));
import Blog from "@/pages/blog";
import BlogPost from "@/pages/blog-post";
import FibPaymentPage from "@/pages/fib-payment";

import NotFound from "@/pages/not-found";
import AdminRoute from "@/components/AdminRoute";
const LoadingManagement = lazy(() => import("@/modules/loading/LoadingManagement"));
import { ShopThemeProvider } from "@/components/ShopTheme";

const INTERNAL_ADMIN_PREFIX = "/admin";
const PUBLIC_ADMIN_PREFIX = "/mrg";

const isAdminPagePath = (path: string, prefix: string) =>
  path === prefix || path.startsWith(`${prefix}/`);

const toPublicAdminPath = (path: string) =>
  isAdminPagePath(path, INTERNAL_ADMIN_PREFIX)
    ? `${PUBLIC_ADMIN_PREFIX}${path.slice(INTERNAL_ADMIN_PREFIX.length)}`
    : path;

const usePublicAdminLocation = (
  options?: Parameters<typeof useBrowserLocation>[0],
): ReturnType<typeof useBrowserLocation> => {
  const [browserPath, navigate] = useBrowserLocation(options);
  const navigateWithPublicAdminPrefix: typeof navigate = (to, navigationOptions) => {
    if (typeof to === "string") {
      navigate(toPublicAdminPath(to), navigationOptions);
      return;
    }

    const publicUrl = new URL(to);
    publicUrl.pathname = toPublicAdminPath(publicUrl.pathname);
    navigate(publicUrl, navigationOptions);
  };

  return [browserPath, navigateWithPublicAdminPrefix];
};

function PublicAdminSwitch({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div role="status" aria-label="Loading page" className="flex min-h-[40vh] items-center justify-center"><span className="h-7 w-7 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>}>
    <Switch>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement<{ path?: string }>(child) || typeof child.props.path !== "string") {
          return child;
        }

        return React.cloneElement(child, {
          path: toPublicAdminPath(child.props.path),
        });
      })}
    </Switch>
    </Suspense>
  );
}

function Router() {
  const [location] = useLocation();
  const isLanding = location === "/";
  return (
    <ShopThemeProvider>
    <div className="min-h-screen flex flex-col">
      {!isLanding && <Header />}
      <main className="flex-1 pb-16 md:pb-0">
        <PublicAdminSwitch>
          <Route path="/" component={Home} />
          <Route path="/about" component={About} />
          <Route path="/logistics" component={Logistics} />
          <Route path="/services" component={Services} />
          <Route path="/contact" component={Contact} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/terms" component={TermsOfService} />
          <Route path="/user-guide" component={UserGuide} />
          <Route path="/help" component={UserGuide} />
          <Route path="/shop" component={Shop} />
          <Route path="/shop/product/:id" component={ShopProductPage} />
          <Route path="/wishlist" component={WishlistPage} />
          <Route path="/vendor" component={VendorPortal} />
          <Route path="/vendor-registration" component={VendorRegistration} />
          <Route path="/become-vendor" component={VendorRegistration} />
          <Route path="/vendor/login" component={VendorLogin} />
           <Route path="/vendor/forgot-password" component={VendorForgotPassword} />
           <Route path="/vendor/reset-password" component={VendorResetPassword} />
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
          <Route path="/mrg/shop" component={() => <AdminRoute><ShopAdmin /></AdminRoute>} />
          <Route path="/mrg/legal-affairs" component={() => <AdminRoute><LegalAffairs /></AdminRoute>} />
          <Route path="/mrg" component={AdminPage} />
          <Route path="/mrg/login" component={AdminLogin} />
          <Route path="/mrg/users" component={() => <AdminRoute><AdminUsers /></AdminRoute>} />

          <Route path="/mrg/barcode-inventory" component={() => <AdminRoute><BarcodeInventory /></AdminRoute>} />
          <Route path="/mrg/database-management" component={() => <AdminRoute><DatabaseManagement /></AdminRoute>} />
          <Route path="/mrg/user-management" component={() => <AdminRoute><UserManagementRedesign /></AdminRoute>} />
          <Route path="/user-management" component={() => <AdminRoute><UserManagementRedesign /></AdminRoute>} />
          <Route path="/mrg/factory-management" component={() => <AdminRoute><FactoryManagement /></AdminRoute>} />
          <Route path="/mrg/procedures-management" component={() => <AdminRoute><ProceduresManagement /></AdminRoute>} />

          <Route path="/mrg/email-settings" component={() => <AdminRoute><EmailSettingsPage /></AdminRoute>} />
          <Route path="/mrg/advanced-email-settings" component={() => <AdminRoute><AdvancedEmailSettingsPage /></AdminRoute>} />
          <Route path="/mrg/email-address-manager" component={() => <AdminRoute><EmailAddressManagerFixed /></AdminRoute>} />
          <Route path="/mrg/email-progress" component={() => <AdminRoute><EmailProgressPage /></AdminRoute>} />
          <Route path="/mrg/email-templates" component={() => <AdminRoute><EmailTemplates /></AdminRoute>} />
          <Route path="/mrg/email-routing-stats" component={() => <AdminRoute><EmailRoutingStats /></AdminRoute>} />

          <Route path="/mrg/email-templates-central" component={() => <AdminRoute><EmailTemplatesCentral /></AdminRoute>} />
          <Route path="/mrg/automated-email-logs" component={() => <AdminRoute><AutomatedEmailLogs /></AdminRoute>} />
          <Route path="/mrg/email-templates-fixed" component={() => <AdminRoute><EmailTemplatesFixed /></AdminRoute>} />
          <Route path="/mrg/template-distribution" component={() => <AdminRoute><TemplateDistribution /></AdminRoute>} />
          <Route path="/mrg/invoice-management" component={() => <AdminRoute><InvoiceManagement /></AdminRoute>} />
          <Route path="/mrg/payment-settings" component={() => <AdminRoute><PaymentSettings /></AdminRoute>} />
          <Route path="/test-payment" component={() => <AdminRoute><PaymentTestPage /></AdminRoute>} />
          <Route path="/mrg/wallet-management" component={() => <AdminRoute><WalletManagement /></AdminRoute>} />
          <Route path="/mrg/wallet-correction" component={() => <AdminRoute><WalletCorrection /></AdminRoute>} />
          <Route path="/wallet-debug-test" component={() => <AdminRoute><WalletDebugTest /></AdminRoute>} />
          <Route path="/mrg/inquiries" component={() => <AdminRoute><Dashboard /></AdminRoute>} />
          <Route path="/mrg/inquiry/:id" component={() => <AdminRoute><InquiryDetail /></AdminRoute>} />
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
          <Route path="/mrg/sms-management" component={() => <AdminRoute><AdminSmsManagement /></AdminRoute>} />
          <Route path="/mrg/whatsapp-crm" component={() => <AdminRoute><WhatsAppCRM /></AdminRoute>} />
          <Route path="/mrg/whatsapp-crm-en" component={() => <AdminRoute><WhatsAppCRM /></AdminRoute>} />
          <Route path="/mrg/email-logs" component={() => <AdminRoute><AdminEmailLogs /></AdminRoute>} />
          <Route path="/mrg/sms" component={() => <AdminRoute><AdminSmsManagement /></AdminRoute>} />
          <Route path="/mrg/widgets" component={() => <AdminRoute><WidgetRecommendations /></AdminRoute>} />
          <Route path="/mrg/order-management" component={() => <AdminRoute><ShopAdmin /></AdminRoute>} />
          <Route path="/mrg/order-tracking" component={() => <AdminRoute><ShopAdmin /></AdminRoute>} />
          <Route path="/mrg/order-tracking-management" component={() => <AdminRoute><ShopAdmin /></AdminRoute>} />
          <Route path="/mrg/abandoned-cart-management" component={() => <AdminRoute><AbandonedCartManagement /></AdminRoute>} />
          <Route path="/site-management" component={() => <AdminRoute><SiteManagementFixed /></AdminRoute>} />
          <Route path="/mrg/site-management" component={() => <AdminRoute><SiteManagementFixed /></AdminRoute>} />
          <Route path="/management/loading" component={() => <AdminRoute><LoadingManagement /></AdminRoute>} />
          <Route path="/management/loading/:section" component={() => <AdminRoute><LoadingManagement /></AdminRoute>} />
          <Route path="/mrg/products" component={() => <AdminRoute><ProductsPage /></AdminRoute>} />
          <Route path="/vendor/products" component={ProductsPage} />
          <Route path="/mrg/product-variants" component={() => <AdminRoute><ProductVariants /></AdminRoute>} />
          <Route path="/mrg/geographic-reports" component={() => <AdminRoute><GeographicReports /></AdminRoute>} />
          <Route path="/mrg/geographic-analytics" component={() => <AdminRoute><GeographicAnalytics /></AdminRoute>} />
          <Route path="/mrg/iraqi-geography" component={() => <AdminRoute><IraqiGeography /></AdminRoute>} />
          <Route path="/mrg/ai-settings" component={() => <AdminRoute><AISettings /></AdminRoute>} />
          <Route path="/documentation" component={DocumentationPage} />
          
          {/* New Department Order Management Pages */}
          <Route path="/mrg/finance-orders" component={() => <AdminRoute><FinanceOrders /></AdminRoute>} />
          <Route path="/mrg/logistics-orders" component={() => <AdminRoute><LogisticsOrders /></AdminRoute>} />
          <Route path="/mrg/logistics-management" component={() => <AdminRoute><LogisticsManagement /></AdminRoute>} />
          <Route path="/mrg/logistics" component={() => <AdminRoute><LogisticsManagement /></AdminRoute>} />
          <Route path="/mrg/vehicle-types-management" component={() => <AdminRoute>{(() => { const Comp = lazy(() => import("@/pages/admin/vehicle-types-management")); return <Comp />; })()}</AdminRoute>} />
          <Route path="/mrg/delivered-orders" component={() => <AdminRoute><DeliveredOrders /></AdminRoute>} />
          <Route path="/mrg/financial-workflow" component={() => <AdminRoute><FinancialWorkflowDashboard /></AdminRoute>} />
          <Route path="/payment-options" component={PaymentOptions} />
          <Route path="/mrg/global-refresh-settings" component={() => <AdminRoute><GlobalRefreshSettings /></AdminRoute>} />

          <Route path="/mrg/inventory-notification-settings" component={() => <AdminRoute><InventoryNotificationSettings /></AdminRoute>} />
          <Route path="/mrg/warehouse-management" component={() => <AdminRoute><WarehouseManagementFixed /></AdminRoute>} />
          <Route path="/mrg/warehouse-inventory-management" component={() => <AdminRoute><WarehouseInventoryManagement /></AdminRoute>} />

          <Route path="/mrg/content-management" component={() => <AdminRoute><ContentManagement /></AdminRoute>} />
          <Route path="/content-management" component={() => <AdminRoute><ContentManagement /></AdminRoute>} />
          <Route path="/mrg/footer-management" component={() => <AdminRoute><FooterManagement /></AdminRoute>} />
          <Route path="/mrg/shop-management" component={() => <AdminRoute><ShopManagement /></AdminRoute>} />
          <Route path="/mrg/marketplace-management" component={() => <AdminRoute><MarketplaceManagement /></AdminRoute>} />
          <Route path="/mrg/marketplace_management" component={() => <AdminRoute><MarketplaceManagement /></AdminRoute>} />
          <Route path="/mrg/email-templates" component={() => <AdminRoute><EmailTemplatesFixed /></AdminRoute>} />
          <Route path="/mrg/email-templates-fixed" component={() => <AdminRoute><EmailTemplatesFixed /></AdminRoute>} />
          <Route path="/mrg/email-templates-central" component={() => <AdminRoute><EmailTemplatesCentral /></AdminRoute>} />
          <Route path="/mrg/template05-view" component={() => <AdminRoute><Template05View /></AdminRoute>} />
          <Route path="/mrg/template05-static" component={() => <AdminRoute><Template05StaticView /></AdminRoute>} />
          <Route path="/mrg/inquiry-responses" component={() => <AdminRoute><InquiryResponses /></AdminRoute>} />
          <Route path="/mrg/marketing-module" component={() => <AdminRoute><MarketingModule /></AdminRoute>} />

          <Route path="/mrg/security-management" component={() => <AdminRoute><SecurityManagement /></AdminRoute>} />
          <Route path="/mrg/ticketing-system" component={() => <AdminRoute><TicketingSystemFixed /></AdminRoute>} />
          <Route path="/mrg/abandoned-orders" component={() => <AdminRoute><AdminAbandonedOrders /></AdminRoute>} />
          <Route path="/mrg/remote-desktop" component={() => <AdminRoute><RemoteDesktop /></AdminRoute>} />
          <Route path="/mrg/server-config" component={() => <AdminRoute><ServerConfig /></AdminRoute>} />
          <Route path="/mrg/aws-s3-settings" component={() => <AdminRoute><AwsS3Settings /></AdminRoute>} />
          <Route path="/mrg/missing-images" component={() => <AdminRoute><AdminMissingImages /></AdminRoute>} />
          <Route path="/mrg/fib-settings" component={() => <AdminRoute><FibSettings /></AdminRoute>} />
          <Route path="/mrg/batch-management" component={() => <AdminRoute><BatchManagement /></AdminRoute>} />
          <Route path="/mrg/kpi-dashboard" component={() => <AdminRoute><KpiDashboard /></AdminRoute>} />
          <Route path="/mrg/kpi-report" component={() => <AdminRoute><KpiReport /></AdminRoute>} />
          <Route path="/mrg/management-dashboard" component={() => <AdminRoute><ManagementDashboard /></AdminRoute>} />
          <Route path="/mrg/accounting-management" component={() => <AdminRoute><AccountingManagement /></AdminRoute>} />
          <Route path="/mrg/company-information" component={() => <AdminRoute><CompanyInformation /></AdminRoute>} />
          <Route path="/mrg/vehicle-optimization" component={() => <AdminRoute><VehicleOptimization /></AdminRoute>} />
          <Route path="/mrg/vehicle-history" component={() => <AdminRoute><VehicleHistoryPage /></AdminRoute>} />
          <Route path="/mrg/logistics-geography" component={() => <AdminRoute><LogisticsGeography /></AdminRoute>} />
          <Route path="/mrg/pdf-test" component={() => <AdminRoute>{(() => { const Comp = lazy(() => import("@/pages/admin/pdf-test")); return <Comp />; })()}</AdminRoute>} />
          <Route path="/mrg/blog-management" component={() => <AdminRoute><BlogManagement /></AdminRoute>} />


          
          {/* Department-specific routes */}
          <Route path="/financial" component={() => <AdminRoute><FinancialDepartment /></AdminRoute>} />
          <Route path="/financial/login" component={FinancialLogin} />
          <Route path="/warehouse" component={() => <AdminRoute><WarehouseManagementFixed /></AdminRoute>} />
          <Route path="/warehouse/login" component={WarehouseLogin} />
          <Route path="/logistics/login" component={LogisticsLogin} />
          <Route path="/test-logistics" component={TestLogistics} />

          <Route path="/super-admin/settings" component={() => <AdminRoute><SuperAdminSettings /></AdminRoute>} />
          <Route path="/mrg/super-admin-settings" component={() => <AdminRoute><SuperAdminSettings /></AdminRoute>} />
          <Route path="/mrg/super-admin-order-management" component={() => <AdminRoute><SuperAdminOrderManagement /></AdminRoute>} />
          <Route path="/super-admin/order-management" component={() => <AdminRoute><SuperAdminOrderManagement /></AdminRoute>} />
          
          <Route path="/analytics/sales" component={() => <AdminRoute><SalesAnalytics /></AdminRoute>} />
          <Route path="/products"><Redirect to="/shop" replace /></Route>
          <Route path="/products/*"><Redirect to="/shop" replace /></Route>
          <Route path="/test-product-image-upload" component={TestProductImageUpload} />
          <Route path="/product-reviews/:id" component={ProductReviews} />
          <Route path="/quote" component={QuotePage} />
          <Route path="/documentation" component={DocumentationPage} />
          <Route path="/webrtc" component={WebRTC} />
          <Route path="/jitsi" component={JitsiMeetPage} />
          <Route component={NotFound} />
        </PublicAdminSwitch>
      </main>
      {!isLanding && <Footer />}
      <MobileBottomNav />
    </div>
    </ShopThemeProvider>
  );
}

function GlobalSiteOverlays() {
  const [location] = useLocation();
  if (location === "/delivery") return null;
  const isCustomerShop =
    location === "/shop" ||
    /^\/shop\/product\/[^/]+$/.test(location);

  return (
    <>
      <TawkToChat />
      {isCustomerShop && <PWAInstallPrompt />}
    </>
  );
}

function App() {
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <GlobalSiteOverlays />
            <WouterRouter
              hook={usePublicAdminLocation}
              hrefs={(href) => toPublicAdminPath(href)}
            >
              <Router />
            </WouterRouter>
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
