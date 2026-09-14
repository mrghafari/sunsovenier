import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LayoutDashboard,
  Users, 
  Package, 
  ShoppingCart, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Activity,
  Settings,
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Monitor
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";

type DashboardLanguage = 'en' | 'ar' | 'tr' | 'fa';

const dashboardTranslations: Record<DashboardLanguage, Record<string, string>> = {
  en: {
    items: 'items', unauthorized: 'Unauthorized', signIn: 'Please sign in',
    back: 'Back to site management', title: 'Management Dashboard', subtitle: 'Business systems monitoring and control center',
    lastUpdated: 'Last updated', refresh: 'Refresh', settings: 'Settings', overview: 'Overview', operations: 'Operations',
    analytics: 'Analytics', system: 'System', loading: 'Loading...', dailySales: "Today's sales",
    currency: 'IQD', activeOrders: 'Active orders', onlineCustomers: 'Online customers', systemAlerts: 'System alerts',
    orderManagement: 'Order management', orderManagementDesc: 'Review and process new orders',
    inventoryManagement: 'Inventory management', inventoryManagementDesc: 'Monitor warehouse and product inventory',
    financialReports: 'Financial reports', financialReportsDesc: 'View sales and revenue reports',
    emailSettings: 'Email settings', emailSettingsDesc: 'Manage email and notification settings',
    orderStatus: 'Order status', awaitingApproval: 'Awaiting approval', processing: 'Processing',
    readyToShip: 'Ready to ship', delivered: 'Delivered', departmentPerformance: 'Department performance',
    finance: 'Financial Approval', warehouse: 'Warehouse', logistics: 'Logistics', criticalInventory: 'Critical inventory',
    stock: 'Stock', critical: 'Critical', low: 'Low', warning: 'Warning', noCriticalInventory: 'No critical inventory found',
    salesSummary: 'Live sales summary', customerSummary: 'Live customer summary', currentDailySales: "Today's valid sales",
    currentActiveOrders: 'Orders currently in progress', currentlyOnline: 'Customers with an active session',
    serverStatus: 'Server status', cpu: 'CPU', memory: 'Memory', disk: 'Disk', systemServices: 'System services',
    database: 'Database', email: 'Email', sms: 'SMS', backup: 'Backup', lastBackup: 'Last backup',
    status: 'Status', next: 'Next', unknown: 'Unknown', success: 'Successful', failed: 'Failed',
    online: 'Online', configured: 'Configured', unavailable: 'Unavailable', limited: 'Limited',
  },
  ar: {
    items: 'عنصر', unauthorized: 'غير مصرح', signIn: 'يرجى تسجيل الدخول',
    back: 'العودة إلى إدارة الموقع', title: 'لوحة الإدارة', subtitle: 'مركز مراقبة وإدارة أنظمة الأعمال',
    lastUpdated: 'آخر تحديث', refresh: 'تحديث', settings: 'الإعدادات', overview: 'نظرة عامة', operations: 'العمليات',
    analytics: 'التحليلات', system: 'النظام', loading: 'جارٍ التحميل...', dailySales: 'مبيعات اليوم',
    currency: 'دينار عراقي', activeOrders: 'الطلبات النشطة', onlineCustomers: 'العملاء المتصلون', systemAlerts: 'تنبيهات النظام',
    orderManagement: 'إدارة الطلبات', orderManagementDesc: 'مراجعة ومعالجة الطلبات الجديدة',
    inventoryManagement: 'إدارة المخزون', inventoryManagementDesc: 'مراقبة المستودع ومخزون المنتجات',
    financialReports: 'التقارير المالية', financialReportsDesc: 'عرض تقارير المبيعات والإيرادات',
    emailSettings: 'إعدادات البريد', emailSettingsDesc: 'إدارة البريد والإشعارات',
    orderStatus: 'حالة الطلبات', awaitingApproval: 'بانتظار الموافقة', processing: 'قيد المعالجة',
    readyToShip: 'جاهز للشحن', delivered: 'تم التسليم', departmentPerformance: 'أداء الأقسام',
    finance: 'الاعتماد المالي', warehouse: 'المستودع', logistics: 'اللوجستيات', criticalInventory: 'المخزون الحرج',
    stock: 'المخزون', critical: 'حرج', low: 'منخفض', warning: 'تحذير', noCriticalInventory: 'لا يوجد مخزون حرج',
    salesSummary: 'ملخص المبيعات المباشر', customerSummary: 'ملخص العملاء المباشر', currentDailySales: 'مبيعات اليوم الصالحة',
    currentActiveOrders: 'الطلبات قيد التنفيذ حاليًا', currentlyOnline: 'عملاء لديهم جلسة نشطة',
    serverStatus: 'حالة الخادم', cpu: 'المعالج', memory: 'الذاكرة', disk: 'القرص', systemServices: 'خدمات النظام',
    database: 'قاعدة البيانات', email: 'البريد', sms: 'الرسائل النصية', backup: 'النسخ الاحتياطي', lastBackup: 'آخر نسخة',
    status: 'الحالة', next: 'التالي', unknown: 'غير معروف', success: 'ناجح', failed: 'فاشل',
    online: 'متصل', configured: 'مهيأ', unavailable: 'غير متاح', limited: 'محدود',
  },
  tr: {
    items: 'öğe', unauthorized: 'Yetkisiz', signIn: 'Lütfen giriş yapın',
    back: 'Site yönetimine dön', title: 'Yönetim Paneli', subtitle: 'İş sistemleri izleme ve kontrol merkezi',
    lastUpdated: 'Son güncelleme', refresh: 'Yenile', settings: 'Ayarlar', overview: 'Genel bakış', operations: 'Operasyonlar',
    analytics: 'Analizler', system: 'Sistem', loading: 'Yükleniyor...', dailySales: 'Bugünkü satışlar',
    currency: 'IQD', activeOrders: 'Aktif siparişler', onlineCustomers: 'Çevrimiçi müşteriler', systemAlerts: 'Sistem uyarıları',
    orderManagement: 'Sipariş yönetimi', orderManagementDesc: 'Yeni siparişleri inceleyin ve işleyin',
    inventoryManagement: 'Stok yönetimi', inventoryManagementDesc: 'Depo ve ürün stoklarını izleyin',
    financialReports: 'Finans raporları', financialReportsDesc: 'Satış ve gelir raporlarını görüntüleyin',
    emailSettings: 'E-posta ayarları', emailSettingsDesc: 'E-posta ve bildirim ayarlarını yönetin',
    orderStatus: 'Sipariş durumu', awaitingApproval: 'Onay bekliyor', processing: 'İşleniyor',
    readyToShip: 'Gönderime hazır', delivered: 'Teslim edildi', departmentPerformance: 'Departman performansı',
    finance: 'Mali onay', warehouse: 'Depo', logistics: 'Lojistik', criticalInventory: 'Kritik stok',
    stock: 'Stok', critical: 'Kritik', low: 'Düşük', warning: 'Uyarı', noCriticalInventory: 'Kritik stok bulunamadı',
    salesSummary: 'Canlı satış özeti', customerSummary: 'Canlı müşteri özeti', currentDailySales: 'Bugünkü geçerli satışlar',
    currentActiveOrders: 'Şu anda işlemde olan siparişler', currentlyOnline: 'Aktif oturumu olan müşteriler',
    serverStatus: 'Sunucu durumu', cpu: 'İşlemci', memory: 'Bellek', disk: 'Disk', systemServices: 'Sistem servisleri',
    database: 'Veritabanı', email: 'E-posta', sms: 'SMS', backup: 'Yedekleme', lastBackup: 'Son yedekleme',
    status: 'Durum', next: 'Sonraki', unknown: 'Bilinmiyor', success: 'Başarılı', failed: 'Başarısız',
    online: 'Çevrimiçi', configured: 'Yapılandırıldı', unavailable: 'Kullanılamıyor', limited: 'Sınırlı',
  },
  fa: {
    items: 'مورد', unauthorized: 'غیر مجاز', signIn: 'لطفاً وارد شوید',
    back: 'بازگشت به مدیریت سایت', title: 'داشبورد مدیریتی', subtitle: 'مرکز کنترل و مدیریت سیستم‌های کسب‌وکار',
    lastUpdated: 'آخرین بروزرسانی', refresh: 'بروزرسانی', settings: 'تنظیمات', overview: 'نمای کلی', operations: 'عملیات',
    analytics: 'تحلیل‌ها', system: 'سیستم', loading: 'در حال بارگذاری...', dailySales: 'فروش امروز',
    currency: 'دینار عراق', activeOrders: 'سفارشات فعال', onlineCustomers: 'مشتریان آنلاین', systemAlerts: 'هشدارهای سیستم',
    orderManagement: 'مدیریت سفارشات', orderManagementDesc: 'بررسی و پردازش سفارشات جدید',
    inventoryManagement: 'مدیریت موجودی', inventoryManagementDesc: 'کنترل انبار و موجودی محصولات',
    financialReports: 'گزارشات مالی', financialReportsDesc: 'مشاهده گزارشات فروش و درآمد',
    emailSettings: 'تنظیمات ایمیل', emailSettingsDesc: 'مدیریت سیستم ایمیل و اطلاع‌رسانی',
    orderStatus: 'وضعیت سفارشات', awaitingApproval: 'در انتظار تایید', processing: 'در حال پردازش',
    readyToShip: 'آماده ارسال', delivered: 'تحویل شده', departmentPerformance: 'عملکرد بخش‌ها',
    finance: 'تایید مالی', warehouse: 'انبار', logistics: 'لجستیک', criticalInventory: 'موجودی بحرانی',
    stock: 'موجودی', critical: 'بحرانی', low: 'کم', warning: 'هشدار', noCriticalInventory: 'موجودی بحرانی یافت نشد',
    salesSummary: 'خلاصه زنده فروش', customerSummary: 'خلاصه زنده مشتریان', currentDailySales: 'فروش معتبر امروز',
    currentActiveOrders: 'سفارش‌های در حال انجام', currentlyOnline: 'مشتریان دارای نشست فعال',
    serverStatus: 'وضعیت سرور', cpu: 'پردازنده', memory: 'حافظه', disk: 'دیسک', systemServices: 'سرویس‌های سیستم',
    database: 'دیتابیس', email: 'ایمیل', sms: 'پیامک', backup: 'پشتیبان‌گیری', lastBackup: 'آخرین پشتیبان',
    status: 'وضعیت', next: 'بعدی', unknown: 'نامشخص', success: 'موفق', failed: 'ناموفق',
    online: 'آنلاین', configured: 'پیکربندی شده', unavailable: 'در دسترس نیست', limited: 'محدود',
  },
};

