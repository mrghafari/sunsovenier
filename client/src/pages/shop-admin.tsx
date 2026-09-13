import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { 
  Package, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  Eye, 
  Edit, 
  Truck,
  DollarSign,
  Calendar,
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  Percent,
  Calculator,
  TrendingDown,
  RefreshCw,
  BarChart3,
  CreditCard,
  FileText,
  User,
  Phone,
  Mail,
  Receipt,
  Building,
  Clock,
  AlertCircle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import type { ShopProduct, Customer, Order } from "@shared/shop-schema";
import SalesReport from "@/pages/sales-report";
import InvoiceManagement from "@/pages/admin/invoice-management";
import ShopInvoiceManagement from "@/components/ShopInvoiceManagement";
import AbandonedCartManagement from "@/pages/abandoned-cart-management";
import BulkPurchaseProductCard from "@/components/BulkPurchaseProductCard";

type ShopLanguage = "en" | "ar" | "tr" | "fa";
type ShopTranslation = Partial<Record<ShopLanguage, string>>;

const SHOP_TRANSLATIONS: Record<string, ShopTranslation> = {
  shopAdministration: { en: "Shop Administration", ar: "إدارة المتجر", tr: "Mağaza Yönetimi", fa: "مدیریت فروشگاه" },
  manageOperations: { en: "Manage your e-commerce operations", ar: "إدارة عمليات التجارة الإلكترونية", tr: "E-ticaret operasyonlarınızı yönetin", fa: "عملیات تجارت الکترونیکی خود را مدیریت کنید" },
  refreshData: { en: "Refresh Data", ar: "تحديث البيانات", tr: "Verileri Yenile", fa: "به‌روزرسانی داده‌ها" },
  totalOrders: { en: "Total Orders", ar: "إجمالي الطلبات", tr: "Toplam Sipariş", fa: "کل سفارش‌ها" },
  pendingOrders: { en: "Pending Orders", ar: "الطلبات المعلقة", tr: "Bekleyen Sipariş", fa: "سفارش‌های در انتظار" },
  products: { en: "Products", ar: "المنتجات", tr: "Ürünler", fa: "محصولات" },
  revenue: { en: "Revenue", ar: "الإيرادات", tr: "Gelir", fa: "درآمد" },
  orders: { en: "Orders", ar: "الطلبات", tr: "Siparişler", fa: "سفارش‌ها" },
  discountSettings: { en: "Discount Settings", ar: "إعدادات الخصم", tr: "İndirim Ayarları", fa: "تنظیمات تخفیف" },
  bulkPurchases: { en: "Bulk Purchases", ar: "المشتريات بالجملة", tr: "Toplu Alımlar", fa: "خریدهای عمده" },
  purchaseProformaDeadline: { en: "Purchase Proforma Deadline", ar: "مهلة الفاتورة الأولية للشراء", tr: "Satın Alma Proforma Son Tarihi", fa: "مهلت پیش‌فاکتور خرید" },
  inventory: { en: "Inventory", ar: "المخزون", tr: "Stok", fa: "موجودی" },
  invoiceManagement: { en: "Invoice Management", ar: "إدارة الفواتير", tr: "Fatura Yönetimi", fa: "مدیریت فاکتورها" },
  returnedItems: { en: "Returned Items", ar: "العناصر المرتجعة", tr: "İade Edilenler", fa: "اقلام برگشتی" },
  abandonedCart: { en: "Abandoned Cart", ar: "السلة المتروكة", tr: "Terk Edilmiş Sepet", fa: "سبدهای رهاشده" },
  salesReports: { en: "Sales Reports", ar: "تقارير المبيعات", tr: "Satış Raporları", fa: "گزارش‌های فروش" },
  orderManagement: { en: "Order Management", ar: "إدارة الطلبات", tr: "Sipariş Yönetimi", fa: "مدیریت سفارش‌ها" },
  searchOrders: { en: "Search orders...", ar: "البحث في الطلبات...", tr: "Siparişlerde ara...", fa: "جستجوی سفارش‌ها..." },
  filterStatus: { en: "Filter by status", ar: "تصفية حسب الحالة", tr: "Duruma göre filtrele", fa: "فیلتر بر اساس وضعیت" },
  allOrders: { en: "All Orders", ar: "كل الطلبات", tr: "Tüm Siparişler", fa: "همه سفارش‌ها" },
  pending: { en: "Pending", ar: "معلق", tr: "Beklemede", fa: "در انتظار" },
  confirmed: { en: "Confirmed", ar: "مؤكد", tr: "Onaylandı", fa: "تأیید شده" },
  shipped: { en: "Shipped", ar: "تم الشحن", tr: "Kargolandı", fa: "ارسال شده" },
  delivered: { en: "Delivered", ar: "تم التسليم", tr: "Teslim Edildi", fa: "تحویل داده شده" },
  cancelled: { en: "Cancelled", ar: "ملغى", tr: "İptal Edildi", fa: "لغو شده" },
  orderNumber: { en: "Order Number", ar: "رقم الطلب", tr: "Sipariş No", fa: "شماره سفارش" },
  customerName: { en: "Customer Name", ar: "اسم العميل", tr: "Müşteri Adı", fa: "نام مشتری" },
  mobile: { en: "Mobile", ar: "الجوال", tr: "Cep Telefonu", fa: "موبایل" },
  email: { en: "Email", ar: "البريد الإلكتروني", tr: "E-posta", fa: "ایمیل" },
  totalAmount: { en: "Total Amount", ar: "المبلغ الإجمالي", tr: "Toplam Tutar", fa: "مبلغ کل" },
  status: { en: "Status", ar: "الحالة", tr: "Durum", fa: "وضعیت" },
  invoiceType: { en: "Invoice Type", ar: "نوع الفاتورة", tr: "Fatura Türü", fa: "نوع فاکتور" },
  date: { en: "Date", ar: "التاريخ", tr: "Tarih", fa: "تاریخ" },
  actions: { en: "Actions", ar: "الإجراءات", tr: "İşlemler", fa: "عملیات" },
  details: { en: "Details", ar: "التفاصيل", tr: "Detaylar", fa: "جزئیات" },
  invoice: { en: "Invoice", ar: "فاتورة", tr: "Fatura", fa: "فاکتور" },
  proforma: { en: "Proforma", ar: "فاتورة أولية", tr: "Proforma", fa: "پیش‌فاکتور" },
  noOrders: { en: "No orders found", ar: "لم يتم العثور على طلبات", tr: "Sipariş bulunamadı", fa: "هیچ سفارشی یافت نشد" },
  scrollOrders: { en: "Scroll to view all {count} orders", ar: "مرر لعرض الطلبات الـ {count} كلها", tr: "Tüm {count} siparişi görmek için kaydırın", fa: "برای مشاهده هر {count} سفارش پیمایش کنید" },
  inventoryManagement: { en: "Inventory Management", ar: "إدارة المخزون", tr: "Stok Yönetimi", fa: "مدیریت موجودی" },
  sku: { en: "SKU", ar: "رمز المنتج", tr: "SKU", fa: "شناسه کالا" },
  price: { en: "Price", ar: "السعر", tr: "Fiyat", fa: "قیمت" },
  stock: { en: "Stock", ar: "المخزون", tr: "Stok", fa: "موجودی" },
  inStock: { en: "In Stock", ar: "متوفر", tr: "Stokta", fa: "موجود" },
  lowStock: { en: "Low Stock", ar: "مخزون منخفض", tr: "Düşük Stok", fa: "موجودی کم" },
  createDiscount: { en: "Create New Discount", ar: "إنشاء خصم جديد", tr: "Yeni İndirim Oluştur", fa: "ایجاد تخفیف جدید" },
  noDiscounts: { en: "No discounts created yet", ar: "لم يتم إنشاء خصومات بعد", tr: "Henüz indirim oluşturulmadı", fa: "هنوز تخفیفی ایجاد نشده است" },
  createDiscountHint: { en: 'Click "Create New Discount" to get started', ar: "انقر على «إنشاء خصم جديد» للبدء", tr: "Başlamak için «Yeni İndirim Oluştur» seçeneğine tıklayın", fa: "برای شروع روی «ایجاد تخفیف جدید» کلیک کنید" },
  active: { en: "Active", ar: "فعال", tr: "Aktif", fa: "فعال" },
  inactive: { en: "Inactive", ar: "غير فعال", tr: "Pasif", fa: "غیرفعال" },
  discountUpdated: { en: "Discount Updated", ar: "تم تحديث الخصم", tr: "İndirim Güncellendi", fa: "تخفیف به‌روزرسانی شد" },
  bulkConfiguration: { en: "Bulk Purchase Configuration", ar: "إعداد المشتريات بالجملة", tr: "Toplu Alım Yapılandırması", fa: "پیکربندی خرید عمده" },
  noProducts: { en: "No products available", ar: "لا توجد منتجات", tr: "Ürün bulunamadı", fa: "محصولی موجود نیست" },
  bulkHint: { en: "Add products to configure bulk purchases", ar: "أضف منتجات لإعداد المشتريات بالجملة", tr: "Toplu alımları yapılandırmak için ürün ekleyin", fa: "برای پیکربندی خرید عمده محصول اضافه کنید" },
  deadlineSettings: { en: "Purchase Proforma Deadline Settings", ar: "إعدادات مهلة الفاتورة الأولية للشراء", tr: "Satın Alma Proforma Son Tarihi Ayarları", fa: "تنظیمات مهلت پیش‌فاکتور خرید" },
  deadlineAlert: { en: "This setting applies to all products in the shop and displays in checkout and purchase cards.", ar: "ينطبق هذا الإعداد على جميع منتجات المتجر ويظهر عند الدفع وفي بطاقات الشراء.", tr: "Bu ayar mağazadaki tüm ürünlere uygulanır ve ödeme ile satın alma kartlarında gösterilir.", fa: "این تنظیم برای همه محصولات فروشگاه اعمال شده و در صفحه پرداخت و کارت‌های خرید نمایش داده می‌شود." },
  paymentDeadline: { en: "Payment Deadline (Days)", ar: "مهلة الدفع (بالأيام)", tr: "Ödeme Son Tarihi (Gün)", fa: "مهلت پرداخت (روز)" },
  deadlineHint: { en: "Number of days for payment deadline (minimum 1 day, maximum 30 days)", ar: "عدد أيام مهلة الدفع (يوم واحد كحد أدنى و30 يوماً كحد أقصى)", tr: "Ödeme son tarihi için gün sayısı (en az 1, en fazla 30 gün)", fa: "تعداد روزهای مهلت پرداخت (حداقل ۱ و حداکثر ۳۰ روز)" },
  previewMessage: { en: "Preview Message", ar: "رسالة المعاينة", tr: "Önizleme Mesajı", fa: "پیام پیش‌نمایش" },
  deadlineDays: { en: "Payment deadline: {days} days", ar: "مهلة الدفع: {days} أيام", tr: "Ödeme son tarihi: {days} gün", fa: "مهلت پرداخت: {days} روز" },
  deadlinePreviewHint: { en: "This message displays in purchase cards and checkout page", ar: "تظهر هذه الرسالة في بطاقات الشراء وصفحة الدفع", tr: "Bu mesaj satın alma kartlarında ve ödeme sayfasında gösterilir", fa: "این پیام در کارت‌های خرید و صفحه پرداخت نمایش داده می‌شود" },
  saveSettings: { en: "Save Settings", ar: "حفظ الإعدادات", tr: "Ayarları Kaydet", fa: "ذخیره تنظیمات" },
  saving: { en: "Saving...", ar: "جارٍ الحفظ...", tr: "Kaydediliyor...", fa: "در حال ذخیره..." },
  reminderSchedule: { en: "Customer Reminder Schedule", ar: "جدول تذكير العملاء", tr: "Müşteri Hatırlatma Planı", fa: "جدول زمانی یادآوری مشتریان" },
  daysBeforeDeadline: { en: "Days before deadline:", ar: "الأيام قبل انتهاء المهلة:", tr: "Son tarihten önceki gün sayısı:", fa: "روز قبل از پایان مهلت:" },
  sendTime: { en: "Send time:", ar: "وقت الإرسال:", tr: "Gönderim saati:", fa: "ساعت ارسال:" },
  smsTemplate: { en: "SMS template:", ar: "قالب الرسائل القصيرة:", tr: "SMS şablonu:", fa: "قالب پیامک:" },
  emailTemplate: { en: "Email template:", ar: "قالب البريد الإلكتروني:", tr: "E-posta şablonu:", fa: "قالب ایمیل:" },
  chooseSms: { en: "Choose SMS template", ar: "اختر قالب الرسائل القصيرة", tr: "SMS şablonu seçin", fa: "انتخاب قالب پیامک" },
  chooseEmail: { en: "Choose email template", ar: "اختر قالب البريد الإلكتروني", tr: "E-posta şablonu seçin", fa: "انتخاب قالب ایمیل" },
  noTemplate: { en: "No template", ar: "بدون قالب", tr: "Şablon yok", fa: "بدون قالب" },
  add: { en: "Add", ar: "إضافة", tr: "Ekle", fa: "افزودن" },
  editReminder: { en: "Edit Payment Reminder", ar: "تعديل تذكير الدفع", tr: "Ödeme Hatırlatıcısını Düzenle", fa: "ویرایش یادآوری پرداخت" },
  cancel: { en: "Cancel", ar: "إلغاء", tr: "İptal", fa: "انصراف" },
  update: { en: "Update", ar: "تحديث", tr: "Güncelle", fa: "بروزرسانی" },
  updating: { en: "Updating...", ar: "جارٍ التحديث...", tr: "Güncelleniyor...", fa: "در حال بروزرسانی..." },
  noReminders: { en: "No reminders configured", ar: "لم يتم إعداد تذكيرات", tr: "Yapılandırılmış hatırlatma yok", fa: "هیچ یادآوری تنظیم نشده است" },
  reminderNote: { en: "Reminders are sent according to local time. Customers will be notified by email and SMS.", ar: "يتم إرسال التذكيرات حسب التوقيت المحلي. سيتم إخطار العملاء عبر البريد الإلكتروني والرسائل القصيرة.", tr: "Hatırlatmalar yerel saate göre gönderilir. Müşterilere e-posta ve SMS ile bildirim gönderilir.", fa: "یادآوری‌ها بر اساس ساعت محلی ارسال می‌شوند. مشتریان از طریق ایمیل و پیامک مطلع خواهند شد." },
  returnsManagement: { en: "Returned Items Management", ar: "إدارة العناصر المرتجعة", tr: "İade Edilenler Yönetimi", fa: "مدیریت اقلام برگشتی" },
  addReturn: { en: "Add New Return", ar: "إضافة مرتجع جديد", tr: "Yeni İade Ekle", fa: "افزودن برگشتی جدید" },
  totalReturns: { en: "Total Returns", ar: "إجمالي المرتجعات", tr: "Toplam İade", fa: "کل برگشتی‌ها" },
  totalReturnAmount: { en: "Total Return Amount", ar: "إجمالي مبلغ المرتجعات", tr: "Toplam İade Tutarı", fa: "کل مبلغ برگشتی" },
  pendingReturns: { en: "Pending Returns", ar: "المرتجعات المعلقة", tr: "Bekleyen İadeler", fa: "برگشتی‌های در انتظار" },
  approvedReturns: { en: "Approved Returns", ar: "المرتجعات المعتمدة", tr: "Onaylanan İadeler", fa: "برگشتی‌های تأییدشده" },
  returnsList: { en: "Returns List", ar: "قائمة المرتجعات", tr: "İade Listesi", fa: "فهرست برگشتی‌ها" },
  returnDate: { en: "Return Date", ar: "تاريخ الإرجاع", tr: "İade Tarihi", fa: "تاریخ برگشت" },
  amount: { en: "Amount", ar: "المبلغ", tr: "Tutar", fa: "مبلغ" },
  noReturns: { en: "No returns found", ar: "لم يتم العثور على مرتجعات", tr: "İade bulunamadı", fa: "هیچ برگشتی یافت نشد" },
  returnDetails: { en: "Return Details", ar: "تفاصيل المرتجع", tr: "İade Detayları", fa: "جزئیات برگشتی" },
  returnQuantity: { en: "Return Quantity", ar: "كمية الإرجاع", tr: "İade Miktarı", fa: "تعداد برگشتی" },
  returnAmount: { en: "Return Amount", ar: "مبلغ الإرجاع", tr: "İade Tutarı", fa: "مبلغ برگشتی" },
  returnReason: { en: "Return Reason", ar: "سبب الإرجاع", tr: "İade Nedeni", fa: "دلیل برگشت" },
  orderDetails: { en: "Order Details", ar: "تفاصيل الطلب", tr: "Sipariş Detayları", fa: "جزئیات سفارش" },
  customerInfo: { en: "Customer Information", ar: "معلومات العميل", tr: "Müşteri Bilgileri", fa: "اطلاعات مشتری" },
  company: { en: "Company", ar: "الشركة", tr: "Şirket", fa: "شرکت" },
  city: { en: "City", ar: "المدينة", tr: "Şehir", fa: "شهر" },
  address: { en: "Address", ar: "العنوان", tr: "Adres", fa: "آدرس" },
  orderSummary: { en: "Order Summary", ar: "ملخص الطلب", tr: "Sipariş Özeti", fa: "خلاصه سفارش" },
  orderDate: { en: "Order Date", ar: "تاريخ الطلب", tr: "Sipariş Tarihi", fa: "تاریخ سفارش" },
  orderStatus: { en: "Order Status", ar: "حالة الطلب", tr: "Sipariş Durumu", fa: "وضعیت سفارش" },
  orderItems: { en: "Order Items ({count} items)", ar: "عناصر الطلب ({count})", tr: "Sipariş Kalemleri ({count} ürün)", fa: "اقلام سفارش ({count} قلم)" },
  productName: { en: "Product Name", ar: "اسم المنتج", tr: "Ürün Adı", fa: "نام محصول" },
  productCode: { en: "Product code", ar: "رمز المنتج", tr: "Ürün kodu", fa: "کد محصول" },
  unitPrice: { en: "Unit price", ar: "سعر الوحدة", tr: "Birim fiyat", fa: "قیمت واحد" },
  quantity: { en: "Quantity", ar: "الكمية", tr: "Miktar", fa: "تعداد" },
  noItems: { en: "No items found for this order", ar: "لم يتم العثور على عناصر لهذا الطلب", tr: "Bu sipariş için ürün bulunamadı", fa: "هیچ قلمی برای این سفارش یافت نشد" },
  paymentInfo: { en: "Payment Information", ar: "معلومات الدفع", tr: "Ödeme Bilgileri", fa: "اطلاعات پرداخت" },
  paymentMethod: { en: "Payment Method", ar: "طريقة الدفع", tr: "Ödeme Yöntemi", fa: "روش پرداخت" },
  paymentStatus: { en: "Payment Status", ar: "حالة الدفع", tr: "Ödeme Durumu", fa: "وضعیت پرداخت" },
  paid: { en: "Paid", ar: "مدفوع", tr: "Ödendi", fa: "پرداخت شده" },
  pendingPayment: { en: "Pending Payment", ar: "في انتظار الدفع", tr: "Ödeme Bekliyor", fa: "در انتظار پرداخت" },
  failed: { en: "Failed", ar: "فشل", tr: "Başarısız", fa: "ناموفق" },
  unknown: { en: "Unknown", ar: "غير معروف", tr: "Bilinmiyor", fa: "نامشخص" },
  fundingSources: { en: "Funding Sources", ar: "مصادر التمويل", tr: "Finansman Kaynakları", fa: "جزئیات منابع تامین وجه" },
  wallet: { en: "Wallet", ar: "المحفظة", tr: "Cüzdan", fa: "کیف پول" },
  partialWallet: { en: "Wallet (partial order)", ar: "المحفظة (طلب جزئي)", tr: "Cüzdan (kısmi sipariş)", fa: "کیف پول (سفارش ناقص)" },
  incompleteWallet: { en: "Incomplete payment - wallet not debited", ar: "دفع غير مكتمل - لم يتم الخصم من المحفظة", tr: "Tamamlanmamış ödeme - cüzdan düşülmedi", fa: "پرداخت ناتمام - کیف پول کسر نشده" },
  bankGateway: { en: "Bank Gateway", ar: "البوابة المصرفية", tr: "Banka Geçidi", fa: "درگاه بانکی" },
  fullBankGateway: { en: "Bank Gateway (full)", ar: "البوابة المصرفية (كاملة)", tr: "Banka Geçidi (tam)", fa: "درگاه بانکی (کامل)" },
  onlinePayment: { en: "Online Payment", ar: "الدفع الإلكتروني", tr: "Online Ödeme", fa: "پرداخت آنلاین" },
  bankTransfer: { en: "Bank Transfer", ar: "تحويل مصرفي", tr: "Banka Havalesi", fa: "انتقال بانکی" },
  graceBankTransfer: { en: "Bank Transfer (grace period)", ar: "تحويل مصرفي (فترة سماح)", tr: "Banka Havalesi (ek süre)", fa: "انتقال بانکی (دوره مهلت)" },
  hybridPayment: { en: "Hybrid (wallet + bank)", ar: "مختلط (محفظة + بنك)", tr: "Karma (cüzdan + banka)", fa: "ترکیبی (کیف پول + بانک)" },
  cash: { en: "Cash", ar: "نقدي", tr: "Nakit", fa: "نقدی" },
  credit: { en: "Credit", ar: "ائتماني", tr: "Kredi", fa: "اعتباری" },
  discount: { en: "Discount", ar: "الخصم", tr: "İndirim", fa: "تخفیف" },
  tax: { en: "Tax", ar: "الضريبة", tr: "Vergi", fa: "مالیات" },
  shippingInfo: { en: "Shipping Information", ar: "معلومات الشحن", tr: "Kargo Bilgileri", fa: "اطلاعات ارسال" },
  carrier: { en: "Carrier", ar: "شركة الشحن", tr: "Kargo şirketi", fa: "شرکت حمل" },
  tracking: { en: "Tracking number", ar: "رقم التتبع", tr: "Takip numarası", fa: "کد رهگیری" },
  shippingAddress: { en: "Shipping address", ar: "عنوان الشحن", tr: "Teslimat adresi", fa: "آدرس ارسال" },
  close: { en: "Close", ar: "إغلاق", tr: "Kapat", fa: "بستن" },
  productIdOptional: { en: "Product ID (Optional)", ar: "معرّف المنتج (اختياري)", tr: "Ürün Kimliği (İsteğe bağlı)", fa: "شناسه محصول (اختیاری)" },
  enterProductId: { en: "Enter product ID", ar: "أدخل معرّف المنتج", tr: "Ürün kimliğini girin", fa: "شناسه محصول را وارد کنید" },
  enterProductName: { en: "Enter product name", ar: "أدخل اسم المنتج", tr: "Ürün adını girin", fa: "نام محصول را وارد کنید" },
  productHint: { en: "Type at least 3 characters of the product name to see the product list", ar: "اكتب 3 أحرف على الأقل من اسم المنتج لعرض القائمة", tr: "Ürün listesini görmek için ürün adının en az 3 karakterini yazın", fa: "حداقل ۳ حرف از نام محصول را تایپ کنید تا فهرست محصولات نمایش داده شود" },
  enterQuantity: { en: "Enter quantity", ar: "أدخل الكمية", tr: "Miktarı girin", fa: "تعداد را وارد کنید" },
  enterReturnAmount: { en: "Enter return amount", ar: "أدخل مبلغ الإرجاع", tr: "İade tutarını girin", fa: "مبلغ برگشتی را وارد کنید" },
  enterCustomerName: { en: "Enter customer name", ar: "أدخل اسم العميل", tr: "Müşteri adını girin", fa: "نام مشتری را وارد کنید" },
  customerPhone: { en: "Customer Phone", ar: "هاتف العميل", tr: "Müşteri Telefonu", fa: "تلفن مشتری" },
  enterPhone: { en: "Enter phone number", ar: "أدخل رقم الهاتف", tr: "Telefon numarasını girin", fa: "شماره تلفن را وارد کنید" },
  phoneHint: { en: "Type at least 3 digits of the phone number to see customers", ar: "اكتب 3 أرقام على الأقل من رقم الهاتف لعرض العملاء", tr: "Müşterileri görmek için telefon numarasının en az 3 hanesini yazın", fa: "حداقل ۳ رقم از شماره تلفن را تایپ کنید تا فهرست مشتریان نمایش داده شود" },
  customerEmail: { en: "Customer Email", ar: "بريد العميل", tr: "Müşteri E-postası", fa: "ایمیل مشتری" },
  enterEmail: { en: "Enter email address", ar: "أدخل عنوان البريد الإلكتروني", tr: "E-posta adresini girin", fa: "آدرس ایمیل را وارد کنید" },
  refundStatus: { en: "Refund Status", ar: "حالة الاسترداد", tr: "İade Durumu", fa: "وضعیت بازپرداخت" },
  approved: { en: "Approved", ar: "معتمد", tr: "Onaylandı", fa: "تأیید شده" },
  rejected: { en: "Rejected", ar: "مرفوض", tr: "Reddedildi", fa: "رد شده" },
  refunded: { en: "Refunded", ar: "تم الاسترداد", tr: "İade Edildi", fa: "بازپرداخت شده" },
  enterReason: { en: "Enter reason for return", ar: "أدخل سبب الإرجاع", tr: "İade nedenini girin", fa: "دلیل برگشت را وارد کنید" },
  smsContent: { en: "SMS content:", ar: "محتوى الرسائل القصيرة:", tr: "SMS içeriği:", fa: "محتوای پیامک:" },
  emailContent: { en: "Full template content:", ar: "محتوى القالب الكامل:", tr: "Tam şablon içeriği:", fa: "محتوای کامل قالب:" },
  emailSubject: { en: "Email subject:", ar: "موضوع البريد الإلكتروني:", tr: "E-posta konusu:", fa: "عنوان ایمیل:" },
  unavailableSms: { en: "SMS content unavailable", ar: "محتوى الرسائل القصيرة غير متاح", tr: "SMS içeriği kullanılamıyor", fa: "محتوای پیامک در دسترس نیست" },
  unavailableEmail: { en: "Email content unavailable", ar: "محتوى البريد الإلكتروني غير متاح", tr: "E-posta içeriği kullanılamıyor", fa: "محتوای ایمیل در دسترس نیست" },
  unavailableSubject: { en: "Subject unavailable", ar: "الموضوع غير متاح", tr: "Konu kullanılamıyor", fa: "عنوان در دسترس نیست" },
  unitMeasurement: { en: "Unit of measure:", ar: "وحدة القياس:", tr: "Ölçü birimi:", fa: "واحد اندازه‌گیری:" },
  creating: { en: "Creating...", ar: "جارٍ الإنشاء...", tr: "Oluşturuluyor...", fa: "در حال ایجاد..." },
  createReturn: { en: "Create Return", ar: "إنشاء مرتجع", tr: "İade Oluştur", fa: "ثبت برگشت" },
  selected: { en: "Selected", ar: "تم الاختيار", tr: "Seçildi", fa: "انتخاب شد" },
  discountName: { en: "Discount Name", ar: "اسم الخصم", tr: "İndirim Adı", fa: "نام تخفیف" },
  description: { en: "Description", ar: "الوصف", tr: "Açıklama", fa: "توضیحات" },
  discountPercentage: { en: "Discount Percentage (%)", ar: "نسبة الخصم (%)", tr: "İndirim Yüzdesi (%)", fa: "درصد تخفیف (%)" },
  minOrderAmount: { en: "Minimum Order Amount ($)", ar: "الحد الأدنى لمبلغ الطلب ($)", tr: "Minimum Sipariş Tutarı ($)", fa: "حداقل مبلغ سفارش ($)" },
  maxDiscountAmount: { en: "Maximum Discount Amount ($)", ar: "الحد الأقصى لمبلغ الخصم ($)", tr: "Maksimum İndirim Tutarı ($)", fa: "حداکثر مبلغ تخفیف ($)" },
  startDate: { en: "Start Date (Gregorian)", ar: "تاريخ البدء (ميلادي)", tr: "Başlangıç Tarihi (Miladi)", fa: "تاریخ شروع (میلادی)" },
  endDate: { en: "End Date (Gregorian)", ar: "تاريخ الانتهاء (ميلادي)", tr: "Bitiş Tarihi (Miladi)", fa: "تاریخ پایان (میلادی)" },
  usageLimit: { en: "Usage Limit", ar: "حد الاستخدام", tr: "Kullanım Sınırı", fa: "محدودیت استفاده" },
  applyAll: { en: "Apply to all products", ar: "تطبيق على جميع المنتجات", tr: "Tüm ürünlere uygula", fa: "اعمال روی تمام محصولات" },
  chooseProduct: { en: "Choose specific products:", ar: "اختر منتجات محددة:", tr: "Belirli ürünleri seçin:", fa: "انتخاب محصول مشخص:" },
  selectedProducts: { en: "{count} products selected", ar: "تم اختيار {count} منتجاً", tr: "{count} ürün seçildi", fa: "{count} محصول انتخاب شده" },
  requiredFields: { en: "Name and discount percentage are required", ar: "الاسم ونسبة الخصم مطلوبان", tr: "Ad ve indirim yüzdesi gereklidir", fa: "نام و درصد تخفیف الزامی است" },
  percentageRange: { en: "Discount percentage must be between 0 and 100", ar: "يجب أن تكون نسبة الخصم بين 0 و100", tr: "İndirim yüzdesi 0 ile 100 arasında olmalıdır", fa: "درصد تخفیف باید بین ۰ و ۱۰۰ باشد" },
  success: { en: "Success", ar: "نجاح", tr: "Başarılı", fa: "موفقیت" },
  error: { en: "Error", ar: "خطأ", tr: "Hata", fa: "خطا" },
  updated: { en: "Updated", ar: "تم التحديث", tr: "Güncellendi", fa: "به‌روزرسانی شد" },
  orderUpdated: { en: "Order status has been updated successfully.", ar: "تم تحديث حالة الطلب بنجاح.", tr: "Sipariş durumu başarıyla güncellendi.", fa: "وضعیت سفارش با موفقیت به‌روزرسانی شد." },
  updateFailed: { en: "Update Failed", ar: "فشل التحديث", tr: "Güncelleme Başarısız", fa: "به‌روزرسانی ناموفق بود" },
  orderUpdateFailed: { en: "Failed to update order status.", ar: "فشل تحديث حالة الطلب.", tr: "Sipariş durumu güncellenemedi.", fa: "به‌روزرسانی وضعیت سفارش ناموفق بود." },
  discountUpdateFailed: { en: "Failed to update discount.", ar: "فشل تحديث الخصم.", tr: "İndirim güncellenemedi.", fa: "به‌روزرسانی تخفیف ناموفق بود." },
  deleteReturn: { en: "Return deleted successfully", ar: "تم حذف المرتجع بنجاح", tr: "İade başarıyla silindi", fa: "برگشتی با موفقیت حذف شد" },
  deleteReturnFailed: { en: "Failed to delete return", ar: "فشل حذف المرتجع", tr: "İade silinemedi", fa: "حذف برگشتی ناموفق بود" },
  deleteDiscount: { en: "Discount deleted successfully", ar: "تم حذف الخصم بنجاح", tr: "İndirim başarıyla silindi", fa: "تخفیف با موفقیت حذف شد" },
  confirmDeleteDiscount: { en: "Are you sure you want to delete this discount?", ar: "هل أنت متأكد من حذف هذا الخصم؟", tr: "Bu indirimi silmek istediğinizden emin misiniz?", fa: "آیا از حذف این تخفیف اطمینان دارید؟" },
  convertInvoice: { en: "Order successfully converted from proforma to invoice", ar: "تم تحويل الطلب من فاتورة أولية إلى فاتورة بنجاح", tr: "Sipariş proformadan faturaya başarıyla dönüştürüldü", fa: "سفارش با موفقیت از پیش‌فاکتور به فاکتور تبدیل شد" },
  convertInvoiceFailed: { en: "Failed to convert proforma to invoice", ar: "فشل تحويل الفاتورة الأولية إلى فاتورة", tr: "Proforma faturaya dönüştürülemedi", fa: "تبدیل پیش‌فاکتور به فاکتور ناموفق بود" },
  editDiscount: { en: "Edit Discount", ar: "تعديل الخصم", tr: "İndirimi Düzenle", fa: "ویرایش تخفیف" },
  createNewDiscount: { en: "Create New Discount", ar: "إنشاء خصم جديد", tr: "Yeni İndirim Oluştur", fa: "ایجاد تخفیف جدید" },
};

function useShopTranslations() {
  const { language, direction } = useLanguage();
  const tr = (key: string, values: Record<string, string | number> = {}) => {
    const template = SHOP_TRANSLATIONS[key]?.[language] || SHOP_TRANSLATIONS[key]?.en || key;
    return Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), template);
  };
  return { tr, direction, language };
}

