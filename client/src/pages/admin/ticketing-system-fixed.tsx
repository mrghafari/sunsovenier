import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertCircle, AlertTriangle, BarChart3, Calendar, CheckCircle, Clock,
  Eye, FileText, Plus, Send, Tag, Ticket, User, UserCheck, XCircle,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type Language = "en" | "fa" | "ar" | "tr";
type Catalog = {
  [key: string]: string;
};

const catalog: Record<Language, Catalog> = {
  en: {
    title: "Ticketing system", pageDescription: "Manage technical support tickets and communicate with administrators",
    current: "Current user", admin: "Administrator", customer: "Customer", new: "New ticket",
    create: "Create new support ticket", titleLabel: "Title", titlePh: "Describe the issue briefly...",
    category: "Category", selectCategory: "Select a category", priority: "Priority",
    selectPriority: "Select a priority", department: "Related department", departmentPh: "Department or module name...",
    details: "Details", description: "Description", descriptionPh: "Include the issue, reproduction steps, and relevant information...",
    creating: "Creating…", createTicket: "Create ticket", cancel: "Cancel", success: "Success", error: "Error",
    created: "Support ticket created successfully", createError: "Unable to create ticket",
    statusUpdated: "Ticket status updated", responseAdded: "Response added",
    adminRequired: "You must be signed in as an administrator to change ticket status",
    open: "Open", in_progress: "In progress", resolved: "Resolved", closed: "Closed", on_hold: "On hold",
     total: "All tickets", my: "My tickets", all: "All tickets", urgentBadge: "Urgent", start: "Start",
    resolve: "Resolve", adminSuffix: "(administrator)", needAdmin: "Administrator sign-in required",
    search: "Search tickets…", responses: "Responses and comments", addResponse: "Add a response",
    adminResponse: "Administrator response", responsePh: "Write your response…",
    internal: "Internal response (visible only to administrators)", send: "Send response",
    loading: "Loading tickets…", loadError: "Tickets could not be loaded.", retry: "Try again",
    empty: "No tickets found", emptyHint: "Tickets matching the current view will appear here.",
    noResponses: "No responses yet.", senderAdmin: "Administrator", senderCustomer: "Site manager",
    internalBadge: "Internal", ticketDetails: "Ticket details", submittedBy: "Submitted by",
     date: "Date", departmentLabel: "Department", tableCaption: "Support tickets", statusFilterPlaceholder: "Filter by status",
     rowNumber: "No.", ticketNumber: "Ticket number", submitter: "Submitter", actions: "Actions", notProvided: "Not provided",
     validationTitle: "Title is required",
    validationDesc: "Description must be at least 10 characters", validationCat: "Category is required",
    validationPriority: "Priority is required", validationMessage: "Message is required",
     technical_issue: "Technical issue", bug_report: "Bug report", feature_request: "Feature request",
    system_error: "System error", user_access: "User access", performance_issue: "Performance issue",
    security_concern: "Security concern", data_issue: "Data issue", integration_problem: "Integration problem",
     other: "Other", low: "Low", normal: "Normal", high: "High", urgent: "Urgent", critical: "Critical",
     unknownStatus: "Unknown status", unknownPriority: "Unspecified priority", unknownCategory: "Unspecified category",
     unknownSender: "Unknown sender", responsesError: "Responses could not be loaded.", createFailure: "Unable to create the ticket.",
     statusFailure: "Unable to update the ticket status.", responseFailure: "Unable to add the response.",
  },
  fa: {
    title: "سیستم تیکتینگ", pageDescription: "مدیریت تیکت‌های پشتیبانی فنی و ارتباط با ادمین",
    current: "کاربر فعلی", admin: "مدیر سیستم", customer: "مشتری", new: "تیکت جدید",
    create: "ایجاد تیکت پشتیبانی جدید", titleLabel: "عنوان", titlePh: "شرح کوتاه مشکل...",
    category: "دسته‌بندی", selectCategory: "انتخاب دسته‌بندی", priority: "اولویت",
    selectPriority: "انتخاب اولویت", department: "بخش مربوطه", departmentPh: "نام بخش یا ماژول...",
    details: "جزئیات", description: "توضیحات", descriptionPh: "شرح کامل مشکل، مراحل تکرار و اطلاعات مرتبط را وارد کنید...",
    creating: "در حال ایجاد…", createTicket: "ایجاد تیکت", cancel: "انصراف", success: "موفقیت", error: "خطا",
    created: "تیکت پشتیبانی با موفقیت ایجاد شد", createError: "ایجاد تیکت ناموفق بود",
    statusUpdated: "وضعیت تیکت به‌روزرسانی شد", responseAdded: "پاسخ اضافه شد",
    adminRequired: "برای تغییر وضعیت باید به عنوان ادمین وارد شوید",
    open: "باز", in_progress: "در حال بررسی", resolved: "حل‌شده", closed: "بسته‌شده", on_hold: "متوقف‌شده",
    total: "همه تیکت‌ها", my: "تیکت‌های من", all: "همه تیکت‌ها", urgentBadge: "فوری", start: "شروع",
    resolve: "حل شد", adminSuffix: "(ادمین)", needAdmin: "ورود ادمین لازم است", search: "جست‌وجوی تیکت…",
    responses: "پاسخ‌ها و نظرات", addResponse: "افزودن پاسخ", adminResponse: "پاسخ ادمین",
    responsePh: "پاسخ خود را بنویسید...", internal: "پاسخ داخلی (فقط برای ادمین‌ها قابل مشاهده)",
    send: "ارسال پاسخ", loading: "در حال بارگذاری تیکت‌ها…", loadError: "بارگذاری تیکت‌ها ممکن نیست.",
    retry: "تلاش دوباره", empty: "تیکتی پیدا نشد", emptyHint: "تیکت‌های مطابق این نما در اینجا نمایش داده می‌شوند.",
    noResponses: "هنوز پاسخی ثبت نشده است.", senderAdmin: "ادمین", senderCustomer: "مدیر سایت",
    internalBadge: "داخلی", ticketDetails: "جزئیات تیکت", submittedBy: "ثبت‌کننده", date: "تاریخ",
     departmentLabel: "بخش", tableCaption: "تیکت‌های پشتیبانی", statusFilterPlaceholder: "فیلتر وضعیت",
     rowNumber: "ردیف", ticketNumber: "شماره تیکت", submitter: "ثبت‌کننده", actions: "عملیات", notProvided: "ارائه نشده",
     validationTitle: "عنوان الزامی است", validationDesc: "توضیحات باید حداقل ۱۰ کاراکتر باشد",
    validationCat: "انتخاب دسته‌بندی الزامی است", validationPriority: "انتخاب اولویت الزامی است",
    validationMessage: "متن پیام الزامی است", technical_issue: "مشکل فنی", bug_report: "گزارش باگ",
    feature_request: "درخواست ویژگی", system_error: "خطای سیستم", user_access: "دسترسی کاربر",
    performance_issue: "مشکل عملکرد", security_concern: "نگرانی امنیتی", data_issue: "مشکل داده",
    integration_problem: "مشکل یکپارچه‌سازی", other: "سایر", low: "کم", normal: "معمولی", high: "زیاد",
     urgent: "فوری", critical: "بحرانی", unknownStatus: "وضعیت نامشخص", unknownPriority: "اولویت تعیین‌نشده",
     unknownCategory: "دسته‌بندی تعیین‌نشده", unknownSender: "فرستنده نامشخص", responsesError: "بارگذاری پاسخ‌ها ممکن نیست.",
     createFailure: "ایجاد تیکت ممکن نبود.", statusFailure: "به‌روزرسانی وضعیت ممکن نبود.", responseFailure: "افزودن پاسخ ممکن نبود.",
  },
  ar: {
    title: "نظام التذاكر", pageDescription: "إدارة تذاكر الدعم الفني والتواصل مع المسؤولين",
    current: "المستخدم الحالي", admin: "المسؤول", customer: "العميل", new: "تذكرة جديدة",
    create: "إنشاء تذكرة دعم جديدة", titleLabel: "العنوان", titlePh: "اكتب وصفاً موجزاً للمشكلة...",
    category: "الفئة", selectCategory: "اختر الفئة", priority: "الأولوية", selectPriority: "اختر الأولوية",
    department: "القسم المعني", departmentPh: "اسم القسم أو الوحدة...", details: "التفاصيل",
    description: "الوصف", descriptionPh: "اذكر المشكلة وخطوات تكرارها والمعلومات ذات الصلة...",
    creating: "جارٍ الإنشاء…", createTicket: "إنشاء التذكرة", cancel: "إلغاء", success: "نجاح", error: "خطأ",
    created: "تم إنشاء تذكرة الدعم بنجاح", createError: "تعذر إنشاء التذكرة", statusUpdated: "تم تحديث حالة التذكرة",
    responseAdded: "تمت إضافة الرد", adminRequired: "يجب تسجيل الدخول كمسؤول لتغيير الحالة",
    open: "مفتوحة", in_progress: "قيد المعالجة", resolved: "تم الحل", closed: "مغلقة", on_hold: "معلّقة",
    total: "كل التذاكر", my: "تذاكري", all: "كل التذاكر", urgentBadge: "عاجل", start: "بدء", resolve: "حل",
    adminSuffix: "(مسؤول)", needAdmin: "يلزم تسجيل دخول المسؤول", search: "البحث في التذاكر…",
    responses: "الردود والتعليقات", addResponse: "إضافة رد", adminResponse: "رد المسؤول", responsePh: "اكتب ردك...",
    internal: "رد داخلي (يظهر للمسؤولين فقط)", send: "إرسال الرد", loading: "جارٍ تحميل التذاكر…",
    loadError: "تعذر تحميل التذاكر.", retry: "إعادة المحاولة", empty: "لم يتم العثور على تذاكر",
    emptyHint: "ستظهر هنا التذاكر المطابقة للعرض الحالي.", noResponses: "لا توجد ردود بعد.",
    senderAdmin: "المسؤول", senderCustomer: "مدير الموقع", internalBadge: "داخلي", ticketDetails: "تفاصيل التذكرة",
     submittedBy: "مقدم الطلب", date: "التاريخ", departmentLabel: "القسم", tableCaption: "تذاكر الدعم",
     statusFilterPlaceholder: "تصفية حسب الحالة", rowNumber: "الرقم", ticketNumber: "رقم التذكرة",
     submitter: "مقدم الطلب", actions: "الإجراءات", notProvided: "غير متوفر", validationTitle: "العنوان مطلوب",
    validationDesc: "يجب ألا يقل الوصف عن 10 أحرف", validationCat: "الفئة مطلوبة",
    validationPriority: "الأولوية مطلوبة", validationMessage: "نص الرسالة مطلوب", technical_issue: "مشكلة تقنية",
    bug_report: "تقرير خطأ", feature_request: "طلب ميزة", system_error: "خطأ في النظام", user_access: "صلاحية المستخدم",
    performance_issue: "مشكلة أداء", security_concern: "مخاوف أمنية", data_issue: "مشكلة بيانات",
    integration_problem: "مشكلة تكامل", other: "أخرى", low: "منخفضة", normal: "عادية", high: "مرتفعة",
     urgent: "عاجلة", critical: "حرجة", unknownStatus: "حالة غير معروفة", unknownPriority: "أولوية غير محددة",
     unknownCategory: "فئة غير محددة", unknownSender: "مرسل غير معروف", responsesError: "تعذر تحميل الردود.",
     createFailure: "تعذر إنشاء التذكرة.", statusFailure: "تعذر تحديث حالة التذكرة.", responseFailure: "تعذر إضافة الرد.",
  },
  tr: {
    title: "Talep sistemi", pageDescription: "Teknik destek taleplerini yönetin ve yöneticilerle iletişim kurun",
    current: "Mevcut kullanıcı", admin: "Yönetici", customer: "Müşteri", new: "Yeni talep",
    create: "Yeni destek talebi oluştur", titleLabel: "Başlık", titlePh: "Sorunu kısaca açıklayın...",
    category: "Kategori", selectCategory: "Kategori seçin", priority: "Öncelik", selectPriority: "Öncelik seçin",
    department: "İlgili departman", departmentPh: "Departman veya modül adı...", details: "Ayrıntılar",
    description: "Açıklama", descriptionPh: "Sorunu, tekrarlama adımlarını ve ilgili bilgileri yazın...",
    creating: "Oluşturuluyor…", createTicket: "Talep oluştur", cancel: "İptal", success: "Başarılı", error: "Hata",
    created: "Destek talebi başarıyla oluşturuldu", createError: "Talep oluşturulamadı",
    statusUpdated: "Talep durumu güncellendi", responseAdded: "Yanıt eklendi",
    adminRequired: "Durumu değiştirmek için yönetici olarak giriş yapmalısınız",
    open: "Açık", in_progress: "İşlemde", resolved: "Çözüldü", closed: "Kapalı", on_hold: "Beklemede",
    total: "Tüm talepler", my: "Taleplerim", all: "Tüm talepler", urgentBadge: "Acil", start: "Başlat", resolve: "Çöz",
    adminSuffix: "(yönetici)", needAdmin: "Yönetici girişi gerekli", search: "Taleplerde ara…",
    responses: "Yanıtlar ve yorumlar", addResponse: "Yanıt ekle", adminResponse: "Yönetici yanıtı",
    responsePh: "Yanıtınızı yazın...", internal: "Dahili yanıt (yalnızca yöneticiler görür)",
    send: "Yanıt gönder", loading: "Talepler yükleniyor…", loadError: "Talepler yüklenemedi.",
    retry: "Tekrar dene", empty: "Talep bulunamadı", emptyHint: "Geçerli görünüme uyan talepler burada görünür.",
    noResponses: "Henüz yanıt yok.", senderAdmin: "Yönetici", senderCustomer: "Site yöneticisi",
    internalBadge: "Dahili", ticketDetails: "Talep ayrıntıları", submittedBy: "Gönderen", date: "Tarih",
     departmentLabel: "Departman", tableCaption: "Destek talepleri", statusFilterPlaceholder: "Duruma göre filtrele",
     rowNumber: "Sıra", ticketNumber: "Talep numarası", submitter: "Gönderen", actions: "İşlemler",
     notProvided: "Belirtilmemiş", validationTitle: "Başlık gerekli", validationDesc: "Açıklama en az 10 karakter olmalı",
    validationCat: "Kategori gerekli", validationPriority: "Öncelik gerekli", validationMessage: "Mesaj gerekli",
    technical_issue: "Teknik sorun", bug_report: "Hata bildirimi", feature_request: "Özellik isteği",
    system_error: "Sistem hatası", user_access: "Kullanıcı erişimi", performance_issue: "Performans sorunu",
    security_concern: "Güvenlik endişesi", data_issue: "Veri sorunu", integration_problem: "Entegrasyon sorunu",
     other: "Diğer", low: "Düşük", normal: "Normal", high: "Yüksek", urgent: "Acil", critical: "Kritik",
     unknownStatus: "Bilinmeyen durum", unknownPriority: "Belirtilmemiş öncelik", unknownCategory: "Belirtilmemiş kategori",
     unknownSender: "Bilinmeyen gönderen", responsesError: "Yanıtlar yüklenemedi.", createFailure: "Talep oluşturulamadı.",
     statusFailure: "Talep durumu güncellenemedi.", responseFailure: "Yanıt eklenemedi.",
  },
};

