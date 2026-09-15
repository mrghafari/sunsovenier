import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Loader2, Package, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface DeliveryMethod {
  id: number;
  value: string;
  label: string;
  icon: string;
  color: string;
  baseCost: string;
  estimatedDays: number;
  isActive: boolean;
  description: string | null;
}

const translations = {
  en: {
    title: 'Delivery service management',
    description: 'Active delivery methods are displayed to customers during checkout.',
    row: 'Row',
    service: 'Service',
    systemCode: 'System code',
    baseCost: 'Base cost',
    estimatedTime: 'Estimated time',
    details: 'Description',
    status: 'Status',
    action: 'Action',
    active: 'Active',
    inactive: 'Inactive',
    day: 'day',
    days: 'days',
    noDescription: 'No description',
    noServices: 'No delivery services have been defined.',
    noServicesHint: 'Delivery services are not currently available in the system.',
    loadingError: 'Unable to load delivery services',
    loadingErrorHint: 'Please sign in again and retry.',
    success: 'Success',
    updated: 'Delivery service status was updated.',
    error: 'Error',
    updateFailed: 'Unable to update delivery service status.',
  },
  fa: {
    title: 'مدیریت سرویس‌های ارسال',
    description: 'روش‌های ارسال فعال در صفحه پرداخت به مشتریان نمایش داده می‌شوند.',
    row: 'ردیف',
    service: 'سرویس',
    systemCode: 'کد سیستمی',
    baseCost: 'هزینه پایه',
    estimatedTime: 'زمان تقریبی',
    details: 'توضیحات',
    status: 'وضعیت',
    action: 'عملیات',
    active: 'فعال',
    inactive: 'غیرفعال',
    day: 'روز',
    days: 'روز',
    noDescription: 'بدون توضیحات',
    noServices: 'هیچ سرویس ارسالی تعریف نشده است.',
    noServicesHint: 'در حال حاضر سرویس ارسالی در سیستم موجود نیست.',
    loadingError: 'خطا در بارگذاری سرویس‌های ارسال',
    loadingErrorHint: 'لطفاً دوباره وارد سیستم شوید و تلاش کنید.',
    success: 'موفق',
    updated: 'وضعیت سرویس ارسال به‌روزرسانی شد.',
    error: 'خطا',
    updateFailed: 'به‌روزرسانی وضعیت سرویس ارسال انجام نشد.',
  },
  ar: {
    title: 'إدارة خدمات التوصيل',
    description: 'تظهر طرق التوصيل النشطة للعملاء أثناء إتمام الطلب.',
    row: 'الصف',
    service: 'الخدمة',
    systemCode: 'رمز النظام',
    baseCost: 'التكلفة الأساسية',
    estimatedTime: 'الوقت المتوقع',
    details: 'الوصف',
    status: 'الحالة',
    action: 'الإجراء',
    active: 'نشط',
    inactive: 'غير نشط',
    day: 'يوم',
    days: 'أيام',
    noDescription: 'لا يوجد وصف',
    noServices: 'لم يتم تعريف أي خدمات توصيل.',
    noServicesHint: 'خدمات التوصيل غير متوفرة حالياً في النظام.',
    loadingError: 'تعذر تحميل خدمات التوصيل',
    loadingErrorHint: 'يرجى تسجيل الدخول مرة أخرى والمحاولة.',
    success: 'نجاح',
    updated: 'تم تحديث حالة خدمة التوصيل.',
    error: 'خطأ',
    updateFailed: 'تعذر تحديث حالة خدمة التوصيل.',
  },
  tr: {
    title: 'Teslimat hizmeti yönetimi',
    description: 'Etkin teslimat yöntemleri ödeme sırasında müşterilere gösterilir.',
    row: 'Sıra',
    service: 'Hizmet',
    systemCode: 'Sistem kodu',
    baseCost: 'Temel ücret',
    estimatedTime: 'Tahmini süre',
    details: 'Açıklama',
    status: 'Durum',
    action: 'İşlem',
    active: 'Etkin',
    inactive: 'Devre dışı',
    day: 'gün',
    days: 'gün',
    noDescription: 'Açıklama yok',
    noServices: 'Tanımlanmış teslimat hizmeti yok.',
    noServicesHint: 'Teslimat hizmetleri şu anda sistemde mevcut değil.',
    loadingError: 'Teslimat hizmetleri yüklenemedi',
    loadingErrorHint: 'Lütfen yeniden giriş yapıp tekrar deneyin.',
    success: 'Başarılı',
    updated: 'Teslimat hizmetinin durumu güncellendi.',
    error: 'Hata',
    updateFailed: 'Teslimat hizmetinin durumu güncellenemedi.',
  },
} as const;

