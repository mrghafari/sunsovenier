import { useId, useState } from "react";
import { ArrowDown, ArrowUp, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { categorySampleSchema, type CategorySample } from "@shared/category-samples";

const words = {
  en: { heading: "Homepage sample photos", hint: "Photos appear below this category on the homepage, in this order.", upload: "Upload photos", first: "Save the new category first to enable file uploads.", url: "Image URL", add: "Add image", title: "Photo title", description: "Photo description", remove: "Remove photo", up: "Move up", down: "Move down", limit: "Maximum 24 photos per category.", failed: "Image upload failed.", busy: "Uploading…" },
  fa: { heading: "عکس‌های نمونهٔ صفحهٔ اول", hint: "عکس‌ها با همین ترتیب زیر این کتگوری در صفحهٔ اول نمایش داده می‌شوند.", upload: "آپلود عکس‌ها", first: "برای فعال شدن آپلود، ابتدا کتگوری جدید را ذخیره کنید.", url: "نشانی عکس", add: "افزودن عکس", title: "عنوان عکس", description: "توضیحات عکس", remove: "حذف عکس", up: "انتقال به بالا", down: "انتقال به پایین", limit: "حداکثر ۲۴ عکس برای هر کتگوری.", failed: "آپلود عکس ناموفق بود.", busy: "در حال آپلود…" },
  ar: { heading: "صور نموذجية للصفحة الرئيسية", hint: "تظهر الصور تحت هذه الفئة على الصفحة الرئيسية بهذا الترتيب.", upload: "رفع الصور", first: "احفظ الفئة الجديدة أولاً لتفعيل رفع الملفات.", url: "رابط الصورة", add: "إضافة صورة", title: "عنوان الصورة", description: "وصف الصورة", remove: "إزالة الصورة", up: "نقل لأعلى", down: "نقل لأسفل", limit: "٢٤ صورة كحد أقصى لكل فئة.", failed: "تعذر رفع الصورة.", busy: "جارٍ الرفع…" },
  tr: { heading: "Ana sayfa örnek fotoğrafları", hint: "Fotoğraflar ana sayfada bu kategorinin altında bu sırayla görünür.", upload: "Fotoğraf yükle", first: "Dosya yüklemek için önce yeni kategoriyi kaydedin.", url: "Görsel URL'si", add: "Görsel ekle", title: "Fotoğraf başlığı", description: "Fotoğraf açıklaması", remove: "Fotoğrafı kaldır", up: "Yukarı taşı", down: "Aşağı taşı", limit: "Kategori başına en fazla 24 fotoğraf.", failed: "Görsel yüklenemedi.", busy: "Yükleniyor…" },
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
    const result = categorySampleSchema.safeParse({ id: crypto.randomUUID(), imageUrl: url });
    if (value.length >= 24) { setError(t.limit); return; }
    if (!result.success) { setError(t.url); return; }
    onChange([...value, result.data]); setUrl(""); setError("");
  };
  const upload = async (files: File[]) => {
    if (!categoryId || !files.length) return;
    if (value.length + files.length > 24) { setError(t.limit); return; }
    setBusy(true); onBusyChange(true); setError("");
    const added: CategorySample[] = [];
    try {
      for (const file of files) {
        const body = new FormData(); body.append("image", file);
        const response = await fetch(`/api/admin/categories/${categoryId}/image?sample=1`, { method: "POST", credentials: "include", body });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success || !result.url) throw new Error(result?.message || t.failed);
        added.push(categorySampleSchema.parse({ id: crypto.randomUUID(), imageUrl: result.url }));
      }
      onChange([...value, ...added]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t.failed); }
    finally { setBusy(false); onBusyChange(false); }
  };
  const move = (index: number, offset: number) => {
    const next = [...value]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; onChange(next);
  };
  return <section className="space-y-4 rounded-lg border border-blue-300 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/30" data-testid="category-samples-editor">
    <div><h3 className="font-semibold">{t.heading}</h3><p className="text-sm text-muted-foreground">{t.hint}</p></div>
    {value.map((sample, index) => <div key={sample.id} className="space-y-3 rounded-lg border bg-background p-3" data-testid="category-sample-row">
      <img src={sample.imageUrl} alt={sample.title} className="h-32 w-full rounded object-cover" />
      <Label htmlFor={`${id}-${sample.id}-title`}>{t.title}</Label>
      <Input id={`${id}-${sample.id}-title`} value={sample.title} maxLength={180} disabled={locked} onChange={event => onChange(value.map(item => item.id === sample.id ? { ...item, title: event.target.value } : item))} />
      <Label htmlFor={`${id}-${sample.id}-description`}>{t.description}</Label>
      <Textarea id={`${id}-${sample.id}-description`} value={sample.description} maxLength={4000} disabled={locked} onChange={event => onChange(value.map(item => item.id === sample.id ? { ...item, description: event.target.value } : item))} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={locked || index === 0} aria-label={t.up} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
        <Button type="button" variant="outline" size="sm" disabled={locked || index === value.length - 1} aria-label={t.down} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
        <Button type="button" variant="outline" size="sm" disabled={locked} onClick={() => onChange(value.filter(item => item.id !== sample.id))}><Trash2 className="me-1 h-4 w-4" />{t.remove}</Button>
      </div>
    </div>)}
    <div className="flex flex-wrap items-end gap-2"><div className="min-w-0 flex-1"><Label htmlFor={`${id}-url`}>{t.url}</Label><Input id={`${id}-url`} dir="ltr" value={url} disabled={locked} onChange={event => setUrl(event.target.value)} placeholder="https://…" /></div><Button type="button" variant="outline" disabled={locked || !url.trim()} onClick={addUrl}>{t.add}</Button></div>
    <div><Label htmlFor={`${id}-upload`} className="mb-2 flex items-center gap-2"><Upload className="h-4 w-4" />{busy ? t.busy : t.upload}</Label><Input id={`${id}-upload`} type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={locked || !categoryId || value.length >= 24} onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void upload(files); }} />{!categoryId && <p className="mt-1 text-sm text-muted-foreground">{t.first}</p>}</div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}
