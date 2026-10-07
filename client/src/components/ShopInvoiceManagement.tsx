import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Download, Send, Search, Filter, Receipt, Calendar, Building, CheckCircle, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLanguage } from '@/contexts/LanguageContext';

type InvoiceLanguage = 'en' | 'ar' | 'tr' | 'fa';
type InvoiceTranslation = Partial<Record<InvoiceLanguage, string>>;

const INVOICE_TRANSLATIONS: Record<string, InvoiceTranslation> = {
  loading: { en: 'Loading invoices...', ar: 'جارٍ تحميل الفواتير...', tr: 'Faturalar yükleniyor...', fa: 'در حال بارگذاری فاکتورها...' },
  title: { en: 'Sales Invoice Management', ar: 'إدارة فواتير المبيعات', tr: 'Satış Faturası Yönetimi', fa: 'مدیریت فاکتور فروش' },
  subtitle: { en: 'Invoices for settled orders', ar: 'فواتير الطلبات المسددة', tr: 'Ödemesi tamamlanan siparişlerin faturaları', fa: 'فاکتورهای سفارشات تسویه شده' },
  downloadCsv: { en: 'Download CSV Report', ar: 'تنزيل تقرير CSV', tr: 'CSV Raporunu İndir', fa: 'دانلود گزارش CSV' },
  totalInvoices: { en: 'Total Invoices', ar: 'إجمالي الفواتير', tr: 'Toplam Fatura', fa: 'کل فاکتورها' },
  totalAmount: { en: 'Total Amount', ar: 'المبلغ الإجمالي', tr: 'Toplam Tutar', fa: 'مبلغ کل' },
  averageOrder: { en: 'Average Order', ar: 'متوسط الطلب', tr: 'Ortalama Sipariş', fa: 'میانگین سفارش' },
  thisMonth: { en: 'This Month', ar: 'هذا الشهر', tr: 'Bu Ay', fa: 'این ماه' },
  search: { en: 'Search by order number, customer name, or phone...', ar: 'البحث برقم الطلب أو اسم العميل أو الهاتف...', tr: 'Sipariş numarası, müşteri adı veya telefonla ara...', fa: 'جستجو بر اساس شماره سفارش، نام مشتری یا شماره تماس...' },
  filterStatus: { en: 'Filter by status', ar: 'تصفية حسب الحالة', tr: 'Duruma göre filtrele', fa: 'فیلتر وضعیت' },
  fromDate: { en: 'From date', ar: 'من تاريخ', tr: 'Başlangıç tarihi', fa: 'از تاریخ' },
  toDate: { en: 'To date', ar: 'إلى تاريخ', tr: 'Bitiş tarihi', fa: 'تا تاریخ' },
  clearDates: { en: 'Clear dates', ar: 'مسح التواريخ', tr: 'Tarihleri temizle', fa: 'پاک کردن تاریخ‌ها' },
  mobile: { en: 'Mobile', ar: 'الهاتف', tr: 'Telefon', fa: 'موبایل' },
  email: { en: 'Email', ar: 'البريد الإلكتروني', tr: 'E-posta', fa: 'ایمیل' },
  allOrders: { en: 'All Orders', ar: 'كل الطلبات', tr: 'Tüm Siparişler', fa: 'همه سفارشات' },
  completed: { en: 'Completed', ar: 'مكتمل', tr: 'Tamamlandı', fa: 'تکمیل شده' },
  delivered: { en: 'Delivered', ar: 'تم التسليم', tr: 'Teslim edildi', fa: 'تحویل شده' },
  issuableInvoices: { en: 'Issuable Invoices', ar: 'الفواتير القابلة للإصدار', tr: 'Düzenlenebilir Faturalar', fa: 'فاکتورهای قابل صدور' },
  orderNumber: { en: 'Order Number', ar: 'رقم الطلب', tr: 'Sipariş No', fa: 'شماره سفارش' },
  customer: { en: 'Customer', ar: 'العميل', tr: 'Müşteri', fa: 'مشتری' },
  amount: { en: 'Amount', ar: 'المبلغ', tr: 'Tutar', fa: 'مبلغ' },
  paymentMethod: { en: 'Payment Method', ar: 'طريقة الدفع', tr: 'Ödeme Yöntemi', fa: 'روش پرداخت' },
  paymentDate: { en: 'Payment Date', ar: 'تاريخ الدفع', tr: 'Ödeme Tarihi', fa: 'تاریخ پرداخت' },
  status: { en: 'Status', ar: 'الحالة', tr: 'Durum', fa: 'وضعیت' },
  actions: { en: 'Actions', ar: 'الإجراءات', tr: 'İşlemler', fa: 'عملیات' },
  settled: { en: 'Settled', ar: 'مسدد', tr: 'Ödendi', fa: 'تسویه شده' },
  preview: { en: 'Preview invoice', ar: 'معاينة الفاتورة', tr: 'Faturayı önizle', fa: 'پیش‌نمایش فاکتور' },
  send: { en: 'Send', ar: 'إرسال', tr: 'Gönder', fa: 'ارسال' },
  sending: { en: 'Sending…', ar: 'جارٍ الإرسال…', tr: 'Gönderiliyor…', fa: 'در حال ارسال…' },
  confirmSend: { en: 'Email this invoice as a PDF to {email}?', ar: 'هل تريد إرسال الفاتورة بصيغة PDF إلى {email}؟', tr: 'Fatura PDF olarak {email} adresine gönderilsin mi?', fa: 'فاکتور PDF به {email} ایمیل شود؟' },
  sendAccepted: { en: 'Invoice submitted to the mail server', ar: 'تم تسليم الفاتورة لخادم البريد', tr: 'Fatura posta sunucusuna iletildi', fa: 'فاکتور به سرور ایمیل تحویل داده شد' },
  sendAcceptedDescription: { en: 'Invoice for {number} was accepted for {email}.', ar: 'تم قبول فاتورة {number} لإرسالها إلى {email}.', tr: '{number} faturası {email} için kabul edildi.', fa: 'ارسال فاکتور {number} برای {email} پذیرفته شد.' },
  sendError: { en: 'Invoice could not be emailed', ar: 'تعذر إرسال الفاتورة', tr: 'Fatura e-posta ile gönderilemedi', fa: 'ارسال ایمیل فاکتور انجام نشد' },
  missingEmail: { en: 'This customer has no valid email address.', ar: 'لا يوجد عنوان بريد إلكتروني صالح لهذا العميل.', tr: 'Bu müşterinin geçerli bir e-posta adresi yok.', fa: 'برای این مشتری ایمیل معتبر ثبت نشده است.' },
  chooseSender: { en: 'Send from', ar: 'الإرسال من', tr: 'Gönderen adresi', fa: 'ارسال از ایمیل' },
  chooseLanguage: { en: 'Invoice and email language', ar: 'لغة الفاتورة والبريد الإلكتروني', tr: 'Fatura ve e-posta dili', fa: 'زبان فاکتور و ایمیل' },
  recipient: { en: 'Recipient', ar: 'المستلم', tr: 'Alıcı', fa: 'گیرنده' },
  noSenders: { en: 'No active email senders configured.', ar: 'لا توجد عناوين مرسل نشطة.', tr: 'Etkin e-posta göndericisi tanımlanmamış.', fa: 'هیچ ایمیل فرستندهٔ فعالی تنظیم نشده است.' },
  senderError: { en: 'Could not load sender addresses.', ar: 'تعذر تحميل عناوين المرسلين.', tr: 'Gönderen adresleri yüklenemedi.', fa: 'دریافت ایمیل‌های فرستنده ممکن نشد.' },
  sendErrorDescription: { en: 'Check the recipient and sender settings, then try again.', ar: 'تحقق من المستلم وإعدادات المرسل ثم أعد المحاولة.', tr: 'Alıcı ve gönderici ayarlarını kontrol edip tekrar deneyin.', fa: 'ایمیل گیرنده و تنظیمات فرستنده را بررسی کرده و دوباره تلاش کنید.' },
  print: { en: 'Print invoice', ar: 'طباعة الفاتورة', tr: 'Faturayı yazdır', fa: 'چاپ فاکتور' },
  download: { en: 'Download invoice', ar: 'تنزيل الفاتورة', tr: 'Faturayı indir', fa: 'دانلود فاکتور' },
  noInvoices: { en: 'No issuable invoices found', ar: 'لم يتم العثور على فواتير قابلة للإصدار', tr: 'Düzenlenebilir fatura bulunamadı', fa: 'هیچ فاکتور قابل صدوری یافت نشد' },
  currency: { en: 'IQD', ar: 'دينار عراقي', tr: 'IQD', fa: 'دینار عراقی' },
  unknownCustomer: { en: 'Dear customer', ar: 'العميل الكريم', tr: 'Değerli müşteri', fa: 'مشتری گرامی' },
  notProvided: { en: 'Not provided', ar: 'غير متوفر', tr: 'Belirtilmedi', fa: 'ثبت نشده' },
  walletFull: { en: 'Full wallet', ar: 'المحفظة كاملة', tr: 'Tam cüzdan', fa: 'کیف پول کامل' },
  wallet: { en: 'Digital wallet', ar: 'المحفظة الرقمية', tr: 'Dijital cüzdan', fa: 'کیف پول دیجیتال' },
  bankTransfer: { en: 'Bank transfer', ar: 'تحويل مصرفي', tr: 'Banka havalesi', fa: 'انتقال بانکی' },
  cashOnDelivery: { en: 'Cash on delivery', ar: 'الدفع عند الاستلام', tr: 'Kapıda ödeme', fa: 'پرداخت در محل' },
  creditCard: { en: 'Credit card', ar: 'بطاقة ائتمانية', tr: 'Kredi kartı', fa: 'کارت اعتباری' },
  preparingPrint: { en: 'Preparing print', ar: 'جارٍ تجهيز الطباعة', tr: 'Yazdırma hazırlanıyor', fa: 'آماده‌سازی چاپ' },
  preparingPrintDescription: { en: 'Preparing invoice for printing...', ar: 'جارٍ تجهيز الفاتورة للطباعة...', tr: 'Fatura yazdırma için hazırlanıyor...', fa: 'در حال آماده‌سازی فاکتور برای چاپ...' },
  readyToPrint: { en: 'Ready to print', ar: 'جاهز للطباعة', tr: 'Yazdırmaya hazır', fa: 'آماده چاپ' },
  printReadyDescription: { en: 'Invoice {number} is ready to print', ar: 'الفاتورة {number} جاهزة للطباعة', tr: '{number} numaralı fatura yazdırmaya hazır', fa: 'فاکتور {number} آماده چاپ شد' },
  printError: { en: 'Print error', ar: 'خطأ في الطباعة', tr: 'Yazdırma hatası', fa: 'خطا در چاپ' },
  printErrorDescription: { en: 'Unable to print invoice', ar: 'تعذر طباعة الفاتورة', tr: 'Fatura yazdırılamadı', fa: 'امکان چاپ فاکتور وجود ندارد' },
  fileGeneration: { en: 'Generating file', ar: 'جارٍ إنشاء الملف', tr: 'Dosya oluşturuluyor', fa: 'تولید فایل' },
  fileGenerationDescription: { en: 'Generating invoice file...', ar: 'جارٍ إنشاء ملف الفاتورة...', tr: 'Fatura dosyası oluşturuluyor...', fa: 'در حال تولید فایل فاکتور...' },
  fileDownloaded: { en: 'File downloaded', ar: 'تم تنزيل الملف', tr: 'Dosya indirildi', fa: 'فایل دانلود شد' },
  downloadDescription: { en: 'Invoice {number} downloaded', ar: 'تم تنزيل الفاتورة {number}', tr: '{number} numaralı fatura indirildi', fa: 'فاکتور {number} دانلود شد' },
  downloadError: { en: 'Download error', ar: 'خطأ في التنزيل', tr: 'İndirme hatası', fa: 'خطا در دانلود' },
  downloadErrorDescription: { en: 'Unable to download invoice', ar: 'تعذر تنزيل الفاتورة', tr: 'Fatura indirilemedi', fa: 'امکان دانلود فاکتور وجود ندارد' },
  bulkGeneration: { en: 'Generating files', ar: 'جارٍ إنشاء الملفات', tr: 'Dosyalar oluşturuluyor', fa: 'تولید فایل‌های گروهی' },
  bulkGenerationDescription: { en: 'Generating all invoices...', ar: 'جارٍ إنشاء جميع الفواتير...', tr: 'Tüm faturalar oluşturuluyor...', fa: 'در حال تولید تمامی فاکتورها...' },
  reportDownloaded: { en: 'Report downloaded', ar: 'تم تنزيل التقرير', tr: 'Rapor indirildi', fa: 'گزارش دانلود شد' },
  reportDescription: { en: '{count} invoice report downloaded', ar: 'تم تنزيل تقرير {count} فاتورة', tr: '{count} faturalık rapor indirildi', fa: 'گزارش {count} فاکتور دانلود شد' },
  reportError: { en: 'Report download error', ar: 'خطأ في تنزيل التقرير', tr: 'Rapor indirme hatası', fa: 'خطا در دانلود گزارش' },
  reportErrorDescription: { en: 'Unable to download report', ar: 'تعذر تنزيل التقرير', tr: 'Rapor indirilemedi', fa: 'امکان دانلود گزارش وجود ندارد' },
};

