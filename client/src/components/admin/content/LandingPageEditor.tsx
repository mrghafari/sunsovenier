import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, ImagePlus, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import type { LandingContent, LandingLanguage } from "@shared/landing-content";
import { landingLanguages, landingPackageIds, landingProductIds, defaultLandingContent, landingContentSchema } from "@shared/landing-content";
import { defaultLandingPageSettings, landingTextGroups } from "@shared/landing-page-settings";
import { defaultLandingLayout } from "@shared/landing-layout";
import { landingAboutWindowPanes } from "@shared/landing-about-window";
import { BASE_PRODUCTS, LOCALIZED_PRODUCTS, PACKAGES, type LandingProduct, type PackageId } from "@/pages/landing/catalog";
import { readLocalLanding } from "@/pages/landing/local-editor";
import assets from "@/pages/landing/landing-assets.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import LandingSettingsEditor from "./LandingSettingsEditor";
import LandingBlockBuilder from "./LandingBlockBuilder";
import LandingInquiryList from "./LandingInquiryList";

const key = ["/api/content-management/landing"];
const sourceAssets = (assets as { images: Array<{ url: string }> }).images;
const languages: Array<{ id: LandingLanguage; name: string }> = [
  { id: "en", name: "English" }, { id: "fa", name: "فارسی" }, { id: "ar", name: "العربية" }, { id: "tr", name: "Türkçe" },
];
const visualWords = {
  en: { slide: "Slide", about: "About image", aboutWindow: "About window · Pane", product: "Product image" },
  fa: { slide: "اسلاید", about: "تصویر درباره ما", aboutWindow: "پنجرهٔ درباره ما · قسمت", product: "تصویر محصول" },
  ar: { slide: "الشريحة", about: "صورة من نحن", aboutWindow: "نافذة من نحن · القسم", product: "صورة المنتج" },
  tr: { slide: "Slayt", about: "Hakkımızda görseli", aboutWindow: "Hakkımızda penceresi · Bölüm", product: "Ürün görseli" },
} as const;
const labels = {
  en: { eyebrow: "Momtazchem · Site content", title: "Landing page editor", intro: "Changes stay in draft until saved. Publishing updates the public homepage for every visitor, not just this browser.", dirty: "Unsaved draft", current: "Revision", upToDate: "up to date", reset: "Reset originals", publish: "Save & publish", publishing: "Publishing…", loadTitle: "Landing content could not be loaded", retry: "Retry", shared: "Shared imagery", sharedHint: "Upload prepares a draft; use Save & publish to apply it. Reset an image to its original asset at any time.", textLanguage: "Text language", replace: "Replace", published: "Published. These changes are now visible to every visitor.", uploadReady: "Image ready in draft. Save to publish it.", uploading: "Uploading image…", uploadFailed: "Image upload failed.", saveFailed: "Could not publish changes.", conflict: "Another editor has published a newer revision. Reload to review it before continuing.", reload: "Reload latest", reloadConfirm: "Discard this unsaved draft and load the latest published revision?", resetConfirm: "Reset every landing-page image and text override to the original site defaults? Save the reset to publish it.", resetDraft: "Original defaults restored in draft. Save to publish.", products: "Product-card copy", productsHint: "Edit the selected language. Unset fields continue using the site's original translated copy.", titleField: "Title", short: "Card description", long: "Full description", restore: "Restore source text", delete: "Delete", deleteConfirm: "Delete this card from the homepage?", addTitle: "Add an informational card", addHint: "The card is included in the same shared publishing workflow. Choose one or more packaging types.", packaging: "Packaging options", add: "Add card to draft", required: "A title and at least one packaging option are required.", added: "Card added to draft. Save to publish.", inDraft: "custom card(s) in this draft", specs: "Specifications (one per line)", fallback: "Please try again.", image: "Image", importDraft: "Import previous browser preview → draft", importConfirm: "Replace the current draft with the saved browser preview? Nothing will be published or deleted.", importNone: "No previous browser preview was found.", importDone: "Previous browser preview imported into this draft. Save to publish.", importFailed: "Previous preview could not be imported.", imported: "Importing previous preview…" },
  fa: { eyebrow: "ممتازکم · محتوای سایت", title: "ویرایش صفحه اول", intro: "تغییرات تا زمان ذخیره در پیش‌نویس می‌مانند. انتشار، صفحه اصلی را برای همه بازدیدکنندگان به‌روزرسانی می‌کند؛ نه فقط این مرورگر.", dirty: "پیش‌نویس ذخیره‌نشده", current: "نسخه", upToDate: "به‌روز", reset: "بازنشانی به اصل", publish: "ذخیره و انتشار", publishing: "در حال انتشار…", loadTitle: "بارگذاری محتوای صفحه اول ناموفق بود", retry: "تلاش دوباره", shared: "تصاویر مشترک سایت", sharedHint: "بارگذاری تصویر فقط پیش‌نویس را آماده می‌کند؛ برای اعمال آن ذخیره و انتشار را بزنید. هر تصویر را می‌توانید به فایل اصلی بازگردانید.", textLanguage: "زبان محتوا", replace: "جایگزینی", published: "منتشر شد. این تغییرات اکنون برای همه بازدیدکنندگان قابل مشاهده است.", uploadReady: "تصویر در پیش‌نویس آماده شد. برای انتشار ذخیره کنید.", uploading: "در حال بارگذاری تصویر…", uploadFailed: "بارگذاری تصویر ناموفق بود.", saveFailed: "انتشار تغییرات ناموفق بود.", conflict: "ویرایشگر دیگری نسخه جدیدتری منتشر کرده است. برای بررسی، نسخه جدید را بارگذاری کنید.", reload: "بارگذاری نسخه جدید", reloadConfirm: "پیش‌نویس ذخیره‌نشده حذف و آخرین نسخه منتشرشده بارگذاری شود؟", resetConfirm: "همه تصاویر و متن‌های صفحه اول به نسخه اصلی بازگردند؟ برای انتشار بازنشانی، ذخیره کنید.", resetDraft: "نسخه اصلی در پیش‌نویس بازگردانده شد. برای انتشار ذخیره کنید.", products: "متن کارت‌های محصول", productsHint: "زبان موردنظر را ویرایش کنید. فیلدهای تنظیم‌نشده از متن ترجمه‌شده اصلی سایت استفاده می‌کنند.", titleField: "عنوان", short: "توضیح کارت", long: "توضیحات کامل", restore: "بازگردانی متن اصلی", delete: "حذف", deleteConfirm: "این کارت از صفحه اصلی حذف شود؟", addTitle: "افزودن کارت اطلاع‌رسانی", addHint: "این کارت نیز با همان روند انتشار مشترک منتشر می‌شود. یک یا چند نوع بسته‌بندی انتخاب کنید.", packaging: "گزینه‌های بسته‌بندی", add: "افزودن به پیش‌نویس", required: "عنوان و دست‌کم یک گزینه بسته‌بندی لازم است.", added: "کارت به پیش‌نویس افزوده شد. برای انتشار ذخیره کنید.", inDraft: "کارت سفارشی در پیش‌نویس", specs: "مشخصات (هر مورد در یک خط)", fallback: "لطفاً دوباره تلاش کنید.", image: "تصویر", importDraft: "واردکردن پیش‌نمایش قبلی مرورگر ← پیش‌نویس", importConfirm: "پیش‌نویس فعلی با پیش‌نمایش ذخیره‌شده مرورگر جایگزین شود؟ چیزی منتشر یا حذف نمی‌شود.", importNone: "پیش‌نمایش قبلی مرورگر پیدا نشد.", importDone: "پیش‌نمایش قبلی به پیش‌نویس وارد شد. برای انتشار ذخیره کنید.", importFailed: "واردکردن پیش‌نمایش قبلی ناموفق بود.", imported: "در حال واردکردن پیش‌نمایش قبلی…"},
  ar: { eyebrow: "ممتاز كيم · محتوى الموقع", title: "محرر الصفحة الرئيسية", intro: "تبقى التغييرات مسودة حتى الحفظ. يؤدي النشر إلى تحديث الصفحة الرئيسية لجميع الزوار، وليس هذا المتصفح فقط.", dirty: "مسودة غير محفوظة", current: "الإصدار", upToDate: "محدّث", reset: "استعادة الأصل", publish: "حفظ ونشر", publishing: "جارٍ النشر…", loadTitle: "تعذر تحميل محتوى الصفحة الرئيسية", retry: "إعادة المحاولة", shared: "صور الموقع المشتركة", sharedHint: "رفع الصورة يجهز مسودة؛ استخدم حفظ ونشر لتطبيقها. يمكنك إعادة أي صورة إلى أصلها.", textLanguage: "لغة المحتوى", replace: "استبدال", published: "تم النشر. أصبحت التغييرات مرئية لجميع الزوار.", uploadReady: "الصورة جاهزة في المسودة. احفظ لنشرها.", uploading: "جارٍ رفع الصورة…", uploadFailed: "تعذر رفع الصورة.", saveFailed: "تعذر نشر التغييرات.", conflict: "نشر محرر آخر إصداراً أحدث. أعد التحميل لمراجعته قبل المتابعة.", reload: "تحميل الأحدث", reloadConfirm: "هل تريد تجاهل المسودة غير المحفوظة وتحميل أحدث إصدار منشور؟", resetConfirm: "هل تريد إعادة جميع صور ونصوص الصفحة إلى الإعدادات الأصلية؟ احفظ لنشر الإعادة.", resetDraft: "تمت استعادة الإعدادات الأصلية في المسودة. احفظ للنشر.", products: "نصوص بطاقات المنتجات", productsHint: "حرر اللغة المحددة. تستخدم الحقول غير المعدلة النص الأصلي المترجم للموقع.", titleField: "العنوان", short: "وصف البطاقة", long: "الوصف الكامل", restore: "استعادة النص الأصلي", delete: "حذف", deleteConfirm: "هل تريد حذف هذه البطاقة من الصفحة الرئيسية؟", addTitle: "إضافة بطاقة معلومات", addHint: "تخضع البطاقة لسير النشر المشترك نفسه. اختر نوعاً أو أكثر من التعبئة.", packaging: "خيارات التعبئة", add: "إضافة إلى المسودة", required: "العنوان وخيار تعبئة واحد على الأقل مطلوبان.", added: "أضيفت البطاقة إلى المسودة. احفظ للنشر.", inDraft: "بطاقة مخصصة في المسودة", specs: "المواصفات (سطر لكل بند)", fallback: "يرجى المحاولة مجدداً.", image: "الصورة", importDraft: "استيراد معاينة المتصفح السابقة ← مسودة", importConfirm: "هل تريد استبدال المسودة الحالية بالمعاينة المحفوظة؟ لن يتم نشر أو حذف أي شيء.", importNone: "لم يتم العثور على معاينة سابقة في المتصفح.", importDone: "تم استيراد المعاينة السابقة إلى المسودة. احفظ للنشر.", importFailed: "تعذر استيراد المعاينة السابقة.", imported: "جارٍ استيراد المعاينة السابقة…"},
  tr: { eyebrow: "Momtazchem · Site içeriği", title: "Ana sayfa düzenleyicisi", intro: "Değişiklikler kaydedilene kadar taslakta kalır. Yayınlama, yalnızca bu tarayıcıyı değil tüm ziyaretçilerin ana sayfasını günceller.", dirty: "Kaydedilmemiş taslak", current: "Sürüm", upToDate: "güncel", reset: "Orijinali geri yükle", publish: "Kaydet ve yayınla", publishing: "Yayınlanıyor…", loadTitle: "Ana sayfa içeriği yüklenemedi", retry: "Yeniden dene", shared: "Ortak site görselleri", sharedHint: "Görsel yükleme taslağı hazırlar; uygulamak için Kaydet ve yayınla'yı kullanın. Her görseli özgün dosyasına döndürebilirsiniz.", textLanguage: "İçerik dili", replace: "Değiştir", published: "Yayınlandı. Değişiklikler artık tüm ziyaretçilere görünür.", uploadReady: "Görsel taslakta hazır. Yayınlamak için kaydedin.", uploading: "Görsel yükleniyor…", uploadFailed: "Görsel yüklenemedi.", saveFailed: "Değişiklikler yayınlanamadı.", conflict: "Başka bir editör daha yeni bir sürüm yayınladı. Devam etmeden önce son sürümü yükleyin.", reload: "Son sürümü yükle", reloadConfirm: "Kaydedilmemiş taslağı atıp son yayınlanan sürüm yüklensin mi?", resetConfirm: "Tüm ana sayfa görsel ve metinleri özgün varsayılanlara döndürülsün mü? Yayınlamak için kaydedin.", resetDraft: "Özgün varsayılanlar taslağa geri yüklendi. Yayınlamak için kaydedin.", products: "Ürün kartı metinleri", productsHint: "Seçilen dili düzenleyin. Değiştirilmemiş alanlar sitenin özgün çevirisini kullanır.", titleField: "Başlık", short: "Kart açıklaması", long: "Tam açıklama", restore: "Kaynak metni geri yükle", delete: "Sil", deleteConfirm: "Bu kart ana sayfadan silinsin mi?", addTitle: "Bilgi kartı ekle", addHint: "Kart aynı ortak yayın akışına dahildir. Bir veya daha fazla ambalaj türü seçin.", packaging: "Ambalaj seçenekleri", add: "Taslağa ekle", required: "Başlık ve en az bir ambalaj seçeneği gereklidir.", added: "Kart taslağa eklendi. Yayınlamak için kaydedin.", inDraft: "özel kart taslakta", specs: "Özellikler (her satıra bir tane)", fallback: "Lütfen tekrar deneyin.", image: "Görsel", importDraft: "Önceki tarayıcı önizlemesini içe aktar → taslak", importConfirm: "Geçerli taslak kaydedilmiş tarayıcı önizlemesiyle değiştirilsin mi? Hiçbir şey yayınlanmaz veya silinmez.", importNone: "Önceki tarayıcı önizlemesi bulunamadı.", importDone: "Önceki önizleme taslağa aktarıldı. Yayınlamak için kaydedin.", importFailed: "Önceki önizleme içe aktarılamadı.", imported: "Önceki önizleme içe aktarılıyor…"},
} as const;

