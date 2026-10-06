import type { ComponentType } from "react";
import DatePickerModule, { type DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persianFa from "react-date-object/locales/persian_fa";
import gregorianAr from "react-date-object/locales/gregorian_ar";
import gregorianEn from "react-date-object/locales/gregorian_en";
import { Label } from "@/components/ui/label";

export type ContractLanguage = "fa" | "ar" | "en" | "tr";

// Vite can expose an outer CommonJS wrapper for this package in production.
const DatePicker = ((DatePickerModule as any).default ?? DatePickerModule) as ComponentType<any>;

const turkishLocale = {
  ...gregorianEn,
  name: "gregorian_tr",
  months: [
    ["Ocak", "Oca"], ["Şubat", "Şub"], ["Mart", "Mar"], ["Nisan", "Nis"],
    ["Mayıs", "May"], ["Haziran", "Haz"], ["Temmuz", "Tem"], ["Ağustos", "Ağu"],
    ["Eylül", "Eyl"], ["Ekim", "Eki"], ["Kasım", "Kas"], ["Aralık", "Ara"],
  ],
  weekDays: [
    ["Cumartesi", "Cmt"], ["Pazar", "Paz"], ["Pazartesi", "Pzt"], ["Salı", "Sal"],
    ["Çarşamba", "Çar"], ["Perşembe", "Per"], ["Cuma", "Cum"],
  ],
  meridiems: [["ÖÖ", "öö"], ["ÖS", "ös"]],
};

const pickerLocales = {
  fa: { calendar: persian, locale: persianFa, format: "YYYY/MM/DD" },
  ar: { calendar: gregorian, locale: gregorianAr, format: "YYYY/MM/DD" },
  en: { calendar: gregorian, locale: gregorianEn, format: "YYYY/MM/DD" },
  tr: { calendar: gregorian, locale: turkishLocale, format: "YYYY/MM/DD" },
};

function dateFromIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4))
    && date.getMonth() + 1 === Number(value.slice(5, 7))
    && date.getDate() === Number(value.slice(8, 10)) ? date : null;
}

export default function ContractDatePicker({ id, label, language, value, onChange }: {
  id: string;
  label: string;
  language: ContractLanguage;
  value: string;
  onChange: (date: string) => void;
}) {
  const settings = pickerLocales[language];
  const isoValue = dateFromIso(value);
  const update = (selected: DateObject | DateObject[] | null) => {
    if (!selected || Array.isArray(selected)) return onChange("");
    const date = selected.toDate();
    onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
  };
  return <div className="space-y-1.5">
    <Label htmlFor={id}>{label}</Label>
    <DatePicker
      id={id}
      value={isoValue}
      onChange={update}
      calendar={settings.calendar}
      locale={settings.locale}
      format={settings.format}
      calendarPosition="bottom-right"
      containerClassName="w-full"
      inputClass="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      editable={false}
      aria-label={label}
    />
    {value && !isoValue && <p className="text-xs text-amber-700">{value} — {language === "fa" ? "برای تغییر تاریخ قدیمی، روز جدید را از تقویم انتخاب کنید." : language === "ar" ? "لتغيير التاريخ القديم، اختر تاريخًا من التقويم." : language === "tr" ? "Eski tarihi değiştirmek için takvimden yeni bir tarih seçin." : "Choose a new date from the calendar to replace the legacy date."}</p>}
  </div>;
}