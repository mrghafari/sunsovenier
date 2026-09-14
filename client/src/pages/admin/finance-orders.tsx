import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle, Clock, CreditCard, DollarSign, RefreshCw, Timer, ChevronRight, XCircle, FileText, Eye, Download, Truck, MapPin, ZoomIn, ZoomOut, RotateCw, Move, X, Wallet, Calculator } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";

// OrderManagement interface
interface OrderManagement {
  id: number;
  customerOrderId: number;
  orderNumber: string;
  totalAmount: string;
  paymentMethod: string;
  currentStatus: string;
  createdAt: string;
  customerName?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customer?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  paymentReceiptUrl?: string;
  financialNotes?: string;
  [key: string]: any; // For additional properties
}

type PageLanguage = 'en' | 'fa' | 'ar' | 'tr';

const pageTranslations: Record<string, Record<PageLanguage, string>> = {
  unknown: { en: 'Unknown', fa: 'نامشخص', ar: 'غير معروف', tr: 'Bilinmiyor' },
  financialApproval: { en: 'Financial Approval', fa: 'تأیید مالی', ar: 'الموافقة المالية', tr: 'Finansal onay' },
  paymentReview: { en: 'Payment review and approval', fa: 'بررسی و تأیید پرداخت‌ها', ar: 'مراجعة واعتماد المدفوعات', tr: 'Ödeme inceleme ve onayı' },
  reminderSent: { en: 'Reminder sent', fa: 'یادآوری ارسال شد', ar: 'تم إرسال التذكير', tr: 'Hatırlatıcı gönderildi' },
  reminderDescription: { en: 'The reminder message was sent successfully', fa: 'پیام یادآوری با موفقیت ارسال شد', ar: 'تم إرسال رسالة التذكير بنجاح', tr: 'Hatırlatıcı mesajı başarıyla gönderildi' },
  reminderError: { en: 'Error sending reminder', fa: 'خطا در ارسال یادآوری', ar: 'خطأ في إرسال التذكير', tr: 'Hatırlatıcı gönderme hatası' },
  reminderErrorDescription: { en: 'Unable to send the reminder', fa: 'امکان ارسال یادآوری وجود ندارد', ar: 'تعذر إرسال التذكير', tr: 'Hatırlatıcı gönderilemedi' },
  orderApproved: { en: 'Order approved', fa: 'سفارش تأیید شد', ar: 'تم اعتماد الطلب', tr: 'Sipariş onaylandı' },
  orderApprovedDescription: { en: 'The order was approved and forwarded to the warehouse', fa: 'سفارش با موفقیت تأیید و به انبار ارجاع شد', ar: 'تم اعتماد الطلب وإحالته إلى المستودع', tr: 'Sipariş onaylandı ve depoya iletildi' },
  approvalError: { en: 'Error approving order', fa: 'خطا در تأیید سفارش', ar: 'خطأ في اعتماد الطلب', tr: 'Sipariş onaylama hatası' },
  approvalErrorDescription: { en: 'Unable to approve the order', fa: 'امکان تأیید سفارش وجود ندارد', ar: 'تعذر اعتماد الطلب', tr: 'Sipariş onaylanamadı' },
  orderRejected: { en: 'Order rejected', fa: 'سفارش رد شد', ar: 'تم رفض الطلب', tr: 'Sipariş reddedildi' },
  orderRejectedDescription: { en: 'The order was rejected successfully', fa: 'سفارش با موفقیت رد شد', ar: 'تم رفض الطلب بنجاح', tr: 'Sipariş başarıyla reddedildi' },
  rejectionError: { en: 'Error rejecting order', fa: 'خطا در رد سفارش', ar: 'خطأ في رفض الطلب', tr: 'Sipariş reddetme hatası' },
  rejectionErrorDescription: { en: 'Unable to reject the order', fa: 'امکان رد سفارش وجود ندارد', ar: 'تعذر رفض الطلب', tr: 'Sipariş reddedilemedi' },
  paymentsFixed: { en: 'Payments corrected', fa: 'تصحیح پرداخت‌ها انجام شد', ar: 'تم تصحيح المدفوعات', tr: 'Ödemeler düzeltildi' },
  paymentsFixedDescription: { en: '{count} payments corrected', fa: '{count} پرداخت تصحیح شد', ar: 'تم تصحيح {count} دفعة', tr: '{count} ödeme düzeltildi' },
  paymentsFixError: { en: 'Payment correction error', fa: 'خطا در بهبود پرداخت', ar: 'خطأ في تصحيح المدفوعات', tr: 'Ödeme düzeltme hatası' },
  paymentsFixErrorDescription: { en: 'Error correcting incomplete payments', fa: 'خطا در تصحیح پرداخت‌های ناتمام', ar: 'خطأ في تصحيح المدفوعات غير المكتملة', tr: 'Tamamlanmamış ödemeler düzeltilemedi' },
  refreshed: { en: 'Refreshed', fa: 'به‌روزرسانی شد', ar: 'تم التحديث', tr: 'Yenilendi' },
  refreshedDescription: { en: 'All financial information was retrieved from the server', fa: 'تمام اطلاعات مالی از سرور بازیابی شد', ar: 'تم استرجاع جميع المعلومات المالية من الخادم', tr: 'Tüm finansal bilgiler sunucudan alındı' },
  error: { en: 'Error', fa: 'خطا', ar: 'خطأ', tr: 'Hata' },
  orderDetailsError: { en: 'Unable to retrieve order details', fa: 'امکان دریافت جزئیات سفارش وجود ندارد', ar: 'تعذر الحصول على تفاصيل الطلب', tr: 'Sipariş ayrıntıları alınamadı' },
  paymentUploaded: { en: 'Awaiting financial review', fa: 'در انتظار بررسی مالی', ar: 'بانتظار المراجعة المالية', tr: 'Finansal inceleme bekleniyor' },
  financialReviewing: { en: 'Under review', fa: 'در حال بررسی', ar: 'قيد المراجعة', tr: 'İnceleniyor' },
  financialApproved: { en: 'Approved', fa: 'تأیید شده', ar: 'معتمد', tr: 'Onaylandı' },
  autoApproved: { en: 'Bank gateway approved', fa: 'تأیید درگاه بانکی', ar: 'معتمد من بوابة البنك', tr: 'Banka ağ geçidi onaylı' },
  receiptViewError: { en: 'Error displaying receipt', fa: 'خطا در نمایش رسید', ar: 'خطأ في عرض الإيصال', tr: 'Makbuz görüntüleme hatası' },
  receiptViewErrorDescription: { en: 'Unable to display the receipt', fa: 'امکان نمایش رسید وجود ندارد', ar: 'تعذر عرض الإيصال', tr: 'Makbuz görüntülenemedi' },
  receiptAccessError: { en: 'Error accessing receipt', fa: 'خطا در دسترسی به رسید', ar: 'خطأ في الوصول إلى الإيصال', tr: 'Makbuz erişim hatası' },
  serverConnectionError: { en: 'A problem occurred while connecting to the server', fa: 'مشکل در اتصال به سرور', ar: 'حدثت مشكلة أثناء الاتصال بالخادم', tr: 'Sunucu bağlantısında sorun oluştu' },
  orderNotFound: { en: 'Order not found', fa: 'سفارش یافت نشد', ar: 'لم يتم العثور على الطلب', tr: 'Sipariş bulunamadı' },
  fetchDetailsFailed: { en: 'Failed to fetch order details', fa: 'دریافت جزئیات سفارش ناموفق بود', ar: 'فشل في جلب تفاصيل الطلب', tr: 'Sipariş ayrıntıları alınamadı' },
  printError: { en: 'Print error', fa: 'خطا در چاپ', ar: 'خطأ في الطباعة', tr: 'Yazdırma hatası' },
  printErrorDescription: { en: 'Unable to print', fa: 'امکان چاپ وجود ندارد', ar: 'تعذر الطباعة', tr: 'Yazdırılamadı' },
  authChecking: { en: 'Checking authentication...', fa: 'بررسی احراز هویت...', ar: 'جارٍ التحقق من المصادقة...', tr: 'Kimlik doğrulama denetleniyor...' },
  restrictedAccess: { en: 'Restricted access', fa: 'دسترسی محدود', ar: 'الوصول مقيد', tr: 'Kısıtlı erişim' },
  adminLoginRequired: { en: 'Sign in to the administrator account to access financial approval', fa: 'برای دسترسی به تأیید مالی، ابتدا وارد حساب مدیریت شوید', ar: 'سجّل الدخول إلى حساب المسؤول للوصول إلى الموافقة المالية', tr: 'Finansal onaya erişmek için yönetici hesabında oturum açın' },
  customerAccount: { en: 'You are signed in with a customer account. Please use an administrator account.', fa: 'شما با حساب مشتری وارد شده‌اید. لطفاً از حساب مدیریت استفاده کنید.', ar: 'لقد سجلت الدخول بحساب عميل. يرجى استخدام حساب مسؤول.', tr: 'Müşteri hesabıyla giriş yaptınız. Lütfen yönetici hesabını kullanın.' },
  adminLogin: { en: 'Sign in to administrator account', fa: 'ورود به حساب مدیریت', ar: 'تسجيل الدخول إلى حساب المسؤول', tr: 'Yönetici hesabında oturum aç' },
  loading: { en: 'Loading...', fa: 'در حال بارگذاری...', ar: 'جارٍ التحميل...', tr: 'Yükleniyor...' },
  order: { en: 'Order', fa: 'سفارش', ar: 'الطلب', tr: 'Sipariş' },
  review: { en: 'Review', fa: 'بررسی', ar: 'مراجعة', tr: 'İncele' },
  details: { en: 'Details', fa: 'جزئیات', ar: 'التفاصيل', tr: 'Ayrıntılar' },
  receipt: { en: 'Receipt', fa: 'رسید', ar: 'الإيصال', tr: 'Makbuz' },
  date: { en: 'Date', fa: 'تاریخ', ar: 'التاريخ', tr: 'Tarih' },
  transferredToWarehouse: { en: 'Transferred to warehouse', fa: 'ارجاع شده به انبار', ar: 'أحيل إلى المستودع', tr: 'Depoya aktarıldı' },
  forceRefresh: { en: 'Force refresh', fa: 'به‌روزرسانی قوی', ar: 'تحديث إجباري', tr: 'Zorla yenile' },
  walletPending: { en: 'Wallet (needs approval)', fa: 'کیف پول (نیاز به تأیید)', ar: 'المحفظة (تحتاج إلى اعتماد)', tr: 'Cüzdan (onay bekliyor)' },
  bankGateway: { en: 'Bank gateway', fa: 'درگاه بانکی', ar: 'بوابة البنك', tr: 'Banka ağ geçidi' },
  totalAmounts: { en: 'Total amounts', fa: 'مجموع مبالغ', ar: 'إجمالي المبالغ', tr: 'Toplam tutarlar' },
  transferredCount: { en: 'Transferred count', fa: 'تعداد ارجاع شده', ar: 'عدد المحال', tr: 'Aktarılan sayı' },
  pendingReview: { en: 'Awaiting review', fa: 'در انتظار بررسی', ar: 'بانتظار المراجعة', tr: 'İnceleme bekliyor' },
  transferred: { en: 'Transferred', fa: 'ارجاع شده', ar: 'مُحال', tr: 'Aktarıldı' },
  rejected: { en: 'Rejected', fa: 'رد شده', ar: 'مرفوض', tr: 'Reddedildi' },
  allReviewed: { en: 'All orders have been reviewed', fa: 'همه سفارشات بررسی شده', ar: 'تمت مراجعة جميع الطلبات', tr: 'Tüm siparişler incelendi' },
  noPendingReview: { en: 'There are currently no orders awaiting financial review', fa: 'در حال حاضر سفارشی برای بررسی مالی وجود ندارد', ar: 'لا توجد طلبات حالياً بانتظار المراجعة المالية', tr: 'Şu anda finansal inceleme bekleyen sipariş yok' },
  walletManual: { en: 'Wallet orders - manual approval required', fa: 'سفارشات کیف پول - نیاز به تأیید دستی', ar: 'طلبات المحفظة - تتطلب اعتماداً يدوياً', tr: 'Cüzdan siparişleri - manuel onay gerekli' },
  bankManual: { en: 'Bank gateway orders - manual review', fa: 'سفارشات درگاه بانکی - بررسی دستی', ar: 'طلبات بوابة البنك - مراجعة يدوية', tr: 'Banka ağ geçidi siparişleri - manuel inceleme' },
  noTransferred: { en: 'No orders transferred to the warehouse', fa: 'سفارشی به انبار ارجاع نشده', ar: 'لم تتم إحالة أي طلب إلى المستودع', tr: 'Depoya aktarılan sipariş yok' },
  noTransferredDescription: { en: 'There are currently no approved orders transferred to the warehouse', fa: 'در حال حاضر سفارش تأیید شده‌ای که به انبار ارجاع شده باشد وجود ندارد', ar: 'لا توجد حالياً طلبات معتمدة أحيلت إلى المستودع', tr: 'Şu anda depoya aktarılmış onaylı sipariş yok' },
  noRejected: { en: 'There are no rejected orders', fa: 'هیچ سفارش رد شده‌ای وجود ندارد', ar: 'لا توجد طلبات مرفوضة', tr: 'Reddedilen sipariş yok' },
  customer: { en: 'Customer', fa: 'مشتری', ar: 'العميل', tr: 'Müşteri' },
  decisionPrompt: { en: 'Please make your decision', fa: 'لطفاً تصمیم خود را اعلام کنید', ar: 'يرجى اتخاذ قرارك', tr: 'Lütfen kararınızı verin' },
  orderAmount: { en: 'Order amount', fa: 'مبلغ سفارش', ar: 'مبلغ الطلب', tr: 'Sipariş tutarı' },
  walletBalance: { en: 'Wallet balance', fa: 'موجودی کیف پول', ar: 'رصيد المحفظة', tr: 'Cüzdan bakiyesi' },
  customerWalletBalance: { en: 'Customer wallet balance', fa: 'موجودی کیف پول مشتری', ar: 'رصيد محفظة العميل', tr: 'Müşteri cüzdan bakiyesi' },
  receiptViewed: { en: 'Bank receipt viewed', fa: 'فیش بانکی مشاهده شد', ar: 'تم عرض الإيصال البنكي', tr: 'Banka makbuzu görüntülendi' },
  receiptNotViewed: { en: 'Bank receipt not viewed', fa: 'فیش بانکی مشاهده نشده', ar: 'لم يتم عرض الإيصال البنكي', tr: 'Banka makbuzu görüntülenmedi' },
  viewReceiptFirst: { en: 'View the receipt first to enable approval', fa: 'برای فعال شدن دکمه تأیید، ابتدا فیش را مشاهده کنید', ar: 'اعرض الإيصال أولاً لتفعيل زر الاعتماد', tr: 'Onayı etkinleştirmek için önce makbuzu görüntüleyin' },
  viewAgain: { en: 'View again', fa: 'مشاهده مجدد', ar: 'عرض مجدداً', tr: 'Tekrar görüntüle' },
  viewReceipt: { en: 'View receipt', fa: 'مشاهده فیش', ar: 'عرض الإيصال', tr: 'Makbuzu görüntüle' },
  walletSufficient: { en: 'Wallet balance is sufficient', fa: 'موجودی کیف پول کافی است', ar: 'رصيد المحفظة كافٍ', tr: 'Cüzdan bakiyesi yeterli' },
  walletApprovalOnly: { en: 'This order only needs management approval', fa: 'این سفارش فقط نیاز به تأیید مدیریت دارد', ar: 'هذا الطلب يحتاج فقط إلى اعتماد الإدارة', tr: 'Bu sipariş yalnızca yönetici onayı gerektiriyor' },
  walletPaymentDone: { en: 'Paid from wallet - only management approval remains', fa: 'پرداخت از کیف پول انجام شده - فقط تأیید مدیریت باقی مانده است', ar: 'تم الدفع من المحفظة - يتبقى اعتماد الإدارة فقط', tr: 'Cüzdandan ödendi - yalnızca yönetici onayı kaldı' },
  liveCalculations: { en: 'Live calculations', fa: 'محاسبات زنده', ar: 'الحسابات المباشرة', tr: 'Canlı hesaplamalar' },
  receiptAmount: { en: 'Receipt amount', fa: 'مبلغ رسید واریزی', ar: 'مبلغ الإيصال', tr: 'Makbuz tutarı' },
  shortfall: { en: 'Payment shortfall', fa: 'کسری واریزی', ar: 'عجز الدفع', tr: 'Ödeme eksikliği' },
  excess: { en: 'Excess payment', fa: 'اضافه واریزی', ar: 'الدفعة الزائدة', tr: 'Fazla ödeme' },
  walletCoverage: { en: 'Wallet coverage', fa: 'کفایت کیف پول', ar: 'كفاية المحفظة', tr: 'Cüzdan kapsamı' },
  sufficient: { en: 'Sufficient', fa: 'کافی است', ar: 'كافٍ', tr: 'Yeterli' },
  insufficient: { en: 'Insufficient', fa: 'ناکافی', ar: 'غير كافٍ', tr: 'Yetersiz' },
  extraToWallet: { en: 'The excess amount will be added to the customer wallet', fa: 'مبلغ اضافی به کیف پول مشتری اضافه خواهد شد', ar: 'سيُضاف المبلغ الزائد إلى محفظة العميل', tr: 'Fazla tutar müşterinin cüzdanına eklenecek' },
  approvalStatus: { en: 'Approval status', fa: 'وضعیت تأیید', ar: 'حالة الاعتماد', tr: 'Onay durumu' },
  approvable: { en: 'Can be approved', fa: 'قابل تأیید', ar: 'قابل للاعتماد', tr: 'Onaylanabilir' },
  notApprovable: { en: 'Cannot be approved', fa: 'غیرقابل تأیید', ar: 'غير قابل للاعتماد', tr: 'Onaylanamaz' },
  receiptAmountRequired: { en: 'Receipt amount *', fa: 'مبلغ رسید واریزی *', ar: 'مبلغ الإيصال *', tr: 'Makbuz tutarı *' },
  receiptAmountPlaceholder: { en: 'Enter the deposited amount (required)', fa: 'مبلغ واریز شده را وارد کنید (اجباری)', ar: 'أدخل المبلغ المودع (مطلوب)', tr: 'Yatırılan tutarı girin (zorunlu)' },
  receiptAmountHelp: { en: 'For a deferred bank transfer, entering the receipt amount is required', fa: 'برای حواله بانکی مدت‌دار، وارد کردن مبلغ فیش اجباری است', ar: 'بالنسبة للتحويل البنكي المؤجل، إدخال مبلغ الإيصال مطلوب', tr: 'Vadeli banka havalesi için makbuz tutarı zorunludur' },
  walletFullInfo: { en: 'Fully paid from wallet - no amount required', fa: 'پرداخت کامل از کیف پول - نیازی به وارد کردن مبلغ نیست', ar: 'دفع كامل من المحفظة - لا حاجة لإدخال مبلغ', tr: 'Cüzdandan tam ödeme - tutar girmek gerekmez' },
  walletPartialInfo: { en: 'Partially paid from wallet - amounts already calculated', fa: 'پرداخت ترکیبی از کیف پول - مبلغ‌ها قبلاً محاسبه شده', ar: 'دفع مختلط من المحفظة - تم حساب المبالغ مسبقاً', tr: 'Cüzdandan kısmi ödeme - tutarlar zaten hesaplandı' },
  onlinePaymentInfo: { en: 'Online payment - amount received from gateway', fa: 'پرداخت آنلاین - مبلغ از درگاه دریافت شده', ar: 'دفع إلكتروني - تم استلام المبلغ من البوابة', tr: 'Çevrimiçi ödeme - tutar ağ geçidinden alındı' },
  paymentConfirmedInfo: { en: 'Payment amount has already been confirmed', fa: 'مبلغ پرداخت قبلاً تأیید شده است', ar: 'تم تأكيد مبلغ الدفع مسبقاً', tr: 'Ödeme tutarı zaten onaylandı' },
  notes: { en: 'Notes', fa: 'یادداشت‌ها', ar: 'الملاحظات', tr: 'Notlar' },
  notesPlaceholder: { en: 'Enter your notes...', fa: 'یادداشت‌های خود را وارد کنید...', ar: 'أدخل ملاحظاتك...', tr: 'Notlarınızı girin...' },
  cancel: { en: 'Cancel', fa: 'انصراف', ar: 'إلغاء', tr: 'İptal' },
  reject: { en: 'Reject', fa: 'رد', ar: 'رفض', tr: 'Reddet' },
  approve: { en: 'Approve', fa: 'تأیید', ar: 'اعتماد', tr: 'Onayla' },
  receiptViewer: { en: 'View payment receipt', fa: 'مشاهده فیش پرداخت', ar: 'عرض إيصال الدفع', tr: 'Ödeme makbuzunu görüntüle' },
  zoomOut: { en: 'Zoom out', fa: 'کوچک‌تر کردن', ar: 'تصغير', tr: 'Uzaklaştır' },
  zoomIn: { en: 'Zoom in', fa: 'بزرگ‌تر کردن', ar: 'تكبير', tr: 'Yakınlaştır' },
  rotate: { en: 'Rotate 90 degrees', fa: 'چرخاندن ۹۰ درجه', ar: 'تدوير ٩٠ درجة', tr: '90 derece döndür' },
  resetView: { en: 'Reset view', fa: 'بازگشت به حالت اولیه', ar: 'إعادة ضبط العرض', tr: 'Görünümü sıfırla' },
  paymentReceipt: { en: 'Payment receipt', fa: 'فیش پرداخت', ar: 'إيصال الدفع', tr: 'Ödeme makbuzu' },
  openingPdf: { en: 'Opening PDF in a new tab...', fa: 'در حال باز کردن PDF در تب جدید...', ar: 'جارٍ فتح PDF في علامة تبويب جديدة...', tr: 'PDF yeni sekmede açılıyor...' },
  unsupportedFile: { en: 'Unsupported file type', fa: 'نوع فایل پشتیبانی نمی‌شود', ar: 'نوع الملف غير مدعوم', tr: 'Desteklenmeyen dosya türü' },
  openNewTab: { en: 'Open in new tab', fa: 'باز کردن در تب جدید', ar: 'فتح في علامة تبويب جديدة', tr: 'Yeni sekmede aç' },
  dragImage: { en: 'Drag the image to move it', fa: 'برای جابجایی تصویر آن را بکشید', ar: 'اسحب الصورة لتحريكها', tr: 'Taşımak için resmi sürükleyin' },
  customerInfo: { en: 'Customer information', fa: 'اطلاعات مشتری', ar: 'معلومات العميل', tr: 'Müşteri bilgileri' },
  name: { en: 'Name', fa: 'نام', ar: 'الاسم', tr: 'Ad' },
  email: { en: 'Email', fa: 'ایمیل', ar: 'البريد الإلكتروني', tr: 'E-posta' },
  phone: { en: 'Phone', fa: 'تلفن', ar: 'الهاتف', tr: 'Telefon' },
  walletCustomer: { en: 'Customer wallet balance', fa: 'موجودی کیف پول مشتری', ar: 'رصيد محفظة العميل', tr: 'Müşteri cüzdan bakiyesi' },
  walletFull: { en: 'Full wallet payment', fa: 'پرداخت کامل از کیف پول', ar: 'دفع كامل من المحفظة', tr: 'Tam cüzdan ödemesi' },
  walletPartial: { en: 'Partial wallet payment', fa: 'پرداخت ترکیبی از کیف پول', ar: 'دفع جزئي من المحفظة', tr: 'Kısmi cüzdan ödemesi' },
  onlinePayment: { en: 'Online payment', fa: 'پرداخت آنلاین', ar: 'دفع إلكتروني', tr: 'Çevrimiçi ödeme' },
  deliveryAddress: { en: 'Delivery address', fa: 'آدرس تحویل', ar: 'عنوان التسليم', tr: 'Teslimat adresi' },
  recipientName: { en: 'Recipient name', fa: 'نام گیرنده', ar: 'اسم المستلم', tr: 'Alıcı adı' },
  fullAddress: { en: 'Full address', fa: 'آدرس کامل', ar: 'العنوان الكامل', tr: 'Tam adres' },
  city: { en: 'City', fa: 'شهر', ar: 'المدينة', tr: 'Şehir' },
  postalCode: { en: 'Postal code', fa: 'کد پستی', ar: 'الرمز البريدي', tr: 'Posta kodu' },
  billingAddress: { en: 'Billing address', fa: 'آدرس صورتحساب', ar: 'عنوان الفوترة', tr: 'Fatura adresi' },
  customerNote: { en: 'Customer note', fa: 'یادداشت مشتری', ar: 'ملاحظة العميل', tr: 'Müşteri notu' },
  checkoutNote: { en: 'Checkout note', fa: 'یادداشت چک‌اوت', ar: 'ملاحظة الدفع', tr: 'Ödeme notu' },
  orderItems: { en: 'Order items', fa: 'اقلام سفارش', ar: 'عناصر الطلب', tr: 'Sipariş kalemleri' },
  quantity: { en: 'Quantity', fa: 'تعداد', ar: 'الكمية', tr: 'Miktar' },
  unitPrice: { en: 'Unit price', fa: 'قیمت واحد', ar: 'سعر الوحدة', tr: 'Birim fiyat' },
  total: { en: 'Total', fa: 'مجموع', ar: 'الإجمالي', tr: 'Toplam' },
  itemsSubtotal: { en: 'Items subtotal', fa: 'جمع کالاها', ar: 'المجموع الفرعي للعناصر', tr: 'Ürün ara toplamı' },
  shippingCost: { en: 'Shipping cost', fa: 'کرایه حمل', ar: 'تكلفة الشحن', tr: 'Kargo ücreti' },
  vat: { en: 'VAT', fa: 'مالیات بر ارزش افزوده', ar: 'ضريبة القيمة المضافة', tr: 'KDV' },
  grandTotal: { en: 'Grand total', fa: 'مجموع کل', ar: 'الإجمالي الكلي', tr: 'Genel toplam' },
  paymentMethod: { en: 'Payment method', fa: 'روش پرداخت', ar: 'طريقة الدفع', tr: 'Ödeme yöntemi' },
  deferredBankTransfer: { en: 'Deferred bank transfer', fa: 'حواله بانکی (مهلت‌دار)', ar: 'تحويل بنكي مؤجل', tr: 'Vadeli banka havalesi' },
  bankTransfer: { en: 'Bank transfer', fa: 'حواله بانکی', ar: 'تحويل بنكي', tr: 'Banka havalesi' },
  cashOnDelivery: { en: 'Cash on delivery', fa: 'پرداخت در محل', ar: 'الدفع عند الاستلام', tr: 'Kapıda ödeme' },
  print: { en: 'Print', fa: 'چاپ', ar: 'طباعة', tr: 'Yazdır' },
  sku: { en: 'SKU', fa: 'شناسه کالا', ar: 'رمز المنتج', tr: 'SKU' },
  rowNumber: { en: '#', fa: 'ردیف', ar: 'الرقم', tr: 'Sıra' },
  orderNumber: { en: 'Order number', fa: 'شماره سفارش', ar: 'رقم الطلب', tr: 'Sipariş numarası' },
  contact: { en: 'Contact', fa: 'اطلاعات تماس', ar: 'جهة الاتصال', tr: 'İletişim' },
  amountIqd: { en: 'Amount (IQD)', fa: 'مبلغ (دینار)', ar: 'المبلغ (د.ع)', tr: 'Tutar (IQD)' },
  receiptStatus: { en: 'Receipt', fa: 'رسید', ar: 'الإيصال', tr: 'Makbuz' },
  receiptAvailable: { en: 'Available', fa: 'موجود', ar: 'متوفر', tr: 'Mevcut' },
  noReceipt: { en: 'No receipt', fa: 'بدون رسید', ar: 'لا يوجد إيصال', tr: 'Makbuz yok' },
  financialNote: { en: 'Financial note', fa: 'یادداشت مالی', ar: 'الملاحظة المالية', tr: 'Finans notu' },
  status: { en: 'Status', fa: 'وضعیت', ar: 'الحالة', tr: 'Durum' },
  actions: { en: 'Actions', fa: 'عملیات', ar: 'الإجراءات', tr: 'İşlemler' },
  ordersTable: { en: 'Financial approval orders', fa: 'سفارش‌های تأیید مالی', ar: 'طلبات الموافقة المالية', tr: 'Finansal onay siparişleri' },
};

