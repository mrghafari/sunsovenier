import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  CreditCard, 
  Wallet, 
  CheckCircle, 
  AlertCircle,
  AlertTriangle,
  DollarSign,
  FileText,
  Timer,
  Building2,
  MapPin,
  Phone,
  Mail,
  Package,
  Weight,
  Truck,
  User,
  Settings,
  Wrench
} from "lucide-react";

interface FinancialOrder {
  id: number;
  customerOrderId: number;
  orderNumber: string;
  currentStatus: string;
  paymentMethod: string;
  paymentSourceLabel: string;
  walletAmountUsed?: string;
  bankAmountPaid?: string;
  excessAmountCredited?: string;
  autoApprovalScheduledAt?: string;
  isAutoApprovalEnabled: boolean;
  financialNotes?: string;
  financialReviewedAt?: string;
  invoiceType?: string;
  invoiceConvertedAt?: string;
  totalAmount: string;
  customerName: string;
  createdAt: string;
  totalWeight?: string;
  weightUnit?: string;
  deliveryMethod?: string;
  shippingAddress?: {
    name: string;
    phone: string;
    address: string;
    city: string;
    postalCode?: string;
  };
  customerEmail?: string;
  customerPhone?: string;
  status?: string;
}

type PageLanguage = "en" | "fa" | "ar" | "tr";
type PageTranslationKey = keyof typeof pageTranslations.en;

