import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useCustomer } from "@/hooks/useCustomer";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Plus, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle, XCircle, DollarSign, CreditCard, Banknote, Shield, Building2, RefreshCw, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { localizeWalletTransactionDescription } from "@/lib/localize-wallet-text";

interface WalletSummary {
  wallet?: {
    id: number;
    balance: string;
    currency: string;
    status: string;
    creditLimit: string;
    lastActivityDate?: string;
  };
  recentTransactions: Array<{
    id: number;
    transactionType: string;
    amount: string;
    currency: string;
    description: string;
    status: string;
    createdAt: string;
    referenceType?: string;
    referenceId?: number;
    balanceBefore?: string;
    balanceAfter?: string;
  }>;
  pendingRecharges: Array<{
    id: number;
    requestNumber: string;
    amount: string;
    currency: string;
    paymentMethod: string;
    status: string;
    createdAt: string;
  }>;
  totalSpent: number;
  totalRecharged: number;
  reservedBalance: number;
  availableBalance: number;
}

interface RechargeRequest {
  id: number;
  requestNumber: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  paymentReference?: string;
  status: string;
  customerNotes?: string;
  adminNotes?: string;
  createdAt: string;
}

const WALLET_T = {
  en: {
    syncSuccess: "Sync completed", syncSuccessDesc: "Wallet information was synchronized successfully",
    syncError: "Sync failed", syncErrorDesc: "Could not synchronize wallet information",
    clearCache: "Cache cleared", clearCacheDesc: "The cache was cleared. Reloading the page...",
    clearCacheError: "Could not clear cache", redirecting: "Redirecting to the payment gateway...", pleaseWait: "Please wait",
    bankReferenceRequired: "Bank reference number is required", bankReceiptRequired: "Bank receipt is required",
    bankingInfo: "Bank account information", loadingBanking: "Loading banking information...",
    bankName: "Bank name:", accountNumber: "Account number:", accountHolder: "Account holder:", iban: "IBAN:",
    pendingInfo: "Pending completion", fallbackBank: "Iraq National Bank", bankReference: "Bank reference number",
    enterBankReference: "Enter the bank reference number", bankReceipt: "Bank receipt", uploadReceipt: "Upload bank receipt",
    transactionsDescription: "View all your wallet transactions", rechargeDescription: "View all your recharge requests",
    orderPayment: "Order payment", order: "Order #", before: "Before:", after: "After:", admin: "Admin",
    reserved: "Reserved:", reservedHelp: "(Pending bank payment completion)",
    transactionColumns: { number: "#", details: "Transaction", reference: "Reference", date: "Date", amount: "Amount", before: "Balance Before", after: "Balance After", status: "Status" },
    statuses: { pending: "Pending", approved: "Approved", completed: "Completed", rejected: "Rejected", active: "Active", frozen: "Frozen" },
  },
  ar: {
    syncSuccess: "تمت المزامنة", syncSuccessDesc: "تمت مزامنة معلومات المحفظة بنجاح",
    syncError: "فشلت المزامنة", syncErrorDesc: "تعذرت مزامنة معلومات المحفظة",
    clearCache: "تم مسح الذاكرة المؤقتة", clearCacheDesc: "تم مسح الذاكرة المؤقتة، جارٍ إعادة تحميل الصفحة...",
    clearCacheError: "تعذر مسح الذاكرة المؤقتة", redirecting: "جارٍ الانتقال إلى بوابة الدفع...", pleaseWait: "يرجى الانتظار",
    bankReferenceRequired: "رقم المرجع البنكي مطلوب", bankReceiptRequired: "الإيصال البنكي مطلوب",
    bankingInfo: "معلومات الحساب البنكي", loadingBanking: "جارٍ تحميل المعلومات البنكية...",
    bankName: "اسم البنك:", accountNumber: "رقم الحساب:", accountHolder: "صاحب الحساب:", iban: "IBAN:",
    pendingInfo: "بانتظار استكمال المعلومات", fallbackBank: "المصرف الوطني العراقي", bankReference: "رقم المرجع البنكي",
    enterBankReference: "أدخل رقم المرجع البنكي", bankReceipt: "الإيصال البنكي", uploadReceipt: "رفع الإيصال البنكي",
    transactionsDescription: "عرض جميع معاملات محفظتك", rechargeDescription: "عرض جميع طلبات شحن محفظتك",
    orderPayment: "دفع الطلب", order: "الطلب #", before: "قبل:", after: "بعد:", admin: "المدير",
    reserved: "المبلغ المحجوز:", reservedHelp: "(بانتظار إكمال الدفع البنكي)",
    transactionColumns: { number: "#", details: "المعاملة", reference: "المرجع", date: "التاريخ", amount: "المبلغ", before: "الرصيد قبل", after: "الرصيد بعد", status: "الحالة" },
    statuses: { pending: "معلق", approved: "موافق عليه", completed: "مكتمل", rejected: "مرفوض", active: "نشط", frozen: "مجمد" },
  },
  tr: {
    syncSuccess: "Eşitleme tamamlandı", syncSuccessDesc: "Cüzdan bilgileri başarıyla eşitlendi",
    syncError: "Eşitleme başarısız", syncErrorDesc: "Cüzdan bilgileri eşitlenemedi",
    clearCache: "Önbellek temizlendi", clearCacheDesc: "Önbellek temizlendi. Sayfa yeniden yükleniyor...",
    clearCacheError: "Önbellek temizlenemedi", redirecting: "Ödeme sayfasına yönlendiriliyor...", pleaseWait: "Lütfen bekleyin",
    bankReferenceRequired: "Banka referans numarası gerekli", bankReceiptRequired: "Banka dekontu gerekli",
    bankingInfo: "Banka hesap bilgileri", loadingBanking: "Banka bilgileri yükleniyor...",
    bankName: "Banka adı:", accountNumber: "Hesap numarası:", accountHolder: "Hesap sahibi:", iban: "IBAN:",
    pendingInfo: "Bilgiler bekleniyor", fallbackBank: "Irak Ulusal Bankası", bankReference: "Banka referans numarası",
    enterBankReference: "Banka referans numarasını girin", bankReceipt: "Banka dekontu", uploadReceipt: "Banka dekontu yükle",
    transactionsDescription: "Tüm cüzdan işlemlerinizi görüntüleyin", rechargeDescription: "Tüm bakiye yükleme taleplerinizi görüntüleyin",
    orderPayment: "Sipariş ödemesi", order: "Sipariş #", before: "Önce:", after: "Sonra:", admin: "Yönetici",
    reserved: "Ayrılan:", reservedHelp: "(Banka ödemesinin tamamlanması bekleniyor)",
    transactionColumns: { number: "#", details: "İşlem", reference: "Referans", date: "Tarih", amount: "Tutar", before: "Önceki Bakiye", after: "Sonraki Bakiye", status: "Durum" },
    statuses: { pending: "Bekliyor", approved: "Onaylandı", completed: "Tamamlandı", rejected: "Reddedildi", active: "Aktif", frozen: "Donduruldu" },
  },
  fa: {
    syncSuccess: "همگام‌سازی موفق", syncSuccessDesc: "اطلاعات کیف پول با موفقیت همگام‌سازی شد",
    syncError: "خطا در همگام‌سازی", syncErrorDesc: "همگام‌سازی اطلاعات کیف پول انجام نشد",
    clearCache: "حافظه موقت پاک شد", clearCacheDesc: "حافظه موقت پاک شد؛ صفحه در حال بازگشایی است...",
    clearCacheError: "خطا در پاک‌سازی", redirecting: "در حال انتقال به درگاه پرداخت...", pleaseWait: "لطفاً صبر کنید",
    bankReferenceRequired: "شماره مرجع بانکی الزامی است", bankReceiptRequired: "فیش بانکی الزامی است",
    bankingInfo: "اطلاعات حساب بانکی", loadingBanking: "در حال بارگذاری اطلاعات بانکی...",
    bankName: "نام بانک:", accountNumber: "شماره حساب:", accountHolder: "صاحب حساب:", iban: "شماره شبا:",
    pendingInfo: "در انتظار تکمیل اطلاعات", fallbackBank: "بانک ملی عراق", bankReference: "شماره مرجع بانکی",
    enterBankReference: "شماره مرجع بانکی را وارد کنید", bankReceipt: "فیش بانکی", uploadReceipt: "بارگذاری فیش بانکی",
    transactionsDescription: "همه تراکنش‌های کیف پول خود را مشاهده کنید", rechargeDescription: "همه درخواست‌های شارژ را مشاهده کنید",
    orderPayment: "پرداخت سفارش", order: "سفارش #", before: "قبل:", after: "بعد:", admin: "مدیر",
    reserved: "مبلغ رزروشده:", reservedHelp: "(در انتظار تکمیل پرداخت بانکی)",
    transactionColumns: { number: "#", details: "تراکنش", reference: "مرجع", date: "تاریخ", amount: "مبلغ", before: "موجودی قبل", after: "موجودی بعد", status: "وضعیت" },
    statuses: { pending: "در انتظار", approved: "تأییدشده", completed: "تکمیل‌شده", rejected: "ردشده", active: "فعال", frozen: "مسدود" },
  },
} as const;

