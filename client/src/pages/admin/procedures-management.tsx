import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  FileText, 
  Shield, 
  BookOpen,
  CheckCircle,
  Clock,
  AlertTriangle,
  Star,
  Search,
  Filter,
  Download,
  Upload,
  Users,
  Calendar,
  Tag,
  Layers,
  Settings,
  Award,
  TrendingUp,
  FilePlus,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

// Types for procedures management
interface ProcedureCategory {
  id: number;
  name: string;
  description: string;
  colorCode: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Procedure {
  id: number;
  title: string;
  categoryId: number;
  description: string;
  content: string;
  version: string;
  status: 'draft' | 'review' | 'approved' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'critical';
  language: string;
  authorId: number;
  approverId?: number;
  approvedAt?: string;
  effectiveDate?: string;
  reviewDate?: string;
  tags: string[];
  accessLevel: 'public' | 'internal' | 'restricted' | 'confidential';
  viewCount: number;
  lastViewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProcedureStep {
  id: number;
  procedureId: number;
  stepNumber: number;
  title: string;
  description: string;
  instructions: string;
  estimatedTime?: number;
  requiredTools: string[];
  safetyNotes?: string;
  qualityCheckpoints: string[];
  isCritical: boolean;
  createdAt: string;
}

interface SafetyProtocol {
  id: number;
  title: string;
  category: string;
  description: string;
  severityLevel: 'low' | 'medium' | 'high' | 'critical';
  requiredPpe: string[];
  procedures: string;
  firstAidSteps?: string;
  evacuationPlan?: string;
  isMandatory: boolean;
  complianceNotes?: string;
  lastUpdatedBy?: number;
  createdAt: string;
  updatedAt: string;
}

interface ProcedureDocument {
  id: number;
  procedureId: number;
  title: string;
  description?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  uploadDate: string;
  uploadedBy: number;
  uploadedByName?: string;
  version: string;
  isActive: boolean;
  downloadCount: number;
  lastDownloadedAt?: string;
  tags: string[];
}

// Form schemas
const procedureCategorySchema = z.object({
  name: z.string().min(3, "نام دسته‌بندی باید حداقل 3 کاراکتر باشد"),
  description: z.string().optional(),
  colorCode: z.string().default("#3b82f6"),
  displayOrder: z.number().min(0).default(0),
});

const procedureSchema = z.object({
  title: z.string().min(5, "عنوان باید حداقل 5 کاراکتر باشد"),
  categoryId: z.string().min(1, "دسته‌بندی را انتخاب کنید"),
  description: z.string().optional(),
  content: z.string().min(10, "محتوای دستورالعمل را وارد کنید"),
  priority: z.enum(['low', 'normal', 'high', 'critical']),
  effectiveDate: z.string().optional(),
  reviewDate: z.string().optional(),
  tags: z.string().optional(),
  accessLevel: z.enum(['public', 'internal', 'restricted', 'confidential']),
});

const safetyProtocolSchema = z.object({
  title: z.string().min(5, "عنوان را وارد کنید"),
  category: z.string().min(3, "دسته‌بندی را وارد کنید"),
  description: z.string().optional(),
  severityLevel: z.enum(['low', 'medium', 'high', 'critical']),
  procedures: z.string().min(10, "روش‌های ایمنی را شرح دهید"),
  firstAidSteps: z.string().optional(),
  evacuationPlan: z.string().optional(),
  requiredPpe: z.string().optional(),
});

type ProcedureCategoryForm = z.infer<typeof procedureCategorySchema>;
type ProcedureForm = z.infer<typeof procedureSchema>;
type SafetyProtocolForm = z.infer<typeof safetyProtocolSchema>;

const procedureTranslations = {
  en: {
    back: "Back to dashboard", title: "Procedures & safety management", subtitle: "Review, publish and maintain controlled organizational procedures.",
    overview: "Overview", procedures: "Procedures", categories: "Categories", safety: "Safety protocols", analytics: "Reports",
    total: "Total procedures", approved: "Approved", pending: "Pending review", needsApproval: "Needs approval",
    protocols: "Safety protocols", critical: "Critical", categoryCount: "Categories", active: "Active", recent: "Recent procedures",
    version: "Version", search: "Search procedures...", chooseCategory: "Choose category", allCategories: "All categories",
    chooseStatus: "Choose status", allStatuses: "All statuses", draft: "Draft", review: "In review", archived: "Archived",
    addProcedure: "Add procedure", addCategory: "Add category", addProtocol: "Add safety protocol", loading: "Loading...",
    titleLabel: "Title", category: "Category", priority: "Priority", status: "Status", documents: "Documents", views: "Views",
    created: "Created", actions: "Actions", unknown: "Unknown", uploadedDocuments: "Uploaded documents", viewDocuments: "View uploaded documents",
    export: "Export procedure", edit: "Edit", delete: "Delete", row: "Row", description: "Description", displayOrder: "Display order",
    yes: "Yes", no: "No", mandatory: "Mandatory", severity: "Severity", ppe: "Required PPE", noDocuments: "No documents have been uploaded.",
    close: "Close", cancel: "Cancel", attachments: "Document attachments", upload: "Upload documents", selectedFiles: "Selected files",
    allowed: "Allowed formats: PDF, DOC, DOCX, TXT, JPG, PNG", save: "Save", create: "Create", update: "Update",
    usage: "Procedure usage", totalViews: "Total views", averageViews: "Average views", mostViewed: "Most viewed", approvalStatus: "Approval status",
    safetyInstructions: "Safety instructions", firstAid: "First-aid steps", evacuation: "Evacuation plan", severityLow: "Low", severityMedium: "Medium",
    severityHigh: "High", severityCritical: "Critical", access: "Access level", effectiveDate: "Effective date", reviewDate: "Review date",
    tags: "Tags (comma separated)", content: "Procedure content", summary: "Summary", requiredPpeHint: "Goggles, gloves, mask",
    categoryName: "Category name", color: "Color", protocolTitle: "Protocol title", protocolCategory: "Protocol category",
    success: "Success", error: "Error", saved: "Changes saved.", failed: "Unable to save changes.", documentDownloaded: "Document downloaded successfully",
    procedureTitle: "Procedure title", priorityNormal: "Normal", accessPublic: "Public", accessInternal: "Internal", accessRestricted: "Restricted", accessConfidential: "Confidential",
    tagsPlaceholder: "production, quality, safety", uploadAttachments: "Upload attached documents", createProcedure: "Create procedure", editProcedure: "Edit procedure", updateProcedure: "Update procedure",
  },
  fa: {
    back: "بازگشت به داشبورد", title: "مدیریت دستورالعمل‌ها و ایمنی", subtitle: "مرور، انتشار و نگهداری رویه‌های کنترل‌شده سازمانی.",
    overview: "نمای کلی", procedures: "دستورالعمل‌ها", categories: "دسته‌بندی‌ها", safety: "پروتکل‌های ایمنی", analytics: "گزارش‌ها",
    total: "کل دستورالعمل‌ها", approved: "تأیید شده", pending: "در انتظار بررسی", needsApproval: "نیاز به تأیید",
    protocols: "پروتکل‌های ایمنی", critical: "بحرانی", categoryCount: "دسته‌بندی‌ها", active: "فعال", recent: "آخرین دستورالعمل‌ها",
    version: "نسخه", search: "جستجو در دستورالعمل‌ها...", chooseCategory: "انتخاب دسته‌بندی", allCategories: "همه دسته‌ها",
    chooseStatus: "انتخاب وضعیت", allStatuses: "همه وضعیت‌ها", draft: "پیش‌نویس", review: "در بررسی", archived: "بایگانی",
    addProcedure: "افزودن دستورالعمل", addCategory: "افزودن دسته‌بندی", addProtocol: "افزودن پروتکل ایمنی", loading: "در حال بارگذاری...",
    titleLabel: "عنوان", category: "دسته‌بندی", priority: "اولویت", status: "وضعیت", documents: "اسناد", views: "بازدید",
    created: "تاریخ ایجاد", actions: "عملیات", unknown: "نامشخص", uploadedDocuments: "اسناد آپلودی", viewDocuments: "مشاهده اسناد آپلودی",
    export: "دانلود فایل دستورالعمل", edit: "ویرایش", delete: "حذف", row: "ردیف", description: "توضیحات", displayOrder: "ترتیب نمایش",
    yes: "بله", no: "خیر", mandatory: "الزامی", severity: "سطح شدت", ppe: "تجهیزات ایمنی", noDocuments: "هنوز سندی آپلود نشده است.",
    close: "بستن", cancel: "انصراف", attachments: "فایل‌های پیوست", upload: "آپلود اسناد", selectedFiles: "فایل‌های انتخاب‌شده",
    allowed: "فرمت‌های مجاز: PDF، DOC، DOCX، TXT، JPG، PNG", save: "ذخیره", create: "ایجاد", update: "به‌روزرسانی",
    usage: "آمار استفاده از دستورالعمل‌ها", totalViews: "مجموع بازدید", averageViews: "میانگین بازدید", mostViewed: "پربازدیدترین", approvalStatus: "وضعیت تأیید",
    safetyInstructions: "دستورالعمل‌های ایمنی", firstAid: "اقدامات کمک‌های اولیه", evacuation: "برنامه تخلیه", severityLow: "پایین", severityMedium: "متوسط",
    severityHigh: "بالا", severityCritical: "بحرانی", access: "سطح دسترسی", effectiveDate: "تاریخ اجرا", reviewDate: "تاریخ بازنگری",
    tags: "برچسب‌ها (با کاما جدا کنید)", content: "محتوای دستورالعمل", summary: "خلاصه توضیحات", requiredPpeHint: "عینک، دستکش، ماسک",
    categoryName: "نام دسته‌بندی", color: "رنگ", protocolTitle: "عنوان پروتکل", protocolCategory: "دسته‌بندی پروتکل",
    success: "موفقیت", error: "خطا", saved: "تغییرات ذخیره شد.", failed: "ذخیره تغییرات انجام نشد.", documentDownloaded: "سند با موفقیت دانلود شد",
    procedureTitle: "عنوان دستورالعمل", priorityNormal: "عادی", accessPublic: "عمومی", accessInternal: "داخلی", accessRestricted: "محدود", accessConfidential: "محرمانه",
    tagsPlaceholder: "تولید، کیفیت، ایمنی", uploadAttachments: "آپلود مدارک ضمیمه", createProcedure: "ایجاد دستورالعمل", editProcedure: "ویرایش دستورالعمل", updateProcedure: "به‌روزرسانی دستورالعمل",
  },
  ar: {
    back: "العودة إلى لوحة التحكم", title: "إدارة الإجراءات والسلامة", subtitle: "مراجعة الإجراءات المؤسسية المنضبطة ونشرها وصيانتها.",
    overview: "نظرة عامة", procedures: "الإجراءات", categories: "الفئات", safety: "بروتوكولات السلامة", analytics: "التقارير",
    total: "إجمالي الإجراءات", approved: "معتمد", pending: "قيد المراجعة", needsApproval: "يحتاج إلى اعتماد", protocols: "بروتوكولات السلامة",
    critical: "حرج", categoryCount: "الفئات", active: "نشط", recent: "أحدث الإجراءات", version: "الإصدار", search: "ابحث في الإجراءات...",
    chooseCategory: "اختر الفئة", allCategories: "كل الفئات", chooseStatus: "اختر الحالة", allStatuses: "كل الحالات", draft: "مسودة", review: "قيد المراجعة", archived: "مؤرشف",
    addProcedure: "إضافة إجراء", addCategory: "إضافة فئة", addProtocol: "إضافة بروتوكول سلامة", loading: "جار التحميل...",
    titleLabel: "العنوان", category: "الفئة", priority: "الأولوية", status: "الحالة", documents: "المستندات", views: "المشاهدات", created: "تاريخ الإنشاء", actions: "الإجراءات",
    unknown: "غير معروف", uploadedDocuments: "المستندات المرفوعة", viewDocuments: "عرض المستندات المرفوعة", export: "تصدير الإجراء", edit: "تعديل", delete: "حذف", row: "الصف",
    description: "الوصف", displayOrder: "ترتيب العرض", yes: "نعم", no: "لا", mandatory: "إلزامي", severity: "الخطورة", ppe: "معدات الوقاية المطلوبة", noDocuments: "لم يتم رفع مستندات.",
    close: "إغلاق", cancel: "إلغاء", attachments: "مرفقات المستندات", upload: "رفع المستندات", selectedFiles: "الملفات المحددة", allowed: "الصيغ المسموحة: PDF، DOC، DOCX، TXT، JPG، PNG",
    save: "حفظ", create: "إنشاء", update: "تحديث", usage: "استخدام الإجراءات", totalViews: "إجمالي المشاهدات", averageViews: "متوسط المشاهدات", mostViewed: "الأكثر مشاهدة", approvalStatus: "حالة الاعتماد",
    safetyInstructions: "تعليمات السلامة", firstAid: "إسعافات أولية", evacuation: "خطة الإخلاء", severityLow: "منخفض", severityMedium: "متوسط", severityHigh: "مرتفع", severityCritical: "حرج",
    access: "مستوى الوصول", effectiveDate: "تاريخ السريان", reviewDate: "تاريخ المراجعة", tags: "الوسوم (مفصولة بفواصل)", content: "محتوى الإجراء", summary: "الملخص", requiredPpeHint: "نظارات، قفازات، كمامة",
    categoryName: "اسم الفئة", color: "اللون", protocolTitle: "عنوان البروتوكول", protocolCategory: "فئة البروتوكول", success: "نجاح", error: "خطأ", saved: "تم حفظ التغييرات.", failed: "تعذر حفظ التغييرات.", documentDownloaded: "تم تنزيل المستند بنجاح",
    procedureTitle: "عنوان الإجراء", priorityNormal: "عادي", accessPublic: "عام", accessInternal: "داخلي", accessRestricted: "مقيّد", accessConfidential: "سري",
    tagsPlaceholder: "الإنتاج، الجودة، السلامة", uploadAttachments: "رفع المستندات المرفقة", createProcedure: "إنشاء الإجراء", editProcedure: "تعديل الإجراء", updateProcedure: "تحديث الإجراء",
  },
  tr: {
    back: "Kontrol paneline dön", title: "Prosedür ve güvenlik yönetimi", subtitle: "Kurumsal prosedürleri hızlıca inceleyin, yayınlayın ve güncel tutun.",
    overview: "Genel bakış", procedures: "Prosedürler", categories: "Kategoriler", safety: "Güvenlik protokolleri", analytics: "Raporlar", total: "Toplam prosedür", approved: "Onaylı", pending: "İnceleme bekliyor", needsApproval: "Onay gerekiyor",
    protocols: "Güvenlik protokolleri", critical: "Kritik", categoryCount: "Kategoriler", active: "Etkin", recent: "Son prosedürler", version: "Sürüm", search: "Prosedürlerde ara...", chooseCategory: "Kategori seç", allCategories: "Tüm kategoriler", chooseStatus: "Durum seç", allStatuses: "Tüm durumlar", draft: "Taslak", review: "İncelemede", archived: "Arşivlendi",
    addProcedure: "Prosedür ekle", addCategory: "Kategori ekle", addProtocol: "Güvenlik protokolü ekle", loading: "Yükleniyor...", titleLabel: "Başlık", category: "Kategori", priority: "Öncelik", status: "Durum", documents: "Belgeler", views: "Görüntülenme", created: "Oluşturulma", actions: "İşlemler", unknown: "Bilinmiyor", uploadedDocuments: "Yüklenen belgeler", viewDocuments: "Yüklenen belgeleri görüntüle", export: "Prosedürü dışa aktar", edit: "Düzenle", delete: "Sil", row: "Sıra", description: "Açıklama", displayOrder: "Görüntüleme sırası", yes: "Evet", no: "Hayır", mandatory: "Zorunlu", severity: "Önem", ppe: "Gerekli KKD", noDocuments: "Henüz belge yüklenmedi.", close: "Kapat", cancel: "İptal", attachments: "Belge ekleri", upload: "Belgeleri yükle", selectedFiles: "Seçilen dosyalar", allowed: "İzin verilen biçimler: PDF, DOC, DOCX, TXT, JPG, PNG", save: "Kaydet", create: "Oluştur", update: "Güncelle", usage: "Prosedür kullanımı", totalViews: "Toplam görüntülenme", averageViews: "Ortalama görüntülenme", mostViewed: "En çok görüntülenen", approvalStatus: "Onay durumu", safetyInstructions: "Güvenlik talimatları", firstAid: "İlk yardım adımları", evacuation: "Tahliye planı", severityLow: "Düşük", severityMedium: "Orta", severityHigh: "Yüksek", severityCritical: "Kritik", access: "Erişim düzeyi", effectiveDate: "Yürürlük tarihi", reviewDate: "İnceleme tarihi", tags: "Etiketler (virgülle ayırın)", content: "Prosedür içeriği", summary: "Özet", requiredPpeHint: "Gözlük, eldiven, maske", categoryName: "Kategori adı", color: "Renk", protocolTitle: "Protokol başlığı", protocolCategory: "Protokol kategorisi", success: "Başarılı", error: "Hata", saved: "Değişiklikler kaydedildi.", failed: "Değişiklikler kaydedilemedi.", documentDownloaded: "Belge başarıyla indirildi", procedureTitle: "Prosedür başlığı", priorityNormal: "Normal", accessPublic: "Herkese açık", accessInternal: "Dahili", accessRestricted: "Kısıtlı", accessConfidential: "Gizli", tagsPlaceholder: "üretim, kalite, güvenlik", uploadAttachments: "Ek belgeleri yükle", createProcedure: "Prosedür oluştur", editProcedure: "Prosedürü düzenle", updateProcedure: "Prosedürü güncelle",
  },
} as const;

export default function ProceduresManagement() {
  const { language, direction } = useLanguage();
  const { user } = useAuth();
  const canManageProcedures = user?.roleName === "super_admin";
  const t = procedureTranslations[language];
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("procedures");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'category' | 'procedure' | 'safety' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [selectedProcedureId, setSelectedProcedureId] = useState<number | null>(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [viewingProcedure, setViewingProcedure] = useState<Procedure | null>(null);

  // Form hooks
  const categoryForm = useForm<ProcedureCategoryForm>({
    resolver: zodResolver(procedureCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      colorCode: "#3b82f6",
      displayOrder: 0,
    },
  });

  const procedureForm = useForm<ProcedureForm>({
    resolver: zodResolver(procedureSchema),
    defaultValues: {
      title: "",
      categoryId: "",
      description: "",
      content: "",
      priority: "normal",
      effectiveDate: "",
      reviewDate: "",
      tags: "",
      accessLevel: "public",
    },
  });

  const safetyForm = useForm<SafetyProtocolForm>({
    resolver: zodResolver(safetyProtocolSchema),
    defaultValues: {
      title: "",
      category: "",
      description: "",
      severityLevel: "medium",
      procedures: "",
      firstAidSteps: "",
      evacuationPlan: "",
      requiredPpe: "",
    },
  });

  // Data fetching
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ProcedureCategory[]>({
    queryKey: ["/api/procedures/categories"],
  });

  const { data: procedures = [], isLoading: proceduresLoading } = useQuery<Procedure[]>({
    queryKey: ["/api/procedures"],
  });

  const { data: safetyProtocols = [], isLoading: safetyLoading } = useQuery<SafetyProtocol[]>({
    queryKey: ["/api/procedures/safety-protocols"],
  });

  // Documents query - handles both procedures and safety protocols
  const { data: documents = [], isLoading: documentsLoading } = useQuery<ProcedureDocument[]>({
    queryKey: [
      selectedTab === 'safety' 
        ? `/api/procedures/safety-protocols/${selectedProcedureId}/documents`
        : `/api/procedures/${selectedProcedureId}/documents`
    ],
    enabled: !!selectedProcedureId,
  });

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'medium':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const filteredProcedures = procedures.filter(procedure => {
    const matchesSearch = searchQuery === "" || 
      procedure.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      procedure.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      procedure.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || 
      procedure.categoryId.toString() === selectedCategory;
    
    const matchesStatus = selectedStatus === "all" || 
      procedure.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Export procedure handler
  const exportProcedure = async (procedureId: number) => {
    try {
      const response = await fetch(`/api/procedures/${procedureId}/export`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to export procedure');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `procedure-${procedureId}-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: t.success,
        description: "فایل دستورالعمل با موفقیت دانلود شد",
      });
    } catch (error) {
      console.error('Error exporting procedure:', error);
      toast({
        variant: "destructive",
        title: t.error,
        description: "مشکلی در دانلود فایل رخ داده است",
      });
    }
  };

  const downloadDocument = async (documentId: number, fileName: string) => {
    try {
      const downloadEndpoint = selectedTab === 'safety' 
        ? `/api/procedures/safety-protocols/documents/${documentId}/download`
        : `/api/procedures/documents/${documentId}/download`;
        
      const response = await fetch(downloadEndpoint, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: t.success,
        description: "Document downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        variant: "destructive",
        title: t.error,
        description: "Failed to download document",
      });
    }
  };

  const viewProcedureDocuments = (procedureId: number) => {
    setSelectedProcedureId(procedureId);
    setShowDocuments(true);
  };

  const deleteDocument = async (documentId: number, documentTitle: string) => {
    if (!confirm(`Are you sure you want to delete the document "${documentTitle}"?`)) {
      return;
    }

    try {
      const deleteEndpoint = selectedTab === 'safety' 
        ? `/api/procedures/safety-protocols/documents/${documentId}`
        : `/api/procedures/documents/${documentId}`;
      
      const response = await fetch(deleteEndpoint, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            variant: "destructive",
            title: t.error,
            description: t.noDocuments,
          });
        } else {
          toast({
            variant: "destructive",
            title: t.error,
            description: result.message || "Failed to delete document",
          });
        }
        
        // Refresh the list anyway in case the document was already deleted
        const documentApiEndpoint = selectedTab === 'safety' 
          ? `/api/procedures/safety-protocols/${selectedProcedureId}/documents`
          : `/api/procedures/${selectedProcedureId}/documents`;
        queryClient.invalidateQueries({ 
          queryKey: [documentApiEndpoint] 
        });
        return;
      }

      // Refresh documents list
      const documentApiEndpoint = selectedTab === 'safety' 
        ? `/api/procedures/safety-protocols/${selectedProcedureId}/documents`
        : `/api/procedures/${selectedProcedureId}/documents`;
      queryClient.invalidateQueries({ 
        queryKey: [documentApiEndpoint] 
      });

      toast({
        title: t.success,
        description: "Document deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        variant: "destructive",
        title: t.error,
        description: "Network error occurred while deleting document",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Dialog handlers
  const openCreateDialog = (type: 'category' | 'procedure' | 'safety') => {
    setDialogType(type);
    setEditingItem(null);
    setDocumentFiles([]);
    setDialogOpen(true);
  };

  const openEditDialog = (type: 'category' | 'procedure' | 'safety', item: any) => {
    setDialogType(type);
    setEditingItem(item);
    
    if (type === 'procedure') {
      procedureForm.reset({
        title: item.title,
        categoryId: item.categoryId?.toString() || "",
        description: item.description || "",
        content: item.content || "",
        priority: item.priority || "normal",
        effectiveDate: item.effectiveDate ? new Date(item.effectiveDate).toISOString().split('T')[0] : "",
        reviewDate: item.reviewDate ? new Date(item.reviewDate).toISOString().split('T')[0] : "",
        tags: Array.isArray(item.tags) ? item.tags.join(', ') : "",
        accessLevel: item.accessLevel || "public",
      });
    } else if (type === 'category') {
      categoryForm.reset({
        name: item.name,
        description: item.description || "",
        colorCode: item.colorCode || "#3b82f6",
        displayOrder: item.displayOrder || 0,
      });
    } else if (type === 'safety') {
      safetyForm.reset({
        title: item.title,
        category: item.category,
        description: item.description || "",
        severityLevel: item.severityLevel,
        procedures: item.procedures,
        firstAidSteps: item.firstAidSteps || "",
        evacuationPlan: item.evacuationPlan || "",
        requiredPpe: Array.isArray(item.requiredPpe) ? item.requiredPpe.join(', ') : item.requiredPpe || "",
      });
    }
    
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setDialogType(null);
    setEditingItem(null);
    setDocumentFiles([]);
    categoryForm.reset();
    procedureForm.reset();
    safetyForm.reset();
  };

  // Document upload handlers
  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setDocumentFiles(Array.from(files));
    }
  };

  const removeDocument = (index: number) => {
    setDocumentFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Form submission handlers
  const onSubmitProcedure = async (data: ProcedureForm) => {
    try {
      const formData = new FormData();
      
      // Add form data
      Object.entries(data).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });

      let response;
      if (editingItem) {
        // Update existing procedure
        response = await fetch(`/api/procedures/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data)
        });
      } else {
        // Create new procedure
        response = await fetch('/api/procedures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data)
        });
      }

      const result = await response.json();
      
      if (result.success) {
        // Upload documents if any
        if (documentFiles.length > 0 && result.procedure?.id) {
          await uploadDocuments(result.procedure.id);
        }

        toast({
        title: t.success,
          description: editingItem ? "دستورالعمل با موفقیت به‌روزرسانی شد" : "دستورالعمل جدید ایجاد شد",
        });
        
        closeDialog();
        queryClient.invalidateQueries({ queryKey: ["/api/procedures"] });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error submitting procedure:', error);
      toast({
        variant: "destructive",
        title: t.error,
        description: "مشکلی در ذخیره دستورالعمل رخ داده است",
      });
    }
  };

  const uploadDocuments = async (procedureId: number) => {
    const uploadEndpoint = selectedTab === 'safety' 
      ? `/api/procedures/safety-protocols/${procedureId}/documents`
      : `/api/procedures/${procedureId}/documents`;

    for (const file of documentFiles) {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('title', file.name);
      formData.append('description', `فایل ضمیمه: ${file.name}`);

      try {
        await fetch(uploadEndpoint, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
      } catch (error) {
        console.error('Error uploading document:', error);
      }
    }
    
    // Refresh documents list after all uploads
    const documentApiEndpoint = selectedTab === 'safety' 
      ? `/api/procedures/safety-protocols/${procedureId}/documents`
      : `/api/procedures/${procedureId}/documents`;
    queryClient.invalidateQueries({ 
      queryKey: [documentApiEndpoint] 
    });
  };

  const onSubmitCategory = async (data: ProcedureCategoryForm) => {
    try {
      let response;
      if (editingItem) {
        // Update existing category
        response = await fetch(`/api/procedures/categories/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data)
        });
      } else {
        // Create new category
        response = await fetch('/api/procedures/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data)
        });
      }

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: t.success,
          description: editingItem ? "دسته‌بندی با موفقیت به‌روزرسانی شد" : "دسته‌بندی جدید ایجاد شد",
        });
        
        closeDialog();
        queryClient.invalidateQueries({ queryKey: ["/api/procedures/categories"] });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error submitting category:', error);
      toast({
        variant: "destructive",
        title: t.error,
        description: "مشکلی در ذخیره دسته‌بندی رخ داده است",
      });
    }
  };

  const onSubmitSafety = async (data: SafetyProtocolForm) => {
    try {
      // Process required PPE
      const ppeArray = data.requiredPpe ? data.requiredPpe.split(',').map(item => item.trim()).filter(item => item.length > 0) : [];
      
      const requestData = {
        ...data,
        requiredPpe: ppeArray
      };

      let response;
      if (editingItem) {
        // Update existing safety protocol
        response = await fetch(`/api/procedures/safety-protocols/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(requestData)
        });
      } else {
        // Create new safety protocol
        response = await fetch('/api/procedures/safety-protocols', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(requestData)
        });
      }

      const result = await response.json();
      
      if (result.success) {
        // Upload documents if any
        if (documentFiles.length > 0 && result.safetyProtocol?.id) {
          await uploadDocuments(result.safetyProtocol.id);
        }

        toast({
          title: t.success,
          description: editingItem ? "Safety protocol updated successfully" : "Safety protocol created successfully",
        });
        
        closeDialog();
        queryClient.invalidateQueries({ queryKey: ["/api/procedures/safety-protocols"] });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error submitting safety protocol:', error);
      toast({
        variant: "destructive",
        title: t.error,
        description: "مشکلی در ذخیره پروتکل ایمنی رخ داده است",
      });
    }
  };

  return (
    <div className="min-h-[100dvh] space-y-6 bg-slate-50/70 p-1 text-slate-900" dir={direction}>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/admin')}
          >
            <ArrowLeft className="h-4 w-4 me-2" />
            {t.back}
          </Button>
        </div>
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t.title}
          </h1>
          <p className="text-lg text-blue-600 mb-4">
            {t.subtitle}
          </p>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-700">
              {t.title}
            </h2>
          </div>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="procedures">{t.procedures}</TabsTrigger>
          <TabsTrigger value="categories">{t.categories}</TabsTrigger>
          <TabsTrigger value="safety">{t.safety}</TabsTrigger>
          <TabsTrigger value="analytics">{t.analytics}</TabsTrigger>
        </TabsList>

        {/* Procedures Tab */}
        <TabsContent value="procedures" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                  <CardTitle>{t.procedures}</CardTitle>
                {canManageProcedures && (
                  <Button onClick={() => openCreateDialog('procedure')}>
                    <Plus className="h-4 w-4 me-2" />
                    {t.addProcedure}
                  </Button>
                )}
              </div>
              
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t.search}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                </div>
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t.chooseCategory} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allCategories}</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t.chooseStatus} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allStatuses}</SelectItem>
                    <SelectItem value="approved">{t.approved}</SelectItem>
                    <SelectItem value="review">{t.review}</SelectItem>
                    <SelectItem value="draft">{t.draft}</SelectItem>
                    <SelectItem value="archived">{t.archived}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {proceduresLoading ? (
                <div className="py-8 text-center text-slate-500">{t.loading}</div>
              ) : (
                <div className="overflow-x-auto">
                <Table className="min-w-[1100px] text-xs">
                  <TableHeader className="sticky top-0 z-10 bg-slate-700">
                    <TableRow className="border-slate-700 hover:bg-slate-700">
                      {[t.titleLabel, t.category, t.version, t.priority, t.status, t.documents, t.views, t.created, t.actions].map((label) => (
                        <TableHead key={label} className="h-9 border-e border-slate-600 px-3 text-start font-semibold text-slate-50">{label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProcedures.map((procedure) => {
                      const category = categories.find(c => c.id === procedure.categoryId);
                      return (
                        <TableRow key={procedure.id} className="border-slate-200 odd:bg-slate-50 even:bg-white hover:bg-amber-50">
                          <TableCell className="border-e border-slate-200 px-3 py-2 font-medium">{procedure.title}</TableCell>
                          <TableCell className="border-e border-slate-200 px-3 py-2">
                            <Badge 
                              variant="outline" 
                              style={{ backgroundColor: category?.colorCode + '20', borderColor: category?.colorCode }}
                            >
                            {category?.name || t.unknown}
                            </Badge>
                          </TableCell>
                          <TableCell className="border-e border-slate-200 px-3 py-2">{procedure.version}</TableCell>
                          <TableCell className="border-e border-slate-200 px-3 py-2">
                            <Badge className={getPriorityColor(procedure.priority)}>
                              {procedure.priority === 'critical' ? t.severityCritical :
                               procedure.priority === 'high' ? t.severityHigh :
                               procedure.priority === 'normal' ? (language === 'en' ? 'Normal' : language === 'tr' ? 'Normal' : language === 'ar' ? 'عادي' : 'عادی') : t.severityLow}
                            </Badge>
                          </TableCell>
                          <TableCell className="border-e border-slate-200 px-3 py-2">
                            <Badge className={getStatusColor(procedure.status)}>
                              {procedure.status === 'approved' ? t.approved :
                               procedure.status === 'review' ? t.review :
                               procedure.status === 'draft' ? t.draft : t.archived}
                            </Badge>
                          </TableCell>
                          <TableCell className="border-e border-slate-200 px-3 py-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => viewProcedureDocuments(procedure.id)}
                              title={t.viewDocuments}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              {t.documents}
                            </Button>
                          </TableCell>
                          <TableCell className="border-e border-slate-200 px-3 py-2">{procedure.viewCount}</TableCell>
                          <TableCell className="border-e border-slate-200 px-3 py-2">
                            {new Date(procedure.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingProcedure(procedure)}
                                title={language === "fa" ? "مشاهده دستورالعمل" : language === "ar" ? "عرض الإجراء" : language === "tr" ? "Prosedürü görüntüle" : "View procedure"}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => exportProcedure(procedure.id)}
                                title={t.export}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {canManageProcedures && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog('procedure', procedure)}
                                  title={t.edit}
                                  data-testid={`button-edit-procedure-${procedure.id}`}
                                >
                                  <Edit className="h-4 w-4 me-2" />
                                  {t.edit}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t.categories}</CardTitle>
                {canManageProcedures && (
                  <Button onClick={() => openCreateDialog('category')}>
                    <Plus className="h-4 w-4 me-2" />
                    {t.addCategory}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="py-8 text-center text-slate-500">{t.loading}</div>
              ) : (
                <div className="overflow-x-auto">
                <Table className="min-w-[900px] text-xs">
                  <TableHeader className="sticky top-0 z-10 bg-slate-700">
                    <TableRow className="border-slate-700 hover:bg-slate-700">
                      {[t.row, t.categoryName, t.description, t.displayOrder, t.procedures, t.status, t.actions].map((label) => (
                        <TableHead key={label} className="h-9 border-e border-slate-600 px-3 text-start font-semibold text-slate-50">{label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id} className="border-slate-200 odd:bg-slate-50 even:bg-white hover:bg-amber-50">
                      <TableCell className="border-e border-slate-200 px-3 py-2 font-mono text-slate-500">{category.id}</TableCell>
                      <TableCell className="border-e border-slate-200 px-3 py-2 font-semibold">{category.name}</TableCell>
                      <TableCell className="max-w-[320px] whitespace-normal border-e border-slate-200 px-3 py-2 text-slate-600">{category.description || "—"}</TableCell>
                      <TableCell className="border-e border-slate-200 px-3 py-2">{category.displayOrder}</TableCell>
                      <TableCell className="border-e border-slate-200 px-3 py-2">{procedures.filter(p => p.categoryId === category.id).length}</TableCell>
                      <TableCell className="border-e border-slate-200 px-3 py-2">
                        <Badge variant={category.isActive ? "default" : "secondary"}>{category.isActive ? t.active : (language === "tr" ? "Devre dışı" : language === "ar" ? "غير نشط" : language === "en" ? "Inactive" : "غیرفعال")}</Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {canManageProcedures ? (
                          <Button variant="outline" size="sm" onClick={() => openEditDialog('category', category)}>{t.edit}</Button>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Safety Protocols Tab */}
        <TabsContent value="safety" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t.safety}</CardTitle>
                {canManageProcedures && (
                  <Button onClick={() => openCreateDialog('safety')}>
                    <Plus className="h-4 w-4 me-2" />
                    {t.addProtocol}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {safetyLoading ? (
                <div className="py-8 text-center text-slate-500">{t.loading}</div>
              ) : (
                <div className="overflow-x-auto">
                <Table className="min-w-[1180px] text-xs">
                  <TableHeader className="sticky top-0 z-10 bg-slate-700">
                    <TableRow className="border-slate-700 hover:bg-slate-700">
                      {[t.row, t.titleLabel, t.category, t.description, t.severity, t.mandatory, t.ppe, t.documents, t.actions].map((label) => (
                        <TableHead key={label} className="h-9 border-e border-slate-600 px-3 text-start font-semibold text-slate-50">{label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {safetyProtocols.map((protocol) => (
                    <TableRow key={protocol.id} className="border-slate-200 odd:bg-slate-50 even:bg-white hover:bg-amber-50">
                      <TableCell className="border-e border-slate-200 px-3 py-2 font-mono text-slate-500">{protocol.id}</TableCell>
                      <TableCell className="border-e border-slate-200 px-3 py-2 font-semibold">{protocol.title}</TableCell>
                      <TableCell className="border-e border-slate-200 px-3 py-2">{protocol.category}</TableCell>
                      <TableCell className="max-w-[260px] whitespace-normal border-e border-slate-200 px-3 py-2 text-slate-600">{protocol.description || "—"}</TableCell>
                      <TableCell className="border-e border-slate-200 px-3 py-2">
                        <span className="inline-flex items-center gap-1">{getSeverityIcon(protocol.severityLevel)}{protocol.severityLevel === "critical" ? t.severityCritical : protocol.severityLevel === "high" ? t.severityHigh : protocol.severityLevel === "medium" ? t.severityMedium : t.severityLow}</span>
                      </TableCell>
                      <TableCell className="border-e border-slate-200 px-3 py-2"><Badge variant={protocol.isMandatory ? "default" : "secondary"}>{protocol.isMandatory ? t.yes : t.no}</Badge></TableCell>
                      <TableCell className="max-w-[220px] whitespace-normal border-e border-slate-200 px-3 py-2">{protocol.requiredPpe.join(", ") || "—"}</TableCell>
                      <TableCell className="border-e border-slate-200 px-3 py-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedProcedureId(protocol.id); setShowDocuments(true); }}>{t.documents}</Button>
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {canManageProcedures ? (
                          <Button variant="outline" size="sm" onClick={() => openEditDialog('safety', protocol)}>{t.edit}</Button>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t.usage}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>{t.totalViews}:</span>
                    <span className="font-semibold">
                      {procedures.reduce((sum, p) => sum + p.viewCount, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.averageViews}:</span>
                    <span className="font-semibold">
                      {Math.round(procedures.reduce((sum, p) => sum + p.viewCount, 0) / procedures.length || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.mostViewed}:</span>
                    <span className="font-semibold text-green-600">
                      {Math.max(...procedures.map(p => p.viewCount))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  {t.approvalStatus}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>{t.approved}:</span>
                    <span className="font-semibold text-green-600">
                      {procedures.filter(p => p.status === 'approved').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.pending}:</span>
                    <span className="font-semibold text-yellow-600">
                      {procedures.filter(p => p.status === 'review').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>پیش‌نویس:</span>
                    <span className="font-semibold text-blue-600">
                      {procedures.filter(p => p.status === 'draft').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Documents Dialog */}
      <Dialog open={showDocuments} onOpenChange={setShowDocuments}>
          <DialogContent dir={direction} className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.uploadedDocuments}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {documentsLoading ? (
              <div className="py-8 text-center text-slate-500">{t.loading}</div>
            ) : documents.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                {t.noDocuments}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[980px] text-xs">
                  <TableHeader className="sticky top-0 z-10 bg-slate-700">
                    <TableRow className="border-slate-700 hover:bg-slate-700">
                      {[t.row, t.titleLabel, t.version, t.description, t.views, t.actions].map((label) => (
                        <TableHead key={label} className="h-9 border-e border-slate-600 px-3 text-start font-semibold text-slate-50">{label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((document, index) => (
                      <TableRow key={document.id} className="border-slate-200 odd:bg-slate-50 even:bg-white hover:bg-amber-50">
                        <TableCell className="border-e border-slate-200 px-3 py-2 font-mono text-slate-500">{index + 1}</TableCell>
                        <TableCell className="border-e border-slate-200 px-3 py-2">
                          <div className="font-semibold">{document.title}</div>
                          <div className="text-slate-500">{document.fileName} · {formatFileSize(document.fileSize || 0)}</div>
                        </TableCell>
                        <TableCell className="border-e border-slate-200 px-3 py-2">{document.version || "1.0"}</TableCell>
                        <TableCell className="max-w-[280px] whitespace-normal border-e border-slate-200 px-3 py-2">{document.description || "—"}</TableCell>
                        <TableCell className="border-e border-slate-200 px-3 py-2">{document.downloadCount || 0}</TableCell>
                        <TableCell className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadDocument(document.id, document.fileName)}
                            title={t.documents}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            {language === "tr" ? "İndir" : language === "ar" ? "تنزيل" : language === "en" ? "Download" : "دانلود"}
                          </Button>
                          {canManageProcedures && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteDocument(document.id, document.title)}
                              title={t.delete}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              {t.delete}
                            </Button>
                          )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDocuments(false)}>
              {t.close}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Read-only procedure preview */}
      <Dialog open={!!viewingProcedure} onOpenChange={(open) => !open && setViewingProcedure(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingProcedure?.title}</DialogTitle>
          </DialogHeader>
          {viewingProcedure && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Badge className={getStatusColor(viewingProcedure.status)}>
                  {viewingProcedure.status === "approved" ? t.approved : viewingProcedure.status === "review" ? t.review : viewingProcedure.status === "draft" ? t.draft : t.archived}
                </Badge>
                <Badge className={getPriorityColor(viewingProcedure.priority)}>
                  {viewingProcedure.priority}
                </Badge>
                <Badge variant="outline">{t.version}: {viewingProcedure.version}</Badge>
              </div>
              {viewingProcedure.description && (
                <div>
                  <Label className="text-muted-foreground">{t.summary}</Label>
                  <p className="mt-1 whitespace-pre-wrap">{viewingProcedure.description}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">{t.content}</Label>
                <div className="mt-2 whitespace-pre-wrap rounded-md border bg-slate-50 p-4 leading-7">
                  {viewingProcedure.content}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setViewingProcedure(null)}>{t.close}</Button>
                <Button onClick={() => {
                  setViewingProcedure(null);
                  viewProcedureDocuments(viewingProcedure.id);
                }}>
                  <FileText className="me-2 h-4 w-4" />
                  {t.documents}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={canManageProcedures && dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'category' ? (editingItem ? `${t.edit} ${t.categories}` : t.addCategory) :
               dialogType === 'procedure' ? (editingItem ? t.editProcedure : t.addProcedure) :
               dialogType === 'safety' ? (editingItem ? `${t.edit} ${t.safety}` : t.addProtocol) : ''}
            </DialogTitle>
          </DialogHeader>

          {dialogType === 'category' && (
            <Form {...categoryForm}>
              <form onSubmit={categoryForm.handleSubmit(onSubmitCategory)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={categoryForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نام دسته‌بندی</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={categoryForm.control}
                    name="colorCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رنگ</FormLabel>
                        <FormControl>
                          <Input type="color" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={categoryForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>توضیحات</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={categoryForm.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ترتیب نمایش</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    انصراف
                  </Button>
                  <Button type="submit">
                    ایجاد دسته‌بندی
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {dialogType === 'procedure' && (
            <Form {...procedureForm}>
              <form onSubmit={procedureForm.handleSubmit(onSubmitProcedure)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={procedureForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.procedureTitle}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={procedureForm.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.category}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t.chooseCategory} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={procedureForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.summary}</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={procedureForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.content}</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={8} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={procedureForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.priority}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">{t.severityLow}</SelectItem>
                            <SelectItem value="normal">{t.priorityNormal}</SelectItem>
                            <SelectItem value="high">{t.severityHigh}</SelectItem>
                            <SelectItem value="critical">{t.severityCritical}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={procedureForm.control}
                    name="accessLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.access}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="public">{t.accessPublic}</SelectItem>
                            <SelectItem value="internal">{t.accessInternal}</SelectItem>
                            <SelectItem value="restricted">{t.accessRestricted}</SelectItem>
                            <SelectItem value="confidential">{t.accessConfidential}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={procedureForm.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.tags}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t.tagsPlaceholder} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={procedureForm.control}
                    name="effectiveDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.effectiveDate}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={procedureForm.control}
                    name="reviewDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.reviewDate}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Document Upload Section */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    <h3 className="font-medium">{t.uploadAttachments}</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                      onChange={handleDocumentUpload}
                      className="w-full p-2 border rounded"
                    />
                    <p className="text-sm text-muted-foreground">
                      {t.allowed}
                    </p>
                  </div>

                  {documentFiles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">{t.selectedFiles}:</h4>
                      {documentFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    {t.cancel}
                  </Button>
                  <Button type="submit">
                    {editingItem ? t.updateProcedure : t.createProcedure}
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {dialogType === 'safety' && (
            <Form {...safetyForm}>
              <form onSubmit={safetyForm.handleSubmit(onSubmitSafety)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={safetyForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عنوان پروتکل</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={safetyForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>دسته‌بندی</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={safetyForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>توضیحات</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={safetyForm.control}
                  name="procedures"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>دستورالعمل‌های ایمنی</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={6} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={safetyForm.control}
                    name="severityLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>سطح شدت</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">پایین</SelectItem>
                            <SelectItem value="medium">متوسط</SelectItem>
                            <SelectItem value="high">بالا</SelectItem>
                            <SelectItem value="critical">بحرانی</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={safetyForm.control}
                    name="requiredPpe"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تجهیزات ایمنی (با کاما جدا کنید)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="عینک, دستکش, ماسک" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={safetyForm.control}
                  name="firstAidSteps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اقدامات کمک‌های اولیه</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={safetyForm.control}
                  name="evacuationPlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>برنامه تخلیه</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Document Upload Section */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Document Attachments</h4>
                  <div className="space-y-2">
                    <Label htmlFor="safety-documents">Upload Safety Documents</Label>
                    <Input
                      id="safety-documents"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                      onChange={handleDocumentUpload}
                      className="cursor-pointer"
                    />
                    {documentFiles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Selected files:</p>
                        {documentFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocument(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingItem ? "Update Safety Protocol" : "Create Safety Protocol"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}