const categories = ["technical_issue", "bug_report", "feature_request", "system_error", "user_access", "performance_issue", "security_concern", "data_issue", "integration_problem", "other"] as const;
const priorities = ["low", "normal", "high", "urgent", "critical"] as const;
const statuses = ["open", "in_progress", "resolved", "closed", "on_hold"] as const;
type Category = typeof categories[number];
type Priority = typeof priorities[number];
type Status = typeof statuses[number];
type SenderType = "admin" | "customer";
type CatalogKey = keyof typeof catalog.en;
const categoryKeys: Record<Category, CatalogKey> = {
  technical_issue: "technical_issue", bug_report: "bug_report", feature_request: "feature_request",
  system_error: "system_error", user_access: "user_access", performance_issue: "performance_issue",
  security_concern: "security_concern", data_issue: "data_issue", integration_problem: "integration_problem", other: "other",
};
const priorityKeys: Record<Priority, CatalogKey> = {
  low: "low", normal: "normal", high: "high", urgent: "urgent", critical: "critical",
};
const statusKeys: Record<Status, CatalogKey> = {
  open: "open", in_progress: "in_progress", resolved: "resolved", closed: "closed", on_hold: "on_hold",
};
const senderKeys: Record<SenderType, CatalogKey> = { admin: "senderAdmin", customer: "senderCustomer" };
const categoryIcon = (value: string) => value === "technical_issue" ? <AlertTriangle className="h-4 w-4" /> : value === "bug_report" ? <XCircle className="h-4 w-4" /> : value === "feature_request" ? <Plus className="h-4 w-4" /> : value === "user_access" ? <UserCheck className="h-4 w-4" /> : value === "system_error" ? <AlertCircle className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
const priorityClass = (value: string) => ({ critical: "bg-red-500 text-white", urgent: "bg-orange-500 text-white", high: "bg-yellow-500 text-black", normal: "bg-blue-500 text-white", low: "bg-gray-500 text-white" } satisfies Record<Priority, string>)[value as Priority] || "bg-gray-500 text-white";
const statusClass = (value: string) => ({ open: "bg-green-500 text-white", in_progress: "bg-blue-500 text-white", resolved: "bg-purple-500 text-white", closed: "bg-gray-500 text-white", on_hold: "bg-yellow-500 text-black" } satisfies Record<Status, string>)[value as Status] || "bg-gray-500 text-white";
const locale = (language: Language) => ({ en: "en-US", fa: "fa-IR", ar: "ar-IQ", tr: "tr-TR" }[language]);
const formatNumber = (value: unknown, dateLocale: string) => {
  const stringValue = String(value ?? "");
  return /^\d+$/.test(stringValue) ? Number(stringValue).toLocaleString(dateLocale) : stringValue;
};
const text = (c: Catalog, key: CatalogKey) => c[key];
const categoryLabel = (c: Catalog, value: string) => value in categoryKeys ? text(c, categoryKeys[value as Category]) : c.unknownCategory;
const statusLabel = (c: Catalog, value: string) => value in statusKeys ? text(c, statusKeys[value as Status]) : c.unknownStatus;
const priorityLabel = (c: Catalog, value: string) => value in priorityKeys ? text(c, priorityKeys[value as Priority]) : c.unknownPriority;
const senderLabel = (c: Catalog, value: string) => value in senderKeys ? text(c, senderKeys[value as SenderType]) : c.unknownSender;
const schema = (c: Catalog) => z.object({
  title: z.string().min(1, c.validationTitle), description: z.string().min(10, c.validationDesc),
  category: z.string().min(1, c.validationCat), priority: z.string().min(1, c.validationPriority), department: z.string().optional(),
});
const responseSchema = (c: Catalog) => z.object({
  message: z.string().min(1, c.validationMessage), isInternal: z.boolean().default(false),
});
type CreateTicketData = z.infer<ReturnType<typeof schema>>;
type ResponseData = z.infer<ReturnType<typeof responseSchema>>;