export default function CustomerWallet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRechargeDialogOpen, setIsRechargeDialogOpen] = useState(false);
  const [rechargeForm, setRechargeForm] = useState({
    amount: "",
    currency: "IQD",
    paymentMethod: "",
    paymentReference: "",
    customerNotes: "",
    bankReference: "",
    bankReceipt: null as File | null
  });

  // Authentication
  const { customer, isAuthenticated, isLoading: authLoading } = useCustomer();
  const { isAuthenticated: isAdminAuthenticated } = useAuth();

  // Get language from centralized system
  const { language, t, direction } = useLanguage();
  const wt = WALLET_T[language];
  const iranianRialLabel = {
    en: 'Iranian Rial (IRR)',
    fa: 'ریال ایران (IRR)',
    ar: 'الريال الإيراني (IRR)',
    tr: 'İran Riyali (IRR)',
  }[language];
  const isRTL = direction === 'rtl';

  // Get refresh interval from global settings
  const getWalletRefreshInterval = () => {
    const globalSettings = localStorage.getItem('global-refresh-settings');
    if (globalSettings) {
      const settings = JSON.parse(globalSettings);
      const shopSettings = settings.departments.shop;
      
      if (shopSettings?.autoRefresh) {
        const refreshInterval = settings.syncEnabled 
          ? settings.globalInterval 
          : shopSettings.interval;
        return refreshInterval * 1000; // Convert seconds to milliseconds
      }
    }
    return 300000; // Default 5 minutes if no settings found
  };

  // Fetch wallet summary - only when authenticated
  const { data: walletData, isLoading } = useQuery<{ success: boolean; data: WalletSummary }>({
    queryKey: ['/api/customer/wallet'],
    enabled: isAuthenticated, // Only fetch when authenticated
    refetchInterval: getWalletRefreshInterval()
  });

  // Fetch all recharge requests - only when authenticated
  const { data: rechargeRequestsData } = useQuery<{ success: boolean; data: RechargeRequest[] }>({
    queryKey: ['/api/customer/wallet/recharge-requests'],
    enabled: isAuthenticated, // Only fetch when authenticated
    refetchInterval: getWalletRefreshInterval()
  });

  // Fetch all transactions - only when authenticated
  const { data: transactionsData } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['/api/customer/wallet/transactions'],
    enabled: isAuthenticated, // Only fetch when authenticated
    refetchInterval: getWalletRefreshInterval()
  });

  // Fetch company banking information for bank transfer display
  const { data: companyInfo, isLoading: isLoadingCompanyInfo } = useQuery({
    queryKey: ['/api/company/banking-info'],
    queryFn: async () => {
      const response = await apiRequest('/api/company/banking-info', { method: 'GET' });
      return response.data;
    },
  });

  // Force wallet sync mutation
  const syncWalletMutation = useMutation({
    mutationFn: async () => {
      if (!customer?.id) throw new Error('Customer not found');
      return await apiRequest(`/api/wallet/force-sync/${customer.id}`, { method: 'POST' });
    },
    onSuccess: (data) => {
      toast({
        title: wt.syncSuccess,
        description: wt.syncSuccessDesc,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/wallet/recharge-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/wallet/transactions'] });
    },
    onError: (error: any) => {
      toast({
        title: wt.syncError,
        description: error.message || wt.syncErrorDesc,
        variant: "destructive",
      });
    }
  });

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/customer/clear-cache', { method: 'POST' });
      
      // Execute client-side cache clearing
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        
        // Force reload after small delay
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
      
      return response;
    },
    onSuccess: () => {
      toast({
        title: wt.clearCache,
        description: wt.clearCacheDesc,
      });
    },
    onError: (error: any) => {
      toast({
        title: wt.clearCacheError,
        description: error.message || wt.clearCacheError,
        variant: "destructive",
      });
    }
  });

  // Create recharge request mutation
  const createRechargeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/customer/wallet/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create recharge request');
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      if (result.paymentUrl) {
        toast({
          title: wt.redirecting,
          description: wt.pleaseWait,
        });
        window.location.href = result.paymentUrl;
        return;
      }
      toast({
        title: t.rechargeSuccess,
        description: t.requestSubmitted,
      });
      setIsRechargeDialogOpen(false);
      setRechargeForm({
        amount: "",
        currency: "IQD",
        paymentMethod: "",
        paymentReference: "",
        customerNotes: "",
        bankReference: "",
        bankReceipt: null
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/wallet/recharge-requests'] });
    },
    onError: (error: any) => {
      toast({
        title: t.requestError,
        description: error.message || t.errorCreatingRequest,
        variant: "destructive",
      });
    }
  });

  const handleRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rechargeForm.amount || parseFloat(rechargeForm.amount) <= 0) {
      toast({
        title: t.inputError,
        description: t.validAmount,
        variant: "destructive",
      });
      return;
    }

    if (!rechargeForm.paymentMethod) {
      toast({
        title: t.inputError,
        description: t.selectPaymentMethod,
        variant: "destructive",
      });
      return;
    }

    // Validate bank transfer fields
    if (rechargeForm.paymentMethod === 'bank_transfer') {
      if (!rechargeForm.bankReference.trim()) {
        toast({
          title: t.inputError,
          description: wt.bankReferenceRequired,
          variant: "destructive",
        });
        return;
      }
      
      if (!rechargeForm.bankReceipt) {
        toast({
          title: t.inputError,
          description: wt.bankReceiptRequired,
          variant: "destructive",
        });
        return;
      }
    }

    // Prepare data for submission
    const submitData = {
      amount: parseFloat(rechargeForm.amount),
      currency: rechargeForm.currency,
      paymentMethod: rechargeForm.paymentMethod,
      customerNotes: rechargeForm.customerNotes,
      paymentReference: rechargeForm.paymentReference,
      bankReference: rechargeForm.bankReference
    };

    // Submit the data using the mutation
    createRechargeMutation.mutate(submitData);

    // Handle file upload separately if needed
    if (rechargeForm.paymentMethod === 'bank_transfer' && rechargeForm.bankReceipt) {
      const formData = new FormData();
      formData.append('bankReceipt', rechargeForm.bankReceipt);
      
      try {
        const response = await fetch('/api/customer/wallet/upload-receipt', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload receipt');
        }

        const result = await response.json();
        console.log('Receipt uploaded successfully:', result);
        
      } catch (error: any) {
        console.error('Error uploading receipt:', error);
        toast({
          title: t.requestError,
          description: error.message || 'Failed to upload receipt',
          variant: "destructive",
        });
      }
    }
  };

  const formatCurrency = (amount: string | number, currency: string = "IQD") => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const locale = { en: 'en-US', ar: 'ar-IQ', tr: 'tr-TR', fa: 'fa-IR' }[language];
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numAmount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'secondary', approved: 'default', completed: 'default',
      rejected: 'destructive', active: 'default', frozen: 'destructive'
    };
    const label = wt.statuses[status as keyof typeof wt.statuses] || status;
    return <Badge variant={variants[status] || 'secondary'}>{label}</Badge>;
  };

  const getTransactionDescription = (transaction: WalletSummary['recentTransactions'][number]) => {
    const normalized = transaction.description?.trim().toLowerCase();
    const isOrderPayment = transaction.referenceType === 'order'
      || ['پرداخت سفارش', 'order payment', 'دفع الطلب', 'sipariş ödemesi'].includes(normalized);
    return isOrderPayment ? wt.orderPayment : localizeWalletTransactionDescription(transaction.description, language);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
      case 'debit':
        return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  // Show loading during authentication check
  if (authLoading) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>{t.loading}</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Wallet className="h-6 w-6" />
              {t.walletTitle}
            </CardTitle>
            <CardDescription>
              {t.loginToAccessWallet}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/shop'} className="w-full">
              {t.goToLogin}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>{t.loading}</p>
        </div>
      </div>
    );
  }

  const wallet = walletData?.data?.wallet;
  const recentTransactions = walletData?.data?.recentTransactions || [];
  const pendingRecharges = walletData?.data?.pendingRecharges || [];
  const allRechargeRequests = rechargeRequestsData?.data || [];
  const allTransactions = transactionsData?.data || [];
  const formatTransactionDate = (date: string) => {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return "—";

    return new Intl.DateTimeFormat(
      language === "fa" ? "fa-IR-u-ca-persian" :
      language === "ar" ? "ar-IQ" :
      language === "tr" ? "tr-TR" :
      "en-US",
      { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
    ).format(parsedDate);
  };

  return (
    <div className={`min-h-screen bg-gray-50 p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={direction}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <h1 className={`text-3xl font-bold text-gray-900 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Wallet className="h-8 w-8 text-blue-600" />
              {t.walletTitle}
            </h1>
            
            {/* Admin Status Badge */}
            {isAdminAuthenticated && (
              <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full border border-red-200 dark:border-red-800">
                <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  {wt.admin}
                </span>
              </div>
            )}
          </div>
          <p className="text-gray-600 mt-2">{t.walletSubtitle}</p>
        </div>

        {/* Wallet Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <CardTitle className="text-sm font-medium">{t.currentBalance}</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {walletData?.data?.availableBalance !== undefined 
                  ? formatCurrency(walletData.data.availableBalance, wallet?.currency || 'IQD')
                  : wallet ? formatCurrency(wallet.balance, wallet.currency) : formatCurrency(0)}
              </div>
              {/* Show reserved balance if any */}
              {(walletData?.data?.reservedBalance ?? 0) > 0 && (
                <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                  <div className="text-xs text-orange-700 dark:text-orange-300 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {wt.reserved}
                    <span className="font-semibold">
                      {formatCurrency(walletData?.data?.reservedBalance ?? 0, wallet?.currency || 'IQD')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {wt.reservedHelp}
                  </div>
                </div>
              )}
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-2">
                <span>{t.status}:</span> {wallet ? getStatusBadge(wallet.status) : getStatusBadge('active')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <CardTitle className="text-sm font-medium">{t.totalSpent}</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(walletData?.data?.totalSpent || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t.totalWithdrawals}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <CardTitle className="text-sm font-medium">{t.totalRecharged}</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(walletData?.data?.totalRecharged || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t.totalDeposits}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>{t.quickActions}</CardTitle>
              <CardDescription>{t.manageWallet}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Dialog open={isRechargeDialogOpen} onOpenChange={setIsRechargeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Plus className="h-4 w-4" />
                      {t.addFunds}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className={isRTL ? 'rtl' : 'ltr'} dir={direction}>
                    <DialogHeader>
                      <DialogTitle>{t.walletRechargeRequest}</DialogTitle>
                      <DialogDescription>
                        {t.fillRechargeDetails}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRechargeSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="amount">{t.amount} *</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          value={rechargeForm.amount}
                          onChange={(e) => setRechargeForm({...rechargeForm, amount: e.target.value})}
                          placeholder={t.enterAmount}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="currency">{t.currency}</Label>
                        <Select 
                          value={rechargeForm.currency} 
                          onValueChange={(value) => setRechargeForm({...rechargeForm, currency: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IQD">
                              {t.iraqiDinar}
                            </SelectItem>
                            <SelectItem value="USD">
                              {t.usDollar}
                            </SelectItem>
                            <SelectItem value="EUR">
                              {t.euro}
                            </SelectItem>
                             <SelectItem value="IRR">
                               {iranianRialLabel}
                             </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="paymentMethod">{t.paymentMethod} *</Label>
                        <Select 
                          value={rechargeForm.paymentMethod} 
                          onValueChange={(value) => setRechargeForm({...rechargeForm, paymentMethod: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t.selectPaymentMethod} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bank_transfer">
                              {t.bankTransfer}
                            </SelectItem>
                            <SelectItem value="online_payment">
                              {t.onlinePayment}
                            </SelectItem>
                            <SelectItem value="cash">
                              {t.cashPayment}
                            </SelectItem>
                            <SelectItem value="mobile_wallet">
                              {t.mobileWallet}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Bank Transfer Fields */}
                      {rechargeForm.paymentMethod === 'bank_transfer' && (
                        <>
                          {/* Banking Information Card - Dynamic from Company Info */}
                          <Card className="bg-blue-50 dark:bg-blue-900/20">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-base">
                                <Building2 className="w-4 h-4 text-blue-600" />
                                {wt.bankingInfo}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {isLoadingCompanyInfo ? (
                                <div className="text-center py-2">
                                  <p className="text-sm text-muted-foreground">{wt.loadingBanking}</p>
                                </div>
                              ) : (
                                <div className="space-y-2 text-sm">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <span className="font-medium">{wt.bankName}</span>
                                      <p className="text-muted-foreground">
                                        {companyInfo?.bankName || wt.fallbackBank}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="font-medium">{wt.accountNumber}</span>
                                      <p className="font-mono text-sm">
                                        {companyInfo?.bankAccount || wt.pendingInfo}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <span className="font-medium">{wt.accountHolder}</span>
                                      <p className="text-muted-foreground">
                                        {companyInfo?.bankAccountHolder || companyInfo?.companyNameAr || companyInfo?.companyNameEn || wt.pendingInfo}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="font-medium">{wt.iban}</span>
                                      <p className="font-mono text-sm">
                                        {companyInfo?.bankIban || wt.pendingInfo}
                                      </p>
                                    </div>
                                  </div>
                                  {companyInfo?.bankSwift && (
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <span className="font-medium">کد SWIFT:</span>
                                        <p className="font-mono text-sm">{companyInfo.bankSwift}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          <div>
                            <Label htmlFor="bankReference">{wt.bankReference} *</Label>
                            <Input
                              id="bankReference"
                              value={rechargeForm.bankReference}
                              onChange={(e) => setRechargeForm({...rechargeForm, bankReference: e.target.value})}
                              placeholder={wt.enterBankReference}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="bankReceipt">{wt.bankReceipt} *</Label>
                            <Input
                              id="bankReceipt"
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={(e) => setRechargeForm({...rechargeForm, bankReceipt: e.target.files?.[0] || null})}
                              required
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                              {wt.uploadReceipt}
                            </p>
                          </div>
                        </>
                      )}

                      {/* General Payment Reference (for non-bank transfers) */}
                      {rechargeForm.paymentMethod !== 'bank_transfer' && (
                        <div>
                          <Label htmlFor="paymentReference">{t.paymentReference} ({t.optional})</Label>
                          <Input
                            id="paymentReference"
                            value={rechargeForm.paymentReference}
                            onChange={(e) => setRechargeForm({...rechargeForm, paymentReference: e.target.value})}
                            placeholder={t.enterPaymentReference}
                          />
                        </div>
                      )}

                      <div>
                        <Label htmlFor="customerNotes">{t.notes} ({t.optional})</Label>
                        <Textarea
                          id="customerNotes"
                          value={rechargeForm.customerNotes}
                          onChange={(e) => setRechargeForm({...rechargeForm, customerNotes: e.target.value})}
                          placeholder={t.enterNotes}
                          rows={3}
                        />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsRechargeDialogOpen(false)}>
                          {t.cancel}
                        </Button>
                        <Button type="submit" disabled={createRechargeMutation.isPending}>
                          {createRechargeMutation.isPending ? t.processing : t.submit}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Transactions and Recharge Requests */}
        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transactions">{t.allTransactions}</TabsTrigger>
            <TabsTrigger value="recharge-requests">{t.rechargeRequests}</TabsTrigger>
          </TabsList>

          {/* All Transactions Tab */}
          <TabsContent value="transactions">
            <Card className="overflow-hidden border-slate-300 shadow-sm">
              <CardHeader>
                <CardTitle>{t.allTransactions}</CardTitle>
                <CardDescription>
                  {wt.transactionsDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {allTransactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table className="min-w-[1120px] text-xs">
                      <TableHeader className="sticky top-0 z-10 bg-slate-700">
                        <TableRow className="border-slate-700 hover:bg-slate-700">
                          {Object.values(wt.transactionColumns).map((heading) => (
                            <TableHead key={heading} className="h-9 border-e border-slate-600 px-3 text-start font-semibold text-slate-50 last:border-e-0">
                              {heading}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allTransactions.map((transaction, index) => (
                          <TableRow key={transaction.id ?? index} className="border-slate-200 odd:bg-slate-50 even:bg-white hover:bg-amber-50">
                            <TableCell className="w-12 border-e border-slate-200 px-3 py-2 font-mono text-slate-500">{index + 1}</TableCell>
                            <TableCell className="min-w-[240px] border-e border-slate-200 px-3 py-2">
                              <div className="flex items-center gap-2">
                                {getTransactionIcon(transaction.transactionType)}
                                <span className="font-medium text-slate-800">{getTransactionDescription(transaction)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="border-e border-slate-200 px-3 py-2 font-medium text-blue-700">
                              {transaction.referenceType === "order" && transaction.referenceId
                                ? `${wt.order}${transaction.referenceId}`
                                : transaction.referenceId || "—"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap border-e border-slate-200 px-3 py-2 text-slate-600">
                              {formatTransactionDate(transaction.createdAt)}
                            </TableCell>
                            <TableCell className={`whitespace-nowrap border-e border-slate-200 px-3 py-2 font-mono font-bold ${transaction.transactionType === "credit" ? "text-emerald-700" : "text-rose-700"}`}>
                              {transaction.transactionType === "credit" ? "+" : "-"}{formatCurrency(transaction.amount, transaction.currency)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap border-e border-slate-200 px-3 py-2 font-mono text-slate-600">
                              {transaction.balanceBefore != null ? formatCurrency(transaction.balanceBefore, transaction.currency) : "—"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap border-e border-slate-200 px-3 py-2 font-mono text-slate-700">
                              {transaction.balanceAfter != null ? formatCurrency(transaction.balanceAfter, transaction.currency) : "—"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap px-3 py-2">{getStatusBadge(transaction.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">{t.noTransactions}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recharge Requests Tab */}
          <TabsContent value="recharge-requests">
            <Card>
              <CardHeader>
                <CardTitle>{t.rechargeRequests}</CardTitle>
                <CardDescription>
                  {wt.rechargeDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allRechargeRequests.length > 0 ? (
                  <div className="space-y-4">
                    {allRechargeRequests.map((request) => (
                      <div key={request.id} className={`flex items-center justify-between p-4 border rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center space-x-4 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <CreditCard className="h-5 w-5 text-blue-600" />
                          <div className={isRTL ? 'text-right' : 'text-left'}>
                            <p className="font-medium">{t.requestNumber}: {request.requestNumber}</p>
                            <p className="text-sm text-gray-500">{request.paymentMethod}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(request.createdAt).toLocaleDateString({ en: 'en-US', ar: 'ar-IQ', tr: 'tr-TR', fa: 'fa-IR' }[language])}
                            </p>
                          </div>
                        </div>
                        <div className={`text-right ${isRTL ? 'text-left' : ''}`}>
                          <p className="font-medium text-blue-600">
                            {formatCurrency(request.amount, request.currency)}
                          </p>
                          {getStatusBadge(request.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">{t.noRechargeRequests}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}