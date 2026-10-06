import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Save, Edit, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";

const pageCopy = {
  en: {
    loading: "Loading...", back: "Back to Email Settings", title: "Email Address Management",
    subtitle: "Configure email addresses for each notification type and system function",
    howItWorks: "How it works",
    howItWorksText: "Changing an email address here redirects notifications, password changes, system alerts, and other automated messages to the new address. After changing it, configure SMTP for that category.",
    newEmail: "New email address", save: "Save", cancel: "Cancel", edit: "Edit",
    important: "Important",
    importantText: "After changing a category email address, configure and test its SMTP settings in Advanced Email Settings to ensure emails are delivered correctly.",
    notConfigured: "Not configured", ready: "Ready", failed: "Failed", untested: "Not tested",
    updateSuccess: "Email address updated successfully", updateError: "Update failed",
    updateErrorFallback: "Failed to update the email address", invalidEmail: "Please enter a valid email address",
  },
  fa: {
    loading: "در حال بارگذاری...", back: "بازگشت به تنظیمات ایمیل", title: "مدیریت آدرس‌های ایمیل",
    subtitle: "تنظیم آدرس‌های ایمیل برای هر نوع اعلان و کاربرد سیستم",
    howItWorks: "نحوه عملکرد",
    howItWorksText: "با تغییر آدرس ایمیل در این بخش، اعلان‌ها، تغییرات رمز عبور، هشدارهای سیستم و سایر پیام‌های خودکار به آدرس جدید ارسال می‌شوند. پس از تغییر، SMTP آن دسته‌بندی را تنظیم کنید.",
    newEmail: "آدرس ایمیل جدید", save: "ذخیره", cancel: "لغو", edit: "ویرایش",
    important: "نکته مهم",
    importantText: "پس از تغییر آدرس ایمیل هر دسته‌بندی، SMTP مربوط به آن را در تنظیمات پیشرفته ایمیل پیکربندی و آزمایش کنید تا ایمیل‌ها به‌درستی ارسال شوند.",
    notConfigured: "تنظیم نشده", ready: "آماده", failed: "خرابی", untested: "تست نشده",
    updateSuccess: "آدرس ایمیل با موفقیت به‌روزرسانی شد", updateError: "خطا در به‌روزرسانی",
    updateErrorFallback: "خطا در به‌روزرسانی آدرس ایمیل", invalidEmail: "لطفاً آدرس ایمیل معتبری وارد کنید",
  },
  ar: {
    loading: "جارٍ التحميل...", back: "العودة إلى إعدادات البريد", title: "إدارة عناوين البريد الإلكتروني",
    subtitle: "إعداد عناوين البريد لكل نوع من الإشعارات ووظائف النظام",
    howItWorks: "طريقة العمل",
    howItWorksText: "يؤدي تغيير عنوان البريد هنا إلى إرسال الإشعارات وتغييرات كلمة المرور وتنبيهات النظام والرسائل التلقائية الأخرى إلى العنوان الجديد. بعد التغيير، قم بإعداد SMTP لهذه الفئة.",
    newEmail: "عنوان البريد الإلكتروني الجديد", save: "حفظ", cancel: "إلغاء", edit: "تعديل",
    important: "ملاحظة مهمة",
    importantText: "بعد تغيير عنوان بريد أي فئة، قم بإعداد واختبار SMTP الخاص بها في إعدادات البريد المتقدمة لضمان إرسال الرسائل بشكل صحيح.",
    notConfigured: "غير مُعدّ", ready: "جاهز", failed: "فشل", untested: "غير مختبر",
    updateSuccess: "تم تحديث عنوان البريد الإلكتروني بنجاح", updateError: "فشل التحديث",
    updateErrorFallback: "تعذر تحديث عنوان البريد الإلكتروني", invalidEmail: "يرجى إدخال عنوان بريد إلكتروني صالح",
  },
  tr: {
    loading: "Yükleniyor...", back: "E-posta Ayarlarına Dön", title: "E-posta Adresi Yönetimi",
    subtitle: "Her bildirim türü ve sistem işlevi için e-posta adreslerini yapılandırın",
    howItWorks: "Nasıl çalışır",
    howItWorksText: "Buradaki e-posta adresini değiştirmek bildirimleri, parola değişikliklerini, sistem uyarılarını ve diğer otomatik mesajları yeni adrese yönlendirir. Değişiklikten sonra ilgili kategori için SMTP'yi yapılandırın.",
    newEmail: "Yeni e-posta adresi", save: "Kaydet", cancel: "İptal", edit: "Düzenle",
    important: "Önemli",
    importantText: "Bir kategori e-posta adresini değiştirdikten sonra iletilerin doğru gönderildiğinden emin olmak için Gelişmiş E-posta Ayarları bölümünde SMTP ayarlarını yapılandırıp test edin.",
    notConfigured: "Yapılandırılmadı", ready: "Hazır", failed: "Başarısız", untested: "Test edilmedi",
    updateSuccess: "E-posta adresi başarıyla güncellendi", updateError: "Güncelleme başarısız",
    updateErrorFallback: "E-posta adresi güncellenemedi", invalidEmail: "Lütfen geçerli bir e-posta adresi girin",
  },
} as const;

