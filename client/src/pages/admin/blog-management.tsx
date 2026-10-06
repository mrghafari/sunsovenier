import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  blogLanguageFields,
  buildBlogTranslations,
  getInitialBlogLanguages,
  validateEnabledBlogLanguages,
  type BlogFormTranslationInput,
} from "@/lib/blog-form";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useForm, type SubmitErrorHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { marked } from "marked";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Tag,
  FileText,
  Save,
  Upload,
  Image,
  Loader2,
  X,
} from "lucide-react";
import type { BlogPostWithTranslations } from "@shared/blog-schema";
import { blogLanguages, type BlogLanguage } from "@shared/blog-localization";
import type { Language } from "@/lib/i18n";

const blogAdminCopy: Record<Language, {
  success: string; error: string; created: string; createFailed: string; updated: string; updateFailed: string;
  deleted: string; deleteFailed: string; statusUpdated: string; statusFailed: string; imageUploaded: string; imageUploadFailed: string;
  deleteConfirm: string; title: string; subtitle: string; newPost: string; totalPosts: string; published: string; drafts: string;
  totalViews: string; filters: string; searchByTitle: string; searchPlaceholder: string; filterByStatus: string; allStatuses: string;
  draft: string; filterByTag: string; tagPlaceholder: string; posts: string; showing: (shown: number, total: number) => string;
  noPosts: string; postTitle: string; status: string; publishDate: string; views: string; tags: string; actions: string;
  page: (current: number, total: number) => string; previous: string; next: string; editPost: string; createPost: string;
  dialogDescription: string; authorName: string; authorPlaceholder: string; featuredImage: string; imageRecommendation: string;
  upload: string; tagsLabel: string; tagsPlaceholder: string; cancel: string; saving: string; save: string;
  languageHelp: string; addLanguage: string; removeLanguage: string; confirmRemoveTitle: string;
  confirmRemove: (name: string) => string; confirmRemoveDescription: (name: string) => string;
  keepLanguage: string; removeOnSave: string; minimumLanguage: string; completeLanguage: (name: string) => string;
}> = {
  en: {
    success: "Success", error: "Error", created: "Blog post created successfully", createFailed: "Failed to create blog post",
    updated: "Blog post updated successfully", updateFailed: "Failed to update blog post", deleted: "Blog post deleted successfully",
    deleteFailed: "Failed to delete blog post", statusUpdated: "Status updated successfully", statusFailed: "Failed to update status",
    imageUploaded: "Image uploaded successfully", imageUploadFailed: "Failed to upload image", deleteConfirm: "Are you sure you want to delete this post?",
    title: "Blog Management", subtitle: "Create, edit, and manage blog posts", newPost: "New Post", totalPosts: "Total Posts",
    published: "Published", drafts: "Drafts", totalViews: "Total Views", filters: "Filters", searchByTitle: "Search by title",
    searchPlaceholder: "Search posts...", filterByStatus: "Filter by status", allStatuses: "All Statuses", draft: "Draft",
    filterByTag: "Filter by tag", tagPlaceholder: "Enter tag...", posts: "Blog Posts",
    showing: (shown, total) => `Showing ${shown} of ${total} posts`, noPosts: "No posts found", postTitle: "Title",
    status: "Status", publishDate: "Publish Date", views: "Views", tags: "Tags", actions: "Actions",
    page: (current, total) => `Page ${current} of ${total}`, previous: "Previous", next: "Next", editPost: "Edit Blog Post",
    createPost: "Create New Blog Post", dialogDescription: "Choose the languages this post should include. Complete each enabled translation before saving.",
    authorName: "Author Name", authorPlaceholder: "Enter author name", featuredImage: "Featured Image",
    imageRecommendation: "Recommended size: 1200 × 628 px (1.91:1 aspect ratio)", upload: "Upload",
    tagsLabel: "Tags (comma-separated)", tagsPlaceholder: "tech, tutorial, news", cancel: "Cancel", saving: "Saving...", save: "Save",
    languageHelp: "Choose one or more languages for this post. Removed translations are deleted only when you save.",
    addLanguage: "Add language", removeLanguage: "Remove", confirmRemoveTitle: "Remove this translation?",
    confirmRemove: (name) => `Remove ${name}`, confirmRemoveDescription: (name) => `The existing ${name} translation will be deleted when you save this post. You can cancel now; nothing has been changed in the database.`,
    keepLanguage: "Keep translation", removeOnSave: "Remove on save", minimumLanguage: "At least one language must remain enabled.",
    completeLanguage: (name) => `Complete the title, slug, excerpt, and content for ${name}.`,
  },
  fa: {
    success: "موفق", error: "خطا", created: "مطلب وبلاگ با موفقیت ایجاد شد", createFailed: "ایجاد مطلب وبلاگ ناموفق بود",
    updated: "مطلب وبلاگ با موفقیت به‌روزرسانی شد", updateFailed: "به‌روزرسانی مطلب وبلاگ ناموفق بود", deleted: "مطلب وبلاگ با موفقیت حذف شد",
    deleteFailed: "حذف مطلب وبلاگ ناموفق بود", statusUpdated: "وضعیت با موفقیت به‌روزرسانی شد", statusFailed: "به‌روزرسانی وضعیت ناموفق بود",
    imageUploaded: "تصویر با موفقیت بارگذاری شد", imageUploadFailed: "بارگذاری تصویر ناموفق بود", deleteConfirm: "آیا از حذف این مطلب مطمئن هستید؟",
    title: "مدیریت وبلاگ", subtitle: "ایجاد، ویرایش و مدیریت مطالب وبلاگ", newPost: "مطلب جدید", totalPosts: "مجموع مطالب",
    published: "منتشرشده", drafts: "پیش‌نویس‌ها", totalViews: "مجموع بازدیدها", filters: "فیلترها", searchByTitle: "جست‌وجو بر اساس عنوان",
    searchPlaceholder: "جست‌وجوی مطالب...", filterByStatus: "فیلتر بر اساس وضعیت", allStatuses: "همه وضعیت‌ها", draft: "پیش‌نویس",
    filterByTag: "فیلتر بر اساس برچسب", tagPlaceholder: "برچسب را وارد کنید...", posts: "مطالب وبلاگ",
    showing: (shown, total) => `نمایش ${shown} مطلب از ${total} مطلب`, noPosts: "مطلبی پیدا نشد", postTitle: "عنوان",
    status: "وضعیت", publishDate: "تاریخ انتشار", views: "بازدیدها", tags: "برچسب‌ها", actions: "عملیات",
    page: (current, total) => `صفحه ${current} از ${total}`, previous: "قبلی", next: "بعدی", editPost: "ویرایش مطلب وبلاگ",
    createPost: "ایجاد مطلب جدید", dialogDescription: "زبان‌های این مطلب را انتخاب کنید و ترجمه‌های فعال را تکمیل کنید.",
    authorName: "نام نویسنده", authorPlaceholder: "نام نویسنده را وارد کنید", featuredImage: "تصویر شاخص",
    imageRecommendation: "اندازه پیشنهادی: ۱۲۰۰ × ۶۲۸ پیکسل (نسبت ۱٫۹۱:۱)", upload: "بارگذاری",
    tagsLabel: "برچسب‌ها (با کاما جدا کنید)", tagsPlaceholder: "فناوری، آموزش، خبر", cancel: "انصراف", saving: "در حال ذخیره...", save: "ذخیره",
    languageHelp: "یک یا چند زبان را انتخاب کنید. ترجمه‌های حذف‌شده فقط هنگام ذخیره پاک می‌شوند.",
    addLanguage: "افزودن زبان", removeLanguage: "حذف", confirmRemoveTitle: "این ترجمه حذف شود؟",
    confirmRemove: (name) => `حذف ${name}`, confirmRemoveDescription: (name) => `ترجمهٔ موجود ${name} هنگام ذخیرهٔ مطلب حذف می‌شود. می‌توانید انصراف دهید؛ هنوز تغییری در پایگاه داده انجام نشده است.`,
    keepLanguage: "نگه‌داشتن ترجمه", removeOnSave: "حذف هنگام ذخیره", minimumLanguage: "حداقل یک زبان باید فعال بماند.",
    completeLanguage: (name) => `عنوان، نشانی، خلاصه و متن ${name} را تکمیل کنید.`,
  },
  ar: {
    success: "نجاح", error: "خطأ", created: "تم إنشاء المقالة بنجاح", createFailed: "فشل إنشاء المقالة",
    updated: "تم تحديث المقالة بنجاح", updateFailed: "فشل تحديث المقالة", deleted: "تم حذف المقالة بنجاح",
    deleteFailed: "فشل حذف المقالة", statusUpdated: "تم تحديث الحالة بنجاح", statusFailed: "فشل تحديث الحالة",
    imageUploaded: "تم رفع الصورة بنجاح", imageUploadFailed: "فشل رفع الصورة", deleteConfirm: "هل أنت متأكد من حذف هذه المقالة؟",
    title: "إدارة المدونة", subtitle: "إنشاء وتعديل وإدارة مقالات المدونة", newPost: "مقالة جديدة", totalPosts: "إجمالي المقالات",
    published: "منشور", drafts: "مسودات", totalViews: "إجمالي المشاهدات", filters: "التصفية", searchByTitle: "البحث بالعنوان",
    searchPlaceholder: "ابحث عن المقالات...", filterByStatus: "التصفية بالحالة", allStatuses: "جميع الحالات", draft: "مسودة",
    filterByTag: "التصفية بالوسم", tagPlaceholder: "أدخل الوسم...", posts: "مقالات المدونة",
    showing: (shown, total) => `عرض ${shown} من ${total} مقالة`, noPosts: "لا توجد مقالات", postTitle: "العنوان",
    status: "الحالة", publishDate: "تاريخ النشر", views: "المشاهدات", tags: "الوسوم", actions: "الإجراءات",
    page: (current, total) => `صفحة ${current} من ${total}`, previous: "السابق", next: "التالي", editPost: "تعديل المقالة",
    createPost: "إنشاء مقالة جديدة", dialogDescription: "اختر لغات المقالة وأكمل الترجمات المفعّلة.",
    authorName: "اسم الكاتب", authorPlaceholder: "أدخل اسم الكاتب", featuredImage: "الصورة المميزة",
    imageRecommendation: "الحجم الموصى به: 1200 × 628 بكسل (نسبة 1.91:1)", upload: "رفع",
    tagsLabel: "الوسوم (مفصولة بفاصلة)", tagsPlaceholder: "تقنية، درس، أخبار", cancel: "إلغاء", saving: "جاري الحفظ...", save: "حفظ",
    languageHelp: "اختر لغة واحدة أو أكثر. لن تُحذف الترجمات المستبعدة إلا عند الحفظ.",
    addLanguage: "إضافة لغة", removeLanguage: "إزالة", confirmRemoveTitle: "إزالة هذه الترجمة؟",
    confirmRemove: (name) => `إزالة ${name}`, confirmRemoveDescription: (name) => `سيتم حذف ترجمة ${name} الحالية عند حفظ المقالة. يمكنك الإلغاء الآن؛ لم يتغير شيء في قاعدة البيانات.`,
    keepLanguage: "الإبقاء على الترجمة", removeOnSave: "إزالة عند الحفظ", minimumLanguage: "يجب إبقاء لغة واحدة على الأقل.",
    completeLanguage: (name) => `أكمل العنوان والرابط والملخص والمحتوى باللغة ${name}.`,
  },
  tr: {
    success: "Başarılı", error: "Hata", created: "Blog yazısı başarıyla oluşturuldu", createFailed: "Blog yazısı oluşturulamadı",
    updated: "Blog yazısı başarıyla güncellendi", updateFailed: "Blog yazısı güncellenemedi", deleted: "Blog yazısı başarıyla silindi",
    deleteFailed: "Blog yazısı silinemedi", statusUpdated: "Durum başarıyla güncellendi", statusFailed: "Durum güncellenemedi",
    imageUploaded: "Görsel başarıyla yüklendi", imageUploadFailed: "Görsel yüklenemedi", deleteConfirm: "Bu yazıyı silmek istediğinizden emin misiniz?",
    title: "Blog Yönetimi", subtitle: "Blog yazılarını oluşturun, düzenleyin ve yönetin", newPost: "Yeni Yazı", totalPosts: "Toplam Yazı",
    published: "Yayınlandı", drafts: "Taslaklar", totalViews: "Toplam Görüntülenme", filters: "Filtreler", searchByTitle: "Başlığa göre ara",
    searchPlaceholder: "Yazılarda ara...", filterByStatus: "Duruma göre filtrele", allStatuses: "Tüm Durumlar", draft: "Taslak",
    filterByTag: "Etikete göre filtrele", tagPlaceholder: "Etiket girin...", posts: "Blog Yazıları",
    showing: (shown, total) => `${total} yazının ${shown} tanesi gösteriliyor`, noPosts: "Yazı bulunamadı", postTitle: "Başlık",
    status: "Durum", publishDate: "Yayın Tarihi", views: "Görüntülenme", tags: "Etiketler", actions: "İşlemler",
    page: (current, total) => `Sayfa ${current} / ${total}`, previous: "Önceki", next: "Sonraki", editPost: "Blog Yazısını Düzenle",
    createPost: "Yeni Blog Yazısı Oluştur", dialogDescription: "Bu yazıda yer alacak dilleri seçin ve etkin çevirileri tamamlayın.",
    authorName: "Yazar Adı", authorPlaceholder: "Yazar adını girin", featuredImage: "Öne Çıkan Görsel",
    imageRecommendation: "Önerilen boyut: 1200 × 628 px (1.91:1 en-boy oranı)", upload: "Yükle",
    tagsLabel: "Etiketler (virgülle ayrılmış)", tagsPlaceholder: "teknoloji, eğitim, haber", cancel: "İptal", saving: "Kaydediliyor...", save: "Kaydet",
    languageHelp: "Bu yazı için bir veya daha fazla dil seçin. Kaldırılan çeviriler yalnızca kaydettiğinizde silinir.",
    addLanguage: "Dil ekle", removeLanguage: "Kaldır", confirmRemoveTitle: "Bu çeviri kaldırılsın mı?",
    confirmRemove: (name) => `${name} dilini kaldır`, confirmRemoveDescription: (name) => `Mevcut ${name} çevirisi yazıyı kaydettiğinizde silinecek. Şimdi vazgeçebilirsiniz; veritabanında henüz değişiklik yapılmadı.`,
    keepLanguage: "Çeviriyi koru", removeOnSave: "Kaydederken kaldır", minimumLanguage: "En az bir dil etkin kalmalıdır.",
    completeLanguage: (name) => `${name} için başlık, bağlantı, özet ve içeriği tamamlayın.`,
  }
};

