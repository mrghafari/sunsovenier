import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Edit3, Loader2, Package, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface DeliveryMethod {
  id: number;
  value: string;
  label: string;
  icon: string | null;
  color: string | null;
  baseCost: string | number | null;
  costPerKg?: string | number | null;
  minimumOrder?: string | number | null;
  freeShippingThreshold?: string | number | null;
  estimatedDays: number | null;
  maxDistance?: number | null;
  availableAreas?: string[] | null;
  sortOrder?: number | null;
  isActive: boolean;
  description: string | null;
}

type FormState = {
  value: string; label: string; icon: string; color: string;
  baseCost: string; costPerKg: string; minimumOrder: string;
  freeShippingThreshold: string; estimatedDays: string; maxDistance: string;
  availableAreas: string; description: string; sortOrder: string; isActive: boolean;
};

const emptyForm: FormState = {
  value: '', label: '', icon: 'package', color: 'blue', baseCost: '0',
  costPerKg: '0', minimumOrder: '0', freeShippingThreshold: '',
  estimatedDays: '1', maxDistance: '', availableAreas: '', description: '',
  sortOrder: '0', isActive: true,
};

const translations = {
  en: {
    title: 'Delivery service management', description: 'Active delivery methods are displayed to customers during checkout.',
    row: 'Row', service: 'Service', systemCode: 'System code', baseCost: 'Base cost', estimatedTime: 'Estimated time',
    details: 'Description', status: 'Status', action: 'Action', active: 'Active', inactive: 'Inactive', day: 'day', days: 'days',
    noDescription: 'No description', noServices: 'No delivery services have been defined.', noServicesHint: 'Delivery services are not currently available in the system.',
    loadingError: 'Unable to load delivery services', loadingErrorHint: 'Please sign in again and retry.', success: 'Success',
    updated: 'Delivery service was updated.', statusUpdated: 'Delivery service status was updated.', error: 'Error',
    updateFailed: 'Unable to update delivery service.', edit: 'Edit', editTitle: 'Edit delivery service',
    editDescription: 'Update the complete catalog record. Optional fields may be left blank.', save: 'Save changes', cancel: 'Cancel',
    saving: 'Saving…', required: 'Required', optional: 'Optional', valueHelp: 'Stable code used by the system.',
    areasHelp: 'Comma-separated cities or service areas.', baseCostHelp: 'Currency amount in IQD.', daysHelp: 'Whole number of delivery days.',
    label: 'Customer-facing label', icon: 'Icon name', color: 'Color key', costPerKg: 'Cost per kg', minimumOrder: 'Minimum order',
    freeShippingThreshold: 'Free shipping threshold', estimatedDays: 'Estimated days', maxDistance: 'Maximum distance (km)',
    availableAreas: 'Available areas', descriptionLabel: 'Description', sortOrder: 'Sort order', enabled: 'Enabled',
    validation: 'System code and customer-facing label are required.', noValue: 'Enter a value.',
  },
  fa: {
    title: 'مدیریت سرویس‌های ارسال', description: 'روش‌های ارسال فعال در صفحه پرداخت به مشتریان نمایش داده می‌شوند.',
    row: 'ردیف', service: 'سرویس', systemCode: 'کد سیستمی', baseCost: 'هزینه پایه', estimatedTime: 'زمان تقریبی', details: 'توضیحات',
    status: 'وضعیت', action: 'عملیات', active: 'فعال', inactive: 'غیرفعال', day: 'روز', days: 'روز', noDescription: 'بدون توضیحات',
    noServices: 'هیچ سرویس ارسالی تعریف نشده است.', noServicesHint: 'در حال حاضر سرویس ارسالی در سیستم موجود نیست.',
    loadingError: 'خطا در بارگذاری سرویس‌های ارسال', loadingErrorHint: 'لطفاً دوباره وارد سیستم شوید و تلاش کنید.', success: 'موفق',
    updated: 'سرویس ارسال به‌روزرسانی شد.', statusUpdated: 'وضعیت سرویس ارسال به‌روزرسانی شد.', error: 'خطا',
    updateFailed: 'به‌روزرسانی سرویس ارسال انجام نشد.', edit: 'ویرایش', editTitle: 'ویرایش سرویس ارسال',
    editDescription: 'رکورد کامل کاتالوگ را ویرایش کنید. فیلدهای اختیاری می‌توانند خالی بمانند.', save: 'ذخیره تغییرات', cancel: 'انصراف',
    saving: 'در حال ذخیره…', required: 'الزامی', optional: 'اختیاری', valueHelp: 'کد ثابت مورد استفاده سیستم.',
    areasHelp: 'شهرها یا محدوده‌ها را با ویرگول جدا کنید.', baseCostHelp: 'مبلغ به دینار عراق.', daysHelp: 'تعداد کامل روزهای ارسال.',
    label: 'عنوان نمایشی برای مشتری', icon: 'نام آیکن', color: 'کلید رنگ', costPerKg: 'هزینه هر کیلو', minimumOrder: 'حداقل سفارش',
    freeShippingThreshold: 'آستانه ارسال رایگان', estimatedDays: 'روزهای تقریبی', maxDistance: 'حداکثر فاصله (کیلومتر)',
    availableAreas: 'محدوده‌های قابل ارائه', descriptionLabel: 'توضیحات', sortOrder: 'ترتیب نمایش', enabled: 'فعال',
    validation: 'کد سیستمی و عنوان نمایشی الزامی هستند.', noValue: 'یک مقدار وارد کنید.',
  },
  ar: {
    title: 'إدارة خدمات التوصيل', description: 'تظهر طرق التوصيل النشطة للعملاء أثناء إتمام الطلب.', row: 'الصف', service: 'الخدمة',
    systemCode: 'رمز النظام', baseCost: 'التكلفة الأساسية', estimatedTime: 'الوقت المتوقع', details: 'الوصف', status: 'الحالة',
    action: 'الإجراء', active: 'نشط', inactive: 'غير نشط', day: 'يوم', days: 'أيام', noDescription: 'لا يوجد وصف',
    noServices: 'لم يتم تعريف أي خدمات توصيل.', noServicesHint: 'خدمات التوصيل غير متوفرة حالياً في النظام.', loadingError: 'تعذر تحميل خدمات التوصيل',
    loadingErrorHint: 'يرجى تسجيل الدخول مرة أخرى والمحاولة.', success: 'نجاح', updated: 'تم تحديث خدمة التوصيل.',
    statusUpdated: 'تم تحديث حالة خدمة التوصيل.', error: 'خطأ', updateFailed: 'تعذر تحديث خدمة التوصيل.', edit: 'تعديل',
    editTitle: 'تعديل خدمة التوصيل', editDescription: 'حدّث سجل الكتالوج كاملاً. يمكن ترك الحقول الاختيارية فارغة.', save: 'حفظ التغييرات',
    cancel: 'إلغاء', saving: 'جارٍ الحفظ…', required: 'مطلوب', optional: 'اختياري', valueHelp: 'رمز ثابت يستخدمه النظام.',
    areasHelp: 'افصل المدن أو مناطق الخدمة بفواصل.', baseCostHelp: 'المبلغ بالدينار العراقي.', daysHelp: 'عدد صحيح لأيام التوصيل.',
    label: 'الاسم الظاهر للعميل', icon: 'اسم الأيقونة', color: 'مفتاح اللون', costPerKg: 'التكلفة لكل كغ', minimumOrder: 'الحد الأدنى للطلب',
    freeShippingThreshold: 'حد الشحن المجاني', estimatedDays: 'الأيام المتوقعة', maxDistance: 'أقصى مسافة (كم)', availableAreas: 'المناطق المتاحة',
    descriptionLabel: 'الوصف', sortOrder: 'ترتيب العرض', enabled: 'مفعّل', validation: 'رمز النظام والاسم الظاهر للعميل مطلوبان.', noValue: 'أدخل قيمة.',
  },
  tr: {
    title: 'Teslimat hizmeti yönetimi', description: 'Etkin teslimat yöntemleri ödeme sırasında müşterilere gösterilir.', row: 'Sıra', service: 'Hizmet',
    systemCode: 'Sistem kodu', baseCost: 'Temel ücret', estimatedTime: 'Tahmini süre', details: 'Açıklama', status: 'Durum',
    action: 'İşlem', active: 'Etkin', inactive: 'Devre dışı', day: 'gün', days: 'gün', noDescription: 'Açıklama yok',
    noServices: 'Tanımlanmış teslimat hizmeti yok.', noServicesHint: 'Teslimat hizmetleri şu anda sistemde mevcut değil.', loadingError: 'Teslimat hizmetleri yüklenemedi',
    loadingErrorHint: 'Lütfen yeniden giriş yapıp tekrar deneyin.', success: 'Başarılı', updated: 'Teslimat hizmeti güncellendi.',
    statusUpdated: 'Teslimat hizmetinin durumu güncellendi.', error: 'Hata', updateFailed: 'Teslimat hizmeti güncellenemedi.', edit: 'Düzenle',
    editTitle: 'Teslimat hizmetini düzenle', editDescription: 'Katalog kaydının tamamını güncelleyin. İsteğe bağlı alanlar boş bırakılabilir.', save: 'Değişiklikleri kaydet',
    cancel: 'İptal', saving: 'Kaydediliyor…', required: 'Zorunlu', optional: 'İsteğe bağlı', valueHelp: 'Sistem tarafından kullanılan sabit kod.',
    areasHelp: 'Şehirleri veya hizmet alanlarını virgülle ayırın.', baseCostHelp: 'Tutar IQD cinsindendir.', daysHelp: 'Tam teslimat günü sayısı.',
    label: 'Müşteriye görünen ad', icon: 'Simge adı', color: 'Renk anahtarı', costPerKg: 'Kg başına ücret', minimumOrder: 'Minimum sipariş',
    freeShippingThreshold: 'Ücretsiz kargo eşiği', estimatedDays: 'Tahmini gün', maxDistance: 'Maksimum mesafe (km)', availableAreas: 'Mevcut alanlar',
    descriptionLabel: 'Açıklama', sortOrder: 'Sıralama', enabled: 'Etkin', validation: 'Sistem kodu ve görünen ad zorunludur.', noValue: 'Bir değer girin.',
  },
} as const;

