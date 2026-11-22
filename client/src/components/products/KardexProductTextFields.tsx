import { useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { HelpCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { KardexProductForm } from "@/pages/products";
import { kardexLocalizedFields, productLanguages, productLocalizationFields, type KardexLocalizedField, type ProductLanguage } from "@shared/product-localizations";

const names = { en: "English", fa: "فارسی", ar: "العربية", tr: "Türkçe" };
const copy = {
  en: { label: "Product information language", hint: "Blank fields use the existing translation or the original text." },
  fa: { label: "زبان اطلاعات محصول", hint: "برای فیلدهای خالی، ترجمهٔ موجود یا متن اصلی نمایش داده می‌شود." },
  ar: { label: "لغة معلومات المنتج", hint: "تستخدم الحقول الفارغة الترجمة الموجودة أو النص الأصلي." },
  tr: { label: "Ürün bilgisi dili", hint: "Boş alanlarda mevcut çeviri veya özgün metin gösterilir." },
};
const directions = { en: "ltr", fa: "rtl", ar: "rtl", tr: "ltr" } as const;

function textValue(value: unknown, name: KardexLocalizedField): string {
  if (typeof value === "string") return value;
  if (name === "specifications" && value && typeof value === "object") return JSON.stringify(value, null, 2);
  if (Array.isArray(value)) return value.join("\n");
  return "";
}

export function KardexProductTextFields({ form, multilingual }: {
  form: UseFormReturn<KardexProductForm>;
  multilingual: boolean;
}) {
  const { language, t } = useLanguage();
  const [active, setActive] = useState<ProductLanguage>("en");
  const saved = useWatch({ control: form.control, name: "productLocalizations" });
  const m = t.productManagement;
  const labels = {
    technicalName: [m.technicalName, m.technicalNameHelp, m.technicalNamePlaceholder],
    description: [m.description, m.descriptionHelp, m.descriptionPlaceholder],
    specifications: [m.technicalSpecifications, m.technicalSpecificationsHelp, m.technicalSpecificationsPlaceholder],
    features: [m.productFeatures, m.productFeaturesHelp, m.productFeaturesPlaceholder],
    applications: [m.productApplications, m.productApplicationsHelp, m.productApplicationsPlaceholder],
  };

  const setTranslation = (locale: ProductLanguage, name: KardexLocalizedField, value: string) => {
    const current = form.getValues("productLocalizations");
    form.setValue("productLocalizations", {
      ...current, [locale]: { ...current?.[locale], [name]: value },
    }, { shouldDirty: true });
  };

  const renderFields = (locale: ProductLanguage) => kardexLocalizedFields.map(name => {
    const [label, help, placeholder] = labels[name];
    const labelContent = <>{label}<Tooltip>
      <TooltipTrigger type="button" aria-label={label}><HelpCircle className="h-3 w-3 text-gray-400" /></TooltipTrigger>
      <TooltipContent><p>{help}</p></TooltipContent>
    </Tooltip></>;
    const renderInput = (props: React.ComponentProps<typeof Input> & React.ComponentProps<typeof Textarea>) =>
      name === "technicalName"
        ? <Input {...props} className="h-9" />
        : <Textarea {...props} className={`min-h-[80px] resize-none ${name === "specifications" ? "font-mono text-xs" : ""}`} />;
    const common = { placeholder, lang: locale, dir: directions[locale] };
    if (locale === "en") {
      return <FormField key={name} control={form.control} name={name} render={({ field }) => {
        const override = multilingual ? saved?.en?.[name] : undefined;
        return <FormItem>
          <FormLabel className="flex items-center gap-2 text-sm">{labelContent}</FormLabel>
          <FormControl>
            {renderInput({
              ...common, name, onBlur: field.onBlur,
              value: override || textValue(field.value, name),
              onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                const value = event.currentTarget.value;
                field.onChange(value);
                if (override !== undefined) setTranslation("en", name, value);
              },
            })}
          </FormControl>
          <FormMessage />
        </FormItem>;
      }} />;
    }
    const fieldName = `productLocalizations.${locale}.${name}`;
    return <div key={name} className="space-y-2">
      <Label htmlFor={fieldName} className="flex items-center gap-2 text-sm">{labelContent}</Label>
      {renderInput({
        ...common, id: fieldName, name: fieldName, maxLength: productLocalizationFields[name],
        value: saved?.[locale]?.[name] ?? "",
        onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setTranslation(locale, name, event.currentTarget.value),
      })}
    </div>;
  });

  if (!multilingual) return <div className="mt-3 space-y-3">{renderFields("en")}</div>;

  return <Tabs value={active} onValueChange={value => setActive(value as ProductLanguage)} dir={directions[language]} className="mt-4" data-testid="kardex-product-text">
    <TabsList aria-label={copy[language].label} className="grid h-auto w-full grid-cols-4">
      {productLanguages.map(locale => <TabsTrigger key={locale} value={locale} lang={locale}>{names[locale]}</TabsTrigger>)}
    </TabsList>
    {productLanguages.map(locale => <TabsContent key={locale} value={locale} className="space-y-3">
      {locale !== "en" && <p className="text-xs text-muted-foreground">{copy[language].hint}</p>}
      {active === locale && renderFields(locale)}
    </TabsContent>)}
  </Tabs>;
}