const pageTranslations = {
  en: {
    dashboardTitle: "Financial Approval Dashboard",
    pendingCount: "orders pending approval",
    settlementTypes: "Payment and settlement methods",
    bankGateway: "Bank gateway",
    autoApproval5: "Automatic approval in 5 minutes",
    autoWithdrawal: "Automatic withdrawal",
    walletBank: "Wallet + bank",
    bank3days: "Bank transfer within 3 days",
    pendingOrders: "Pending orders",
    temporaryOrders: "Temporary orders",
    orphanedIncomplete: "Orphaned and incomplete",
    autoApproval: "Automatic approval",
    gracePeriod: "Grace period",
    approvedOrders: "Approved orders",
    allProcessed: "All orders have been processed",
    noPending: "There are currently no orders awaiting financial approval",
    order: "Order",
    customer: "Customer",
    orderDate: "Order date",
    deliveryAddress: "Delivery address",
    totalAmount: "Total amount",
    totalWeight: "Total weight",
    deliveryMethod: "Delivery method",
    courier: "Courier",
    pickup: "Pickup",
    mail: "Mail",
    wallet: "Wallet",
    note: "Note",
    excessDeposit: "Excess deposit",
    toWallet: "to wallet",
    temporaryBadge: "Temporary order",
    temporaryDesc: "Test / temporary order",
    temporaryStatus: "Status: temporary/test order",
    temporaryInfo: "This order was created for testing and review",
    noTemporary: "No temporary orders found",
    temporaryHelp: "Test and temporary orders appear here",
    incompleteBadge: "Incomplete order",
    incompleteDesc: "Incomplete bank-gateway payment",
    incompleteStatus: "Status: incomplete order",
    incompleteInfo: "This order is hidden from the main list until payment is completed",
    noOrphan: "No orphaned orders found",
    orphanSuccess: "All bank-gateway orders have been completed successfully",
    orphanBadge: "Orphaned order",
    orphanStatus: "Status: orphaned order",
    orphanInfo: "This order has no management record and needs repair",
    orphanedTitle: "Orphaned orders need repair",
    orphanedDescription: "These orders exist in customer_orders but have no management record",
    orphanedCount: "orders",
    repair: "Repair orphaned order",
    repairing: "Repairing...",
    autoTitle: "Orders undergoing automatic approval",
    graceTitle: "Orders with a 3-day grace period",
    graceUpload: "Awaiting deposit receipt upload",
    deadline: "Deadline: 3 days",
    approvedBadge: "Approved",
    noApproved: "No approved orders found",
    noFinancialApproval: "There are currently no financially approved orders",
    currentStatus: "Current status",
    financialApproval: "Financial approval",
    approvalDate: "Approval date",
    approvalTime: "Approval time",
    invoiceStatus: "Invoice status",
    invoiceType: "Invoice type",
    officialInvoice: "Official invoice",
    temporaryInvoice: "Temporary invoice",
    conversionDate: "Conversion date",
    awaitingReview: "Awaiting review",
    sentToWarehouse: "Sent to warehouse",
    rejected: "Rejected",
    temporary: "Temporary orders",
    noOrphaned: "No orphaned orders exist",
    allManaged: "All orders have an appropriate management record",
    manualApproval: "Manual approval for order",
    reviewNote: "Review note",
    reviewPlaceholder: "Notes for financial approval review...",
    excessOptional: "Excess amount (optional)",
    excessPlaceholder: "Excess amount to add to the wallet",
    excessHelp: "Any excess amount will be added to the customer's wallet",
    processing: "Processing...",
    approveTransfer: "Approve and transfer to warehouse",
    cancel: "Cancel",
    loadingOrders: "Loading orders...",
    approvalSuccess: "Order approved",
    approvalSuccessDesc: "The order was approved successfully and transferred to the warehouse",
    approvalError: "Error approving order",
    repairSuccess: "Orphaned order repaired",
    repairSuccessDesc: "The order was successfully added to the management system",
    repairError: "Error repairing order",
    retry: "Please try again",
    timeExpired: "Time expired",
    minutesRemaining: "minutes remaining",
    unknown: "Unknown",
    status: "Status",
    unit: "kg",
    onlinePayment: "Online payment",
    noAuto: "No orders are awaiting automatic approval",
    noGrace: "No orders are currently in the grace period",
    tableOrder: "Order",
    tableCustomerContact: "Customer / contact",
    tableOrderDate: "Order date",
    tableStatus: "Status",
    tableRawStatus: "Raw status",
    tablePaymentSource: "Payment / source",
    tableTotalWeight: "Total / weight",
    tableDelivery: "Delivery / address",
    tableTimer: "Timer",
    tableApproval: "Approval",
    tableInvoice: "Invoice",
    tableAction: "Action",
    review: "Review",
  },
  fa: {
    dashboardTitle: "داشبورد تأیید مالی",
    pendingCount: "سفارش در انتظار تأیید",
    settlementTypes: "روش‌های پرداخت و تسویه",
    bankGateway: "درگاه بانکی",
    autoApproval5: "تأیید خودکار در ۵ دقیقه",
    autoWithdrawal: "برداشت خودکار",
    walletBank: "کیف پول + بانک",
    bank3days: "واریز بانکی ظرف ۳ روز",
    pendingOrders: "سفارش‌های در انتظار",
    temporaryOrders: "سفارش‌های موقت",
    orphanedIncomplete: "یتیم و ناتمام",
    autoApproval: "تأیید خودکار",
    gracePeriod: "مهلت‌دار",
    approvedOrders: "سفارش‌های تأییدشده",
    allProcessed: "همه سفارش‌ها پردازش شده‌اند",
    noPending: "در حال حاضر سفارشی در انتظار تأیید مالی نیست",
    order: "سفارش",
    customer: "مشتری",
    orderDate: "تاریخ سفارش",
    deliveryAddress: "آدرس تحویل",
    totalAmount: "مبلغ کل",
    totalWeight: "وزن کل",
    deliveryMethod: "روش تحویل",
    courier: "پیک",
    pickup: "تحویل حضوری",
    mail: "پست",
    wallet: "کیف پول",
    note: "یادداشت",
    excessDeposit: "واریز اضافی",
    toWallet: "به کیف پول",
    temporaryBadge: "سفارش موقت",
    temporaryDesc: "سفارش آزمایشی / موقت",
    temporaryStatus: "وضعیت: سفارش موقت / آزمایشی",
    temporaryInfo: "این سفارش برای تست و بررسی ایجاد شده است",
    noTemporary: "هیچ سفارش موقتی یافت نشد",
    temporaryHelp: "سفارش‌های آزمایشی و موقت در اینجا نمایش داده می‌شوند",
    incompleteBadge: "سفارش ناتمام",
    incompleteDesc: "پرداخت درگاه بانکی ناکامل",
    incompleteStatus: "وضعیت: سفارش ناتمام",
    incompleteInfo: "این سفارش تا زمان تکمیل پرداخت در فهرست اصلی نمایش داده نمی‌شود",
    noOrphan: "هیچ سفارش یتیمی یافت نشد",
    orphanSuccess: "همه سفارش‌های درگاه بانکی با موفقیت تکمیل شده‌اند",
    orphanBadge: "سفارش یتیم",
    orphanStatus: "وضعیت: سفارش یتیم",
    orphanInfo: "این سفارش رکورد مدیریت ندارد و نیازمند تعمیر است",
    orphanedTitle: "سفارش‌های یتیم نیازمند تعمیر",
    orphanedDescription: "این سفارش‌ها در جدول customer_orders وجود دارند اما رکورد مدیریت ندارند",
    orphanedCount: "سفارش",
    repair: "تعمیر سفارش یتیم",
    repairing: "در حال تعمیر...",
    autoTitle: "سفارش‌های در حال تأیید خودکار",
    graceTitle: "سفارش‌های دارای مهلت ۳ روزه",
    graceUpload: "در انتظار بارگذاری فیش واریز",
    deadline: "مهلت: ۳ روز",
    approvedBadge: "تأییدشده",
    noApproved: "سفارش تأییدشده‌ای یافت نشد",
    noFinancialApproval: "در حال حاضر سفارشی تأیید مالی نشده است",
    currentStatus: "وضعیت فعلی",
    financialApproval: "تأیید مالی",
    approvalDate: "تاریخ تأیید",
    approvalTime: "زمان تأیید",
    invoiceStatus: "وضعیت فاکتور",
    invoiceType: "نوع فاکتور",
    officialInvoice: "فاکتور رسمی",
    temporaryInvoice: "فاکتور موقت",
    conversionDate: "تاریخ تبدیل",
    awaitingReview: "در انتظار بررسی",
    sentToWarehouse: "ارجاع‌شده به انبار",
    rejected: "ردشده",
    temporary: "سفارش‌های موقت",
    noOrphaned: "سفارش یتیمی وجود ندارد",
    allManaged: "همه سفارش‌ها رکورد مدیریت مناسب دارند",
    manualApproval: "تأیید دستی سفارش",
    reviewNote: "یادداشت بررسی",
    reviewPlaceholder: "یادداشت‌های مربوط به بررسی مالی...",
    excessOptional: "مبلغ اضافی (اختیاری)",
    excessPlaceholder: "مبلغ اضافی برای افزودن به کیف پول",
    excessHelp: "مبلغ اضافی در صورت وجود به کیف پول مشتری اضافه می‌شود",
    processing: "در حال پردازش...",
    approveTransfer: "تأیید و انتقال به انبار",
    cancel: "انصراف",
    loadingOrders: "در حال بارگذاری سفارش‌ها...",
    approvalSuccess: "سفارش تأیید شد",
    approvalSuccessDesc: "سفارش با موفقیت تأیید و به انبار منتقل شد",
    approvalError: "خطا در تأیید سفارش",
    repairSuccess: "سفارش یتیم تعمیر شد",
    repairSuccessDesc: "سفارش با موفقیت به سیستم مدیریت اضافه شد",
    repairError: "خطا در تعمیر سفارش",
    retry: "لطفاً دوباره تلاش کنید",
    timeExpired: "زمان تمام شده",
    minutesRemaining: "دقیقه باقی‌مانده",
    unknown: "نامشخص",
    status: "وضعیت",
    unit: "کیلوگرم",
    onlinePayment: "پرداخت آنلاین",
    noAuto: "سفارشی در انتظار تأیید خودکار نیست",
    noGrace: "در حال حاضر سفارشی در مهلت پرداخت نیست",
    tableOrder: "سفارش",
    tableCustomerContact: "مشتری / تماس",
    tableOrderDate: "تاریخ سفارش",
    tableStatus: "وضعیت",
    tableRawStatus: "وضعیت خام",
    tablePaymentSource: "پرداخت / منبع",
    tableTotalWeight: "مجموع / وزن",
    tableDelivery: "تحویل / آدرس",
    tableTimer: "زمان‌سنج",
    tableApproval: "تأیید",
    tableInvoice: "فاکتور",
    tableAction: "عملیات",
    review: "بررسی",
  },
  ar: {
    dashboardTitle: "لوحة اعتماد الشؤون المالية",
    pendingCount: "طلبات بانتظار الاعتماد",
    settlementTypes: "طرق الدفع والتسوية",
    bankGateway: "بوابة مصرفية",
    autoApproval5: "اعتماد تلقائي خلال 5 دقائق",
    autoWithdrawal: "سحب تلقائي",
    walletBank: "المحفظة + المصرف",
    bank3days: "تحويل مصرفي خلال 3 أيام",
    pendingOrders: "الطلبات المعلقة",
    temporaryOrders: "الطلبات المؤقتة",
    orphanedIncomplete: "اليتيمة وغير المكتملة",
    autoApproval: "اعتماد تلقائي",
    gracePeriod: "فترة سماح",
    approvedOrders: "الطلبات المعتمدة",
    allProcessed: "تمت معالجة جميع الطلبات",
    noPending: "لا توجد حالياً طلبات بانتظار الاعتماد المالي",
    order: "الطلب",
    customer: "العميل",
    orderDate: "تاريخ الطلب",
    deliveryAddress: "عنوان التسليم",
    totalAmount: "المبلغ الإجمالي",
    totalWeight: "الوزن الإجمالي",
    deliveryMethod: "طريقة التسليم",
    courier: "مندوب التوصيل",
    pickup: "استلام شخصي",
    mail: "البريد",
    wallet: "المحفظة",
    note: "ملاحظة",
    excessDeposit: "إيداع زائد",
    toWallet: "إلى المحفظة",
    temporaryBadge: "طلب مؤقت",
    temporaryDesc: "طلب تجريبي / مؤقت",
    temporaryStatus: "الحالة: طلب مؤقت / تجريبي",
    temporaryInfo: "أُنشئ هذا الطلب للاختبار والمراجعة",
    noTemporary: "لم يتم العثور على طلبات مؤقتة",
    temporaryHelp: "تظهر الطلبات التجريبية والمؤقتة هنا",
    incompleteBadge: "طلب غير مكتمل",
    incompleteDesc: "دفعة البوابة المصرفية غير مكتملة",
    incompleteStatus: "الحالة: طلب غير مكتمل",
    incompleteInfo: "هذا الطلب مخفي من القائمة الرئيسية حتى اكتمال الدفع",
    noOrphan: "لم يتم العثور على طلبات يتيمة",
    orphanSuccess: "اكتملت جميع طلبات البوابة المصرفية بنجاح",
    orphanBadge: "طلب يتيم",
    orphanStatus: "الحالة: طلب يتيم",
    orphanInfo: "لا يملك هذا الطلب سجل إدارة ويحتاج إلى إصلاح",
    orphanedTitle: "الطلبات اليتيمة تحتاج إلى إصلاح",
    orphanedDescription: "توجد هذه الطلبات في customer_orders دون سجل إدارة",
    orphanedCount: "طلب",
    repair: "إصلاح الطلب اليتيم",
    repairing: "جارٍ الإصلاح...",
    autoTitle: "الطلبات قيد الاعتماد التلقائي",
    graceTitle: "الطلبات ذات فترة السماح لثلاثة أيام",
    graceUpload: "بانتظار رفع إيصال الإيداع",
    deadline: "الموعد النهائي: 3 أيام",
    approvedBadge: "معتمد",
    noApproved: "لم يتم العثور على طلبات معتمدة",
    noFinancialApproval: "لا توجد حالياً طلبات معتمدة مالياً",
    currentStatus: "الحالة الحالية",
    financialApproval: "الاعتماد المالي",
    approvalDate: "تاريخ الاعتماد",
    approvalTime: "وقت الاعتماد",
    invoiceStatus: "حالة الفاتورة",
    invoiceType: "نوع الفاتورة",
    officialInvoice: "فاتورة رسمية",
    temporaryInvoice: "فاتورة مؤقتة",
    conversionDate: "تاريخ التحويل",
    awaitingReview: "بانتظار المراجعة",
    sentToWarehouse: "أُحيل إلى المستودع",
    rejected: "مرفوض",
    temporary: "الطلبات المؤقتة",
    noOrphaned: "لا توجد طلبات يتيمة",
    allManaged: "تملك جميع الطلبات سجلاً إدارياً مناسباً",
    manualApproval: "الاعتماد اليدوي للطلب",
    reviewNote: "ملاحظة المراجعة",
    reviewPlaceholder: "ملاحظات مراجعة الاعتماد المالي...",
    excessOptional: "المبلغ الزائد (اختياري)",
    excessPlaceholder: "المبلغ الزائد المراد إضافته إلى المحفظة",
    excessHelp: "يُضاف أي مبلغ زائد إلى محفظة العميل",
    processing: "جارٍ المعالجة...",
    approveTransfer: "اعتماد وإحالة إلى المستودع",
    cancel: "إلغاء",
    loadingOrders: "جارٍ تحميل الطلبات...",
    approvalSuccess: "تم اعتماد الطلب",
    approvalSuccessDesc: "تم اعتماد الطلب وإحالته إلى المستودع بنجاح",
    approvalError: "خطأ في اعتماد الطلب",
    repairSuccess: "تم إصلاح الطلب اليتيم",
    repairSuccessDesc: "تمت إضافة الطلب إلى نظام الإدارة بنجاح",
    repairError: "خطأ في إصلاح الطلب",
    retry: "يرجى المحاولة مرة أخرى",
    timeExpired: "انتهى الوقت",
    minutesRemaining: "دقيقة متبقية",
    unknown: "غير معروف",
    status: "الحالة",
    unit: "كغ",
    onlinePayment: "دفع عبر الإنترنت",
    noAuto: "لا توجد طلبات بانتظار الاعتماد التلقائي",
    noGrace: "لا توجد حالياً طلبات ضمن فترة السماح",
    tableOrder: "الطلب",
    tableCustomerContact: "العميل / الاتصال",
    tableOrderDate: "تاريخ الطلب",
    tableStatus: "الحالة",
    tableRawStatus: "الحالة الخام",
    tablePaymentSource: "الدفع / المصدر",
    tableTotalWeight: "الإجمالي / الوزن",
    tableDelivery: "التسليم / العنوان",
    tableTimer: "المؤقت",
    tableApproval: "الاعتماد",
    tableInvoice: "الفاتورة",
    tableAction: "الإجراء",
    review: "مراجعة",
  },
  tr: {
    dashboardTitle: "Mali Onay Panosu",
    pendingCount: "onay bekleyen sipariş",
    settlementTypes: "Ödeme ve mutabakat yöntemleri",
    bankGateway: "Banka geçidi",
    autoApproval5: "5 dakika içinde otomatik onay",
    autoWithdrawal: "Otomatik çekim",
    walletBank: "Cüzdan + banka",
    bank3days: "3 gün içinde banka havalesi",
    pendingOrders: "Bekleyen siparişler",
    temporaryOrders: "Geçici siparişler",
    orphanedIncomplete: "Yetim ve tamamlanmamış",
    autoApproval: "Otomatik onay",
    gracePeriod: "Ek süre",
    approvedOrders: "Onaylanan siparişler",
    allProcessed: "Tüm siparişler işlendi",
    noPending: "Şu anda mali onay bekleyen sipariş yok",
    order: "Sipariş",
    customer: "Müşteri",
    orderDate: "Sipariş tarihi",
    deliveryAddress: "Teslimat adresi",
    totalAmount: "Toplam tutar",
    totalWeight: "Toplam ağırlık",
    deliveryMethod: "Teslimat yöntemi",
    courier: "Kurye",
    pickup: "Elden teslim",
    mail: "Posta",
    wallet: "Cüzdan",
    note: "Not",
    excessDeposit: "Fazla ödeme",
    toWallet: "cüzdana",
    temporaryBadge: "Geçici sipariş",
    temporaryDesc: "Test / geçici sipariş",
    temporaryStatus: "Durum: geçici / test siparişi",
    temporaryInfo: "Bu sipariş test ve inceleme için oluşturuldu",
    noTemporary: "Geçici sipariş bulunamadı",
    temporaryHelp: "Test ve geçici siparişler burada görünür",
    incompleteBadge: "Tamamlanmamış sipariş",
    incompleteDesc: "Banka geçidi ödemesi tamamlanmadı",
    incompleteStatus: "Durum: tamamlanmamış sipariş",
    incompleteInfo: "Ödeme tamamlanana kadar bu sipariş ana listede görünmez",
    noOrphan: "Yetim sipariş bulunamadı",
    orphanSuccess: "Tüm banka geçidi siparişleri başarıyla tamamlandı",
    orphanBadge: "Yetim sipariş",
    orphanStatus: "Durum: yetim sipariş",
    orphanInfo: "Bu siparişin yönetim kaydı yok ve onarılması gerekiyor",
    orphanedTitle: "Onarım bekleyen yetim siparişler",
    orphanedDescription: "Bu siparişler customer_orders tablosunda var ancak yönetim kaydı yok",
    orphanedCount: "sipariş",
    repair: "Yetim siparişi onar",
    repairing: "Onarılıyor...",
    autoTitle: "Otomatik onay sürecindeki siparişler",
    graceTitle: "3 günlük ek süreli siparişler",
    graceUpload: "Ödeme dekontu yüklemesi bekleniyor",
    deadline: "Son tarih: 3 gün",
    approvedBadge: "Onaylandı",
    noApproved: "Onaylanan sipariş bulunamadı",
    noFinancialApproval: "Şu anda mali olarak onaylanan sipariş yok",
    currentStatus: "Mevcut durum",
    financialApproval: "Mali onay",
    approvalDate: "Onay tarihi",
    approvalTime: "Onay saati",
    invoiceStatus: "Fatura durumu",
    invoiceType: "Fatura türü",
    officialInvoice: "Resmi fatura",
    temporaryInvoice: "Geçici fatura",
    conversionDate: "Dönüşüm tarihi",
    awaitingReview: "İnceleme bekliyor",
    sentToWarehouse: "Depoya gönderildi",
    rejected: "Reddedildi",
    temporary: "Geçici siparişler",
    noOrphaned: "Yetim sipariş yok",
    allManaged: "Tüm siparişlerin uygun yönetim kaydı var",
    manualApproval: "Sipariş için manuel onay",
    reviewNote: "İnceleme notu",
    reviewPlaceholder: "Mali onay incelemesi için notlar...",
    excessOptional: "Fazla tutar (isteğe bağlı)",
    excessPlaceholder: "Cüzdana eklenecek fazla tutar",
    excessHelp: "Varsa fazla tutar müşterinin cüzdanına eklenir",
    processing: "İşleniyor...",
    approveTransfer: "Onayla ve depoya gönder",
    cancel: "İptal",
    loadingOrders: "Siparişler yükleniyor...",
    approvalSuccess: "Sipariş onaylandı",
    approvalSuccessDesc: "Sipariş başarıyla onaylandı ve depoya gönderildi",
    approvalError: "Sipariş onaylama hatası",
    repairSuccess: "Yetim sipariş onarıldı",
    repairSuccessDesc: "Sipariş yönetim sistemine başarıyla eklendi",
    repairError: "Sipariş onarma hatası",
    retry: "Lütfen tekrar deneyin",
    timeExpired: "Süre doldu",
    minutesRemaining: "dakika kaldı",
    unknown: "Bilinmiyor",
    status: "Durum",
    unit: "kg",
    onlinePayment: "Çevrim içi ödeme",
    noAuto: "Otomatik onay bekleyen sipariş yok",
    noGrace: "Şu anda ek süreli sipariş yok",
    tableOrder: "Sipariş",
    tableCustomerContact: "Müşteri / iletişim",
    tableOrderDate: "Sipariş tarihi",
    tableStatus: "Durum",
    tableRawStatus: "Ham durum",
    tablePaymentSource: "Ödeme / kaynak",
    tableTotalWeight: "Toplam / ağırlık",
    tableDelivery: "Teslimat / adres",
    tableTimer: "Sayaç",
    tableApproval: "Onay",
    tableInvoice: "Fatura",
    tableAction: "İşlem",
    review: "İncele",
  },
} as const;

