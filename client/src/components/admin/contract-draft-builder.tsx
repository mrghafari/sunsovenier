import { useMemo } from "react";
import { Copy, Download, Printer } from "lucide-react";
import type { ShopContractDraftData } from "@shared/contract-draft";
import { buildContractDraftText } from "@shared/contract-document";
import type { ContractDocumentContext } from "@shared/contract-document";
export { buildContractDraftText };
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import ContractDatePicker, { type ContractLanguage } from "./contract-date-picker";
import { loadContractLogoDataUrl, renderContractDocumentHtml } from "./contract-document-html";
import bundledCompanyLogo from "@assets/company-logo.png";
import { contractTheme } from "@/lib/contract-theme";

type DraftContext = ContractDocumentContext;
type DraftLanguage = "en" | "fa" | "ar" | "tr";

const labels = {
  fa: {
    heading: "موضوع و متن قرارداد", hint: "اطلاعات نمونه را تکمیل کنید. مشتری، کالاها، سقف و قیمت از همین قرارداد گرفته می‌شوند؛ این متن پیش‌نویس است و پیش از امضا باید بازبینی حقوقی شود.",
    languageNote: "زبان متن را در این فرم انتخاب کنید. متن پیش‌نویس در هر زبان پیش از امضا نیازمند بازبینی حقوقی است.",
    documentLanguage: "زبان قرارداد", deal: "نوع معامله", iran: "محلی ایران", iraq: "محلی عراق", intl: "بین‌المللی", date: "تاریخ انعقاد",
    seller: "فروشنده", buyer: "خریدار", customer: "مشتری انتخاب‌شده", name: "نام شرکت", country: "کشور", registration: "شناسه ملی / ثبت",
    address: "آدرس", representative: "نماینده و سمت", contact: "تماس / ایمیل", companySource: "اطلاعات شرکت، مقدار اولیه است. می‌توانید همهٔ فیلدهای فروشنده را برای همین قرارداد ویرایش کنید؛ تنظیمات اصلی شرکت تغییر نمی‌کند. دریافت دوباره، ویرایش‌های فروشنده را با اطلاعات شرکت جایگزین می‌کند.", refreshSeller: "دریافت دوباره از اطلاعات شرکت", sellerLoading: "در حال دریافت اطلاعات شرکت…", sellerError: "دریافت اطلاعات شرکت ناموفق بود؛ اطلاعات فروشنده را در همین فرم تکمیل کنید یا دوباره تلاش کنید.", oldDeal: "نوع معاملهٔ قدیمی: صادرات به عراق. برای تغییر، یکی از سه نوع جدید را انتخاب کنید.",
    products: "محصول و کیفیت", productHint: "کالا، سقف تعداد و قیمت واحد از فهرست محصولات قرارداد خوانده می‌شود.", grade: "گرید / استاندارد",
    tolerance: "تلورانس کیفیت محصول (%)", aggregateAllowance: "سقف اضافه‌وزن کل سفارش (%)", allowanceHint: "این شرط مستقل از تلورانس کیفیت هر محصول است. خالی یعنی در قرارداد مشخص نشده؛ ۰٪ یعنی هیچ اضافه‌وزنی مجاز نیست.", packaging: "بسته‌بندی / نوع حمل", payment: "قیمت و پرداخت", currency: "ارز فروش: دینار عراق (IQD)",
    method: "روش پرداخت", advance: "پیش‌پرداخت + مانده", lc: "اعتبار اسنادی (LC)", tt: "حواله بانکی (TT)", credit: "فروش اعتباری / مدت‌دار",
    days: "مهلت پرداخت (روز)", delivery: "تحویل و حمل", incoterm: "اینکوترم انتخاب‌شده", location: "محل تحویل",
    deliveryDate: "تاریخ تحویل", city: "شهر داوری / حل اختلاف", preview: "پیش‌نویس متن قرارداد",
    copy: "کپی متن", word: "دانلود Word", print: "چاپ / PDF", reset: "پاک کردن فیلدهای پیش‌نویس", copied: "متن کپی شد.", copyFailed: "کپی متن ممکن نبود.",
    noProducts: "برای تولید متن، ابتدا محصولات قرارداد را اضافه کنید.", pendingNumber: "پس از ثبت، شماره خودکار نمایش داده می‌شود",
  },
  en: {
    heading: "Contract subject and draft", hint: "Fill out the sample fields. The customer, products, caps and prices come from this contract. This is a draft and requires legal review before signature.",
    languageNote: "Choose the contract language here. Every translation is a draft and needs legal review before signing.",
    documentLanguage: "Contract language", deal: "Transaction type", iran: "Domestic Iran", iraq: "Domestic Iraq", intl: "International", date: "Agreement date",
    seller: "Seller", buyer: "Buyer", customer: "Selected customer", name: "Company name", country: "Country", registration: "Registration ID",
    address: "Address", representative: "Representative and title", contact: "Phone / email", companySource: "Company Information supplies defaults. Edit any seller field for this contract without changing company settings. Refresh replaces seller edits with company defaults.", refreshSeller: "Refresh from Company Information", sellerLoading: "Loading company details…", sellerError: "Company details could not be loaded; complete seller details in this form or try again.", oldDeal: "Legacy transaction type: export to Iraq. Choose one of the three new types to change it.",
    products: "Products and quality", productHint: "Products, quantity caps and unit prices come from the contract items.", grade: "Grade / standard",
    tolerance: "Product quality tolerance (%)", aggregateAllowance: "Aggregate order overweight allowance (%)", allowanceHint: "Separate from each product’s quality tolerance. Blank means not specified in the contract; 0% means no overweight is allowed.", packaging: "Packaging / transport", payment: "Price and payment", currency: "Sale currency: Iraqi dinar (IQD)",
    method: "Payment method", advance: "Advance + balance", lc: "Letter of credit (LC)", tt: "Bank transfer (TT)", credit: "Credit / deferred",
    days: "Payment period (days)", delivery: "Delivery and transport", incoterm: "Selected Incoterm", location: "Delivery location",
    deliveryDate: "Delivery date", city: "Arbitration / dispute city", preview: "Contract text preview",
    copy: "Copy text", word: "Download Word", print: "Print / PDF", reset: "Clear draft fields", copied: "Text copied.", copyFailed: "Could not copy text.",
    noProducts: "Add contract products to generate the text.", pendingNumber: "Automatic number appears after saving",
  },
  ar: {
    heading: "موضوع العقد ومسودته", hint: "أكمل بيانات النموذج. تُستمد بيانات العميل والمنتجات وحدود الكميات والأسعار من هذا العقد. هذه مسودة تتطلب مراجعة قانونية قبل التوقيع.",
    languageNote: "اختر لغة العقد من هذا النموذج. كل ترجمة مسودة تتطلب مراجعة قانونية قبل التوقيع.",
    documentLanguage: "لغة العقد", deal: "نوع المعاملة", iran: "محلي في إيران", iraq: "محلي في العراق", intl: "دولي", date: "تاريخ العقد",
    seller: "البائع", buyer: "المشتري", customer: "العميل المحدد", name: "اسم الشركة", country: "البلد", registration: "رقم التسجيل",
    address: "العنوان", representative: "الممثل وصفته", contact: "الهاتف / البريد الإلكتروني", companySource: "معلومات الشركة هي القيم الأولية. يمكنك تعديل جميع حقول البائع لهذا العقد دون تغيير إعدادات الشركة. التحديث يستبدل التعديلات بالقيم الأصلية.", refreshSeller: "تحديث من معلومات الشركة", sellerLoading: "جارٍ تحميل بيانات الشركة…", sellerError: "تعذّر تحميل بيانات الشركة؛ أكمل بيانات البائع في هذا النموذج أو حاول مجددًا.", oldDeal: "نوع معاملة قديم: تصدير إلى العراق. اختر أحد الأنواع الثلاثة الجديدة لتغييره.",
    products: "المنتجات والجودة", productHint: "تُستمد المنتجات وحدود الكميات وأسعار الوحدات من بنود العقد.", grade: "الدرجة / المعيار",
    tolerance: "سماحية جودة المنتج (%)", aggregateAllowance: "حد زيادة وزن الطلب الإجمالي (%)", allowanceHint: "هذا الشرط مستقل عن سماحية جودة كل منتج. الخانة الفارغة تعني أنه غير محدد في العقد؛ ٠٪ تعني عدم السماح بأي زيادة.", packaging: "التعبئة / النقل", payment: "السعر والدفع", currency: "عملة البيع: الدينار العراقي (IQD)",
    method: "طريقة الدفع", advance: "دفعة مقدمة + المتبقي", lc: "اعتماد مستندي (LC)", tt: "تحويل مصرفي (TT)", credit: "بيع آجل",
    days: "مهلة الدفع (أيام)", delivery: "التسليم والنقل", incoterm: "شرط إنكوترمز المختار", location: "مكان التسليم",
    deliveryDate: "تاريخ التسليم", city: "مدينة التحكيم / النزاع", preview: "معاينة نص العقد",
    copy: "نسخ النص", word: "تنزيل Word", print: "طباعة / PDF", reset: "مسح حقول المسودة", copied: "تم نسخ النص.", copyFailed: "تعذر نسخ النص.",
    noProducts: "أضف منتجات العقد لإنشاء النص.", pendingNumber: "يظهر الرقم التلقائي بعد الحفظ",
  },
  tr: {
    heading: "Sözleşmenin konusu ve taslağı", hint: "Örnek alanları doldurun. Müşteri, ürünler, miktar limitleri ve fiyatlar bu sözleşmeden alınır. Bu taslak imzadan önce hukuki inceleme gerektirir.",
    languageNote: "Sözleşme dilini bu formdan seçin. Her çeviri imzadan önce hukuki inceleme gerektiren bir taslaktır.",
    documentLanguage: "Sözleşme dili", deal: "İşlem türü", iran: "İran içi", iraq: "Irak içi", intl: "Uluslararası", date: "Sözleşme tarihi",
    seller: "Satıcı", buyer: "Alıcı", customer: "Seçilen müşteri", name: "Şirket adı", country: "Ülke", registration: "Sicil numarası",
    address: "Adres", representative: "Temsilci ve unvan", contact: "Telefon / e-posta", companySource: "Şirket Bilgileri başlangıç değerlerini sağlar. Şirket ayarlarını değiştirmeden bu sözleşme için tüm satıcı alanlarını düzenleyebilirsiniz. Yenileme, düzenlemeleri şirket değerleriyle değiştirir.", refreshSeller: "Şirket Bilgilerinden yenile", sellerLoading: "Şirket bilgileri yükleniyor…", sellerError: "Şirket bilgileri yüklenemedi; satıcı bilgilerini bu formda tamamlayın veya tekrar deneyin.", oldDeal: "Eski işlem türü: Irak'a ihracat. Değiştirmek için üç yeni türden birini seçin.",
    products: "Ürünler ve kalite", productHint: "Ürünler, miktar limitleri ve birim fiyatlar sözleşme kalemlerinden alınır.", grade: "Sınıf / standart",
    tolerance: "Ürün kalite toleransı (%)", aggregateAllowance: "Toplam sipariş fazla ağırlık sınırı (%)", allowanceHint: "Her ürünün kalite toleransından bağımsızdır. Boş bırakılması sözleşmede belirtilmediği anlamına gelir; %0 fazla ağırlığa izin verilmediğini belirtir.", packaging: "Ambalaj / taşıma", payment: "Fiyat ve ödeme", currency: "Satış para birimi: Irak dinarı (IQD)",
    method: "Ödeme yöntemi", advance: "Peşinat + bakiye", lc: "Akreditif (LC)", tt: "Banka havalesi (TT)", credit: "Vadeli satış",
    days: "Ödeme süresi (gün)", delivery: "Teslimat ve taşıma", incoterm: "Seçilen Incoterm", location: "Teslimat yeri",
    deliveryDate: "Teslimat tarihi", city: "Tahkim / uyuşmazlık şehri", preview: "Sözleşme metni önizlemesi",
    copy: "Metni kopyala", word: "Word indir", print: "Yazdır / PDF", reset: "Taslak alanlarını temizle", copied: "Metin kopyalandı.", copyFailed: "Metin kopyalanamadı.",
    noProducts: "Metni oluşturmak için sözleşmeye ürün ekleyin.", pendingNumber: "Otomatik numara kaydettikten sonra görünür",
  },
} as const;

