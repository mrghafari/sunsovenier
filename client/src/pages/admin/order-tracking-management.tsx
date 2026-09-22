import { Fragment, useState, useEffect, useCallback } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search,
  Clock,
  Package,
  Truck,
  CheckCircle,
  Calendar,
  MapPin,
  Phone,
  User,
  TrendingUp,
  AlertCircle,
  FileText,
  CreditCard,
  Activity,
  Timer,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Printer
} from 'lucide-react';
import PaymentMethodBadge from '@/components/PaymentMethodBadge';
import { useLanguage } from '@/contexts/LanguageContext';

type Language = 'en' | 'ar' | 'tr' | 'fa';

const translations: Record<Language, Record<string, string>> = {
  en: {
    totalOrders: 'Total orders', pending: 'Pending', completed: 'Completed',
    totalRevenue: 'Total revenue (30 days)', averageOrder: 'Average order', todaysOrders: "Today's orders",
    manualStats: 'Statistics — manual refresh', refreshNow: 'Refresh now',
    searchPlaceholder: 'Search (at least 3 characters): order number, email, delivery code, phone...',
    minChars: 'Enter at least 3 characters', allStatuses: 'All statuses',
    problematicOnly: 'Problematic and failed only', orderList: 'Order list',
    listDescription: 'View and track all orders in the system', orderNumber: 'Order number',
    customer: 'Customer', contact: 'Contact', amount: 'Amount',
    rowNumber: '#', statusProblems: 'Status / problem details',
    createdTime: 'Order time', actions: 'Actions', view: 'View', unknown: 'Unknown',
    loading: 'Loading...', loadingOrders: 'Loading orders...', loadingLatest: 'Retrieving the latest order statuses',
    sessionExpired: 'Session expired', signInAgainMessage: 'Please sign in again to view orders', signInAgain: 'Sign in again',
    orderDetails: 'Order details', print: 'Print', printTitle: 'Print order details',
    customerInfo: 'Customer information', name: 'Name', email: 'Email', phone: 'Phone',
    financialInfo: 'Financial information', totalAmount: 'Total amount', paymentMethod: 'Payment method',
    currentStatus: 'Current status', problemDetails: 'Problem details:', deliveryInfo: 'Delivery information',
    deliveryCode: 'Delivery code', trackingNumber: 'Tracking number', estimatedDelivery: 'Estimated delivery date',
    actualDelivery: 'Actual delivery date', deliveryPerson: 'Delivery person', deliveryPhone: 'Delivery person phone',
    financialNotes: 'Financial notes', warehouseNotes: 'Warehouse notes', logisticsNotes: 'Logistics notes',
    noNotes: 'No notes', notAssigned: 'Not assigned', notSet: 'Not set', notDelivered: 'Not delivered',
    timestamps: 'Created and updated times', customerSubmitted: 'Order submitted by customer:',
    checkoutExactTime: '(Exact time the order was submitted at checkout)', lastStatusUpdate: 'Last status update:',
    noOrders: 'No orders found', noFilteredOrders: 'No orders match the selected filters',
    noOrdersYet: 'No orders have been registered yet', loadingMore: 'Loading more orders...',
    loadedOf: 'loaded out of', orders: 'orders', loadMore: 'Load more',
    allLoaded: 'All orders loaded', reloadForNew: 'Refresh the page to see new orders',
    scrollForMore: 'Scroll down to load more orders automatically',
    unpaid: 'Awaiting payment', customerDept: 'Customer', financeReview: 'Awaiting finance review',
    finance: 'Finance', confirmed: 'Awaiting preparation', warehouse: 'Warehouse',
    warehousePending: 'Awaiting warehouse', warehouseApproved: 'Warehouse approved',
    logistics: 'Logistics', warehouseReady: 'Awaiting delivery', delivered: 'Delivered',
    complete: 'Complete', deleted: 'Deleted', management: 'Management', cancelled: 'Cancelled',
    cancellation: 'Cancellation', financialRejected: 'Finance rejected', paymentFailed: 'Payment failed',
    payment: 'Payment', expired: 'Expired', system: 'System', warehouseRejected: 'Warehouse rejected',
    logisticsFailed: 'Delivery failed', invalid: 'Invalid',
    deletedExp: 'The order was deleted by management.',
    cancelledExp: 'The order was cancelled by the customer, management, or because payment was not completed.',
    financialRejectedExp: 'The payment receipt was rejected by the finance department.',
    paymentFailedExp: 'The online payment could not be completed.',
    expiredExp: 'The order expired because payment was not completed in time.',
    warehouseRejectedExp: 'The warehouse rejected the order because it could not be fulfilled.',
    logisticsFailedExp: 'The order delivery could not be completed.',
    unknownStatusExp: 'This status needs technical review.',
  },
  ar: {
    totalOrders: 'إجمالي الطلبات', pending: 'قيد الانتظار', completed: 'مكتملة',
    totalRevenue: 'إجمالي الإيرادات (30 يومًا)', averageOrder: 'متوسط الطلب', todaysOrders: 'طلبات اليوم',
    manualStats: 'الإحصاءات — تحديث يدوي', refreshNow: 'تحديث الآن',
    searchPlaceholder: 'البحث (3 أحرف على الأقل): رقم الطلب، البريد، رمز التسليم، الهاتف...',
    minChars: 'أدخل 3 أحرف على الأقل', allStatuses: 'جميع الحالات', problematicOnly: 'المشكلات والطلبات الفاشلة فقط',
    orderList: 'قائمة الطلبات', listDescription: 'عرض وتتبع جميع الطلبات في النظام',
    rowNumber: 'الرقم', orderNumber: 'رقم الطلب', customer: 'العميل', contact: 'جهة الاتصال', amount: 'المبلغ',
    statusProblems: 'الحالة / تفاصيل المشكلة',
    createdTime: 'وقت الطلب', actions: 'الإجراءات', view: 'عرض', unknown: 'غير معروف',
    loading: 'جارٍ التحميل...', loadingOrders: 'جارٍ تحميل الطلبات...', loadingLatest: 'جارٍ جلب أحدث حالات الطلبات',
    sessionExpired: 'انتهت الجلسة', signInAgainMessage: 'يرجى تسجيل الدخول مرة أخرى لعرض الطلبات', signInAgain: 'تسجيل الدخول مجددًا',
    orderDetails: 'تفاصيل الطلب', print: 'طباعة', printTitle: 'طباعة تفاصيل الطلب',
    customerInfo: 'معلومات العميل', name: 'الاسم', email: 'البريد الإلكتروني', phone: 'الهاتف',
    financialInfo: 'المعلومات المالية', totalAmount: 'المبلغ الإجمالي', paymentMethod: 'طريقة الدفع',
    currentStatus: 'الحالة الحالية', problemDetails: 'تفاصيل المشكلة:', deliveryInfo: 'معلومات التسليم',
    deliveryCode: 'رمز التسليم', trackingNumber: 'رقم التتبع', estimatedDelivery: 'تاريخ التسليم المتوقع',
    actualDelivery: 'تاريخ التسليم الفعلي', deliveryPerson: 'اسم مسؤول التسليم', deliveryPhone: 'هاتف مسؤول التسليم',
    financialNotes: 'ملاحظات المالية', warehouseNotes: 'ملاحظات المستودع', logisticsNotes: 'ملاحظات اللوجستيات',
    noNotes: 'لا توجد ملاحظات', notAssigned: 'غير معيّن', notSet: 'غير محدد', notDelivered: 'لم يتم التسليم',
    timestamps: 'أوقات الإنشاء والتحديث', customerSubmitted: 'وقت إرسال العميل للطلب:',
    checkoutExactTime: '(الوقت الدقيق لإرسال الطلب في صفحة الدفع)', lastStatusUpdate: 'آخر تحديث للحالة:',
    noOrders: 'لم يتم العثور على طلبات', noFilteredOrders: 'لا توجد طلبات تطابق عوامل التصفية المحددة',
    noOrdersYet: 'لم تُسجل طلبات بعد', loadingMore: 'جارٍ تحميل المزيد من الطلبات...',
    loadedOf: 'محمّل من أصل', orders: 'طلب', loadMore: 'تحميل المزيد', allLoaded: 'تم تحميل جميع الطلبات',
    reloadForNew: 'حدّث الصفحة لرؤية الطلبات الجديدة', scrollForMore: 'مرّر لأسفل لتحميل المزيد تلقائيًا',
    unpaid: 'بانتظار الدفع', customerDept: 'العميل', financeReview: 'بانتظار مراجعة المالية', finance: 'المالية',
    confirmed: 'بانتظار التجهيز', warehouse: 'المستودع', warehousePending: 'بانتظار المستودع',
    warehouseApproved: 'موافقة المستودع', logistics: 'اللوجستيات', warehouseReady: 'بانتظار التسليم',
    delivered: 'تم التسليم', complete: 'مكتمل', deleted: 'محذوف', management: 'الإدارة',
    cancelled: 'ملغى', cancellation: 'الإلغاء', financialRejected: 'مرفوض ماليًا',
    paymentFailed: 'فشل الدفع', payment: 'الدفع', expired: 'منتهي الصلاحية', system: 'النظام',
    warehouseRejected: 'مرفوض من المستودع', logisticsFailed: 'فشل التسليم', invalid: 'غير صالح',
    deletedExp: 'حُذف الطلب بواسطة الإدارة.',
    cancelledExp: 'أُلغي الطلب بواسطة العميل أو الإدارة أو بسبب عدم اكتمال الدفع.',
    financialRejectedExp: 'رفض القسم المالي إيصال الدفع.',
    paymentFailedExp: 'تعذر إكمال الدفع الإلكتروني.',
    expiredExp: 'انتهت صلاحية الطلب لعدم إكمال الدفع في الوقت المحدد.',
    warehouseRejectedExp: 'رفض المستودع الطلب لتعذر تجهيزه.',
    logisticsFailedExp: 'تعذر إكمال تسليم الطلب.',
    unknownStatusExp: 'تحتاج هذه الحالة إلى مراجعة فنية.',
  },
  tr: {
    totalOrders: 'Toplam sipariş', pending: 'Bekleyen', completed: 'Tamamlanan',
    totalRevenue: 'Toplam gelir (30 gün)', averageOrder: 'Ortalama sipariş', todaysOrders: 'Bugünkü siparişler',
    manualStats: 'İstatistikler — manuel yenileme', refreshNow: 'Şimdi yenile',
    searchPlaceholder: 'Ara (en az 3 karakter): sipariş no, e-posta, teslimat kodu, telefon...',
    minChars: 'En az 3 karakter girin', allStatuses: 'Tüm durumlar', problematicOnly: 'Yalnızca sorunlu ve başarısız',
    orderList: 'Sipariş listesi', listDescription: 'Sistemdeki tüm siparişleri görüntüleyin ve takip edin',
    rowNumber: 'Sıra', orderNumber: 'Sipariş numarası', customer: 'Müşteri', contact: 'İletişim', amount: 'Tutar',
    statusProblems: 'Durum / sorun ayrıntıları',
    createdTime: 'Sipariş zamanı', actions: 'İşlemler', view: 'Görüntüle', unknown: 'Bilinmiyor',
    loading: 'Yükleniyor...', loadingOrders: 'Siparişler yükleniyor...', loadingLatest: 'En güncel sipariş durumları alınıyor',
    sessionExpired: 'Oturum süresi doldu', signInAgainMessage: 'Siparişleri görmek için yeniden giriş yapın', signInAgain: 'Yeniden giriş yap',
    orderDetails: 'Sipariş ayrıntıları', print: 'Yazdır', printTitle: 'Sipariş ayrıntılarını yazdır',
    customerInfo: 'Müşteri bilgileri', name: 'Ad', email: 'E-posta', phone: 'Telefon',
    financialInfo: 'Finansal bilgiler', totalAmount: 'Toplam tutar', paymentMethod: 'Ödeme yöntemi',
    currentStatus: 'Geçerli durum', problemDetails: 'Sorun ayrıntıları:', deliveryInfo: 'Teslimat bilgileri',
    deliveryCode: 'Teslimat kodu', trackingNumber: 'Takip numarası', estimatedDelivery: 'Tahmini teslimat tarihi',
    actualDelivery: 'Gerçek teslimat tarihi', deliveryPerson: 'Teslimat görevlisi', deliveryPhone: 'Teslimat görevlisi telefonu',
    financialNotes: 'Finans notları', warehouseNotes: 'Depo notları', logisticsNotes: 'Lojistik notları',
    noNotes: 'Not yok', notAssigned: 'Atanmadı', notSet: 'Belirlenmedi', notDelivered: 'Teslim edilmedi',
    timestamps: 'Oluşturma ve güncelleme zamanları', customerSubmitted: 'Müşterinin siparişi gönderdiği zaman:',
    checkoutExactTime: '(Siparişin ödeme sayfasında gönderildiği kesin zaman)', lastStatusUpdate: 'Son durum güncellemesi:',
    noOrders: 'Sipariş bulunamadı', noFilteredOrders: 'Seçilen filtrelerle eşleşen sipariş yok',
    noOrdersYet: 'Henüz sipariş kaydedilmedi', loadingMore: 'Daha fazla sipariş yükleniyor...',
    loadedOf: 'yüklendi /', orders: 'sipariş', loadMore: 'Daha fazla yükle', allLoaded: 'Tüm siparişler yüklendi',
    reloadForNew: 'Yeni siparişleri görmek için sayfayı yenileyin', scrollForMore: 'Daha fazlasını otomatik yüklemek için aşağı kaydırın',
    unpaid: 'Ödeme bekliyor', customerDept: 'Müşteri', financeReview: 'Finans incelemesi bekliyor', finance: 'Finans',
    confirmed: 'Hazırlanmayı bekliyor', warehouse: 'Depo', warehousePending: 'Depo bekleniyor',
    warehouseApproved: 'Depo onayladı', logistics: 'Lojistik', warehouseReady: 'Teslimat bekliyor',
    delivered: 'Teslim edildi', complete: 'Tamamlandı', deleted: 'Silindi', management: 'Yönetim',
    cancelled: 'İptal edildi', cancellation: 'İptal', financialRejected: 'Finans reddetti',
    paymentFailed: 'Ödeme başarısız', payment: 'Ödeme', expired: 'Süresi doldu', system: 'Sistem',
    warehouseRejected: 'Depo reddetti', logisticsFailed: 'Teslimat başarısız', invalid: 'Geçersiz',
    deletedExp: 'Sipariş yönetim tarafından silindi.',
    cancelledExp: 'Sipariş müşteri, yönetim veya tamamlanmayan ödeme nedeniyle iptal edildi.',
    financialRejectedExp: 'Ödeme makbuzu finans departmanı tarafından reddedildi.',
    paymentFailedExp: 'Çevrimiçi ödeme tamamlanamadı.',
    expiredExp: 'Ödeme zamanında tamamlanmadığı için siparişin süresi doldu.',
    warehouseRejectedExp: 'Sipariş hazırlanamadığı için depo tarafından reddedildi.',
    logisticsFailedExp: 'Sipariş teslimatı tamamlanamadı.',
    unknownStatusExp: 'Bu durumun teknik olarak incelenmesi gerekiyor.',
  },
  fa: {
    totalOrders: 'کل سفارشات', pending: 'در انتظار', completed: 'تکمیل شده',
    totalRevenue: 'درآمد کل (۳۰ روز)', averageOrder: 'میانگین سفارش', todaysOrders: 'سفارشات امروز',
    manualStats: 'آمارها — بروزرسانی دستی', refreshNow: 'به‌روزرسانی فوری',
    searchPlaceholder: 'جستجو (حداقل ۳ حرف): شماره سفارش، ایمیل، کد تحویل، تلفن...',
    minChars: 'حداقل ۳ حرف وارد کنید', allStatuses: 'همه وضعیت‌ها', problematicOnly: 'فقط مشکل‌دار و شکست‌خورده',
    orderList: 'لیست سفارشات', listDescription: 'مشاهده و پیگیری تمامی سفارشات موجود در سیستم',
    rowNumber: 'ردیف', orderNumber: 'شماره سفارش', customer: 'مشتری', contact: 'اطلاعات تماس', amount: 'مبلغ',
    statusProblems: 'وضعیت / توضیحات مشکلات',
    createdTime: 'زمان ثبت سفارش', actions: 'عملیات', view: 'مشاهده', unknown: 'نامشخص',
    loading: 'در حال بارگیری...', loadingOrders: 'بارگیری سفارشات...', loadingLatest: 'در حال دریافت آخرین وضعیت سفارشات',
    sessionExpired: 'جلسه منقضی شده', signInAgainMessage: 'برای مشاهده سفارشات، لطفاً دوباره وارد شوید', signInAgain: 'ورود مجدد',
    orderDetails: 'جزئیات سفارش', print: 'چاپ', printTitle: 'چاپ جزئیات سفارش',
    customerInfo: 'اطلاعات مشتری', name: 'نام', email: 'ایمیل', phone: 'تلفن',
    financialInfo: 'اطلاعات مالی', totalAmount: 'مبلغ کل', paymentMethod: 'روش پرداخت',
    currentStatus: 'وضعیت فعلی', problemDetails: 'توضیحات مشکل:', deliveryInfo: 'اطلاعات تحویل',
    deliveryCode: 'کد تحویل', trackingNumber: 'شماره رهگیری', estimatedDelivery: 'تاریخ تحویل تخمینی',
    actualDelivery: 'تاریخ تحویل واقعی', deliveryPerson: 'نام تحویل‌دهنده', deliveryPhone: 'تلفن تحویل‌دهنده',
    financialNotes: 'یادداشت‌های مالی', warehouseNotes: 'یادداشت‌های انبار', logisticsNotes: 'یادداشت‌های لجستیک',
    noNotes: 'یادداشتی وجود ندارد', notAssigned: 'تخصیص نشده', notSet: 'تعیین نشده', notDelivered: 'تحویل نشده',
    timestamps: 'زمان‌های ثبت و بروزرسانی', customerSubmitted: 'زمان ثبت سفارش توسط مشتری:',
    checkoutExactTime: '(زمان دقیق ثبت سفارش در صفحه پرداخت)', lastStatusUpdate: 'آخرین بروزرسانی وضعیت:',
    noOrders: 'سفارشی یافت نشد', noFilteredOrders: 'هیچ سفارشی با فیلترهای انتخابی یافت نشد',
    noOrdersYet: 'هنوز سفارشی در سیستم ثبت نشده است', loadingMore: 'در حال بارگیری سفارشات بیشتر...',
    loadedOf: 'بارگیری شده از', orders: 'سفارش', loadMore: 'بارگیری بیشتر', allLoaded: 'همه سفارشات بارگیری شد',
    reloadForNew: 'برای مشاهده سفارشات جدید، صفحه را بازخوانی کنید', scrollForMore: 'برای بارگیری خودکار سفارشات بیشتر، به پایین صفحه اسکرول کنید',
    unpaid: 'در انتظار پرداخت', customerDept: 'مشتری', financeReview: 'در انتظار بررسی مالی', finance: 'مالی',
    confirmed: 'در انتظار آماده‌سازی', warehouse: 'انبار', warehousePending: 'در انتظار انبار',
    warehouseApproved: 'تایید انبار', logistics: 'لجستیک', warehouseReady: 'در انتظار تحویل',
    delivered: 'تحویل شده', complete: 'تکمیل', deleted: 'حذف شده', management: 'مدیریت',
    cancelled: 'لغو شده', cancellation: 'لغو', financialRejected: 'رد مالی',
    paymentFailed: 'پرداخت ناموفق', payment: 'پرداخت', expired: 'منقضی شده', system: 'سیستم',
    warehouseRejected: 'رد انبار', logisticsFailed: 'شکست ارسال', invalid: 'نامعتبر',
    deletedExp: 'سفارش توسط مدیریت حذف شده است.',
    cancelledExp: 'سفارش توسط مشتری، مدیریت یا به دلیل تکمیل نشدن پرداخت لغو شده است.',
    financialRejectedExp: 'فیش پرداخت توسط بخش مالی رد شده است.',
    paymentFailedExp: 'پرداخت آنلاین تکمیل نشد.',
    expiredExp: 'سفارش به دلیل تکمیل نشدن پرداخت در زمان مقرر منقضی شده است.',
    warehouseRejectedExp: 'سفارش به دلیل امکان‌پذیر نبودن آماده‌سازی توسط انبار رد شده است.',
    logisticsFailedExp: 'تحویل سفارش تکمیل نشد.',
    unknownStatusExp: 'این وضعیت نیاز به بررسی فنی دارد.',
  }
};

