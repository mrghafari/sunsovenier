import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Calculator, 
  Scale, 
  MapPin, 
  Truck, 
  DollarSign, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  Settings,
  Package,
  Shield,
  Zap,
  Wallet
} from 'lucide-react';

interface AdvancedShippingRate {
  id: number;
  zone: string;
  serviceType: string;
  weightFrom: string;
  weightTo: string;
  price: string;
  pricePerExtraKg: string;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ShippingFeeConfig {
  id: number;
  feeType: string;
  feeMode: string;
  feeValue: string;
  labelFa: string;
  labelEn: string;
  description: string;
  minValue: string | null;
  maxValue: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const ZONES = [
  { value: 'city', label: 'شهر (بغداد)', icon: '🏙️' },
  { value: 'province', label: 'استان', icon: '📍' },
  { value: 'country', label: 'کشوری', icon: '🗺️' },
  { value: 'international', label: 'بین‌المللی', icon: '🌍' }
];

const SERVICE_TYPES = [
  { value: 'normal', label: 'عادی', icon: '📦', color: 'bg-gray-100 text-gray-700' },
  { value: 'fast', label: 'سریع', icon: '🚀', color: 'bg-blue-100 text-blue-700' },
  { value: 'express', label: 'فوری', icon: '⚡', color: 'bg-orange-100 text-orange-700' }
];

const FEE_TYPES = [
  { value: 'cod', label: 'پرداخت در محل', icon: Wallet },
  { value: 'insurance', label: 'بیمه محموله', icon: Shield },
  { value: 'express_multiplier', label: 'ضریب ارسال فوری', icon: Zap }
];

const FEE_MODES = [
  { value: 'fixed', label: 'مقدار ثابت (IQD)' },
  { value: 'percentage', label: 'درصدی (%)' },
  { value: 'multiplier', label: 'ضریب (x)' }
];

const localizedText: Record<'en' | 'ar' | 'tr', Record<string, string>> = {
  en: {
    'شهر (بغداد)': 'City (Baghdad)', 'استان': 'Province', 'کشوری': 'Domestic', 'بین‌المللی': 'International',
    'عادی': 'Standard', 'سریع': 'Fast', 'فوری': 'Express', 'پرداخت در محل': 'Cash on delivery',
    'بیمه محموله': 'Shipment insurance', 'ضریب ارسال فوری': 'Express shipping multiplier',
    'مقدار ثابت (IQD)': 'Fixed amount (IQD)', 'درصدی (%)': 'Percentage (%)', 'ضریب (x)': 'Multiplier (x)',
    'موفقیت': 'Success', 'خطا': 'Error', 'تنظیمات ذخیره شد': 'Settings saved',
    'خطا در ذخیره برخی تنظیمات': 'Some settings could not be saved', 'نرخ جدید ذخیره شد': 'New rate saved',
    'خطا در ذخیره نرخ': 'Could not save rate', 'نرخ به‌روزرسانی شد': 'Rate updated',
    'خطا در به‌روزرسانی': 'Could not update', 'نرخ حذف شد': 'Rate deleted',
    'تنظیمات هزینه به‌روزرسانی شد': 'Fee settings updated',
    'پارامترهای محاسبات سرویس پستی': 'Postal shipping calculation parameters',
    'مدیریت تمام فاکتورهای دخیل در محاسبه هزینه ارسال': 'Manage all factors used to calculate shipping costs',
    'نرخ‌های منطقه‌ای': 'Regional rates', 'هزینه‌های جانبی': 'Additional fees', 'تنظیمات عمومی': 'General settings',
    'نرخ‌های حمل بر اساس منطقه و سرویس': 'Shipping rates by zone and service',
    'قیمت‌گذاری بر اساس: منطقه مقصد × نوع سرویس × محدوده وزن': 'Pricing by: destination zone × service type × weight range',
    'افزودن نرخ جدید': 'Add rate', 'ویرایش نرخ': 'Edit rate', 'منطقه': 'Zone', 'نوع سرویس': 'Service type',
    'وزن از (کیلوگرم)': 'Weight from (kg)', 'وزن تا (کیلوگرم)': 'Weight to (kg)',
    'قیمت پایه (IQD)': 'Base price (IQD)', 'مثال: 15000': 'Example: 15000',
    'قیمت هر کیلو اضافی (IQD)': 'Price per extra kg (IQD)', 'مثال: 1000': 'Example: 1000',
    'حداقل روز تحویل': 'Minimum delivery days', 'حداکثر روز تحویل': 'Maximum delivery days',
    'فعال': 'Active', 'غیرفعال': 'Inactive', 'ذخیره تغییرات': 'Save changes', 'افزودن': 'Add',
    'انصراف': 'Cancel', 'در حال بارگذاری...': 'Loading...', 'نرخ': 'rates', 'سرویس': 'Service',
    'محدوده وزن': 'Weight range', 'هر کیلو اضافی': 'Each extra kg', 'زمان تحویل': 'Delivery time',
    'وضعیت': 'Status', 'عملیات': 'Actions', 'روز': 'days',
    'نرخی برای این منطقه تعریف نشده': 'No rates are defined for this zone',
    'تنظیمات هزینه‌های جانبی': 'Additional fee settings',
    'مدیریت هزینه‌های اضافی مانند پرداخت در محل، بیمه و ضریب ارسال فوری': 'Manage extra fees such as cash on delivery, insurance, and express shipping',
    'حداقل:': 'Minimum:', 'حداکثر:': 'Maximum:', 'ویرایش هزینه': 'Edit fee',
    'عنوان فارسی': 'Persian label', 'عنوان انگلیسی': 'English label', 'نوع محاسبه': 'Calculation type',
    'مقدار': 'Value', 'حداقل (IQD)': 'Minimum (IQD)', 'حداکثر (IQD)': 'Maximum (IQD)', 'توضیحات': 'Description',
    'تنظیمات عمومی محاسبات': 'General calculation settings',
    'پارامترهای پایه برای محاسبه وزن و هزینه': 'Core parameters for calculating weight and cost',
    'محاسبه وزن حجمی': 'Volumetric weight calculation',
    'وزن حجمی = (طول × عرض × ارتفاع) ÷ ضریب تقسیم': 'Volumetric weight = (length × width × height) ÷ divisor',
    'ضریب تقسیم (Volumetric Divisor)': 'Volumetric divisor',
    'استاندارد صنعت: 5000 (ابعاد به سانتی‌متر)': 'Industry standard: 5000 (dimensions in centimeters)',
    'مبدا ارسال': 'Shipping origin',
    'مبدأ حمل به‌صورت یکپارچه و معتبر در بخش جغرافیای لجستیک مدیریت می‌شود. برای جلوگیری از مغایرت، تنظیم مبدا را در اینجا تغییر ندهید.':
      'The validated shipping center is managed centrally in Logistics Geography. To avoid conflicting origins, do not configure it here.',
    'مدیریت مرکز ارسال در جغرافیای لجستیک': 'Manage shipping center in Logistics Geography',
    'کشور، استان و شهر پایه برای محاسبه منطقه': 'Base country, province, and city used to calculate the zone',
    'منطق انتخاب وزن قابل شارژ': 'Chargeable weight selection logic',
    'وزن قابل شارژ = MAX(وزن واقعی, وزن حجمی)': 'Chargeable weight = MAX(actual weight, volumetric weight)',
    'فرمول کلی محاسبه': 'Overall calculation formula', 'هزینه کل = ': 'Total cost = ',
    'قیمت پایه (بر اساس منطقه + سرویس + محدوده وزن)': 'Base price (by zone + service + weight range)',
    '+ (وزن اضافی × قیمت هر کیلو اضافی)': '+ (extra weight × price per extra kg)',
    '× ضریب ارسال فوری (اگر انتخاب شده)': '× express multiplier (if selected)',
    '+ هزینه پرداخت در محل (اگر انتخاب شده)': '+ cash-on-delivery fee (if selected)',
    '+ هزینه بیمه (اگر انتخاب شده)': '+ insurance fee (if selected)'
  },
  ar: {
    'شهر (بغداد)': 'المدينة (بغداد)', 'استان': 'المحافظة', 'کشوری': 'محلي', 'بین‌المللی': 'دولي',
    'عادی': 'عادي', 'سریع': 'سريع', 'فوری': 'سريع جداً', 'پرداخت در محل': 'الدفع عند الاستلام',
    'بیمه محموله': 'تأمين الشحنة', 'ضریب ارسال فوری': 'مضاعف الشحن السريع',
    'مقدار ثابت (IQD)': 'مبلغ ثابت (IQD)', 'درصدی (%)': 'نسبة مئوية (%)', 'ضریب (x)': 'مضاعف (x)',
    'موفقیت': 'نجاح', 'خطا': 'خطأ', 'تنظیمات ذخیره شد': 'تم حفظ الإعدادات',
    'خطا در ذخیره برخی تنظیمات': 'تعذر حفظ بعض الإعدادات', 'نرخ جدید ذخیره شد': 'تم حفظ السعر الجديد',
    'خطا در ذخیره نرخ': 'تعذر حفظ السعر', 'نرخ به‌روزرسانی شد': 'تم تحديث السعر',
    'خطا در به‌روزرسانی': 'تعذر التحديث', 'نرخ حذف شد': 'تم حذف السعر',
    'تنظیمات هزینه به‌روزرسانی شد': 'تم تحديث إعدادات الرسوم',
    'پارامترهای محاسبات سرویس پستی': 'معلمات حساب خدمات البريد',
    'مدیریت تمام فاکتورهای دخیل در محاسبه هزینه ارسال': 'إدارة جميع العوامل المستخدمة في حساب تكلفة الشحن',
    'نرخ‌های منطقه‌ای': 'أسعار المناطق', 'هزینه‌های جانبی': 'رسوم إضافية', 'تنظیمات عمومی': 'الإعدادات العامة',
    'نرخ‌های حمل بر اساس منطقه و سرویس': 'أسعار الشحن حسب المنطقة والخدمة',
    'قیمت‌گذاری بر اساس: منطقه مقصد × نوع سرویس × محدوده وزن': 'التسعير حسب: منطقة الوجهة × نوع الخدمة × نطاق الوزن',
    'افزودن نرخ جدید': 'إضافة سعر', 'ویرایش نرخ': 'تعديل السعر', 'منطقه': 'المنطقة', 'نوع سرویس': 'نوع الخدمة',
    'وزن از (کیلوگرم)': 'الوزن من (كغ)', 'وزن تا (کیلوگرم)': 'الوزن إلى (كغ)',
    'قیمت پایه (IQD)': 'السعر الأساسي (IQD)', 'مثال: 15000': 'مثال: 15000',
    'قیمت هر کیلو اضافی (IQD)': 'سعر كل كغ إضافي (IQD)', 'مثال: 1000': 'مثال: 1000',
    'حداقل روز تحویل': 'الحد الأدنى لأيام التسليم', 'حداکثر روز تحویل': 'الحد الأقصى لأيام التسليم',
    'فعال': 'نشط', 'غیرفعال': 'غير نشط', 'ذخیره تغییرات': 'حفظ التغييرات', 'افزودن': 'إضافة',
    'انصراف': 'إلغاء', 'در حال بارگذاری...': 'جارٍ التحميل...', 'نرخ': 'أسعار', 'سرویس': 'الخدمة',
    'محدوده وزن': 'نطاق الوزن', 'هر کیلو اضافی': 'كل كغ إضافي', 'زمان تحویل': 'مدة التسليم',
    'وضعیت': 'الحالة', 'عملیات': 'الإجراءات', 'روز': 'أيام',
    'نرخی برای این منطقه تعریف نشده': 'لا توجد أسعار محددة لهذه المنطقة',
    'تنظیمات هزینه‌های جانبی': 'إعدادات الرسوم الإضافية',
    'مدیریت هزینه‌های اضافی مانند پرداخت در محل، بیمه و ضریب ارسال فوری': 'إدارة الرسوم الإضافية مثل الدفع عند الاستلام والتأمين والشحن السريع',
    'حداقل:': 'الحد الأدنى:', 'حداکثر:': 'الحد الأقصى:', 'ویرایش هزینه': 'تعديل الرسوم',
    'عنوان فارسی': 'التسمية بالفارسية', 'عنوان انگلیسی': 'التسمية بالإنجليزية', 'نوع محاسبه': 'نوع الحساب',
    'مقدار': 'القيمة', 'حداقل (IQD)': 'الحد الأدنى (IQD)', 'حداکثر (IQD)': 'الحد الأقصى (IQD)', 'توضیحات': 'الوصف',
    'تنظیمات عمومی محاسبات': 'إعدادات الحساب العامة',
    'پارامترهای پایه برای محاسبه وزن و هزینه': 'المعلمات الأساسية لحساب الوزن والتكلفة',
    'محاسبه وزن حجمی': 'حساب الوزن الحجمي',
    'وزن حجمی = (طول × عرض × ارتفاع) ÷ ضریب تقسیم': 'الوزن الحجمي = (الطول × العرض × الارتفاع) ÷ معامل القسمة',
    'ضریب تقسیم (Volumetric Divisor)': 'معامل قسمة الوزن الحجمي',
    'استاندارد صنعت: 5000 (ابعاد به سانتی‌متر)': 'معيار الصناعة: 5000 (الأبعاد بالسنتيمتر)',
    'مبدا ارسال': 'مركز الشحن',
    'مبدأ حمل به‌صورت یکپارچه و معتبر در بخش جغرافیای لجستیک مدیریت می‌شود. برای جلوگیری از مغایرت، تنظیم مبدا را در اینجا تغییر ندهید.':
      'يُدار مركز الشحن المعتمد مركزياً ضمن جغرافيا الخدمات اللوجستية. لتجنب التعارض، لا تغيّر الإعدادات هنا.',
    'مدیریت مرکز ارسال در جغرافیای لجستیک': 'إدارة مركز الشحن في جغرافيا الخدمات اللوجستية',
    'کشور، استان و شهر پایه برای محاسبه منطقه': 'الدولة والمحافظة والمدينة الأساسية لحساب المنطقة',
    'منطق انتخاب وزن قابل شارژ': 'منطق تحديد الوزن المحتسب',
    'وزن قابل شارژ = MAX(وزن واقعی, وزن حجمی)': 'الوزن المحتسب = MAX(الوزن الفعلي، الوزن الحجمي)',
    'فرمول کلی محاسبه': 'صيغة الحساب العامة', 'هزینه کل = ': 'التكلفة الإجمالية = ',
    'قیمت پایه (بر اساس منطقه + سرویس + محدوده وزن)': 'السعر الأساسي (حسب المنطقة + الخدمة + نطاق الوزن)',
    '+ (وزن اضافی × قیمت هر کیلو اضافی)': '+ (الوزن الإضافي × سعر كل كغ إضافي)',
    '× ضریب ارسال فوری (اگر انتخاب شده)': '× معامل الشحن السريع (إن تم اختياره)',
    '+ هزینه پرداخت در محل (اگر انتخاب شده)': '+ رسوم الدفع عند الاستلام (إن تم اختيارها)',
    '+ هزینه بیمه (اگر انتخاب شده)': '+ رسوم التأمين (إن تم اختياره)'
  },
  tr: {
    'شهر (بغداد)': 'Şehir (Bağdat)', 'استان': 'İl', 'کشوری': 'Yurt içi', 'بین‌المللی': 'Uluslararası',
    'عادی': 'Standart', 'سریع': 'Hızlı', 'فوری': 'Ekspres', 'پرداخت در محل': 'Kapıda ödeme',
    'بیمه محموله': 'Gönderi sigortası', 'ضریب ارسال فوری': 'Ekspres kargo çarpanı',
    'مقدار ثابت (IQD)': 'Sabit tutar (IQD)', 'درصدی (%)': 'Yüzde (%)', 'ضریب (x)': 'Çarpan (x)',
    'موفقیت': 'Başarılı', 'خطا': 'Hata', 'تنظیمات ذخیره شد': 'Ayarlar kaydedildi',
    'خطا در ذخیره برخی تنظیمات': 'Bazı ayarlar kaydedilemedi', 'نرخ جدید ذخیره شد': 'Yeni ücret kaydedildi',
    'خطا در ذخیره نرخ': 'Ücret kaydedilemedi', 'نرخ به‌روزرسانی شد': 'Ücret güncellendi',
    'خطا در به‌روزرسانی': 'Güncelleme başarısız', 'نرخ حذف شد': 'Ücret silindi',
    'تنظیمات هزینه به‌روزرسانی شد': 'Ücret ayarları güncellendi',
    'پارامترهای محاسبات سرویس پستی': 'Posta hizmeti hesaplama parametreleri',
    'مدیریت تمام فاکتورهای دخیل در محاسبه هزینه ارسال': 'Kargo ücretinin hesaplanmasında kullanılan tüm etkenleri yönetin',
    'نرخ‌های منطقه‌ای': 'Bölgesel ücretler', 'هزینه‌های جانبی': 'Ek ücretler', 'تنظیمات عمومی': 'Genel ayarlar',
    'نرخ‌های حمل بر اساس منطقه و سرویس': 'Bölge ve hizmete göre kargo ücretleri',
    'قیمت‌گذاری بر اساس: منطقه مقصد × نوع سرویس × محدوده وزن': 'Fiyatlandırma: hedef bölge × hizmet türü × ağırlık aralığı',
    'افزودن نرخ جدید': 'Ücret ekle', 'ویرایش نرخ': 'Ücreti düzenle', 'منطقه': 'Bölge', 'نوع سرویس': 'Hizmet türü',
    'وزن از (کیلوگرم)': 'Başlangıç ağırlığı (kg)', 'وزن تا (کیلوگرم)': 'Bitiş ağırlığı (kg)',
    'قیمت پایه (IQD)': 'Temel ücret (IQD)', 'مثال: 15000': 'Örnek: 15000',
    'قیمت هر کیلو اضافی (IQD)': 'Ek kg başına ücret (IQD)', 'مثال: 1000': 'Örnek: 1000',
    'حداقل روز تحویل': 'En az teslimat günü', 'حداکثر روز تحویل': 'En çok teslimat günü',
    'فعال': 'Etkin', 'غیرفعال': 'Devre dışı', 'ذخیره تغییرات': 'Değişiklikleri kaydet', 'افزودن': 'Ekle',
    'انصراف': 'İptal', 'در حال بارگذاری...': 'Yükleniyor...', 'نرخ': 'ücret', 'سرویس': 'Hizmet',
    'محدوده وزن': 'Ağırlık aralığı', 'هر کیلو اضافی': 'Ek kg başına', 'زمان تحویل': 'Teslimat süresi',
    'وضعیت': 'Durum', 'عملیات': 'İşlemler', 'روز': 'gün',
    'نرخی برای این منطقه تعریف نشده': 'Bu bölge için ücret tanımlanmamış',
    'تنظیمات هزینه‌های جانبی': 'Ek ücret ayarları',
    'مدیریت هزینه‌های اضافی مانند پرداخت در محل، بیمه و ضریب ارسال فوری': 'Kapıda ödeme, sigorta ve ekspres kargo gibi ek ücretleri yönetin',
    'حداقل:': 'En az:', 'حداکثر:': 'En çok:', 'ویرایش هزینه': 'Ücreti düzenle',
    'عنوان فارسی': 'Farsça etiket', 'عنوان انگلیسی': 'İngilizce etiket', 'نوع محاسبه': 'Hesaplama türü',
    'مقدار': 'Değer', 'حداقل (IQD)': 'En az (IQD)', 'حداکثر (IQD)': 'En çok (IQD)', 'توضیحات': 'Açıklama',
    'تنظیمات عمومی محاسبات': 'Genel hesaplama ayarları',
    'پارامترهای پایه برای محاسبه وزن و هزینه': 'Ağırlık ve ücret hesaplaması için temel parametreler',
    'محاسبه وزن حجمی': 'Hacimsel ağırlık hesabı',
    'وزن حجمی = (طول × عرض × ارتفاع) ÷ ضریب تقسیم': 'Hacimsel ağırlık = (uzunluk × genişlik × yükseklik) ÷ bölen',
    'ضریب تقسیم (Volumetric Divisor)': 'Hacimsel ağırlık böleni',
    'استاندارد صنعت: 5000 (ابعاد به سانتی‌متر)': 'Sektör standardı: 5000 (ölçüler santimetre)',
    'مبدا ارسال': 'Kargo çıkış merkezi',
    'مبدأ حمل به‌صورت یکپارچه و معتبر در بخش جغرافیای لجستیک مدیریت می‌شود. برای جلوگیری از مغایرت، تنظیم مبدا را در اینجا تغییر ندهید.':
      'Doğrulanmış kargo merkezi, Lojistik Coğrafya bölümünde merkezi olarak yönetilir. Çakışmaları önlemek için burada değiştirmeyin.',
    'مدیریت مرکز ارسال در جغرافیای لجستیک': 'Kargo merkezini Lojistik Coğrafya bölümünde yönetin',
    'کشور، استان و شهر پایه برای محاسبه منطقه': 'Bölge hesabı için temel ülke, il ve şehir',
    'منطق انتخاب وزن قابل شارژ': 'Ücretlendirilebilir ağırlık seçimi',
    'وزن قابل شارژ = MAX(وزن واقعی, وزن حجمی)': 'Ücretlendirilebilir ağırlık = MAX(gerçek ağırlık, hacimsel ağırlık)',
    'فرمول کلی محاسبه': 'Genel hesaplama formülü', 'هزینه کل = ': 'Toplam ücret = ',
    'قیمت پایه (بر اساس منطقه + سرویس + محدوده وزن)': 'Temel ücret (bölge + hizmet + ağırlık aralığı)',
    '+ (وزن اضافی × قیمت هر کیلو اضافی)': '+ (ek ağırlık × ek kg ücreti)',
    '× ضریب ارسال فوری (اگر انتخاب شده)': '× ekspres kargo çarpanı (seçiliyse)',
    '+ هزینه پرداخت در محل (اگر انتخاب شده)': '+ kapıda ödeme ücreti (seçiliyse)',
    '+ هزینه بیمه (اگر انتخاب شده)': '+ sigorta ücreti (seçiliyse)'
  }
};

export default function PostalShippingParamsTab() {
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const tr = (source: string) => language === 'fa' ? source : localizedText[language][source] ?? source;
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);
  const [isFeeDialogOpen, setIsFeeDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<AdvancedShippingRate | null>(null);
  const [editingFee, setEditingFee] = useState<ShippingFeeConfig | null>(null);

  const [rateForm, setRateForm] = useState({
    zone: 'city',
    serviceType: 'normal',
    weightFrom: '0',
    weightTo: '5',
    price: '',
    pricePerExtraKg: '',
    estimatedDaysMin: 1,
    estimatedDaysMax: 3,
    isActive: true
  });

  const [feeForm, setFeeForm] = useState({
    feeType: 'cod',
    feeMode: 'fixed',
    feeValue: '',
    labelFa: '',
    labelEn: '',
    description: '',
    minValue: '',
    maxValue: '',
    isActive: true
  });

  const [generalSettings, setGeneralSettings] = useState({
    volumetric_divisor: '5000'
  });
  const [settingsChanged, setSettingsChanged] = useState(false);

  const { data: ratesResponse, isLoading: ratesLoading } = useQuery<{ success: boolean; data: AdvancedShippingRate[] }>({
    queryKey: ['/api/admin/shipping-rates']
  });
  const rates = ratesResponse?.data || [];

  const { data: feesResponse, isLoading: feesLoading } = useQuery<{ success: boolean; data: ShippingFeeConfig[] }>({
    queryKey: ['/api/admin/shipping-fees']
  });
  const fees = feesResponse?.data || [];

  interface ShopSetting {
    setting_key: string;
    setting_value: string;
  }

  const { data: settingsResponse, isSuccess: settingsLoaded } = useQuery<{ success: boolean; data: ShopSetting[] }>({
    queryKey: ['/api/admin/shop-settings/shipping']
  });

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => 
      apiRequest(`/api/admin/shop-settings/${key}`, {
        method: 'PUT',
        body: { setting_value: value }
      })
  });

