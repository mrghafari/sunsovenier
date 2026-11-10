import { useId, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ExternalLink,
  Plus,
  Trash2,
  PackageCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  packagingSpecificationsSchema,
  type PackagingSpecifications,
} from "@shared/product-packaging";

type Language = "fa" | "en" | "ar" | "tr";
type AdditionalProperty = { name: string; value: string; unit?: string };

const copy = {
  en: {
    title: "Packaging specifications",
    subtitle: "Record manufacturer-provided container details and evidence.",
    identity: "Identity & material",
    capacity: "Capacity & dimensions",
    conditions: "Pressure, temperature & load",
    evidence: "Standards & evidence",
    custom: "Additional properties",
    notesGroup: "Notes & compatibility",
    containerType: "Container type",
    material: "Material",
    materialGrade: "Material grade",
    manufacturer: "Manufacturer",
    model: "Model",
    lining: "Lining",
    closure: "Closure",
    nominalCapacityL: "Nominal capacity (L)",
    usableCapacityL: "Usable capacity (L)",
    wallThicknessMm: "Wall thickness (mm)",
    tareWeightKg: "Tare weight (kg)",
    lengthMm: "Length (mm)",
    widthMm: "Width (mm)",
    heightMm: "Height (mm)",
    diameterMm: "Diameter (mm)",
    workingPressureBar: "Working pressure (bar)",
    testPressureKpa: "Test pressure (kPa)",
    minTemperatureC: "Minimum temperature (°C)",
    maxTemperatureC: "Maximum temperature (°C)",
    maxGrossMassKg: "Maximum gross mass (kg)",
    stackingLoadKg: "Stacking load (kg)",
    reusable: "Reusable",
    antistatic: "Antistatic",
    uvResistant: "UV resistant",
    standardReference: "Standard reference",
    unMark: "UN mark (as recorded)",
    performanceLevel: "Performance level",
    testReportReference: "Test report reference",
    propertyName: "Property name",
    propertyValue: "Value",
    unit: "Unit",
    addProperty: "Add property",
    removeProperty: "Remove property",
    compatibilityNotes: "Compatibility notes",
    notes: "Notes",
    unspecified: "Not specified",
    yes: "Yes",
    no: "No",
    select: "Select…",
    clear: "Clear specifications",
    confirmClear: "Remove all entered packaging specifications? This change remains a draft until you save the product.",
    warning: "Test pressure is not working pressure. Recorded values do not establish certification or chemical compatibility. Record only manufacturer information and test evidence.",
    reference: "Informational reference: UNECE Recommendations on the Transport of Dangerous Goods, chapters 6.1 and 6.5",
    validation: "Please review these specification details:",
    invalidValue: "Check this value against the recorded specification.",
    capacityConflict: "Usable capacity must not exceed nominal capacity.",
    temperatureConflict: "Maximum temperature must not be below minimum temperature.",
    incompleteRow: "Enter both a property name and value, or remove the incomplete row.",
    empty: "No packaging specifications recorded.",
    type: "Type",
    containerTypes: {
      bottle: "Bottle", jerrycan: "Jerrycan", can: "Can", drum: "Drum",
      ibc: "IBC", tank: "Tank", bag: "Bag", sack: "Sack", box: "Box",
      bulk: "Bulk", other: "Other",
    },
    materials: {
      hdpe: "HDPE", ldpe: "LDPE", pp: "PP", pet: "PET", steel: "Steel",
      stainless_steel: "Stainless steel", aluminium: "Aluminium", glass: "Glass",
      paper: "Paper", woven_pp: "Woven PP", composite: "Composite", other: "Other",
    },
    level: { X: "X", Y: "Y", Z: "Z" },
  },
  fa: {
    title: "مشخصات بسته‌بندی",
    subtitle: "جزئیات ظرف و شواهد ارائه‌شده توسط سازنده را ثبت کنید.",
    identity: "شناسه و جنس",
    capacity: "ظرفیت و ابعاد",
    conditions: "فشار، دما و بار",
    evidence: "استانداردها و شواهد",
    custom: "ویژگی‌های اضافی",
    notesGroup: "یادداشت و سازگاری",
    containerType: "نوع ظرف",
    material: "جنس",
    materialGrade: "گرید ماده",
    manufacturer: "سازنده",
    model: "مدل",
    lining: "آستر داخلی",
    closure: "نوع درب",
    nominalCapacityL: "ظرفیت اسمی (L)",
    usableCapacityL: "ظرفیت قابل استفاده (L)",
    wallThicknessMm: "ضخامت دیواره (mm)",
    tareWeightKg: "وزن خالص ظرف (kg)",
    lengthMm: "طول (mm)",
    widthMm: "عرض (mm)",
    heightMm: "ارتفاع (mm)",
    diameterMm: "قطر (mm)",
    workingPressureBar: "فشار کاری (bar)",
    testPressureKpa: "فشار آزمون (kPa)",
    minTemperatureC: "حداقل دما (°C)",
    maxTemperatureC: "حداکثر دما (°C)",
    maxGrossMassKg: "حداکثر جرم ناخالص (kg)",
    stackingLoadKg: "بار چیدمان (kg)",
    reusable: "قابل استفاده مجدد",
    antistatic: "آنتی‌استاتیک",
    uvResistant: "مقاوم در برابر UV",
    standardReference: "مرجع استاندارد",
    unMark: "نشان UN (طبق ثبت)",
    performanceLevel: "سطح عملکرد",
    testReportReference: "مرجع گزارش آزمون",
    propertyName: "نام ویژگی",
    propertyValue: "مقدار",
    unit: "واحد",
    addProperty: "افزودن ویژگی",
    removeProperty: "حذف ویژگی",
    compatibilityNotes: "یادداشت سازگاری",
    notes: "یادداشت‌ها",
    unspecified: "مشخص نشده",
    yes: "بله",
    no: "خیر",
    select: "انتخاب…",
    clear: "پاک‌کردن مشخصات",
    confirmClear: "همه مشخصات واردشده بسته‌بندی حذف شود؟ این تغییر تا زمان ذخیره محصول پیش‌نویس می‌ماند.",
    warning: "فشار آزمون، فشار کاری نیست. مقادیر ثبت‌شده به‌تنهایی گواهی یا سازگاری شیمیایی را اثبات نمی‌کنند. فقط اطلاعات سازنده و شواهد آزمون را ثبت کنید.",
    reference: "مرجع اطلاعاتی: توصیه‌نامه‌های UNECE برای حمل کالاهای خطرناک، فصل‌های 6.1 و 6.5",
    validation: "لطفاً این موارد را بررسی کنید:",
    invalidValue: "این مقدار را با مشخصات ثبت‌شده بررسی کنید.",
    capacityConflict: "ظرفیت قابل استفاده نباید از ظرفیت اسمی بیشتر باشد.",
    temperatureConflict: "حداکثر دما نباید کمتر از حداقل دما باشد.",
    incompleteRow: "نام و مقدار ویژگی را وارد کنید یا ردیف ناقص را حذف کنید.",
    empty: "مشخصات بسته‌بندی ثبت نشده است.",
    type: "نوع",
    containerTypes: {
      bottle: "بطری", jerrycan: "گالن", can: "قوطی", drum: "بشکه",
      ibc: "IBC", tank: "مخزن", bag: "کیسه", sack: "گونی", box: "جعبه",
      bulk: "فله", other: "سایر",
    },
    materials: {
      hdpe: "HDPE", ldpe: "LDPE", pp: "PP", pet: "PET", steel: "فولاد",
      stainless_steel: "فولاد زنگ‌نزن", aluminium: "آلومینیوم", glass: "شیشه",
      paper: "کاغذ", woven_pp: "PP بافته", composite: "کامپوزیت", other: "سایر",
    },
    level: { X: "X", Y: "Y", Z: "Z" },
  },
  ar: {
    title: "مواصفات العبوة",
    subtitle: "سجّل تفاصيل العبوة والأدلة المقدمة من الشركة المصنّعة.",
    identity: "الهوية والمادة",
    capacity: "السعة والأبعاد",
    conditions: "الضغط والحرارة والحمولة",
    evidence: "المعايير والأدلة",
    custom: "خصائص إضافية",
    notesGroup: "ملاحظات والتوافق",
    containerType: "نوع العبوة",
    material: "المادة",
    materialGrade: "درجة المادة",
    manufacturer: "الشركة المصنّعة",
    model: "الطراز",
    lining: "البطانة",
    closure: "الإغلاق",
    nominalCapacityL: "السعة الاسمية (L)",
    usableCapacityL: "السعة القابلة للاستخدام (L)",
    wallThicknessMm: "سماكة الجدار (mm)",
    tareWeightKg: "وزن العبوة الفارغة (kg)",
    lengthMm: "الطول (mm)",
    widthMm: "العرض (mm)",
    heightMm: "الارتفاع (mm)",
    diameterMm: "القطر (mm)",
    workingPressureBar: "ضغط التشغيل (bar)",
    testPressureKpa: "ضغط الاختبار (kPa)",
    minTemperatureC: "أدنى درجة حرارة (°C)",
    maxTemperatureC: "أقصى درجة حرارة (°C)",
    maxGrossMassKg: "أقصى كتلة إجمالية (kg)",
    stackingLoadKg: "حمولة التكديس (kg)",
    reusable: "قابلة لإعادة الاستخدام",
    antistatic: "مضادة للكهرباء الساكنة",
    uvResistant: "مقاومة للأشعة فوق البنفسجية",
    standardReference: "مرجع المعيار",
    unMark: "علامة UN (كما سُجلت)",
    performanceLevel: "مستوى الأداء",
    testReportReference: "مرجع تقرير الاختبار",
    propertyName: "اسم الخاصية",
    propertyValue: "القيمة",
    unit: "الوحدة",
    addProperty: "إضافة خاصية",
    removeProperty: "حذف الخاصية",
    compatibilityNotes: "ملاحظات التوافق",
    notes: "ملاحظات",
    unspecified: "غير محدد",
    yes: "نعم",
    no: "لا",
    select: "اختر…",
    clear: "مسح المواصفات",
    confirmClear: "هل تريد إزالة جميع مواصفات العبوة المدخلة؟ سيظل التغيير مسودة حتى حفظ المنتج.",
    warning: "ضغط الاختبار ليس ضغط التشغيل. القيم المسجلة لا تثبت الاعتماد أو التوافق الكيميائي. سجّل معلومات الشركة المصنّعة وأدلة الاختبار فقط.",
    reference: "مرجع معلوماتي: توصيات UNECE لنقل البضائع الخطرة، الفصلان 6.1 و6.5",
    validation: "يرجى مراجعة تفاصيل المواصفات التالية:",
    invalidValue: "تحقق من هذه القيمة وفق المواصفات المسجلة.",
    capacityConflict: "يجب ألا تتجاوز السعة القابلة للاستخدام السعة الاسمية.",
    temperatureConflict: "يجب ألا تكون درجة الحرارة القصوى أقل من الدنيا.",
    incompleteRow: "أدخل اسم الخاصية وقيمتها أو احذف الصف غير المكتمل.",
    empty: "لم تُسجّل مواصفات للعبوة.",
    type: "النوع",
    containerTypes: {
      bottle: "زجاجة", jerrycan: "جيريكان", can: "علبة", drum: "برميل",
      ibc: "IBC", tank: "خزان", bag: "كيس", sack: "جوال", box: "صندوق",
      bulk: "سائب", other: "أخرى",
    },
    materials: {
      hdpe: "HDPE", ldpe: "LDPE", pp: "PP", pet: "PET", steel: "فولاذ",
      stainless_steel: "فولاذ مقاوم للصدأ", aluminium: "ألمنيوم", glass: "زجاج",
      paper: "ورق", woven_pp: "PP منسوج", composite: "مركّب", other: "أخرى",
    },
    level: { X: "X", Y: "Y", Z: "Z" },
  },
  tr: {
    title: "Ambalaj özellikleri",
    subtitle: "Üretici tarafından sağlanan kap bilgilerini ve kanıtları kaydedin.",
    identity: "Kimlik ve malzeme",
    capacity: "Kapasite ve ölçüler",
    conditions: "Basınç, sıcaklık ve yük",
    evidence: "Standartlar ve kanıt",
    custom: "Ek özellikler",
    notesGroup: "Notlar ve uyumluluk",
    containerType: "Kap türü",
    material: "Malzeme",
    materialGrade: "Malzeme sınıfı",
    manufacturer: "Üretici",
    model: "Model",
    lining: "İç kaplama",
    closure: "Kapak / kapama",
    nominalCapacityL: "Nominal kapasite (L)",
    usableCapacityL: "Kullanılabilir kapasite (L)",
    wallThicknessMm: "Duvar kalınlığı (mm)",
    tareWeightKg: "Dara ağırlığı (kg)",
    lengthMm: "Uzunluk (mm)",
    widthMm: "Genişlik (mm)",
    heightMm: "Yükseklik (mm)",
    diameterMm: "Çap (mm)",
    workingPressureBar: "Çalışma basıncı (bar)",
    testPressureKpa: "Test basıncı (kPa)",
    minTemperatureC: "En düşük sıcaklık (°C)",
    maxTemperatureC: "En yüksek sıcaklık (°C)",
    maxGrossMassKg: "Azami brüt kütle (kg)",
    stackingLoadKg: "İstif yükü (kg)",
    reusable: "Yeniden kullanılabilir",
    antistatic: "Antistatik",
    uvResistant: "UV dayanımlı",
    standardReference: "Standart referansı",
    unMark: "UN işareti (kaydedildiği şekliyle)",
    performanceLevel: "Performans seviyesi",
    testReportReference: "Test raporu referansı",
    propertyName: "Özellik adı",
    propertyValue: "Değer",
    unit: "Birim",
    addProperty: "Özellik ekle",
    removeProperty: "Özelliği kaldır",
    compatibilityNotes: "Uyumluluk notları",
    notes: "Notlar",
    unspecified: "Belirtilmemiş",
    yes: "Evet",
    no: "Hayır",
    select: "Seçin…",
    clear: "Özellikleri temizle",
    confirmClear: "Girilen tüm ambalaj özellikleri kaldırılsın mı? Ürün kaydedilene kadar bu değişiklik taslak kalır.",
    warning: "Test basıncı çalışma basıncı değildir. Kaydedilen değerler sertifikasyon veya kimyasal uyumluluk kanıtı oluşturmaz. Yalnızca üretici bilgilerini ve test kanıtlarını kaydedin.",
    reference: "Bilgilendirme amaçlı kaynak: Tehlikeli Malların Taşınmasına İlişkin UNECE Tavsiyeleri, 6.1 ve 6.5 bölümleri",
    validation: "Lütfen şu özellikleri gözden geçirin:",
    invalidValue: "Bu değeri kaydedilen özelliğe göre kontrol edin.",
    capacityConflict: "Kullanılabilir kapasite nominal kapasiteyi aşmamalıdır.",
    temperatureConflict: "En yüksek sıcaklık en düşük sıcaklıktan az olmamalıdır.",
    incompleteRow: "Özellik adını ve değerini girin veya tamamlanmamış satırı kaldırın.",
    empty: "Ambalaj özelliği kaydedilmemiş.",
    type: "Tür",
    containerTypes: {
      bottle: "Şişe", jerrycan: "Bidon", can: "Teneke", drum: "Varil",
      ibc: "IBC", tank: "Tank", bag: "Torba", sack: "Çuval", box: "Kutu",
      bulk: "Dökme", other: "Diğer",
    },
    materials: {
      hdpe: "HDPE", ldpe: "LDPE", pp: "PP", pet: "PET", steel: "Çelik",
      stainless_steel: "Paslanmaz çelik", aluminium: "Alüminyum", glass: "Cam",
      paper: "Kâğıt", woven_pp: "Dokuma PP", composite: "Kompozit", other: "Diğer",
    },
    level: { X: "X", Y: "Y", Z: "Z" },
  },
} as const;

const fieldKeys = [
  "containerType", "material", "materialGrade", "manufacturer", "model", "lining", "closure",
  "nominalCapacityL", "usableCapacityL", "wallThicknessMm", "tareWeightKg", "lengthMm",
  "widthMm", "heightMm", "diameterMm", "workingPressureBar", "testPressureKpa",
  "minTemperatureC", "maxTemperatureC", "maxGrossMassKg", "stackingLoadKg", "reusable",
  "antistatic", "uvResistant", "standardReference", "unMark", "performanceLevel",
  "testReportReference", "compatibilityNotes", "notes", "additionalProperties",
] as const;

export function hasPackagingSpecifications(
  value: PackagingSpecifications | null | undefined,
): value is PackagingSpecifications {
  return !!value && fieldKeys.some((key) => {
    const field = value[key];
    if (Array.isArray(field)) {
      return field.some((row) => Object.values(row).some((item) => typeof item === "string" && item.trim() !== ""));
    }
    if (typeof field === "string") return field.trim() !== "";
    return field !== undefined && field !== null;
  });
}

interface EditorProps {
  value: PackagingSpecifications | null | undefined;
  onChange: (value: PackagingSpecifications | null) => void;
  language: string;
  disabled?: boolean;
}

interface ViewProps {
  value: PackagingSpecifications | null | undefined;
  language: string;
}

