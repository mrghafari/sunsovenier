import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { getMultilingualMessage } from "@/components/multilingual-messages";
import { 
  ShoppingCart, 
  Clock, 
  Users, 
  MessageCircle, 
  BarChart3, 
  Settings, 
  Send,
  Eye,
  Calendar,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

// Types
interface AbandonedCartSettings {
  id?: number;
  timeoutMinutes: number;
  isEnabled: boolean;
  autoDeleteEnabled: boolean;
  autoDeleteAfterHours: number;
  notificationTitle: string;
  notificationMessage: string;
  senderEmailCategory: string;
  buttonText: string;
  showDiscountOffer: boolean;
  discountPercentage: number;
  discountCode: string;
  maxNotifications: number;
  notificationIntervalMinutes: number;
}

interface EmailSender {
  categoryKey: string;
  categoryName: string;
  fromEmail: string;
  fromName: string;
}

interface CartSession {
  id: number;
  customerId: number;
  sessionId: string;
  cartData: any;
  itemCount: number;
  totalValue: string;
  lastActivity: string;
  createdAt: string;
  isActive: boolean;
  isAbandoned: boolean;
  abandonedAt?: string;
}

interface AbandonedCartAnalytics {
  totalAbandonedCarts: number;
  currentlyAbandoned: number;
  notificationsRecorded: number;
}

export default function AbandonedCartManagement() {
  const [activeTab, setActiveTab] = useState("settings");
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false);
  const [senderEmailCategory, setSenderEmailCategory] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();

  // Fetch abandoned cart settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/admin/abandoned-cart/settings'],
    queryFn: () => apiRequest('/api/admin/abandoned-cart/settings'),
  });

  const { data: emailSenders, isLoading: emailSendersLoading } = useQuery({
    queryKey: ['/api/shop/email-senders'],
    queryFn: () => apiRequest('/api/shop/email-senders', undefined),
  });

  // Fetch abandoned carts
  const { data: abandonedCarts, isLoading: cartsLoading } = useQuery({
    queryKey: ['/api/admin/abandoned-cart/carts'],
    queryFn: () => apiRequest('/api/admin/abandoned-cart/carts'),
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 30_000,
  });

  // Fetch analytics
  const { data: analytics, isLoading: analyticsLoading, isError: analyticsError } = useQuery<{
    success: boolean;
    data: {
      days: number;
      analytics: Array<{ date: string; totalAbandonedCarts: number; notificationsRecorded: number }>;
      overallStats: AbandonedCartAnalytics;
      recoveryTrackingAvailable: boolean;
    };
  }>({
    queryKey: ['/api/admin/abandoned-cart/analytics', analyticsDays],
    queryFn: () => apiRequest(`/api/admin/abandoned-cart/analytics?days=${analyticsDays}`, undefined),
    refetchInterval: 30_000,
  });
  const dailyAnalytics = analytics?.data?.analytics || [];
  const maxDailyCount = Math.max(1, ...dailyAnalytics.map(day => Math.max(day.totalAbandonedCarts, day.notificationsRecorded)));

  useEffect(() => {
    if (typeof settings?.data?.autoDeleteEnabled === 'boolean') {
      setAutoDeleteEnabled(settings.data.autoDeleteEnabled);
    }
  }, [settings?.data?.autoDeleteEnabled]);

  useEffect(() => {
    setSenderEmailCategory(settings?.data?.senderEmailCategory || "");
  }, [settings?.data?.senderEmailCategory]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: AbandonedCartSettings) => 
      apiRequest('/api/admin/abandoned-cart/settings', {
        method: 'PUT',
        body: data
      }),
    onSuccess: () => {
      toast({
        title: getMultilingualMessage(language, 'settings_updated'),
        description: getMultilingualMessage(language, 'settings_saved_successfully'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/abandoned-cart/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/abandoned-cart/carts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/abandoned-cart/analytics'] });
    },
    onError: () => {
      toast({
        title: getMultilingualMessage(language, 'error'),
        description: getMultilingualMessage(language, 'error_updating_settings'),
        variant: "destructive",
      });
    }
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: ({ cartId, notification }: { cartId: number, notification: any }) =>
      apiRequest(`/api/admin/abandoned-cart/notify/${cartId}`, {
        method: 'POST',
        body: notification
      }),
    onSuccess: () => {
      toast({
        title: getMultilingualMessage(language, 'notification_sent'),
        description: getMultilingualMessage(language, 'notification_sent_successfully'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/abandoned-cart/carts'] });
    },
    onError: () => {
      toast({
        title: getMultilingualMessage(language, 'error'),
        description: getMultilingualMessage(language, 'error_sending_notification'),
        variant: "destructive",
      });
    }
  });

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const settingsData: AbandonedCartSettings = {
      timeoutMinutes: parseInt(formData.get('timeoutMinutes') as string) || 30,
      isEnabled: formData.get('isEnabled') === 'on',
      autoDeleteEnabled,
      autoDeleteAfterHours: parseInt(formData.get('autoDeleteAfterHours') as string) || 168,
      notificationTitle: formData.get('notificationTitle') as string,
      notificationMessage: formData.get('notificationMessage') as string,
      senderEmailCategory,
      buttonText: formData.get('buttonText') as string,
      showDiscountOffer: formData.get('showDiscountOffer') === 'on',
      discountPercentage: parseInt(formData.get('discountPercentage') as string) || 0,
      discountCode: formData.get('discountCode') as string,
      maxNotifications: parseInt(formData.get('maxNotifications') as string) || 3,
      notificationIntervalMinutes: parseInt(formData.get('notificationIntervalMinutes') as string) || 60,
    };

    updateSettingsMutation.mutate(settingsData);
  };

  const handleSendNotification = (cartId: number) => {
    const title = settings?.data?.notificationTitle?.trim();
    const message = settings?.data?.notificationMessage?.trim();
    if (!title || !message) {
      toast({
        title: getMultilingualMessage(language, 'error'),
        description: language === 'fa' ? "ابتدا عنوان و متن پیام را در تنظیمات ذخیره کنید" : language === 'ar' ? "احفظ عنوان الإشعار ونصه في الإعدادات أولاً" : language === 'tr' ? "Önce bildirim başlığını ve mesajını ayarlara kaydedin" : "Save the notification title and message in settings first",
        variant: "destructive",
      });
      return;
    }

    sendNotificationMutation.mutate({
      cartId,
      notification: {
        title,
        message,
        notificationType: 'email',
      }
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('fa-IR').format(parseFloat(amount)) + ' IQD';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {getMultilingualMessage(language, 'abandoned_cart_title')}
          </h1>
          <p className="text-gray-600">
            {language === 'fa' ? 'مدیریت و بهبود نرخ تبدیل سبدهای خرید رها شده' : language === 'ar' ? 'إدارة وتحسين معدل تحويل السلال المهجورة' : language === 'ku' ? 'بەڕێوەبەرایەتی و باشترکردنی ڕێژەی گۆڕینی سەبەتە بەجێهێڵراوەکان' : 'Manage and improve abandoned cart conversion rates'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {getMultilingualMessage(language, 'abandoned_cart_settings')}
            </TabsTrigger>
            <TabsTrigger value="carts" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              {getMultilingualMessage(language, 'abandoned_carts')}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {getMultilingualMessage(language, 'analytics')}
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {getMultilingualMessage(language, 'abandoned_cart_settings')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {settingsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <form onSubmit={handleSettingsSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="timeoutMinutes">{getMultilingualMessage(language, 'timeout_minutes')}</Label>
                        <Input
                          id="timeoutMinutes"
                          name="timeoutMinutes"
                          type="number"
                          min="1"
                          defaultValue={settings?.data?.timeoutMinutes || 30}
                          className="w-full"
                        />
                        <p className="text-sm text-gray-500">
                          {language === 'fa' ? 'مدت زمان بعد از آخرین فعالیت که سبد خرید رها شده تلقی می‌شود' : language === 'ar' ? 'المدة الزمنية بعد آخر نشاط يعتبر فيها السلة مهجورة' : language === 'ku' ? 'ماوەی کاتی دوای دوایین چالاکی کە سەبەتە بە بەجێهێڵراو دادەنرێت' : 'Time after last activity when cart is considered abandoned'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maxNotifications">{getMultilingualMessage(language, 'max_notifications')}</Label>
                        <Input
                          id="maxNotifications"
                          name="maxNotifications"
                          type="number"
                          min="1"
                          max="10"
                          defaultValue={settings?.data?.maxNotifications || 3}
                          className="w-full"
                        />
                        <p className="text-sm text-gray-500">
                          {language === 'fa' ? 'حداکثر تعداد پیام‌هایی که به هر سبد خرید ارسال می‌شود' : language === 'ar' ? 'الحد الأقصى لعدد الرسائل التي يتم إرسالها لكل سلة' : language === 'ku' ? 'زۆرترین ژمارەی پەیام کە بۆ هەر سەبەتێک دەنێردرێت' : 'Maximum number of messages sent to each cart'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notificationIntervalMinutes">{getMultilingualMessage(language, 'notification_interval')}</Label>
                        <Input
                          id="notificationIntervalMinutes"
                          name="notificationIntervalMinutes"
                          type="number"
                          min="30"
                          defaultValue={settings?.data?.notificationIntervalMinutes || 60}
                          className="w-full"
                        />
                        <p className="text-sm text-gray-500">
                          {language === 'fa' ? 'فاصله زمانی بین ارسال پیام‌های یادآوری' : language === 'ar' ? 'الفترة الزمنية بين إرسال الرسائل التذكيرية' : language === 'ku' ? 'ماوەی کاتی لە نێوان ناردنی پەیامە یادەوەری‌یەکان' : 'Time interval between reminder messages'}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isEnabled"
                          name="isEnabled"
                          defaultChecked={settings?.data?.isEnabled || false}
                        />
                        <Label htmlFor="isEnabled">{getMultilingualMessage(language, 'enable_abandoned_cart_recovery')}</Label>
                      </div>

                      <div className="space-y-3 rounded-lg border border-red-200 bg-red-50/50 p-4 md:col-span-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="autoDeleteEnabled"
                            name="autoDeleteEnabled"
                            checked={autoDeleteEnabled}
                            onCheckedChange={setAutoDeleteEnabled}
                          />
                          <Label htmlFor="autoDeleteEnabled">
                            {language === 'fa' ? 'حذف خودکار سبدهای رهاشده' : language === 'ar' ? 'الحذف التلقائي للسلال المهجورة' : language === 'tr' ? 'Terk edilmiş sepetleri otomatik sil' : 'Automatically delete abandoned carts'}
                          </Label>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="autoDeleteAfterHours">
                            {language === 'fa' ? 'زمان حذف پس از رهاشدن (ساعت)' : language === 'ar' ? 'وقت الحذف بعد الهجر (بالساعات)' : language === 'tr' ? 'Terk edildikten sonra sil (saat)' : 'Delete after abandonment (hours)'}
                          </Label>
                          <Input
                            id="autoDeleteAfterHours"
                            name="autoDeleteAfterHours"
                            type="number"
                            min="1"
                            max="8760"
                            defaultValue={settings?.data?.autoDeleteAfterHours || 168}
                            className="max-w-xs bg-white"
                          />
                          <p className="text-sm text-gray-600">
                            {language === 'fa' ? 'پس از این مدت، سبد و پیام‌های مرتبط برای همیشه حذف می‌شوند. پاک‌سازی هر ۳۰ دقیقه اجرا می‌شود.' : language === 'ar' ? 'بعد هذه المدة، تُحذف السلة والرسائل المرتبطة بها نهائياً. يتم التنظيف كل 30 دقيقة.' : language === 'tr' ? 'Bu süreden sonra sepet ve ilgili mesajlar kalıcı olarak silinir. Temizlik her 30 dakikada bir çalışır.' : 'After this time, the cart and its related messages are permanently deleted. Cleanup runs every 30 minutes.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">
                        {language === 'fa' ? 'محتوای پیام‌ها' : language === 'ar' ? 'محتوى الرسائل' : language === 'ku' ? 'ناوەڕۆکی پەیامەکان' : 'Message Content'}
                      </h3>

                      <div className="space-y-2">
                        <Label htmlFor="senderEmailCategory">
                          {language === 'fa' ? 'ایمیل فرستنده' : language === 'ar' ? 'البريد الإلكتروني للمرسل' : language === 'tr' ? 'Gönderen e-posta adresi' : 'Sender email'}
                        </Label>
                        <select
                          id="senderEmailCategory"
                          name="senderEmailCategory"
                          value={senderEmailCategory}
                          onChange={(event) => setSenderEmailCategory(event.target.value)}
                          disabled={emailSendersLoading}
                          required
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="" disabled>
                            {emailSendersLoading
                              ? (language === 'fa' ? 'در حال بارگذاری ایمیل‌ها...' : 'Loading email addresses...')
                              : (language === 'fa' ? 'یک ایمیل شرکت را انتخاب کنید' : language === 'ar' ? 'اختر بريد الشركة' : language === 'tr' ? 'Bir şirket e-postası seçin' : 'Select a company email')}
                          </option>
                          {(emailSenders?.data || []).map((sender: EmailSender) => (
                            <option key={sender.categoryKey} value={sender.categoryKey}>
                              {sender.fromEmail} — {sender.fromName || sender.categoryName}
                            </option>
                          ))}
                        </select>
                        {!emailSendersLoading && (emailSenders?.data || []).length === 0 && (
                          <p className="text-sm text-red-600">
                            {language === 'fa' ? 'هیچ ایمیل فعال شرکتی تنظیم نشده است. ابتدا یک SMTP فعال در مدیریت ایمیل‌ها ثبت کنید.' : 'No active company email is configured. Add an active SMTP sender in email management first.'}
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="notificationTitle">{getMultilingualMessage(language, 'notification_title')}</Label>
                        <Input
                          id="notificationTitle"
                          name="notificationTitle"
                          defaultValue={settings?.data?.notificationTitle || getMultilingualMessage(language, 'default_notification_title')}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notificationMessage">{getMultilingualMessage(language, 'notification_message')}</Label>
                        <Textarea
                          id="notificationMessage"
                          name="notificationMessage"
                          rows={3}
                          defaultValue={settings?.data?.notificationMessage || getMultilingualMessage(language, 'default_notification_message')}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="buttonText">{getMultilingualMessage(language, 'button_text')}</Label>
                        <Input
                          id="buttonText"
                          name="buttonText"
                          defaultValue={settings?.data?.buttonText || getMultilingualMessage(language, 'default_button_text')}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">
                        {language === 'fa' ? 'تنظیمات تخفیف' : language === 'ar' ? 'إعدادات الخصم' : language === 'ku' ? 'ڕێکخستنەکانی داشکاندن' : 'Discount Settings'}
                      </h3>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="showDiscountOffer"
                          name="showDiscountOffer"
                          defaultChecked={settings?.data?.showDiscountOffer || false}
                        />
                        <Label htmlFor="showDiscountOffer">{getMultilingualMessage(language, 'show_discount_offer')}</Label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="discountPercentage">{getMultilingualMessage(language, 'discount_percentage')}</Label>
                          <Input
                            id="discountPercentage"
                            name="discountPercentage"
                            type="number"
                            min="0"
                            max="100"
                            defaultValue={settings?.data?.discountPercentage || 0}
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="discountCode">{getMultilingualMessage(language, 'discount_code')}</Label>
                          <Input
                            id="discountCode"
                            name="discountCode"
                            defaultValue={settings?.data?.discountCode || ''}
                            placeholder={getMultilingualMessage(language, 'default_discount_code')}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={updateSettingsMutation.isPending}
                    >
                      {updateSettingsMutation.isPending ? 
                        (language === 'fa' ? "در حال ذخیره..." : language === 'ar' ? "جاري الحفظ..." : language === 'ku' ? "لە پاشەکەوتکردن..." : "Saving...") : 
                        getMultilingualMessage(language, 'save_settings')
                      }
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Abandoned Carts Tab */}
          <TabsContent value="carts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  {getMultilingualMessage(language, 'abandoned_carts')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cartsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {abandonedCarts?.data?.length > 0 ? (
                      abandonedCarts.data.map((cart: CartSession) => (
                        <div key={cart.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold">
                                {getMultilingualMessage(language, 'customer')} #{cart.customerId}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {cart.itemCount} {getMultilingualMessage(language, 'items')} • {formatCurrency(cart.totalValue)}
                              </p>
                              <p className="text-sm text-gray-500">
                                {getMultilingualMessage(language, 'last_activity')}: {formatDate(cart.lastActivity)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={cart.isAbandoned ? "destructive" : "default"}>
                                {cart.isAbandoned ? 
                                  (language === 'fa' ? 'رها شده' : language === 'ar' ? 'مهجور' : language === 'ku' ? 'بەجێهێڵراو' : 'Abandoned') : 
                                  (language === 'fa' ? 'فعال' : language === 'ar' ? 'نشط' : language === 'ku' ? 'چالاک' : 'Active')
                                }
                              </Badge>
                              <Button
                                size="sm"
                                onClick={() => handleSendNotification(cart.id)}
                                disabled={sendNotificationMutation.isPending}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                {getMultilingualMessage(language, 'send_notification')}
                              </Button>
                            </div>
                          </div>
                          
                          {cart.cartData && (
                            <div className="bg-gray-50 p-3 rounded">
                              <p className="text-sm font-medium mb-2">
                                {language === 'fa' ? 'محصولات سبد:' : language === 'ar' ? 'منتجات السلة:' : language === 'ku' ? 'بەرهەمەکانی سەبەتە:' : 'Cart Products:'}
                              </p>
                              <div className="text-sm text-gray-600">
                                {JSON.stringify(cart.cartData, null, 2)}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">
                          {language === 'fa' ? 'هیچ سبد خرید رها شده‌ای موجود نیست' : language === 'ar' ? 'لا توجد سلات مهجورة' : language === 'ku' ? 'هیچ سەبەتێکی بەجێهێڵراو نییە' : 'No abandoned carts found'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                {language === 'fa' ? 'گزارش بر پایه سبدها و اعلان‌های ثبت‌شده در دیتابیس' : 'Report based on recorded carts and notifications'}
              </p>
              <div className="flex gap-2" aria-label={language === 'fa' ? 'بازه گزارش' : 'Report period'}>
                {[7, 30, 90].map(days => (
                  <Button key={days} type="button" size="sm"
                    variant={analyticsDays === days ? 'default' : 'outline'}
                    onClick={() => setAnalyticsDays(days)}>
                    {days} {language === 'fa' ? 'روز' : 'days'}
                  </Button>
                ))}
              </div>
            </div>
            {analyticsError && (
              <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-red-700">
                {language === 'fa' ? 'دریافت داده‌های آنالیتیکس ناموفق بود؛ آمار نمایش داده نمی‌شود.' : 'Failed to load analytics; figures are unavailable.'}
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {language === 'fa' ? 'رهاشده در بازه' : 'Abandoned in period'}
                      </p>
                      <p className="text-2xl font-bold text-red-600">
                        {analyticsLoading || analyticsError ? '—' : analytics?.data?.overallStats?.totalAbandonedCarts ?? '—'}
                      </p>
                    </div>
                    <ShoppingCart className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {language === 'fa' ? 'اعلان‌های ثبت‌شده در بازه' : 'Notifications recorded in period'}
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {analyticsLoading || analyticsError ? '—' : analytics?.data?.overallStats?.notificationsRecorded ?? '—'}
                      </p>
                    </div>
                    <MessageCircle className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {language === 'fa' ? 'سبدهای رهاشدهٔ فعال' : 'Currently abandoned carts'}
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {analyticsLoading || analyticsError ? '—' : analytics?.data?.overallStats?.currentlyAbandoned ?? '—'}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {language === 'fa' ? 'نرخ بازگشت' : language === 'ar' ? 'معدل الاسترداد' : language === 'ku' ? 'ڕێژەی گەڕانەوە' : 'Recovery Rate'}
                      </p>
                      <p className="text-2xl font-bold text-purple-600">
                        —
                      </p>
                      <p className="text-xs text-gray-500">
                        {language === 'fa' ? 'خریدِ ناشی از بازگشت سبد ثبت نمی‌شود' : 'Order-linked recovery is not tracked'}
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'fa' ? 'عملکرد سیستم' : language === 'ar' ? 'أداء النظام' : language === 'ku' ? 'کارایی سیستەم' : 'System Performance'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : analyticsError ? (
                  <p role="alert" className="py-8 text-center text-red-700">
                    {language === 'fa' ? 'گزارش در دسترس نیست.' : 'Report unavailable.'}
                  </p>
                ) : dailyAnalytics.every(day => day.totalAbandonedCarts === 0 && day.notificationsRecorded === 0) ? (
                  <p className="py-8 text-center text-gray-500">
                    {language === 'fa' ? 'در این بازه سبد رهاشده یا اعلانی در داده‌های موجود ثبت نشده است.' : 'No abandoned carts or notifications recorded in this period.'}
                  </p>
                ) : (
                  <>
                    <div className="mb-4 flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-red-500" />{language === 'fa' ? 'سبد رهاشده' : 'Abandoned carts'}</span>
                      <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-blue-500" />{language === 'fa' ? 'اعلان ثبت‌شده' : 'Notifications recorded'}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <div className="flex h-48 items-end gap-1 border-b border-gray-200 pb-2" style={{ minWidth: `${dailyAnalytics.length * 36}px` }}
                        role="img" aria-label={language === 'fa' ? 'نمودار روزانه سبدهای رهاشده و اعلان‌ها' : 'Daily abandoned carts and notifications chart'}>
                        {dailyAnalytics.map(day => (
                          <div key={day.date} className="flex min-w-8 flex-1 flex-col items-center gap-1"
                            title={`${day.date}: ${day.totalAbandonedCarts} carts, ${day.notificationsRecorded} notifications`}>
                            <div className="flex h-36 items-end gap-0.5">
                              <div className="w-3 rounded-t bg-red-500" style={{ height: `${day.totalAbandonedCarts / maxDailyCount * 100}%` }} />
                              <div className="w-3 rounded-t bg-blue-500" style={{ height: `${day.notificationsRecorded / maxDailyCount * 100}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-500">{day.date.slice(5)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="mt-4 text-xs text-gray-500">
                      {language === 'fa'
                        ? 'فقط رکوردهای موجود شمرده می‌شوند؛ سبدها و اعلان‌های حذف‌شده در تاریخچه قابل بازیابی نیستند. اعلان ثبت‌شده لزوماً به معنی تحویل ایمیل نیست.'
                        : 'Only retained records are counted; deleted carts and notifications cannot be recovered. A recorded notification does not prove email delivery.'}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}