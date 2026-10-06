import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Zap, RefreshCw, Trash2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/lib/i18n';

interface SyncStatus {
  kardexCount: number;
  shopCount: number;
  inSync: boolean;
  extraProducts: number;
  missingProducts: number;
}

interface SyncResult {
  added: number;
  updated: number;
  removed: number;
  addedToShop?: number;
}

interface KardexCopy {
  loading: string;
  errorTitle: string;
  errorDescription: string;
  title: string;
  description: string;
  kardex: string;
  shop: string;
  syncStatus: string;
  synced: string;
  notSynced: string;
  needsSync: string;
  missingProducts: (count: string) => string;
  extraProducts: (count: string) => string;
  smartSync: string;
  smartSyncing: string;
  fullRebuild: string;
  rebuilding: string;
  cleanupExtra: (count: string) => string;
  cleaning: string;
  cleanupDuplicates: string;
  cleaningDuplicates: string;
  help: string;
  smartSyncHelp: string;
  fullRebuildHelp: string;
  cleanupExtraHelp: string;
  cleanupDuplicatesHelp: string;
  smartSuccess: string;
  smartSuccessDescription: (added: string, updated: string, removed: string) => string;
  smartError: string;
  rebuildSuccess: string;
  rebuildSuccessDescription: (count: string) => string;
  rebuildError: string;
  cleanupSuccess: string;
  cleanupSuccessDescription: (count: string) => string;
  cleanupError: string;
  duplicateSuccess: string;
  duplicateSuccessDescription: (count: string) => string;
  duplicateError: string;
  tryAgain: string;
}

