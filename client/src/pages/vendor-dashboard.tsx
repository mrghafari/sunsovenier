import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Store, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign, 
  Eye,
  Edit,
  LogOut,
  Plus,
  Wallet,
  Percent,
  Calculator,
  CreditCard,
  Check,
  Clock,
  AlertCircle,
  Save,
  X
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useRef, useState, useMemo } from "react";
import JsBarcode from "jsbarcode";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// Barcode component with image rendering
function BarcodeImage({ value, align = 'center' }: { value: string; align?: 'left' | 'right' | 'center' }) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: false,
          margin: 6,
          background: "#ffffff"
        });
      } catch (e) {
        console.error("Barcode error:", e);
      }
    }
  }, [value]);

  if (!value) return <span className="text-muted-foreground">-</span>;

  const alignClass = align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center';

  return (
    <div className={`flex flex-col ${alignClass} py-2`}>
      <svg ref={svgRef} />
      <span className="text-sm font-mono text-gray-700 mt-2 font-bold">{value}</span>
    </div>
  );
}
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/lib/i18n";

type VendorCopy = {
  loading: string; active: string; inactive: string; products: string; orders: string; accounting: string; profile: string;
  recognizedRevenue: string; afterWarehouse: string; growth: string; versusLastMonth: string; myProducts: string;
  manageProducts: string; manageProductsShort: string; manageProductsDescription: string; noProducts: string; addFirstProduct: string;
  totalOrders: string; processingOrders: string; completedOrders: string; recentOrders: string; recentOrdersDescription: string;
  noOrders: string; order: string; date: string; productsFromYou: string; yourShare: string; totalOrderRevenue: string;
  recognizedRevenueLabel: string; noSales: string; noMatchingProducts: string; productName: string; barcode: string; quantity: string;
  orderColumn: string; sales: string; commission: string; net: string; total: string; payments: string; noPayments: string;
  confirmed: string; pendingConfirmation: string; paymentMethod: string; bankTransfer: string; referenceNumber: string;
  description: string; declaredDate: string; confirmedDate: string; storeInfo: string; changesPending: string; companyName: string;
  email: string; phone: string; city: string; address: string; businessLicense: string; taxId: string; aboutStore: string;
  editProfile: string; saveChanges: string; cancel: string; totalSales: string; netReceived: string; amountOwed: string;
  salesDetails: string; salesDetailsDescription: string; searchProducts: string; noChanges: string; success: string; error: string;
  paymentConfirmed: string; paymentConfirmError: string; changesSubmitted: string; changesSubmitError: string; logoutSuccess: string;
  logoutMessage: string; logoutError: string; authError: string; dataError: string; paymentPending: string;
  currency: string; statusDelivered: string; statusCompleted: string; statusCancelled: string; statusProcessing: string;
};

