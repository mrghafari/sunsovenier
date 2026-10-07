import { useEffect, useState } from "react";
import type { ContractPackaging, PackagingType } from "@shared/contract-packaging";
import { packagingTypes } from "@shared/contract-packaging";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const labels = {
  en: { title: "Packaging charge", none: "No separate packaging charge", type: "Packaging type", custom: "Specify packaging", fee: "Charge per net tonne (IQD)", vat: "Packaging VAT (%)", types: ["Bulk", "Drum", "Jumbo bag", "Big bag", "Bag", "IBC tank", "Other"] },
  fa: { title: "هزینهٔ بسته‌بندی", none: "بدون هزینهٔ جداگانهٔ بسته‌بندی", type: "نوع بسته‌بندی", custom: "نوع بسته‌بندی را مشخص کنید", fee: "هزینه برای هر تن خالص (دینار)", vat: "درصد مالیات بسته‌بندی", types: ["فله", "بشکه", "جامبوبگ", "بیگ‌بگ", "کیسه", "مخزن IBC", "سایر"] },
  ar: { title: "رسوم التعبئة", none: "لا توجد رسوم تعبئة منفصلة", type: "نوع التعبئة", custom: "حدد نوع التعبئة", fee: "الرسم لكل طن صافٍ (دينار)", vat: "ضريبة التعبئة (%)", types: ["سائب", "برميل", "جامبو باغ", "بيغ باغ", "كيس", "خزان IBC", "أخرى"] },
  tr: { title: "Paketleme ücreti", none: "Ayrı paketleme ücreti yok", type: "Paketleme türü", custom: "Paketleme türünü belirtin", fee: "Net ton başına ücret (IQD)", vat: "Paketleme KDV oranı (%)", types: ["Dökme", "Varil", "Jumbo bag", "Big bag", "Çuval", "IBC tankı", "Diğer"] },
} as const;

export function ContractPackagingFields({ value, onChange, language }: {
  value: ContractPackaging | null;
  onChange: (value: ContractPackaging | null) => void;
  language: string;
}) {
  const text = labels[(language || "en").split("-")[0] as keyof typeof labels] || labels.en;
  const [enabled, setEnabled] = useState(value !== null);
  useEffect(() => setEnabled(value !== null), [value]);
  const type = value?.type || "bulk";
  const change = (patch: Partial<ContractPackaging>) => onChange({ type, customName: "", costPerTonne: 0, vatRatePercent: 0, ...value, ...patch });
  return <section className="space-y-3 rounded-md border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900 dark:bg-teal-950/20">
    <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">{text.title}</h3><p className="text-xs text-muted-foreground">{language === "fa" ? "هزینهٔ بسته‌بندی جدا از قیمت کالا محاسبه می‌شود." : language === "ar" ? "تُحسب رسوم التعبئة بشكل منفصل عن سعر البضائع." : language === "tr" ? "Paketleme ücreti ürün fiyatından ayrı hesaplanır." : "Packaging is billed separately from goods prices."}</p></div>
      <label className="flex shrink-0 items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(event) => { const next = event.target.checked; setEnabled(next); onChange(next ? value || { type: "bulk", customName: "", costPerTonne: 0, vatRatePercent: 0 } : null); }} />{enabled ? (language === "fa" ? "فعال" : language === "ar" ? "مفعّل" : language === "tr" ? "Etkin" : "Enabled") : text.none}</label></div>
    {enabled && <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1"><Label>{text.type}</Label><Select value={type} onValueChange={(selected) => change({ type: selected as PackagingType, customName: "" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{packagingTypes.map((item, index) => <SelectItem key={item} value={item}>{text.types[index]}</SelectItem>)}</SelectContent></Select></div>
      {type === "other" && <div className="space-y-1"><Label>{text.custom}</Label><Input maxLength={100} value={value?.customName || ""} onChange={(event) => change({ customName: event.target.value })} /></div>}
      <div className="space-y-1"><Label>{text.fee}</Label><Input type="number" min="0" step="1" value={value?.costPerTonne ?? ""} onChange={(event) => change({ costPerTonne: event.target.value === "" ? ("" as unknown as number) : Number(event.target.value) })} /></div>
      <div className="space-y-1"><Label>{text.vat}</Label><Input type="number" min="0" max="100" step="0.01" value={value?.vatRatePercent ?? ""} onChange={(event) => change({ vatRatePercent: event.target.value === "" ? ("" as unknown as number) : Number(event.target.value) })} /></div>
    </div>}
  </section>;
}
