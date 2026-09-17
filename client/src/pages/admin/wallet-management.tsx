import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Wallet, CheckCircle, XCircle, Clock, Eye, Users, DollarSign, CreditCard, RefreshCw, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

interface WalletRechargeRequest {
  id: number;
  requestNumber: string;
  customerId: number;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  amount: string;
  currency: string;
  paymentMethod: string;
  paymentReference?: string;
  status: string;
  customerNotes?: string;
  adminNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  approvedAt?: string;
  processedAt?: string;
}

interface WalletStats {
  totalWallets: number;
  totalBalance: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalProcessed: number;
}

interface WalletHolder {
  customerId: number;
  customerName: string;
  customerEmail: string;
  walletId: number;
  balance: number;
  lastActivityDate: Date | null;
  isActive: boolean;
}

type WalletLanguage = "en" | "fa" | "ar" | "tr";
const walletCopy: Record<string, Record<WalletLanguage, string>> = {
  back: { en: "Back to Site Management", fa: "بازگشت به مدیریت سایت", ar: "العودة إلى إدارة الموقع", tr: "Site Yönetimine Dön" },
  title: { en: "Wallet Management", fa: "مدیریت کیف پول", ar: "إدارة المحافظ", tr: "Cüzdan Yönetimi" },
  module: { en: "Financial Department Module", fa: "ماژول واحد مالی", ar: "وحدة القسم المالي", tr: "Finans Departmanı Modülü" },
  description: { en: "Manage customer wallet recharge requests and balances - Part of Financial Operations", fa: "درخواست‌های شارژ و موجودی کیف پول مشتریان را مدیریت کنید - بخشی از عملیات مالی", ar: "إدارة طلبات شحن محافظ العملاء وأرصدتهم - جزء من العمليات المالية", tr: "Müşteri cüzdan yükleme taleplerini ve bakiyelerini yönetin - Finansal operasyonların parçası" },
  modifyWallet: { en: "Change Wallet Balance", fa: "تغییر موجودی کیف پول", ar: "تغيير رصيد المحفظة", tr: "Cüzdan Bakiyesini Değiştir" },
  refresh: { en: "Refresh", fa: "تازه‌سازی", ar: "تحديث", tr: "Yenile" },
  refreshed: { en: "Refreshed", fa: "تازه‌سازی شد", ar: "تم التحديث", tr: "Yenilendi" },
  refreshSuccess: { en: "Data refreshed successfully", fa: "داده‌ها با موفقیت تازه‌سازی شدند", ar: "تم تحديث البيانات بنجاح", tr: "Veriler başarıyla yenilendi" },
  totalWallets: { en: "Total Wallets", fa: "مجموع کیف پول‌ها", ar: "إجمالي المحافظ", tr: "Toplam Cüzdan" },
  activeWallets: { en: "Active customer wallets", fa: "کیف پول‌های فعال مشتریان", ar: "محافظ العملاء النشطة", tr: "Aktif müşteri cüzdanları" },
  totalBalance: { en: "Total Balance", fa: "مجموع موجودی", ar: "إجمالي الرصيد", tr: "Toplam Bakiye" },
  combinedBalance: { en: "Combined wallet balances", fa: "مجموع موجودی کیف پول‌ها", ar: "إجمالي أرصدة المحافظ", tr: "Birleşik cüzdan bakiyeleri" },
  pendingRequests: { en: "Pending Requests", fa: "درخواست‌های در انتظار", ar: "الطلبات المعلقة", tr: "Bekleyen Talepler" },
  awaitingApproval: { en: "Awaiting approval", fa: "در انتظار تأیید", ar: "بانتظار الموافقة", tr: "Onay bekliyor" },
  processed: { en: "Processed", fa: "پردازش‌شده", ar: "تمت معالجتها", tr: "İşlenen" },
  approvedCompleted: { en: "Approved & completed", fa: "تأیید و تکمیل‌شده", ar: "تمت الموافقة والإكمال", tr: "Onaylandı ve tamamlandı" },
  pendingTab: { en: "Pending Requests", fa: "درخواست‌های در انتظار", ar: "الطلبات المعلقة", tr: "Bekleyen Talepler" },
  allRequests: { en: "All Requests", fa: "همه درخواست‌ها", ar: "كل الطلبات", tr: "Tüm Talepler" },
  walletHolders: { en: "Wallet Holders", fa: "دارندگان کیف پول", ar: "أصحاب المحافظ", tr: "Cüzdan Sahipleri" },
  pendingTitle: { en: "Pending Wallet Recharge Requests", fa: "درخواست‌های شارژ کیف پول در انتظار", ar: "طلبات شحن المحافظ المعلقة", tr: "Bekleyen Cüzdan Yükleme Talepleri" },
  pendingDescription: { en: "Review and approve customer wallet recharge requests", fa: "درخواست‌های شارژ کیف پول مشتریان را بررسی و تأیید کنید", ar: "راجع طلبات شحن محافظ العملاء ووافق عليها", tr: "Müşteri cüzdan yükleme taleplerini inceleyin ve onaylayın" },
  allTitle: { en: "All Wallet Recharge Requests", fa: "همه درخواست‌های شارژ کیف پول", ar: "كل طلبات شحن المحافظ", tr: "Tüm Cüzdan Yükleme Talepleri" },
  allDescription: { en: "Complete history of wallet recharge requests", fa: "تاریخچه کامل درخواست‌های شارژ کیف پول", ar: "السجل الكامل لطلبات شحن المحافظ", tr: "Cüzdan yükleme taleplerinin tüm geçmişi" },
  requestNumber: { en: "Request #", fa: "شماره درخواست", ar: "رقم الطلب", tr: "Talep No" },
  customer: { en: "Customer", fa: "مشتری", ar: "العميل", tr: "Müşteri" },
  currentBalance: { en: "Current Balance", fa: "موجودی فعلی", ar: "الرصيد الحالي", tr: "Mevcut Bakiye" },
  amount: { en: "Amount", fa: "مبلغ", ar: "المبلغ", tr: "Tutar" },
  paymentMethod: { en: "Payment Method", fa: "روش پرداخت", ar: "طريقة الدفع", tr: "Ödeme Yöntemi" },
  date: { en: "Date", fa: "تاریخ", ar: "التاريخ", tr: "Tarih" },
  status: { en: "Status", fa: "وضعیت", ar: "الحالة", tr: "Durum" },
  actions: { en: "Actions", fa: "عملیات", ar: "الإجراءات", tr: "İşlemler" },
  loading: { en: "Loading...", fa: "در حال بارگذاری...", ar: "جارٍ التحميل...", tr: "Yükleniyor..." },
  unknown: { en: "Unknown", fa: "نامشخص", ar: "غير معروف", tr: "Bilinmiyor" },
  customerFallback: { en: "Customer", fa: "مشتری", ar: "العميل", tr: "Müşteri" },
  noEmail: { en: "No email", fa: "ایمیل موجود نیست", ar: "لا يوجد بريد إلكتروني", tr: "E-posta yok" },
  noPhone: { en: "No phone", fa: "تلفن موجود نیست", ar: "لا يوجد هاتف", tr: "Telefon yok" },
  view: { en: "View", fa: "مشاهده", ar: "عرض", tr: "Görüntüle" },
  sync: { en: "Sync", fa: "همگام‌سازی", ar: "مزامنة", tr: "Senkronize Et" },
  syncTitle: { en: "Sync this customer's wallet", fa: "همگام‌سازی کیف پول این مشتری", ar: "مزامنة محفظة هذا العميل", tr: "Bu müşterinin cüzdanını senkronize et" },
  approve: { en: "Approve", fa: "تأیید", ar: "موافقة", tr: "Onayla" },
  reject: { en: "Reject", fa: "رد", ar: "رفض", tr: "Reddet" },
  noPending: { en: "No pending requests found", fa: "درخواستی در انتظار یافت نشد", ar: "لم يتم العثور على طلبات معلقة", tr: "Bekleyen talep bulunamadı" },
  noRequests: { en: "No requests found", fa: "درخواستی یافت نشد", ar: "لم يتم العثور على طلبات", tr: "Talep bulunamadı" },
  noWallets: { en: "No wallets found", fa: "کیف پولی یافت نشد", ar: "لم يتم العثور على محافظ", tr: "Cüzdan bulunamadı" },
  details: { en: "Recharge Request Details", fa: "جزئیات درخواست شارژ", ar: "تفاصيل طلب الشحن", tr: "Yükleme Talebi Ayrıntıları" },
  detailsDescription: { en: "Complete information about the wallet recharge request", fa: "اطلاعات کامل درخواست شارژ کیف پول", ar: "المعلومات الكاملة عن طلب شحن المحفظة", tr: "Cüzdan yükleme talebi hakkında tüm bilgiler" },
  process: { en: "Process Recharge Request", fa: "پردازش درخواست شارژ", ar: "معالجة طلب الشحن", tr: "Yükleme Talebini İşle" },
  processDescription: { en: "Approve or reject the wallet recharge request", fa: "درخواست شارژ کیف پول را تأیید یا رد کنید", ar: "وافق على طلب شحن المحفظة أو ارفضه", tr: "Cüzdan yükleme talebini onaylayın veya reddedin" },
  paymentReference: { en: "Payment Reference", fa: "مرجع پرداخت", ar: "مرجع الدفع", tr: "Ödeme Referansı" },
  createdAt: { en: "Created At", fa: "زمان ایجاد", ar: "تاريخ الإنشاء", tr: "Oluşturulma Tarihi" },
  approvedAt: { en: "Approved At", fa: "زمان تأیید", ar: "تاريخ الموافقة", tr: "Onaylanma Tarihi" },
  customerNotes: { en: "Customer Notes", fa: "یادداشت‌های مشتری", ar: "ملاحظات العميل", tr: "Müşteri Notları" },
  adminNotes: { en: "Admin Notes", fa: "یادداشت‌های مدیر", ar: "ملاحظات المسؤول", tr: "Yönetici Notları" },
  rejectionReason: { en: "Rejection Reason", fa: "دلیل رد", ar: "سبب الرفض", tr: "Reddetme Nedeni" },
  optional: { en: "Optional", fa: "اختیاری", ar: "اختياري", tr: "İsteğe bağlı" },
  cancel: { en: "Cancel", fa: "لغو", ar: "إلغاء", tr: "İptal" },
  notesPlaceholder: { en: "Add internal notes about this request...", fa: "یادداشت داخلی درباره این درخواست...", ar: "أضف ملاحظات داخلية حول هذا الطلب...", tr: "Bu talep hakkında dahili not ekleyin..." },
  rejectionPlaceholder: { en: "Explain why this request is being rejected...", fa: "دلیل رد این درخواست را توضیح دهید...", ar: "اشرح سبب رفض هذا الطلب...", tr: "Bu talebin neden reddedildiğini açıklayın..." },
  requiredReason: { en: "Rejection reason is required", fa: "وارد کردن دلیل رد الزامی است", ar: "سبب الرفض مطلوب", tr: "Reddetme nedeni gereklidir" },
  changeWalletDescription: { en: "Change a customer's wallet balance. All changes are recorded in transaction history.", fa: "موجودی کیف پول مشتری را تغییر دهید. همه تغییرات در سابقه تراکنش‌ها ثبت می‌شوند.", ar: "غيّر رصيد محفظة العميل. تُسجّل جميع التغييرات في سجل المعاملات.", tr: "Müşterinin cüzdan bakiyesini değiştirin. Tüm değişiklikler işlem geçmişine kaydedilir." },
  customerEmail: { en: "Customer email address", fa: "آدرس ایمیل مشتری", ar: "عنوان بريد العميل", tr: "Müşteri e-posta adresi" },
  emailPlaceholder: { en: "Enter customer email (at least 3 characters)", fa: "ایمیل مشتری را وارد کنید (حداقل ۳ حرف)", ar: "أدخل بريد العميل (ثلاثة أحرف على الأقل)", tr: "Müşteri e-postasını girin (en az 3 karakter)" },
  noCustomer: { en: "No customer found with this email", fa: "مشتری‌ای با این ایمیل یافت نشد", ar: "لم يتم العثور على عميل بهذا البريد", tr: "Bu e-postaya sahip müşteri bulunamadı" },
  selectedCustomer: { en: "Selected customer", fa: "مشتری انتخاب‌شده", ar: "العميل المحدد", tr: "Seçilen müşteri" },
  email: { en: "Email", fa: "ایمیل", ar: "البريد الإلكتروني", tr: "E-posta" },
  phone: { en: "Phone", fa: "تلفن", ar: "الهاتف", tr: "Telefon" },
  identifier: { en: "ID", fa: "شناسه", ar: "المعرّف", tr: "Kimlik" },
  modificationType: { en: "Change Type", fa: "نوع تغییر", ar: "نوع التغيير", tr: "Değişiklik Türü" },
  credit: { en: "Increase balance (Credit)", fa: "افزایش موجودی (Credit)", ar: "زيادة الرصيد (Credit)", tr: "Bakiyeyi artır (Credit)" },
  debit: { en: "Decrease balance (Debit)", fa: "کاهش موجودی (Debit)", ar: "خفض الرصيد (Debit)", tr: "Bakiyeyi azalt (Debit)" },
  setBalance: { en: "Set balance (Set Balance)", fa: "تنظیم موجودی (Set Balance)", ar: "تعيين الرصيد (Set Balance)", tr: "Bakiyeyi ayarla (Set Balance)" },
  newBalance: { en: "New Balance", fa: "موجودی جدید", ar: "الرصيد الجديد", tr: "Yeni Bakiye" },
  changeAmount: { en: "Change Amount", fa: "مقدار تغییر", ar: "مقدار التغيير", tr: "Değişiklik Tutarı" },
  enterAmount: { en: "Enter amount", fa: "مقدار را وارد کنید", ar: "أدخل المبلغ", tr: "Tutarı girin" },
  reason: { en: "Reason", fa: "علت", ar: "السبب", tr: "Neden" },
  reasonPlaceholder: { en: "Enter reason for change", fa: "علت تغییر را وارد کنید", ar: "أدخل سبب التغيير", tr: "Değişiklik nedenini girin" },
  apply: { en: "Apply", fa: "اعمال", ar: "تطبيق", tr: "Uygula" },
  confirmChange: { en: "Confirm Change", fa: "تأیید تغییر", ar: "تأكيد التغيير", tr: "Değişikliği Onayla" },
  processing: { en: "Processing...", fa: "در حال پردازش...", ar: "جارٍ المعالجة...", tr: "İşleniyor..." },
  fillAll: { en: "Select a customer and fill in all fields", fa: "مشتری را انتخاب کرده و همه فیلدها را پر کنید", ar: "حدد عميلاً واملأ جميع الحقول", tr: "Bir müşteri seçin ve tüm alanları doldurun" },
  success: { en: "Success", fa: "موفق", ar: "نجاح", tr: "Başarılı" },
  error: { en: "Error", fa: "خطا", ar: "خطأ", tr: "Hata" },
  approvedSuccess: { en: "Recharge request approved successfully", fa: "درخواست شارژ با موفقیت تأیید شد", ar: "تمت الموافقة على طلب الشحن بنجاح", tr: "Yükleme talebi başarıyla onaylandı" },
  rejectedSuccess: { en: "Recharge request rejected", fa: "درخواست شارژ رد شد", ar: "تم رفض طلب الشحن", tr: "Yükleme talebi reddedildi" },
  approveError: { en: "Failed to approve recharge request", fa: "تأیید درخواست شارژ ناموفق بود", ar: "فشلت الموافقة على طلب الشحن", tr: "Yükleme talebi onaylanamadı" },
  rejectError: { en: "Failed to reject recharge request", fa: "رد درخواست شارژ ناموفق بود", ar: "فشل رفض طلب الشحن", tr: "Yükleme talebi reddedilemedi" },
  enterAmountReason: { en: "Please enter amount and reason", fa: "لطفاً مقدار و علت را وارد کنید", ar: "يرجى إدخال المبلغ والسبب", tr: "Lütfen tutar ve nedeni girin" },
  syncSuccess: { en: "Wallet information synchronized successfully", fa: "اطلاعات کیف پول با موفقیت همگام‌سازی شد", ar: "تمت مزامنة معلومات المحفظة بنجاح", tr: "Cüzdan bilgileri başarıyla senkronize edildi" },
  syncError: { en: "Error synchronizing wallet information", fa: "خطا در همگام‌سازی اطلاعات کیف پول", ar: "خطأ في مزامنة معلومات المحفظة", tr: "Cüzdan bilgileri senkronize edilemedi" },
  balanceSuccess: { en: "Wallet balance modified successfully", fa: "موجودی کیف پول با موفقیت تغییر کرد", ar: "تم تعديل رصيد المحفظة بنجاح", tr: "Cüzdan bakiyesi başarıyla değiştirildi" },
  balanceError: { en: "Error modifying wallet balance", fa: "خطا در تغییر موجودی کیف پول", ar: "خطأ في تعديل رصيد المحفظة", tr: "Cüzdan bakiyesi değiştirilemedi" },
};