export function emptyContractDraft(): ShopContractDraftData {
  const person = () => ({ name: "", registration: "", address: "", representative: "", contact: "" });
  return {
    version: 2, language: "fa", dealType: "iraqLocal", date: "",
    seller: person(),
    buyer: { country: "", registration: "", address: "", representative: "", contact: "" },
    productDetails: {},
    payment: { method: "advance", days: "" },
    delivery: { location: "", date: "" },
    disputeCity: "",
  };
}

export default function ContractDraftBuilder({ value, onChange, context, language, logoUrl, onRefreshSeller, sellerLoading, sellerError }: {
  value: ShopContractDraftData;
  onChange: (next: ShopContractDraftData) => void;
  context: DraftContext;
  language: DraftLanguage;
  logoUrl?: string | null;
  onRefreshSeller?: () => void;
  sellerLoading?: boolean;
  sellerError?: boolean;
}) {
  type DraftWithWeightAllowance = ShopContractDraftData & {
    aggregateWeightAllowance?: { basis: "percent"; value: string };
  };
  const allowanceDraft = value as DraftWithWeightAllowance;
  const tx = labels[language];
  const documentLanguage: ContractLanguage = value.language || "fa";
  const text = useMemo(() => buildContractDraftText(value, context), [value, context]);
  const set = <K extends keyof ShopContractDraftData>(key: K, next: ShopContractDraftData[K]) => onChange({ ...value, [key]: next });
  const field = (id: string, label: string, content: string, change: (next: string) => void) =>
    <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} value={content} onChange={(event) => change(event.target.value)} maxLength={400} /></div>;
  const sellerField = (key: keyof ShopContractDraftData["seller"], label: string) =>
    <div className="space-y-1.5" key={key}><Label htmlFor={`seller-${key}`}>{label}</Label>
      <Input id={`seller-${key}`} value={value.seller[key] || ""} disabled={sellerLoading}
        maxLength={key === "address" ? 1000 : key === "postalCode" ? 100 : key === "registration" || key === "taxNumber" || key === "country" || key === "city" ? 200 : 300}
        onChange={event => set("seller", { ...value.seller, [key]: event.target.value })} />
    </div>;
  const buyerField = (key: keyof ShopContractDraftData["buyer"], label: string) =>
    field(`buyer-${key}`, label, value.buyer[key], (next) => set("buyer", { ...value.buyer, [key]: next }));
  const saveDoc = async () => {
    try {
      const logo = await loadContractLogoDataUrl(logoUrl, bundledCompanyLogo);
      const html = renderContractDocumentHtml(context.contractNumber || tx.pendingNumber, text, documentLanguage, logo);
      const url = URL.createObjectURL(new Blob(["\ufeff", html], { type: "application/msword" }));
      const link = document.createElement("a");
      link.href = url; link.download = "contract-draft.doc"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      window.alert(language === "fa" ? "لوگوی شرکت بارگذاری نشد؛ لطفاً دوباره تلاش کنید." : language === "ar" ? "تعذر تحميل شعار الشركة. حاول مرة أخرى." : language === "tr" ? "Şirket logosu yüklenemedi. Lütfen tekrar deneyin." : "Company logo could not be loaded. Please try again.");
    }
  };
  const printDoc = async () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    try {
      const logo = await loadContractLogoDataUrl(logoUrl, bundledCompanyLogo);
      printWindow.addEventListener("load", () => printWindow.print(), { once: true });
      printWindow.document.open();
      printWindow.document.write(renderContractDocumentHtml(context.contractNumber || tx.pendingNumber, text, documentLanguage, logo));
      printWindow.document.close();
    } catch {
      printWindow.close();
      window.alert(language === "fa" ? "لوگوی شرکت بارگذاری نشد؛ لطفاً دوباره تلاش کنید." : language === "ar" ? "تعذر تحميل شعار الشركة. حاول مرة أخرى." : language === "tr" ? "Şirket logosu yüklenemedi. Lütfen tekrar deneyin." : "Company logo could not be loaded. Please try again.");
    }
  };
  return <div className="space-y-5">
    <div className={`rounded-md border-s-4 border-teal-800 ps-3 dark:border-teal-300`}><h3 className={`font-semibold ${contractTheme.text}`}>{tx.heading}</h3><p className="text-xs text-muted-foreground">{tx.hint}</p><p className="mt-1 text-xs text-amber-700">{tx.languageNote}</p></div>
    <fieldset className={`space-y-3 p-4 ${contractTheme.panel}`}><legend className={`px-2 font-semibold ${contractTheme.text}`}>{tx.deal}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="draft-language">{tx.documentLanguage}</Label><Select value={documentLanguage} onValueChange={(next) => set("language", next as ContractLanguage)}><SelectTrigger id="draft-language"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fa">فارسی</SelectItem><SelectItem value="ar">العربية</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="tr">Türkçe</SelectItem></SelectContent></Select></div>
        <div className="space-y-1.5"><Label htmlFor="draft-deal">{tx.deal}</Label><Select value={value.dealType === "iraq" ? undefined : value.dealType} onValueChange={(next) => onChange({ ...value, version: 2, dealType: next as "iran" | "iraqLocal" | "intl" })}><SelectTrigger id="draft-deal"><SelectValue placeholder={value.dealType === "iraq" ? tx.oldDeal : undefined} /></SelectTrigger><SelectContent><SelectItem value="iran">{tx.iran}</SelectItem><SelectItem value="iraqLocal">{tx.iraq}</SelectItem><SelectItem value="intl">{tx.intl}</SelectItem></SelectContent></Select>{value.dealType === "iraq" && <p className="text-xs text-amber-700">{tx.oldDeal}</p>}</div>
        <ContractDatePicker id="draft-date" label={tx.date} language={documentLanguage} value={value.date} onChange={(next) => set("date", next)} />
      </div>
    </fieldset>
    <fieldset className={`p-4 ${contractTheme.panel}`}><legend className={`px-2 font-semibold ${contractTheme.text}`}>{tx.seller}</legend><p className="mb-3 text-xs text-muted-foreground">{tx.companySource}</p>{sellerLoading && <p role="status" className="text-sm">{tx.sellerLoading}</p>}{sellerError && <p role="alert" className="text-sm text-destructive">{tx.sellerError}</p>}<div className="grid gap-4 sm:grid-cols-2">
      {sellerField("name", tx.name)}{sellerField("registration", tx.registration)}{sellerField("address", tx.address)}
      {sellerField("representative", tx.representative)}{sellerField("contact", tx.contact)}
      {sellerField("taxNumber", language === "fa" ? "شمارهٔ مالیاتی" : language === "ar" ? "الرقم الضريبي" : language === "tr" ? "Vergi numarası" : "Tax number")}
      {sellerField("country", tx.country)}{sellerField("city", language === "fa" ? "شهر" : language === "ar" ? "المدينة" : language === "tr" ? "Şehir" : "City")}
      {sellerField("postalCode", language === "fa" ? "کد پستی" : language === "ar" ? "الرمز البريدي" : language === "tr" ? "Posta kodu" : "Postal code")}
      {sellerField("website", language === "fa" ? "وب‌سایت" : language === "ar" ? "الموقع الإلكتروني" : language === "tr" ? "Web sitesi" : "Website")}
    </div>{onRefreshSeller && <Button type="button" variant="outline" className={`mt-3 ${contractTheme.outline}`} onClick={onRefreshSeller} disabled={sellerLoading}>{tx.refreshSeller}</Button>}</fieldset>
    <fieldset className={`p-4 ${contractTheme.panel}`}><legend className={`px-2 font-semibold ${contractTheme.text}`}>{tx.buyer}</legend><div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5"><Label>{tx.customer}</Label><p className="rounded-md border bg-muted px-3 py-2 text-sm">{context.customerName || "—"}</p></div>
      <div className="space-y-1.5"><Label>{{ fa: "شماره مشتری", en: "Customer number", ar: "رقم العميل", tr: "Müşteri numarası" }[language]}</Label><p dir="ltr" className="rounded-md border bg-muted px-3 py-2 text-sm">{context.customerCode || "—"}</p></div>
      {buyerField("country", tx.country)}{buyerField("registration", tx.registration)}{buyerField("address", tx.address)}
      {buyerField("representative", tx.representative)}{buyerField("contact", tx.contact)}
    </div></fieldset>
    <fieldset className={`space-y-3 p-4 ${contractTheme.panel}`}><legend className={`px-2 font-semibold ${contractTheme.text}`}>{tx.products}</legend><p className="text-xs text-muted-foreground">{tx.productHint}</p>
      {context.items.length === 0 && <p className="text-sm text-muted-foreground">{tx.noProducts}</p>}
      {context.items.map((item) => {
        const key = String(item.productId);
        const detail = value.productDetails[key] || { grade: "", tolerance: "", packaging: "" };
        const change = (fieldName: keyof typeof detail, next: string) => set("productDetails", { ...value.productDetails, [key]: { ...detail, [fieldName]: next } });
        return <div key={key} className="space-y-3 rounded-md bg-muted/40 p-3">
          <p className="font-medium">{item.productName} — {item.maxQuantity || "—"} × {item.unitPrice || "—"} IQD</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {field(`grade-${key}`, tx.grade, detail.grade, (next) => change("grade", next))}
            {field(`tolerance-${key}`, tx.tolerance, detail.tolerance, (next) => change("tolerance", next))}
            {field(`packaging-${key}`, tx.packaging, detail.packaging, (next) => change("packaging", next))}
          </div>
        </div>;
      })}
    </fieldset>
    <fieldset className={`space-y-2 p-4 ${contractTheme.panel}`}>
      <legend className={`px-2 font-semibold ${contractTheme.text}`}>{tx.aggregateAllowance}</legend>
      <p className="max-w-3xl text-xs leading-5 text-muted-foreground">{tx.allowanceHint}</p>
      <div className="max-w-sm space-y-1.5">
        <Label htmlFor="aggregate-weight-allowance">{tx.aggregateAllowance}</Label>
        <div className="relative">
          <Input
            id="aggregate-weight-allowance"
            type="text"
            inputMode="decimal"
            dir="ltr"
            value={allowanceDraft.aggregateWeightAllowance?.value ?? ""}
            placeholder={language === "fa" ? "تعیین‌نشده" : language === "ar" ? "غير محدد" : language === "tr" ? "Belirtilmedi" : "Not specified"}
            maxLength={12}
            aria-describedby="aggregate-weight-allowance-hint"
            onChange={(event) => {
              const next = event.target.value.trim();
              if (next && !/^\d{1,3}(?:\.\d{0,8})?$/.test(next)) return;
              if (next && Number(next) > 100) return;
              const updated = { ...allowanceDraft };
              if (next) updated.aggregateWeightAllowance = { basis: "percent", value: next };
              else delete updated.aggregateWeightAllowance;
              onChange(updated);
            }}
            className="pe-10 font-mono tabular-nums"
          />
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-muted-foreground">%</span>
        </div>
        <p id="aggregate-weight-allowance-hint" className="text-xs text-muted-foreground">{tx.allowanceHint}</p>
      </div>
    </fieldset>
    <fieldset className={`p-4 ${contractTheme.panel}`}><legend className={`px-2 font-semibold ${contractTheme.text}`}>{tx.payment}</legend><p className="mb-3 text-sm text-muted-foreground">{tx.currency}</p><div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="draft-payment">{tx.method}</Label><Select value={value.payment.method} onValueChange={(method) => set("payment", { ...value.payment, method: method as ShopContractDraftData["payment"]["method"] })}><SelectTrigger id="draft-payment"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="advance">{tx.advance}</SelectItem><SelectItem value="lc">{tx.lc}</SelectItem><SelectItem value="tt">{tx.tt}</SelectItem><SelectItem value="credit">{tx.credit}</SelectItem></SelectContent></Select></div>
      {field("draft-days", tx.days, value.payment.days, (days) => set("payment", { ...value.payment, days }))}
    </div></fieldset>
    <fieldset className={`p-4 ${contractTheme.panel}`}><legend className={`px-2 font-semibold ${contractTheme.text}`}>{tx.delivery}</legend><div className="grid gap-4 sm:grid-cols-2">
      <div><Label>{tx.incoterm}</Label><p className="rounded-md border bg-muted px-3 py-2 text-sm">{context.deliveryTerm || "—"}</p></div>
      {field("draft-location", tx.location, value.delivery.location, (location) => set("delivery", { ...value.delivery, location }))}
      <ContractDatePicker id="draft-delivery-date" label={tx.deliveryDate} language={documentLanguage} value={value.delivery.date} onChange={(date) => set("delivery", { ...value.delivery, date })} />
      {field("draft-city", tx.city, value.disputeCity, (next) => set("disputeCity", next))}
    </div></fieldset>
    <div className="space-y-3"><Label htmlFor="contract-draft-preview">{tx.preview}</Label>
      <Textarea id="contract-draft-preview" dir={documentLanguage === "fa" || documentLanguage === "ar" ? "rtl" : "ltr"} lang={documentLanguage} readOnly value={text} rows={16} className="leading-7" />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className={contractTheme.outline} onClick={() => navigator.clipboard.writeText(text).then(() => window.alert(tx.copied)).catch(() => window.alert(tx.copyFailed))}><Copy className="me-2 h-4 w-4" />{tx.copy}</Button>
        <Button type="button" variant="outline" className={contractTheme.outline} onClick={saveDoc}><Download className="me-2 h-4 w-4" />{tx.word}</Button>
        <Button type="button" variant="outline" className={contractTheme.outline} onClick={printDoc}><Printer className="me-2 h-4 w-4" />{tx.print}</Button>
        <Button type="button" variant="outline" className={contractTheme.outline} onClick={() => onChange({ ...emptyContractDraft(), language: documentLanguage, seller: value.seller })}>{tx.reset}</Button>
      </div>
    </div>
  </div>;
}