import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bot, Zap, Settings, Activity, TrendingUp, Save, TestTube, Sparkles, Brain, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/lib/i18n";

type AiCopy = Record<string, string>;

const aiCopy: Record<Language, AiCopy> = {
  en: {
    back: "Back to dashboard", title: "Advanced AI Settings", subtitle: "Manage AI and API",
    generalTab: "General settings", skuTab: "SKU generation", performanceTab: "Performance", testingTab: "Testing",
    generalTitle: "General AI settings", generalDescription: "Configure the core AI system",
    providerSection: "Select AI provider", providerLabel: "API provider", providerPlaceholder: "Select provider",
    modelLabel: "AI model", modelPlaceholder: "Select model", apiSection: "API configuration",
    apiKeyHelp: "API key for accessing {provider} services", descriptionOptional: "Description (optional)",
    descriptionPlaceholder: "Settings description...", descriptionHelp: "Description for these settings",
    settingsStatus: "Settings status", loading: "Loading...", savedSettings: "Saved settings", newSettings: "New settings",
    modelParams: "Model parameters", maxTokens: "Maximum tokens", maxTokensHelp: "Maximum number of generated tokens",
    temperature: "Temperature", temperatureHelp: "Control response creativity (0-2)", features: "Enable features",
    aiEnabled: "AI enabled", aiEnabledHelp: "Enable or disable the entire AI system", skuEnabled: "Smart SKU generation",
    skuEnabledHelp: "Automatically generate SKUs for new products", recommendations: "Smart recommendations",
    recommendationsHelp: "Suggest products based on AI", save: "Save settings", saving: "Saving...",
    skuTitle: "Smart SKU generation", skuDescription: "Configure and test SKU generation with AI",
    skuHow: "How SKU generation works", skuHowDescription: "The AI system generates a unique SKU based on the product name, category, and description. This process includes content analysis, keyword extraction, and creation of a standard code.",
    performanceTitle: "AI system performance", performanceDescription: "Monitor API usage and statistics",
    successfulRequests: "Successful requests", consumedTokens: "Tokens consumed", averageResponse: "Average response time",
    testingTitle: "Performance testing", testingDescription: "Test AI system connectivity and performance",
    testConnectionTitle: "Test API connection", testConnection: "Test connection", testing: "Testing...",
    testSkuTitle: "Test SKU generation", testSku: "Generate test SKU", generating: "Generating...",
    saveSuccess: "Save successful", saveSuccessDescription: "AI settings saved successfully", saveError: "Save failed",
    saveErrorDescription: "Unable to save settings", connectionSuccess: "Connection successful",
    connectionSuccessDescription: "API connected. Model: {model}", connectionError: "Connection failed",
    connectionErrorDescription: "Unable to connect to the API", skuSuccess: "SKU generated", skuSuccessDescription: "Test SKU: {sku}",
    skuError: "SKU generation failed", skuErrorDescription: "Unable to generate a test SKU",
    newest: "latest", seconds: "{value}s", defaultDescription: "{provider} AI settings",
  },
  fa: {
    back: "بازگشت به داشبورد", title: "تنظیمات پیشرفته هوش مصنوعی", subtitle: "مدیریت هوش مصنوعی و API",
    generalTab: "تنظیمات کلی", skuTab: "تولید SKU", performanceTab: "عملکرد", testingTab: "آزمایش",
    generalTitle: "تنظیمات عمومی هوش مصنوعی", generalDescription: "پیکربندی اصلی سیستم هوش مصنوعی",
    providerSection: "انتخاب ارائه‌دهنده هوش مصنوعی", providerLabel: "ارائه‌دهنده API", providerPlaceholder: "انتخاب ارائه‌دهنده",
    modelLabel: "مدل هوش مصنوعی", modelPlaceholder: "انتخاب مدل", apiSection: "پیکربندی API",
    apiKeyHelp: "کلید API برای دسترسی به سرویس‌های {provider}", descriptionOptional: "توضیحات (اختیاری)",
    descriptionPlaceholder: "توضیحات تنظیمات...", descriptionHelp: "توضیحات برای این تنظیمات", settingsStatus: "وضعیت تنظیمات",
    loading: "در حال بارگیری...", savedSettings: "تنظیمات ذخیره‌شده", newSettings: "تنظیمات جدید", modelParams: "پارامترهای مدل",
    maxTokens: "حداکثر توکن", maxTokensHelp: "تعداد حداکثر توکن‌های تولیدی", temperature: "دما", temperatureHelp: "کنترل خلاقیت پاسخ‌ها (۰ تا ۲)",
    features: "فعال‌سازی ویژگی‌ها", aiEnabled: "هوش مصنوعی فعال", aiEnabledHelp: "فعال یا غیرفعال کردن کل سیستم هوش مصنوعی",
    skuEnabled: "تولید هوشمند SKU", skuEnabledHelp: "تولید خودکار SKU برای محصولات جدید", recommendations: "توصیه‌های هوشمند",
    recommendationsHelp: "پیشنهاد محصولات بر اساس هوش مصنوعی", save: "ذخیره تنظیمات", saving: "در حال ذخیره...",
    skuTitle: "تولید هوشمند SKU", skuDescription: "تنظیمات و آزمایش تولید SKU با هوش مصنوعی", skuHow: "نحوه کارکرد تولید SKU",
    skuHowDescription: "سیستم هوش مصنوعی بر اساس نام، دسته‌بندی و توضیحات محصول، یک SKU منحصربه‌فرد تولید می‌کند. این فرآیند شامل تحلیل محتوا، استخراج کلیدواژه‌ها و ایجاد کد استاندارد است.",
    performanceTitle: "عملکرد سیستم هوش مصنوعی", performanceDescription: "مانیتورینگ و آمار استفاده از API",
    successfulRequests: "درخواست‌های موفق", consumedTokens: "توکن‌های مصرفی", averageResponse: "زمان پاسخ متوسط",
    testingTitle: "آزمایش عملکرد", testingDescription: "تست اتصال و عملکرد سیستم هوش مصنوعی", testConnectionTitle: "تست اتصال API",
    testConnection: "آزمایش اتصال", testing: "در حال آزمایش...", testSkuTitle: "تست تولید SKU", testSku: "تولید SKU تست", generating: "در حال تولید...",
    saveSuccess: "ذخیره موفق", saveSuccessDescription: "تنظیمات هوش مصنوعی با موفقیت ذخیره شد", saveError: "خطا در ذخیره",
    saveErrorDescription: "امکان ذخیره تنظیمات وجود ندارد", connectionSuccess: "اتصال موفق", connectionSuccessDescription: "API متصل شد. مدل: {model}",
    connectionError: "خطا در اتصال", connectionErrorDescription: "امکان اتصال به API وجود ندارد", skuSuccess: "SKU تولید شد",
    skuSuccessDescription: "SKU تست: {sku}", skuError: "خطا در تولید SKU", skuErrorDescription: "امکان تولید SKU تست وجود ندارد", newest: "جدیدترین",
    seconds: "{value} ثانیه", defaultDescription: "تنظیمات هوش مصنوعی {provider}",
  },
  ar: {
    back: "العودة إلى لوحة التحكم", title: "إعدادات الذكاء الاصطناعي المتقدمة", subtitle: "إدارة الذكاء الاصطناعي وواجهات API",
    generalTab: "الإعدادات العامة", skuTab: "إنشاء SKU", performanceTab: "الأداء", testingTab: "الاختبار",
    generalTitle: "إعدادات الذكاء الاصطناعي العامة", generalDescription: "إعداد نظام الذكاء الاصطناعي الأساسي",
    providerSection: "اختر مزوّد الذكاء الاصطناعي", providerLabel: "مزوّد API", providerPlaceholder: "اختر المزوّد",
    modelLabel: "نموذج الذكاء الاصطناعي", modelPlaceholder: "اختر النموذج", apiSection: "إعداد API",
    apiKeyHelp: "مفتاح API للوصول إلى خدمات {provider}", descriptionOptional: "الوصف (اختياري)", descriptionPlaceholder: "وصف الإعدادات...",
    descriptionHelp: "وصف هذه الإعدادات", settingsStatus: "حالة الإعدادات", loading: "جارٍ التحميل...", savedSettings: "الإعدادات المحفوظة",
    newSettings: "إعدادات جديدة", modelParams: "معلمات النموذج", maxTokens: "الحد الأقصى للرموز", maxTokensHelp: "الحد الأقصى للرموز المُنشأة",
    temperature: "درجة الحرارة", temperatureHelp: "التحكم في إبداع الردود (0-2)", features: "تفعيل الميزات", aiEnabled: "الذكاء الاصطناعي مفعّل",
    aiEnabledHelp: "تفعيل أو تعطيل نظام الذكاء الاصطناعي بالكامل", skuEnabled: "إنشاء SKU ذكي", skuEnabledHelp: "إنشاء SKU تلقائياً للمنتجات الجديدة",
    recommendations: "التوصيات الذكية", recommendationsHelp: "اقتراح منتجات بالاعتماد على الذكاء الاصطناعي", save: "حفظ الإعدادات", saving: "جارٍ الحفظ...",
    skuTitle: "إنشاء SKU ذكي", skuDescription: "إعداد واختبار إنشاء SKU بالذكاء الاصطناعي", skuHow: "كيفية إنشاء SKU",
    skuHowDescription: "ينشئ نظام الذكاء الاصطناعي SKU فريداً بالاعتماد على اسم المنتج وفئته ووصفه. تشمل العملية تحليل المحتوى واستخراج الكلمات المفتاحية وإنشاء رمز قياسي.",
    performanceTitle: "أداء نظام الذكاء الاصطناعي", performanceDescription: "مراقبة استخدام API وإحصاءاته", successfulRequests: "الطلبات الناجحة",
    consumedTokens: "الرموز المستخدمة", averageResponse: "متوسط وقت الاستجابة", testingTitle: "اختبار الأداء",
    testingDescription: "اختبار اتصال وأداء نظام الذكاء الاصطناعي", testConnectionTitle: "اختبار اتصال API", testConnection: "اختبار الاتصال",
    testing: "جارٍ الاختبار...", testSkuTitle: "اختبار إنشاء SKU", testSku: "إنشاء SKU تجريبي", generating: "جارٍ الإنشاء...",
    saveSuccess: "تم الحفظ بنجاح", saveSuccessDescription: "تم حفظ إعدادات الذكاء الاصطناعي بنجاح", saveError: "فشل الحفظ",
    saveErrorDescription: "تعذر حفظ الإعدادات", connectionSuccess: "تم الاتصال بنجاح", connectionSuccessDescription: "تم الاتصال بـ API. النموذج: {model}",
    connectionError: "فشل الاتصال", connectionErrorDescription: "تعذر الاتصال بـ API", skuSuccess: "تم إنشاء SKU", skuSuccessDescription: "SKU التجريبي: {sku}",
    skuError: "فشل إنشاء SKU", skuErrorDescription: "تعذر إنشاء SKU تجريبي", newest: "الأحدث", seconds: "{value} ث",
    defaultDescription: "إعدادات الذكاء الاصطناعي لـ {provider}",
  },
  tr: {
    back: "Kontrol paneline dön", title: "Gelişmiş Yapay Zekâ Ayarları", subtitle: "Yapay zekâ ve API yönetimi",
    generalTab: "Genel ayarlar", skuTab: "SKU oluşturma", performanceTab: "Performans", testingTab: "Test",
    generalTitle: "Genel yapay zekâ ayarları", generalDescription: "Temel yapay zekâ sistemini yapılandırın",
    providerSection: "Yapay zekâ sağlayıcısını seçin", providerLabel: "API sağlayıcısı", providerPlaceholder: "Sağlayıcı seçin",
    modelLabel: "Yapay zekâ modeli", modelPlaceholder: "Model seçin", apiSection: "API yapılandırması",
    apiKeyHelp: "{provider} hizmetlerine erişim için API anahtarı", descriptionOptional: "Açıklama (isteğe bağlı)",
    descriptionPlaceholder: "Ayar açıklaması...", descriptionHelp: "Bu ayarların açıklaması", settingsStatus: "Ayar durumu",
    loading: "Yükleniyor...", savedSettings: "Kaydedilmiş ayarlar", newSettings: "Yeni ayarlar", modelParams: "Model parametreleri",
    maxTokens: "Maksimum token", maxTokensHelp: "Üretilecek maksimum token sayısı", temperature: "Sıcaklık", temperatureHelp: "Yanıt yaratıcılığını kontrol edin (0-2)",
    features: "Özellikleri etkinleştir", aiEnabled: "Yapay zekâ etkin", aiEnabledHelp: "Yapay zekâ sisteminin tamamını etkinleştirin veya devre dışı bırakın",
    skuEnabled: "Akıllı SKU oluşturma", skuEnabledHelp: "Yeni ürünler için otomatik SKU oluşturun", recommendations: "Akıllı öneriler",
    recommendationsHelp: "Yapay zekâya göre ürün önerin", save: "Ayarları kaydet", saving: "Kaydediliyor...",
    skuTitle: "Akıllı SKU oluşturma", skuDescription: "Yapay zekâ ile SKU oluşturmayı yapılandırın ve test edin", skuHow: "SKU oluşturma nasıl çalışır",
    skuHowDescription: "Yapay zekâ sistemi ürün adı, kategorisi ve açıklamasına göre benzersiz bir SKU oluşturur. Bu süreç içerik analizi, anahtar kelime çıkarma ve standart kod oluşturmayı içerir.",
    performanceTitle: "Yapay zekâ sistemi performansı", performanceDescription: "API kullanımını ve istatistiklerini izleyin",
    successfulRequests: "Başarılı istekler", consumedTokens: "Kullanılan tokenlar", averageResponse: "Ortalama yanıt süresi",
    testingTitle: "Performans testi", testingDescription: "Yapay zekâ sistemi bağlantısını ve performansını test edin",
    testConnectionTitle: "API bağlantısını test et", testConnection: "Bağlantıyı test et", testing: "Test ediliyor...",
    testSkuTitle: "SKU oluşturmayı test et", testSku: "Test SKU'su oluştur", generating: "Oluşturuluyor...",
    saveSuccess: "Kayıt başarılı", saveSuccessDescription: "Yapay zekâ ayarları başarıyla kaydedildi", saveError: "Kayıt başarısız",
    saveErrorDescription: "Ayarlar kaydedilemedi", connectionSuccess: "Bağlantı başarılı", connectionSuccessDescription: "API bağlandı. Model: {model}",
    connectionError: "Bağlantı başarısız", connectionErrorDescription: "API'ye bağlanılamadı", skuSuccess: "SKU oluşturuldu",
    skuSuccessDescription: "Test SKU'su: {sku}", skuError: "SKU oluşturma başarısız", skuErrorDescription: "Test SKU'su oluşturulamadı", newest: "en yeni",
    seconds: "{value} sn", defaultDescription: "{provider} yapay zekâ ayarları",
  },
};

