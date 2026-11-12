import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ArrowLeft, MessageSquare, Mail, Phone, Building, Calendar, Clock,
  CheckCircle, Package, AlertCircle, User, FileText,
} from "lucide-react";

interface Inquiry {
  id: number;
  inquiryNumber: string;
  contactEmail: string;
  contactPhone?: string;
  company?: string;
  subject: string;
  message: string;
  type: string;
  priority: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  productIds?: number[];
}

interface InquiryResponse {
  id: number;
  inquiryId: number;
  senderId: number;
  senderType: string;
  message: string;
  attachments?: unknown;
  isInternal: boolean;
  readAt?: string;
  createdAt: string;
}

type Language = "en" | "fa" | "ar" | "tr";
type Copy = {
  loading: string; notFound: string; back: string; inquiry: string; details: string;
  subject: string; message: string; type: string; category: string; contact: string;
  email: string; phone: string; company: string; responses: string; history: string;
  sender: string; supportTeam: string; noResponses: string; responseHint: string;
  created: string; updated: string; quickActions: string; followUp: string;
  viewProducts: string; startReview: string; resolved: string; updating: string;
  followUpTitle: string; followUpLabel: string; followUpPlaceholder: string;
  cancel: string; sending: string; send: string; required: string; success: string;
  followUpSuccess: string; statusSuccess: string; error: string; followUpError: string; statusError: string;
  status: Record<string, string>; priority: Record<string, string>;
  categoryLabels: Record<string, string>; typeLabels: Record<string, string>; senderLabels: Record<string, string>;
  dateLocale: string;
};

