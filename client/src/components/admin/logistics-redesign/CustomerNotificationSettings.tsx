import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Eye, KeyRound, Mail, Phone, Save, Server, Send, TriangleAlert } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { LogisticsLanguage } from '@/pages/admin/logistics-translations';

type Translator = (key: string) => string;
type Props = { t: Translator; direction?: 'ltr' | 'rtl'; language: LogisticsLanguage };
type ApiResult<T> = { success?: boolean; data?: T; message?: string };
type Provider = { providerKey: string; baseUrl?: string; accountReference?: string; credentialsConfigured?: boolean; secretName?: string; status?: string; configuration_only?: boolean };
type Template = { id: number | string; name: string; language: string; content: string; subject?: string };
type TemplateSelection = Record<string, number | null>;
type NotificationSettings = { smsTemplateIds?: Record<string, number | string | null>; emailTemplateIds?: Record<string, number | string | null> };

const languages: LogisticsLanguage[] = ['en', 'fa', 'ar', 'tr'];
const languageNames: Record<LogisticsLanguage, string> = { en: 'English', fa: 'فارسی', ar: 'العربية', tr: 'Türkçe' };
const readJson = async <T,>(response: Response): Promise<ApiResult<T>> => response.json().catch(() => ({}));
const providerLabel = (key: string, t: Translator) => {
  const labels: Record<string, string> = {
    iran_post: t('providerIranPost'),
    iranpost: t('providerIranPost'),
    mahex: t('providerMahex'),
    tipax: t('providerTipax'),
  };
  return labels[key.toLowerCase()] || key;
};
const normalizeTemplateMap = (map?: Record<string, number | string | null>): TemplateSelection =>
  Object.fromEntries(Object.entries(map || {}).map(([key, value]) => [key, value == null || value === '' ? null : Number(value)])) as TemplateSelection;

