import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Mail, Settings, TestTube, Save, Plus, Trash2, Edit, Check, X, AlertCircle, CheckCircle, Clock, Eye, EyeOff, XCircle, BookOpen, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import EmailSetupProgress from "@/components/ui/email-setup-progress";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/lib/i18n";

type EmailCopy = {
  back: string; title: string; subtitle: string; loading: string; empty: string;
  initTitle: string; initDescription: string; initAction: string; categories: string;
  categoriesDescription: string; addCategory: string; deleteCategory: string; deleting: string;
  smtp: string; recipients: string; assignment: string; control: string; smtpHost: string;
  port: string; ssl: string; username: string; password: string; fromName: string; fromEmail: string;
  otp: string; otpDescription: string; validate: string; validating: string; save: string;
  test: string; testConnection: string; validationSuccess: string; validationFailed: string;
  errors: string; suggestions: string; hostReachable: string; authentication: string;
  status: string; quickAdd: string; ccEmail: string; bccEmail: string; addBoth: string;
  quickAddHint: string; addRecipient: string; email: string; optionalName: string; primary: string;
  recipientType: string; to: string; cc: string; bcc: string; distribution: string; none: string;
  configured: string; notConfigured: string; recipientsCount: string; selectCategory: string;
  selectCategoryDescription: string; cancel: string; create: string; creating: string; key: string;
  name: string; description: string; categoryStatus: string; ready: string; failed: string;
  incomplete: string; untested: string; emailManager: string; progress: string; templates: string;
  logs: string; systemStatus: string; active: string; enabled: string; emailTypes: string;
  routing: string; mapping: string; smartFeatures: string; quickActions: string; currentConfig: string;
  enterEmail: string;
};

