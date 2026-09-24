import React, { useEffect, useState } from 'react';
import { AlertCircle, Bell, CheckCircle2, Mail, MessageSquare, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';

type Language = 'en' | 'fa' | 'ar' | 'tr';
type Settings = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  emailTemplateId: number | null;
  smsTemplateId: number | null;
  senderCategoryKey: string;
};
type Template = { id: number; name: string; language: string; content?: string };
type EmailTemplate = Template & { subject: string; content: string };
type Sender = { email: string | null; direct: boolean; testStatus: string | null };
type Options = {
  smsTemplates: Template[];
  emailTemplates: EmailTemplate[];
  emailCategories: { categoryKey: string; name: string; sender: Sender }[];
  defaultSender: Sender;
  defaultSmsTexts: Record<string, string>;
  defaultEmailSubjects: Record<string, string>;
  defaultEmailTexts: Record<string, string>;
};
const emptySender: Sender = { email: null, direct: false, testStatus: null };

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
    smsContent: 'SMS text', templateNumber: 'Template #', sharedTemplate: 'Editing this text also updates the template in the system SMS template library wherever it is used.',
    defaultSmsHelp: 'The built-in default is shown for reference. Select a library template to edit its text.',
    changedTemplate: 'This template was changed elsewhere. Reload the settings before editing it again.',
    invalidSms: 'Enter SMS text (up to 4,000 characters).',
    discardSms: 'Discard unsaved changes to this SMS template?',
    partialSave: 'The SMS template was updated in the library, but the notification settings were not saved.',
    senderAddress: 'Sending from:', senderUnavailable: 'No active sender email is configured for this category.',
    previewLanguage: 'Recipient language for preview', emailSubject: 'Email subject', emailBody: 'Email text sent', smsPreview: 'SMS text sent',
    previewNote: 'Placeholders such as {{order_number}} are filled in when sending. A template in another language falls back to the built-in text.',
    senderFallback: 'This category uses a fallback sender, not its own SMTP account.',
    smtpSetup: 'Connect or test an email address in Advanced Email Management → SMTP Settings',
    testSuccess: 'Last SMTP test succeeded', testFailed: 'Last SMTP test failed', testUntested: 'SMTP connection has not been tested',
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
    smsContent: 'متن پیامک', templateNumber: 'شماره قالب: ', sharedTemplate: 'ویرایش این متن، قالب را در مخزن قالب‌های پیامک سیستم و همهٔ محل‌های استفاده از آن به‌روزرسانی می‌کند.',
    defaultSmsHelp: 'متن پیش‌فرض فقط برای نمایش است. برای ویرایش، یکی از قالب‌های مخزن را انتخاب کنید.',
    changedTemplate: 'این قالب در جای دیگری تغییر کرده است. تنظیمات را دوباره بارگذاری کنید.',
    invalidSms: 'متن پیامک را وارد کنید (حداکثر ۴۰۰۰ نویسه).',
    discardSms: 'تغییرات ذخیره‌نشدهٔ این قالب پیامک کنار گذاشته شود؟',
    partialSave: 'قالب پیامک در مخزن به‌روزرسانی شد، اما تنظیمات اعلان ذخیره نشد.',
    senderAddress: 'ایمیل فرستنده:', senderUnavailable: 'برای این دسته ایمیل فرستندهٔ فعالی تنظیم نشده است.',
    previewLanguage: 'زبان گیرنده برای پیش‌نمایش', emailSubject: 'موضوع ایمیل', emailBody: 'متن ارسالی ایمیل', smsPreview: 'متن ارسالی پیامک',
    previewNote: 'متغیرهایی مانند {{order_number}} هنگام ارسال جایگزین می‌شوند. اگر زبان قالب با زبان مشتری سازگار نباشد، متن پیش‌فرض همان زبان ارسال می‌شود.',
    senderFallback: 'این دسته SMTP اختصاصی ندارد و از فرستندهٔ جایگزین استفاده می‌کند.',
    smtpSetup: 'اتصال یا آزمون ایمیل در «مدیریت پیشرفته ایمیل ← تنظیمات SMTP»',
    testSuccess: 'آخرین آزمون SMTP موفق بوده', testFailed: 'آخرین آزمون SMTP ناموفق بوده', testUntested: 'اتصال SMTP هنوز آزمون نشده است',
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
    smsContent: 'نص الرسالة', templateNumber: 'رقم القالب: ', sharedTemplate: 'تعديل هذا النص يحدّث القالب في مكتبة رسائل النظام في جميع مواضع استخدامه.',
    defaultSmsHelp: 'النص الافتراضي للعرض فقط. اختر قالباً من المكتبة لتحريره.',
    changedTemplate: 'تم تعديل هذا القالب في مكان آخر. أعد تحميل الإعدادات قبل التعديل.',
    invalidSms: 'أدخل نص الرسالة (حتى ٤٠٠٠ حرف).',
    discardSms: 'هل تريد تجاهل التغييرات غير المحفوظة لهذا القالب؟',
    partialSave: 'تم تحديث قالب الرسائل في المكتبة، لكن إعدادات الإشعارات لم تُحفظ.',
    senderAddress: 'البريد المرسل منه:', senderUnavailable: 'لم يُضبط بريد مرسل نشط لهذه الفئة.',
    previewLanguage: 'لغة المستلم للمعاينة', emailSubject: 'موضوع البريد', emailBody: 'نص البريد المرسل', smsPreview: 'نص الرسالة المرسلة',
    previewNote: 'تُستبدل المتغيرات مثل {{order_number}} عند الإرسال. إذا لم تتوافق لغة القالب مع لغة العميل، يُستخدم النص الافتراضي بلغته.',
    senderFallback: 'تستخدم هذه الفئة مرسلاً احتياطياً بدلاً من SMTP خاص بها.',
    smtpSetup: 'اتصل أو اختبر البريد في إدارة البريد المتقدمة ← إعدادات SMTP',
    testSuccess: 'نجح آخر اختبار SMTP', testFailed: 'فشل آخر اختبار SMTP', testUntested: 'لم يتم اختبار اتصال SMTP بعد',
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
    smsContent: 'SMS metni', templateNumber: 'Şablon no: ', sharedTemplate: 'Bu metni düzenlemek, sistem SMS şablonları kitaplığındaki şablonu kullanıldığı her yerde günceller.',
    defaultSmsHelp: 'Yerleşik varsayılan yalnızca önizleme içindir. Düzenlemek için bir kitaplık şablonu seçin.',
    changedTemplate: 'Bu şablon başka bir yerde değiştirildi. Düzenlemeden önce ayarları yeniden yükleyin.',
    invalidSms: 'SMS metnini girin (en fazla 4.000 karakter).',
    discardSms: 'Bu SMS şablonundaki kaydedilmemiş değişiklikler silinsin mi?',
    partialSave: 'SMS şablonu kitaplıkta güncellendi, ancak bildirim ayarları kaydedilemedi.',
    senderAddress: 'Gönderen e-posta:', senderUnavailable: 'Bu kategori için etkin bir gönderen e-posta adresi yapılandırılmamış.',
    previewLanguage: 'Önizleme için alıcı dili', emailSubject: 'E-posta konusu', emailBody: 'Gönderilen e-posta metni', smsPreview: 'Gönderilen SMS metni',
    previewNote: '{{order_number}} gibi değişkenler gönderimde doldurulur. Şablon dili müşteri diliyle uyumsuzsa o dilin varsayılan metni kullanılır.',
    senderFallback: 'Bu kategori kendi SMTP hesabı yerine yedek göndereni kullanıyor.',
    smtpSetup: 'Gelişmiş E-posta Yönetimi → SMTP Ayarları bölümünde e-posta bağlayın veya test edin',
    testSuccess: 'Son SMTP testi başarılı', testFailed: 'Son SMTP testi başarısız', testUntested: 'SMTP bağlantısı henüz test edilmedi',
  },
};