export default function FinancialWorkflowDashboard() {
  const { language: contextLanguage, direction } = useLanguage();
  const language = (["en", "fa", "ar", "tr"].includes(contextLanguage) ? contextLanguage : "en") as PageLanguage;
  const t = (key: PageTranslationKey) => pageTranslations[language][key];
  const locale = language === "fa"
    ? "fa-IR-u-ca-persian"
    : language === "ar"
      ? "ar-IQ-u-ca-gregory"
      : language === "tr"
        ? "tr-TR-u-ca-gregory"
        : "en-IQ-u-ca-gregory";
  const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);
  const formatDecimal = (value: string | number) => {
    const number = Number(value);
    return Number.isFinite(number)
      ? new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(number)
      : String(value);
  };
  const formatCurrency = (value: string | number | undefined) => new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "IQD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
  const formatDate = (value: string, withTime = false) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("unknown");
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(date);
  };
  const formatTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("unknown");
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };
  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [direction, language]);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<FinancialOrder | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [excessAmount, setExcessAmount] = useState("");

  const { data: orders, isLoading } = useQuery<FinancialOrder[]>({
    queryKey: ['/api/financial/pending-orders'],
    refetchInterval: 30000
  });

  const { data: approvedOrders, isLoading: isLoadingApproved } = useQuery<FinancialOrder[]>({
    queryKey: ['/api/financial/approved-orders'],
    refetchInterval: 30000
  });

  const { data: temporaryResponse, isLoading: temporaryLoading } = useQuery<{orders: FinancialOrder[]}>({
    queryKey: ['/api/financial/temporary-orders'],
    refetchInterval: 30000
  });

  const { data: orphanedResponse, isLoading: orphanedLoading } = useQuery<{orders: FinancialOrder[], totalOrphaned: number}>({
    queryKey: ['/api/financial/orphaned-orders'],
    refetchInterval: 30000
  });

  const temporaryOrders = temporaryResponse?.orders || [];
  const orphanedOrders = orphanedResponse?.orders || [];
  const totalOrphaned = orphanedResponse?.totalOrphaned || 0;

  const approveOrderMutation = useMutation({
    mutationFn: (data: { orderMgmtId: number; reviewerId: number; notes?: string; excessAmount?: number }) =>
      apiRequest(`/api/finance/approve/${data.orderMgmtId}`, { method: 'POST', body: data }),
    onSuccess: () => {
      toast({
        title: `✅ ${t("approvalSuccess")}`,
        description: t("approvalSuccessDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/financial/pending-orders'] });
      setSelectedOrder(null);
      setApprovalNotes("");
      setExcessAmount("");
    },
    onError: (error: any) => {
      toast({
        title: `❌ ${t("approvalError")}`,
        description: error.message || t("retry"),
        variant: "destructive",
      });
    }
  });

  const repairOrphanedOrderMutation = useMutation({
    mutationFn: (customerOrderId: number) =>
      apiRequest(`/api/financial/orphaned-orders/${customerOrderId}/repair`, { method: 'POST', body: {} }),
    onSuccess: () => {
      toast({
        title: `🔧 ${t("repairSuccess")}`,
        description: t("repairSuccessDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/financial/orphaned-orders'] });
    },
    onError: (error: any) => {
      toast({
        title: `❌ ${t("repairError")}`,
        description: error.message || t("retry"),
        variant: "destructive",
      });
    }
  });

  const handleRepairOrphanedOrder = (customerOrderId: number) => {
    repairOrphanedOrderMutation.mutate(customerOrderId);
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      pending: t("awaitingReview"),
      confirmed: t("approvedBadge"),
      pending_payment: t("pendingOrders"),
      payment_uploaded: t("graceUpload"),
      financial_reviewing: t("awaitingReview"),
      financial_rejected: t("rejected"),
      warehouse_pending: t("pendingOrders"),
      warehouse_ready: t("sentToWarehouse"),
      logistics_pending: t("sentToWarehouse"),
      out_for_delivery: t("sentToWarehouse"),
      delivered: t("approvedBadge"),
      cancelled: t("rejected"),
      rejected: t("rejected"),
      payment_grace_period: t("gracePeriod"),
    };
    return statusLabels[status] || t("unknown");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: t("awaitingReview"), className: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: t("approvedBadge"), className: 'bg-blue-100 text-blue-800' },
      pending_payment: { label: t("pendingOrders"), className: 'bg-orange-100 text-orange-800' },
      payment_uploaded: { label: t("graceUpload"), className: 'bg-purple-100 text-purple-800' },
      financial_reviewing: { label: t("awaitingReview"), className: 'bg-indigo-100 text-indigo-800' },
      financial_rejected: { label: t("rejected"), className: 'bg-red-100 text-red-800' },
      warehouse_pending: { label: t("pendingOrders"), className: 'bg-teal-100 text-teal-800' },
      warehouse_ready: { label: t("sentToWarehouse"), className: 'bg-green-100 text-green-800' },
      logistics_pending: { label: t("sentToWarehouse"), className: 'bg-cyan-100 text-cyan-800' },
      out_for_delivery: { label: t("sentToWarehouse"), className: 'bg-blue-100 text-blue-800' },
      delivered: { label: t("approvedBadge"), className: 'bg-green-100 text-green-800' },
      cancelled: { label: t("rejected"), className: 'bg-gray-100 text-gray-800' },
      rejected: { label: t("rejected"), className: 'bg-red-100 text-red-800' },
      payment_grace_period: { label: t("gracePeriod"), className: 'bg-orange-100 text-orange-800' },
    };
    
    const config = statusConfig[status] || { label: t("unknown"), className: 'bg-gray-100 text-gray-800' };
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getPaymentMethodIcon = (paymentMethod: string) => {
    switch (paymentMethod) {
      case 'wallet_full':
      case 'wallet_partial':
        return <Wallet className="h-4 w-4 text-green-600" />;
      case 'online_payment':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'bank_transfer_grace':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPaymentMethodLabel = (paymentMethod?: string) => {
    switch (paymentMethod) {
      case "wallet_full":
      case "wallet_partial":
        return t("wallet");
      case "online_payment":
        return t("onlinePayment");
      case "bank_transfer_grace":
      case "bank_transfer":
        return t("bankGateway");
      default:
        return paymentMethod || t("unknown");
    }
  };

  const getPaymentMethodBadge = (paymentMethod: string) => (
    <Badge variant="secondary" className="text-xs">
      {getPaymentMethodLabel(paymentMethod)}
    </Badge>
  );

  const handleManualApproval = () => {
    if (!selectedOrder) return;

    approveOrderMutation.mutate({
      orderMgmtId: selectedOrder.id,
      reviewerId: 1, // TODO: Get from authenticated user
      notes: approvalNotes || undefined,
      excessAmount: excessAmount ? parseFloat(excessAmount) : undefined
    });
  };



  const getRemainingTime = (scheduledAt: string) => {
    if (!scheduledAt) return null;
    
    const scheduled = new Date(scheduledAt);
    const now = new Date();
    const remaining = scheduled.getTime() - now.getTime();
    
    if (remaining <= 0) return t("timeExpired");
    
    const minutes = Math.floor(remaining / (1000 * 60));
    return `${formatNumber(minutes)} ${t("minutesRemaining")}`;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
      <div className="p-6 space-y-6" dir={direction} lang={language}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">
          {t("dashboardTitle")}
        </h1>
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          {formatNumber(orders?.length || 0)} {t("pendingCount")}
        </Badge>
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <DollarSign className="h-6 w-6" />
            {t("settlementTypes")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 p-3 bg-blue-100 rounded-lg">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium text-blue-900">{t("bankGateway")}</div>
                <div className="text-xs text-blue-700">{t("autoApproval5")}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-green-100 rounded-lg">
              <Wallet className="h-5 w-5 text-green-600" />
              <div>
                {getPaymentMethodBadge("wallet_full")}
                <div className="text-xs text-green-700">{t("autoWithdrawal")}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-purple-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                {getPaymentMethodBadge("wallet_partial")}
                <div className="text-xs text-purple-700">{t("walletBank")}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-orange-100 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                {getPaymentMethodBadge("bank_transfer_grace")}
                <div className="text-xs text-orange-700">{t("bank3days")}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="pending" className="text-xs md:text-sm">
            {t("pendingOrders")} ({formatNumber(orders?.length || 0)})
          </TabsTrigger>
          <TabsTrigger value="temporary" className="text-xs md:text-sm">
            {t("temporaryOrders")} ({formatNumber(temporaryOrders?.length || 0)})
          </TabsTrigger>
          <TabsTrigger value="orphaned" className="text-xs md:text-sm">
            {t("orphanedIncomplete")} ({formatNumber(totalOrphaned)})
          </TabsTrigger>
          <TabsTrigger value="auto-approval" className="text-xs md:text-sm">
            {t("autoApproval")}
          </TabsTrigger>
          <TabsTrigger value="grace-period" className="text-xs md:text-sm">
            {t("gracePeriod")}
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-xs md:text-sm">
            {t("approvedOrders")} ({formatNumber(approvedOrders?.length || 0)})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {orders?.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {t("allProcessed")}
                </h3>
                <p className="text-gray-600">
                  {t("noPending")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[1180px] text-sm" aria-label={t("pendingOrders")}>
                <thead className="sticky top-0 z-10 bg-gray-100 text-left text-xs uppercase text-gray-700">
                  <tr>
                    <th scope="col" className="border-b px-3 py-2">{t("tableOrder")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tableCustomerContact")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tableOrderDate")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tableStatus")} / {t("tableRawStatus")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tablePaymentSource")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tableTotalWeight")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tableDelivery")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tableTimer")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tableAction")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders?.map((order) => (
                    <tr key={order.id} className={`odd:bg-white even:bg-gray-50 hover:bg-blue-50 ${selectedOrder?.id === order.id ? "bg-blue-100" : ""}`}>
                      <td className="border-b px-3 py-2 font-medium whitespace-nowrap">{t("order")} {order.orderNumber}</td>
                      <td className="border-b px-3 py-2">
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-xs text-gray-600">{order.customerEmail || "—"}</div>
                        <div className="text-xs text-gray-600">{order.customerPhone || order.shippingAddress?.phone || "—"}</div>
                      </td>
                      <td className="border-b px-3 py-2 whitespace-nowrap">{formatDate(order.createdAt, true)}</td>
                      <td className="border-b px-3 py-2"><div>{getStatusBadge(order.currentStatus)}</div><div className="text-xs text-gray-500 mt-1">{order.currentStatus}</div></td>
                      <td className="border-b px-3 py-2">
                        <div className="flex items-center gap-1">{getPaymentMethodIcon(order.paymentMethod)}{getPaymentMethodLabel(order.paymentMethod)}</div>
                        <div className="text-xs text-gray-500">{order.paymentSourceLabel || "—"}</div>
                        {parseFloat(order.walletAmountUsed || "0") > 0 && <div className="text-xs text-green-700">{t("wallet")}: {formatCurrency(order.walletAmountUsed)}</div>}
                        {parseFloat(order.bankAmountPaid || "0") > 0 && <div className="text-xs text-blue-700">{t("bankGateway")}: {formatCurrency(order.bankAmountPaid)}</div>}
                      </td>
                      <td className="border-b px-3 py-2 whitespace-nowrap">
                        <div className="font-semibold text-blue-600">{formatCurrency(order.totalAmount)}</div>
                        <div className="text-xs text-green-600">{order.totalWeight ? `${formatDecimal(order.totalWeight)} ${order.weightUnit || t("unit")}` : "—"}</div>
                        {order.financialNotes && <div className="text-xs text-blue-700">{t("note")}: {order.financialNotes}</div>}
                        {parseFloat(order.excessAmountCredited || "0") > 0 && <div className="text-xs text-green-700">{t("excessDeposit")}: {formatCurrency(order.excessAmountCredited)}</div>}
                      </td>
                      <td className="border-b px-3 py-2 max-w-[240px]">
                        <div>{order.deliveryMethod === "courier" ? t("courier") : order.deliveryMethod === "pickup" ? t("pickup") : order.deliveryMethod === "mail" ? t("mail") : order.deliveryMethod || "—"}</div>
                        {order.shippingAddress && <div className="text-xs text-gray-600">{order.shippingAddress.city} - {order.shippingAddress.address}</div>}
                      </td>
                      <td className="border-b px-3 py-2 whitespace-nowrap text-orange-600">{order.autoApprovalScheduledAt ? getRemainingTime(order.autoApprovalScheduledAt) : "—"}</td>
                      <td className="border-b px-3 py-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>{t("review")}</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="temporary" className="space-y-4">
          {temporaryLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : temporaryOrders?.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t("noTemporary")}
                </h3>
                <p className="text-gray-600">
                  {t("temporaryHelp")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[980px] text-sm" aria-label={t("temporaryOrders")}>
                <thead className="sticky top-0 z-10 bg-blue-100 text-left text-xs uppercase text-blue-900">
                  <tr>
                    <th scope="col" className="border-b px-3 py-2">{t("tableOrder")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tableCustomerContact")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tableOrderDate")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tableStatus")} / {t("tableRawStatus")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tablePaymentSource")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tableTotalWeight")}</th>
                  </tr>
                </thead>
                <tbody>
                  {temporaryOrders?.map((order) => (
                    <tr key={order.id} className="odd:bg-white even:bg-blue-50/50 hover:bg-blue-100">
                      <td className="border-b px-3 py-2 font-medium whitespace-nowrap">{t("order")} {order.orderNumber}</td>
                      <td className="border-b px-3 py-2">
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-xs text-gray-600">{order.customerEmail || "—"}</div>
                        <div className="text-xs text-gray-600">{order.customerPhone || "—"}</div>
                      </td>
                      <td className="border-b px-3 py-2 whitespace-nowrap">{formatDate(order.createdAt, true)}</td>
                      <td className="border-b px-3 py-2"><Badge className="bg-blue-100 text-blue-800 border-blue-300">{t("temporaryBadge")}</Badge><div className="text-xs text-gray-600 mt-1">{t("temporaryStatus")}</div><div className="text-xs text-gray-500">{order.currentStatus}</div></td>
                        <td className="border-b px-3 py-2"><div>{getPaymentMethodLabel(order.paymentMethod)}</div><div className="text-xs text-gray-500">{order.paymentSourceLabel || t("temporaryDesc")}</div></td>
                      <td className="border-b px-3 py-2 whitespace-nowrap"><div className="font-semibold text-blue-600">{formatCurrency(order.totalAmount)}</div><div className="text-xs text-green-600">{order.totalWeight ? `${formatDecimal(order.totalWeight)} ${order.weightUnit || t("unit")}` : "—"}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="auto-approval">
          <Card>
            <CardHeader>
              <CardTitle>{t("autoTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {(orders?.filter(order => order.isAutoApprovalEnabled) || []).length === 0 ? (
                <p className="py-8 text-center text-gray-600">{t("noAuto")}</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[980px] text-sm" aria-label={t("autoTitle")}>
                    <thead className="sticky top-0 z-10 bg-blue-100 text-left text-xs uppercase text-blue-900">
                      <tr>
                        <th scope="col" className="border-b px-3 py-2">{t("tableOrder")}</th>
                        <th scope="col" className="border-b px-3 py-2">{t("tableCustomerContact")}</th>
                        <th scope="col" className="border-b px-3 py-2">{t("tableOrderDate")}</th>
                        <th scope="col" className="border-b px-3 py-2">{t("tableStatus")} / {t("tableRawStatus")}</th>
                        <th scope="col" className="border-b px-3 py-2">{t("tablePaymentSource")}</th>
                        <th scope="col" className="border-b px-3 py-2">{t("tableTotalWeight")}</th>
                        <th scope="col" className="border-b px-3 py-2">{t("tableTimer")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders?.filter(order => order.isAutoApprovalEnabled).map((order) => (
                        <tr key={order.id} className="odd:bg-white even:bg-blue-50/50 hover:bg-blue-100">
                          <td className="border-b px-3 py-2 font-medium whitespace-nowrap">{t("order")} {order.orderNumber}</td>
                          <td className="border-b px-3 py-2"><div className="font-medium">{order.customerName}</div><div className="text-xs text-gray-600">{order.customerEmail || "—"}</div><div className="text-xs text-gray-600">{order.customerPhone || "—"}</div></td>
                          <td className="border-b px-3 py-2 whitespace-nowrap">{formatDate(order.createdAt, true)}</td>
                          <td className="border-b px-3 py-2"><div>{getStatusBadge(order.currentStatus)}</div><div className="text-xs text-gray-500 mt-1">{order.currentStatus}</div></td>
                          <td className="border-b px-3 py-2"><div>{getPaymentMethodLabel(order.paymentMethod)}</div><div className="text-xs text-gray-500">{order.paymentSourceLabel || "—"}</div></td>
                          <td className="border-b px-3 py-2 whitespace-nowrap"><div className="font-semibold text-blue-600">{formatCurrency(order.totalAmount)}</div><div className="text-xs text-green-600">{order.totalWeight ? `${formatDecimal(order.totalWeight)} ${order.weightUnit || t("unit")}` : "—"}</div></td>
                          <td className="border-b px-3 py-2 whitespace-nowrap text-orange-600">{order.autoApprovalScheduledAt ? getRemainingTime(order.autoApprovalScheduledAt) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grace-period">
          <Card>
            <CardHeader>
              <CardTitle>{t("graceTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {(orders?.filter(order => order.currentStatus === 'payment_grace_period') || []).length === 0 ? (
                <p className="py-8 text-center text-gray-600">{t("noGrace")}</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[980px] text-sm" aria-label={t("graceTitle")}>
                    <thead className="sticky top-0 z-10 bg-orange-100 text-left text-xs uppercase text-orange-900">
                      <tr>
                        <th scope="col" className="border-b px-3 py-2">{t("tableOrder")}</th>
                        <th scope="col" className="border-b px-3 py-2">{t("tableCustomerContact")}</th>
                        <th scope="col" className="border-b px-3 py-2">{t("tableOrderDate")}</th>
                        <th scope="col" className="border-b px-3 py-2">{t("tableStatus")} / {t("tableRawStatus")}</th>
                        <th scope="col" className="border-b px-3 py-2">{t("tablePaymentSource")}</th>
                        <th scope="col" className="border-b px-3 py-2">{t("tableTotalWeight")}</th>
                        <th scope="col" className="border-b px-3 py-2">{t("tableTimer")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders?.filter(order => order.currentStatus === 'payment_grace_period').map((order) => (
                        <tr key={order.id} className="odd:bg-white even:bg-orange-50/50 hover:bg-orange-100">
                          <td className="border-b px-3 py-2 font-medium whitespace-nowrap">{t("order")} {order.orderNumber}</td>
                          <td className="border-b px-3 py-2"><div className="font-medium">{order.customerName}</div><div className="text-xs text-gray-600">{order.customerEmail || "—"}</div><div className="text-xs text-gray-600">{order.customerPhone || "—"}</div></td>
                          <td className="border-b px-3 py-2 whitespace-nowrap">{formatDate(order.createdAt, true)}</td>
                          <td className="border-b px-3 py-2"><Badge className="bg-orange-100 text-orange-800">{getStatusLabel(order.currentStatus)}</Badge><div className="text-xs text-gray-600">{t("graceUpload")}</div><div className="text-xs text-gray-500">{order.currentStatus}</div></td>
                          <td className="border-b px-3 py-2"><div>{getPaymentMethodLabel(order.paymentMethod)}</div><div className="text-xs text-gray-500">{order.paymentSourceLabel || "—"}</div></td>
                          <td className="border-b px-3 py-2 whitespace-nowrap"><div className="font-semibold text-orange-600">{formatCurrency(order.totalAmount)}</div><div className="text-xs text-green-600">{order.totalWeight ? `${formatDecimal(order.totalWeight)} ${order.weightUnit || t("unit")}` : "—"}</div></td>
                          <td className="border-b px-3 py-2 whitespace-nowrap">{t("deadline")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {isLoadingApproved ? (
            <Card>
              <CardContent className="text-center py-12">
                <Timer className="h-16 w-16 text-green-500 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {t("loadingOrders")}
                </h3>
              </CardContent>
            </Card>
          ) : approvedOrders?.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {t("noApproved")}
                </h3>
                <p className="text-gray-600">
                  {t("noFinancialApproval")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[1280px] text-sm" aria-label={t("approvedOrders")}>
                <thead className="sticky top-0 z-10 bg-green-100 text-left text-xs uppercase text-green-900">
                  <tr>
                    <th scope="col" className="border-b px-3 py-2">{t("tableOrder")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tableCustomerContact")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tableOrderDate")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tableStatus")} / {t("tableRawStatus")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tablePaymentSource")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tableTotalWeight")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tableApproval")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tableInvoice")}</th>
                    <th scope="col" className="border-b px-3 py-2">{t("tableDelivery")}</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedOrders?.map((order) => (
                    <tr key={order.id} className="odd:bg-white even:bg-green-50/50 hover:bg-green-100">
                      <td className="border-b px-3 py-2 font-medium whitespace-nowrap">{t("order")} {order.orderNumber}</td>
                      <td className="border-b px-3 py-2"><div className="font-medium">{order.customerName}</div><div className="text-xs text-gray-600">{order.customerEmail || "—"}</div><div className="text-xs text-gray-600">{order.customerPhone || order.shippingAddress?.phone || "—"}</div></td>
                      <td className="border-b px-3 py-2 whitespace-nowrap">{formatDate(order.createdAt, true)}</td>
                      <td className="border-b px-3 py-2"><div>{getStatusBadge(order.currentStatus)}</div><div className="text-xs text-gray-500 mt-1">{order.currentStatus}</div></td>
                      <td className="border-b px-3 py-2"><div>{getPaymentMethodLabel(order.paymentMethod)}</div><div className="text-xs text-gray-500">{order.paymentSourceLabel || "—"}</div></td>
                      <td className="border-b px-3 py-2 whitespace-nowrap"><div className="font-semibold text-green-600">{formatCurrency(order.totalAmount)}</div><div className="text-xs text-gray-600">{order.totalWeight ? `${formatDecimal(order.totalWeight)} ${order.weightUnit || t("unit")}` : "—"}</div></td>
                      <td className="border-b px-3 py-2 whitespace-nowrap">{order.financialReviewedAt ? <><div>{formatDate(order.financialReviewedAt)}</div><div className="text-xs text-gray-600">{formatTime(order.financialReviewedAt)}</div>{order.financialNotes && <div className="text-xs text-gray-500">{t("note")}: {order.financialNotes}</div>}</> : "—"}</td>
                      <td className="border-b px-3 py-2">{order.invoiceType ? <><div>{order.invoiceType === "official_invoice" ? t("officialInvoice") : t("temporaryInvoice")}</div>{order.invoiceConvertedAt && <div className="text-xs text-gray-600">{t("conversionDate")}: {formatDate(order.invoiceConvertedAt)}</div>}</> : "—"}</td>
                      <td className="border-b px-3 py-2 max-w-[240px]">{order.shippingAddress ? <><div>{order.shippingAddress.city}</div><div className="text-xs text-gray-600">{order.shippingAddress.address}</div></> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="orphaned" className="space-y-4">
          {orphanedLoading ? (
            <Card>
              <CardContent className="text-center py-12">
                <Timer className="h-16 w-16 text-orange-500 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {t("loadingOrders")}
                </h3>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {orphanedOrders?.filter(order => 
                        order.currentStatus === 'pending' || 
                        order.currentStatus === 'confirmed' ||
                        order.currentStatus === 'pending_payment'
                      ).length || 0}
                    </div>
                    <div className="text-sm text-yellow-700 mt-1">{t("awaitingReview")}</div>
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {orphanedOrders?.filter(order => 
                        order.currentStatus === 'warehouse_ready' || 
                        order.currentStatus === 'warehouse_pending' ||
                        order.currentStatus === 'logistics_pending' ||
                        order.currentStatus === 'out_for_delivery'
                      ).length || 0}
                    </div>
                    <div className="text-sm text-green-700 mt-1">{t("sentToWarehouse")}</div>
                  </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {orphanedOrders?.filter(order => 
                        order.currentStatus === 'cancelled' || 
                        order.currentStatus === 'rejected' ||
                        order.currentStatus === 'financial_rejected'
                      ).length || 0}
                    </div>
                    <div className="text-sm text-red-700 mt-1">{t("rejected")}</div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {temporaryOrders?.length || 0}
                    </div>
                    <div className="text-sm text-blue-700 mt-1">{t("temporary")}</div>
                  </CardContent>
                </Card>
              </div>

              {totalOrphaned === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      {t("noOrphaned")}
                    </h3>
                    <p className="text-gray-600">
                      {t("allManaged")}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    {t("orphanedTitle")} ({formatNumber(totalOrphaned)} {t("orphanedCount")})
                  </h3>
                  
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[1180px] text-sm" aria-label={t("orphanedTitle")}>
                      <thead className="sticky top-0 z-10 bg-orange-100 text-left text-xs uppercase text-orange-900">
                        <tr>
                          <th scope="col" className="border-b px-3 py-2">{t("tableOrder")}</th>
                          <th scope="col" className="border-b px-3 py-2">{t("tableCustomerContact")}</th>
                          <th scope="col" className="border-b px-3 py-2">{t("tableOrderDate")}</th>
                          <th scope="col" className="border-b px-3 py-2">{t("tableStatus")} / {t("tableRawStatus")}</th>
                          <th scope="col" className="border-b px-3 py-2">{t("tablePaymentSource")}</th>
                          <th scope="col" className="border-b px-3 py-2">{t("tableTotalWeight")}</th>
                          <th scope="col" className="border-b px-3 py-2">{t("tableAction")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orphanedOrders?.map((order) => (
                          <tr key={order.id} className="odd:bg-white even:bg-orange-50/50 hover:bg-orange-100">
                            <td className="border-b px-3 py-2 font-medium whitespace-nowrap">{t("order")} {order.orderNumber}<div className="text-xs text-red-700"><Badge variant="destructive">{t("orphanBadge")}</Badge></div></td>
                            <td className="border-b px-3 py-2"><div className="font-medium">{order.customerName}</div><div className="text-xs text-gray-600">{order.customerEmail || "—"}</div><div className="text-xs text-gray-600">{order.customerPhone || "—"}</div></td>
                            <td className="border-b px-3 py-2 whitespace-nowrap">{formatDate(order.createdAt, true)}</td>
                            <td className="border-b px-3 py-2"><div>{getStatusBadge(order.currentStatus)}</div><div className="text-xs text-gray-500 mt-1">{order.currentStatus || order.status || t("unknown")}</div><div className="text-xs text-yellow-700">{t("orphanInfo")}</div></td>
                            <td className="border-b px-3 py-2"><div>{getPaymentMethodLabel(order.paymentMethod)}</div><div className="text-xs text-gray-500">{order.paymentSourceLabel || "—"}</div></td>
                            <td className="border-b px-3 py-2 whitespace-nowrap"><div className="font-semibold text-orange-600">{formatCurrency(order.totalAmount || "0")}</div><div className="text-xs text-green-600">{order.totalWeight ? `${formatDecimal(order.totalWeight)} ${order.weightUnit || t("unit")}` : "—"}</div></td>
                            <td className="border-b px-3 py-2">
                              <Button size="sm" onClick={() => handleRepairOrphanedOrder(order.id)} disabled={repairOrphanedOrderMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                                {repairOrphanedOrderMutation.isPending ? <><Timer className="h-4 w-4 mr-2 animate-spin" />{t("repairing")}</> : <><Wrench className="h-4 w-4 mr-2" />{t("repair")}</>}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {selectedOrder && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("manualApproval")} {selectedOrder.orderNumber}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("reviewNote")}:
                </label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder={t("reviewPlaceholder")}
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("excessOptional")}:
                </label>
                <Input
                  type="number"
                  value={excessAmount}
                  onChange={(e) => setExcessAmount(e.target.value)}
                  placeholder={t("excessPlaceholder")}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("excessHelp")}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleManualApproval}
                disabled={approveOrderMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {approveOrderMutation.isPending ? (
                  <>
                    <Timer className="h-4 w-4 mr-2 animate-spin" />
                    {t("processing")}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t("approveTransfer")}
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedOrder(null);
                  setApprovalNotes("");
                  setExcessAmount("");
                }}
              >
                {t("cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}