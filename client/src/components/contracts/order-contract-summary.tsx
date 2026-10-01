import React, { useEffect, useState } from "react";
import { getContractDeliveryTiming } from "@shared/contract-time";
import type { ShopContractSummary } from "@shared/shop-contract-summary";
import { contractTheme } from "@/lib/contract-theme";

export type OrderContractSummaryData = ShopContractSummary;

const copy = {
  fa: {
    title: "وضعیت فعلی قرارداد", unavailable: "اطلاعات قرارداد در دسترس نیست.",
    remaining: "مقدار باقی‌مانده", remainingValue: "ارزش باقی‌مانده", deliveryDate: "موعد تحویل قرارداد",
    time: "زمان باقی‌مانده تا موعد تحویل", active: "فعال", paused: "غیرفعال", ended: "پایان‌یافته",
    noDate: "موعد تحویل ثبت نشده", invalidDate: "تاریخ تحویل معتبر ثبت نشده", today: "موعد تحویل امروز است",
    days: (n: string) => `${n} روز باقی‌مانده`, overdue: (n: string) => `${n} روز از موعد تحویل گذشته`,
    product: "کالا", cap: "مقدار کل قرارداد", used: "مقدار تخصیص‌یافته", noItems: "کالای فعالی در این قرارداد نیست.",
    current: "این ماندهٔ فعلی قرارداد است و تخصیص‌های رزروشده را هم در نظر می‌گیرد؛ ارقام سفارش بالا مربوط به زمان خرید هستند.",
  },
  ar: {
    title: "حالة العقد الحالية", unavailable: "معلومات العقد غير متاحة.",
    remaining: "الكمية المتبقية", remainingValue: "القيمة المتبقية", deliveryDate: "موعد تسليم العقد",
    time: "الوقت المتبقي حتى موعد التسليم", active: "نشط", paused: "غير نشط", ended: "منتهٍ",
    noDate: "لم يُحدد موعد التسليم", invalidDate: "لا يوجد تاريخ تسليم صالح", today: "موعد التسليم اليوم",
    days: (n: string) => `${n} يوم متبقٍ`, overdue: (n: string) => `مرّ ${n} يوم على موعد التسليم`,
    product: "المنتج", cap: "إجمالي كمية العقد", used: "الكمية المخصصة", noItems: "لا توجد منتجات نشطة في هذا العقد.",
    current: "هذا رصيد العقد الحالي ويشمل التخصيصات المحجوزة؛ أرقام الطلب أعلاه تخص وقت الشراء.",
  },
  en: {
    title: "Current contract balance", unavailable: "Contract information is unavailable.",
    remaining: "Remaining quantity", remainingValue: "Remaining value", deliveryDate: "Contract delivery date",
    time: "Time until delivery date", active: "Active", paused: "Inactive", ended: "Ended",
    noDate: "No delivery date set", invalidDate: "No valid delivery date recorded", today: "Delivery is due today",
    days: (n: string) => `${n} days remaining`, overdue: (n: string) => `${n} days past the delivery date`,
    product: "Product", cap: "Contract quantity", used: "Allocated quantity", noItems: "This contract has no active products.",
    current: "This is the current contract balance, including reserved allocations; the order figures above reflect the purchase.",
  },
  tr: {
    title: "Güncel sözleşme bakiyesi", unavailable: "Sözleşme bilgileri kullanılamıyor.",
    remaining: "Kalan miktar", remainingValue: "Kalan değer", deliveryDate: "Sözleşme teslim tarihi",
    time: "Teslim tarihine kalan süre", active: "Aktif", paused: "Pasif", ended: "Sona erdi",
    noDate: "Teslim tarihi belirtilmemiş", invalidDate: "Geçerli teslim tarihi kaydedilmemiş", today: "Teslim tarihi bugün",
    days: (n: string) => `${n} gün kaldı`, overdue: (n: string) => `Teslim tarihinin üzerinden ${n} gün geçti`,
    product: "Ürün", cap: "Sözleşme miktarı", used: "Tahsis edilen miktar", noItems: "Bu sözleşmede aktif ürün yok.",
    current: "Bu güncel bakiye, ayrılmış tahsisleri içerir; yukarıdaki sipariş tutarları satın alma anını yansıtır.",
  },
};

export default function OrderContractSummary({
  summary, language,
}: { summary: OrderContractSummaryData | null | undefined; language: "fa" | "ar" | "en" | "tr" }) {
  const text = copy[language];
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const format = (n: number) => new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(n);
  if (!summary) return <p role="status" className={`mb-3 rounded border p-3 text-sm ${contractTheme.panel}`}>{text.unavailable}</p>;
  const timing = getContractDeliveryTiming(summary.deliveryDate, summary.deliveryDateStatus, summary.endedAt, now);
  const timingLabel = timing.state === "ended" ? text.ended
    : timing.state === "unset" ? text.noDate
    : timing.state === "unparseable" ? text.invalidDate
    : timing.state === "today" ? text.today
    : timing.state === "upcoming" ? text.days(format(timing.days))
    : text.overdue(format(timing.days));
  const deliveryDay = summary.deliveryDate ? new Date(`${summary.deliveryDate}T12:00:00`) : null;
  const dateLabel = deliveryDay && Number.isFinite(deliveryDay.getTime())
    ? new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(deliveryDay)
    : summary.deliveryDateStatus === "unparseable" ? text.invalidDate : text.noDate;

  return (
    <section className={`mt-3 space-y-3 rounded border p-3 ${contractTheme.panel}`} aria-label={text.title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className={`flex flex-wrap items-center gap-2 text-sm font-semibold ${contractTheme.text}`}>
          {text.title} <span dir="ltr" className="font-mono">{summary.number}</span>
        </h4>
        <span className={`rounded border px-2 py-1 text-xs ${contractTheme.badge}`}>
          {summary.endedAt ? text.ended : summary.isActive ? text.active : text.paused}
        </span>
      </div>
      <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
        {[
          [text.remaining, format(summary.remainingQuantity)],
          [text.remainingValue, `${format(summary.remainingValue)} ${summary.currency}`],
          [text.deliveryDate, dateLabel],
          [text.time, timingLabel],
        ].map(([label, value]) => <div key={label}>
          <dt className="mb-1 text-muted-foreground">{label}</dt><dd className="font-semibold">{value}</dd>
        </div>)}
      </dl>
      <div className={`overflow-x-auto rounded border ${contractTheme.panel}`}>
        <table className={`min-w-[420px] text-start ${contractTheme.table}`}>
          <thead className={contractTheme.tableHead}><tr>
            {[text.product, text.cap, text.used, text.remaining].map(label =>
              <th key={label} className="px-3 py-2 text-start font-medium">{label}</th>)}
          </tr></thead>
          <tbody>{summary.items.map(item => <tr key={item.productId} className={contractTheme.tableRow}>
            <td className="px-3 py-2">{item.productName}</td>
            <td className="px-3 py-2 tabular-nums">{format(item.maxQuantity)}</td>
            <td className="px-3 py-2 tabular-nums">{format(item.usedQuantity)}</td>
            <td className={`px-3 py-2 font-semibold tabular-nums ${contractTheme.text}`}>{format(item.remainingQuantity)}</td>
          </tr>)}
          {!summary.items.length && <tr><td colSpan={4} className="px-3 py-3 text-muted-foreground">{text.noItems}</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">{text.current}</p>
    </section>
  );
}