const vendorCopy = {
  en: { loading:"Loading…",active:"Active",inactive:"Inactive",products:"Products",orders:"Orders",accounting:"Accounting",profile:"Profile",recognizedRevenue:"Recognized revenue",afterWarehouse:"After warehouse dispatch",growth:"Growth",versusLastMonth:"Compared with last month",myProducts:"My products",manageProducts:"Manage products",manageProductsShort:"Manage",manageProductsDescription:"Manage and edit your store products",noProducts:"You have not added any products yet",addFirstProduct:"Add your first product",totalOrders:"Total orders",processingOrders:"Orders processing",completedOrders:"Completed orders",recentOrders:"Recent orders",recentOrdersDescription:"Orders that include your products",noOrders:"No orders have been placed yet",order:"Order",date:"Date",productsFromYou:"products from you in this order",yourShare:"Your share of the order",totalOrderRevenue:"Total order revenue",recognizedRevenueLabel:"Recognized revenue",noSales:"No sales recorded yet",noMatchingProducts:"No products match this search",productName:"Product name",barcode:"Barcode",quantity:"Quantity",orderColumn:"Order",sales:"Sales",commission:"Commission",net:"Net",total:"Total",payments:"Payments",noPayments:"No payments have been declared yet",confirmed:"Confirmed",pendingConfirmation:"Awaiting confirmation",paymentMethod:"Payment method",bankTransfer:"Bank transfer",referenceNumber:"Reference number",description:"Description",declaredDate:"Declared",confirmedDate:"Confirmed",storeInfo:"Store information",changesPending:"Changes awaiting administrator approval",companyName:"Company name",email:"Email",phone:"Phone",city:"City",address:"Address",businessLicense:"Business license number",taxId:"Tax ID",aboutStore:"About the store",editProfile:"Edit profile",saveChanges:"Save changes",cancel:"Cancel",totalSales:"Total sales",netReceived:"Net received",amountOwed:"Amount owed",salesDetails:"Product sales details",salesDetailsDescription:"Products sold with commission and net amount details",searchProducts:"Search (minimum 3 characters)…",noChanges:"No changes were made",success:"Success",error:"Error",paymentConfirmed:"Payment confirmed successfully",paymentConfirmError:"Unable to confirm payment",changesSubmitted:"Changes submitted and awaiting administrator approval",changesSubmitError:"Unable to submit changes",logoutSuccess:"Signed out successfully",logoutMessage:"You have been signed out",logoutError:"Unable to sign out",authError:"Authentication required",dataError:"Unable to load data",paymentPending:"Pending",currency:"IQD",statusDelivered:"Delivered",statusCompleted:"Completed",statusCancelled:"Cancelled",statusProcessing:"Processing" },
  ar: { loading:"جارٍ التحميل…",active:"نشط",inactive:"غير نشط",products:"المنتجات",orders:"الطلبات",accounting:"المحاسبة",profile:"الملف الشخصي",recognizedRevenue:"الإيراد المعترف به",afterWarehouse:"بعد الخروج من المستودع",growth:"النمو",versusLastMonth:"مقارنة بالشهر الماضي",myProducts:"منتجاتي",manageProducts:"إدارة المنتجات",manageProductsShort:"إدارة",manageProductsDescription:"إدارة منتجات متجرك وتعديلها",noProducts:"لم تضف أي منتجات بعد",addFirstProduct:"أضف منتجك الأول",totalOrders:"إجمالي الطلبات",processingOrders:"الطلبات قيد المعالجة",completedOrders:"الطلبات المكتملة",recentOrders:"الطلبات الأخيرة",recentOrdersDescription:"الطلبات التي تتضمن منتجاتك",noOrders:"لم يتم تسجيل أي طلب بعد",order:"طلب",date:"التاريخ",productsFromYou:"منتجات منك في هذا الطلب",yourShare:"حصتك من الطلب",totalOrderRevenue:"إجمالي إيرادات الطلبات",recognizedRevenueLabel:"الإيراد المعترف به",noSales:"لم يتم تسجيل أي مبيعات بعد",noMatchingProducts:"لا توجد منتجات مطابقة للبحث",productName:"اسم المنتج",barcode:"الباركود",quantity:"الكمية",orderColumn:"الطلب",sales:"المبيعات",commission:"العمولة",net:"الصافي",total:"الإجمالي",payments:"الدفعات",noPayments:"لم يتم الإعلان عن أي دفعات بعد",confirmed:"مؤكد",pendingConfirmation:"بانتظار التأكيد",paymentMethod:"طريقة الدفع",bankTransfer:"تحويل مصرفي",referenceNumber:"الرقم المرجعي",description:"الوصف",declaredDate:"تاريخ الإعلان",confirmedDate:"تاريخ التأكيد",storeInfo:"معلومات المتجر",changesPending:"التغييرات بانتظار موافقة المدير",companyName:"اسم الشركة",email:"البريد الإلكتروني",phone:"الهاتف",city:"المدينة",address:"العنوان",businessLicense:"رقم رخصة العمل",taxId:"الرقم الضريبي",aboutStore:"عن المتجر",editProfile:"تعديل الملف الشخصي",saveChanges:"حفظ التغييرات",cancel:"إلغاء",totalSales:"إجمالي المبيعات",netReceived:"صافي المستلم",amountOwed:"المبلغ المستحق لك",salesDetails:"تفاصيل مبيعات المنتجات",salesDetailsDescription:"المنتجات المباعة مع تفاصيل العمولة والصافي",searchProducts:"بحث (3 أحرف على الأقل)…",noChanges:"لم يتم إجراء أي تغييرات",success:"نجاح",error:"خطأ",paymentConfirmed:"تم تأكيد الدفعة بنجاح",paymentConfirmError:"تعذر تأكيد الدفعة",changesSubmitted:"تم إرسال التغييرات وبانتظار موافقة المدير",changesSubmitError:"تعذر إرسال التغييرات",logoutSuccess:"تم تسجيل الخروج بنجاح",logoutMessage:"تم تسجيل خروجك",logoutError:"تعذر تسجيل الخروج",authError:"المصادقة مطلوبة",dataError:"تعذر تحميل البيانات",paymentPending:"قيد الانتظار",currency:"IQD",statusDelivered:"تم التسليم",statusCompleted:"مكتمل",statusCancelled:"ملغى",statusProcessing:"قيد المعالجة" },
  tr: { loading:"Yükleniyor…",active:"Aktif",inactive:"Pasif",products:"Ürünler",orders:"Siparişler",accounting:"Muhasebe",profile:"Profil",recognizedRevenue:"Gerçekleşen gelir",afterWarehouse:"Depodan çıktıktan sonra",growth:"Büyüme",versusLastMonth:"Geçen aya göre",myProducts:"Ürünlerim",manageProducts:"Ürünleri yönet",manageProductsShort:"Yönet",manageProductsDescription:"Mağaza ürünlerinizi yönetin ve düzenleyin",noProducts:"Henüz ürün eklemediniz",addFirstProduct:"İlk ürününüzü ekleyin",totalOrders:"Toplam sipariş",processingOrders:"İşlenen siparişler",completedOrders:"Tamamlanan siparişler",recentOrders:"Son siparişler",recentOrdersDescription:"Ürünlerinizi içeren siparişler",noOrders:"Henüz sipariş verilmedi",order:"Sipariş",date:"Tarih",productsFromYou:"bu siparişte sizden ürün",yourShare:"Siparişten payınız",totalOrderRevenue:"Toplam sipariş geliri",recognizedRevenueLabel:"Gerçekleşen gelir",noSales:"Henüz satış kaydı yok",noMatchingProducts:"Aramayla eşleşen ürün yok",productName:"Ürün adı",barcode:"Barkod",quantity:"Miktar",orderColumn:"Sipariş",sales:"Satış",commission:"Komisyon",net:"Net",total:"Toplam",payments:"Ödemeler",noPayments:"Henüz ödeme bildirilmedi",confirmed:"Onaylandı",pendingConfirmation:"Onay bekliyor",paymentMethod:"Ödeme yöntemi",bankTransfer:"Banka havalesi",referenceNumber:"Referans numarası",description:"Açıklama",declaredDate:"Bildirim tarihi",confirmedDate:"Onay tarihi",storeInfo:"Mağaza bilgileri",changesPending:"Değişiklikler yönetici onayı bekliyor",companyName:"Şirket adı",email:"E-posta",phone:"Telefon",city:"Şehir",address:"Adres",businessLicense:"İşletme ruhsatı numarası",taxId:"Vergi kimliği",aboutStore:"Mağaza hakkında",editProfile:"Profili düzenle",saveChanges:"Değişiklikleri kaydet",cancel:"İptal",totalSales:"Toplam satış",netReceived:"Net alınan",amountOwed:"Alacağınız tutar",salesDetails:"Ürün satış detayları",salesDetailsDescription:"Komisyon ve net tutar ayrıntılarıyla satılan ürünler",searchProducts:"Ara (en az 3 karakter)…",noChanges:"Değişiklik yapılmadı",success:"Başarılı",error:"Hata",paymentConfirmed:"Ödeme başarıyla onaylandı",paymentConfirmError:"Ödeme onaylanamadı",changesSubmitted:"Değişiklikler gönderildi, yönetici onayı bekleniyor",changesSubmitError:"Değişiklikler gönderilemedi",logoutSuccess:"Başarıyla çıkış yapıldı",logoutMessage:"Hesabınızdan çıkış yaptınız",logoutError:"Çıkış yapılamadı",authError:"Kimlik doğrulama gerekli",dataError:"Veriler yüklenemedi",paymentPending:"Bekliyor",currency:"IQD",statusDelivered:"Teslim edildi",statusCompleted:"Tamamlandı",statusCancelled:"İptal edildi",statusProcessing:"İşleniyor" },
  fa: { loading:"در حال بارگذاری…",active:"فعال",inactive:"غیرفعال",products:"محصولات",orders:"سفارش‌ها",accounting:"حسابداری",profile:"پروفایل",recognizedRevenue:"درآمد شناسایی‌شده",afterWarehouse:"پس از خروج از انبار",growth:"رشد",versusLastMonth:"در مقایسه با ماه قبل",myProducts:"محصولات من",manageProducts:"مدیریت محصولات",manageProductsShort:"مدیریت",manageProductsDescription:"محصولات فروشگاه را مدیریت و ویرایش کنید",noProducts:"هنوز محصولی اضافه نکرده‌اید",addFirstProduct:"افزودن اولین محصول",totalOrders:"کل سفارش‌ها",processingOrders:"سفارش‌های در حال پردازش",completedOrders:"سفارش‌های تکمیل‌شده",recentOrders:"سفارش‌های اخیر",recentOrdersDescription:"سفارش‌هایی که محصولات شما را دارند",noOrders:"هنوز سفارشی ثبت نشده است",order:"سفارش",date:"تاریخ",productsFromYou:"محصول از شما در این سفارش",yourShare:"سهم شما از سفارش",totalOrderRevenue:"کل درآمد سفارش‌ها",recognizedRevenueLabel:"درآمد شناسایی‌شده",noSales:"هنوز فروشی ثبت نشده است",noMatchingProducts:"محصولی با این عبارت یافت نشد",productName:"نام محصول",barcode:"بارکد",quantity:"تعداد",orderColumn:"سفارش",sales:"فروش",commission:"کمیسیون",net:"خالص",total:"جمع کل",payments:"پرداخت‌ها",noPayments:"هنوز پرداختی اعلام نشده است",confirmed:"تأییدشده",pendingConfirmation:"در انتظار تأیید",paymentMethod:"روش پرداخت",bankTransfer:"انتقال بانکی",referenceNumber:"شماره مرجع",description:"توضیحات",declaredDate:"تاریخ اعلام",confirmedDate:"تاریخ تأیید",storeInfo:"اطلاعات فروشگاه",changesPending:"تغییرات در انتظار تأیید مدیر",companyName:"نام شرکت",email:"ایمیل",phone:"تلفن",city:"شهر",address:"آدرس",businessLicense:"شماره مجوز کسب",taxId:"شناسه مالیاتی",aboutStore:"درباره فروشگاه",editProfile:"ویرایش پروفایل",saveChanges:"ذخیره تغییرات",cancel:"لغو",totalSales:"کل فروش",netReceived:"خالص دریافتی",amountOwed:"طلب شما",salesDetails:"ریز فروش محصولات",salesDetailsDescription:"لیست محصولات فروخته‌شده با جزئیات کمیسیون و خالص دریافتی",searchProducts:"جستجو (حداقل ۳ حرف)…",noChanges:"هیچ تغییری اعمال نشده است",success:"موفق",error:"خطا",paymentConfirmed:"پرداخت با موفقیت تأیید شد",paymentConfirmError:"خطا در تأیید پرداخت",changesSubmitted:"تغییرات ارسال شد و در انتظار تأیید مدیر است",changesSubmitError:"خطا در ارسال تغییرات",logoutSuccess:"خروج موفق",logoutMessage:"با موفقیت از حساب خود خارج شدید",logoutError:"خطا در خروج از حساب",authError:"احراز هویت نشده",dataError:"خطا در دریافت اطلاعات",paymentPending:"در انتظار تأیید",currency:"IQD",statusDelivered:"تحویل‌شده",statusCompleted:"تکمیل‌شده",statusCancelled:"لغوشده",statusProcessing:"در حال پردازش" },
} satisfies Record<Language, VendorCopy>;