type DeliveryServicesLanguage = keyof typeof translations;

interface DeliveryServicesTabProps {
  language?: DeliveryServicesLanguage;
}

const localizedServiceNames: Record<string, Record<DeliveryServicesLanguage, string>> = {
  postal: {
    en: 'Postal service',
    fa: 'سرویس پستی',
    ar: 'الخدمة البريدية',
    tr: 'Posta hizmeti',
  },
  self_pickup: {
    en: 'Customer pickup',
    fa: 'تحویل حضوری',
    ar: 'استلام العميل',
    tr: 'Müşteri teslim alımı',
  },
  smart_vehicle: {
    en: 'Smart vehicle delivery',
    fa: 'ارسال هوشمند با خودرو',
    ar: 'التوصيل الذكي بالمركبة',
    tr: 'Akıllı araç teslimatı',
  },
  freight_collect: {
    en: 'Freight collect',
    fa: 'باربری پس‌کرایه',
    ar: 'الشحن عند الاستلام',
    tr: 'Alıcı ödemeli nakliye',
  },
};

const formFromMethod = (method: DeliveryMethod): FormState => ({
  value: method.value || '', label: method.label || '', icon: method.icon || 'package', color: method.color || 'blue',
  baseCost: String(method.baseCost ?? 0), costPerKg: String(method.costPerKg ?? 0), minimumOrder: String(method.minimumOrder ?? 0),
  freeShippingThreshold: method.freeShippingThreshold == null ? '' : String(method.freeShippingThreshold),
  estimatedDays: String(method.estimatedDays ?? 1), maxDistance: method.maxDistance == null ? '' : String(method.maxDistance),
  availableAreas: Array.isArray(method.availableAreas) ? method.availableAreas.join(', ') : '', description: method.description || '',
  sortOrder: String(method.sortOrder ?? 0), isActive: method.isActive,
});