const emailCopy: Record<Language, EmailCopy> = {
  en: {
    back: "Back to Admin", title: "Advanced Email Management", subtitle: "Configure independent SMTP settings for each product category", loading: "Loading email settings...", empty: "Choose an email category from the left to configure its settings",
    initTitle: "Initialize Email Categories", initDescription: "Set up the default email categories for your chemical products", initAction: "Initialize Categories", categories: "Email Categories", categoriesDescription: "Configure SMTP settings and recipients for each category", addCategory: "Add category", deleteCategory: "Delete category", deleting: "Deleting...", smtp: "SMTP Settings", recipients: "Email Recipients", assignment: "Category Assignment", control: "Email Control Panel", smtpHost: "SMTP Host", port: "Port", ssl: "Use SSL/TLS", username: "Username", password: "Password", fromName: "From Name", fromEmail: "From Email", otp: "Use for OTP delivery", otpDescription: "Use this SMTP for sending customer OTP verification codes", validate: "Validate SMTP", validating: "Validating...", save: "Save settings", test: "Test connection", testConnection: "Test SMTP Configuration", validationSuccess: "SMTP validation successful. You can now save the settings.", validationFailed: "SMTP validation failed", errors: "Errors:", suggestions: "Suggestions:", hostReachable: "Host reachable", authentication: "Authentication", status: "Current status:", quickAdd: "Quick add CC/BCC recipients", ccEmail: "CC email", bccEmail: "BCC email", addBoth: "Add both", quickAddHint: "Press Enter in a field or click “Add both” to add recipients", addRecipient: "Add new recipient (advanced)", email: "Email", optionalName: "Name (optional)", primary: "Primary recipient", recipientType: "Recipient type", to: "To (direct)", cc: "CC (copy)", bcc: "BCC (blind copy)", distribution: "Current email distribution", none: "None", configured: "SMTP configured", notConfigured: "No SMTP", recipientsCount: "recipients", selectCategory: "Select a category", selectCategoryDescription: "Choose an email category from the left to configure its settings", cancel: "Cancel", create: "Create category", creating: "Creating...", key: "Category key", name: "Category name", description: "Description", categoryStatus: "Category status", ready: "Ready", failed: "Failed", incomplete: "Incomplete", untested: "Not tested", emailManager: "Email Address Manager", progress: "Email Configuration Progress", templates: "Central Email Templates", logs: "Automated Email Logs", systemStatus: "System status", active: "Active", enabled: "Enabled", emailTypes: "Email types covered", routing: "Intelligent routing active", mapping: "Product category → department mapping", smartFeatures: "Smart features", quickActions: "Quick actions", currentConfig: "Current configuration", enterEmail: "Enter email address"
  },
  fa: {
    back: "بازگشت به مدیریت", title: "مدیریت پیشرفته ایمیل", subtitle: "تنظیم SMTP مستقل برای هر دسته‌بندی محصول", loading: "در حال بارگذاری تنظیمات ایمیل...", empty: "برای تنظیمات، یک دسته‌بندی ایمیل از سمت راست انتخاب کنید",
    initTitle: "راه‌اندازی دسته‌بندی‌های ایمیل", initDescription: "دسته‌بندی‌های پیش‌فرض ایمیل محصولات شیمیایی را ایجاد کنید", initAction: "راه‌اندازی دسته‌بندی‌ها", categories: "دسته‌بندی‌های ایمیل", categoriesDescription: "تنظیم SMTP و گیرندگان برای هر دسته‌بندی", addCategory: "افزودن دسته‌بندی", deleteCategory: "حذف دسته‌بندی", deleting: "در حال حذف...", smtp: "تنظیمات SMTP", recipients: "گیرندگان ایمیل", assignment: "تخصیص دسته‌بندی", control: "پنل کنترل ایمیل", smtpHost: "میزبان SMTP", port: "پورت", ssl: "استفاده از SSL/TLS", username: "نام کاربری", password: "رمز عبور", fromName: "نام فرستنده", fromEmail: "ایمیل فرستنده", otp: "استفاده برای ارسال OTP", otpDescription: "از این SMTP برای ارسال کدهای تأیید OTP مشتریان استفاده شود", validate: "اعتبارسنجی SMTP", validating: "در حال اعتبارسنجی...", save: "ذخیره تنظیمات", test: "آزمون اتصال", testConnection: "آزمون تنظیمات SMTP", validationSuccess: "اعتبارسنجی SMTP موفق بود؛ اکنون می‌توانید تنظیمات را ذخیره کنید.", validationFailed: "اعتبارسنجی SMTP ناموفق بود", errors: "خطاها:", suggestions: "پیشنهادها:", hostReachable: "دسترسی به میزبان", authentication: "احراز هویت", status: "وضعیت فعلی:", quickAdd: "افزودن سریع گیرندگان CC/BCC", ccEmail: "ایمیل CC", bccEmail: "ایمیل BCC", addBoth: "افزودن هر دو", quickAddHint: "در فیلد Enter بزنید یا برای افزودن گیرندگان روی «افزودن هر دو» کلیک کنید", addRecipient: "افزودن گیرنده جدید (پیشرفته)", email: "ایمیل", optionalName: "نام (اختیاری)", primary: "گیرنده اصلی", recipientType: "نوع گیرنده", to: "To (مستقیم)", cc: "CC (رونوشت)", bcc: "BCC (رونوشت مخفی)", distribution: "توزیع فعلی ایمیل", none: "هیچ‌کدام", configured: "SMTP تنظیم شده", notConfigured: "بدون SMTP", recipientsCount: "گیرنده", selectCategory: "انتخاب دسته‌بندی", selectCategoryDescription: "برای تنظیمات، یک دسته‌بندی ایمیل از فهرست انتخاب کنید", cancel: "انصراف", create: "ایجاد دسته‌بندی", creating: "در حال ایجاد...", key: "کلید دسته‌بندی", name: "نام دسته‌بندی", description: "توضیحات", categoryStatus: "وضعیت دسته‌بندی", ready: "آماده", failed: "خرابی", incomplete: "ناقص", untested: "تست نشده", emailManager: "مدیریت آدرس‌های ایمیل", progress: "پیشرفت تنظیمات ایمیل", templates: "مرکز قالب‌های ایمیل", logs: "گزارش ایمیل‌های خودکار", systemStatus: "وضعیت سیستم", active: "فعال", enabled: "فعال", emailTypes: "انواع ایمیل پوشش‌داده‌شده", routing: "مسیریابی هوشمند فعال است", mapping: "تطبیق دسته‌بندی محصول با واحد", smartFeatures: "قابلیت‌های هوشمند", quickActions: "عملیات سریع", currentConfig: "پیکربندی فعلی", enterEmail: "آدرس ایمیل را وارد کنید"
  },
  ar: {
    back: "العودة إلى الإدارة", title: "إدارة البريد الإلكتروني المتقدمة", subtitle: "تهيئة SMTP مستقل لكل فئة من المنتجات", loading: "جار تحميل إعدادات البريد الإلكتروني...", empty: "اختر فئة بريد إلكتروني من الجانب لتهيئة إعداداتها",
    initTitle: "تهيئة فئات البريد الإلكتروني", initDescription: "إعداد فئات البريد الإلكتروني الافتراضية لمنتجاتك الكيميائية", initAction: "تهيئة الفئات", categories: "فئات البريد الإلكتروني", categoriesDescription: "تهيئة SMTP والمستلمين لكل فئة", addCategory: "إضافة فئة", deleteCategory: "حذف الفئة", deleting: "جار الحذف...", smtp: "إعدادات SMTP", recipients: "مستلمو البريد الإلكتروني", assignment: "تعيين الفئة", control: "لوحة تحكم البريد الإلكتروني", smtpHost: "مضيف SMTP", port: "المنفذ", ssl: "استخدام SSL/TLS", username: "اسم المستخدم", password: "كلمة المرور", fromName: "اسم المرسل", fromEmail: "بريد المرسل", otp: "الاستخدام لإرسال OTP", otpDescription: "استخدم SMTP هذا لإرسال رموز تحقق OTP للعملاء", validate: "التحقق من SMTP", validating: "جار التحقق...", save: "حفظ الإعدادات", test: "اختبار الاتصال", testConnection: "اختبار إعدادات SMTP", validationSuccess: "نجح التحقق من SMTP. يمكنك الآن حفظ الإعدادات.", validationFailed: "فشل التحقق من SMTP", errors: "الأخطاء:", suggestions: "الاقتراحات:", hostReachable: "الوصول إلى المضيف", authentication: "المصادقة", status: "الحالة الحالية:", quickAdd: "إضافة مستلمي CC/BCC سريعًا", ccEmail: "بريد CC", bccEmail: "بريد BCC", addBoth: "إضافة كليهما", quickAddHint: "اضغط Enter في الحقل أو انقر «إضافة كليهما» لإضافة المستلمين", addRecipient: "إضافة مستلم جديد (متقدم)", email: "البريد الإلكتروني", optionalName: "الاسم (اختياري)", primary: "المستلم الأساسي", recipientType: "نوع المستلم", to: "To (مباشر)", cc: "CC (نسخة)", bcc: "BCC (نسخة مخفية)", distribution: "توزيع البريد الحالي", none: "لا يوجد", configured: "تم تهيئة SMTP", notConfigured: "لا يوجد SMTP", recipientsCount: "مستلمون", selectCategory: "اختر فئة", selectCategoryDescription: "اختر فئة بريد إلكتروني من الجانب لتهيئة إعداداتها", cancel: "إلغاء", create: "إنشاء فئة", creating: "جار الإنشاء...", key: "مفتاح الفئة", name: "اسم الفئة", description: "الوصف", categoryStatus: "حالة الفئة", ready: "جاهز", failed: "فشل", incomplete: "غير مكتمل", untested: "لم يُختبر", emailManager: "مدير عناوين البريد", progress: "تقدم تهيئة البريد", templates: "مركز قوالب البريد", logs: "سجلات البريد الآلي", systemStatus: "حالة النظام", active: "نشط", enabled: "مفعّل", emailTypes: "أنواع البريد المشمولة", routing: "التوجيه الذكي نشط", mapping: "تعيين فئة المنتج إلى القسم", smartFeatures: "الميزات الذكية", quickActions: "إجراءات سريعة", currentConfig: "التهيئة الحالية", enterEmail: "أدخل عنوان البريد"
  },
  tr: {
    back: "Yönetime dön", title: "Gelişmiş e-posta yönetimi", subtitle: "Her ürün kategorisi için bağımsız SMTP ayarlayın", loading: "E-posta ayarları yükleniyor...", empty: "Ayarlarını yapmak için soldan bir e-posta kategorisi seçin",
    initTitle: "E-posta kategorilerini başlat", initDescription: "Kimyasal ürünleriniz için varsayılan e-posta kategorilerini oluşturun", initAction: "Kategorileri başlat", categories: "E-posta kategorileri", categoriesDescription: "Her kategori için SMTP ve alıcıları ayarlayın", addCategory: "Kategori ekle", deleteCategory: "Kategoriyi sil", deleting: "Siliniyor...", smtp: "SMTP ayarları", recipients: "E-posta alıcıları", assignment: "Kategori ataması", control: "E-posta kontrol paneli", smtpHost: "SMTP sunucusu", port: "Port", ssl: "SSL/TLS kullan", username: "Kullanıcı adı", password: "Şifre", fromName: "Gönderen adı", fromEmail: "Gönderen e-postası", otp: "OTP gönderimi için kullan", otpDescription: "Müşteri OTP doğrulama kodlarını göndermek için bu SMTP'yi kullanın", validate: "SMTP'yi doğrula", validating: "Doğrulanıyor...", save: "Ayarları kaydet", test: "Bağlantıyı test et", testConnection: "SMTP yapılandırmasını test et", validationSuccess: "SMTP doğrulaması başarılı. Ayarları şimdi kaydedebilirsiniz.", validationFailed: "SMTP doğrulaması başarısız", errors: "Hatalar:", suggestions: "Öneriler:", hostReachable: "Sunucuya erişilebilir", authentication: "Kimlik doğrulama", status: "Mevcut durum:", quickAdd: "CC/BCC alıcılarını hızlı ekle", ccEmail: "CC e-postası", bccEmail: "BCC e-postası", addBoth: "İkisini de ekle", quickAddHint: "Alana Enter'a basın veya alıcı eklemek için “İkisini de ekle”ye tıklayın", addRecipient: "Yeni alıcı ekle (gelişmiş)", email: "E-posta", optionalName: "Ad (isteğe bağlı)", primary: "Birincil alıcı", recipientType: "Alıcı türü", to: "To (doğrudan)", cc: "CC (kopya)", bcc: "BCC (gizli kopya)", distribution: "Mevcut e-posta dağıtımı", none: "Yok", configured: "SMTP yapılandırıldı", notConfigured: "SMTP yok", recipientsCount: "alıcı", selectCategory: "Kategori seçin", selectCategoryDescription: "Ayarlarını yapmak için soldan bir e-posta kategorisi seçin", cancel: "İptal", create: "Kategori oluştur", creating: "Oluşturuluyor...", key: "Kategori anahtarı", name: "Kategori adı", description: "Açıklama", categoryStatus: "Kategori durumu", ready: "Hazır", failed: "Başarısız", incomplete: "Eksik", untested: "Test edilmedi", emailManager: "E-posta adresi yöneticisi", progress: "E-posta yapılandırma ilerlemesi", templates: "Merkezi e-posta şablonları", logs: "Otomatik e-posta günlükleri", systemStatus: "Sistem durumu", active: "Etkin", enabled: "Etkin", emailTypes: "Kapsanan e-posta türleri", routing: "Akıllı yönlendirme etkin", mapping: "Ürün kategorisi → departman eşlemesi", smartFeatures: "Akıllı özellikler", quickActions: "Hızlı işlemler", currentConfig: "Mevcut yapılandırma", enterEmail: "E-posta adresini girin"
  }
};