export default function VendorDashboard() {
  const { language, direction } = useLanguage();
  const c = vendorCopy[language];
  const locale = language === "fa" ? "fa-IR" : language === "ar" ? "ar" : language === "tr" ? "tr-TR" : "en-US";
  const formatNumber = (value: number | string | null | undefined) =>
    Number(value || 0).toLocaleString(locale);
  const formatDate = (value: string | number | Date) => new Date(value).toLocaleDateString(locale);
  const statusLabel = (status: string) =>
    status === "delivered" ? c.statusDelivered :
    status === "completed" ? c.statusCompleted :
    status === "cancelled" ? c.statusCancelled :
    status === "processing" || status === "pending" ? c.statusProcessing : status;
  const paymentMethodLabel = (method: string) => method === "bank_transfer" ? c.bankTransfer : method;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    vendorName: '',
    contactPhone: '',
    description: '',
    address: '',
    city: '',
    postalCode: '',
    businessLicense: '',
    taxId: ''
  });

  // Fetch vendor profile
  const { data: vendorData, isLoading: isLoadingVendor } = useQuery({
    queryKey: ["/api/vendors/auth/me"],
    queryFn: async () => {
      const response = await fetch("/api/vendors/auth/me");
      if (!response.ok) {
        if (response.status === 401) {
          setLocation("/vendor/login");
          throw new Error(c.authError);
        }
        throw new Error(c.dataError);
      }
      return response.json();
    },
  });

  // Fetch vendor products
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["/api/vendors/products"],
    enabled: !!vendorData?.user,
    queryFn: async () => {
      const response = await fetch("/api/vendors/products");
      if (!response.ok) throw new Error(c.dataError);
      return response.json();
    },
  });

  // Fetch vendor orders
  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["/api/vendors/orders"],
    enabled: !!vendorData?.user,
    queryFn: async () => {
      const response = await fetch("/api/vendors/orders");
      if (!response.ok) throw new Error(c.dataError);
      return response.json();
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ["/api/vendors/statistics"],
    enabled: !!vendorData?.user,
    queryFn: async () => {
      const response = await fetch("/api/vendors/statistics");
      if (!response.ok) throw new Error(c.dataError);
      return response.json();
    },
  });

  // Fetch sales details with commission breakdown
  const { data: salesDetailsData, isLoading: isLoadingSalesDetails } = useQuery({
    queryKey: ["/api/vendors/sales-details"],
    enabled: !!vendorData?.user,
    queryFn: async () => {
      const response = await fetch("/api/vendors/sales-details");
      if (!response.ok) throw new Error(c.dataError);
      return response.json();
    },
  });

  // Fetch vendor payments
  const { data: paymentsData, isLoading: isLoadingPayments } = useQuery({
    queryKey: ["/api/vendors/payments"],
    enabled: !!vendorData?.user,
    queryFn: async () => {
      const response = await fetch("/api/vendors/payments");
      if (!response.ok) throw new Error(c.dataError);
      return response.json();
    },
  });

  // Confirm payment mutation
  const confirmPaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const response = await apiRequest(`/api/vendors/payments/${paymentId}/confirm`, {
        method: "POST"
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: c.success,
        description: c.paymentConfirmed
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors/payments"] });
    },
    onError: (error: any) => {
      toast({
        title: c.error,
        description: error?.message || c.paymentConfirmError,
        variant: "destructive"
      });
    }
  });

  // Profile change submission mutation
  const submitProfileChangesMutation = useMutation({
    mutationFn: async (changes: Record<string, any>) => {
      const response = await apiRequest("/api/vendors/profile/submit-changes", {
        method: "POST",
        body: { changes }
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: c.success,
        description: c.changesSubmitted
      });
      setIsEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: ["/api/vendors/auth/me"] });
    },
    onError: (error: any) => {
      toast({
        title: c.error,
        description: error?.message || c.changesSubmitError,
        variant: "destructive"
      });
    }
  });

  // Populate form when vendor data loads
  useEffect(() => {
    if (vendorData?.user) {
      setProfileForm({
        vendorName: vendorData.user.vendorName || '',
        contactPhone: vendorData.user.contactPhone || '',
        description: vendorData.user.description || '',
        address: vendorData.user.address || '',
        city: vendorData.user.city || '',
        postalCode: vendorData.user.postalCode || '',
        businessLicense: vendorData.user.businessLicense || '',
        taxId: vendorData.user.taxId || ''
      });
    }
  }, [vendorData?.user]);

  const handleProfileSubmit = () => {
    // Only submit fields that have changed
    const changes: Record<string, any> = {};
    const currentVendor = vendorData?.user;
    if (profileForm.vendorName !== (currentVendor?.vendorName || '')) changes.vendorName = profileForm.vendorName;
    if (profileForm.contactPhone !== (currentVendor?.contactPhone || '')) changes.contactPhone = profileForm.contactPhone;
    if (profileForm.description !== (currentVendor?.description || '')) changes.description = profileForm.description;
    if (profileForm.address !== (currentVendor?.address || '')) changes.address = profileForm.address;
    if (profileForm.city !== (currentVendor?.city || '')) changes.city = profileForm.city;
    if (profileForm.postalCode !== (currentVendor?.postalCode || '')) changes.postalCode = profileForm.postalCode;
    if (profileForm.businessLicense !== (currentVendor?.businessLicense || '')) changes.businessLicense = profileForm.businessLicense;
    if (profileForm.taxId !== (currentVendor?.taxId || '')) changes.taxId = profileForm.taxId;
    
    if (Object.keys(changes).length === 0) {
      toast({
        title: c.error,
        description: c.noChanges,
        variant: "destructive"
      });
      return;
    }
    
    submitProfileChangesMutation.mutate(changes);
  };

  // Sub-tab state for accounting
  const [accountingSubTab, setAccountingSubTab] = useState("sales");

  // Filter products by search term (minimum 3 characters) - must be before any conditional returns
  const filteredSalesProducts = useMemo(() => {
    const allProducts = salesDetailsData?.data?.products || [];
    if (searchTerm.length < 3) return allProducts;
    
    const term = searchTerm.toLowerCase();
    return allProducts.filter((product: any) => 
      product.productName?.toLowerCase().includes(term) ||
      product.barcode?.toLowerCase().includes(term)
    );
  }, [salesDetailsData?.data?.products, searchTerm]);

  const handleLogout = async () => {
    try {
      await apiRequest("/api/vendors/auth/logout", { method: "POST" });
      toast({
        title: c.logoutSuccess,
        description: c.logoutMessage,
      });
      setLocation("/vendor/login");
    } catch (error) {
      toast({
        title: c.error,
        description: c.logoutError,
        variant: "destructive",
      });
    }
  };

  if (isLoadingVendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{c.loading}</p>
        </div>
      </div>
    );
  }

  if (!vendorData?.user) {
    return null;
  }

  const vendor = vendorData.user;
  const products = Array.isArray(productsData) 
    ? productsData 
    : Array.isArray(productsData?.products) 
      ? productsData.products 
      : Array.isArray(productsData?.data) 
        ? productsData.data 
        : [];
  const orders = Array.isArray(ordersData) 
    ? ordersData 
    : Array.isArray(ordersData?.orders)
      ? ordersData.orders
      : Array.isArray(ordersData?.data)
        ? ordersData.data
        : [];
  const stats = statsData?.statistics || statsData?.stats || statsData?.data || {
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    recognizedRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
  };

  return (
    <div dir={direction} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {vendor.logoUrl ? (
                <img
                  src={`/api/s3/serve/vendor-logos/${vendor.logoUrl}`}
                  alt={vendor.vendorName}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Store className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold">{vendor.vendorName}</h1>
                <p className="text-sm text-muted-foreground">{vendor.contactEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={vendor.isActive ? "default" : "secondary"}>
                {vendor.isActive ? c.active : c.inactive}
              </Badge>
              <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{c.products}</CardTitle>
              <Package className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold">{formatNumber(stats.totalProducts)}</div>
              <p className="text-xs text-muted-foreground">
                {formatNumber(stats.activeProducts)} {c.active.toLowerCase()} {c.products.toLowerCase()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{c.orders}</CardTitle>
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold">{formatNumber(stats.totalOrders)}</div>
              <p className="text-xs text-muted-foreground">
                {c.totalOrders}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{c.recognizedRevenue}</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(stats.recognizedRevenue)} {c.currency}
              </div>
              <p className="text-xs text-muted-foreground">
                {c.afterWarehouse}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{c.growth}</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+12%</div>
              <p className="text-xs text-muted-foreground">
                {c.versusLastMonth}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="products">{c.products}</TabsTrigger>
            <TabsTrigger value="orders">{c.orders}</TabsTrigger>
            <TabsTrigger value="accounting">{c.accounting}</TabsTrigger>
            <TabsTrigger value="profile">{c.profile}</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{c.myProducts}</CardTitle>
                    <CardDescription>
                      {c.manageProductsDescription}
                    </CardDescription>
                  </div>
                  <Link href="/vendor/products/new">
                    <Button data-testid="button-add-product">
                      <Plus className="w-4 h-4 mr-2" />
                      {c.manageProducts}
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingProducts ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                     <p className="text-muted-foreground">{c.noProducts}</p>
                    <Link href="/vendor/products/new">
                      <Button className="mt-4" variant="outline">
                         {c.addFirstProduct}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.map((product: any) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {product.imageUrl && (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div>
                            <h3 className="font-medium">{product.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatNumber(product.price)} {c.currency}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={product.isActive ? "default" : "secondary"}>
                            {product.isActive ? c.active : c.inactive}
                          </Badge>
                          <Link href={`/vendor/products/edit/${product.id}`}>
                            <Button size="sm" variant="outline" data-testid={`button-manage-products-${product.id}`}>
                              <Edit className="w-4 h-4 mr-1" />
                              {c.manageProductsShort}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="space-y-6">
              {/* Order Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{c.totalOrders}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(stats.totalOrders)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{c.processingOrders}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{formatNumber(stats.pendingOrders)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{c.completedOrders}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatNumber(stats.completedOrders)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Orders List */}
              <Card>
                <CardHeader>
                  <CardTitle>{c.recentOrders}</CardTitle>
                  <CardDescription>
                    {c.recentOrdersDescription}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingOrders ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">{c.noOrders}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order: any) => {
                        // Calculate vendor's portion of this order
                        const vendorTotal = order.items?.reduce((sum: number, item: any) => 
                          sum + parseFloat(item.totalPrice || 0), 0) || 0;
                        
                        return (
                          <div
                            key={order.id}
                            className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            data-testid={`order-${order.id}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium">{c.order} #{order.orderNumber}</h3>
                                <Badge variant={
                                  order.status === 'delivered' || order.status === 'completed' ? 'default' :
                                  order.status === 'cancelled' ? 'destructive' :
                                  'secondary'
                                }>
                                  {statusLabel(order.status)}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                {c.date}: {formatDate(order.createdAt)}
                              </p>
                              <div className="text-sm text-muted-foreground">
                                <span className="font-medium">{formatNumber(order.items?.length || 0)}</span> {c.productsFromYou}
                              </div>
                            </div>
                            <div className="text-right mt-3 md:mt-0">
                              <p className="text-lg font-bold text-purple-600" data-testid={`order-total-${order.id}`}>
                                {formatNumber(vendorTotal)} {c.currency}
                              </p>
                               <p className="text-xs text-muted-foreground">{c.yourShare}</p>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Total Summary */}
                      <div className="border-t pt-4 mt-4 space-y-3">
                        <div className="flex justify-between items-center">
                           <span className="text-base font-medium text-muted-foreground">{c.totalOrderRevenue}:</span>
                          <span className="text-xl font-bold" data-testid="total-revenue">
                             {formatNumber(stats.totalRevenue)} {c.currency}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col">
                             <span className="text-lg font-semibold">{c.recognizedRevenueLabel}:</span>
                             <span className="text-xs text-muted-foreground">({c.afterWarehouse})</span>
                          </div>
                          <span className="text-2xl font-bold text-green-600" data-testid="recognized-revenue">
                             {formatNumber(stats.recognizedRevenue)} {c.currency}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Accounting Tab */}
          <TabsContent value="accounting">
            <div className="space-y-6">
              {/* Accounting Sub-tabs */}
              <div className="flex gap-2 border-b pb-2">
                <Button
                  variant={accountingSubTab === "sales" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAccountingSubTab("sales")}
                  className="gap-2"
                  data-testid="accounting-subtab-sales"
                >
                  <DollarSign className="w-4 h-4" />
                  {c.sales}
                </Button>
                <Button
                  variant={accountingSubTab === "payments" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAccountingSubTab("payments")}
                  className="gap-2"
                  data-testid="accounting-subtab-payments"
                >
                  <CreditCard className="w-4 h-4" />
                  {c.payments}
                  {(paymentsData?.payments?.filter((p: any) => !p.isConfirmed)?.length || 0) > 0 && (
                    <Badge variant="destructive" className="text-xs px-1.5">
                      {paymentsData.payments.filter((p: any) => !p.isConfirmed).length}
                    </Badge>
                  )}
                </Button>
              </div>

              {/* Sales Sub-tab Content */}
              {accountingSubTab === "sales" && (
                <>
                  {/* Compact Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 p-3">
                      <div className="text-xs text-green-700 dark:text-green-400 mb-1">{c.totalSales}</div>
                      <div className="text-lg font-bold text-green-600" data-testid="total-sales-amount">
                        {formatNumber(salesDetailsData?.data?.summary?.totalSales)} <span className="text-xs">{c.currency}</span>
                      </div>
                    </Card>

                    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 p-3">
                      <div className="text-xs text-orange-700 dark:text-orange-400 mb-1 flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        {c.commission} ({salesDetailsData?.data?.summary?.commissionRate || 10}%)
                      </div>
                      <div className="text-lg font-bold text-orange-600" data-testid="total-commission">
                        {formatNumber(salesDetailsData?.data?.summary?.totalCommission)} <span className="text-xs">{c.currency}</span>
                      </div>
                    </Card>

                    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 p-3">
                      <div className="text-xs text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1">
                        <Calculator className="w-3 h-3" />
                        {c.netReceived}
                      </div>
                      <div className="text-lg font-bold text-blue-600" data-testid="net-amount">
                        {formatNumber(salesDetailsData?.data?.summary?.totalBalance)} <span className="text-xs">{c.currency}</span>
                      </div>
                    </Card>

                    <Card className="border-purple-200 bg-purple-50 dark:bg-purple-900/20 p-3">
                      <div className="text-xs text-purple-700 dark:text-purple-400 mb-1 flex items-center gap-1">
                        <Wallet className="w-3 h-3" />
                        {c.amountOwed}
                      </div>
                      <div className="text-lg font-bold text-purple-600" data-testid="balance-owed">
                        {formatNumber(salesDetailsData?.data?.summary?.totalBalance)} <span className="text-xs">{c.currency}</span>
                      </div>
                    </Card>
                  </div>

                  {/* Product Sales Details */}
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            {c.salesDetails}
                          </CardTitle>
                          <CardDescription>
                            {c.salesDetailsDescription}
                          </CardDescription>
                        </div>
                        <div className="relative w-full md:w-64">
                          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder={c.searchProducts}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pr-10"
                            data-testid="input-search-products"
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoadingSalesDetails ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                        </div>
                      ) : !salesDetailsData?.data?.products?.length ? (
                        <div className="text-center py-12">
                          <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">{c.noSales}</p>
                        </div>
                      ) : filteredSalesProducts.length === 0 ? (
                        <div className="text-center py-12">
                          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">{c.noMatchingProducts}</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                              <tr>
                                <th className="text-right p-2 text-xs font-medium">{c.productName}</th>
                                <th className="text-center p-2 text-xs font-medium">{c.barcode}</th>
                                <th className="text-center p-2 text-xs font-medium">{c.quantity}</th>
                                <th className="text-center p-2 text-xs font-medium">{c.orderColumn}</th>
                                <th className="text-left p-2 text-xs font-medium">{c.sales} ({c.currency})</th>
                                <th className="text-left p-2 text-xs font-medium">{c.commission}</th>
                                <th className="text-left p-2 text-xs font-medium">{c.net}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredSalesProducts.map((product: any, index: number) => (
                                <tr 
                                  key={product.productId || index} 
                                  className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                                  data-testid={`product-sale-row-${product.productId}`}
                                >
                                  <td className="p-2 font-bold text-base">{product.productName}</td>
                                  <td className="p-2">
                                    <BarcodeImage value={product.barcode || ''} align="center" />
                                  </td>
                                  <td className="p-2 text-center">
                                  <Badge variant="secondary" className="text-xs">{formatNumber(product.totalQuantity)}</Badge>
                                  </td>
                                  <td className="p-2 text-center text-sm">{formatNumber(product.orderCount)}</td>
                                  <td className="p-2 text-left text-sm font-medium text-green-600">
                                    {formatNumber(product.totalSales)}
                                  </td>
                                  <td className="p-2 text-left text-sm text-orange-600">
                                    -{formatNumber(product.commissionAmount)}
                                  </td>
                                  <td className="p-2 text-left text-sm font-bold text-blue-600">
                                    {formatNumber(product.netAmount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold text-sm">
                              <tr>
                                <td colSpan={4} className="p-2 text-right">{c.total}:</td>
                                <td className="p-2 text-left text-green-600">
                                  {formatNumber(salesDetailsData.data.summary.totalSales)}
                                </td>
                                <td className="p-2 text-left text-orange-600">
                                  -{formatNumber(salesDetailsData.data.summary.totalCommission)}
                                </td>
                                <td className="p-2 text-left text-blue-600">
                                  {formatNumber(salesDetailsData.data.summary.totalBalance)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Payments Sub-tab Content */}
              {accountingSubTab === "payments" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      {c.payments}
                    </CardTitle>
                    <CardDescription>
                      {c.changesPending}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingPayments ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                      </div>
                    ) : !paymentsData?.payments?.length ? (
                      <div className="text-center py-12">
                        <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">{c.noPayments}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {paymentsData.payments.map((payment: any) => (
                          <div
                            key={payment.id}
                            className={`border rounded-lg p-4 ${
                              payment.isConfirmed 
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200' 
                                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200'
                            }`}
                            data-testid={`payment-row-${payment.id}`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  {payment.isConfirmed ? (
                                    <Check className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <Clock className="w-5 h-5 text-yellow-600" />
                                  )}
                                  <span className="text-xl font-bold">
                                    {formatNumber(payment.amount)} {c.currency}
                                  </span>
                                  <Badge variant={payment.isConfirmed ? "default" : "secondary"}>
                                    {payment.isConfirmed ? c.confirmed : c.pendingConfirmation}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                  <p>{c.paymentMethod}: {paymentMethodLabel(payment.paymentMethod)}</p>
                                  {payment.referenceNumber && <p>{c.referenceNumber}: {payment.referenceNumber}</p>}
                                  {payment.description && <p>{c.description}: {payment.description}</p>}
                                  <p>{c.declaredDate}: {formatDate(payment.declaredAt)}</p>
                                  {payment.confirmedAt && (
                                    <p className="text-green-600">{c.confirmedDate}: {formatDate(payment.confirmedAt)}</p>
                                  )}
                                </div>
                              </div>
                              {!payment.isConfirmed && (
                                <Button
                                  onClick={() => confirmPaymentMutation.mutate(payment.id)}
                                  disabled={confirmPaymentMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                  data-testid={`confirm-payment-${payment.id}`}
                                >
                                  {confirmPaymentMutation.isPending ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  ) : (
                                    <Check className="w-4 h-4 mr-2" />
                                  )}
                                  {c.confirmed}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{c.storeInfo}</CardTitle>
                    <CardDescription>
                      {c.manageProductsDescription}
                    </CardDescription>
                  </div>
                  {!isEditingProfile ? (
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditingProfile(true)}
                      disabled={!!vendor.pendingProfileChanges}
                      data-testid="btn-edit-profile"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {c.editProfile}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsEditingProfile(false);
                          if (vendor) {
                            setProfileForm({
                              vendorName: vendor.vendorName || '',
                              contactPhone: vendor.contactPhone || '',
                              description: vendor.description || '',
                              address: vendor.address || '',
                              city: vendor.city || '',
                              postalCode: vendor.postalCode || '',
                              businessLicense: vendor.businessLicense || '',
                              taxId: vendor.taxId || ''
                            });
                          }
                        }}
                        data-testid="btn-cancel-edit"
                      >
                        <X className="w-4 h-4 mr-2" />
                        {c.cancel}
                      </Button>
                      <Button 
                        onClick={handleProfileSubmit}
                        disabled={submitProfileChangesMutation.isPending}
                        data-testid="btn-submit-profile"
                      >
                        {submitProfileChangesMutation.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        {c.saveChanges}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {vendor.pendingProfileChanges && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <Clock className="w-5 h-5" />
                      <span className="font-medium">{c.changesPending}</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-2">
                      {c.changesSubmitted}
                    </p>
                  </div>
                )}
                
                {isEditingProfile ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vendorName">{c.companyName}</Label>
                      <Input
                        id="vendorName"
                        value={profileForm.vendorName}
                        onChange={(e) => setProfileForm({...profileForm, vendorName: e.target.value})}
                        data-testid="input-vendor-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contactPhone">{c.phone}</Label>
                      <Input
                        id="contactPhone"
                        value={profileForm.contactPhone}
                        onChange={(e) => setProfileForm({...profileForm, contactPhone: e.target.value})}
                        data-testid="input-contact-phone"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">{c.city}</Label>
                      <Input
                        id="city"
                        value={profileForm.city}
                        onChange={(e) => setProfileForm({...profileForm, city: e.target.value})}
                        data-testid="input-city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postalCode">{language === "fa" ? "کد پستی" : language === "ar" ? "الرمز البريدي" : language === "tr" ? "Posta kodu" : "Postal code"}</Label>
                      <Input
                        id="postalCode"
                        value={profileForm.postalCode}
                        onChange={(e) => setProfileForm({...profileForm, postalCode: e.target.value})}
                        data-testid="input-postal-code"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="address">{c.address}</Label>
                      <Input
                        id="address"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm({...profileForm, address: e.target.value})}
                        data-testid="input-address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="businessLicense">{c.businessLicense}</Label>
                      <Input
                        id="businessLicense"
                        value={profileForm.businessLicense}
                        onChange={(e) => setProfileForm({...profileForm, businessLicense: e.target.value})}
                        data-testid="input-business-license"
                      />
                    </div>
                    <div>
                      <Label htmlFor="taxId">{c.taxId}</Label>
                      <Input
                        id="taxId"
                        value={profileForm.taxId}
                        onChange={(e) => setProfileForm({...profileForm, taxId: e.target.value})}
                        data-testid="input-tax-id"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="description">{c.aboutStore}</Label>
                      <Textarea
                        id="description"
                        value={profileForm.description}
                        onChange={(e) => setProfileForm({...profileForm, description: e.target.value})}
                        rows={4}
                        data-testid="input-description"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-1">{c.companyName}</h3>
                      <p className="text-muted-foreground">{vendor.vendorName}</p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">{c.email}</h3>
                      <p className="text-muted-foreground">{vendor.contactEmail}</p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">{c.phone}</h3>
                      <p className="text-muted-foreground">{vendor.contactPhone}</p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">{c.city}</h3>
                      <p className="text-muted-foreground">
                        {vendor.city}, {vendor.country}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <h3 className="font-medium mb-1">{c.address}</h3>
                      <p className="text-muted-foreground">{vendor.address}</p>
                    </div>
                    {vendor.businessLicense && (
                      <div>
                        <h3 className="font-medium mb-1">{c.businessLicense}</h3>
                        <p className="text-muted-foreground">{vendor.businessLicense}</p>
                      </div>
                    )}
                    {vendor.taxId && (
                      <div>
                        <h3 className="font-medium mb-1">{c.taxId}</h3>
                        <p className="text-muted-foreground">{vendor.taxId}</p>
                      </div>
                    )}
                    {vendor.description && (
                      <div className="md:col-span-2">
                        <h3 className="font-medium mb-1">{c.aboutStore}</h3>
                        <p className="text-muted-foreground">{vendor.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