// Order interface - Rebuilt to match actual backend database structure
interface Order {
  id: number;
  customerOrderId: number;
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  totalAmount: number | string;
  currency: string;
  status: string;
  paymentMethod?: string;
  paymentReceiptUrl?: string;
  trackingNumber?: string;
  deliveryCode?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  financialNotes?: string;
  warehouseNotes?: string;
  logisticsNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// Status history interface
interface StatusHistoryItem {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  changedBy: number | null;
  changedByDepartment: string | null;
  notes: string | null;
  createdAt: string;
}

// Order statistics interface
interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  todaysOrders: number;
}

// Enhanced status display with detailed explanations for failed/deleted orders
const getStatusDisplay = (order: Order, t: (key: string) => string) => {
  const status = order.status;
  const paymentReceiptUrl = order.paymentReceiptUrl;
  
  switch (status) {
    case 'pending':
      // Check if payment receipt is uploaded to determine which department
      if (!paymentReceiptUrl) {
        return {
          label: t('unpaid'),
          department: t('customerDept'),
          color: 'bg-red-100 text-red-800 border-red-200',
          explanation: 'مشتری هنوز فیش پرداخت را آپلود نکرده است'
        };
      } else {
        return {
          label: t('financeReview'),
          department: t('finance'),
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          explanation: 'فیش پرداخت آپلود شده و در انتظار تایید بخش مالی'
        };
      }
    case 'finance_pending':
      return {
        label: t('financeReview'),
        department: t('finance'),
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        explanation: 'فیش پرداخت آپلود شده و در انتظار تایید بخش مالی'
      };
    case 'confirmed':
      return {
        label: t('confirmed'),
        department: t('warehouse'),
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        explanation: 'پرداخت تایید شده و در انتظار آماده‌سازی توسط انبار'
      };
    case 'warehouse_pending':
      return {
        label: t('warehousePending'),
        department: t('warehouse'),
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        explanation: 'پرداخت تایید شده و در انتظار پردازش توسط انبار'
      };
    case 'warehouse_approved':
      return {
        label: t('warehouseApproved'),
        department: t('logistics'),
        color: 'bg-green-100 text-green-800 border-green-200',
        explanation: 'سفارش توسط انبار تایید شده و آماده ارسال است'
      };
    case 'warehouse_ready':
      return {
        label: t('warehouseReady'),
        department: t('logistics'),
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        explanation: 'سفارش آماده شده و در انتظار ارسال توسط لجستیک'
      };
    case 'delivered':
      return {
        label: t('delivered'),
        department: t('complete'),
        color: 'bg-green-100 text-green-800 border-green-200',
        explanation: 'سفارش با موفقیت به مشتری تحویل داده شده'
      };
    
    // FAILED & DELETED ORDERS WITH DETAILED EXPLANATIONS
    case 'deleted':
      return {
        label: `❌ ${t('deleted')}`,
        department: t('management'),
        color: 'bg-red-200 text-red-900 border-red-300',
        explanation: t('deletedExp'),
        isProblematic: true
      };
    case 'cancelled':
      return {
        label: `🚫 ${t('cancelled')}`,
        department: t('cancellation'),
        color: 'bg-orange-200 text-orange-900 border-orange-300',
        explanation: t('cancelledExp'),
        isProblematic: true
      };
    case 'financial_rejected':
      return {
        label: `💳 ${t('financialRejected')}`,
        department: t('finance'),
        color: 'bg-red-200 text-red-900 border-red-300',
        explanation: t('financialRejectedExp'),
        isProblematic: true
      };
    case 'payment_failed':
      return {
        label: `❌ ${t('paymentFailed')}`,
        department: t('payment'),
        color: 'bg-red-200 text-red-900 border-red-300',
        explanation: t('paymentFailedExp'),
        isProblematic: true
      };
    case 'expired':
      return {
        label: `⏰ ${t('expired')}`,
        department: t('system'),
        color: 'bg-gray-200 text-gray-900 border-gray-300',
        explanation: t('expiredExp'),
        isProblematic: true
      };
    case 'warehouse_rejected':
      return {
        label: `📦 ${t('warehouseRejected')}`,
        department: t('warehouse'),
        color: 'bg-red-200 text-red-900 border-red-300',
        explanation: t('warehouseRejectedExp'),
        isProblematic: true
      };
    case 'logistics_failed':
      return {
        label: `🚛 ${t('logisticsFailed')}`,
        department: t('logistics'),
        color: 'bg-red-200 text-red-900 border-red-300',
        explanation: t('logisticsFailedExp'),
        isProblematic: true
      };
    
    default:
      return {
        label: status || t('unknown'),
        department: t('invalid'),
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        explanation: `${t('unknownStatusExp')} (${status})`,
        isProblematic: true
      };
  }
};