const normalizeInvoiceCompanyName = (value: unknown) =>
  String(value || '').replace(/ممتاز\s*شیمیب/g, 'ممتازشیمی');

interface PaidOrder {
  id: number;
  orderNumber: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: string;
  shippingCost: string;
  vatAmount: string;
  surchargeAmount: string;
  packagingDetails?: import("@shared/contract-packaging").ContractPackagingCharge | null;
  discountAmount?: string;
  vatRate: string;
  currency: string;
  paymentMethod: string;
  paymentDate: string;
  createdAt: string;
  status: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>;
}

interface InvoiceStats {
  totalPaidOrders: number;
  totalInvoiceAmount: number;
  averageOrderValue: number;
  thisMonthInvoices: number;
}

export default function ShopInvoiceManagement() {
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const tr = (key: string, values: Record<string, string | number> = {}) => {
    const template = INVOICE_TRANSLATIONS[key]?.[language] || INVOICE_TRANSLATIONS[key]?.en || key;
    return Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), template);
  };
  const locale = language === 'fa' ? 'fa-IR' : language === 'ar' ? 'ar' : language === 'tr' ? 'tr-TR' : 'en-GB';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PaidOrder | null>(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [orderToSend, setOrderToSend] = useState<PaidOrder | null>(null);
  const [senderId, setSenderId] = useState('');
  const [sendLanguage, setSendLanguage] = useState<InvoiceLanguage>(language);

  // Fetch paid orders only (completed payments) - NEW API PATH
  const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/invoices/paid'],
    queryFn: async () => {
      const response = await fetch('/api/invoices/paid', {
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  // Fetch company information for logo
  const { data: companyInfo } = useQuery({
    queryKey: ['/api/admin/company-information'],
    queryFn: () => fetch('/api/admin/company-information', { credentials: 'include' }).then(res => res.json()),
    staleTime: 300000, // Cache for 5 minutes
  });

  const paidOrders: PaidOrder[] = ordersResponse || [];
  const sendersQuery = useQuery<{ success: boolean; senders: Array<{ id: number; fromEmail: string; fromName: string; categoryName: string | null }> }>({
    queryKey: ['/api/invoices/senders'],
    enabled: !!orderToSend,
    queryFn: async () => {
      const response = await fetch('/api/invoices/senders', { credentials: 'include' });
      if (!response.ok) throw new Error(`Could not load email senders (${response.status})`);
      return response.json();
    },
    staleTime: 30_000,
  });
  const sendInvoice = useMutation({
    mutationFn: async ({ order, senderId, invoiceLanguage }: { order: PaidOrder; senderId: number; invoiceLanguage: InvoiceLanguage }) => {
      const response = await fetch(`/api/invoices/paid/${order.id}/send`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId, expectedEmail: order.customerEmail, language: invoiceLanguage }),
      });
      if (!response.ok) throw new Error(`Invoice email request failed (${response.status})`);
      return response.json() as Promise<{ success: boolean; recipient: string }>;
    },
    onSuccess: (result, { order }) => {
      setOrderToSend(null);
      setSenderId('');
      toast({ title: tr('sendAccepted'), description: tr('sendAcceptedDescription', { number: order.orderNumber, email: result.recipient }) });
    },
    onError: (error) => {
      console.error('Invoice email request failed:', error);
      toast({ title: tr('sendError'), description: tr('sendErrorDescription'), variant: 'destructive' });
    },
  });

  // Filter orders based on search and status
  const filteredOrders = paidOrders.filter(order => {
    const searchablePhone = order.customerPhone || '';
    const matchesSearch = !searchTerm || 
      (order.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${order.customerFirstName || ''} ${order.customerLastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      searchablePhone.includes(searchTerm) ||
      (order.customerEmail || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const invoiceDate = new Date(order.paymentDate || order.createdAt);
    const matchesFromDate = !fromDate || (
      !Number.isNaN(invoiceDate.getTime()) &&
      invoiceDate >= new Date(`${fromDate}T00:00:00`)
    );
    const matchesToDate = !toDate || (
      !Number.isNaN(invoiceDate.getTime()) &&
      invoiceDate <= new Date(`${toDate}T23:59:59.999`)
    );
    
    return matchesSearch && matchesStatus && matchesFromDate && matchesToDate;
  });

  const stats: InvoiceStats = (() => {
    const totalInvoiceAmount = filteredOrders.reduce((sum, order) => {
      const amount = Number.parseFloat(order.totalAmount || '0');
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
    const now = new Date();
    const thisMonthInvoices = filteredOrders.filter((order) => {
      const invoiceDate = new Date(order.paymentDate || order.createdAt);
      return !Number.isNaN(invoiceDate.getTime()) &&
        invoiceDate.getFullYear() === now.getFullYear() &&
        invoiceDate.getMonth() === now.getMonth();
    }).length;

    return {
      totalPaidOrders: filteredOrders.length,
      totalInvoiceAmount,
      averageOrderValue: filteredOrders.length > 0
        ? totalInvoiceAmount / filteredOrders.length
        : 0,
      thisMonthInvoices
    };
  })();

  // Format currency for display
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    const safeAmount = Number.isFinite(num) ? num : 0;
    return new Intl.NumberFormat(locale).format(safeAmount) + ` ${tr('currency')}`;
  };

  // Format Gregorian date
  const formatGregorianDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  // Get customer display name with fallback
  const getCustomerDisplayName = (order: PaidOrder) => {
    const firstName = order.customerFirstName?.trim();
    const lastName = order.customerLastName?.trim();
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    } else {
      return tr('unknownCustomer');
    }
  };

  // Get customer address display
  const getCustomerAddress = (order: any) => {
    const parts = [];
    if (order.customerAddress) parts.push(order.customerAddress);
    if (order.customerCity) parts.push(order.customerCity);
    if (order.customerProvince) parts.push(order.customerProvince);
    return parts.length > 0 ? parts.join(', ') : '';
  };

  // Use the same server-generated PDF for preview, print, download and email.
  const requestInvoicePDF = async (order: PaidOrder) => {
    const response = await fetch(`/api/invoices/paid/${order.id}/pdf?lang=${language}`, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Invoice PDF request failed (${response.status})`);
    }
    return response.blob();
  };

  // Print invoice
  const handlePrintInvoice = async (order: PaidOrder) => {
    try {
      toast({
        title: `🖨️ ${tr('preparingPrint')}`,
        description: tr('preparingPrintDescription'),
      });

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error(tr('printErrorDescription'));
      }
      let url: string | undefined;
      let printed = false;
      const printWhenReady = () => {
        if (printed) return;
        if (printWindow.closed) {
          printed = true;
          if (url) URL.revokeObjectURL(url);
          return;
        }
        printed = true;
        printWindow.focus();
        printWindow.print();
        setTimeout(() => {
          if (!printWindow.closed) printWindow.close();
          if (url) URL.revokeObjectURL(url);
        }, 1000);
      };
      try {
        const blob = await requestInvoicePDF(order);
        url = URL.createObjectURL(blob);
        // PDF viewers generally fire load after navigation. The timeout is a
        // fallback for viewers that do not expose that event for blob PDFs.
        printWindow.onload = () => setTimeout(printWhenReady, 300);
        printWindow.location.href = url;
        setTimeout(printWhenReady, 2000);
      } catch (error) {
        if (url) URL.revokeObjectURL(url);
        if (!printWindow.closed) printWindow.close();
        throw error;
      }

      toast({
        title: `✅ ${tr('readyToPrint')}`,
        description: tr('printReadyDescription', { number: order.orderNumber }),
      });
    } catch (error) {
      console.error(tr('printError'), error);
      toast({
        title: `❌ ${tr('printError')}`,
        description: tr('printErrorDescription'),
        variant: 'destructive'
      });
    }
  };

  // Download invoice as a localized PDF
  const handleDownloadInvoice = async (order: PaidOrder) => {
    try {
      toast({
        title: `📄 ${tr('fileGeneration')}`,
        description: tr('fileGenerationDescription'),
      });

      const blob = await requestInvoicePDF(order);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${order.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: `✅ ${tr('fileDownloaded')}`,
        description: tr('downloadDescription', { number: order.orderNumber }),
      });
    } catch (error) {
      console.error(tr('downloadError'), error);
      toast({
        title: `❌ ${tr('downloadError')}`,
        description: tr('downloadErrorDescription'),
        variant: 'destructive'
      });
    }
  };

  // Generate professional invoice HTML with company logo
  const generateInvoiceHTML = (order: PaidOrder, companyInfo?: any) => {
    const currentDate = formatGregorianDate(new Date().toISOString());
    const orderDate = formatGregorianDate(order.createdAt);
    const paymentDate = formatGregorianDate(order.paymentDate);
    const customerName = getCustomerDisplayName(order);
    const packaging = order.packagingDetails;
    const goodsVat = Number(order.vatAmount || 0) - Number(packaging?.vatAmount || 0);

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>فاکتور سفارش ${order.orderNumber}</title>
        <style>
          * { 
            box-sizing: border-box; 
          }
          body { 
            font-family: 'Tahoma', 'Arial', sans-serif; 
            margin: 0; 
            padding: 20px; 
            direction: rtl; 
            background: white;
            font-size: 14px;
            line-height: 1.6;
            overflow-x: hidden;
          }
          .invoice-container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white;
            border: 2px solid #000;
            position: relative;
            transform: translateZ(0);
            backface-visibility: hidden;
          }
          .header { 
            background: white;
            color: #1f2937; 
            padding: 20px; 
            text-align: center; 
            position: relative;
            border-bottom: 2px solid #000;
          }
          .company-logo { 
            width: 60px; 
            height: 60px;
            object-fit: contain;
            margin-bottom: 8px;
            border-radius: 4px;
            border: 1px solid #ccc;
            padding: 4px;
            display: block;
            margin-left: auto;
            margin-right: auto;
          }
          .company-name { 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 5px;
            color: #000;
          }
          .invoice-title { 
            font-size: 16px; 
            margin-bottom: 10px;
            padding: 8px 16px;
            border: 1px solid #000;
            border-radius: 4px;
            display: inline-block;
            font-weight: bold;
          }
          .invoice-info { 
            padding: 20px; 
            background: white;
            border-bottom: 1px solid #000;
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin-bottom: 15px;
          }
          .info-grid-3 { 
            display: grid; 
            grid-template-columns: 1fr 1fr 1fr; 
            gap: 12px; 
            margin-bottom: 15px;
          }
          .info-item { 
            background: white;
            padding: 12px;
            border: 1px solid #ccc;
          }
          .info-label { 
            font-weight: bold; 
            color: #374151; 
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
            letter-spacing: 0.5px;
          }
          .info-value { 
            color: #1f2937; 
            font-size: 16px;
            font-weight: 600;
          }
          .items-section { 
            padding: 18px;
          }
          .section-title { 
            font-size: 16px; 
            font-weight: bold; 
            color: #000;
            margin-bottom: 12px;
            border-bottom: 2px solid #000;
            padding-bottom: 6px;
          }
          .items-table th { 
            background: white; 
            color: #000; 
            padding: 15px; 
            text-align: right;
            font-weight: bold;
            font-size: 14px;
            border: 1px solid #000;
          }
          .items-table td { 
            padding: 12px 15px; 
            border: 1px solid #ccc;
            text-align: right;
          }
          .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            background: white;
            border: 2px solid #000;
          }
          .total-section { 
            background: white;
            color: #000;
            padding: 18px;
            border: 2px solid #000;
            margin-top: 10px;
          }
          .totals-table {
            width: 50%;
            margin-right: auto;
            border-collapse: collapse;
            margin-bottom: 12px;
          }
          .totals-table td {
            padding: 6px 12px;
            font-size: 14px;
          }
          .totals-table .label-col {
            text-align: right;
            font-weight: 600;
            color: #374151;
          }
          .totals-table .value-col {
            text-align: left;
            color: #1f2937;
          }
          .totals-table .grand-total td {
            font-size: 18px;
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 10px;
            color: #000;
          }
          .payment-info { 
            font-size: 14px;
            opacity: 0.9;
            text-align: center;
            margin-top: 8px;
          }
          .footer { 
            background: white;
            padding: 15px; 
            text-align: center; 
            font-size: 11px; 
            color: #666;
            border-top: 1px solid #000;
          }
          .print-date { 
            margin-top: 10px;
            font-weight: bold;
            color: #000;
          }
          @media print { 
            body { 
              margin: 0; 
              padding: 0; 
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            .invoice-container { 
              border: none; 
              box-shadow: none;
              max-width: 100%;
            }
            .items-table tr:hover { 
              background-color: transparent; 
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div style="text-align: center; margin-bottom: 10px;">
              <img
                src="${companyInfo?.data?.logoUrl || companyInfo?.logoUrl || '/company-logo.png'}"
                alt="لوگوی شرکت"
                class="company-logo"
                onerror="this.onerror=null;this.src='/company-logo.png'"
              />
            </div>
            <div class="company-name">${normalizeInvoiceCompanyName(companyInfo?.data?.companyNameAr || companyInfo?.data?.companyNameEn || 'ممتازشیمی')}</div>
            <div class="invoice-title">فاکتور فروش</div>
          </div>

          <div class="invoice-info">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">شماره فاکتور</div>
                <div class="info-value">${order.orderNumber}</div>
              </div>
              <div class="info-item">
                <div class="info-label">تاریخ صدور</div>
                <div class="info-value">${orderDate}</div>
              </div>
              <div class="info-item">
                <div class="info-label">تاریخ پرداخت</div>
                <div class="info-value">${paymentDate}</div>
              </div>
              <div class="info-item">
                <div class="info-label">روش پرداخت</div>
                <div class="info-value">${getPaymentMethodName(order.paymentMethod)}</div>
              </div>
            </div>

            <div class="info-grid-3">
              <div class="info-item">
                <div class="info-label">نام مشتری</div>
                <div class="info-value">${customerName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">شماره تماس</div>
                <div class="info-value">${order.customerPhone || 'ثبت نشده'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">ایمیل</div>
                <div class="info-value">${order.customerEmail || 'ثبت نشده'}</div>
              </div>
            </div>
            ${getCustomerAddress(order) ? `
            <div class="info-grid">
              <div class="info-item" style="grid-column: 1 / -1;">
                <div class="info-label">آدرس مشتری</div>
                <div class="info-value">${getCustomerAddress(order)}</div>
              </div>
            </div>` : ''}
          </div>

          <div class="items-section">
            <div class="section-title">🛒 جزئیات اقلام</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>نام محصول</th>
                  <th>تعداد</th>
                  <th>قیمت واحد</th>
                  <th>مبلغ کل</th>
                </tr>
              </thead>
              <tbody>
                ${order.items?.map(item => `
                  <tr>
                    <td>${item.productName}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.unitPrice)}</td>
                    <td>${formatCurrency(item.totalPrice)}</td>
                  </tr>
                `).join('') || '<tr><td colspan="4">اطلاعات اقلام در دسترس نیست</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="total-section">
            <table class="totals-table">
              <tbody>
                <tr>
                  <td class="label-col">جمع اقلام:</td>
                  <td class="value-col">${formatCurrency(
                    Math.round(parseFloat(order.totalAmount || '0') - Number(packaging?.costAmount || 0) - parseFloat(order.shippingCost || '0') - parseFloat(order.vatAmount || '0') - parseFloat(order.surchargeAmount || '0'))
                  )}</td>
                </tr>
                ${packaging ? `<tr><td class="label-col">هزینهٔ بسته‌بندی:</td><td class="value-col">${formatCurrency(packaging.costAmount)}</td></tr>` : ''}
                ${goodsVat > 0 ? `
                <tr>
                  <td class="label-col">مالیات بر ارزش افزوده (${order.vatRate || '0'}%):</td>
                  <td class="value-col">${formatCurrency(goodsVat.toString())}</td>
                </tr>` : ''}
                ${packaging ? `<tr><td class="label-col">ارزش افزودهٔ بسته‌بندی (${Number(packaging.vatRatePercent)}%):</td><td class="value-col">${formatCurrency(packaging.vatAmount)}</td></tr>` : ''}
                ${parseFloat(order.surchargeAmount || '0') > 0 ? `
                <tr>
                  <td class="label-col">عوارض:</td>
                  <td class="value-col">${formatCurrency(order.surchargeAmount)}</td>
                </tr>` : ''}
                ${parseFloat(order.shippingCost || '0') > 0 ? `
                <tr>
                  <td class="label-col">هزینه ارسال:</td>
                  <td class="value-col">${formatCurrency(order.shippingCost)}</td>
                </tr>` : ''}
                <tr class="grand-total">
                  <td class="label-col">💰 مبلغ کل:</td>
                  <td class="value-col">${formatCurrency(order.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
            <div class="payment-info">
              ✅ پرداخت تکمیل شده در تاریخ ${paymentDate}
            </div>
          </div>

          <div class="footer">
            <p>🏢 این فاکتور توسط سیستم فروشگاه آنلاین ممتاز شیمی تولید شده است</p>
            <div class="print-date">تاریخ چاپ: ${currentDate}</div>
            
            <!-- آدرس و اطلاعات تماس شرکت در انتهایی‌ترین قسمت -->
            <div class="company-details" style="margin-top: 15px; padding-top: 10px; border-top: 2px solid #000; text-align: center;">
              <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px; color: #000;">
                📍 آدرس شرکت: ${companyInfo?.data?.companyAddress || companyInfo?.data?.address || companyInfo?.data?.companyAddressAr || companyInfo?.data?.companyAddressEn || 'عراق، اربیل، شهرک صنعتی ممتاز شیمی'}
              </div>
              
              <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; font-size: 11px; color: #333;">
                ${companyInfo?.data?.phoneNumber || companyInfo?.data?.phone ? `<span>📞 تلفن: ${companyInfo.data.phoneNumber || companyInfo.data.phone}</span>` : `<span>📞 تلفن: +964-750-123-4567</span>`}
                ${companyInfo?.data?.email || companyInfo?.data?.companyEmail ? `<span>📧 ایمیل: ${companyInfo.data.email || companyInfo.data.companyEmail}</span>` : `<span>📧 ایمیل: info@momtazchem.com</span>`}
                ${companyInfo?.data?.website || companyInfo?.data?.companyWebsite ? `<span>🌐 وبسایت: ${companyInfo.data.website || companyInfo.data.companyWebsite}</span>` : `<span>🌐 وبسایت: www.momtazchem.com</span>`}
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Get payment method display name
  const getPaymentMethodName = (method: string) => {
    const methods: Record<string, string> = {
      'bank_transfer': tr('bankTransfer'),
      'wallet_full': tr('walletFull'),
      'wallet': tr('wallet'),
      'cash_on_delivery': tr('cashOnDelivery'),
      'credit_card': tr('creditCard')
    };
    return methods[method] || method;
  };

  // Preview invoice in modal
  const handlePreviewInvoice = (order: PaidOrder) => {
    setSelectedOrder(order);
    setShowInvoicePreview(true);
  };
  const handleSendInvoice = (order: PaidOrder) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.customerEmail || '')) {
      toast({ title: tr('sendError'), description: tr('missingEmail'), variant: 'destructive' });
      return;
    }
    setSenderId('');
    setSendLanguage(language);
    setOrderToSend(order);
  };

  // Download all invoices as ZIP
  const handleDownloadAllInvoices = async () => {
    try {
      toast({
        title: `📦 ${tr('bulkGeneration')}`,
        description: tr('bulkGenerationDescription'),
      });

      // Create a simple CSV report for now
      const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const csvContent = [
        [tr('orderNumber'), tr('customer'), tr('mobile'), tr('email'), tr('amount'), tr('paymentMethod'), tr('paymentDate')]
          .map(escapeCsv)
          .join(','),
        ...filteredOrders.map(order => [
          order.orderNumber,
          getCustomerDisplayName(order),
          order.customerPhone || tr('notProvided'),
          order.customerEmail || tr('notProvided'),
          order.totalAmount,
          getPaymentMethodName(order.paymentMethod),
          formatGregorianDate(order.paymentDate || order.createdAt)
        ].map(escapeCsv).join(','))
      ].join('\n');

      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: `✅ ${tr('reportDownloaded')}`,
        description: tr('reportDescription', { count: filteredOrders.length }),
      });
    } catch (error) {
      console.error(tr('reportError'), error);
      toast({
        title: `❌ ${tr('reportError')}`,
        description: tr('reportErrorDescription'),
        variant: 'destructive'
      });
    }
  };

  if (ordersLoading) {
    return (
      <div className="flex justify-center items-center py-12" dir={direction}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="mr-3">{tr('loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{tr('title')}</h2>
          <p className="text-sm text-gray-600 mt-1">{tr('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleDownloadAllInvoices}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            disabled={filteredOrders.length === 0}
          >
            <Download className="w-4 h-4" />
            {tr('downloadCsv')} ({filteredOrders.length})
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Receipt className="w-8 h-8 text-green-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600">{tr('totalInvoices')}</p>
                <p className="text-xl font-bold text-green-600">{stats.totalPaidOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-blue-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600">{tr('totalAmount')}</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(stats.totalInvoiceAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-purple-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600">{tr('averageOrder')}</p>
                <p className="text-lg font-bold text-purple-600">{formatCurrency(stats.averageOrderValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-orange-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600">{tr('thisMonth')}</p>
                <p className="text-xl font-bold text-orange-600">{stats.thisMonthInvoices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-4 rounded-lg">
        <div className="flex-1">
          <div className="relative">
            <Search className={`absolute ${direction === 'rtl' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-gray-400`} />
            <Input
              placeholder={tr('search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={direction === 'rtl' ? 'pr-10' : 'pl-10'}
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={tr('filterStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tr('allOrders')}</SelectItem>
            <SelectItem value="completed">{tr('completed')}</SelectItem>
            <SelectItem value="delivered">{tr('delivered')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">{tr('fromDate')}</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="w-44 bg-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">{tr('toDate')}</label>
          <Input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) => setToDate(event.target.value)}
            className="w-44 bg-white"
          />
        </div>
        {(fromDate || toDate) && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFromDate('');
              setToDate('');
            }}
          >
            {tr('clearDates')}
          </Button>
        )}
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {tr('issuableInvoices')} ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-right p-3 font-semibold">{tr('orderNumber')}</th>
                  <th className="text-right p-3 font-semibold">{tr('customer')}</th>
                  <th className="text-right p-3 font-semibold">{tr('amount')}</th>
                  <th className="text-right p-3 font-semibold">{tr('paymentMethod')}</th>
                  <th className="text-right p-3 font-semibold">{tr('paymentDate')}</th>
                  <th className="text-right p-3 font-semibold">{tr('status')}</th>
                  <th className="text-right p-3 font-semibold">{tr('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      <button type="button" onClick={() => handlePreviewInvoice(order)}
                        className="text-blue-600 underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                        title={tr('preview')} aria-label={`${tr('preview')} ${order.orderNumber}`}>
                        {order.orderNumber}
                      </button>
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{getCustomerDisplayName(order)}</div>
                        <div className="text-sm text-gray-500">{order.customerPhone || tr('notProvided')}</div>
                        <div className="text-xs text-gray-500">{order.customerEmail || tr('notProvided')}</div>
                      </div>
                    </td>
                    <td className="p-3 font-bold text-green-600">{formatCurrency(order.totalAmount)}</td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-xs">
                        {getPaymentMethodName(order.paymentMethod)}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">{formatGregorianDate(order.paymentDate || order.createdAt)}</td>
                    <td className="p-3">
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {tr('settled')}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendInvoice(order)}
                          className="text-blue-600 hover:text-blue-800 gap-1.5"
                          title={tr('send')}
                          aria-label={`${tr('send')} ${order.orderNumber}`}
                        >
                          <Send className="w-4 h-4" />
                          {tr('send')}
                        </Button>
                        <Button
                          size="sm" 
                          onClick={() => handlePrintInvoice(order)}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                           title={tr('print')}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm" 
                          onClick={() => handleDownloadInvoice(order)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                           title={tr('download')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredOrders.length === 0 && (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">{tr('noInvoices')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Dialog open={showInvoicePreview} onOpenChange={(open) => {
        setShowInvoicePreview(open);
        if (!open) setSelectedOrder(null);
      }}>
        <DialogContent className="flex h-[90vh] max-w-5xl flex-col">
          <DialogHeader><DialogTitle>{tr('preview')} — {selectedOrder?.orderNumber}</DialogTitle></DialogHeader>
          {selectedOrder && <iframe
            title={`${tr('preview')} ${selectedOrder.orderNumber}`}
            src={`/api/invoices/paid/${selectedOrder.id}/pdf?lang=${language}`}
            className="min-h-0 w-full flex-1 rounded border"
          />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!orderToSend} onOpenChange={(open) => {
        if (!open && !sendInvoice.isPending) { setOrderToSend(null); setSenderId(''); }
      }}>
        <DialogContent className="max-w-md" dir={direction}>
          <DialogHeader><DialogTitle>{tr('send')} PDF — {orderToSend?.orderNumber}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{tr('recipient')}: <strong className="text-gray-900" dir="ltr">{orderToSend?.customerEmail}</strong></p>
            <div className="space-y-2">
              <label className="text-sm font-medium">{tr('chooseSender')}</label>
              {sendersQuery.isLoading ? <p className="text-sm text-gray-500">{tr('loading')}</p>
                : sendersQuery.isError ? <p role="alert" className="text-sm text-red-600">{tr('senderError')}</p>
                : sendersQuery.data?.senders.length ? (
                  <Select value={senderId} onValueChange={setSenderId}>
                    <SelectTrigger aria-label={tr('chooseSender')}><SelectValue placeholder={tr('chooseSender')} /></SelectTrigger>
                    <SelectContent>{sendersQuery.data.senders.map(sender => (
                      <SelectItem key={sender.id} value={String(sender.id)}>
                        {sender.fromEmail} {sender.categoryName ? `(${sender.categoryName})` : ''}
                      </SelectItem>
                    ))}</SelectContent>
                  </Select>
                ) : <p className="text-sm text-amber-700">{tr('noSenders')}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="invoice-send-language">{tr('chooseLanguage')}</label>
              <Select value={sendLanguage} onValueChange={(value: InvoiceLanguage) => setSendLanguage(value)} disabled={sendInvoice.isPending}>
                <SelectTrigger id="invoice-send-language"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fa">فارسی</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="tr">Türkçe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" className="w-full gap-2" disabled={!senderId || sendInvoice.isPending}
              onClick={() => orderToSend && sendInvoice.mutate({ order: orderToSend, senderId: Number(senderId), invoiceLanguage: sendLanguage })}>
              <Send className="h-4 w-4" />{sendInvoice.isPending ? tr('sending') : tr('send')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}