const payloadFrom = (form: FormState) => ({
  value: form.value.trim(), label: form.label.trim(), icon: form.icon.trim(), color: form.color.trim(),
  baseCost: form.baseCost, costPerKg: form.costPerKg, minimumOrder: form.minimumOrder,
  freeShippingThreshold: form.freeShippingThreshold === '' ? null : form.freeShippingThreshold,
  estimatedDays: form.estimatedDays, maxDistance: form.maxDistance === '' ? null : form.maxDistance,
  availableAreas: form.availableAreas, description: form.description.trim() || null,
  sortOrder: form.sortOrder, isActive: form.isActive,
});

const DeliveryServicesTab = ({ language: pageLanguage }: DeliveryServicesTabProps) => {
  const { language: contextLanguage } = useLanguage();
  const language = (
    pageLanguage ||
    (contextLanguage in translations ? contextLanguage : 'en')
  ) as DeliveryServicesLanguage;
  const direction = language === 'fa' || language === 'ar' ? 'rtl' : 'ltr';
  const t = translations[language];
  const serviceName = (method: DeliveryMethod) =>
    localizedServiceNames[method.value]?.[language] || method.label;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<DeliveryMethod | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const { data: deliveryMethodsData, isLoading, isError } = useQuery<DeliveryMethod[]>({ queryKey: ['/api/logistics/delivery-methods'], retry: false });
  const deliveryMethods = Array.isArray(deliveryMethodsData) ? deliveryMethodsData : [];

  const updateMutation = useMutation({
    mutationFn: async ({ method, values }: { method: DeliveryMethod; values: FormState }) => {
      const response = await fetch(`/api/logistics/delivery-methods/${method.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadFrom(values)),
      });
      if (!response.ok) throw new Error('update failed');
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/logistics/delivery-methods'] });
      setEditing(null);
      toast({ title: t.success, description: variables.values.isActive !== editing?.isActive ? t.statusUpdated : t.updated });
    },
    onError: () => toast({ title: t.error, description: t.updateFailed, variant: 'destructive' }),
  });

  const openEdit = (method: DeliveryMethod) => { setEditing(method); setForm(formFromMethod(method)); };
  const updateField = (key: keyof FormState, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const save = () => {
    if (!form.value.trim() || !form.label.trim()) {
      toast({ title: t.error, description: t.validation, variant: 'destructive' });
      return;
    }
    if (editing) updateMutation.mutate({ method: editing, values: form });
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-500" /></div>;
  if (isError) return <Card className="border-slate-300" dir={direction}><CardContent className="py-12 text-center"><XCircle className="mx-auto mb-3 h-10 w-10 text-rose-500" /><h3 className="font-semibold text-slate-900">{t.loadingError}</h3><p className="mt-1 text-sm text-slate-500">{t.loadingErrorHint}</p></CardContent></Card>;

  const fields: { key: keyof FormState; label: string; help?: string; type?: string; required?: boolean }[] = [
    { key: 'value', label: t.systemCode, help: t.valueHelp, required: true }, { key: 'label', label: t.label, required: true },
    { key: 'icon', label: t.icon }, { key: 'color', label: t.color }, { key: 'baseCost', label: t.baseCost, help: t.baseCostHelp, type: 'number' },
    { key: 'costPerKg', label: t.costPerKg, type: 'number' }, { key: 'minimumOrder', label: t.minimumOrder, type: 'number' },
    { key: 'freeShippingThreshold', label: t.freeShippingThreshold, type: 'number' }, { key: 'estimatedDays', label: t.estimatedDays, help: t.daysHelp, type: 'number' },
    { key: 'maxDistance', label: t.maxDistance, type: 'number' }, { key: 'availableAreas', label: t.availableAreas, help: t.areasHelp },
    { key: 'sortOrder', label: t.sortOrder, type: 'number' },
  ];

  return (
    <div className="space-y-4" dir={direction}>
      <div><h2 className="text-xl font-semibold text-slate-900">{t.title}</h2><p className="mt-1 text-sm text-slate-500">{t.description}</p></div>
      {!deliveryMethods.length ? <Card className="border-slate-300"><CardContent className="py-12 text-center"><Package className="mx-auto mb-3 h-10 w-10 text-slate-300" /><h3 className="font-semibold text-slate-800">{t.noServices}</h3><p className="mt-1 text-sm text-slate-500">{t.noServicesHint}</p></CardContent></Card> : (
        <Card className="overflow-hidden border-slate-300 shadow-sm"><CardContent className="p-0"><div className="overflow-x-auto">
          <Table className="min-w-[1040px] text-xs"><TableHeader className="sticky top-0 z-10 bg-slate-700"><TableRow className="border-slate-700 hover:bg-slate-700">
            {[t.row, t.service, t.systemCode, t.baseCost, t.estimatedTime, t.details, t.status, t.action].map((label) => <TableHead key={label} className="h-9 border-e border-slate-600 px-3 text-start font-semibold text-slate-50">{label}</TableHead>)}
          </TableRow></TableHeader><TableBody>
            {deliveryMethods.map((method, index) => <TableRow key={method.id} className="border-slate-200 odd:bg-slate-50 even:bg-white hover:bg-amber-50" data-testid={`card-delivery-${method.id}`}>
              <TableCell className="border-e border-slate-200 px-3 py-2 font-mono text-slate-500">{index + 1}</TableCell>
              <TableCell className="border-e border-slate-200 px-3 py-2 font-semibold text-slate-900">{serviceName(method)}</TableCell>
              <TableCell className="border-e border-slate-200 px-3 py-2 font-mono text-slate-600">{method.value}</TableCell>
              <TableCell className="border-e border-slate-200 px-3 py-2 font-mono whitespace-nowrap">{Number(method.baseCost || 0).toLocaleString()} IQD</TableCell>
              <TableCell className="border-e border-slate-200 px-3 py-2 whitespace-nowrap">{method.estimatedDays && method.estimatedDays > 0 ? <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-slate-400" />{method.estimatedDays} {method.estimatedDays === 1 ? t.day : t.days}</span> : '—'}</TableCell>
              <TableCell className="max-w-[280px] whitespace-normal border-e border-slate-200 px-3 py-2 text-slate-600">{method.description || t.noDescription}</TableCell>
              <TableCell className="border-e border-slate-200 px-3 py-2"><Badge variant="outline" className={method.isActive ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-50 text-slate-500'}>{method.isActive ? t.active : t.inactive}</Badge></TableCell>
              <TableCell className="px-3 py-2"><div className="flex items-center gap-2">
                <Switch checked={method.isActive} onCheckedChange={(checked) => updateMutation.mutate({ method, values: { ...formFromMethod(method), isActive: checked } })} disabled={updateMutation.isPending} data-testid={`switch-${method.id}`} />
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => openEdit(method)} data-testid={`edit-delivery-${method.id}`}><Edit3 className="h-3.5 w-3.5" />{t.edit}</Button>
              </div></TableCell>
            </TableRow>)}
          </TableBody></Table>
        </div></CardContent></Card>
      )}
      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && !updateMutation.isPending && setEditing(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl" dir={direction}>
          <DialogHeader><DialogTitle>{t.editTitle}</DialogTitle><DialogDescription>{t.editDescription}</DialogDescription></DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
            {fields.map(({ key, label, help, type, required }) => <div key={key} className={key === 'availableAreas' ? 'sm:col-span-2' : ''}>
              <Label htmlFor={`delivery-${key}`} className="mb-1.5 flex items-center gap-1">{label}<span className="text-[10px] text-slate-400">({required ? t.required : t.optional})</span></Label>
              <Input id={`delivery-${key}`} type={type || 'text'} value={String(form[key])} onChange={(event) => updateField(key, event.target.value)} data-testid={`delivery-input-${key}`} />
              {help && <p className="mt-1 text-[11px] text-slate-500">{help}</p>}
            </div>)}
            <div className="sm:col-span-2"><Label htmlFor="delivery-description" className="mb-1.5 flex items-center gap-1">{t.descriptionLabel}<span className="text-[10px] text-slate-400">({t.optional})</span></Label><Textarea id="delivery-description" value={form.description} onChange={(event) => updateField('description', event.target.value)} rows={3} data-testid="delivery-input-description" /></div>
            <div className="flex items-center gap-3 sm:col-span-2"><Switch id="delivery-enabled" checked={form.isActive} onCheckedChange={(checked) => updateField('isActive', checked)} data-testid="delivery-input-isActive" /><Label htmlFor="delivery-enabled">{t.enabled}</Label></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={updateMutation.isPending} data-testid="delivery-cancel">{t.cancel}</Button><Button type="button" onClick={save} disabled={updateMutation.isPending} data-testid="delivery-save">{updateMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{updateMutation.isPending ? t.saving : t.save}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryServicesTab;