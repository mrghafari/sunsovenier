import { AlertTriangle, Scale } from "lucide-react";

export type ContractWeightControl = {
  status: "WITHIN_CONTRACT" | "CONTRACT_LIMIT_EXCEEDED" | "CONTRACT_TERMS_REQUIRED" | "ORDER_WEIGHT_REQUIRED" | "INVALID_LOADING_HISTORY";
  orderedWeightTons: string | null;
  loadedWeightTons: string | null;
  excessWeightTons: string | null;
  allowedWeightTons: string | null;
  allowancePercent: string | null;
  contractNumber: string | null;
  loadingCount: number;
  reviewDepartment: "commercial";
  postingAllowed: false;
};

type Language = "fa" | "ar" | "en" | "tr";

const copy = {
  en: {
    title: "Contract weight control", scope: "Calculated from cumulative loading history across the order", status: {
      WITHIN_CONTRACT: "Within contract allowance",
      CONTRACT_LIMIT_EXCEEDED: "Contract limit exceeded",
      CONTRACT_TERMS_REQUIRED: "Contract allowance required",
      ORDER_WEIGHT_REQUIRED: "Ordered weight required",
      INVALID_LOADING_HISTORY: "Loading history needs review",
    }, contract: "Contract", count: "Cumulative loadings", ordered: "Ordered weight", loaded: "Loaded weight",
    excess: "Excess weight", allowed: "Allowed weight", allowance: "Contract allowance", review: "Commercial review required",
    noPosting: "Read-only control. Posting remains disabled; no approval or posting is activated here.",
    unknown: "Not available",
  },
  fa: {
    title: "کنترل وزن قراردادی", scope: "محاسبه بر اساس سوابق تجمیعی بارگیری کل سفارش", status: {
      WITHIN_CONTRACT: "در محدودهٔ مجاز قرارداد",
      CONTRACT_LIMIT_EXCEEDED: "عبور از سقف قرارداد",
      CONTRACT_TERMS_REQUIRED: "نیازمند تعیین شرط قرارداد",
      ORDER_WEIGHT_REQUIRED: "وزن سفارش لازم است",
      INVALID_LOADING_HISTORY: "سوابق بارگیری نیازمند بررسی است",
    }, contract: "قرارداد", count: "بارگیری‌های تجمیعی", ordered: "وزن سفارش", loaded: "وزن بارگیری‌شده",
    excess: "وزن اضافه", allowed: "وزن مجاز", allowance: "سقف قراردادی", review: "بررسی واحد بازرگانی لازم است",
    noPosting: "این کنترل فقط‌خواندنی است. ثبت حسابداری غیرفعال می‌ماند؛ در اینجا تأیید یا ثبت فعال نمی‌شود.",
    unknown: "در دسترس نیست",
  },
  ar: {
    title: "التحقق من الوزن التعاقدي", scope: "محسوب من سجل التحميل التراكمي للطلب بالكامل", status: {
      WITHIN_CONTRACT: "ضمن الحد التعاقدي",
      CONTRACT_LIMIT_EXCEEDED: "تم تجاوز الحد التعاقدي",
      CONTRACT_TERMS_REQUIRED: "يلزم تحديد شرط العقد",
      ORDER_WEIGHT_REQUIRED: "يلزم وزن الطلب",
      INVALID_LOADING_HISTORY: "سجل التحميل يحتاج إلى مراجعة",
    }, contract: "العقد", count: "عمليات التحميل التراكمية", ordered: "الوزن المطلوب", loaded: "الوزن المحمّل",
    excess: "الوزن الزائد", allowed: "الوزن المسموح", allowance: "السماحية التعاقدية", review: "مراجعة الإدارة التجارية مطلوبة",
    noPosting: "هذا التحقق للقراءة فقط. يبقى الترحيل معطلاً ولا يتم تفعيل أي اعتماد أو ترحيل هنا.",
    unknown: "غير متاح",
  },
  tr: {
    title: "Sözleşme ağırlık kontrolü", scope: "Siparişin tüm yükleme geçmişinin toplamından hesaplanır", status: {
      WITHIN_CONTRACT: "Sözleşme sınırları içinde",
      CONTRACT_LIMIT_EXCEEDED: "Sözleşme sınırı aşıldı",
      CONTRACT_TERMS_REQUIRED: "Sözleşme şartı gerekli",
      ORDER_WEIGHT_REQUIRED: "Sipariş ağırlığı gerekli",
      INVALID_LOADING_HISTORY: "Yükleme geçmişi incelenmeli",
    }, contract: "Sözleşme", count: "Toplam yükleme", ordered: "Sipariş ağırlığı", loaded: "Yüklenen ağırlık",
    excess: "Fazla ağırlık", allowed: "İzin verilen ağırlık", allowance: "Sözleşme sınırı", review: "Ticari birim incelemesi gerekli",
    noPosting: "Bu kontrol salt okunurdur. Muhasebe kaydı kapalı kalır; burada onay veya kayıt etkinleştirilmez.",
    unknown: "Mevcut değil",
  },
} as const;

export function ContractWeightControlDisplay({ control, language }: { control: ContractWeightControl; language: Language }) {
  const labels = copy[language];
  const within = control.status === "WITHIN_CONTRACT";
  const value = (amount: string | null, suffix = "t") => amount === null ? labels.unknown : `${amount} ${suffix}`;
  return <section aria-label={labels.title} className={`mt-4 overflow-hidden rounded-xl border ${within ? "border-[#cddfd2] bg-[#f2f7f1]" : "border-[#e5d5b9] bg-[#fbf5e9]"}`}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-current/10 px-3 py-3 md:px-4">
      <div className="flex items-center gap-2.5">
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${within ? "bg-[#dceade] text-[#426c53]" : "bg-[#f0e4cc] text-[#80633a]"}`}>
          {within ? <Scale className="h-4 w-4"/> : <AlertTriangle className="h-4 w-4"/>}
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#718077]">{labels.title}</p>
          <p className="mt-0.5 text-[11px] text-[#758179]">{labels.scope}</p>
          <p className={`mt-1 text-sm font-semibold ${within ? "text-[#345b43]" : "text-[#74552e]"}`}>{labels.status[control.status]}</p>
        </div>
      </div>
      {!within && <span className="rounded-full border border-[#ddc99f] bg-[#fffaf0] px-2.5 py-1 text-[10px] font-bold text-[#74552e]">{labels.review}</span>}
    </div>
    <div className="grid gap-x-5 gap-y-3 px-3 py-3 sm:grid-cols-2 xl:grid-cols-4 md:px-4">
      <Metric label={labels.contract} value={control.contractNumber || labels.unknown} text/>
      <Metric label={labels.count} value={String(control.loadingCount)} text/>
      <Metric label={labels.ordered} value={value(control.orderedWeightTons)}/>
      <Metric label={labels.loaded} value={value(control.loadedWeightTons)}/>
      <Metric label={labels.excess} value={value(control.excessWeightTons)}/>
      <Metric label={labels.allowed} value={value(control.allowedWeightTons)}/>
      <Metric label={labels.allowance} value={control.allowancePercent === null ? labels.unknown : `${control.allowancePercent}%`}/>
    </div>
    <p className="border-t border-current/10 px-3 py-2.5 text-xs leading-5 text-[#6b6657] md:px-4">{labels.noPosting}</p>
  </section>;
}

function Metric({ label, value, text = false }: { label: string; value: string; text?: boolean }) {
  return <div className="min-w-0">
    <p className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#7b887f]">{label}</p>
    <p dir={text ? undefined : "ltr"} className={`mt-1 break-words text-sm text-[#344a44] ${text ? "font-medium" : "font-mono tabular-nums font-semibold"}`}>{value}</p>
  </div>;
}
