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

type DraftContext = ContractDocumentContext;
type DraftLanguage = "en" | "fa" | "ar" | "tr";

const labels = {
  fa: {
    heading: "موضوع و متن قرارداد", hint: "اطلاعات نمونه را تکمیل کنید. مشتری، کالاها، سقف و قیمت از همین قرارداد گرفته می‌شوند؛ این متن پیش‌نویس است و پیش از امضا باید بازبینی حقوقی شود.",
    languageNote: "متن حقوقی بر اساس نمونهٔ ارسالی فقط به فارسی تولید می‌شود؛ تغییر زبان سایت، زبان پیش‌نویس را عوض نمی‌کند.",
    deal: "نوع معامله", iran: "داخلی ایران", iraq: "صادرات به عراق", intl: "صادراتی / بین‌المللی", date: "تاریخ انعقاد",
    seller: "فروشنده", buyer: "خریدار", customer: "مشتری انتخاب‌شده", name: "نام شرکت", country: "کشور", registration: "شناسه ملی / ثبت",
    address: "آدرس", representative: "نماینده و سمت", contact: "تماس / ایمیل",
    products: "محصول و کیفیت", productHint: "کالا، سقف تعداد و قیمت واحد از فهرست محصولات قرارداد خوانده می‌شود.", grade: "گرید / استاندارد",
    tolerance: "تلورانس مجاز (%)", packaging: "بسته‌بندی / نوع حمل", payment: "قیمت و پرداخت", currency: "ارز فروش: دینار عراق (IQD)",
    method: "روش پرداخت", advance: "پیش‌پرداخت + مانده", lc: "اعتبار اسنادی (LC)", tt: "حواله بانکی (TT)", credit: "فروش اعتباری / مدت‌دار",
    days: "مهلت پرداخت (روز)", delivery: "تحویل و حمل", incoterm: "اینکوترم انتخاب‌شده", location: "محل تحویل",
    deliveryDate: "تاریخ تحویل", city: "شهر داوری / حل اختلاف", preview: "پیش‌نویس متن قرارداد",
    copy: "کپی متن", word: "دانلود Word", print: "چاپ / PDF", reset: "پاک کردن فیلدهای پیش‌نویس", copied: "متن کپی شد.", copyFailed: "کپی متن ممکن نبود.",
    noProducts: "برای تولید متن، ابتدا محصولات قرارداد را اضافه کنید.", pendingNumber: "پس از ثبت، شماره خودکار نمایش داده می‌شود",
  },
  en: {
    heading: "Contract subject and draft", hint: "Fill out the sample fields. The customer, products, caps and prices come from this contract. This is a draft and requires legal review before signature.",
    languageNote: "The legal draft is generated in Persian only, as supplied. Changing the site language does not translate the draft.",
    deal: "Transaction type", iran: "Domestic (Iran)", iraq: "Export to Iraq", intl: "International export", date: "Agreement date",
    seller: "Seller", buyer: "Buyer", customer: "Selected customer", name: "Company name", country: "Country", registration: "Registration ID",
    address: "Address", representative: "Representative and title", contact: "Phone / email",
    products: "Products and quality", productHint: "Products, quantity caps and unit prices come from the contract items.", grade: "Grade / standard",
    tolerance: "Allowed tolerance (%)", packaging: "Packaging / transport", payment: "Price and payment", currency: "Sale currency: Iraqi dinar (IQD)",
    method: "Payment method", advance: "Advance + balance", lc: "Letter of credit (LC)", tt: "Bank transfer (TT)", credit: "Credit / deferred",
    days: "Payment period (days)", delivery: "Delivery and transport", incoterm: "Selected Incoterm", location: "Delivery location",
    deliveryDate: "Delivery date", city: "Arbitration / dispute city", preview: "Contract text preview",
    copy: "Copy text", word: "Download Word", print: "Print / PDF", reset: "Clear draft fields", copied: "Text copied.", copyFailed: "Could not copy text.",
    noProducts: "Add contract products to generate the text.", pendingNumber: "Automatic number appears after saving",
  },
  ar: {
    heading: "موضوع العقد ومسودته", hint: "أكمل بيانات النموذج. تُستمد بيانات العميل والمنتجات وحدود الكميات والأسعار من هذا العقد. هذه مسودة تتطلب مراجعة قانونية قبل التوقيع.",
    languageNote: "تُنشأ المسودة القانونية بالفارسية فقط وفق النموذج المرسل؛ تغيير لغة الموقع لا يترجمها.",
    deal: "نوع المعاملة", iran: "محلية (إيران)", iraq: "تصدير إلى العراق", intl: "تصدير دولي", date: "تاريخ العقد",
    seller: "البائع", buyer: "المشتري", customer: "العميل المحدد", name: "اسم الشركة", country: "البلد", registration: "رقم التسجيل",
    address: "العنوان", representative: "الممثل وصفته", contact: "الهاتف / البريد الإلكتروني",
    products: "المنتجات والجودة", productHint: "تُستمد المنتجات وحدود الكميات وأسعار الوحدات من بنود العقد.", grade: "الدرجة / المعيار",
    tolerance: "نسبة التفاوت المسموحة (%)", packaging: "التعبئة / النقل", payment: "السعر والدفع", currency: "عملة البيع: الدينار العراقي (IQD)",
    method: "طريقة الدفع", advance: "دفعة مقدمة + المتبقي", lc: "اعتماد مستندي (LC)", tt: "تحويل مصرفي (TT)", credit: "بيع آجل",
    days: "مهلة الدفع (أيام)", delivery: "التسليم والنقل", incoterm: "شرط إنكوترمز المختار", location: "مكان التسليم",
    deliveryDate: "تاريخ التسليم", city: "مدينة التحكيم / النزاع", preview: "معاينة نص العقد",
    copy: "نسخ النص", word: "تنزيل Word", print: "طباعة / PDF", reset: "مسح حقول المسودة", copied: "تم نسخ النص.", copyFailed: "تعذر نسخ النص.",
    noProducts: "أضف منتجات العقد لإنشاء النص.", pendingNumber: "يظهر الرقم التلقائي بعد الحفظ",
  },
  tr: {
    heading: "Sözleşmenin konusu ve taslağı", hint: "Örnek alanları doldurun. Müşteri, ürünler, miktar limitleri ve fiyatlar bu sözleşmeden alınır. Bu taslak imzadan önce hukuki inceleme gerektirir.",
    languageNote: "Hukuki taslak, sağlanan örneğe göre yalnızca Farsça hazırlanır; site dilini değiştirmek taslağı çevirmez.",
    deal: "İşlem türü", iran: "Yurt içi (İran)", iraq: "Irak'a ihracat", intl: "Uluslararası ihracat", date: "Sözleşme tarihi",
    seller: "Satıcı", buyer: "Alıcı", customer: "Seçilen müşteri", name: "Şirket adı", country: "Ülke", registration: "Sicil numarası",
    address: "Adres", representative: "Temsilci ve unvan", contact: "Telefon / e-posta",
    products: "Ürünler ve kalite", productHint: "Ürünler, miktar limitleri ve birim fiyatlar sözleşme kalemlerinden alınır.", grade: "Sınıf / standart",
    tolerance: "İzin verilen tolerans (%)", packaging: "Ambalaj / taşıma", payment: "Fiyat ve ödeme", currency: "Satış para birimi: Irak dinarı (IQD)",
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
    version: 1, dealType: "iraq", date: "",
    seller: person(),
    buyer: { country: "", registration: "", address: "", representative: "", contact: "" },
    productDetails: {},
    payment: { method: "advance", days: "" },
    delivery: { location: "", date: "" },
    disputeCity: "",
  };
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] || character);
const documentHtml = (number: string, text: string) =>
  `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(number)}</title><style>body{font:15px/2 Tahoma,sans-serif;max-width:800px;margin:40px auto;padding:0 24px}pre{white-space:pre-wrap;font:inherit}</style></head><body><h1>${escapeHtml(number)}</h1><pre>${escapeHtml(text)}</pre></body></html>`;

