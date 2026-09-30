import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Calculator, Check, Eye, MapPin, Pencil, Search, Settings, Star, Store, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import VendorAccountingTab from "./vendor-accounting-tab";

type Vendor = {
  id: number; vendorName: string; vendorNameAr: string; vendorNameKu: string; vendorNameTr: string;
  contactEmail: string; contactPhone: string | null; address: string | null; businessLicense: string | null; taxId: string;
  description: string; logo: string | null; isApproved: boolean; isActive: boolean; approvedBy: number | null;
  approvedAt: string | null; rejectionReason: string | null; totalSales: string; rating: string; totalReviews: number; createdAt: string;
};
type VendorProfile = { vendorName: string; contactEmail: string; contactPhone: string; address: string; businessLicense: string };
const editableProfileKeys = ["vendorName", "contactEmail", "contactPhone", "address", "businessLicense"] as const;
type VendorWithPendingChanges = Vendor & { pendingProfileChanges: Record<string, any> | null; pendingChangesSubmittedAt: string | null };
type VendorProductStats = { inStock: number; lowStock: number; outOfStock: number; hiddenProducts: number; totalProducts: number; totalSales: number; totalOrders: number };

const copy = {
  en: { title: "Marketplace operations", desc: "Review vendors, approve profiles and monitor marketplace performance.", pending: "Pending", approved: "Approved", rejected: "Rejected", all: "All vendors", changes: "Profile changes", accounting: "Accounting", name: "Vendor", contact: "Contact", address: "Address", status: "Status", products: "Products", sales: "Sales", orders: "Orders", rating: "Rating", created: "Created", actions: "Actions", details: "Details", approve: "Approve", reject: "Reject", active: "Active", inactive: "Inactive", disable: "Disable", enable: "Enable", approvedStatus: "Approved", pendingStatus: "Pending approval", rejectedStatus: "Rejected", loading: "Loading…", error: "Unable to load this list.", retry: "Retry", empty: "No vendors found", emptyPending: "No vendors are waiting for approval.", emptyApproved: "No approved vendors yet.", emptyRejected: "No rejected vendors.", emptyChanges: "No profile change requests.", emptyHint: "New requests will appear here.", reason: "Rejection reason", reasonPlaceholder: "Explain why this vendor is being rejected…", cancel: "Cancel", confirm: "Confirm", confirmApprove: "Approve vendor", approveQuestion: "Approve {name}? The vendor will be able to add marketplace products.", confirmReject: "Reject vendor", rejectQuestion: "Provide a reason for rejecting {name}.", confirmToggle: "Change vendor status", toggleQuestion: "Do you want to {action} {name}?", processing: "Processing…", success: "Success", failure: "Error", approvedToast: "Vendor approved successfully.", rejectedToast: "Vendor rejected.", statusToast: "Vendor status updated.", changeApproved: "Profile changes approved and applied.", changeRejected: "Profile changes rejected.", approveError: "Could not approve vendor.", rejectError: "Could not reject vendor.", statusError: "Could not update vendor status.", changeError: "Could not update profile changes.", available: "In stock", low: "Low stock", out: "Out of stock", hidden: "Hidden", total: "Total", totalSales: "Total sales", totalOrders: "Total orders", reviews: "Reviews", submitted: "Submitted", view: "View details", apply: "Approve & apply", reapprove: "Re-approve", businessLicense: "Business license", taxId: "Tax ID", description: "Description", approvedAt: "Approved at", noData: "—" },
  fa: { title: "مدیریت عملیات بازارگاه", desc: "بررسی فروشندگان، تأیید پروفایل‌ها و پایش عملکرد بازارگاه.", pending: "در انتظار", approved: "تأییدشده", rejected: "ردشده", all: "همه فروشندگان", changes: "تغییرات پروفایل", accounting: "حسابداری", name: "فروشنده", contact: "تماس", address: "آدرس", status: "وضعیت", products: "محصولات", sales: "فروش", orders: "سفارش‌ها", rating: "امتیاز", created: "تاریخ ثبت", actions: "عملیات", details: "جزئیات", approve: "تأیید", reject: "رد", active: "فعال", inactive: "غیرفعال", disable: "غیرفعال کردن", enable: "فعال کردن", approvedStatus: "تأیید شده", pendingStatus: "در انتظار تأیید", rejectedStatus: "رد شده", loading: "در حال بارگذاری…", error: "بارگذاری این فهرست ممکن نیست.", retry: "تلاش مجدد", empty: "فروشنده‌ای یافت نشد", emptyPending: "فروشنده‌ای در انتظار تأیید نیست.", emptyApproved: "هنوز فروشنده تأییدشده‌ای وجود ندارد.", emptyRejected: "فروشنده ردشده‌ای وجود ندارد.", emptyChanges: "درخواست تغییر پروفایلی وجود ندارد.", emptyHint: "درخواست‌های جدید اینجا نمایش داده می‌شوند.", reason: "دلیل رد", reasonPlaceholder: "دلیل رد فروشنده را وارد کنید…", cancel: "لغو", confirm: "تأیید", confirmApprove: "تأیید فروشنده", approveQuestion: "فروشنده {name} تأیید شود؟ پس از آن می‌تواند محصول اضافه کند.", confirmReject: "رد فروشنده", rejectQuestion: "دلیل رد {name} را وارد کنید.", confirmToggle: "تغییر وضعیت فروشنده", toggleQuestion: "فروشنده {name} {action} شود؟", processing: "در حال پردازش…", success: "موفق", failure: "خطا", approvedToast: "فروشنده با موفقیت تأیید شد.", rejectedToast: "فروشنده رد شد.", statusToast: "وضعیت فروشنده به‌روزرسانی شد.", changeApproved: "تغییرات پروفایل تأیید و اعمال شد.", changeRejected: "تغییرات پروفایل رد شد.", approveError: "تأیید فروشنده ممکن نیست.", rejectError: "رد فروشنده ممکن نیست.", statusError: "به‌روزرسانی وضعیت ممکن نیست.", changeError: "به‌روزرسانی تغییرات پروفایل ممکن نیست.", available: "موجود", low: "کم‌موجود", out: "ناموجود", hidden: "مخفی", total: "کل", totalSales: "کل فروش", totalOrders: "کل سفارش‌ها", reviews: "نظرات", submitted: "ارسال‌شده", view: "مشاهده جزئیات", apply: "تأیید و اعمال", reapprove: "تأیید مجدد", businessLicense: "مجوز کسب‌وکار", taxId: "شناسه مالیاتی", description: "توضیحات", approvedAt: "تاریخ تأیید", noData: "—" },
  ar: { title: "عمليات السوق", desc: "مراجعة البائعين واعتماد الملفات الشخصية ومراقبة أداء السوق.", pending: "قيد الانتظار", approved: "معتمدون", rejected: "مرفوضون", all: "كل البائعين", changes: "تغييرات الملف", accounting: "المحاسبة", name: "البائع", contact: "الاتصال", address: "العنوان", status: "الحالة", products: "المنتجات", sales: "المبيعات", orders: "الطلبات", rating: "التقييم", created: "تاريخ التسجيل", actions: "الإجراءات", details: "التفاصيل", approve: "اعتماد", reject: "رفض", active: "نشط", inactive: "غير نشط", disable: "تعطيل", enable: "تفعيل", approvedStatus: "معتمد", pendingStatus: "بانتظار الاعتماد", rejectedStatus: "مرفوض", loading: "جارٍ التحميل…", error: "تعذر تحميل القائمة.", retry: "إعادة المحاولة", empty: "لا يوجد بائعون", emptyPending: "لا يوجد بائعون بانتظار الاعتماد.", emptyApproved: "لا يوجد بائعون معتمدون بعد.", emptyRejected: "لا يوجد بائعون مرفوضون.", emptyChanges: "لا توجد طلبات لتغيير الملف.", emptyHint: "ستظهر الطلبات الجديدة هنا.", reason: "سبب الرفض", reasonPlaceholder: "اكتب سبب رفض البائع…", cancel: "إلغاء", confirm: "تأكيد", confirmApprove: "اعتماد البائع", approveQuestion: "اعتماد {name}؟ سيتمكن البائع من إضافة المنتجات.", confirmReject: "رفض البائع", rejectQuestion: "اكتب سبب رفض {name}.", confirmToggle: "تغيير حالة البائع", toggleQuestion: "هل تريد {action} {name}؟", processing: "جارٍ التنفيذ…", success: "نجاح", failure: "خطأ", approvedToast: "تم اعتماد البائع بنجاح.", rejectedToast: "تم رفض البائع.", statusToast: "تم تحديث حالة البائع.", changeApproved: "تم اعتماد تغييرات الملف وتطبيقها.", changeRejected: "تم رفض تغييرات الملف.", approveError: "تعذر اعتماد البائع.", rejectError: "تعذر رفض البائع.", statusError: "تعذر تحديث الحالة.", changeError: "تعذر تحديث تغييرات الملف.", available: "متوفر", low: "مخزون منخفض", out: "غير متوفر", hidden: "مخفي", total: "الإجمالي", totalSales: "إجمالي المبيعات", totalOrders: "إجمالي الطلبات", reviews: "المراجعات", submitted: "تم الإرسال", view: "عرض التفاصيل", apply: "اعتماد وتطبيق", reapprove: "إعادة الاعتماد", businessLicense: "الرخصة التجارية", taxId: "المعرّف الضريبي", description: "الوصف", approvedAt: "تاريخ الاعتماد", noData: "—" },
  tr: { title: "Pazar yeri operasyonları", desc: "Satıcıları inceleyin, profilleri onaylayın ve performansı izleyin.", pending: "Bekleyen", approved: "Onaylı", rejected: "Reddedilen", all: "Tüm satıcılar", changes: "Profil değişiklikleri", accounting: "Muhasebe", name: "Satıcı", contact: "İletişim", address: "Adres", status: "Durum", products: "Ürünler", sales: "Satış", orders: "Siparişler", rating: "Puan", created: "Kayıt", actions: "İşlemler", details: "Ayrıntılar", approve: "Onayla", reject: "Reddet", active: "Aktif", inactive: "Pasif", disable: "Devre dışı bırak", enable: "Etkinleştir", approvedStatus: "Onaylı", pendingStatus: "Onay bekliyor", rejectedStatus: "Reddedildi", loading: "Yükleniyor…", error: "Liste yüklenemedi.", retry: "Yeniden dene", empty: "Satıcı bulunamadı", emptyPending: "Onay bekleyen satıcı yok.", emptyApproved: "Henüz onaylı satıcı yok.", emptyRejected: "Reddedilen satıcı yok.", emptyChanges: "Profil değişikliği isteği yok.", emptyHint: "Yeni istekler burada görünür.", reason: "Ret nedeni", reasonPlaceholder: "Satıcının neden reddedildiğini yazın…", cancel: "İptal", confirm: "Onayla", confirmApprove: "Satıcıyı onayla", approveQuestion: "{name} onaylansın mı? Satıcı ürün ekleyebilecek.", confirmReject: "Satıcıyı reddet", rejectQuestion: "{name} için ret nedeni girin.", confirmToggle: "Satıcı durumunu değiştir", toggleQuestion: "{name} {action} olsun mu?", processing: "İşleniyor…", success: "Başarılı", failure: "Hata", approvedToast: "Satıcı başarıyla onaylandı.", rejectedToast: "Satıcı reddedildi.", statusToast: "Satıcı durumu güncellendi.", changeApproved: "Profil değişiklikleri onaylandı ve uygulandı.", changeRejected: "Profil değişiklikleri reddedildi.", approveError: "Satıcı onaylanamadı.", rejectError: "Satıcı reddedilemedi.", statusError: "Satıcı durumu güncellenemedi.", changeError: "Profil değişiklikleri güncellenemedi.", available: "Stokta", low: "Düşük stok", out: "Stok dışı", hidden: "Gizli", total: "Toplam", totalSales: "Toplam satış", totalOrders: "Toplam sipariş", reviews: "Yorumlar", submitted: "Gönderildi", view: "Ayrıntıları gör", apply: "Onayla ve uygula", reapprove: "Yeniden onayla", businessLicense: "İşletme ruhsatı", taxId: "Vergi numarası", description: "Açıklama", approvedAt: "Onay tarihi", noData: "—" },
} as const;