export default function WalletManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { language, direction } = useLanguage();
  const locale = language === "fa" ? "fa-IR" : language === "ar" ? "ar" : language === "tr" ? "tr-TR" : "en-US";
  const tx = (key: keyof typeof walletCopy) => walletCopy[key][language];
  const [selectedRequest, setSelectedRequest] = useState<WalletRechargeRequest | null>(null);
  const [customerBalances, setCustomerBalances] = useState<{[key: number]: number}>({});
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Wallet modification states
  const [isModifyDialogOpen, setIsModifyDialogOpen] = useState(false);
  const [modifyCustomerId, setModifyCustomerId] = useState<number | null>(null);
  const [modifyCustomerEmail, setModifyCustomerEmail] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [modifyAmount, setModifyAmount] = useState("");
  const [modifyReason, setModifyReason] = useState("");
  const [modificationType, setModificationType] = useState<'credit' | 'debit' | 'set_balance'>('credit');
  
  // Inline modification states for wallet holders
  const [inlineModifications, setInlineModifications] = useState<{[key: number]: {amount: string, reason: string}}>({});

  // Check if user is super admin (id = 1)
  const isSuperAdmin = user?.id === 1;

  // Get refresh interval from global settings
  const getRefreshInterval = () => {
    const globalSettings = localStorage.getItem('global-refresh-settings');
    if (globalSettings) {
      const settings = JSON.parse(globalSettings);
      const crmSettings = settings.departments.crm;
      
      if (crmSettings?.autoRefresh) {
        const refreshInterval = settings.syncEnabled 
          ? settings.globalInterval 
          : crmSettings.interval;
        return refreshInterval * 1000; // Convert seconds to milliseconds
      }
    }
    return 300000; // Default 5 minutes if no settings found
  };

  // Fetch wallet statistics
  const { data: statsData, isLoading: statsLoading } = useQuery<{ success: boolean; data: WalletStats }>({
    queryKey: ['/api/wallet/stats'],
    refetchInterval: getRefreshInterval()
  });

  // Fetch pending recharge requests
  const { data: pendingRequestsData, isLoading: pendingLoading } = useQuery<{ success: boolean; data: WalletRechargeRequest[] }>({
    queryKey: ['/api/wallet/recharge-requests/pending'],
    refetchInterval: getRefreshInterval()
  });

  // Fetch all recharge requests
  const { data: allRequestsData, isLoading: allLoading } = useQuery<{ success: boolean; data: WalletRechargeRequest[] }>({
    queryKey: ['/api/wallet/recharge-requests'],
    refetchInterval: getRefreshInterval()
  });
  
  // Fetch all wallet holders
  const { data: walletHoldersData, isLoading: holdersLoading } = useQuery<{ success: boolean; data: WalletHolder[] }>({
    queryKey: ['/api/admin/wallet/holders'],
    refetchInterval: getRefreshInterval()
  });

  // Approve recharge request
  const approveMutation = useMutation({
    mutationFn: (data: { requestId: number; adminNotes?: string }) => 
      apiRequest(`/api/admin/wallet/recharge-requests/${data.requestId}/approve`, 'POST', { adminNotes: data.adminNotes }),
    onSuccess: () => {
      toast({ title: tx("success"), description: tx("approvedSuccess") });
      setIsApprovalDialogOpen(false);
      setAdminNotes("");
      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
    },
    onError: () => {
      toast({ title: tx("error"), description: tx("approveError"), variant: "destructive" });
    }
  });

  // Reject recharge request
  const rejectMutation = useMutation({
    mutationFn: (data: { requestId: number; rejectionReason: string; adminNotes?: string }) => 
      apiRequest(`/api/admin/wallet/recharge-requests/${data.requestId}/reject`, 'POST', { 
        rejectionReason: data.rejectionReason,
        adminNotes: data.adminNotes 
      }),
    onSuccess: () => {
      toast({ title: tx("success"), description: tx("rejectedSuccess") });
      setIsApprovalDialogOpen(false);
      setRejectionReason("");
      setAdminNotes("");
      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
    },
    onError: () => {
      toast({ title: tx("error"), description: tx("rejectError"), variant: "destructive" });
    }
  });

  // Search customers by email
  const searchCustomers = async (email: string) => {
    if (email.length < 3) {
      setCustomerSearchResults([]);
      setShowCustomerDropdown(false);
      return;
    }

    try {
      const response = await apiRequest(`/api/admin/customers/search?email=${encodeURIComponent(email)}`);
      if (response.success) {
        setCustomerSearchResults(response.data || []);
        setShowCustomerDropdown(true);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      setCustomerSearchResults([]);
      setShowCustomerDropdown(false);
    }
  };

  // Handle email input change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchCustomers(modifyCustomerEmail);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [modifyCustomerEmail]);

  // Fetch customer balances when data loads
  useEffect(() => {
    if (pendingRequestsData?.data && pendingRequestsData.data.length > 0) {
      const customerIds = pendingRequestsData.data.map(request => request.customerId);
      const uniqueCustomerIds = [...new Set(customerIds)];
      fetchCustomerBalances(uniqueCustomerIds);
    }
  }, [pendingRequestsData?.data]);

  useEffect(() => {
    if (allRequestsData?.data && allRequestsData.data.length > 0) {
      const customerIds = allRequestsData.data.map(request => request.customerId);
      const uniqueCustomerIds = [...new Set(customerIds)];
      fetchCustomerBalances(uniqueCustomerIds);
    }
  }, [allRequestsData?.data]);

  // Handle customer selection
  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setModifyCustomerId(customer.id);
    setModifyCustomerEmail(customer.email);
    setShowCustomerDropdown(false);
  };

  // Fetch customer wallet balances
  const fetchCustomerBalances = async (customerIds: number[]) => {
    try {
      const balancePromises = customerIds.map(async (customerId) => {
        try {
          const response = await fetch(`/api/wallet/balance/${customerId}`, {
            credentials: 'include'
          });
          if (response.ok) {
            const result = await response.json();
            return { customerId, balance: result.data.balance };
          }
          return { customerId, balance: 0 };
        } catch (error) {
          console.error(`Error fetching balance for customer ${customerId}:`, error);
          return { customerId, balance: 0 };
        }
      });

      const results = await Promise.all(balancePromises);
      const balancesMap: {[key: number]: number} = {};
      results.forEach(({ customerId, balance }) => {
        balancesMap[customerId] = balance;
      });
      setCustomerBalances(balancesMap);
    } catch (error) {
      console.error('Error fetching customer balances:', error);
    }
  };

  // Reset customer form
  const resetCustomerForm = () => {
    setModifyCustomerId(null);
    setModifyCustomerEmail("");
    setSelectedCustomer(null);
    setCustomerSearchResults([]);
    setShowCustomerDropdown(false);
    setModifyAmount("");
    setModifyReason("");
    setModificationType('credit');
  };
  
  // Handle inline balance modification
  const handleInlineModification = (customerId: number, amount: string, reason: string) => {
    if (!amount || !reason) {
      toast({
        title: tx("error"),
        description: tx("enterAmountReason"),
        variant: "destructive"
      });
      return;
    }
    
    modifyBalanceMutation.mutate({
      customerId,
      amount,
      reason,
      modificationType: parseFloat(amount) >= 0 ? 'credit' : 'debit'
    });
    
    // Clear the inline modification fields
    setInlineModifications(prev => ({
      ...prev,
      [customerId]: { amount: '', reason: '' }
    }));
  };
  
  // Update inline modification fields
  const updateInlineModification = (customerId: number, field: 'amount' | 'reason', value: string) => {
    setInlineModifications(prev => ({
      ...prev,
      [customerId]: {
        ...prev[customerId],
        [field]: value
      }
    }));
  };

  // Force wallet sync mutation
  const syncWalletMutation = useMutation({
    mutationFn: (customerId: number) => 
      apiRequest(`/api/wallet/force-sync/${customerId}`, { method: 'POST', body: {} }),
    onSuccess: (data) => {
      toast({ 
        title: tx("success"),
        description: tx("syncSuccess")
      });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
    },
    onError: (error: any) => {
      toast({ 
        title: tx("error"),
        description: error?.message || tx("syncError"),
        variant: "destructive" 
      });
    }
  });

  // Modify wallet balance
  const modifyBalanceMutation = useMutation({
    mutationFn: (data: { customerId: number; amount: string; reason: string; modificationType: string }) => 
      apiRequest('/api/admin/wallet/modify-balance', { method: 'POST', body: data }),
    onSuccess: (data) => {
      toast({ 
        title: tx("success"),
        description: data.message || tx("balanceSuccess")
      });
      setIsModifyDialogOpen(false);
      resetCustomerForm();
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
    },
    onError: (error: any) => {
      toast({ 
        title: tx("error"),
        description: error?.message || tx("balanceError"),
        variant: "destructive" 
      });
    }
  });

  const formatCurrency = (amount: string | number, currency: string = "IQD") => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200"><Clock className="w-3 h-3 mr-1" />{tx("pendingRequests")}</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />{tx("approve")}</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200"><XCircle className="w-3 h-3 mr-1" />{tx("reject")}</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200"><CheckCircle className="w-3 h-3 mr-1" />{tx("processed")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewDetails = (request: WalletRechargeRequest) => {
    setSelectedRequest(request);
    setIsDetailsDialogOpen(true);
  };

  const handleApprove = (request: WalletRechargeRequest) => {
    setSelectedRequest(request);
    setIsApprovalDialogOpen(true);
  };

  const handleReject = (request: WalletRechargeRequest) => {
    setSelectedRequest(request);
    setIsApprovalDialogOpen(true);
  };

  return (
    <div dir={direction} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {isSuperAdmin && (
              <Button
                variant="ghost"
                onClick={() => setLocation("/site-management")}
                className="hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {tx("back")}
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {tx("title")}
              </h1>
              <p className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-1">
                {tx("module")}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {tx("description")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setIsModifyDialogOpen(true)}
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {tx("modifyWallet")}
            </Button>
            <Button 
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
                toast({ title: tx("refreshed"), description: tx("refreshSuccess") });
              }}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {tx("refresh")}
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{tx("totalWallets")}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData?.data?.totalWallets || 0}</div>
              <p className="text-xs text-muted-foreground">{tx("activeWallets")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{tx("totalBalance")}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(statsData?.data?.totalBalance || 0)}
              </div>
              <p className="text-xs text-muted-foreground">{tx("combinedBalance")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{tx("pendingRequests")}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {statsData?.data?.pendingRequests || 0}
              </div>
              <p className="text-xs text-muted-foreground">{tx("awaitingApproval")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{tx("processed")}</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {statsData?.data?.totalProcessed || 0}
              </div>
              <p className="text-xs text-muted-foreground">{tx("approvedCompleted")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending">{tx("pendingTab")}</TabsTrigger>
            <TabsTrigger value="all">{tx("allRequests")}</TabsTrigger>
            <TabsTrigger value="wallet-holders">{tx("walletHolders")}</TabsTrigger>
          </TabsList>

          {/* Pending Requests Tab */}
          <TabsContent value="pending" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{tx("pendingTitle")}</CardTitle>
                <CardDescription>
                  {tx("pendingDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tx("requestNumber")}</TableHead>
                        <TableHead>{tx("customer")}</TableHead>
                        <TableHead>{tx("currentBalance")}</TableHead>
                        <TableHead>{tx("amount")}</TableHead>
                        <TableHead>{tx("paymentMethod")}</TableHead>
                        <TableHead>{tx("date")}</TableHead>
                        <TableHead>{tx("status")}</TableHead>
                        <TableHead>{tx("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequestsData?.data?.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.requestNumber}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {request.customer?.firstName || tx("unknown")} {request.customer?.lastName || tx("customerFallback")}
                              </div>
                              <div className="text-sm text-gray-500">{request.customer?.email || tx("noEmail")}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-blue-600">
                              {customerBalances[request.customerId] !== undefined 
                                ? formatCurrency(customerBalances[request.customerId], 'IQD')
                                : <span className="text-gray-400">{tx("loading")}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatCurrency(request.amount, request.currency)}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{request.paymentMethod}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(request.createdAt)}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(request)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                {tx("view")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => syncWalletMutation.mutate(request.customerId)}
                                disabled={syncWalletMutation.isPending}
                                title={tx("syncTitle")}
                              >
                                <RefreshCw className={`w-4 h-4 mr-1 ${syncWalletMutation.isPending ? 'animate-spin' : ''}`} />
                                {tx("sync")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleApprove(request)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                {tx("approve")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleReject(request)}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                {tx("reject")}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {pendingRequestsData?.data?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No pending requests found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Requests Tab */}
          <TabsContent value="all" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{tx("allTitle")}</CardTitle>
                <CardDescription>
                  {tx("allDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tx("requestNumber")}</TableHead>
                        <TableHead>{tx("customer")}</TableHead>
                        <TableHead>{tx("currentBalance")}</TableHead>
                        <TableHead>{tx("amount")}</TableHead>
                        <TableHead>{tx("paymentMethod")}</TableHead>
                        <TableHead>{tx("date")}</TableHead>
                        <TableHead>{tx("status")}</TableHead>
                        <TableHead>{tx("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allRequestsData?.data?.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.requestNumber}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {request.customer?.firstName || tx("unknown")} {request.customer?.lastName || tx("customerFallback")}
                              </div>
                              <div className="text-sm text-gray-500">{request.customer?.email || tx("noEmail")}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-blue-600">
                              {customerBalances[request.customerId] !== undefined 
                                ? formatCurrency(customerBalances[request.customerId], 'IQD')
                                : <span className="text-gray-400">{tx("loading")}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatCurrency(request.amount, request.currency)}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{request.paymentMethod}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(request.createdAt)}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(request)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                {tx("view")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => syncWalletMutation.mutate(request.customerId)}
                                disabled={syncWalletMutation.isPending}
                                title={tx("syncTitle")}
                              >
                                <RefreshCw className={`w-4 h-4 mr-1 ${syncWalletMutation.isPending ? 'animate-spin' : ''}`} />
                                {tx("sync")}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {allRequestsData?.data?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No requests found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wallet Holders Tab */}
          <TabsContent value="wallet-holders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{tx("title")}</CardTitle>
                <CardDescription>
                  {tx("walletHolders")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {holdersLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tx("customer")}</TableHead>
                        <TableHead>{tx("email")}</TableHead>
                        <TableHead>{tx("currentBalance")}</TableHead>
                        <TableHead>{tx("date")}</TableHead>
                        <TableHead>{tx("status")}</TableHead>
                        <TableHead>{tx("changeAmount")}</TableHead>
                        <TableHead>{tx("reason")}</TableHead>
                        <TableHead>{tx("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {walletHoldersData?.data?.map((holder) => (
                        <TableRow key={holder.customerId}>
                          <TableCell className="font-medium">{holder.customerName}</TableCell>
                          <TableCell>{holder.customerEmail}</TableCell>
                          <TableCell>
                            <div className="font-medium text-green-600">
                              {formatCurrency(holder.balance, 'IQD')}
                            </div>
                          </TableCell>
                          <TableCell>
                            {holder.lastActivityDate 
                              ? formatDate(holder.lastActivityDate.toString())
                              : tx("noRequests")
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant={holder.isActive ? "default" : "secondary"}>
                              {holder.isActive ? tx("approve") : tx("reject")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              placeholder={tx("changeAmount")}
                              value={inlineModifications[holder.customerId]?.amount || ''}
                              onChange={(e) => updateInlineModification(holder.customerId, 'amount', e.target.value)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder={tx("reasonPlaceholder")}
                              value={inlineModifications[holder.customerId]?.reason || ''}
                              onChange={(e) => updateInlineModification(holder.customerId, 'reason', e.target.value)}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => syncWalletMutation.mutate(holder.customerId)}
                                disabled={syncWalletMutation.isPending}
                                title={tx("syncTitle")}
                              >
                                <RefreshCw className={`w-4 h-4 mr-1 ${syncWalletMutation.isPending ? 'animate-spin' : ''}`} />
                                {tx("sync")}
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleInlineModification(
                                  holder.customerId,
                                  inlineModifications[holder.customerId]?.amount || '',
                                  inlineModifications[holder.customerId]?.reason || ''
                                )}
                                disabled={
                                  modifyBalanceMutation.isPending ||
                                  !inlineModifications[holder.customerId]?.amount ||
                                  !inlineModifications[holder.customerId]?.reason
                                }
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <CreditCard className="w-4 h-4 mr-1" />
                                {tx("apply")}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {walletHoldersData?.data?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                            {tx("noWallets")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Request Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent dir={direction} className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{tx("details")}</DialogTitle>
              <DialogDescription>
                {tx("detailsDescription")}
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">{tx("requestNumber")}</Label>
                    <p className="text-sm text-gray-600">{selectedRequest.requestNumber}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{tx("status")}</Label>
                    <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{tx("customer")}</Label>
                    <p className="text-sm text-gray-600">
                      {selectedRequest.customer?.firstName || tx("unknown")} {selectedRequest.customer?.lastName || tx("customerFallback")}
                    </p>
                    <p className="text-xs text-gray-500">{selectedRequest.customer?.email || tx("noEmail")}</p>
                    <p className="text-xs text-gray-500">{selectedRequest.customer?.phone || tx("noPhone")}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{tx("amount")}</Label>
                    <p className="text-sm font-semibold text-green-600">
                      {formatCurrency(selectedRequest.amount, selectedRequest.currency)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{tx("paymentMethod")}</Label>
                    <p className="text-sm text-gray-600">{selectedRequest.paymentMethod}</p>
                  </div>
                  {selectedRequest.paymentReference && (
                    <div>
                      <Label className="text-sm font-medium">{tx("paymentReference")}</Label>
                      <p className="text-sm text-gray-600">{selectedRequest.paymentReference}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium">{tx("createdAt")}</Label>
                    <p className="text-sm text-gray-600">{formatDate(selectedRequest.createdAt)}</p>
                  </div>
                  {selectedRequest.approvedAt && (
                    <div>
                      <Label className="text-sm font-medium">{tx("approvedAt")}</Label>
                      <p className="text-sm text-gray-600">{formatDate(selectedRequest.approvedAt)}</p>
                    </div>
                  )}
                </div>
                {selectedRequest.customerNotes && (
                  <div>
                    <Label className="text-sm font-medium">{tx("customerNotes")}</Label>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
                      {selectedRequest.customerNotes}
                    </p>
                  </div>
                )}
                {selectedRequest.adminNotes && (
                  <div>
                    <Label className="text-sm font-medium">{tx("adminNotes")}</Label>
                    <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded border">
                      {selectedRequest.adminNotes}
                    </p>
                  </div>
                )}
                {selectedRequest.rejectionReason && (
                  <div>
                    <Label className="text-sm font-medium">{tx("rejectionReason")}</Label>
                    <p className="text-sm text-red-600 bg-red-50 p-3 rounded border">
                      {selectedRequest.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Approval/Rejection Dialog */}
        <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
          <DialogContent dir={direction}>
            <DialogHeader>
              <DialogTitle>{tx("process")}</DialogTitle>
              <DialogDescription>
                {tx("processDescription")}
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded border">
                  <p className="font-medium">Request: {selectedRequest.requestNumber}</p>
                  <p className="text-sm text-gray-600">
                    {selectedRequest.customer?.firstName || tx("unknown")} {selectedRequest.customer?.lastName || tx("customerFallback")} - {formatCurrency(selectedRequest.amount, selectedRequest.currency)}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="adminNotes">{tx("adminNotes")} ({tx("optional")})</Label>
                  <Textarea
                    id="adminNotes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={tx("notesPlaceholder")}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="rejectionReason">{tx("rejectionReason")} ({tx("reject")})</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder={tx("rejectionPlaceholder")}
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsApprovalDialogOpen(false)}
                  >
                    {tx("cancel")}
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      if (!rejectionReason.trim()) {
                        toast({ title: tx("error"), description: tx("requiredReason"), variant: "destructive" });
                        return;
                      }
                      rejectMutation.mutate({
                        requestId: selectedRequest.id,
                        rejectionReason,
                        adminNotes
                      });
                    }}
                    disabled={rejectMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    {tx("reject")}
                  </Button>
                  <Button
                    className="text-green-600 hover:text-green-700"
                    onClick={() => {
                      approveMutation.mutate({
                        requestId: selectedRequest.id,
                        adminNotes
                      });
                    }}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {tx("approve")}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Wallet Balance Modification Dialog */}
        <Dialog open={isModifyDialogOpen} onOpenChange={setIsModifyDialogOpen}>
          <DialogContent className="sm:max-w-[500px]" dir={direction}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                {tx("modifyWallet")}
              </DialogTitle>
              <DialogDescription>
                {tx("changeWalletDescription")}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="relative">
                <Label htmlFor="customerEmail">{tx("customerEmail")}</Label>
                <div className="relative">
                  <Input
                    id="customerEmail"
                    type="email"
                    value={modifyCustomerEmail}
                    onChange={(e) => {
                      setModifyCustomerEmail(e.target.value);
                      setSelectedCustomer(null);
                      setModifyCustomerId(null);
                    }}
                    placeholder={tx("emailPlaceholder")}
                    className={direction === "rtl" ? "text-right pl-10" : "text-left pr-10"}
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
                
                {/* Customer Search Results Dropdown */}
                {showCustomerDropdown && customerSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                    {customerSearchResults.map((customer) => (
                      <div
                        key={customer.id}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => handleCustomerSelect(customer)}
                      >
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div className="text-sm text-gray-600">
                             {tx("email")}: {customer.email}
                          </div>
                          <div className="text-sm text-gray-600">
                             {tx("phone")}: {customer.phone}
                          </div>
                          <div className="text-xs text-gray-500">
                             {tx("identifier")}: {customer.id}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* No Results Message */}
                {showCustomerDropdown && customerSearchResults.length === 0 && modifyCustomerEmail.length >= 3 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-50 p-3 text-center text-gray-500 text-sm">
                     {tx("noCustomer")}
                  </div>
                )}
              </div>

              {/* Selected Customer Display */}
              {selectedCustomer && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="text-right">
                    <div className="font-medium text-green-800">
                       {tx("selectedCustomer")}: {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </div>
                    <div className="text-sm text-green-700 mt-1">
                       {tx("email")}: {selectedCustomer.email} | {tx("phone")}: {selectedCustomer.phone}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="modificationType">{tx("modificationType")}</Label>
                <select
                  id="modificationType"
                  value={modificationType}
                  onChange={(e) => setModificationType(e.target.value as 'credit' | 'debit' | 'set_balance')}
                  className="w-full p-2 border border-gray-300 rounded-md text-right"
                >
                  <option value="credit">{tx("credit")}</option>
                  <option value="debit">{tx("debit")}</option>
                  <option value="set_balance">{tx("setBalance")}</option>
                </select>
              </div>

              <div>
                <Label htmlFor="amount" className="text-right">
                   {modificationType === 'set_balance' ? tx("newBalance") : tx("changeAmount")} (IQD)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={modifyAmount}
                  onChange={(e) => setModifyAmount(e.target.value)}
                  placeholder={tx("enterAmount")}
                  className={direction === "rtl" ? "text-right" : "text-left"}
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <Label htmlFor="reason">{tx("reason")}</Label>
                <Input
                  id="reason"
                  value={modifyReason}
                  onChange={(e) => setModifyReason(e.target.value)}
                  placeholder={tx("reasonPlaceholder")}
                  className={direction === "rtl" ? "text-right" : "text-left"}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsModifyDialogOpen(false);
                  resetCustomerForm();
                }}
              >
                {tx("cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (!modifyCustomerId || !selectedCustomer || !modifyAmount || !modifyReason) {
                    toast({
                      title: tx("error"),
                      description: tx("fillAll"),
                      variant: "destructive"
                    });
                    return;
                  }
                  
                  modifyBalanceMutation.mutate({
                    customerId: modifyCustomerId,
                    amount: modifyAmount,
                    reason: modifyReason,
                    modificationType: modificationType
                  });
                }}
                disabled={modifyBalanceMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {modifyBalanceMutation.isPending ? tx("processing") : tx("confirmChange")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}