const kardexTranslations: Record<Language, KardexCopy> = {
  en: {
    loading: 'Checking synchronization status...',
    errorTitle: 'Unable to load synchronization status',
    errorDescription: 'The synchronization server could not be reached. Please sign in to the management system.',
    title: 'Kardex and Shop synchronization',
    description: 'Manage product synchronization between Kardex and the online shop.',
    kardex: 'Kardex',
    shop: 'Shop',
    syncStatus: 'Synchronization',
    synced: 'Synced',
    notSynced: 'Needs sync',
    needsSync: 'Synchronization needed',
    missingProducts: (count) => `${count} product${count === '1' ? '' : 's'} missing from the shop`,
    extraProducts: (count) => `${count} extra product${count === '1' ? '' : 's'} in the shop`,
    smartSync: 'Smart sync',
    smartSyncing: 'Syncing...',
    fullRebuild: 'Full rebuild',
    rebuilding: 'Rebuilding...',
    cleanupExtra: (count) => `Remove extra products (${count})`,
    cleaning: 'Removing...',
    cleanupDuplicates: 'Remove duplicate SKUs',
    cleaningDuplicates: 'Removing duplicates...',
    help: 'How it works',
    smartSyncHelp: 'Smart sync applies only the changes that are needed.',
    fullRebuildHelp: 'Full rebuild copies every Kardex product to the shop.',
    cleanupExtraHelp: 'Remove products from the shop that are not in Kardex.',
    cleanupDuplicatesHelp: 'Find and remove products that share the same SKU.',
    smartSuccess: 'Smart sync complete',
    smartSuccessDescription: (added, updated, removed) => `${added} added, ${updated} updated, ${removed} removed`,
    smartError: 'Smart sync failed',
    rebuildSuccess: 'Full rebuild complete',
    rebuildSuccessDescription: (count) => `${count} products copied from Kardex to the shop`,
    rebuildError: 'Full rebuild failed',
    cleanupSuccess: 'Extra products removed',
    cleanupSuccessDescription: (count) => `${count} products removed from the shop`,
    cleanupError: 'Could not remove extra products',
    duplicateSuccess: 'Duplicate SKUs removed',
    duplicateSuccessDescription: (count) => `${count} products with duplicate SKUs removed`,
    duplicateError: 'Could not remove duplicate products',
    tryAgain: 'Please try again.',
  },
  fa: {
    loading: 'در حال بررسی وضعیت همگام‌سازی...',
    errorTitle: 'بارگیری وضعیت همگام‌سازی ممکن نیست',
    errorDescription: 'امکان اتصال به سرور همگام‌سازی وجود ندارد. لطفاً وارد سیستم مدیریت شوید.',
    title: 'همگام‌سازی کاردکس و فروشگاه',
    description: 'همگام‌سازی محصولات بین سیستم کاردکس و فروشگاه آنلاین را مدیریت کنید.',
    kardex: 'کاردکس',
    shop: 'فروشگاه',
    syncStatus: 'همگام‌سازی',
    synced: 'همگام است',
    notSynced: 'نیازمند همگام‌سازی',
    needsSync: 'نیاز به همگام‌سازی',
    missingProducts: (count) => `${count} محصول در فروشگاه موجود نیست`,
    extraProducts: (count) => `${count} محصول اضافی در فروشگاه وجود دارد`,
    smartSync: 'همگام‌سازی هوشمند',
    smartSyncing: 'در حال همگام‌سازی...',
    fullRebuild: 'بازسازی کامل',
    rebuilding: 'در حال بازسازی...',
    cleanupExtra: (count) => `حذف محصولات اضافی (${count})`,
    cleaning: 'در حال حذف...',
    cleanupDuplicates: 'حذف SKUهای تکراری',
    cleaningDuplicates: 'در حال حذف تکراری‌ها...',
    help: 'راهنما',
    smartSyncHelp: 'همگام‌سازی هوشمند فقط تغییرات ضروری را اعمال می‌کند.',
    fullRebuildHelp: 'بازسازی کامل تمام محصولات کاردکس را به فروشگاه کپی می‌کند.',
    cleanupExtraHelp: 'محصولاتی را که در کاردکس نیستند از فروشگاه حذف می‌کند.',
    cleanupDuplicatesHelp: 'محصولاتی با SKU یکسان را شناسایی و حذف می‌کند.',
    smartSuccess: 'همگام‌سازی هوشمند انجام شد',
    smartSuccessDescription: (added, updated, removed) => `${added} اضافه، ${updated} به‌روزرسانی و ${removed} حذف شد`,
    smartError: 'خطا در همگام‌سازی هوشمند',
    rebuildSuccess: 'بازسازی کامل انجام شد',
    rebuildSuccessDescription: (count) => `${count} محصول از کاردکس به فروشگاه کپی شد`,
    rebuildError: 'خطا در بازسازی کامل',
    cleanupSuccess: 'محصولات اضافی حذف شدند',
    cleanupSuccessDescription: (count) => `${count} محصول از فروشگاه حذف شد`,
    cleanupError: 'حذف محصولات اضافی ممکن نیست',
    duplicateSuccess: 'SKUهای تکراری حذف شدند',
    duplicateSuccessDescription: (count) => `${count} محصول با SKU تکراری حذف شد`,
    duplicateError: 'حذف محصولات تکراری ممکن نیست',
    tryAgain: 'لطفاً مجدداً تلاش کنید.',
  },
  ar: {
    loading: 'جارٍ التحقق من حالة المزامنة...',
    errorTitle: 'تعذر تحميل حالة المزامنة',
    errorDescription: 'تعذر الاتصال بخادم المزامنة. يرجى تسجيل الدخول إلى نظام الإدارة.',
    title: 'مزامنة Kardex والمتجر',
    description: 'أدر مزامنة المنتجات بين نظام Kardex والمتجر الإلكتروني.',
    kardex: 'Kardex',
    shop: 'المتجر',
    syncStatus: 'المزامنة',
    synced: 'متزامن',
    notSynced: 'تحتاج إلى مزامنة',
    needsSync: 'تحتاج إلى مزامنة',
    missingProducts: (count) => `${count} منتج غير موجود في المتجر`,
    extraProducts: (count) => `${count} منتج إضافي في المتجر`,
    smartSync: 'مزامنة ذكية',
    smartSyncing: 'جارٍ المزامنة...',
    fullRebuild: 'إعادة بناء كاملة',
    rebuilding: 'جارٍ إعادة البناء...',
    cleanupExtra: (count) => `حذف المنتجات الإضافية (${count})`,
    cleaning: 'جارٍ الحذف...',
    cleanupDuplicates: 'حذف وحدات SKU المكررة',
    cleaningDuplicates: 'جارٍ حذف التكرارات...',
    help: 'طريقة العمل',
    smartSyncHelp: 'تطبق المزامنة الذكية التغييرات الضرورية فقط.',
    fullRebuildHelp: 'تنسخ إعادة البناء الكاملة جميع منتجات Kardex إلى المتجر.',
    cleanupExtraHelp: 'تحذف من المتجر المنتجات غير الموجودة في Kardex.',
    cleanupDuplicatesHelp: 'تبحث عن المنتجات التي تحمل SKU نفسه وتحذفها.',
    smartSuccess: 'اكتملت المزامنة الذكية',
    smartSuccessDescription: (added, updated, removed) => `تمت إضافة ${added} وتحديث ${updated} وحذف ${removed}`,
    smartError: 'فشلت المزامنة الذكية',
    rebuildSuccess: 'اكتملت إعادة البناء الكاملة',
    rebuildSuccessDescription: (count) => `تم نسخ ${count} منتجاً من Kardex إلى المتجر`,
    rebuildError: 'فشلت إعادة البناء الكاملة',
    cleanupSuccess: 'تم حذف المنتجات الإضافية',
    cleanupSuccessDescription: (count) => `تم حذف ${count} منتج من المتجر`,
    cleanupError: 'تعذر حذف المنتجات الإضافية',
    duplicateSuccess: 'تم حذف وحدات SKU المكررة',
    duplicateSuccessDescription: (count) => `تم حذف ${count} منتج بوحدات SKU مكررة`,
    duplicateError: 'تعذر حذف المنتجات المكررة',
    tryAgain: 'يرجى المحاولة مرة أخرى.',
  },
  tr: {
    loading: 'Senkronizasyon durumu kontrol ediliyor...',
    errorTitle: 'Senkronizasyon durumu yüklenemedi',
    errorDescription: 'Senkronizasyon sunucusuna ulaşılamıyor. Lütfen yönetim sistemine giriş yapın.',
    title: 'Kardex ve mağaza senkronizasyonu',
    description: 'Kardex ile çevrim içi mağaza arasındaki ürün senkronizasyonunu yönetin.',
    kardex: 'Kardex',
    shop: 'Mağaza',
    syncStatus: 'Senkronizasyon',
    synced: 'Senkronize',
    notSynced: 'Senkronizasyon gerekli',
    needsSync: 'Senkronizasyon gerekli',
    missingProducts: (count) => `Mağazada ${count} eksik ürün var`,
    extraProducts: (count) => `Mağazada ${count} fazla ürün var`,
    smartSync: 'Akıllı senkronizasyon',
    smartSyncing: 'Senkronize ediliyor...',
    fullRebuild: 'Tam yeniden oluşturma',
    rebuilding: 'Yeniden oluşturuluyor...',
    cleanupExtra: (count) => `Fazla ürünleri kaldır (${count})`,
    cleaning: 'Kaldırılıyor...',
    cleanupDuplicates: 'Yinelenen SKU’ları kaldır',
    cleaningDuplicates: 'Yinelenenler kaldırılıyor...',
    help: 'Nasıl çalışır?',
    smartSyncHelp: 'Akıllı senkronizasyon yalnızca gerekli değişiklikleri uygular.',
    fullRebuildHelp: 'Tam yeniden oluşturma, tüm Kardex ürünlerini mağazaya kopyalar.',
    cleanupExtraHelp: 'Kardex’te bulunmayan ürünleri mağazadan kaldırır.',
    cleanupDuplicatesHelp: 'Aynı SKU’ya sahip ürünleri bulur ve kaldırır.',
    smartSuccess: 'Akıllı senkronizasyon tamamlandı',
    smartSuccessDescription: (added, updated, removed) => `${added} eklendi, ${updated} güncellendi, ${removed} kaldırıldı`,
    smartError: 'Akıllı senkronizasyon başarısız',
    rebuildSuccess: 'Tam yeniden oluşturma tamamlandı',
    rebuildSuccessDescription: (count) => `${count} ürün Kardex’ten mağazaya kopyalandı`,
    rebuildError: 'Tam yeniden oluşturma başarısız',
    cleanupSuccess: 'Fazla ürünler kaldırıldı',
    cleanupSuccessDescription: (count) => `${count} ürün mağazadan kaldırıldı`,
    cleanupError: 'Fazla ürünler kaldırılamadı',
    duplicateSuccess: 'Yinelenen SKU’lar kaldırıldı',
    duplicateSuccessDescription: (count) => `${count} yinelenen SKU’lu ürün kaldırıldı`,
    duplicateError: 'Yinelenen ürünler kaldırılamadı',
    tryAgain: 'Lütfen tekrar deneyin.',
  },
};

