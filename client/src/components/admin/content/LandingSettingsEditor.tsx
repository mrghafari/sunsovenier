import { useId, useState } from "react";
import type { LandingContent, LandingLanguage } from "@shared/landing-content";
import { landingLanguages } from "@shared/landing-content";
import type { LandingPageSettings } from "@shared/landing-page-settings";
import { landingTextGroups, landingSectionKeys, landingFormFieldKeys, defaultLandingPageSettings } from "@shared/landing-page-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ChevronUp, ChevronDown, ImagePlus } from "lucide-react";
import { BASE_PRODUCTS, PACKAGES } from "@/pages/landing/catalog";
import SlideTextVisibilityToggle from "./SlideTextVisibilityToggle";

type Props = {
  page: LandingPageSettings;
  language: LandingLanguage;
  onChange: (page: LandingPageSettings) => void;
  content: LandingContent;
  onContentChange: (content: LandingContent) => void;
  onImageUploaded: (slot: string, url: string) => void;
  uploadImage: (file: File) => Promise<string>;
  locked?: boolean;
};
const locales: Array<[LandingLanguage, string]> = [["fa", "فارسی"], ["en", "English"], ["ar", "العربية"], ["tr", "Türkçe"]];
const groupNames: Record<string, string> = { header: "سربرگ / Header", hero: "بنر اصلی / Hero", form: "فرم درخواست / Inquiry form", about: "درباره ما / About", products: "محصولات / Products", process: "فرایند / Process", faq: "پرسش‌های متداول / FAQ", footer: "پاورقی / Footer", modal: "پنجره جزئیات / Detail dialog", seo: "سئو / SEO" };
const fieldNames: Record<string, string> = {
  navAbout:"درباره ما / About",navProducts:"محصولات / Products",navProcess:"فرایند / Process",navFaq:"پرسش‌های متداول / FAQ",navShop:"فروشگاه / Shop",navAccount:"حساب کاربری / Account",language:"زبان / Language",openMenu:"بازکردن منو / Open menu",closeMenu:"بستن منو / Close menu",
  eyebrow:"روتیتر / Eyebrow",heroTitle:"عنوان بنر / Hero title",heroDesc:"شرح بنر / Hero description",viewProducts:"مشاهده محصولات / View products",getQuote:"درخواست قیمت / Get a quote",
  quoteTitle:"عنوان فرم / Form title",product:"محصول / Product",fullName:"نام کامل / Full name",email:"ایمیل / Email",phone:"تلفن / Phone",address:"نشانی / Address",companyOptional:"شرکت / Company",messageLabel:"پیام / Message",submit:"ارسال / Submit",sending:"در حال ارسال / Sending",submitted:"ارسال شد / Submitted",failed:"ارسال ناموفق / Failed",formError:"خطای فرم / Form error",ratingLabel:"امتیاز / Rating",
  trusted:"متن اعتماد / Trust label",about:"بخش درباره / About section",aboutTitle:"عنوان درباره / About title",aboutDesc:"شرح درباره / About description",explore:"بیشتر بدانید / Explore",aboutImageAlt:"متن جایگزین تصویر / Image alt",
  aboutFactManufacturing:"تولید مواد شیمیایی / Chemical manufacturing",aboutFactPackaging:"بسته‌بندی استاندارد / Standard packaging",aboutFactSafety:"رعایت ایمنی / Safety compliance",
  packaging:"بسته‌بندی / Packaging",packagingTitle:"عنوان بسته‌بندی / Packaging title",packagingHint:"راهنمای بسته‌بندی / Packaging hint",details:"جزئیات / Details",shop:"خرید / Shop",noCategories:"بدون دسته‌بندی / No categories",retry:"تلاش دوباره / Retry",browseProducts:"مرور محصولات / Browse products",
  processEyebrow:"روتیتر فرایند / Process eyebrow",processTitle:"عنوان فرایند / Process title",faqEyebrow:"روتیتر پرسش‌ها / FAQ eyebrow",faqTitle:"عنوان پرسش‌ها / FAQ title",
  company:"شرکت / Company",services:"خدمات / Services",connect:"ارتباط / Connect",aboutLink:"پیوند درباره / About link",tagline:"شعار / Tagline",account:"حساب / Account",copyright:"حق نشر / Copyright",privacyLabel:"حریم خصوصی / Privacy",termsLabel:"شرایط / Terms",managementLabel:"مدیریت / Management",
  modalClose:"بستن / Close",modalDetail:"جزئیات / Details",modalPackaging:"بسته‌بندی / Packaging",modalSpecs:"مشخصات / Specifications",modalQuote:"درخواست قیمت / Request quote",modalPackagingHint:"راهنمای بسته‌بندی / Packaging hint",seoTitle:"عنوان سئو / SEO title",seoDescription:"توضیحات سئو / SEO description"
};
const sectionNames: Record<string, string> = {hero:"بنر اصلی / Hero",quote:"فرم درخواست / Inquiry form",trusted:"اعتمادها / Trust",about:"درباره ما / About",stats:"آمار / Statistics",services:"خدمات / Services",categories:"دسته‌بندی‌ها / Categories",process:"فرایند / Process",faq:"پرسش‌های متداول / FAQ",footer:"پاورقی / Footer"};
const fieldTitles: Record<string, string> = {productInterest:"علاقه‌مندی محصول / Product interest",company:"شرکت / Company",phone:"تلفن / Phone",address:"نشانی / Address",message:"پیام / Message"};
const packageIds = Object.keys(PACKAGES) as Array<keyof typeof PACKAGES>;
const iconChoices = ["industry", "vial-circle-check", "shield-halved", "truck-fast"] as const;
const namesFor: Record<string, string> = {drum220:"220L steel drum",ibc1000:"1000L IBC",tank1500:"1500L tank",bag25:"25 kg bag",bigbag:"FIBC big bag"};
const move = <T,>(items: T[], index: number, delta: number) => { const next = [...items]; const target = index + delta; if (target < 0 || target >= next.length) return next; [next[index], next[target]] = [next[target], next[index]]; return next; };
const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