const numericFields = [
  "nominalCapacityL", "usableCapacityL", "wallThicknessMm", "tareWeightKg", "lengthMm",
  "widthMm", "heightMm", "diameterMm", "workingPressureBar", "testPressureKpa",
  "minTemperatureC", "maxTemperatureC", "maxGrossMassKg", "stackingLoadKg",
] as const;
type NumericField = typeof numericFields[number];

const enumTypes = ["bottle", "jerrycan", "can", "drum", "ibc", "tank", "bag", "sack", "box", "bulk", "other"] as const;
const enumMaterials = ["hdpe", "ldpe", "pp", "pet", "steel", "stainless_steel", "aluminium", "glass", "paper", "woven_pp", "composite", "other"] as const;
const emptyValue = (): PackagingSpecifications => ({ version: 1 });

function translated(language: string) {
  const locale = (language in copy ? language : "en") as Language;
  return { locale, text: copy[locale] };
}

function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-foreground">{children}</label>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-md border bg-card p-3 sm:p-4">
      <h3 className="border-b pb-2 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function TextField({
  label, value, onChange, disabled, multiline = false,
}: {
  label: string; value: string | undefined; onChange: (value: string | undefined) => void;
  disabled: boolean; multiline?: boolean;
}) {
  const id = useId();
  const common = {
    id,
    className: multiline ? "min-h-20 resize-y text-sm" : "h-9 text-sm",
    value: value ?? "",
    disabled,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value === "" ? undefined : event.target.value),
  };
  return (
    <div className="min-w-0">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? <textarea {...common} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-20 resize-y" /> : <Input {...common} />}
    </div>
  );
}