export default function MarketplaceManagement() {
  const { language, direction } = useLanguage();
  const t = copy[language];
  const editText = {
    en: { edit: "Edit vendor details", title: "Edit vendor", hint: "Only these current profile fields will change. Orders, payments and other vendor data are preserved.", email: "Email", phone: "Phone", save: "Save changes", saved: "Vendor details updated.", failed: "Could not update vendor details.", required: "Fill in every field before saving.", duplicate: "This email is already used by another vendor." },
    fa: { edit: "ویرایش اطلاعات فروشنده", title: "ویرایش فروشنده", hint: "فقط همین اطلاعات فعلی تغییر می‌کنند. سفارش‌ها، پرداخت‌ها و دیگر داده‌های فروشنده حفظ می‌شوند.", email: "ایمیل", phone: "تلفن", save: "ذخیره تغییرات", saved: "اطلاعات فروشنده به‌روزرسانی شد.", failed: "به‌روزرسانی اطلاعات فروشنده ممکن نیست.", required: "پیش از ذخیره همه فیلدها را تکمیل کنید.", duplicate: "این ایمیل قبلاً برای فروشنده دیگری ثبت شده است." },
    ar: { edit: "تعديل بيانات البائع", title: "تعديل البائع", hint: "ستتغير هذه البيانات الحالية فقط. ستبقى الطلبات والمدفوعات وبيانات البائع الأخرى محفوظة.", email: "البريد الإلكتروني", phone: "الهاتف", save: "حفظ التغييرات", saved: "تم تحديث بيانات البائع.", failed: "تعذر تحديث بيانات البائع.", required: "أكمل جميع الحقول قبل الحفظ.", duplicate: "هذا البريد الإلكتروني مستخدم لبائع آخر." },
    tr: { edit: "Satıcı bilgilerini düzenle", title: "Satıcıyı düzenle", hint: "Yalnızca bu güncel profil bilgileri değişir. Siparişler, ödemeler ve diğer satıcı verileri korunur.", email: "E-posta", phone: "Telefon", save: "Değişiklikleri kaydet", saved: "Satıcı bilgileri güncellendi.", failed: "Satıcı bilgileri güncellenemedi.", required: "Kaydetmeden önce tüm alanları doldurun.", duplicate: "Bu e-posta başka bir satıcı tarafından kullanılıyor." },
  }[language];
  const { toast } = useToast();
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [profile, setProfile] = useState<VendorProfile>({ vendorName: "", contactEmail: "", contactPhone: "", address: "", businessLicense: "" });
  const [rejectionReason, setRejectionReason] = useState("");
  const [dialog, setDialog] = useState<"reject" | "approve" | "toggle" | "details" | "edit" | null>(null);
  const [toggleAction, setToggleAction] = useState<{ vendorId: number; currentStatus: boolean } | null>(null);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorStatusFilter, setVendorStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [vendorSort, setVendorSort] = useState<"newest" | "oldest" | "sales" | "rating" | "name">("newest");
  const filterText = {
    en: { search: "Search vendor, email, phone or address…", allStatuses: "All statuses", newest: "Newest", oldest: "Oldest", sales: "Highest sales", rating: "Highest rating", name: "Vendor name", results: "results" },
    fa: { search: "جستجوی فروشنده، ایمیل، تلفن یا آدرس…", allStatuses: "همه وضعیت‌ها", newest: "جدیدترین", oldest: "قدیمی‌ترین", sales: "بیشترین فروش", rating: "بیشترین امتیاز", name: "نام فروشنده", results: "نتیجه" },
    ar: { search: "البحث عن البائع أو البريد أو الهاتف أو العنوان…", allStatuses: "كل الحالات", newest: "الأحدث", oldest: "الأقدم", sales: "الأعلى مبيعاً", rating: "الأعلى تقييماً", name: "اسم البائع", results: "نتيجة" },
    tr: { search: "Satıcı, e-posta, telefon veya adres ara…", allStatuses: "Tüm durumlar", newest: "En yeni", oldest: "En eski", sales: "En yüksek satış", rating: "En yüksek puan", name: "Satıcı adı", results: "sonuç" },
  }[language];

  const all = useQuery<{ vendors: Vendor[] }>({ queryKey: ["/api/admin/vendors"] });
  const pending = useQuery<{ vendors: Vendor[] }>({ queryKey: ["/api/admin/vendors/pending"] });
  const approved = useQuery<{ vendors: Vendor[] }>({ queryKey: ["/api/admin/vendors/approved"] });
  const rejected = useQuery<{ vendors: Vendor[] }>({ queryKey: ["/api/admin/vendors/rejected"] });
  const changes = useQuery<{ vendors: VendorWithPendingChanges[] }>({ queryKey: ["/api/admin/vendors/pending-profile-changes"] });
  const stats = useQuery<{ stats: Record<number, VendorProductStats> }>({ queryKey: ["/api/admin/vendors/product-stats"] });
  const displaySettings = useQuery<{ vendorEntryVisible: boolean }>({ queryKey: ["/api/marketplace/display-settings"] });
  const settingsText = {
    en: { tab: "Display settings", title: "Public vendor entry", description: "Show the Vendor button on the home page and vendor links in the footer.", visible: "Vendor entry is visible", hidden: "Vendor entry is hidden", saved: "Display setting saved.", error: "Could not save the display setting." },
    fa: { tab: "تنظیمات نمایش", title: "ورودی عمومی فروشندگان", description: "دکمه Vendor در صفحه اصلی و لینک‌های فروشندگان در فوتر را نمایش دهید یا پنهان کنید.", visible: "ورودی فروشندگان نمایش داده می‌شود", hidden: "ورودی فروشندگان پنهان است", saved: "تنظیم نمایش ذخیره شد.", error: "ذخیره تنظیم نمایش ممکن نیست." },
    ar: { tab: "إعدادات العرض", title: "مدخل البائع العام", description: "إظهار أو إخفاء زر البائع في الصفحة الرئيسية وروابط البائع في التذييل.", visible: "مدخل البائع ظاهر", hidden: "مدخل البائع مخفي", saved: "تم حفظ إعداد العرض.", error: "تعذر حفظ إعداد العرض." },
    tr: { tab: "Görünüm ayarları", title: "Herkese açık satıcı girişi", description: "Ana sayfadaki Vendor düğmesini ve alt bilgideki satıcı bağlantılarını gösterin veya gizleyin.", visible: "Satıcı girişi görünür", hidden: "Satıcı girişi gizli", saved: "Görünüm ayarı kaydedildi.", error: "Görünüm ayarı kaydedilemedi." },
  }[language];
  const displaySettingsMutation = useMutation({
    mutationFn: (vendorEntryVisible: boolean) => apiRequest("/api/admin/marketplace/display-settings", { method: "PATCH", body: { vendorEntryVisible } }),
    onSuccess: (_data, vendorEntryVisible) => {
      queryClient.setQueryData(["/api/marketplace/display-settings"], { success: true, vendorEntryVisible });
      toast({ title: t.success, description: settingsText.saved });
    },
    onError: () => toast({ title: t.failure, description: settingsText.error, variant: "destructive" }),
  });

  const refresh = () => [all, pending, approved, rejected, changes, stats].forEach((q) => q.refetch());
  const invalidate = (keys: string[]) => keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  const mutationOptions = (success: string, failure: string, keys: string[]) => ({ onSuccess: () => { invalidate(keys); toast({ title: t.success, description: success }); }, onError: () => toast({ title: t.failure, description: failure, variant: "destructive" as const }) });
  const approveMutation = useMutation({ mutationFn: (id: number) => apiRequest(`/api/admin/vendors/${id}/approve`, { method: "POST" }), ...mutationOptions(t.approvedToast, t.approveError, ["/api/admin/vendors", "/api/admin/vendors/pending", "/api/admin/vendors/approved"]) });
  const rejectMutation = useMutation({ mutationFn: ({ id, reason }: { id: number; reason: string }) => apiRequest(`/api/admin/vendors/${id}/reject`, { method: "POST", body: { reason } }), ...mutationOptions(t.rejectedToast, t.rejectError, ["/api/admin/vendors", "/api/admin/vendors/pending", "/api/admin/vendors/approved", "/api/admin/vendors/rejected"]), onSuccess: () => { invalidate(["/api/admin/vendors", "/api/admin/vendors/pending", "/api/admin/vendors/approved", "/api/admin/vendors/rejected"]); setDialog(null); setRejectionReason(""); toast({ title: t.success, description: t.rejectedToast }); } });
  const statusMutation = useMutation({ mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => apiRequest(`/api/admin/vendors/${id}`, { method: "PATCH", body: { isActive } }), ...mutationOptions(t.statusToast, t.statusError, ["/api/admin/vendors", "/api/admin/vendors/approved"]) });
  const profileMutation = useMutation({
    mutationFn: ({ id, changes }: { id: number; changes: Partial<VendorProfile> }) =>
      apiRequest(`/api/admin/vendors/${id}/profile`, { method: "PATCH", body: changes }),
    onSuccess: (result: { vendor: Vendor }) => {
      invalidate(["/api/admin/vendors", "/api/admin/vendors/pending", "/api/admin/vendors/approved", "/api/admin/vendors/rejected", "/api/admin/vendors/pending-profile-changes"]);
      setSelectedVendor(result.vendor);
      setDialog("details");
      toast({ title: t.success, description: editText.saved });
    },
    onError: (error: Error) => toast({
      title: t.failure,
      description: error.message.includes("409") ? editText.duplicate : editText.failed,
      variant: "destructive",
    }),
  });
  const approveChanges = useMutation({ mutationFn: (id: number) => apiRequest(`/api/admin/vendors/${id}/profile-changes/approve`, { method: "POST" }), ...mutationOptions(t.changeApproved, t.changeError, ["/api/admin/vendors/pending-profile-changes", "/api/admin/vendors"]) });
  const rejectChanges = useMutation({ mutationFn: (id: number) => apiRequest(`/api/admin/vendors/${id}/profile-changes/reject`, { method: "POST" }), ...mutationOptions(t.changeRejected, t.changeError, ["/api/admin/vendors/pending-profile-changes"]) });

  const localizedVendorName = (vendor: Vendor) => language === "tr" && vendor.vendorNameTr ? vendor.vendorNameTr : language === "ar" && vendor.vendorNameAr ? vendor.vendorNameAr : vendor.vendorName;
  const date = (value: string | null) => value ? new Date(value).toLocaleDateString(language === "fa" ? "fa-IR" : language === "ar" ? "ar-IQ" : language === "tr" ? "tr-TR" : "en-US") : t.noData;

  const startEditing = (vendor: Vendor) => {
    setProfile({
      vendorName: vendor.vendorName || "", contactEmail: vendor.contactEmail || "",
      contactPhone: vendor.contactPhone || "", address: vendor.address || "",
      businessLicense: vendor.businessLicense || "",
    });
    setSelectedVendor(vendor);
    setDialog("edit");
  };
  const saveProfile = () => {
    if (!selectedVendor || profileMutation.isPending) return;
    const changes: Partial<VendorProfile> = {};
    for (const key of editableProfileKeys) {
      const value = profile[key].trim();
      if (value !== (selectedVendor[key] || "")) {
        if (!value) {
          toast({ title: t.failure, description: editText.required, variant: "destructive" });
          return;
        }
        changes[key] = value;
      }
    }
    if (Object.keys(changes).length) profileMutation.mutate({ id: selectedVendor.id, changes });
  };
  const action = (vendor: Vendor, type: "approve" | "reject" | "toggle" | "details") => { setSelectedVendor(vendor); setDialog(type); if (type === "toggle") setToggleAction({ vendorId: vendor.id, currentStatus: vendor.isActive }); };
  const confirmApprove = () => { if (selectedVendor) approveMutation.mutate(selectedVendor.id); setDialog(null); };
  const confirmToggle = () => { if (toggleAction) statusMutation.mutate({ id: toggleAction.vendorId, isActive: !toggleAction.currentStatus }); setDialog(null); };
  const confirmReject = () => { if (!selectedVendor || !rejectionReason.trim()) { toast({ title: t.failure, description: t.reason, variant: "destructive" }); return; } rejectMutation.mutate({ id: selectedVendor.id, reason: rejectionReason }); };

  const Status = ({ vendor }: { vendor: Vendor }) => <div className="flex flex-wrap gap-1.5">
    <Badge data-testid={vendor.isApproved ? `status-approved-${vendor.id}` : `status-pending-${vendor.id}`} className={vendor.isApproved ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-amber-100 text-amber-800 hover:bg-amber-100"}>{vendor.isApproved ? t.approvedStatus : t.pendingStatus}</Badge>
    <Badge data-testid={vendor.isActive ? `status-active-${vendor.id}` : `status-inactive-${vendor.id}`} variant="outline" className={vendor.isActive ? "border-emerald-300 text-emerald-700" : "border-slate-300 text-slate-500"}>{vendor.isActive ? t.active : t.inactive}</Badge>
  </div>;
  const Empty = ({ message, hint }: { message: string; hint?: string }) => <Card className="border-slate-300"><CardContent className="py-14 text-center text-slate-500"><Store className="mx-auto mb-3 h-10 w-10 text-slate-300" /><p className="font-medium text-slate-700">{message}</p>{hint && <p className="mt-1 text-sm">{hint}</p>}</CardContent></Card>;
  const TableShell = ({ vendors, loading, error, emptyMessage, testId, kind }: { vendors: Vendor[]; loading: boolean; error: boolean; emptyMessage: string; testId: string; kind: "pending" | "approved" | "rejected" | "all" }) => {
    if (loading) return <Card><CardContent className="py-14 text-center text-slate-500">{t.loading}</CardContent></Card>;
    if (error) return <Card><CardContent className="py-12 text-center text-rose-600"><p>{t.error}</p><Button variant="outline" size="sm" className="mt-3" onClick={refresh}>{t.retry}</Button></CardContent></Card>;
    const query = vendorSearch.trim().toLowerCase();
    const filteredVendors = vendors.filter((vendor) => {
      const matchesSearch = !query || [localizedVendorName(vendor), vendor.vendorName, vendor.vendorNameAr, vendor.vendorNameTr, vendor.contactEmail, vendor.contactPhone, vendor.address]
        .some((value) => String(value || "").toLowerCase().includes(query));
      const matchesStatus = vendorStatusFilter === "all" || (vendorStatusFilter === "active" ? vendor.isActive : !vendor.isActive);
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      if (vendorSort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (vendorSort === "sales") return Number(b.totalSales || 0) - Number(a.totalSales || 0);
      if (vendorSort === "rating") return Number(b.rating || 0) - Number(a.rating || 0);
      if (vendorSort === "name") return localizedVendorName(a).localeCompare(localizedVendorName(b), language);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    if (!vendors.length) return <Empty message={emptyMessage} />;
    return <div className="space-y-3">
      <div className="flex flex-wrap gap-2 rounded-md border border-slate-300 bg-slate-50 p-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={vendorSearch} onChange={(event) => setVendorSearch(event.target.value)} placeholder={filterText.search} className="h-9 border-slate-300 ps-9" data-testid="input-vendor-search" />
        </div>
        <Select value={vendorStatusFilter} onValueChange={(value: "all" | "active" | "inactive") => setVendorStatusFilter(value)}>
          <SelectTrigger className="h-9 w-[170px] border-slate-300" data-testid="select-vendor-status"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">{filterText.allStatuses}</SelectItem><SelectItem value="active">{t.active}</SelectItem><SelectItem value="inactive">{t.inactive}</SelectItem></SelectContent>
        </Select>
        <Select value={vendorSort} onValueChange={(value: "newest" | "oldest" | "sales" | "rating" | "name") => setVendorSort(value)}>
          <SelectTrigger className="h-9 w-[180px] border-slate-300" data-testid="select-vendor-sort"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="newest">{filterText.newest}</SelectItem><SelectItem value="oldest">{filterText.oldest}</SelectItem><SelectItem value="sales">{filterText.sales}</SelectItem><SelectItem value="rating">{filterText.rating}</SelectItem><SelectItem value="name">{filterText.name}</SelectItem></SelectContent>
        </Select>
        <Badge variant="secondary" className="h-9 px-3">{filteredVendors.length} {filterText.results}</Badge>
      </div>
      {!filteredVendors.length ? <Empty message={t.empty} /> : <Card className="overflow-hidden border-slate-300 shadow-sm" data-testid={testId}><CardContent className="p-0"><div className="overflow-x-auto"><Table className="min-w-[1180px] text-xs">
      <TableHeader className="sticky top-0 z-10 bg-slate-700"><TableRow className="border-slate-700 hover:bg-slate-700">{[t.name, t.contact, t.address, t.status, t.products, t.sales, t.orders, t.rating, t.created, t.actions].map((h) => <TableHead key={h} className="h-9 border-e border-slate-600 px-3 text-start font-semibold text-slate-50">{h}</TableHead>)}</TableRow></TableHeader>
       <TableBody>{filteredVendors.map((vendor) => { const s = stats.data?.stats?.[vendor.id]; return <TableRow key={vendor.id} className="border-slate-200 odd:bg-slate-50 even:bg-white hover:bg-amber-50" data-testid={kind === "rejected" ? `rejected-vendor-card-${vendor.id}` : `vendor-card-${vendor.id}`}>
        <TableCell className="border-e border-slate-200 px-3 py-2"><div className="flex items-center gap-2.5"><div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100">{vendor.logo ? <img src={vendor.logo} alt={localizedVendorName(vendor)} className="h-full w-full object-cover" /> : <Store className="h-4 w-4 text-slate-500" />}</div><div><div className="font-semibold text-slate-900" data-testid={`vendor-name-${vendor.id}`}>{localizedVendorName(vendor)}</div><div className="font-mono text-[10px] text-slate-500">#{vendor.id}</div></div></div></TableCell>
        <TableCell className="border-e border-slate-200 px-3 py-2"><div data-testid={`vendor-email-${vendor.id}`}>{vendor.contactEmail || t.noData}</div><div className="text-slate-500" data-testid={`vendor-phone-${vendor.id}`}>{vendor.contactPhone || t.noData}</div></TableCell>
        <TableCell className="max-w-[190px] border-e border-slate-200 px-3 py-2"><div className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="line-clamp-2" data-testid={`vendor-address-${vendor.id}`}>{vendor.address || t.noData}</span></div></TableCell>
        <TableCell className="border-e border-slate-200 px-3 py-2"><Status vendor={vendor} /></TableCell>
        <TableCell className="border-e border-slate-200 px-3 py-2" data-testid={`vendor-product-stats-${vendor.id}`}><div className="grid grid-cols-2 gap-x-2 gap-y-1 whitespace-nowrap"><span className="text-emerald-700">{t.available}: {s?.inStock ?? 0}</span><span className="text-amber-700">{t.low}: {s?.lowStock ?? 0}</span><span className="text-rose-700">{t.out}: {s?.outOfStock ?? 0}</span><span className="text-slate-500">{t.hidden}: {s?.hiddenProducts ?? 0}</span><span className="font-semibold text-slate-700">{t.total}: {s?.totalProducts ?? 0}</span></div></TableCell>
        <TableCell className="border-e border-slate-200 px-3 py-2 font-mono whitespace-nowrap">{(s?.totalSales ?? Number(vendor.totalSales || 0)).toLocaleString()} IQD</TableCell>
        <TableCell className="border-e border-slate-200 px-3 py-2 text-center">{s?.totalOrders ?? 0}</TableCell>
        <TableCell className="border-e border-slate-200 px-3 py-2 whitespace-nowrap"><Star className="me-1 inline h-3.5 w-3.5 text-amber-500" />{Number(vendor.rating || 0).toFixed(1)} <span className="text-slate-500">({vendor.totalReviews})</span></TableCell>
        <TableCell className="border-e border-slate-200 px-3 py-2 whitespace-nowrap">{date(vendor.createdAt)}</TableCell>
        <TableCell className="px-3 py-2"><div className="flex max-w-[260px] flex-wrap gap-1"><Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => action(vendor, "details")} data-testid={kind === "rejected" ? `button-view-details-rejected-${vendor.id}` : `button-view-details-${vendor.id}`}><Eye className="me-1 h-3.5 w-3.5" />{t.view}</Button>{!vendor.isApproved && <><Button size="sm" className="h-7 bg-emerald-600 px-2 text-xs hover:bg-emerald-700" onClick={() => action(vendor, "approve")} data-testid={kind === "rejected" ? `button-reapprove-${vendor.id}` : `button-approve-${vendor.id}`}><Check className="me-1 h-3.5 w-3.5" />{vendor.rejectionReason ? t.reapprove : t.approve}</Button><Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => action(vendor, "reject")} data-testid={`button-reject-${vendor.id}`}><X className="me-1 h-3.5 w-3.5" />{t.reject}</Button></>}{vendor.isApproved && <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => action(vendor, "toggle")} data-testid={`button-toggle-status-${vendor.id}`}>{vendor.isActive ? t.disable : t.enable}</Button>}</div></TableCell>
      </TableRow>; })}</TableBody>
    </Table></div></CardContent></Card>}</div>;
  };

  const listConfig = (kind: "pending" | "approved" | "rejected" | "all") => ({ vendors: kind === "pending" ? pending.data?.vendors || [] : kind === "approved" ? approved.data?.vendors || [] : kind === "rejected" ? rejected.data?.vendors || [] : all.data?.vendors || [], query: kind === "pending" ? pending : kind === "approved" ? approved : kind === "rejected" ? rejected : all, empty: kind === "pending" ? t.emptyPending : kind === "approved" ? t.emptyApproved : kind === "rejected" ? t.emptyRejected : t.empty });
  const VendorTab = ({ kind, testId }: { kind: "pending" | "approved" | "rejected" | "all"; testId: string }) => { const config = listConfig(kind); return <TableShell vendors={config.vendors} loading={config.query.isLoading} error={config.query.isError} emptyMessage={config.empty} testId={testId} kind={kind} />; };

  return <div dir={direction} className="min-h-[100dvh] bg-slate-100 p-4 text-slate-800 sm:p-6">
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-300 pb-5"><div><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl" data-testid="page-title">{t.title}</h1><p className="mt-1 text-sm text-slate-500" data-testid="page-description">{t.desc}</p></div><Button variant="outline" size="sm" onClick={refresh}>{t.retry}</Button></div>
      <Tabs defaultValue="accounting" className="space-y-5">
        <TabsList className="w-full justify-start gap-1 rounded-md border border-slate-300 bg-slate-200 p-1" data-testid="vendor-tabs">
          <TabsTrigger value="pending" data-testid="tab-pending">{t.pending} ({pending.data?.vendors?.length || 0})</TabsTrigger><TabsTrigger value="approved" data-testid="tab-approved">{t.approved} ({approved.data?.vendors?.length || 0})</TabsTrigger><TabsTrigger value="rejected" data-testid="tab-rejected">{t.rejected} ({rejected.data?.vendors?.length || 0})</TabsTrigger><TabsTrigger value="all" data-testid="tab-all">{t.all} ({all.data?.vendors?.length || 0})</TabsTrigger><TabsTrigger value="profile-changes" data-testid="tab-profile-changes">{t.changes} ({changes.data?.vendors?.length || 0})</TabsTrigger><TabsTrigger value="accounting" data-testid="tab-accounting"><Calculator className="me-1 h-4 w-4" />{t.accounting}</TabsTrigger><TabsTrigger value="display-settings" data-testid="tab-display-settings"><Settings className="me-1 h-4 w-4" />{settingsText.tab}</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" data-testid="content-pending"><VendorTab kind="pending" testId="pending-vendor-table" /></TabsContent>
        <TabsContent value="approved" data-testid="content-approved"><VendorTab kind="approved" testId="approved-vendor-table" /></TabsContent>
        <TabsContent value="rejected" data-testid="content-rejected"><VendorTab kind="rejected" testId="rejected-vendor-table" /></TabsContent>
        <TabsContent value="all" data-testid="content-all"><VendorTab kind="all" testId="all-vendor-table" /></TabsContent>
        <TabsContent value="profile-changes" data-testid="content-profile-changes">{changes.isLoading ? <Card><CardContent className="py-14 text-center text-slate-500">{t.loading}</CardContent></Card> : changes.isError ? <Card><CardContent className="py-12 text-center text-rose-600">{t.error}</CardContent></Card> : !changes.data?.vendors?.length ? <Empty message={t.emptyChanges} hint={t.emptyHint} /> : <Card className="overflow-hidden border-slate-300 shadow-sm"><CardContent className="p-0"><div className="overflow-x-auto"><Table className="min-w-[900px] text-xs"><TableHeader className="bg-slate-700"><TableRow className="border-slate-700 hover:bg-slate-700">{[t.name, t.submitted, t.actions].map((h) => <TableHead key={h} className="h-9 border-e border-slate-600 px-3 text-start font-semibold text-slate-50">{h}</TableHead>)}</TableRow></TableHeader><TableBody>{changes.data.vendors.map((vendor) => <TableRow key={vendor.id} data-testid={`profile-change-card-${vendor.id}`} className="border-slate-200 odd:bg-slate-50 even:bg-white hover:bg-amber-50"><TableCell className="border-e border-slate-200 px-3 py-3 font-semibold">{localizedVendorName(vendor)} <span className="font-mono text-slate-500">#{vendor.id}</span></TableCell><TableCell className="border-e border-slate-200 px-3 py-3">{date(vendor.pendingChangesSubmittedAt)}</TableCell><TableCell className="px-3 py-3"><div className="flex flex-wrap gap-1.5">{vendor.pendingProfileChanges && Object.entries(vendor.pendingProfileChanges).map(([key, value]) => <Badge variant="outline" key={key} className="max-w-[260px] truncate border-slate-300">{key}: {String(value)}</Badge>)}<Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => rejectChanges.mutate(vendor.id)} disabled={rejectChanges.isPending || approveChanges.isPending} data-testid={`btn-reject-profile-${vendor.id}`}><X className="me-1 h-3.5 w-3.5" />{t.reject}</Button><Button size="sm" className="h-7 bg-emerald-600 px-2 text-xs hover:bg-emerald-700" onClick={() => approveChanges.mutate(vendor.id)} disabled={approveChanges.isPending || rejectChanges.isPending} data-testid={`btn-approve-profile-${vendor.id}`}><Check className="me-1 h-3.5 w-3.5" />{t.apply}</Button></div></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>}</TabsContent>
        <TabsContent value="accounting" data-testid="content-accounting"><VendorAccountingTab /></TabsContent>
        <TabsContent value="display-settings" data-testid="content-display-settings">
          <Card className="max-w-2xl border-slate-300 shadow-sm">
            <CardHeader><CardTitle>{settingsText.title}</CardTitle><CardDescription>{settingsText.description}</CardDescription></CardHeader>
            <CardContent>
              {displaySettings.isLoading ? <p className="text-sm text-slate-500">{t.loading}</p> : displaySettings.isError ? <p className="text-sm text-rose-600">{t.error}</p> : <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <Label htmlFor="vendor-entry-visible" className="cursor-pointer">{displaySettings.data?.vendorEntryVisible !== false ? settingsText.visible : settingsText.hidden}</Label>
                <Switch id="vendor-entry-visible" checked={displaySettings.data?.vendorEntryVisible !== false} onCheckedChange={(checked) => displaySettingsMutation.mutate(checked)} disabled={displaySettingsMutation.isPending} data-testid="switch-vendor-entry-visible" />
              </div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

    <Dialog open={dialog === "details"} onOpenChange={(open) => !open && setDialog(null)}>
      <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto" dir={direction} data-testid="dialog-details">
        <DialogHeader><DialogTitle>{t.details}</DialogTitle><DialogDescription>{selectedVendor && localizedVendorName(selectedVendor)}</DialogDescription></DialogHeader>
        {selectedVendor && <>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div><Label>{t.name}</Label><p className="font-semibold" data-testid="details-vendor-name">{localizedVendorName(selectedVendor)}</p></div>
            <div><Label>{t.contact}</Label><p>{selectedVendor.contactEmail}<br />{selectedVendor.contactPhone || t.noData}</p></div>
            <div><Label>{t.address}</Label><p>{selectedVendor.address || t.noData}</p></div>
            <div><Label>{t.businessLicense}</Label><p data-testid="details-business-license">{selectedVendor.businessLicense || t.noData}</p></div>
            <div><Label>{t.taxId}</Label><p data-testid="details-tax-id">{selectedVendor.taxId || t.noData}</p></div>
            <div className="sm:col-span-2"><Label>{t.description}</Label><p data-testid="details-description">{selectedVendor.description || t.noData}</p></div>
            <div><Label>{t.status}</Label><Status vendor={selectedVendor} /></div>
            <div><Label>{t.approvedAt}</Label><p data-testid="details-approved-at">{date(selectedVendor.approvedAt)}</p></div>
            <div><Label>{t.totalSales}</Label><p className="font-semibold">{Number(selectedVendor.totalSales || 0).toLocaleString()} IQD</p></div>
            <div><Label>{t.rating}</Label><p className="font-semibold">{Number(selectedVendor.rating || 0).toFixed(1)} ({selectedVendor.totalReviews} {t.reviews})</p></div>
            {selectedVendor.rejectionReason && <div className="sm:col-span-2"><Label>{t.reason}</Label><p className="text-rose-700">{selectedVendor.rejectionReason}</p></div>}
          </div>
          <Button type="button" variant="outline" onClick={() => startEditing(selectedVendor)} data-testid="button-edit-vendor"><Pencil className="me-2 h-4 w-4" />{editText.edit}</Button>
        </>}
      </DialogContent>
    </Dialog>
    <Dialog open={dialog === "edit"} onOpenChange={(open) => !open && setDialog(null)}>
      <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto" dir={direction} data-testid="dialog-edit-vendor">
        <DialogHeader><DialogTitle>{editText.title}</DialogTitle><DialogDescription>{editText.hint}</DialogDescription></DialogHeader>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); saveProfile(); }}>
          {([
            ["vendorName", t.name], ["contactEmail", editText.email], ["contactPhone", editText.phone],
            ["address", t.address], ["businessLicense", t.businessLicense],
          ] as [keyof VendorProfile, string][]).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`edit-vendor-${key}`}>{label}</Label>
              <Input id={`edit-vendor-${key}`} type={key === "contactEmail" ? "email" : "text"}
                value={profile[key]} maxLength={key === "contactEmail" ? 254 : 500}
                onChange={(event) => setProfile(current => ({ ...current, [key]: event.target.value }))}
                data-testid={`input-vendor-${key}`} />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialog("details")}>{t.cancel}</Button>
            <Button type="submit" disabled={profileMutation.isPending || !selectedVendor ||
              !editableProfileKeys.some(key => profile[key].trim() !== (selectedVendor[key] || ""))}
              data-testid="button-save-vendor">{profileMutation.isPending ? t.processing : editText.save}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={dialog === "reject"} onOpenChange={(open) => !open && setDialog(null)}><DialogContent data-testid="dialog-reject"><DialogHeader><DialogTitle>{t.confirmReject}</DialogTitle><DialogDescription>{t.rejectQuestion.replace("{name}", selectedVendor ? localizedVendorName(selectedVendor) : "")}</DialogDescription></DialogHeader><div className="space-y-2 py-3"><Label htmlFor="rejection-reason">{t.reason}</Label><Textarea id="rejection-reason" placeholder={t.reasonPlaceholder} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={4} data-testid="input-rejection-reason" /></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialog(null)} data-testid="button-cancel-reject">{t.cancel}</Button><Button variant="destructive" onClick={confirmReject} disabled={rejectMutation.isPending} data-testid="button-confirm-reject">{rejectMutation.isPending ? t.processing : t.reject}</Button></div></DialogContent></Dialog>
    <AlertDialog open={dialog === "approve"} onOpenChange={(open) => !open && setDialog(null)}><AlertDialogContent data-testid="dialog-approve-confirm"><AlertDialogHeader><AlertDialogTitle>{t.confirmApprove}</AlertDialogTitle><AlertDialogDescription>{t.approveQuestion.replace("{name}", selectedVendor ? localizedVendorName(selectedVendor) : "")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel data-testid="button-cancel-approve">{t.cancel}</AlertDialogCancel><AlertDialogAction onClick={confirmApprove} className="bg-emerald-600 hover:bg-emerald-700" data-testid="button-confirm-approve">{t.confirm}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={dialog === "toggle"} onOpenChange={(open) => !open && setDialog(null)}><AlertDialogContent data-testid="dialog-toggle-status-confirm"><AlertDialogHeader><AlertDialogTitle>{t.confirmToggle}</AlertDialogTitle><AlertDialogDescription>{t.toggleQuestion.replace("{name}", selectedVendor ? localizedVendorName(selectedVendor) : "").replace("{action}", toggleAction?.currentStatus ? t.disable : t.enable)}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel data-testid="button-cancel-toggle">{t.cancel}</AlertDialogCancel><AlertDialogAction onClick={confirmToggle} data-testid="button-confirm-toggle">{t.confirm}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}