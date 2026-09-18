import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Mail, 
  Settings, 
  ArrowLeft, 
  Save, 
  CheckCircle, 
  XCircle, 
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";

const emailSettingsCopy = {
  en: {
    title: "Email Management",
    description: "Configure email addresses and manage email templates",
    progressTracker: "Progress Tracker",
    backToAdmin: "Back to Admin",
    emailAddressesTab: "Email Addresses",
    emailTemplatesTab: "Email Templates",
    templatesTitle: "Email Template Management",
    templatesDescription: "Create, edit, and manage email templates for automated responses",
    openTemplates: "Open Template Management",
    automatedEmailLogs: "Automated Email Logs",
    templatesIntro: "In this section you can:",
    createTemplates: "Create new templates",
    editTemplates: "Edit existing templates",
    addVariables: "Add dynamic variables",
    setDefaultTemplate: "Set a default template",
  },
  fa: {
    title: "مدیریت ایمیل",
    description: "آدرس‌های ایمیل و قالب‌های ایمیل را مدیریت کنید",
    progressTracker: "پیگیری پیشرفت",
    backToAdmin: "بازگشت به مدیریت",
    emailAddressesTab: "آدرس‌های ایمیل",
    emailTemplatesTab: "قالب‌های ایمیل",
    templatesTitle: "مدیریت قالب‌های ایمیل",
    templatesDescription: "ایجاد، ویرایش و مدیریت قالب‌های ایمیل برای پاسخ‌های خودکار",
    openTemplates: "باز کردن مدیریت قالب‌ها",
    automatedEmailLogs: "گزارش ایمیل‌های خودکار",
    templatesIntro: "در این بخش می‌توانید:",
    createTemplates: "قالب‌های جدید ایجاد کنید",
    editTemplates: "قالب‌های موجود را ویرایش کنید",
    addVariables: "متغیرهای پویا اضافه کنید",
    setDefaultTemplate: "قالب پیش‌فرض تنظیم کنید",
  },
  ar: {
    title: "إدارة البريد الإلكتروني",
    description: "إعداد عناوين البريد الإلكتروني وإدارة قوالب البريد",
    progressTracker: "متابعة التقدم",
    backToAdmin: "العودة إلى الإدارة",
    emailAddressesTab: "عناوين البريد الإلكتروني",
    emailTemplatesTab: "قوالب البريد الإلكتروني",
    templatesTitle: "إدارة قوالب البريد الإلكتروني",
    templatesDescription: "إنشاء قوالب البريد الإلكتروني وتحريرها وإدارتها للردود التلقائية",
    openTemplates: "فتح إدارة القوالب",
    automatedEmailLogs: "سجلات البريد الإلكتروني التلقائي",
    templatesIntro: "يمكنك في هذا القسم:",
    createTemplates: "إنشاء قوالب جديدة",
    editTemplates: "تعديل القوالب الحالية",
    addVariables: "إضافة متغيرات ديناميكية",
    setDefaultTemplate: "تعيين قالب افتراضي",
  },
  tr: {
    title: "E-posta Yönetimi",
    description: "E-posta adreslerini yapılandırın ve e-posta şablonlarını yönetin",
    progressTracker: "İlerleme Takibi",
    backToAdmin: "Yönetim Paneline Dön",
    emailAddressesTab: "E-posta Adresleri",
    emailTemplatesTab: "E-posta Şablonları",
    templatesTitle: "E-posta Şablonu Yönetimi",
    templatesDescription: "Otomatik yanıtlar için e-posta şablonları oluşturun, düzenleyin ve yönetin",
    openTemplates: "Şablon Yönetimini Aç",
    automatedEmailLogs: "Otomatik E-posta Kayıtları",
    templatesIntro: "Bu bölümde şunları yapabilirsiniz:",
    createTemplates: "Yeni şablonlar oluşturun",
    editTemplates: "Mevcut şablonları düzenleyin",
    addVariables: "Dinamik değişkenler ekleyin",
    setDefaultTemplate: "Varsayılan şablonu ayarlayın",
  },
} as const;

interface EmailSettings {
  id?: number;
  category: string;
  name: string;
  description: string;
  emailAddress: string;
  isActive: boolean;
  isPrimary: boolean;
  usage: string[];
  createdAt?: string;
  updatedAt?: string;
}

// No default email settings - use only database configurations