const DeliveryServicesTab = () => {
  const { language, direction } = useLanguage();
  const t = translations[language];
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deliveryMethodsData, isLoading, isError } = useQuery<DeliveryMethod[]>({
    queryKey: ['/api/logistics/delivery-methods'],
    retry: false,
  });
  const deliveryMethods = Array.isArray(deliveryMethodsData) ? deliveryMethodsData : [];

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ method, isActive }: { method: DeliveryMethod; isActive: boolean }) => {
      const response = await fetch(`/api/logistics/delivery-methods/${method.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: method.value,
          label: method.label,
          icon: method.icon,
          color: method.color,
          isActive,
        }),
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logistics/delivery-methods'] });
      toast({ title: t.success, description: t.updated });
    },
    onError: () => {
      toast({ title: t.error, description: t.updateFailed, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-500" /></div>;
  }

  if (isError) {
    return (
      <Card className="border-slate-300" dir={direction}>
        <CardContent className="py-12 text-center">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-rose-500" />
          <h3 className="font-semibold text-slate-900">{t.loadingError}</h3>
          <p className="mt-1 text-sm text-slate-500">{t.loadingErrorHint}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" dir={direction}>
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{t.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{t.description}</p>
      </div>

      {!deliveryMethods.length ? (
        <Card className="border-slate-300">
          <CardContent className="py-12 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h3 className="font-semibold text-slate-800">{t.noServices}</h3>
            <p className="mt-1 text-sm text-slate-500">{t.noServicesHint}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-slate-300 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[980px] text-xs">
                <TableHeader className="sticky top-0 z-10 bg-slate-700">
                  <TableRow className="border-slate-700 hover:bg-slate-700">
                    {[t.row, t.service, t.systemCode, t.baseCost, t.estimatedTime, t.details, t.status, t.action].map((label) => (
                      <TableHead key={label} className="h-9 border-e border-slate-600 px-3 text-start font-semibold text-slate-50">{label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryMethods.map((method, index) => (
                    <TableRow key={method.id} className="border-slate-200 odd:bg-slate-50 even:bg-white hover:bg-amber-50" data-testid={`card-delivery-${method.id}`}>
                      <TableCell className="border-e border-slate-200 px-3 py-2 font-mono text-slate-500">{index + 1}</TableCell>
                      <TableCell className="border-e border-slate-200 px-3 py-2 font-semibold text-slate-900">{method.label}</TableCell>
                      <TableCell className="border-e border-slate-200 px-3 py-2 font-mono text-slate-600">{method.value}</TableCell>
                      <TableCell className="border-e border-slate-200 px-3 py-2 font-mono whitespace-nowrap">{Number(method.baseCost || 0).toLocaleString()} IQD</TableCell>
                      <TableCell className="border-e border-slate-200 px-3 py-2 whitespace-nowrap">
                        {method.estimatedDays > 0 ? <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-slate-400" />{method.estimatedDays} {method.estimatedDays === 1 ? t.day : t.days}</span> : '—'}
                      </TableCell>
                      <TableCell className="max-w-[280px] whitespace-normal border-e border-slate-200 px-3 py-2 text-slate-600">{method.description || t.noDescription}</TableCell>
                      <TableCell className="border-e border-slate-200 px-3 py-2">
                        <Badge variant="outline" className={method.isActive ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-50 text-slate-500'}>
                          {method.isActive ? t.active : t.inactive}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={method.isActive}
                            onCheckedChange={(checked) => toggleActiveMutation.mutate({ method, isActive: checked })}
                            disabled={toggleActiveMutation.isPending}
                            data-testid={`switch-${method.id}`}
                          />
                          <span className="text-slate-600">{method.isActive ? t.active : t.inactive}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeliveryServicesTab;