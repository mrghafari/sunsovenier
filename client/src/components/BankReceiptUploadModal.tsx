import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, AlertCircle, Shield, Building2, X, Eye, FileText, Image } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SimpleBankReceiptUploader } from "@/components/SimpleBankReceiptUploader";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/lib/i18n";

interface BankReceiptUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  onSuccess?: () => void;
}

const RECEIPT_T = {
  en: {
    uploadSuccess: "✅ Bank receipt uploaded", uploadSuccessDesc: "Your payment receipt was submitted successfully for review",
    uploadError: "❌ Upload failed", uploadErrorDesc: "Failed to upload bank receipt",
    securityValidated: "✅ File uploaded and validated successfully",
    fileRequired: "File not uploaded", fileRequiredDesc: "Please upload your bank receipt first",
    amountRequired: "Receipt amount is required", amountRequiredDesc: "Please enter the deposited amount",
    invalidAmount: "Invalid amount", invalidAmountDesc: "Please enter a valid amount",
    submitError: "Error submitting information", submitErrorDesc: "Failed to submit bank receipt information",
    uploadedReceipt: "Bank receipt uploaded", openNewWindow: "Open in new window",
    pdfFile: "PDF file", pdfTitle: "Bank receipt PDF", receiptImage: "Receipt image",
    receiptImageAlt: "Bank receipt", imageError: "⚠️ Unable to display image",
    uploadedReceiptType: (type: string) => `Bank receipt uploaded — file type: ${type}`,
    awaitingApproval: "✅ This order already has a bank receipt and is awaiting financial approval",
    title: "Upload bank payment receipt", description: "Please upload your bank payment receipt to confirm the payment",
    loadingOrder: "Loading order information...", orderSummary: "Order summary",
    orderNumber: "Order number:", amountDue: "Amount due:",
    orderNotFound: (number: string) => `⚠️ Order ${number} was not found`,
    companyBanking: "Company banking information", loadingBanking: "Loading banking information...",
    bankName: "Bank name:", accountNumber: "Account number:", accountHolder: "Account holder:", iban: "IBAN:",
    pendingCompletion: "Pending completion", receiptAmount: "Receipt amount (required)",
    depositedAmountPlaceholder: "Deposited amount in Iraqi dinars", orderAmountDue: "Order amount due",
    dinar: "IQD", shortfall: (amount: string) => `⚠️ Shortfall: ${amount} IQD`,
    excess: (amount: string) => `💰 Excess: ${amount} IQD (will be added to your wallet)`,
    exactAmount: "✅ The amount exactly matches the amount due",
    notes: "Notes (optional)", notesPlaceholder: "Additional notes...",
    readyToSubmit: "✅ Bank receipt is ready to submit", passedSecurity: "The file passed security checks",
    processing: "Processing...", submitting: "Submitting...", submitReceipt: "Submit bank receipt",
    cancel: "Cancel", close: "Close", fallbackBank: "Iraq National Bank",
    receiptAmountNote: (amount: string) => ` | Amount: ${amount} IQD`,
  },
  ar: {
    uploadSuccess: "✅ تم رفع الإيصال البنكي", uploadSuccessDesc: "تم تسجيل إيصال الدفع وإرساله للمراجعة بنجاح",
    uploadError: "❌ فشل الرفع", uploadErrorDesc: "فشل رفع الإيصال البنكي",
    securityValidated: "✅ تم رفع الملف والتحقق منه بنجاح",
    fileRequired: "لم يتم رفع الملف", fileRequiredDesc: "يرجى رفع الإيصال البنكي أولاً",
    amountRequired: "مبلغ الإيصال مطلوب", amountRequiredDesc: "يرجى إدخال المبلغ المودع",
    invalidAmount: "مبلغ غير صالح", invalidAmountDesc: "يرجى إدخال مبلغ صحيح",
    submitError: "خطأ في تسجيل المعلومات", submitErrorDesc: "فشل تسجيل معلومات الإيصال البنكي",
    uploadedReceipt: "تم رفع الإيصال البنكي", openNewWindow: "فتح في نافذة جديدة",
    pdfFile: "ملف PDF", pdfTitle: "إيصال بنكي PDF", receiptImage: "صورة الإيصال",
    receiptImageAlt: "الإيصال البنكي", imageError: "⚠️ تعذر عرض الصورة",
    uploadedReceiptType: (type: string) => `تم رفع الإيصال البنكي — نوع الملف: ${type}`,
    awaitingApproval: "✅ يحتوي هذا الطلب على إيصال بنكي وينتظر الموافقة المالية",
    title: "رفع إيصال الدفع البنكي", description: "يرجى رفع إيصال الدفع البنكي لتأكيد الدفع",
    loadingOrder: "جاري تحميل معلومات الطلب...", orderSummary: "ملخص الطلب",
    orderNumber: "رقم الطلب:", amountDue: "المبلغ المستحق:",
    orderNotFound: (number: string) => `⚠️ لم يتم العثور على الطلب ${number}`,
    companyBanking: "معلومات الحساب البنكي للشركة", loadingBanking: "جاري تحميل المعلومات البنكية...",
    bankName: "اسم البنك:", accountNumber: "رقم الحساب:", accountHolder: "اسم صاحب الحساب:", iban: "رقم IBAN:",
    pendingCompletion: "بانتظار الإكمال", receiptAmount: "مبلغ الإيصال (مطلوب)",
    depositedAmountPlaceholder: "المبلغ المودع بالدينار العراقي", orderAmountDue: "المبلغ المستحق للطلب",
    dinar: "دينار", shortfall: (amount: string) => `⚠️ النقص: ${amount} دينار`,
    excess: (amount: string) => `💰 الزيادة: ${amount} دينار (ستضاف إلى محفظتك)`,
    exactAmount: "✅ المبلغ يطابق المبلغ المستحق تماماً",
    notes: "ملاحظات (اختياري)", notesPlaceholder: "ملاحظات إضافية...",
    readyToSubmit: "✅ الإيصال البنكي جاهز للتسجيل", passedSecurity: "اجتاز الملف فحوصات الأمان",
    processing: "جاري المعالجة...", submitting: "جاري التسجيل...", submitReceipt: "تسجيل الإيصال البنكي",
    cancel: "إلغاء", close: "إغلاق", fallbackBank: "المصرف الوطني العراقي",
    receiptAmountNote: (amount: string) => ` | المبلغ: ${amount} دينار`,
  },
  tr: {
    uploadSuccess: "✅ Banka dekontu yüklendi", uploadSuccessDesc: "Ödeme dekontunuz başarıyla kaydedildi ve incelemeye gönderildi",
    uploadError: "❌ Yükleme başarısız", uploadErrorDesc: "Banka dekontu yüklenemedi",
    securityValidated: "✅ Dosya başarıyla yüklendi ve doğrulandı",
    fileRequired: "Dosya yüklenmedi", fileRequiredDesc: "Lütfen önce banka dekontunuzu yükleyin",
    amountRequired: "Dekont tutarı gerekli", amountRequiredDesc: "Lütfen yatırılan tutarı girin",
    invalidAmount: "Geçersiz tutar", invalidAmountDesc: "Lütfen geçerli bir tutar girin",
    submitError: "Bilgiler kaydedilirken hata oluştu", submitErrorDesc: "Banka dekontu bilgileri kaydedilemedi",
    uploadedReceipt: "Banka dekontu yüklendi", openNewWindow: "Yeni pencerede aç",
    pdfFile: "PDF dosyası", pdfTitle: "Banka dekontu PDF", receiptImage: "Dekont görseli",
    receiptImageAlt: "Banka dekontu", imageError: "⚠️ Görsel görüntülenemiyor",
    uploadedReceiptType: (type: string) => `Banka dekontu yüklendi — dosya türü: ${type}`,
    awaitingApproval: "✅ Bu siparişte banka dekontu mevcut ve finansal onay bekleniyor",
    title: "Banka ödeme dekontu yükle", description: "Ödemeyi onaylamak için banka ödeme dekontunuzu yükleyin",
    loadingOrder: "Sipariş bilgileri yükleniyor...", orderSummary: "Sipariş özeti",
    orderNumber: "Sipariş numarası:", amountDue: "Ödenecek tutar:",
    orderNotFound: (number: string) => `⚠️ ${number} numaralı sipariş bulunamadı`,
    companyBanking: "Şirket banka bilgileri", loadingBanking: "Banka bilgileri yükleniyor...",
    bankName: "Banka adı:", accountNumber: "Hesap numarası:", accountHolder: "Hesap sahibi:", iban: "IBAN:",
    pendingCompletion: "Tamamlanması bekleniyor", receiptAmount: "Dekont tutarı (gerekli)",
    depositedAmountPlaceholder: "Irak dinarı cinsinden yatırılan tutar", orderAmountDue: "Siparişin ödenecek tutarı",
    dinar: "IQD", shortfall: (amount: string) => `⚠️ Eksik: ${amount} IQD`,
    excess: (amount: string) => `💰 Fazla: ${amount} IQD (cüzdanınıza eklenecek)`,
    exactAmount: "✅ Tutar, ödenecek tutarla tam olarak eşleşiyor",
    notes: "Notlar (isteğe bağlı)", notesPlaceholder: "Ek notlar...",
    readyToSubmit: "✅ Banka dekontu gönderilmeye hazır", passedSecurity: "Dosya güvenlik kontrollerinden geçti",
    processing: "İşleniyor...", submitting: "Gönderiliyor...", submitReceipt: "Banka dekontunu gönder",
    cancel: "İptal", close: "Kapat", fallbackBank: "Irak Ulusal Bankası",
    receiptAmountNote: (amount: string) => ` | Tutar: ${amount} IQD`,
  },
  fa: {
    uploadSuccess: "✅ فیش بانکی بارگذاری شد", uploadSuccessDesc: "فیش پرداخت شما با موفقیت برای بررسی ارسال شد",
    uploadError: "❌ بارگذاری ناموفق بود", uploadErrorDesc: "بارگذاری فیش بانکی انجام نشد",
    securityValidated: "✅ فایل با موفقیت بارگذاری و اعتبارسنجی شد",
    fileRequired: "فایلی بارگذاری نشده است", fileRequiredDesc: "لطفاً ابتدا فیش بانکی را بارگذاری کنید",
    amountRequired: "مبلغ فیش الزامی است", amountRequiredDesc: "لطفاً مبلغ واریزشده را وارد کنید",
    invalidAmount: "مبلغ نامعتبر است", invalidAmountDesc: "لطفاً مبلغ معتبری وارد کنید",
    submitError: "خطا در ثبت اطلاعات", submitErrorDesc: "ثبت اطلاعات فیش بانکی انجام نشد",
    uploadedReceipt: "فیش بانکی بارگذاری شده", openNewWindow: "باز کردن در پنجره جدید",
    pdfFile: "فایل PDF", pdfTitle: "PDF فیش بانکی", receiptImage: "تصویر فیش",
    receiptImageAlt: "فیش بانکی", imageError: "⚠️ نمایش تصویر ممکن نیست",
    uploadedReceiptType: (type: string) => `فیش بانکی بارگذاری شد — نوع فایل: ${type}`,
    awaitingApproval: "✅ این سفارش دارای فیش بانکی است و در انتظار تأیید مالی قرار دارد",
    title: "بارگذاری فیش پرداخت بانکی", description: "برای تأیید پرداخت، فیش بانکی خود را بارگذاری کنید",
    loadingOrder: "در حال بارگذاری اطلاعات سفارش...", orderSummary: "خلاصه سفارش",
    orderNumber: "شماره سفارش:", amountDue: "مبلغ قابل پرداخت:",
    orderNotFound: (number: string) => `⚠️ سفارش ${number} پیدا نشد`,
    companyBanking: "اطلاعات بانکی شرکت", loadingBanking: "در حال بارگذاری اطلاعات بانکی...",
    bankName: "نام بانک:", accountNumber: "شماره حساب:", accountHolder: "صاحب حساب:", iban: "شماره شبا:",
    pendingCompletion: "در انتظار تکمیل", receiptAmount: "مبلغ فیش (الزامی)",
    depositedAmountPlaceholder: "مبلغ واریزشده به دینار عراق", orderAmountDue: "مبلغ قابل پرداخت سفارش",
    dinar: "دینار", shortfall: (amount: string) => `⚠️ کسری: ${amount} دینار`,
    excess: (amount: string) => `💰 مازاد: ${amount} دینار (به کیف پول شما افزوده می‌شود)`,
    exactAmount: "✅ مبلغ دقیقاً با مبلغ قابل پرداخت برابر است",
    notes: "یادداشت (اختیاری)", notesPlaceholder: "یادداشت تکمیلی...",
    readyToSubmit: "✅ فیش بانکی آماده ثبت است", passedSecurity: "فایل بررسی‌های امنیتی را با موفقیت گذرانده است",
    processing: "در حال پردازش...", submitting: "در حال ثبت...", submitReceipt: "ثبت فیش بانکی",
    cancel: "انصراف", close: "بستن", fallbackBank: "بانک ملی عراق",
    receiptAmountNote: (amount: string) => ` | مبلغ: ${amount} دینار`,
  },
} satisfies Record<Language, object>;

