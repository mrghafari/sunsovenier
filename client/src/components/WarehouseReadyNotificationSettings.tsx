import React, { useEffect, useState } from 'react';
import { AlertCircle, Bell, CheckCircle2, Mail, MessageSquare, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useLanguage } from '@/contexts/LanguageContext';

type Language = 'en' | 'fa' | 'ar' | 'tr';
type Settings = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  emailTemplateId: number | null;
  smsTemplateId: number | null;
  senderCategoryKey: string;
};
type Template = { id: number; name: string; language: string };
type Options = {
  smsTemplates: Template[];
  emailTemplates: Template[];
  emailCategories: { categoryKey: string; name: string }[];
};

const copy: Record<Language, Record<string, string>> = {
  en: {
    title: 'Ready-to-ship notifications', description: 'Choose what customers receive when the warehouse approves a basket and sends it to logistics.',
    email: 'Email notification', emailHelp: 'Send a confirmation email to the customer.',
    sms: 'SMS notification', smsHelp: 'Send a confirmation text to the customer.',
    emailTemplate: 'Email template', smsTemplate: 'SMS template', default: 'Built-in default',
    sender: 'Sender category', senderDefault: 'Use the system default sender', senderHelp: 'Used to select the sender identity for email delivery.',
    save: 'Save settings', saving: 'Saving...', loading: 'Loading notification settings...', retry: 'Try again',
    error: 'We could not load notification settings.', accessDenied: 'You do not have permission to view warehouse notification settings.', loginRequired: 'Please sign in to view notification settings.', saveError: 'Settings could not be saved.', saved: 'Notification settings saved.',
    approval: 'Messages are sent after warehouse approval, when the customer basket is handed to logistics.',
  },
  fa: {
    title: 'اعلان‌های آماده ارسال', description: 'انتخاب کنید پس از تأیید سبد توسط انبار و ارسال آن به لجستیک چه پیامی برای مشتری ارسال شود.',
    email: 'اعلان ایمیل', emailHelp: 'ارسال ایمیل تأیید برای مشتری.', sms: 'اعلان پیامک', smsHelp: 'ارسال پیامک تأیید برای مشتری.',
    emailTemplate: 'قالب ایمیل', smsTemplate: 'قالب پیامک', default: 'پیش‌فرض داخلی', sender: 'دسته فرستنده',
    senderDefault: 'استفاده از فرستنده پیش‌فرض سیستم', senderHelp: 'برای انتخاب هویت فرستنده ایمیل استفاده می‌شود.', save: 'ذخیره تنظیمات', saving: 'در حال ذخیره...',
    loading: 'در حال بارگذاری تنظیمات اعلان...', retry: 'تلاش دوباره', error: 'بارگذاری تنظیمات اعلان ممکن نیست.',
    accessDenied: 'برای مشاهده تنظیمات اعلان انبار دسترسی لازم را ندارید.', loginRequired: 'برای مشاهده تنظیمات اعلان وارد حساب خود شوید.',
    saveError: 'ذخیره تنظیمات ممکن نیست.', saved: 'تنظیمات اعلان ذخیره شد.',
    approval: 'پیام‌ها پس از تأیید انبار و تحویل سبد مشتری به لجستیک ارسال می‌شوند.',
  },
  ar: {
    title: 'إشعارات الجاهزية للشحن', description: 'اختر ما يستلمه العميل عند اعتماد السلة من المستودع وإرسالها إلى الخدمات اللوجستية.',
    email: 'إشعار البريد الإلكتروني', emailHelp: 'إرسال بريد تأكيد إلى العميل.', sms: 'إشعار الرسائل النصية', smsHelp: 'إرسال رسالة تأكيد إلى العميل.',
    emailTemplate: 'قالب البريد', smsTemplate: 'قالب الرسائل', default: 'الافتراضي المدمج', sender: 'فئة المرسل',
    senderDefault: 'استخدام مرسل النظام الافتراضي', senderHelp: 'تُستخدم لاختيار هوية مرسل البريد.', save: 'حفظ الإعدادات', saving: 'جارٍ الحفظ...',
    loading: 'جارٍ تحميل إعدادات الإشعارات...', retry: 'حاول مرة أخرى', error: 'تعذر تحميل إعدادات الإشعارات.',
    accessDenied: 'ليس لديك إذن لعرض إعدادات إشعارات المستودع.', loginRequired: 'يرجى تسجيل الدخول لعرض إعدادات الإشعارات.',
    saveError: 'تعذر حفظ الإعدادات.', saved: 'تم حفظ إعدادات الإشعارات.',
    approval: 'تُرسل الرسائل بعد اعتماد المستودع وتسليم سلة العميل إلى الخدمات اللوجستية.',
  },
  tr: {
    title: 'Gönderime hazır bildirimleri', description: 'Depo sepeti onaylayıp lojistiğe gönderdiğinde müşterinin alacağı bildirimleri seçin.',
    email: 'E-posta bildirimi', emailHelp: 'Müşteriye onay e-postası gönder.', sms: 'SMS bildirimi', smsHelp: 'Müşteriye onay mesajı gönder.',
    emailTemplate: 'E-posta şablonu', smsTemplate: 'SMS şablonu', default: 'Yerleşik varsayılan', sender: 'Gönderici kategorisi',
    senderDefault: 'Sistem varsayılan göndericisini kullan', senderHelp: 'E-posta göndericisinin kimliğini seçmek için kullanılır.', save: 'Ayarları kaydet', saving: 'Kaydediliyor...',
    loading: 'Bildirim ayarları yükleniyor...', retry: 'Tekrar dene', error: 'Bildirim ayarları yüklenemedi.',
    accessDenied: 'Depo bildirim ayarlarını görüntüleme yetkiniz yok.', loginRequired: 'Bildirim ayarlarını görüntülemek için giriş yapın.',
    saveError: 'Ayarlar kaydedilemedi.', saved: 'Bildirim ayarları kaydedildi.',
    approval: 'Mesajlar depo onayından ve müşteri sepetinin lojistiğe aktarılmasından sonra gönderilir.',
  },
};

