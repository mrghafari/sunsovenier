import type { ChangeEvent } from "react";
import type { LandingLanguage } from "@shared/landing-content";
import type { LandingPageSettings } from "@shared/landing-page-settings";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SlideTextVisibilityToggle from "./SlideTextVisibilityToggle";

type Slide = LandingPageSettings["slides"][number];
const languageNames = { en: "English", fa: "فارسی", ar: "العربية", tr: "Türkçe" } as const;
const labels = {
  fa: { title: "متن اختصاصی همین اسلاید", language: "زبان متن", eyebrow: "روتیتر", heading: "عنوان اصلی", description: "توضیح", hint: "متن هر عکس را جداگانه وارد کنید. هر بخش خالی از متن عمومی سایت استفاده می‌کند. پنهان‌کردن متن، آن را حذف نمی‌کند." },
  en: { title: "This slide’s text", language: "Text language", eyebrow: "Eyebrow", heading: "Main heading", description: "Description", hint: "Write separate text for each image. Empty fields use the site's general text. Hiding text does not delete it." },
  ar: { title: "النص الخاص بهذه الشريحة", language: "لغة النص", eyebrow: "العنوان التمهيدي", heading: "العنوان الرئيسي", description: "الوصف", hint: "أدخل نصاً مستقلاً لكل صورة. تستخدم الحقول الفارغة النص العام للموقع. إخفاء النص لا يحذفه." },
  tr: { title: "Bu slaydın metni", language: "Metin dili", eyebrow: "Üst başlık", heading: "Ana başlık", description: "Açıklama", hint: "Her görsel için ayrı metin yazın. Boş alanlar sitenin genel metnini kullanır. Metni gizlemek onu silmez." },
} as const;

export default function SlideCaptionEditor({ slide, language, interfaceLanguage, onLanguageChange, onChange, disabled = false }: {
  slide: Slide;
  language: LandingLanguage;
  interfaceLanguage: LandingLanguage;
  onLanguageChange: (language: LandingLanguage) => void;
  onChange: (patch: Partial<Slide>) => void;
  disabled?: boolean;
}) {
  const copy = labels[interfaceLanguage];
  const direction = language === "fa" || language === "ar" ? "rtl" : "ltr";
  const languageId = `slide-caption-language-${slide.id}`;
  return <fieldset disabled={disabled} className="space-y-3 border-t p-3" data-testid={`slide-caption-${slide.id}`}>
    <legend className="sr-only">{copy.title}</legend>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="text-sm font-semibold">{copy.title}</h4>
      <SlideTextVisibilityToggle language={interfaceLanguage} visible={slide.showText !== false}
        disabled={disabled} testId={`slide-image-text-${slide.id}`}
        onChange={showText => onChange({ showText })} />
    </div>
    <label htmlFor={languageId} className="flex flex-wrap items-center gap-2 text-xs font-medium">
      {copy.language}
      <select id={languageId} data-testid={languageId} value={language} disabled={disabled}
        className="min-w-0 rounded-md border bg-background px-2 py-1.5"
        onChange={event => onLanguageChange(event.target.value as LandingLanguage)}>
        {Object.entries(languageNames).map(([value, name]) => <option value={value} key={value}>{name}</option>)}
      </select>
    </label>
    {(["eyebrow", "title", "description"] as const).map(part => {
      const id = `slide-caption-${slide.id}-${part}-${language}`;
      const props = {
        id, "data-testid": `slide-caption-${slide.id}-${part}`,
        dir: direction, value: slide[part][language] ?? "", maxLength: 12000,
        onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          onChange({ [part]: { ...slide[part], [language]: event.target.value } }),
      };
      return <div key={part} className="space-y-1">
        <label htmlFor={id} className="text-xs font-medium">{part === "title" ? copy.heading : copy[part]}</label>
        {part === "description" ? <Textarea {...props} rows={3} /> : <Input {...props} />}
      </div>;
    })}
    <p className="text-xs leading-relaxed text-muted-foreground">{copy.hint}</p>
  </fieldset>;
}