// Comprehensive status labels including failed/problematic orders
const statusLabels: { [key: string]: string } = {
  'pending': 'در انتظار',
  'confirmed': 'تأیید شده', 
  'payment_uploaded': 'فیش بانکی آپلود شده',
  'finance_pending': 'در انتظار بررسی مالی',
  'financial_reviewing': 'در حال بررسی مالی',
  'financial_approved': 'تأیید مالی',
  'financial_rejected': '💳 رد مالی', 
  'warehouse_pending': 'در انتظار انبار',
  'warehouse_processing': 'در حال آماده‌سازی انبار',
  'warehouse_approved': 'تایید انبار',
  'warehouse_ready': 'آماده انبار',
  'warehouse_rejected': '📦 رد انبار',
  'logistics_assigned': 'تحویل لجستیک',
  'logistics_failed': '🚛 شکست ارسال',
  'in_transit': 'در راه',
  'delivered': 'تحویل داده شده',
  'completed': 'تکمیل شده',
  'cancelled': '🚫 لغو شده',
  'deleted': '❌ حذف شده',
  'payment_failed': '❌ پرداخت ناموفق',
  'expired': '⏰ منقضی شده'
};

// Department labels
const departmentLabels: { [key: string]: string } = {
  'financial': 'مالی',
  'warehouse': 'انبار',
  'logistics': 'لجستیک'
};