const translatePage = (language: PageLanguage, key: string) =>
  pageTranslations[key]?.[language] || pageTranslations[key]?.en || key;

// Legacy server value retained for backward-compatible payment matching.
const legacyDeferredBankTransfer = '\u0648\u0627\u0631\u06cc\u0632\u0020\u0628\u0627\u0646\u06a9\u06cc\u0020\u0628\u0627\u0020\u0645\u0647\u0644\u062a\u0020\u0033\u0020\u0631\u0648\u0632\u0647';

// Helper to get customer info safely
const getCustomerInfo = (order: any) => {
  // Try individual name fields first
  if (order.customerFirstName || order.customerLastName) {
    const nameParts = [order.customerFirstName, order.customerLastName].filter(Boolean);
    return {
      name: nameParts.join(' '),
      firstName: order.customerFirstName || '',
      lastName: order.customerLastName || '',
      email: order.customerEmail || '',
      phone: order.customerPhone || ''
    };
  }

  // Try customer object if it exists
  if (order.customer) {
    return {
      name: `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim(),
      firstName: order.customer.firstName || '',
      lastName: order.customer.lastName || '',
      email: order.customer.email || '',
      phone: order.customer.phone || ''
    };
  }

  // Try to extract from customer name field if it exists
  if (order.customerName) {
    const nameParts = order.customerName.split(' ');
    return {
      name: order.customerName,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: order.customerEmail || '',
      phone: order.customerPhone || ''
    };
  }

  // Fallback to customer object
  if (order.customer) {
    return {
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      email: order.customer.email,
      phone: order.customer.phone
    };
  }

  // Final fallback to individual fields
  return {
    firstName: order.customerFirstName || '',
    lastName: order.customerLastName || '',
    email: order.customerEmail || '',
    phone: order.customerPhone || ''
  };
};

function FinanceOrders() {
  const { language: contextLanguage, direction } = useLanguage();
  const language = (['en', 'fa', 'ar', 'tr'].includes(contextLanguage) ? contextLanguage : 'en') as PageLanguage;
  const t = (key: string) => translatePage(language, key);
  const locale = language === 'fa' ? 'fa-IR-u-ca-persian' : language === 'ar' ? 'ar-IQ-u-ca-gregory' : language === 'tr' ? 'tr-TR-u-ca-gregory' : 'en-IQ-u-ca-gregory';
  const formatNumber = (value: number, maximumFractionDigits = 0) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
  const formatDate = (value: string | Date, withTime = false) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t('unknown');
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(date);
  };
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'IQD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  const translateWithValue = (key: string, value: number) => t(key).replace('{count}', formatNumber(value));
  const formatPaymentMethod = (paymentMethod?: string) => {
    switch (paymentMethod) {
      case 'bank_transfer_grace':
      case legacyDeferredBankTransfer:
        return t('deferredBankTransfer');
      case 'bank_transfer':
        return t('bankTransfer');
      case 'cash_on_delivery':
        return t('cashOnDelivery');
      case 'wallet_full':
        return t('walletFull');
      case 'wallet_partial':
        return t('walletPartial');
      case 'online_payment':
        return t('onlinePayment');
      default:
        return paymentMethod || t('unknown');
    }
  };
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<OrderManagement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [receiptAmount, setReceiptAmount] = useState("");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletLoading, setWalletLoading] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [selectedFileMimeType, setSelectedFileMimeType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Enhanced image viewer states
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("pending");
  const [orderDetailsModalOpen, setOrderDetailsModalOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [orderDocuments, setOrderDocuments] = useState<any[]>([]);
  const [orderDetailsWalletBalance, setOrderDetailsWalletBalance] = useState<number>(0);
  const [hasViewedReceipt, setHasViewedReceipt] = useState(false);

  // Check admin authentication - MOVED to top to avoid conditional hooks
  const { data: adminUser, isLoading: isCheckingAuth, error: authError } = useQuery({
    queryKey: ['/api/admin/me'],
    queryFn: () => fetch('/api/admin/me', { credentials: 'include' }).then(res => res.json()),
    retry: false,
    staleTime: 0,
  });

  // Enable audio notifications - ALWAYS call hooks unconditionally
  const { orderCount } = useOrderNotifications({
    department: 'financial',
    enabled: Boolean(adminUser?.success) // Convert to boolean to avoid undefined
  });

  // Get orders for financial review - MOVED to top - Using global refresh control
  const { data: ordersResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/financial/orders'],
    queryFn: async () => {
      const res = await fetch('/api/financial/orders', { credentials: 'include' });
      const data = await res.json();
      return data;
    },
    enabled: Boolean(adminUser?.success), // Only run if authenticated
    staleTime: 0,
  });

  // Fetch approved orders that have been transferred to warehouse - MOVED to top
  const { data: approvedOrdersResponse, isLoading: isLoadingApproved, refetch: refetchApproved } = useQuery({
    queryKey: ['/api/financial/approved-orders'],
    queryFn: async () => {
      const res = await fetch('/api/financial/approved-orders', { credentials: 'include' });
      const data = await res.json();
      console.log('🔍 [APPROVED ORDERS] Raw response:', data);
      return data;
    },
    enabled: Boolean(adminUser?.success), // Only run if authenticated
    staleTime: 0,
    refetchOnWindowFocus: false, // Disable aggressive refetching
    refetchInterval: false, // Disable automatic refetch
  });

  // Fetch company information for logo - MOVED to top to avoid conditional hooks
  const { data: companyInfo } = useQuery({
    queryKey: ['/api/admin/company-information'],
    enabled: true
  });

  // Send reminder mutation - MOVED to top to avoid conditional hooks
  const sendReminderMutation = useMutation({
    mutationFn: async ({ orderId, type }: { orderId: number; type: string }) => {
      return apiRequest(`/api/finance/orders/${orderId}/reminder`, {
        method: 'POST',
        body: { type }
      });
    },
    onSuccess: () => {
      toast({
        title: t('reminderSent'),
        description: t('reminderDescription')
      });
    },
    onError: (error: any) => {
      toast({
        title: t('reminderError'),
        description: error.message || t('reminderErrorDescription'),
        variant: "destructive"
      });
    }
  });

  // Approve order mutation - MOVED to top
  const approveMutation = useMutation({
    mutationFn: async ({ orderId, notes, receiptAmount }: { orderId: number; notes: string; receiptAmount?: string }) => {
      console.log(`💰 [FINANCE] Approving order ${orderId} with notes: ${notes}`);
      return apiRequest(`/api/finance/orders/${orderId}/approve`, {
        method: 'POST',
        body: { notes, receiptAmount }
      });
    },
    onSuccess: (response) => {
      console.log(`✅ [FINANCE] Order approved successfully:`, response);
      toast({
        title: `✅ ${t('orderApproved')}`,
        description: t('orderApprovedDescription')
      });
      setDialogOpen(false);
      setSelectedOrder(null);
      setReviewNotes("");
      setReceiptAmount("");
      // Close order details modal if open
      if (orderDetailsModalOpen) {
        setOrderDetailsModalOpen(false);
        setOrderDetails(null);
      }
      // Refresh both pending and approved orders
      refetch();
      refetchApproved();
    },
    onError: (error: any) => {
      console.error(`❌ [FINANCE] Approval error:`, error);
      toast({
        title: t('approvalError'),
        description: error.message || t('approvalErrorDescription'),
        variant: "destructive"
      });
    }
  });

  // Reject order mutation - MOVED to top
  const rejectMutation = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: number; notes: string }) => {
      console.log(`❌ [FINANCE] Rejecting order ${orderId} with notes: ${notes}`);
      return apiRequest(`/api/finance/orders/${orderId}/reject`, {
        method: 'POST',
        body: { notes }
      });
    },
    onSuccess: (response) => {
      console.log(`✅ [FINANCE] Order rejected successfully:`, response);
      toast({
        title: `❌ ${t('orderRejected')}`,
        description: t('orderRejectedDescription')
      });
      setDialogOpen(false);
      setSelectedOrder(null);
      setReviewNotes("");
      // Close order details modal if open
      if (orderDetailsModalOpen) {
        setOrderDetailsModalOpen(false);
        setOrderDetails(null);
      }
      // Refresh orders
      refetch();
    },
    onError: (error: any) => {
      console.error(`❌ [FINANCE] Rejection error:`, error);
      toast({
        title: t('rejectionError'),
        description: error.message || t('rejectionErrorDescription'),
        variant: "destructive"
      });
    }
  });

  // Fix pending payments mutation - MOVED to top
  const fixPendingPaymentsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/finance/fix-pending-payments', {
        method: 'POST'
      });
    },
    onSuccess: (response) => {
      toast({
        title: t('paymentsFixed'),
        description: translateWithValue('paymentsFixedDescription', response.fixed)
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: t('paymentsFixError'),
        description: error.message || t('paymentsFixErrorDescription'),
        variant: "destructive"
      });
    }
  });

  // Calculate data variables FIRST before useCallbacks that might need them
  const allOrders: OrderManagement[] = ordersResponse?.orders || [];
  // Handle both array and object response formats
  const transferredOrders: OrderManagement[] = Array.isArray(approvedOrdersResponse) 
    ? approvedOrdersResponse 
    : (approvedOrdersResponse?.orders || []);

  // ALL useCallback functions MUST be after data definitions but before early returns to maintain hook order
  
  // Force refresh function that completely clears all finance cache
  const forceRefreshFinanceOrders = useCallback(async () => {
    // Clear all finance cache first
    await queryClient.invalidateQueries({ queryKey: ['/api/financial/orders'] });
    await queryClient.removeQueries({ queryKey: ['/api/financial/orders'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/financial/approved-orders'] });
    await queryClient.removeQueries({ queryKey: ['/api/financial/approved-orders'] });
    // Then refetch both
    await refetch();
    await refetchApproved();
    toast({
      title: `🔄 ${t('refreshed')}`,
      description: t('refreshedDescription'),
    });
  }, [refetch, refetchApproved, toast]);

  // Fetch order details function for admin users
  const fetchOrderDetails = useCallback(async (orderNumber: string) => {
    try {
      // For admin users, we need to find the order by orderNumber first, then get details by ID
      const findOrderResponse = await fetch(`/api/admin/orders/find-by-number/${orderNumber}`, {
        credentials: 'include'
      });
      
      if (!findOrderResponse.ok) {
        throw new Error(t('orderNotFound'));
      }
      
      const findOrderData = await findOrderResponse.json();
      if (!findOrderData.success) {
        throw new Error(findOrderData.message || t('orderNotFound'));
      }
      
      // Now get the order details using the customer order ID
      const detailsResponse = await fetch(`/api/admin/orders/${findOrderData.order.id}/details`, {
        credentials: 'include'
      });
      
      if (!detailsResponse.ok) {
        throw new Error(t('fetchDetailsFailed'));
      }
      
      const detailsData = await detailsResponse.json();
      if (detailsData.success) {
        console.log('📋 [ORDER DETAILS] Order fetched:', detailsData.order.orderNumber);
        console.log('📋 [ORDER DETAILS] Items count:', detailsData.order.items?.length || 0);
        console.log('📋 [ORDER DETAILS] Items data:', detailsData.order.items);
        setOrderDetails(detailsData.order);
        setOrderDocuments(detailsData.documents || []);
        
        // Fetch wallet balance for this customer using customer ID
        try {
          if (detailsData.order?.customerId) {
            const walletResponse = await fetch(`/api/wallet/balance/${detailsData.order.customerId}`, {
              credentials: 'include'
            });
            if (walletResponse.ok) {
              const walletResult = await walletResponse.json();
              setOrderDetailsWalletBalance(walletResult.data?.balance || 0);
            } else {
              setOrderDetailsWalletBalance(0);
            }
          } else {
            setOrderDetailsWalletBalance(0);
          }
        } catch (walletError) {
          console.error('Error fetching wallet balance for order details:', walletError);
          setOrderDetailsWalletBalance(0);
        }
        
        setOrderDetailsModalOpen(true);
      } else {
        throw new Error(detailsData.message || t('fetchDetailsFailed'));
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast({
        variant: "destructive", 
        title: t('error'),
        description: t('orderDetailsError')
      });
    }
  }, [toast, t]);

  const loadTrackingCodes = useCallback(async (orderId?: number) => {
    if (!orderId) return;
    
    try {
      const response = await apiRequest(`/api/tracking/order/${orderId}`, { method: 'GET' });
      // setTrackingCodes(response.trackingCodes || []);
    } catch (error) {
      console.error("Error loading tracking codes:", error);
    }
  }, []);

  const handleTrackingModal = useCallback((order: OrderManagement) => {
    // setSelectedOrderForTracking(order);
    // setShowTrackingModal(true);
    // loadTrackingCodes(order.customerOrderId);
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'payment_uploaded':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">{t('paymentUploaded')}</Badge>;
      case 'finance_pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">{t('pendingReview')}</Badge>;
      case 'financial_reviewing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">{t('financialReviewing')}</Badge>;
      case 'financial_approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700">{t('financialApproved')}</Badge>;
      case 'auto_approved':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700">{t('autoApproved')}</Badge>;
      case 'finance_rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700">{t('rejected')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }, [t]);

  const handleOrderReview = useCallback(async (order: OrderManagement) => {
    setSelectedOrder(order);
    setReviewNotes(order.financialNotes || "");
    setReceiptAmount("");
    setHasViewedReceipt(false);
    setDialogOpen(true);
    
    // Fetch wallet balance for this customer - simplified and more reliable approach
    if (order.customerOrderId) {
      setWalletLoading(true);
      try {
        console.log('🔍 [WALLET DEBUG] Starting wallet fetch for order:', order.orderNumber);
        
        // Get order details to get the customer ID directly
        const orderResponse = await fetch(`/api/admin/orders/${order.customerOrderId}/details`, {
          credentials: 'include'
        });
        
        console.log('🔍 [WALLET DEBUG] Order details response status:', orderResponse.status);
        
        if (orderResponse.ok) {
          const orderData = await orderResponse.json();
          console.log('🔍 [WALLET DEBUG] Order data received:', orderData);
          console.log('🔍 [WALLET DEBUG] Order object:', orderData.order);
          console.log('🔍 [WALLET DEBUG] customerId value:', orderData.order?.customerId);
          
          if (orderData.success && orderData.order?.customerId) {
            const customerId = orderData.order.customerId;
            console.log('🔍 [WALLET DEBUG] Found customer ID:', customerId);
            
            // Get wallet balance using customer ID
            const walletResponse = await fetch(`/api/wallet/balance/${customerId}`, {
              credentials: 'include'
            });
            console.log('🔍 [WALLET DEBUG] Wallet response status:', walletResponse.status);
            
            if (walletResponse.ok) {
              const walletResult = await walletResponse.json();
              console.log('🔍 [WALLET DEBUG] Wallet result:', walletResult);
              const balance = walletResult.data?.balance || 0;
              console.log('🔍 [WALLET DEBUG] Final balance:', balance);
              setWalletBalance(balance);
            } else {
              const errorText = await walletResponse.text();
              console.error('🔍 [WALLET DEBUG] Wallet API failed:', walletResponse.status, errorText);
              setWalletBalance(0);
            }
          } else {
            console.error('🔍 [WALLET DEBUG] No customer ID in order data:', orderData);
            setWalletBalance(0);
          }
        } else {
          const errorText = await orderResponse.text();
          console.error('🔍 [WALLET DEBUG] Order details API failed:', orderResponse.status, errorText);
          setWalletBalance(0);
        }
      } catch (error) {
        console.error('🔍 [WALLET DEBUG] Exception during wallet fetch:', error);
        setWalletBalance(0);
      } finally {
        setWalletLoading(false);
      }
    } else {
      console.error('🔍 [WALLET DEBUG] No customerOrderId in order');
      setWalletBalance(0);
    }
  }, []);

  const handleApprove = useCallback(() => {
    if (!selectedOrder) return;
    // Use order_management.id (selectedOrder.id) NOT customerOrderId to avoid ID collisions
    console.log(`🔍 [FINANCE] Approving order - Management ID: ${selectedOrder.id}, Customer Order ID: ${selectedOrder.customerOrderId}`);
    approveMutation.mutate({ 
      orderId: selectedOrder.id, // Use order_management.id 
      notes: reviewNotes,
      receiptAmount: receiptAmount 
    });
  }, [selectedOrder, approveMutation, reviewNotes, receiptAmount]);

  const handleReject = useCallback(() => {
    if (!selectedOrder) return;
    // Use order_management.id (selectedOrder.id) NOT customerOrderId to avoid ID collisions
    console.log(`🔍 [FINANCE] Rejecting order - Management ID: ${selectedOrder.id}, Customer Order ID: ${selectedOrder.customerOrderId}`);
    rejectMutation.mutate({ 
      orderId: selectedOrder.id, // Use order_management.id
      notes: reviewNotes 
    });
  }, [selectedOrder, rejectMutation, reviewNotes]);

  const openImageModal = useCallback(async (imageUrl: string) => {
    console.log('🖼️ [IMAGE MODAL] Opening image modal with URL:', imageUrl);
    
    // Convert object storage URLs to proper server endpoints
    let processedUrl = imageUrl;
    if (imageUrl.includes('/.private/uploads/')) {
      // Extract the file ID from the object storage URL
      const parts = imageUrl.split('/.private/uploads/');
      if (parts.length === 2) {
        const fileId = parts[1];
        processedUrl = `/objects/uploads/${fileId}`;
        console.log('🔄 [IMAGE MODAL] Converted object storage URL to server endpoint:', processedUrl);
      }
    }
    
    // Verify image exists before opening modal
    try {
      const response = await fetch(processedUrl, { method: 'HEAD', credentials: 'include' });
      if (!response.ok) {
        console.error('❌ [IMAGE MODAL] Image not accessible:', processedUrl, 'Status:', response.status);
        toast({
          title: t('receiptViewError'),
          description: t('receiptViewErrorDescription'),
          variant: "destructive"
        });
        return;
      }
      console.log('✅ [IMAGE MODAL] Image verified accessible:', processedUrl);
    } catch (error) {
      console.error('❌ [IMAGE MODAL] Failed to verify image:', error);
      toast({
        title: t('receiptAccessError'),
        description: t('serverConnectionError'),
        variant: "destructive"
      });
      return;
    }
    
    setSelectedImageUrl(processedUrl);
    setSelectedFileMimeType("");
    setImageModalOpen(true);
    // Reset zoom and pan when opening new image
    setZoomLevel(1);
    setRotation(0);
    setPanPosition({ x: 0, y: 0 });
  }, [toast, t]);

  // Function to determine if URL is an image
  const isImageUrl = (url: string, mimeType?: string) => {
    if (mimeType) {
      return mimeType.startsWith('image/');
    }
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  // Function to determine if URL is a PDF
  const isPdfUrl = (url: string, mimeType?: string) => {
    if (mimeType) {
      return mimeType === 'application/pdf';
    }
    return /\.pdf$/i.test(url);
  };

  // Function to get file type for display
  const getFileType = (url: string, mimeType?: string) => {
    if (isImageUrl(url, mimeType)) return 'image';
    if (isPdfUrl(url, mimeType)) return 'pdf';
    return 'unknown';
  };

  // Enhanced image viewer functions
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev * 1.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.5));
  }, []);

  const handleResetView = useCallback(() => {
    setZoomLevel(1);
    setRotation(0);
    setPanPosition({ x: 0, y: 0 });
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  }, [zoomLevel, panPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, zoomLevel, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePrintOrder = useCallback(async () => {
    if (!orderDetails) return;

    // Simple print implementation
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html dir="${direction}" lang="${language}">
            <head>
              <title>${t('details')} ${t('order')} ${orderDetails.orderNumber}</title>
              <style>
                body { font-family: Arial, sans-serif; direction: ${direction}; padding: 20px; }
                .header { text-align: center; margin-bottom: 20px; }
                .info { margin: 10px 0; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
                th { background-color: #f5f5f5; }
              </style>
            </head>
            <body>
              <div class="header">
                <h2>${t('details')} ${t('order')} ${orderDetails.orderNumber}</h2>
                <p>${t('date')}: ${formatDate(new Date(), true)}</p>
              </div>
              <div class="info">
                <strong>${t('customer')}:</strong> ${orderDetails.customerName || t('unknown')}
              </div>
              <div class="info">
                <strong>${t('email')}:</strong> ${orderDetails.customerEmail || t('unknown')}
              </div>
              <div class="info">
                <strong>${t('phone')}:</strong> ${orderDetails.customerPhone || t('unknown')}
              </div>
              <table>
                <thead>
                  <tr>
                    <th>${t('orderItems')}</th>
                    <th>${t('quantity')}</th>
                    <th>${t('unitPrice')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderDetails.items?.map((item: any) => `
                    <tr>
                      <td>${item.productName || t('unknown')}</td>
                      <td>${formatNumber(Number(item.quantity || 0))}</td>
                      <td>${formatCurrency(Number(item.price || 0))}</td>
                    </tr>
                  `).join('') || `<tr><td colspan="3">${t('orderItems')}: 0</td></tr>`}
                </tbody>
              </table>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      toast({
        title: t('printError'),
        description: t('printErrorDescription'),
        variant: "destructive",
      });
    }
  }, [orderDetails, toast, t, direction, language]);

  const handleAcceptOrder = useCallback(() => {
    if (!orderDetails) return;
    
    // Find the corresponding order from allOrders using orderDetails.id (customer order ID)
    const correspondingOrder = allOrders.find(order => order.customerOrderId === orderDetails.id);
    
    if (!correspondingOrder) {
      console.error('🚫 [FINANCE] Could not find corresponding order for customer order ID:', orderDetails.id);
      return;
    }
    
    // Use order_management.id (correspondingOrder.id) NOT customerOrderId to avoid ID collisions
    console.log('🔄 [FINANCE] Accepting order from modal - Management ID:', correspondingOrder.id, 'Customer Order ID:', correspondingOrder.customerOrderId);
    approveMutation.mutate({ 
      orderId: correspondingOrder.id, // Use order_management.id to avoid ID collisions
      notes: `${t('orderApproved')} - ${formatDate(new Date())}`,
      receiptAmount: receiptAmount 
    });
    // Don't close modal here - let the mutation success handler close it
  }, [orderDetails, allOrders, approveMutation, receiptAmount, t, formatDate]);

  const handleRejectOrder = useCallback(() => {
    if (!orderDetails) return;
    
    // Find the corresponding order from allOrders using orderDetails.id (customer order ID)
    const correspondingOrder = allOrders.find(order => order.customerOrderId === orderDetails.id);
    
    if (!correspondingOrder) {
      console.error('🚫 [FINANCE] Could not find corresponding order for customer order ID:', orderDetails.id);
      return;
    }
    
    // Use order_management.id (correspondingOrder.id) NOT customerOrderId to avoid ID collisions
    console.log('🔄 [FINANCE] Rejecting order from modal - Management ID:', correspondingOrder.id, 'Customer Order ID:', correspondingOrder.customerOrderId);
    rejectMutation.mutate({ 
      orderId: correspondingOrder.id, // Use order_management.id to avoid ID collisions
      notes: `${t('orderRejected')} - ${formatDate(new Date())}`
    });
    // Don't close modal here - let the mutation success handler close it
  }, [orderDetails, allOrders, rejectMutation, t, formatDate]);

  // Early return for loading state - AFTER all hooks are called
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>{t('authChecking')}</p>
        </div>
      </div>
    );
  }

  // Early return for unauthenticated state
  if (!adminUser || !adminUser.success) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              {t('restrictedAccess')}
            </CardTitle>
            <CardDescription className="text-center">
              {t('adminLoginRequired')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="text-sm text-gray-600">
              {t('customerAccount')}
            </p>
            <Button 
              onClick={() => window.location.href = '/admin/login'} 
              className="w-full"
            >
              {t('adminLogin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter and search functionality
  const filteredOrders = allOrders.filter(order => {
    const searchMatch = !searchTerm || 
      order.customer?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerOrderId?.toString().includes(searchTerm);
    
    const statusMatch = statusFilter === "all" || order.currentStatus === statusFilter;
    
    return searchMatch && statusMatch;
  }).sort((a, b) => {
    // Show older orders first (ascending order by creation date)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // Separate pending orders by type for better organization
  const pendingOrders = filteredOrders.filter(order => 
    ['finance_pending', 'payment_uploaded', 'auto_approved'].includes(order.currentStatus)
  );
  
  const walletOrders = pendingOrders.filter(order => 
    order.paymentMethod === 'wallet_full' || order.paymentMethod === 'wallet_partial'
  );
  
  const bankOrders = pendingOrders.filter(order => 
    order.paymentMethod !== 'wallet_full' && order.paymentMethod !== 'wallet_partial'
  );

  // Filter transferred orders (chronological order: older first)
  const filteredTransferredOrders = transferredOrders.filter(order => {
    const searchMatch = !searchTerm || 
      order.customer?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerOrderId?.toString().includes(searchTerm);
    
    return searchMatch;
  }).sort((a, b) => {
    // Show older orders first (ascending order by creation date)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // Rejected orders
  const rejectedOrders = allOrders.filter(order => 
    order.currentStatus === 'finance_rejected'
  );

  // Statistics - Only calculate total for approved/transferred orders
  const totalAmount = transferredOrders.reduce((sum, order) => 
    sum + parseFloat(order.totalAmount || '0'), 0
  );
  
  const totalTransferred = filteredTransferredOrders.reduce((sum, order) => 
    sum + parseFloat(order.totalAmount || '0'), 0
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">{t('loading')}</span>
        </div>
      </div>
    );
  }

  // Excel-like table shared by pending, transferred, and rejected orders.
  const OrderTable = ({
    orders,
    readOnly = false,
    transferred = false,
  }: {
    orders: OrderManagement[];
    readOnly?: boolean;
    transferred?: boolean;
  }) => (
    <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white shadow-sm">
      <table className="w-full min-w-[1080px] table-fixed border-collapse text-sm" aria-label={t('ordersTable')}>
        <caption className="sr-only">{t('ordersTable')}</caption>
        <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 shadow-sm">
          <tr>
            <th scope="col" className="border border-slate-300 px-3 py-2 text-center font-semibold">{t('rowNumber')}</th>
            <th scope="col" className="border border-slate-300 px-3 py-2 text-start font-semibold">{t('orderNumber')}</th>
            <th scope="col" className="border border-slate-300 px-3 py-2 text-start font-semibold">{t('customer')}</th>
            <th scope="col" className="border border-slate-300 px-3 py-2 text-start font-semibold">{t('contact')}</th>
            <th scope="col" className="border border-slate-300 px-3 py-2 text-start font-semibold">{t('date')}</th>
            <th scope="col" className="border border-slate-300 px-3 py-2 text-start font-semibold">{t('paymentMethod')}</th>
            <th scope="col" className="border border-slate-300 px-3 py-2 text-end font-semibold">{t('amountIqd')}</th>
            <th scope="col" className="w-[120px] border border-slate-300 px-3 py-2 text-start font-semibold whitespace-normal break-words">{t('status')}</th>
            <th scope="col" className="border border-slate-300 px-3 py-2 text-start font-semibold">{t('receiptStatus')}</th>
            <th scope="col" className="w-[150px] border border-slate-300 px-3 py-2 text-start font-semibold whitespace-normal break-words">{t('financialNote')}</th>
            <th scope="col" className="border border-slate-300 px-3 py-2 text-start font-semibold">{t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => {
            const customerInfo = getCustomerInfo(order);
            const customerName = customerInfo.name ||
              [customerInfo.firstName, customerInfo.lastName].filter(Boolean).join(' ') ||
              t('unknown');
            const receiptUrl = order.receipt?.url || order.paymentReceiptUrl;

            return (
              <tr key={order.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50">
                <th scope="row" className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">{index + 1}</th>
                <td className="border border-slate-200 px-3 py-2 font-medium whitespace-nowrap">#{order.orderNumber}</td>
                <td className="border border-slate-200 px-3 py-2">
                  <span className="font-medium text-slate-800">{customerName}</span>
                </td>
                <td className="border border-slate-200 px-3 py-2">
                  <div className="max-w-[220px] space-y-0.5 break-words">
                    <div>{customerInfo.email || t('unknown')}</div>
                    {customerInfo.phone && <div className="text-xs text-slate-500">{customerInfo.phone}</div>}
                  </div>
                </td>
                <td className="border border-slate-200 px-3 py-2 whitespace-nowrap">{formatDate(order.createdAt)}</td>
                <td className="border border-slate-200 px-3 py-2">{formatPaymentMethod(order.paymentMethod)}</td>
                <td className="border border-slate-200 px-3 py-2 text-end font-semibold whitespace-nowrap">
                  {formatCurrency(parseFloat(order.totalAmount || '0'))}
                </td>
                <td className="w-[120px] border border-slate-200 px-3 py-2 align-top whitespace-normal break-words">
                  <div className="[&>div]:h-auto [&>div]:max-w-full [&>div]:whitespace-normal [&>div]:break-words [&>div]:text-start [&>div]:leading-5">
                    {transferred
                      ? <Badge variant="outline" className="bg-green-50 text-green-700 whitespace-normal break-words">{t('transferredToWarehouse')}</Badge>
                      : getStatusBadge(order.currentStatus)}
                  </div>
                </td>
                <td className="border border-slate-200 px-3 py-2">
                  {receiptUrl ? (
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                        <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('receiptAvailable')}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2"
                        onClick={() => openImageModal(receiptUrl)}
                        aria-label={`${t('viewReceipt')}: ${order.orderNumber}`}
                      >
                        <FileText className="h-3.5 w-3.5 me-1" aria-hidden="true" />
                        {t('receipt')}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">{t('noReceipt')}</span>
                  )}
                </td>
                <td className="w-[150px] border border-slate-200 px-3 py-2 align-top whitespace-normal">
                  <span className="block max-w-[150px] whitespace-normal break-words leading-5" title={order.financialNotes || undefined}>
                    {order.financialNotes || t('unknown')}
                  </span>
                </td>
                <td className="border border-slate-200 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-1.5 whitespace-nowrap">
                    {!readOnly && (
                      <Button size="sm" className="h-7 px-2" onClick={() => handleOrderReview(order)}>
                        {t('review')}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2"
                      onClick={() => fetchOrderDetails(order.orderNumber)}
                    >
                      <Eye className="h-3.5 w-3.5 me-1" aria-hidden="true" />
                      {t('details')}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" dir={direction}>
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">
                   {t('financialApproval')}
                </h1>
                <p className="text-gray-600 mt-1">{t('paymentReview')}</p>
              </div>
            </div>
            
            {/* Refresh Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={forceRefreshFinanceOrders}
              className="flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              <RefreshCw className="w-4 h-4" />
              {t('forceRefresh')}
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">{t('walletPending')}</p>
                  <p className="text-3xl font-bold text-white">{formatNumber(walletOrders.length)}</p>
                </div>
                <Timer className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">{t('bankGateway')}</p>
                  <p className="text-3xl font-bold text-white">{formatNumber(bankOrders.length)}</p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm font-medium">{t('totalAmounts')}</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-indigo-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">{t('transferredCount')}</p>
                  <p className="text-3xl font-bold text-white">{formatNumber(transferredOrders.length)}</p>
                </div>
                <Truck className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different order states */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">{t('pendingReview')} ({formatNumber(pendingOrders.length)})</TabsTrigger>
            <TabsTrigger value="transferred">{t('transferred')} ({formatNumber(transferredOrders.length)})</TabsTrigger>
            <TabsTrigger value="rejected">{t('rejected')} ({formatNumber(rejectedOrders.length)})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingOrders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('allReviewed')}</h3>
                  <p className="text-gray-500">{t('noPendingReview')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Wallet Orders Section */}
                {walletOrders.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <h3 className="font-medium text-green-800">{t('walletManual')}</h3>
                    </div>
                    <OrderTable orders={walletOrders} />
                  </div>
                )}

                {/* Bank Orders Section */}
                {bankOrders.length > 0 && (
                  <div className="space-y-4">
                    {walletOrders.length > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h3 className="font-medium text-blue-800">{t('bankManual')}</h3>
                      </div>
                    )}
                    <OrderTable orders={bankOrders} />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transferred" className="space-y-4">
            {filteredTransferredOrders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <ChevronRight className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noTransferred')}</h3>
                  <p className="text-gray-500">{t('noTransferredDescription')}</p>
                </CardContent>
              </Card>
            ) : (
              <OrderTable orders={filteredTransferredOrders} readOnly transferred />
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedOrders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noRejected')}</h3>
                </CardContent>
              </Card>
            ) : (
              <OrderTable orders={rejectedOrders} readOnly />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('review')} {t('order')} #{selectedOrder?.orderNumber}</DialogTitle>
            {selectedOrder && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg border">
                <div className="text-right text-sm text-gray-600 mb-1">{t('customer')}:</div>
                <div className="text-right font-medium text-blue-900">
                  {getCustomerInfo(selectedOrder).name}
                </div>
                <div className="text-right text-xs text-gray-500">
                  {getCustomerInfo(selectedOrder).email}
                </div>
              </div>
            )}
            <DialogDescription>
              {t('decisionPrompt')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Order and Wallet Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <Label className="font-semibold text-blue-700">{t('orderAmount')}</Label>
                </div>
                <div className="text-lg font-bold text-blue-600">
                  {selectedOrder?.totalAmount ? formatCurrency(parseFloat(selectedOrder.totalAmount)) : formatCurrency(0)}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-green-600" />
                  <Label className="font-semibold text-green-700">{t('walletBalance')}</Label>
                </div>
                <div className="text-lg font-bold text-green-600">
                  {walletLoading ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {t('loading')}
                    </div>
                  ) : (
                     formatCurrency(walletBalance)
                  )}
                </div>
              </div>
            </div>

            {/* Receipt Viewing - MUST view before approving */}
            {selectedOrder && selectedOrder.paymentReceiptUrl && (
              <div className={`p-3 rounded-lg border-2 flex items-center justify-between gap-3 ${hasViewedReceipt ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-400'}`}>
                <div className="flex items-center gap-2">
                  <FileText className={`w-5 h-5 ${hasViewedReceipt ? 'text-green-600' : 'text-orange-500'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${hasViewedReceipt ? 'text-green-700' : 'text-orange-700'}`}>
                      {hasViewedReceipt ? `✅ ${t('receiptViewed')}` : `⚠️ ${t('receiptNotViewed')}`}
                    </p>
                    {!hasViewedReceipt && (
                      <p className="text-xs text-orange-600">{t('viewReceiptFirst')}</p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={hasViewedReceipt ? "outline" : "default"}
                  className={hasViewedReceipt ? "border-green-400 text-green-700" : "bg-orange-500 hover:bg-orange-600 text-white"}
                  onClick={() => {
                    openImageModal(selectedOrder.paymentReceiptUrl!);
                    setHasViewedReceipt(true);
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  {hasViewedReceipt ? t('viewAgain') : t('viewReceipt')}
                </Button>
              </div>
            )}

            {/* Visual Hint for Sufficient Wallet Balance */}
            {selectedOrder && selectedOrder.paymentMethod === 'wallet' && walletBalance >= parseFloat(selectedOrder.totalAmount || '0') && (
              <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 shadow-lg">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="p-3 bg-green-500 rounded-full">
                    <Wallet className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-green-700 mb-2">
                      ✅ {t('walletSufficient')}
                    </h3>
                    <p className="text-lg text-green-600 font-medium">
                      {t('walletApprovalOnly')}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-white rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">{t('orderAmount')}</p>
                    <p className="text-xl font-bold text-green-700">
                       {formatCurrency(parseFloat(selectedOrder.totalAmount || '0'))}
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">{t('walletBalance')}</p>
                    <p className="text-xl font-bold text-green-700">
                       {formatCurrency(walletBalance)}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-green-100 rounded-lg text-center">
                  <p className="text-green-800 font-medium">
                     💡 {t('walletPaymentDone')}
                  </p>
                </div>
              </div>
            )}

            {/* Live Calculations - Only for bank transfer orders */}
            {receiptAmount && selectedOrder && (selectedOrder.paymentMethod === 'bank_transfer_grace' || selectedOrder.paymentMethod === legacyDeferredBankTransfer) && (
              <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                   {t('liveCalculations')}
                </h4>
                {(() => {
                  const orderTotal = parseFloat(selectedOrder.totalAmount || '0');
                  const receiptAmountNum = parseFloat(receiptAmount) || 0;
                  const shortfall = orderTotal - receiptAmountNum;
                  const excess = receiptAmountNum - orderTotal; // Excess payment
                  const canApprove = shortfall <= 0 || shortfall <= walletBalance;
                  
                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>{t('receiptAmount')}:</span>
                        <span className="font-medium">{formatCurrency(receiptAmountNum)}</span>
                      </div>
                      
                      {shortfall > 0 && (
                        <div className="flex justify-between">
                          <span>{t('shortfall')}:</span>
                          <span className="font-medium text-red-600">{formatCurrency(shortfall)}</span>
                        </div>
                      )}
                      
                      {excess > 0 && (
                        <div className="flex justify-between">
                          <span>{t('excess')}:</span>
                          <span className="font-medium text-blue-600">+{formatCurrency(excess)}</span>
                        </div>
                      )}
                      
                      {shortfall > 0 && (
                        <div className="flex justify-between">
                          <span>{t('walletCoverage')}:</span>
                          <span className={`font-medium ${canApprove ? 'text-green-600' : 'text-red-600'}`}>
                            {canApprove ? `✅ ${t('sufficient')}` : `❌ ${t('insufficient')}`}
                          </span>
                        </div>
                      )}
                      
                      {excess > 0 && (
                        <div className="p-2 bg-blue-50 rounded border-l-4 border-blue-400 mt-2">
                          <p className="text-blue-700 text-xs">
                             💰 <strong>{formatCurrency(excess)}</strong> {t('extraToWallet')}
                          </p>
                        </div>
                      )}
                      
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-semibold">
                           <span>{t('approvalStatus')}:</span>
                          <span className={canApprove ? 'text-green-600' : 'text-red-600'}>
                            {canApprove ? `✅ ${t('approvable')}` : `❌ ${t('notApprovable')}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Receipt Amount Field - ONLY for bank_transfer_grace orders */}
            {selectedOrder && (selectedOrder.paymentMethod === 'bank_transfer_grace' || selectedOrder.paymentMethod === legacyDeferredBankTransfer) ? (
              <div>
                <Label htmlFor="receiptAmount" className="text-red-600 font-semibold">
                   {t('receiptAmountRequired')}
                </Label>
                <Input 
                  id="receiptAmount"
                  type="number"
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(e.target.value)}
                   placeholder={t('receiptAmountPlaceholder')}
                  className="mt-1 border-red-300 focus:border-red-500"
                  required
                />
                <p className="text-xs text-red-500 mt-1">
                   ⚠️ {t('receiptAmountHelp')}
                </p>
              </div>
            ) : (
              <div className="p-3 bg-gray-100 rounded-lg border">
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-green-600" />
                   {selectedOrder?.paymentMethod === 'wallet_full' && t('walletFullInfo')}
                   {selectedOrder?.paymentMethod === 'wallet_partial' && t('walletPartialInfo')}
                   {selectedOrder?.paymentMethod === 'online_payment' && t('onlinePaymentInfo')}
                   {!['wallet_full', 'wallet_partial', 'online_payment', 'bank_transfer_grace', legacyDeferredBankTransfer].includes(selectedOrder?.paymentMethod || '') && t('paymentConfirmedInfo')}
                </p>
              </div>
            )}
            
            <div>
              <Label htmlFor="notes">{t('notes')}</Label>
              <Textarea 
                id="notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={t('notesPlaceholder')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              {t('reject')}
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={(() => {
                if (!selectedOrder) return true;

                // Must view receipt before approving if one exists
                if (selectedOrder.paymentReceiptUrl && !hasViewedReceipt) return true;

                const isBankTransfer = selectedOrder.paymentMethod === 'bank_transfer_grace' || selectedOrder.paymentMethod === legacyDeferredBankTransfer;
                
                // For bank transfer: require receiptAmount (check for actual numeric value)
                if (isBankTransfer) {
                  const receiptAmountNum = parseFloat(receiptAmount) || 0;
                  // Must have a positive receipt amount
                  if (receiptAmountNum <= 0) return true;
                  
                  // Check wallet coverage for shortfall
                  const orderTotal = parseFloat(selectedOrder.totalAmount || '0');
                  const shortfall = orderTotal - receiptAmountNum;
                  return shortfall > 0 && shortfall > walletBalance;
                }
                
                return false;
              })()}
              className={(() => {
                if (!selectedOrder) return "bg-green-600 hover:bg-green-700";
                const isBankTransfer = selectedOrder.paymentMethod === 'bank_transfer_grace' || selectedOrder.paymentMethod === legacyDeferredBankTransfer;
                
                if (!isBankTransfer) return "bg-green-600 hover:bg-green-700";
                
                const receiptAmountNum = parseFloat(receiptAmount) || 0;
                if (receiptAmountNum <= 0) return "";
                
                const orderTotal = parseFloat(selectedOrder.totalAmount || '0');
                const shortfall = orderTotal - receiptAmountNum;
                const canApprove = shortfall <= 0 || shortfall <= walletBalance;
                return canApprove ? "bg-green-600 hover:bg-green-700" : "";
              })()}
            >
              {t('approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Image Modal for Receipt Viewing with Zoom */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0" style={{ width: '95vw', height: '95vh' }}>
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                 {t('receiptViewer')}
              </span>
              <div className="flex items-center gap-2">
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 0.5}
                    className="h-8 w-8 p-0 hover:bg-gray-200"
                     title={t('zoomOut')}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  
                  <span className="text-xs px-2 font-mono min-w-[50px] text-center">
                     {formatNumber(Math.round(zoomLevel * 100))}%
                  </span>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 5}
                    className="h-8 w-8 p-0 hover:bg-gray-200"
                     title={t('zoomIn')}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>

                {/* Action Controls */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRotate}
                    className="h-8 w-8 p-0 hover:bg-gray-200"
                     title={t('rotate')}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetView}
                    className="h-8 w-8 p-0 hover:bg-gray-200"
                     title={t('resetView')}
                  >
                    <Move className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setImageModalOpen(false)}
                  className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div 
            className="flex-1 overflow-hidden bg-gray-50 relative"
            style={{ height: 'calc(95vh - 80px)' }}
          >
            {selectedImageUrl && (
              <>
                {getFileType(selectedImageUrl, selectedFileMimeType) === 'image' ? (
                  <div
                    className="w-full h-full flex items-center justify-center cursor-move select-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ cursor: isDragging ? 'grabbing' : (zoomLevel > 1 ? 'grab' : 'default') }}
                  >
                    <img
                      src={selectedImageUrl}
                      alt={t('paymentReceipt')}
                      className="max-w-none transition-transform duration-200"
                      style={{
                        transform: `scale(${zoomLevel}) rotate(${rotation}deg) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                        transformOrigin: 'center center'
                      }}
                      draggable={false}
                      onError={(e) => {
                        console.error('❌ [IMAGE MODAL] Failed to load image:', selectedImageUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : getFileType(selectedImageUrl, selectedFileMimeType) === 'pdf' ? (
                  <div className="w-full h-full">
                    <iframe
                      src={selectedImageUrl}
                      className="w-full h-full border-0"
                       title={`${t('paymentReceipt')} PDF`}
                      style={{
                        transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.2s ease'
                      }}
                    />
                  </div>
                ) : (
                  // If it's a PDF file but not handled above, open directly in new tab
                  isPdfUrl(selectedImageUrl, selectedFileMimeType) ? (
                    window.open(selectedImageUrl, '_blank'),
                    setImageModalOpen(false),
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center p-8">
                        <FileText className="w-16 h-16 text-green-400 mx-auto mb-4" />
                        <p className="text-lg text-gray-600">{t('openingPdf')}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center p-8">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg text-gray-600 mb-4">{t('unsupportedFile')}</p>
                        <Button
                          variant="outline"
                          onClick={() => window.open(selectedImageUrl, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          {t('openNewTab')}
                        </Button>
                      </div>
                    </div>
                  )
                )}
              </>
            )}
            
            {/* Zoom hint */}
            {zoomLevel > 1 && (
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                 {t('dragImage')}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Details Modal */}
      <Dialog open={orderDetailsModalOpen} onOpenChange={setOrderDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('details')} {t('order')} #{orderDetails?.orderNumber}</DialogTitle>
          </DialogHeader>
          
          {orderDetails && (
            <div className="space-y-6">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('customerInfo')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong>{t('name')}:</strong> {orderDetails.customerName || `${orderDetails.customer?.firstName || ''} ${orderDetails.customer?.lastName || ''}`.trim() || t('unknown')}
                    </div>
                    <div>
                      <strong>{t('email')}:</strong> {orderDetails.customerEmail || orderDetails.customer?.email || t('unknown')}
                    </div>
                    <div>
                      <strong>{t('phone')}:</strong> {orderDetails.customerPhone || orderDetails.customer?.phone || t('unknown')}
                    </div>
                    <div>
                      <strong>{t('date')}:</strong> {formatDate(orderDetails.createdAt)}
                    </div>
                  </div>
                  
                  {/* Wallet Balance Information */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-700">{t('walletCustomer')}</span>
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(orderDetailsWalletBalance)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Addresses */}
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {/* Shipping Address */}
                    {orderDetails.shippingAddress && (
                      <div>
                        <h4 className="font-semibold mb-2 text-blue-700">📍 {t('deliveryAddress')}:</h4>
                        <div className="text-sm bg-blue-50 p-3 rounded border-r-4 border-blue-500">
                          <p><strong>{t('recipientName')}:</strong> {orderDetails.shippingAddress.name}</p>
                          <p><strong>{t('phone')}:</strong> {orderDetails.shippingAddress.phone}</p>
                          <p><strong>{t('fullAddress')}:</strong> {orderDetails.shippingAddress.address}</p>
                          <p><strong>{t('city')}:</strong> {orderDetails.shippingAddress.city}</p>
                          {orderDetails.shippingAddress.postalCode && (
                            <p><strong>{t('postalCode')}:</strong> {orderDetails.shippingAddress.postalCode}</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Billing Address */}
                    {orderDetails.billingAddress && (
                      <div>
                        <h4 className="font-semibold mb-2 text-green-700">🏢 {t('billingAddress')}:</h4>
                        <div className="text-sm bg-green-50 p-3 rounded border-r-4 border-green-500">
                          <p><strong>{t('name')}:</strong> {orderDetails.billingAddress.name}</p>
                          <p><strong>{t('phone')}:</strong> {orderDetails.billingAddress.phone}</p>
                          <p><strong>{t('fullAddress')}:</strong> {orderDetails.billingAddress.address}</p>
                          <p><strong>{t('city')}:</strong> {orderDetails.billingAddress.city}</p>
                          {orderDetails.billingAddress.postalCode && (
                            <p><strong>{t('postalCode')}:</strong> {orderDetails.billingAddress.postalCode}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

               {/* Customer checkout note remains visible to the financial approval team. */}
              {(orderDetails.customerNotes || orderDetails.notes) && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-amber-800 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {t('customerNote')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white p-3 rounded border border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded text-xs font-medium">{t('customer')}</span>
                        <span className="text-xs text-amber-600">{t('checkoutNote')}</span>
                      </div>
                      <p className="text-amber-900">{orderDetails.customerNotes || orderDetails.notes}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('orderItems')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {orderDetails.items?.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded bg-gray-50">
                        <div className="flex-1">
                          <div className="font-medium">{item.productName || item.name || t('unknown')}</div>
                          {item.sku && <div className="text-sm text-gray-500">{t('sku')}: {item.sku}</div>}
                        </div>
                        <div className="text-center px-4">
                          <div className="text-sm text-gray-500">{t('quantity')}</div>
                          <div className="font-medium">{formatNumber(Number(item.quantity || 1))}</div>
                        </div>
                        <div className="text-center px-4">
                          <div className="text-sm text-gray-500">{t('unitPrice')}</div>
                          <div className="font-medium">{formatCurrency(parseFloat(item.unitPrice || item.price || 0))}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500">{t('total')}</div>
                          <div className="font-bold text-blue-600">
                            {formatCurrency(parseFloat(item.unitPrice || item.price || 0) * parseInt(item.quantity || 1))}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Order Totals */}
                    <div className="mt-4 pt-4 border-t bg-blue-50 p-4 rounded">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>{t('itemsSubtotal')}:</span>
                          <span className="font-medium">
                            {(() => {
                              const itemsTotal = orderDetails.items?.reduce((sum: number, item: any) => {
                                return sum + (parseFloat(item.unitPrice || item.price || 0) * parseInt(item.quantity || 1));
                              }, 0) || 0;
                               return formatCurrency(itemsTotal);
                             })()}
                          </span>
                        </div>
                        {orderDetails.shippingCost && parseFloat(orderDetails.shippingCost) > 0 && (
                          <div className="flex justify-between">
                            <span>{t('shippingCost')}:</span>
                            <span className="font-medium">{formatCurrency(parseFloat(orderDetails.shippingCost))}</span>
                          </div>
                        )}
                        {orderDetails.vatAmount && parseFloat(orderDetails.vatAmount) > 0 && (
                          <div className="flex justify-between">
                            <span>{t('vat')} ({formatNumber(Number(orderDetails.vatRate || 0))}%):</span>
                            <span className="font-medium">{formatCurrency(parseFloat(orderDetails.vatAmount))}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg font-bold text-blue-700 border-t pt-2">
                          <span>{t('grandTotal')}:</span>
                          <span>{formatCurrency(parseFloat(orderDetails.totalAmount || 0))}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                           <span>{t('paymentMethod')}: </span>
                          <span className="font-medium">
                            {formatPaymentMethod(orderDetails.paymentMethod)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handlePrintOrder}>
                  <Download className="w-4 h-4 mr-1" />
                  {t('print')}
                </Button>
                <Button variant="destructive" onClick={handleRejectOrder}>
                  {t('reject')}
                </Button>
                <Button onClick={handleAcceptOrder}>
                  {t('approve')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FinanceOrders;