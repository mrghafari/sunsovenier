import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Package, Search, Filter, ArrowLeft, FileText, Clock, CheckCircle, XCircle, Plus, Edit3, Trash2, Download, Upload, RefreshCw, AlertTriangle, Calendar, Users, TrendingUp, TrendingDown, BarChart3, Package2, Truck, Weight, Calculator, FileSpreadsheet, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Printer, Bell, Mail, MessageSquare, Phone, Save, Edit, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import SafeModal from '@/components/SafeModal';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import PaymentMethodBadge from '@/components/PaymentMethodBadge';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { getOrderStatusLabel, resolveOrderStatus } from '@shared/order-status';
import WarehouseReadyNotificationSettings from '@/components/WarehouseReadyNotificationSettings';
import { localizeFinanceNote } from '@/lib/localize-wallet-text';

type PageLanguage = 'en' | 'fa' | 'ar' | 'tr';

const pageTranslations: Record<string, Record<PageLanguage, string>> = {
  warehouseManagement: { en: 'Warehouse management', fa: 'مدیریت انبار', ar: 'إدارة المستودع', tr: 'Depo yönetimi' },
  warehouseDescription: { en: 'Manage orders, inventory, and warehouse operations', fa: 'مدیریت سفارشات، موجودی، و عملیات انبار', ar: 'إدارة الطلبات والمخزون وعمليات المستودع', tr: 'Siparişleri, envanteri ve depo işlemlerini yönetin' },
  orders: { en: 'Orders', fa: 'سفارشات', ar: 'الطلبات', tr: 'Siparişler' },
  currentOrders: { en: 'Current orders', fa: 'سفارش‌های جاری', ar: 'الطلبات الحالية', tr: 'Mevcut siparişler' },
  orderHistory: { en: 'Order history', fa: 'سابقه سفارش‌ها', ar: 'سجل الطلبات', tr: 'Sipariş geçmişi' },
  warehouseHistoryDescription: { en: 'Orders that have left the warehouse stage', fa: 'سفارش‌هایی که از مرحله انبار عبور کرده‌اند', ar: 'الطلبات التي غادرت مرحلة المستودع', tr: 'Depo aşamasından geçen siparişler' },
  noHistoryOrders: { en: 'No warehouse order history found', fa: 'هنوز سابقه‌ای برای سفارش‌های انبار وجود ندارد', ar: 'لا يوجد سجل لطلبات المستودع بعد', tr: 'Henüz depo siparişi geçmişi yok' },
  inventory: { en: 'Warehouse inventory', fa: 'موجودی انبار', ar: 'مخزون المستودع', tr: 'Depo envanteri' },
  searchOrders: { en: 'Search (at least 3 characters): order number, customer name, phone, email...', fa: 'جستجو (حداقل 3 کاراکتر): شماره سفارش، نام مشتری، تلفن، ایمیل...', ar: 'بحث (3 أحرف على الأقل): رقم الطلب، اسم العميل، الهاتف، البريد الإلكتروني...', tr: 'Ara (en az 3 karakter): sipariş numarası, müşteri adı, telefon, e-posta...' },
  allStatuses: { en: 'All statuses', fa: 'همه وضعیت‌ها', ar: 'كل الحالات', tr: 'Tüm durumlar' },
  withNotes: { en: 'With notes', fa: 'دارای یادداشت', ar: 'مع ملاحظات', tr: 'Notlu' },
  withoutNotes: { en: 'Without notes', fa: 'بدون یادداشت', ar: 'بدون ملاحظات', tr: 'Notsuz' },
  financialOrders: { en: 'Orders approved by finance', fa: 'سفارشات تایید شده توسط واحد مالی', ar: 'الطلبات المعتمدة من المالية', tr: 'Finans tarafından onaylanan siparişler' },
  readyForWarehouse: { en: 'Orders ready for warehouse processing and logistics', fa: 'سفارشات آماده برای پردازش انبار و ارسال به بخش لجستیک', ar: 'الطلبات الجاهزة لمعالجة المستودع والإرسال إلى الخدمات اللوجستية', tr: 'Depo işleme ve lojistiğe gönderim için hazır siparişler' },
  orderCount: { en: 'orders', fa: 'سفارش', ar: 'طلب', tr: 'sipariş' },
  strongRefresh: { en: 'Force refresh', fa: 'به‌روزرسانی قوی', ar: 'تحديث إجباري', tr: 'Zorla yenile' },
  loadingOrders: { en: 'Loading orders...', fa: 'در حال بارگیری سفارشات...', ar: 'جارٍ تحميل الطلبات...', tr: 'Siparişler yükleniyor...' },
  noOrders: { en: 'No orders found', fa: 'هیچ سفارشی یافت نشد', ar: 'لم يتم العثور على طلبات', tr: 'Sipariş bulunamadı' },
  noOrdersDescription: { en: 'There are currently no approved orders awaiting warehouse processing', fa: 'در حال حاضر هیچ سفارش تایید شده‌ای در انتظار پردازش انبار نیست', ar: 'لا توجد حالياً طلبات معتمدة بانتظار معالجة المستودع', tr: 'Şu anda depo işlemi bekleyen onaylı sipariş yok' },
  rowNumber: { en: '#', fa: 'ردیف', ar: 'الرقم', tr: 'Sıra' },
  orderNumber: { en: 'Order number', fa: 'شماره سفارش', ar: 'رقم الطلب', tr: 'Sipariş numarası' },
  contact: { en: 'Contact', fa: 'اطلاعات تماس', ar: 'جهة الاتصال', tr: 'İletişim' },
  date: { en: 'Date', fa: 'تاریخ', ar: 'التاريخ', tr: 'Tarih' },
  paymentMethod: { en: 'Payment method', fa: 'روش پرداخت', ar: 'طريقة الدفع', tr: 'Ödeme yöntemi' },
  ordersTable: { en: 'Warehouse orders', fa: 'سفارش‌های انبار', ar: 'طلبات المستودع', tr: 'Depo siparişleri' },
  customerInfo: { en: 'Customer information', fa: 'اطلاعات مشتری', ar: 'معلومات العميل', tr: 'Müşteri bilgileri' },
  shipmentWeight: { en: 'Shipment weight', fa: 'وزن محموله', ar: 'وزن الشحنة', tr: 'Gönderi ağırlığı' },
  kilogram: { en: 'kg', fa: 'کیلوگرم', ar: 'كغ', tr: 'kg' },
  totalAmount: { en: 'Total amount', fa: 'مبلغ کل', ar: 'المبلغ الإجمالي', tr: 'Toplam tutar' },
  status: { en: 'Status', fa: 'وضعیت', ar: 'الحالة', tr: 'Durum' },
  notes: { en: 'Notes', fa: 'یادداشت', ar: 'ملاحظات', tr: 'Notlar' },
  actions: { en: 'Actions', fa: 'عملیات', ar: 'الإجراءات', tr: 'İşlemler' },
  sortBy: { en: 'Sort by', fa: 'مرتب‌سازی بر اساس', ar: 'ترتيب حسب', tr: 'Şuna göre sırala' },
  currentLocation: { en: 'Current location', fa: 'بخش فعلی سفارش', ar: 'القسم الحالي للطلب', tr: 'Siparişin mevcut bölümü' },
  currentStage: { en: 'Current stage', fa: 'مرحله فعلی', ar: 'المرحلة الحالية', tr: 'Mevcut aşama' },
  financialDepartment: { en: 'Finance', fa: 'واحد مالی', ar: 'القسم المالي', tr: 'Finans' },
  warehouseDepartment: { en: 'Warehouse', fa: 'انبار', ar: 'المستودع', tr: 'Depo' },
  logisticsDepartment: { en: 'Logistics', fa: 'لجستیک', ar: 'الخدمات اللوجستية', tr: 'Lojistik' },
  completedDepartment: { en: 'Completed', fa: 'تکمیل‌شده', ar: 'مكتمل', tr: 'Tamamlandı' },
  cancelledDepartment: { en: 'Cancelled', fa: 'لغوشده', ar: 'ملغى', tr: 'İptal edildi' },
  unknown: { en: 'Unknown', fa: 'نامشخص', ar: 'غير معروف', tr: 'Bilinmiyor' },
  unknownPhone: { en: 'Unknown phone', fa: 'شماره نامشخص', ar: 'هاتف غير معروف', tr: 'Bilinmeyen telefon' },
  unknownEmail: { en: 'Unknown email', fa: 'ایمیل نامشخص', ar: 'بريد إلكتروني غير معروف', tr: 'Bilinmeyen e-posta' },
  calculating: { en: 'Calculating...', fa: 'محاسبه...', ar: 'جارٍ الحساب...', tr: 'Hesaplanıyor...' },
  customerNote: { en: 'Customer note', fa: 'یادداشت مشتری', ar: 'ملاحظة العميل', tr: 'Müşteri notu' },
  details: { en: 'Details', fa: 'جزئیات', ar: 'التفاصيل', tr: 'Ayrıntılar' },
  processing: { en: 'Processing...', fa: 'در حال پردازش...', ar: 'جارٍ المعالجة...', tr: 'İşleniyor...' },
  startProcessing: { en: 'Start processing', fa: 'شروع پردازش', ar: 'بدء المعالجة', tr: 'İşlemeyi başlat' },
  verifying: { en: 'Verifying...', fa: 'در حال تایید...', ar: 'جارٍ التحقق...', tr: 'Doğrulanıyor...' },
  firstApproval: { en: 'First-stage approval', fa: 'تایید مرحله اول', ar: 'اعتماد المرحلة الأولى', tr: 'İlk aşama onayı' },
  finalApproval: { en: 'Final approval', fa: 'تایید نهایی', ar: 'الاعتماد النهائي', tr: 'Son onay' },
  sending: { en: 'Sending...', fa: 'در حال ارسال...', ar: 'جارٍ الإرسال...', tr: 'Gönderiliyor...' },
  sendToLogistics: { en: 'Send to logistics', fa: 'ارسال به لجستیک', ar: 'إرسال إلى الخدمات اللوجستية', tr: 'Lojistiğe gönder' },
  products: { en: 'Warehouse products', fa: 'محصولات انبار', ar: 'منتجات المستودع', tr: 'Depo ürünleri' },
  searchProduct: { en: 'Search product...', fa: 'جستجو محصول...', ar: 'بحث عن منتج...', tr: 'Ürün ara...' },
  refresh: { en: 'Refresh', fa: 'بروزرسانی', ar: 'تحديث', tr: 'Yenile' },
  loading: { en: 'Loading...', fa: 'در حال بارگذاری...', ar: 'جارٍ التحميل...', tr: 'Yükleniyor...' },
  productName: { en: 'Product name', fa: 'نام محصول', ar: 'اسم المنتج', tr: 'Ürün adı' },
  productImage: { en: 'Product image', fa: 'تصویر محصول', ar: 'صورة المنتج', tr: 'Ürün görseli' },
  vendor: { en: 'Vendor', fa: 'فروشنده', ar: 'المورّد', tr: 'Tedarikçi' },
  productCode: { en: 'Product code', fa: 'کد کالا', ar: 'رمز المنتج', tr: 'Ürün kodu' },
  stock: { en: 'Stock', fa: 'موجودی', ar: 'المخزون', tr: 'Stok' },
  batchNumber: { en: 'Batch number', fa: 'شماره بچ', ar: 'رقم الدفعة', tr: 'Parti numarası' },
  remainingInBatch: { en: 'Remaining in batch', fa: 'باقی‌مانده بچ', ar: 'المتبقي في الدفعة', tr: 'Partide kalan' },
  noBatchNumber: { en: 'No batch number', fa: 'بدون شماره بچ', ar: 'بدون رقم دفعة', tr: 'Parti numarası yok' },
  minimum: { en: 'Minimum', fa: 'حداقل', ar: 'الحد الأدنى', tr: 'Minimum' },
  alertThreshold: { en: 'Alert threshold', fa: 'آستانه هشدار', ar: 'حد التنبيه', tr: 'Uyarı eşiği' },
  noProducts: { en: 'No products found', fa: 'محصولی یافت نشد', ar: 'لم يتم العثور على منتجات', tr: 'Ürün bulunamadı' },
  defaultVendor: { en: 'Momtaz Chem', fa: 'ممتاز کم', ar: 'ممتاز كيم', tr: 'Momtaz Chem' },
  outOfStock: { en: 'Out of stock', fa: 'ناموجود', ar: 'غير متوفر', tr: 'Stokta yok' },
  critical: { en: 'Critical', fa: 'بحرانی', ar: 'حرج', tr: 'Kritik' },
  low: { en: 'Low', fa: 'کم', ar: 'منخفض', tr: 'Düşük' },
  available: { en: 'Available', fa: 'موجود', ar: 'متوفر', tr: 'Mevcut' },
  lowStockSettings: { en: 'Low-stock notification settings', fa: 'تنظیمات اعلان کمبود موجودی', ar: 'إعدادات إشعارات انخفاض المخزون', tr: 'Düşük stok bildirim ayarları' },
  settings: { en: 'Email & SMS settings', fa: 'تنظیمات ایمیل و پیامک', ar: 'إعدادات البريد والرسائل', tr: 'E-posta ve SMS ayarları' },
  notificationInterval: { en: 'Notification interval (hours)', fa: 'فاصله زمانی ارسال اعلان (ساعت)', ar: 'الفاصل الزمني للإشعار (ساعات)', tr: 'Bildirim aralığı (saat)' },
  notificationIntervalHelp: { en: 'Minimum interval between two notifications for a product (1 to 168 hours)', fa: 'حداقل فاصله بین دو اعلان برای یک محصول (1 تا 168 ساعت)', ar: 'الحد الأدنى للفاصل بين إشعارين لمنتج (من 1 إلى 168 ساعة)', tr: 'Bir ürün için iki bildirim arasındaki minimum süre (1-168 saat)' },
  maxNotifications: { en: 'Maximum notifications', fa: 'حداکثر تعداد اعلان', ar: 'الحد الأقصى للإشعارات', tr: 'Maksimum bildirim' },
  maxNotificationsHelp: { en: 'Maximum notifications for each product (until stock is corrected)', fa: 'حداکثر تعداد اعلان برای هر محصول (تا زمان اصلاح موجودی)', ar: 'الحد الأقصى للإشعارات لكل منتج (حتى تصحيح المخزون)', tr: 'Her ürün için maksimum bildirim (stok düzeltilene kadar)' },
  recipients: { en: 'Notification recipients', fa: 'گیرندگان اعلان', ar: 'مستلمو الإشعارات', tr: 'Bildirim alıcıları' },
  searchAdmins: { en: 'Search and select from admin users (at least 2 characters)', fa: 'جستجو و انتخاب از کاربران مدیریتی (حداقل 2 حرف)', ar: 'البحث والاختيار من مستخدمي الإدارة (حرفان على الأقل)', tr: 'Yönetici kullanıcıları arasında arayın ve seçin (en az 2 karakter)' },
  usernameEmail: { en: 'Username or email...', fa: 'نام کاربری یا ایمیل...', ar: 'اسم المستخدم أو البريد الإلكتروني...', tr: 'Kullanıcı adı veya e-posta...' },
  noUser: { en: 'No user found', fa: 'کاربری یافت نشد', ar: 'لم يتم العثور على مستخدم', tr: 'Kullanıcı bulunamadı' },
  noRecipients: { en: 'No recipients defined', fa: 'هیچ گیرنده‌ای تعریف نشده است', ar: 'لم يتم تحديد مستلمين', tr: 'Tanımlı alıcı yok' },
  selectRecipients: { en: 'Select recipients from the search above', fa: 'از بخش جستجوی بالا، گیرندگان را انتخاب کنید', ar: 'اختر المستلمين من البحث أعلاه', tr: 'Yukarıdaki aramadan alıcıları seçin' },
  name: { en: 'Name', fa: 'نام', ar: 'الاسم', tr: 'Ad' },
  email: { en: 'Email', fa: 'ایمیل', ar: 'البريد الإلكتروني', tr: 'E-posta' },
  phone: { en: 'Phone', fa: 'تلفن', ar: 'الهاتف', tr: 'Telefon' },
  sms: { en: 'SMS', fa: 'پیامک', ar: 'رسالة نصية', tr: 'SMS' },
  whatsapp: { en: 'WhatsApp', fa: 'واتساپ', ar: 'واتساب', tr: 'WhatsApp' },
  active: { en: 'Active', fa: 'فعال', ar: 'نشط', tr: 'Aktif' },
  delete: { en: 'Delete', fa: 'حذف', ar: 'حذف', tr: 'Sil' },
  saving: { en: 'Saving...', fa: 'در حال ذخیره...', ar: 'جارٍ الحفظ...', tr: 'Kaydediliyor...' },
  saveSettings: { en: 'Save settings', fa: 'ذخیره تنظیمات', ar: 'حفظ الإعدادات', tr: 'Ayarları kaydet' },
  orderDetails: { en: 'Order details', fa: 'جزئیات سفارش', ar: 'تفاصيل الطلب', tr: 'Sipariş ayrıntıları' },
  mobile: { en: 'Mobile number', fa: 'شماره موبایل', ar: 'رقم الهاتف المحمول', tr: 'Cep telefonu' },
  orderSummary: { en: 'Order summary', fa: 'خلاصه سفارش', ar: 'ملخص الطلب', tr: 'Sipariş özeti' },
  itemCount: { en: 'Items', fa: 'تعداد آیتم‌ها', ar: 'العناصر', tr: 'Ürün sayısı' },
  grossWeight: { en: 'Gross weight', fa: 'مجموع وزن ناخالص', ar: 'الوزن الإجمالي', tr: 'Brüt ağırlık' },
  notCalculated: { en: 'Not calculated', fa: 'محاسبه نشده', ar: 'لم يُحسب', tr: 'Hesaplanmadı' },
  orderDate: { en: 'Order date', fa: 'تاریخ سفارش', ar: 'تاريخ الطلب', tr: 'Sipariş tarihi' },
  orderItems: { en: 'Order items', fa: 'آیتم‌های سفارش', ar: 'عناصر الطلب', tr: 'Sipariş ürünleri' },
  quantity: { en: 'Quantity', fa: 'تعداد', ar: 'الكمية', tr: 'Miktar' },
  unitPrice: { en: 'Unit price', fa: 'قیمت واحد', ar: 'سعر الوحدة', tr: 'Birim fiyat' },
  totalPrice: { en: 'Total price', fa: 'قیمت کل', ar: 'السعر الإجمالي', tr: 'Toplam fiyat' },
  orderStatus: { en: 'Order status', fa: 'وضعیت سفارش', ar: 'حالة الطلب', tr: 'Sipariş durumu' },
  financialApproval: { en: 'Financial approval', fa: 'تایید مالی', ar: 'الاعتماد المالي', tr: 'Mali onay' },
  warehouseProcessing: { en: 'Warehouse processing', fa: 'پردازش انبار', ar: 'معالجة المستودع', tr: 'Depo işleme' },
  logisticsProcessing: { en: 'Logistics processing', fa: 'پردازش لجستیک', ar: 'معالجة الخدمات اللوجستية', tr: 'Lojistik işleme' },
  approved: { en: 'Approved', fa: 'تایید شده', ar: 'تم الاعتماد', tr: 'Onaylandı' },
  pending: { en: 'Pending', fa: 'در انتظار', ar: 'قيد الانتظار', tr: 'Beklemede' },
  notesTitle: { en: 'Notes', fa: 'یادداشت‌ها', ar: 'الملاحظات', tr: 'Notlar' },
  customer: { en: 'Customer', fa: 'مشتری', ar: 'العميل', tr: 'Müşteri' },
  checkoutNote: { en: 'Checkout note', fa: 'یادداشت چک‌اوت', ar: 'ملاحظة الدفع', tr: 'Ödeme notu' },
  finance: { en: 'Finance', fa: 'بخش مالی', ar: 'المالية', tr: 'Finans' },
  paymentNote: { en: 'Payment approval note', fa: 'یادداشت تایید پرداخت', ar: 'ملاحظة اعتماد الدفع', tr: 'Ödeme onay notu' },
  warehouseNotes: { en: 'Warehouse notes', fa: 'یادداشت انبار', ar: 'ملاحظات المستودع', tr: 'Depo notları' },
  addWarehouseNote: { en: 'Add warehouse note', fa: 'ثبت یادداشت انبار', ar: 'إضافة ملاحظة المستودع', tr: 'Depo notu ekle' },
  editWarehouseNote: { en: 'Edit warehouse note', fa: 'ویرایش یادداشت انبار', ar: 'تعديل ملاحظة المستودع', tr: 'Depo notunu düzenle' },
  notePlaceholder: { en: 'Note for this order...', fa: 'یادداشت برای این سفارش...', ar: 'ملاحظة لهذا الطلب...', tr: 'Bu sipariş için not...' },
  saveNote: { en: 'Save note', fa: 'ذخیره یادداشت', ar: 'حفظ الملاحظة', tr: 'Notu kaydet' },
  cancel: { en: 'Cancel', fa: 'انصراف', ar: 'إلغاء', tr: 'İptal' },
  printDetails: { en: 'Print details', fa: 'پرینت جزئیات', ar: 'طباعة التفاصيل', tr: 'Ayrıntıları yazdır' },
  loadOrderDetails: { en: 'Loading order details...', fa: 'در حال بارگیری جزئیات سفارش...', ar: 'جارٍ تحميل تفاصيل الطلب...', tr: 'Sipariş ayrıntıları yükleniyor...' },
  loadOrderError: { en: 'Error loading order details', fa: 'خطا در بارگیری جزئیات سفارش', ar: 'خطأ في تحميل تفاصيل الطلب', tr: 'Sipariş ayrıntıları yüklenirken hata oluştu' },
  printDate: { en: 'Print date', fa: 'تاریخ چاپ', ar: 'تاريخ الطباعة', tr: 'Yazdırma tarihi' },
  printDateTime: { en: 'Print date and time', fa: 'تاریخ و زمان چاپ', ar: 'تاريخ ووقت الطباعة', tr: 'Yazdırma tarihi ve saati' },
  printFooter: { en: 'This document was generated by the Momtaz Chemi warehouse management system', fa: 'این سند توسط سیستم مدیریت انبار ممتاز شیمی تولید شده است', ar: 'تم إنشاء هذا المستند بواسطة نظام إدارة مستودع ممتاز كيمي', tr: 'Bu belge Momtaz Chemi depo yönetim sistemi tarafından oluşturulmuştur' },
  companyName: { en: 'Momtaz Chemi Company', fa: 'شرکت ممتاز شیمی', ar: 'شركة ممتاز شيمي', tr: 'Momtaz Chemi Şirketi' },
  error: { en: 'Error', fa: 'خطا', ar: 'خطأ', tr: 'Hata' },
  recipientExists: { en: 'This user has already been added to the recipient list', fa: 'این کاربر قبلاً به لیست گیرندگان اضافه شده است', ar: 'تمت إضافة هذا المستخدم إلى قائمة المستلمين مسبقاً', tr: 'Bu kullanıcı zaten alıcı listesine eklendi' },
  recipientAdded: { en: 'Recipient added', fa: 'گیرنده اضافه شد', ar: 'تمت إضافة المستلم', tr: 'Alıcı eklendi' },
  recipientAddedDescription: { en: 'was added to the recipient list', fa: 'به لیست گیرندگان اضافه شد', ar: 'أُضيف إلى قائمة المستلمين', tr: 'alıcı listesine eklendi' },
  settingsSaved: { en: 'Settings saved', fa: 'تنظیمات ذخیره شد', ar: 'تم حفظ الإعدادات', tr: 'Ayarlar kaydedildi' },
  settingsSavedDescription: { en: 'Inventory notification settings saved successfully', fa: 'تنظیمات اعلان موجودی با موفقیت ذخیره شد', ar: 'تم حفظ إعدادات إشعارات المخزون بنجاح', tr: 'Stok bildirim ayarları başarıyla kaydedildi' },
  saveError: { en: 'Save error', fa: 'خطا در ذخیره', ar: 'خطأ في الحفظ', tr: 'Kaydetme hatası' },
  settingsSaveError: { en: 'An error occurred while saving settings', fa: 'خطایی در ذخیره تنظیمات رخ داد', ar: 'حدث خطأ أثناء حفظ الإعدادات', tr: 'Ayarlar kaydedilirken hata oluştu' },
  warehousePending: { en: 'Warehouse pending', fa: 'در انتظار انبار', ar: 'بانتظار المستودع', tr: 'Depo bekliyor' },
  warehouseNotified: { en: 'Warehouse notified', fa: 'اطلاع رسانی انبار', ar: 'تم إخطار المستودع', tr: 'Depo bilgilendirildi' },
  rejected: { en: 'Rejected', fa: 'رد شده', ar: 'مرفوض', tr: 'Reddedildi' },
  enterNote: { en: 'Please enter a note', fa: 'لطفاً یادداشت را وارد کنید', ar: 'يرجى إدخال ملاحظة', tr: 'Lütfen bir not girin' },
  loadOrderErrorDescription: { en: 'An error occurred while loading order details.', fa: 'خطایی در بارگیری جزئیات سفارش رخ داد.', ar: 'حدث خطأ أثناء تحميل تفاصيل الطلب.', tr: 'Sipariş ayrıntıları yüklenirken bir hata oluştu.' },
  refreshed: { en: 'Refreshed', fa: 'به‌روزرسانی شد', ar: 'تم التحديث', tr: 'Yenilendi' },
  ordersRefreshed: { en: 'Orders were retrieved from the server', fa: 'لیست سفارشات از سرور بازیابی شد', ar: 'تم استرجاع قائمة الطلبات من الخادم', tr: 'Sipariş listesi sunucudan alındı' },
  orderUpdated: { en: 'Order status updated', fa: 'وضعیت سفارش به‌روزرسانی شد', ar: 'تم تحديث حالة الطلب', tr: 'Sipariş durumu güncellendi' },
  orderUpdatedDescription: { en: 'The order was successfully set to', fa: 'سفارش با موفقیت تنظیم شد:', ar: 'تم تعيين الطلب بنجاح إلى', tr: 'Sipariş başarıyla şu duruma getirildi:' },
  updated: { en: 'updated', fa: 'به‌روزرسانی شده', ar: 'محدث', tr: 'güncellendi' },
  updateError: { en: 'Update error', fa: 'خطا در به‌روزرسانی', ar: 'خطأ في التحديث', tr: 'Güncelleme hatası' },
  updateErrorDescription: { en: 'An error occurred while updating order status.', fa: 'خطایی در به‌روزرسانی وضعیت سفارش رخ داد.', ar: 'حدث خطأ أثناء تحديث حالة الطلب.', tr: 'Sipariş durumu güncellenirken bir hata oluştu.' },
  noteSaved: { en: 'Note saved', fa: 'یادداشت ذخیره شد', ar: 'تم حفظ الملاحظة', tr: 'Not kaydedildi' },
  noteSavedDescription: { en: 'Warehouse note saved successfully', fa: 'یادداشت انبار با موفقیت ذخیره شد', ar: 'تم حفظ ملاحظة المستودع بنجاح', tr: 'Depo notu başarıyla kaydedildi' },
  noteSaveError: { en: 'An error occurred while saving the note', fa: 'خطایی در ذخیره یادداشت رخ داد', ar: 'حدث خطأ أثناء حفظ الملاحظة', tr: 'Not kaydedilirken bir hata oluştu' },
};