async function readLanding(): Promise<LandingContent> {
  const response = await fetch(key[0], { credentials: "include", cache: "no-store" });
  const result = await response.json();
  if (!response.ok || !result.success || !result.data) throw new Error(result.message || "Landing content could not be loaded.");
  const data = result.data as LandingContent;
  const defaults = defaultLandingPageSettings();
  return { ...data, page: { ...defaults, ...(data.page ?? {}), layout: data.page?.layout ?? defaultLandingLayout() } };
}

export default function LandingPageEditor({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const { language: interfaceLanguage } = useLanguage();
  const copy = labels[interfaceLanguage in labels ? interfaceLanguage as keyof typeof labels : "en"];
  const client = useQueryClient();
  const query = useQuery({ queryKey: key, queryFn: readLanding, staleTime: 0 });
  const [draft, setDraft] = useState<LandingContent | null>(null);
  const [language, setLanguage] = useState<LandingLanguage>("en");
  const [message, setMessage] = useState("");
  const [newCard, setNewCard] = useState({ title: "", short: "", long: "", specs: "", pack: [] as PackageId[] });
  const [conflict, setConflict] = useState(false);
  const [builderBusy, setBuilderBusy] = useState(false);
  useEffect(() => { if (query.data && !draft) setDraft(query.data); }, [query.data, draft]);
  const dirty = !!draft && !!query.data && JSON.stringify(draft) !== JSON.stringify(query.data);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  const importPrevious = async () => {
    if (dirty && !window.confirm(copy.importConfirm)) return;
    setMessage(copy.imported);
    try {
      const saved = await readLocalLanding();
      if (!saved) { setMessage(copy.importNone); return; }
      const seenCustomIds = new Set<string>();
      const customs = (saved.custom ?? []).filter((card): card is LandingProduct => {
        if (typeof card.id !== "string" || !/^custom-[a-zA-Z0-9-]{1,80}$/.test(card.id) || !card.title?.trim() || seenCustomIds.has(card.id)) return false;
        seenCustomIds.add(card.id);
        return true;
      }).map((card) => ({
        id: card.id,
        title: card.title.trim().slice(0, 180),
        short: String(card.short ?? "").slice(0, 1200),
        long: String(card.long ?? "").slice(0, 12000),
        specs: (Array.isArray(card.specs) ? card.specs : []).filter((value) => typeof value === "string").slice(0, 20).map((value) => value.slice(0, 500)),
        pack: (Array.isArray(card.pack) ? card.pack : []).filter((value): value is PackageId => landingPackageIds.includes(value as PackageId)).slice(0, 5),
        asset: Number.isInteger(card.asset) && card.asset >= 0 && card.asset <= 9 ? card.asset : 9,
        categoryPath: "/contact" as const,
        custom: true as const,
      })).filter((card) => card.pack.length > 0);
      const knownIds = new Set<string>([...landingProductIds, ...customs.map((card) => card.id)]);
      const images: LandingContent["images"] = {};
      for (const [slot, source] of Object.entries(saved.images ?? {})) {
        if (!knownIds.has(slot) && !/^hero-[0-2]$/.test(slot) && slot !== "about") continue;
        if (typeof source !== "string") continue;
        if (source.startsWith("data:image/")) {
          const blob = await (await fetch(source)).blob();
          const file = new File([blob], `legacy-${slot}`, { type: blob.type || "image/png" });
          images[slot] = await upload(file);
        } else if (/^\/api\/landing-(?:assets|media)\/[a-f0-9]{24,64}\.(?:jpg|png|webp|gif|avif)$/.test(source)) {
          images[slot] = source;
        }
      }
      const edits: NonNullable<LandingContent["edits"][LandingLanguage]> = {};
      for (const [id, fields] of Object.entries(saved.edits ?? {})) {
        if (!knownIds.has(id) || !fields || typeof fields !== "object") continue;
        const normalized: { title?: string; short?: string; long?: string } = {};
        for (const field of ["title", "short", "long"] as const) {
          const value = fields[field];
          if (typeof value === "string" && (field !== "title" || value.trim())) normalized[field] = value.slice(0, field === "title" ? 180 : field === "short" ? 1200 : 12000);
        }
        if (Object.keys(normalized).length) edits[id] = normalized;
      }
       setDraft((current) => {
         if (!current) return current;
         const customIds = new Set(customs.map((card) => card.id));
         const validIds = new Set<string>([...landingProductIds, ...customIds]);
         const validImageKeys = new Set<string>([
           ...validIds,
           ...current.page.slides.map((slide) => `hero-${slide.id}`),
           ...current.page.partners.map((partner) => `partner-${partner.id}`),
            ...current.page.layout.rows.flatMap((row) => row.blocks.filter((block) => block.type === "image").map((block) => `layout-${block.id}`)),
           "about", "seo",
           ...landingAboutWindowPanes.map(pane => pane.key),
         ]);
         const retainedImages = Object.fromEntries(Object.entries(current.images).filter(([slot]) => validImageKeys.has(slot)));
         const retainedEdits = Object.fromEntries(landingLanguages.map((locale) => {
           const source = locale === language ? edits : current.edits[locale] ?? {};
           return [locale, Object.fromEntries(Object.entries(source).filter(([id]) => validIds.has(id)))];
         })) as LandingContent["edits"];
         const cards = Object.fromEntries(Object.entries(current.page.cards).filter(([id]) => validIds.has(id)));
         return {
           ...current,
           images: { ...retainedImages, ...images },
           edits: retainedEdits,
           custom: customs,
           page: { ...current.page, cards },
         };
       });
      setMessage(copy.importDone);
    } catch { setMessage(copy.importFailed); }
  };
  const upload = async (file: File): Promise<string> => {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/content-management/landing/images", { method: "POST", body, credentials: "include" });
    const result = await response.json();
    if (!response.ok || !result.success || !result.data?.url) throw new Error(result.message || "Image upload failed.");
    return result.data.url as string;
  };
  const save = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error("No landing content is loaded.");
      const validation = landingContentSchema.safeParse(draft);
      if (!validation.success) throw new Error(validation.error.issues[0].message);
      const response = await fetch(key[0], { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const result = await response.json();
      if (response.status === 409) { setConflict(true); throw new Error(copy.conflict); }
      if (!response.ok || !result.success || !result.data) throw new Error(result.message || copy.saveFailed);
      const data = result.data as LandingContent;
      return { ...data, page: data.page ?? defaultLandingPageSettings() };
    },
    onSuccess: async (data) => {
      setDraft(data); setConflict(false); setMessage(copy.published);
      await Promise.all([client.invalidateQueries({ queryKey: key }), client.invalidateQueries({ queryKey: ["/api/landing-content"] })]);
    },
    onError: (error) => setMessage(error instanceof Error && error.message === copy.conflict ? copy.conflict : copy.saveFailed),
  });
  const saveDraft = () => {
    if (!draft || builderBusy) return;
    const validation = landingContentSchema.safeParse(draft);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      const path = issue.path.join(".");
      const locale = issue.path[0] === "page" && issue.path[1] === "texts"
        ? issue.path[2]
        : issue.path[0] === "page" && ["stats", "process"].includes(String(issue.path[1]))
          ? issue.path[2]
          : issue.path[1];
      if (typeof locale === "string" && landingLanguages.includes(locale as LandingLanguage)) setLanguage(locale as LandingLanguage);
      setMessage(`تنظیم نامعتبر در «${path}»: ${issue.message} / Invalid setting at “${path}”: ${issue.message}`);
      window.setTimeout(() => {
        const textGroup = issue.path[0] === "page" && issue.path[1] === "texts"
          ? Object.entries(landingTextGroups).find(([, keys]) => keys.includes(String(issue.path[3]) as never))?.[0]
          : undefined;
        const group = textGroup ? `text-${textGroup}` : issue.path[0] === "page" ? issue.path[1] : issue.path[0];
        const target = document.querySelector<HTMLElement>(`[data-setting-group="${String(group)}"]`);
        if (target instanceof HTMLDetailsElement) target.open = true;
        const parent = target?.closest("details");
        if (parent) parent.open = true;
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
      return;
    }
    save.mutate();
  };
  const productMap = useMemo(() => Object.fromEntries(BASE_PRODUCTS.map((item) => [item.id, item])), []);
  const updateText = (id: string, field: "title" | "short" | "long", value: string) => {
    setDraft((current) => current ? { ...current, edits: { ...current.edits, [language]: { ...current.edits[language], [id]: { ...current.edits[language]?.[id], [field]: value } } } } : current);
  };
  const replaceImage = async (slot: string, file?: File) => {
    if (!file) return;
    setMessage(copy.uploading);
    try {
      const url = await upload(file);
      setDraft((current) => current ? { ...current, images: { ...current.images, [slot]: url } } : current);
      setMessage(copy.uploadReady);
    } catch { setMessage(copy.uploadFailed); }
  };
  const addCustom = () => {
    const title = newCard.title.trim();
    if (!title || !newCard.pack.length) { setMessage(copy.required); return; }
    const id = `custom-${Date.now().toString(36)}`;
    const card = { id, title, short: newCard.short.trim(), long: newCard.long.trim(), specs: newCard.specs.split("\n").map((item) => item.trim()).filter(Boolean), pack: newCard.pack, asset: 9, categoryPath: "/contact" as const, custom: true as const };
    setDraft((current) => current ? { ...current, custom: [...current.custom, card] } : current);
    setNewCard({ title: "", short: "", long: "", specs: "", pack: [] }); setMessage(copy.added);
  };
  const originalReset = () => {
    if (!window.confirm(copy.resetConfirm)) return;
    setDraft((current) => current ? { ...defaultLandingContent(), revision: current.revision } : current);
    setMessage(copy.resetDraft);
  };
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  if (query.isLoading) return <div className="space-y-4 p-6" aria-label={copy.title}><div className="h-7 w-56 animate-pulse rounded bg-muted" /><div className="h-36 animate-pulse rounded bg-muted" /><div className="h-36 animate-pulse rounded bg-muted" /></div>;
  if (query.isError || !draft) return <section className="m-5 rounded-xl border border-destructive/30 bg-destructive/5 p-6" role="alert"><h2 className="font-semibold">{copy.loadTitle}</h2><p className="my-2 text-sm text-muted-foreground">{copy.fallback}</p><Button onClick={() => void query.refetch()}>{copy.retry}</Button></section>;
  const visualLocale = interfaceLanguage in visualWords ? interfaceLanguage as keyof typeof visualWords : "en";
  const visual = visualWords[visualLocale];
  const slots: Array<{ key: string; label: string; asset: number; fallbackKey?: string }> = [
    ...draft.page.slides.map((slide, index) => ({ key: `hero-${slide.id}`, label: `${visual.slide} ${index + 1}`, asset: ["0", "1", "2"].includes(slide.id) ? Number(slide.id) : -1 })),
    { key: "about", label: visual.about, asset: 3 },
    ...landingAboutWindowPanes.map((pane, index) => ({ ...pane, label: `${visual.aboutWindow} ${index + 1}` })),
    ...BASE_PRODUCTS.map((product) => {
      const index = BASE_PRODUCTS.findIndex((item) => item.id === product.id);
      const name = LOCALIZED_PRODUCTS[visualLocale]?.[index]?.[0] ?? product.title;
      return { key: product.id, label: `${visual.product}: ${name}`, asset: product.asset };
    }),
    ...draft.custom.map((card) => ({ key: card.id, label: card.title, asset: card.asset })),
    ...draft.page.partners.map((partner) => ({ key: `partner-${partner.id}`, label: `شریک / Partner: ${partner.id}`, asset: -1 })),
    { key: "seo", label: "تصویر سئو / SEO image", asset: -1 },
  ];
  const slotSource = (slot: typeof slots[number]) => draft.images[slot.key]
    || (slot.fallbackKey ? draft.images[slot.fallbackKey] : undefined)
    || (slot.asset >= 0 ? sourceAssets[slot.asset]?.url : undefined);
  return <div className="space-y-6 p-4 md:p-6" dir={interfaceLanguage === "fa" || interfaceLanguage === "ar" ? "rtl" : "ltr"}>
    <header className="flex flex-col justify-between gap-4 rounded-2xl border bg-card p-5 md:flex-row md:items-center">
      <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">{copy.eyebrow}</p><h2 className="mt-1 text-2xl font-semibold">{copy.title}</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy.intro}</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs ${dirty ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{dirty ? copy.dirty : `${copy.current} ${draft.revision} · ${copy.upToDate}`}</span>
        <Button variant="outline" disabled={save.isPending} onClick={() => void importPrevious()}><RotateCcw className="mr-2 h-4 w-4" />{copy.importDraft}</Button>
        <Button variant="outline" disabled={save.isPending} onClick={originalReset}><RotateCcw className="mr-2 h-4 w-4" />{copy.reset}</Button>
         <Button data-testid="landing-save" disabled={!dirty || save.isPending || builderBusy} onClick={saveDraft}><Save className="mr-2 h-4 w-4" />{builderBusy ? copy.uploading : save.isPending ? copy.publishing : copy.publish}</Button>
      </div>
    </header>
     {message && <div role={save.isError || conflict || message.includes("Invalid setting") || message.includes("تنظیم نامعتبر") ? "alert" : "status"} className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${save.isError || conflict || message.includes("Invalid setting") || message.includes("تنظیم نامعتبر") ? "border-destructive/30 bg-destructive/5" : "border-primary/20 bg-primary/5"}`}><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span className="flex-1">{message}</span>{conflict && <Button size="sm" variant="outline" onClick={() => { if (window.confirm(copy.reloadConfirm)) { setDraft(null); setConflict(false); setMessage(""); void query.refetch().then((result) => { if (result.data) setDraft(result.data); }); } }}>{copy.reload}</Button>}</div>}
     <fieldset disabled={save.isPending} className="contents">
     <section data-setting-group="images" className="rounded-xl border bg-card p-4">
       <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">{copy.shared}</h3><p className="text-sm text-muted-foreground">{copy.sharedHint}</p></div><label className="text-sm font-medium">{copy.textLanguage} <select data-testid="landing-language" className="ml-2 rounded-md border bg-background px-3 py-2" value={language} onChange={(event) => setLanguage(event.target.value as LandingLanguage)}>{languages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{slots.map((slot) => <article key={slot.key} data-image-slot={slot.key} className="overflow-hidden rounded-xl border bg-background">
         {slotSource(slot) ? <img className="h-40 w-full object-cover" src={slotSource(slot)} alt={`${slot.label} · ${copy.image}`} /> : <div className="flex h-40 items-center justify-center bg-muted text-xs text-muted-foreground">تصویر هنوز بارگذاری نشده / No image uploaded</div>}
        <div className="flex items-center justify-between gap-2 p-3"><span className="truncate text-sm font-medium">{slot.label}</span><div className="flex gap-1">
           <label className="inline-flex cursor-pointer items-center rounded-md border px-2 py-1.5 text-xs hover:bg-muted"><ImagePlus className="mr-1 h-3.5 w-3.5" />{copy.replace}<input className="sr-only" type="file" accept="image/*" disabled={save.isPending} onChange={(event) => { void replaceImage(slot.key, event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label>
           {draft.images[slot.key] && <Button size="sm" variant="ghost" disabled={save.isPending} aria-label={`${copy.reset} ${slot.label}`} onClick={() => setDraft(current => current ? { ...current, images: Object.fromEntries(Object.entries(current.images).filter(([keyName]) => keyName !== slot.key)) } : current)}>{copy.reset}</Button>}
        </div></div></article>)}</div>
    </section>
      <LandingBlockBuilder
        layout={draft.page.layout ?? defaultLandingLayout()}
        language={language}
        onChange={(layout) => setDraft((current) => current ? { ...current, page: { ...current.page, layout } } : current)}
        images={draft.images}
        uploadImage={upload}
        onBusyChange={setBuilderBusy}
        onRemoveImages={(slots) => setDraft((current) => current ? { ...current, images: Object.fromEntries(Object.entries(current.images).filter(([slot]) => !slots.includes(slot))) } : current)}
        onImageUploaded={(slot, url) => setDraft((current) => {
          if (!current) return current;
          const exists = current.page.layout.rows.some((row) => row.blocks.some((block) => block.type === "image" && `layout-${block.id}` === slot));
          return exists ? { ...current, images: { ...current.images, [slot]: url } } : current;
        })}
        locked={save.isPending}
      />
      <LandingSettingsEditor page={draft.page} language={language} onChange={(page) => setDraft((current) => current ? { ...current, page } : current)} content={draft} onContentChange={(content) => setDraft((current) => current ? { ...current, images: content.images } : current)} onImageUploaded={(slot, url) => setDraft((current) => {
        if (!current) return current;
        const validSlots = new Set([
          ...landingProductIds,
          ...current.custom.map((card) => card.id),
          ...current.page.slides.map((slide) => `hero-${slide.id}`),
          ...current.page.partners.map((partner) => `partner-${partner.id}`),
           ...current.page.layout.rows.flatMap((row) => row.blocks.filter((block) => block.type === "image").map((block) => `layout-${block.id}`)),
          "about",
          ...landingAboutWindowPanes.map(pane => pane.key),
          "seo",
        ]);
        return validSlots.has(slot) ? { ...current, images: { ...current.images, [slot]: url } } : current;
      })} uploadImage={upload} locked={save.isPending || builderBusy} />
     <LandingInquiryList />
     <section data-setting-group="edits" className="space-y-4">
      <div><h3 className="text-lg font-semibold">{copy.products}</h3><p className="text-sm text-muted-foreground">{copy.productsHint}</p></div>
      {[...BASE_PRODUCTS, ...draft.custom].map((item) => {
        const override = draft.edits[language]?.[item.id];
        const englishOverride = draft.edits.en?.[item.id];
        const original = productMap[item.id];
        const text = (field: "title" | "short" | "long") => {
          if (override?.[field] !== undefined) return override[field] as string;
          if (englishOverride?.[field] !== undefined) return englishOverride[field] as string;
          if (original && field !== "long") {
            const translationIndex = BASE_PRODUCTS.findIndex((product) => product.id === item.id);
            return LOCALIZED_PRODUCTS[language]?.[translationIndex]?.[field === "title" ? 0 : 1] ?? original[field];
          }
          return original ? original[field] : item[field];
        };
         return <article key={item.id} className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-[150px_1fr]">
          <img className="h-32 w-full rounded-lg object-cover md:h-full" src={draft.images[item.id] || sourceAssets[item.asset]?.url} alt="" />
          <div className="space-y-3">
             <div className="flex items-center justify-between gap-3"><h4 className="font-semibold">{item.title}</h4>{item.custom && <Button variant="ghost" size="sm" className="text-destructive" disabled={save.isPending} onClick={() => { if (!window.confirm(copy.deleteConfirm)) return; setDraft((current) => current ? { ...current, custom: current.custom.filter((card) => card.id !== item.id), images: Object.fromEntries(Object.entries(current.images).filter(([imageKey]) => imageKey !== item.id)), page: { ...current.page, cards: Object.fromEntries(Object.entries(current.page.cards).filter(([productId]) => productId !== item.id)) }, edits: Object.fromEntries(landingLanguages.map((locale) => [locale, Object.fromEntries(Object.entries(current.edits[locale] ?? {}).filter(([productId]) => productId !== item.id))])) } : current); }}><Trash2 className="mr-1 h-4 w-4" />{copy.delete}</Button>}</div>
            <Input dir={language === "fa" || language === "ar" ? "rtl" : "ltr"} aria-label={`${item.title} ${copy.titleField}`} value={text("title")} onChange={(event) => updateText(item.id, "title", event.target.value)} placeholder={copy.titleField} />
            <Textarea dir={language === "fa" || language === "ar" ? "rtl" : "ltr"} aria-label={`${item.title} ${copy.short}`} value={text("short")} onChange={(event) => updateText(item.id, "short", event.target.value)} placeholder={copy.short} rows={2} />
            <Textarea dir={language === "fa" || language === "ar" ? "rtl" : "ltr"} aria-label={`${item.title} ${copy.long}`} value={text("long")} onChange={(event) => updateText(item.id, "long", event.target.value)} placeholder={copy.long} rows={3} />
            {override && <Button size="sm" variant="outline" onClick={() => setDraft((current) => { if (!current) return current; const localeEdits = { ...current.edits[language] }; delete localeEdits[item.id]; return { ...current, edits: { ...current.edits, [language]: localeEdits } }; })}>{copy.restore}</Button>}
          </div>
        </article>;
      })}
    </section>
     <section data-setting-group="custom" className="rounded-xl border bg-card p-4">
      <div className="mb-4"><h3 className="text-lg font-semibold">{copy.addTitle}</h3><p className="text-sm text-muted-foreground">{copy.addHint}</p></div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input placeholder={copy.titleField} value={newCard.title} onChange={(event) => setNewCard({ ...newCard, title: event.target.value })} />
        <Input placeholder={copy.short} value={newCard.short} onChange={(event) => setNewCard({ ...newCard, short: event.target.value })} />
        <Textarea className="md:col-span-2" placeholder={copy.long} value={newCard.long} onChange={(event) => setNewCard({ ...newCard, long: event.target.value })} />
        <Textarea className="md:col-span-2" placeholder={copy.specs} value={newCard.specs} onChange={(event) => setNewCard({ ...newCard, specs: event.target.value })} />
      </div>
      <fieldset className="my-4"><legend className="mb-2 text-sm font-medium">{copy.packaging}</legend><div className="flex flex-wrap gap-3">{Object.entries(PACKAGES).map(([id, pack]) => <label className="flex items-center gap-2 text-sm" key={id}><input type="checkbox" checked={newCard.pack.includes(id as PackageId)} onChange={(event) => setNewCard((current) => ({ ...current, pack: event.target.checked ? [...current.pack, id as PackageId] : current.pack.filter((value) => value !== id) }))} />{pack.name}</label>)}</div></fieldset>
      <Button variant="outline" onClick={addCustom}><Plus className="mr-2 h-4 w-4" />{copy.add}</Button>
      {draft.custom.length > 0 && <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5" />{draft.custom.length} {copy.inDraft}</p>}
    </section>
     </fieldset>
   </div>;
}