// Format date function - Exactly same as financial department
const formatDate = (dateString: string, language: Language, unknown: string) => {
  if (!dateString) return unknown;
  try {
    const locale = language === 'fa' ? 'fa-IR-u-ca-persian' :
      language === 'ar' ? 'ar-u-ca-gregory' :
      language === 'tr' ? 'tr-TR-u-ca-gregory' : 'en-US-u-ca-gregory';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateString));
  } catch {
    return unknown;
  }
};

export default function OrderTrackingManagement() {
  const { language: contextLanguage, direction } = useLanguage();
  const language = (contextLanguage in translations ? contextLanguage : 'en') as Language;
  const t = (key: string) => translations[language][key] || translations.en[key] || key;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all'); // all, financial, orphaned
  const [sortField, setSortField] = useState<keyof Order | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Manual refresh only - no automatic refresh intervals

  // 📄 INFINITE SCROLL: Fetch orders with pagination (100 orders per page)
  const {
    data: ordersData,
    isLoading,
    isLoadingError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: ['tracking-orders-paginated'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(`/api/orders/tracking/all?limit=100&offset=${pageParam}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        // If authentication fails, redirect to login
        if (response.status === 401) {
          window.location.href = '/mrg/login';
          return { orders: [], pagination: null };
        }
        throw new Error('Failed to fetch tracking orders');
      }
      
      const data = await response.json();
      return {
        orders: data.orders as Order[],
        pagination: data.pagination
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination?.hasNextPage ? lastPage.pagination.nextOffset : undefined;
    },
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep cache for 5 minutes
    retry: (failureCount, error) => {
      // Don't retry auth failures
      if (error.message.includes('401')) return false;
      return failureCount < 2;
    }
  });

  // Flatten all pages into a single orders array
  const orders = ordersData?.pages.flatMap(page => page.orders) || [];
  const totalCount = ordersData?.pages[0]?.pagination?.totalCount || 0;

  // 🔄 INFINITE SCROLL: Detect when user scrolls near bottom
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.offsetHeight - 1000 && // Load more when 1000px from bottom
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Fetch order statistics - Manual refresh only
  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['order-management-statistics-updated'],
    queryFn: async () => {
      const response = await fetch('/api/order-management/statistics', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/mrg/login';
          return {};
        }
        throw new Error('Failed to fetch order statistics');
      }
      const data = await response.json();
      console.log('📊 [STATS] Statistics loaded:', data);
      return data as OrderStats;
    },
    staleTime: 10000, // Consider data stale after 10 seconds
    gcTime: 60000, // Keep cache for 1 minute
    retry: 2
  });

  // Handle sorting
  const handleSort = (field: keyof Order) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter and sort orders (minimum 3 characters required for search)
  const filteredOrders = orders?.filter(order => {
    // Require minimum 3 characters for search to activate
    const searchActive = searchTerm.length >= 3;
    const searchLower = searchTerm.toLowerCase();
    
    const matchesSearch = !searchActive || 
      order.customerName?.toLowerCase().includes(searchLower) ||
      order.customerEmail?.toLowerCase().includes(searchLower) ||
      order.customerOrderId?.toString().includes(searchTerm) ||
      order.orderNumber?.toLowerCase().includes(searchLower) ||
      order.deliveryCode?.toLowerCase().includes(searchLower) ||
      order.customerPhone?.toLowerCase().includes(searchLower);
    
    // Enhanced status filtering including problematic orders
    let matchesStatus = true;
    if (selectedStatus === 'problematic') {
      // Filter for problematic/failed orders only
      const statusInfo = getStatusDisplay(order, t);
      matchesStatus = statusInfo.isProblematic === true;
    } else if (selectedStatus !== 'all') {
      matchesStatus = order.status === selectedStatus;
    }
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    // Handle undefined values
    if (aValue === undefined && bValue === undefined) return 0;
    if (aValue === undefined) return 1;
    if (bValue === undefined) return -1;
    
    // Handle different data types
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  }) || [];

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'outline';
      case 'confirmed':
        return 'secondary';
      case 'financial_approved':
        return 'default';
      case 'financial_rejected':
        return 'destructive';
      case 'delivered':
        return 'default';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Format date for display - Show exact checkout submission time in Gregorian
  // Format amount with currency
  const formatAmount = (amount: number | string | null | undefined, currency: string) => {
    if (amount === null || amount === undefined) return `0 ${currency}`;
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return `0 ${currency}`;
    return `${numericAmount.toLocaleString()} ${currency}`;
  };

  // Print function for order details
  const handlePrintOrder = () => {
    if (!selectedOrder) return;
    
    const statusInfo = getStatusDisplay(selectedOrder, t);
    
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>جزئیات سفارش ${selectedOrder.orderNumber || `#${selectedOrder.customerOrderId}`}</title>
        <style>
          body { font-family: 'Tahoma', sans-serif; margin: 15px; direction: rtl; font-size: 13px; }
          .header { text-align: center; border-bottom: 1px solid #333; padding-bottom: 12px; margin-bottom: 12px; }
          .company-logo { max-width: 100px; height: auto; margin-bottom: 6px; }
          .company-name { font-size: 18px; font-weight: bold; color: #1a365d; }
          .order-title { font-size: 14px; margin-top: 6px; }
          .section { margin-bottom: 12px; }
          .section-title { font-size: 14px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 6px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
          .info-item { border: 1px solid #ddd; padding: 6px; border-radius: 3px; }
          .info-label { font-weight: bold; color: #666; font-size: 10px; }
          .info-value { margin-top: 3px; font-size: 12px; }
          .notes-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-top: 6px; }
          .notes-item { padding: 6px; border-radius: 3px; text-align: right; border: 1px solid #ddd; background-color: #f8f9fa; }
          .footer { margin-top: 15px; text-align: center; font-size: 10px; color: #666; }
          .status-badge { display: inline-block; padding: 2px 6px; border-radius: 8px; font-size: 10px; font-weight: bold; }
          .payment-method { display: inline-block; padding: 1px 4px; background-color: #e5e7eb; border-radius: 3px; font-size: 10px; }
          @media print { 
            body { 
              margin: 0; 
              padding: 8mm 6mm 8mm 6mm; 
              box-sizing: border-box;
              font-size: 9pt;
              line-height: 1.2;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header { 
              margin-bottom: 6mm; 
              padding-bottom: 4mm;
              page-break-after: avoid;
            }
            .company-logo { max-width: 60px; margin-bottom: 2mm; }
            .company-name { font-size: 14pt; }
            .order-title { font-size: 11pt; margin-top: 2mm; }
            .section { 
              margin-bottom: 4mm; 
              page-break-inside: avoid;
            }
            .section-title { 
              font-size: 11pt; 
              margin-bottom: 2mm; 
              padding-bottom: 1mm;
            }
            .info-grid { 
              grid-template-columns: 1fr 1fr; 
              gap: 2mm;
              margin-bottom: 2mm;
            }
            .info-item { 
              padding: 2mm; 
              border: 0.5pt solid #ddd;
            }
            .info-label { font-size: 8pt; }
            .info-value { font-size: 9pt; margin-top: 1mm; }
            .notes-grid { 
              grid-template-columns: 1fr 1fr 1fr; 
              gap: 2mm;
              margin-top: 2mm;
            }
            .notes-item { 
              padding: 2mm; 
              border: 0.5pt solid #ddd;
              font-size: 8pt;
            }
            .footer { 
              margin-top: 4mm; 
              page-break-inside: avoid;
              font-size: 8pt;
            }
            .status-badge { 
              font-size: 8pt; 
              padding: 1mm 2mm;
            }
            .payment-method { 
              font-size: 8pt; 
              padding: 0.5mm 1mm;
            }
            @page {
              margin: 8mm 6mm 8mm 6mm;
              size: A4;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/attached_assets/company-logo.png" alt="لوگوی شرکت" class="company-logo" />
          <div class="company-name">شرکت ممتاز شیمی</div>
          <div class="order-title">جزئیات سفارش ${selectedOrder.orderNumber || `#${selectedOrder.customerOrderId}`}</div>
          <div style="font-size: 12px; margin-top: 10px;">تاریخ چاپ: ${new Date().toLocaleDateString('en-GB')}</div>
        </div>

        <div class="section">
          <div class="section-title">اطلاعات مشتری</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">نام مشتری</div>
              <div class="info-value">${selectedOrder.customerName || 'نامشخص'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">شماره تماس</div>
              <div class="info-value">${selectedOrder.customerPhone || 'نامشخص'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">ایمیل</div>
              <div class="info-value">${selectedOrder.customerEmail || 'نامشخص'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">مبلغ کل</div>
              <div class="info-value" style="color: #059669; font-weight: bold;">${formatAmount(selectedOrder.totalAmount, selectedOrder.currency)}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">اطلاعات مالی و وضعیت</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">روش پرداخت</div>
              <div class="info-value payment-method">${selectedOrder.paymentMethod || 'نامشخص'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">وضعیت فعلی</div>
              <div class="info-value status-badge" style="background-color: #e5e7eb; color: #374151;">${statusInfo.label}</div>
            </div>
            <div class="info-item">
              <div class="info-label">بخش مسئول</div>
              <div class="info-value">${statusInfo.department}</div>
            </div>
            <div class="info-item">
              <div class="info-label">کد تحویل</div>
              <div class="info-value">${selectedOrder.deliveryCode || 'تخصیص نشده'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">اطلاعات تحویل</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">شماره رهگیری</div>
              <div class="info-value">${selectedOrder.trackingNumber || 'تخصیص نشده'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">تاریخ تحویل تخمینی</div>
              <div class="info-value">${selectedOrder.estimatedDeliveryDate ? formatDate(selectedOrder.estimatedDeliveryDate, language, t('unknown')) : t('notSet')}</div>
            </div>
            <div class="info-item">
              <div class="info-label">تاریخ تحویل واقعی</div>
              <div class="info-value">${selectedOrder.actualDeliveryDate ? formatDate(selectedOrder.actualDeliveryDate, language, t('unknown')) : t('notDelivered')}</div>
            </div>
            <div class="info-item">
              <div class="info-label">نام تحویل‌دهنده</div>
              <div class="info-value">${selectedOrder.deliveryPersonName || 'تخصیص نشده'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">تلفن تحویل‌دهنده</div>
              <div class="info-value">${selectedOrder.deliveryPersonPhone || 'تخصیص نشده'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">یادداشت‌های بخش‌ها</div>
          <div class="notes-grid">
            <div class="notes-item">
              <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px;">📋 یادداشت‌های مالی</div>
              <div style="font-size: 13px; line-height: 1.4;">${selectedOrder.financialNotes || 'یادداشتی وجود ندارد'}</div>
            </div>
            <div class="notes-item">
              <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px;">📦 یادداشت‌های انبار</div>
              <div style="font-size: 13px; line-height: 1.4;">${selectedOrder.warehouseNotes || 'یادداشتی وجود ندارد'}</div>
            </div>
            <div class="notes-item">
              <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px;">🚛 یادداشت‌های لجستیک</div>
              <div style="font-size: 13px; line-height: 1.4;">${selectedOrder.logisticsNotes || 'یادداشتی وجود ندارد'}</div>
            </div>
          </div>
        </div>

        ${statusInfo.isProblematic && statusInfo.explanation ? `
          <div class="section">
            <div class="section-title">⚠️ توضیحات مشکل</div>
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca; color: #7f1d1d;">
              ${statusInfo.explanation}
            </div>
          </div>
        ` : ''}

        <div class="section">
          <div class="section-title">زمان‌های ثبت و بروزرسانی</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">تاریخ ثبت سفارش</div>
              <div class="info-value">${formatDate(selectedOrder.createdAt, language, t('unknown'))}</div>
            </div>
            <div class="info-item">
              <div class="info-label">آخرین بروزرسانی</div>
              <div class="info-value">${formatDate(selectedOrder.updatedAt, language, t('unknown'))}</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>این سند توسط سیستم مدیریت سفارشات ممتاز شیمی تولید شده است</p>
          <p>تاریخ و زمان چاپ: ${new Date().toLocaleString('en-GB', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}</p>
        </div>
      </body>
      </html>
    `;

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load and then print
      const handlePrint = () => {
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      };
      
      if (printWindow.document.readyState === 'complete') {
        handlePrint();
      } else {
        printWindow.onload = handlePrint;
        setTimeout(handlePrint, 1500);
      }
    } else {
      // Fallback: Use blob and object URL
      const blob = new Blob([printContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWindow2 = window.open(url, '_blank');
      if (printWindow2) {
        setTimeout(() => {
          printWindow2.print();
          URL.revokeObjectURL(url);
        }, 1500);
      }
    }
  };

  // Debug information display
  console.log('🔍 [RENDER DEBUG] Component state:', {
    isLoading,
    isLoadingStats,
    ordersData: orders,
    ordersCount: orders?.length || 0,
    hasOrders: !!orders,
  });

  // Show login prompt if authentication error
  if (error && error.message.includes('401')) {
    return (
      <div className="space-y-6 p-6" dir={direction}>
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />
          <h2 className="mt-4 text-xl font-bold text-gray-800">{t('sessionExpired')}</h2>
          <p className="mt-2 text-gray-600">{t('signInAgainMessage')}</p>
          <button 
            onClick={() => window.location.href = '/mrg/login'}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('signInAgain')}
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || isLoadingStats) {
    return (
      <div className="space-y-6 p-6" dir={direction}>
        <div className="text-center py-12">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-current border-t-transparent text-blue-600 rounded-full" role="status" aria-label="loading">
            <span className="sr-only">{t('loading')}</span>
          </div>
          <p className="mt-4 text-gray-700 font-medium">{t('loadingOrders')}</p>
          <p className="mt-2 text-sm text-gray-500">{t('loadingLatest')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" dir={direction}>

      {/* UPDATED Statistics Cards with Real-time Data */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="relative">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">{t('totalOrders')}</p>
                <p className="text-2xl font-bold text-blue-700">
                  {isLoadingStats ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    totalCount || 0
                  )}
                </p>
              </div>
            </div>
            {!isLoadingStats && (
              <div className="absolute top-2 left-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">{t('pending')}</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {isLoadingStats ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    stats?.pendingOrders || 0
                  )}
                </p>
              </div>
            </div>
            {!isLoadingStats && (
              <div className="absolute top-2 left-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">{t('completed')}</p>
                <p className="text-2xl font-bold text-green-700">
                  {isLoadingStats ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    stats?.completedOrders || 0
                  )}
                </p>
              </div>
            </div>
            {!isLoadingStats && (
              <div className="absolute top-2 left-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">{t('totalRevenue')}</p>
                <p className="text-lg font-bold text-green-700">
                  {isLoadingStats ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    `${(stats?.totalRevenue || 0).toLocaleString()} IQD`
                  )}
                </p>
              </div>
            </div>
            {!isLoadingStats && (
              <div className="absolute top-2 left-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">{t('averageOrder')}</p>
                <p className="text-lg font-bold text-purple-700">
                  {isLoadingStats ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    `${(stats?.averageOrderValue || 0).toLocaleString()} IQD`
                  )}
                </p>
              </div>
            </div>
            {!isLoadingStats && (
              <div className="absolute top-2 left-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">{t('todaysOrders')}</p>
                <p className="text-2xl font-bold text-orange-700">
                  {isLoadingStats ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    stats?.todaysOrders || 0
                  )}
                </p>
              </div>
            </div>
            {!isLoadingStats && (
              <div className="absolute top-2 left-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Real-time Update Indicator */}
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-800 font-medium">
            {t('manualStats')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => refetchStats()}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            {t('refreshNow')}
          </button>
          {isLoadingStats && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
          )}
        </div>
      </div>


      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={`absolute top-3 h-4 w-4 text-gray-400 ${direction === 'rtl' ? 'right-3' : 'left-3'}`} />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={direction === 'rtl' ? 'pr-10' : 'pl-10'}
            data-testid="input-order-search"
          />
          {searchTerm.length > 0 && searchTerm.length < 3 && (
            <span className={`absolute top-3 text-xs text-amber-600 ${direction === 'rtl' ? 'left-3' : 'right-3'}`}>
              {t('minChars')}
            </span>
          )}
        </div>
        <select 
          value={selectedStatus} 
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t('allStatuses')}</option>
          <option value="problematic" className="text-red-600 font-medium">🚨 {t('problematicOnly')}</option>
          <option value="pending">{t('pending')}</option>
          <option value="confirmed">{t('confirmed')}</option>
          <option value="financial_approved">{t('finance')}</option>
          <option value="delivered">{t('delivered')}</option>
          <option value="completed">{t('completed')}</option>
          <option value="cancelled">{t('cancelled')}</option>
          <option value="deleted">{t('deleted')}</option>
          <option value="financial_rejected">{t('financialRejected')}</option>
          <option value="payment_failed">{t('paymentFailed')}</option>
          <option value="warehouse_rejected">{t('warehouseRejected')}</option>
          <option value="expired">{t('expired')}</option>
        </select>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t('orderList')} ({filteredOrders.length})
          </CardTitle>
          <CardDescription>
            {t('listDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-300">
            <table className="w-full table-fixed border-collapse text-xs">
              <colgroup>
                <col className="w-[5%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[17%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr className="border-b-2 border-slate-400 bg-slate-100 text-slate-800">
                  <th className="border border-slate-300 px-1 py-2 text-center font-semibold">
                    {t('rowNumber')}
                  </th>
                  <th className="border border-slate-300 px-2 py-2 font-semibold" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                    <button 
                      onClick={() => handleSort('orderNumber')}
                      className={`flex items-center w-full hover:text-blue-600 transition-colors ${direction === 'rtl' ? 'justify-end' : 'justify-start'}`}
                    >
                      {t('orderNumber')}
                      {sortField === 'orderNumber' && (
                        <span className="mr-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="border border-slate-300 px-2 py-2 font-semibold" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                    <button 
                      onClick={() => handleSort('customerName')}
                      className={`flex items-center w-full hover:text-blue-600 transition-colors ${direction === 'rtl' ? 'justify-end' : 'justify-start'}`}
                    >
                      {t('customer')}
                      {sortField === 'customerName' && (
                        <span className="mr-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="border border-slate-300 px-2 py-2 font-semibold" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                    {t('contact')}
                  </th>
                  <th className="border border-slate-300 px-2 py-2 font-semibold" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                    <button 
                      onClick={() => handleSort('totalAmount')}
                      className="flex w-full items-center hover:text-blue-600 transition-colors"
                    >
                      {t('amount')}
                      {sortField === 'totalAmount' && (
                        <span className="mr-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="border border-slate-300 px-2 py-2 font-semibold" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                    {t('paymentMethod')}
                  </th>
                  <th className="border border-slate-300 px-2 py-2 font-semibold" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                    <button 
                      onClick={() => handleSort('status')}
                      className="flex w-full items-center hover:text-blue-600 transition-colors"
                    >
                      {t('statusProblems')}
                      {sortField === 'status' && (
                        <span className="mr-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="border border-slate-300 px-2 py-2 font-semibold" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                    <button 
                      onClick={() => handleSort('createdAt')}
                      className="flex w-full items-center hover:text-blue-600 transition-colors"
                    >
                      {t('createdTime')}
                      {sortField === 'createdAt' && (
                        <span className="mr-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => (
                  <Fragment key={order.id}>
                  <tr className={`border-b border-slate-300 align-top odd:bg-white even:bg-slate-50 hover:bg-blue-50 ${
                    selectedOrder?.id === order.id ? 'bg-blue-50' : ''
                  } ${
                    order.status === 'deleted' ? 'bg-orange-50/70 hover:bg-orange-100/70' : ''
                  }`}>
                    <td className="border border-slate-300 px-1 py-2 text-center text-slate-500">
                      {index + 1}
                    </td>
                    <td className="border border-slate-300 px-2 py-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                        className="max-w-full break-words font-semibold text-blue-700 underline-offset-2 hover:text-blue-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        #{order.orderNumber || order.customerOrderId}
                      </button>
                    </td>
                    <td className="border border-slate-300 px-2 py-2">
                      <div className="break-words font-medium">{order.customerName || t('unknown')}</div>
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-slate-600">
                      <div className="space-y-0.5 break-words">
                        <div>{order.customerPhone || t('unknown')}</div>
                        <div className="break-all">{order.customerEmail || t('unknown')}</div>
                      </div>
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-end">
                      <div className="break-words font-medium">
                        {formatAmount(order.totalAmount, order.currency || 'IQD')}
                      </div>
                    </td>
                    <td className="border border-slate-300 px-2 py-2">
                      {order.paymentMethod ? (
                        <PaymentMethodBadge paymentMethod={order.paymentMethod} showIcon={false} className="text-xs" />
                      ) : (
                        <span className="text-xs text-slate-500">{t('unknown')}</span>
                      )}
                    </td>
                    <td className="border border-slate-300 px-2 py-2">
                      {(() => {
                        const statusInfo = getStatusDisplay(order, t);
                        return (
                          <div className="space-y-1">
                            <div className={`inline-flex max-w-full rounded border px-2 py-1 text-xs font-medium leading-tight ${statusInfo.color}`}>
                              {statusInfo.label}
                            </div>
                            <div className="text-xs text-gray-600">
                              {statusInfo.department}
                            </div>
                            {/* Show detailed explanation for failed/problematic orders */}
                            {statusInfo.isProblematic && statusInfo.explanation && (
                               <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                                <div className="flex items-start gap-1">
                                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span className="leading-tight">{statusInfo.explanation}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-slate-600">
                      <div className="break-words">
                        {order.createdAt ? formatDate(order.createdAt, language, t('unknown')) : t('loading')}
                      </div>
                    </td>
                  </tr>
                  {selectedOrder?.id === order.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={8} className="border border-slate-300 p-3">
                        <div className="space-y-3 rounded-lg border border-blue-200 bg-white p-4 shadow-sm" dir={direction}>
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="font-semibold text-slate-900">
                              {t('orderDetails')} #{order.orderNumber || order.customerOrderId}
                            </h3>
                            <div className="flex gap-2">
                              <button onClick={handlePrintOrder} className="flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700">
                                <Printer className="h-3.5 w-3.5" /> {t('print')}
                              </button>
                              <button onClick={() => setSelectedOrder(null)} className="rounded border px-3 py-1.5 hover:bg-slate-50">
                                ×
                              </button>
                            </div>
                          </div>

                          <div className="overflow-hidden rounded-md border border-slate-300">
                            <table className="w-full table-fixed border-collapse">
                              <tbody>
                                <tr>
                                  <th className="w-[13%] border bg-slate-100 p-2 text-start">{t('name')}</th>
                                  <td className="w-[20%] border p-2">{order.customerName || t('unknown')}</td>
                                  <th className="w-[13%] border bg-slate-100 p-2 text-start">{t('phone')}</th>
                                  <td className="w-[20%] border p-2">{order.customerPhone || t('unknown')}</td>
                                  <th className="w-[13%] border bg-slate-100 p-2 text-start">{t('email')}</th>
                                  <td className="w-[21%] break-all border p-2">{order.customerEmail || t('unknown')}</td>
                                </tr>
                                <tr>
                                  <th className="border bg-slate-100 p-2 text-start">{t('totalAmount')}</th>
                                  <td className="border p-2 font-semibold">{formatAmount(order.totalAmount, order.currency)}</td>
                                  <th className="border bg-slate-100 p-2 text-start">{t('paymentMethod')}</th>
                                  <td className="border p-2">{order.paymentMethod ? <PaymentMethodBadge paymentMethod={order.paymentMethod} showIcon className="text-xs" /> : t('unknown')}</td>
                                  <th className="border bg-slate-100 p-2 text-start">{t('currentStatus')}</th>
                                  <td className="border p-2">{getStatusDisplay(order, t).label} — {getStatusDisplay(order, t).department}</td>
                                </tr>
                                <tr>
                                  <th className="border bg-slate-100 p-2 text-start">{t('deliveryCode')}</th>
                                  <td className="border p-2">{order.deliveryCode || t('notAssigned')}</td>
                                  <th className="border bg-slate-100 p-2 text-start">{t('trackingNumber')}</th>
                                  <td className="border p-2">{order.trackingNumber || t('notAssigned')}</td>
                                  <th className="border bg-slate-100 p-2 text-start">{t('deliveryPerson')}</th>
                                  <td className="border p-2">{order.deliveryPersonName || t('notAssigned')} — {order.deliveryPersonPhone || t('notAssigned')}</td>
                                </tr>
                                <tr>
                                  <th className="border bg-slate-100 p-2 text-start">{t('estimatedDelivery')}</th>
                                  <td className="border p-2">{order.estimatedDeliveryDate ? formatDate(order.estimatedDeliveryDate, language, t('unknown')) : t('notSet')}</td>
                                  <th className="border bg-slate-100 p-2 text-start">{t('actualDelivery')}</th>
                                  <td className="border p-2">{order.actualDeliveryDate ? formatDate(order.actualDeliveryDate, language, t('unknown')) : t('notDelivered')}</td>
                                  <th className="border bg-slate-100 p-2 text-start">{t('customerSubmitted')}</th>
                                  <td className="border p-2">{formatDate(order.createdAt, language, t('unknown'))}</td>
                                </tr>
                                <tr>
                                  <th className="border bg-slate-100 p-2 text-start">{t('financialNotes')}</th>
                                  <td className="border p-2">{order.financialNotes || t('noNotes')}</td>
                                  <th className="border bg-slate-100 p-2 text-start">{t('warehouseNotes')}</th>
                                  <td className="border p-2">{order.warehouseNotes || t('noNotes')}</td>
                                  <th className="border bg-slate-100 p-2 text-start">{t('logisticsNotes')}</th>
                                  <td className="border p-2">{order.logisticsNotes || t('noNotes')}</td>
                                </tr>
                                <tr>
                                  <th className="border bg-slate-100 p-2 text-start">{t('lastStatusUpdate')}</th>
                                  <td className="border p-2" colSpan={5}>{formatDate(order.updatedAt, language, t('unknown'))}</td>
                                </tr>
                                {getStatusDisplay(order, t).isProblematic && getStatusDisplay(order, t).explanation && (
                                  <tr>
                                    <th className="border bg-red-50 p-2 text-start text-red-800">{t('problemDetails')}</th>
                                    <td className="border bg-red-50 p-2 text-red-700" colSpan={5}>{getStatusDisplay(order, t).explanation}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noOrders')}</h3>
              <p className="text-gray-600">
                {searchTerm || selectedStatus !== 'all' 
                  ? t('noFilteredOrders')
                  : t('noOrdersYet')}
              </p>
            </div>
          )}

          {/* 📊 PAGINATION STATUS AND LOADING INDICATORS */}
          <div className="mt-6 space-y-4">
            {/* Loading Next Page Indicator */}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-6 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full mr-3" role="status" aria-label="loading"></div>
                <span className="text-blue-800 font-medium">{t('loadingMore')}</span>
              </div>
            )}

            {/* Pagination Status */}
            {orders.length > 0 && (
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">
                      <strong className="text-gray-900">{orders.length}</strong> {t('loadedOf')} <strong className="text-gray-900">{totalCount}</strong> {t('orders')}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min((orders.length / totalCount) * 100, 100)}%` }}
                    ></div>
                  </div>
                  
                  <span className="text-xs text-gray-500">
                    {Math.round((orders.length / totalCount) * 100)}%
                  </span>
                </div>

                {/* Manual Load More Button (as backup) */}
                {hasNextPage && !isFetchingNextPage && (
                  <button
                    onClick={() => fetchNextPage()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t('loadMore')}
                  </button>
                )}
              </div>
            )}

            {/* End of List Indicator */}
            {!hasNextPage && orders.length > 0 && !isLoading && (
              <div className="text-center py-6 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <span className="text-green-800 font-medium">
                  {t('allLoaded')} ({orders.length} {t('orders')})
                </span>
                <p className="text-sm text-green-600 mt-1">
                  {t('reloadForNew')}
                </p>
              </div>
            )}

            {/* Auto-scroll Status (only show when actively loading) */}
            {hasNextPage && orders.length > 50 && (
              <div className="text-center py-3">
                <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                  <Activity className="w-3 h-3" />
                  {t('scrollForMore')}
                </p>
              </div>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}