const initialSettings: Settings = { emailEnabled: true, smsEnabled: true, emailTemplateId: null, smsTemplateId: null, senderCategoryKey: '' };

export default function WarehouseReadyNotificationSettings() {
  const { language: contextLanguage, direction } = useLanguage();
  const queryClient = useQueryClient();
  const language = (['en', 'fa', 'ar', 'tr'].includes(contextLanguage) ? contextLanguage : 'en') as Language;
  const t = copy[language];
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [options, setOptions] = useState<Options>({
    smsTemplates: [], emailTemplates: [], emailCategories: [], defaultSender: emptySender,
    defaultSmsTexts: {}, defaultEmailSubjects: {}, defaultEmailTexts: {},
  });
  const [smsDraft, setSmsDraft] = useState('');
  const [previewLanguage, setPreviewLanguage] = useState<Language>(language);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorReason, setLoadErrorReason] = useState<'accessDenied' | 'loginRequired' | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const selectedSmsTemplate = options.smsTemplates.find(template => template.id === settings.smsTemplateId);
  const selectedEmailTemplate = options.emailTemplates.find(template => template.id === settings.emailTemplateId);
  const sender = settings.senderCategoryKey
    ? options.emailCategories.find(category => category.categoryKey === settings.senderCategoryKey)?.sender || emptySender
    : options.defaultSender;
  const emailTemplateApplies = selectedEmailTemplate && (selectedEmailTemplate.language === previewLanguage || selectedEmailTemplate.language === 'en');
  const smsTemplateApplies = selectedSmsTemplate && (selectedSmsTemplate.language === previewLanguage || selectedSmsTemplate.language === 'en');
  const emailSubject = emailTemplateApplies ? selectedEmailTemplate.subject : options.defaultEmailSubjects[previewLanguage] || options.defaultEmailSubjects.en;
  const emailText = emailTemplateApplies ? selectedEmailTemplate.content : options.defaultEmailTexts[previewLanguage] || options.defaultEmailTexts.en;
  const smsText = smsTemplateApplies ? smsDraft : options.defaultSmsTexts[previewLanguage] || options.defaultSmsTexts.en;

  const load = async () => {
    setLoading(true); setLoadError(false); setLoadErrorReason(null); setSaveError(false);
    try {
      const [settingsResponse, optionsResponse] = await Promise.all([
        apiRequest('/api/warehouse/ready-notification-settings', undefined),
        apiRequest('/api/warehouse/ready-notification-options', undefined),
      ]);
      if (!settingsResponse?.success || !optionsResponse?.success) throw new Error('Request failed');
      setSettings({ ...initialSettings, ...settingsResponse.settings });
      const smsTemplates: Template[] = optionsResponse.smsTemplates || [];
      setOptions({
        smsTemplates,
        emailTemplates: optionsResponse.emailTemplates || [],
        emailCategories: optionsResponse.emailCategories || [],
        defaultSender: optionsResponse.defaultSender || emptySender,
        defaultSmsTexts: optionsResponse.defaultSmsTexts || {},
        defaultEmailSubjects: optionsResponse.defaultEmailSubjects || {},
        defaultEmailTexts: optionsResponse.defaultEmailTexts || {},
      });
      setSmsDraft(smsTemplates.find(template => template.id === settingsResponse.settings.smsTemplateId)?.content || '');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setLoadErrorReason(message.startsWith('403:') ? 'accessDenied' : message.startsWith('401:') ? 'loginRequired' : null);
      setLoadError(true);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (selectedSmsTemplate && (!smsDraft.trim() || smsDraft.length > 4000)) {
      setSaveErrorMessage(t.invalidSms); setSaveError(true); return;
    }
    setSaving(true); setSaved(false); setSaveError(false); setSaveErrorMessage('');
    let templateUpdated = false;
    try {
      if (selectedSmsTemplate && smsDraft !== selectedSmsTemplate.content) {
        const updated = await apiRequest(`/api/warehouse/ready-notification-sms-template/${selectedSmsTemplate.id}`, {
          method: 'PUT',
          body: { content: smsDraft, expectedContent: selectedSmsTemplate.content },
        });
        if (!updated?.success || !updated.template) throw new Error('Template update failed');
        setOptions(current => ({
          ...current,
          smsTemplates: current.smsTemplates.map(template => template.id === updated.template.id ? updated.template : template),
        }));
        setSmsDraft(updated.template.content);
        templateUpdated = true;
        void queryClient.invalidateQueries({ queryKey: ['/api/admin/simple-sms-templates'] });
      }
      const response = await apiRequest('/api/warehouse/ready-notification-settings', { method: 'PUT', body: settings });
      if (!response?.success) throw new Error('Save failed');
      setSaved(true); setSaveError(false);
    } catch (saveException) {
      const message = saveException instanceof Error ? saveException.message : '';
      setSaveErrorMessage(message.startsWith('409:') ? t.changedTemplate : templateUpdated ? t.partialSave : t.saveError);
      setSaveError(true);
    } finally { setSaving(false); }
  };

  if (loading) return <Card><CardContent className="py-10 text-center text-muted-foreground">{t.loading}</CardContent></Card>;
  if (loadError) {
    return <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center"><AlertCircle className="h-8 w-8 text-destructive" /><p>{loadErrorReason ? t[loadErrorReason] : t.error}</p><Button variant="outline" onClick={() => void load()}>{t.retry}</Button></CardContent></Card>;
  }

  const templateLabel = (template: Template) => `${template.name}${template.language ? ` · ${template.language.toUpperCase()}` : ''}`;
  const smsTemplateLabel = (template: Template) => `${t.templateNumber}${template.id} · ${templateLabel(template)}`;
  return (
    <Card dir={direction}>
      <CardHeader className="border-b bg-muted/20">
        <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <Label>{t.previewLanguage}</Label>
          <Select value={previewLanguage} onValueChange={value => setPreviewLanguage(value as Language)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fa">فارسی</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="tr">Türkçe</SelectItem>
            </SelectContent>
          </Select>
          <p className="w-full text-xs text-muted-foreground">{t.previewNote}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><Mail className="mt-0.5 h-5 w-5 text-muted-foreground" /><div><Label className="text-base">{t.email}</Label><p className="mt-1 text-sm text-muted-foreground">{t.emailHelp}</p></div></div><Switch checked={settings.emailEnabled} onCheckedChange={(value) => setSettings((current) => ({ ...current, emailEnabled: value }))} /></div>
            <div className="mt-4"><Label>{t.emailTemplate}</Label><Select value={settings.emailTemplateId?.toString() || 'default'} onValueChange={(value) => setSettings((current) => ({ ...current, emailTemplateId: value === 'default' ? null : Number(value) }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="default">{t.default}</SelectItem>{options.emailTemplates.map((template) => <SelectItem key={template.id} value={String(template.id)}>{templateLabel(template)}</SelectItem>)}</SelectContent></Select></div>
            <div className="mt-4 space-y-3 rounded-md border bg-muted/20 p-3" aria-live="polite">
              <div><p className="text-sm font-medium">{t.emailSubject}</p><p className="mt-1 break-words text-sm" dir="auto">{emailSubject}</p></div>
              <div><p className="text-sm font-medium">{t.emailBody}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm" dir="auto">{emailText}</p></div>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><MessageSquare className="mt-0.5 h-5 w-5 text-muted-foreground" /><div><Label className="text-base">{t.sms}</Label><p className="mt-1 text-sm text-muted-foreground">{t.smsHelp}</p></div></div><Switch checked={settings.smsEnabled} onCheckedChange={(value) => setSettings((current) => ({ ...current, smsEnabled: value }))} /></div>
             <div className="mt-4">
               <Label>{t.smsTemplate}</Label>
               <Select value={settings.smsTemplateId?.toString() || 'default'} disabled={saving} onValueChange={(value) => {
                 if (selectedSmsTemplate && smsDraft !== selectedSmsTemplate.content && !window.confirm(t.discardSms)) return;
                 const id = value === 'default' ? null : Number(value);
                 setSettings(current => ({ ...current, smsTemplateId: id }));
                 setSmsDraft(options.smsTemplates.find(template => template.id === id)?.content || '');
                 setSaved(false);
               }}>
                 <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                 <SelectContent><SelectItem value="default">{t.default}</SelectItem>{options.smsTemplates.map(template => <SelectItem key={template.id} value={String(template.id)}>{smsTemplateLabel(template)}</SelectItem>)}</SelectContent>
               </Select>
               {selectedSmsTemplate && <p className="mt-2 text-sm font-medium text-muted-foreground">{t.templateNumber}{selectedSmsTemplate.id}</p>}
               {selectedSmsTemplate && <>
                 <Label htmlFor="warehouse-ready-sms-content" className="mt-4 block">{t.smsContent}</Label>
                 <Textarea id="warehouse-ready-sms-content" className="mt-2 min-h-32" dir={selectedSmsTemplate.language === 'en' || selectedSmsTemplate.language === 'tr' ? 'ltr' : 'rtl'}
                   value={smsDraft} onChange={event => { setSmsDraft(event.target.value); setSaved(false); }}
                   disabled={saving} maxLength={4000}
                 />
               </>}
               <p className="mt-2 text-xs text-muted-foreground">{selectedSmsTemplate ? t.sharedTemplate : t.defaultSmsHelp}</p>
               <div className="mt-4 rounded-md border bg-muted/20 p-3" aria-live="polite">
                 <p className="text-sm font-medium">{t.smsPreview}</p>
                 <p className="mt-1 whitespace-pre-wrap break-words text-sm" dir="auto">{smsText}</p>
               </div>
             </div>
          </div>
        </div>
         <div>
           <Label>{t.sender}</Label>
           <p className="mb-2 mt-1 text-sm text-muted-foreground">{t.senderHelp}</p>
           <Select value={settings.senderCategoryKey || 'none'} onValueChange={(value) => setSettings((current) => ({ ...current, senderCategoryKey: value === 'none' ? '' : value }))}>
             <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
             <SelectContent><SelectItem value="none">{t.senderDefault}</SelectItem>{options.emailCategories.map(category => <SelectItem key={category.categoryKey} value={category.categoryKey}>{category.name}</SelectItem>)}</SelectContent>
           </Select>
           <p className="mt-2 text-sm" aria-live="polite">
             {sender.email ? <>{t.senderAddress} <span dir="ltr" className="inline-block font-medium">{sender.email}</span></> : <span className="text-destructive">{t.senderUnavailable}</span>}
           </p>
           {sender.email && <p className="mt-1 text-xs text-muted-foreground">
             {!sender.direct && <span className="me-2">{t.senderFallback}</span>}
             {sender.testStatus === 'success' ? t.testSuccess : sender.testStatus === 'failed' ? t.testFailed : t.testUntested}
           </p>}
           <a className="mt-2 inline-block text-sm font-medium text-primary underline underline-offset-2" href="/mrg/advanced-email-settings">{t.smtpSetup}</a>
         </div>
        <div className="flex items-start gap-3 rounded-md bg-primary/5 p-4 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p>{t.approval}</p></div>
         <div className="flex items-center gap-3">{saved && <span className="text-sm text-green-700">{t.saved}</span>}{saveError && <span className="text-sm text-destructive">{saveErrorMessage || t.saveError}</span>}<Button className="ml-auto gap-2" onClick={() => void save()} disabled={saving}><Save className="h-4 w-4" />{saving ? t.saving : t.save}</Button></div>
      </CardContent>
    </Card>
  );
}