export default function ShopAdmin() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingDiscount, setEditingDiscount] = useState<any>(null);
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [proformaDeadlineDays, setProformaDeadlineDays] = useState("3");
  const [reminderDays, setReminderDays] = useState("1");
  const [reminderHour, setReminderHour] = useState("10");
  const [smsTemplateId, setSmsTemplateId] = useState("");
  const [emailTemplateId, setEmailTemplateId] = useState("");
  
  // State for editing reminders
  const [editingReminder, setEditingReminder] = useState<any>(null);
  const [isEditReminderDialogOpen, setIsEditReminderDialogOpen] = useState(false);
  
  // State for proforma to invoice conversion
  const [isConvertingInvoice, setIsConvertingInvoice] = useState(false);
  const { toast } = useToast();
  const { tr, direction, language } = useShopTranslations();
  const dateLocale = language === "fa" ? "fa-IR" : language === "ar" ? "ar" : language === "tr" ? "tr-TR" : "en-US";
  const paymentMethodLabel = (method?: string | null) => {
    if (!method) return tr("unknown");
    const labels: Record<string, string> = {
      wallet_full: tr("wallet"),
      wallet_partial: tr("partialWallet"),
      online_payment: tr("onlinePayment"),
      bank_transfer: tr("bankTransfer"),
      bank_transfer_grace: tr("graceBankTransfer"),
      hybrid: tr("hybridPayment"),
      cash: tr("cash"),
      credit: tr("credit"),
    };
    return labels[method.toLowerCase()] || method;
  };
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Fetch email templates for reminder configuration
  const { data: emailTemplatesResponse } = useQuery({
    queryKey: ['/api/shop/email-templates'],
    enabled: isAuthenticated
  });

  // Fetch SMS templates for reminder configuration
  const { data: smsTemplatesResponse } = useQuery({
    queryKey: ['/api/shop/sms-templates'],
    enabled: isAuthenticated
  });

  // Fetch full email templates for content display
  const { data: fullEmailTemplates } = useQuery({
    queryKey: ['/api/email/templates/public'],
    enabled: isAuthenticated
  });

  // Extract templates from response data
  const emailTemplates = emailTemplatesResponse?.data || [];
  const smsTemplates = smsTemplatesResponse?.data || [];
  
  // Helper functions to get template content for tooltips
  const getEmailTemplateContent = (templateId: string | number) => {
    if (!fullEmailTemplates || !Array.isArray(fullEmailTemplates)) return tr("unavailableEmail");
    
    const template = fullEmailTemplates.find(t => t.id === parseInt(templateId.toString()));
    if (!template) return tr("unavailableEmail");
    
    return `${tr("emailSubject")} ${template.subject || tr("unknown")}\n\n${tr("emailContent")} ${template.htmlContent || template.textContent || tr("unknown")}`;
  };
  
  const getSmsTemplateContent = (templateId: string | number) => {
    if (!smsTemplates || !Array.isArray(smsTemplates)) return tr("unavailableSms");
    
    const template = smsTemplates.find(t => t.id === parseInt(templateId.toString()));
    return template?.templateText || tr("unavailableSms");
  };

  // Authentication check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  // Fetch shop statistics
  const { data: stats = {} } = useQuery({
    queryKey: ["/api/shop/statistics"],
    enabled: isAuthenticated,
  });

  // Fetch orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders/all"],
    enabled: isAuthenticated,
  });

  // Fetch products for inventory management
  const { data: products = [] } = useQuery<ShopProduct[]>({
    queryKey: ["/api/shop/products"],
    enabled: isAuthenticated,
  });

  // Fetch proforma reminders
  const { data: reminderSchedules } = useQuery({
    queryKey: ["/api/shop/proforma-reminders"],
    enabled: isAuthenticated,
  });

  // Fetch discount settings
  const { data: discountsResponse = {} } = useQuery({
    queryKey: ["/api/shop/discounts"],
    enabled: isAuthenticated,
  });

  const discounts = discountsResponse?.data || [];

  // Fetch accounting stats
  const { data: accountingStats = {} } = useQuery({
    queryKey: ["/api/shop/accounting-stats"],
    enabled: isAuthenticated,
  });

  // Fetch returns
  const { data: returns = [], isLoading: returnsLoading } = useQuery({
    queryKey: ["/api/shop/returns"],
    enabled: isAuthenticated,
  });

  // Fetch return statistics
  const { data: returnStats = {} } = useQuery({
    queryKey: ["/api/shop/returns/stats"],
    enabled: isAuthenticated,
  });

  // Fetch financial transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/shop/financial-transactions"],
    enabled: isAuthenticated,
  });

  // Fetch shop settings for proforma deadline - properly type the response
  const { data: shopSettingsResponse, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/shop/settings'],
    enabled: isAuthenticated,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache for debugging  
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Extract the actual settings data from the response
  const shopSettings = shopSettingsResponse?.data || [];

  // Load existing proforma deadline settings
  useEffect(() => {
    console.log('📄 [PROFORMA DEADLINE] Raw response:', shopSettingsResponse);
    console.log('📄 [PROFORMA DEADLINE] Parsed settings:', shopSettings);
    if (Array.isArray(shopSettings) && shopSettings.length > 0) {
      const proformaDeadline = shopSettings.find((s: any) => s.setting_key === 'proforma_deadline_days');
      console.log('📄 [PROFORMA DEADLINE] Found setting:', proformaDeadline);
      if (proformaDeadline) {
        console.log('📄 [PROFORMA DEADLINE] Setting state to:', proformaDeadline.setting_value);
        setProformaDeadlineDays(proformaDeadline.setting_value);
      }
    }
  }, [shopSettingsResponse, shopSettings]);

  // Save proforma deadline mutation
  const saveProformaDeadlineMutation = useMutation({
    mutationFn: async (days: string) => {
      console.log('💾 [PROFORMA DEADLINE] Saving days:', days);
      const settings = [{
        setting_key: 'proforma_deadline_days',
        setting_value: days,
        setting_type: 'number',
        display_name: 'Purchase Proforma Deadline (Days)',
        description: 'Number of days for proforma payment deadline',
        category: 'payment',
        is_public: true,
        validation_rule: 'min:1,max:30',
        default_value: '3'
      }];
      console.log('💾 [PROFORMA DEADLINE] Settings to save:', settings);
      const result = await apiRequest('/api/shop/settings', { method: 'POST', body: { settings } });
      console.log('💾 [PROFORMA DEADLINE] Save result:', result);
      return result;
    },
    onSuccess: () => {
      toast({
        title: tr("success"),
        description: tr("updated"),
      });
      // Force refresh the settings data
      queryClient.invalidateQueries({ queryKey: ['/api/shop/settings'] });
      queryClient.refetchQueries({ queryKey: ['/api/shop/settings'] });
      // Also invalidate related queries that might use this setting
      queryClient.invalidateQueries({ queryKey: ['/api/public/payment-methods'] });
    },
    onError: (error: any) => {
      toast({
        title: tr("error"),
        description: error.message || tr("updateFailed"),
        variant: "destructive",
      });
    },
  });

  // Add reminder mutation
  const addReminderMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/shop/proforma-reminders`, {
        method: "POST",
        body: {
          reminderHour: parseInt(reminderHour),
          daysBefore: parseInt(reminderDays),
          messageTemplate: `یادآوری: مهلت پرداخت حواله شما ${reminderDays === "0" ? "امروز" : `${reminderDays} روز دیگر`} به پایان می‌رسد.`,
          messageSubject: `یادآوری پرداخت حواله - ${reminderDays === "0" ? "روز پایان مهلت" : `${reminderDays} روز مانده`}`,
          notificationMethod: "email",
          isActive: true,
          priority: parseInt(reminderDays) + 1,
          smsTemplateId: smsTemplateId || null,
          emailTemplateId: emailTemplateId || null
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop/proforma-reminders"] });
      setReminderDays("1");
      setReminderHour("10");
      setSmsTemplateId("");
      setEmailTemplateId("");
      toast({
        title: tr("success"),
        description: tr("add"),
      });
    },
    onError: (error: any) => {
      toast({
        title: tr("error"),
        description: error.message || tr("error"),
        variant: "destructive",
      });
    },
  });

  // Delete reminder mutation
  const deleteReminderMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/shop/proforma-reminders/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop/proforma-reminders"] });
      toast({
        title: tr("success"),
        description: tr("deleteDiscount"),
      });
    },
    onError: (error: any) => {
      toast({
        title: tr("error"),
        description: error.message || tr("error"),
        variant: "destructive",
      });
    },
  });

  // Update reminder mutation
  const updateReminderMutation = useMutation({
    mutationFn: async () => {
      if (!editingReminder) return;
      return apiRequest(`/api/shop/proforma-reminders/${editingReminder.id}`, {
        method: "PUT",
        body: {
          reminderHour: parseInt(reminderHour),
          daysBefore: parseInt(reminderDays),
          messageTemplate: `یادآوری: مهلت پرداخت حواله شما ${reminderDays === "0" ? "امروز" : `${reminderDays} روز دیگر`} به پایان می‌رسد.`,
          messageSubject: `یادآوری پرداخت حواله - ${reminderDays === "0" ? "روز پایان مهلت" : `${reminderDays} روز مانده`}`,
          notificationMethod: "email",
          isActive: true,
          priority: parseInt(reminderDays) + 1,
          smsTemplateId: smsTemplateId || null,
          emailTemplateId: emailTemplateId || null
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop/proforma-reminders"] });
      setEditingReminder(null);
      setIsEditReminderDialogOpen(false);
      setReminderDays("1");
      setReminderHour("10");
      setSmsTemplateId("");
      setEmailTemplateId("");
      toast({
        title: tr("success"),
        description: tr("updated"),
      });
    },
    onError: (error: any) => {
      toast({
        title: tr("error"),
        description: error.message || tr("error"),
        variant: "destructive",
      });
    },
  });

  // Update order status mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: number; updates: any }) => {
      return apiRequest(`/api/shop/orders/${orderId}`, { method: "PATCH", body: updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/statistics"] });
      toast({
        title: tr("updated"),
        description: tr("orderUpdated"),
      });
    },
    onError: () => {
      toast({
        title: tr("updateFailed"),
        description: tr("orderUpdateFailed"),
        variant: "destructive",
      });
    },
  });

  // Update discount mutation
  const updateDiscountMutation = useMutation({
    mutationFn: async ({ discountId, updates }: { discountId: number; updates: any }) => {
      return apiRequest(`/api/shop/discounts/${discountId}`, { method: "PATCH", body: updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop/discounts"] });
      toast({
        title: tr("updated"),
        description: tr("discountUpdated"),
      });
    },
    onError: () => {
      toast({
        title: tr("updateFailed"),
        description: tr("discountUpdateFailed"),
        variant: "destructive",
      });
    },
  });

  // Delete discount mutation
  const deleteDiscountMutation = useMutation({
    mutationFn: async (discountId: number) => {
      return apiRequest(`/api/shop/discounts/${discountId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop/discounts"] });
      toast({
        title: tr("success"),
        description: tr("deleteDiscount"),
      });
    },
    onError: () => {
      toast({
        title: tr("error"),
        description: tr("error"),
        variant: "destructive",
      });
    },
  });

  // Convert proforma to invoice mutation
  const convertToInvoiceMutation = useMutation({
    mutationFn: async (orderNumber: string) => {
      return await apiRequest(`/api/admin/orders/${orderNumber}/convert-to-invoice`, { 
        method: 'POST' 
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/all"] });
      toast({
        title: tr("success"),
        description: data.message || tr("convertInvoice"),
      });
    },
    onError: (error: any) => {
      toast({
        title: tr("error"),
        description: error?.message || tr("convertInvoiceFailed"),
        variant: "destructive",
      });
    },
  });


  // Returns handlers
  const handleDeleteReturn = async (returnId: number) => {
    try {
      await apiRequest("DELETE", `/api/shop/returns/${returnId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/shop/returns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/returns/stats"] });
      toast({
        title: tr("success"),
        description: tr("deleteReturn"),
      });
    } catch (error: any) {
      toast({
        title: tr("error"),
        description: error.message || tr("deleteReturnFailed"),
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir={direction}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{tr("shopAdministration")}</h1>
            <p className="text-gray-600">{tr("manageOperations")}</p>
          </div>
          <Button
            onClick={() => queryClient.invalidateQueries()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {tr("refreshData")}
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{tr("totalOrders")}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrders || 0}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{tr("pendingOrders")}</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pendingOrders || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{tr("products")}</p>
                  <p className="text-2xl font-bold text-green-600">{products.length}</p>
                </div>
                <Package className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{tr("revenue")}</p>
                  <p className="text-2xl font-bold text-purple-600">${accountingStats.totalRevenue || 0}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid grid-cols-5 gap-1 h-auto p-2 bg-gray-100 rounded-lg">
            <TabsTrigger value="orders" className="text-sm px-3 py-2">{tr("orders")}</TabsTrigger>
            <TabsTrigger value="discounts" className="text-sm px-3 py-2">{tr("discountSettings")}</TabsTrigger>
            <TabsTrigger value="bulk-purchases" className="text-sm px-3 py-2">{tr("bulkPurchases")}</TabsTrigger>
            <TabsTrigger value="proforma-deadline" className="text-sm px-3 py-2">{tr("purchaseProformaDeadline")}</TabsTrigger>
            <TabsTrigger value="inventory" className="text-sm px-3 py-2">{tr("inventory")}</TabsTrigger>
            <TabsTrigger value="invoices" className="text-sm px-3 py-2">{tr("invoiceManagement")}</TabsTrigger>
            <TabsTrigger value="returns" className="text-sm px-3 py-2">{tr("returnedItems")}</TabsTrigger>
            <TabsTrigger value="abandoned-cart" className="text-sm px-3 py-2">{tr("abandonedCart")}</TabsTrigger>
            <TabsTrigger value="reports" className="text-sm px-3 py-2">{tr("salesReports")}</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    {tr("orderManagement")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {/* Orders filters and search */}
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder={tr("searchOrders")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={tr("filterStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value="all">{tr("allOrders")}</SelectItem>
                       <SelectItem value="pending">{tr("pending")}</SelectItem>
                       <SelectItem value="confirmed">{tr("confirmed")}</SelectItem>
                       <SelectItem value="shipped">{tr("shipped")}</SelectItem>
                       <SelectItem value="delivered">{tr("delivered")}</SelectItem>
                       <SelectItem value="cancelled">{tr("cancelled")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Orders table with horizontal and vertical scroll */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full min-w-[1200px]">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                            {tr("orderNumber")}
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                            {tr("customerName")}
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                            {tr("mobile")}
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-52">
                            {tr("email")}
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                            {tr("totalAmount")}
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                            {tr("status")}
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                            {tr("invoiceType")}
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                            {tr("date")}
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                            {tr("actions")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {orders.length > 0 ? orders.map((order: any) => (
                          <tr key={order.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm font-medium text-gray-900 w-32">
                              <div className="truncate">#{order.orderNumber || order.id}</div>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 w-48">
                              <div className="truncate">
                                {order.customer ? 
                                  `${order.customer.firstName} ${order.customer.lastName}` : 
                                  order.customerName || tr("unknown")
                                }
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 w-36">
                              <div className="truncate">
                                {order.customer?.phone || order.mobileNumber || tr("unknown")}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 w-52">
                              <div className="truncate">
                                {order.customer?.email || order.email || tr("unknown")}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 w-32">
                              <div className="truncate font-medium">
                                ${order.totalAmount || 0}
                              </div>
                            </td>
                            <td className="px-3 py-2 w-32">
                              <Badge variant={order.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                                 {order.status === 'pending' ? tr("pending") :
                                  order.status === 'confirmed' ? tr("confirmed") :
                                  order.status === 'shipped' ? tr("shipped") :
                                  order.status === 'delivered' ? tr("delivered") :
                                  order.status === 'cancelled' ? tr("cancelled") :
                                 tr("unknown")}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 w-24">
                              <Badge 
                                variant={order.invoiceType === 'invoice' ? 'default' : 'secondary'} 
                                className={`text-xs ${order.invoiceType === 'invoice' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}
                              >
                                 {order.invoiceType === 'invoice' ? tr("invoice") : tr("proforma")}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 w-32">
                              <div className="truncate">
                                 {new Date(order.createdAt).toLocaleDateString(dateLocale)}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 w-40">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedOrder(order)}
                                  className="flex items-center gap-1 text-xs px-2 py-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  {tr("details")}
                                </Button>
                                {/* Convert to Invoice Button */}
                                {(order.status === 'shipped' || order.status === 'delivered') && order.invoiceType === 'proforma' && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => convertToInvoiceMutation.mutate(order.orderNumber || order.id.toString())}
                                    disabled={convertToInvoiceMutation.isPending}
                                    className="flex items-center gap-1 text-xs px-2 py-1 bg-green-600 hover:bg-green-700"
                                     title={tr("convertInvoice")}
                                  >
                                    <FileText className="w-3 h-3" />
                                    {convertToInvoiceMutation.isPending ? (
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : (
                                      tr("invoice")
                                    )}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                               {tr("noOrders")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Scroll indicator */}
                  <div className="bg-gray-100 px-4 py-1 text-xs text-gray-500 text-center border-t">
                    {orders.length > 15 && (
                       <span>{tr("scrollOrders", { count: orders.length })}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                   {tr("inventoryManagement")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {products.map((product: any) => (
                    <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{product.name}</h3>
                         <p className="text-sm text-gray-600">{tr("sku")}: {product.sku}</p>
                         <p className="text-sm text-gray-600">{tr("price")}: ${product.unitPrice}</p>
                      </div>
                      <div className="text-right">
                         <p className="font-medium">{tr("stock")}: {product.stockQuantity}</p>
                        <Badge variant={product.stockQuantity > 10 ? 'default' : 'destructive'}>
                           {product.stockQuantity > 10 ? tr("inStock") : tr("lowStock")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discounts Tab */}
          <TabsContent value="discounts" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Percent className="w-5 h-5" />
                   {tr("discountSettings")}
                </CardTitle>
                <Button 
                  onClick={() => {
                    setEditingDiscount(null);
                    setIsDiscountDialogOpen(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                   {tr("createDiscount")}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {discounts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Percent className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                       <p>{tr("noDiscounts")}</p>
                       <p className="text-sm">{tr("createDiscountHint")}</p>
                    </div>
                  ) : (
                    discounts.map((discount: any) => (
                      <div key={discount.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{discount.name}</h3>
                          <p className="text-sm text-gray-600">{discount.description}</p>
                          <p className="text-sm text-green-600">{discount.discountPercentage}% off</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={discount.isActive ? 'default' : 'secondary'}>
                             {discount.isActive ? tr("active") : tr("inactive")}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingDiscount(discount);
                              setIsDiscountDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(tr("confirmDeleteDiscount"))) {
                                deleteDiscountMutation.mutate(discount.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deleteDiscountMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk Purchases Tab */}
          <TabsContent value="bulk-purchases" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                   {tr("bulkConfiguration")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {products.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                       <p>{tr("noProducts")}</p>
                       <p className="text-sm">{tr("bulkHint")}</p>
                    </div>
                  ) : (
                    products.map((product: any) => (
                      <BulkPurchaseProductCard 
                        key={product.id} 
                        product={product}
                        onUpdate={() => {
                          queryClient.invalidateQueries({ queryKey: ["/api/shop/products"] });
                          toast({
                            title: tr("success"),
                            description: tr("updated"),
                          });
                        }}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchase Proforma Deadline Tab */}
          <TabsContent value="proforma-deadline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                   {tr("deadlineSettings")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                     {tr("deadlineAlert")}
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Label htmlFor="proforma_deadline">{tr("paymentDeadline")}</Label>
                    <Input
                      id="proforma_deadline"
                      type="number"
                      min="1"
                      max="30"
                      value={proformaDeadlineDays}
                      onChange={(e) => setProformaDeadlineDays(e.target.value)}
                      placeholder="3"
                    />
                    <p className="text-sm text-muted-foreground">
                       {tr("deadlineHint")}
                    </p>
                  </div>
                  <div className="space-y-2">
                     <Label>{tr("previewMessage")}</Label>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm">
                         {tr("deadlineDays", { days: proformaDeadlineDays })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                         {tr("deadlinePreviewHint")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button 
                    onClick={() => saveProformaDeadlineMutation.mutate(proformaDeadlineDays)}
                    disabled={saveProformaDeadlineMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {saveProformaDeadlineMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {saveProformaDeadlineMutation.isPending ? tr("saving") : tr("saveSettings")}
                  </Button>
                </div>

                <Separator className="my-6" />

                {/* Reminder Schedule Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                     {tr("reminderSchedule")}
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-4 space-x-reverse p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2 space-x-reverse">
                         <Label htmlFor="reminder-days">{tr("daysBeforeDeadline")}</Label>
                        <Input
                          id="reminder-days"
                          type="number"
                          min="0"
                          max="10"
                          value={reminderDays}
                          onChange={(e) => setReminderDays(e.target.value)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                         <Label htmlFor="reminder-hour">{tr("sendTime")}</Label>
                        <Input
                          id="reminder-hour"
                          type="number"
                          min="0"
                          max="23"
                          value={reminderHour}
                          onChange={(e) => setReminderHour(e.target.value)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                         <Label htmlFor="sms-template">{tr("smsTemplate")}</Label>
                        <Select value={smsTemplateId} onValueChange={setSmsTemplateId}>
                          <SelectTrigger className="w-64">
                             <SelectValue placeholder={tr("chooseSms")} />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(smsTemplates) && smsTemplates.map((template: any) => (
                              <TooltipProvider key={template.id}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <SelectItem value={template.id.toString()}>
                                      {template.templateNumber} - {template.templateName}
                                    </SelectItem>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm p-3" side="right">
                                    <div className="space-y-1">
                                       <p className="font-medium text-sm">{tr("smsContent")}</p>
                                      <p className="text-xs text-gray-700 whitespace-pre-wrap">
                                        {getSmsTemplateContent(template.id)}
                                      </p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                         <Label htmlFor="email-template">{tr("emailTemplate")}</Label>
                        <Select value={emailTemplateId} onValueChange={setEmailTemplateId}>
                          <SelectTrigger className="w-64">
                             <SelectValue placeholder={tr("chooseEmail")} />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(emailTemplates) && emailTemplates.map((template: any) => (
                              <TooltipProvider key={template.id}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <SelectItem value={template.id.toString()}>
                                      {template.name} ({template.category})
                                    </SelectItem>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm p-3" side="right">
                                    <div className="space-y-1">
                                       <p className="font-medium text-sm">{tr("emailContent")}</p>
                                      <p className="text-xs text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                        {getEmailTemplateContent(template.id)}
                                      </p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => addReminderMutation.mutate()}
                        disabled={addReminderMutation.isPending}
                      >
                        {addReminderMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                         {tr("add")}
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {reminderSchedules?.data?.map((schedule: any) => (
                        <div key={schedule.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center space-x-4 space-x-reverse">
                            <Badge variant="outline" className="bg-blue-100">
                               {schedule.days_before === 0 ? tr("daysBeforeDeadline") : `${schedule.days_before} ${tr("daysBeforeDeadline")}`}
                            </Badge>
                           <span className="text-sm">{tr("sendTime")} {schedule.reminder_hour}:00</span>
                            <span className="text-sm text-gray-600">{schedule.message_subject}</span>
                            {(schedule.sms_template_id || schedule.email_template_id) && (
                              <div className="flex items-center space-x-1 space-x-reverse text-xs text-blue-600">
                                {schedule.sms_template_id && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="bg-blue-100 px-2 py-1 rounded cursor-help">
                                           {tr("smsTemplate")} {(() => {
                                            const template = Array.isArray(smsTemplates) && smsTemplates.find((t: any) => t.id === schedule.sms_template_id);
                                            return template ? `${template.templateNumber} - ${template.templateName}` : schedule.sms_template_id;
                                          })()}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-sm p-3" side="top">
                                        <div className="space-y-1">
                                           <p className="font-medium text-sm">{tr("smsContent")}</p>
                                          <p className="text-xs text-gray-700 whitespace-pre-wrap">
                                            {(() => {
                                              const template = Array.isArray(smsTemplates) && smsTemplates.find((t: any) => t.id === schedule.sms_template_id);
                                               return template?.templateText || tr("unavailableSms");
                                            })()}
                                          </p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {schedule.email_template_id && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="bg-green-100 px-2 py-1 rounded cursor-help">
                                   {tr("emailTemplate")} {(() => {
                                            const template = Array.isArray(emailTemplates) && emailTemplates.find((t: any) => t.id === schedule.email_template_id);
                                            return template ? `${template.name} (${template.category})` : schedule.email_template_id;
                                          })()}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-sm p-3" side="top">
                                        <div className="space-y-1">
                                           <p className="font-medium text-sm">{tr("emailSubject")}</p>
                                          <p className="text-xs text-gray-700">
                                            {(() => {
                                              const template = Array.isArray(emailTemplates) && emailTemplates.find((t: any) => t.id === schedule.email_template_id);
                                               return template?.subject || tr("unavailableSubject");
                                            })()}
                                          </p>
                                           <p className="font-medium text-sm mt-2">{tr("emailContent")}</p>
                                          <p className="text-xs text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                            {(() => {
                                              const template = Array.isArray(emailTemplates) && emailTemplates.find((t: any) => t.id === schedule.email_template_id);
                                               return template?.content || tr("unavailableEmail");
                                            })()}
                                          </p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-blue-600 hover:text-blue-700"
                              onClick={() => {
                                setEditingReminder(schedule);
                                setReminderDays(schedule.days_before.toString());
                                setReminderHour(schedule.reminder_hour.toString());
                                setSmsTemplateId(schedule.sms_template_id ? schedule.sms_template_id.toString() : "");
                                setEmailTemplateId(schedule.email_template_id ? schedule.email_template_id.toString() : "");
                                setIsEditReminderDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 hover:text-red-700"
                              onClick={() => deleteReminderMutation.mutate(schedule.id)}
                              disabled={deleteReminderMutation.isPending}
                            >
                              {deleteReminderMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {(!reminderSchedules?.data || reminderSchedules.data.length === 0) && (
                        <div className="text-center py-4 text-gray-500">
                          <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                           <p className="text-sm">{tr("noReminders")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                     {tr("reminderNote")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Edit Reminder Dialog */}
            <Dialog open={isEditReminderDialogOpen} onOpenChange={setIsEditReminderDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Edit className="w-5 h-5" />
                     {tr("editReminder")}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label htmlFor="edit-reminder-days">{tr("daysBeforeDeadline")}</Label>
                      <Input
                        id="edit-reminder-days"
                        type="number"
                        min="0"
                        max="10"
                        value={reminderDays}
                        onChange={(e) => setReminderDays(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="edit-reminder-hour">{tr("sendTime")}</Label>
                      <Input
                        id="edit-reminder-hour"
                        type="number"
                        min="0"
                        max="23"
                        value={reminderHour}
                        onChange={(e) => setReminderHour(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                     <Label htmlFor="edit-sms-template">{tr("smsTemplate")}</Label>
                    <Select value={smsTemplateId} onValueChange={setSmsTemplateId}>
                      <SelectTrigger>
                         <SelectValue placeholder={tr("chooseSms")} />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="">{tr("noTemplate")}</SelectItem>
                        {Array.isArray(smsTemplates) && smsTemplates.map((template: any) => (
                          <TooltipProvider key={template.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SelectItem value={template.id.toString()}>
                                  {template.templateNumber} - {template.templateName}
                                </SelectItem>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm p-3" side="right">
                                <div className="space-y-1">
                                   <p className="font-medium text-sm">{tr("smsContent")}</p>
                                  <p className="text-xs text-gray-700 whitespace-pre-wrap">
                                    {getSmsTemplateContent(template.id)}
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                     <Label htmlFor="edit-email-template">{tr("emailTemplate")}</Label>
                    <Select value={emailTemplateId} onValueChange={setEmailTemplateId}>
                      <SelectTrigger>
                         <SelectValue placeholder={tr("chooseEmail")} />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="">{tr("noTemplate")}</SelectItem>
                        {Array.isArray(emailTemplates) && emailTemplates.map((template: any) => (
                          <TooltipProvider key={template.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SelectItem value={template.id.toString()}>
                                  {template.name} ({template.category})
                                </SelectItem>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm p-3" side="right">
                                <div className="space-y-1">
                                   <p className="font-medium text-sm">{tr("emailContent")}</p>
                                  <p className="text-xs text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                    {getEmailTemplateContent(template.id)}
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-end space-x-2 space-x-reverse pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditReminderDialogOpen(false);
                        setEditingReminder(null);
                        setReminderDays("1");
                        setReminderHour("10");
                        setSmsTemplateId("");
                        setEmailTemplateId("");
                      }}
                    >
                       {tr("cancel")}
                    </Button>
                    <Button
                      onClick={() => updateReminderMutation.mutate()}
                      disabled={updateReminderMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {updateReminderMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin ml-2" />
                           {tr("updating")}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 ml-2" />
                           {tr("update")}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                   {tr("inventoryManagement")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {products.map((product: any) => (
                    <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{product.name}</h3>
                         <p className="text-sm text-gray-600">{tr("sku")}: {product.sku}</p>
                         <p className="text-sm text-gray-600">{tr("price")}: ${product.unitPrice}</p>
                      </div>
                      <div className="text-right">
                         <p className="font-medium">{tr("stock")}: {product.stockQuantity}</p>
                        <Badge variant={product.stockQuantity > 10 ? 'default' : 'destructive'}>
                           {product.stockQuantity > 10 ? tr("inStock") : tr("lowStock")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoice Management Tab */}
          <TabsContent value="invoices" className="space-y-6">
            <ShopInvoiceManagement />
          </TabsContent>

          {/* Returns Tab */}
          <TabsContent value="returns" className="space-y-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="text-lg font-semibold">{tr("returnsManagement")}</h3>
                <Button onClick={() => setShowReturnForm(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                   {tr("addReturn")}
                </Button>
              </div>

              {/* Return Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                     <CardTitle className="text-sm text-center">{tr("totalReturns")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-center text-blue-600">
                      {returnStats?.totalReturns || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                     <CardTitle className="text-sm text-center">{tr("totalReturnAmount")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-center text-red-600">
                      ${returnStats?.totalReturnAmount || '0'}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                     <CardTitle className="text-sm text-center">{tr("pendingReturns")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-center text-orange-600">
                      {returnStats?.pendingReturns || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                     <CardTitle className="text-sm text-center">{tr("approvedReturns")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-center text-green-600">
                      {returnStats?.approvedReturns || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Returns Table */}
              <Card>
                <CardHeader>
                   <CardTitle>{tr("returnsList")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                             {tr("productName")}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                             {tr("quantity")}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                             {tr("customerName")}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                             {tr("customerPhone")}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                             {tr("returnDate")}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                             {tr("amount")}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                             {tr("status")}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                             {tr("actions")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {returns && returns.length > 0 ? returns.map((returnItem: any) => (
                          <tr key={returnItem.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 text-sm font-medium text-gray-900">
                              {returnItem.productName}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              {returnItem.returnQuantity}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              {returnItem.customerName}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              {returnItem.customerPhone}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              {new Date(returnItem.returnDate).toLocaleDateString(dateLocale)}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              ${returnItem.totalReturnAmount}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              <Badge variant={
                                returnItem.refundStatus === 'approved' ? 'default' :
                                returnItem.refundStatus === 'pending' ? 'secondary' :
                                returnItem.refundStatus === 'rejected' ? 'destructive' : 'secondary'
                              }>
                                 {returnItem.refundStatus === 'pending' ? tr("pending") :
                                  returnItem.refundStatus === 'approved' ? tr("approved") :
                                  returnItem.refundStatus === 'rejected' ? tr("rejected") :
                                  returnItem.refundStatus === 'refunded' ? tr("refunded") :
                                 tr("unknown")}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-sm">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedReturn(returnItem);
                                    setShowReturnDialog(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteReturn(returnItem.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                               {tr("noReturns")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Abandoned Cart Tab */}
          <TabsContent value="abandoned-cart" className="space-y-6">
            <AbandonedCartManagement />
          </TabsContent>

          {/* Sales Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <SalesReport />
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-right">
                 {tr("orderDetails")} #{selectedOrder.orderNumber || selectedOrder.id}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6" dir={direction}>
              {/* Customer Information */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                   {tr("customerInfo")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                     <p className="text-sm text-gray-600">{tr("customerName")}</p>
                    <p className="font-medium">
                      {selectedOrder.customer ? 
                        `${selectedOrder.customer.firstName} ${selectedOrder.customer.lastName}` : 
                        selectedOrder.customerName || tr("unknown")
                      }
                    </p>
                  </div>
                  <div>
                     <p className="text-sm text-gray-600">{tr("mobile")}</p>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {selectedOrder.customer?.phone || selectedOrder.mobileNumber || tr("unknown")}
                    </p>
                  </div>
                  <div>
                     <p className="text-sm text-gray-600">{tr("email")}</p>
                    <p className="font-medium flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {selectedOrder.customer?.email || selectedOrder.email || tr("unknown")}
                    </p>
                  </div>
                  {selectedOrder.customer?.company && (
                    <div>
                       <p className="text-sm text-gray-600">{tr("company")}</p>
                      <p className="font-medium flex items-center gap-1">
                        <Building className="w-4 h-4" />
                        {selectedOrder.customer.company}
                      </p>
                    </div>
                  )}
                  {selectedOrder.customer?.city && (
                    <div>
                       <p className="text-sm text-gray-600">{tr("city")}</p>
                      <p className="font-medium">{selectedOrder.customer.city}</p>
                    </div>
                  )}
                  {selectedOrder.customer?.address && (
                    <div className="md:col-span-2">
                       <p className="text-sm text-gray-600">{tr("address")}</p>
                      <p className="font-medium">{selectedOrder.customer.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Summary */}
              <div className="border rounded-lg p-4 bg-green-50">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                   {tr("orderSummary")}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                     <p className="text-sm text-gray-600">{tr("orderNumber")}</p>
                    <p className="font-medium">#{selectedOrder.orderNumber || selectedOrder.id}</p>
                  </div>
                  <div>
                     <p className="text-sm text-gray-600">{tr("orderDate")}</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                       {new Date(selectedOrder.createdAt).toLocaleDateString(dateLocale)}
                    </p>
                  </div>
                  <div>
                     <p className="text-sm text-gray-600">{tr("orderStatus")}</p>
                    <Badge className="mt-1" variant={selectedOrder.status === 'confirmed' ? 'default' : 'secondary'}>
                       {selectedOrder.status === 'pending' ? tr("pending") :
                        selectedOrder.status === 'confirmed' ? tr("confirmed") :
                        selectedOrder.status === 'shipped' ? tr("shipped") :
                        selectedOrder.status === 'delivered' ? tr("delivered") :
                        selectedOrder.status === 'cancelled' ? tr("cancelled") :
                       tr("unknown")}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{tr("totalAmount")}</p>
                    <p className="font-bold text-lg text-green-600">${selectedOrder.totalAmount}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                   {tr("orderItems", { count: selectedOrder.items?.length || 0 })}
                </h3>
                <div className="space-y-3">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.productName || item.name || tr("productName")}</p>
                           <p className="text-sm text-gray-600">{tr("productCode")}: {item.productSku || item.sku || tr("unknown")}</p>
                           <p className="text-sm text-blue-600">{tr("unitPrice")}: ${item.price || item.unitPrice || 0}</p>
                        </div>
                        <div className="text-right">
                           <p className="font-medium">{tr("quantity")}: {item.quantity || 1}</p>
                          <p className="text-lg font-bold text-green-600">
                            ${((item.price || item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                       <p>{tr("noItems")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Information */}
              <div className="border rounded-lg p-4 bg-purple-50">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                   {tr("paymentInfo")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <p className="text-sm text-gray-600">{tr("paymentMethod")}</p>
                     <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                       <CreditCard className="w-3 h-3" />
                       {paymentMethodLabel(selectedOrder.paymentMethod)}
                     </Badge>
                  </div>
                  <div>
                     <p className="text-sm text-gray-600">{tr("paymentStatus")}</p>
                    <Badge variant={selectedOrder.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                       {selectedOrder.paymentStatus === 'paid' ? tr("paid") :
                        selectedOrder.paymentStatus === 'pending' ? tr("pendingPayment") :
                        selectedOrder.paymentStatus === 'failed' ? tr("failed") :
                        selectedOrder.paymentStatus || tr("unknown")}
                    </Badge>
                  </div>
                  
                  {/* Payment Source Details */}
                  {(selectedOrder.walletAmountUsed > 0 || selectedOrder.paymentMethod === 'wallet_partial' || selectedOrder.paymentMethod === 'wallet_full') && (
                    <div className="md:col-span-2">
                       <p className="text-sm text-gray-600 mb-2">{tr("fundingSources")}</p>
                      <div className="space-y-2">
                        {selectedOrder.walletAmountUsed > 0 && (
                          <div className="flex justify-between items-center p-2 bg-green-100 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                               <span className="text-sm font-medium text-green-800">{tr("wallet")}</span>
                            </div>
                            <span className="font-bold text-green-700">
                              ${parseFloat(selectedOrder.walletAmountUsed || 0).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {selectedOrder.paymentMethod === 'wallet_partial' && selectedOrder.walletAmountUsed === 0 && (
                          <div className="flex justify-between items-center p-2 bg-orange-100 rounded-lg border border-orange-200">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                               <span className="text-sm font-medium text-orange-800">{tr("partialWallet")}</span>
                            </div>
                            <span className="font-bold text-orange-700">
                               {tr("incompleteWallet")}
                            </span>
                          </div>
                        )}
                        {selectedOrder.paymentMethod === 'wallet_partial' && selectedOrder.walletAmountUsed > 0 && (
                          <div className="flex justify-between items-center p-2 bg-blue-100 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                               <span className="text-sm font-medium text-blue-800">{tr("bankGateway")}</span>
                            </div>
                            <span className="font-bold text-blue-700">
                              ${(parseFloat(selectedOrder.totalAmount || 0) - parseFloat(selectedOrder.walletAmountUsed || 0)).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {selectedOrder.paymentMethod === 'bank_transfer' && !selectedOrder.walletAmountUsed && (
                          <div className="flex justify-between items-center p-2 bg-purple-100 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                               <span className="text-sm font-medium text-purple-800">{tr("fullBankGateway")}</span>
                            </div>
                            <span className="font-bold text-purple-700">
                              ${parseFloat(selectedOrder.totalAmount || 0).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedOrder.discount && selectedOrder.discount > 0 && (
                    <div>
                       <p className="text-sm text-gray-600">{tr("discount")}</p>
                      <p className="font-medium text-orange-600">${selectedOrder.discount}</p>
                    </div>
                  )}
                  {selectedOrder.tax && selectedOrder.tax > 0 && (
                    <div>
                       <p className="text-sm text-gray-600">{tr("tax")}</p>
                      <p className="font-medium">${selectedOrder.tax}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Information */}
              {(selectedOrder.shippingAddress || selectedOrder.carrier) && (
                <div className="border rounded-lg p-4 bg-orange-50">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                     {tr("shippingInfo")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedOrder.carrier && (
                      <div>
                         <p className="text-sm text-gray-600">{tr("carrier")}</p>
                        <p className="font-medium">{selectedOrder.carrier}</p>
                      </div>
                    )}
                    {selectedOrder.trackingNumber && (
                      <div>
                         <p className="text-sm text-gray-600">{tr("tracking")}</p>
                        <p className="font-medium">{selectedOrder.trackingNumber}</p>
                      </div>
                    )}
                    {selectedOrder.shippingAddress && (
                      <div className="md:col-span-2">
                         <p className="text-sm text-gray-600">{tr("shippingAddress")}</p>
                        <p className="font-medium">
                          {typeof selectedOrder.shippingAddress === 'object' 
                            ? `${selectedOrder.shippingAddress.address || ''} ${selectedOrder.shippingAddress.city || ''} ${selectedOrder.shippingAddress.postalCode || ''}`.trim()
                            : selectedOrder.shippingAddress}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Actions */}
              <div className="flex gap-4 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedOrder(null)}
                >
                   {tr("close")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Return Form Dialog */}
      {showReturnForm && (
        <Dialog open={showReturnForm} onOpenChange={setShowReturnForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
               <DialogTitle>{tr("addReturn")}</DialogTitle>
            </DialogHeader>
            <ReturnForm onClose={() => setShowReturnForm(false)} />
          </DialogContent>
        </Dialog>
      )}

      {/* Return Details Dialog */}
      {selectedReturn && (
        <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
               <DialogTitle>{tr("returnDetails")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                 <label className="text-sm font-medium">{tr("productName")}</label>
                <p className="text-sm bg-gray-50 p-2 rounded">{selectedReturn.productName}</p>
              </div>
              <div>
                 <label className="text-sm font-medium">{tr("customerName")}</label>
                <p className="text-sm bg-gray-50 p-2 rounded">{selectedReturn.customerName}</p>
              </div>
              <div>
                 <label className="text-sm font-medium">{tr("returnQuantity")}</label>
                <p className="text-sm bg-gray-50 p-2 rounded">{selectedReturn.returnQuantity}</p>
              </div>
              <div>
                 <label className="text-sm font-medium">{tr("returnAmount")}</label>
                <p className="text-sm bg-gray-50 p-2 rounded">${selectedReturn.totalReturnAmount}</p>
              </div>
              <div>
                 <label className="text-sm font-medium">{tr("returnReason")}</label>
                <p className="text-sm bg-gray-50 p-2 rounded">{selectedReturn.returnReason}</p>
              </div>
              <div>
                 <label className="text-sm font-medium">{tr("status")}</label>
                <Badge variant={
                  selectedReturn.refundStatus === 'approved' ? 'default' :
                  selectedReturn.refundStatus === 'pending' ? 'secondary' :
                  selectedReturn.refundStatus === 'rejected' ? 'destructive' : 'secondary'
                }>
                   {selectedReturn.refundStatus === "pending" ? tr("pending") : selectedReturn.refundStatus === "approved" ? tr("approved") : selectedReturn.refundStatus === "rejected" ? tr("rejected") : selectedReturn.refundStatus === "refunded" ? tr("refunded") : tr("unknown")}
                </Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Discount Creation/Edit Dialog */}
      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
         <DialogContent className="max-w-lg" dir={direction}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5" />
              {editingDiscount ? tr("editDiscount") : tr("createNewDiscount")}
            </DialogTitle>
          </DialogHeader>
          <DiscountForm 
            discount={editingDiscount} 
            onClose={() => {
              setIsDiscountDialogOpen(false);
              setEditingDiscount(null);
            }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Discount Form Component
function DiscountForm({ discount, onClose }: { discount?: any; onClose: () => void }) {
  const [name, setName] = useState(discount?.name || '');
  const [description, setDescription] = useState(discount?.description || '');
  const [discountPercentage, setDiscountPercentage] = useState(discount?.discountPercentage || '');
  const [minOrderAmount, setMinOrderAmount] = useState(discount?.minOrderAmount || '');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(discount?.maxDiscountAmount || '');
  const [validFrom, setValidFrom] = useState(discount?.validFrom?.split('T')[0] || '');
  const [validTo, setValidTo] = useState(discount?.validTo?.split('T')[0] || '');
  const [isActive, setIsActive] = useState(discount?.isActive ?? true);
  const [usageLimit, setUsageLimit] = useState(discount?.usageLimit || '');
  const [applyToAllProducts, setApplyToAllProducts] = useState(discount?.applyToAllProducts ?? true);
  const [selectedProducts, setSelectedProducts] = useState<number[]>(discount?.applicableProducts || []);
  const { toast } = useToast();
  const { tr, direction } = useShopTranslations();
  const queryClient = useQueryClient();

  // Fetch products for selection
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    enabled: !applyToAllProducts,
  });

  // Create/Update mutation
  const saveDiscountMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = discount ? `/api/shop/discounts/${discount.id}` : '/api/shop/discounts';
      const method = discount ? 'PATCH' : 'POST';
      return apiRequest(url, { method, body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shop/discounts'] });
      toast({ 
        title: tr("success"),
        description: discount ? tr("discountUpdated") : tr("createDiscount")
      });
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: tr("error"),
        description: error?.message || tr("error"),
        variant: "destructive" 
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: name.trim(),
      description: description.trim(),
      discountPercentage: parseFloat(discountPercentage),
      minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
      maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
      validFrom: validFrom || null,
      validTo: validTo || null,
      isActive,
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
      applyToAllProducts,
      applicableProducts: applyToAllProducts ? [] : selectedProducts
    };

    if (!data.name || !data.discountPercentage) {
      toast({ 
        title: tr("error"),
        description: tr("requiredFields"),
        variant: "destructive" 
      });
      return;
    }

    if (data.discountPercentage < 0 || data.discountPercentage > 100) {
      toast({ 
        title: tr("error"),
        description: tr("percentageRange"),
        variant: "destructive" 
      });
      return;
    }

    saveDiscountMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir={direction}>
      <div>
         <Label htmlFor="name">{tr("discountName")} *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
           placeholder={tr("discountName")}
          required
          className="text-right"
        />
      </div>
      
      <div>
         <Label htmlFor="description">{tr("description")}</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
           placeholder={tr("description")}
          className="text-right"
        />
      </div>
      
      <div>
         <Label htmlFor="discountPercentage">{tr("discountPercentage")} *</Label>
        <Input
          id="discountPercentage"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={discountPercentage}
          onChange={(e) => setDiscountPercentage(e.target.value)}
          placeholder="10"
          required
          className="text-center"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
         <Label htmlFor="minOrderAmount">{tr("minOrderAmount")}</Label>
          <Input
            id="minOrderAmount"
            type="number"
            min="0"
            step="0.01"
            value={minOrderAmount}
            onChange={(e) => setMinOrderAmount(e.target.value)}
            placeholder="100"
            className="text-center"
          />
        </div>
        
        <div>
         <Label htmlFor="maxDiscountAmount">{tr("maxDiscountAmount")}</Label>
          <Input
            id="maxDiscountAmount"
            type="number"
            min="0"
            step="0.01"
            value={maxDiscountAmount}
            onChange={(e) => setMaxDiscountAmount(e.target.value)}
            placeholder="50"
            className="text-center"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
           <Label htmlFor="validFrom">{tr("startDate")}</Label>
          <Input
            id="validFrom"
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            className="text-left"
          />
        </div>
        
        <div>
           <Label htmlFor="validTo">{tr("endDate")}</Label>
          <Input
            id="validTo"
            type="date"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
            className="text-left"
          />
        </div>
      </div>
      
      <div>
         <Label htmlFor="usageLimit">{tr("usageLimit")}</Label>
        <Input
          id="usageLimit"
          type="number"
          min="1"
          value={usageLimit}
          onChange={(e) => setUsageLimit(e.target.value)}
          placeholder="100"
          className="text-center"
        />
      </div>
      
      {/* Product Selection */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="applyToAllProducts"
            checked={applyToAllProducts}
            onCheckedChange={(checked) => {
              setApplyToAllProducts(checked as boolean);
              if (checked) {
                setSelectedProducts([]);
              }
            }}
          />
           <Label htmlFor="applyToAllProducts">{tr("applyAll")}</Label>
        </div>
        
        {!applyToAllProducts && (
          <div>
             <Label>{tr("chooseProduct")}</Label>
            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
              {products.map((product: any) => (
                <div key={product.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`product-${product.id}`}
                    checked={selectedProducts.includes(product.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedProducts([...selectedProducts, product.id]);
                      } else {
                        setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                      }
                    }}
                  />
                  <Label htmlFor={`product-${product.id}`} className="flex-1 text-sm">
                    {product.name}
                  </Label>
                </div>
              ))}
            </div>
            {selectedProducts.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                 {tr("selectedProducts", { count: selectedProducts.length })}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isActive"
          checked={isActive}
          onCheckedChange={(checked) => setIsActive(checked as boolean)}
        />
         <Label htmlFor="isActive">{tr("active")}</Label>
      </div>
      
      <div className="flex gap-4 pt-4">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
           {tr("cancel")}
        </Button>
        <Button 
          type="submit" 
          disabled={saveDiscountMutation.isPending}
          className="flex-1"
        >
          {saveDiscountMutation.isPending 
             ? tr("saving")
             : (discount ? tr("update") : tr("add"))
          }
        </Button>
      </div>
    </form>
  );
}

// Return Form Component
function ReturnForm({ onClose }: { onClose: () => void }) {
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [productUnit, setProductUnit] = useState(""); // واحد اندازه‌گیری از کاردکس
  const [productSuggestions, setProductSuggestions] = useState<any[]>([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [returnQuantity, setReturnQuantity] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [totalReturnAmount, setTotalReturnAmount] = useState("");
  const [refundStatus, setRefundStatus] = useState("pending");
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  const [phoneSuggestions, setPhoneSuggestions] = useState<any[]>([]);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const { toast } = useToast();
  const { tr, direction, language } = useShopTranslations();
  const dateLocale = language === "fa" ? "fa-IR" : language === "ar" ? "ar" : language === "tr" ? "tr-TR" : "en-US";
  const queryClient = useQueryClient();
  
  // Add refs for timeout management
  const phoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const productTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to fetch phone suggestions
  const fetchPhoneSuggestions = async (phone: string) => {
    if (!phone || phone.length < 3) {
      setPhoneSuggestions([]);
      setShowPhoneSuggestions(false);
      return;
    }
    
    try {
      console.log('Fetching phone suggestions for:', phone);
      const data = await apiRequest(`/api/crm/customers/search-phone/${encodeURIComponent(phone)}`, { method: 'GET' });
      
      console.log('Phone suggestions received:', data);
      
      if (data && data.success && data.customers) {
        setPhoneSuggestions(data.customers);
        setShowPhoneSuggestions(data.customers.length > 0);
      } else {
        setPhoneSuggestions([]);
        setShowPhoneSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching phone suggestions:', error);
      setPhoneSuggestions([]);
      setShowPhoneSuggestions(false);
    }
  };

  // Function to select customer from suggestions
  const selectCustomerFromSuggestion = (customer: any) => {
    setCustomerPhone(customer.phone);
    setCustomerName(customer.displayName);
    setCustomerEmail(customer.email || '');
    setShowPhoneSuggestions(false);
    
    toast({
      title: tr("selected"),
      description: `${tr("customerInfo")}: ${customer.displayName}`,
    });
  };

  // Handle phone number change with debouncing
  const handlePhoneChange = (phone: string) => {
    setCustomerPhone(phone);
    
    // Clear existing timeout
    if (phoneTimeoutRef.current) {
      clearTimeout(phoneTimeoutRef.current);
    }
    
    // Set new timeout for phone suggestions
    phoneTimeoutRef.current = setTimeout(() => {
      if (phone && phone.length >= 3) {
        fetchPhoneSuggestions(phone);
      } else {
        setPhoneSuggestions([]);
        setShowPhoneSuggestions(false);
      }
    }, 500); // 500ms delay
  };

  // Function to fetch product suggestions
  const fetchProductSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setProductSuggestions([]);
      setShowProductSuggestions(false);
      return;
    }

    try {
      console.log('Fetching product suggestions for:', query);
      const data = await apiRequest(`/api/shop/products`, { method: 'GET' });
      
      console.log('Products data received:', data?.length);
      
      if (Array.isArray(data)) {
        const filtered = data
          .filter(product => 
            product.name.toLowerCase().includes(query.toLowerCase())
          )
          .map(product => ({
            id: product.id,
            name: product.name,
            displayText: `${product.name} (ID: ${product.id})`
          }))
          .slice(0, 5); // Show max 5 suggestions
        
        console.log('Filtered suggestions:', filtered);
        setProductSuggestions(filtered);
        setShowProductSuggestions(filtered.length > 0);
      }
    } catch (error) {
      console.error('Error fetching product suggestions:', error);
    }
  };

  // Handle product name change with debouncing
  const handleProductNameChange = (name: string) => {
    setProductName(name);
    setShowProductSuggestions(false);
    
    // Clear existing timeout
    if (productTimeoutRef.current) {
      clearTimeout(productTimeoutRef.current);
    }
    
    // Set new timeout
    productTimeoutRef.current = setTimeout(() => {
      if (name && name.length >= 3) {
        fetchProductSuggestions(name);
      }
    }, 300); // 300ms delay
  };

  // Handle product suggestion selection
  const selectProductFromSuggestion = async (product: any) => {
    setProductId(product.id.toString());
    setProductName(product.name);
    setShowProductSuggestions(false);
    
    // Fetch product unit from kardex
    try {
      const response = await apiRequest(`/api/products/kardex/${product.id}/unit`, { method: 'GET' });
      if (response.success && response.unit) {
        setProductUnit(response.unit);
        console.log(`✅ واحد محصول از کاردکس دریافت شد: ${response.unit}`);
      } else {
        setProductUnit(''); // Empty if no unit available
        console.log('❌ واحد محصول در کاردکس یافت نشد');
      }
    } catch (error) {
      console.error('Error fetching product unit:', error);
      setProductUnit(''); // Empty if error
    }
    
    toast({
      title: tr("selected"),
      description: `${tr("productName")}: ${product.name}`,
    });
  };

  const createReturnMutation = useMutation({
    mutationFn: async (returnData: any) => {
      const response = await apiRequest('/api/shop/returns', { method: 'POST', body: returnData });
      return response;
    },
    onSuccess: () => {
      toast({
        title: tr("success"),
        description: tr("createReturn")
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/returns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/returns/stats"] });
      
      // Clear all form fields
      setProductId('');
      setProductName('');
      setProductUnit('');
      setReturnQuantity('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setReturnReason('');
      setTotalReturnAmount('');
      setRefundStatus('pending');
      setShowReturnForm(false);
    },
    onError: (error: any) => {
      toast({
        title: tr("error"),
        description: error.message || tr("error"),
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productName || !returnQuantity || !customerName || !customerPhone) {
      toast({
        title: tr("error"),
        description: tr("requiredFields"),
        variant: "destructive"
      });
      return;
    }

    createReturnMutation.mutate({
      productId: productId ? parseInt(productId) : 1, // Default to 1 if no ID provided
      productName,
      productSku: productId ? `SKU-${productId}` : 'SKU-DEFAULT', // Generate SKU
      returnQuantity: parseInt(returnQuantity),
      customerName,
      customerPhone,
      returnReason,
      unitPrice: 0, // Default unit price
      totalReturnAmount: parseFloat(totalReturnAmount) || 0,
      refundStatus,
      returnDate: new Date() // Keep as Date object for Drizzle
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir={direction}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="productId">{tr("productIdOptional")}</Label>
          <Input
            id="productId"
            type="number"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder={tr("enterProductId")}
          />
        </div>
        
        <div className="relative">
          <Label htmlFor="productName">{tr("productName")} *</Label>
          <Input
            id="productName"
            value={productName}
            onChange={(e) => handleProductNameChange(e.target.value)}
            placeholder={tr("enterProductName")}
            required
          />
          
          {/* Product Suggestions Dropdown */}
          {showProductSuggestions && productSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 mt-1 max-h-60 overflow-y-auto">
              {productSuggestions.map((product, index) => (
                <button
                  key={product.id || index}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 text-sm"
                  onClick={() => selectProductFromSuggestion(product)}
                >
                  <div className="font-medium text-gray-900">{product.name}</div>
                  <div className="text-xs text-gray-500">{tr("productIdOptional")}: {product.id}</div>
                </button>
              ))}
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-1">
             {tr("productHint")}
          </p>
        </div>

        <div>
          <Label htmlFor="returnQuantity">{tr("returnQuantity")} * {productUnit && `(${productUnit})`}</Label>
          <div className="flex gap-2">
            <Input
              id="returnQuantity"
              type="number"
              value={returnQuantity}
              onChange={(e) => setReturnQuantity(e.target.value)}
              placeholder={tr("enterQuantity")}
              required
              className="flex-1"
            />
            {productUnit && productUnit !== 'units' && (
              <div className="flex items-center px-3 py-2 bg-gray-100 rounded-md border text-sm text-gray-700 font-medium min-w-[60px] justify-center">
                {productUnit}
              </div>
            )}
          </div>
          {productId && (
            <p className="text-xs text-gray-500 mt-1">
               {tr("unitMeasurement")} {productUnit || tr("unknown")}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="totalReturnAmount">{tr("returnAmount")} ($)</Label>
          <Input
            id="totalReturnAmount"
            type="number"
            step="0.01"
            value={totalReturnAmount}
            onChange={(e) => setTotalReturnAmount(e.target.value)}
            placeholder={tr("enterReturnAmount")}
          />
        </div>

        <div>
          <Label htmlFor="customerName">{tr("customerName")} *</Label>
          <Input
            id="customerName"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder={tr("enterCustomerName")}
            required
          />
        </div>

        <div className="relative">
          <Label htmlFor="customerPhone">{tr("customerPhone")} * {isLoadingCustomer && `(${tr("searchOrders")})`}</Label>
          <Input
            id="customerPhone"
            value={customerPhone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder={tr("enterPhone")}
            required
          />
          
          {/* Phone suggestions dropdown */}
          {showPhoneSuggestions && phoneSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 mt-1 max-h-60 overflow-y-auto">
              {phoneSuggestions.map((customer, index) => (
                <button
                  key={customer.id || index}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 text-sm"
                  onClick={() => selectCustomerFromSuggestion(customer)}
                >
                  <div className="font-medium text-gray-900">{customer.displayText}</div>
                  <div className="text-xs text-gray-500">{customer.email}</div>
                </button>
              ))}
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-1">
             {tr("phoneHint")}
          </p>
        </div>

        <div>
          <Label htmlFor="customerEmail">{tr("customerEmail")}</Label>
          <Input
            id="customerEmail"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder={tr("enterEmail")}
          />
        </div>

        <div>
          <Label htmlFor="refundStatus">{tr("refundStatus")}</Label>
          <Select value={refundStatus} onValueChange={setRefundStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{tr("pending")}</SelectItem>
              <SelectItem value="approved">{tr("approved")}</SelectItem>
              <SelectItem value="rejected">{tr("rejected")}</SelectItem>
              <SelectItem value="refunded">{tr("refunded")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="returnReason">{tr("returnReason")}</Label>
        <Input
          id="returnReason"
          value={returnReason}
          onChange={(e) => setReturnReason(e.target.value)}
          placeholder={tr("enterReason")}
        />
      </div>

      <div className="flex gap-4 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          {tr("cancel")}
        </Button>
        <Button type="submit" disabled={createReturnMutation.isPending}>
          {createReturnMutation.isPending ? tr("creating") : tr("createReturn")}
        </Button>
      </div>
    </form>
  );
}