import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { productDetailCopy } from "@/lib/shop-product-localization";
import {
  productLanguages, productLocalizationFields, type ProductLanguage, type ProductLocalizationField, type ProductLocalizations,
} from "@shared/product-localizations";

const copy = {
  en: { title: "Product text by language", name: "Product name", shortDescription: "Short description", hint: "Leave a field blank to use the existing translation or original product text." },
  fa: { title: "متن محصول به چهار زبان", name: "نام محصول", shortDescription: "توضیح کوتاه", hint: "اگر فیلدی خالی باشد، ترجمهٔ موجود یا متن اصلی محصول نمایش داده می‌شود." },
  ar: { title: "نص المنتج حسب اللغة", name: "اسم المنتج", shortDescription: "وصف مختصر", hint: "اترك الحقل فارغًا لاستخدام الترجمة الموجودة أو النص الأصلي للمنتج." },
  tr: { title: "Dile göre ürün metni", name: "Ürün adı", shortDescription: "Kısa açıklama", hint: "Mevcut çeviriyi veya özgün ürün metnini kullanmak için alanı boş bırakın." },
};

export const productLocalizationsSectionTitle = (language: ProductLanguage) => copy[language].title;
const languageNames = { en: "English", fa: "فارسی", ar: "العربية", tr: "Türkçe" };
const fields = Object.keys(productLocalizationFields) as ProductLocalizationField[];

export function ProductLocalizationsEditor({ language, value, onChange }: {
  language: ProductLanguage;
  value?: ProductLocalizations | null;
  onChange: (value: ProductLocalizations) => void;
}) {
  const [active, setActive] = useState<ProductLanguage>(language);
  const tx = productDetailCopy[language];
  const labels = { ...copy[language], description: tx.description, specifications: tx.specs, features: tx.features, applications: tx.applications };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{labels.hint}</p>
      <Tabs value={active} onValueChange={next => setActive(next as ProductLanguage)} dir={language === "fa" || language === "ar" ? "rtl" : "ltr"}>
        <TabsList aria-label={labels.title} className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
          {productLanguages.map(code => <TabsTrigger key={code} value={code} lang={code}>{languageNames[code]}</TabsTrigger>)}
        </TabsList>
        {productLanguages.map(code => (
          <TabsContent key={code} value={code} className="grid gap-3 sm:grid-cols-2">
            {fields.map(field => {
              const id = `product-localizations-${code}-${field}`;
              const props = {
                id,
                name: `productLocalizations.${code}.${field}`,
                lang: code,
                dir: code === "fa" || code === "ar" ? "rtl" : "ltr",
                maxLength: productLocalizationFields[field],
                value: value?.[code]?.[field] ?? "",
                onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  onChange({ ...value, [code]: { ...value?.[code], [field]: event.currentTarget.value } }),
              } as const;
              return <div key={field} className="space-y-1.5">
                <Label htmlFor={id}>{labels[field]}</Label>
                {field === "name" ? <Input {...props} /> : <Textarea {...props} rows={field === "shortDescription" ? 2 : 3} />}
              </div>;
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