// Summary Card Component
const SummaryCard = ({ 
  title, 
  value, 
  subtitle = "", 
  change, 
  changeType = "increase", 
  icon, 
  color = "bg-blue-500" 
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeType?: "increase" | "decrease";
  icon: React.ReactNode;
  color?: string;
}) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline">
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-sm text-muted-foreground mr-2">{subtitle}</p>}
          </div>
          {change !== undefined && (
            <p className={`text-xs ${changeType === "increase" ? "text-green-600" : "text-red-600"} flex items-center`}>
              {changeType === "increase" ? (
                <TrendingUp className="w-3 h-3 ml-1" />
              ) : (
                <TrendingDown className="w-3 h-3 ml-1" />
              )}
              {Math.abs(change)}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Quick Action Widget Component
const QuickActionWidget = ({ 
  title, 
  description, 
  icon, 
  color = "bg-blue-500", 
  count, 
  itemLabel,
  onClick 
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  color?: string;
  count?: number;
  itemLabel: string;
  onClick?: () => void;
}) => (
  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{description}</p>
          {count !== undefined && (
            <Badge variant="secondary" className="mt-2 text-xs">
              {count} {itemLabel}
            </Badge>
          )}
        </div>
        <div className={`p-2 rounded-lg ${color} flex-shrink-0 mr-3`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const ManagementDashboard = () => {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { language: selectedLanguage, direction } = useLanguage();
  const language = (selectedLanguage in dashboardTranslations ? selectedLanguage : 'en') as DashboardLanguage;
  const t = (key: string) => dashboardTranslations[language][key] || dashboardTranslations.en[key] || key;
  const locale = language === 'fa' ? 'fa-IR-u-ca-persian' :
    language === 'ar' ? 'ar-u-ca-gregory' :
    language === 'tr' ? 'tr-TR-u-ca-gregory' : 'en-US-u-ca-gregory';
  const formatNumber = (value: number | string | undefined) => Number(value || 0).toLocaleString(locale);
  const serviceLabel = (status?: string) => t(status || 'unknown');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Fetch dashboard data
  const { data: dashboardData, isLoading, refetch } = useQuery<any>({
    queryKey: ['/api/management/dashboard'],
    staleTime: 300000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch system health data
  const { data: systemHealth } = useQuery<any>({
    queryKey: ['/api/management/system-health'],
    staleTime: 60000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // 2 minutes
  });

  const refreshData = () => {
    refetch();
    setLastUpdated(new Date());
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={direction}>
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">{t('unauthorized')}</h2>
          <p className="text-gray-600">{t('signIn')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={direction}>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation("/admin/site-management")}
            >
              <ArrowLeft className={`w-4 h-4 ${direction === 'rtl' ? 'ml-2 rotate-180' : 'mr-2'}`} />
              {t('back')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                 {t('title')}
              </h1>
              <p className="text-gray-600 mt-1">
                 {t('subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500">
               {t('lastUpdated')}: {lastUpdated.toLocaleTimeString(locale)}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
               {t('refresh')}
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 ml-2" />
               {t('settings')}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
            <TabsTrigger value="operations">{t('operations')}</TabsTrigger>
            <TabsTrigger value="analytics">{t('analytics')}</TabsTrigger>
            <TabsTrigger value="system">{t('system')}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                   <span className={direction === 'rtl' ? 'mr-3' : 'ml-3'}>{t('loading')}</span>
                </div>
              ) : (
                <>
                  {/* Key Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryCard
                       title={t('dailySales')}
                       value={formatNumber(dashboardData?.data?.summary?.dailySales)}
                       subtitle={t('currency')}
                      icon={<DollarSign className="w-4 h-4 text-white" />}
                      color="bg-green-500"
                    />
                    <SummaryCard
                       title={t('activeOrders')}
                      value={dashboardData?.data?.summary?.activeOrders || '0'}
                      icon={<ShoppingCart className="w-4 h-4 text-white" />}
                      color="bg-blue-500"
                    />
                    <SummaryCard
                       title={t('onlineCustomers')}
                      value={dashboardData?.data?.summary?.onlineCustomers || '0'}
                      icon={<Users className="w-4 h-4 text-white" />}
                      color="bg-purple-500"
                    />
                    <SummaryCard
                       title={t('systemAlerts')}
                      value={dashboardData?.data?.summary?.systemAlerts || '0'}
                      icon={<AlertTriangle className="w-4 h-4 text-white" />}
                      color="bg-red-500"
                    />
                  </div>

                  {/* Quick Actions Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <QuickActionWidget
                       title={t('orderManagement')}
                       description={t('orderManagementDesc')}
                      icon={<ShoppingCart className="w-5 h-5 text-white" />}
                      color="bg-blue-500"
                      count={dashboardData?.data?.quickStats?.orderStatuses?.pending || 0}
                       itemLabel={t('items')}
                      onClick={() => setLocation("/admin/shop-admin")}
                    />
                    <QuickActionWidget
                       title={t('inventoryManagement')}
                       description={t('inventoryManagementDesc')}
                       itemLabel={t('items')}
                      icon={<Package className="w-5 h-5 text-white" />}
                      color="bg-green-500"
                      onClick={() => setLocation("/admin/warehouse-management")}
                    />
                    <QuickActionWidget
                       title={t('financialReports')}
                       description={t('financialReportsDesc')}
                       itemLabel={t('items')}
                      icon={<BarChart3 className="w-5 h-5 text-white" />}
                      color="bg-orange-500"
                      onClick={() => setLocation("/admin/finance-orders")}
                    />
                    <QuickActionWidget
                       title={t('emailSettings')}
                       description={t('emailSettingsDesc')}
                       itemLabel={t('items')}
                      icon={<Settings className="w-5 h-5 text-white" />}
                      color="bg-red-500"
                      onClick={() => setLocation("/admin/email-settings")}
                    />
                  </div>


                </>
              )}
            </div>
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('orderStatus')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{t('awaitingApproval')}</span>
                        <Badge variant="secondary">{dashboardData?.data?.quickStats?.orderStatuses?.pending || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{t('processing')}</span>
                        <Badge variant="default">{dashboardData?.data?.quickStats?.orderStatuses?.processing || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{t('readyToShip')}</span>
                        <Badge variant="outline">{dashboardData?.data?.quickStats?.orderStatuses?.readyToShip || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{t('delivered')}</span>
                        <Badge className="bg-green-500">{dashboardData?.data?.quickStats?.orderStatuses?.delivered || 0}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('departmentPerformance')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>{t('finance')}</span>
                          <span>{dashboardData?.data?.quickStats?.departmentPerformance?.finance || 0}%</span>
                        </div>
                        <Progress value={dashboardData?.data?.quickStats?.departmentPerformance?.finance || 0} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>{t('warehouse')}</span>
                          <span>{dashboardData?.data?.quickStats?.departmentPerformance?.warehouse || 0}%</span>
                        </div>
                        <Progress value={dashboardData?.data?.quickStats?.departmentPerformance?.warehouse || 0} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>{t('logistics')}</span>
                          <span>{dashboardData?.data?.quickStats?.departmentPerformance?.logistics || 0}%</span>
                        </div>
                        <Progress value={dashboardData?.data?.quickStats?.departmentPerformance?.logistics || 0} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('criticalInventory')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {dashboardData?.data?.quickStats?.criticalInventory?.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded border">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-gray-500">{t('stock')}: {formatNumber(item.stock)}</p>
                          </div>
                          <Badge 
                            variant={item.status === 'critical' ? 'destructive' : 
                                   item.status === 'low' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {item.status === 'critical' ? t('critical') :
                             item.status === 'low' ? t('low') : t('warning')}
                          </Badge>
                        </div>
                      )) || (
                        <div className="text-center py-4 text-gray-500">
                          <Package className="w-6 h-6 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">{t('noCriticalInventory')}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('salesSummary')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-4 py-4">
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <span className="text-sm text-muted-foreground">{t('currentDailySales')}</span>
                        <strong>{formatNumber(dashboardData?.data?.summary?.dailySales)} {t('currency')}</strong>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <span className="text-sm text-muted-foreground">{t('currentActiveOrders')}</span>
                        <strong>{formatNumber(dashboardData?.data?.summary?.activeOrders)}</strong>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('customerSummary')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-4 py-4">
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <span className="text-sm text-muted-foreground">{t('currentlyOnline')}</span>
                        <strong>{formatNumber(dashboardData?.data?.summary?.onlineCustomers)}</strong>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <span className="text-sm text-muted-foreground">{t('systemAlerts')}</span>
                        <strong>{formatNumber(dashboardData?.data?.summary?.systemAlerts)}</strong>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <Monitor className="w-4 h-4 ml-2" />
                      {t('serverStatus')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">{t('cpu')}</span>
                        <span className="text-sm font-medium">{systemHealth?.data?.server?.cpu || 0}%</span>
                      </div>
                      <Progress value={systemHealth?.data?.server?.cpu || 0} className="h-2" />
                      
                      <div className="flex justify-between">
                        <span className="text-sm">{t('memory')}</span>
                        <span className="text-sm font-medium">{systemHealth?.data?.server?.memory || 0}%</span>
                      </div>
                      <Progress value={systemHealth?.data?.server?.memory || 0} className="h-2" />
                      
                      <div className="flex justify-between">
                        <span className="text-sm">{t('disk')}</span>
                        <span className="text-sm font-medium">{systemHealth?.data?.server?.disk || 0}%</span>
                      </div>
                      <Progress value={systemHealth?.data?.server?.disk || 0} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('systemServices')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t('database')}</span>
                        <Badge className={systemHealth?.data?.services?.database === 'online' ? 'bg-green-500' : 'bg-red-500'}>
                          {serviceLabel(systemHealth?.data?.services?.database)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t('email')}</span>
                        <Badge className={['online', 'configured'].includes(systemHealth?.data?.services?.email) ? 'bg-green-500' : 'bg-red-500'}>
                          {serviceLabel(systemHealth?.data?.services?.email)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t('sms')}</span>
                        <Badge className={systemHealth?.data?.services?.sms === 'online' ? 'bg-green-500' : 
                                         systemHealth?.data?.services?.sms === 'limited' ? 'bg-yellow-500' : 'bg-red-500'}>
                          {serviceLabel(systemHealth?.data?.services?.sms)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('backup')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">{t('lastBackup')}</span>
                        <span className="text-sm font-medium">{systemHealth?.data?.backup?.lastBackup || t('unavailable')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">{t('status')}</span>
                        <Badge className={systemHealth?.data?.backup?.status === 'success' ? 'bg-green-500' : 'bg-red-500'}>
                          {serviceLabel(systemHealth?.data?.backup?.status)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">{t('next')}</span>
                        <span className="text-sm font-medium">{systemHealth?.data?.backup?.nextScheduled || t('unavailable')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ManagementDashboard;