// Custom validation for image URLs (allows both full URLs and relative paths)
const imageUrlSchema = z.string().refine((val) => {
  if (!val || val === "") return true;
  // Allow full URLs or relative paths starting with /uploads/
  return val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/uploads/");
}, "Invalid image URL").optional().or(z.literal(""));

// Form validation schema
const blogFormSchema = z.object({
  authorName: z.string().min(1, "Author name is required"),
  featuredImage: imageUrlSchema,
  tags: z.string().optional(),
  status: z.enum(["draft", "published"]),
  publishDate: z.string().optional(),
  
  // English translation
  titleEn: z.string().optional(),
  slugEn: z.string().optional(),
  excerptEn: z.string().optional(),
  contentEn: z.string().optional(),
  metaTitleEn: z.string().optional(),
  metaDescriptionEn: z.string().optional(),
  
  // Arabic translation
  titleAr: z.string().optional(),
  slugAr: z.string().optional(),
  excerptAr: z.string().optional(),
  contentAr: z.string().optional(),
  metaTitleAr: z.string().optional(),
  metaDescriptionAr: z.string().optional(),
  ogImageAr: imageUrlSchema,
  titleTr: z.string().optional(),
  slugTr: z.string().optional(),
  excerptTr: z.string().optional(),
  contentTr: z.string().optional(),
  metaTitleTr: z.string().optional(),
  metaDescriptionTr: z.string().optional(),
  titleFa: z.string().optional(),
  slugFa: z.string().optional(),
  excerptFa: z.string().optional(),
  contentFa: z.string().optional(),
  metaTitleFa: z.string().optional(),
  metaDescriptionFa: z.string().optional(),
});

