import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { ArrowLeft, Edit2, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import CategorySamplesEditor from "@/components/admin/CategorySamplesEditor";
import { categorySamples, categorySamplesSchema, type CategorySample } from "@shared/category-samples";
import { apiRequest } from "@/lib/queryClient";

type Language = "en" | "fa" | "ar" | "tr";
type Catalog = {
  title: string; subtitle: string; newCategory: string; categoryName: string; slug: string;
  description: string; imageUrl: string; parentCategory: string; isActive: string;
  displayOrder: string; metaTitle: string; metaDescription: string; save: string; cancel: string;
  edit: string; delete: string; actions: string; createSuccess: string; updateSuccess: string;
  deleteSuccess: string; createError: string; updateError: string; deleteError: string;
  deleteConfirm: string; selectParent: string; none: string; active: string; inactive: string;
  enterName: string; enterSlug: string; enterDescription: string; enterImageUrl: string;
  enterMetaTitle: string; enterMetaDescription: string; createCategoryTitle: string;
  editCategoryTitle: string; backToAdmin: string; loading: string; loadError: string;
  empty: string; emptyHint: string; retry: string; saving: string; deleting: string;
  requiredName: string; requiredSlug: string; close: string;
};

const catalog: Record<Language, Catalog> = {
  en: {
    title: "Product Category Management", subtitle: "Create, edit and manage product categories",
    newCategory: "New Category", categoryName: "Category Name", slug: "Slug", description: "Description",
    imageUrl: "Image URL", parentCategory: "Parent Category", isActive: "Active", displayOrder: "Display Order",
    metaTitle: "Meta Title", metaDescription: "Meta Description", save: "Save", cancel: "Cancel", edit: "Edit",
    delete: "Delete", actions: "Actions", createSuccess: "Category created successfully",
    updateSuccess: "Category updated successfully", deleteSuccess: "Category deleted successfully",
    createError: "Error creating category", updateError: "Error updating category", deleteError: "Error deleting category",
    deleteConfirm: "Are you sure you want to delete this category?", selectParent: "Select parent category",
    none: "None", active: "Active", inactive: "Inactive", enterName: "Enter category name",
    enterSlug: "Enter slug", enterDescription: "Enter description", enterImageUrl: "Enter image URL",
    enterMetaTitle: "Enter meta title", enterMetaDescription: "Enter meta description",
    createCategoryTitle: "Create New Category", editCategoryTitle: "Edit Category", backToAdmin: "Back to Admin",
    loading: "Loading categories…", loadError: "Unable to load categories.", empty: "No categories yet.",
    emptyHint: "Create your first product category to organize the catalog.", retry: "Try again",
    saving: "Saving…", deleting: "Deleting…", requiredName: "Category name is required",
    requiredSlug: "Slug is required", close: "Close",
  },
  fa: {
    title: "مدیریت دسته‌بندی محصولات", subtitle: "دسته‌بندی‌های محصولات را ایجاد، ویرایش و مدیریت کنید",
    newCategory: "دسته‌بندی جدید", categoryName: "نام دسته‌بندی", slug: "نامک", description: "توضیحات",
    imageUrl: "نشانی تصویر", parentCategory: "دسته‌بندی والد", isActive: "فعال", displayOrder: "ترتیب نمایش",
    metaTitle: "عنوان متا", metaDescription: "توضیحات متا", save: "ذخیره", cancel: "لغو", edit: "ویرایش",
    delete: "حذف", actions: "عملیات", createSuccess: "دسته‌بندی با موفقیت ایجاد شد",
    updateSuccess: "دسته‌بندی با موفقیت به‌روزرسانی شد", deleteSuccess: "دسته‌بندی با موفقیت حذف شد",
    createError: "خطا در ایجاد دسته‌بندی", updateError: "خطا در به‌روزرسانی دسته‌بندی", deleteError: "خطا در حذف دسته‌بندی",
    deleteConfirm: "آیا از حذف این دسته‌بندی مطمئن هستید؟", selectParent: "دسته‌بندی والد را انتخاب کنید",
    none: "هیچ‌کدام", active: "فعال", inactive: "غیرفعال", enterName: "نام دسته‌بندی را وارد کنید",
    enterSlug: "نامک را وارد کنید", enterDescription: "توضیحات را وارد کنید", enterImageUrl: "نشانی تصویر را وارد کنید",
    enterMetaTitle: "عنوان متا را وارد کنید", enterMetaDescription: "توضیحات متا را وارد کنید",
    createCategoryTitle: "ایجاد دسته‌بندی جدید", editCategoryTitle: "ویرایش دسته‌بندی", backToAdmin: "بازگشت به مدیریت",
    loading: "در حال بارگذاری دسته‌بندی‌ها…", loadError: "بارگذاری دسته‌بندی‌ها ممکن نیست.", empty: "هنوز دسته‌بندی‌ای وجود ندارد.",
    emptyHint: "برای سازمان‌دهی کاتالوگ، اولین دسته‌بندی محصول را ایجاد کنید.", retry: "تلاش دوباره",
    saving: "در حال ذخیره…", deleting: "در حال حذف…", requiredName: "نام دسته‌بندی الزامی است",
    requiredSlug: "نامک الزامی است", close: "بستن",
  },
  ar: {
    title: "إدارة فئات المنتجات", subtitle: "أنشئ فئات المنتجات وعدّلها وأدرها",
    newCategory: "فئة جديدة", categoryName: "اسم الفئة", slug: "الرابط المختصر", description: "الوصف",
    imageUrl: "رابط الصورة", parentCategory: "الفئة الأصلية", isActive: "نشط", displayOrder: "ترتيب العرض",
    metaTitle: "عنوان الصفحة", metaDescription: "وصف الصفحة", save: "حفظ", cancel: "إلغاء", edit: "تعديل",
    delete: "حذف", actions: "الإجراءات", createSuccess: "تم إنشاء الفئة بنجاح",
    updateSuccess: "تم تحديث الفئة بنجاح", deleteSuccess: "تم حذف الفئة بنجاح",
    createError: "خطأ في إنشاء الفئة", updateError: "خطأ في تحديث الفئة", deleteError: "خطأ في حذف الفئة",
    deleteConfirm: "هل أنت متأكد من حذف هذه الفئة؟", selectParent: "اختر الفئة الأصلية", none: "لا شيء",
    active: "نشط", inactive: "غير نشط", enterName: "أدخل اسم الفئة", enterSlug: "أدخل الرابط المختصر",
    enterDescription: "أدخل الوصف", enterImageUrl: "أدخل رابط الصورة", enterMetaTitle: "أدخل عنوان الصفحة",
    enterMetaDescription: "أدخل وصف الصفحة", createCategoryTitle: "إنشاء فئة جديدة", editCategoryTitle: "تعديل الفئة",
    backToAdmin: "العودة إلى الإدارة", loading: "جارٍ تحميل الفئات…", loadError: "تعذر تحميل الفئات.",
    empty: "لا توجد فئات بعد.", emptyHint: "أنشئ أول فئة لتنظيم الكتالوج.", retry: "حاول مرة أخرى",
    saving: "جارٍ الحفظ…", deleting: "جارٍ الحذف…", requiredName: "اسم الفئة مطلوب", requiredSlug: "الرابط المختصر مطلوب",
    close: "إغلاق",
  },
  tr: {
    title: "Ürün Kategorisi Yönetimi", subtitle: "Ürün kategorileri oluşturun, düzenleyin ve yönetin",
    newCategory: "Yeni Kategori", categoryName: "Kategori Adı", slug: "Kısa Ad", description: "Açıklama",
    imageUrl: "Görsel URL'si", parentCategory: "Üst Kategori", isActive: "Aktif", displayOrder: "Görüntüleme Sırası",
    metaTitle: "Meta Başlık", metaDescription: "Meta Açıklama", save: "Kaydet", cancel: "İptal", edit: "Düzenle",
    delete: "Sil", actions: "İşlemler", createSuccess: "Kategori başarıyla oluşturuldu",
    updateSuccess: "Kategori başarıyla güncellendi", deleteSuccess: "Kategori başarıyla silindi",
    createError: "Kategori oluşturulurken hata oluştu", updateError: "Kategori güncellenirken hata oluştu",
    deleteError: "Kategori silinirken hata oluştu", deleteConfirm: "Bu kategoriyi silmek istediğinizden emin misiniz?",
    selectParent: "Üst kategori seçin", none: "Yok", active: "Aktif", inactive: "Pasif",
    enterName: "Kategori adını girin", enterSlug: "Kısa adı girin", enterDescription: "Açıklama girin",
    enterImageUrl: "Görsel URL'sini girin", enterMetaTitle: "Meta başlığı girin", enterMetaDescription: "Meta açıklamayı girin",
    createCategoryTitle: "Yeni Kategori Oluştur", editCategoryTitle: "Kategoriyi Düzenle", backToAdmin: "Yönetime Dön",
    loading: "Kategoriler yükleniyor…", loadError: "Kategoriler yüklenemedi.", empty: "Henüz kategori yok.",
    emptyHint: "Kataloğu düzenlemek için ilk ürün kategorinizi oluşturun.", retry: "Tekrar dene",
    saving: "Kaydediliyor…", deleting: "Siliniyor…", requiredName: "Kategori adı gereklidir",
    requiredSlug: "Kısa ad gereklidir", close: "Kapat",
  },
};

type CategoryForm = { name: string; slug: string; description?: string; imageUrl?: string; sampleImages?: CategorySample[]; parentId?: number; isActive: boolean; displayOrder: number; metaTitle?: string; metaDescription?: string };
type Category = CategoryForm & { id: number; description: string | null; imageUrl: string | null; parentId: number | null; metaTitle: string | null; metaDescription: string | null; createdAt: string; updatedAt: string };

export default function CategoryManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const t = catalog[language as Language] ?? catalog.en;
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const schema = useMemo(() => z.object({
    name: z.string().min(1, t.requiredName), slug: z.string().min(1, t.requiredSlug),
    description: z.string().optional(), imageUrl: z.string().optional(), parentId: z.number().optional(),
    sampleImages: categorySamplesSchema.optional(),
    isActive: z.boolean().default(true), displayOrder: z.number().default(0),
    metaTitle: z.string().optional(), metaDescription: z.string().optional(),
  }), [t]);
  const { data: categories = [], isLoading, error, refetch } = useQuery<Category[]>({ queryKey: ["/api/admin/categories"] });
  const form = useForm<CategoryForm>({ resolver: zodResolver(schema), defaultValues: { name: "", slug: "", description: "", imageUrl: "", parentId: undefined, isActive: true, displayOrder: 0, metaTitle: "", metaDescription: "" } });
  const categoriesArray = Array.isArray(categories) ? categories : [];
  const parentCategories = categoriesArray.filter((cat) => !cat.parentId);
  const refreshCategories = () => {
    void queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
    void queryClient.invalidateQueries({ queryKey: ["/api/public/categories"] });
    void queryClient.invalidateQueries({ queryKey: ["/api/products"] });
  };
  const numberLocale = { en: "en-US", fa: "fa-IR", ar: "ar-IQ", tr: "tr-TR" }[language as Language] ?? "en-US";
  const formatNumber = (value: number) => new Intl.NumberFormat(numberLocale).format(value);

  const createCategoryMutation = useMutation({
    mutationFn: (data: CategoryForm) => apiRequest("/api/admin/categories", { method: "POST", body: data }),
    onSuccess: () => { refreshCategories(); toast({ title: t.createSuccess, description: t.createSuccess }); setIsDialogOpen(false); form.reset(); },
    onError: (error: Error) => toast({ title: t.createError, description: error.message || t.createError, variant: "destructive" }),
  });
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryForm }) => apiRequest(`/api/admin/categories/${id}`, { method: "PUT", body: data }),
    onSuccess: () => { refreshCategories(); toast({ title: t.updateSuccess, description: t.updateSuccess }); setIsDialogOpen(false); setEditingCategory(null); form.reset(); },
    onError: (error: Error) => toast({ title: t.updateError, description: error.message || t.updateError, variant: "destructive" }),
  });
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => { const response = await fetch(`/api/admin/categories/${id}`, { method: "DELETE", credentials: "include" }); const result = await response.json().catch(() => null); if (!response.ok) throw new Error(result?.message || t.deleteError); return result; },
    onSuccess: async () => { refreshCategories(); toast({ title: t.deleteSuccess, description: t.deleteSuccess }); },
    onError: (error: Error) => toast({ title: t.deleteError, description: error.message || t.deleteError, variant: "destructive" }),
  });
  const generateSlug = (name: string) => name.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const handleEdit = (category: Category) => { setEditingCategory(category); form.reset({ name: category.name, slug: category.slug, description: category.description || "", imageUrl: category.imageUrl || "", sampleImages: categorySamples(category).slice(0, 1), parentId: category.parentId || undefined, isActive: category.isActive, displayOrder: category.displayOrder, metaTitle: category.metaTitle || "", metaDescription: category.metaDescription || "" }); setIsDialogOpen(true); };
  const handleNewCategory = () => { setEditingCategory(null); form.reset(); setIsDialogOpen(true); };
  const handleDelete = (id: number) => { if (confirm(t.deleteConfirm)) deleteCategoryMutation.mutate(id); };
  const pending = createCategoryMutation.isPending || updateCategoryMutation.isPending || uploading;
  const field = (name: keyof CategoryForm, label: string, placeholder: string, multiline = false) => (
    <FormField control={form.control} name={name} render={({ field: input }) => <FormItem><FormLabel>{label}</FormLabel><FormControl>{multiline ? <Textarea {...input} value={input.value as string ?? ""} placeholder={placeholder} rows={3} /> : <Input {...input} value={input.value as string ?? ""} placeholder={placeholder} />}</FormControl><FormMessage /></FormItem>} />
  );

  if (isLoading) return <div className="container mx-auto px-4 py-8" dir={direction} lang={language}><div className="flex min-h-64 items-center justify-center text-muted-foreground" role="status">{t.loading}</div></div>;
  if (error) return <div className="container mx-auto px-4 py-8" dir={direction} lang={language}><div className="flex min-h-64 flex-col items-center justify-center gap-4 text-destructive" role="alert"><p>{t.loadError}</p><Button variant="outline" onClick={() => refetch()}>{t.retry}</Button></div></div>;

  return <div className="container mx-auto px-4 py-8" dir={direction} lang={language}>
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-3xl font-bold">{t.title}</h1><p className="mt-2 text-muted-foreground">{t.subtitle}</p></div>
      <Button variant="outline" className="gap-2 self-start" onClick={() => setLocation("/admin")}><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t.backToAdmin}</Button>
    </div>
    {categoriesArray.length > 0 && <Card className="mb-6" data-testid="category-photo-previews">
      <CardHeader><CardTitle>{language === "fa" ? "عکس‌های تزئینی کتگوری‌ها" : language === "ar" ? "الصور النموذجية للفئات" : language === "tr" ? "Kategori örnek fotoğrafları" : "Category sample photos"}</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{categoriesArray.map(category => {
        const image = categorySamples(category)[0];
        return <button type="button" key={category.id} className="overflow-hidden rounded-lg border bg-background text-start transition-colors hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => handleEdit(category)} aria-label={`${t.edit}: ${category.name}`} data-testid={`category-photo-preview-${category.id}`}>
          {image ? <img src={image.imageUrl} alt={image.title || category.name} className="h-24 w-full object-cover" loading="lazy" /> : <div className="flex h-24 items-center justify-center bg-muted text-muted-foreground"><ImageIcon className="h-8 w-8" aria-hidden="true" /></div>}
          <span className="block px-3 py-2 text-sm font-medium">{category.name}</span>
        </button>;
      })}</CardContent>
    </Card>}
    <div className="mb-6"><Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogTrigger asChild><Button onClick={handleNewCategory} className="gap-2"><Plus className="h-4 w-4" aria-hidden="true" />{t.newCategory}</Button></DialogTrigger>
      <DialogContent dir={direction} lang={language} aria-describedby={undefined} className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{editingCategory ? t.editCategoryTitle : t.createCategoryTitle}</DialogTitle></DialogHeader>
        <Form {...form}><form onSubmit={form.handleSubmit((values) => {
          const sampleImages = (values.sampleImages ?? []).slice(0, 1);
          const data = { ...values, sampleImages, imageUrl: sampleImages[0]?.imageUrl ?? "" };
          if (editingCategory) updateCategoryMutation.mutate({ id: editingCategory.id, data });
          else createCategoryMutation.mutate(data);
        })} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField control={form.control} name="name" render={({ field: input }) => <FormItem><FormLabel>{t.categoryName}</FormLabel><FormControl><Input {...input} placeholder={t.enterName} onChange={(event) => { input.onChange(event); if (!editingCategory) form.setValue("slug", generateSlug(event.target.value)); }} /></FormControl><FormMessage /></FormItem>} />
            {field("slug", t.slug, t.enterSlug)}
          </div>
          {field("description", t.description, t.enterDescription, true)}
          <FormField control={form.control} name="sampleImages" render={({ field: input }) => <FormItem><CategorySamplesEditor value={input.value ?? []} onChange={input.onChange} categoryId={editingCategory?.id} language={language} disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending} onBusyChange={setUploading} /><FormMessage /></FormItem>} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField control={form.control} name="parentId" render={({ field: input }) => <FormItem><FormLabel>{t.parentCategory}</FormLabel><Select onValueChange={(value) => input.onChange(value === "none" ? undefined : parseInt(value))} value={input.value?.toString() || "none"}><FormControl><SelectTrigger aria-label={t.selectParent}><SelectValue placeholder={t.selectParent} /></SelectTrigger></FormControl><SelectContent dir={direction}><SelectItem value="none">{t.none}</SelectItem>{parentCategories.map((category) => <SelectItem key={category.id} value={category.id.toString()}>{category.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
            <FormField control={form.control} name="displayOrder" render={({ field: input }) => <FormItem><FormLabel>{t.displayOrder}</FormLabel><FormControl><Input type="number" {...input} onChange={(e) => input.onChange(parseInt(e.target.value))} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="isActive" render={({ field: input }) => <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><FormLabel>{t.isActive}</FormLabel><FormControl><Switch aria-label={t.isActive} checked={input.value} onCheckedChange={input.onChange} /></FormControl></FormItem>} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{field("metaTitle", t.metaTitle, t.enterMetaTitle)}{field("metaDescription", t.metaDescription, t.enterMetaDescription, true)}</div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t.cancel}</Button><Button type="submit" disabled={pending}>{pending ? t.saving : t.save}</Button></div>
        </form></Form>
      </DialogContent>
    </Dialog></div>
    <Card><CardHeader><CardTitle>{t.title}</CardTitle></CardHeader><CardContent>
      <Table><TableHeader><TableRow><TableHead>{t.categoryName}</TableHead><TableHead>{t.slug}</TableHead><TableHead>{t.parentCategory}</TableHead><TableHead>{t.isActive}</TableHead><TableHead>{t.displayOrder}</TableHead><TableHead>{t.actions}</TableHead></TableRow></TableHeader>
        <TableBody>{categoriesArray.length === 0 ? <TableRow><TableCell colSpan={6} className="h-40 text-center"><div className="space-y-2"><p className="font-medium">{t.empty}</p><p className="text-sm text-muted-foreground">{t.emptyHint}</p></div></TableCell></TableRow> : categoriesArray.map((category) => <TableRow key={category.id}><TableCell className="font-medium">{category.name}</TableCell><TableCell className="text-muted-foreground">{category.slug}</TableCell><TableCell>{category.parentId ? categoriesArray.find((c) => c.id === category.parentId)?.name || t.none : t.none}</TableCell><TableCell><Badge variant={category.isActive ? "default" : "secondary"}>{category.isActive ? t.active : t.inactive}</Badge></TableCell><TableCell>{formatNumber(category.displayOrder)}</TableCell><TableCell><div className="flex items-center gap-2"><Button variant="ghost" size="sm" className="gap-1" onClick={() => handleEdit(category)}><Edit2 className="h-4 w-4" aria-hidden="true" />{t.edit}</Button><Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={() => handleDelete(category.id)} disabled={deleteCategoryMutation.isPending} aria-label={`${t.delete}: ${category.name}`}><Trash2 className="h-4 w-4" aria-hidden="true" />{deleteCategoryMutation.isPending ? t.deleting : t.delete}</Button></div></TableCell></TableRow>)}</TableBody>
      </Table>
    </CardContent></Card>
  </div>;
}