const catalog: Record<Language, Copy> = {
  en: {
    loading: "Loading inquiry…", notFound: "Inquiry not found", back: "Back to dashboard",
    inquiry: "Inquiry", details: "Inquiry details", subject: "Subject", message: "Message",
    type: "Type", category: "Category", contact: "Contact information", email: "Email",
    phone: "Phone", company: "Company", responses: "Responses", history: "History",
    sender: "Sender", supportTeam: "Support team", noResponses: "No responses yet",
    responseHint: "We'll respond within 24 hours", created: "Created", updated: "Last updated",
    quickActions: "Quick actions", followUp: "Send follow-up", viewProducts: "View related products",
    startReview: "Start review", resolved: "Mark as resolved", updating: "Updating…",
    followUpTitle: "Send follow-up", followUpLabel: "Follow-up message *",
    followUpPlaceholder: "Enter your follow-up message for the customer…", cancel: "Cancel",
    sending: "Sending…", send: "Send follow-up", required: "Please enter a follow-up message",
    success: "Success", followUpSuccess: "Follow-up sent successfully", statusSuccess: "Inquiry status updated successfully", error: "Error",
    followUpError: "Failed to send follow-up message", statusError: "Failed to update inquiry status",
    status: { open: "Open", in_progress: "In progress", resolved: "Resolved", closed: "Closed" },
    priority: { urgent: "Urgent", high: "High", normal: "Normal" },
    categoryLabels: { "fuel-additives": "Fuel additives", "water-treatment": "Water treatment", "paint-thinner": "Paint & thinner", "agricultural-fertilizers": "Agricultural fertilizers", general: "General" },
    typeLabels: { product_info: "Product information", quote_request: "Quote request", technical_support: "Technical support", complaint: "Complaint", general: "General" },
    senderLabels: { admin: "Support team", support: "Support team", customer: "Customer" },
    dateLocale: "en-US",
  },
  fa: {
    loading: "در حال بارگذاری استعلام…", notFound: "استعلام پیدا نشد", back: "بازگشت به داشبورد",
    inquiry: "استعلام", details: "جزئیات استعلام", subject: "موضوع", message: "پیام",
    type: "نوع", category: "دسته‌بندی", contact: "اطلاعات تماس", email: "ایمیل", phone: "تلفن",
    company: "شرکت", responses: "پاسخ‌ها", history: "تاریخچه", sender: "فرستنده",
    supportTeam: "تیم پشتیبانی", noResponses: "هنوز پاسخی ثبت نشده است",
    responseHint: "پاسخ ما ظرف ۲۴ ساعت ارسال می‌شود", created: "ایجاد شده", updated: "آخرین به‌روزرسانی",
    quickActions: "عملیات سریع", followUp: "ارسال پیگیری", viewProducts: "مشاهده محصولات مرتبط",
    startReview: "شروع بررسی", resolved: "علامت‌گذاری به‌عنوان حل‌شده", updating: "در حال به‌روزرسانی…",
    followUpTitle: "ارسال پیگیری", followUpLabel: "پیام پیگیری *",
    followUpPlaceholder: "پیام پیگیری برای مشتری را وارد کنید…", cancel: "انصراف",
    sending: "در حال ارسال…", send: "ارسال پیگیری", required: "لطفاً پیام پیگیری را وارد کنید",
    success: "موفقیت", followUpSuccess: "پیگیری با موفقیت ارسال شد", statusSuccess: "وضعیت استعلام با موفقیت به‌روزرسانی شد", error: "خطا",
    followUpError: "ارسال پیام پیگیری ناموفق بود", statusError: "به‌روزرسانی وضعیت استعلام ناموفق بود",
    status: { open: "باز", in_progress: "در حال بررسی", resolved: "حل‌شده", closed: "بسته" },
    priority: { urgent: "فوری", high: "زیاد", normal: "عادی" },
    categoryLabels: { "fuel-additives": "افزودنی سوخت", "water-treatment": "تصفیه آب", "paint-thinner": "رنگ و تینر", "agricultural-fertilizers": "کودهای کشاورزی", general: "عمومی" },
    typeLabels: { product_info: "اطلاعات محصول", quote_request: "درخواست قیمت", technical_support: "پشتیبانی فنی", complaint: "شکایت", general: "عمومی" },
    senderLabels: { admin: "تیم پشتیبانی", support: "تیم پشتیبانی", customer: "مشتری" },
    dateLocale: "fa-IR",
  },
  ar: {
    loading: "جارٍ تحميل الاستفسار…", notFound: "لم يتم العثور على الاستفسار", back: "العودة إلى لوحة التحكم",
    inquiry: "استفسار", details: "تفاصيل الاستفسار", subject: "الموضوع", message: "الرسالة",
    type: "النوع", category: "الفئة", contact: "معلومات الاتصال", email: "البريد الإلكتروني",
    phone: "الهاتف", company: "الشركة", responses: "الردود", history: "السجل", sender: "المرسل",
    supportTeam: "فريق الدعم", noResponses: "لا توجد ردود بعد", responseHint: "سنرد خلال ٢٤ ساعة",
    created: "تاريخ الإنشاء", updated: "آخر تحديث", quickActions: "إجراءات سريعة",
    followUp: "إرسال متابعة", viewProducts: "عرض المنتجات ذات الصلة", startReview: "بدء المعالجة",
    resolved: "وضع علامة كمحلول", updating: "جارٍ التحديث…", followUpTitle: "إرسال متابعة",
    followUpLabel: "رسالة المتابعة *", followUpPlaceholder: "أدخل رسالة المتابعة للعميل…",
    cancel: "إلغاء", sending: "جارٍ الإرسال…", send: "إرسال المتابعة",
    required: "يرجى إدخال رسالة متابعة", success: "نجاح", followUpSuccess: "تم إرسال المتابعة بنجاح", statusSuccess: "تم تحديث حالة الاستفسار بنجاح",
    error: "خطأ", followUpError: "فشل إرسال رسالة المتابعة", statusError: "فشل تحديث حالة الاستفسار",
    status: { open: "مفتوح", in_progress: "قيد المعالجة", resolved: "تم الحل", closed: "مغلق" },
    priority: { urgent: "عاجل", high: "مرتفع", normal: "عادي" },
    categoryLabels: { "fuel-additives": "إضافات الوقود", "water-treatment": "معالجة المياه", "paint-thinner": "الطلاء والمخفف", "agricultural-fertilizers": "الأسمدة الزراعية", general: "عام" },
    typeLabels: { product_info: "معلومات المنتج", quote_request: "طلب عرض سعر", technical_support: "دعم فني", complaint: "شكوى", general: "عام" },
    senderLabels: { admin: "فريق الدعم", support: "فريق الدعم", customer: "العميل" },
    dateLocale: "ar",
  },
  tr: {
    loading: "Talep yükleniyor…", notFound: "Talep bulunamadı", back: "Panele dön",
    inquiry: "Talep", details: "Talep detayları", subject: "Konu", message: "Mesaj", type: "Tür",
    category: "Kategori", contact: "İletişim bilgileri", email: "E-posta", phone: "Telefon",
    company: "Şirket", responses: "Yanıtlar", history: "Geçmiş", sender: "Gönderen",
    supportTeam: "Destek ekibi", noResponses: "Henüz yanıt yok", responseHint: "24 saat içinde yanıt vereceğiz",
    created: "Oluşturuldu", updated: "Son güncelleme", quickActions: "Hızlı işlemler",
    followUp: "Takip gönder", viewProducts: "İlgili ürünleri görüntüle", startReview: "İncelemeyi başlat",
    resolved: "Çözüldü olarak işaretle", updating: "Güncelleniyor…", followUpTitle: "Takip gönder",
    followUpLabel: "Takip mesajı *", followUpPlaceholder: "Müşteri için takip mesajınızı yazın…",
    cancel: "İptal", sending: "Gönderiliyor…", send: "Takip gönder", required: "Lütfen takip mesajı girin",
    success: "Başarılı", followUpSuccess: "Takip başarıyla gönderildi", statusSuccess: "Talep durumu başarıyla güncellendi", error: "Hata",
    followUpError: "Takip mesajı gönderilemedi", statusError: "Talep durumu güncellenemedi",
    status: { open: "Açık", in_progress: "İşlemde", resolved: "Çözüldü", closed: "Kapalı" },
    priority: { urgent: "Acil", high: "Yüksek", normal: "Normal" },
    categoryLabels: { "fuel-additives": "Yakıt katkıları", "water-treatment": "Su arıtma", "paint-thinner": "Boya ve tiner", "agricultural-fertilizers": "Tarımsal gübreler", general: "Genel" },
    typeLabels: { product_info: "Ürün bilgisi", quote_request: "Teklif talebi", technical_support: "Teknik destek", complaint: "Şikayet", general: "Genel" },
    senderLabels: { admin: "Destek ekibi", support: "Destek ekibi", customer: "Müşteri" },
    dateLocale: "tr-TR",
  },
};

