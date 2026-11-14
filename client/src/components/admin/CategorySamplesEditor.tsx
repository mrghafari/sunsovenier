import { useId, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { categorySampleSchema, type CategorySample } from "@shared/category-samples";

const words = {
  en: { heading: "Category decorative photo", hint: "One photo is shown for this category. Upload or enter a URL to replace it, then save.", upload: "Upload photo", first: "Save the new category first to enable file uploads.", url: "Image URL", add: "Set photo", title: "Photo title", description: "Photo description", remove: "Remove photo", limit: "Select one photo.", failed: "Image upload failed.", busy: "Uploading…" },
  fa: { heading: "عکس تزئینی کتگوری", hint: "برای این کتگوری یک عکس نمایش داده می‌شود. برای تعویض، عکس آپلود کنید یا نشانی بدهید و سپس ذخیره کنید.", upload: "آپلود عکس", first: "برای فعال شدن آپلود، ابتدا کتگوری جدید را ذخیره کنید.", url: "نشانی عکس", add: "انتخاب عکس", title: "عنوان عکس", description: "توضیحات عکس", remove: "حذف عکس", limit: "یک عکس انتخاب کنید.", failed: "آپلود عکس ناموفق بود.", busy: "در حال آپلود…" },
  ar: { heading: "صورة الفئة التزيينية", hint: "تظهر صورة واحدة لهذه الفئة. ارفع صورة أو أدخل رابطاً لاستبدالها ثم احفظ.", upload: "رفع صورة", first: "احفظ الفئة الجديدة أولاً لتفعيل رفع الملفات.", url: "رابط الصورة", add: "اختيار الصورة", title: "عنوان الصورة", description: "وصف الصورة", remove: "إزالة الصورة", limit: "اختر صورة واحدة.", failed: "تعذر رفع الصورة.", busy: "جارٍ الرفع…" },
  tr: { heading: "Kategori dekoratif fotoğrafı", hint: "Bu kategori için bir fotoğraf gösterilir. Değiştirmek için yükleyin veya URL girin, ardından kaydedin.", upload: "Fotoğraf yükle", first: "Dosya yüklemek için önce yeni kategoriyi kaydedin.", url: "Görsel URL'si", add: "Fotoğrafı seç", title: "Fotoğraf başlığı", description: "Fotoğraf açıklaması", remove: "Fotoğrafı kaldır", limit: "Bir fotoğraf seçin.", failed: "Görsel yüklenemedi.", busy: "Yükleniyor…" },
};

export default function CategorySamplesEditor({ value, onChange, categoryId, language, disabled, onBusyChange }: {
  value: CategorySample[]; onChange: (value: CategorySample[]) => void; categoryId?: number;
  language: string; disabled?: boolean; onBusyChange: (busy: boolean) => void;
}) {
  const t = words[language as keyof typeof words] ?? words.en;
  const id = useId();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = disabled || busy;
  const addUrl = () => {
    const result = categorySampleSchema.safeParse({ ...value[0], id: value[0]?.id ?? crypto.randomUUID(), imageUrl: url });
    if (!result.success) { setError(t.url); return; }
    onChange([result.data]); setUrl(""); setError("");
  };
  const upload = async (files: File[]) => {
    if (!categoryId || !files.length) return;
    if (files.length > 1) { setError(t.limit); return; }
    setBusy(true); onBusyChange(true); setError("");
    const added: CategorySample[] = [];
    try {
      for (const file of files) {
        const body = new FormData(); body.append("image", file);
        const response = await fetch(`/api/admin/categories/${categoryId}/image?sample=1`, { method: "POST", credentials: "include", body });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success || !result.url) throw new Error(result?.message || t.failed);
        added.push(categorySampleSchema.parse({ ...value[0], id: value[0]?.id ?? crypto.randomUUID(), imageUrl: result.url }));
      }
      onChange(added);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t.failed); }
    finally { setBusy(false); onBusyChange(false); }
  };
  return <section className="space-y-4 rounded-lg border border-blue-300 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/30" data-testid="category-samples-editor">
    <div><h3 className="font-semibold">{t.heading}</h3><p className="text-sm text-muted-foreground">{t.hint}</p></div>
    {value.slice(0, 1).map(sample => <div key={sample.id} className="space-y-3 rounded-lg border bg-background p-3" data-testid="category-sample-row">
      <img src={sample.imageUrl} alt={sample.title} className="h-32 w-full rounded object-cover" />
      <Label htmlFor={`${id}-${sample.id}-title`}>{t.title}</Label>
      <Input id={`${id}-${sample.id}-title`} value={sample.title} maxLength={180} disabled={locked} onChange={event => onChange(value.map(item => item.id === sample.id ? { ...item, title: event.target.value } : item))} />
      <Label htmlFor={`${id}-${sample.id}-description`}>{t.description}</Label>
      <Textarea id={`${id}-${sample.id}-description`} value={sample.description} maxLength={4000} disabled={locked} onChange={event => onChange(value.map(item => item.id === sample.id ? { ...item, description: event.target.value } : item))} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={locked} onClick={() => onChange(value.filter(item => item.id !== sample.id))}><Trash2 className="me-1 h-4 w-4" />{t.remove}</Button>
      </div>
    </div>)}
    <div className="flex flex-wrap items-end gap-2"><div className="min-w-0 flex-1"><Label htmlFor={`${id}-url`}>{t.url}</Label><Input id={`${id}-url`} dir="ltr" value={url} disabled={locked} onChange={event => setUrl(event.target.value)} placeholder="https://…" /></div><Button type="button" variant="outline" disabled={locked || !url.trim()} onClick={addUrl}>{t.add}</Button></div>
    <div><Label htmlFor={`${id}-upload`} className="mb-2 flex items-center gap-2"><Upload className="h-4 w-4" />{busy ? t.busy : t.upload}</Label><Input id={`${id}-upload`} type="file" accept="image/png,image/jpeg,image/webp" disabled={locked || !categoryId} onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void upload(files); }} />{!categoryId && <p className="mt-1 text-sm text-muted-foreground">{t.first}</p>}</div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}