export default function EmailSettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language, direction } = useLanguage();
  const copy = emailSettingsCopy[language];
  
  // Email settings state
  const [emailSettings, setEmailSettings] = useState<EmailSettings[]>([]);
  const [editingEmail, setEditingEmail] = useState<EmailSettings | null>(null);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);

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

  // Load existing settings
  const { data: currentSettings } = useQuery({
    queryKey: ["/api/admin/email-settings"],
    queryFn: () => fetch("/api/admin/email-settings").then(res => res.json())
  });

  // Effect to update state when data loads
  useEffect(() => {
    if (currentSettings?.emailSettings) {
      setEmailSettings(currentSettings.emailSettings);
    }
  }, [currentSettings]);

  // Save email settings mutation
  const saveEmailSettingsMutation = useMutation({
    mutationFn: (settings: EmailSettings[]) => 
      apiRequest("/api/admin/email-settings", "POST", { emailSettings: settings }),
    onSuccess: () => {
      toast({ title: "Success", description: "Email settings saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-settings"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save email settings", variant: "destructive" });
    }
  });

  const handleSaveEmailSettings = () => {
    setIsSaving(true);
    saveEmailSettingsMutation.mutate(emailSettings);
    setTimeout(() => setIsSaving(false), 1000);
  };

  const updateEmailSetting = (index: number, field: keyof EmailSettings, value: any) => {
    const updated = [...emailSettings];
    updated[index] = { ...updated[index], [field]: value };
    setEmailSettings(updated);
  };

  const toggleEmailActive = (index: number) => {
    updateEmailSetting(index, 'isActive', !emailSettings[index].isActive);
  };

  const getUsageColor = (usage: string) => {
    switch (usage.toLowerCase()) {
      case 'contact form':
        return 'bg-blue-100 text-blue-800';
      case 'product inquiries':
        return 'bg-green-100 text-green-800';
      case 'order confirmations':
        return 'bg-purple-100 text-purple-800';
      case 'technical support':
        return 'bg-orange-100 text-orange-800';
      case 'system notifications':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8" dir={direction}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Mail className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{copy.title}</h1>
            <p className="text-gray-600 mt-1">{copy.description}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => setLocation("/admin/email-progress")}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            🎯 {copy.progressTracker}
          </Button>
          <Button onClick={() => setLocation("/admin")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {copy.backToAdmin}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="email-addresses" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email-addresses">{copy.emailAddressesTab}</TabsTrigger>
          <TabsTrigger value="email-templates">{copy.emailTemplatesTab}</TabsTrigger>
        </TabsList>

        {/* Email Addresses Tab */}
        <TabsContent value="email-addresses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Address Configuration</CardTitle>
              <CardDescription>
                Configure email addresses used throughout the website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {emailSettings.map((setting, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{setting.name}</h3>
                      {setting.isPrimary && (
                        <Badge variant="default" className="bg-blue-600">Primary</Badge>
                      )}
                      <Switch
                        checked={setting.isActive}
                        onCheckedChange={() => toggleEmailActive(index)}
                      />
                      {setting.isActive ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm">{setting.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`email-${index}`}>Email Address</Label>
                      <Input
                        id={`email-${index}`}
                        type="email"
                        value={setting.emailAddress}
                        onChange={(e) => updateEmailSetting(index, 'emailAddress', e.target.value)}
                        placeholder="email@domain.com"
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Input
                        value={setting.category}
                        onChange={(e) => updateEmailSetting(index, 'category', e.target.value)}
                        placeholder="Category"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Used For:</Label>
                    <div className="flex flex-wrap gap-2">
                      {setting.usage.map((use, useIndex) => (
                        <Badge key={useIndex} variant="outline" className={getUsageColor(use)}>
                          {use}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveEmailSettings}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Email Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="email-templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                {copy.templatesTitle}
              </CardTitle>
              <CardDescription>
                {copy.templatesDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 justify-center items-center py-8">
                <Button
                  onClick={() => setLocation("/admin/email-templates")}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  {copy.openTemplates}
                </Button>
                
                <Button
                  onClick={() => setLocation("/admin/email-logs")}
                  className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-8 py-3 text-lg"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  {copy.automatedEmailLogs}
                </Button>
              </div>
              <div className="text-center text-gray-600 mt-4">
                <p>{copy.templatesIntro}</p>
                <div className="mt-2 space-y-1 text-sm">
                  <p>• {copy.createTemplates}</p>
                  <p>• {copy.editTemplates}</p>
                  <p>• {copy.addVariables}</p>
                  <p>• {copy.setDefaultTemplate}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}