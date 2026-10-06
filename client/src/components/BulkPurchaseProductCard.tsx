import { Fragment, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, Edit3, Plus, Trash2, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";

interface DiscountTier {
  minQty: number;
  discount: number;
}

interface BulkPurchaseProductCardProps {
  product: any;
  onUpdate: () => void;
}

type BulkLanguage = 'en' | 'ar' | 'tr' | 'fa';
type BulkTranslation = Partial<Record<BulkLanguage, string>>;

const BULK_TRANSLATIONS: Record<string, BulkTranslation> = {
  success: { en: 'Success', ar: 'نجاح', tr: 'Başarılı', fa: 'موفقیت' },
  error: { en: 'Error', ar: 'خطأ', tr: 'Hata', fa: 'خطا' },
  updated: { en: 'Bulk purchase settings updated successfully', ar: 'تم تحديث إعدادات الشراء بالجملة بنجاح', tr: 'Toplu alım ayarları başarıyla güncellendi', fa: 'تنظیمات خرید عمده با موفقیت به‌روزرسانی شد' },
  updateFailed: { en: 'Failed to update bulk purchase settings', ar: 'تعذر تحديث إعدادات الشراء بالجملة', tr: 'Toplu alım ayarları güncellenemedi', fa: 'به‌روزرسانی تنظیمات خرید عمده ناموفق بود' },
  validation: { en: 'Validation Error', ar: 'خطأ في التحقق', tr: 'Doğrulama Hatası', fa: 'خطای اعتبارسنجی' },
  validQuantity: { en: 'Please enter a valid minimum quantity for bulk purchases', ar: 'يرجى إدخال حد أدنى صالح لكمية الشراء بالجملة', tr: 'Lütfen toplu alımlar için geçerli bir minimum miktar girin', fa: 'لطفاً حداقل مقدار معتبر برای خرید عمده وارد کنید' },
  validTiers: { en: 'Discount tiers must have valid quantity (>0) and discount (1-100%)', ar: 'يجب أن تحتوي مستويات الخصم على كمية صالحة (>0) وخصم (1-100%)', tr: 'İndirim kademeleri geçerli miktar (>0) ve indirim (%1-100) içermelidir', fa: 'سطوح تخفیف باید مقدار معتبر (>۰) و تخفیف (۱ تا ۱۰۰٪) داشته باشند' },
  enabled: { en: 'Bulk Enabled', ar: 'الشراء بالجملة مفعّل', tr: 'Toplu Alım Etkin', fa: 'خرید عمده فعال' },
  disabled: { en: 'Bulk Disabled', ar: 'الشراء بالجملة معطّل', tr: 'Toplu Alım Devre Dışı', fa: 'خرید عمده غیرفعال' },
  edit: { en: 'Edit', ar: 'تعديل', tr: 'Düzenle', fa: 'ویرایش' },
  sku: { en: 'SKU', ar: 'رمز المنتج', tr: 'SKU', fa: 'شناسه کالا' },
  unitPrice: { en: 'Unit Price', ar: 'سعر الوحدة', tr: 'Birim Fiyat', fa: 'قیمت واحد' },
  stock: { en: 'Stock', ar: 'المخزون', tr: 'Stok', fa: 'موجودی' },
  category: { en: 'Category', ar: 'الفئة', tr: 'Kategori', fa: 'دسته‌بندی' },
  notAvailable: { en: 'N/A', ar: 'غير متوفر', tr: 'Yok', fa: 'ناموجود' },
  enable: { en: 'Enable Bulk Purchases', ar: 'تفعيل الشراء بالجملة', tr: 'Toplu Alımları Etkinleştir', fa: 'فعال‌سازی خرید عمده' },
  enableHint: { en: 'When enabled, general discounts will NOT apply. Only bulk-specific discounts below will be used.', ar: 'عند التفعيل، لن تنطبق الخصومات العامة. ستُستخدم خصومات الشراء بالجملة أدناه فقط.', tr: 'Etkinleştirildiğinde genel indirimler uygulanmaz. Yalnızca aşağıdaki toplu alım indirimleri kullanılır.', fa: 'با فعال‌سازی، تخفیف‌های عمومی اعمال نمی‌شوند و فقط تخفیف‌های مخصوص خرید عمده زیر استفاده خواهند شد.' },
  minimumQuantity: { en: 'Minimum Quantity *', ar: 'الحد الأدنى للكمية *', tr: 'Minimum Miktar *', fa: 'حداقل مقدار *' },
  quantityPlaceholder: { en: 'e.g., 10', ar: 'مثال: 10', tr: 'örn. 10', fa: 'مثلاً ۱۰' },
  discountTiers: { en: 'Bulk Discount Tiers', ar: 'مستويات خصم الشراء بالجملة', tr: 'Toplu Alım İndirim Kademeleri', fa: 'سطوح تخفیف خرید عمده' },
  addTier: { en: 'Add Tier', ar: 'إضافة مستوى', tr: 'Kademe Ekle', fa: 'افزودن سطح' },
  tiersHint: { en: 'These discounts replace the general discount system for this product.', ar: 'تحل هذه الخصومات محل نظام الخصم العام لهذا المنتج.', tr: 'Bu indirimler, bu ürün için genel indirim sisteminin yerini alır.', fa: 'این تخفیف‌ها جایگزین سیستم تخفیف عمومی این محصول می‌شوند.' },
  minQty: { en: 'Min Qty', ar: 'الحد الأدنى', tr: 'Min. Miktar', fa: 'حداقل تعداد' },
  discountPercent: { en: 'Discount %', ar: 'الخصم %', tr: 'İndirim %', fa: 'تخفیف ٪' },
  description: { en: 'Bulk Purchase Description', ar: 'وصف الشراء بالجملة', tr: 'Toplu Alım Açıklaması', fa: 'توضیحات خرید عمده' },
  descriptionPlaceholder: { en: 'Describe bulk purchase benefits, discounts, or special terms...', ar: 'صِف مزايا الشراء بالجملة أو الخصومات أو الشروط الخاصة...', tr: 'Toplu alım avantajlarını, indirimleri veya özel koşulları açıklayın...', fa: 'مزایا، تخفیف‌ها یا شرایط ویژه خرید عمده را توضیح دهید...' },
  saving: { en: 'Saving...', ar: 'جارٍ الحفظ...', tr: 'Kaydediliyor...', fa: 'در حال ذخیره...' },
  save: { en: 'Save Changes', ar: 'حفظ التغييرات', tr: 'Değişiklikleri Kaydet', fa: 'ذخیره تغییرات' },
  cancel: { en: 'Cancel', ar: 'إلغاء', tr: 'İptal', fa: 'انصراف' },
  activeSummary: { en: 'Bulk purchases enabled with minimum quantity: {quantity}', ar: 'الشراء بالجملة مفعّل بحد أدنى للكمية: {quantity}', tr: 'Toplu alım etkin, minimum miktar: {quantity}', fa: 'خرید عمده با حداقل مقدار {quantity} فعال است' },
  tierSummary: { en: 'Bulk Discount Tiers:', ar: 'مستويات خصم الشراء بالجملة:', tr: 'Toplu Alım İndirim Kademeleri:', fa: 'سطوح تخفیف خرید عمده:' },
  unitsOff: { en: '{quantity}+ units: {discount}% off', ar: '{quantity}+ وحدة: خصم {discount}%', tr: '{quantity}+ birim: %{discount} indirim', fa: '{quantity}+ قلم: {discount}٪ تخفیف' },
};

export default function BulkPurchaseProductCard({ product, onUpdate }: BulkPurchaseProductCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [bulkEnabled, setBulkEnabled] = useState(product.bulkPurchaseEnabled || product.bulk_purchase_enabled || false);
  const [minimumQuantity, setMinimumQuantity] = useState(product.bulkPurchaseMinQuantity || product.bulk_purchase_minimum_quantity || product.bulk_purchase_min_quantity || "");
  const [description, setDescription] = useState(product.bulkPurchaseNotes || product.bulk_purchase_description || product.bulk_purchase_notes || "");
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const tr = (key: string, values: Record<string, string | number> = {}) => {
    const template = BULK_TRANSLATIONS[key]?.[language] || BULK_TRANSLATIONS[key]?.en || key;
    return Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), template);
  };
  const locale = language === 'fa' ? 'fa-IR' : language === 'ar' ? 'ar' : language === 'tr' ? 'tr-TR' : 'en-GB';
  const formatNumber = (value: number | string) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Number(value));

  const parseBulkDiscounts = (): DiscountTier[] => {
    let discounts = product.bulkPurchaseDiscounts || product.bulk_purchase_discounts;
    if (typeof discounts === 'string') {
      try { discounts = JSON.parse(discounts); } catch { discounts = []; }
    }
    if (Array.isArray(discounts) && discounts.length > 0) return discounts;
    return [{ minQty: 10, discount: 0.05 }];
  };

  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>(parseBulkDiscounts());

  const addDiscountTier = () => {
    const lastTier = discountTiers[discountTiers.length - 1];
    setDiscountTiers([...discountTiers, { 
      minQty: lastTier ? lastTier.minQty + 10 : 10, 
      discount: lastTier ? Math.min(lastTier.discount + 0.05, 0.5) : 0.05 
    }]);
  };

  const removeDiscountTier = (index: number) => {
    if (discountTiers.length <= 1) return;
    setDiscountTiers(discountTiers.filter((_, i) => i !== index));
  };

  const updateDiscountTier = (index: number, field: keyof DiscountTier, value: number) => {
    const updated = [...discountTiers];
    updated[index] = { ...updated[index], [field]: value };
    setDiscountTiers(updated);
  };

  const updateBulkPurchaseMutation = useMutation({
    mutationFn: async (data: {
      productId: number;
      bulk_purchase_enabled: boolean;
      bulk_purchase_minimum_quantity: number | null;
      bulk_purchase_description: string;
      bulk_purchase_discounts: DiscountTier[] | null;
    }) => {
      return await apiRequest(`/api/shop/products/${data.productId}/bulk-purchase`, {
        method: 'PUT',
        body: {
          bulk_purchase_enabled: data.bulk_purchase_enabled,
          bulk_purchase_minimum_quantity: data.bulk_purchase_minimum_quantity,
          bulk_purchase_description: data.bulk_purchase_description,
          bulk_purchase_discounts: data.bulk_purchase_discounts,
        },
      });
    },
    onSuccess: () => {
      setIsEditing(false);
      onUpdate();
      toast({
        title: tr('success'),
        description: tr('updated'),
      });
    },
    onError: (error: any) => {
      toast({
        title: tr('error'),
        description: error.message || tr('updateFailed'),
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const quantity = minimumQuantity ? parseInt(minimumQuantity) : null;
    
    if (bulkEnabled && (!quantity || quantity < 1)) {
      toast({
        title: tr('validation'),
        description: tr('validQuantity'),
        variant: "destructive",
      });
      return;
    }

    for (const tier of discountTiers) {
      if (tier.minQty < 1 || tier.discount <= 0 || tier.discount > 1) {
        toast({
          title: tr('validation'),
          description: tr('validTiers'),
          variant: "destructive",
        });
        return;
      }
    }

    const sortedTiers = [...discountTiers].sort((a, b) => a.minQty - b.minQty);

    updateBulkPurchaseMutation.mutate({
      productId: product.id,
      bulk_purchase_enabled: bulkEnabled,
      bulk_purchase_minimum_quantity: quantity,
      bulk_purchase_description: description,
      bulk_purchase_discounts: bulkEnabled ? sortedTiers : null,
    });
  };

  const handleCancel = () => {
    setBulkEnabled(product.bulkPurchaseEnabled || product.bulk_purchase_enabled || false);
    setMinimumQuantity(product.bulkPurchaseMinQuantity || product.bulk_purchase_minimum_quantity || product.bulk_purchase_min_quantity || "");
    setDescription(product.bulkPurchaseNotes || product.bulk_purchase_description || product.bulk_purchase_notes || "");
    setDiscountTiers(parseBulkDiscounts());
    setIsEditing(false);
  };

  const isBulkActive = product.bulkPurchaseEnabled || product.bulk_purchase_enabled;
  const savedMinimumQuantity = product.bulkPurchaseMinQuantity || product.bulk_purchase_minimum_quantity || product.bulk_purchase_min_quantity;

  return (
    <Fragment>
      <tr dir={direction} className={isEditing ? "bg-blue-50/50" : "hover:bg-slate-50"}>
        <td className="px-3 py-3">
          <div className="font-medium text-slate-900">{product.name}</div>
          <div className="mt-0.5 text-xs text-slate-500">{product.category || tr('notAvailable')}</div>
        </td>
        <td className="px-3 py-3 font-mono text-xs text-slate-600">{product.sku || tr('notAvailable')}</td>
        <td className="px-3 py-3 text-sm">{formatNumber(product.unitPrice || product.price || 0)}</td>
        <td className="px-3 py-3 text-sm">{formatNumber(product.stockQuantity || product.stock_quantity || 0)}</td>
        <td className="px-3 py-3">
          <Badge variant={isBulkActive ? "default" : "secondary"}>
            {isBulkActive ? tr('enabled') : tr('disabled')}
          </Badge>
        </td>
        <td className="px-3 py-3 text-sm">{savedMinimumQuantity ? formatNumber(savedMinimumQuantity) : "—"}</td>
        <td className="px-3 py-3 text-sm">
          {isBulkActive && discountTiers.length > 0
            ? discountTiers.map((tier) => `${formatNumber(tier.minQty)}+ / ${formatNumber(Math.round(tier.discount * 100))}%`).join("، ")
            : "—"}
        </td>
        <td className="px-3 py-3 text-end">
          <Button size="sm" variant="outline" onClick={() => isEditing ? handleCancel() : setIsEditing(true)}>
            <Edit3 className="me-1 h-4 w-4" />
            {isEditing ? tr('cancel') : tr('edit')}
          </Button>
        </td>
      </tr>

      {isEditing && (
        <tr dir={direction} className="bg-slate-50">
          <td colSpan={8} className="p-4">
            <div className="space-y-4 rounded-lg border border-blue-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor={`bulk-enabled-${product.id}`} className="text-sm font-medium">
                {tr('enable')}
              </Label>
              <p className="text-xs text-gray-500 mt-0.5">
                {tr('enableHint')}
              </p>
            </div>
            <Switch
              id={`bulk-enabled-${product.id}`}
              checked={bulkEnabled}
              onCheckedChange={setBulkEnabled}
              disabled={!isEditing}
            />
          </div>

          {bulkEnabled && (
            <>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor={`min-quantity-${product.id}`} className="text-sm font-medium">
                    {tr('minimumQuantity')}
                  </Label>
                  <Input
                    id={`min-quantity-${product.id}`}
                    type="number"
                    min="1"
                    placeholder={tr('quantityPlaceholder')}
                    value={minimumQuantity}
                    onChange={(e) => setMinimumQuantity(e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Percent className="w-4 h-4 text-purple-600" />
                    {tr('discountTiers')}
                  </Label>
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addDiscountTier}
                      className="text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {tr('addTier')}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {tr('tiersHint')}
                </p>

                <div className="space-y-2">
                  {discountTiers.map((tier, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex-1">
                         <Label className="text-xs text-gray-500">{tr('minQty')}</Label>
                        <Input
                          type="number"
                          min="1"
                          value={tier.minQty}
                          onChange={(e) => updateDiscountTier(index, 'minQty', parseInt(e.target.value) || 0)}
                          disabled={!isEditing}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                         <Label className="text-xs text-gray-500">{tr('discountPercent')}</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          value={Math.round(tier.discount * 100)}
                          onChange={(e) => updateDiscountTier(index, 'discount', (parseFloat(e.target.value) || 0) / 100)}
                          disabled={!isEditing}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex-shrink-0 pt-4">
                        {isEditing && discountTiers.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeDiscountTier(index)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor={`description-${product.id}`} className="text-sm font-medium">
                  {tr('description')}
                </Label>
                <Textarea
                  id={`description-${product.id}`}
                  placeholder={tr('descriptionPlaceholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!isEditing}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </>
          )}
          <div className="flex items-center gap-2 border-t pt-4">
            <Button
              onClick={handleSave}
              disabled={updateBulkPurchaseMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {updateBulkPurchaseMutation.isPending ? tr('saving') : tr('save')}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={updateBulkPurchaseMutation.isPending}
            >
              {tr('cancel')}
            </Button>
          </div>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