const countLocales: Record<Language, string> = {
  en: 'en-US',
  fa: 'fa-IR',
  ar: 'ar-IQ',
  tr: 'tr-TR',
};

export function KardexSyncPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language, direction } = useLanguage();
  const copy = kardexTranslations[language];
  const formatCount = (count: number) => new Intl.NumberFormat(countLocales[language]).format(count);

  const getRefreshInterval = () => {
    const globalSettings = localStorage.getItem('global-refresh-settings');
    if (globalSettings) {
      const settings = JSON.parse(globalSettings);
      const inventorySettings = settings.departments.inventory;
      if (inventorySettings?.autoRefresh) {
        const refreshInterval = settings.syncEnabled ? settings.globalInterval : inventorySettings.interval;
        return refreshInterval * 1000;
      }
    }
    return 300000;
  };

  const getQuickRefreshDelay = () => Math.min(getRefreshInterval() / 10, 1000);

  const { data: syncStatus, isLoading: statusLoading, error: statusError } = useQuery({
    queryKey: ['/api/kardex-sync/status'],
    queryFn: () => apiRequest<{ data: SyncStatus }>('/api/kardex-sync/status'),
    refetchInterval: getRefreshInterval(),
    retry: false,
  });

  const refreshAfterMutation = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/kardex-sync/status'] });
    queryClient.invalidateQueries({ queryKey: ['/api/shop/products'] });
    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    setTimeout(() => {
      queryClient.refetchQueries({ queryKey: ['/api/kardex-sync/status'] });
    }, getQuickRefreshDelay());
    window.location.reload();
  };

  const smartSyncMutation = useMutation({
    mutationFn: () => apiRequest('/api/kardex-sync/smart-sync', { method: 'POST' }),
    onSuccess: (data) => {
      toast({
        title: copy.smartSuccess,
        description: copy.smartSuccessDescription(formatCount(data.data.added), formatCount(data.data.updated), formatCount(data.data.removed)),
      });
      refreshAfterMutation();
    },
    onError: () => toast({ title: copy.smartError, description: copy.tryAgain, variant: 'destructive' }),
  });

  const fullRebuildMutation = useMutation({
    mutationFn: () => apiRequest('/api/kardex-sync/full-rebuild', { method: 'POST' }),
    onSuccess: (data) => {
      toast({
        title: copy.rebuildSuccess,
        description: copy.rebuildSuccessDescription(formatCount(data.data.addedToShop ?? 0)),
      });
      refreshAfterMutation();
    },
    onError: () => toast({ title: copy.rebuildError, description: copy.tryAgain, variant: 'destructive' }),
  });

  const cleanupMutation = useMutation({
    mutationFn: () => apiRequest('/api/kardex-sync/cleanup-extra', { method: 'POST' }),
    onSuccess: (data) => {
      toast({
        title: copy.cleanupSuccess,
        description: copy.cleanupSuccessDescription(formatCount(data.data.deletedCount)),
      });
      refreshAfterMutation();
    },
    onError: () => toast({ title: copy.cleanupError, description: copy.tryAgain, variant: 'destructive' }),
  });

  const cleanupDuplicatesMutation = useMutation({
    mutationFn: () => apiRequest('/api/kardex-sync/cleanup-duplicates', { method: 'POST' }),
    onSuccess: (data) => {
      toast({
        title: copy.duplicateSuccess,
        description: copy.duplicateSuccessDescription(formatCount(data.data.deletedCount)),
      });
      console.log('🔍 [SKU-CLEANUP] Details:', data.data.duplicates);
      refreshAfterMutation();
    },
    onError: () => toast({ title: copy.duplicateError, description: copy.tryAgain, variant: 'destructive' }),
  });

  if (statusLoading) {
    return (
      <Card dir={direction}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            {copy.loading}
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (statusError || !syncStatus?.data) {
    return (
      <Card dir={direction}>
        <CardHeader>
          <CardTitle className="text-red-500">{copy.errorTitle}</CardTitle>
          <CardDescription>{copy.errorDescription}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { kardexCount, shopCount, inSync, extraProducts, missingProducts } = syncStatus.data;
  const formattedExtra = formatCount(extraProducts);
  const formattedMissing = formatCount(missingProducts);

  return (
    <Card dir={direction}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          {copy.title}
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg border p-3">
            <div className="text-2xl font-bold text-blue-600">{formatCount(kardexCount)}</div>
            <div className="text-sm text-gray-600">{copy.kardex}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-2xl font-bold text-green-600">{formatCount(shopCount)}</div>
            <div className="text-sm text-gray-600">{copy.shop}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className={`text-2xl font-bold ${inSync ? 'text-green-600' : 'text-red-600'}`}>
              {inSync ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600">{inSync ? copy.synced : copy.notSynced}</div>
          </div>
        </div>

        {!inSync && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="text-yellow-800">
              <strong>{copy.needsSync}:</strong>
              {missingProducts > 0 && <div>• {copy.missingProducts(formattedMissing)}</div>}
              {extraProducts > 0 && <div>• {copy.extraProducts(formattedExtra)}</div>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Button onClick={() => smartSyncMutation.mutate()} disabled={smartSyncMutation.isPending} className="w-full">
            {smartSyncMutation.isPending ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{copy.smartSyncing}</span>
            ) : (
              <span className="flex items-center gap-2"><Zap className="h-4 w-4" />{copy.smartSync}</span>
            )}
          </Button>
          <Button onClick={() => fullRebuildMutation.mutate()} disabled={fullRebuildMutation.isPending} variant="outline" className="w-full">
            {fullRebuildMutation.isPending ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{copy.rebuilding}</span>
            ) : (
              <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4" />{copy.fullRebuild}</span>
            )}
          </Button>
          {extraProducts > 0 && (
            <Button onClick={() => cleanupMutation.mutate()} disabled={cleanupMutation.isPending} variant="destructive" className="w-full">
              {cleanupMutation.isPending ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{copy.cleaning}</span>
              ) : (
                <span className="flex items-center gap-2"><Trash2 className="h-4 w-4" />{copy.cleanupExtra(formattedExtra)}</span>
              )}
            </Button>
          )}
          <Button onClick={() => cleanupDuplicatesMutation.mutate()} disabled={cleanupDuplicatesMutation.isPending} variant="outline" className="w-full">
            {cleanupDuplicatesMutation.isPending ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{copy.cleaningDuplicates}</span>
            ) : (
              <span className="flex items-center gap-2"><Trash2 className="h-4 w-4" />{copy.cleanupDuplicates}</span>
            )}
          </Button>
        </div>

        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
          <strong>{copy.help}:</strong>
          <ul className="mt-1 space-y-1">
            <li>• <strong>{copy.smartSync}:</strong> {copy.smartSyncHelp}</li>
            <li>• <strong>{copy.fullRebuild}:</strong> {copy.fullRebuildHelp}</li>
            <li>• <strong>{copy.cleanupExtra(formattedExtra).replace(` (${formattedExtra})`, '')}:</strong> {copy.cleanupExtraHelp}</li>
            <li>• <strong>{copy.cleanupDuplicates}:</strong> {copy.cleanupDuplicatesHelp}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}