type BlogFormData = z.infer<typeof blogFormSchema>;

const formValidationCopy: Record<Language, string> = {
  en: "Complete the author details and each enabled language before saving.",
  ar: "أكمل بيانات الكاتب وكل لغة مفعّلة قبل الحفظ.",
  tr: "Kaydetmeden önce yazar bilgilerini ve etkin dillerin her birini tamamlayın.",
  fa: "پیش از ذخیره، مشخصات نویسنده و همهٔ زبان‌های فعال را تکمیل کنید.",
};

const languageNames: Record<BlogLanguage, Record<Language, string>> = {
  en: { en: "English", ar: "الإنجليزية", tr: "İngilizce", fa: "انگلیسی" },
  ar: { en: "Arabic", ar: "العربية", tr: "Arapça", fa: "عربی" },
  tr: { en: "Turkish", ar: "التركية", tr: "Türkçe", fa: "ترکی" },
  fa: { en: "Persian", ar: "الفارسية", tr: "Farsça", fa: "فارسی" },
};
export default function BlogManagement() {
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const copy = blogAdminCopy[language];
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPostWithTranslations | null>(null);
  const [activeTab, setActiveTab] = useState<BlogLanguage>("en");
  const [enabledLanguages, setEnabledLanguages] = useState<BlogLanguage[]>([...blogLanguages]);
  const [languageToRemove, setLanguageToRemove] = useState<BlogLanguage | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [tagFilter, setTagFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [markdownPreview, setMarkdownPreview] = useState({ en: "", ar: "", tr: "", fa: "" });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const postsPerPage = 10;

  // Fetch blog posts
  const { data: postsData, isLoading } = useQuery<{ success: boolean, data: BlogPostWithTranslations[], total?: number }>({
    queryKey: ['/api/admin/blog', currentPage, searchQuery, statusFilter, tagFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: postsPerPage.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(tagFilter && { tag: tagFilter }),
      });
      const response = await apiRequest(`/api/admin/blog?${params}`, { method: 'GET' });
      return response;
    },
  });

  const posts = postsData?.data || [];
  const totalPosts = postsData?.total || posts.length;
  const totalPages = Math.ceil(totalPosts / postsPerPage);
  const invalidatePublicBlogQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
    queryClient.invalidateQueries({ queryKey: ["/api/blog/"] });
  };

  // Form
  const form = useForm<BlogFormData>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: {
      authorName: "",
      featuredImage: "",
      tags: "",
      status: "draft",
      publishDate: "",
      titleEn: "",
      slugEn: "",
      excerptEn: "",
      contentEn: "",
      metaTitleEn: "",
      metaDescriptionEn: "",
      titleAr: "",
      slugAr: "",
      excerptAr: "",
      contentAr: "",
      metaTitleAr: "",
      metaDescriptionAr: "",
      ogImageAr: "",
      titleTr: "",
      slugTr: "",
      excerptTr: "",
      contentTr: "",
      metaTitleTr: "",
      metaDescriptionTr: "",
      titleFa: "",
      slugFa: "",
      excerptFa: "",
      contentFa: "",
      metaTitleFa: "",
      metaDescriptionFa: "",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: BlogFormData) => {
      const tagsArray = data.tags ? data.tags.split(",").map(t => t.trim()) : [];
      const payload = {
        post: {
          authorName: data.authorName,
          featuredImage: data.featuredImage || null,
          tags: tagsArray,
          status: data.status,
          publishDate: data.publishDate || null,
        },
        translations: buildBlogTranslations(data as unknown as BlogFormTranslationInput, enabledLanguages),
      };
      return apiRequest('/api/admin/blog', { method: 'POST', body: payload });
    },
    onSuccess: () => {
      toast({
        title: copy.success,
        description: copy.created,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog'] });
      invalidatePublicBlogQueries();
      setIsDialogOpen(false);
      form.reset();
      setMarkdownPreview({ en: "", ar: "", tr: "", fa: "" });
      setEnabledLanguages([...blogLanguages]);
      setActiveTab("en");
      setSubmitAttempted(false);
    },
    onError: (error: any) => {
      toast({
        title: copy.error,
        description: error.message || copy.createFailed,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: BlogFormData }) => {
      const tagsArray = data.tags ? data.tags.split(",").map(t => t.trim()) : [];
      const payload = {
        post: {
          authorName: data.authorName,
          featuredImage: data.featuredImage || null,
          tags: tagsArray,
          status: data.status,
          publishDate: data.publishDate || null,
        },
        translations: buildBlogTranslations(data as unknown as BlogFormTranslationInput, enabledLanguages),
      };
      return apiRequest(`/api/admin/blog/${id}`, { method: 'PUT', body: payload });
    },
    onSuccess: () => {
      toast({
        title: copy.success,
        description: copy.updated,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog'] });
      invalidatePublicBlogQueries();
      setIsDialogOpen(false);
      setEditingPost(null);
      form.reset();
      setMarkdownPreview({ en: "", ar: "", tr: "", fa: "" });
      setEnabledLanguages([...blogLanguages]);
      setActiveTab("en");
      setSubmitAttempted(false);
    },
    onError: (error: any) => {
      toast({
        title: copy.error,
        description: error.message || copy.updateFailed,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/blog/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({
        title: copy.success,
        description: copy.deleted,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog'] });
      invalidatePublicBlogQueries();
    },
    onError: (error: any) => {
      toast({
        title: copy.error,
        description: error.message || copy.deleteFailed,
        variant: "destructive",
      });
    },
  });

  // Toggle publish status
  const togglePublishMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "draft" | "published" }) =>
      apiRequest(`/api/admin/blog/${id}/publish`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      toast({
        title: copy.success,
        description: copy.statusUpdated,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog'] });
      invalidatePublicBlogQueries();
    },
    onError: (error: any) => {
      toast({
        title: copy.error,
        description: error.message || copy.statusFailed,
        variant: "destructive",
      });
    },
  });

  // Auto-generate slug from title
  const generateSlug = (title: string): string => {
    return title
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  // Handle image upload to S3
  const handleImageUpload = async (file: File, targetField: "featuredImage" | "ogImageAr" = "featuredImage") => {
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      
      const response = await fetch("/api/upload/blog-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (data.success && data.url) {
        form.setValue(targetField, data.url);
        toast({
          title: copy.success,
          description: copy.imageUploaded,
        });
      } else {
        throw new Error(data.message || "Upload failed");
      }
    } catch (error: any) {
      toast({
        title: copy.error,
        description: error.message || copy.imageUploadFailed,
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Open create dialog
  const handleCreate = () => {
    setEditingPost(null);
    setEnabledLanguages([...blogLanguages]);
    setLanguageToRemove(null);
    setActiveTab("en");
    setSubmitAttempted(false);
    form.reset();
    setMarkdownPreview({ en: "", ar: "", tr: "", fa: "" });
    setIsDialogOpen(true);
  };

  // Open edit dialog
  const handleEdit = (post: BlogPostWithTranslations) => {
    setEditingPost(post);
    const availableLanguages = getInitialBlogLanguages(post.translations);
    setEnabledLanguages(availableLanguages);
    setLanguageToRemove(null);
    setActiveTab(availableLanguages[0]);
    setSubmitAttempted(false);
    const enTranslation = post.translations.find(t => t.language === "en");
    const arTranslation = post.translations.find(t => t.language === "ar");
    const trTranslation = post.translations.find(t => t.language === "tr");
    const faTranslation = post.translations.find(t => t.language === "fa");
    
    form.reset({
      authorName: post.authorName,
      featuredImage: post.featuredImage || "",
      tags: post.tags?.join(", ") || "",
      status: post.status,
      publishDate: post.publishDate ? new Date(post.publishDate).toISOString().split('T')[0] : "",
      titleEn: enTranslation?.title || "",
      slugEn: enTranslation?.slug || "",
      excerptEn: enTranslation?.excerpt || "",
      contentEn: enTranslation?.content || "",
      metaTitleEn: enTranslation?.metaTitle || "",
      metaDescriptionEn: enTranslation?.metaDescription || "",
      titleAr: arTranslation?.title || "",
      slugAr: arTranslation?.slug || "",
      excerptAr: arTranslation?.excerpt || "",
      contentAr: arTranslation?.content || "",
      metaTitleAr: arTranslation?.metaTitle || "",
      metaDescriptionAr: arTranslation?.metaDescription || "",
      ogImageAr: arTranslation?.ogImage || "",
      titleTr: trTranslation?.title || "",
      slugTr: trTranslation?.slug || "",
      excerptTr: trTranslation?.excerpt || "",
      contentTr: trTranslation?.content || "",
      metaTitleTr: trTranslation?.metaTitle || "",
      metaDescriptionTr: trTranslation?.metaDescription || "",
      titleFa: faTranslation?.title || "",
      slugFa: faTranslation?.slug || "",
      excerptFa: faTranslation?.excerpt || "",
      contentFa: faTranslation?.content || "",
      metaTitleFa: faTranslation?.metaTitle || "",
      metaDescriptionFa: faTranslation?.metaDescription || "",
    });
    
    setMarkdownPreview({
      en: enTranslation?.content ? marked(enTranslation.content) as string : "",
      ar: arTranslation?.content ? marked(arTranslation.content) as string : "",
      tr: trTranslation?.content ? marked(trTranslation.content) as string : "",
      fa: faTranslation?.content ? marked(faTranslation.content) as string : "",
    });
    
    setIsDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (id: number) => {
    if (confirm(copy.deleteConfirm)) {
      deleteMutation.mutate(id);
    }
  };

  // Handle form submit
  const onSubmit = (data: BlogFormData) => {
    const validation = validateEnabledBlogLanguages(data as unknown as BlogFormTranslationInput, enabledLanguages);
    if (!validation.valid) {
      form.clearErrors();
      for (const { field, language: lang } of validation.missingFields) {
        form.setError(field as keyof BlogFormData, {
          type: "required",
          message: copy.completeLanguage(languageNames[lang][language]),
        });
      }
      setSubmitAttempted(true);
      if (validation.firstInvalidLanguage) setActiveTab(validation.firstInvalidLanguage);
      toast({ title: copy.error, description: formValidationCopy[language], variant: "destructive" });
      return;
    }
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const onInvalid: SubmitErrorHandler<BlogFormData> = (errors) => {
    setSubmitAttempted(true);
    const firstInvalidLanguage = enabledLanguages.find((lang) => {
      return blogLanguageFields(lang).some((field) => field in errors);
    });
    if (firstInvalidLanguage) setActiveTab(firstInvalidLanguage);
    toast({ title: copy.error, description: formValidationCopy[language], variant: "destructive" });
  };

  const invalidLanguages = enabledLanguages.filter((lang) =>
    blogLanguageFields(lang).some((field) => field in form.formState.errors)
  );

  // Get translation for display
  const getTranslation = (post: BlogPostWithTranslations) => {
    const preference: BlogLanguage[] = [language as BlogLanguage, "en", "ar", "tr", "fa"];
    return preference.map((lang) => post.translations.find((t) => t.language === lang)).find(Boolean);
  };

  const requestLanguageRemoval = (lang: BlogLanguage) => {
    if (enabledLanguages.length <= 1) return;
    const existingTranslation = editingPost?.translations.find((translation) => translation.language === lang);
    const hasContent = blogLanguageFields(lang).some((field) => Boolean(form.getValues(field as keyof BlogFormData)?.trim()))
      || Boolean(existingTranslation && [existingTranslation.title, existingTranslation.slug, existingTranslation.excerpt, existingTranslation.content].some((value) => Boolean(value?.trim())));
    if (hasContent && existingTranslation) {
      setLanguageToRemove(lang);
      return;
    }
    setEnabledLanguages((current) => current.filter((item) => item !== lang));
    form.clearErrors([...blogLanguageFields(lang)] as (keyof BlogFormData)[]);
    if (activeTab === lang) setActiveTab(enabledLanguages.find((item) => item !== lang)!);
  };

  const confirmLanguageRemoval = () => {
    if (!languageToRemove) return;
    const lang = languageToRemove;
    setEnabledLanguages((current) => current.filter((item) => item !== lang));
    form.clearErrors([...blogLanguageFields(lang)] as (keyof BlogFormData)[]);
    if (activeTab === lang) setActiveTab(enabledLanguages.find((item) => item !== lang)!);
    setLanguageToRemove(null);
  };

  const addLanguage = (lang: BlogLanguage) => {
    if (!enabledLanguages.includes(lang)) {
      setEnabledLanguages((current) => [...current, lang].sort((a, b) => blogLanguages.indexOf(a) - blogLanguages.indexOf(b)));
      setActiveTab(lang);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {copy.title}
          </h1>
          <p className="text-gray-600 mt-2">
            {copy.subtitle}
          </p>
        </div>
        <Button 
          onClick={handleCreate}
          data-testid="button-create-post"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          {copy.newPost}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {copy.totalPosts}
                </p>
                <p className="text-2xl font-bold text-gray-900">{totalPosts}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {copy.published}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {posts.filter(p => p.status === "published").length}
                </p>
              </div>
              <Eye className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {copy.drafts}
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {posts.filter(p => p.status === "draft").length}
                </p>
              </div>
              <Edit className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {copy.totalViews}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {posts.reduce((sum, p) => sum + (p.viewCount || 0), 0)}
                </p>
              </div>
              <Eye className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            {copy.filters}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search" className="mb-2 block">
                {copy.searchByTitle}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="search"
                  data-testid="input-search"
                  placeholder={copy.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="status-filter" className="mb-2 block">
                {copy.filterByStatus}
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value: "all" | "draft" | "published") => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger id="status-filter" data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {copy.allStatuses}
                  </SelectItem>
                  <SelectItem value="draft">
                    {copy.draft}
                  </SelectItem>
                  <SelectItem value="published">
                    {copy.published}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="tag-filter" className="mb-2 block">
                {copy.filterByTag}
              </Label>
              <Input
                id="tag-filter"
                data-testid="input-tag-filter"
                placeholder={copy.tagPlaceholder}
                value={tagFilter}
                onChange={(e) => {
                  setTagFilter(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {copy.posts}
          </CardTitle>
          <CardDescription>
            {copy.showing(posts.length, totalPosts)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {copy.noPosts}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{copy.postTitle}</TableHead>
                    <TableHead>{copy.status}</TableHead>
                    <TableHead>{copy.publishDate}</TableHead>
                    <TableHead>{copy.views}</TableHead>
                    <TableHead>{copy.tags}</TableHead>
                    <TableHead>{copy.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => {
                    const displayTranslation = getTranslation(post);
                    
                    return (
                      <TableRow key={post.id} data-testid={`row-post-${post.id}`}>
                        <TableCell className="font-medium">
                          {displayTranslation?.title || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            data-testid={`badge-status-${post.id}`}
                            variant={post.status === "published" ? "default" : "secondary"}
                            className={
                              post.status === "published"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {post.status === "published"
                              ? copy.published
                              : copy.draft}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {post.publishDate
                            ? new Date(post.publishDate).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>{post.viewCount || 0}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {post.tags?.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {(post.tags?.length || 0) > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{(post.tags?.length || 0) - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              data-testid={`button-edit-${post.id}`}
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(post)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              data-testid={`button-toggle-publish-${post.id}`}
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                togglePublishMutation.mutate({
                                  id: post.id,
                                  status: post.status === "published" ? "draft" : "published",
                                })
                              }
                              disabled={togglePublishMutation.isPending}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              data-testid={`button-delete-${post.id}`}
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(post.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-600">
                {copy.page(currentPage, totalPages)}
              </p>
              <div className="flex gap-2">
                <Button
                  data-testid="button-prev-page"
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  {copy.previous}
                </Button>
                <Button
                  data-testid="button-next-page"
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  {copy.next}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={direction}>
          <DialogHeader>
            <DialogTitle>
              {editingPost ? copy.editPost : copy.createPost}
            </DialogTitle>
            <DialogDescription>
              {copy.dialogDescription}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
              {/* General Fields */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="authorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{copy.authorName}</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          data-testid="input-author-name"
                          placeholder={copy.authorPlaceholder}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="featuredImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{copy.featuredImage}</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        {copy.imageRecommendation}
                      </p>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <FormControl>
                            <Input 
                              {...field} 
                              data-testid="input-featured-image"
                              placeholder="https://example.com/image.jpg"
                              className="flex-1"
                            />
                          </FormControl>
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              data-testid="input-upload-featured-image"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file);
                              }}
                              disabled={isUploadingImage}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isUploadingImage}
                              data-testid="button-upload-featured-image"
                            >
                              {isUploadingImage ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              <span className="ms-2">{copy.upload}</span>
                            </Button>
                          </div>
                        </div>
                        {field.value && (
                          <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                            <img 
                              src={field.value} 
                              alt="Featured preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{copy.tagsLabel}</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          data-testid="input-tags"
                          placeholder={copy.tagsPlaceholder}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{copy.status}</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">
                              {copy.draft}
                            </SelectItem>
                            <SelectItem value="published">
                              {copy.published}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="publishDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{copy.publishDate}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="date"
                            data-testid="input-publish-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Per-post language selection */}
              <section className="space-y-3 rounded-lg border bg-muted/30 p-4" aria-label={copy.languageHelp}>
                <div>
                  <p className="text-sm font-semibold">{copy.languageHelp}</p>
                  <p className="text-xs text-muted-foreground">{copy.minimumLanguage}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {enabledLanguages.map((lang) => (
                    <div key={lang} className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-sm">
                      <span>{languageNames[lang][language]}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-muted-foreground"
                        onClick={() => requestLanguageRemoval(lang)}
                        disabled={enabledLanguages.length === 1}
                        aria-label={`${copy.removeLanguage}: ${languageNames[lang][language]}`}
                        data-testid={`remove-language-${lang}`}
                      >
                        <X className="h-3 w-3" />
                        <span className="ms-1">{copy.removeLanguage}</span>
                      </Button>
                    </div>
                  ))}
                </div>
                {enabledLanguages.length < blogLanguages.length && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">{copy.addLanguage}:</span>
                    {blogLanguages.filter((lang) => !enabledLanguages.includes(lang)).map((lang) => (
                      <Button key={lang} type="button" size="sm" variant="outline" onClick={() => addLanguage(lang)} data-testid={`add-language-${lang}`}>
                        <Plus className="me-1 h-3 w-3" />
                        {languageNames[lang][language]}
                      </Button>
                    ))}
                  </div>
                )}
              </section>

              {/* Language Tabs */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as BlogLanguage)} className="w-full">
                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${enabledLanguages.length}, minmax(0, 1fr))` }}>
                  {enabledLanguages.includes("en") && <TabsTrigger value="en" data-testid="tab-english">
                    English {submitAttempted && invalidLanguages.includes("en") && <span aria-label="Incomplete" className="text-red-600">!</span>}
                  </TabsTrigger>}
                  {enabledLanguages.includes("ar") && <TabsTrigger value="ar" data-testid="tab-arabic">
                    العربية {submitAttempted && invalidLanguages.includes("ar") && <span aria-label="ناقص" className="text-red-600">!</span>}
                  </TabsTrigger>}
                  {enabledLanguages.includes("tr") && <TabsTrigger value="tr" data-testid="tab-turkish">
                    Türkçe {submitAttempted && invalidLanguages.includes("tr") && <span aria-label="Eksik" className="text-red-600">!</span>}
                  </TabsTrigger>}
                  {enabledLanguages.includes("fa") && <TabsTrigger value="fa" data-testid="tab-persian">
                    فارسی {submitAttempted && invalidLanguages.includes("fa") && <span aria-label="ناقص" className="text-red-600">!</span>}
                  </TabsTrigger>}
                </TabsList>

                {/* English Tab */}
                {enabledLanguages.includes("en") && <TabsContent value="en" className="space-y-4 mt-4" dir="ltr">
                  <FormField
                    control={form.control}
                    name="titleEn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            data-testid="input-title-en"
                            placeholder="Enter English title"
                            onChange={(e) => {
                              field.onChange(e);
                              if (!editingPost) {
                                form.setValue("slugEn", generateSlug(e.target.value));
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slugEn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            data-testid="input-slug-en"
                            placeholder="url-friendly-slug"
                          />
                        </FormControl>
                        <FormDescription>
                          Auto-generated from title
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="excerptEn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Excerpt</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            data-testid="textarea-excerpt-en"
                            placeholder="Brief summary of the post"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contentEn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content (Markdown)</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            data-testid="textarea-content-en"
                            placeholder="Write your content in Markdown format..."
                            rows={10}
                            onChange={(e) => {
                              field.onChange(e);
                              setMarkdownPreview(prev => ({
                                ...prev,
                                en: marked(e.target.value) as string
                              }));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {markdownPreview.en && (
                    <div className="border rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">Preview:</p>
                      <div 
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: markdownPreview.en }}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="metaTitleEn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Title (SEO)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            data-testid="input-meta-title-en"
                            placeholder="SEO meta title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="metaDescriptionEn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Description (SEO)</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            data-testid="textarea-meta-description-en"
                            placeholder="SEO meta description"
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>}

                {/* Arabic Tab */}
                {enabledLanguages.includes("ar") && <TabsContent value="ar" className="space-y-4 mt-4" dir="rtl">
                  <FormField
                    control={form.control}
                    name="titleAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>العنوان</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            data-testid="input-title-ar"
                            placeholder="أدخل العنوان بالعربية"
                            dir="rtl"
                            onChange={(e) => {
                              field.onChange(e);
                              if (!editingPost) {
                                form.setValue("slugAr", generateSlug(e.target.value));
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slugAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الرابط</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            data-testid="input-slug-ar"
                            placeholder="رابط-مناسب-للعنوان"
                          />
                        </FormControl>
                        <FormDescription>
                          يتم إنشاؤه تلقائياً من العنوان
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="excerptAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المقتطف</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            data-testid="textarea-excerpt-ar"
                            placeholder="ملخص موجز للمقالة"
                            rows={3}
                            dir="rtl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contentAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المحتوى (Markdown)</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            data-testid="textarea-content-ar"
                            placeholder="اكتب المحتوى بصيغة Markdown..."
                            rows={10}
                            dir="rtl"
                            onChange={(e) => {
                              field.onChange(e);
                              setMarkdownPreview(prev => ({
                                ...prev,
                                ar: marked(e.target.value) as string
                              }));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {markdownPreview.ar && (
                    <div className="border rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">المعاينة:</p>
                      <div 
                        className="prose max-w-none"
                        dir="rtl"
                        dangerouslySetInnerHTML={{ __html: markdownPreview.ar }}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="metaTitleAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عنوان SEO</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            data-testid="input-meta-title-ar"
                            placeholder="عنوان SEO"
                            dir="rtl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="metaDescriptionAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>وصف SEO</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            data-testid="textarea-meta-description-ar"
                            placeholder="وصف SEO"
                            rows={2}
                            dir="rtl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ogImageAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رابط صورة OG</FormLabel>
                        <p className="text-xs text-muted-foreground" dir="rtl">
                          الحجم الموصى به: 1200 × 630 بكسل (لفيسبوك، لينكدإن، تويتر)
                        </p>
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <FormControl>
                              <Input 
                                {...field} 
                                data-testid="input-og-image-ar"
                                placeholder="https://example.com/og-image.jpg"
                                dir="rtl"
                                className="flex-1"
                              />
                            </FormControl>
                            <div className="relative">
                              <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                data-testid="input-upload-og-image-ar"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(file, "ogImageAr");
                                }}
                                disabled={isUploadingImage}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                disabled={isUploadingImage}
                                data-testid="button-upload-og-image-ar"
                              >
                                {isUploadingImage ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Upload className="w-4 h-4" />
                                )}
                                <span className="ml-2">رفع</span>
                              </Button>
                            </div>
                          </div>
                          {field.value && (
                            <div className="relative w-full h-24 bg-gray-100 rounded-lg overflow-hidden">
                              <img 
                                src={field.value} 
                                alt="OG Image preview"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>}

                {enabledLanguages.includes("tr") && <TabsContent value="tr" className="space-y-4 mt-4">
                  <FormField control={form.control} name="titleTr" render={({ field }) => (
                    <FormItem><FormLabel>Başlık</FormLabel><FormControl><Input {...field} placeholder="Türkçe başlık" onChange={(e) => { field.onChange(e); if (!editingPost) form.setValue("slugTr", generateSlug(e.target.value)); }} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="slugTr" render={({ field }) => (
                    <FormItem><FormLabel>Bağlantı</FormLabel><FormControl><Input {...field} placeholder="turkce-baglanti" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="excerptTr" render={({ field }) => (
                    <FormItem><FormLabel>Özet</FormLabel><FormControl><Textarea {...field} placeholder="Yazının kısa özeti" rows={3} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="contentTr" render={({ field }) => (
                    <FormItem><FormLabel>İçerik (Markdown)</FormLabel><FormControl><Textarea {...field} placeholder="İçeriği Markdown biçiminde yazın..." rows={10} onChange={(e) => { field.onChange(e); setMarkdownPreview(prev => ({ ...prev, tr: marked(e.target.value) as string })); }} /></FormControl><FormMessage /></FormItem>
                  )} />
                  {markdownPreview.tr && <div className="border rounded-lg p-4"><p className="text-sm font-medium mb-2">Önizleme:</p><div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: markdownPreview.tr }} /></div>}
                  <FormField control={form.control} name="metaTitleTr" render={({ field }) => (
                    <FormItem><FormLabel>SEO Başlığı</FormLabel><FormControl><Input {...field} placeholder="SEO başlığı" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="metaDescriptionTr" render={({ field }) => (
                    <FormItem><FormLabel>SEO Açıklaması</FormLabel><FormControl><Textarea {...field} placeholder="SEO açıklaması" rows={2} /></FormControl><FormMessage /></FormItem>
                  )} />
                </TabsContent>}

                {enabledLanguages.includes("fa") && <TabsContent value="fa" className="space-y-4 mt-4" dir="rtl">
                  <FormField control={form.control} name="titleFa" render={({ field }) => (
                    <FormItem><FormLabel>عنوان</FormLabel><FormControl><Input {...field} placeholder="عنوان فارسی" onChange={(e) => { field.onChange(e); if (!editingPost) form.setValue("slugFa", generateSlug(e.target.value)); }} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="slugFa" render={({ field }) => (
                    <FormItem><FormLabel>پیوند</FormLabel><FormControl><Input {...field} placeholder="پیوند-فارسی" dir="ltr" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="excerptFa" render={({ field }) => (
                    <FormItem><FormLabel>خلاصه</FormLabel><FormControl><Textarea {...field} placeholder="خلاصه کوتاه مطلب" rows={3} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="contentFa" render={({ field }) => (
                    <FormItem><FormLabel>محتوا (Markdown)</FormLabel><FormControl><Textarea {...field} placeholder="محتوا را با قالب Markdown بنویسید..." rows={10} onChange={(e) => { field.onChange(e); setMarkdownPreview(prev => ({ ...prev, fa: marked(e.target.value) as string })); }} /></FormControl><FormMessage /></FormItem>
                  )} />
                  {markdownPreview.fa && <div className="border rounded-lg p-4"><p className="text-sm font-medium mb-2">پیش‌نمایش:</p><div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: markdownPreview.fa }} /></div>}
                  <FormField control={form.control} name="metaTitleFa" render={({ field }) => (
                    <FormItem><FormLabel>عنوان سئو</FormLabel><FormControl><Input {...field} placeholder="عنوان سئو" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="metaDescriptionFa" render={({ field }) => (
                    <FormItem><FormLabel>توضیحات سئو</FormLabel><FormControl><Textarea {...field} placeholder="توضیحات سئو" rows={2} /></FormControl><FormMessage /></FormItem>
                  )} />
                </TabsContent>}
              </Tabs>

              {submitAttempted && Object.keys(form.formState.errors).length > 0 && (
                <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
                  {formValidationCopy[language]}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  {copy.cancel}
                </Button>
                <Button
                  type="submit"
                  data-testid="button-save"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {copy.saving}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 me-2" />
                      {copy.save}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={languageToRemove !== null} onOpenChange={(open) => { if (!open) setLanguageToRemove(null); }}>
        <DialogContent dir={direction}>
          <DialogHeader>
            <DialogTitle>{copy.confirmRemoveTitle}</DialogTitle>
            <DialogDescription>
              {languageToRemove && copy.confirmRemoveDescription(languageNames[languageToRemove][language])}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLanguageToRemove(null)}>
              {copy.keepLanguage}
            </Button>
            <Button type="button" variant="destructive" onClick={confirmLanguageRemoval}>
              {copy.confirmRemove(languageToRemove ? languageNames[languageToRemove][language] : "")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
