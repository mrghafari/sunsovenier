import { useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { ArrowDown, ArrowUp, GripVertical, ImagePlus, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createLayoutBlock, defaultLandingLayout, layoutElementGroups, moveLayoutBlock, type LandingLayout, type LandingLayoutBlock, type LandingLayoutRow } from "@shared/landing-layout";
import { safeLandingLink } from "@shared/landing-page-settings";
import type { LandingLanguage } from "@shared/landing-content";

type Props = {
  layout: LandingLayout;
  language: LandingLanguage;
  onChange: (layout: LandingLayout) => void;
  onImageUploaded: (slot: string, url: string) => void;
  images: Record<string, string>;
  uploadImage: (file: File) => Promise<string>;
  onRemoveImages: (slots: string[]) => void;
  locked?: boolean;
  onBusyChange?: (busy: boolean) => void;
};

const locales: Array<[LandingLanguage, string]> = [["fa", "فارسی"], ["en", "English"], ["ar", "العربية"], ["tr", "Türkçe"]];
const blockNames: Record<LandingLayoutBlock["type"], string> = {
  hero: "بنر اصلی", quote: "فرم درخواست", trusted: "اعتمادها", about: "درباره ما", stats: "آمار",
  services: "خدمات", categories: "دسته‌بندی‌ها", process: "فرایند", faq: "پرسش‌های متداول", footer: "پاورقی",
  text: "متن سفارشی", image: "تصویر", button: "دکمه", spacer: "فاصله",
};
const elementNames: Record<string, string> = {
  copy: "متن بنر", quote: "فرم درخواست", label: "عنوان اعتمادها", partners: "شرکا", image: "تصویر درباره",
  stats: "آمار", heading: "عنوان", categories: "دسته‌بندی‌ها", cards: "کارت‌ها", steps: "مراحل",
  items: "پرسش‌ها", brand: "برند", company: "شرکت", packages: "بسته‌بندی", connect: "ارتباط",
  bottom: "پاورقی پایانی", productInterest: "علاقه‌مندی محصول", fullName: "نام کامل", email: "ایمیل",
  phone: "تلفن", address: "نشانی", message: "پیام", submit: "ارسال",
};
const localizedValue = (value: Partial<Record<LandingLanguage, string>>, locale: LandingLanguage) => value[locale] ?? value.en ?? "";
const makeId = (prefix: string) => `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`}`;
const isRtl = (locale: LandingLanguage) => locale === "fa" || locale === "ar";
const sectionTypes = new Set<string>(["hero", "quote", "trusted", "about", "stats", "services", "categories", "process", "faq", "footer"]);
const blockChoices: LandingLayoutBlock["type"][] = ["hero", "quote", "trusted", "about", "stats", "services", "categories", "process", "faq", "footer", "text", "image", "button", "spacer"];
const groupKeys = Object.keys(layoutElementGroups) as Array<keyof typeof layoutElementGroups>;

export default function LandingBlockBuilder({ layout, language, onChange, onImageUploaded, images, uploadImage, onRemoveImages, locked = false, onBusyChange }: Props) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>({});
  const count = useMemo(() => layout.rows.reduce((sum, row) => sum + row.blocks.length, 0), [layout.rows]);
  const rtl = isRtl(language);
  const patchRow = (rowId: string, patch: Partial<LandingLayoutRow>) => onChange({ ...layout, rows: layout.rows.map(row => row.id === rowId ? { ...row, ...patch } : row) });
  const patchBlock = (blockId: string, patch: Partial<LandingLayoutBlock>) => onChange({
    ...layout,
    rows: layout.rows.map(row => ({ ...row, blocks: row.blocks.map(block => block.id === blockId ? { ...block, ...patch } : block) })),
  });
  const removeBlock = (rowId: string, block: LandingLayoutBlock) => {
    if (!sectionTypes.has(block.type) && !window.confirm("این بلوک سفارشی و متن یا تصویر آن از پیش‌نویس حذف شود؟")) return;
    onChange({ ...layout, rows: layout.rows.map(row => row.id === rowId ? { ...row, blocks: row.blocks.filter(item => item.id !== block.id) } : row) });
    if (block.type === "image") onRemoveImages([`layout-${block.id}`]);
  };
  const onDragEnd = (result: DropResult) => {
    if (!result.destination || locked) return;
    const { source, destination } = result;
    if (source.droppableId === "layout-rows") {
      const rows = [...layout.rows];
      const [row] = rows.splice(source.index, 1);
      rows.splice(destination.index, 0, row);
      onChange({ ...layout, rows });
      return;
    }
    if (source.droppableId.startsWith("elements:")) {
      if (source.droppableId !== destination.droppableId) return;
      const group = source.droppableId.slice("elements:".length) as keyof typeof layoutElementGroups;
      const items = [...layout.elements[group]];
      const [item] = items.splice(source.index, 1);
      items.splice(destination.index, 0, item);
      onChange({ ...layout, elements: { ...layout.elements, [group]: items } as LandingLayout["elements"] });
      return;
    }
    if (destination.droppableId.startsWith("elements:")) return;
    if (!source.droppableId.startsWith("blocks:") || !destination.droppableId.startsWith("blocks:")) return;
    const next = moveLayoutBlock(layout, source.droppableId.slice(7), source.index, destination.droppableId.slice(7), destination.index);
    if (next !== layout) onChange(next);
  };
  const moveElement = (group: keyof typeof layoutElementGroups, index: number, delta: number) => {
    const items = [...layout.elements[group]];
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    onChange({ ...layout, elements: { ...layout.elements, [group]: items } as LandingLayout["elements"] });
  };
  const moveRow = (index: number, delta: number) => {
    const rows = [...layout.rows];
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    onChange({ ...layout, rows });
  };
  const addBlock = (row: LandingLayoutRow, type: LandingLayoutBlock["type"]) => {
    if (count >= 100 || row.blocks.length >= 12 || (sectionTypes.has(type) && layout.rows.some(item => item.blocks.some(block => block.type === type)))) return;
    const block = createLayoutBlock(type, makeId("block"));
    onChange({ ...layout, rows: layout.rows.map(item => item.id === row.id ? { ...item, blocks: [...item.blocks, block] } : item) });
  };
  const addRow = () => {
    if (layout.rows.length >= 30) return;
    onChange({ ...layout, rows: [...layout.rows, { id: makeId("row"), columns: 1, width: "contained", gap: "normal", blocks: [] }] });
  };
  const removeRow = (row: LandingLayoutRow) => {
    if (layout.rows.length <= 1 || !window.confirm("این ردیف حذف شود؟ بلوک‌های سفارشی و متن یا تصویرشان از پیش‌نویس حذف می‌شوند؛ محتوای بخش‌های آماده حفظ می‌شود.")) return;
    onChange({ ...layout, rows: layout.rows.filter(item => item.id !== row.id) });
    const imageSlots = row.blocks.filter(block => block.type === "image").map(block => `layout-${block.id}`);
    if (imageSlots.length) onRemoveImages(imageSlots);
  };
  const changeHref = (block: LandingLayoutBlock, value: string) => {
    const cleaned = value.trim();
    const result = cleaned ? safeLandingLink.safeParse(cleaned) : null;
    const invalid = block.type === "button" && !cleaned || !!(cleaned && !result?.success);
    setLinkErrors(current => ({ ...current, [block.id]: invalid ? (cleaned ? "پیوند معتبر وارد کنید: مسیر محلی، لنگر، HTTPS، ایمیل یا تلفن." : "برای دکمه واردکردن مقصد الزامی است.") : "" }));
    patchBlock(block.id, { href: cleaned || undefined });
  };
  const uploadBlockImage = async (block: LandingLayoutBlock, file?: File) => {
    if (!file || block.type !== "image") return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setUploadError("فقط تصویر معتبر تا حجم ۱۰ مگابایت پذیرفته می‌شود.");
      return;
    }
    const slot = `layout-${block.id}`;
    setUploading(block.id);
    setUploadError("");
    onBusyChange?.(true);
    try {
      const url = await uploadImage(file);
      const stillExists = layout.rows.some(row => row.blocks.some(item => item.id === block.id && item.type === "image"));
      if (stillExists) onImageUploaded(slot, url);
    } catch {
      setUploadError("بارگذاری تصویر ناموفق بود. دوباره تلاش کنید.");
    } finally {
      setUploading(null);
      onBusyChange?.(false);
    }
  };
  const resetLayout = () => {
    if (uploading) return;
    if (!window.confirm("چیدمان پیش‌فرض جایگزین شود؟ بلوک‌های سفارشی و متن‌ها و تصاویر وابسته به آن‌ها از پیش‌نویس حذف می‌شوند؛ محتوای اصلی بخش‌های سایت حفظ می‌شود.")) return;
    const imageSlots = layout.rows.flatMap(row => row.blocks.filter(block => block.type === "image").map(block => `layout-${block.id}`));
    onChange(defaultLandingLayout());
    if (imageSlots.length) onRemoveImages(imageSlots);
  };
  const moveBlockToRow = (block: LandingLayoutBlock, sourceRowId: string, destinationRowId: string) => {
    if (sourceRowId === destinationRowId) return;
    const destination = layout.rows.find(row => row.id === destinationRowId);
    const source = layout.rows.find(row => row.id === sourceRowId);
    if (!destination || !source || destination.blocks.length >= 12) return;
    onChange(moveLayoutBlock(layout, sourceRowId, source.blocks.findIndex(item => item.id === block.id), destinationRowId, destination.blocks.length));
  };
  const availableTypes = (row: LandingLayoutRow) => blockChoices.filter(type => !sectionTypes.has(type) || !layout.rows.some(item => item.blocks.some(block => block.type === type)));

  return <section data-testid="landing-block-builder" dir={rtl ? "rtl" : "ltr"} className="space-y-4 rounded-2xl border border-primary/20 bg-primary/[0.025] p-4 md:p-5" aria-label="چیدمان بلوکی صفحه اصلی">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-semibold tracking-wide text-primary">ساخت صفحه برای مشتری</p><h3 className="mt-1 text-lg font-semibold">چیدمان بلوکی صفحه اصلی</h3>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">فرم درخواست، آمار و دسته‌بندی‌ها در صورت نبودن جایگاه مستقل، در بخش‌های بنر، درباره ما و خدمات نمایش داده می‌شوند. با افزودن جایگاه مستقل، نمایش درون‌بخشی آن متوقف می‌شود. حذف جایگاه بخش‌های آماده، محتوای اصلی آن‌ها را پاک نمی‌کند. فعال‌بودن بخش‌های آماده نیز از تنظیمات نمایش بخش‌ها کنترل می‌شود.</p>
      </div>
      <Button type="button" variant="outline" size="sm" disabled={locked || !!uploading} onClick={resetLayout}><RotateCcw className="me-2 h-4 w-4"/>بازنشانی فقط چیدمان</Button>
    </div>
    {uploadError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{uploadError}</p>}
    <div className="rounded-xl border border-dashed bg-background p-3">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">پیش‌نمایش ساختاری — نمای دقیق صفحه عمومی نیست</p>
      <div className="space-y-2" aria-hidden="true">{layout.rows.map((row, index) => <div key={row.id} className="flex min-h-10 items-start gap-2 rounded-lg bg-muted/60 p-2">
        <span className="w-12 shrink-0 pt-2 text-[10px] text-muted-foreground">ردیف {index + 1}</span>
        <div className={`mx-auto w-full ${row.width === "contained" ? "max-w-3xl" : ""}`}>
          <div className={`grid grid-cols-1 ${row.gap === "small" ? "gap-1" : row.gap === "large" ? "gap-4" : "gap-2"} ${row.columns === 2 ? "md:grid-cols-2" : row.columns === 3 ? "md:grid-cols-2 xl:grid-cols-3" : ""}`}>
            {row.blocks.length ? row.blocks.map(block => <span key={block.id} className={`min-w-0 truncate rounded-md px-2 py-1.5 text-xs ${block.tone === "navy" ? "bg-slate-800 text-white" : block.tone === "light" ? "bg-primary/10 text-primary" : "bg-card"}`}>{blockNames[block.type]}{!block.enabled ? " · پنهان" : ""}</span>) : <span className="text-xs text-muted-foreground">ردیف خالی</span>}
          </div>
        </div>
      </div>)}</div>
    </div>

    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="layout-rows" type="ROW">
        {(rowList, rowsDragging) => <div ref={rowList.innerRef} {...rowList.droppableProps} className={`space-y-4 rounded-lg ${rowsDragging.isDraggingOver ? "bg-primary/5" : ""}`}>
        {layout.rows.map((row, rowIndex) => <Draggable key={row.id} draggableId={`layout-row:${row.id}`} index={rowIndex} isDragDisabled={locked} disableInteractiveElementBlocking>
          {(rowDrag, rowDragging) => <article ref={rowDrag.innerRef} {...rowDrag.draggableProps} data-testid={`landing-layout-row-${row.id}`} className={`rounded-xl border bg-card p-3 md:p-4 ${rowDragging.isDragging ? "shadow-md" : ""}`}>
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button type="button" {...rowDrag.dragHandleProps} disabled={locked} data-testid={`landing-layout-row-handle-${row.id}`} aria-label={`جابجایی ردیف ${rowIndex + 1} با کشیدن`} className="touch-none rounded p-1 text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><GripVertical className="h-4 w-4"/></button>
              <h4 className="font-semibold">ردیف {rowIndex + 1}</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-1 text-xs">ستون‌ها<select aria-label={`ستون‌های ردیف ${rowIndex + 1}`} disabled={locked} className="rounded-md border bg-background px-2 py-1.5" value={row.columns} onChange={event => patchRow(row.id, { columns: Number(event.target.value) as 1 | 2 | 3 })}>{[1, 2, 3].map(number => <option key={number} value={number}>{number}</option>)}</select></label>
              <label className="flex items-center gap-1 text-xs">عرض<select aria-label={`عرض ردیف ${rowIndex + 1}`} disabled={locked} className="rounded-md border bg-background px-2 py-1.5" value={row.width} onChange={event => patchRow(row.id, { width: event.target.value as LandingLayoutRow["width"] })}><option value="full">تمام‌عرض</option><option value="contained">محدود</option></select></label>
              <label className="flex items-center gap-1 text-xs">فاصله<select aria-label={`فاصله ردیف ${rowIndex + 1}`} disabled={locked} className="rounded-md border bg-background px-2 py-1.5" value={row.gap} onChange={event => patchRow(row.id, { gap: event.target.value as LandingLayoutRow["gap"] })}>{[["small", "کم"], ["normal", "معمولی"], ["large", "زیاد"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <Button type="button" size="icon" variant="ghost" aria-label="انتقال ردیف به بالا" disabled={locked || rowIndex === 0} onClick={() => moveRow(rowIndex, -1)}><ArrowUp className="h-4 w-4"/></Button>
              <Button type="button" size="icon" variant="ghost" aria-label="انتقال ردیف به پایین" disabled={locked || rowIndex === layout.rows.length - 1} onClick={() => moveRow(rowIndex, 1)}><ArrowDown className="h-4 w-4"/></Button>
              <Button type="button" size="sm" variant="ghost" aria-label={`حذف ردیف ${rowIndex + 1}`} disabled={locked || layout.rows.length <= 1} onClick={() => removeRow(row)}><Trash2 className="h-4 w-4"/></Button>
            </div>
          </header>
          <Droppable droppableId={`blocks:${row.id}`} type="BLOCK">
            {(provided, snapshot) => <div ref={provided.innerRef} {...provided.droppableProps} className={`flex min-h-16 flex-col gap-3 rounded-lg p-1 ${snapshot.isDraggingOver ? "bg-primary/5" : ""}`}>
              {row.blocks.map((block, blockIndex) => <Draggable key={block.id} draggableId={block.id} index={blockIndex} isDragDisabled={locked} disableInteractiveElementBlocking>
                {(drag, state) => <section ref={drag.innerRef} {...drag.draggableProps} data-testid={`landing-layout-block-${block.id}`} className={`min-w-0 rounded-lg border bg-background p-3 ${state.isDragging ? "shadow-md" : ""}`}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><button type="button" {...drag.dragHandleProps} disabled={locked} data-testid={`landing-layout-handle-${block.id}`} aria-label={`جابجایی ${blockNames[block.type]} با کشیدن`} className="touch-none rounded p-1 text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><GripVertical className="h-4 w-4"/></button><strong className="text-sm">{blockNames[block.type]}</strong><code className="text-[10px] text-muted-foreground">{block.id}</code></div>
                    <div className="flex items-center gap-1">
                      <Button type="button" size="icon" variant="ghost" aria-label="انتقال به بالا" disabled={locked || blockIndex === 0} onClick={() => onChange(moveLayoutBlock(layout, row.id, blockIndex, row.id, blockIndex - 1))}><ArrowUp className="h-4 w-4"/></Button>
                      <Button type="button" size="icon" variant="ghost" aria-label="انتقال به پایین" disabled={locked || blockIndex === row.blocks.length - 1} onClick={() => onChange(moveLayoutBlock(layout, row.id, blockIndex, row.id, blockIndex + 1))}><ArrowDown className="h-4 w-4"/></Button>
                      <label className="sr-only" htmlFor={`move-${block.id}`}>انتقال بلوک به ردیف</label>
                      <select id={`move-${block.id}`} aria-label="انتقال به ردیف دیگر" disabled={locked} className="max-w-28 rounded-md border bg-background px-2 py-1 text-xs" value={row.id} onChange={event => moveBlockToRow(block, row.id, event.target.value)}>{layout.rows.map((item, index) => <option key={item.id} value={item.id} disabled={item.id !== row.id && item.blocks.length >= 12}>ردیف {index + 1}</option>)}</select>
                      <Button type="button" size="icon" variant="ghost" aria-label={`حذف جایگاه ${blockNames[block.type]}`} disabled={locked} onClick={() => removeBlock(row.id, block)}><Trash2 className="h-4 w-4"/></Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={locked} checked={block.enabled} onChange={event => patchBlock(block.id, { enabled: event.target.checked })}/>نمایش این جایگاه</label>
                    {sectionTypes.has(block.type) && <p className="text-xs text-muted-foreground">محتوا و تصاویر این بخش از تنظیمات محتوای پایین صفحه ویرایش می‌شود؛ اینجا جایگاه و نمایش آن را تنظیم کنید.</p>}
                    {!sectionTypes.has(block.type) && block.type !== "spacer" && (["title", "body"] as const).filter(part => block.type !== "button" || part === "title").map(part => <fieldset key={part} className="space-y-2 rounded-md border p-2"><legend className="px-1 text-xs font-medium">{block.type === "image" ? part === "title" ? "متن جایگزین تصویر" : "توضیح تصویر" : block.type === "button" ? "متن دکمه" : part === "title" ? "عنوان" : "متن"} · ترجمه‌ها</legend>
                      <div className="grid gap-2 md:grid-cols-2">{locales.map(([locale, label]) => <label key={locale} className="space-y-1 text-xs"><span>{label}</span>{part === "body" ? <Textarea rows={2} disabled={locked} dir={isRtl(locale) ? "rtl" : "ltr"} value={localizedValue(block[part], locale)} onChange={event => patchBlock(block.id, { [part]: { ...block[part], [locale]: event.target.value } })}/> : <Input disabled={locked} dir={isRtl(locale) ? "rtl" : "ltr"} value={localizedValue(block[part], locale)} onChange={event => patchBlock(block.id, { title: { ...block.title, [locale]: event.target.value } })}/>}</label>)}</div>
                    </fieldset>)}
                    {block.type === "image" && <div className="flex flex-wrap items-center gap-3">
                      {images[`layout-${block.id}`] && <img className="h-20 w-32 rounded-md border object-cover" src={images[`layout-${block.id}`]} alt="تصویر بلوک"/>}
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs hover:bg-muted"><ImagePlus className="h-4 w-4"/>{uploading === block.id ? "در حال بارگذاری…" : "بارگذاری تصویر"}<input type="file" accept="image/*" className="sr-only" disabled={locked || !!uploading} onChange={event => { void uploadBlockImage(block, event.currentTarget.files?.[0]); event.currentTarget.value = ""; }}/></label>
                    </div>}
                    {(["button", "text", "image"].includes(block.type)) && <label className="block space-y-1 text-xs"><span>مقصد امن پیوند {block.type === "button" ? "(الزامی)" : "(اختیاری)"}</span><Input dir="ltr" disabled={locked} aria-invalid={!!linkErrors[block.id]} value={block.href ?? ""} onChange={event => changeHref(block, event.target.value)}/>{linkErrors[block.id] && <span role="alert" className="text-destructive">{linkErrors[block.id]}</span>}</label>}
                    {!sectionTypes.has(block.type) && <div className="grid gap-2 sm:grid-cols-3">
                      {block.type !== "spacer" && <label className="space-y-1 text-xs"><span>چیدمان متن</span><select disabled={locked} className="w-full rounded-md border bg-background px-2 py-2" value={block.alignment} onChange={event => patchBlock(block.id, { alignment: event.target.value as LandingLayoutBlock["alignment"] })}><option value="start">ابتدا</option><option value="center">مرکز</option><option value="end">انتها</option></select></label>}
                      <label className="space-y-1 text-xs"><span>زمینه</span><select disabled={locked} className="w-full rounded-md border bg-background px-2 py-2" value={block.tone} onChange={event => patchBlock(block.id, { tone: event.target.value as LandingLayoutBlock["tone"] })}><option value="plain">ساده</option><option value="light">روشن</option><option value="navy">سرمه‌ای</option></select></label>
                      <label className="space-y-1 text-xs"><span>فاصله</span><select disabled={locked} className="w-full rounded-md border bg-background px-2 py-2" value={block.spacing} onChange={event => patchBlock(block.id, { spacing: event.target.value as LandingLayoutBlock["spacing"] })}><option value="small">کم</option><option value="normal">معمولی</option><option value="large">زیاد</option></select></label>
                    </div>}
                  </div>
                </section>}
              </Draggable>)}
              {provided.placeholder}
              {!row.blocks.length && <p className="col-span-full py-5 text-center text-xs text-muted-foreground">برای افزودن بلوک از فهرست پایین استفاده کنید.</p>}
            </div>}
          </Droppable>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`add-block-${row.id}`}>نوع بلوک جدید</label>
            <select id={`add-block-${row.id}`} data-testid="landing-add-block" disabled={locked || count >= 100 || row.blocks.length >= 12 || availableTypes(row).length === 0} className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue="" onChange={event => { if (event.target.value) addBlock(row, event.target.value as LandingLayoutBlock["type"]); event.target.value = ""; }}>
              <option value="">انتخاب بلوک برای افزودن…</option>{availableTypes(row).map(type => <option key={type} value={type}>{blockNames[type]}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">{row.blocks.length}/12 بلوک · مجموع {count}/100</span>
          </div>
        </article>}
        </Draggable>)}
        {rowList.placeholder}
        </div>}
      </Droppable>
    </DragDropContext>
    <Button type="button" data-testid="landing-add-row" variant="outline" disabled={locked || layout.rows.length >= 30} onClick={addRow}><Plus className="me-2 h-4 w-4"/>افزودن ردیف · {layout.rows.length}/30</Button>
    <details className="rounded-xl border bg-card p-3">
      <summary className="cursor-pointer font-medium">ترتیب اجزای داخلی بخش‌ها و فیلدهای فرم</summary>
      <p className="my-2 text-xs text-muted-foreground">همه اجزای داخلی الزامی‌اند؛ فقط ترتیب را تغییر دهید. کشیدن با ماوس، لمس یا صفحه‌کلید در دسترس است و دکمه‌های بالا/پایین نیز جایگزین هستند.</p>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="space-y-3">{groupKeys.map(group => <fieldset key={group} className="rounded-lg border p-3"><legend className="px-1 text-sm font-medium">{group === "form" ? "فرم درخواست" : blockNames[group as LandingLayoutBlock["type"]] ?? group}</legend>
          <Droppable droppableId={`elements:${group}`} type={`ELEMENT-${group}`} direction="vertical">
            {(provided) => <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {layout.elements[group].map((element, index) => <Draggable key={`${group}-${element}`} draggableId={`element-${group}-${element}`} index={index} isDragDisabled={locked} disableInteractiveElementBlocking>
                {(drag) => <div ref={drag.innerRef} {...drag.draggableProps} className="flex items-center gap-1 rounded-lg border bg-muted/40 px-2 py-1">
                  <button type="button" {...drag.dragHandleProps} disabled={locked} aria-label={`جابجایی ${group === "about" && element === "copy" ? "متن درباره ما" : elementNames[element] ?? element}`} className="touch-none rounded p-1 text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><GripVertical className="h-3.5 w-3.5"/></button>
                  <span className="text-xs">{group === "about" && element === "copy" ? "متن درباره ما" : elementNames[element] ?? element}</span>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="انتقال جزء به بالا" disabled={locked || index === 0} onClick={() => moveElement(group, index, -1)}><ArrowUp className="h-3.5 w-3.5"/></Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="انتقال جزء به پایین" disabled={locked || index === layout.elements[group].length - 1} onClick={() => moveElement(group, index, 1)}><ArrowDown className="h-3.5 w-3.5"/></Button>
                </div>}
              </Draggable>)}
              {provided.placeholder}
            </div>}
          </Droppable>
        </fieldset>)}</div>
      </DragDropContext>
    </details>
  </section>;
}