function EnumField({
  label, value, options, placeholder, disabled, onChange,
}: {
  label: string; value: string | undefined; options: Array<[string, string]>;
  placeholder: string; disabled: boolean; onChange: (value: string | undefined) => void;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value ?? "unspecified"} onValueChange={(next) => onChange(next === "unspecified" ? undefined : next)} disabled={disabled}>
        <SelectTrigger id={id} className="h-9 text-sm"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="unspecified">{placeholder}</SelectItem>
          {options.map(([key, labelText]) => <SelectItem key={key} value={key}>{labelText}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function BooleanField({
  label, value, text, disabled, onChange,
}: {
  label: string; value: boolean | undefined; text: (typeof copy)[Language];
  disabled: boolean; onChange: (value: boolean | undefined) => void;
}) {
  return (
    <EnumField
      label={label}
      value={value === undefined ? undefined : value ? "yes" : "no"}
      options={[["yes", text.yes], ["no", text.no]]}
      placeholder={text.unspecified}
      disabled={disabled}
      onChange={(next) => onChange(next === undefined ? undefined : next === "yes")}
    />
  );
}

export function PackagingSpecificationsView({ value, language }: ViewProps) {
  const { locale, text } = translated(language);
  if (!hasPackagingSpecifications(value)) {
    return <p className="text-sm text-muted-foreground">{text.empty}</p>;
  }
  const rows: Array<[string, string | undefined]> = [
    [text.containerType, value.containerType ? text.containerTypes[value.containerType] : undefined],
    [text.material, value.material ? text.materials[value.material] : undefined],
    [text.materialGrade, value.materialGrade], [text.manufacturer, value.manufacturer],
    [text.model, value.model], [text.lining, value.lining], [text.closure, value.closure],
    [text.nominalCapacityL, value.nominalCapacityL?.toLocaleString(locale)],
    [text.usableCapacityL, value.usableCapacityL?.toLocaleString(locale)],
    [text.wallThicknessMm, value.wallThicknessMm?.toLocaleString(locale)],
    [text.tareWeightKg, value.tareWeightKg?.toLocaleString(locale)],
    [text.lengthMm, value.lengthMm?.toLocaleString(locale)], [text.widthMm, value.widthMm?.toLocaleString(locale)],
    [text.heightMm, value.heightMm?.toLocaleString(locale)], [text.diameterMm, value.diameterMm?.toLocaleString(locale)],
    [text.workingPressureBar, value.workingPressureBar?.toLocaleString(locale)],
    [text.testPressureKpa, value.testPressureKpa?.toLocaleString(locale)],
    [text.minTemperatureC, value.minTemperatureC?.toLocaleString(locale)],
    [text.maxTemperatureC, value.maxTemperatureC?.toLocaleString(locale)],
    [text.maxGrossMassKg, value.maxGrossMassKg?.toLocaleString(locale)],
    [text.stackingLoadKg, value.stackingLoadKg?.toLocaleString(locale)],
    [text.reusable, value.reusable === undefined ? undefined : value.reusable ? text.yes : text.no],
    [text.antistatic, value.antistatic === undefined ? undefined : value.antistatic ? text.yes : text.no],
    [text.uvResistant, value.uvResistant === undefined ? undefined : value.uvResistant ? text.yes : text.no],
    [text.standardReference, value.standardReference], [text.unMark, value.unMark],
    [text.performanceLevel, value.performanceLevel ? text.level[value.performanceLevel] : undefined],
    [text.testReportReference, value.testReportReference],
    [text.compatibilityNotes, value.compatibilityNotes], [text.notes, value.notes],
  ];
  const filled = rows.filter((row): row is [string, string] => row[1] !== undefined && row[1].trim() !== "");
  const additional = value.additionalProperties?.filter((row) => row.name.trim() || row.value.trim() || row.unit?.trim()) ?? [];
  return (
    <div className="space-y-3" data-testid="product-packaging-editor" dir={locale === "fa" || locale === "ar" ? "rtl" : "ltr"}>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {filled.map(([label, display]) => (
          <div key={label} className="min-w-0 border-b border-border/70 pb-2">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm font-medium">{display}</dd>
          </div>
        ))}
      </dl>
      {additional.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">{text.custom}</h4>
          {additional.map((row, index) => (
            <div key={`${row.name}-${index}`} className="flex flex-wrap gap-x-2 text-sm">
              <span className="font-medium">{row.name}:</span><span>{row.value}</span>
              {row.unit && <span className="text-muted-foreground">{row.unit}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PackagingSpecificationsEditor({
  value, onChange, language, disabled = false,
}: EditorProps) {
  const { locale, text } = translated(language);
  const current = value ?? emptyValue();
  const [numericDraft, setNumericDraft] = useState<Partial<Record<NumericField, string>>>({});
  const [rowDrafts, setRowDrafts] = useState<AdditionalProperty[] | null>(null);
  const rowValues = rowDrafts ?? (current.additionalProperties as AdditionalProperty[] | undefined) ?? [];
  const safeResult = useMemo(() => packagingSpecificationsSchema.safeParse(current), [current]);
  const errors = [
    ...(safeResult.success ? [] : safeResult.error.issues.map((issue) => {
      if (issue.path[0] === "additionalProperties") return text.incompleteRow;
      if (issue.message === "Usable capacity must not exceed nominal capacity.") return text.capacityConflict;
      if (issue.message === "Maximum temperature must not be below minimum temperature.") return text.temperatureConflict;
      const key = String(issue.path[0] ?? "");
      const label = text[key as keyof typeof text];
      return `${typeof label === "string" ? label : key}: ${text.invalidValue}`;
    })),
    ...Object.keys(numericDraft)
      .filter((key) => numericDraft[key as NumericField] !== undefined)
      .map((key) => `${text[key as NumericField]}: ${text.invalidValue}`),
  ];

  const update = (patch: Partial<PackagingSpecifications>) => {
    onChange({ ...current, ...patch, version: 1 });
  };
  const updateNumeric = (key: NumericField, raw: string) => {
    if (raw === "") {
      setNumericDraft((previous) => ({ ...previous, [key]: undefined }));
      const next = { ...current };
      delete next[key];
      onChange(next);
      return;
    }
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      setNumericDraft((previous) => {
        const next = { ...previous };
        delete next[key];
        return next;
      });
      update({ [key]: parsed } as Partial<PackagingSpecifications>);
    } else {
      setNumericDraft((previous) => ({ ...previous, [key]: raw }));
    }
  };
  const numericField = (key: NumericField) => (
    <div className="min-w-0" key={key}>
      <FieldLabel htmlFor={`packaging-${key}`}>{text[key]}</FieldLabel>
      <Input
        id={`packaging-${key}`}
        type="number"
        step="any"
        value={numericDraft[key] ?? (current[key] === undefined ? "" : String(current[key]))}
        disabled={disabled}
        onChange={(event) => updateNumeric(key, event.target.value)}
        className="h-9 text-sm"
      />
    </div>
  );
  const updateRow = (index: number, key: keyof AdditionalProperty, nextValue: string) => {
    const next = [...rowValues];
    next[index] = { ...next[index], [key]: nextValue };
    setRowDrafts(next);
    update({ additionalProperties: next as PackagingSpecifications["additionalProperties"] });
  };
  const removeRow = (index: number) => {
    const next = rowValues.filter((_, rowIndex) => rowIndex !== index);
    setRowDrafts(next);
    update({ additionalProperties: next.length ? next as PackagingSpecifications["additionalProperties"] : undefined });
  };
  const addRow = () => {
    const next = [...rowValues, { name: "", value: "", unit: "" }];
    setRowDrafts(next);
    update({ additionalProperties: next as PackagingSpecifications["additionalProperties"] });
  };
  const clearSpecifications = () => {
    if (!hasPackagingSpecifications(current)) {
      onChange(null);
      setNumericDraft({});
      setRowDrafts(null);
      return;
    }
    if (window.confirm(text.confirmClear)) {
      onChange(null);
      setNumericDraft({});
      setRowDrafts(null);
    }
  };

  return (
    <div className="space-y-3" dir={locale === "fa" || locale === "ar" ? "rtl" : "ltr"}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold"><PackageCheck className="h-4 w-4 text-muted-foreground" />{text.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{text.subtitle}</p>
        </div>
        <Button type="button" data-testid="packaging-clear" variant="outline" size="sm" disabled={disabled} onClick={clearSpecifications} className="h-8 text-xs">
          <Trash2 className="me-1.5 h-3.5 w-3.5" />{text.clear}
        </Button>
      </header>

      <Section title={text.identity}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <EnumField label={text.containerType} value={current.containerType} options={enumTypes.map((key): [string, string] => [key, text.containerTypes[key]])} placeholder={text.select} disabled={disabled} onChange={(next) => update({ containerType: next as PackagingSpecifications["containerType"] })} />
          <EnumField label={text.material} value={current.material} options={enumMaterials.map((key): [string, string] => [key, text.materials[key]])} placeholder={text.select} disabled={disabled} onChange={(next) => update({ material: next as PackagingSpecifications["material"] })} />
          {(["materialGrade", "manufacturer", "model", "lining", "closure"] as const).map((key) => (
            <TextField key={key} label={text[key]} value={current[key]} disabled={disabled} onChange={(next) => update({ [key]: next })} />
          ))}
        </div>
      </Section>

      <Section title={text.capacity}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(["nominalCapacityL", "usableCapacityL", "wallThicknessMm", "tareWeightKg", "lengthMm", "widthMm", "heightMm", "diameterMm"] as const).map(numericField)}
        </div>
      </Section>

      <Section title={text.conditions}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(["workingPressureBar", "testPressureKpa", "minTemperatureC", "maxTemperatureC", "maxGrossMassKg", "stackingLoadKg"] as const).map(numericField)}
          <BooleanField label={text.reusable} value={current.reusable} text={text} disabled={disabled} onChange={(next) => update({ reusable: next })} />
          <BooleanField label={text.antistatic} value={current.antistatic} text={text} disabled={disabled} onChange={(next) => update({ antistatic: next })} />
          <BooleanField label={text.uvResistant} value={current.uvResistant} text={text} disabled={disabled} onChange={(next) => update({ uvResistant: next })} />
        </div>
      </Section>

      <Section title={text.evidence}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label={text.standardReference} value={current.standardReference} disabled={disabled} onChange={(next) => update({ standardReference: next })} />
          <TextField label={text.unMark} value={current.unMark} disabled={disabled} onChange={(next) => update({ unMark: next })} />
          <EnumField label={text.performanceLevel} value={current.performanceLevel} options={(["X", "Y", "Z"] as const).map((key): [string, string] => [key, text.level[key]])} placeholder={text.select} disabled={disabled} onChange={(next) => update({ performanceLevel: next as PackagingSpecifications["performanceLevel"] })} />
          <TextField label={text.testReportReference} value={current.testReportReference} disabled={disabled} onChange={(next) => update({ testReportReference: next })} />
        </div>
      </Section>

      <Section title={text.custom}>
        <div className="space-y-2">
          {rowValues.map((row, index) => (
            <div key={index} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_0.7fr_auto]">
              <TextField label={text.propertyName} value={row.name} disabled={disabled} onChange={(next) => updateRow(index, "name", next ?? "")} />
              <TextField label={text.propertyValue} value={row.value} disabled={disabled} onChange={(next) => updateRow(index, "value", next ?? "")} />
              <TextField label={text.unit} value={row.unit} disabled={disabled} onChange={(next) => updateRow(index, "unit", next ?? "")} />
              <Button type="button" variant="outline" size="icon" aria-label={text.removeProperty} title={text.removeProperty} disabled={disabled} onClick={() => removeRow(index)} className="h-9 w-9">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" data-testid="packaging-add-property" variant="outline" size="sm" disabled={disabled || rowValues.length >= 30} onClick={addRow}>
            <Plus className="me-1.5 h-4 w-4" />{text.addProperty}
          </Button>
        </div>
      </Section>

      <Section title={text.notesGroup}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label={text.compatibilityNotes} value={current.compatibilityNotes} disabled={disabled} multiline onChange={(next) => update({ compatibilityNotes: next })} />
          <TextField label={text.notes} value={current.notes} disabled={disabled} multiline onChange={(next) => update({ notes: next })} />
        </div>
      </Section>

      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
        <p className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{text.warning}</p>
        <a className="mt-2 inline-flex items-center gap-1 underline underline-offset-2" href="https://unece.org/sites/default/files/2025-09/ST_SG_AC10_1_Rev24e_Vol_II.pdf" target="_blank" rel="noreferrer">
          {text.reference}<ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {errors.length > 0 && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <p className="mb-1 font-medium">{text.validation}</p>
          <ul className="list-inside list-disc space-y-0.5">
            {[...new Set(errors)].map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
