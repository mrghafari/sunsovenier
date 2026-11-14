import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { faqContentSchema, type FaqContent } from "@shared/faq-content";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";

const faqKey = ["/api/content-management/faq"];
const languages = [
  { id: "en", label: "English", name: "English" },
  { id: "fa", label: "فارسی", name: "فارسی" },
  { id: "ar", label: "العربية", name: "العربية" },
  { id: "tr", label: "Türkçe", name: "Türkçe" },
] as const;
type FaqLanguage = typeof languages[number]["id"];
type Translation = { question: string; answer: string; moreInfoUrl?: string };

const linkCopy = {
  en: { label: "More details link (optional)", hint: "Enter a web address such as www.momtazchem.com, a full http(s) URL, or /shop. Leave empty to hide the link.", invalid: "Enter a valid details link, such as www.momtazchem.com or /shop." },
  fa: { label: "لینک جزئیات بیشتر (اختیاری)", hint: "آدرسی مانند www.momtazchem.com، لینک کامل با http یا https، یا مسیر داخلی مانند /shop وارد کنید. برای پنهان شدن لینک، خالی بگذارید.", invalid: "لینک جزئیات معتبر وارد کنید؛ مانند www.momtazchem.com یا /shop." },
  ar: { label: "رابط المزيد من التفاصيل (اختياري)", hint: "أدخل عنواناً مثل www.momtazchem.com أو رابط http(s) كاملاً أو /shop. اتركه فارغاً لإخفائه.", invalid: "أدخل رابط تفاصيل صالحاً مثل www.momtazchem.com أو /shop." },
  tr: { label: "Ayrıntı bağlantısı (isteğe bağlı)", hint: "www.momtazchem.com, tam http(s) adresi veya /shop girin. Gizlemek için boş bırakın.", invalid: "www.momtazchem.com veya /shop gibi geçerli bir bağlantı girin." },
};

const copy = {
  en: { title: "Frequently asked questions", intro: "Manage answers shown to customers. Changes remain a draft until you save.", language: "Edit language", add: "Add question", save: "Save changes", saving: "Saving…", dirty: "Unsaved changes", clean: "Saved revision", active: "Visible to customers", inactive: "Hidden from customers", question: "Question", answer: "Answer", questionHint: "Write a clear, customer-facing question.", answerHint: "Provide a useful answer for customers.", delete: "Delete", deleteConfirm: "Delete this FAQ from the draft?", up: "Move up", down: "Move down", loadError: "FAQ content could not be loaded.", retry: "Try again", saveError: "Changes could not be saved. Please try again.", noItems: "No FAQs yet. Add the first customer question.", max: "You can add up to 100 questions.", complete: "Add at least one complete question and answer language before saving.", validation: "Check the FAQ text and try again.", saved: "FAQ changes saved.", maxQuestion: "500 characters maximum", maxAnswer: "10,000 characters maximum" },
  fa: { title: "سوالات متداول", intro: "پاسخ‌های نمایش‌داده‌شده به مشتریان را مدیریت کنید. تغییرات تا زمان ذخیره پیش‌نویس می‌مانند.", language: "زبان ویرایش", add: "افزودن پرسش", save: "ذخیره تغییرات", saving: "در حال ذخیره…", dirty: "تغییرات ذخیره‌نشده", clean: "نسخه ذخیره‌شده", active: "نمایش به مشتریان", inactive: "پنهان از مشتریان", question: "پرسش", answer: "پاسخ", questionHint: "پرسشی روشن و مناسب مشتری بنویسید.", answerHint: "پاسخی مفید برای مشتریان بنویسید.", delete: "حذف", deleteConfirm: "این پرسش از پیش‌نویس حذف شود؟", up: "انتقال به بالا", down: "انتقال به پایین", loadError: "بارگذاری سوالات متداول ناموفق بود.", retry: "تلاش دوباره", saveError: "ذخیره تغییرات ناموفق بود. دوباره تلاش کنید.", noItems: "هنوز پرسشی ثبت نشده است. نخستین پرسش مشتری را اضافه کنید.", max: "حداکثر ۱۰۰ پرسش قابل افزودن است.", complete: "برای ذخیره، دست‌کم یک زبان با پرسش و پاسخ کامل وارد کنید.", validation: "متن سوالات را بررسی و دوباره تلاش کنید.", saved: "تغییرات سوالات متداول ذخیره شد.", maxQuestion: "حداکثر ۵۰۰ نویسه", maxAnswer: "حداکثر ۱۰٬۰۰۰ نویسه" },
  ar: { title: "الأسئلة الشائعة", intro: "أدر الإجابات المعروضة للعملاء. تبقى التغييرات مسودة حتى حفظها.", language: "لغة التحرير", add: "إضافة سؤال", save: "حفظ التغييرات", saving: "جارٍ الحفظ…", dirty: "تغييرات غير محفوظة", clean: "الإصدار المحفوظ", active: "ظاهر للعملاء", inactive: "مخفي عن العملاء", question: "السؤال", answer: "الإجابة", questionHint: "اكتب سؤالاً واضحاً موجهاً للعملاء.", answerHint: "اكتب إجابة مفيدة للعملاء.", delete: "حذف", deleteConfirm: "هل تريد حذف هذا السؤال من المسودة؟", up: "تحريك لأعلى", down: "تحريك لأسفل", loadError: "تعذر تحميل الأسئلة الشائعة.", retry: "إعادة المحاولة", saveError: "تعذر حفظ التغييرات. حاول مرة أخرى.", noItems: "لا توجد أسئلة بعد. أضف سؤال العميل الأول.", max: "يمكن إضافة ١٠٠ سؤال كحد أقصى.", complete: "أكمل سؤالاً وإجابة بلغة واحدة على الأقل قبل الحفظ.", validation: "تحقق من نص الأسئلة وحاول مرة أخرى.", saved: "تم حفظ تغييرات الأسئلة الشائعة.", maxQuestion: "الحد الأقصى ٥٠٠ حرف", maxAnswer: "الحد الأقصى ١٠٬٠٠٠ حرف" },
  tr: { title: "Sık sorulan sorular", intro: "Müşterilere gösterilen yanıtları yönetin. Değişiklikler kaydedilene kadar taslakta kalır.", language: "Düzenleme dili", add: "Soru ekle", save: "Değişiklikleri kaydet", saving: "Kaydediliyor…", dirty: "Kaydedilmemiş değişiklikler", clean: "Kaydedilen sürüm", active: "Müşterilere görünür", inactive: "Müşterilerden gizli", question: "Soru", answer: "Yanıt", questionHint: "Müşterilere yönelik açık bir soru yazın.", answerHint: "Müşteriler için yararlı bir yanıt yazın.", delete: "Sil", deleteConfirm: "Bu soru taslaktan silinsin mi?", up: "Yukarı taşı", down: "Aşağı taşı", loadError: "Sık sorulan sorular yüklenemedi.", retry: "Yeniden dene", saveError: "Değişiklikler kaydedilemedi. Lütfen tekrar deneyin.", noItems: "Henüz soru yok. İlk müşteri sorusunu ekleyin.", max: "En fazla 100 soru ekleyebilirsiniz.", complete: "Kaydetmeden önce en az bir dilde soru ve yanıtı tamamlayın.", validation: "Soru metinlerini kontrol edip tekrar deneyin.", saved: "SSS değişiklikleri kaydedildi.", maxQuestion: "En fazla 500 karakter", maxAnswer: "En fazla 10.000 karakter" },
} as const;
type CopyLocale = keyof typeof copy;