export default function AISettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { language, direction } = useLanguage();
  const t = (key: string, values: Record<string, string> = {}) =>
    Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, value), aiCopy[language][key] ?? aiCopy.en[key] ?? key);
  const locale = language === "fa" ? "fa-IR" : language === "ar" ? "ar-IQ" : language === "tr" ? "tr-TR" : "en-US";
  const [aiEnabled, setAiEnabled] = useState(true);
  const [skuGeneration, setSkuGeneration] = useState(true);
  const [smartRecommendations, setSmartRecommendations] = useState(true);
  const [maxTokens, setMaxTokens] = useState("1000");
  const [temperature, setTemperature] = useState("0.7");
  const [model, setModel] = useState("gpt-5");
  const [apiProvider, setApiProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [description, setDescription] = useState("");
  const [currentSettings, setCurrentSettings] = useState<any>(null);

  // Load AI Settings
  const { data: settingsData, isLoading: loadingSettings, refetch: refetchSettings } = useQuery({
    queryKey: ['/api/ai/settings'],
    enabled: true
  });

  // Save AI Settings
  const saveSettingsMutation = useMutation({
    mutationFn: (settings: any) => apiRequest("/api/ai/settings", "POST", {
      ...settings,
      provider: apiProvider,
      description: description || t("defaultDescription", { provider: apiProvider })
    }),
    onSuccess: () => {
      toast({
        title: `✅ ${t("saveSuccess")}`,
        description: t("saveSuccessDescription"),
      });
      refetchSettings();
      queryClient.invalidateQueries({ queryKey: ['/api/ai/settings'] });
    },
    onError: () => {
      toast({
        title: `❌ ${t("saveError")}`,
        description: t("saveErrorDescription"),
        variant: "destructive",
      });
    },
  });

  // Test AI Connection
  const testAIMutation = useMutation({
    mutationFn: () => apiRequest("/api/ai/test-connection", "POST"),
    onSuccess: (result) => {
      toast({
        title: `✅ ${t("connectionSuccess")}`,
        description: t("connectionSuccessDescription", { model: result.model }),
      });
    },
    onError: () => {
      toast({
        title: `❌ ${t("connectionError")}`,
        description: t("connectionErrorDescription"),
        variant: "destructive",
      });
    },
  });

  // Load settings into state when data is fetched
  useEffect(() => {
    if (settingsData?.success && settingsData.data && settingsData.data.length > 0) {
      const settings = settingsData.data.find((s: any) => s.provider === apiProvider) || settingsData.data[0];
      if (settings) {
        setCurrentSettings(settings);
        setApiKey(settings.apiKey || "");
        setDescription(settings.description || "");
        setApiProvider(settings.provider || "openai");
        
        // Load settings from JSON field
        if (settings.settings) {
          setModel(settings.settings.model || "gpt-5");
          setMaxTokens(settings.settings.maxTokens?.toString() || "1000");
          setTemperature(settings.settings.temperature?.toString() || "0.7");
          setAiEnabled(settings.settings.aiEnabled !== false);
          setSkuGeneration(settings.settings.skuGeneration !== false);
          setSmartRecommendations(settings.settings.smartRecommendations !== false);
        }
      }
    }
  }, [settingsData, apiProvider]);

  // Generate Test SKU
  const generateTestSKUMutation = useMutation({
    mutationFn: () => apiRequest("/api/products/generate-sku", "POST", {
      name: "محصول تست",
      category: "commercial",
      description: "این یک محصول تست برای آزمایش تولید SKU است"
    }),
    onSuccess: (result) => {
      toast({
        title: `🤖 ${t("skuSuccess")}`,
        description: t("skuSuccessDescription", { sku: result.data.sku }),
      });
    },
    onError: () => {
      toast({
        title: `❌ ${t("skuError")}`,
        description: t("skuErrorDescription"),
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    const settings = {
      aiEnabled,
      skuGeneration,
      smartRecommendations,
      maxTokens: parseInt(maxTokens),
      temperature: parseFloat(temperature),
      model,
      apiKey,
      description
    };
    saveSettingsMutation.mutate(settings);
  };

  const getModelOptions = () => {
    if (apiProvider === "openai") {
      return [
        { value: "gpt-5", label: `GPT-5 (${t("newest")})` },
        { value: "gpt-4o", label: "GPT-4o" },
        { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
        { value: "gpt-4", label: "GPT-4" },
        { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
      ];
    } else if (apiProvider === "deepseek") {
      return [
        { value: "deepseek-chat", label: "DeepSeek Chat" },
        { value: "deepseek-coder", label: "DeepSeek Coder" },
        { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
      ];
    }
    return [];
  };

  return (
    <div dir={direction} lang={language} className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
          <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {user?.id === 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/admin")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                <span>{t("back")}</span>
              </Button>
            )}
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg">
                <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
                <p className="text-gray-600 dark:text-gray-400">{t("subtitle")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>{t("generalTab")}</span>
            </TabsTrigger>
            <TabsTrigger value="sku" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span>{t("skuTab")}</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>{t("performanceTab")}</span>
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              <span>{t("testingTab")}</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  <span>{t("generalTitle")}</span>
                </CardTitle>
                <CardDescription>
                  {t("generalDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* AI Provider Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t("providerSection")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="apiProvider">{t("providerLabel")}</Label>
                      <Select value={apiProvider} onValueChange={setApiProvider}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("providerPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent dir={direction}>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="deepseek">DeepSeek</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">{t("modelLabel")}</Label>
                      <Select value={model} onValueChange={setModel}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("modelPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent dir={direction}>
                          {getModelOptions().map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* API Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t("apiSection")}
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">
                        {apiProvider === "openai" ? "OpenAI API Key" : "DeepSeek API Key"}
                      </Label>
                      <Input
                        id="apiKey"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={apiProvider === "openai" ? "sk-..." : "ds-..."}
                        className="font-mono"
                      />
                      <p className="text-sm text-gray-500">
                        {t("apiKeyHelp", { provider: apiProvider === "openai" ? "OpenAI" : "DeepSeek" })}
                      </p>
                    </div>
                    
                    {apiProvider === "openai" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="description">{t("descriptionOptional")}</Label>
                          <Input
                            id="description"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t("descriptionPlaceholder")}
                            className="font-mono"
                          />
                          <p className="text-sm text-gray-500">{t("descriptionHelp")}</p>
                        </div>
                      </>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="status">{t("settingsStatus")}</Label>
                      <p className="text-sm text-green-600">
                        {loadingSettings ? t("loading") : currentSettings ? t("savedSettings") : t("newSettings")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Model Parameters */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t("modelParams")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="maxTokens">{t("maxTokens")}</Label>
                      <Input
                        id="maxTokens"
                        type="number"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(e.target.value)}
                        min="100"
                        max="4000"
                      />
                      <p className="text-sm text-gray-500">{t("maxTokensHelp")}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="temperature">{t("temperature")} (Temperature)</Label>
                      <Input
                        id="temperature"
                        type="number"
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                        min="0"
                        max="2"
                        step="0.1"
                      />
                      <p className="text-sm text-gray-500">{t("temperatureHelp")}</p>
                    </div>
                  </div>
                </div>

                {/* Feature Toggles */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t("features")}
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t("aiEnabled")}</Label>
                        <p className="text-sm text-gray-500">{t("aiEnabledHelp")}</p>
                      </div>
                      <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t("skuEnabled")}</Label>
                        <p className="text-sm text-gray-500">{t("skuEnabledHelp")}</p>
                      </div>
                      <Switch checked={skuGeneration} onCheckedChange={setSkuGeneration} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t("recommendations")}</Label>
                        <p className="text-sm text-gray-500">{t("recommendationsHelp")}</p>
                      </div>
                      <Switch checked={smartRecommendations} onCheckedChange={setSmartRecommendations} />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={saveSettingsMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saveSettingsMutation.isPending ? t("saving") : t("save")}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SKU Generation Tab */}
          <TabsContent value="sku" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  <span>{t("skuTitle")}</span>
                </CardTitle>
                <CardDescription>
                  {t("skuDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    {t("skuHow")}
                  </h3>
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    {t("skuHowDescription")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  <span>{t("performanceTitle")}</span>
                </CardTitle>
                <CardDescription>
                  {t("performanceDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100">{t("successfulRequests")}</p>
                        <p className="text-2xl font-bold">{(1234).toLocaleString(locale)}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-200" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100">{t("consumedTokens")}</p>
                        <p className="text-2xl font-bold">
                          {new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(45200)}
                        </p>
                      </div>
                      <Database className="h-8 w-8 text-blue-200" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100">{t("averageResponse")}</p>
                        <p className="text-2xl font-bold">{t("seconds", { value: (1.2).toLocaleString(locale) })}</p>
                      </div>
                      <Sparkles className="h-8 w-8 text-purple-200" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testing Tab */}
          <TabsContent value="testing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  <span>{t("testingTitle")}</span>
                </CardTitle>
                <CardDescription>
                  {t("testingDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{t("testConnectionTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => testAIMutation.mutate()}
                        disabled={testAIMutation.isPending}
                        className="w-full"
                      >
                        {testAIMutation.isPending ? t("testing") : t("testConnection")}
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{t("testSkuTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => generateTestSKUMutation.mutate()}
                        disabled={generateTestSKUMutation.isPending}
                        className="w-full"
                        variant="outline"
                      >
                        {generateTestSKUMutation.isPending ? t("generating") : t("testSku")}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}