const zohoHints: Record<Language, string> = {
  en: "For Zoho Mail: use an App Password (not your regular password)",
  fa: "برای Zoho Mail: از رمز برنامه استفاده کنید (نه رمز معمولی)",
  ar: "لبريد Zoho: استخدم كلمة مرور التطبيق (وليس كلمة المرور العادية)",
  tr: "Zoho Mail için uygulama şifresi kullanın (normal şifre değil)",
};

interface EmailCategory {
  id: number;
  categoryKey: string;
  categoryName: string;
  description: string;
  isActive: boolean;
  smtp?: SmtpSetting | null;
  recipients: EmailRecipient[];
}

interface SmtpSetting {
  id: number;
  categoryId: number;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  isActive: boolean;
  testStatus: string;
  lastTested?: string;
  // Include database field names for compatibility
  category_id?: number;
  from_name?: string;
  from_email?: string;
  is_active?: boolean;
  test_status?: string;
  last_tested?: string;
}

interface EmailRecipient {
  id?: number;
  categoryId?: number;
  email: string;
  name?: string;
  isPrimary: boolean;
  isActive: boolean;
  recipientType?: 'to' | 'cc' | 'bcc';
  receiveTypes: string[];
}

interface SMTPForm {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  useForOtp?: boolean;
}