function normalizeContent(value: FaqContent): FaqContent {
  return {
    revision: value.revision,
    items: value.items.map((item) => {
      const translations: FaqContent["items"][number]["translations"] = {};
      for (const language of languages) {
        const source = item.translations[language.id];
        if (source && (source.question.trim() || source.answer.trim() || source.moreInfoUrl?.trim())) {
          translations[language.id] = { question: source.question.trim(), answer: source.answer.trim(), ...(source.moreInfoUrl?.trim() ? { moreInfoUrl: source.moreInfoUrl.trim() } : {}) };
        }
      }
      return { ...item, translations };
    }),
  };
}

async function readFaq(): Promise<FaqContent> {
  const response = await apiRequest("/api/content-management/faq", { method: "GET" });
  if (!response?.success || !response.data) throw new Error(response?.message || "FAQ content unavailable");
  return response.data as FaqContent;
}

export default function FaqEditor({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const { language: interfaceLanguage } = useLanguage();
  const text = copy[(interfaceLanguage in copy ? interfaceLanguage : "en") as CopyLocale];
  const linkText = linkCopy[(interfaceLanguage in linkCopy ? interfaceLanguage : "en") as CopyLocale];
  const rtlUi = interfaceLanguage === "fa" || interfaceLanguage === "ar";
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: faqKey, queryFn: readFaq, staleTime: 0 });
  const [draft, setDraft] = useState<FaqContent | null>(null);
  const [editLanguage, setEditLanguage] = useState<FaqLanguage>(
    languages.some(entry => entry.id === interfaceLanguage) ? interfaceLanguage as FaqLanguage : "en",
  );
  const [notice, setNotice] = useState("");
  const initialized = useRef(false);
  const savedSnapshot = useRef("");

  useEffect(() => {
    if (query.data && !initialized.current) {
      initialized.current = true;
      setDraft(query.data);
      savedSnapshot.current = JSON.stringify(query.data);
    }
  }, [query.data]);

  const dirty = !!draft && initialized.current && JSON.stringify(draft) !== savedSnapshot.current;
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => {
      if (dirty) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);

  const completeCount = useMemo(() => draft?.items.filter((item) =>
    languages.some(({ id }) => {
      const translation = item.translations[id];
      return !!translation?.question.trim() && !!translation?.answer.trim();
    }),
  ).length ?? 0, [draft]);

  const save = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error("FAQ draft not loaded");
      const payload = normalizeContent(draft);
      const parsed = faqContentSchema.safeParse(payload);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const invalidLanguage = issue.path[3];
        if (languages.some(entry => entry.id === invalidLanguage)) setEditLanguage(invalidLanguage as FaqLanguage);
        if (issue.path.at(-1) === "moreInfoUrl") throw new Error("link");
        throw new Error("validation");
      }
      const response = await apiRequest("/api/content-management/faq", { method: "PUT", body: parsed.data });
      if (!response?.success || !response.data) throw new Error(response?.message || "save");
      return response.data as FaqContent;
    },
    onSuccess: async (saved) => {
      setDraft(saved);
      savedSnapshot.current = JSON.stringify(saved);
      setNotice(text.saved);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: faqKey }),
        queryClient.invalidateQueries({ queryKey: ["/api/faq"] }),
      ]);
    },
    onError: (error) => {
      setNotice(error instanceof Error && error.message === "link" ? linkText.invalid : error instanceof Error && error.message === "complete" ? text.complete : error instanceof Error && error.message === "validation" ? text.validation : text.saveError);
    },
  });

  const reload = async () => {
    if (dirty && !window.confirm(interfaceLanguage === "fa"
      ? "تغییرات ذخیره‌نشده کنار گذاشته و آخرین نسخه دریافت شود؟"
      : "Discard unsaved changes and load the latest version?")) return;
    const result = await query.refetch();
    if (result.data && !result.isError) {
      savedSnapshot.current = JSON.stringify(result.data);
      setDraft(result.data);
      setNotice("");
    }
  };
  const patchTranslation = (itemId: string, field: keyof Translation, value: string) => {
    setDraft((current) => current ? {
      ...current,
      items: current.items.map((item) => item.id !== itemId ? item : {
        ...item,
        translations: {
          ...item.translations,
          [editLanguage]: { question: "", answer: "", ...item.translations[editLanguage], [field]: value },
        },
      }),
    } : current);
    setNotice("");
  };
  const addItem = () => {
    setDraft((current) => current && current.items.length < 100 ? {
      ...current,
      items: [...current.items, { id: crypto.randomUUID(), isActive: true, translations: {} }],
    } : current);
    setNotice("");
  };
  const moveItem = (index: number, delta: number) => setDraft((current) => {
    if (!current) return current;
    const destination = index + delta;
    if (destination < 0 || destination >= current.items.length) return current;
    const items = [...current.items];
    [items[index], items[destination]] = [items[destination], items[index]];
    return { ...current, items };
  });

  if (query.isLoading) return <div className="space-y-4 p-4 md:p-6" aria-label={text.title}><div className="h-8 w-64 animate-pulse rounded bg-muted" /><div className="h-28 animate-pulse rounded-xl bg-muted" /><div className="h-44 animate-pulse rounded-xl bg-muted" /></div>;
  if (query.isError || !draft) return <section className="m-4 rounded-xl border border-destructive/30 bg-destructive/5 p-5 md:m-6" role="alert" dir={rtlUi ? "rtl" : "ltr"}><h2 className="font-semibold">{text.loadError}</h2><Button className="mt-4" variant="outline" onClick={() => void query.refetch()}>{text.retry}</Button></section>;

  return <div className="space-y-5 p-4 md:p-6" dir={rtlUi ? "rtl" : "ltr"}>
    <header className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-5 md:flex-row md:items-center">
      <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">Momtazchem · FAQ</p><h2 className="mt-1 text-2xl font-semibold">{text.title}</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{text.intro}</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${dirty ? "bg-amber-100 text-amber-900" : "bg-primary/10 text-primary"}`} aria-live="polite">{dirty ? text.dirty : `${text.clean} · ${draft.revision}`}</span>
        <Button data-testid="faq-save" onClick={() => save.mutate()} disabled={!dirty || save.isPending}><Save className="me-2 h-4 w-4" />{save.isPending ? text.saving : text.save}</Button>
      </div>
    </header>
    <fieldset disabled={save.isPending} className="space-y-5">
    <section className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
      <label className="flex flex-wrap items-center gap-2 text-sm font-medium" htmlFor="faq-language">{text.language}
        <select id="faq-language" data-testid="faq-language" className="min-h-10 rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={editLanguage} onChange={(event) => setEditLanguage(event.target.value as FaqLanguage)}>
          {languages.map((language) => <option key={language.id} value={language.id}>{language.label}</option>)}
        </select>
      </label>
      <Button data-testid="faq-add" variant="outline" onClick={addItem} disabled={draft.items.length >= 100}><Plus className="me-2 h-4 w-4" />{text.add}</Button>
    </section>
    {notice && <div role={save.isError ? "alert" : "status"} className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${save.isError ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-primary/20 bg-primary/5 text-foreground"}`}><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{notice}</span>{save.isError && <Button data-testid="faq-reload" variant="outline" size="sm" onClick={() => void reload()}>{interfaceLanguage === "fa" ? "دریافت آخرین نسخه" : interfaceLanguage === "ar" ? "تحميل أحدث إصدار" : interfaceLanguage === "tr" ? "Son sürümü yükle" : "Load latest version"}</Button>}</div>}
    {draft.items.length === 0 ? <div className="rounded-xl border border-dashed bg-card px-5 py-12 text-center text-sm text-muted-foreground">{text.noItems}</div> : <div className="space-y-4">
      {draft.items.map((item, index) => {
        const translation = item.translations[editLanguage] ?? { question: "", answer: "" };
        return <article key={item.id} className="rounded-xl border bg-card p-4 shadow-sm shadow-primary/[.025] md:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span><span className="text-sm font-medium text-muted-foreground">{languages.find((entry) => entry.id === editLanguage)?.label}</span></div>
            <div className="flex flex-wrap items-center gap-1">
              <Button data-testid={`faq-move-up-${item.id}`} size="icon" variant="ghost" aria-label={text.up} title={text.up} disabled={index === 0} onClick={() => moveItem(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
              <Button data-testid={`faq-move-down-${item.id}`} size="icon" variant="ghost" aria-label={text.down} title={text.down} disabled={index === draft.items.length - 1} onClick={() => moveItem(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
              <label className="mx-1 flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-muted">
                <input data-testid={`faq-active-${item.id}`} type="checkbox" className="h-4 w-4 accent-primary" checked={item.isActive} onChange={(event) => setDraft((current) => current ? { ...current, items: current.items.map((entry) => entry.id === item.id ? { ...entry, isActive: event.target.checked } : entry) } : current)} />
                <span>{item.isActive ? text.active : text.inactive}</span>
              </label>
              <Button data-testid={`faq-delete-${item.id}`} size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => {
                if (window.confirm(text.deleteConfirm)) setDraft((current) => current ? { ...current, items: current.items.filter((entry) => entry.id !== item.id) } : current);
              }}><Trash2 className="me-1 h-4 w-4" />{text.delete}</Button>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="space-y-1.5"><label className="text-sm font-medium" htmlFor={`faq-question-${item.id}`}>{text.question}</label><Input data-testid={`faq-question-${item.id}`} id={`faq-question-${item.id}`} dir={editLanguage === "fa" || editLanguage === "ar" ? "rtl" : "ltr"} value={translation.question} maxLength={500} placeholder={text.questionHint} onChange={(event) => patchTranslation(item.id, "question", event.target.value)} /><p className="text-end text-xs text-muted-foreground">{translation.question.length}/500 · {text.maxQuestion}</p></div>
            <div className="space-y-1.5"><label className="text-sm font-medium" htmlFor={`faq-answer-${item.id}`}>{text.answer}</label><Textarea data-testid={`faq-answer-${item.id}`} id={`faq-answer-${item.id}`} dir={editLanguage === "fa" || editLanguage === "ar" ? "rtl" : "ltr"} value={translation.answer} maxLength={10000} rows={4} placeholder={text.answerHint} onChange={(event) => patchTranslation(item.id, "answer", event.target.value)} /><p className="text-end text-xs text-muted-foreground">{translation.answer.length}/10,000 · {text.maxAnswer}</p></div>
            <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
              <label className="text-sm font-medium" htmlFor={`faq-link-${item.id}`}>{linkText.label}</label>
              <Input data-testid={`faq-link-${item.id}`} id={`faq-link-${item.id}`} dir="ltr" inputMode="url" value={translation.moreInfoUrl ?? ""} maxLength={2000} placeholder="https://…" aria-describedby={`faq-link-hint-${item.id}`} onChange={event => patchTranslation(item.id, "moreInfoUrl", event.target.value)} />
              <p id={`faq-link-hint-${item.id}`} className="text-xs text-muted-foreground">{linkText.hint} <span dir="ltr">(momtazchem.com / www.momtazchem.com)</span></p>
            </div>
          </div>
        </article>;
      })}
    </div>}
    {draft.items.length >= 100 && <p className="text-sm text-muted-foreground">{text.max}</p>}
    {draft.items.length > 0 && completeCount < draft.items.length && <p role="note" className="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-950">{text.complete}</p>}
    </fieldset>
  </div>;
}