const categoryCopy = {
  en: {
    "password-reset": ["Password Recovery", "Password recovery and change emails, security alerts"],
    "system-notifications": ["System Information", "System maintenance, technical alerts, and updates"],
    "user-management": ["User Management", "New accounts, access changes, and deactivation"],
    "security-alerts": ["Security Alerts", "Suspicious logins, security breaches, and security reports"],
    admin: ["General Administration", "Administrative messages, general reports, and important information"],
    "inventory-alerts": ["Inventory Alerts", "Low stock, warehouse-level alerts, and replenishment needs"],
    "crm-notifications": ["CRM Information", "New customer activity, CRM reports, and follow-up reminders"],
  },
  fa: {
    "password-reset": ["بازیابی رمز عبور", "ایمیل‌های بازیابی و تغییر رمز عبور و هشدارهای امنیتی"],
    "system-notifications": ["اطلاعات سیستم", "تعمیرات سیستم، هشدارهای فنی و به‌روزرسانی‌ها"],
    "user-management": ["مدیریت کاربران", "ایجاد حساب جدید، تغییر سطح دسترسی و غیرفعال‌سازی"],
    "security-alerts": ["هشدارهای امنیتی", "ورود مشکوک، نقض امنیت و گزارش‌های امنیتی"],
    admin: ["مدیریت عمومی", "پیام‌های مدیریتی، گزارش‌های کلی و اطلاعات مهم"],
    "inventory-alerts": ["هشدارهای موجودی", "کمبود موجودی، هشدار سطح انبار و نیاز به تأمین"],
    "crm-notifications": ["اطلاعات CRM", "فعالیت مشتری جدید، گزارش‌های CRM و یادآوری پیگیری"],
  },
  ar: {
    "password-reset": ["استعادة كلمة المرور", "رسائل استعادة وتغيير كلمة المرور والتنبيهات الأمنية"],
    "system-notifications": ["معلومات النظام", "صيانة النظام والتنبيهات الفنية والتحديثات"],
    "user-management": ["إدارة المستخدمين", "إنشاء الحسابات وتغيير الصلاحيات وإلغاء التفعيل"],
    "security-alerts": ["التنبيهات الأمنية", "عمليات الدخول المشبوهة والاختراقات والتقارير الأمنية"],
    admin: ["الإدارة العامة", "الرسائل الإدارية والتقارير العامة والمعلومات المهمة"],
    "inventory-alerts": ["تنبيهات المخزون", "انخفاض المخزون وتنبيهات المستودع واحتياجات التوريد"],
    "crm-notifications": ["معلومات CRM", "نشاط العملاء الجدد وتقارير CRM وتذكيرات المتابعة"],
  },
  tr: {
    "password-reset": ["Parola Kurtarma", "Parola kurtarma ve değiştirme e-postaları ile güvenlik uyarıları"],
    "system-notifications": ["Sistem Bilgileri", "Sistem bakımı, teknik uyarılar ve güncellemeler"],
    "user-management": ["Kullanıcı Yönetimi", "Yeni hesaplar, erişim değişiklikleri ve devre dışı bırakma"],
    "security-alerts": ["Güvenlik Uyarıları", "Şüpheli girişler, güvenlik ihlalleri ve raporları"],
    admin: ["Genel Yönetim", "Yönetim mesajları, genel raporlar ve önemli bilgiler"],
    "inventory-alerts": ["Stok Uyarıları", "Düşük stok, depo seviyesi uyarıları ve tedarik ihtiyaçları"],
    "crm-notifications": ["CRM Bilgileri", "Yeni müşteri etkinliği, CRM raporları ve takip hatırlatmaları"],
  },
} as const;

interface EmailCategoryAssignment {
  id?: number;
  categoryKey: string;
  categoryName: string;
  description: string;
  assignedEmail: string;
  isActive: boolean;
  smtpConfigured?: boolean;
  lastTested?: string;
  testStatus?: string;
}