const InquiryDetail = () => {
  const [location] = useLocation();
  const inquiryId = location.split("/")[3];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language, direction } = useLanguage();
  const t = catalog[language as Language];
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/admin/check-auth");
        if (!response.ok) window.location.href = "/mrg/login";
      } catch (error) {
        console.error("Auth check failed:", error);
        window.location.href = "/mrg/login";
      }
    };
    checkAuth();
  }, []);

  const { data: inquiry, isLoading } = useQuery<Inquiry>({
    queryKey: ["/api/inquiries", inquiryId],
    queryFn: () => fetch(`/api/inquiries/${inquiryId}`).then((res) => res.json()),
    enabled: !!inquiryId,
  });
  const { data: responses } = useQuery<InquiryResponse[]>({
    queryKey: ["/api/inquiries", inquiryId, "responses"],
    queryFn: () => fetch(`/api/inquiries/${inquiryId}/responses`).then((res) => res.json()),
    enabled: !!inquiryId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await fetch(`/api/inquiries/${inquiryId}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error(t.statusError);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries", inquiryId] });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries"] });
      toast({ title: t.success, description: t.statusSuccess });
    },
    onError: (error: Error) => toast({ title: t.error, description: error.message || t.statusError, variant: "destructive" }),
  });

  const handleSendFollowUp = async () => {
    if (!followUpMessage.trim()) {
      toast({ title: t.error, description: t.required, variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/inquiries/${inquiryId}/response`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseText: followUpMessage }),
      });
      if (response.ok) {
        toast({ title: t.success, description: t.followUpSuccess });
        setFollowUpMessage("");
        setIsFollowUpDialogOpen(false);
        window.location.reload();
      } else throw new Error(t.followUpError);
    } catch {
      toast({ title: t.error, description: t.followUpError, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewRelatedProducts = () => {
    const category = inquiry?.category || "";
    window.open("/shop", "_blank");
  };
  const dateLabel = (value: string) => new Intl.DateTimeFormat(t.dateLocale, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
  const statusColor = (status: string) => ({
    open: "bg-blue-100 text-blue-800", in_progress: "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800", closed: "bg-gray-100 text-gray-800",
  }[status] || "bg-gray-100 text-gray-800");
  const priorityColor = (priority: string) => ({
    urgent: "bg-red-100 text-red-800", high: "bg-orange-100 text-orange-800",
    normal: "bg-blue-100 text-blue-800",
  }[priority] || "bg-gray-100 text-gray-800");
  const statusIcon = (status: string) => {
    if (status === "open") return <AlertCircle className="h-4 w-4" />;
    if (status === "in_progress") return <Clock className="h-4 w-4" />;
    if (status === "resolved" || status === "closed") return <CheckCircle className="h-4 w-4" />;
    return <MessageSquare className="h-4 w-4" />;
  };
  const enumLabel = (labels: Record<string, string>, value: string) =>
    labels[value] || value.replace(/[-_]/g, " ");

  if (isLoading) return <div dir={direction} className="flex min-h-[100dvh] items-center justify-center bg-gray-50 text-gray-600">{t.loading}</div>;
  if (!inquiry) return (
    <div dir={direction} className="min-h-[100dvh] bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8"><div className="text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">{t.notFound}</h1>
        <Link href="/mrg/inquiries" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />{t.back}
        </Link>
      </div></div>
    </div>
  );

  return (
    <div dir={direction} className="min-h-[100dvh] bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/mrg/inquiries" className="mb-4 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />{t.back}
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h1 className="text-2xl font-bold text-gray-900">{inquiry.subject}</h1><p className="text-gray-600">{t.inquiry} #{inquiry.inquiryNumber}</p></div>
            <div className="flex items-center gap-2"><Badge className={statusColor(inquiry.status)}>{statusIcon(inquiry.status)}<span className="ms-1">{enumLabel(t.status, inquiry.status)}</span></Badge><Badge className={priorityColor(inquiry.priority)}>{enumLabel(t.priority, inquiry.priority)}</Badge></div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />{t.details}</CardTitle></CardHeader><CardContent className="space-y-4">
              <div><h4 className="mb-2 font-semibold text-gray-900">{t.subject}</h4><p className="text-gray-700">{inquiry.subject}</p></div><Separator />
              <div><h4 className="mb-2 font-semibold text-gray-900">{t.message}</h4><div className="rounded-lg bg-gray-50 p-4"><p className="whitespace-pre-wrap text-gray-700">{inquiry.message}</p></div></div><Separator />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><h4 className="mb-2 font-semibold text-gray-900">{t.type}</h4><p className="text-gray-700">{enumLabel(t.typeLabels, inquiry.type)}</p></div><div><h4 className="mb-2 font-semibold text-gray-900">{t.category}</h4><div className="flex items-center gap-2"><Package className="h-4 w-4 text-gray-400" /><span className="text-gray-700">{enumLabel(t.categoryLabels, inquiry.category)}</span></div></div></div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />{t.responses} ({responses?.length || 0})</CardTitle></CardHeader><CardContent>
              {responses && responses.length > 0 ? <div className="space-y-4">{responses.map((response) => <div key={response.id} className="rounded-lg border border-gray-200 p-4"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /><span className="font-medium text-gray-900">{t.supportTeam}</span><Badge variant="outline" className="text-xs">{enumLabel(t.senderLabels, response.senderType)}</Badge></div><span className="text-sm text-gray-500">{dateLabel(response.createdAt)}</span></div><p className="whitespace-pre-wrap text-gray-700">{response.message}</p></div>)}</div> : <div className="py-8 text-center"><MessageSquare className="mx-auto mb-2 h-8 w-8 text-gray-300" /><p className="text-gray-500">{t.noResponses}</p><p className="text-sm text-gray-400">{t.responseHint}</p></div>}
            </CardContent></Card>
          </div>
          <div className="space-y-6">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />{t.contact}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-center gap-3"><Mail className="h-4 w-4 text-gray-400" /><span className="text-gray-700">{inquiry.contactEmail}</span></div>{inquiry.contactPhone && <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-gray-400" /><span className="text-gray-700">{inquiry.contactPhone}</span></div>}{inquiry.company && <div className="flex items-center gap-3"><Building className="h-4 w-4 text-gray-400" /><span className="text-gray-700">{inquiry.company}</span></div>}</CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />{t.history}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-gray-400" /><div><p className="text-sm font-medium text-gray-900">{t.created}</p><p className="text-sm text-gray-500">{dateLabel(inquiry.createdAt)}</p></div></div><div className="flex items-center gap-3"><Clock className="h-4 w-4 text-gray-400" /><div><p className="text-sm font-medium text-gray-900">{t.updated}</p><p className="text-sm text-gray-500">{dateLabel(inquiry.updatedAt)}</p></div></div></CardContent></Card>
            <Card><CardHeader><CardTitle>{t.quickActions}</CardTitle></CardHeader><CardContent className="space-y-2"><Button variant="outline" className="w-full" onClick={() => setIsFollowUpDialogOpen(true)}><Mail className="me-2 h-4 w-4" />{t.followUp}</Button><Button variant="outline" className="w-full" onClick={handleViewRelatedProducts}><Package className="me-2 h-4 w-4" />{t.viewProducts}</Button>{inquiry.status === "open" && <Button variant="outline" className="w-full border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100" onClick={() => updateStatusMutation.mutate("in_progress")} disabled={updateStatusMutation.isPending}><Clock className="me-2 h-4 w-4" />{updateStatusMutation.isPending ? t.updating : t.startReview}</Button>}{inquiry.status === "in_progress" && <Button variant="outline" className="w-full border-green-300 bg-green-50 text-green-800 hover:bg-green-100" onClick={() => updateStatusMutation.mutate("resolved")} disabled={updateStatusMutation.isPending}><CheckCircle className="me-2 h-4 w-4" />{updateStatusMutation.isPending ? t.updating : t.resolved}</Button>}</CardContent></Card>
          </div>
        </div>
      </div>
      <Dialog open={isFollowUpDialogOpen} onOpenChange={setIsFollowUpDialogOpen}><DialogContent dir={direction} className="w-[calc(100%-2rem)] max-w-md"><DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />{t.followUpTitle}</DialogTitle></DialogHeader><div className="space-y-4"><div><Label htmlFor="follow-up-message">{t.followUpLabel}</Label><Textarea id="follow-up-message" value={followUpMessage} onChange={(e) => setFollowUpMessage(e.target.value)} placeholder={t.followUpPlaceholder} rows={4} required /></div><div className="flex flex-col-reverse gap-3 sm:flex-row"><Button type="button" variant="outline" onClick={() => setIsFollowUpDialogOpen(false)}>{t.cancel}</Button><Button onClick={handleSendFollowUp} disabled={isSubmitting} className="flex-1">{isSubmitting ? t.sending : t.send}</Button></div></div></DialogContent></Dialog>
    </div>
  );
};

export default InquiryDetail;