export default function CustomerNotificationSettings({ t, direction = 'ltr' }: Props) {
  const [channels, setChannels] = useState({ email: true, sms: false, whatsapp: false });
  const [providers, setProviders] = useState<Provider[]>([]);
  const [options, setOptions] = useState<{ smsTemplates: Template[]; emailTemplates: Template[]; defaultSmsTexts?: Record<string, string>; defaultEmailSubjects?: Record<string, string>; defaultEmailTexts?: Record<string, string> }>({ smsTemplates: [], emailTemplates: [] });
  const [templateSettings, setTemplateSettings] = useState<NotificationSettings>({});
  const [providerDrafts, setProviderDrafts] = useState<Record<string, { baseUrl: string; accountReference: string }>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState('');
  const [preview, setPreview] = useState<{ title: string; text: string } | null>(null);

  const request = async <T,>(url: string, init?: RequestInit) => {
    const response = await fetch(url, { credentials: 'include', ...init });
    const result = await readJson<T>(response);
    if (!response.ok || result.success === false) throw new Error(result.message || t('notificationSettingsLoadError'));
    return result.data as T;
  };

  const load = async () => {
    setLoading(true); setLoadError('');
    try {
      const [providerData, notificationData, optionData, channelData] = await Promise.all([
        request<Provider[]>('/api/admin/logistics/postal-api-settings'),
        request<NotificationSettings>('/api/admin/logistics/delivery-notification-settings'),
        request<{ smsTemplates?: Template[]; emailTemplates?: Template[]; defaultSmsTexts?: Record<string, string>; defaultEmailSubjects?: Record<string, string>; defaultEmailTexts?: Record<string, string> }>('/api/admin/logistics/delivery-notification-options'),
        request<Array<{ settingKey?: string; settingValue?: string }>>('/api/admin/shop-settings/logistics_notifications'),
      ]);
      setProviders(providerData || []);
      setTemplateSettings({
        smsTemplateIds: normalizeTemplateMap(notificationData?.smsTemplateIds),
        emailTemplateIds: normalizeTemplateMap(notificationData?.emailTemplateIds),
      });
      setOptions({
        smsTemplates: optionData?.smsTemplates || [],
        emailTemplates: optionData?.emailTemplates || [],
        defaultSmsTexts: optionData?.defaultSmsTexts || {},
        defaultEmailSubjects: optionData?.defaultEmailSubjects || {},
        defaultEmailTexts: optionData?.defaultEmailTexts || {},
      });
      setProviderDrafts(Object.fromEntries((providerData || []).map((item) => [item.providerKey, { baseUrl: item.baseUrl || '', accountReference: item.accountReference || '' }])));
      setChannels({
        email: channelData?.find((item) => item.settingKey === 'logistics_notification_email')?.settingValue !== 'false',
        sms: channelData?.find((item) => item.settingKey === 'logistics_notification_sms')?.settingValue === 'true',
        whatsapp: channelData?.find((item) => item.settingKey === 'logistics_notification_whatsapp')?.settingValue === 'true',
      });
    } catch (error) { setLoadError(error instanceof Error ? error.message : t('notificationSettingsLoadError')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const updateChannel = async (channel: 'email' | 'sms' | 'whatsapp', checked: boolean) => {
    const key = `logistics_notification_${channel}`;
    setChannels((current) => ({ ...current, [channel]: checked })); setSaving(key);
    try {
      await request(`/api/admin/shop-settings/${key}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ setting_value: String(checked) }) });
      setFeedback({ kind: 'success', text: t('settingsSaved') });
    } catch (error) {
      setChannels((current) => ({ ...current, [channel]: !checked }));
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : t('settingsSaveError') });
    } finally { setSaving(''); }
  };
  const saveProvider = async (providerKey: string) => {
    setSaving(providerKey);
    try {
      const updated = await request<Provider>(`/api/admin/logistics/postal-api-settings/${encodeURIComponent(providerKey)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(providerDrafts[providerKey]) });
      if (updated) {
        setProviders((current) => current.map((item) => item.providerKey === providerKey ? { ...item, ...updated } : item));
        setProviderDrafts((current) => ({ ...current, [providerKey]: { baseUrl: updated.baseUrl || '', accountReference: updated.accountReference || '' } }));
      }
      setFeedback({ kind: 'success', text: t('carrierSettingsSaved') });
    } catch (error) { setFeedback({ kind: 'error', text: error instanceof Error ? error.message : t('carrierSettingsSaveError') }); }
    finally { setSaving(''); }
  };
  const saveTemplates = async () => {
    setSaving('templates');
    try {
      const payload = {
        smsTemplateIds: normalizeTemplateMap(templateSettings.smsTemplateIds),
        emailTemplateIds: normalizeTemplateMap(templateSettings.emailTemplateIds),
      };
      await request('/api/admin/logistics/delivery-notification-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setFeedback({ kind: 'success', text: t('templatesSaved') });
    } catch (error) { setFeedback({ kind: 'error', text: error instanceof Error ? error.message : t('templatesSaveError') }); }
    finally { setSaving(''); }
  };
  const templateFor = (type: 'sms' | 'email', lang: LogisticsLanguage) => {
    const list = type === 'sms' ? options.smsTemplates : options.emailTemplates;
    const selected = (type === 'sms' ? templateSettings.smsTemplateIds : templateSettings.emailTemplateIds)?.[lang];
    if (selected == null || selected === '') {
      if (type === 'sms') {
        const defaultText = options.defaultSmsTexts?.[lang];
        return defaultText ? { id: 'default', name: t('useDefault'), language: lang, content: defaultText } : undefined;
      }
      return {
        id: 'default',
        name: t('useDefault'),
        language: lang,
        subject: options.defaultEmailSubjects?.[lang] || t('defaultEmailSubjectUnavailable'),
        content: options.defaultEmailTexts?.[lang] || t('defaultEmailUnavailable'),
      };
    }
    return list.find((item) => Number(item.id) === Number(selected) && item.language === lang);
  };
const grouped = useMemo(() => ({ sms: options.smsTemplates, email: options.emailTemplates }), [options]);

  if (loading) return <div className="grid gap-4 md:grid-cols-2" dir={direction}><div className="h-32 animate-pulse rounded-2xl bg-[#e6efeb]" /><div className="h-32 animate-pulse rounded-2xl bg-[#e6efeb]" /><div className="h-52 animate-pulse rounded-2xl bg-[#e6efeb] md:col-span-2" /></div>;
  if (loadError) return <div className="rounded-2xl border border-[#e7c9c2] bg-[#fff5f2] p-5 text-[#914d40]" dir={direction}><div className="flex items-start gap-3"><TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">{t('notificationSettingsLoadError')}</p><p className="mt-1 text-sm">{loadError}</p><button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-[#286b53] px-4 py-2 text-sm font-semibold text-white">{t('retry')}</button></div></div></div>;

  const channelItems = [{ key: 'email' as const, icon: Mail, label: t('email'), description: t('sendByEmail') }, { key: 'sms' as const, icon: Phone, label: t('sms'), description: t('sendBySms') }, { key: 'whatsapp' as const, icon: Send, label: t('whatsapp'), description: t('sendByWhatsapp') }];
  return <div className="space-y-6" dir={direction}>
    {feedback && <div role="status" className={`rounded-xl border p-3 text-sm ${feedback.kind === 'success' ? 'border-[#c4dfcf] bg-[#eef9f1] text-[#327353]' : 'border-[#e7c9c2] bg-[#fff3f0] text-[#914d40]'}`}>{feedback.text}</div>}
    <section className="overflow-hidden rounded-[1.5rem] border border-[#cddbd6] bg-[#f8fbf9] shadow-[0_20px_50px_-35px_rgba(24,61,54,0.7)]">
      <header className="border-b border-[#dce8e2] bg-[#edf5f0] px-5 py-5 md:px-7"><div className="flex items-start gap-3"><div className="rounded-2xl bg-[#d5e9de] p-3 text-[#2d7058]"><Mail className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold text-[#183d36]">{t('customerNotifications')}</h2><p className="mt-1 text-sm text-[#648078]">{t('notificationDescription')}</p></div></div></header>
      <div className="space-y-7 p-5 md:p-7">
        <div className="grid gap-3 md:grid-cols-3">{channelItems.map(({ key, icon: Icon, label, description }) => <div key={key} className="flex items-center justify-between rounded-2xl border border-[#dbe7e1] bg-white p-4"><div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-[#e5f1eb] p-2 text-[#327353]"><Icon className="h-4 w-4" /></div><div><h3 className="font-medium text-[#264c43]">{label}</h3><p className="text-xs leading-5 text-[#71857e]">{description}</p></div></div><Switch checked={channels[key]} disabled={saving === `logistics_notification_${key}`} onCheckedChange={(checked) => void updateChannel(key, checked)} aria-label={label} /></div>)}</div>
        <div className="flex items-start gap-2 rounded-xl border border-[#ecd9b9] bg-[#fff8eb] p-3 text-sm text-[#8c632f]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{t('deliveryCodeTemplateScope')}</span></div>
      </div>
    </section>
    <section className="rounded-[1.5rem] border border-[#cddbd6] bg-[#f8fbf9] p-5 shadow-[0_20px_50px_-35px_rgba(24,61,54,0.7)] md:p-7"><div className="mb-5 flex items-start gap-3"><div className="rounded-2xl bg-[#e8e2d5] p-3 text-[#8c632f]"><Server className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold text-[#183d36]">{t('carrierApiConfiguration')}</h2><p className="mt-1 text-sm text-[#648078]">{t('carrierApiConfigurationDescription')}</p></div></div>
      <div className="space-y-4">{providers.length === 0 && <p className="rounded-xl bg-white p-4 text-sm text-[#71857e]">{t('noCarrierProviders')}</p>}{providers.map((provider) => <div key={provider.providerKey} className="rounded-2xl border border-[#dbe7e1] bg-white p-4 md:p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-[#264c43]">{providerLabel(provider.providerKey, t)}</h3><p className="mt-1 text-xs text-[#71857e]">{t('configurationOnly')}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-[#fff8eb] px-3 py-1 text-xs font-medium text-[#8c632f]"><KeyRound className="h-3.5 w-3.5" />{provider.credentialsConfigured ? t('credentialsConfigured') : t('credentialsNotConfigured')}</span></div><div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-medium text-[#688078]">{t('baseUrl')}<input value={providerDrafts[provider.providerKey]?.baseUrl || ''} onChange={(e) => setProviderDrafts((current) => ({ ...current, [provider.providerKey]: { ...current[provider.providerKey], baseUrl: e.target.value } }))} className="mt-1 h-11 w-full rounded-xl border border-[#d5e1dc] px-3 text-sm text-[#264c43] outline-none focus:border-[#3b8068] focus:ring-2 focus:ring-[#cde6d9]" /></label><label className="text-xs font-medium text-[#688078]">{t('accountReference')}<input value={providerDrafts[provider.providerKey]?.accountReference || ''} onChange={(e) => setProviderDrafts((current) => ({ ...current, [provider.providerKey]: { ...current[provider.providerKey], accountReference: e.target.value } }))} className="mt-1 h-11 w-full rounded-xl border border-[#d5e1dc] px-3 text-sm text-[#264c43] outline-none focus:border-[#3b8068] focus:ring-2 focus:ring-[#cde6d9]" /></label></div><p className="mt-3 text-xs text-[#71857e]">{t('secretConfigureInstruction')} {provider.secretName || t('secretNameUnavailable')}</p><button type="button" onClick={() => void saveProvider(provider.providerKey)} disabled={saving === provider.providerKey} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#286b53] px-4 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving === provider.providerKey ? t('saving') : t('save')}</button></div>)}</div>
    </section>
    <section className="rounded-[1.5rem] border border-[#cddbd6] bg-[#f8fbf9] p-5 shadow-[0_20px_50px_-35px_rgba(24,61,54,0.7)] md:p-7"><div className="mb-5"><h2 className="text-xl font-semibold text-[#183d36]">{t('deliveryCodeTemplates')}</h2><p className="mt-1 text-sm text-[#648078]">{t('deliveryCodeTemplatesDescription')}</p></div><div className="grid gap-5 lg:grid-cols-2">{(['sms', 'email'] as const).map((type) => <div key={type} className="rounded-2xl border border-[#dbe7e1] bg-white p-4"><h3 className="mb-4 flex items-center gap-2 font-semibold text-[#264c43]">{type === 'sms' ? <Phone className="h-4 w-4 text-[#327353]" /> : <Mail className="h-4 w-4 text-[#327353]" />}{type === 'sms' ? t('smsTemplate') : t('emailTemplate')}</h3><div className="space-y-4">{languages.map((lang) => { const list = grouped[type].filter((item) => item.language === lang); const selected = (type === 'sms' ? templateSettings.smsTemplateIds : templateSettings.emailTemplateIds)?.[lang]; const chosen = templateFor(type, lang); return <div key={lang}><label className="text-xs font-medium text-[#688078]">{languageNames[lang]}<select value={selected ?? ''} onChange={(e) => setTemplateSettings((current) => ({ ...current, [type === 'sms' ? 'smsTemplateIds' : 'emailTemplateIds']: { ...(type === 'sms' ? current.smsTemplateIds : current.emailTemplateIds), [lang]: e.target.value } }))} className="mt-1 h-11 w-full rounded-xl border border-[#d5e1dc] bg-white px-3 text-sm text-[#264c43] outline-none focus:border-[#3b8068] focus:ring-2 focus:ring-[#cde6d9]"><option value="">{t('useDefault')}</option>{list.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{chosen && <div className="mt-2 rounded-xl bg-[#f1f7f3] p-3 text-xs leading-5 text-[#52746a]"><div className="flex items-center justify-between gap-2"><span className="font-medium">{chosen.subject || t('preview')}</span><button type="button" onClick={() => setPreview({ title: chosen.name, text: chosen.content })} className="inline-flex items-center gap-1 text-[#286b53] underline"><Eye className="h-3.5 w-3.5" />{t('preview')}</button></div><p className="mt-1 line-clamp-2">{chosen.content}</p></div>}</div>; })}</div></div>)}</div><button type="button" onClick={() => void saveTemplates()} disabled={saving === 'templates'} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#286b53] px-5 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving === 'templates' ? t('saving') : t('saveTemplates')}</button></section>
    {preview && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-[#183d36]/30 p-4" onClick={() => setPreview(null)}><div className="w-full max-w-lg rounded-2xl bg-[#f8fbf9] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-[#183d36]">{preview.title}</h2><p className="mt-1 text-xs text-[#71857e]">{t('preview')}</p></div><button type="button" onClick={() => setPreview(null)} className="text-sm text-[#52746a]">{t('close')}</button></div><p className="mt-5 whitespace-pre-wrap rounded-xl bg-white p-4 text-sm leading-6 text-[#264c43]">{preview.text}</p></div></div>}
  </div>;
}