export function BankReceiptUploadModal({ 
  open, 
  onOpenChange, 
  orderNumber,
  onSuccess
}: BankReceiptUploadModalProps) {
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const bt = RECEIPT_T[language];
  const queryClient = useQueryClient();
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notes, setNotes] = useState("");
  const [receiptAmount, setReceiptAmount] = useState("");
  const [securityStatus, setSecurityStatus] = useState<string>("");

  // Fetch order details
  const { data: order, isLoading: isLoadingOrder } = useQuery({
    queryKey: [`/api/customers/orders/${orderNumber}`],
    queryFn: async () => {
      const response = await apiRequest('/api/customers/orders', { method: 'GET' });
      const orders = response.orders || [];
      return orders.find((o: any) => o.orderNumber === orderNumber || o.id.toString() === orderNumber) || null;
    },
    enabled: open && !!orderNumber,
  });

  // Fetch company banking information
  const { data: companyInfo, isLoading: isLoadingCompanyInfo } = useQuery({
    queryKey: ['/api/company/banking-info'],
    queryFn: async () => {
      const response = await apiRequest('/api/company/banking-info', { method: 'GET' });
      return response.data;
    },
    enabled: open,
  });

  // Fetch customer information including wallet balance
  const { data: customer } = useQuery({
    queryKey: ['/api/customers/me'],
    queryFn: async () => {
      const response = await apiRequest('/api/customers/me', { method: 'GET' });
      return response.customer;
    },
    enabled: open,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ receiptUrl, orderId, notes }: { receiptUrl: string; orderId: string; notes: string }) => {
      const response = await apiRequest('/api/payment/upload-receipt', {
        method: 'POST',
        body: {
          receiptUrl,
          orderId,
          notes,
          securityValidated: true
        }
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: bt.uploadSuccess,
        description: bt.uploadSuccessDesc,
      });
      
      // Reset form
      setUploadedFileUrl(null);
      setUploadProgress(0);
      setNotes("");
      setReceiptAmount("");
      setSecurityStatus("");
      
      // Refresh orders data
      queryClient.invalidateQueries({ queryKey: ['/api/customers/orders'] });
      
      // Call success callback and close modal
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: bt.uploadError,
        description: error.message || bt.uploadErrorDesc,
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  // Handle upload completion
  const handleUploadComplete = (fileUrl: string) => {
    setUploadedFileUrl(fileUrl);
    setUploadProgress(100);
    setSecurityStatus(bt.securityValidated);
  };

  // Handle secure upload
  const handleSecureUpload = async () => {
    if (!uploadedFileUrl) {
      toast({
        title: bt.fileRequired,
        description: bt.fileRequiredDesc,
        variant: "destructive",
      });
      return;
    }

    if (!receiptAmount || receiptAmount.trim() === '') {
      toast({
        title: bt.amountRequired,
        description: bt.amountRequiredDesc,
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(receiptAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: bt.invalidAmount,
        description: bt.invalidAmountDesc,
        variant: "destructive",
      });
      return;
    }

    try {
      const secureObjectPath = uploadedFileUrl.split('?')[0];
      await uploadMutation.mutateAsync({
        receiptUrl: secureObjectPath,
        orderId: orderNumber,
        notes: notes + (receiptAmount ? bt.receiptAmountNote(receiptAmount) : ''),
      });
    } catch (error: any) {
      toast({
        title: bt.submitError,
        description: error.message || bt.submitErrorDesc,
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'IQD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Helper function to detect file type
  const getFileType = (filePath: string): 'pdf' | 'image' | 'unknown' => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image';
    return 'unknown';
  };

  // Helper function to render existing receipt
  const renderExistingReceipt = (receiptPath: string) => {
    const fileType = getFileType(receiptPath);
    const fullPath = receiptPath.startsWith('http') ? receiptPath : `/${receiptPath}`;
    
    return (
      <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {bt.uploadedReceipt}
          </h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(fullPath, '_blank')}
            className="text-green-700 border-green-300 hover:bg-green-100"
          >
            <Eye className="w-4 h-4 ml-2" />
            {bt.openNewWindow}
          </Button>
        </div>

        {fileType === 'pdf' ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border">
            <div className="p-4 border-b flex items-center justify-center gap-2 text-blue-700">
              <FileText className="w-6 h-6" />
              <span className="font-medium">{bt.pdfFile}</span>
            </div>
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-b-lg overflow-hidden">
              <iframe
                src={fullPath}
                className="w-full h-full"
                title={bt.pdfTitle}
              />
            </div>
          </div>
        ) : fileType === 'image' ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
            <div className="p-3 border-b flex items-center justify-center gap-2 text-green-700">
              <Image className="w-5 h-5" />
              <span className="font-medium">{bt.receiptImage}</span>
            </div>
            <div className="p-2">
              <img
                src={fullPath}
                alt={bt.receiptImageAlt}
                className="w-full h-auto max-h-96 object-contain rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'p-8 text-center text-gray-500';
                  errorDiv.textContent = bt.imageError;
                  target.parentNode?.appendChild(errorDiv);
                }}
              />
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {bt.uploadedReceiptType(receiptPath.split('.').pop()?.toUpperCase() || "FILE")}
            </p>
          </div>
        )}

        <div className="mt-3 text-xs text-green-700 dark:text-green-300">
          {bt.awaitingApproval}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            {bt.title}
          </DialogTitle>
          <DialogDescription>
            {bt.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          {isLoadingOrder ? (
            <div className="text-center py-4">{bt.loadingOrder}</div>
          ) : order ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="flex items-center gap-2 font-semibold mb-3">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                {bt.orderSummary}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="text-gray-600">{bt.orderNumber}</span>
                  <span className="font-mono ml-2">{order.orderNumber}</span>
                </div>
                <div>
                    <span className="text-gray-600">{bt.amountDue}</span>
                  <span className="font-bold ml-2 text-primary">
                    {formatCurrency(parseFloat(order.totalAmount))}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <p className="text-yellow-800 dark:text-yellow-200">
                {bt.orderNotFound(orderNumber)}
              </p>
            </div>
          )}

          {/* Banking Information */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="flex items-center gap-2 font-semibold mb-3">
              <Building2 className="w-5 h-5 text-green-600" />
              {bt.companyBanking}
            </h3>
            {isLoadingCompanyInfo ? (
              <p className="text-center text-gray-500">{bt.loadingBanking}</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="font-medium text-gray-700">{bt.bankName}</span>
                    <p className="text-gray-600">{companyInfo?.bankName || bt.fallbackBank}</p>
                </div>
                <div>
                    <span className="font-medium text-gray-700">{bt.accountNumber}</span>
                    <p className="font-mono text-gray-600">{companyInfo?.bankAccount || bt.pendingCompletion}</p>
                </div>
                <div>
                    <span className="font-medium text-gray-700">{bt.accountHolder}</span>
                    <p className="text-gray-600">{companyInfo?.bankAccountHolder || bt.pendingCompletion}</p>
                </div>
                <div>
                    <span className="font-medium text-gray-700">{bt.iban}</span>
                    <p className="font-mono text-gray-600">{companyInfo?.bankIban || bt.pendingCompletion}</p>
                </div>
              </div>
            )}
          </div>

          {/* Display Existing Receipt (if available) */}
          {order?.receiptPath && (
            <div>
              {renderExistingReceipt(order.receiptPath)}
            </div>
          )}

          {/* File Upload - Only show if no existing receipt */}
          {!order?.receiptPath && (
            <div className="border rounded-lg p-4">
              <SimpleBankReceiptUploader
                onUploadComplete={handleUploadComplete}
                maxFileSize={5 * 1024 * 1024}
                className="border-0 shadow-none"
              />

            {/* Security Status */}
            {securityStatus && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 dark:text-blue-200">{securityStatus}</p>
              </div>
            )}

            {/* Upload Success */}
            {uploadedFileUrl && (
              <div className="mt-3 flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">{bt.readyToSubmit}</p>
                  <p className="text-xs text-green-600">{bt.passedSecurity}</p>
                </div>
              </div>
            )}

            {/* Progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{bt.processing}</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}
            </div>
          )}

          {/* Receipt Amount - Only show if no existing receipt */}
          {!order?.receiptPath && (
          <div className="space-y-3">
            <Label htmlFor="receipt-amount" className="flex items-center gap-2">
              {bt.receiptAmount}
              <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  id="receipt-amount"
                  type="number"
                  placeholder={bt.depositedAmountPlaceholder}
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(e.target.value)}
                  required
                  min={order ? parseFloat(order.totalAmount) : 0}
                />
              </div>
              {order && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border">
                   <p className="text-sm text-gray-600">{bt.orderAmountDue}</p>
                  <p className="font-bold text-orange-800">
                     {parseFloat(order.totalAmount).toLocaleString()} {bt.dinar}
                  </p>
                </div>
              )}
            </div>
            
            {/* Amount validation messages */}
            {receiptAmount && order && (
              <div className="text-sm">
                {parseInt(receiptAmount) < parseFloat(order.totalAmount) ? (
                  <p className="text-orange-600">
                     {bt.shortfall((parseFloat(order.totalAmount) - parseInt(receiptAmount)).toLocaleString())}
                  </p>
                ) : parseInt(receiptAmount) > parseFloat(order.totalAmount) ? (
                  <p className="text-blue-600">
                     {bt.excess((parseInt(receiptAmount) - parseFloat(order.totalAmount)).toLocaleString())}
                  </p>
                ) : (
                   <p className="text-green-600">{bt.exactAmount}</p>
                )}
              </div>
            )}
            </div>
          )}

          {/* Notes - Only show if no existing receipt */}
          {!order?.receiptPath && (
            <div className="space-y-2">
              <Label htmlFor="notes">{bt.notes}</Label>
              <Textarea
                id="notes"
                placeholder={bt.notesPlaceholder}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Submit Button - Only show if no existing receipt */}
          {!order?.receiptPath && (
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleSecureUpload}
                disabled={!uploadedFileUrl || !receiptAmount || uploadMutation.isPending}
                className="flex-1"
                size="lg"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Shield className="w-4 h-4 ml-2 animate-spin" />
                    {bt.submitting}
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 ml-2" />
                    {bt.submitReceipt}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={uploadMutation.isPending}
              >
                <X className="w-4 h-4 ml-2" />
                {bt.cancel}
              </Button>
            </div>
          )}

          {/* Close button for existing receipts */}
          {order?.receiptPath && (
            <div className="flex justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4 ml-2" />
                {bt.close}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}