export default function EmailAddressManagerPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const copy = pageCopy[language];
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ [key: string]: string }>({});

  // Query to get category assignments
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["/api/admin/email/category-assignments"],
  });

  // Query to get email categories with SMTP status
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/admin/email/categories"],
  });

  // Mutation to update email assignment
  const updateEmailMutation = useMutation({
    mutationFn: async (data: { categoryKey: string; newEmail: string }) => {
      const response = await fetch('/api/admin/email/update-category-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || copy.updateErrorFallback);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: copy.updateSuccess });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/category-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/categories"] });
      setEditingCategory(null);
      setEditForm({});
    },
    onError: (error: any) => {
      toast({ 
        title: copy.updateError,
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Default assignments
  const defaultAssignments: EmailCategoryAssignment[] = [
    {
      categoryKey: 'password-reset',
      categoryName: categoryCopy[language]['password-reset'][0],
      description: categoryCopy[language]['password-reset'][1],
      assignedEmail: 'noreply@momtazchem.com',
      isActive: true
    },
    {
      categoryKey: 'system-notifications',
      categoryName: categoryCopy[language]['system-notifications'][0],
      description: categoryCopy[language]['system-notifications'][1],
      assignedEmail: 'system@momtazchem.com',
      isActive: true
    },
    {
      categoryKey: 'user-management',
      categoryName: categoryCopy[language]['user-management'][0],
      description: categoryCopy[language]['user-management'][1],
      assignedEmail: 'users@momtazchem.com',
      isActive: true
    },
    {
      categoryKey: 'security-alerts',
      categoryName: categoryCopy[language]['security-alerts'][0],
      description: categoryCopy[language]['security-alerts'][1],
      assignedEmail: 'security@momtazchem.com',
      isActive: true
    },
    {
      categoryKey: 'admin',
      categoryName: categoryCopy[language].admin[0],
      description: categoryCopy[language].admin[1],
      assignedEmail: 'info@momtazchem.com',
      isActive: true
    },
    {
      categoryKey: 'inventory-alerts',
      categoryName: categoryCopy[language]['inventory-alerts'][0],
      description: categoryCopy[language]['inventory-alerts'][1],
      assignedEmail: 'inventory@momtazchem.com',
      isActive: true
    },
    {
      categoryKey: 'crm-notifications',
      categoryName: categoryCopy[language]['crm-notifications'][0],
      description: categoryCopy[language]['crm-notifications'][1],
      assignedEmail: 'crm@momtazchem.com',
      isActive: true
    }
  ];

  // Create category assignments with SMTP status
  const categoryAssignments = defaultAssignments.map(assignment => {
    // Find corresponding category with SMTP status (categories.data is the array)
    const categoriesArray = categories?.categories || [];
    const category = categoriesArray.find((cat: any) => cat.categoryKey === assignment.categoryKey);
    return {
      ...assignment,
      smtpConfigured: !!category?.smtp,
      testStatus: category?.smtp?.testStatus || 'untested',
      lastTested: category?.smtp?.lastTested
    };
  });

  const startEditing = (categoryKey: string, currentEmail: string) => {
    setEditingCategory(categoryKey);
    setEditForm({ [categoryKey]: currentEmail });
  };

  const cancelEditing = () => {
    setEditingCategory(null);
    setEditForm({});
  };

  const saveEmail = (categoryKey: string) => {
    const newEmail = editForm[categoryKey];
    if (!newEmail || !newEmail.includes('@')) {
      toast({ title: copy.invalidEmail, variant: "destructive" });
      return;
    }
    
    updateEmailMutation.mutate({ categoryKey, newEmail });
  };

  const getStatusBadge = (assignment: EmailCategoryAssignment) => {
    if (!assignment.smtpConfigured) {
      return <Badge variant="secondary" className="gap-1"><AlertTriangle className="w-3 h-3" />{copy.notConfigured}</Badge>;
    }
    
    switch (assignment.testStatus) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800 gap-1"><CheckCircle className="w-3 h-3" />{copy.ready}</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />{copy.failed}</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />{copy.untested}</Badge>;
    }
  };

  // Show loading state
  if (isLoading || categoriesLoading) {
    return (
      <div className="container mx-auto px-4 py-8" dir={direction}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>{copy.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl" dir={direction}>
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          onClick={() => setLocation("/admin/advanced-email-settings")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {copy.back}
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{copy.title}</h1>
          <p className="text-gray-600 mt-1">{copy.subtitle}</p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-blue-900">{copy.howItWorks}</span>
        </div>
        <p className="text-blue-700 text-sm">
          {copy.howItWorksText}
        </p>
      </div>

      <div className="space-y-4">
        {categoryAssignments.map((assignment) => (
          <Card key={assignment.categoryKey} className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{assignment.categoryName}</h3>
                    {getStatusBadge(assignment)}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{assignment.description}</p>
                  
                  {editingCategory === assignment.categoryKey ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`email-${assignment.categoryKey}`} className="text-sm font-medium">
                          {copy.newEmail}
                        </Label>
                        <Input
                          id={`email-${assignment.categoryKey}`}
                          type="email"
                          value={editForm[assignment.categoryKey] || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, [assignment.categoryKey]: e.target.value }))}
                          placeholder="example@momtazchem.com"
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveEmail(assignment.categoryKey)}
                          disabled={updateEmailMutation.isPending}
                          className="gap-2"
                        >
                          <Save className="w-4 h-4" />
                           {copy.save}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                          disabled={updateEmailMutation.isPending}
                        >
                           {copy.cancel}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="bg-gray-50 px-3 py-2 rounded border">
                        <span className="font-mono text-sm">{assignment.assignedEmail}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(assignment.categoryKey, assignment.assignedEmail)}
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                         {copy.edit}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span className="font-medium text-amber-900">{copy.important}</span>
        </div>
        <p className="text-amber-700 text-sm">
          {copy.importantText}
        </p>
      </div>
    </div>
  );
}