function LocalizedInput({ label, value, inherited, onChange, onRestore, hasOverride = false, multiline = false, locked = false, dir }: { label: string; value: string; inherited?: string; onChange: (value: string) => void; onRestore?: () => void; hasOverride?: boolean; multiline?: boolean; locked?: boolean; dir: string }) {
  const id = useId();
  return <div className="space-y-1.5"><label htmlFor={id} className="text-sm font-medium">{label}</label>{multiline ? <Textarea id={id} dir={dir} disabled={locked} value={value} placeholder={inherited} onChange={e=>onChange(e.target.value)} rows={3}/> : <Input id={id} dir={dir} disabled={locked} value={value} placeholder={inherited} onChange={e=>onChange(e.target.value)}/>}<div className="flex justify-between gap-2"><span className="text-xs text-muted-foreground">{inherited ? `منبع / Source: ${inherited}` : "ترجمه اختصاصی / Language override"}</span>{onRestore && hasOverride && <button disabled={locked} type="button" onClick={onRestore} className="text-xs text-primary underline disabled:opacity-50">بازگشت به متن مبنا / Restore source</button>}</div></div>;
}

type StatsRow = NonNullable<LandingPageSettings["stats"]["en"]>[number];
type ProcessRow = NonNullable<LandingPageSettings["process"]["en"]>[number];
type RepeaterProps<T> = { localeName: string; rows: T[]; sourceRows: T[]; onChange: (rows: T[]) => void; locked: boolean };

function StatisticsRepeater({ localeName, rows, sourceRows, onChange, locked }: RepeaterProps<StatsRow>) {
  return <fieldset className="space-y-2 rounded-lg border p-3">
    <legend className="px-1 text-sm font-medium">{localeName}</legend>
    {rows.map((row, index) => <div key={index} className="flex items-start gap-2">
      <div className="grid flex-1 gap-2 md:grid-cols-2">
        <label className="space-y-1 text-sm"><span>مقدار / Value</span><Input disabled={locked} value={row.value} onChange={event => onChange(rows.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))}/></label>
        <label className="space-y-1 text-sm"><span>برچسب / Label</span><Input disabled={locked} value={row.label} onChange={event => onChange(rows.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))}/></label>
      </div>
      <div className="flex flex-col">
        <Button type="button" size="sm" variant="ghost" aria-label="جابجایی به بالا / Move up" disabled={locked || index === 0} onClick={() => onChange(move(rows, index, -1))}><ChevronUp className="h-4 w-4"/></Button>
        <Button type="button" size="sm" variant="ghost" aria-label="جابجایی به پایین / Move down" disabled={locked || index === rows.length - 1} onClick={() => onChange(move(rows, index, 1))}><ChevronDown className="h-4 w-4"/></Button>
        <Button type="button" size="sm" variant="ghost" aria-label="حذف ردیف / Delete row" disabled={locked} onClick={() => onChange(rows.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4"/></Button>
      </div>
    </div>)}
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" disabled={locked || rows.length >= 12} onClick={() => onChange([...rows, { label: "", value: "" }])}><Plus className="mr-1 h-4 w-4"/>افزودن ردیف / Add row</Button>
      {!rows.length && <Button type="button" size="sm" variant="outline" disabled={locked || !sourceRows.length} onClick={() => onChange([...sourceRows])}>بازگردانی متن مبنا / Restore source</Button>}
    </div>
  </fieldset>;
}

