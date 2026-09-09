import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { User, Package, Calendar, DollarSign, ShoppingBag, LogOut, MapPin, Building, Phone, Mail, Edit, FileText, Download, Clock, AlertTriangle, PlayCircle, Trash2, History, Search, X, ShoppingCart, Plus, Upload, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import PaymentMethodBadge from "@/components/PaymentMethodBadge";
import { BankReceiptUploadModal } from "@/components/BankReceiptUploadModal";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Local profile translations ───────────────────────────────────────────────
const PROFILE_T = {
  en: {
    // countdown
    deadlineExpired: "Deadline has expired",
    deadlineExpiredWarning: "⚠️ Bank transfer deadline has expired",
    uploadToAvoidCancellation: "Upload transfer to avoid auto-cancellation",
    orderAtRiskOfCancellation: "Order is at risk of auto-cancellation",
    daysAndHoursRemaining: (d: number, h: number) => `${d} day(s) and ${h} hour(s) remaining`,
    hoursAndMinutesRemaining: (h: number, m: number) => `${h} hour(s) and ${m} minute(s) remaining`,
    minutesRemaining: (m: number) => `${m} minute(s) remaining`,
    // loading / error states
    loadingProfile: "Loading customer profile...",
    accessError: "Access Error",
    pleaseLogin: "Please log in to your account",
    backToShop: "Back to Shop",
    // toast messages
    purchaseHistoryError: "Error loading purchase history",
    logoutSuccessful: "Logout Successful",
    logoutSuccessfulDesc: "You have been logged out successfully",
    logoutError: "Error logging out",
    error: "Error",
    orderDeleted: "Order Deleted",
    orderDeletedDesc: (n: string) => `Order ${n} deleted successfully, reserved products released`,
    deleteOrderError: "Error deleting order",
    deleteOrderErrorDesc: "Could not delete the order. Please try again.",
    csvExportReady: "CSV Export Ready",
    csvExportReadyDesc: "Completed orders CSV downloaded successfully",
    csvExportFailed: "CSV Export Failed",
    csvExportErrorDesc: "Error generating CSV file",
    confirmDeleteOrder: (n: string) => `Are you sure you want to delete temporary order ${n}?\nThe order number will remain as "deleted" and reserved products will be released.`,
    // header
    welcomeGreeting: (name: string) => `Hello, ${name}!`,
    welcomeToPanel: "Welcome to your user panel",
    // account card
    accountInformation: "Account Information",
    editProfile: "Edit",
    logout: "Logout",
    // order card
    yourOrders: "Your Orders",
    ordersCount: (n: number) => `${n} order(s)`,
    allOrders: "All",
    completed: "Completed",
    pendingPayment: "Pending Payment",
    processing: "Processing",
    bankTransfer: "Bank Transfer",
    cancelled: "Cancelled",
    // abandoned carts
    abandonedCartsCount: (n: number) => `${n} abandoned cart(s)`,
    abandonedCartsTitle: (n: number) => `Abandoned Carts (${n} cart(s))`,
    abandonedCartNote: "Note:",
    abandonedCartDesc: "These items are in your cart but the purchase was not completed.",
    cartTitle: (id: number) => `Cart #${id}`,
    lastActivity: "Last activity:",
    itemsCount: (n: number) => `${n} item(s)`,
    completePurchase: "Complete Purchase",
    // orders loading
    loadingOrders: "Loading orders...",
    noOrdersYet: "You have no orders yet",
    startShoppingDesc: "Start shopping to see your order history.",
    startShopping: "Start Shopping",
    // order badge / status
    temporaryOrder: "Temporary Order",
    paymentDeadlineOrder: (d: number) => `Order with ${d}-day payment deadline`,
    specialDeadline: "Special Deadline",
    waitingForTransfer: "Waiting for bank transfer — please upload receipt",
    uploadBankTransfer: "Upload Bank Transfer",
    paymentDeadlineHours: (h: number) => `Payment deadline: ${h} hours from order time`,
    transferUploaded: "Transfer Uploaded",
    waitingFinancialReview: "Awaiting financial review",
    officialInvoice: "📄 Official Invoice",
    proformaInvoice: "📋 Proforma Invoice",
    convertedAt: "Converted on:",
    orderRejectionReason: "Order rejection reason:",
    orderCancellationReason: "Order cancellation reason:",
    orderItems: "Order Items:",
    unknownProduct: "Unknown",
    itemsSubtotal: "Items Subtotal:",
    shippingCost: "Shipping Cost:",
    vat: "VAT:",
    surcharge: "Surcharge:",
    totalAmount: "Total Amount:",
    uploadBankReceiptBtn: "Upload Bank Receipt",
    deleteTemporaryOrder: "Delete Temporary Order",
    bankTransferUnderReview: "📄 Bank transfer uploaded — under financial review",
    waitingFinancialApproval: "Please wait for financial department approval. After approval, the order will be sent to the warehouse.",
    bankTransferApproved: "✅ Bank transfer approved — order processing",
    orderUnderWarehouseProcessing: "Your order has been financially approved and is being processed in the warehouse",
    downloadOfficialInvoice: "Download Official Invoice",
    downloadProforma: "Download Proforma",
    // buttons
    viewFullPurchaseHistory: "View Full Purchase History",
    csvExportCompletedOrders: "Export Completed Orders CSV",
    // purchase history modal
    fullPurchaseHistory: "Full Purchase History",
    orderTypes: "Order Types",
    filterNote: "Bank transfer orders with 3-day deadline are shown first",
    clickToFilter: "Click to filter",
    searchOrdersPlaceholder: "Search by order number, status or product name...",
    loading: "Loading...",
    ordersFound: (found: number, total: number) => `${found} order(s) found from ${total} total`,
    totalOrdersCount: (n: number) => `${n} total order(s)`,
    clearFilters: "Clear Filters",
    noResultsFound: "No results found",
    noOrdersAvailable: "No orders available",
    orderLabel: (n: string) => `Order ${n}`,
    andMoreProducts: (n: number) => `and ${n} more product(s)...`,
    requestOfficialInvoice: "Request Official Invoice",
    // csv modal
    csvModalTitle: "Export Completed Orders CSV",
    csvDateRangeTitle: "Select date range for CSV export of completed orders",
    fromDate: "From date (optional)",
    toDate: "To date (optional)",
    csvExportNote: "💡 If no date is selected, all completed orders will be exported. The CSV file will include confirmed, delivered, or paid orders.",
    generatingCsv: "Generating CSV...",
    downloadCsv: "Download CSV",
    cancel: "Cancel",
    // status labels
    statusWaitingFinancial: "Awaiting Financial Approval",
    statusProcessingWarehouse: "Processing — Warehouse",
    statusApprovedReady: "Approved — Ready to Ship",
    statusConfirmed: "Confirmed",
    statusPending: "Pending",
    statusPaymentGrace: "Payment Grace Period",
    statusCancelled: "Cancelled",
  },
  ar: {
    deadlineExpired: "انتهى الموعد النهائي",
    deadlineExpiredWarning: "⚠️ انتهت مهلة التحويل البنكي",
    uploadToAvoidCancellation: "أرسل الحوالة لتجنب الإلغاء التلقائي",
    orderAtRiskOfCancellation: "الطلب معرض للإلغاء التلقائي",
    daysAndHoursRemaining: (d: number, h: number) => `متبقي ${d} يوم و ${h} ساعة`,
    hoursAndMinutesRemaining: (h: number, m: number) => `متبقي ${h} ساعة و ${m} دقيقة`,
    minutesRemaining: (m: number) => `متبقي ${m} دقيقة`,
    loadingProfile: "جاري تحميل الملف الشخصي...",
    accessError: "خطأ في الوصول",
    pleaseLogin: "الرجاء تسجيل الدخول إلى حسابك",
    backToShop: "العودة إلى المتجر",
    purchaseHistoryError: "خطأ في تحميل سجل المشتريات",
    logoutSuccessful: "تم تسجيل الخروج",
    logoutSuccessfulDesc: "تم تسجيل خروجك بنجاح",
    logoutError: "خطأ في تسجيل الخروج",
    error: "خطأ",
    orderDeleted: "تم حذف الطلب",
    orderDeletedDesc: (n: string) => `تم حذف الطلب ${n} بنجاح وتم تحرير المنتجات المحجوزة`,
    deleteOrderError: "خطأ في حذف الطلب",
    deleteOrderErrorDesc: "لم نتمكن من حذف الطلب. يرجى المحاولة مرة أخرى.",
    csvExportReady: "تصدير CSV جاهز",
    csvExportReadyDesc: "تم تنزيل ملف CSV للطلبات المكتملة بنجاح",
    csvExportFailed: "فشل تصدير CSV",
    csvExportErrorDesc: "خطأ في إنشاء ملف CSV",
    confirmDeleteOrder: (n: string) => `هل أنت متأكد من حذف الطلب المؤقت ${n}؟\nسيبقى رقم الطلب كـ "محذوف" وسيتم تحرير المنتجات المحجوزة.`,
    welcomeGreeting: (name: string) => `مرحباً، ${name}!`,
    welcomeToPanel: "مرحباً بك في لوحة التحكم",
    accountInformation: "معلومات الحساب",
    editProfile: "تعديل",
    logout: "تسجيل الخروج",
    yourOrders: "طلباتك",
    ordersCount: (n: number) => `${n} طلب`,
    allOrders: "الكل",
    completed: "مكتمل",
    pendingPayment: "في انتظار الدفع",
    processing: "قيد المعالجة",
    bankTransfer: "حوالة بنكية",
    cancelled: "ملغي",
    abandonedCartsCount: (n: number) => `${n} سلة مهجورة`,
    abandonedCartsTitle: (n: number) => `السلات المهجورة (${n} سلة)`,
    abandonedCartNote: "ملاحظة:",
    abandonedCartDesc: "هذه المنتجات موجودة في سلتك لكن لم تكتمل عملية الشراء.",
    cartTitle: (id: number) => `سلة #${id}`,
    lastActivity: "آخر نشاط:",
    itemsCount: (n: number) => `${n} منتج`,
    completePurchase: "إتمام الشراء",
    loadingOrders: "جاري تحميل الطلبات...",
    noOrdersYet: "ليس لديك أي طلبات بعد",
    startShoppingDesc: "ابدأ التسوق لمشاهدة سجل طلباتك.",
    startShopping: "ابدأ التسوق",
    temporaryOrder: "طلب مؤقت",
    paymentDeadlineOrder: (d: number) => `طلب بمهلة دفع ${d} أيام`,
    specialDeadline: "مهلة خاصة",
    waitingForTransfer: "في انتظار التحويل البنكي — يرجى رفع الإيصال",
    uploadBankTransfer: "رفع الحوالة البنكية",
    paymentDeadlineHours: (h: number) => `مهلة الدفع: ${h} ساعة من وقت الطلب`,
    transferUploaded: "تم رفع الحوالة",
    waitingFinancialReview: "في انتظار المراجعة المالية",
    officialInvoice: "📄 فاتورة رسمية",
    proformaInvoice: "📋 فاتورة مبدئية",
    convertedAt: "تم التحويل في:",
    orderRejectionReason: "سبب رفض الطلب:",
    orderCancellationReason: "سبب إلغاء الطلب:",
    orderItems: "عناصر الطلب:",
    unknownProduct: "غير معروف",
    itemsSubtotal: "مجموع العناصر:",
    shippingCost: "تكلفة الشحن:",
    vat: "ضريبة القيمة المضافة:",
    surcharge: "رسوم إضافية:",
    totalAmount: "المبلغ الإجمالي:",
    uploadBankReceiptBtn: "رفع الإيصال البنكي",
    deleteTemporaryOrder: "حذف الطلب المؤقت",
    bankTransferUnderReview: "📄 تم رفع الحوالة البنكية — قيد المراجعة المالية",
    waitingFinancialApproval: "يرجى انتظار موافقة القسم المالي. بعد الموافقة سيُحال الطلب للمستودع.",
    bankTransferApproved: "✅ تمت الموافقة على الحوالة — الطلب قيد المعالجة",
    orderUnderWarehouseProcessing: "تمت الموافقة المالية على طلبك وهو قيد المعالجة في المستودع",
    downloadOfficialInvoice: "تنزيل الفاتورة الرسمية",
    downloadProforma: "تنزيل الفاتورة المبدئية",
    viewFullPurchaseHistory: "عرض سجل المشتريات الكامل",
    csvExportCompletedOrders: "تصدير الطلبات المكتملة CSV",
    fullPurchaseHistory: "سجل المشتريات الكامل",
    orderTypes: "أنواع الطلبات",
    filterNote: "طلبات الحوالة البنكية لثلاثة أيام تظهر أولاً",
    clickToFilter: "انقر للتصفية",
    searchOrdersPlaceholder: "البحث برقم الطلب أو الحالة أو اسم المنتج...",
    loading: "جاري التحميل...",
    ordersFound: (found: number, total: number) => `تم العثور على ${found} طلب من أصل ${total}`,
    totalOrdersCount: (n: number) => `إجمالي ${n} طلب`,
    clearFilters: "مسح الفلاتر",
    noResultsFound: "لا توجد نتائج",
    noOrdersAvailable: "لا توجد طلبات",
    orderLabel: (n: string) => `طلب ${n}`,
    andMoreProducts: (n: number) => `و ${n} منتج آخر...`,
    requestOfficialInvoice: "طلب فاتورة رسمية",
    csvModalTitle: "تصدير الطلبات المكتملة CSV",
    csvDateRangeTitle: "اختر نطاق التاريخ لتصدير الطلبات المكتملة",
    fromDate: "من تاريخ (اختياري)",
    toDate: "إلى تاريخ (اختياري)",
    csvExportNote: "💡 إذا لم تحدد تاريخاً، سيتم تصدير جميع الطلبات المكتملة. يشمل الملف الطلبات المؤكدة والمسلمة والمدفوعة.",
    generatingCsv: "جاري إنشاء CSV...",
    downloadCsv: "تنزيل CSV",
    cancel: "إلغاء",
    statusWaitingFinancial: "في انتظار الموافقة المالية",
    statusProcessingWarehouse: "قيد المعالجة — المستودع",
    statusApprovedReady: "موافق عليه — جاهز للشحن",
    statusConfirmed: "مؤكد",
    statusPending: "معلق",
    statusPaymentGrace: "مهلة الدفع",
    statusCancelled: "ملغي",
  },
  tr: {
    deadlineExpired: "Son tarih geçti",
    deadlineExpiredWarning: "⚠️ Banka havalesi süresi doldu",
    uploadToAvoidCancellation: "Otomatik iptali önlemek için havaleyi yükleyin",
    orderAtRiskOfCancellation: "Sipariş otomatik iptal riskiyle karşı karşıya",
    daysAndHoursRemaining: (d: number, h: number) => `${d} gün ve ${h} saat kaldı`,
    hoursAndMinutesRemaining: (h: number, m: number) => `${h} saat ve ${m} dakika kaldı`,
    minutesRemaining: (m: number) => `${m} dakika kaldı`,
    loadingProfile: "Müşteri profili yükleniyor...",
    accessError: "Erişim Hatası",
    pleaseLogin: "Lütfen hesabınıza giriş yapın",
    backToShop: "Mağazaya Dön",
    purchaseHistoryError: "Satın alma geçmişi yüklenirken hata",
    logoutSuccessful: "Çıkış Başarılı",
    logoutSuccessfulDesc: "Başarıyla çıkış yaptınız",
    logoutError: "Çıkış hatası",
    error: "Hata",
    orderDeleted: "Sipariş Silindi",
    orderDeletedDesc: (n: string) => `${n} siparişi başarıyla silindi, rezerve ürünler serbest bırakıldı`,
    deleteOrderError: "Sipariş silinirken hata",
    deleteOrderErrorDesc: "Sipariş silinemedi. Lütfen tekrar deneyin.",
    csvExportReady: "CSV Dışa Aktarma Hazır",
    csvExportReadyDesc: "Tamamlanan siparişlerin CSV'si başarıyla indirildi",
    csvExportFailed: "CSV Dışa Aktarma Başarısız",
    csvExportErrorDesc: "CSV dosyası oluşturulurken hata",
    confirmDeleteOrder: (n: string) => `${n} geçici siparişini silmek istediğinizden emin misiniz?\nSipariş numarası "silindi" olarak kalacak ve rezerve ürünler serbest bırakılacak.`,
    welcomeGreeting: (name: string) => `Merhaba, ${name}!`,
    welcomeToPanel: "Kullanıcı panelinize hoş geldiniz",
    accountInformation: "Hesap Bilgileri",
    editProfile: "Düzenle",
    logout: "Çıkış Yap",
    yourOrders: "Siparişleriniz",
    ordersCount: (n: number) => `${n} sipariş`,
    allOrders: "Tümü",
    completed: "Tamamlandı",
    pendingPayment: "Ödeme Bekliyor",
    processing: "İşleniyor",
    bankTransfer: "Banka Havalesi",
    cancelled: "İptal Edildi",
    abandonedCartsCount: (n: number) => `${n} terk edilmiş sepet`,
    abandonedCartsTitle: (n: number) => `Terk Edilmiş Sepetler (${n} sepet)`,
    abandonedCartNote: "Not:",
    abandonedCartDesc: "Bu ürünler sepetinizde ancak satın alma tamamlanmadı.",
    cartTitle: (id: number) => `Sepet #${id}`,
    lastActivity: "Son aktivite:",
    itemsCount: (n: number) => `${n} ürün`,
    completePurchase: "Satın Almayı Tamamla",
    loadingOrders: "Siparişler yükleniyor...",
    noOrdersYet: "Henüz siparişiniz yok",
    startShoppingDesc: "Sipariş geçmişinizi görmek için alışverişe başlayın.",
    startShopping: "Alışverişe Başla",
    temporaryOrder: "Geçici Sipariş",
    paymentDeadlineOrder: (d: number) => `${d} günlük ödeme süreli sipariş`,
    specialDeadline: "Özel Süre",
    waitingForTransfer: "Banka havalesi bekleniyor — lütfen makbuzu yükleyin",
    uploadBankTransfer: "Banka Havalesi Yükle",
    paymentDeadlineHours: (h: number) => `Ödeme süresi: Sipariş tarihinden itibaren ${h} saat`,
    transferUploaded: "Havale Yüklendi",
    waitingFinancialReview: "Finansal inceleme bekleniyor",
    officialInvoice: "📄 Resmi Fatura",
    proformaInvoice: "📋 Proforma Fatura",
    convertedAt: "Dönüştürüldü:",
    orderRejectionReason: "Sipariş red nedeni:",
    orderCancellationReason: "Sipariş iptal nedeni:",
    orderItems: "Sipariş Kalemleri:",
    unknownProduct: "Bilinmiyor",
    itemsSubtotal: "Kalemler Toplamı:",
    shippingCost: "Kargo Ücreti:",
    vat: "KDV:",
    surcharge: "Ek Ücret:",
    totalAmount: "Toplam Tutar:",
    uploadBankReceiptBtn: "Banka Makbuzu Yükle",
    deleteTemporaryOrder: "Geçici Siparişi Sil",
    bankTransferUnderReview: "📄 Banka havalesi yüklendi — finansal inceleme altında",
    waitingFinancialApproval: "Finansal departman onayını bekleyin. Onaydan sonra sipariş depoya gönderilecek.",
    bankTransferApproved: "✅ Banka havalesi onaylandı — sipariş işleniyor",
    orderUnderWarehouseProcessing: "Siparişiniz finansal olarak onaylandı ve depoda işleniyor",
    downloadOfficialInvoice: "Resmi Fatura İndir",
    downloadProforma: "Proforma Fatura İndir",
    viewFullPurchaseHistory: "Tam Satın Alma Geçmişini Görüntüle",
    csvExportCompletedOrders: "Tamamlanan Siparişleri CSV Olarak Dışa Aktar",
    fullPurchaseHistory: "Tam Satın Alma Geçmişi",
    orderTypes: "Sipariş Türleri",
    filterNote: "3 günlük banka havaleli siparişler önce gösterilir",
    clickToFilter: "Filtrelemek için tıklayın",
    searchOrdersPlaceholder: "Sipariş numarası, durum veya ürün adına göre arayın...",
    loading: "Yükleniyor...",
    ordersFound: (found: number, total: number) => `${total} siparişten ${found} tanesi bulundu`,
    totalOrdersCount: (n: number) => `Toplam ${n} sipariş`,
    clearFilters: "Filtreleri Temizle",
    noResultsFound: "Sonuç bulunamadı",
    noOrdersAvailable: "Sipariş mevcut değil",
    orderLabel: (n: string) => `Sipariş ${n}`,
    andMoreProducts: (n: number) => `ve ${n} ürün daha...`,
    requestOfficialInvoice: "Resmi Fatura Talep Et",
    csvModalTitle: "Tamamlanan Siparişleri CSV Olarak Dışa Aktar",
    csvDateRangeTitle: "Tamamlanan siparişler için tarih aralığı seçin",
    fromDate: "Başlangıç tarihi (isteğe bağlı)",
    toDate: "Bitiş tarihi (isteğe bağlı)",
    csvExportNote: "💡 Tarih seçmezseniz, tüm tamamlanan siparişler dışa aktarılır. CSV dosyası onaylanan, teslim edilen veya ödenen siparişleri içerir.",
    generatingCsv: "CSV oluşturuluyor...",
    downloadCsv: "CSV İndir",
    cancel: "İptal",
    statusWaitingFinancial: "Finansal Onay Bekleniyor",
    statusProcessingWarehouse: "İşleniyor — Depo",
    statusApprovedReady: "Onaylandı — Gönderiye Hazır",
    statusConfirmed: "Onaylandı",
    statusPending: "Beklemede",
    statusPaymentGrace: "Ödeme Süresi",
    statusCancelled: "İptal Edildi",
  },
} as const;

type ProfileT = typeof PROFILE_T.en;

const PROFILE_T_WITH_FA = {
  ...PROFILE_T,
  fa: {
    ...PROFILE_T.en,
    deadlineExpired: "مهلت به پایان رسیده است",
    deadlineExpiredWarning: "⚠️ مهلت انتقال بانکی به پایان رسیده است",
    uploadToAvoidCancellation: "برای جلوگیری از لغو خودکار، رسید انتقال را بارگذاری کنید",
    orderAtRiskOfCancellation: "این سفارش در معرض لغو خودکار است",
    daysAndHoursRemaining: (d: number, h: number) => `${d} روز و ${h} ساعت باقی مانده`,
    hoursAndMinutesRemaining: (h: number, m: number) => `${h} ساعت و ${m} دقیقه باقی مانده`,
    minutesRemaining: (m: number) => `${m} دقیقه باقی مانده`,
    loadingProfile: "در حال بارگذاری پروفایل مشتری...",
    accessError: "خطای دسترسی",
    pleaseLogin: "لطفاً وارد حساب کاربری خود شوید",
    backToShop: "بازگشت به فروشگاه",
    purchaseHistoryError: "خطا در بارگذاری سابقه خرید",
    logoutSuccessful: "خروج موفق",
    logoutSuccessfulDesc: "با موفقیت از حساب خود خارج شدید",
    logoutError: "خطا هنگام خروج",
    error: "خطا",
    orderDeleted: "سفارش حذف شد",
    orderDeletedDesc: (n: string) => `سفارش ${n} با موفقیت حذف و موجودی رزروشده آزاد شد`,
    deleteOrderError: "خطا در حذف سفارش",
    deleteOrderErrorDesc: "سفارش حذف نشد. لطفاً دوباره تلاش کنید.",
    csvExportReady: "فایل CSV آماده است",
    csvExportReadyDesc: "فایل CSV سفارش‌های تکمیل‌شده با موفقیت دانلود شد",
    csvExportFailed: "تهیه فایل CSV ناموفق بود",
    csvExportErrorDesc: "هنگام ساخت فایل CSV خطایی رخ داد",
    confirmDeleteOrder: (n: string) => `آیا از حذف سفارش موقت ${n} مطمئن هستید؟\nشماره سفارش با وضعیت «حذف‌شده» باقی می‌ماند و کالاهای رزروشده آزاد می‌شوند.`,
    welcomeGreeting: (name: string) => `سلام ${name}!`,
    welcomeToPanel: "به پنل کاربری خود خوش آمدید",
    accountInformation: "اطلاعات حساب",
    editProfile: "ویرایش",
    logout: "خروج",
    yourOrders: "سفارش‌های شما",
    ordersCount: (n: number) => `${n} سفارش`,
    allOrders: "همه",
    completed: "تکمیل‌شده",
    pendingPayment: "در انتظار پرداخت",
    processing: "در حال پردازش",
    bankTransfer: "انتقال بانکی",
    cancelled: "لغوشده",
    abandonedCartsCount: (n: number) => `${n} سبد خرید رهاشده`,
    abandonedCartsTitle: (n: number) => `سبدهای خرید رهاشده (${n} سبد)`,
    abandonedCartNote: "توجه:",
    abandonedCartDesc: "این کالاها در سبد خرید شما هستند، اما خرید تکمیل نشده است.",
    cartTitle: (id: number) => `سبد خرید شماره ${id}`,
    lastActivity: "آخرین فعالیت:",
    itemsCount: (n: number) => `${n} کالا`,
    completePurchase: "تکمیل خرید",
    loadingOrders: "در حال بارگذاری سفارش‌ها...",
    noOrdersYet: "هنوز سفارشی ثبت نکرده‌اید",
    startShoppingDesc: "برای مشاهده سابقه سفارش‌ها، خرید خود را آغاز کنید.",
    startShopping: "شروع خرید",
    temporaryOrder: "سفارش موقت",
    paymentDeadlineOrder: (d: number) => `سفارش با مهلت پرداخت ${d} روزه`,
    specialDeadline: "مهلت ویژه",
    waitingForTransfer: "در انتظار انتقال بانکی — لطفاً رسید را بارگذاری کنید",
    uploadBankTransfer: "بارگذاری رسید انتقال بانکی",
    paymentDeadlineHours: (h: number) => `مهلت پرداخت: ${h} ساعت پس از ثبت سفارش`,
    transferUploaded: "رسید انتقال بارگذاری شد",
    waitingFinancialReview: "در انتظار بررسی واحد مالی",
    officialInvoice: "📄 فاکتور رسمی",
    proformaInvoice: "📋 پیش‌فاکتور",
    convertedAt: "تبدیل‌شده در:",
    orderRejectionReason: "دلیل رد سفارش:",
    orderCancellationReason: "دلیل لغو سفارش:",
    orderItems: "اقلام سفارش:",
    unknownProduct: "نامشخص",
    itemsSubtotal: "جمع اقلام:",
    shippingCost: "هزینه ارسال:",
    vat: "مالیات بر ارزش افزوده:",
    surcharge: "هزینه اضافی:",
    totalAmount: "مبلغ کل:",
    uploadBankReceiptBtn: "بارگذاری رسید بانکی",
    deleteTemporaryOrder: "حذف سفارش موقت",
    bankTransferUnderReview: "📄 رسید انتقال بارگذاری شد — در حال بررسی مالی",
    waitingFinancialApproval: "لطفاً منتظر تأیید واحد مالی بمانید. پس از تأیید، سفارش به انبار ارسال می‌شود.",
    bankTransferApproved: "✅ انتقال بانکی تأیید شد — سفارش در حال پردازش است",
    orderUnderWarehouseProcessing: "سفارش شما از نظر مالی تأیید شده و در انبار در حال پردازش است",
    downloadOfficialInvoice: "دانلود فاکتور رسمی",
    downloadProforma: "دانلود پیش‌فاکتور",
    viewFullPurchaseHistory: "مشاهده کامل سابقه خرید",
    csvExportCompletedOrders: "دریافت CSV سفارش‌های تکمیل‌شده",
    fullPurchaseHistory: "سابقه کامل خرید",
    orderTypes: "انواع سفارش",
    filterNote: "سفارش‌های انتقال بانکی دارای مهلت سه‌روزه ابتدا نمایش داده می‌شوند",
    clickToFilter: "برای فیلتر کلیک کنید",
    searchOrdersPlaceholder: "جستجو با شماره سفارش، وضعیت یا نام کالا...",
    loading: "در حال بارگذاری...",
    ordersFound: (found: number, total: number) => `${found} سفارش از مجموع ${total} سفارش پیدا شد`,
    totalOrdersCount: (n: number) => `مجموع ${n} سفارش`,
    clearFilters: "پاک‌کردن فیلترها",
    noResultsFound: "نتیجه‌ای پیدا نشد",
    noOrdersAvailable: "سفارشی وجود ندارد",
    orderLabel: (n: string) => `سفارش ${n}`,
    andMoreProducts: (n: number) => `و ${n} کالای دیگر...`,
    requestOfficialInvoice: "درخواست فاکتور رسمی",
    csvModalTitle: "دریافت CSV سفارش‌های تکمیل‌شده",
    csvDateRangeTitle: "بازه زمانی سفارش‌های تکمیل‌شده را انتخاب کنید",
    fromDate: "از تاریخ (اختیاری)",
    toDate: "تا تاریخ (اختیاری)",
    csvExportNote: "💡 اگر تاریخی انتخاب نشود، همه سفارش‌های تکمیل‌شده صادر می‌شوند. فایل شامل سفارش‌های تأییدشده، تحویل‌شده یا پرداخت‌شده خواهد بود.",
    generatingCsv: "در حال ساخت فایل CSV...",
    downloadCsv: "دانلود CSV",
    cancel: "انصراف",
    statusWaitingFinancial: "در انتظار تأیید مالی",
    statusProcessingWarehouse: "در حال پردازش — انبار",
    statusApprovedReady: "تأییدشده — آماده ارسال",
    statusConfirmed: "تأییدشده",
    statusPending: "در انتظار",
    statusPaymentGrace: "مهلت پرداخت",
    statusCancelled: "لغوشده",
  },
} as const;

// ─── BankTransferCountdown ─────────────────────────────────────────────────────
const BankTransferCountdown = ({
  orderDate,
  gracePeriodHours = 72,
  pt,
}: {
  orderDate: string;
  gracePeriodHours?: number;
  pt: ProfileT;
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const orderTime = new Date(orderDate).getTime();
      const expiryTime = orderTime + gracePeriodHours * 60 * 60 * 1000;
      const now = new Date().getTime();
      const timeDiff = expiryTime - now;

      if (timeDiff <= 0) {
        setIsExpired(true);
        setTimeRemaining(pt.deadlineExpired);
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(pt.daysAndHoursRemaining(days, hours));
      } else if (hours > 0) {
        setTimeRemaining(pt.hoursAndMinutesRemaining(hours, minutes));
      } else {
        setTimeRemaining(pt.minutesRemaining(minutes));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [orderDate, gracePeriodHours, pt]);

  return (
    <div className={`text-xs mt-2 p-2 rounded ${isExpired ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
      <div className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span className="font-medium">
          {isExpired ? pt.deadlineExpiredWarning : `⏰ ${timeRemaining}`}
        </span>
      </div>
      {!isExpired && (
        <p className="text-xs mt-1 text-blue-600">{pt.uploadToAvoidCancellation}</p>
      )}
      {isExpired && (
        <p className="text-xs mt-1 text-red-600">{pt.orderAtRiskOfCancellation}</p>
      )}
    </div>
  );
};

// ─── CustomerProfile ───────────────────────────────────────────────────────────
const CustomerProfile = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const pt: ProfileT = PROFILE_T_WITH_FA[language as keyof typeof PROFILE_T_WITH_FA] ?? PROFILE_T.en;

  // Purchase history modal states
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [completeHistory, setCompleteHistory] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  // Main profile filter state
  const [mainProfileFilter, setMainProfileFilter] = useState<string>("all");

  // CSV export states
  const [showCsvExport, setShowCsvExport] = useState(false);
  const [csvStartDate, setCsvStartDate] = useState("");
  const [csvEndDate, setCsvEndDate] = useState("");
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Bank receipt upload modal states
  const [showBankReceiptModal, setShowBankReceiptModal] = useState(false);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string>("");

  const { data: customerData, isLoading: customerLoading, error: customerError } = useQuery<any>({
    queryKey: ["/api/customers/me"],
    retry: 1,
  });

  const { data: orderData, isLoading: ordersLoading } = useQuery<any>({
    queryKey: ["/api/customers/orders"],
    retry: 1,
    enabled: !!customerData?.success,
  });

  const { data: abandonedCartsData, isLoading: abandonedCartsLoading } = useQuery<any>({
    queryKey: ["/api/customers/abandoned-carts"],
    retry: 1,
    enabled: !!customerData?.success,
  });

  const { data: publicShopSettings } = useQuery<any>({
    queryKey: ["/api/public/shop/settings"],
    staleTime: 5 * 60 * 1000,
  });

  const gracePeriodDays = useMemo(() => {
    if (publicShopSettings?.data?.proforma_deadline_days) {
      return parseInt(publicShopSettings.data.proforma_deadline_days) || 3;
    }
    if (publicShopSettings && Array.isArray(publicShopSettings)) {
      const setting = publicShopSettings.find((s: any) => s.setting_key === "proforma_deadline_days");
      return setting ? parseInt(setting.setting_value) : 3;
    }
    return 3;
  }, [publicShopSettings]);

  const getOrderCategory = (order: any) => {
    const status = order.status?.toLowerCase();
    const paymentStatus = order.paymentStatus?.toLowerCase();
    const paymentMethod = order.paymentMethod;
    const managementStatus = order.managementStatus?.toLowerCase();
    const hasFinancialReview = order.financialReviewedAt;

    if (status === "cancelled" || status === "financial_rejected" || status === "rejected") return "cancelled";
    if (paymentMethod === "واریز بانکی با مهلت 3 روزه" || paymentMethod === "bank_transfer_grace") return "bank_transfer";
    if (status === "confirmed" || status === "delivered" || paymentStatus === "paid") return "completed";
    if (
      (paymentMethod === "wallet_full" || paymentMethod === "wallet_partial" || paymentMethod === "wallet_combined") &&
      hasFinancialReview
    )
      return "processing";
    if (
      status === "processing" ||
      status === "shipped" ||
      status === "ready_for_delivery" ||
      managementStatus === "warehouse_pending" ||
      managementStatus === "warehouse_approved" ||
      managementStatus === "warehouse_ready"
    )
      return "processing";
    if (paymentStatus === "partial" && hasFinancialReview) return "processing";
    return "pending";
  };

  const rawOrders = orderData?.orders || [];
  const sortedOrders = rawOrders.sort((a: any, b: any) => {
    const aIs3DayBank = a.paymentMethod === "واریز بانکی با مهلت 3 روزه" || a.paymentMethod === "bank_transfer_grace";
    const bIs3DayBank = b.paymentMethod === "واریز بانکی با مهلت 3 روزه" || b.paymentMethod === "bank_transfer_grace";
    if (aIs3DayBank && !bIs3DayBank) return -1;
    if (!aIs3DayBank && bIs3DayBank) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const allOrdersForCounting = completeHistory.length > 0 ? completeHistory : sortedOrders;
  const orders = mainProfileFilter === "all" ? sortedOrders : sortedOrders.filter((order: any) => getOrderCategory(order) === mainProfileFilter);

  const totalOrders = orderData?.totalOrders || 0;
  const hiddenOrders = orderData?.hiddenOrders || 0;
  const abandonedCarts = abandonedCartsData?.carts || [];
  const abandonedCartsCount = abandonedCarts.length;

  const loadCompleteHistory = async () => {
    if (completeHistory.length > 0) return;
    setIsLoadingHistory(true);
    try {
      const response = await apiRequest("/api/customers/orders/complete-history", { method: "GET" });
      if (response.success) setCompleteHistory(response.orders || []);
    } catch (error) {
      console.error("Error loading purchase history:", error);
      toast({ variant: "destructive", title: pt.error, description: pt.purchaseHistoryError });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (customerData?.success) loadCompleteHistory();
  }, [customerData?.success]);

  let filteredHistory = completeHistory;
  if (selectedFilter !== "all") filteredHistory = filteredHistory.filter((order: any) => getOrderCategory(order) === selectedFilter);
  if (searchTerm) {
    filteredHistory = filteredHistory.filter((order: any) =>
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items?.some((item: any) => item.productName?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/customers/logout", { method: "POST", credentials: "include" });
      if (response.ok) {
        toast({ title: pt.logoutSuccessful, description: pt.logoutSuccessfulDesc });
        setLocation("/shop");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({ variant: "destructive", title: pt.error, description: pt.logoutError });
    }
  };

  const handleDeleteTemporaryOrder = async (orderId: number, orderNumber: string) => {
    if (!confirm(pt.confirmDeleteOrder(orderNumber))) return;
    try {
      const response = await apiRequest(`/api/customers/orders/${orderId}/delete-temporary`, { method: "DELETE" });
      if (response.success) {
        toast({ title: pt.orderDeleted, description: pt.orderDeletedDesc(orderNumber) });
        queryClient.invalidateQueries({ queryKey: ["/api/customers/orders"] });
      }
    } catch (error) {
      console.error("Delete order error:", error);
      toast({ variant: "destructive", title: pt.deleteOrderError, description: pt.deleteOrderErrorDesc });
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

  const handleCsvExport = async () => {
    setIsExportingCsv(true);
    try {
      const params = new URLSearchParams();
      if (csvStartDate) params.append("startDate", csvStartDate);
      if (csvEndDate) params.append("endDate", csvEndDate);

      const response = await fetch(`/api/customers/export-orders-csv?${params}`, { method: "GET", credentials: "include" });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || pt.csvExportErrorDesc);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateRange = csvStartDate && csvEndDate
        ? `${csvStartDate}_to_${csvEndDate}`
        : csvStartDate ? `from_${csvStartDate}` : `until_${csvEndDate}`;
      link.download = `completed-orders-${dateRange}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({ title: pt.csvExportReady, description: pt.csvExportReadyDesc });
      setShowCsvExport(false);
      setCsvStartDate("");
      setCsvEndDate("");
    } catch (error: any) {
      console.error("CSV export error:", error);
      toast({ variant: "destructive", title: pt.csvExportFailed, description: error.message || pt.csvExportErrorDesc });
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleOpenBankReceiptModal = (orderNumber: string) => {
    setSelectedOrderNumber(orderNumber);
    setShowBankReceiptModal(true);
  };

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/customers/orders"] });
  };

  const getStatusColor = (status: string, paymentStatus?: string) => {
    if (paymentStatus === "receipt_uploaded") return "bg-blue-100 text-blue-800";
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800";
      case "pending":
      case "payment_grace_period": return "bg-orange-100 text-orange-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string, paymentStatus?: string, order?: any) => {
    if (paymentStatus === "receipt_uploaded") return pt.statusWaitingFinancial;
    const paymentMethod = order?.paymentMethod;
    const managementStatus = order?.managementStatus?.toLowerCase();
    const hasFinancialReview = order?.financialReviewedAt;

    if ((paymentMethod === "wallet_full" || paymentMethod === "wallet_partial" || paymentMethod === "wallet_combined") && hasFinancialReview) {
      if (managementStatus === "warehouse_pending") return pt.statusProcessingWarehouse;
      if (managementStatus === "warehouse_approved") return pt.statusApprovedReady;
    }
    if (paymentStatus === "partial" && hasFinancialReview) {
      if (managementStatus === "warehouse_pending") return pt.statusProcessingWarehouse;
    }
    switch (status) {
      case "confirmed": return pt.statusConfirmed;
      case "pending": return pt.statusPending;
      case "payment_grace_period": return pt.statusPaymentGrace;
      case "cancelled": return pt.statusCancelled;
      default: return status;
    }
  };

  // ── Loading / Error states ──
  if (customerLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{pt.loadingProfile}</p>
        </div>
      </div>
    );
  }

  if (customerError || !customerData?.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{pt.accessError}</h2>
            <p className="text-gray-600 mb-4">{pt.pleaseLogin}</p>
            <Button onClick={() => setLocation("/shop")} className="w-full">
              {pt.backToShop}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {pt.welcomeGreeting(customerData?.customer?.firstName || "")}
            </h1>
            <p className="text-gray-600">{pt.welcomeToPanel}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Info */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {pt.accountInformation}
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLocation("/customer/profile/edit")}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                    >
                      <Edit className="w-4 h-4" />
                      {pt.editProfile}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium">
                        {customerData.customer.firstName} {customerData.customer.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{customerData.customer.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{customerData.customer.phone}</span>
                    </div>
                    {customerData.customer.company && (
                      <div className="flex items-center gap-3">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{customerData.customer.company}</span>
                      </div>
                    )}
                    {customerData.customer.address && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{customerData.customer.address}</span>
                      </div>
                    )}
                    {(customerData.customer.city || customerData.customer.province) && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          {customerData.customer.city && customerData.customer.province
                            ? `${customerData.customer.city}, ${customerData.customer.province}`
                            : customerData.customer.city || customerData.customer.province}
                        </span>
                      </div>
                    )}
                  </div>
                  <Separator />
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {pt.logout}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Orders */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex flex-col gap-3">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      {pt.yourOrders}
                      {orders.length > 0 && (
                        <Badge variant="secondary">{pt.ordersCount(orders.length)}</Badge>
                      )}
                    </CardTitle>

                    {/* Order Status Indicators */}
                    {(orders.length > 0 || completeHistory.length > 0) && (
                      <div className="flex items-center gap-3 text-xs">
                        {(() => {
                          const statusCounts = allOrdersForCounting.reduce((acc: any, order: any) => {
                            const category = getOrderCategory(order);
                            acc[category] = (acc[category] || 0) + 1;
                            return acc;
                          }, {});

                          return (
                            <>
                              <button
                                onClick={() => setMainProfileFilter("all")}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all cursor-pointer ${
                                  mainProfileFilter === "all"
                                    ? "bg-purple-100 border-purple-300 shadow-md"
                                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                }`}
                              >
                                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                <span className={`font-medium ${mainProfileFilter === "all" ? "text-purple-700" : "text-gray-700"}`}>
                                  {allOrdersForCounting.length} {pt.allOrders}
                                </span>
                              </button>

                              {statusCounts.completed > 0 && (
                                <button
                                  onClick={() => setMainProfileFilter("completed")}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all cursor-pointer ${
                                    mainProfileFilter === "completed"
                                      ? "bg-green-100 border-green-300 shadow-md"
                                      : "bg-green-50 border-green-200 hover:bg-green-100"
                                  }`}
                                >
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className={`font-medium ${mainProfileFilter === "completed" ? "text-green-800" : "text-green-700"}`}>
                                    {statusCounts.completed} {pt.completed}
                                  </span>
                                </button>
                              )}

                              {statusCounts.pending > 0 && (
                                <button
                                  onClick={() => setMainProfileFilter("pending")}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all cursor-pointer ${
                                    mainProfileFilter === "pending"
                                      ? "bg-yellow-100 border-yellow-300 shadow-md"
                                      : "bg-yellow-50 border-yellow-200 hover:bg-yellow-100"
                                  }`}
                                >
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                  <span className={`font-medium ${mainProfileFilter === "pending" ? "text-yellow-800" : "text-yellow-700"}`}>
                                    {statusCounts.pending} {pt.pendingPayment}
                                  </span>
                                </button>
                              )}

                              {statusCounts.processing > 0 && (
                                <button
                                  onClick={() => setMainProfileFilter("processing")}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all cursor-pointer ${
                                    mainProfileFilter === "processing"
                                      ? "bg-blue-100 border-blue-300 shadow-md"
                                      : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                                  }`}
                                >
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span className={`font-medium ${mainProfileFilter === "processing" ? "text-blue-800" : "text-blue-700"}`}>
                                    {statusCounts.processing} {pt.processing}
                                  </span>
                                </button>
                              )}

                              {statusCounts.bank_transfer > 0 && (
                                <button
                                  onClick={() => setMainProfileFilter("bank_transfer")}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all cursor-pointer ${
                                    mainProfileFilter === "bank_transfer"
                                      ? "bg-orange-100 border-orange-300 shadow-md"
                                      : "bg-orange-50 border-orange-200 hover:bg-orange-100"
                                  }`}
                                >
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                  <span className={`font-medium ${mainProfileFilter === "bank_transfer" ? "text-orange-800" : "text-orange-700"}`}>
                                    {statusCounts.bank_transfer} {pt.bankTransfer}
                                  </span>
                                </button>
                              )}

                              {statusCounts.cancelled > 0 && (
                                <button
                                  onClick={() => setMainProfileFilter("cancelled")}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all cursor-pointer ${
                                    mainProfileFilter === "cancelled"
                                      ? "bg-red-100 border-red-300 shadow-md"
                                      : "bg-red-50 border-red-200 hover:bg-red-100"
                                  }`}
                                >
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span className={`font-medium ${mainProfileFilter === "cancelled" ? "text-red-800" : "text-red-700"}`}>
                                    {statusCounts.cancelled} {pt.cancelled}
                                  </span>
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {abandonedCartsCount > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="flex items-center gap-3 bg-gradient-to-r from-rose-100 to-pink-100 text-rose-800 px-4 py-2 rounded-lg hover:from-rose-200 hover:to-pink-200 transition-all duration-200 border-2 border-rose-300 shadow-md hover:shadow-lg transform hover:scale-105">
                            <ShoppingCart className="w-5 h-5 text-rose-600" />
                            <span className="text-sm font-bold">{pt.abandonedCartsCount(abandonedCartsCount)}</span>
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <ShoppingCart className="w-5 h-5 text-orange-600" />
                              {pt.abandonedCartsTitle(abandonedCartsCount)}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                              <p className="text-orange-800 text-sm">
                                <strong>{pt.abandonedCartNote}</strong> {pt.abandonedCartDesc}
                              </p>
                            </div>

                            {abandonedCarts.map((cart: any) => (
                              <Card key={cart.id} className="border-orange-200">
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <h3 className="font-semibold text-gray-900">{pt.cartTitle(cart.id)}</h3>
                                      <p className="text-sm text-gray-600">
                                        {pt.lastActivity} {formatDate(cart.lastActivity)}
                                      </p>
                                    </div>
                                    <div className="text-left">
                                      <p className="text-lg font-bold text-orange-600">
                                        ${parseFloat(cart.totalValue || 0).toFixed(2)}
                                      </p>
                                      <Badge className="bg-orange-100 text-orange-800">
                                        {pt.itemsCount(cart.itemCount)}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="mt-3 pt-3 border-t border-orange-200 flex gap-2">
                                    <Button size="sm" onClick={() => setLocation("/shop")} className="bg-green-600 hover:bg-green-700">
                                      <ShoppingCart className="w-4 h-4 mr-2" />
                                      {pt.completePurchase}
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  {ordersLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">{pt.loadingOrders}</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">{pt.noOrdersYet}</h3>
                      <p className="text-gray-500 mb-6">{pt.startShoppingDesc}</p>
                      <Button onClick={() => setLocation("/shop")}>{pt.startShopping}</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order: any) => {
                        const is3DayBankTransfer =
                          order.paymentMethod === "واریز بانکی با مهلت 3 روزه" ||
                          order.paymentMethod === "bank_transfer_grace";

                        return (
                          <div
                            key={order.id}
                            className={`border rounded-lg p-4 ${
                              is3DayBankTransfer
                                ? "border-orange-300 bg-orange-50"
                                : order.status === "pending" || order.status === "payment_grace_period"
                                ? "border-amber-200 bg-amber-50"
                                : ""
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-gray-900">{order.orderNumber}</h4>
                                  {(order.status === "pending" || order.status === "payment_grace_period") && (
                                    <Badge className="bg-orange-100 text-orange-800">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {pt.temporaryOrder}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(order.createdAt)}
                                </p>

                                {is3DayBankTransfer && (order.status === "pending" || order.status === "payment_grace_period") && (
                                  <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 mt-2 text-right">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-sm text-orange-900 font-bold flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        {pt.paymentDeadlineOrder(gracePeriodDays)}
                                      </p>
                                      <Badge className="bg-orange-200 text-orange-800 text-xs">{pt.specialDeadline}</Badge>
                                    </div>

                                    {!order.receiptPath ? (
                                      <>
                                        <p className="text-xs text-orange-800 mb-2">{pt.waitingForTransfer}</p>
                                        <div className="flex items-center gap-2 mb-2">
                                          <Button
                                            size="sm"
                                            className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
                                            onClick={() => handleOpenBankReceiptModal(order.orderNumber)}
                                          >
                                            <Upload className="w-3 h-3 mr-1" />
                                            {pt.uploadBankTransfer}
                                          </Button>
                                          <span className="text-xs text-orange-700">
                                            {pt.paymentDeadlineHours(gracePeriodDays * 24)}
                                          </span>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="flex items-center gap-2 mb-2">
                                        <Badge className="bg-green-100 text-green-800 text-xs">{pt.transferUploaded}</Badge>
                                        <span className="text-xs text-orange-700">{pt.waitingFinancialReview}</span>
                                      </div>
                                    )}

                                    <div className="mt-2">
                                      <BankTransferCountdown
                                        orderDate={order.createdAt}
                                        gracePeriodHours={gracePeriodDays * 24}
                                        pt={pt}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="text-right">
                                {(() => {
                                  const subtotalAmount = order.items
                                    ? order.items.reduce((sum: number, item: any) => sum + parseFloat(item.totalPrice || 0), 0)
                                    : 0;
                                  const vatAmount = parseFloat(order.vatAmount || "0");
                                  const shippingCost = parseFloat(order.shippingCost || "0");
                                  const surchargeAmount = parseFloat(order.surchargeAmount || "0");
                                  const correctTotal = subtotalAmount + vatAmount + shippingCost + surchargeAmount;
                                  return (
                                    <p className="font-semibold text-lg">{Math.floor(correctTotal)} {order.currency || "IQD"}</p>
                                  );
                                })()}
                                <Badge className={getStatusColor(order.status, order.paymentStatus)}>
                                  {getStatusLabel(order.status, order.paymentStatus, order)}
                                </Badge>

                                {order.invoiceType && (
                                  <div className="mt-2">
                                    <Badge
                                      className={
                                        order.invoiceType === "official_invoice"
                                          ? "bg-green-100 text-green-800 border-green-200"
                                          : "bg-blue-100 text-blue-800 border-blue-200"
                                      }
                                    >
                                      {order.invoiceType === "official_invoice" ? pt.officialInvoice : pt.proformaInvoice}
                                    </Badge>
                                    {order.invoiceType === "official_invoice" && order.invoiceConvertedAt && (
                                      <p className="text-xs text-green-600 mt-1">
                                        {pt.convertedAt} {new Date(order.invoiceConvertedAt).toLocaleDateString("en-US")}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {(order.status === "financial_rejected" || order.status === "rejected") && order.financialNotes && (
                                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <h6 className="text-sm font-medium text-red-800 mb-1">{pt.orderRejectionReason}</h6>
                                        <p className="text-sm text-red-700">{order.financialNotes}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {order.items && order.items.length > 0 && (
                              <div>
                                <Separator className="mb-3" />
                                <div className="space-y-2">
                                  <h5 className="font-medium text-gray-700">{pt.orderItems}</h5>
                                  {order.items.map((item: any, index: number) => {
                                    const productName = item.productName || pt.unknownProduct;
                                    const quantity = parseFloat(item.quantity || 0);
                                    const totalPrice = parseFloat(item.totalPrice || 0);
                                    return (
                                      <div key={item.id || index} className="flex justify-between text-sm">
                                        <span>{productName} × {Math.floor(quantity)}</span>
                                        <span>{Math.floor(totalPrice)} IQD</span>
                                      </div>
                                    );
                                  })}

                                  <div className="mt-3 pt-2 border-t border-gray-200 space-y-1">
                                    {(() => {
                                      const totalAmount = parseFloat(order.totalAmount || "0");
                                      const vatAmount = parseFloat(order.vatAmount || "0");
                                      const shippingCost = parseFloat(order.shippingCost || "0");
                                      const surchargeAmount = parseFloat(order.surchargeAmount || "0");
                                      const subtotalAmount = order.items
                                        ? order.items.reduce((sum: number, item: any) => sum + parseFloat(item.totalPrice || 0), 0)
                                        : 0;
                                      return (
                                        <>
                                          {subtotalAmount > 0 && (
                                            <div className="flex justify-between text-sm text-gray-600">
                                              <span>{pt.itemsSubtotal}</span>
                                              <span>{Math.floor(subtotalAmount)} IQD</span>
                                            </div>
                                          )}
                                          {shippingCost > 0 && (
                                            <div className="flex justify-between text-sm text-blue-700">
                                              <span>{pt.shippingCost}</span>
                                              <span>{Math.floor(shippingCost)} IQD</span>
                                            </div>
                                          )}
                                          {vatAmount > 0 && (
                                            <div className="flex justify-between text-sm text-green-700 font-medium">
                                              <span>{pt.vat}</span>
                                              <span>{Math.floor(vatAmount)} IQD</span>
                                            </div>
                                          )}
                                          {surchargeAmount > 0 && (
                                            <div className="flex justify-between text-sm text-orange-700">
                                              <span>{pt.surcharge}</span>
                                              <span>{Math.floor(surchargeAmount)} IQD</span>
                                            </div>
                                          )}
                                          <div className="border-t border-gray-300 my-2"></div>
                                          <div className="flex justify-between text-sm font-bold text-gray-800">
                                            <span>{pt.totalAmount}</span>
                                            <span>{Math.floor(totalAmount)} IQD</span>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="mt-4 pt-3 border-t border-gray-200 flex gap-2 flex-wrap">
                              {(order.status === "pending" || order.status === "payment_grace_period") &&
                                (order.paymentMethod === "واریز بانکی با مهلت 3 روزه" || order.paymentMethod === "bank_transfer_grace") &&
                                !order.receiptPath && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleOpenBankReceiptModal(order.orderNumber)}
                                      className="bg-orange-600 hover:bg-orange-700 text-white"
                                    >
                                      <Upload className="w-4 h-4 mr-2" />
                                      {pt.uploadBankReceiptBtn}
                                    </Button>
                                    {(!order.paymentStatus || order.paymentStatus === "pending" || order.paymentStatus === "unpaid") && (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDeleteTemporaryOrder(order.id, order.orderNumber)}
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        {pt.deleteTemporaryOrder}
                                      </Button>
                                    )}
                                  </>
                                )}

                              {(order.paymentMethod === "واریز بانکی با مهلت 3 روزه" || order.paymentMethod === "bank_transfer_grace") &&
                                order.receiptPath && (
                                  <>
                                    {(order.status === "payment_uploaded" || order.status === "pending" || order.status === "payment_grace_period") && (
                                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <p className="text-sm text-blue-800 font-medium flex items-center gap-1">
                                          <Clock className="w-4 h-4" />
                                          {pt.bankTransferUnderReview}
                                        </p>
                                        <p className="text-xs text-blue-700 mt-1">{pt.waitingFinancialApproval}</p>
                                      </div>
                                    )}
                                    {order.status === "confirmed" && (
                                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                        <p className="text-sm text-green-800 font-medium flex items-center gap-1">
                                          <AlertCircle className="w-4 h-4" />
                                          {pt.bankTransferApproved}
                                        </p>
                                        <p className="text-xs text-green-700 mt-1">{pt.orderUnderWarehouseProcessing}</p>
                                      </div>
                                    )}
                                  </>
                                )}

                              {order.status !== "cancelled" &&
                                order.status !== "financial_rejected" &&
                                order.status !== "rejected" &&
                                (order.invoiceType === "official_invoice" ? (
                                  <Button
                                    size="sm"
                                    onClick={() => window.open(`/download-invoice/${order.id}?lang=${encodeURIComponent(language)}`, "_blank")}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    {pt.downloadOfficialInvoice}
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => window.open(`/download-proforma-invoice/${order.id}?lang=${encodeURIComponent(language)}`, "_blank")}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    {pt.downloadProforma}
                                  </Button>
                                ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Purchase History and CSV Export Buttons */}
              {orders && orders.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Button
                    onClick={() => { setShowPurchaseHistory(true); loadCompleteHistory(); }}
                    variant="outline"
                    className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    {pt.viewFullPurchaseHistory}
                  </Button>

                  <Button
                    onClick={() => setShowCsvExport(true)}
                    variant="outline"
                    className="w-full border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {pt.csvExportCompletedOrders}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Purchase History Modal */}
      <Dialog open={showPurchaseHistory} onOpenChange={setShowPurchaseHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-purple-700">{pt.fullPurchaseHistory}</DialogTitle>
          </DialogHeader>

          {/* Order Types Header with Filters */}
          <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <h3 className="text-lg font-semibold text-purple-800 mb-3 text-center">{pt.orderTypes}</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <button
                onClick={() => setSelectedFilter("all")}
                className={`flex items-center gap-2 p-2 rounded-md shadow-sm transition-all cursor-pointer ${
                  selectedFilter === "all"
                    ? "bg-purple-100 border-2 border-purple-400 shadow-md"
                    : "bg-white hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span className={selectedFilter === "all" ? "text-purple-800 font-medium" : "text-gray-700"}>{pt.allOrders}</span>
              </button>

              <button
                onClick={() => setSelectedFilter("completed")}
                className={`flex items-center gap-2 p-2 rounded-md shadow-sm transition-all cursor-pointer ${
                  selectedFilter === "completed"
                    ? "bg-green-100 border-2 border-green-400 shadow-md"
                    : "bg-white hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className={selectedFilter === "completed" ? "text-green-800 font-medium" : "text-gray-700"}>{pt.completed}</span>
              </button>

              <button
                onClick={() => setSelectedFilter("pending")}
                className={`flex items-center gap-2 p-2 rounded-md shadow-sm transition-all cursor-pointer ${
                  selectedFilter === "pending"
                    ? "bg-yellow-100 border-2 border-yellow-400 shadow-md"
                    : "bg-white hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className={selectedFilter === "pending" ? "text-yellow-800 font-medium" : "text-gray-700"}>{pt.pendingPayment}</span>
              </button>

              <button
                onClick={() => setSelectedFilter("processing")}
                className={`flex items-center gap-2 p-2 rounded-md shadow-sm transition-all cursor-pointer ${
                  selectedFilter === "processing"
                    ? "bg-blue-100 border-2 border-blue-400 shadow-md"
                    : "bg-white hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className={selectedFilter === "processing" ? "text-blue-800 font-medium" : "text-gray-700"}>{pt.processing}</span>
              </button>

              <button
                onClick={() => setSelectedFilter("bank_transfer")}
                className={`flex items-center gap-2 p-2 rounded-md shadow-sm transition-all cursor-pointer ${
                  selectedFilter === "bank_transfer"
                    ? "bg-orange-100 border-2 border-orange-400 shadow-md"
                    : "bg-white hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className={selectedFilter === "bank_transfer" ? "text-orange-800 font-medium" : "text-gray-700"}>{pt.bankTransfer}</span>
              </button>
            </div>
            <div className="mt-3 text-xs text-purple-600 text-center">
              {pt.filterNote} • {pt.clickToFilter}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder={pt.searchOrdersPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4"
            />
            {searchTerm && (
              <Button size="sm" variant="ghost" onClick={() => setSearchTerm("")} className="absolute right-2 top-2 h-6 w-6 p-0">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Loading State */}
          {isLoadingHistory && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="mr-3">{pt.loading}</span>
            </div>
          )}

          {/* Results Count */}
          {!isLoadingHistory && (
            <div className="mb-4 text-sm text-gray-600 flex justify-between items-center">
              <span>
                {searchTerm || selectedFilter !== "all"
                  ? pt.ordersFound(filteredHistory.length, completeHistory.length)
                  : pt.totalOrdersCount(completeHistory.length)}
              </span>
              {(searchTerm || selectedFilter !== "all") && (
                <button
                  onClick={() => { setSearchTerm(""); setSelectedFilter("all"); }}
                  className="text-xs text-purple-600 hover:text-purple-800 underline"
                >
                  {pt.clearFilters}
                </button>
              )}
            </div>
          )}

          {/* Orders List */}
          <div
            className="space-y-4 max-h-96 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-purple-300 rounded-lg p-1"
            tabIndex={0}
            role="list"
          >
            {filteredHistory.length === 0 && !isLoadingHistory && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? pt.noResultsFound : pt.noOrdersAvailable}
              </div>
            )}

            {filteredHistory.map((order: any) => (
              <Card key={order.id} className="border-purple-200 hover:border-purple-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{pt.orderLabel(order.orderNumber)}</h4>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      {(() => {
                        const subtotalAmount = order.items
                          ? order.items.reduce((sum: number, item: any) => sum + parseFloat(item.totalPrice || 0), 0)
                          : 0;
                        const vatAmount = parseFloat(order.vatAmount || "0");
                        const shippingCost = parseFloat(order.shippingCost || "0");
                        const surchargeAmount = parseFloat(order.surchargeAmount || "0");
                        const correctTotal = subtotalAmount + vatAmount + shippingCost + surchargeAmount;
                        return <p className="font-semibold text-lg">{Math.floor(correctTotal)} IQD</p>;
                      })()}
                      <Badge className={getStatusColor(order.status, order.paymentStatus)}>
                        {getStatusLabel(order.status, order.paymentStatus, order)}
                      </Badge>

                      {order.invoiceType && (
                        <div className="mt-1">
                          <Badge
                            className={
                              order.invoiceType === "official_invoice"
                                ? "bg-green-100 text-green-800 border-green-200 text-xs"
                                : "bg-blue-100 text-blue-800 border-blue-200 text-xs"
                            }
                          >
                            {order.invoiceType === "official_invoice" ? pt.officialInvoice : pt.proformaInvoice}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {(order.status === "financial_rejected" || order.status === "rejected" || order.status === "cancelled") &&
                    (order.financialNotes || order.rejectionReason) && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h6 className="text-sm font-medium text-red-800 mb-1">
                              {order.status === "cancelled" ? pt.orderCancellationReason : pt.orderRejectionReason}
                            </h6>
                            <p className="text-sm text-red-700">{order.rejectionReason || order.financialNotes}</p>
                          </div>
                        </div>
                      </div>
                    )}

                  {order.items && order.items.length > 0 && (
                    <div className="mb-3">
                      <Separator className="mb-2" />
                      <h5 className="text-sm font-medium text-gray-700 mb-2">{pt.orderItems}</h5>
                      {order.items.slice(0, 3).map((item: any, index: number) => (
                        <div key={item.id || index} className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>{item.productName || pt.unknownProduct} × {Math.floor(parseFloat(item.quantity || 0))}</span>
                          <span>{Math.floor(parseFloat(item.totalPrice || 0))} IQD</span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-sm text-gray-500">{pt.andMoreProducts(order.items.length - 3)}</p>
                      )}
                    </div>
                  )}

                  {/* Cost Breakdown */}
                  <div className="mb-3 p-2 bg-gray-50 rounded text-sm space-y-1">
                    {(() => {
                      const subtotalAmount = order.items
                        ? order.items.reduce((sum: number, item: any) => sum + parseFloat(item.totalPrice || 0), 0)
                        : 0;
                      const vatAmount = parseFloat(order.vatAmount || "0");
                      const shippingCost = parseFloat(order.shippingCost || "0");
                      const surchargeAmount = parseFloat(order.surchargeAmount || "0");
                      return (
                        <>
                          {subtotalAmount > 0 && (
                            <div className="flex justify-between">
                              <span>{pt.itemsSubtotal}</span>
                              <span>{Math.floor(subtotalAmount)} IQD</span>
                            </div>
                          )}
                          {shippingCost > 0 && (
                            <div className="flex justify-between text-blue-700">
                              <span>{pt.shippingCost}</span>
                              <span>{Math.floor(shippingCost)} IQD</span>
                            </div>
                          )}
                          {vatAmount > 0 && (
                            <div className="flex justify-between text-green-700">
                              <span>{pt.vat}</span>
                              <span>{Math.floor(vatAmount)} IQD</span>
                            </div>
                          )}
                          {surchargeAmount > 0 && (
                            <div className="flex justify-between text-orange-700">
                              <span>{pt.surcharge}</span>
                              <span>{Math.floor(surchargeAmount)} IQD</span>
                            </div>
                          )}
                          <Separator className="my-1" />
                          <div className="flex justify-between font-bold">
                            <span>{pt.totalAmount}</span>
                            <span>{Math.floor(subtotalAmount + vatAmount + shippingCost + surchargeAmount)} IQD</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {(order.status === "pending" || order.status === "payment_grace_period") &&
                      (!order.paymentStatus || order.paymentStatus === "pending" || order.paymentStatus === "unpaid") &&
                      !order.receiptPath && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteTemporaryOrder(order.id, order.orderNumber)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {pt.deleteTemporaryOrder}
                        </Button>
                      )}

                    {order.status !== "cancelled" &&
                      order.status !== "financial_rejected" &&
                      order.status !== "rejected" &&
                      (order.invoiceType === "official_invoice" ? (
                        <Button
                          size="sm"
                          onClick={() => window.open(`/download-invoice/${order.id}?lang=${encodeURIComponent(language)}`, "_blank")}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          {pt.downloadOfficialInvoice}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => window.open(`/download-proforma-invoice/${order.id}?lang=${encodeURIComponent(language)}`, "_blank")}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          {pt.downloadProforma}
                        </Button>
                      ))}

                    {order.paymentStatus === "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          window.open(
                            `mailto:info@momtazchem.com?subject=Official Invoice Request - Order ${order.orderNumber}&body=Hello, please send the official invoice for order ${order.orderNumber}.`,
                            "_blank"
                          );
                        }}
                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {pt.requestOfficialInvoice}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Export Modal */}
      <Dialog open={showCsvExport} onOpenChange={setShowCsvExport}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-700 flex items-center gap-2">
              <Download className="w-5 h-5" />
              {pt.csvModalTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">{pt.csvDateRangeTitle}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{pt.fromDate}</label>
                <Input type="date" value={csvStartDate} onChange={(e) => setCsvStartDate(e.target.value)} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{pt.toDate}</label>
                <Input type="date" value={csvEndDate} onChange={(e) => setCsvEndDate(e.target.value)} className="w-full" />
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700">{pt.csvExportNote}</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleCsvExport} disabled={isExportingCsv} className="flex-1 bg-green-600 hover:bg-green-700">
                {isExportingCsv ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {pt.generatingCsv}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {pt.downloadCsv}
                  </>
                )}
              </Button>

              <Button
                onClick={() => { setShowCsvExport(false); setCsvStartDate(""); setCsvEndDate(""); }}
                variant="outline"
                disabled={isExportingCsv}
              >
                {pt.cancel}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank Receipt Upload Modal */}
      <BankReceiptUploadModal
        open={showBankReceiptModal}
        onOpenChange={setShowBankReceiptModal}
        orderNumber={selectedOrderNumber}
        onSuccess={handleModalSuccess}
      />
    </>
  );
};

export default CustomerProfile;