const translatePage = (language: PageLanguage, key: string) => pageTranslations[key]?.[language] || pageTranslations[key]?.en || key;

interface InventoryProduct {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  imageUrl?: string | null;
  batchNumber?: string | null;
  stockQuantity: number;
  stockUnit?: string | null;
  availableQuantity: number;
  reservedQuantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  lowStockThreshold: number;
  isActive: boolean;
  vendorId: number | null;
  vendorName: string;
}

interface NotificationRecipient {
  id: number;
  name: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  receiveEmail: boolean;
  receiveSms: boolean;
  receiveWhatsapp: boolean;
  isActive: boolean;
}

interface InventoryNotificationSettings {
  notificationIntervalHours: number;
  maxNotifications: number;
  recipients: NotificationRecipient[];
}

interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  roleId: number;
  isActive: boolean;
}

interface Order {
  id: number;
  customerOrderId: number;
  orderNumber?: string;
  currentStatus: string;
  status: string;
  deliveryCode: string | null;
  totalAmount: string;
  currency: string;
  paymentMethod?: string;
  totalWeight: string | null;
  weightUnit: string;
  deliveryMethod: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  customerName?: string;
  customer?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  receipt?: {
    url: string;
    fileName: string;
    mimeType: string;
  };
  receiptUrl?: string;
  receiptFileName?: string;
  receiptMimeType?: string;
  createdAt: string;
  updatedAt: string;
  warehouseProcessedAt?: string;
  warehouseNotes?: string;
  financialReviewedAt?: string;
  financialNotes?: string;
  customerNotes?: string;
  quantity: number;
  paymentDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  trackingNumber?: string;
  notes?: string;
}

