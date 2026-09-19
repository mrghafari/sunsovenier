import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Settings, Calendar, Clock, Save, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";

const SHOP_MANAGEMENT_TRANSLATIONS = {
  en: {
    loading: "Loading settings...", title: "Shop Management", subtitle: "General shop settings and configuration",
    settingsManagement: "Settings Management", general: "General Settings", business: "Business Hours", system: "System",
    generalTitle: "General Shop Settings", generalDescription: "Basic settings that affect the entire shop",
    currency: "Default Currency", iqd: "Iraqi Dinar (IQD)", usd: "US Dollar (USD)", eur: "Euro (EUR)", irr: "Iranian Rial (IRR)",
    timezone: "Timezone", baghdad: "Baghdad (Asia/Baghdad)", tehran: "Tehran (Asia/Tehran)",
    businessTitle: "Business Hours", businessDescription: "Set the shop's daily business hours", dailyHours: "Daily Business Hours",
    format: "Format: opening time-closing time (example: 8:00-17:00)", systemTitle: "System Information",
    systemDescription: "Current system settings status", loaded: "Loaded settings:", lastUpdate: "Last update:",
    today: "Today", never: "Never", saving: "Saving...", save: "Save Settings",
    saved: "Settings saved", savedDescription: "Shop settings updated successfully",
    saveError: "Error saving settings", saveErrorDescription: "Unable to save settings",
  },
  ar: {
    loading: "جارٍ تحميل الإعدادات...", title: "إدارة المتجر", subtitle: "الإعدادات العامة وتكوين المتجر",
    settingsManagement: "إدارة الإعدادات", general: "الإعدادات العامة", business: "ساعات العمل", system: "النظام",
    generalTitle: "إعدادات المتجر العامة", generalDescription: "الإعدادات الأساسية التي تؤثر على المتجر بأكمله",
    currency: "العملة الافتراضية", iqd: "الدينار العراقي (IQD)", usd: "الدولار الأمريكي (USD)", eur: "اليورو (EUR)", irr: "الريال الإيراني (IRR)",
    timezone: "المنطقة الزمنية", baghdad: "بغداد (Asia/Baghdad)", tehran: "طهران (Asia/Tehran)",
    businessTitle: "ساعات العمل", businessDescription: "حدد ساعات العمل اليومية للمتجر", dailyHours: "ساعات العمل اليومية",
    format: "التنسيق: وقت البدء-وقت الانتهاء (مثال: 8:00-17:00)", systemTitle: "معلومات النظام",
    systemDescription: "حالة إعدادات النظام الحالية", loaded: "الإعدادات المحملة:", lastUpdate: "آخر تحديث:",
    today: "اليوم", never: "أبداً", saving: "جارٍ الحفظ...", save: "حفظ الإعدادات",
    saved: "تم حفظ الإعدادات", savedDescription: "تم تحديث إعدادات المتجر بنجاح",
    saveError: "خطأ في حفظ الإعدادات", saveErrorDescription: "تعذر حفظ الإعدادات",
  },
  tr: {
    loading: "Ayarlar yükleniyor...", title: "Mağaza Yönetimi", subtitle: "Genel mağaza ayarları ve yapılandırması",
    settingsManagement: "Ayar Yönetimi", general: "Genel Ayarlar", business: "Çalışma Saatleri", system: "Sistem",
    generalTitle: "Genel Mağaza Ayarları", generalDescription: "Tüm mağazayı etkileyen temel ayarlar",
    currency: "Varsayılan Para Birimi", iqd: "Irak Dinarı (IQD)", usd: "ABD Doları (USD)", eur: "Euro (EUR)", irr: "İran Riyali (IRR)",
    timezone: "Saat Dilimi", baghdad: "Bağdat (Asia/Baghdad)", tehran: "Tahran (Asia/Tehran)",
    businessTitle: "Çalışma Saatleri", businessDescription: "Mağazanın günlük çalışma saatlerini belirleyin", dailyHours: "Günlük Çalışma Saatleri",
    format: "Biçim: başlangıç-bitiş saati (örnek: 8:00-17:00)", systemTitle: "Sistem Bilgileri",
    systemDescription: "Mevcut sistem ayarlarının durumu", loaded: "Yüklenen ayarlar:", lastUpdate: "Son güncelleme:",
    today: "Bugün", never: "Hiçbir zaman", saving: "Kaydediliyor...", save: "Ayarları Kaydet",
    saved: "Ayarlar kaydedildi", savedDescription: "Mağaza ayarları başarıyla güncellendi",
    saveError: "Ayarları kaydetme hatası", saveErrorDescription: "Ayarlar kaydedilemedi",
  },
  fa: {
    loading: "در حال بارگذاری تنظیمات...", title: "مدیریت فروشگاه", subtitle: "تنظیمات عمومی و پیکربندی فروشگاه",
    settingsManagement: "مدیریت تنظیمات", general: "تنظیمات عمومی", business: "ساعات کاری", system: "سیستم",
    generalTitle: "تنظیمات عمومی فروشگاه", generalDescription: "تنظیمات پایه‌ای که بر کل فروشگاه تأثیر می‌گذارد",
    currency: "واحد پول پیش‌فرض", iqd: "دینار عراقی (IQD)", usd: "دلار آمریکا (USD)", eur: "یورو (EUR)", irr: "ریال ایران (IRR)",
    timezone: "منطقه زمانی", baghdad: "بغداد (Asia/Baghdad)", tehran: "تهران (Asia/Tehran)",
    businessTitle: "ساعات کاری", businessDescription: "تعیین ساعات کاری روزانه فروشگاه", dailyHours: "ساعات کاری روزانه",
    format: "فرمت: ساعت شروع-ساعت پایان (مثال: 8:00-17:00)", systemTitle: "اطلاعات سیستم",
    systemDescription: "وضعیت فعلی تنظیمات سیستم", loaded: "تعداد تنظیمات بارگذاری شده:", lastUpdate: "آخرین به‌روزرسانی:",
    today: "امروز", never: "هرگز", saving: "در حال ذخیره...", save: "ذخیره تنظیمات",
    saved: "تنظیمات ذخیره شد", savedDescription: "تنظیمات فروشگاه با موفقیت به‌روزرسانی شد",
    saveError: "خطا در ذخیره تنظیمات", saveErrorDescription: "امکان ذخیره تنظیمات وجود ندارد",
  },
} as const;