export default function AdvancedEmailSettingsPage() {
  const { language, direction } = useLanguage();
  const copy = emailCopy[language];
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Category management state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({
    categoryKey: "",
    categoryName: "",
    description: ""
  });
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<EmailCategory | null>(null);
  const [smtpForm, setSmtpForm] = useState<SMTPForm>({
    host: "",
    port: 587,
    secure: false,
    username: "",
    password: "",
    fromName: "",
    fromEmail: "",
    useForOtp: false
  });
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [newRecipient, setNewRecipient] = useState<EmailRecipient>({
    email: "",
    name: "",
    isPrimary: false,
    isActive: true,
    receiveTypes: [],
    recipientType: 'to'
  });
  const [assignmentForm, setAssignmentForm] = useState<{[key: string]: string}>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  
  // Global email settings state
  const [globalSettings, setGlobalSettings] = useState<{[key: string]: string}>({});
  const [ccAddresses, setCcAddresses] = useState<string[]>([]);
  const [newCcAddress, setNewCcAddress] = useState('');
  const [recipientType, setRecipientType] = useState<'cc' | 'bcc'>('cc');
  


  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/admin/check-auth");
        const data = await response.json();
        if (!data.success || !data.authenticated) {
          setLocation("/admin/login");
        }
      } catch (error) {
        setLocation("/admin/login");
      }
    };
    checkAuth();
  }, [setLocation]);

  // Initialize categories
  const initCategoriesMutation = useMutation({
    mutationFn: () => fetch("/api/admin/email/init-categories", { method: "POST" }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/categories"] });
      toast({ title: copy.initAction });
    }
  });

  // Load categories
  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ["/api/admin/email/categories"],
    queryFn: async () => {
      const response = await fetch("/api/admin/email/categories");
      const data = await response.json();
      console.log("Categories API Response:", data);
      return data;
    }
  });

  // Load category email assignments
  const { data: categoryAssignmentsData = [], refetch: refetchCategoryAssignments } = useQuery({
    queryKey: ["/api/admin/email/category-assignments"],
    queryFn: () => fetch("/api/admin/email/category-assignments").then(res => res.json())
  });

  // Load global email settings
  const { data: globalSettingsData } = useQuery({
    queryKey: ["/api/admin/email/global-settings"],
    queryFn: async () => {
      const response = await fetch("/api/admin/email/global-settings");
      return response.json();
    }
  });

  // Initialize global settings when data loads
  useEffect(() => {
    if (globalSettingsData?.success && globalSettingsData.settings) {
      setGlobalSettings(globalSettingsData.settings);
      
      // Parse CC addresses if they exist
      const ccAddressesString = globalSettingsData.settings.default_cc_addresses;
      if (ccAddressesString) {
        try {
          const parsed = JSON.parse(ccAddressesString);
          setCcAddresses(Array.isArray(parsed) ? parsed : []);
        } catch {
          setCcAddresses([]);
        }
      }
      
      // Set recipient type if it exists
      const recipientTypeString = globalSettingsData.settings.default_recipient_type;
      if (recipientTypeString) {
        setRecipientType(recipientTypeString as 'cc' | 'bcc');
      }
    }
  }, [globalSettingsData]);

  // Update global email settings mutation
  const updateGlobalSettingMutation = useMutation({
    mutationFn: (data: { settingKey: string; settingValue: string; description?: string }) =>
      fetch("/api/admin/email/global-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/global-settings"] });
      toast({ title: copy.save });
    },
    onError: () => {
      toast({ title: copy.validationFailed, variant: "destructive" });
    }
  });

  // Helper functions for email address management
  const addCcAddress = () => {
    if (!newCcAddress.trim()) return;
    
    if (!newCcAddress.includes('@')) {
      toast({ title: copy.enterEmail, variant: "destructive" });
      return;
    }

    const updatedAddresses = [...ccAddresses, newCcAddress.trim()];
    setCcAddresses(updatedAddresses);
    setNewCcAddress('');
    
    // Update in database
    updateGlobalSettingMutation.mutate({
      settingKey: 'default_cc_addresses',
      settingValue: JSON.stringify(updatedAddresses),
      description: `Default ${recipientType.toUpperCase()} email addresses for all outgoing emails`
    });
  };

  // Update recipient type
  const updateRecipientType = (newType: 'cc' | 'bcc') => {
    setRecipientType(newType);
    
    // Update in database
    updateGlobalSettingMutation.mutate({
      settingKey: 'default_recipient_type',
      settingValue: newType,
      description: 'Recipient type for global email addresses (cc or bcc)'
    });
  };

  const removeCcAddress = (index: number) => {
    const updatedAddresses = ccAddresses.filter((_, i) => i !== index);
    setCcAddresses(updatedAddresses);
    
    // Update in database
    updateGlobalSettingMutation.mutate({
      settingKey: 'default_cc_addresses',
      settingValue: JSON.stringify(updatedAddresses),
      description: `Default ${recipientType.toUpperCase()} email addresses for all outgoing emails`
    });
  };

  // Save SMTP settings
  const saveSmtpMutation = useMutation({
    mutationFn: (data: { categoryId: number; smtp: SMTPForm }) => 
      fetch(`/api/admin/email/smtp/${data.categoryId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.smtp)
      }).then(res => res.json()),
    onSuccess: (data) => {
      console.log("SMTP save success:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/categories"] });
      toast({ title: copy.save });
      // Force reload the categories to get updated SMTP data
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/admin/email/categories"] });
      }, 100);
    },
    onError: () => {
      toast({ title: copy.validationFailed, variant: "destructive" });
    }
  });

  // Validate SMTP settings (before saving)
  const validateSmtp = async () => {
    if (!smtpForm.username || !smtpForm.password) {
      toast({ title: `${copy.email} / ${copy.password}`, variant: "destructive" });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);
    
    try {
      const response = await fetch('/api/admin/validate-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: smtpForm.username,
          password: smtpForm.password,
          customHost: smtpForm.host || undefined,
          customPort: smtpForm.port || undefined,
        })
      });
      
      const result = await response.json();
      setValidationResult(result);
      
      if (result.isValid) {
        toast({ title: copy.validationSuccess });
      } else {
        toast({ 
          title: copy.validationFailed,
          description: result.errors?.[0] || copy.validationFailed,
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      setValidationResult({
        isValid: false,
        errors: [`${copy.validationFailed}: ${error.message}`],
        warnings: [],
        suggestions: [],
        configurationStatus: {
          hostReachable: false,
          portOpen: false,
          tlsSupported: false,
          authenticationWorking: false,
        },
      });
      toast({ title: copy.validationFailed, variant: "destructive" });
    } finally {
      setIsValidating(false);
    }
  };

  // Test SMTP connection (using proper validation)
  const testSmtpConnection = async () => {
    if (!smtpForm.username || !smtpForm.password) {
      toast({ title: `${copy.email} / ${copy.password}`, variant: "destructive" });
      return;
    }

    setIsValidating(true);
    
    try {
      const response = await fetch('/api/admin/validate-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: smtpForm.username,
          password: smtpForm.password,
          customHost: smtpForm.host || undefined,
          customPort: smtpForm.port || undefined,
          categoryId: selectedCategory?.id, // Include categoryId to update database
        })
      });
      
      const result = await response.json();
      
      if (result.isValid) {
        toast({ 
          title: copy.validationSuccess,
          description: "Your email settings are working correctly." 
        });
        // Refresh categories to show updated status
        queryClient.invalidateQueries({ queryKey: ["/api/admin/email/categories"] });
      } else {
        toast({ 
          title: copy.validationFailed,
          description: result.errors?.[0] || copy.validationFailed,
          variant: "destructive" 
        });
        // Refresh categories to show updated status
        queryClient.invalidateQueries({ queryKey: ["/api/admin/email/categories"] });
      }
    } catch (error: any) {
      toast({ 
        title: copy.validationFailed,
        description: `Error: ${error.message}`,
        variant: "destructive" 
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Fetch category email assignments
  const { data: categoryAssignments = [] } = useQuery({
    queryKey: ["/api/admin/email/category-assignments"],
    enabled: true
  });

  // Save category email assignment
  const saveCategoryAssignmentMutation = useMutation({
    mutationFn: async (data: { categoryKey: string; assignedEmail: string }) => {
      const response = await fetch("/api/admin/email/category-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error("Failed to save category assignment");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({ title: copy.save });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/category-assignments"] });
    },
    onError: (error: any) => {
      toast({
        title: copy.validationFailed,
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Save recipients
  const saveRecipientsMutation = useMutation({
    mutationFn: (data: { categoryId: number; recipients: EmailRecipient[] }) => 
      fetch(`/api/admin/email/recipients/${data.categoryId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: data.recipients })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/categories"] });
      toast({ title: copy.save });
    },
    onError: (error: any) => {
      console.error("Failed to save recipients:", error);
      toast({ title: copy.validationFailed, variant: "destructive" });
    }
  });

  // Create new category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: { categoryKey: string; categoryName: string; description: string }) => {
      const response = await fetch("/api/admin/email/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create category");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/categories"] });
       toast({ title: copy.create });
      setShowAddCategory(false);
      setNewCategory({ categoryKey: "", categoryName: "", description: "" });
    },
    onError: (error: any) => {
      toast({
        title: copy.validationFailed,
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const response = await fetch(`/api/admin/email/categories/${categoryId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete category");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/categories"] });
      toast({ title: copy.deleteCategory });
      if (selectedCategory) {
        setSelectedCategory(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: copy.validationFailed,
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const categories: EmailCategory[] = categoriesData?.categories || [];

  // Load selected category data
  useEffect(() => {
    console.log("Loading category data:", selectedCategory?.categoryName, selectedCategory?.smtp);
    
    if (selectedCategory?.smtp) {
      const smtp = selectedCategory.smtp;
      setSmtpForm({
        host: smtp.host || "",
        port: smtp.port || 587,
        secure: smtp.secure || false,
        username: smtp.username || "",
        password: smtp.password || "", // Show actual password
        fromName: smtp.fromName || smtp.from_name || "",
        fromEmail: smtp.fromEmail || smtp.from_email || "",
        useForOtp: smtp.useForOtp || smtp.use_for_otp || false
      });
    } else {
      setSmtpForm({
        host: "",
        port: 587,
        secure: false,
        username: "",
        password: "",
        fromName: "",
        fromEmail: "",
        useForOtp: false
      });
    }
    
    // Always reload recipients from fresh data
    if (selectedCategory?.recipients && Array.isArray(selectedCategory.recipients)) {
      setRecipients([...selectedCategory.recipients]);
    } else {
      setRecipients([]);
    }
    
    // Reset new recipient form
    setNewRecipient({
      email: "",
      name: "",
      isPrimary: false,
      isActive: true,
      receiveTypes: []
    });
  }, [selectedCategory]);

  const handleSaveSmtp = () => {
    if (!selectedCategory) return;
    saveSmtpMutation.mutate({ categoryId: selectedCategory.id, smtp: smtpForm });
  };

  const handleTestSmtp = () => {
    testSmtpConnection();
  };

  const handleSaveRecipients = () => {
    if (!selectedCategory) return;
    saveRecipientsMutation.mutate({ categoryId: selectedCategory.id, recipients });
  };

  const addRecipient = () => {
    if (!newRecipient.email) return;
    setRecipients([...recipients, { ...newRecipient, id: Date.now() }]);
    setNewRecipient({
      email: "",
      name: "",
      isPrimary: false,
      isActive: true,
      receiveTypes: []
    });
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const getTestStatusIcon = (status: string) => {
    console.log("getTestStatusIcon called with status:", status);
    switch (status) {
      case "success":
        return <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg border-2 border-green-300" title={copy.ready} />;
      case "failed":
        return <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg border-2 border-red-300" title={copy.failed} />;
      case "untested":
        return <div className="w-3 h-3 bg-orange-500 rounded-full shadow-lg border-2 border-orange-300" title={copy.untested} />;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full shadow-sm border-2 border-gray-300" title={`${copy.status} ${status}`} />;
    }
  }

  // Function to get email status light based on SMTP configuration
  const getEmailStatusLight = (category: EmailCategory) => {
    console.log("Email Status Light Debug:", category.categoryName, category.smtp);
    
    if (!category.smtp) {
      console.log("No SMTP data for category:", category.categoryName);
      return <div className="w-3 h-3 bg-gray-400 rounded-full shadow-sm border-2 border-gray-300" title={copy.notConfigured} />;
    }
    
    // Check if all required SMTP fields are configured
    const smtp = category.smtp;
    const isFullyConfigured = smtp.host && 
                              smtp.username && 
                              smtp.password && 
                              (smtp.fromEmail || smtp.from_email);
    
    console.log("SMTP Configuration Check for", category.categoryName, {
      host: smtp.host,
      username: smtp.username,
      password: smtp.password ? "SET" : "NOT_SET",
      fromEmail: smtp.fromEmail || smtp.from_email,
      testStatus: smtp.testStatus || smtp.test_status,
      isFullyConfigured
    });
    
    if (!isFullyConfigured) {
      return <div className="w-3 h-3 bg-yellow-500 rounded-full shadow-lg border-2 border-yellow-300 animate-pulse" title={copy.incomplete} />;
    }
    
    // Return status based on test result
    const status = smtp.testStatus || smtp.test_status || "untested";
    console.log("Final status for", category.categoryName, ":", status);
    return getTestStatusIcon(status);
  };

  const getCategoryColor = (categoryKey: string) => {
    const colors = {
      "admin": "bg-blue-100 text-blue-800",
      "fuel-additives": "bg-orange-100 text-orange-800",
      "water-treatment": "bg-cyan-100 text-cyan-800",
      "agricultural-fertilizers": "bg-green-100 text-green-800",
      "paint-thinner": "bg-purple-100 text-purple-800",
      "orders": "bg-yellow-100 text-yellow-800",
      "notifications": "bg-gray-100 text-gray-800",
      "password-reset": "bg-red-100 text-red-800",
      "account-verification": "bg-emerald-100 text-emerald-800",
      "order-confirmations": "bg-indigo-100 text-indigo-800",
      "payment-notifications": "bg-teal-100 text-teal-800",
      "inventory-alerts": "bg-amber-100 text-amber-800",
      "system-notifications": "bg-slate-100 text-slate-800",
      "backup-reports": "bg-lime-100 text-lime-800",
      "security-alerts": "bg-rose-100 text-rose-800",
      "user-management": "bg-violet-100 text-violet-800",
      "crm-notifications": "bg-pink-100 text-pink-800"
    };
    return colors[categoryKey as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div dir={direction} className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">{copy.loading}</div>
        </div>
      </div>
    );
  }

  return (
    <div dir={direction} className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center gap-4 mb-8">
        {user?.id === 1 && (
          <Button
            variant="outline"
            onClick={() => setLocation("/admin")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className={`w-4 h-4 ${direction === "rtl" ? "rotate-180" : ""}`} />
            {copy.back}
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-bold">{copy.title}</h1>
          <p className="text-gray-600 mt-1">{copy.subtitle}</p>
        </div>
      </div>

      {categories.length === 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{copy.initTitle}</CardTitle>
            <CardDescription>
              {copy.initDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => initCategoriesMutation.mutate()}>
              {copy.initAction}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sub-modules section */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-xl font-semibold text-gray-800">{copy.control}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation("/admin/email-address-manager")}>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center">
                  <Edit className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{copy.emailManager}</h3>
                  <p className="text-sm text-gray-600">{copy.emailManager}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">{copy.categoriesDescription}</p>
            </div>
          </Card>



          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation("/admin/email-progress")}>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{copy.progress}</h3>
                  <p className="text-sm text-gray-600">{copy.progress}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">{copy.progress}</p>
            </div>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation("/admin/email-templates-central")}>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{copy.templates}</h3>
                  <p className="text-sm text-gray-600">{copy.templates}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">{copy.templates}</p>
            </div>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation("/admin/automated-email-logs")}>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{copy.logs}</h3>
                  <p className="text-sm text-gray-600">{copy.logs}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">{copy.logs}</p>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold">{copy.categories}</h2>
          <p className="text-gray-600">{copy.categoriesDescription}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowAddCategory(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 me-2" />
            {copy.addCategory}
          </Button>
          {selectedCategory && (
            <Button
              onClick={() => deleteCategoryMutation.mutate(selectedCategory.id)}
              variant="destructive"
              disabled={deleteCategoryMutation.isPending}
            >
              <Trash2 className="w-4 h-4 me-2" />
              {deleteCategoryMutation.isPending ? copy.deleting : copy.deleteCategory}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories List */}
        <div className="lg:col-span-1">
          <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email Categories
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCategory?.id === category.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {/* Status Light at Top */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getEmailStatusLight(category)}
                      <span className="text-xs text-gray-500">
                        {category.smtp?.testStatus === "success" ? copy.ready :
                         category.smtp?.testStatus === "failed" ? copy.failed :
                         category.smtp ? copy.incomplete : copy.notConfigured}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getCategoryColor(category.categoryKey)}>
                      {category.categoryName}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{category.description}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {category.recipients?.length || 0} {copy.recipientsCount}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {category.smtp ? copy.configured : copy.notConfigured}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Configuration Panel */}
        <div className="lg:col-span-2">
          {selectedCategory ? (
            <Tabs defaultValue="smtp" className="space-y-6 overflow-x-auto">
              <TabsList className="grid w-full min-w-[42rem] grid-cols-4">
                <TabsTrigger value="smtp">{copy.smtp}</TabsTrigger>
                <TabsTrigger value="recipients">{copy.recipients}</TabsTrigger>
                <TabsTrigger value="category-assignment">{copy.assignment}</TabsTrigger>
                <TabsTrigger value="control">{copy.control}</TabsTrigger>
              </TabsList>

              <TabsContent value="smtp">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      {copy.smtp} - {selectedCategory.categoryName}
                    </CardTitle>
                    <CardDescription>
                      {copy.categoriesDescription}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="host">{copy.smtpHost}</Label>
                        <Input
                          id="host"
                          value={smtpForm.host}
                          onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                          placeholder="smtp.gmail.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="port">{copy.port}</Label>
                        <Input
                          id="port"
                          type="number"
                          value={smtpForm.port}
                          onChange={(e) => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) || 587 })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="secure"
                        checked={smtpForm.secure}
                        onCheckedChange={(checked) => setSmtpForm({ ...smtpForm, secure: checked })}
                      />
                      <Label htmlFor="secure">{copy.ssl}</Label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="username">{copy.username}</Label>
                        <Input
                          id="username"
                          value={smtpForm.username}
                          onChange={(e) => {
                            const username = e.target.value;
                            setSmtpForm({ 
                              ...smtpForm, 
                              username,
                              fromEmail: username || smtpForm.fromEmail
                            });
                          }}
                          placeholder="your-email@domain.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">{copy.password}</Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          {zohoHints[language]}
                        </p>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={smtpForm.password}
                            onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
                            placeholder={zohoHints[language]}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fromName">{copy.fromName}</Label>
                        <Input
                          id="fromName"
                          value={smtpForm.fromName}
                          onChange={(e) => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                          placeholder="Momtaz Chemical"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fromEmail">{copy.fromEmail}</Label>
                        <Input
                          id="fromEmail"
                          value={smtpForm.fromEmail}
                          onChange={(e) => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })}
                          placeholder="info@momtazchem.com"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <Switch
                        id="useForOtp"
                        checked={smtpForm.useForOtp || false}
                        onCheckedChange={(checked) => setSmtpForm({ ...smtpForm, useForOtp: checked })}
                      />
                      <div className="flex-1">
                        <Label htmlFor="useForOtp" className="cursor-pointer">
                          <div className="font-semibold text-blue-900">{copy.otp}</div>
                          <div className="text-sm text-blue-700">{copy.otpDescription}</div>
                        </Label>
                      </div>
                    </div>

                    <Separator />

                    {/* Validation Section */}
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <Button
                          variant="secondary"
                          onClick={validateSmtp}
                          disabled={isValidating || !smtpForm.username || !smtpForm.password}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700"
                        >
                          {isValidating ? (
                            <>
                              <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
                              {copy.validating}
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {copy.validate}
                            </>
                          )}
                        </Button>
                        
                        <Button
                          onClick={handleSaveSmtp}
                          disabled={saveSmtpMutation.isPending || (validationResult && !validationResult.isValid)}
                        >
                          <Save className="w-4 h-4 me-2" />
                          {copy.save}
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={handleTestSmtp}
                          disabled={isValidating}
                        >
                          {isValidating ? (
                            <>
                              <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <TestTube className="w-4 h-4 mr-2" />
                              Test Connection
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Validation Results */}
                      {validationResult && (
                        <div className={`p-4 rounded-lg border ${
                          validationResult.isValid 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            {validationResult.isValid ? (
                              <>
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="font-medium text-green-800">{copy.validationSuccess}</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <span className="font-medium text-red-800">{copy.validationFailed}</span>
                              </>
                            )}
                          </div>
                          
                          {validationResult.errors && validationResult.errors.length > 0 && (
                            <div className="mb-2">
                              <div className="text-sm font-medium text-red-700 mb-1">{copy.errors}</div>
                              <ul className="text-sm text-red-600 list-disc list-inside">
                                {validationResult.errors.map((error: string, idx: number) => (
                                  <li key={idx}>{error}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {validationResult.suggestions && validationResult.suggestions.length > 0 && (
                            <div className="mb-2">
                              <div className="text-sm font-medium text-orange-700 mb-1">{copy.suggestions}</div>
                              <ul className="text-sm text-orange-600 list-disc list-inside">
                                {validationResult.suggestions.map((suggestion: string, idx: number) => (
                                  <li key={idx}>{suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {validationResult.configurationStatus && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-1">
                                {validationResult.configurationStatus.hostReachable ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <span>{copy.hostReachable}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {validationResult.configurationStatus.authenticationWorking ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <span>{copy.authentication}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {selectedCategory.smtp && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                              <strong>{copy.status}</strong>
                          {getTestStatusIcon(selectedCategory.smtp.testStatus)}
                          <span className="capitalize">{selectedCategory.smtp.testStatus}</span>
                        </div>
                        {selectedCategory.smtp.lastTested && (
                          <p className="text-sm text-gray-600">
                            {copy.status} {new Date(selectedCategory.smtp.lastTested).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recipients">
                <Card>
                  <CardHeader>
                    <CardTitle>{copy.recipients} - {selectedCategory.categoryName}</CardTitle>
                    <CardDescription>
                      {copy.recipients} — {copy.categoriesDescription}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Quick Add CC/BCC Section */}
                    <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                      <h4 className="font-medium mb-3 text-blue-800">{copy.quickAdd}</h4>
                      <p className="text-sm text-blue-600 mb-3">
                        {copy.quickAddHint}
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="quickCCEmail">{copy.ccEmail}</Label>
                          <Input
                            id="quickCCEmail"
                            placeholder="cc@company.com"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value) {
                                setRecipients([...recipients, {
                                  email: e.currentTarget.value,
                                  name: '',
                                  isPrimary: false,
                                  isActive: true,
                                  receiveTypes: [],
                                  recipientType: 'cc'
                                }]);
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor="quickBCCEmail">{copy.bccEmail}</Label>
                          <Input
                            id="quickBCCEmail"
                            placeholder="bcc@company.com"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value) {
                                setRecipients([...recipients, {
                                  email: e.currentTarget.value,
                                  name: '',
                                  isPrimary: false,
                                  isActive: true,
                                  receiveTypes: [],
                                  recipientType: 'bcc'
                                }]);
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                        </div>
                        <div className="flex items-end">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const ccInput = document.getElementById('quickCCEmail') as HTMLInputElement;
                              const bccInput = document.getElementById('quickBCCEmail') as HTMLInputElement;
                              
                              if (ccInput.value) {
                                setRecipients([...recipients, {
                                  email: ccInput.value,
                                  name: '',
                                  isPrimary: false,
                                  isActive: true,
                                  receiveTypes: [],
                                  recipientType: 'cc'
                                }]);
                                ccInput.value = '';
                              }
                              
                              if (bccInput.value) {
                                setRecipients([...recipients, {
                                  email: bccInput.value,
                                  name: '',
                                  isPrimary: false,
                                  isActive: true,
                                  receiveTypes: [],
                                  recipientType: 'bcc'
                                }]);
                                bccInput.value = '';
                              }
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            {copy.addBoth}
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-blue-500 mt-2">
                        {copy.quickAddHint}
                      </p>
                    </div>

                    {/* Add New Recipient */}
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-medium mb-3">{copy.addRecipient}</h4>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <Label htmlFor="newEmail">{copy.email}</Label>
                          <Input
                            id="newEmail"
                            value={newRecipient.email}
                            onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                            placeholder="email@domain.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="newName">{copy.optionalName}</Label>
                          <Input
                            id="newName"
                            value={newRecipient.name}
                            onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                            placeholder={copy.optionalName}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="newPrimary"
                            checked={newRecipient.isPrimary}
                            onCheckedChange={(checked) => setNewRecipient({ ...newRecipient, isPrimary: checked })}
                          />
                          <Label htmlFor="newPrimary">{copy.primary}</Label>
                        </div>
                        <div>
                          <Label htmlFor="recipientType">{copy.recipientType}</Label>
                          <Select
                            value={newRecipient.recipientType || 'to'}
                            onValueChange={(value) => setNewRecipient({ ...newRecipient, recipientType: value as 'to' | 'cc' | 'bcc' })}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="to">{copy.to}</SelectItem>
                              <SelectItem value="cc">{copy.cc}</SelectItem>
                              <SelectItem value="bcc">{copy.bcc}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button onClick={addRecipient} disabled={!newRecipient.email}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Recipient
                      </Button>
                    </div>

                    {/* Recipient Distribution Summary */}
                    {recipients.length > 0 && (
                      <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                        <h4 className="font-medium mb-3 text-green-800">{copy.distribution}</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <h5 className="font-medium text-green-700 mb-1">{copy.to} ({recipients.filter(r => !r.recipientType || r.recipientType === 'to').length})</h5>
                            <div className="space-y-1">
                              {recipients
                                .filter(r => !r.recipientType || r.recipientType === 'to')
                                .map((r, i) => (
                                  <div key={i} className="text-green-600">{r.email}</div>
                                ))}
                            </div>
                          </div>
                          <div>
                            <h5 className="font-medium text-blue-700 mb-1">{copy.cc} ({recipients.filter(r => r.recipientType === 'cc').length})</h5>
                            <div className="space-y-1">
                              {recipients
                                .filter(r => r.recipientType === 'cc')
                                .map((r, i) => (
                                  <div key={i} className="text-blue-600">{r.email}</div>
                                ))}
                              {recipients.filter(r => r.recipientType === 'cc').length === 0 && (
                                <div className="text-gray-500 italic">+ info@momtazchem.com (auto)</div>
                              )}
                            </div>
                          </div>
                          <div>
                            <h5 className="font-medium text-purple-700 mb-1">{copy.bcc} ({recipients.filter(r => r.recipientType === 'bcc').length})</h5>
                            <div className="space-y-1">
                              {recipients
                                .filter(r => r.recipientType === 'bcc')
                                .map((r, i) => (
                                  <div key={i} className="text-purple-600">{r.email}</div>
                                ))}
                              {recipients.filter(r => r.recipientType === 'bcc').length === 0 && (
                                <div className="text-gray-500 italic">{copy.none}</div>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-green-600 mt-2">
                          ✓ Smart CC: info@momtazchem.com is automatically added as CC for monitoring unless already present as TO, CC, or BCC
                        </p>
                      </div>
                    )}

                    {/* Recipients List */}
                    <div className="space-y-3">
                      {recipients.map((recipient, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <strong>{recipient.email}</strong>
                                {recipient.isPrimary && (
                                  <Badge variant="default">{copy.primary}</Badge>
                                )}
                                <Badge variant={
                                  recipient.recipientType === 'cc' ? 'secondary' : 
                                  recipient.recipientType === 'bcc' ? 'outline' : 'default'
                                }>
                                  {recipient.recipientType === 'cc' ? 'CC' : 
                                   recipient.recipientType === 'bcc' ? 'BCC' : 'TO'}
                                </Badge>
                              </div>
                              {recipient.name && (
                                <p className="text-sm text-gray-600">{recipient.name}</p>
                              )}
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeRecipient(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={handleSaveRecipients}
                      disabled={saveRecipientsMutation.isPending}
                      className="w-full"
                    >
                      <Save className="w-4 h-4 me-2" />
                      {copy.save} — {copy.recipients}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="category-assignment">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      {copy.assignment}
                    </CardTitle>
                    <CardDescription>
                      {copy.categoriesDescription}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-blue-900">{copy.systemStatus}</span>
                      </div>
                      <p className="text-blue-700 text-sm">
                        {copy.categoriesDescription}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Category Email Assignment Grid */}
                      <div className="grid gap-4">
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {copy.assignment}
                          </h4>
                          <div className="space-y-3">
                            {Array.isArray(categoryAssignments) && categoryAssignments.map((assignment: any) => (
                              <div key={assignment.categoryKey} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">
                                    {assignment.categoryName}
                                  </Label>
                                  <Badge variant="secondary" className="text-xs">
                                    {assignment.categoryKey}
                                  </Badge>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm">{copy.email}</Label>
                                  <Input 
                                    value={assignmentForm[assignment.categoryKey] || assignment.assignedEmail || ''}
                                    onChange={(e) => setAssignmentForm({
                                      ...assignmentForm,
                                      [assignment.categoryKey]: e.target.value
                                    })}
                                    placeholder={`${assignment.categoryKey}@momtazchem.com`}
                                    className="text-sm"
                                  />
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    if (assignmentForm[assignment.categoryKey]) {
                                      saveCategoryAssignmentMutation.mutate({
                                        categoryKey: assignment.categoryKey,
                                        assignedEmail: assignmentForm[assignment.categoryKey]
                                      });
                                    }
                                  }}
                                  disabled={!assignmentForm[assignment.categoryKey] || saveCategoryAssignmentMutation.isPending}
                                >
                                  <Check className="w-4 h-4" />
                                  {copy.save}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Statistics and Info */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-900">{copy.systemStatus}</span>
                        </div>
                        <p className="text-green-700 text-sm">
                          {copy.assignment} — {copy.active}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="control">
                <div className="space-y-6">
                  {/* CC Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        {copy.control} (CC/BCC)
                      </CardTitle>
                      <CardDescription>
                        {copy.quickAdd}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-blue-900">{copy.quickAdd} — {copy.active}</span>
                        </div>
                        <p className="text-blue-700 text-sm">
                          {copy.emailTypes}. {copy.quickAdd}.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{recipientType === "cc" ? copy.cc : copy.bcc} {copy.email}</h4>
                            <Select value={recipientType} onValueChange={updateRecipientType}>
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cc">{copy.cc}</SelectItem>
                                <SelectItem value="bcc">{copy.bcc}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            {copy.emailTypes} ({recipientType === "cc" ? copy.cc : copy.bcc})
                          </p>
                          
                          {/* Display current CC addresses */}
                          <div className="space-y-2 mb-4">
                            {ccAddresses.length > 0 ? (
                              ccAddresses.map((address, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                                  <code className="font-mono text-sm">{address}</code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeCcAddress(index)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))
                            ) : (
                              <div className="bg-gray-50 p-3 rounded border text-center text-gray-500">
                                {copy.notConfigured}
                              </div>
                            )}
                          </div>
                          
                          {/* Add new CC address */}
                          <div className="flex gap-2">
                            <Input
                          placeholder={copy.enterEmail}
                              value={newCcAddress}
                              onChange={(e) => setNewCcAddress(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && addCcAddress()}
                            />
                            <Button 
                              onClick={addCcAddress}
                              disabled={!newCcAddress.trim() || updateGlobalSettingMutation.isPending}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">{copy.emailTypes}</h4>
                          <ul className="text-sm space-y-1">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              Contact Form Submissions
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              Customer Confirmations
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              Product Inquiries
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              Password Reset Emails
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              Quote Requests
                            </li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Intelligent Routing Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        {copy.routing}
                      </CardTitle>
                      <CardDescription>
                        {copy.routing} — {copy.mapping}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-900">{copy.routing} — {copy.active}</span>
                        </div>
                        <p className="text-green-700 text-sm">
                          {copy.routing} — {copy.categoriesDescription}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">{copy.mapping}</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center py-1 border-b">
                              <span className="text-gray-600">fuel-additives</span>
                        <span className="font-medium">{copy.mapping}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b">
                              <span className="text-gray-600">water-treatment</span>
                        <span className="font-medium">{copy.mapping}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b">
                              <span className="text-gray-600">paint-thinner</span>
                        <span className="font-medium">{copy.mapping}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b">
                              <span className="text-gray-600">agricultural-fertilizers</span>
                        <span className="font-medium">{copy.mapping}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b">
                              <span className="text-gray-600">other</span>
                        <span className="font-medium">{copy.mapping}</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-gray-600">custom-solutions</span>
                        <span className="font-medium">{copy.mapping}</span>
                            </div>
                          </div>
                        </div>

                        <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">{copy.smartFeatures}</h4>
                          <ul className="text-sm space-y-2">
                            <li className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                              <div>
                        <strong>{copy.smartFeatures}:</strong> {copy.categoriesDescription}
                              </div>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                              <div>
                        <strong>{copy.systemStatus}:</strong> {copy.routing}
                              </div>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                              <div>
                        <strong>{copy.validationSuccess}</strong>
                              </div>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                              <div>
                        <strong>{copy.emailTypes}:</strong> {copy.currentConfig}
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Email System Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        {copy.control}
                      </CardTitle>
                      <CardDescription>
                        {copy.control}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <div className="font-medium text-green-900">{copy.cc} {copy.currentConfig}</div>
                          <div className="text-sm text-green-700">{copy.active}</div>
                        </div>
                        
                        <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <div className="font-medium text-green-900">{copy.routing}</div>
                          <div className="text-sm text-green-700">{copy.active}</div>
                        </div>
                        
                        <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <Settings className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <div className="font-medium text-blue-900">{copy.email} — {copy.currentConfig}</div>
                          <div className="text-sm text-blue-700">{copy.enabled}</div>
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-yellow-900 mb-1">{copy.control}</h4>
                            <p className="text-yellow-700 text-sm mb-3">
                              {copy.currentConfig}. {copy.routing}.
                              {copy.status}.
                            </p>
                            <div className="text-sm">
                              <strong>{copy.currentConfig}:</strong>
                              <ul className="list-disc list-inside mt-1 space-y-1 text-yellow-700">
                                <li>{copy.cc} {copy.email}: info@momtazchem.com</li>
                                <li>{copy.routing}: {copy.mapping}</li>
                                <li>{copy.systemStatus}: {copy.routing}</li>
                                <li>{copy.emailTypes}: {copy.currentConfig}</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{copy.quickActions}</CardTitle>
                      <CardDescription>
                        {copy.quickActions}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button 
                          onClick={() => window.open('/admin/email-routing-stats', '_blank')}
                          variant="outline" 
                          className="h-16 flex-col space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            {copy.routing}
                          </div>
                          <div className="text-xs text-gray-500">{copy.routing}</div>
                        </Button>
                        
                        <Button 
                          onClick={() => toast({ title: copy.test, description: copy.testConnection })}
                          variant="outline" 
                          className="h-16 flex-col space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <TestTube className="w-4 h-4" />
                            {copy.testConnection}
                          </div>
                          <div className="text-xs text-gray-500">{copy.validate}</div>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Mail className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{copy.selectCategory}</h3>
                  <p className="text-gray-600">{copy.selectCategoryDescription}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">{copy.addCategory}</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="category-key">{copy.key}</Label>
                <Input
                  id="category-key"
                  value={newCategory.categoryKey}
                  onChange={(e) => setNewCategory({ ...newCategory, categoryKey: e.target.value })}
                  placeholder="marketing"
                />
              </div>
              
              <div>
                <Label htmlFor="category-name">{copy.name}</Label>
                <Input
                  id="category-name"
                  value={newCategory.categoryName}
                  onChange={(e) => setNewCategory({ ...newCategory, categoryName: e.target.value })}
                  placeholder="Marketing Department"
                />
              </div>
              
              <div>
                <Label htmlFor="category-description">{copy.description}</Label>
                <Textarea
                  id="category-description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder={copy.description}
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategory({ categoryKey: "", categoryName: "", description: "" });
                }}
              >
                {copy.cancel}
              </Button>
              <Button
                onClick={() => createCategoryMutation.mutate(newCategory)}
                disabled={!newCategory.categoryKey || !newCategory.categoryName || createCategoryMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createCategoryMutation.isPending ? copy.creating : copy.create}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}