type SortDirection = 'asc' | 'desc';
type OrderSortKey = 'orderNumber' | 'customer' | 'contact' | 'date' | 'paymentMethod' | 'weight' | 'amount' | 'status' | 'notes';
type InventorySortKey = 'product' | 'vendor' | 'sku' | 'batch' | 'stock' | 'minimum' | 'threshold' | 'status';

const compareSortValues = (left: string | number, right: string | number) => {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
};

const WarehouseManagementFixed: React.FC = () => {
  const { language: contextLanguage, direction } = useLanguage();
  const language = (['en', 'fa', 'ar', 'tr'].includes(contextLanguage) ? contextLanguage : 'en') as PageLanguage;
  const t = (key: string) => translatePage(language, key);
  const locale = language === 'fa' ? 'fa-IR-u-ca-persian' : language === 'ar' ? 'ar-IQ-u-ca-gregory' : language === 'tr' ? 'tr-TR-u-ca-gregory' : 'en-IQ-u-ca-gregory';
  const formatNumber = (value: number, maximumFractionDigits = 0) => new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
  const formatDate = (value: string | Date, withTime = false) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t('unknown');
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
    }).format(date);
  };
  const formatCurrencyValue = (amount: number) => new Intl.NumberFormat(locale, {
    style: 'currency', currency: 'IQD', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(amount);

  // All state declarations at the top
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const detailRequestId = useRef(0);
  const [warehouseNotes, setWarehouseNotes] = useState('');
  const [quickNoteOrder, setQuickNoteOrder] = useState<Order | null>(null);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [expandedCustomerNoteOrderId, setExpandedCustomerNoteOrderId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(() => window.location.hash === '#notifications' ? 'settings' : 'orders');
  const changeTab = (tab: string) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', tab === 'settings'
      ? `${window.location.pathname}${window.location.search}#notifications`
      : `${window.location.pathname}${window.location.search}`);
  };
  const [orderView, setOrderView] = useState<'current' | 'history'>('current');
  const [orderSort, setOrderSort] = useState<{ key: OrderSortKey; direction: SortDirection }>({
    key: 'orderNumber',
    direction: 'asc',
  });
  const [inventorySort, setInventorySort] = useState<{ key: InventorySortKey; direction: SortDirection }>({
    key: 'product',
    direction: 'asc',
  });
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);

  // Inventory management states
  const [inventorySearchTerm, setInventorySearchTerm] = useState("");
  const [adminSearchTerm, setAdminSearchTerm] = useState("");
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [inventorySettings, setInventorySettings] = useState<InventoryNotificationSettings>({
    notificationIntervalHours: 24,
    maxNotifications: 1,
    recipients: []
  });

  const { toast } = useToast();

  // Print function for order details
  const handlePrintOrder = () => {
    if (!orderDetails) return;
    
    const formatCurrencyForPrint = (amount: number) => formatCurrencyValue(amount);

    const printContent = `
      <!DOCTYPE html>
      <html dir="${direction}" lang="${language}">
      <head>
        <meta charset="UTF-8">
        <title>${t('orderDetails')} ${orderDetails.orderNumber || `#${selectedOrder?.customerOrderId}`}</title>
        <style>
           body { font-family: 'Tahoma', sans-serif; margin: 12px; direction: ${direction}; line-height: 1.25; }
           .header { display: flex; direction: ltr; align-items: flex-start; gap: 10px; text-align: start; border-bottom: 1px solid #333; padding-bottom: 6px; margin-bottom: 8px; }
           .company-logo { width: 58px; height: 58px; object-fit: contain; flex: none; }
           .header-text { flex: 1; min-width: 0; direction: ${direction}; text-align: start; }
           .company-name { font-size: 17px; font-weight: bold; color: #1a365d; }
           .order-title { font-size: 14px; margin-top: 2px; }
           .print-date { font-size: 11px; margin-top: 2px; }
           .section { margin-bottom: 9px; }
           .section-title { font-size: 14px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin-bottom: 4px; }
           .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 4px; }
           .info-item { border: 1px solid #ddd; padding: 5px; border-radius: 3px; break-inside: avoid; }
           .info-label { font-weight: bold; color: #666; font-size: 11px; }
           .info-value { margin-top: 2px; font-size: 12px; }
           .items-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
           .items-table th, .items-table td { border: 1px solid #ddd; padding: 4px; text-align: start; }
          .items-table th { background-color: #f5f5f5; font-weight: bold; }
           .summary-box { background-color: #f8f9fa; padding: 7px; border-radius: 4px; margin-top: 4px; break-inside: avoid; }
           .status-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px; margin-top: 4px; }
           .status-item { padding: 5px; border-radius: 3px; text-align: center; border: 1px solid #ddd; break-inside: avoid; }
          .status-approved { background-color: #d4edda; border-color: #c3e6cb; }
          .status-pending { background-color: #f8f9fa; border-color: #dee2e6; }
           .warehouse-notes { background-color: #f8f9fa; padding: 7px; border-radius: 4px; border: 1px solid #dee2e6; }
           .footer { margin-top: 10px; text-align: center; font-size: 11px; color: #666; }
           .footer p { margin: 2px 0; }
          @media print { 
            body { 
              margin: 0; 
               padding: 0;
              box-sizing: border-box;
               font-size: 10pt;
               line-height: 1.25;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header { 
               margin-bottom: 3mm;
               break-after: avoid;
            }
            .section { 
               margin-bottom: 3mm;
            }
            .info-grid { 
              grid-template-columns: 1fr 1fr; 
               gap: 2mm;
            }
            .info-item { 
               padding: 2mm;
            }
            .items-table { 
               margin-top: 2mm;
            }
             .items-table thead { display: table-header-group; }
             .items-table tr { break-inside: avoid; }
            .items-table th, .items-table td { 
               padding: 1.5mm;
               font-size: 9pt;
            }
            .summary-box { 
               padding: 2mm;
               margin-top: 2mm;
            }
            .status-grid { 
              grid-template-columns: 1fr 1fr 1fr; 
               gap: 2mm;
            }
            .status-item { 
               padding: 2mm;
            }
            .footer { 
               margin-top: 3mm;
               break-inside: avoid;
            }
            @page {
               margin: 8mm 10mm 9mm;
              size: A4;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/attached_assets/company-logo.png" alt="${t('warehouseManagement')}" class="company-logo" />
           <div class="header-text">
             <div class="company-name">${t('companyName')}</div>
             <div class="order-title">${t('orderDetails')} ${orderDetails.orderNumber || `#${selectedOrder?.customerOrderId}`}</div>
             <div class="print-date">${t('printDate') || 'Print date'}: ${formatDate(new Date())}</div>
           </div>
        </div>

        <div class="section">
          <div class="section-title">${t('customerInfo')}</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">${t('name')}</div>
              <div class="info-value">${orderDetails.customer?.firstName || ''} ${orderDetails.customer?.lastName || ''}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('phone')}</div>
              <div class="info-value">${orderDetails.customer?.phone || t('unknown')}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('email')}</div>
              <div class="info-value">${orderDetails.customer?.email || t('unknown')}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('totalAmount')}</div>
              <div class="info-value" style="color: #059669; font-weight: bold;">${formatCurrencyForPrint(parseFloat(orderDetails.totalAmount) || 0)}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">${t('orderSummary')}</div>
          <div class="summary-box">
             <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px; text-align: center;">
              <div>
                <div class="info-label">${t('itemCount')}</div>
                 <div style="font-size: 14px; font-weight: bold; color: #1d4ed8;">${formatNumber(orderDetails.totalItems || 0)}</div>
              </div>
              <div>
                <div class="info-label">${t('grossWeight')}</div>
                 <div style="font-size: 14px; font-weight: bold; color: #1d4ed8;">${orderDetails.totalWeight ? `${formatNumber(parseFloat(orderDetails.totalWeight), 1)} ${t('kilogram')}` : t('notCalculated')}</div>
              </div>
              <div>
                <div class="info-label">${t('orderDate')}</div>
                 <div style="font-size: 12px; font-weight: bold;">${formatDate(orderDetails.orderDate)}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">${t('orderItems')}</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 35%">${t('productName')}</th>
                <th style="width: 20%">${t('productCode')}</th>
                <th style="width: 15%">${t('quantity')}</th>
                <th style="width: 15%">${t('unitPrice')}</th>
                <th style="width: 15%">${t('totalPrice')}</th>
              </tr>
            </thead>
            <tbody>
              ${orderDetails.items?.map((item: any) => `
                <tr>
                  <td>${item.productName}</td>
                  <td style="font-family: monospace;">${item.productSku}</td>
                  <td style="text-align: center; font-weight: bold;">${item.quantity}</td>
                  <td>${formatCurrencyForPrint(parseFloat(item.unitPrice) || 0)}</td>
                  <td style="font-weight: bold;">${formatCurrencyForPrint(parseFloat(item.totalPrice) || 0)}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">${t('orderStatus')}</div>
          <div class="status-grid">
            <div class="status-item ${orderDetails.financialApproved ? 'status-approved' : 'status-pending'}">
              <div style="font-weight: bold;">${t('financialApproval')}</div>
              <div>${orderDetails.financialApproved ? `✅ ${t('approved')}` : `⏳ ${t('pending')}`}</div>
            </div>
            <div class="status-item ${orderDetails.warehouseProcessed ? 'status-approved' : 'status-pending'}">
              <div style="font-weight: bold;">${t('warehouseProcessing')}</div>
              <div>${orderDetails.warehouseProcessed ? `✅ ${t('approved')}` : `⏳ ${t('pending')}`}</div>
            </div>
            <div class="status-item ${orderDetails.logisticsProcessed ? 'status-approved' : 'status-pending'}">
              <div style="font-weight: bold;">${t('logisticsProcessing')}</div>
              <div>${orderDetails.logisticsProcessed ? `✅ ${t('approved')}` : `⏳ ${t('pending')}`}</div>
            </div>
          </div>
        </div>

        ${orderDetails.warehouseNotes ? `
          <div class="section">
            <div class="section-title">${t('warehouseNotes')}</div>
             <div class="warehouse-notes">
              ${orderDetails.warehouseNotes}
            </div>
          </div>
        ` : ''}

        <div class="footer">
          <p>${t('printFooter')}</p>
          <p>${t('printDateTime')}: ${formatDate(new Date(), true)}</p>
        </div>
      </body>
      </html>
    `;

    // CRITICAL FIX: Use a safer print method that doesn't destroy React DOM
    // Create a new window for printing instead of manipulating current DOM
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Better approach: Wait for images and content to load completely
      const handlePrint = () => {
        setTimeout(() => {
          printWindow.print();
          // Don't auto-close - let user close manually
          // printWindow.close();
        }, 1000); // Give more time for content to load
      };
      
      // Multiple event listeners to ensure print dialog opens
      if (printWindow.document.readyState === 'complete') {
        handlePrint();
      } else {
        printWindow.onload = handlePrint;
        // Additional fallback
        setTimeout(handlePrint, 1500);
      }
    } else {
      // Fallback: Use a blob and object URL (safer than DOM manipulation)
      const blob = new Blob([printContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWindow2 = window.open(url, '_blank');
      if (printWindow2) {
        setTimeout(() => {
          printWindow2.print();
          // Don't auto-close
          URL.revokeObjectURL(url);
        }, 1500);
      }
    }
  };
  
  // Header filter states
  const [orderIdFilter, setOrderIdFilter] = useState('');
  const [customerNameFilter, setCustomerNameFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [amountFilter, setAmountFilter] = useState('');
  
  // Loading state for individual orders
  const [loadingOrderId, setLoadingOrderId] = useState<number | null>(null);
  
  // All hooks called consistently
  const queryClient = useQueryClient();
  
  const { user } = useAuth();

  // Queries
  const { data: ordersResponse, isLoading: ordersLoading, refetch: refetchOrders, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['/api/order-management/warehouse', orderView, orderView === 'history' ? 50 : 100],
    queryFn: async ({ pageParam = 0 }) => {
      const view = orderView === 'history' ? 'history' : 'current';
      const response = await fetch(`/api/order-management/warehouse?view=${view}&limit=${view === 'history' ? 50 : 100}&offset=${pageParam}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!response.ok) {
        throw new Error(`Failed to load warehouse orders (${response.status})`);
      }
      return response.json();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined,
    staleTime: orderView === 'history' ? 60_000 : 0,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: orderView === 'current',
    refetchInterval: orderView === 'current' ? 30000 : false,
  });

  // Refresh the visible view from its first page, without refetching every loaded history page twice.
  const forceRefreshOrders = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/order-management/warehouse'], refetchType: 'none' });
    await queryClient.resetQueries({ queryKey: ['/api/order-management/warehouse', orderView] });
    await queryClient.invalidateQueries({ queryKey: ['/api/order-management/warehouse', 'counts'] });
    console.log({
      title: `🔄 ${t('refreshed')}`,
      description: t('ordersRefreshed'),
    });
  };

  const { data: warehouseCounts, isError: warehouseCountsError } = useQuery<{ success: boolean; current: number; history: number }>({
    queryKey: ['/api/order-management/warehouse', 'counts'],
    queryFn: async () => {
      const response = await fetch('/api/order-management/warehouse/counts', { credentials: 'include', cache: 'no-store' });
      if (!response.ok) throw new Error(`Failed to load warehouse counts (${response.status})`);
      return response.json();
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const orders = ordersResponse?.pages.flatMap((page: any) => orderView === 'history' ? (page.historyOrders || []) : (page.orders || [])) || [];
  const currentOrderCount = orderView === 'current' ? (ordersResponse?.pages[0]?.total ?? warehouseCounts?.current) : warehouseCounts?.current;
  const historyOrderCount = orderView === 'history' ? (ordersResponse?.pages[0]?.total ?? warehouseCounts?.history) : warehouseCounts?.history;
  const countPlaceholder = warehouseCountsError ? '—' : '…';
  const visibleOrdersLoading = ordersLoading;
  const orderListEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = orderListEndRef.current;
    if (!element || !hasNextPage) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
    }, { rootMargin: '300px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const statusCounts = new Map<string, number>();
  orders.forEach((order: Order) => {
    const status = String(order.currentStatus || order.status || '').trim().toLowerCase();
    if (status) {
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    }
  });
  const statusOptions = Array.from(statusCounts.entries())
    .map(([value, count]) => ({
      value,
      count,
      label: getOrderStatusLabel(resolveOrderStatus({ workflowStatus: value }), language),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, language));

  const changeOrderView = (value: 'current' | 'history') => {
    setOrderView(value);
    setSearchTerm('');
    setSelectedStatus('all');
    setOrderIdFilter('');
    setCustomerNameFilter('');
    setPhoneFilter('');
    setEmailFilter('');
    setStatusFilter('');
    setAmountFilter('');
  };

  // Inventory Products Query
  const { data: inventoryProductsData, isLoading: inventoryProductsLoading, refetch: refetchInventoryProducts } = useQuery<{ products: InventoryProduct[] }>({
    queryKey: ["/api/warehouse/inventory-products"],
    queryFn: async () => {
      const response = await apiRequest('/api/warehouse/inventory-products', { method: 'GET' });
      return response as { products: InventoryProduct[] };
    },
  });

  // Inventory Settings Query
  const { data: inventorySettingsData } = useQuery<{ success: boolean; settings: InventoryNotificationSettings }>({
    queryKey: ["/api/warehouse/inventory-notification-settings"],
    queryFn: async () => {
      const response = await apiRequest('/api/warehouse/inventory-notification-settings', { method: 'GET' });
      return response as { success: boolean; settings: InventoryNotificationSettings };
    },
  });

  // Admin Users Query for notification recipients
  const { data: adminUsersData } = useQuery<{ success: boolean; users: AdminUser[] }>({
    queryKey: ["/api/warehouse/admin-users"],
    queryFn: async () => {
      const response = await apiRequest('/api/warehouse/admin-users', { method: 'GET' });
      return response as { success: boolean; users: AdminUser[] };
    },
  });

  // Filter admin users based on search
  const filteredAdminUsers: AdminUser[] = (adminUsersData?.users || []).filter(user => {
    if (adminSearchTerm.length < 2) return false;
    const searchLower = adminSearchTerm.toLowerCase();
    return (
      user.fullName?.toLowerCase().includes(searchLower) ||
      (user.email && user.email.toLowerCase().includes(searchLower))
    );
  });
  const inventoryProducts: InventoryProduct[] = inventoryProductsData?.products || [];

  // Load inventory settings when data arrives
  useEffect(() => {
    if (inventorySettingsData?.success && inventorySettingsData?.settings) {
      setInventorySettings(inventorySettingsData.settings);
    }
  }, [inventorySettingsData]);

  // Filter inventory products
  const filteredInventoryProducts = inventoryProducts.filter(p =>
    p.name?.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(inventorySearchTerm.toLowerCase())
  );
  // Get stock status
  const getStockStatus = (product: InventoryProduct) => {
    const { stockQuantity, lowStockThreshold, minStockLevel } = product;
    if (stockQuantity <= 0) return { label: t('outOfStock'), color: "bg-red-500 text-white" };
    if (stockQuantity <= (lowStockThreshold || 5)) return { label: t('critical'), color: "bg-red-400 text-white" };
    if (stockQuantity <= (minStockLevel || 10)) return { label: t('low'), color: "bg-yellow-500 text-white" };
    return { label: t('available'), color: "bg-green-500 text-white" };
  };
  const sortedInventoryProducts = useMemo(() => {
    const getValue = (product: InventoryProduct): string | number => {
      switch (inventorySort.key) {
        case 'product': return product.name || '';
        case 'vendor': return product.vendorName || '';
        case 'sku': return product.sku || '';
        case 'batch': return product.batchNumber || '';
        case 'stock': return Number(product.stockQuantity || 0);
        case 'minimum': return Number(product.minStockLevel || 0);
        case 'threshold': return Number(product.lowStockThreshold || 0);
        case 'status': return getStockStatus(product).label;
      }
    };
    const multiplier = inventorySort.direction === 'asc' ? 1 : -1;
    return [...filteredInventoryProducts].sort(
      (a, b) => compareSortValues(getValue(a), getValue(b)) * multiplier || a.id - b.id,
    );
  }, [filteredInventoryProducts, inventorySort, language]);

  // Add recipient from Admin Users
  const addRecipientFromAdmin = (user: AdminUser) => {
    // Check if user already exists in recipients
    if (inventorySettings.recipients.some(r => r.email === user.email)) {
      toast({
        title: t('error'),
        description: t('recipientExists'),
        variant: "destructive"
      });
      return;
    }
    
    const newRecipient: NotificationRecipient = {
      id: Date.now(),
      name: user.fullName,
      email: user.email || '',
      phone: user.phone || '',
      whatsappNumber: '',
      receiveEmail: !!user.email,
      receiveSms: false,
      receiveWhatsapp: false,
      isActive: true
    };
    setInventorySettings(prev => ({
      ...prev,
      recipients: [...prev.recipients, newRecipient]
    }));
    setAdminSearchTerm("");
    toast({
      title: t('recipientAdded'),
      description: `${user.fullName} ${t('recipientAddedDescription')}`,
    });
  };

  // Remove recipient
  const removeRecipient = (id: number) => {
    setInventorySettings(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r.id !== id)
    }));
  };

  // Update recipient
  const updateRecipient = (id: number, updates: Partial<NotificationRecipient>) => {
    setInventorySettings(prev => ({
      ...prev,
      recipients: prev.recipients.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
  };

  // Mutations
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status, notes }: { orderId: number; status: string; notes?: string }) => {
      setLoadingOrderId(orderId); // Set loading state for specific order
      if (status === 'warehouse_approved') {
        return await apiRequest(`/api/warehouse/orders/${orderId}/approve`, {
          method: 'POST',
          body: { notes }
        });
      }
      return await apiRequest(`/api/order-management/warehouse/${orderId}/process`, {
        method: 'PATCH',
        body: { status, notes }
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/order-management/warehouse'] });
      refetchOrders();
      const failedChannels = data.readyNotifications?.filter((result: { success: boolean }) => !result.success) ?? [];
      toast({
        title: failedChannels.length ? t('updateError') : t('orderUpdated'),
        description: failedChannels.length
          ? `${t('sendToLogistics')} — ${failedChannels.map((result: { channel: string }) => result.channel).join(', ')}: ${t('updateErrorDescription')}`
          : `${t('orderUpdatedDescription')} ${variables.status === 'warehouse_processing' ? t('processing') : variables.status === 'warehouse_approved' ? t('sendToLogistics') : t('updated')}.`,
        variant: failedChannels.length ? 'destructive' : 'default',
      });
      setShowOrderDetails(false);
      setLoadingOrderId(null); // Clear loading state
    },
    onError: (error: any) => {
      toast({
        title: t('updateError'),
        description: error.message || t('updateErrorDescription'),
        variant: "destructive",
      });
      setLoadingOrderId(null); // Clear loading state on error
    },
  });

  // Warehouse Notes Save Mutation
  const saveNotesMutation = useMutation({
    mutationFn: async ({ customerOrderId, notes }: { customerOrderId: number; notes: string }) => {
      return await apiRequest(`/api/warehouse/orders/${customerOrderId}/notes`, {
        method: 'POST',
        body: { notes }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/order-management/warehouse'] });
      toast({
        title: `✅ ${t('noteSaved')}`,
        description: t('noteSavedDescription'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('saveError'),
        description: error.message || t('noteSaveError'),
        variant: "destructive",
      });
    },
  });

  // Save Inventory Settings Mutation
  const saveInventorySettingsMutation = useMutation({
    mutationFn: async (settings: InventoryNotificationSettings) => {
      return await apiRequest('/api/warehouse/inventory-notification-settings', {
        method: 'POST',
        body: settings
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/warehouse/inventory-notification-settings'] });
      toast({
        title: t('settingsSaved'),
        description: t('settingsSavedDescription'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('saveError'),
        description: error.message || t('settingsSaveError'),
        variant: "destructive",
      });
    },
  });

  // Filter orders based on search and status
  const filteredOrders = orders?.filter((order: Order) => {
    // Build customer name from API response structure
    const customerName = order.customer?.firstName && order.customer?.lastName 
      ? `${order.customer.firstName} ${order.customer.lastName}` 
                                     : order.customerFirstName && order.customerLastName
        ? `${order.customerFirstName} ${order.customerLastName}`
        : order.customerName || '';
    
    const customerEmail = order.customer?.email || order.customerEmail || '';
    const customerPhone = order.customer?.phone || order.customerPhone || '';
    
    // Only apply search filter if searchTerm has 3+ characters or is empty (show all)
    const matchesSearch = searchTerm.length === 0 || searchTerm.length >= 3 ? (
      searchTerm.length === 0 || 
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerPhone.includes(searchTerm) ||
      order.id.toString().includes(searchTerm) ||
      order.customerOrderId?.toString().includes(searchTerm) ||
      (order.orderNumber && order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    ) : false;
    
    // Use currentStatus from API instead of status
    const orderStatus = order.currentStatus || order.status || '';
    
    // Check for notes filter
    let matchesStatus = false;
    if (selectedStatus === 'all') {
      matchesStatus = true;
    } else if (selectedStatus === 'with_notes') {
      matchesStatus = !!order.warehouseNotes?.trim();
    } else if (selectedStatus === 'without_notes') {
      matchesStatus = !order.warehouseNotes?.trim();
    } else {
      matchesStatus = orderStatus.trim().toLowerCase() === selectedStatus;
    }
    
    // Header filters
    const matchesOrderId = orderIdFilter === '' || order.id.toString().includes(orderIdFilter);
    const matchesCustomerName = customerNameFilter === '' || customerName.toLowerCase().includes(customerNameFilter.toLowerCase());
    const matchesPhone = phoneFilter === '' || customerPhone.includes(phoneFilter);
    const matchesEmail = emailFilter === '' || customerEmail.toLowerCase().includes(emailFilter.toLowerCase());
    const matchesStatusFilter = statusFilter === '' || orderStatus.includes(statusFilter);
    const matchesAmount = amountFilter === '' || parseFloat(order.totalAmount || '0').toString().includes(amountFilter);
    
    return matchesSearch && matchesStatus && matchesOrderId && matchesCustomerName && matchesPhone && matchesEmail && matchesStatusFilter && matchesAmount;
  }) || [];

  const displayedOrders = useMemo(() => {
    const getCustomerName = (order: Order) =>
      order.customer?.firstName && order.customer?.lastName
        ? `${order.customer.firstName} ${order.customer.lastName}`
        : order.customerFirstName && order.customerLastName
          ? `${order.customerFirstName} ${order.customerLastName}`
          : order.customerName || '';
    const getValue = (order: Order): string | number => {
      switch (orderSort.key) {
        case 'orderNumber': return Number((order.orderNumber || '').replace(/\D/g, '')) || order.id;
        case 'customer': return getCustomerName(order);
        case 'contact': return order.customer?.email || order.customerEmail || order.customer?.phone || order.customerPhone || '';
        case 'date': return new Date(order.createdAt || 0).getTime();
        case 'paymentMethod': return order.paymentMethod || '';
        case 'weight': return Number(order.totalWeight || 0);
        case 'amount': return Number(order.totalAmount || 0);
        case 'status': return getOrderStatusLabel(resolveOrderStatus({ workflowStatus: order.currentStatus || order.status }), language);
        case 'notes': return order.warehouseNotes || '';
      }
    };
    const multiplier = orderSort.direction === 'asc' ? 1 : -1;
    return [...filteredOrders].sort(
      (a, b) => compareSortValues(getValue(a), getValue(b)) * multiplier || a.id - b.id,
    );
  }, [filteredOrders, orderSort, language]);

  const toggleOrderSort = (key: OrderSortKey) => {
    setOrderSort(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleInventorySort = (key: InventorySortKey) => {
    setInventorySort(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortIcon = (active: boolean, direction: SortDirection) =>
    !active ? <ArrowUpDown className="h-3.5 w-3.5 opacity-50" /> :
      direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;

  const sortableLabel = (
    label: string,
    active: boolean,
    direction: SortDirection,
    onClick: () => void,
  ) => (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-full items-center gap-1.5 rounded-sm text-inherit hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      aria-label={`${t('sortBy')} ${label}`}
    >
      <span>{label}</span>
      {sortIcon(active, direction)}
    </button>
  );



  // Helper functions
  const formatCurrency = (amount: number) => {
    return formatCurrencyValue(amount);
  };

  const getStatusBadge = (status: string) => {
    const resolved = resolveOrderStatus({ workflowStatus: status });
    return (
      <Badge className={resolved.badgeClass}>
        {getOrderStatusLabel(resolved, language)}
      </Badge>
    );
  };

  const getDepartmentLabel = (status: string) => {
    const department = resolveOrderStatus({ workflowStatus: status }).department;
    const labels = {
      financial: t('financialDepartment'),
      warehouse: t('warehouseDepartment'),
      logistics: t('logisticsDepartment'),
      complete: t('completedDepartment'),
      cancelled: t('cancelledDepartment'),
      unknown: t('unknown'),
    };
    return labels[department];
  };

  const handleOrderAction = (orderId: number, status: string) => {
    updateOrderMutation.mutate({
      orderId,
      status,
      notes: warehouseNotes
    });
    setWarehouseNotes('');
  };

  const handleStartProcessing = async () => {
    if (!selectedOrder) return;

    const notes = warehouseNotes.trim();
    try {
      if (notes) {
        await saveNotesMutation.mutateAsync({
          customerOrderId: selectedOrder.customerOrderId,
          notes,
        });
      }
      updateOrderMutation.mutate({
        orderId: selectedOrder.id,
        status: 'warehouse_processing',
        notes: notes || undefined,
      });
    } catch {
      // The notes mutation reports its own error. Keep the modal open so the
      // user can retry without losing the entered note.
    }
  };

  const openQuickNoteEditor = (order: Order) => {
    setQuickNoteOrder(order);
    setQuickNoteText(order.warehouseNotes || '');
  };

  const closeQuickNoteEditor = () => {
    if (saveNotesMutation.isPending) return;
    setQuickNoteOrder(null);
    setQuickNoteText('');
  };

  const handleQuickNoteSave = async () => {
    if (!quickNoteOrder) return;

    try {
      await saveNotesMutation.mutateAsync({
        customerOrderId: quickNoteOrder.customerOrderId,
        notes: quickNoteText.trim(),
      });
      await refetchOrders();
      toast({
        title: t('noteSaved'),
        description: t('noteSavedDescription'),
      });
      setQuickNoteOrder(null);
      setQuickNoteText('');
    } catch {
      toast({
        title: t('saveError'),
        description: t('noteSaveError'),
        variant: 'destructive',
      });
    }
  };

  const clearAllFilters = () => {
    setOrderIdFilter('');
    setCustomerNameFilter('');
    setPhoneFilter('');
    setEmailFilter('');
    setAmountFilter('');
    setStatusFilter('');
  };

  // Fetch complete order details with items
  const fetchOrderDetails = async (customerOrderId: number) => {
    const requestId = ++detailRequestId.current;
    setLoadingOrderDetails(true);
    try {
      const response = await apiRequest(`/api/order-management/warehouse/${customerOrderId}/details`, {
        method: 'GET'
      });
      if (requestId === detailRequestId.current) setOrderDetails(response.order);
    } catch (error) {
      if (requestId !== detailRequestId.current) return;
      console.error('Error fetching order details:', error);
      toast({
        title: t('loadOrderError'),
        description: t('loadOrderErrorDescription'),
        variant: "destructive",
      });
    } finally {
      if (requestId === detailRequestId.current) setLoadingOrderDetails(false);
    }
  };

  const toggleOrderDetails = (order: Order) => {
    if (showOrderDetails && selectedOrder?.id === order.id) {
      detailRequestId.current++;
      setShowOrderDetails(false);
      return;
    }
    setSelectedOrder(order);
    setWarehouseNotes(order.warehouseNotes || '');
    setOrderDetails(null);
    setShowOrderDetails(true);
    void fetchOrderDetails(order.customerOrderId);
  };

  const detailWorkflowStatus =
    orderDetails?.currentStatus ||
    orderDetails?.orderManagement?.currentStatus ||
    selectedOrder?.currentStatus ||
    '';
  const detailStatusProjection = resolveOrderStatus({
    workflowStatus: detailWorkflowStatus,
    orderStatus: orderDetails?.customerOrder?.status || selectedOrder?.status,
    paymentStatus: orderDetails?.customerOrder?.paymentStatus,
  });
  const logisticsProcessed =
    Boolean(orderDetails?.logisticsProcessed || orderDetails?.orderManagement?.logisticsProcessedAt) ||
    detailStatusProjection.department === 'logistics' ||
    detailStatusProjection.department === 'complete';

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir={direction} lang={language}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              {t('warehouseManagement')}
            </h1>
          </div>
          <p className="text-gray-600">
             {t('warehouseDescription')}
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={changeTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              {t('orders')}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package2 className="w-4 h-4" />
              {t('inventory')}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              {t('settings')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <Tabs value={orderView} onValueChange={(value) => changeOrderView(value as 'current' | 'history')}>
              <TabsList className="grid w-full max-w-lg grid-cols-2">
                <TabsTrigger value="current" className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {t('currentOrders')}
                  <Badge variant="secondary" className="ms-1">{currentOrderCount == null ? countPlaceholder : formatNumber(currentOrderCount)}</Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t('orderHistory')}
                  <Badge variant="secondary" className="ms-1">{historyOrderCount == null ? countPlaceholder : formatNumber(historyOrderCount)}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('searchOrders')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('allStatuses')}</option>
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label} ({formatNumber(status.count)})
                  </option>
                ))}
                <option value="with_notes">{t('withNotes')}</option>
                <option value="without_notes">{t('withoutNotes')}</option>
              </select>
            </div>

            {/* Orders Table */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Package className="w-6 h-6 text-blue-600" />
                      </div>
                      {orderView === 'current' ? t('financialOrders') : t('orderHistory')}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-2 mr-11">
                       {orderView === 'current' ? t('readyForWarehouse') : t('warehouseHistoryDescription')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm">
                       {formatNumber(displayedOrders.length)} {t('orderCount')}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={forceRefreshOrders}
                      className="flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {t('strongRefresh')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                 {visibleOrdersLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">{t('loadingOrders')}</p>
                  </div>
                ) : displayedOrders.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-400" />
                    </div>
                     <h3 className="text-lg font-medium text-gray-900 mb-2">
                       {orderView === 'current' ? t('noOrders') : t('noHistoryOrders')}
                     </h3>
                     {orderView === 'current' && <p>{t('noOrdersDescription')}</p>}
                  </div>
                ) : (
                   <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white shadow-sm">
                     <table className="w-full min-w-[1080px] table-fixed border-collapse text-sm" aria-label={t('ordersTable')}>
                       <caption className="sr-only">{t('ordersTable')}</caption>
                       <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 shadow-sm">
                         <tr>
                           <th scope="col" className="border border-slate-300 px-3 py-2 text-center font-semibold">{t('rowNumber')}</th>
                            <th scope="col" aria-sort={orderSort.key === 'orderNumber' ? (orderSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="border border-slate-300 px-3 py-2 text-start font-semibold">{sortableLabel(t('orderNumber'), orderSort.key === 'orderNumber', orderSort.direction, () => toggleOrderSort('orderNumber'))}</th>
                            <th scope="col" aria-sort={orderSort.key === 'customer' ? (orderSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="border border-slate-300 px-3 py-2 text-start font-semibold">{sortableLabel(t('customer'), orderSort.key === 'customer', orderSort.direction, () => toggleOrderSort('customer'))}</th>
                            <th scope="col" aria-sort={orderSort.key === 'contact' ? (orderSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="border border-slate-300 px-3 py-2 text-start font-semibold">{sortableLabel(t('contact'), orderSort.key === 'contact', orderSort.direction, () => toggleOrderSort('contact'))}</th>
                            <th scope="col" aria-sort={orderSort.key === 'date' ? (orderSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="border border-slate-300 px-3 py-2 text-start font-semibold">{sortableLabel(t('date'), orderSort.key === 'date', orderSort.direction, () => toggleOrderSort('date'))}</th>
                            <th scope="col" aria-sort={orderSort.key === 'paymentMethod' ? (orderSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="border border-slate-300 px-3 py-2 text-start font-semibold">{sortableLabel(t('paymentMethod'), orderSort.key === 'paymentMethod', orderSort.direction, () => toggleOrderSort('paymentMethod'))}</th>
                            <th scope="col" aria-sort={orderSort.key === 'weight' ? (orderSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="border border-slate-300 px-3 py-2 text-center font-semibold">{sortableLabel(t('shipmentWeight'), orderSort.key === 'weight', orderSort.direction, () => toggleOrderSort('weight'))}</th>
                            <th scope="col" aria-sort={orderSort.key === 'amount' ? (orderSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="border border-slate-300 px-3 py-2 text-end font-semibold">{sortableLabel(t('totalAmount'), orderSort.key === 'amount', orderSort.direction, () => toggleOrderSort('amount'))}</th>
                            <th scope="col" aria-sort={orderSort.key === 'status' ? (orderSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="w-[130px] border border-slate-300 px-3 py-2 text-start font-semibold whitespace-normal break-words">{sortableLabel(t('status'), orderSort.key === 'status', orderSort.direction, () => toggleOrderSort('status'))}</th>
                            <th scope="col" aria-sort={orderSort.key === 'notes' ? (orderSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="w-[140px] border border-slate-300 px-3 py-2 text-start font-semibold whitespace-normal break-words">{sortableLabel(t('notes'), orderSort.key === 'notes', orderSort.direction, () => toggleOrderSort('notes'))}</th>
                           {orderView === 'current' && <th scope="col" className="border border-slate-300 px-3 py-2 text-start font-semibold">{t('actions')}</th>}
                         </tr>
                       </thead>
                       <tbody>
                          {displayedOrders.map((order: Order, index: number) => {
                            const customerNote = order.customerNotes?.trim() || '';
                            const hasCustomerNote = Boolean(customerNote);
                            const isCustomerNoteExpanded = expandedCustomerNoteOrderId === order.id;

                            return (
                            <React.Fragment key={order.id}>
                            <tr
                              className="odd:bg-white even:bg-slate-50 hover:bg-blue-50 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                              tabIndex={0}
                              aria-expanded={showOrderDetails && selectedOrder?.id === order.id}
                              aria-label={`${t('orderDetails')} ${order.orderNumber || `#${order.id}`}`}
                              onClick={(event) => {
                                if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea, [role="button"]')) return;
                                toggleOrderDetails(order);
                              }}
                              onKeyDown={(event) => {
                                if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
                                event.preventDefault();
                                toggleOrderDetails(order);
                              }}
                            >
                             <th scope="row" className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">{index + 1}</th>
                             <td className="border border-slate-200 px-3 py-2 font-medium whitespace-nowrap">
                                <button
                                  type="button"
                                   aria-expanded={showOrderDetails && selectedOrder?.id === order.id}
                                   onClick={() => toggleOrderDetails(order)}
                                   className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 font-bold text-blue-600 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                   title={t('orderDetails')}
                                >
                                  <span>{order.orderNumber || `#${order.id}`}</span>
                                </button>
                                 {hasCustomerNote && (
                                   <button
                                     type="button"
                                     aria-label={`${t('customerNote')} ${order.orderNumber || order.id}`}
                                     aria-expanded={isCustomerNoteExpanded}
                                     onClick={() => setExpandedCustomerNoteOrderId(isCustomerNoteExpanded ? null : order.id)}
                                     className="ms-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-emerald-700 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                     title={t('customerNote')}
                                   >
                                     <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" aria-hidden="true" />
                                     {isCustomerNoteExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                   </button>
                                 )}
                             </td>
                             <td className="border border-slate-200 px-3 py-2">
                               <span className="font-medium text-slate-800 break-words">{
                                 order.customer?.firstName && order.customer?.lastName
                                   ? `${order.customer.firstName} ${order.customer.lastName}`
                                   : order.customerFirstName && order.customerLastName
                                     ? `${order.customerFirstName} ${order.customerLastName}`
                                     : order.customerName || t('unknown')
                               }</span>
                             </td>
                             <td className="border border-slate-200 px-3 py-2">
                               <div className="max-w-[220px] space-y-0.5 break-words">
                                 <div>📧 {order.customer?.email || order.customerEmail || t('unknownEmail')}</div>
                                 <div className="text-xs text-slate-500">📱 {order.customer?.phone || order.customerPhone || t('unknownPhone')}</div>
                               </div>
                             </td>
                             <td className="border border-slate-200 px-3 py-2 whitespace-nowrap">{formatDate(order.createdAt)}</td>
                             <td className="border border-slate-200 px-3 py-2">
                               <PaymentMethodBadge
                                 paymentMethod={order.paymentMethod}
                                 showIcon={true}
                                 className="max-w-full whitespace-normal break-words"
                               />
                             </td>
                             <td className="border border-slate-200 px-3 py-2 text-center">
                               <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 whitespace-nowrap">
                                 <Weight className="w-3 h-3" />
                                  {order.totalWeight ? `${formatNumber(parseFloat(order.totalWeight), 1)} ${t('kilogram')}` : t('calculating')}
                               </div>
                             </td>
                             <td className="border border-slate-200 px-3 py-2 text-end font-semibold text-green-600 whitespace-nowrap">
                               {formatCurrency(parseFloat(order.totalAmount) || 0)}
                             </td>
                             <td className="w-[130px] border border-slate-200 px-3 py-2 align-top whitespace-normal break-words">
                               <div className="[&>div]:h-auto [&>div]:max-w-full [&>div]:whitespace-normal [&>div]:break-words [&>div]:text-start [&>div]:leading-5">
                                 {getStatusBadge(order.currentStatus || order.status)}
                               </div>
                             </td>
                              <td className="w-[140px] border border-slate-200 p-1 align-top whitespace-normal">
                                <button
                                  type="button"
                                  onClick={() => openQuickNoteEditor(order)}
                                  aria-label={`${order.warehouseNotes?.trim() ? t('editWarehouseNote') : t('addWarehouseNote')} ${order.orderNumber || order.id}`}
                                  className="min-h-10 w-full rounded px-2 py-1.5 text-start transition-colors hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                                >
                                  {order.warehouseNotes?.trim() ? (
                                    <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2 py-1.5 rounded text-xs inline-flex items-start gap-1.5 whitespace-pre-wrap break-words">
                                      <Edit3 className="w-3 h-3 shrink-0" />
                                      <span>{order.warehouseNotes}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs text-purple-700">
                                      <Plus className="h-3.5 w-3.5" />
                                      {t('addWarehouseNote')}
                                    </span>
                                  )}
                                </button>
                             </td>
                             {orderView === 'current' && <td className="border border-slate-200 px-3 py-2">
                               <div className="flex flex-wrap items-center gap-1.5 whitespace-nowrap">
                                 {(order.currentStatus === 'financial_approved' || order.currentStatus === 'warehouse_pending') && (
                                   <Button
                                     size="sm"
                                     variant="default"
                                     onClick={() => handleOrderAction(order.id, 'warehouse_processing')}
                                     disabled={loadingOrderId === order.id}
                                     className="h-7 px-2 bg-orange-500 hover:bg-orange-600 text-xs"
                                   >
                                     <Package className="w-3.5 h-3.5 mr-1" />
                                      {loadingOrderId === order.id ? t('processing') : t('startProcessing')}
                                   </Button>
                                 )}
                                 {order.currentStatus === 'warehouse_processing' && (
                                   <Button
                                     size="sm"
                                     variant="default"
                                     onClick={() => handleOrderAction(order.id, 'warehouse_verified')}
                                     disabled={loadingOrderId === order.id}
                                     className="h-7 px-2 bg-blue-500 hover:bg-blue-600 text-xs"
                                   >
                                     <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                      {loadingOrderId === order.id ? t('verifying') : t('firstApproval')}
                                   </Button>
                                 )}
                                 {order.currentStatus === 'warehouse_verified' && (
                                   <Button
                                     size="sm"
                                     variant="default"
                                     onClick={() => handleOrderAction(order.id, 'warehouse_approved')}
                                     disabled={loadingOrderId === order.id}
                                     className="h-7 px-2 bg-green-500 hover:bg-green-600 text-xs"
                                   >
                                     <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                      {loadingOrderId === order.id ? t('verifying') : t('finalApproval')}
                                   </Button>
                                 )}
                                 {order.currentStatus === 'warehouse_approved' && (
                                   <Button
                                     size="sm"
                                     variant="default"
                                     onClick={() => handleOrderAction(order.id, 'logistics_dispatched')}
                                     disabled={loadingOrderId === order.id}
                                     className="h-7 px-2 bg-blue-500 hover:bg-blue-600 text-xs"
                                   >
                                     <Truck className="w-3.5 h-3.5 mr-1" />
                                      {loadingOrderId === order.id ? t('sending') : t('sendToLogistics')}
                                   </Button>
                                 )}
                               </div>
                             </td>}
                           </tr>
                             {showOrderDetails && selectedOrder?.id === order.id && (
                               <tr className="bg-blue-50/60">
                                 <td colSpan={orderView === 'current' ? 11 : 10} className="border border-blue-200 p-0">
                                   {renderOrderDetailsInline()}
                                 </td>
                               </tr>
                             )}
                            {isCustomerNoteExpanded && (
                              <tr className="bg-emerald-50/70">
                                <td colSpan={orderView === 'current' ? 11 : 10} className="border border-emerald-200 p-0">
                                  <div className="border-s-4 border-emerald-500 px-4 py-3">
                                    <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                                      <FileText className="h-4 w-4" aria-hidden="true" />
                                      {t('customerNote')}
                                    </div>
                                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">{customerNote}</p>
                                  </div>
                                </td>
                              </tr>
                            )}
                            </React.Fragment>
                            );
                          })}
                       </tbody>
                     </table>
                     <div ref={orderListEndRef} className="h-2" aria-hidden="true" />
                     {isFetchingNextPage && <div className="py-3 text-center text-sm text-slate-500">{t('loadingOrders')}</div>}
                   </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab - Direct Content */}
          <TabsContent value="inventory" className="space-y-6">
            {/* Products Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package2 className="w-5 h-5" />
                     {t('products')}
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                         placeholder={t('searchProduct')}
                        value={inventorySearchTerm}
                        onChange={(e) => setInventorySearchTerm(e.target.value)}
                        className="pr-10 w-64"
                      />
                    </div>
                    <Button variant="outline" onClick={() => refetchInventoryProducts()}>
                      <RefreshCw className="w-4 h-4 ml-2" />
                       {t('refresh')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {inventoryProductsLoading ? (
                   <div className="text-center py-8">{t('loading')}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                         <TableHead aria-sort={inventorySort.key === 'product' ? (inventorySort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="text-right whitespace-nowrap">{sortableLabel(t('productName'), inventorySort.key === 'product', inventorySort.direction, () => toggleInventorySort('product'))}</TableHead>
                         <TableHead aria-sort={inventorySort.key === 'vendor' ? (inventorySort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="text-right whitespace-nowrap">{sortableLabel(t('vendor'), inventorySort.key === 'vendor', inventorySort.direction, () => toggleInventorySort('vendor'))}</TableHead>
                         <TableHead aria-sort={inventorySort.key === 'sku' ? (inventorySort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="text-right whitespace-nowrap">{sortableLabel(t('productCode'), inventorySort.key === 'sku', inventorySort.direction, () => toggleInventorySort('sku'))}</TableHead>
                         <TableHead aria-sort={inventorySort.key === 'batch' ? (inventorySort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="text-center whitespace-nowrap">{sortableLabel(t('batchNumber'), inventorySort.key === 'batch', inventorySort.direction, () => toggleInventorySort('batch'))}</TableHead>
                         <TableHead aria-sort={inventorySort.key === 'stock' ? (inventorySort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="text-center whitespace-nowrap">{sortableLabel(t('remainingInBatch'), inventorySort.key === 'stock', inventorySort.direction, () => toggleInventorySort('stock'))}</TableHead>
                         <TableHead aria-sort={inventorySort.key === 'minimum' ? (inventorySort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="text-center whitespace-nowrap">{sortableLabel(t('minimum'), inventorySort.key === 'minimum', inventorySort.direction, () => toggleInventorySort('minimum'))}</TableHead>
                         <TableHead aria-sort={inventorySort.key === 'threshold' ? (inventorySort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="text-center whitespace-nowrap">{sortableLabel(t('alertThreshold'), inventorySort.key === 'threshold', inventorySort.direction, () => toggleInventorySort('threshold'))}</TableHead>
                         <TableHead aria-sort={inventorySort.key === 'status' ? (inventorySort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="text-center whitespace-nowrap">{sortableLabel(t('status'), inventorySort.key === 'status', inventorySort.direction, () => toggleInventorySort('status'))}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedInventoryProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                             {t('noProducts')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedInventoryProducts.slice(0, 50).map((product) => {
                          const stockStatus = getStockStatus(product);
                          return (
                            <TableRow key={product.id}>
                               <TableCell className="font-medium text-right">
                                 <div className="flex items-center gap-3">
                                   <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                                     {product.imageUrl ? (
                                       <img
                                         src={product.imageUrl}
                                         alt={`${t('productImage')}: ${product.name}`}
                                         className="h-full w-full object-cover"
                                         loading="lazy"
                                       />
                                     ) : (
                                       <div className="flex h-full w-full items-center justify-center text-slate-400">
                                         <Package2 className="h-5 w-5" aria-hidden="true" />
                                       </div>
                                     )}
                                   </div>
                                   <span>{product.name}</span>
                                 </div>
                               </TableCell>
                              <TableCell className="text-right">
                                <Badge variant={product.vendorId ? "secondary" : "outline"}>
                                   {product.vendorName || t('defaultVendor')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{product.sku || '-'}</TableCell>
                               <TableCell className="text-center">
                                 <Badge variant="outline">
                                   {product.batchNumber?.trim() || t('noBatchNumber')}
                                 </Badge>
                               </TableCell>
                               <TableCell className="text-center">
                                 <span className="font-bold">{formatNumber(product.stockQuantity || 0)}</span>
                                 {product.stockUnit && (
                                   <span className="ms-1 text-xs text-gray-500">{product.stockUnit}</span>
                                 )}
                               </TableCell>
                               <TableCell className="text-center">{formatNumber(product.minStockLevel || 0)}</TableCell>
                               <TableCell className="text-center">{formatNumber(product.lowStockThreshold || 0)}</TableCell>
                              <TableCell className="text-center">
                                <Badge className={stockStatus.color}>
                                  {stockStatus.label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Notification Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                   {t('lowStockSettings')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Notification Timing Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                       {t('notificationInterval')}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={168}
                      value={inventorySettings.notificationIntervalHours}
                      onChange={(e) => setInventorySettings(prev => ({ ...prev, notificationIntervalHours: parseInt(e.target.value) || 24 }))}
                      className="w-full"
                    />
                     <p className="text-xs text-gray-500">{t('notificationIntervalHelp')}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                       {t('maxNotifications')}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={inventorySettings.maxNotifications}
                      onChange={(e) => setInventorySettings(prev => ({ ...prev, maxNotifications: parseInt(e.target.value) || 1 }))}
                      className="w-full"
                    />
                     <p className="text-xs text-gray-500">{t('maxNotificationsHelp')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recipients Management with CRM Search */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                     {t('recipients')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Admin Users Search Dropdown */}
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                  <div className="flex-1">
                     <Label className="mb-2 block">{t('searchAdmins')}</Label>
                    <Input
                       placeholder={t('usernameEmail')}
                      value={adminSearchTerm}
                      onChange={(e) => setAdminSearchTerm(e.target.value)}
                      className="w-full"
                    />
                    {adminSearchTerm.length >= 2 && filteredAdminUsers.length > 0 && (
                      <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto bg-white shadow-lg">
                        {filteredAdminUsers.map((user) => (
                          <div
                            key={user.id}
                            className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 flex items-center justify-between"
                            onClick={() => addRecipientFromAdmin(user)}
                          >
                            <div>
                              <div className="font-medium">{user.fullName}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                            <Button size="sm" variant="outline">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {adminSearchTerm.length >= 2 && filteredAdminUsers.length === 0 && (
                       <div className="mt-2 text-sm text-gray-500">{t('noUser')}</div>
                    )}
                  </div>
                </div>

                {/* Recipients List */}
                {inventorySettings.recipients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                     <p>{t('noRecipients')}</p>
                     <p className="text-sm">{t('selectRecipients')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                         <TableHead className="text-right">{t('name')}</TableHead>
                         <TableHead className="text-right">{t('email')}</TableHead>
                         <TableHead className="text-right">{t('phone')}</TableHead>
                         <TableHead className="text-center">{t('email')}</TableHead>
                         <TableHead className="text-center">{t('sms')}</TableHead>
                         <TableHead className="text-center">{t('whatsapp')}</TableHead>
                         <TableHead className="text-center">{t('active')}</TableHead>
                         <TableHead className="text-center">{t('delete')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventorySettings.recipients.map((recipient) => (
                        <TableRow key={recipient.id}>
                          <TableCell className="font-medium">{recipient.name}</TableCell>
                          <TableCell>{recipient.email || '-'}</TableCell>
                          <TableCell dir="ltr">{recipient.phone || '-'}</TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={recipient.receiveEmail}
                              onCheckedChange={(checked) => updateRecipient(recipient.id, { receiveEmail: checked })}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={recipient.receiveSms}
                              onCheckedChange={(checked) => updateRecipient(recipient.id, { receiveSms: checked })}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={recipient.receiveWhatsapp}
                              onCheckedChange={(checked) => updateRecipient(recipient.id, { receiveWhatsapp: checked })}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={recipient.isActive}
                              onCheckedChange={(checked) => updateRecipient(recipient.id, { isActive: checked })}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => removeRecipient(recipient.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={() => saveInventorySettingsMutation.mutate(inventorySettings)}
                    disabled={saveInventorySettingsMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                         {saveInventorySettingsMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                         {t('saving')}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 ml-2" />
                         {t('saveSettings')}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="settings" className="space-y-6">
            <WarehouseReadyNotificationSettings />
          </TabsContent>
        </Tabs>

        <SafeModal
          isOpen={quickNoteOrder !== null}
          onClose={closeQuickNoteEditor}
          title={`${quickNoteOrder?.warehouseNotes?.trim() ? t('editWarehouseNote') : t('addWarehouseNote')} — ${quickNoteOrder?.orderNumber || `#${quickNoteOrder?.customerOrderId || ''}`}`}
          maxWidth="max-w-lg"
          maxHeight="max-h-[60vh]"
        >
          <div className="space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="quickWarehouseNote">{t('warehouseNotes')}</Label>
              <Textarea
                id="quickWarehouseNote"
                value={quickNoteText}
                onChange={(event) => setQuickNoteText(event.target.value)}
                placeholder={t('notePlaceholder')}
                rows={5}
                autoFocus
                disabled={saveNotesMutation.isPending}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeQuickNoteEditor}
                disabled={saveNotesMutation.isPending}
              >
                {t('cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleQuickNoteSave}
                disabled={saveNotesMutation.isPending}
                aria-busy={saveNotesMutation.isPending}
              >
                {saveNotesMutation.isPending ? (
                  <>
                    <RefreshCw className="me-2 h-4 w-4 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <Save className="me-2 h-4 w-4" />
                    {t('saveNote')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </SafeModal>
      </div>
    </div>
  );

  function renderOrderDetailsInline() {
    return (
      <div className="space-y-3 p-3 md:p-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-slate-900">
            {t('orderDetails')} {selectedOrder?.orderNumber || `#${selectedOrder?.customerOrderId}`}
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowOrderDetails(false)}>
            {t('cancel')}
          </Button>
        </div>
            {loadingOrderDetails ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                 <p className="mt-4 text-gray-600">{t('loadOrderDetails')}</p>
              </div>
            ) : orderDetails ? (
              <div className="space-y-3">
                {/* Customer, order and workflow details share one compact table. */}
                {(() => {
                  const currentStatus = orderDetails.currentStatus || orderDetails.orderManagement?.currentStatus || selectedOrder?.currentStatus || '';
                  const resolved = resolveOrderStatus({ workflowStatus: currentStatus });
                  return (
                    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                      <table className="w-full min-w-[580px] border-collapse text-xs sm:text-sm" aria-label={`${t('customerInfo')} / ${t('orderSummary')}`}>
                        <tbody className="[&_tr:not(:last-child)]:border-b [&_tr]:border-slate-200">
                          <tr>
                            <th scope="row" className="w-[14%] bg-slate-50 px-2 py-1.5 text-start font-medium">{t('name')}</th>
                            <td className="w-[36%] px-2 py-1.5 font-medium">{orderDetails.customer?.firstName && orderDetails.customer?.lastName
                              ? `${orderDetails.customer.firstName} ${orderDetails.customer.lastName}` : t('unknown')}</td>
                            <th scope="row" className="w-[14%] bg-slate-50 px-2 py-1.5 text-start font-medium">{t('mobile')}</th>
                            <td className="w-[36%] px-2 py-1.5" dir="ltr">{orderDetails.customer?.phone || t('unknownPhone')}</td>
                          </tr>
                          <tr>
                            <th scope="row" className="bg-slate-50 px-2 py-1.5 text-start font-medium">{t('email')}</th>
                            <td className="break-all px-2 py-1.5" dir="ltr">{orderDetails.customer?.email || t('unknownEmail')}</td>
                            <th scope="row" className="bg-slate-50 px-2 py-1.5 text-start font-medium">{t('totalAmount')}</th>
                            <td className="px-2 py-1.5 font-semibold text-green-700">{formatCurrency(parseFloat(orderDetails.totalAmount) || 0)}</td>
                          </tr>
                          <tr>
                            <th scope="row" className="bg-slate-50 px-2 py-1.5 text-start font-medium">{t('itemCount')}</th>
                            <td className="px-2 py-1.5">{formatNumber(orderDetails.totalItems || 0)}</td>
                            <th scope="row" className="bg-slate-50 px-2 py-1.5 text-start font-medium">{t('grossWeight')}</th>
                            <td className="px-2 py-1.5">{orderDetails.totalWeight ? `${formatNumber(parseFloat(orderDetails.totalWeight), 1)} ${t('kilogram')}` : t('notCalculated')}</td>
                          </tr>
                          <tr>
                            <th scope="row" className="bg-slate-50 px-2 py-1.5 text-start font-medium">{t('orderDate')}</th>
                            <td className="px-2 py-1.5">{formatDate(orderDetails.orderDate)}</td>
                            <th scope="row" className="bg-slate-50 px-2 py-1.5 text-start font-medium">{t('currentLocation')}</th>
                            <td className="px-2 py-1.5">{getDepartmentLabel(currentStatus)}</td>
                          </tr>
                          <tr>
                            <th scope="row" className="bg-slate-50 px-2 py-1.5 text-start font-medium">{t('currentStage')}</th>
                            <td colSpan={3} className="px-2 py-1.5"><Badge className={resolved.badgeClass}>{getOrderStatusLabel(resolved, language)}</Badge></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                {/* Hierarchical notes visible to the warehouse */}
                {((orderDetails.customerNotes || orderDetails.notes) ||
                  (orderDetails.financialNotes || orderDetails.orderManagement?.financialNotes) ||
                  (orderDetails.warehouseNotes || orderDetails.orderManagement?.warehouseNotes)) && (
                  <div>
                    <h4 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
                      <FileText className="h-4 w-4" />
                      {t('notesTitle')}
                    </h4>
                    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                      <table className="w-full min-w-[480px] border-collapse text-xs sm:text-sm" aria-label={t('notesTitle')}>
                        <tbody className="[&_tr:not(:last-child)]:border-b [&_tr]:border-slate-200">
                          {(orderDetails.customerNotes || orderDetails.notes) && <tr>
                            <th scope="row" className="w-32 bg-amber-50 px-2 py-1.5 text-start font-medium">{t('customer')} · {t('checkoutNote')}</th>
                            <td className="whitespace-pre-wrap break-words px-2 py-1.5">{orderDetails.customerNotes || orderDetails.notes}</td>
                          </tr>}
                          {(orderDetails.financialNotes || orderDetails.orderManagement?.financialNotes) && <tr>
                            <th scope="row" className="w-32 bg-blue-50 px-2 py-1.5 text-start font-medium">{t('finance')} · {t('paymentNote')}</th>
                            <td className="whitespace-pre-wrap break-words px-2 py-1.5">{localizeFinanceNote(
                              orderDetails.financialNotes || orderDetails.orderManagement?.financialNotes || '', language,
                            )}</td>
                          </tr>}
                          {(orderDetails.warehouseNotes || orderDetails.orderManagement?.warehouseNotes) && <tr>
                            <th scope="row" className="w-32 bg-purple-50 px-2 py-1.5 text-start font-medium">{t('warehouseDepartment')} · {t('warehouseNotes')}</th>
                            <td className="whitespace-pre-wrap break-words px-2 py-1.5">{orderDetails.warehouseNotes || orderDetails.orderManagement?.warehouseNotes}</td>
                          </tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Order Items */}
                <div>
                   <h4 className="mb-1 text-sm font-semibold">{t('orderItems')}</h4>
                  <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                    <table className="w-full min-w-[680px] border-collapse text-xs sm:text-sm" aria-label={t('orderItems')}>
                      <thead className="bg-slate-50">
                        <tr>
                          <th scope="col" className="px-2 py-1.5 text-start font-semibold">{t('productName')}</th>
                          <th scope="col" className="px-2 py-1.5 text-start font-semibold">{t('productCode')}</th>
                          <th scope="col" className="px-2 py-1.5 text-center font-semibold">{t('quantity')}</th>
                          <th scope="col" className="px-2 py-1.5 text-end font-semibold">{t('unitPrice')}</th>
                          <th scope="col" className="px-2 py-1.5 text-end font-semibold">{t('totalPrice')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orderDetails.items?.map((item: any, index: number) => (
                          <tr key={item.id ?? index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="px-2 py-1.5">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="break-words">{item.productName}</span>
                                {item.vendorName && (
                                  <span className="inline-flex items-center rounded bg-purple-100 px-1 text-xs font-medium text-purple-800">
                                    🏪 {item.vendorName}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 font-mono text-slate-600">{item.productSku}</td>
                            <td className="px-2 py-1.5 text-center font-medium">{item.quantity}</td>
                            <td className="whitespace-nowrap px-2 py-1.5 text-end">{formatCurrency(parseFloat(item.unitPrice) || 0)}</td>
                            <td className="whitespace-nowrap px-2 py-1.5 text-end font-medium">{formatCurrency(parseFloat(item.totalPrice) || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Order Status */}
                <div>
                  <h4 className="mb-1 text-sm font-semibold">{t('orderStatus')}</h4>
                  <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                    <table className="w-full min-w-[480px] border-collapse text-xs sm:text-sm" aria-label={t('orderStatus')}>
                      <thead className="bg-slate-50">
                        <tr>
                          <th scope="col" className="px-2 py-1.5 text-start font-medium">{t('financialApproval')}</th>
                          <th scope="col" className="px-2 py-1.5 text-start font-medium">{t('warehouseProcessing')}</th>
                          <th scope="col" className="px-2 py-1.5 text-start font-medium">{t('logisticsProcessing')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {[orderDetails.financialApproved, orderDetails.warehouseProcessed, logisticsProcessed].map((done, index) =>
                            <td key={index} className={`border-t border-slate-200 px-2 py-1.5 font-medium ${done ? 'text-green-700' : 'text-slate-500'}`}>
                              {done ? t('approved') : t('pending')}
                            </td>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Editing is available only for orders still in the warehouse workflow. */}
                {orderView === 'current' && <div>
                   <Label htmlFor="warehouseNotes">{t('warehouseNotes')}</Label>
                  <Textarea
                    id="warehouseNotes"
                    value={warehouseNotes}
                    onChange={(e) => setWarehouseNotes(e.target.value)}
                     placeholder={t('notePlaceholder')}
                    className="mt-2"
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      onClick={handleStartProcessing}
                      disabled={saveNotesMutation.isPending || updateOrderMutation.isPending}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                       {saveNotesMutation.isPending || updateOrderMutation.isPending ? t('processing') : t('startProcessing')}
                    </Button>
                  </div>
                </div>}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowOrderDetails(false)}
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePrintOrder}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  >
                    <Printer className="w-4 h-4 mr-1" />
                     {t('printDetails')}
                  </Button>
                  {selectedOrder?.currentStatus === 'warehouse_approved' && (
                    <Button
                      onClick={() => handleOrderAction(selectedOrder.id, 'logistics_dispatched')}
                      disabled={loadingOrderId === selectedOrder.id}
                    >
                      <Truck className="w-4 h-4 mr-1" />
                       {loadingOrderId === selectedOrder.id ? t('sending') : t('sendToLogistics')}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                 <p className="text-gray-600">{t('loadOrderError')}</p>
              </div>
            )}
      </div>
    );
  }
};

export default WarehouseManagementFixed;