  const handleSaveSettings = async () => {
    const updates = Object.entries(generalSettings).map(([key, value]) =>
      updateSettingMutation.mutateAsync({ key, value })
    );
    try {
      await Promise.all(updates);
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/shop-settings/shipping'] });
      toast({ title: tr('موفقیت'), description: tr('تنظیمات ذخیره شد') });
      setSettingsChanged(false);
    } catch (error) {
      toast({ title: tr('خطا'), description: tr('خطا در ذخیره برخی تنظیمات'), variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (settingsLoaded && settingsResponse?.data && !settingsChanged) {
      const serverSettings: Record<string, string> = {
        volumetric_divisor: '5000'
      };
      settingsResponse.data.forEach((setting: ShopSetting) => {
        if (setting.setting_key in serverSettings) {
          serverSettings[setting.setting_key] = setting.setting_value;
        }
      });
      setGeneralSettings(serverSettings as typeof generalSettings);
    }
  }, [settingsLoaded, settingsResponse, settingsChanged]);

  const updateGeneralSetting = (key: keyof typeof generalSettings, value: string) => {
    setGeneralSettings(prev => ({ ...prev, [key]: value }));
    setSettingsChanged(true);
  };

  const createRateMutation = useMutation({
    mutationFn: (data: typeof rateForm) => apiRequest('/api/admin/shipping-rates', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shipping-rates'] });
      toast({ title: tr('موفقیت'), description: tr('نرخ جدید ذخیره شد') });
      setIsRateDialogOpen(false);
      resetRateForm();
    },
    onError: () => {
      toast({ title: tr('خطا'), description: tr('خطا در ذخیره نرخ'), variant: 'destructive' });
    }
  });

  const updateRateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof rateForm }) => 
      apiRequest(`/api/admin/shipping-rates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shipping-rates'] });
      toast({ title: tr('موفقیت'), description: tr('نرخ به‌روزرسانی شد') });
      setIsRateDialogOpen(false);
      resetRateForm();
    },
    onError: () => {
      toast({ title: tr('خطا'), description: tr('خطا در به‌روزرسانی'), variant: 'destructive' });
    }
  });

  const deleteRateMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/shipping-rates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shipping-rates'] });
      toast({ title: tr('موفقیت'), description: tr('نرخ حذف شد') });
    }
  });

  const updateFeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof feeForm }) => 
      apiRequest(`/api/admin/shipping-fees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shipping-fees'] });
      toast({ title: tr('موفقیت'), description: tr('تنظیمات هزینه به‌روزرسانی شد') });
      setIsFeeDialogOpen(false);
    },
    onError: () => {
      toast({ title: tr('خطا'), description: tr('خطا در به‌روزرسانی'), variant: 'destructive' });
    }
  });

  const resetRateForm = () => {
    setRateForm({
      zone: 'city',
      serviceType: 'normal',
      weightFrom: '0',
      weightTo: '5',
      price: '',
      pricePerExtraKg: '',
      estimatedDaysMin: 1,
      estimatedDaysMax: 3,
      isActive: true
    });
    setEditingRate(null);
  };

  const handleEditRate = (rate: AdvancedShippingRate) => {
    setEditingRate(rate);
    setRateForm({
      zone: rate.zone,
      serviceType: rate.serviceType,
      weightFrom: rate.weightFrom,
      weightTo: rate.weightTo,
      price: rate.price,
      pricePerExtraKg: rate.pricePerExtraKg,
      estimatedDaysMin: rate.estimatedDaysMin,
      estimatedDaysMax: rate.estimatedDaysMax,
      isActive: rate.isActive
    });
    setIsRateDialogOpen(true);
  };

  const handleEditFee = (fee: ShippingFeeConfig) => {
    setEditingFee(fee);
    setFeeForm({
      feeType: fee.feeType,
      feeMode: fee.feeMode,
      feeValue: fee.feeValue,
      labelFa: fee.labelFa,
      labelEn: fee.labelEn,
      description: fee.description,
      minValue: fee.minValue || '',
      maxValue: fee.maxValue || '',
      isActive: fee.isActive
    });
    setIsFeeDialogOpen(true);
  };

  const handleRateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRate) {
      updateRateMutation.mutate({ id: editingRate.id, data: rateForm });
    } else {
      createRateMutation.mutate(rateForm);
    }
  };

  const handleFeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFee) {
      updateFeeMutation.mutate({ id: editingFee.id, data: feeForm });
    }
  };

  const groupedRates = rates.reduce((acc, rate) => {
    if (!acc[rate.zone]) acc[rate.zone] = [];
    acc[rate.zone].push(rate);
    return acc;
  }, {} as Record<string, AdvancedShippingRate[]>);

  return (
    <div className="space-y-6" dir={direction}>
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">{tr('پارامترهای محاسبات سرویس پستی')}</h2>
          <p className="text-muted-foreground">{tr('مدیریت تمام فاکتورهای دخیل در محاسبه هزینه ارسال')}</p>
        </div>
      </div>

      <Tabs defaultValue="rates" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="rates" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            {tr('نرخ‌های منطقه‌ای')}
          </TabsTrigger>
          <TabsTrigger value="fees" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {tr('هزینه‌های جانبی')}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {tr('تنظیمات عمومی')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {tr('نرخ‌های حمل بر اساس منطقه و سرویس')}
                </CardTitle>
                <CardDescription>
                  {tr('قیمت‌گذاری بر اساس: منطقه مقصد × نوع سرویس × محدوده وزن')}
                </CardDescription>
              </div>
              <Dialog open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetRateForm} data-testid="btn-add-rate">
                    <Plus className="h-4 w-4 ml-2" />
                    {tr('افزودن نرخ جدید')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingRate ? tr('ویرایش نرخ') : tr('افزودن نرخ جدید')}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleRateSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{tr('منطقه')}</Label>
                        <Select value={rateForm.zone} onValueChange={(v) => setRateForm({...rateForm, zone: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ZONES.map(z => (
                              <SelectItem key={z.value} value={z.value}>
                                {z.icon} {tr(z.label)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{tr('نوع سرویس')}</Label>
                        <Select value={rateForm.serviceType} onValueChange={(v) => setRateForm({...rateForm, serviceType: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SERVICE_TYPES.map(s => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.icon} {tr(s.label)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{tr('وزن از (کیلوگرم)')}</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={rateForm.weightFrom}
                          onChange={(e) => setRateForm({...rateForm, weightFrom: e.target.value})}
                          data-testid="input-weight-from"
                        />
                      </div>
                      <div>
                        <Label>{tr('وزن تا (کیلوگرم)')}</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={rateForm.weightTo}
                          onChange={(e) => setRateForm({...rateForm, weightTo: e.target.value})}
                          data-testid="input-weight-to"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{tr('قیمت پایه (IQD)')}</Label>
                        <Input
                          type="number"
                          value={rateForm.price}
                          onChange={(e) => setRateForm({...rateForm, price: e.target.value})}
                          placeholder={tr('مثال: 15000')}
                          required
                          data-testid="input-base-price"
                        />
                      </div>
                      <div>
                        <Label>{tr('قیمت هر کیلو اضافی (IQD)')}</Label>
                        <Input
                          type="number"
                          value={rateForm.pricePerExtraKg}
                          onChange={(e) => setRateForm({...rateForm, pricePerExtraKg: e.target.value})}
                          placeholder={tr('مثال: 1000')}
                          data-testid="input-price-per-kg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{tr('حداقل روز تحویل')}</Label>
                        <Input
                          type="number"
                          value={rateForm.estimatedDaysMin}
                          onChange={(e) => setRateForm({...rateForm, estimatedDaysMin: parseInt(e.target.value)})}
                          data-testid="input-days-min"
                        />
                      </div>
                      <div>
                        <Label>{tr('حداکثر روز تحویل')}</Label>
                        <Input
                          type="number"
                          value={rateForm.estimatedDaysMax}
                          onChange={(e) => setRateForm({...rateForm, estimatedDaysMax: parseInt(e.target.value)})}
                          data-testid="input-days-max"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rateForm.isActive}
                        onCheckedChange={(v) => setRateForm({...rateForm, isActive: v})}
                        data-testid="switch-rate-active"
                      />
                      <Label>{tr('فعال')}</Label>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" disabled={createRateMutation.isPending || updateRateMutation.isPending} data-testid="btn-save-rate">
                        {editingRate ? tr('ذخیره تغییرات') : tr('افزودن')}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsRateDialogOpen(false)}>
                        {tr('انصراف')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {ratesLoading ? (
                <div className="text-center py-8 text-muted-foreground">{tr('در حال بارگذاری...')}</div>
              ) : (
                <div className="space-y-6">
                  {ZONES.map(zone => {
                    const zoneRates = groupedRates[zone.value] || [];
                    return (
                      <div key={zone.value} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                          <span className="text-2xl">{zone.icon}</span>
                          {tr(zone.label)}
                          <Badge variant="secondary">{zoneRates.length} {tr('نرخ')}</Badge>
                        </h3>
                        {zoneRates.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{tr('سرویس')}</TableHead>
                                <TableHead>{tr('محدوده وزن')}</TableHead>
                                <TableHead>{tr('قیمت پایه (IQD)')}</TableHead>
                                <TableHead>{tr('هر کیلو اضافی')}</TableHead>
                                <TableHead>{tr('زمان تحویل')}</TableHead>
                                <TableHead>{tr('وضعیت')}</TableHead>
                                <TableHead>{tr('عملیات')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {zoneRates.map(rate => {
                                const svc = SERVICE_TYPES.find(s => s.value === rate.serviceType);
                                return (
                                  <TableRow key={rate.id}>
                                    <TableCell>
                                      <Badge className={svc?.color}>
                                        {svc?.icon} {svc ? tr(svc.label) : ''}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{rate.weightFrom} - {rate.weightTo} kg</TableCell>
                                    <TableCell className="font-medium">
                                      {parseFloat(rate.price).toLocaleString()} IQD
                                    </TableCell>
                                    <TableCell>
                                      {parseFloat(rate.pricePerExtraKg).toLocaleString()} IQD
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        {rate.estimatedDaysMin}-{rate.estimatedDaysMax} {tr('روز')}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={rate.isActive ? 'default' : 'secondary'}>
                                        {tr(rate.isActive ? 'فعال' : 'غیرفعال')}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button size="sm" variant="ghost" onClick={() => handleEditRate(rate)} data-testid={`btn-edit-rate-${rate.id}`}>
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="ghost" 
                                          onClick={() => deleteRateMutation.mutate(rate.id)}
                                          disabled={deleteRateMutation.isPending}
                                          data-testid={`btn-delete-rate-${rate.id}`}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-muted-foreground text-center py-4">
                            {tr('نرخی برای این منطقه تعریف نشده')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {tr('تنظیمات هزینه‌های جانبی')}
              </CardTitle>
              <CardDescription>
                {tr('مدیریت هزینه‌های اضافی مانند پرداخت در محل، بیمه و ضریب ارسال فوری')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feesLoading ? (
                <div className="text-center py-8 text-muted-foreground">{tr('در حال بارگذاری...')}</div>
              ) : (
                <div className="grid gap-4">
                  {fees.map(fee => {
                    const feeType = FEE_TYPES.find(f => f.value === fee.feeType);
                    const FeeIcon = feeType?.icon || DollarSign;
                    return (
                      <div key={fee.id} className="border rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full ${fee.isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                            <FeeIcon className={`h-6 w-6 ${fee.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <h4 className="font-semibold">{fee.labelFa}</h4>
                            <p className="text-sm text-muted-foreground">{fee.description}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline">
                                {fee.feeMode === 'fixed' && `${parseFloat(fee.feeValue).toLocaleString()} IQD`}
                                {fee.feeMode === 'percentage' && `${fee.feeValue}%`}
                                {fee.feeMode === 'multiplier' && `${fee.feeValue}x`}
                              </Badge>
                              {fee.minValue && (
                                <Badge variant="secondary">
                                  {tr('حداقل:')} {parseFloat(fee.minValue).toLocaleString()} IQD
                                </Badge>
                              )}
                              {fee.maxValue && (
                                <Badge variant="secondary">
                                  {tr('حداکثر:')} {parseFloat(fee.maxValue).toLocaleString()} IQD
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={fee.isActive ? 'default' : 'secondary'}>
                            {tr(fee.isActive ? 'فعال' : 'غیرفعال')}
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => handleEditFee(fee)} data-testid={`btn-edit-fee-${fee.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={isFeeDialogOpen} onOpenChange={setIsFeeDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{tr('ویرایش هزینه')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleFeeSubmit} className="space-y-4">
                <div>
                  <Label>{tr('عنوان فارسی')}</Label>
                  <Input
                    value={feeForm.labelFa}
                    onChange={(e) => setFeeForm({...feeForm, labelFa: e.target.value})}
                    data-testid="input-fee-label-fa"
                  />
                </div>
                <div>
                  <Label>{tr('عنوان انگلیسی')}</Label>
                  <Input
                    value={feeForm.labelEn}
                    onChange={(e) => setFeeForm({...feeForm, labelEn: e.target.value})}
                    data-testid="input-fee-label-en"
                  />
                </div>
                <div>
                  <Label>{tr('نوع محاسبه')}</Label>
                  <Select value={feeForm.feeMode} onValueChange={(v) => setFeeForm({...feeForm, feeMode: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FEE_MODES.map(m => (
                        <SelectItem key={m.value} value={m.value}>{tr(m.label)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>
                    {tr('مقدار')}
                    {feeForm.feeMode === 'fixed' && ' (IQD)'}
                    {feeForm.feeMode === 'percentage' && ' (%)'}
                    {feeForm.feeMode === 'multiplier' && ' (x)'}
                  </Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={feeForm.feeValue}
                    onChange={(e) => setFeeForm({...feeForm, feeValue: e.target.value})}
                    data-testid="input-fee-value"
                  />
                </div>
                {feeForm.feeMode === 'percentage' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{tr('حداقل (IQD)')}</Label>
                      <Input
                        type="number"
                        value={feeForm.minValue}
                        onChange={(e) => setFeeForm({...feeForm, minValue: e.target.value})}
                        data-testid="input-fee-min"
                      />
                    </div>
                    <div>
                      <Label>{tr('حداکثر (IQD)')}</Label>
                      <Input
                        type="number"
                        value={feeForm.maxValue}
                        onChange={(e) => setFeeForm({...feeForm, maxValue: e.target.value})}
                        data-testid="input-fee-max"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <Label>{tr('توضیحات')}</Label>
                  <Input
                    value={feeForm.description}
                    onChange={(e) => setFeeForm({...feeForm, description: e.target.value})}
                    data-testid="input-fee-description"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={feeForm.isActive}
                    onCheckedChange={(v) => setFeeForm({...feeForm, isActive: v})}
                    data-testid="switch-fee-active"
                  />
                  <Label>{tr('فعال')}</Label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={updateFeeMutation.isPending} data-testid="btn-save-fee">
                    {tr('ذخیره تغییرات')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsFeeDialogOpen(false)}>
                    {tr('انصراف')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {tr('تنظیمات عمومی محاسبات')}
                </CardTitle>
                <CardDescription>
                  {tr('پارامترهای پایه برای محاسبه وزن و هزینه')}
                </CardDescription>
              </div>
              {settingsChanged && (
                <Button onClick={handleSaveSettings} disabled={updateSettingMutation.isPending} data-testid="btn-save-settings">
                  {tr('ذخیره تغییرات')}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Package className="h-6 w-6 text-primary" />
                    <h4 className="font-semibold">{tr('محاسبه وزن حجمی')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {tr('وزن حجمی = (طول × عرض × ارتفاع) ÷ ضریب تقسیم')}
                  </p>
                  <div className="space-y-2">
                    <Label>{tr('ضریب تقسیم (Volumetric Divisor)')}</Label>
                    <Input
                      type="number"
                      value={generalSettings.volumetric_divisor}
                      onChange={(e) => updateGeneralSetting('volumetric_divisor', e.target.value)}
                      className="max-w-32"
                      data-testid="input-volumetric-divisor"
                    />
                    <p className="text-xs text-muted-foreground">
                      {tr('استاندارد صنعت: 5000 (ابعاد به سانتی‌متر)')}
                    </p>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <MapPin className="h-6 w-6 text-primary" />
                    <h4 className="font-semibold">{tr('مبدا ارسال')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {tr('مبدأ حمل به‌صورت یکپارچه و معتبر در بخش جغرافیای لجستیک مدیریت می‌شود. برای جلوگیری از مغایرت، تنظیم مبدا را در اینجا تغییر ندهید.')}
                  </p>
                  <a
                    href="/mrg/logistics-management"
                    className="text-sm font-medium text-primary underline underline-offset-4"
                  >
                    {tr('مدیریت مرکز ارسال در جغرافیای لجستیک')}
                  </a>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Truck className="h-6 w-6 text-primary" />
                  <h4 className="font-semibold">{tr('منطق انتخاب وزن قابل شارژ')}</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {tr('وزن قابل شارژ = MAX(وزن واقعی, وزن حجمی)')}
                </p>
                <div className="bg-muted p-3 rounded text-sm font-mono">
                  chargeableWeight = Math.max(realWeight, volumetricWeight)
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-3 mb-4">
                  <Calculator className="h-6 w-6 text-blue-600" />
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">{tr('فرمول کلی محاسبه')}</h4>
                </div>
                <div className="text-sm space-y-2 text-blue-800 dark:text-blue-200">
                  <p><strong>{tr('هزینه کل = ')}</strong></p>
                  <p className="pr-4">{tr('قیمت پایه (بر اساس منطقه + سرویس + محدوده وزن)')}</p>
                  <p className="pr-4">{tr('+ (وزن اضافی × قیمت هر کیلو اضافی)')}</p>
                  <p className="pr-4">{tr('× ضریب ارسال فوری (اگر انتخاب شده)')}</p>
                  <p className="pr-4">{tr('+ هزینه پرداخت در محل (اگر انتخاب شده)')}</p>
                  <p className="pr-4">{tr('+ هزینه بیمه (اگر انتخاب شده)')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