interface ShopSettings {
  id?: number;
  settingKey: string;
  settingValue: string;
  settingType: string;
  displayName: string;
  displayNameEn?: string;
  description?: string;
  category: string;
  isPublic: boolean;
  validationRule?: string;
  defaultValue?: string;
}

export default function ShopManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language, direction } = useLanguage();
  const tr = (key: keyof typeof SHOP_MANAGEMENT_TRANSLATIONS.en) => SHOP_MANAGEMENT_TRANSLATIONS[language][key];
  
  // Settings state
  const [currency, setCurrency] = useState("IQD");
  const [timezone, setTimezone] = useState("Asia/Baghdad");
  const [businessHours, setBusinessHours] = useState("8:00-17:00");
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/check-auth');
        if (!response.ok) {
          setLocation('/admin/login');
        }
      } catch (error) {
        setLocation('/admin/login');
      }
    };
    checkAuth();
  }, [setLocation]);

  // Fetch shop settings
  const { data: shopSettings = [], isLoading } = useQuery<ShopSettings[]>({
    queryKey: ['/api/shop/settings'],
    queryFn: async () => {
      const response = await apiRequest('/api/shop/settings', { method: 'GET' });
      return response.data || [];
    },
  });



  // Load existing settings
  useEffect(() => {
    if (shopSettings.length > 0) {
      const currencySetting = shopSettings.find(s => s.settingKey === 'default_currency');
      const timezoneSetting = shopSettings.find(s => s.settingKey === 'timezone');
      const businessHoursSetting = shopSettings.find(s => s.settingKey === 'business_hours');
      if (currencySetting) setCurrency(currencySetting.settingValue);
      if (timezoneSetting) setTimezone(timezoneSetting.settingValue);
      if (businessHoursSetting) setBusinessHours(businessHoursSetting.settingValue);
    }
  }, [shopSettings]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<ShopSettings>[]) => {
      return apiRequest('/api/shop/settings', { method: 'POST', body: { settings } });
    },
    onSuccess: () => {
      toast({
         title: `✅ ${tr("saved")}`,
         description: tr("savedDescription"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shop/settings'] });
      setIsUpdating(false);
    },
    onError: (error: any) => {
      toast({
         title: `❌ ${tr("saveError")}`,
         description: error.message || tr("saveErrorDescription"),
        variant: "destructive",
      });
      setIsUpdating(false);
    },
  });



  const handleSaveSettings = () => {
    setIsUpdating(true);
    const settingsToSave = [
      {
        settingKey: 'default_currency',
        settingValue: currency,
        settingType: 'text',
         displayName: tr("currency"),
        displayNameEn: 'Default Currency',
         description: tr("generalDescription"),
        category: 'general',
        isPublic: true,
        defaultValue: 'IQD'
      },
      {
        settingKey: 'timezone',
        settingValue: timezone,
        settingType: 'text',
         displayName: tr("timezone"),
        displayNameEn: 'Timezone',
         description: tr("systemDescription"),
        category: 'general',
        isPublic: false,
        defaultValue: 'Asia/Baghdad'
      },
      {
        settingKey: 'business_hours',
        settingValue: businessHours,
        settingType: 'text',
         displayName: tr("dailyHours"),
        displayNameEn: 'Business Hours',
         description: tr("businessDescription"),
        category: 'general',
        isPublic: true,
        defaultValue: '8:00-17:00'
      }
    ];

    saveSettingsMutation.mutate(settingsToSave);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" dir={direction}>
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="mr-2">{tr("loading")}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" dir={direction}>
      <div className="flex items-center justify-between mb-6">
        <div>
           <h1 className="text-3xl font-bold mb-2">{tr("title")}</h1>
           <p className="text-muted-foreground">{tr("subtitle")}</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
           {tr("settingsManagement")}
        </Badge>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
             {tr("general")}
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
             {tr("business")}
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
             {tr("system")}
          </TabsTrigger>
        </TabsList>





        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
             <CardTitle>{tr("generalTitle")}</CardTitle>
             <CardDescription>{tr("generalDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label htmlFor="currency">{tr("currency")}</Label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                     <option value="IQD">{tr("iqd")}</option>
                     <option value="USD">{tr("usd")}</option>
                     <option value="EUR">{tr("eur")}</option>
                     <option value="IRR">{tr("irr")}</option>
                  </select>
                </div>
                <div className="space-y-2">
                   <Label htmlFor="timezone">{tr("timezone")}</Label>
                  <select
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                     <option value="Asia/Baghdad">{tr("baghdad")}</option>
                     <option value="Asia/Tehran">{tr("tehran")}</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                 {tr("businessTitle")}
              </CardTitle>
               <CardDescription>{tr("businessDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                 <Label htmlFor="business_hours">{tr("dailyHours")}</Label>
                <Input
                  id="business_hours"
                  value={businessHours}
                  onChange={(e) => setBusinessHours(e.target.value)}
                  placeholder="8:00-17:00"
                />
                <p className="text-sm text-muted-foreground">
                   {tr("format")}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
               <CardTitle>{tr("systemTitle")}</CardTitle>
               <CardDescription>{tr("systemDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                   <span>{tr("loaded")}</span>
                  <Badge variant="secondary">{shopSettings.length}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between">
                   <span>{tr("lastUpdate")}</span>
                  <span className="text-sm text-muted-foreground">
                     {shopSettings.length > 0 ? tr("today") : tr("never")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end mt-6">
        <Button 
          onClick={handleSaveSettings}
          disabled={isUpdating}
          className="flex items-center gap-2"
        >
          {isUpdating ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
           {isUpdating ? tr("saving") : tr("save")}
        </Button>
      </div>
    </div>
  );
}