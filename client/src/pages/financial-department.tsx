import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { Eye, CheckCircle, XCircle, Clock, DollarSign, FileText, LogOut, User, ZoomIn, ZoomOut, RotateCw, Move, X, Calculator, Wallet, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import GlobalRefreshControl from "@/components/GlobalRefreshControl";
import VatManagement from "@/components/VatManagement";
import { useLanguage } from "@/contexts/LanguageContext";

type PageLanguage = "en" | "fa" | "ar" | "tr";

const pageTranslations: Record<string, Record<PageLanguage, string>> = {
  financialApproval: { en: "Financial Approval", fa: "تایید مالی", ar: "الاعتماد المالي", tr: "Mali onay" },
  financialDescription: { en: "Review and approve customer payments and manage tax", fa: "بررسی و تایید پرداخت‌های مشتریان و مدیریت مالیات", ar: "مراجعة واعتماد مدفوعات العملاء وإدارة الضرائب", tr: "Müşteri ödemelerini inceleyin ve onaylayın, vergiyi yönetin" },
  logout: { en: "Log out", fa: "خروج", ar: "تسجيل الخروج", tr: "Çıkış yap" },
  orders: { en: "Orders", fa: "سفارشات", ar: "الطلبات", tr: "Siparişler" },
  vatManagement: { en: "Tax management (VAT)", fa: "مدیریت مالیات (VAT)", ar: "إدارة الضرائب (VAT)", tr: "Vergi yönetimi (KDV)" },
  pendingOrders: { en: "Pending orders", fa: "سفارشات در انتظار", ar: "الطلبات قيد الانتظار", tr: "Bekleyen siparişler" },
  approvedToday: { en: "Approved today", fa: "تایید شده امروز", ar: "تم اعتمادها اليوم", tr: "Bugün onaylanan" },
  rejectedToday: { en: "Rejected today", fa: "رد شده امروز", ar: "تم رفضها اليوم", tr: "Bugün reddedilen" },
  loading: { en: "Loading...", fa: "در حال بارگذاری...", ar: "جارٍ التحميل...", tr: "Yükleniyor..." },
  noPendingOrders: { en: "No pending orders", fa: "هیچ سفارشی در انتظار نیست", ar: "لا توجد طلبات قيد الانتظار", tr: "Bekleyen sipariş yok" },
  allProcessed: { en: "All financial orders have been processed", fa: "تمام سفارشات مالی پردازش شده‌اند", ar: "تمت معالجة جميع الطلبات المالية", tr: "Tüm finansal siparişler işlendi" },
  pendingFinancialReview: { en: "Pending financial review", fa: "در انتظار بررسی مالی", ar: "بانتظار المراجعة المالية", tr: "Mali inceleme bekliyor" },
  receipt: { en: "Receipt", fa: "رسید", ar: "الإيصال", tr: "Makbuz" },
  unknownCustomer: { en: "Unknown customer", fa: "نام مشتری ناشناس", ar: "عميل غير معروف", tr: "Bilinmeyen müşteri" },
  emailNotProvided: { en: "Email not provided", fa: "ایمیل ثبت نشده", ar: "لم يتم تقديم البريد الإلكتروني", tr: "E-posta belirtilmedi" },
  review: { en: "Review", fa: "بررسی", ar: "مراجعة", tr: "İncele" },
  orderReview: { en: "Review order", fa: "بررسی سفارش", ar: "مراجعة الطلب", tr: "Siparişi incele" },
  customer: { en: "Customer", fa: "مشتری", ar: "العميل", tr: "Müşteri" },
  phone: { en: "Phone", fa: "تلفن", ar: "الهاتف", tr: "Telefon" },
  phoneNotProvided: { en: "Phone number not provided", fa: "شماره تلفن ثبت نشده", ar: "لم يتم تقديم رقم الهاتف", tr: "Telefon numarası belirtilmedi" },
  dateRegistered: { en: "Date registered", fa: "تاریخ ثبت", ar: "تاريخ التسجيل", tr: "Kayıt tarihi" },
  orderAmount: { en: "Order amount", fa: "مبلغ سفارش", ar: "مبلغ الطلب", tr: "Sipariş tutarı" },
  walletImpact: { en: "Customer wallet impact", fa: "تأثیر بر کیف پول مشتری", ar: "تأثير ذلك على محفظة العميل", tr: "Müşteri cüzdanına etkisi" },
  extraDeposit: { en: "Extra deposited amount", fa: "مبلغ اضافی واریزی", ar: "المبلغ الإضافي المودع", tr: "Fazladan yatırılan tutar" },
  approvalOrder: { en: "Order approval", fa: "تأیید سفارش", ar: "اعتماد الطلب", tr: "Sipariş onayı" },
  rejectionOrder: { en: "Order rejection", fa: "رد سفارش", ar: "رفض الطلب", tr: "Sipariş reddi" },
  extraWalletAdded: { en: "The extra amount will be added to the customer's wallet", fa: "مبلغ اضافی به کیف پول مشتری اضافه می‌شود", ar: "ستتم إضافة المبلغ الإضافي إلى محفظة العميل", tr: "Fazladan tutar müşterinin cüzdanına eklenecek" },
  extraWalletNotAdded: { en: "The extra amount will not be added to the wallet", fa: "مبلغ اضافی به کیف پول اضافه نمی‌شود", ar: "لن تتم إضافة المبلغ الإضافي إلى المحفظة", tr: "Fazladan tutar cüzdana eklenmeyecek" },
  extraWalletExplanation: { en: "This order has an extra amount to be added to the wallet", fa: "این سفارش دارای مبلغ اضافی برای اضافه شدن به کیف پول است", ar: "يحتوي هذا الطلب على مبلغ إضافي ستتم إضافته إلى المحفظة", tr: "Bu siparişte cüzdana eklenecek fazladan tutar var" },
  exactPayment: { en: "No change will be made to the customer's wallet (exact payment)", fa: "هیچ تغییری در کیف پول مشتری اعمال نمی‌شود (پرداخت دقیق)", ar: "لن يطرأ أي تغيير على محفظة العميل (الدفع الدقيق)", tr: "Müşteri cüzdanında değişiklik yapılmayacak (tam ödeme)" },
  paymentReceipt: { en: "Payment receipt", fa: "فیش پرداخت", ar: "إيصال الدفع", tr: "Ödeme makbuzu" },
  receiptNotSent: { en: "Receipt not submitted", fa: "فیش ارسال نشده", ar: "لم يتم إرسال الإيصال", tr: "Makbuz gönderilmedi" },
  approvePayment: { en: "Approve payment", fa: "تایید پرداخت", ar: "اعتماد الدفع", tr: "Ödemeyi onayla" },
  rejectPayment: { en: "Reject payment", fa: "رد پرداخت", ar: "رفض الدفع", tr: "Ödemeyi reddet" },
  rejectionReason: { en: "Payment rejection reason (required - the customer will see this)", fa: "دلیل رد پرداخت (اجباری - مشتری این متن را خواهد دید)", ar: "سبب رفض الدفع (مطلوب - سيرى العميل هذا النص)", tr: "Ödeme reddi nedeni (zorunlu - müşteri bunu görecek)" },
  approvalNote: { en: "Approval note (optional)", fa: "یادداشت تایید (اختیاری)", ar: "ملاحظة الاعتماد (اختيارية)", tr: "Onay notu (isteğe bağlı)" },
  rejectionPlaceholder: { en: "Example: The payment receipt is unclear, the deposited amount is less than the order amount, or the banking details are incorrect...", fa: "مثال: فیش پرداخت نامشخص است، مبلغ واریزی کمتر از مبلغ سفارش است، اطلاعات بانکی صحیح نیست...", ar: "مثال: إيصال الدفع غير واضح، المبلغ المودع أقل من مبلغ الطلب، أو المعلومات المصرفية غير صحيحة...", tr: "Örnek: Ödeme makbuzu belirsiz, yatırılan tutar sipariş tutarından az veya banka bilgileri hatalı..." },
  approvalPlaceholder: { en: "Additional note about payment approval...", fa: "یادداشت اضافی درباره تایید پرداخت...", ar: "ملاحظة إضافية حول اعتماد الدفع...", tr: "Ödeme onayı hakkında ek not..." },
  rejectionWarning: { en: "This text will be shown to the customer as the reason for rejecting the order", fa: "این متن به عنوان دلیل رد سفارش به مشتری نمایش داده خواهد شد", ar: "سيُعرض هذا النص للعميل باعتباره سبب رفض الطلب", tr: "Bu metin müşteriye sipariş reddi nedeni olarak gösterilecek" },
  cancel: { en: "Cancel", fa: "انصراف", ar: "إلغاء", tr: "İptal" },
  processing: { en: "Processing...", fa: "در حال پردازش...", ar: "جارٍ المعالجة...", tr: "İşleniyor..." },
  finalApprove: { en: "Final approval", fa: "تایید نهایی", ar: "الاعتماد النهائي", tr: "Son onay" },
  finalReject: { en: "Final rejection", fa: "رد نهایی", ar: "الرفض النهائي", tr: "Son ret" },
  receiptViewer: { en: "Payment receipt viewer", fa: "مشاهده فیش پرداخت", ar: "عارض إيصال الدفع", tr: "Ödeme makbuzu görüntüleyici" },
  zoomOut: { en: "Zoom out", fa: "کوچک‌تر کردن", ar: "تصغير", tr: "Uzaklaştır" },
  zoomIn: { en: "Zoom in", fa: "بزرگ‌تر کردن", ar: "تكبير", tr: "Yakınlaştır" },
  rotate: { en: "Rotate 90 degrees", fa: "چرخاندن ۹۰ درجه", ar: "تدوير ٩٠ درجة", tr: "90 derece döndür" },
  resetView: { en: "Reset view", fa: "بازگشت به حالت اولیه", ar: "إعادة ضبط العرض", tr: "Görünümü sıfırla" },
  openingPdf: { en: "Opening PDF in a new tab...", fa: "در حال باز کردن PDF در تب جدید...", ar: "جارٍ فتح ملف PDF في علامة تبويب جديدة...", tr: "PDF yeni sekmede açılıyor..." },
  unsupportedFile: { en: "Unsupported file type", fa: "نوع فایل پشتیبانی نمی‌شود", ar: "نوع الملف غير مدعوم", tr: "Desteklenmeyen dosya türü" },
  openNewTab: { en: "Open in new tab", fa: "باز کردن در تب جدید", ar: "فتح في علامة تبويب جديدة", tr: "Yeni sekmede aç" },
  dragHint: { en: "Drag the image to move it", fa: "برای جابجایی تصویر آن را بکشید", ar: "اسحب الصورة لتحريكها", tr: "Taşımak için görüntüyü sürükleyin" },
  processingSuccess: { en: "Order processed successfully", fa: "سفارش با موفقیت پردازش شد", ar: "تمت معالجة الطلب بنجاح", tr: "Sipariş başarıyla işlendi" },
  approvedSent: { en: "Order approved and sent to warehouse", fa: "سفارش تایید شد و به بخش انبار ارسال شد", ar: "تم اعتماد الطلب وإرساله إلى المستودع", tr: "Sipariş onaylandı ve depoya gönderildi" },
  approvedExtra: { en: "Order approved; the extra amount was added to the customer's wallet", fa: "سفارش تایید شد و مبلغ اضافی به کیف پول مشتری اضافه شد", ar: "تم اعتماد الطلب وإضافة المبلغ الإضافي إلى محفظة العميل", tr: "Sipariş onaylandı; fazladan tutar müşterinin cüzdanına eklendi" },
  rejectedNotified: { en: "Order rejected and customer notified", fa: "سفارش رد شد و مشتری اطلاع‌رسانی شد", ar: "تم رفض الطلب وإخطار العميل", tr: "Sipariş reddedildi ve müşteriye bildirildi" },
  approvalSuccess: { en: "Approval successful", fa: "تایید موفق", ar: "تم الاعتماد بنجاح", tr: "Onay başarılı" },
  rejectionSuccess: { en: "Rejection successful", fa: "رد موفق", ar: "تم الرفض بنجاح", tr: "Ret başarılı" },
  error: { en: "Error", fa: "خطا", ar: "خطأ", tr: "Hata" },
  processError: { en: "Error processing order", fa: "خطا در پردازش سفارش", ar: "خطأ في معالجة الطلب", tr: "Sipariş işlenirken hata oluştu" },
  rejectionReasonRequired: { en: "A reason is required to reject the payment", fa: "برای رد پرداخت، ذکر دلیل اجباری است", ar: "يجب ذكر سبب لرفض الدفع", tr: "Ödemeyi reddetmek için bir neden gereklidir" },
};

const translatePage = (language: PageLanguage, key: string) =>
  pageTranslations[key]?.[language] || pageTranslations[key]?.en || key;

interface OrderManagement {
  id: number;
  customerOrderId: number;
  orderNumber?: string | null;
  currentStatus: string;
  deliveryCode: string | null;
  
  // Order Details
  totalAmount: number | string | null;
  currency: string | null;
  
  // Financial
  financialReviewerId: number | null;
  financialReviewedAt: string | null;
  financialNotes: string | null;
  paymentReceiptUrl: string | null;
  
  createdAt: string;
  updatedAt: string;
  
  // Customer info
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerEmail?: string | null;
  customer?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  
  // Receipt info
  receipt?: {
    url: string;
    fileName?: string;
    mimeType?: string;
  };
  
  // Order info
  order?: {
    totalAmount: number;
    orderItems: Array<{
      productName: string;
      quantity: number;
      price: number;
    }>;
  };
}

interface FinancialUser {
  id: number;
  username: string;
  email: string;
  department: string;
}

export default function FinancialDepartment() {
  const { language: contextLanguage, direction } = useLanguage();
  const language = (["en", "fa", "ar", "tr"].includes(contextLanguage) ? contextLanguage : "en") as PageLanguage;
  const t = (key: string) => translatePage(language, key);
  const locale = language === "fa"
    ? "fa-IR-u-ca-persian"
    : language === "ar"
      ? "ar-IQ-u-ca-gregory"
      : language === "tr"
        ? "tr-TR-u-ca-gregory"
        : "en-IQ-u-ca-gregory";
  const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);
  const formatDate = (value: string | Date, withTime = false) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("error");
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(date);
  };
  const formatCurrency = (value: number | string) => {
    const amount = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
    if (!Number.isFinite(amount)) return String(value);
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "IQD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  const [selectedOrder, setSelectedOrder] = useState<OrderManagement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");
  const [selectedFileMimeType, setSelectedFileMimeType] = useState<string>("");
  const [user, setUser] = useState<FinancialUser | null>(null);
  const [, setLocation] = useLocation();
  
  // Enhanced image viewer states
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      notes: "",
      action: "approve" as "approve" | "reject"
    }
  });

  // Check authentication and user department
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/financial/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.success && userData.user.department === 'financial') {
            setUser(userData.user);
          } else {
            setLocation('/financial/login');
          }
        } else {
          setLocation('/financial/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setLocation('/financial/login');
      }
    };

    checkAuth();
  }, [setLocation]);

  // Get refresh interval from global settings
  const getRefreshInterval = () => {
    const globalSettings = localStorage.getItem('global-refresh-settings');
    if (globalSettings) {
      const settings = JSON.parse(globalSettings);
      const financialSettings = settings.departments.financial;
      
      if (financialSettings?.autoRefresh) {
        const refreshInterval = settings.syncEnabled 
          ? settings.globalInterval 
          : financialSettings.interval;
        return refreshInterval * 1000; // Convert seconds to milliseconds
      }
    }
    return 600000; // Default 10 minutes if no settings found
  };

  // Fetch financial pending orders - only orders needing financial review
  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ["/api/financial/orders"],
    enabled: !!user,
    refetchInterval: getRefreshInterval(),
  });

  const orders = ordersData?.orders || [];

  // Process order mutation
  const processOrderMutation = useMutation({
    mutationFn: async (data: { orderId: number; action: "approve" | "reject"; notes: string }) => {
      const endpoint = data.action === 'approve' 
        ? `/api/finance/orders/${data.orderId}/approve`
        : `/api/finance/orders/${data.orderId}/reject`;
      
      return apiRequest(endpoint, 'POST', {
        notes: data.notes,
        reviewerId: user?.id
      });
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/orders"] });
      setDialogOpen(false);
      setSelectedOrder(null);
      form.reset();
      
      // Enhanced success message based on action and wallet impact
      let description = t("processingSuccess");
      
      if (variables.action === "approve" && selectedOrder?.financialNotes?.includes('مبلغ اضافی')) {
        const match = selectedOrder.financialNotes.match(/مبلغ اضافی ([\d,]+) دینار/);
        if (match) {
          const excessAmount = match[1];
          description = `${t("approvedExtra")}: ${formatCurrency(excessAmount)}`;
        }
      } else if (variables.action === "approve") {
        description = t("approvedSent");
      } else {
        description = t("rejectedNotified");
      }
      
      toast({
        title: variables.action === "approve" ? t("approvalSuccess") : t("rejectionSuccess"),
        description: description,
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: t("processError"),
        variant: "destructive",
      });
    }
  });

  const handleProcessOrder = (values: { notes: string; action: "approve" | "reject" }) => {
    if (!selectedOrder) return;
    
    // Validate rejection reason is provided for reject action
    if (values.action === "reject" && (!values.notes || values.notes.trim() === "")) {
      toast({
        title: t("error"),
        description: t("rejectionReasonRequired"),
        variant: "destructive"
      });
      return;
    }
    
    processOrderMutation.mutate({
      orderId: selectedOrder.customerOrderId,
      action: values.action,
      notes: values.notes
    });
  };

  const logout = async () => {
    try {
      await fetch('/api/financial/logout', { method: 'POST' });
      setLocation('/financial/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Function to open image modal
  const openImageModal = (imageUrl: string, mimeType?: string) => {
    setSelectedImageUrl(imageUrl);
    setSelectedFileMimeType(mimeType || "");
    setImageModalOpen(true);
    // Reset zoom and pan when opening new image
    setZoomLevel(1);
    setRotation(0);
    setPanPosition({ x: 0, y: 0 });
  };

  // Enhanced image viewer functions
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.5));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setRotation(0);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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

  if (!user) {
    return <div dir={direction} lang={language} className="flex items-center justify-center min-h-screen">{t("loading")}</div>;
  }

  return (
    <div dir={direction} lang={language} className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              {t("financialApproval")}
            </h1>
            <p className="text-lg text-gray-600 mt-2">
              {t("financialDescription")}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4" />
              <span className="text-sm">{user.username}</span>
            </div>
            <Button 
              variant="outline" 
              onClick={logout}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t("logout")}
            </Button>
          </div>
        </div>

        {/* Tabs for Financial Operations */}
        <Tabs defaultValue="orders" className="mb-6" dir={direction}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t("orders")}
            </TabsTrigger>
            <TabsTrigger value="vat" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              {t("vatManagement")}
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">{/* Move orders content here */}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("pendingOrders")}</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(orders.length)}</div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("approvedToday")}</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(0)}</div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-red-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("rejectedToday")}</CardTitle>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(0)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Refresh Control */}
            <div className="mb-6">
              <GlobalRefreshControl 
                pageName="financial"
                onRefresh={() => refetch()}
                isLoading={isLoading}
              />
            </div>

            {/* Orders List */}
            {isLoading ? (
              <div className="text-center py-8">{t("loading")}</div>
            ) : orders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">{t("noPendingOrders")}</h3>
                  <p className="text-gray-500">{t("allProcessed")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {orders.map((order: OrderManagement) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow border border-gray-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                          {order.orderNumber || `${t("orders")} #${formatNumber(order.customerOrderId)}`}
                        </Badge>
                        <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs px-1 py-0.5">
                          {t("pendingFinancialReview")}
                        </Badge>
                        {order.paymentReceiptUrl && (
                          <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs px-1 py-0.5">
                            <FileText className="w-3 h-3 mr-0.5" />
                            {t("receipt")}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 text-xs">
                            <div>
                              <span className="font-medium text-gray-900">
                                {order.customerFirstName && order.customerLastName 
                                  ? `${order.customerFirstName} ${order.customerLastName}`
                                  : t("unknownCustomer")
                                }
                              </span>
                              <span className="text-gray-500 ml-2">
                                 {order.customerEmail || t("emailNotProvided")}
                              </span>
                            </div>
                            
                            <div>
                              {order.totalAmount && (
                                <span className="font-bold text-green-600">
                                  {formatCurrency(order.totalAmount)}
                                </span>
                              )}
                              <span className="text-gray-500 ml-2">
                                 {formatDate(order.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Receipt Thumbnail - Ultra Compact */}
                          {(order.receipt?.url || order.paymentReceiptUrl) && (
                            <div 
                              className="w-8 h-8 rounded border border-gray-200 cursor-pointer hover:border-blue-400 transition-colors overflow-hidden flex items-center justify-center bg-gray-50"
                              onClick={() => {
                                const fileUrl = order.receipt?.url || order.paymentReceiptUrl!;
                                const mimeType = order.receipt?.mimeType;
                                if (isImageUrl(fileUrl, mimeType) || isPdfUrl(fileUrl, mimeType)) {
                                  openImageModal(fileUrl, mimeType);
                                } else {
                                  window.open(fileUrl, '_blank');
                                }
                              }}
                            >
                              {isImageUrl(order.receipt?.url || order.paymentReceiptUrl!, order.receipt?.mimeType) ? (
                                <img 
                                  src={order.receipt?.url || order.paymentReceiptUrl!}
                                   alt={t("paymentReceipt")}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <FileText className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                          )}
                          
                          <Button
                            onClick={() => {
                              setSelectedOrder(order);
                              setDialogOpen(true);
                            }}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1 h-8"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                             {t("review")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
              </div>
            )}
          </TabsContent>

          {/* VAT Management Tab */}
          <TabsContent value="vat">
            <VatManagement />
          </TabsContent>
        </Tabs>

        {/* Process Order Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("orderReview")} #{selectedOrder && formatNumber(selectedOrder.customerOrderId)}</DialogTitle>
            </DialogHeader>
            
            {/* Order Summary */}
            {selectedOrder && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">{t("customer")}:</span>
                    <span className="font-medium ml-2">
                      {selectedOrder.customer?.firstName && selectedOrder.customer?.lastName 
                        ? `${selectedOrder.customer.firstName} ${selectedOrder.customer.lastName}`
                        : t("unknownCustomer")
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t("phone")}:</span>
                    <span className="font-medium ml-2">
                      {selectedOrder.customer?.phone || t("phoneNotProvided")}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t("dateRegistered")}:</span>
                    <span className="font-medium ml-2">
                        {formatDate(selectedOrder.createdAt, true)}
                    </span>
                  </div>
                  {selectedOrder.totalAmount && (
                    <div>
                      <span className="text-gray-600">{t("orderAmount")}:</span>
                      <span className="font-bold text-blue-600 ml-2">
                        {formatCurrency(selectedOrder.totalAmount)}
                      </span>
                    </div>
                  )}
                  
                  {/* Wallet Impact Analysis */}
                  {selectedOrder.financialNotes && selectedOrder.financialNotes.includes('مبلغ اضافی') && (
                    <div className="col-span-2 mt-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">{t("walletImpact")}</span>
                      </div>
                      <div className="text-xs text-orange-700">
                        {(() => {
                          const match = selectedOrder.financialNotes?.match(/مبلغ اضافی ([\d,]+) دینار/);
                          if (match) {
                            const excessAmount = match[1];
                            return (
                              <div className="space-y-1">
                                <p>💰 <strong>{t("extraDeposit")}:</strong> {formatCurrency(excessAmount)}</p>
                                <p>✅ <strong>{t("approvalOrder")}:</strong> {t("extraWalletAdded")}</p>
                                <p>❌ <strong>{t("rejectionOrder")}:</strong> {t("extraWalletNotAdded")}</p>
                              </div>
                            );
                          }
                          return <p>{t("extraWalletExplanation")}</p>;
                        })()}
                      </div>
                    </div>
                  )}
                  
                  {/* Regular wallet impact when no excess */}
                  {(!selectedOrder.financialNotes || !selectedOrder.financialNotes.includes('مبلغ اضافی')) && (
                    <div className="col-span-2 mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Wallet className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">{t("walletImpact")}</span>
                      </div>
                      <p className="text-xs text-green-700">
                        ✅ <strong>{t("approvalOrder")}:</strong> {t("exactPayment")}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">{t("paymentReceipt")}:</span>
                    {(selectedOrder.receipt?.url || selectedOrder.paymentReceiptUrl) ? (
                      <div className="flex items-center gap-3 mt-2">
                        {/* Receipt Thumbnail in Modal */}
                        {isImageUrl(selectedOrder.receipt?.url || selectedOrder.paymentReceiptUrl!, selectedOrder.receipt?.mimeType) ? (
                          <div 
                            className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:border-blue-400 transition-colors"
                            onClick={() => openImageModal(selectedOrder.receipt?.url || selectedOrder.paymentReceiptUrl!, selectedOrder.receipt?.mimeType)}
                          >
                            <img 
                              src={selectedOrder.receipt?.url || selectedOrder.paymentReceiptUrl!}
                               alt={t("paymentReceipt")}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                              <ZoomIn className="w-3 h-3 text-white opacity-0 hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="w-16 h-16 rounded-lg border border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-400 bg-gray-50"
                            onClick={() => window.open(selectedOrder.receipt?.url || selectedOrder.paymentReceiptUrl!, '_blank')}
                          >
                            <FileText className="w-4 h-4 text-gray-400" />
                          </div>
                        )}

                      </div>
                    ) : (
                      <span className="text-red-600 ml-2">{t("receiptNotSent")}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleProcessOrder)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={form.watch("action") === "approve" ? "default" : "outline"}
                    onClick={() => form.setValue("action", "approve")}
                    className="h-16"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                      {t("approvePayment")}
                  </Button>
                  
                  <Button
                    type="button"
                    variant={form.watch("action") === "reject" ? "destructive" : "outline"}
                    onClick={() => form.setValue("action", "reject")}
                    className="h-16"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                      {t("rejectPayment")}
                  </Button>
                </div>
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {form.watch("action") === "reject" 
                           ? t("rejectionReason")
                           : t("approvalNote")
                        }
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={
                            form.watch("action") === "reject"
                               ? t("rejectionPlaceholder")
                               : t("approvalPlaceholder")
                          }
                          rows={4}
                          className={form.watch("action") === "reject" ? "border-red-300 focus:border-red-500" : ""}
                        />
                      </FormControl>
                      {form.watch("action") === "reject" && (
                        <div className="text-xs text-red-600 mt-1">
                           ⚠️ {t("rejectionWarning")}
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                     {t("cancel")}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={processOrderMutation.isPending}
                    className={form.watch("action") === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                  >
                    {processOrderMutation.isPending ? t("processing") :
                     form.watch("action") === "approve" ? t("finalApprove") : t("finalReject")}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Enhanced Image Modal for Receipt Viewing with Zoom */}
        <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0" style={{ width: '95vw', height: '95vh' }}>
            <DialogHeader className="p-4 pb-2 border-b">
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  {t("receiptViewer")}
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
                      title={t("zoomOut")}
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
                      title={t("zoomIn")}
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
                      title={t("rotate")}
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetView}
                      className="h-8 w-8 p-0 hover:bg-gray-200"
                      title={t("resetView")}
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
                        alt={t("paymentReceipt")}
                        className="max-w-none transition-transform duration-200"
                        style={{
                          transform: `scale(${zoomLevel}) rotate(${rotation}deg) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                          transformOrigin: 'center center'
                        }}
                        draggable={false}
                      />
                    </div>
                  ) : getFileType(selectedImageUrl, selectedFileMimeType) === 'pdf' ? (
                    <div className="w-full h-full">
                      <iframe
                        src={selectedImageUrl}
                        className="w-full h-full border-0"
                        title={`${t("paymentReceipt")} PDF`}
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
                          <p className="text-lg text-gray-600">{t("openingPdf")}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center p-8">
                          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-lg text-gray-600 mb-4">{t("unsupportedFile")}</p>
                          <Button
                            variant="outline"
                            onClick={() => window.open(selectedImageUrl, '_blank')}
                            className="flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            {t("openNewTab")}
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
                  {t("dragHint")}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}