const initialSettings: Settings = { emailEnabled: true, smsEnabled: true, emailTemplateId: null, smsTemplateId: null, senderCategoryKey: '' };

export default function WarehouseReadyNotificationSettings() {
  const { language: contextLanguage, direction } = useLanguage();
  const language = (['en', 'fa', 'ar', 'tr'].includes(contextLanguage) ? contextLanguage : 'en') as Language;
  const t = copy[language];
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [options, setOptions] = useState<Options>({ smsTemplates: [], emailTemplates: [], emailCategories: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorReason, setLoadErrorReason] = useState<'accessDenied' | 'loginRequired' | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true); setLoadError(false); setLoadErrorReason(null); setSaveError(false);
    try {
      const [settingsResponse, optionsResponse] = await Promise.all([
        apiRequest('/api/warehouse/ready-notification-settings', undefined),
        apiRequest('/api/warehouse/ready-notification-options', undefined),
      ]);
      if (!settingsResponse?.success || !optionsResponse?.success) throw new Error('Request failed');
      setSettings({ ...initialSettings, ...settingsResponse.settings });
      setOptions({ smsTemplates: optionsResponse.smsTemplates || [], emailTemplates: optionsResponse.emailTemplates || [], emailCategories: optionsResponse.emailCategories || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setLoadErrorReason(message.startsWith('403:') ? 'accessDenied' : message.startsWith('401:') ? 'loginRequired' : null);
      setLoadError(true);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    setSaving(true); setSaved(false); setSaveError(false);
    try {
      const response = await apiRequest('/api/warehouse/ready-notification-settings', { method: 'PUT', body: settings });
      if (!response?.success) throw new Error('Save failed');
      setSaved(true); setSaveError(false);
    } catch (saveException) {
      void saveException;
      setSaveError(true);
    } finally { setSaving(false); }
  };

  if (loading) return <Card><CardContent className="py-10 text-center text-muted-foreground">{t.loading}</CardContent></Card>;
  if (loadError) {
    return <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center"><AlertCircle className="h-8 w-8 text-destructive" /><p>{loadErrorReason ? t[loadErrorReason] : t.error}</p><Button variant="outline" onClick={() => void load()}>{t.retry}</Button></CardContent></Card>;
  }

  const templateLabel = (template: Template) => `${template.name}${template.language ? ` · ${template.language.toUpperCase()}` : ''}`;
  return (
    <Card dir={direction}>
      <CardHeader className="border-b bg-muted/20">
        <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><Mail className="mt-0.5 h-5 w-5 text-muted-foreground" /><div><Label className="text-base">{t.email}</Label><p className="mt-1 text-sm text-muted-foreground">{t.emailHelp}</p></div></div><Switch checked={settings.emailEnabled} onCheckedChange={(value) => setSettings((current) => ({ ...current, emailEnabled: value }))} /></div>
            <div className="mt-4"><Label>{t.emailTemplate}</Label><Select value={settings.emailTemplateId?.toString() || 'default'} onValueChange={(value) => setSettings((current) => ({ ...current, emailTemplateId: value === 'default' ? null : Number(value) }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="default">{t.default}</SelectItem>{options.emailTemplates.map((template) => <SelectItem key={template.id} value={String(template.id)}>{templateLabel(template)}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><MessageSquare className="mt-0.5 h-5 w-5 text-muted-foreground" /><div><Label className="text-base">{t.sms}</Label><p className="mt-1 text-sm text-muted-foreground">{t.smsHelp}</p></div></div><Switch checked={settings.smsEnabled} onCheckedChange={(value) => setSettings((current) => ({ ...current, smsEnabled: value }))} /></div>
            <div className="mt-4"><Label>{t.smsTemplate}</Label><Select value={settings.smsTemplateId?.toString() || 'default'} onValueChange={(value) => setSettings((current) => ({ ...current, smsTemplateId: value === 'default' ? null : Number(value) }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="default">{t.default}</SelectItem>{options.smsTemplates.map((template) => <SelectItem key={template.id} value={String(template.id)}>{templateLabel(template)}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>
        <div><Label>{t.sender}</Label><p className="mb-2 mt-1 text-sm text-muted-foreground">{t.senderHelp}</p><Select value={settings.senderCategoryKey || 'none'} onValueChange={(value) => setSettings((current) => ({ ...current, senderCategoryKey: value === 'none' ? '' : value }))}><SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">{t.senderDefault}</SelectItem>{options.emailCategories.map((category) => <SelectItem key={category.categoryKey} value={category.categoryKey}>{category.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="flex items-start gap-3 rounded-md bg-primary/5 p-4 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p>{t.approval}</p></div>
        <div className="flex items-center gap-3">{saved && <span className="text-sm text-green-700">{t.saved}</span>}{saveError && <span className="text-sm text-destructive">{t.saveError}</span>}<Button className="ml-auto gap-2" onClick={() => void save()} disabled={saving}><Save className="h-4 w-4" />{saving ? t.saving : t.save}</Button></div>
      </CardContent>
    </Card>
  );
}