function ProcessRepeater({ localeName, rows, sourceRows, onChange, locked }: RepeaterProps<ProcessRow>) {
  return <fieldset className="space-y-2 rounded-lg border p-3">
    <legend className="px-1 text-sm font-medium">{localeName}</legend>
    {rows.map((row, index) => <div key={index} className="flex items-start gap-2">
      <div className="grid flex-1 gap-2 md:grid-cols-2">
        <label className="space-y-1 text-sm"><span>عنوان / Title</span><Input disabled={locked} value={row.title} onChange={event => onChange(rows.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))}/></label>
        <label className="space-y-1 text-sm"><span>شرح / Description</span><Textarea disabled={locked} value={row.description} onChange={event => onChange(rows.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} rows={2}/></label>
      </div>
      <div className="flex flex-col">
        <Button type="button" size="sm" variant="ghost" aria-label="جابجایی به بالا / Move up" disabled={locked || index === 0} onClick={() => onChange(move(rows, index, -1))}><ChevronUp className="h-4 w-4"/></Button>
        <Button type="button" size="sm" variant="ghost" aria-label="جابجایی به پایین / Move down" disabled={locked || index === rows.length - 1} onClick={() => onChange(move(rows, index, 1))}><ChevronDown className="h-4 w-4"/></Button>
        <Button type="button" size="sm" variant="ghost" aria-label="حذف ردیف / Delete row" disabled={locked} onClick={() => onChange(rows.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4"/></Button>
      </div>
    </div>)}
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" disabled={locked || rows.length >= 12} onClick={() => onChange([...rows, { title: "", description: "" }])}><Plus className="mr-1 h-4 w-4"/>افزودن ردیف / Add row</Button>
      {!rows.length && <Button type="button" size="sm" variant="outline" disabled={locked || !sourceRows.length} onClick={() => onChange([...sourceRows])}>بازگردانی متن مبنا / Restore source</Button>}
    </div>
  </fieldset>;
}

export default function LandingSettingsEditor({ page, language, onChange, content, onContentChange, onImageUploaded, uploadImage, locked = false }: Props) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const rtl = language === "fa" || language === "ar";
  const sourceDefaults = defaultLandingPageSettings();
  const patch = (changes: Partial<LandingPageSettings>) => onChange({ ...page, ...changes });
  const patchText = (key: string, value: string) => patch({ texts: { ...page.texts, [language]: { ...page.texts[language], [key]: value } } });
  const editArray = <K extends "slides" | "navigation" | "footerCompany" | "footerConnect" | "social" | "partners">(key: K, rows: LandingPageSettings[K]) => patch({ [key]: rows } as Pick<LandingPageSettings, K>);
  const imageUpload = async (slot: string, file?: File) => {
    if (!file) return;
    setUploading(slot);
    setUploadError("");
    try { const url = await uploadImage(file); onImageUploaded(slot, url); }
    catch { setUploadError(`بارگذاری تصویر ${slot} ناموفق بود. / Image upload failed for ${slot}.`); }
    finally { setUploading(null); }
  };
  const imageControl = (slot: string, label: string) => <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1.5 text-xs hover:bg-muted"><ImagePlus className="h-3.5 w-3.5"/>{uploading === slot ? "بارگذاری… / Uploading…" : label}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml,.svg" className="sr-only" disabled={locked || !!uploading} onChange={e=>{void imageUpload(slot,e.currentTarget.files?.[0]);e.currentTarget.value="";}}/></label>;
  const moveButtons = (index: number, length: number, change: (delta: number) => void) => <span className="flex gap-1"><Button type="button" size="sm" variant="ghost" aria-label="جابجایی به بالا / Move up" disabled={locked || index===0} onClick={()=>change(-1)}><ChevronUp className="h-4 w-4"/></Button><Button type="button" size="sm" variant="ghost" aria-label="جابجایی به پایین / Move down" disabled={locked || index===length-1} onClick={()=>change(1)}><ChevronDown className="h-4 w-4"/></Button></span>;
  const field = (label: string, value: string, onValue: (value: string)=>void, options: {dir?:string; multiline?:boolean; type?:string; disabled?:boolean}={}) => <label className="block space-y-1.5 text-sm"><span className="font-medium">{label}</span>{options.multiline ? <Textarea dir={options.dir} disabled={locked||options.disabled} value={value} onChange={e=>onValue(e.target.value)} rows={3}/> : <Input dir={options.dir} type={options.type||"text"} disabled={locked||options.disabled} value={value} onChange={e=>onValue(e.target.value)}/>}</label>;
  const languageFields = (object: Partial<Record<LandingLanguage,string>>, onValue: (locale: LandingLanguage,value:string)=>void, multiline=false) => <div className="grid gap-3 md:grid-cols-2">{locales.map(([locale,name])=><label key={locale} className="space-y-1.5 text-sm"><span className="font-medium">{name}</span>{multiline?<Textarea dir={locale==="fa"||locale==="ar"?"rtl":"ltr"} disabled={locked} value={object[locale]??object.en??""} onChange={e=>onValue(locale,e.target.value)} rows={2}/>:<Input dir={locale==="fa"||locale==="ar"?"rtl":"ltr"} disabled={locked} value={object[locale]??object.en??""} onChange={e=>onValue(locale,e.target.value)}/>}</label>)}</div>;
  const linkArray = (key: "navigation"|"footerCompany"|"footerConnect"|"social", title:string) => {
    const rows=page[key];
    return <details data-setting-group={key} className="rounded-xl border bg-card p-4"><summary className="cursor-pointer font-semibold">{title} · {rows.length}</summary><div className="mt-4 space-y-3">{rows.map((row,i)=><article key={row.id} className="space-y-3 rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><strong className="text-sm">{row.id}</strong><div className="flex items-center gap-1">{moveButtons(i,rows.length,d=>editArray(key,move([...rows],i,d)))}<Button type="button" variant="ghost" size="sm" aria-label="حذف پیوند / Delete link" disabled={locked} onClick={()=>editArray(key,rows.filter((_,n)=>n!==i))}><Trash2 className="h-4 w-4"/></Button></div></div><div className="grid gap-3 md:grid-cols-2">{field("نشانی / Href",row.href,v=>editArray(key,rows.map((x,n)=>n===i?{...x,href:v}:x)))}</div>{row.textKey&&<p className="text-xs text-muted-foreground">کلید متن از ترجمه صفحه استفاده می‌کند / Uses page text: {row.textKey}</p>}{languageFields(row.labels,(locale,v)=>editArray(key,rows.map((x,n)=>n===i?{...x,labels:{...x.labels,[locale]:v}}:x)))}<label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={locked} checked={row.isActive} onChange={e=>editArray(key,rows.map((x,n)=>n===i?{...x,isActive:e.target.checked}:x))}/>فعال / Active</label></article>)}<Button type="button" variant="outline" disabled={locked} onClick={()=>editArray(key,[...rows,{id:makeId(key),href:"/",labels:{},isActive:true}])}><Plus className="mr-1 h-4 w-4"/>افزودن پیوند / Add link</Button></div></details>;
  };

  return <section className="space-y-4" aria-label="تنظیمات صفحه اصلی / Homepage settings">
    <label className="block space-y-2 rounded-xl border bg-card p-4 text-sm">
      <span className="font-medium">گرافیک بخش درباره ما / About visual</span>
      <select data-testid="landing-about-visual" className="block w-full rounded-md border bg-background p-2" disabled={locked} value={page.aboutVisual === "image" ? "image" : "window"} onChange={event => patch({ aboutVisual: event.target.value as "window" | "image" })}>
        <option value="window">پنجرهٔ متحرک چهارقسمتی / Animated four-pane photo window</option>
        <option value="image">عکس قابل ویرایش / Editable photo</option>
      </select>
      <span className="block text-xs text-muted-foreground">چهار عکس را از «تصاویر مشترک سایت ← پنجرهٔ درباره ما · قسمت ۱ تا ۴» مستقل تغییر دهید. بازنشانی هر قسمت، عکس اصلی لندینگ را برمی‌گرداند. / Edit panes 1–4 independently under Shared imagery → About window. Reset restores each pane's landing source.</span>
    </label>
    {uploadError&&<p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{uploadError}</p>}
    <div className="rounded-xl border bg-card p-4"><h3 className="mb-3 font-semibold">متن‌های صفحه / Homepage copy</h3><p className="mb-4 text-sm text-muted-foreground">مقدار زبان انتخاب‌شده را ویرایش کنید؛ حذف override متن مبنا را بازمی‌گرداند. / Edit the selected language; restore removes its override.</p>
      {Object.entries(landingTextGroups).map(([group,keys])=><details key={group} data-setting-group={`text-${group}`} className="border-t py-3" open={group==="hero"}><summary className="cursor-pointer font-medium">{groupNames[group]??group}</summary><div className="mt-4 grid gap-4 md:grid-cols-2">{keys.map(key=><LocalizedInput key={key} label={fieldNames[key]??key} value={page.texts[language]?.[key]??page.texts.en?.[key]??""} inherited={page.texts.en?.[key]??""} hasOverride={page.texts[language]?.[key]!==undefined} dir={rtl?"rtl":"ltr"} multiline={["heroDesc","aboutDesc","seoDescription"].includes(key)} locked={locked} onChange={v=>patchText(key,v)} onRestore={()=>{const values={...page.texts[language]};delete values[key as keyof typeof values];patch({texts:{...page.texts,[language]:values}});}}/>)}</div></details>)}
    </div>
    <details className="rounded-xl border bg-card p-4" data-setting-group="sections"><summary className="cursor-pointer font-semibold">نمایش بخش‌ها و هویت / Sections & identity</summary><div className="mt-4 space-y-4"><fieldset><legend className="mb-2 text-sm font-medium">نمایش بخش / Section visibility</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{landingSectionKeys.map(key=><label key={key} className="flex items-center gap-2 rounded-md bg-muted/40 p-2 text-sm"><input type="checkbox" data-testid={`landing-section-${key}`} disabled={locked} checked={page.sections[key]} onChange={e=>patch({sections:{...page.sections,[key]:e.target.checked}})}/>{sectionNames[key]}</label>)}</div></fieldset><div className="grid gap-3 md:grid-cols-2">{field("نام برند اصلی / Primary brand",page.brandPrimary,v=>patch({brandPrimary:v}))}{field("پسوند برند / Brand accent",page.brandAccent,v=>patch({brandAccent:v}))}</div><p className="text-sm text-muted-foreground">شماره بالای صفحه از اطلاعات شرکت ← اطلاعات تماس ← تلفن و واتساپ ویرایش می‌شود. / Edit the header phone in Company Information → Contact Information → Phone & WhatsApp.</p></div></details>
    <details className="rounded-xl border bg-card p-4" data-setting-group="slides" open><summary className="cursor-pointer font-semibold">بنرهای صفحه اصلی / Hero slides</summary><div className="mt-4 space-y-4"><div className="flex flex-wrap items-center gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={locked} checked={page.autoplay} onChange={e=>patch({autoplay:e.target.checked})}/>پخش خودکار / Autoplay</label>{field("فاصله (میلی‌ثانیه) / Interval (ms)",String(page.slideInterval),v=>patch({slideInterval:Number(v)}),{type:"number"})}</div>
      {page.slides.map((slide,i)=><article key={slide.id} className="space-y-3 rounded-lg border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><strong>بنر {i+1} / Slide {i+1} · {slide.id}</strong><div className="flex items-center gap-1">{moveButtons(i,page.slides.length,d=>editArray("slides",move([...page.slides],i,d)))}<Button type="button" size="sm" variant="ghost" disabled={locked||page.slides.length<=1} aria-label="حذف بنر / Delete slide" onClick={()=>{const images={...content.images};delete images[`hero-${slide.id}`];onContentChange({...content,images});editArray("slides",page.slides.filter(x=>x.id!==slide.id));}}><Trash2 className="h-4 w-4"/></Button></div></div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={locked} checked={slide.isActive} onChange={e=>editArray("slides",page.slides.map(x=>x.id===slide.id?{...x,isActive:e.target.checked}:x))}/>فعال / Active</label>
          <SlideTextVisibilityToggle language={language} visible={slide.showText !== false} disabled={locked}
            testId={`slide-text-${slide.id}`}
            onChange={showText=>editArray("slides",page.slides.map(x=>x.id===slide.id?{...x,showText}:x))} />
          {imageControl(`hero-${slide.id}`,"بارگذاری تصویر / Upload image")}
          <span className="text-xs text-muted-foreground">{content.images[`hero-${slide.id}`]?"تصویر سفارشی آماده است / Custom image ready":(["0","1","2"].includes(slide.id)?"تصویر اصلی پیش‌فرض / Original fallback":"تصویر الزامی است / Image required")}</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">{(["eyebrow","title","description"] as const).map(part=><div key={part} className="space-y-2"><h4 className="text-sm font-medium">{part==="eyebrow"?"روتیتر / Eyebrow":part==="title"?"عنوان / Title":"شرح / Description"}</h4>{languageFields(slide[part] as Record<string,string>,(locale,v)=>editArray("slides",page.slides.map(x=>x.id===slide.id?{...x,[part]:{...x[part],[locale]:v}}:x)),part==="description")}</div>)}</div>
      </article>)}
      <Button type="button" data-testid="landing-slide-add" variant="outline" disabled={locked||page.slides.length>=10} onClick={()=>editArray("slides",[...page.slides,{id:makeId("slide"),isActive:true,eyebrow:{},title:{},description:{}}])}><Plus className="mr-1 h-4 w-4"/>افزودن بنر / Add slide</Button></div></details>
    <details data-setting-group="stats" className="rounded-xl border bg-card p-4"><summary className="cursor-pointer font-semibold">آمار / Statistics</summary><div className="mt-4 space-y-4">{locales.map(([locale,localeName])=><StatisticsRepeater key={locale} localeName={localeName} rows={page.stats[locale]??[]} sourceRows={sourceDefaults.stats[locale]??[]} onChange={rows=>patch({stats:{...page.stats,[locale]:rows}})} locked={locked}/>)}</div></details>
    <details data-setting-group="process" className="rounded-xl border bg-card p-4"><summary className="cursor-pointer font-semibold">مراحل فرایند / Process steps</summary><div className="mt-4 space-y-4">{locales.map(([locale,localeName])=><ProcessRepeater key={locale} localeName={localeName} rows={page.process[locale]??[]} sourceRows={sourceDefaults.process[locale]??[]} onChange={rows=>patch({process:{...page.process,[locale]:rows}})} locked={locked}/>)}</div></details>
    <div className="space-y-3">{linkArray("navigation","پیوندهای ناوبری / Navigation links")}{linkArray("footerCompany","پیوندهای شرکت در پاورقی / Footer company links")}{linkArray("footerConnect","پیوندهای ارتباط در پاورقی / Footer connect links")}{linkArray("social","شبکه‌های اجتماعی / Social links")}</div>
    <details data-setting-group="actions" className="rounded-xl border bg-card p-4">
      <summary className="cursor-pointer font-semibold">پیوندهای اقدام / Action destinations</summary>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {(Object.keys(page.actions) as Array<keyof typeof page.actions>).map(key =>
          <div key={key}>{field(
            ({heroPrimary:"اقدام اصلی بنر / Hero primary",heroSecondary:"اقدام دوم بنر / Hero secondary",about:"اقدام درباره / About action",shop:"فروشگاه / Shop",privacy:"حریم خصوصی / Privacy",terms:"شرایط / Terms"} as Record<string,string>)[key],
            page.actions[key], value => patch({actions:{...page.actions,[key]:value}}),
          )}</div>
        )}
      </div>
    </details>
     <details className="rounded-xl border bg-card p-4" data-setting-group="partners"><summary className="cursor-pointer font-semibold">شرکای مورد اعتماد / Partners</summary><div className="mt-4 space-y-3">{page.partners.map((partner,i)=><article key={partner.id} className="space-y-3 rounded-lg border p-3"><div className="flex justify-between"><strong>{partner.id}</strong><div className="flex">{moveButtons(i,page.partners.length,d=>editArray("partners",move([...page.partners],i,d)))}<Button type="button" size="sm" variant="ghost" disabled={locked} aria-label="حذف شریک / Delete partner" onClick={()=>{editArray("partners",page.partners.filter(x=>x.id!==partner.id));const images={...content.images};delete images[`partner-${partner.id}`];onContentChange({...content,images});}}><Trash2 className="h-4 w-4"/></Button></div></div><div className="grid gap-3 md:grid-cols-2"><p className="text-xs text-muted-foreground">شناسه / ID: {partner.id}</p><label className="space-y-1.5 text-sm"><span className="font-medium">نماد / Icon</span><select className="w-full rounded-md border bg-background px-3 py-2" disabled={locked} value={partner.icon} onChange={e=>editArray("partners",page.partners.map(x=>x.id===partner.id?{...x,icon:e.target.value as typeof x.icon}:x))}>{iconChoices.map(icon=><option key={icon}>{icon}</option>)}</select></label>{field("پیوند اختیاری / Optional link",partner.href??"",v=>editArray("partners",page.partners.map(x=>x.id===partner.id?{...x,href:v||undefined}:x)))}</div>{languageFields(partner.labels,(locale,v)=>editArray("partners",page.partners.map(x=>x.id===partner.id?{...x,labels:{...x.labels,[locale]:v}}:x)))}<div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={locked} checked={partner.isActive} onChange={e=>editArray("partners",page.partners.map(x=>x.id===partner.id?{...x,isActive:e.target.checked}:x))}/>نمایش / Visible</label>{imageControl(`partner-${partner.id}`,"بارگذاری آیکن / Upload icon")}</div></article>)}<Button type="button" variant="outline" disabled={locked||page.partners.length>=20} onClick={()=>editArray("partners",[...page.partners,{id:makeId("partner"),icon:"industry",labels:{},isActive:true}])}><Plus className="mr-1 h-4 w-4"/>افزودن شریک / Add partner</Button></div></details>
     <details data-setting-group="rating" className="rounded-xl border bg-card p-4"><summary className="cursor-pointer font-semibold">امتیاز و فرم / Rating & inquiry form</summary><div className="mt-4 space-y-4"><div className="grid gap-3 md:grid-cols-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={locked} checked={page.rating.enabled} onChange={e=>patch({rating:{...page.rating,enabled:e.target.checked}})}/>نمایش امتیاز / Show rating</label>{field("امتیاز / Score",page.rating.score,v=>patch({rating:{...page.rating,score:v}}))}{field("تعداد ستاره / Stars",String(page.rating.stars),v=>patch({rating:{...page.rating,stars:Number(v)}}),{type:"number"})}{field("پیوند / Link",page.rating.href??"",v=>patch({rating:{...page.rating,href:v||undefined}}))}</div><fieldset data-setting-group="form"><legend className="mb-2 font-medium">فیلدهای اختیاری فرم / Optional inquiry fields</legend><div className="space-y-2">{landingFormFieldKeys.map(key=>{const item=page.form.fields[key];return <div key={key} className="flex flex-wrap items-center gap-4 rounded-md border p-3 text-sm"><strong className="min-w-40">{fieldTitles[key]}</strong><label className="flex items-center gap-2"><input type="checkbox" disabled={locked} checked={item.visible} onChange={e=>patch({form:{fields:{...page.form.fields,[key]:{...item,visible:e.target.checked,required:e.target.checked?item.required:false}}}})}/>نمایان / Visible</label><label className="flex items-center gap-2"><input type="checkbox" disabled={locked||!item.visible} checked={item.required} onChange={e=>patch({form:{fields:{...page.form.fields,[key]:{...item,required:e.target.checked}}}})}/>الزامی / Required</label></div>})}<p className="text-xs text-muted-foreground">نام کامل و ایمیل همیشه الزامی هستند. / Full name and email are always required.</p></div></fieldset></div></details>
      <details className="rounded-xl border bg-card p-4" data-setting-group="packages"><summary className="cursor-pointer font-semibold">بسته‌بندی و ترجمه / Packages & translations</summary><div className="mt-4 space-y-4">{packageIds.map(id=><article key={id} className="space-y-3 rounded-lg border p-3"><h4 className="font-medium">{namesFor[id]}</h4><div className="grid gap-3 md:grid-cols-2">{(["name","description","capacity"] as const).map(part=><div key={part}><span className="mb-2 block text-sm font-medium">{part==="name"?"نام بسته‌بندی / Package name":part==="description"?"شرح / Description":"ظرفیت / Capacity"}</span>{languageFields({en:part==="name"?PACKAGES[id].name:part==="description"?PACKAGES[id].description:PACKAGES[id].capacity,...page.packages[id]?.[part]},(locale,v)=>{const current=page.packages[id]??{name:{},description:{}};patch({packages:{...page.packages,[id]:{...current,[part]:{...(current[part]??{}),[locale]:v}}}});},part==="description")}</div>)}</div></article>)}</div></details>
    <details className="rounded-xl border bg-card p-4" data-setting-group="cards"><summary className="cursor-pointer font-semibold">تنظیمات کارت محصولات / Product card settings</summary><div className="mt-4 space-y-3">{[...BASE_PRODUCTS,...content.custom].map(product=>{const setting=page.cards[product.id]??{isActive:true,order:BASE_PRODUCTS.findIndex(p=>p.id===product.id)>=0?BASE_PRODUCTS.findIndex(p=>p.id===product.id):BASE_PRODUCTS.length+content.custom.findIndex(p=>p.id===product.id),pack:product.pack,specs:{en:product.specs}};return <article key={product.id} className="space-y-3 rounded-lg border p-3"><h4 className="font-medium">{product.title}</h4><div className="flex flex-wrap items-center gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={locked} checked={setting.isActive} onChange={e=>patch({cards:{...page.cards,[product.id]:{...setting,isActive:e.target.checked}}})}/>فعال / Active</label>{field("ترتیب / Order",String(setting.order),v=>patch({cards:{...page.cards,[product.id]:{...setting,order:Number(v)}}}),{type:"number"})}</div><fieldset><legend className="mb-2 text-sm font-medium">بسته‌بندی / Packaging</legend><div className="flex flex-wrap gap-3">{packageIds.map(id=><label key={id} className="flex items-center gap-2 text-xs"><input type="checkbox" disabled={locked} checked={setting.pack.includes(id)} onChange={e=>{const pack=e.target.checked?[...setting.pack,id]:setting.pack.filter(x=>x!==id);patch({cards:{...page.cards,[product.id]:{...setting,pack}}});}}/>{namesFor[id]}</label>)}</div></fieldset><div className="space-y-2"><h5 className="text-sm font-medium">مشخصات هر زبان / Specifications by language</h5>{locales.map(([locale,name])=><label key={locale} className="block space-y-1 text-sm"><span>{name}</span><Textarea disabled={locked} dir={locale==="fa"||locale==="ar"?"rtl":"ltr"} value={(setting.specs[locale]??[]).join("\n")} onChange={e=>patch({cards:{...page.cards,[product.id]:{...setting,specs:{...setting.specs,[locale]:e.target.value.split("\n").slice(0,30)}}}})} rows={2} placeholder={product.specs.join("\n")}/></label>)}</div></article>})}</div></details>
    <details className="rounded-xl border bg-card p-4" data-setting-group="images"><summary className="cursor-pointer font-semibold">تصویر سئو / SEO image</summary><div className="mt-3 flex flex-wrap items-center gap-3">{content.images.seo&&<img src={content.images.seo} alt="SEO preview" className="h-20 w-32 rounded-md object-cover"/>}{imageControl("seo","بارگذاری تصویر سئو / Upload SEO image")}<span className="text-xs text-muted-foreground">برای بازگردانی تصویر مبنا، تصویر سفارشی را حذف کنید. / Remove uploaded image to restore source.</span>{content.images.seo&&<Button type="button" size="sm" variant="outline" disabled={locked} onClick={()=>{const images={...content.images};delete images.seo;onContentChange({...content,images});}}><Trash2 className="mr-1 h-4 w-4"/>حذف تصویر / Remove image</Button>}</div></details>
  </section>;
}