export default function ContractDraftBuilder({ value, onChange, context, language }: {
  value: ShopContractDraftData;
  onChange: (next: ShopContractDraftData) => void;
  context: DraftContext;
  language: DraftLanguage;
}) {
  const tx = labels[language];
  const text = useMemo(() => buildContractDraftText(value, context), [value, context]);
  const set = <K extends keyof ShopContractDraftData>(key: K, next: ShopContractDraftData[K]) => onChange({ ...value, [key]: next });
  const field = (id: string, label: string, content: string, change: (next: string) => void) =>
    <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} value={content} onChange={(event) => change(event.target.value)} maxLength={400} /></div>;
  const sellerField = (key: keyof ShopContractDraftData["seller"], label: string) =>
    field(`seller-${key}`, label, value.seller[key], (next) => set("seller", { ...value.seller, [key]: next }));
  const buyerField = (key: keyof ShopContractDraftData["buyer"], label: string) =>
    field(`buyer-${key}`, label, value.buyer[key], (next) => set("buyer", { ...value.buyer, [key]: next }));
  const saveDoc = () => {
    const html = documentHtml(context.contractNumber || tx.pendingNumber, text);
    const url = URL.createObjectURL(new Blob(["\ufeff", html], { type: "application/msword" }));
    const link = document.createElement("a");
    link.href = url; link.download = "contract-draft.doc"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  const printDoc = () => {
    const url = URL.createObjectURL(new Blob([documentHtml(context.contractNumber || tx.pendingNumber, text)], { type: "text/html;charset=utf-8" }));
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.addEventListener("load", () => printWindow.print(), { once: true });
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } else {
      URL.revokeObjectURL(url);
    }
  };
  return <div className="space-y-5">
    <div><h3 className="font-semibold">{tx.heading}</h3><p className="text-xs text-muted-foreground">{tx.hint}</p><p className="mt-1 text-xs text-amber-700">{tx.languageNote}</p></div>
    <fieldset className="space-y-3 rounded-md border p-4"><legend className="px-2 font-semibold">{tx.deal}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="draft-deal">{tx.deal}</Label><Select value={value.dealType} onValueChange={(next) => set("dealType", next as ShopContractDraftData["dealType"])}><SelectTrigger id="draft-deal"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="iran">{tx.iran}</SelectItem><SelectItem value="iraq">{tx.iraq}</SelectItem><SelectItem value="intl">{tx.intl}</SelectItem></SelectContent></Select></div>
        {field("draft-date", tx.date, value.date, (next) => set("date", next))}
      </div>
    </fieldset>
    <fieldset className="rounded-md border p-4"><legend className="px-2 font-semibold">{tx.seller}</legend><div className="grid gap-4 sm:grid-cols-2">
      {sellerField("name", tx.name)}{sellerField("registration", tx.registration)}{sellerField("address", tx.address)}
      {sellerField("representative", tx.representative)}{sellerField("contact", tx.contact)}
    </div></fieldset>
    <fieldset className="rounded-md border p-4"><legend className="px-2 font-semibold">{tx.buyer}</legend><div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5"><Label>{tx.customer}</Label><p className="rounded-md border bg-muted px-3 py-2 text-sm">{context.customerName || "—"}</p></div>
      {buyerField("country", tx.country)}{buyerField("registration", tx.registration)}{buyerField("address", tx.address)}
      {buyerField("representative", tx.representative)}{buyerField("contact", tx.contact)}
    </div></fieldset>
    <fieldset className="space-y-3 rounded-md border p-4"><legend className="px-2 font-semibold">{tx.products}</legend><p className="text-xs text-muted-foreground">{tx.productHint}</p>
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
    <fieldset className="rounded-md border p-4"><legend className="px-2 font-semibold">{tx.payment}</legend><p className="mb-3 text-sm text-muted-foreground">{tx.currency}</p><div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="draft-payment">{tx.method}</Label><Select value={value.payment.method} onValueChange={(method) => set("payment", { ...value.payment, method: method as ShopContractDraftData["payment"]["method"] })}><SelectTrigger id="draft-payment"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="advance">{tx.advance}</SelectItem><SelectItem value="lc">{tx.lc}</SelectItem><SelectItem value="tt">{tx.tt}</SelectItem><SelectItem value="credit">{tx.credit}</SelectItem></SelectContent></Select></div>
      {field("draft-days", tx.days, value.payment.days, (days) => set("payment", { ...value.payment, days }))}
    </div></fieldset>
    <fieldset className="rounded-md border p-4"><legend className="px-2 font-semibold">{tx.delivery}</legend><div className="grid gap-4 sm:grid-cols-2">
      <div><Label>{tx.incoterm}</Label><p className="rounded-md border bg-muted px-3 py-2 text-sm">{context.deliveryTerm || "—"}</p></div>
      {field("draft-location", tx.location, value.delivery.location, (location) => set("delivery", { ...value.delivery, location }))}
      {field("draft-delivery-date", tx.deliveryDate, value.delivery.date, (date) => set("delivery", { ...value.delivery, date }))}
      {field("draft-city", tx.city, value.disputeCity, (next) => set("disputeCity", next))}
    </div></fieldset>
    <div className="space-y-3"><Label htmlFor="contract-draft-preview">{tx.preview}</Label>
      <Textarea id="contract-draft-preview" dir="rtl" lang="fa" readOnly value={text} rows={16} className="leading-7" />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(text).then(() => window.alert(tx.copied)).catch(() => window.alert(tx.copyFailed))}><Copy className="me-2 h-4 w-4" />{tx.copy}</Button>
        <Button type="button" variant="outline" onClick={saveDoc}><Download className="me-2 h-4 w-4" />{tx.word}</Button>
        <Button type="button" variant="outline" onClick={printDoc}><Printer className="me-2 h-4 w-4" />{tx.print}</Button>
        <Button type="button" variant="outline" onClick={() => onChange(emptyContractDraft())}>{tx.reset}</Button>
      </div>
    </div>
  </div>;
}