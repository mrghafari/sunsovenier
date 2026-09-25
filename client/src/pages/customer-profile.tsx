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
import AddressSelector from "@/components/checkout/address-selector";
import { BankReceiptUploadModal } from "@/components/BankReceiptUploadModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { getOrderStatusLabel, resolveOrderStatus, type OrderStatusLanguage } from "@shared/order-status";
import DatePickerModule, { type DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persianFa from "react-date-object/locales/persian_fa";
import "react-multi-date-picker/styles/layouts/mobile.css";

const PersianDatePicker = (
  (DatePickerModule as any).default ?? DatePickerModule
) as React.ComponentType<any>;

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
    paymentDeadlineHours: (h: number) => `Payment deadline: ${h} hours from order time`,
    transferUploaded: "Transfer Uploaded",
    waitingFinancialReview: "Awaiting financial review",
    officialInvoice: "📄 Official Invoice",
    proformaInvoice: "📋 Proforma Invoice",
    convertedAt: "Converted on:",
    orderRejectionReason: "Order rejection reason:",
    orderCancellationReason: "Order cancellation reason:",
    orderItems: "Order Items:",
    quantity: "Quantity",
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
    downloadOfficialInvoice: "Official Invoice",
    downloadProforma: "Proforma Invoice",
    invoice: "Invoice",
    bankDocuments: "Bank documents",
    viewBankReceipt: "View receipt",
    status: "Status",
    details: "Details",
    // buttons
    viewFullPurchaseHistory: "View Full Purchase History",
    viewRecentOrders: "View Recent Orders",
    productFilter: "Product",
    allProducts: "All products",
    sortBy: "Sort by",
    sortDate: "Date",
    sortOrderNumber: "Order number",
    sortStatus: "Status",
    sortItemCount: "Item count",
    sortTotal: "Total amount",
    ascending: "Ascending",
    descending: "Descending",
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
    paymentDeadlineHours: (h: number) => `مهلة الدفع: ${h} ساعة من وقت الطلب`,
    transferUploaded: "تم رفع الحوالة",
    waitingFinancialReview: "في انتظار المراجعة المالية",
    officialInvoice: "📄 فاتورة رسمية",
    proformaInvoice: "📋 فاتورة مبدئية",
    convertedAt: "تم التحويل في:",
    orderRejectionReason: "سبب رفض الطلب:",
    orderCancellationReason: "سبب إلغاء الطلب:",
    orderItems: "عناصر الطلب:",
    quantity: "الكمية",
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
    downloadOfficialInvoice: "الفاتورة الرسمية",
    downloadProforma: "الفاتورة المبدئية",
    invoice: "الفاتورة",
    bankDocuments: "المستندات البنكية",
    viewBankReceipt: "عرض الإيصال",
    status: "الحالة",
    details: "التفاصيل",
    viewFullPurchaseHistory: "عرض سجل المشتريات الكامل",
    viewRecentOrders: "عرض الطلبات الأخيرة",
    productFilter: "المنتج",
    allProducts: "كل المنتجات",
    sortBy: "ترتيب حسب",
    sortDate: "التاريخ",
    sortOrderNumber: "رقم الطلب",
    sortStatus: "الحالة",
    sortItemCount: "عدد العناصر",
    sortTotal: "المبلغ الإجمالي",
    ascending: "تصاعدي",
    descending: "تنازلي",
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
    paymentDeadlineHours: (h: number) => `Ödeme süresi: Sipariş tarihinden itibaren ${h} saat`,
    transferUploaded: "Havale Yüklendi",
    waitingFinancialReview: "Finansal inceleme bekleniyor",
    officialInvoice: "📄 Resmi Fatura",
    proformaInvoice: "📋 Proforma Fatura",
    convertedAt: "Dönüştürüldü:",
    orderRejectionReason: "Sipariş red nedeni:",
    orderCancellationReason: "Sipariş iptal nedeni:",
    orderItems: "Sipariş Kalemleri:",
    quantity: "Miktar",
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
    downloadOfficialInvoice: "Resmi Fatura",
    downloadProforma: "Proforma Fatura",
    invoice: "Fatura",
    bankDocuments: "Banka belgeleri",
    viewBankReceipt: "Dekontu görüntüle",
    status: "Durum",
    details: "Detaylar",
    viewFullPurchaseHistory: "Tam Satın Alma Geçmişini Görüntüle",
    viewRecentOrders: "Son Siparişleri Görüntüle",
    productFilter: "Ürün",
    allProducts: "Tüm ürünler",
    sortBy: "Sıralama",
    sortDate: "Tarih",
    sortOrderNumber: "Sipariş numarası",
    sortStatus: "Durum",
    sortItemCount: "Ürün sayısı",
    sortTotal: "Toplam tutar",
    ascending: "Artan",
    descending: "Azalan",
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
    paymentDeadlineHours: (h: number) => `مهلت پرداخت: ${h} ساعت پس از ثبت سفارش`,
    transferUploaded: "رسید انتقال بارگذاری شد",
    waitingFinancialReview: "در انتظار بررسی واحد مالی",
    officialInvoice: "📄 فاکتور رسمی",
    proformaInvoice: "📋 پیش‌فاکتور",
    convertedAt: "تبدیل‌شده در:",
    orderRejectionReason: "دلیل رد سفارش:",
    orderCancellationReason: "دلیل لغو سفارش:",
    orderItems: "اقلام سفارش:",
    quantity: "تعداد",
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
    downloadOfficialInvoice: "فاکتور رسمی",
    downloadProforma: "پیش‌فاکتور",
    invoice: "فاکتور",
    bankDocuments: "مدارک بانکی",
    viewBankReceipt: "مشاهده فیش",
    status: "وضعیت",
    details: "جزئیات",
    viewFullPurchaseHistory: "مشاهده کامل سابقه خرید",
    viewRecentOrders: "مشاهده سفارش‌های اخیر",
    productFilter: "کالا",
    allProducts: "همه کالاها",
    sortBy: "مرتب‌سازی بر اساس",
    sortDate: "تاریخ",
    sortOrderNumber: "شماره سفارش",
    sortStatus: "وضعیت",
    sortItemCount: "تعداد اقلام",
    sortTotal: "مبلغ کل",
    ascending: "صعودی",
    descending: "نزولی",
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

const SYSTEM_CANCELLATION_REASONS: Record<string, Record<string, string>> = {
  "عدم موفقیت در پرداخت آنلاین - سفارش توسط سیستم لغو شد": {
    en: "Online payment failed — the order was cancelled automatically.",
    ar: "فشلت عملية الدفع عبر الإنترنت — تم إلغاء الطلب تلقائيًا.",
    tr: "Çevrimiçi ödeme başarısız oldu — sipariş sistem tarafından iptal edildi.",
    fa: "عدم موفقیت در پرداخت آنلاین - سفارش توسط سیستم لغو شد",
  },
  "سفارش پس از اتمام مهلت ۳ روزه پرداخت بانکی توسط سیستم لغو شد": {
    en: "The order was cancelled automatically after the 3-day bank transfer payment deadline expired.",
    ar: "تم إلغاء الطلب تلقائيًا بعد انتهاء مهلة الدفع البنكي البالغة 3 أيام.",
    tr: "Banka havalesi için 3 günlük ödeme süresi dolduğundan sipariş sistem tarafından iptal edildi.",
    fa: "سفارش پس از اتمام مهلت ۳ روزه پرداخت بانکی توسط سیستم لغو شد",
  },
  "سفارش پس از پایان مهلت پرداخت توسط سیستم لغو شد": {
    en: "The order was cancelled automatically because its payment deadline expired.",
    ar: "تم إلغاء الطلب تلقائيًا بسبب انتهاء مهلة الدفع.",
    tr: "Ödeme süresi dolduğu için sipariş sistem tarafından otomatik olarak iptal edildi.",
    fa: "سفارش به‌دلیل پایان مهلت پرداخت، به‌صورت خودکار توسط سیستم لغو شد.",
  },
};

function getLocalizedCancellationReason(reason: unknown, language: string): string {
  const rawReason = String(reason ?? "");
  return SYSTEM_CANCELLATION_REASONS[rawReason]?.[language] ?? rawReason;
}

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
  const pt = (PROFILE_T_WITH_FA[language as keyof typeof PROFILE_T_WITH_FA] ?? PROFILE_T.en) as ProfileT;

  // Purchase history modal states
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [completeHistory, setCompleteHistory] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [showAccountDetails, setShowAccountDetails] = useState(false);

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
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: abandonedCartsData, isLoading: abandonedCartsLoading } = useQuery<any>({
    queryKey: ["/api/customers/abandoned-carts"],
    retry: 1,
    enabled: !!customerData?.success,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
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

  const isFinanciallyReviewed = (order: any) =>
    Boolean(order?.financialReviewedAt || order?.financiallyApproved);

  const resolveCustomerOrderStatus = (order: any) => order?.statusProjection || resolveOrderStatus({
      workflowStatus: order?.currentStatus || order?.managementStatus,
      orderStatus: order?.status,
      paymentStatus: order?.paymentStatus,
      paymentMethod: order?.paymentMethod,
      financialReviewedAt: order?.financialReviewedAt,
      financiallyApproved: order?.financiallyApproved,
    });

  const getOrderCategory = (order: any) => {
    const resolved = resolveCustomerOrderStatus(order);
    if (resolved.customerState === "cancelled") return "cancelled";
    if (resolved.customerState === "completed") return "completed";
    if (resolved.customerState === "awaiting_financial" || resolved.customerState === "processing") return "processing";
    if (
      resolved.customerState === "payment_pending" &&
      (order.paymentMethod === "واریز بانکی با مهلت 3 روزه" || order.paymentMethod === "bank_transfer_grace")
    ) return "bank_transfer";
    return "pending";
  };
  const getLocalizedStatusForSearch = (order: any) => {
    return getOrderStatusLabel(resolveCustomerOrderStatus(order), language as OrderStatusLanguage);
  };

  const dedupeOrders = (source: any[]) => Array.from(
    new Map(source.map((order: any) => [order.id ?? order.orderNumber, order])).values(),
  );
  const getOrderTotal = (order: any) => {
    const subtotal = (order.items || []).reduce((sum: number, item: any) => sum + parseFloat(item.totalPrice || 0), 0);
    return subtotal + parseFloat(order.vatAmount || "0") + parseFloat(order.shippingCost || "0") + parseFloat(order.surchargeAmount || "0");
  };
  const isUnpaidGraceOrder = (order: any) => {
    const isGracePeriod =
      order.paymentMethod === "واریز بانکی با مهلت 3 روزه" ||
      order.paymentMethod === "bank_transfer_grace";
    const isAwaitingPayment =
      order.status === "pending" ||
      order.status === "payment_grace_period";
    const paymentStatus = String(order.paymentStatus || "").toLowerCase();
    const hasPayment =
      ["paid", "completed", "successful", "success", "receipt_uploaded"].includes(paymentStatus) ||
      Boolean(order.receiptPath);

    return isGracePeriod && isAwaitingPayment && !hasPayment;
  };
  const rawOrders = Array.isArray(orderData?.orders) ? orderData.orders : [];
  const recentBaseOrders = dedupeOrders(rawOrders);
  const sortedOrders = [...recentBaseOrders].sort((a: any, b: any) => {
    const priorityDifference =
      Number(isUnpaidGraceOrder(b)) - Number(isUnpaidGraceOrder(a));
    if (priorityDifference !== 0) return priorityDifference;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }).slice(0, 10);

  const completeBaseOrders = dedupeOrders(completeHistory);
  const baseOrders = showPurchaseHistory ? completeBaseOrders : sortedOrders;
  const statsBaseOrders = completeBaseOrders.length > 0 ? completeBaseOrders : sortedOrders;
  const allOrdersForCounting = statsBaseOrders;
  const orders = selectedFilter === "all" ? sortedOrders : sortedOrders.filter((order: any) => getOrderCategory(order) === selectedFilter);

  const totalOrders = orderData?.totalOrders || 0;
  const hiddenOrders = orderData?.hiddenOrders || 0;
  const abandonedCarts = abandonedCartsData?.carts || [];
  const abandonedCartsCount = abandonedCarts.length;

  const loadCompleteHistory = async () => {
    if (completeHistory.length > 0) return;
    setIsLoadingHistory(true);
    try {
      const response = await apiRequest("/api/customers/orders/complete-history", { method: "GET" });
      if (response.success) {
        const uniqueOrders = Array.from(
          new Map(
            (response.orders || []).map((order: any) => [order.id ?? order.orderNumber, order]),
          ).values(),
        );
        setCompleteHistory(uniqueOrders);
      }
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

  const selectStatsFilter = (filter: string) => {
    setSelectedFilter(filter);
    setShowPurchaseHistory(true);
    setExpandedOrderId(null);
    if (completeBaseOrders.length === 0) loadCompleteHistory();
  };

  const productNames = Array.from(new Set(baseOrders.flatMap((order: any) =>
    (order.items || []).map((item: any) => item.productName).filter(Boolean),
  ))).sort((a, b) => String(a).localeCompare(String(b)));
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredOrders = baseOrders.filter((order: any) => {
    const categoryMatch = selectedFilter === "all" || getOrderCategory(order) === selectedFilter;
    const items = order.items || [];
    const itemNames = items.map((item: any) => String(item.productName || ""));
    const searchFields = [
      order.orderNumber, order.status, getLocalizedStatusForSearch(order),
      order.paymentStatus, order.paymentMethod, order.invoiceType, order.managementStatus,
      ...itemNames,
    ].map((value) => String(value || "").toLowerCase());
    const searchMatch = !normalizedSearch || searchFields.some((value) => value.includes(normalizedSearch));
    const productMatch = selectedProduct === "all" || itemNames.includes(selectedProduct);
    const createdAt = new Date(order.createdAt).getTime();
    const fromMatch = !dateFrom || createdAt >= new Date(`${dateFrom}T00:00:00`).getTime();
    const toMatch = !dateTo || createdAt <= new Date(`${dateTo}T23:59:59.999`).getTime();
    return categoryMatch && searchMatch && productMatch && fromMatch && toMatch;
  });
  const visibleOrders = [...filteredOrders].sort((a: any, b: any) => {
    const priorityDifference =
      Number(isUnpaidGraceOrder(b)) - Number(isUnpaidGraceOrder(a));
    if (priorityDifference !== 0) return priorityDifference;
    const direction = sortDirection === "asc" ? 1 : -1;
    const itemCount = (order: any) => (order.items || []).length;
    let left: string | number = 0;
    let right: string | number = 0;
    if (sortField === "date") {
      left = new Date(a.createdAt).getTime(); right = new Date(b.createdAt).getTime();
    } else if (sortField === "orderNumber") {
      left = String(a.orderNumber || ""); right = String(b.orderNumber || "");
    } else if (sortField === "status") {
      left = String(getLocalizedStatusForSearch(a)); right = String(getLocalizedStatusForSearch(b));
    } else if (sortField === "itemCount") {
      left = itemCount(a); right = itemCount(b);
    } else {
      left = getOrderTotal(a); right = getOrderTotal(b);
    }
    if (left < right) return -1 * direction;
    if (left > right) return 1 * direction;
    return 0;
  });

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
    new Intl.DateTimeFormat(
      language === "fa" ? "fa-IR-u-ca-persian" :
      language === "ar" ? "ar-IQ" :
      language === "tr" ? "tr-TR" :
      "en-US",
      {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
      },
    ).format(new Date(dateString));

  const toPersianPickerValue = (value: string) => value
    ? new Date(`${value}T12:00:00`)
    : null;

  const handlePersianDateChange = (
    value: DateObject | DateObject[] | null,
    setter: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    if (!value || Array.isArray(value)) {
      setter("");
      return;
    }
    const selectedDate = value.toDate();
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    setter(`${year}-${month}-${day}`);
  };

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

  const getStatusColor = (status: string, paymentStatus?: string, order?: any) => {
    return resolveCustomerOrderStatus({ ...order, status, paymentStatus }).badgeClass;
  };

  const getStatusLabel = (status: string, paymentStatus?: string, order?: any) => {
    return getOrderStatusLabel(
      resolveCustomerOrderStatus({ ...order, status, paymentStatus }),
      language as OrderStatusLanguage,
    );
  };

  // ── Loading / Error states ──
  if (customerLoading) {
    return (
      <div className="min-h-[70dvh] bg-slate-100 px-4 py-10">
        <div className="mx-auto max-w-6xl space-y-3">
          <div className="h-8 w-52 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
          <div className="h-80 animate-pulse rounded border border-slate-300 bg-slate-50" />
          <p className="sr-only">{pt.loadingProfile}</p>
        </div>
      </div>
    );
  }

  if (customerError || !customerData?.success) {
    return (
      <div className="min-h-[70dvh] bg-slate-100 px-4 py-10">
        <Card className="mx-auto max-w-md border-slate-300 shadow-sm">
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
      <div className="min-h-screen bg-slate-100 px-3 py-4 sm:px-5">
        <div className="mx-auto max-w-[1440px] space-y-4">
          {/* Header */}
          <header className="relative flex flex-wrap items-end justify-between gap-3 border-b border-slate-300 pb-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {pt.welcomeGreeting(customerData?.customer?.firstName || "")}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{pt.welcomeToPanel}</p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                aria-expanded={showAccountDetails}
                aria-controls="customer-account-details"
                onClick={() => setShowAccountDetails((open) => !open)}
                className="h-9 min-w-0 flex-1 justify-center gap-2 border-slate-300 bg-slate-50 text-xs text-slate-700 hover:bg-slate-100 sm:flex-none"
              >
                <User className="h-4 w-4 text-slate-500" />
                {pt.accountInformation}
                <span aria-hidden="true" className="text-slate-400">{showAccountDetails ? "▲" : "▼"}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setLocation("/customer/profile/edit")}
                className="h-9 gap-1.5 border-slate-300 px-3 text-xs text-slate-700 hover:bg-slate-100"
              >
                <Edit className="h-4 w-4" />
                {pt.editProfile}
              </Button>
              <Badge variant="outline" className="h-9 border-slate-300 bg-slate-50 px-3 text-slate-600">
                {pt.ordersCount(baseOrders.length)}
              </Badge>
            </div>
            {showAccountDetails && (
              <div id="customer-account-details" role="region" aria-label={pt.accountInformation} className="order-last w-full border border-slate-300 bg-slate-50 shadow-sm sm:absolute sm:end-0 sm:top-full sm:z-20 sm:mt-2 sm:max-w-md">
                <div className="divide-y divide-slate-200">
                  <div className="divide-y divide-slate-200 border-b border-slate-200">
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <User className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-800">
                        {customerData.customer.firstName} {customerData.customer.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="break-all text-xs text-slate-700">{customerData.customer.email}</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="text-sm text-slate-700">{customerData.customer.phone}</span>
                    </div>
                    {customerData.customer.company && (
                      <div className="flex items-center gap-3 px-4 py-2.5">
                        <Building className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="text-sm text-slate-700">{customerData.customer.company}</span>
                      </div>
                    )}
                    {customerData.customer.address && (
                      <div className="flex items-center gap-3 px-4 py-2.5">
                        <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="text-sm text-slate-700">{customerData.customer.address}</span>
                      </div>
                    )}
                    {(customerData.customer.city || customerData.customer.province) && (
                      <div className="flex items-center gap-3 px-4 py-2.5">
                        <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {customerData.customer.city && customerData.customer.province
                            ? `${customerData.customer.city}, ${customerData.customer.province}`
                            : customerData.customer.city || customerData.customer.province}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="mx-4 my-3 h-8 w-[calc(100%-2rem)] border-slate-300 text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <LogOut className="me-2 h-4 w-4" />
                    {pt.logout}
                  </Button>
                </div>
              </div>
            )}
          </header>

          <section aria-labelledby="address-book-title">
            <Card className="overflow-hidden border-slate-300 shadow-sm">
              <CardHeader className="border-b border-slate-300 bg-slate-50 px-4 py-3">
                <CardTitle id="address-book-title" className="flex items-center gap-2 text-base text-slate-800">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  {language === "fa" ? "دفتر آدرس" : language === "ar" ? "دفتر العناوين" : language === "tr" ? "Adres defteri" : "Address book"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <AddressSelector managementMode />
              </CardContent>
            </Card>
          </section>

            {/* Orders */}
            <div>
              <Card className="overflow-hidden border-slate-300 shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between border-b border-slate-300 bg-slate-50 px-4 py-3">
                  <div className="flex flex-col gap-3">
                    <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                      <Package className="h-4 w-4 text-slate-500" />
                      {pt.yourOrders}
                      {baseOrders.length > 0 && (
                        <Badge variant="secondary">{pt.ordersCount(baseOrders.length)}</Badge>
                      )}
                    </CardTitle>

                    {/* Order Status Indicators */}
                    {baseOrders.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {(() => {
                          const statusCounts = allOrdersForCounting.reduce((acc: any, order: any) => {
                            const category = getOrderCategory(order);
                            acc[category] = (acc[category] || 0) + 1;
                            return acc;
                          }, {});

                          return (
                            <>
                              <button
                                onClick={() => selectStatsFilter("all")}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all cursor-pointer ${
                                  selectedFilter === "all"
                                    ? "bg-purple-100 border-purple-300 shadow-md"
                                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                }`}
                              >
                                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                <span className={`font-medium ${selectedFilter === "all" ? "text-purple-700" : "text-gray-700"}`}>
                                  {allOrdersForCounting.length} {pt.allOrders}
                                </span>
                              </button>

                              {statusCounts.completed > 0 && (
                                <button
                                  onClick={() => selectStatsFilter("completed")}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all cursor-pointer ${
                                    selectedFilter === "completed"
                                      ? "bg-green-100 border-green-300 shadow-md"
                                      : "bg-green-50 border-green-200 hover:bg-green-100"
                                  }`}
                                >
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className={`font-medium ${selectedFilter === "completed" ? "text-green-800" : "text-green-700"}`}>
                                    {statusCounts.completed} {pt.completed}
                                  </span>
                                </button>
                              )}

                              {statusCounts.pending > 0 && (
                                <button
                                  onClick={() => selectStatsFilter("pending")}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all cursor-pointer ${
                                    selectedFilter === "pending"
                                      ? "bg-yellow-100 border-yellow-300 shadow-md"
                                      : "bg-yellow-50 border-yellow-200 hover:bg-yellow-100"
                                  }`}
                                >
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                  <span className={`font-medium ${selectedFilter === "pending" ? "text-yellow-800" : "text-yellow-700"}`}>
                                    {statusCounts.pending} {pt.pendingPayment}
                                  </span>
                                </button>
                              )}

                              {statusCounts.processing > 0 && (
                                <button
                                  onClick={() => selectStatsFilter("processing")}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all cursor-pointer ${
                                    selectedFilter === "processing"
                                      ? "bg-blue-100 border-blue-300 shadow-md"
                                      : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                                  }`}
                                >
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span className={`font-medium ${selectedFilter === "processing" ? "text-blue-800" : "text-blue-700"}`}>
                                    {statusCounts.processing} {pt.processing}
                                  </span>
                                </button>
                              )}

                              {statusCounts.bank_transfer > 0 && (
                                <button
                                  onClick={() => selectStatsFilter("bank_transfer")}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all cursor-pointer ${
                                    selectedFilter === "bank_transfer"
                                      ? "bg-orange-100 border-orange-300 shadow-md"
                                      : "bg-orange-50 border-orange-200 hover:bg-orange-100"
                                  }`}
                                >
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                  <span className={`font-medium ${selectedFilter === "bank_transfer" ? "text-orange-800" : "text-orange-700"}`}>
                                    {statusCounts.bank_transfer} {pt.bankTransfer}
                                  </span>
                                </button>
                              )}

                              {statusCounts.cancelled > 0 && (
                                <button
                                  onClick={() => selectStatsFilter("cancelled")}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all cursor-pointer ${
                                    selectedFilter === "cancelled"
                                      ? "bg-red-100 border-red-300 shadow-md"
                                      : "bg-red-50 border-red-200 hover:bg-red-100"
                                  }`}
                                >
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span className={`font-medium ${selectedFilter === "cancelled" ? "text-red-800" : "text-red-700"}`}>
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

                 <CardContent className="p-0">
                   <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 bg-slate-50 p-3">
                      <div className="relative min-w-[220px] flex-1">
                        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder={pt.searchOrdersPlaceholder}
                          value={searchTerm}
                          onChange={(event) => setSearchTerm(event.target.value)}
                          className="h-9 border-slate-300 ps-9"
                        />
                        {searchTerm && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setSearchTerm("")}
                            className="absolute end-1 top-1 h-7 w-7 p-0"
                            aria-label={pt.clearFilters}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                       <div className="flex flex-wrap gap-1.5">
                       {[
                         ["all", pt.allOrders],
                         ["completed", pt.completed],
                         ["pending", pt.pendingPayment],
                         ["processing", pt.processing],
                         ["bank_transfer", pt.bankTransfer],
                         ["cancelled", pt.cancelled],
                       ].map(([value, label]) => (
                        <Button
                          key={value}
                          type="button"
                          size="sm"
                          variant={selectedFilter === value ? "default" : "outline"}
                          onClick={() => setSelectedFilter(value)}
                          className="h-9 border-slate-300 px-3 text-xs"
                        >
                          {label}
                        </Button>
                      ))}
                       </div>
                       {language === "fa" ? (
                         <PersianDatePicker
                           value={toPersianPickerValue(dateFrom)}
                           onChange={(value: DateObject | DateObject[] | null) => handlePersianDateChange(value, setDateFrom)}
                           calendar={persian}
                           locale={persianFa}
                           calendarPosition="bottom-right"
                           format="YYYY/MM/DD"
                           mobileLabels={{ OK: "تأیید", CANCEL: "لغو" }}
                           inputClass="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 sm:w-[145px]"
                           containerClassName="w-full sm:w-[145px]"
                           placeholder={pt.fromDate}
                           aria-label={pt.fromDate}
                         />
                       ) : (
                         <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label={pt.fromDate} className="h-9 w-full border-slate-300 sm:w-[145px]" />
                       )}
                       {language === "fa" ? (
                         <PersianDatePicker
                           value={toPersianPickerValue(dateTo)}
                           onChange={(value: DateObject | DateObject[] | null) => handlePersianDateChange(value, setDateTo)}
                           calendar={persian}
                           locale={persianFa}
                           calendarPosition="bottom-right"
                           format="YYYY/MM/DD"
                           mobileLabels={{ OK: "تأیید", CANCEL: "لغو" }}
                           inputClass="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 sm:w-[145px]"
                           containerClassName="w-full sm:w-[145px]"
                           placeholder={pt.toDate}
                           aria-label={pt.toDate}
                         />
                       ) : (
                         <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label={pt.toDate} className="h-9 w-full border-slate-300 sm:w-[145px]" />
                       )}
                       <select value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)} aria-label={pt.productFilter} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 sm:w-[150px]">
                         <option value="all">{pt.allProducts}</option>
                         {productNames.map((name) => <option key={name} value={name}>{name}</option>)}
                       </select>
                       <select value={sortField} onChange={(event) => setSortField(event.target.value)} aria-label={pt.sortBy} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 sm:w-[145px]">
                         <option value="date">{pt.sortBy}: {pt.sortDate}</option>
                         <option value="orderNumber">{pt.sortBy}: {pt.sortOrderNumber}</option>
                         <option value="status">{pt.sortBy}: {pt.sortStatus}</option>
                         <option value="itemCount">{pt.sortBy}: {pt.sortItemCount}</option>
                         <option value="total">{pt.sortBy}: {pt.sortTotal}</option>
                       </select>
                       <Button type="button" variant="outline" onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")} className="h-9 border-slate-300 px-3 text-xs">
                         {sortDirection === "asc" ? pt.ascending : pt.descending}
                       </Button>
                       <Button type="button" variant="outline" onClick={() => {
                         setSearchTerm(""); setDateFrom(""); setDateTo(""); setSelectedProduct("all");
                         setSelectedFilter("all"); setSortField("date"); setSortDirection("desc");
                       }} className="h-9 border-slate-300 px-3 text-xs">
                         {pt.clearFilters}
                       </Button>
                       <span className="ms-auto text-xs text-slate-500">{visibleOrders.length} / {baseOrders.length}</span>
                   </div>
                  {ordersLoading || (showPurchaseHistory && isLoadingHistory) ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">{pt.loadingOrders}</p>
                    </div>
                  ) : visibleOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">{pt.noOrdersYet}</h3>
                      <p className="text-gray-500 mb-6">{pt.startShoppingDesc}</p>
                      <Button onClick={() => setLocation("/shop")}>{pt.startShopping}</Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-[1180px]">
                         <div className="sticky top-0 z-10 grid grid-cols-[44px_1.4fr_1fr_1fr_1fr_1.6fr_1.4fr] border-b border-slate-700 bg-slate-700 text-[11px] font-semibold uppercase tracking-wide text-slate-50">
                         <div className="border-e border-slate-600 px-3 py-2">#</div>
                         <div className="border-e border-slate-600 px-3 py-2">{pt.orderLabel("order")}</div>
                         <div className="border-e border-slate-600 px-3 py-2">{pt.orderItems}</div>
                         <div className="border-e border-slate-600 px-3 py-2">{pt.status}</div>
                         <div className="border-e border-slate-600 px-3 py-2">{pt.totalAmount}</div>
                          <div className="border-e border-slate-600 px-3 py-2">{pt.invoice}</div>
                          <div className="px-3 py-2">{pt.bankDocuments}</div>
                       </div>
                       <div className="space-y-0">
                      {visibleOrders.map((order: any, orderIndex: number) => {
                        const is3DayBankTransfer =
                          order.paymentMethod === "واریز بانکی با مهلت 3 روزه" ||
                          order.paymentMethod === "bank_transfer_grace";

                        return (
                          <div
                            key={order.id}
                            className={`grid grid-cols-[44px_1.4fr_1fr_1fr_1fr_1.6fr_1.4fr] gap-0 border-b border-x-0 border-slate-200 text-xs ${
                              is3DayBankTransfer
                                ? "border-orange-300 bg-orange-50"
                                : order.status === "pending" || order.status === "payment_grace_period"
                                ? "border-amber-200 bg-amber-50"
                                : "odd:bg-slate-50 even:bg-white"
                            }`}
                          >
                            <div className="col-start-1 row-start-1 flex min-w-0 items-center border-e border-slate-200 px-3 py-2 font-mono text-slate-500">{orderIndex + 1}</div>
                            <div className="col-start-2 row-start-1 flex min-w-0 items-center border-e border-slate-200 px-3 py-2">
                              <div>
                                <div className="mb-1 flex items-center gap-2">
                                  <button
                                    type="button"
                                    aria-expanded={expandedOrderId === order.id}
                                    aria-controls={`order-details-${order.id}`}
                                    onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                    className="rounded-sm text-start font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                                  >
                                    {order.orderNumber}
                                  </button>
                                </div>
                                <p className="flex items-center gap-1 text-[11px] text-slate-500">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(order.createdAt)}
                                </p>

                              </div>
                            </div>

                              <div className="col-start-3 row-start-1 flex min-w-0 items-center border-e border-slate-200 px-3 py-2">
                                <p className="font-medium text-slate-700">{order.items?.length || 0} {pt.orderItems}</p>
                              </div>
                              <div className="col-start-4 row-start-1 flex min-w-0 flex-col items-start justify-center border-e border-slate-200 px-3 py-2">
                                <Badge className={`text-[10px] ${getStatusColor(order.status, order.paymentStatus, order)}`}>
                                  {getStatusLabel(order.status, order.paymentStatus, order)}
                                </Badge>
                                {order.orderType === "temporary" &&
                                  (order.status === "pending" || order.status === "payment_grace_period") &&
                                  ![
                                    "warehouse_approved",
                                    "logistics_assigned",
                                    "logistics_dispatched",
                                    "in_transit",
                                    "shipped",
                                    "delivered",
                                    "completed",
                                  ].includes(String(order.currentStatus || order.managementStatus || "").toLowerCase()) && (
                                  <Badge className="mt-1 w-fit bg-orange-100 text-[10px] text-orange-800">
                                    <Clock className="me-1 h-3 w-3" />
                                    {pt.temporaryOrder}
                                  </Badge>
                                )}
                              </div>
                              <div className="col-start-5 row-start-1 flex min-w-0 items-center border-e border-slate-200 px-3 py-2">
                                <span className="font-semibold text-slate-900">{Math.floor(getOrderTotal(order))} IQD</span>
                              </div>
                               <div className="col-start-6 row-start-1 flex min-w-0 items-center border-e border-slate-200 px-3 py-2">
                                {!["cancelled", "financial_rejected", "finance_rejected", "rejected"].includes(
                                  String(order.currentStatus || order.managementStatus || order.status || "").toLowerCase(),
                                ) &&
                                  order.invoiceType !== "voided" &&
                                  !(order.paymentStatus?.toLowerCase() === "receipt_uploaded" && !isFinanciallyReviewed(order)) ? (
                                  order.invoiceType === "official_invoice" ? (
                                    <Button
                                      size="sm"
                                      onClick={() => window.open(`/download-invoice/${order.id}?lang=${encodeURIComponent(language)}`, "_blank")}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <Download className="h-4 w-4 mr-1" />
                                      {pt.downloadOfficialInvoice}
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => window.open(`/download-proforma-invoice/${order.id}?lang=${encodeURIComponent(language)}`, "_blank")}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      <Download className="h-4 w-4 mr-1" />
                                      {pt.downloadProforma}
                                    </Button>
                                  )
                                ) : (
                                  <span className="text-slate-400" aria-label={pt.invoice}>—</span>
                                )}
                              </div>
                               <div className="col-start-7 row-start-1 flex min-w-0 items-center px-2 py-2">
                                 {isUnpaidGraceOrder(order) ? (
                                   <Button
                                     type="button"
                                     size="sm"
                                     variant="outline"
                                     className="h-auto min-h-8 whitespace-normal text-start text-xs"
                                     onClick={() => handleOpenBankReceiptModal(order.orderNumber)}
                                   >
                                     <Upload className="me-1 h-3.5 w-3.5 shrink-0" />
                                     {pt.uploadBankReceiptBtn}
                                   </Button>
                                 ) : is3DayBankTransfer && order.receiptPath ? (
                                   <div className="flex flex-wrap items-center gap-1">
                                     <Badge className="whitespace-normal bg-green-100 text-green-800">{pt.transferUploaded}</Badge>
                                     <Button
                                       type="button"
                                       size="sm"
                                       variant="link"
                                       className="h-auto px-1 text-xs"
                                       onClick={() => {
                                         const receiptPath = String(order.receiptPath);
                                         const receiptUrl = /^https?:\/\//i.test(receiptPath)
                                           ? receiptPath
                                           : `/${receiptPath.replace(/^\/+/, "")}`;
                                         window.open(receiptUrl, "_blank", "noopener,noreferrer");
                                       }}
                                     >
                                       {pt.viewBankReceipt}
                                     </Button>
                                   </div>
                                 ) : (
                                   <span className="text-slate-400" aria-label={pt.bankDocuments}>—</span>
                                 )}
                               </div>
                            {expandedOrderId === order.id && (
                               <div id={`order-details-${order.id}`} className="col-span-7 min-w-0 border-t border-slate-300 bg-slate-50 p-3">
                                {is3DayBankTransfer && (order.status === "pending" || order.status === "payment_grace_period") && (
                                  <div className="mb-3 rounded border border-orange-300 bg-orange-100 p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                      <p className="flex items-center gap-1 text-sm font-bold text-orange-900">
                                        <AlertCircle className="h-4 w-4" />
                                        {pt.paymentDeadlineOrder(gracePeriodDays)}
                                      </p>
                                      <Badge className="bg-orange-200 text-xs text-orange-800">{pt.specialDeadline}</Badge>
                                    </div>
                                    {!order.receiptPath ? (
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-xs text-orange-800">{pt.waitingForTransfer}</p>
                                        <span className="text-xs text-orange-700">{pt.paymentDeadlineHours(gracePeriodDays * 24)}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <Badge className="bg-green-100 text-xs text-green-800">{pt.transferUploaded}</Badge>
                                        <span className="text-xs text-orange-700">{pt.waitingFinancialReview}</span>
                                      </div>
                                    )}
                                    <div className="mt-2">
                                      <BankTransferCountdown orderDate={order.createdAt} gracePeriodHours={gracePeriodDays * 24} pt={pt} />
                                    </div>
                                  </div>
                                )}
                                {order.status !== "cancelled" && (order.paymentMethod === "واریز بانکی با مهلت 3 روزه" || order.paymentMethod === "bank_transfer_grace") && order.receiptPath && (
                                  <div className="mb-3 space-y-2">
                                    {(order.status === "payment_uploaded" || order.status === "pending" || order.status === "payment_grace_period") && (
                                      <div className="rounded border border-blue-200 bg-blue-50 p-3">
                                        <p className="flex items-center gap-1 text-sm font-medium text-blue-800"><Clock className="h-4 w-4" />{pt.bankTransferUnderReview}</p>
                                        <p className="mt-1 text-xs text-blue-700">{pt.waitingFinancialApproval}</p>
                                      </div>
                                    )}
                                    {order.status === "confirmed" && (
                                      <div className="rounded border border-green-200 bg-green-50 p-3">
                                        <p className="flex items-center gap-1 text-sm font-medium text-green-800"><AlertCircle className="h-4 w-4" />{pt.bankTransferApproved}</p>
                                        <p className="mt-1 text-xs text-green-700">{pt.orderUnderWarehouseProcessing}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {(order.status === "financial_rejected" || order.status === "rejected") && order.financialNotes && (
                                  <div className="mb-3 rounded border border-red-200 bg-red-50 p-3">
                                    <div className="flex items-start gap-2">
                                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                                      <div><h6 className="mb-1 text-sm font-medium text-red-800">{pt.orderRejectionReason}</h6><p className="text-sm text-red-700">{order.financialNotes}</p></div>
                                    </div>
                                  </div>
                                )}
                                {["cancelled", "deleted"].includes(
                                  String(order.status || "").toLowerCase(),
                                ) && order.cancellationReason && (
                                  <div className="mb-3 rounded border border-red-200 bg-red-50 p-3">
                                    <div className="flex items-start gap-2">
                                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                                      <div>
                                        <h6 className="mb-1 text-sm font-medium text-red-800">
                                          {pt.orderCancellationReason}
                                        </h6>
                                        <p className="text-sm text-red-700">
                                          {getLocalizedCancellationReason(order.cancellationReason, language)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              {(() => {
                                const normalizedItems = (order.items || []).map((item: any) => {
                                  const quantity = parseFloat(item.quantity ?? 0);
                                  const unitPrice = parseFloat(item.unitPrice ?? item.unit_price ?? 0);
                                  const storedTotal = parseFloat(item.totalPrice ?? item.total_price ?? "");
                                  return {
                                    ...item,
                                    productName: item.productName ?? item.product_name,
                                    quantity,
                                    totalPrice: Number.isFinite(storedTotal) ? storedTotal : quantity * unitPrice,
                                  };
                                });
                                const subtotalAmount = normalizedItems.reduce(
                                  (sum: number, item: any) => sum + item.totalPrice, 0,
                                );
                                const shippingCost = parseFloat(order.shippingCost || "0");
                                const vatAmount = parseFloat(order.vatAmount || "0");
                                const surchargeAmount = parseFloat(order.surchargeAmount || "0");
                                return (
                                  <div className="overflow-x-auto border border-emerald-900">
                                    <table className="w-full min-w-[620px] border-collapse text-xs">
                                      <thead className="bg-emerald-800 text-left text-[11px] font-semibold uppercase tracking-wide text-white">
                                        <tr>
                                          <th className="w-12 border border-emerald-700 px-2 py-2">#</th>
                                          <th className="border border-emerald-700 px-3 py-2">{pt.orderItems}</th>
                                          <th className="border border-emerald-700 px-3 py-2">{pt.quantity}</th>
                                          <th className="border border-emerald-700 px-3 py-2">{pt.totalAmount}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {normalizedItems.map((item: any, index: number) => (
                                          <tr key={item.id || index} className="odd:bg-emerald-50 even:bg-white">
                                            <td className="border border-slate-300 px-2 py-2 font-mono text-slate-500">{index + 1}</td>
                                            <td className="border border-slate-300 px-3 py-2 text-slate-800">{item.productName || pt.unknownProduct}</td>
                                            <td className="border border-slate-300 px-3 py-2 text-slate-700">{item.quantity}</td>
                                            <td className="border border-slate-300 px-3 py-2 font-medium text-slate-800">{Math.floor(item.totalPrice)} IQD</td>
                                          </tr>
                                        ))}
                                        <tr className="bg-slate-100">
                                          <th colSpan={3} className="border border-slate-300 px-3 py-2 text-start font-medium">{pt.itemsSubtotal}</th>
                                          <td className="border border-slate-300 px-3 py-2 font-medium">{Math.floor(subtotalAmount)} IQD</td>
                                        </tr>
                                        <tr className="bg-white">
                                          <th colSpan={3} className="border border-slate-300 px-3 py-2 text-start font-medium">{pt.shippingCost}</th>
                                          <td className="border border-slate-300 px-3 py-2">{Math.floor(shippingCost)} IQD</td>
                                        </tr>
                                        <tr className="bg-slate-100">
                                          <th colSpan={3} className="border border-slate-300 px-3 py-2 text-start font-medium">{pt.vat}</th>
                                          <td className="border border-slate-300 px-3 py-2">{Math.floor(vatAmount)} IQD</td>
                                        </tr>
                                        <tr className="bg-white">
                                          <th colSpan={3} className="border border-slate-300 px-3 py-2 text-start font-medium">{pt.surcharge}</th>
                                          <td className="border border-slate-300 px-3 py-2">{Math.floor(surchargeAmount)} IQD</td>
                                        </tr>
                                        <tr className="bg-emerald-100 font-bold text-emerald-950">
                                          <th colSpan={3} className="border border-slate-300 px-3 py-2 text-start">{pt.totalAmount}</th>
                                          <td className="border border-slate-300 px-3 py-2">{Math.floor(getOrderTotal(order))} IQD</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              })()}

                            {/* Actions */}
                            <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
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

                            </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                       </div>
                     </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Purchase History and CSV Export Buttons */}
              {baseOrders.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Button
                    onClick={() => {
                      const next = !showPurchaseHistory;
                      setShowPurchaseHistory(next);
                      if (next) loadCompleteHistory();
                    }}
                    variant="outline"
                    className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    {showPurchaseHistory ? pt.viewRecentOrders : pt.viewFullPurchaseHistory}
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
        orderFromProfile={baseOrders.find((order: any) => order.orderNumber === selectedOrderNumber)}
        onSuccess={handleModalSuccess}
      />
    </>
  );
};

export default CustomerProfile;