export default function TicketingSystemFixed() {
  const { language, direction } = useLanguage();
  const lang = (language as Language) || "en";
  const c = catalog[lang];
  const dateLocale = locale(lang);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("my-tickets");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [search, setSearch] = useState("");

  const myTickets = useQuery({ queryKey: ["/api/tickets/my-tickets"] });
  const allTickets = useQuery({ queryKey: ["/api/tickets"] });
  const ticketStats = useQuery({ queryKey: ["/api/tickets/stats/overview"] });
  const userStats = useQuery({ queryKey: ["/api/tickets/stats/user"] });
  const responses = useQuery({
    queryKey: ["/api/tickets", selectedTicket?.id, "responses"],
    queryFn: async () => {
      if (!selectedTicket) return null;
      const response = await fetch(`/api/tickets/${selectedTicket.id}/responses`, { credentials: "include" });
      if (!response.ok) throw new Error("responses");
      return response.json();
    },
    enabled: Boolean(selectedTicket),
  });
  const customer = useQuery({ queryKey: ["/api/customers/me"], retry: false });
  const admin = useQuery({ queryKey: ["/api/admin/me"], retry: false });
  const adminData = admin.data as any;
  const customerData = customer.data as any;
  const isAdmin = Boolean(adminData?.user) || Boolean(customerData?.customer?.email?.includes("admin"));
  const currentUser = adminData?.user ? { name: adminData.user.username || c.admin, type: "admin" } : customerData?.customer ? { name: `${customerData.customer.firstName} ${customerData.customer.lastName}`.trim() || c.customer, type: "customer" } : null;
  const createForm = useForm<CreateTicketData>({ resolver: zodResolver(schema(c)), defaultValues: { title: "", description: "", category: "", priority: "normal", department: "" } });
  const responseForm = useForm<ResponseData>({ resolver: zodResolver(responseSchema(c)), defaultValues: { message: "", isInternal: false } });
  const createMutation = useMutation({
    mutationFn: (data: CreateTicketData) => apiRequest("/api/tickets", { method: "POST", body: data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tickets"] }); queryClient.invalidateQueries({ queryKey: ["/api/tickets/my-tickets"] }); void Promise.all([ticketStats.refetch(), userStats.refetch()]); setCreateOpen(false); createForm.reset(); toast({ title: c.success, description: c.created }); },
    onError: () => toast({ title: c.error, description: c.createFailure, variant: "destructive" }),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => apiRequest(`/api/tickets/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tickets"] }); queryClient.invalidateQueries({ queryKey: ["/api/tickets/my-tickets"] }); void Promise.all([ticketStats.refetch(), userStats.refetch()]); toast({ title: c.success, description: c.statusUpdated }); },
    onError: () => toast({ title: c.error, description: c.statusFailure, variant: "destructive" }),
  });
  const responseMutation = useMutation({
    mutationFn: ({ id, message, isInternal }: { id: number; message: string; isInternal: boolean }) => apiRequest(`/api/tickets/${id}/responses`, { method: "POST", body: { message, isInternal } }),
    onSuccess: () => { if (selectedTicket) queryClient.invalidateQueries({ queryKey: ["/api/tickets", selectedTicket.id, "responses"] }); void Promise.all([ticketStats.refetch(), userStats.refetch()]); responseForm.reset(); toast({ title: c.success, description: c.responseAdded }); },
    onError: () => toast({ title: c.error, description: c.responseFailure, variant: "destructive" }),
  });
  const filter = (items: any[] | undefined) => (items || []).filter((ticket) => (!filterStatus || filterStatus === "all" || ticket.status === filterStatus) && (!filterPriority || filterPriority === "all" || ticket.priority === filterPriority) && (!search || `${ticket.title} ${ticket.ticketNumber}`.toLowerCase().includes(search.toLowerCase())));
  const stats = (ticketStats.data as any)?.data || (userStats.data as any)?.data || {};
  const selectTicket = (ticket: any) => { setSelectedTicket(ticket); setDetailOpen(true); };
  const changeStatus = (id: number, status: string) => { if (!isAdmin) { toast({ title: c.error, description: c.adminRequired, variant: "destructive" }); return; } statusMutation.mutate({ id, status }); };

  return (
    <main className="container mx-auto space-y-6 p-6" lang={dateLocale} dir={direction}>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold"><Ticket className="h-8 w-8 text-blue-600" />{c.title}</h1>
          <p className="mt-1 text-muted-foreground">{c.pageDescription}</p>
          {currentUser && <p className="mt-2 text-sm text-muted-foreground">{c.current}: <span className="font-medium text-blue-600">{currentUser.name} ({currentUser.type === "admin" ? c.admin : c.customer})</span></p>}
        </div>
      <CreateTicketDialog open={createOpen} setOpen={setCreateOpen} form={createForm} c={c} lang={dateLocale} direction={direction} pending={createMutation.isPending} onSubmit={(data: CreateTicketData) => createMutation.mutate(data)} />
      </header>
      <Stats stats={stats} c={c} dateLocale={dateLocale} />
      <div className="flex flex-wrap gap-2">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={c.search} aria-label={c.search} className="max-w-xs" />
       <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-44"><SelectValue placeholder={c.statusFilterPlaceholder} /></SelectTrigger><SelectContent><SelectItem value="all">{c.all}</SelectItem>{statuses.map((value) => <SelectItem key={value} value={value}>{statusLabel(c, value)}</SelectItem>)}</SelectContent></Select>
      <Select value={filterPriority} onValueChange={setFilterPriority}><SelectTrigger className="w-44"><SelectValue placeholder={c.priority} /></SelectTrigger><SelectContent><SelectItem value="all">{c.all}</SelectItem>{priorities.map((value) => <SelectItem key={value} value={value}>{priorityLabel(c, value)}</SelectItem>)}</SelectContent></Select>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="my-tickets">{c.my}</TabsTrigger><TabsTrigger value="all-tickets">{c.all}</TabsTrigger></TabsList>
        <TabsContent value="my-tickets"><TicketList query={myTickets} tickets={filter((myTickets.data as any)?.data)} c={c} dateLocale={dateLocale} isAdmin={isAdmin} onSelect={selectTicket} onStatus={changeStatus} /></TabsContent>
        <TabsContent value="all-tickets"><TicketList query={allTickets} tickets={filter((allTickets.data as any)?.data)} c={c} dateLocale={dateLocale} isAdmin={isAdmin} onSelect={selectTicket} onStatus={changeStatus} /></TabsContent>
      </Tabs>
      {selectedTicket && <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden" lang={dateLocale} dir={direction}><DialogHeader><DialogTitle>{c.ticketDetails} #{formatNumber(selectedTicket.ticketNumber, dateLocale)}</DialogTitle></DialogHeader><div className="flex-1 overflow-y-auto"><TicketDetail ticket={selectedTicket} responses={(responses.data as any)?.data || []} loading={responses.isLoading} error={responses.isError} retry={responses.refetch} c={c} dateLocale={dateLocale} isAdmin={isAdmin} form={responseForm} pending={responseMutation.isPending} onSubmit={(data: ResponseData) => responseMutation.mutate({ id: selectedTicket.id, ...data })} /></div></DialogContent></Dialog>}
    </main>
  );
}

function CreateTicketDialog({ open, setOpen, form, c, lang, direction, pending, onSubmit }: any) {
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button className="flex items-center gap-2" aria-label={c.new}><Plus className="h-4 w-4" />{c.new}</Button></DialogTrigger><DialogContent className="max-w-md" lang={lang} dir={direction}><DialogHeader><DialogTitle>{c.create}</DialogTitle></DialogHeader><Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4"><Field form={form} name="title" label={`${c.titleLabel} *`} placeholder={c.titlePh} /><Field form={form} name="category" label={`${c.category} *`} placeholder={c.selectCategory} options={categories.map((value) => ({ value, label: categoryLabel(c, value) }))} /><Field form={form} name="priority" label={`${c.priority} *`} placeholder={c.selectPriority} options={priorities.map((value) => ({ value, label: priorityLabel(c, value) }))} /><Field form={form} name="department" label={c.department} placeholder={c.departmentPh} /><Field form={form} name="description" label={`${c.description} *`} placeholder={c.descriptionPh} textarea /><div className="flex gap-2"><Button type="submit" disabled={pending} className="flex-1">{pending ? c.creating : c.createTicket}</Button><Button type="button" variant="outline" onClick={() => setOpen(false)}>{c.cancel}</Button></div></form></Form></DialogContent></Dialog>;
}

function Field({ form, name, label, placeholder, options, textarea }: any) {
  return <FormField control={form.control} name={name} render={({ field }: any) => <FormItem><FormLabel>{label}</FormLabel><FormControl>{options ? <Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{options.map((option: any) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select> : textarea ? <Textarea {...field} placeholder={placeholder} rows={4} /> : <Input {...field} placeholder={placeholder} />}</FormControl><FormMessage /></FormItem>} />;
}

function Stats({ stats, c, dateLocale }: { stats: any; c: Catalog; dateLocale: string }) {
  const cards = [[AlertCircle, c.open, stats.openTickets, "text-orange-600"], [CheckCircle, c.resolved, stats.resolvedTickets, "text-green-600"], [Clock, c.in_progress, stats.inProgressTickets, "text-yellow-600"], [BarChart3, c.total, stats.totalTickets, "text-purple-600"], [XCircle, c.closed, stats.closedTickets, "text-red-600"]] as const;
  return <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">{cards.map(([Icon, label, value, color]) => <Card key={label}><CardContent className="flex items-center gap-3 p-4"><Icon className={`h-5 w-5 ${color}`} /><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{Number(value || 0).toLocaleString(dateLocale)}</p></div></CardContent></Card>)}</section>;
}

function TicketList({ query, tickets, c, dateLocale, isAdmin, onSelect, onStatus }: any) {
  if (query.isLoading) return <div className="rounded-lg border p-8 text-center text-muted-foreground" role="status">{c.loading}</div>;
  if (query.isError) return <div className="rounded-lg border border-destructive/40 p-8 text-center"><p className="text-destructive">{c.loadError}</p><Button variant="outline" className="mt-3" onClick={() => query.refetch()}>{c.retry}</Button></div>;
  if (!tickets.length) return <div className="rounded-lg border border-dashed p-10 text-center"><FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">{c.empty}</p><p className="mt-1 text-sm text-muted-foreground">{c.emptyHint}</p></div>;
  return <div className="overflow-x-auto rounded-lg border bg-white">
    <table className="min-w-[1080px] w-full border-collapse text-sm">
      <caption className="sr-only">{c.tableCaption}</caption>
      <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700">
        <tr className="border-b border-slate-200">
          {[c.rowNumber, c.ticketNumber, c.submitter, c.category, c.departmentLabel, c.date, c.priority, c.status, c.actions].map((heading: string) => <th key={heading} scope="col" className="border-e border-slate-200 px-3 py-2.5 text-start align-middle font-semibold last:border-e-0">{heading}</th>)}
        </tr>
      </thead>
      <tbody>
        {tickets.map((ticket: any, index: number) => {
          const submitter = ticket.submitterName || c.notProvided;
          const department = ticket.department || c.notProvided;
          const ticketNumber = ticket.ticketNumber ? formatNumber(ticket.ticketNumber, dateLocale) : c.notProvided;
          const date = ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString(dateLocale) : c.notProvided;
          return <tr key={ticket.id} className="border-b border-slate-200 odd:bg-slate-50/70 hover:bg-slate-100/80">
            <td className="border-e border-slate-200 px-3 py-2.5 text-start align-top tabular-nums">{formatNumber(index + 1, dateLocale)}</td>
            <td className="max-w-[250px] border-e border-slate-200 px-3 py-2.5 text-start align-top">
              <div className="truncate font-semibold" title={ticket.title || undefined}>{ticketNumber}</div>
              {ticket.title && <div className="line-clamp-1 truncate text-xs text-muted-foreground" title={ticket.description || ticket.title}>{ticket.title}</div>}
            </td>
            <td className="max-w-[180px] border-e border-slate-200 px-3 py-2.5 text-start align-top">
              <div className="truncate" title={submitter === c.notProvided ? undefined : submitter}>{submitter}</div>
              {ticket.description && <div className="line-clamp-1 truncate text-xs text-muted-foreground" title={ticket.description}>{ticket.description}</div>}
            </td>
            <td className="border-e border-slate-200 px-3 py-2.5 text-start align-top"><span className="flex min-w-[125px] items-center gap-1.5">{categoryIcon(ticket.category)}{ticket.category ? categoryLabel(c, ticket.category) : c.notProvided}</span></td>
            <td className="border-e border-slate-200 px-3 py-2.5 text-start align-top">{department}</td>
            <td className="border-e border-slate-200 px-3 py-2.5 text-start align-top whitespace-nowrap">{date}</td>
            <td className="border-e border-slate-200 px-3 py-2.5 text-start align-top"><Badge className={priorityClass(ticket.priority)}>{priorityLabel(c, ticket.priority)}</Badge></td>
            <td className="border-e border-slate-200 px-3 py-2.5 text-start align-top"><div className="flex flex-wrap gap-1.5"><Badge className={statusClass(ticket.status)}>{statusLabel(c, ticket.status)}</Badge>{["urgent", "critical"].includes(ticket.priority) && <Badge variant="destructive">{c.urgentBadge}</Badge>}</div></td>
            <td className="px-3 py-2.5 text-start align-top">
              <div className="flex min-w-[190px] flex-wrap gap-1.5">
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1 px-2" onClick={(event) => { event.stopPropagation(); onSelect(ticket); }} title={c.details}><Eye className="h-3.5 w-3.5" />{c.details}</Button>
                {ticket.status === "open" && <Button type="button" variant="outline" size="sm" className="h-8 gap-1 px-2" disabled={!isAdmin} onClick={(event) => { event.stopPropagation(); onStatus(ticket.id, "in_progress"); }} title={!isAdmin ? c.needAdmin : undefined}><Clock className="h-3.5 w-3.5" />{c.start}</Button>}
                {ticket.status === "in_progress" && <Button type="button" variant="outline" size="sm" className="h-8 gap-1 px-2" disabled={!isAdmin} onClick={(event) => { event.stopPropagation(); onStatus(ticket.id, "resolved"); }} title={!isAdmin ? c.needAdmin : undefined}><CheckCircle className="h-3.5 w-3.5" />{c.resolve}</Button>}
              </div>
            </td>
          </tr>;
        })}
      </tbody>
    </table>
  </div>;
}

function TicketDetail({ ticket, responses, loading, error, retry, c, dateLocale, isAdmin, form, pending, onSubmit }: any) {
  return <div className="space-y-4"><div className="rounded-lg bg-muted p-4"><div className="mb-2 flex gap-2"><Badge className={statusClass(ticket.status)}>{statusLabel(c, ticket.status)}</Badge><Badge className={priorityClass(ticket.priority)}>{priorityLabel(c, ticket.priority)}</Badge></div><h3 className="mb-2 text-lg font-semibold">{ticket.title}</h3><p className="text-muted-foreground">{ticket.description}</p><div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-1"><User className="inline h-4 w-4" />{c.submittedBy}: {ticket.submitterName}</span><span className="flex items-center gap-1"><Calendar className="inline h-4 w-4" />{c.date}: {new Date(ticket.createdAt).toLocaleDateString(dateLocale)}</span>{ticket.department && <span className="flex items-center gap-1"><Tag className="inline h-4 w-4" />{c.departmentLabel}: {ticket.department}</span>}</div></div>{loading ? <div className="rounded-lg border p-6 text-center text-muted-foreground">{c.loading}</div> : error ? <div className="rounded-lg border border-destructive/40 p-6 text-center"><p className="text-destructive">{c.responsesError}</p><Button variant="outline" className="mt-3" onClick={() => retry()}>{c.retry}</Button></div> : <ResponseList responses={responses} c={c} dateLocale={dateLocale} />}{isAdmin && <ResponseForm form={form} c={c} pending={pending} onSubmit={onSubmit} />}</div>;
}

function ResponseList({ responses, c, dateLocale }: any) {
  return <div className="space-y-3"><h4 className="text-sm font-medium text-muted-foreground">{c.responses} ({responses.length.toLocaleString(dateLocale)}):</h4>{responses.length ? <div className="max-h-[300px] space-y-3 overflow-y-auto rounded-lg border p-3">{responses.map((response: any) => <div key={response.id} className="rounded-lg border p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Badge variant={response.senderType === "admin" ? "default" : "secondary"}>{response.senderName}</Badge><span className="text-xs text-muted-foreground">{senderLabel(c, response.senderType)}</span>{response.isInternal && <Badge variant="destructive">{c.internalBadge}</Badge>}</div><span className="text-xs text-muted-foreground">{new Date(response.createdAt).toLocaleDateString(dateLocale)} - {new Date(response.createdAt).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}</span></div><p className="text-sm leading-relaxed">{response.message}</p></div>)}</div> : <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">{c.noResponses}</p>}</div>;
}

function ResponseForm({ form, c, pending, onSubmit }: any) {
  return <div className="rounded-lg border-t bg-muted/20 p-4"><h4 className="mb-3 text-sm font-medium text-muted-foreground">{c.addResponse}</h4><Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4"><FormField control={form.control} name="message" render={({ field }: any) => <FormItem><FormLabel>{c.adminResponse}</FormLabel><FormControl><Textarea {...field} placeholder={c.responsePh} rows={3} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="isInternal" render={({ field }: any) => <FormItem className="flex items-center gap-3 space-y-0"><FormControl><input type="checkbox" checked={field.value} onChange={field.onChange} aria-label={c.internal} /></FormControl><FormLabel className="text-sm font-normal">{c.internal}</FormLabel></FormItem>} /><Button type="submit" disabled={pending} className="flex w-full items-center gap-2"><Send className="h-4 w-4" />{pending ? c.creating : c.send}</Button></form></Form></div>;
}