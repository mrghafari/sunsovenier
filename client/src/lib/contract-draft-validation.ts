import type { ContractDraftActivationIssue } from "@shared/contract-draft";

type Language = "fa" | "en" | "ar" | "tr";
const fields: Record<string, { id: string; labels: Record<Language, string> }> = {
  date: { id: "draft-date", labels: { fa: "تاریخ قرارداد", en: "Contract date", ar: "تاريخ العقد", tr: "Sözleşme tarihi" } },
  "seller.name": { id: "seller-name", labels: { fa: "نام فروشنده", en: "Seller name", ar: "اسم البائع", tr: "Satıcı adı" } },
  "seller.address": { id: "seller-address", labels: { fa: "نشانی فروشنده", en: "Seller address", ar: "عنوان البائع", tr: "Satıcı adresi" } },
  "seller.representative": { id: "seller-representative", labels: { fa: "نمایندهٔ فروشنده", en: "Seller representative", ar: "ممثل البائع", tr: "Satıcı temsilcisi" } },
  "seller.registration": { id: "seller-registration", labels: { fa: "شناسهٔ ثبت فروشنده", en: "Seller registration ID", ar: "رقم تسجيل البائع", tr: "Satıcı sicil numarası" } },
  "seller.contact": { id: "seller-contact", labels: { fa: "اطلاعات تماس فروشنده", en: "Seller contact", ar: "بيانات اتصال البائع", tr: "Satıcı iletişim bilgileri" } },
  "buyer.country": { id: "buyer-country", labels: { fa: "کشور خریدار", en: "Buyer country", ar: "بلد المشتري", tr: "Alıcı ülkesi" } },
  "buyer.address": { id: "buyer-address", labels: { fa: "نشانی خریدار", en: "Buyer address", ar: "عنوان المشتري", tr: "Alıcı adresi" } },
  "buyer.representative": { id: "buyer-representative", labels: { fa: "نمایندهٔ خریدار", en: "Buyer representative", ar: "ممثل المشتري", tr: "Alıcı temsilcisi" } },
  "delivery.location": { id: "draft-location", labels: { fa: "محل تحویل", en: "Delivery location", ar: "مكان التسليم", tr: "Teslimat yeri" } },
  "delivery.date": { id: "draft-delivery-date", labels: { fa: "تاریخ تحویل", en: "Delivery date", ar: "تاريخ التسليم", tr: "Teslimat tarihi" } },
  disputeCity: { id: "draft-city", labels: { fa: "شهر حل اختلاف", en: "Dispute city", ar: "مدينة النزاع", tr: "Uyuşmazlık şehri" } },
  "payment.days": { id: "draft-days", labels: { fa: "مهلت پرداخت (عدد صحیح بزرگ‌تر از صفر)", en: "Payment period (positive whole days)", ar: "مهلة الدفع (عدد صحيح موجب)", tr: "Ödeme süresi (pozitif tam gün)" } },
};

export function contractDraftIssueFieldId(issue: ContractDraftActivationIssue): string {
  return fields[issue.field]?.id || "";
}

export function contractDraftActivationMessage(issues: ContractDraftActivationIssue[], language: Language): string {
  const names = issues.map(issue => fields[issue.field]?.labels[language] || issue.field).join(language === "fa" || language === "ar" ? "، " : ", ");
  const prefix = {
    fa: "برای فعال‌کردن قرارداد، این موارد را تکمیل یا اصلاح کنید: ",
    en: "Complete or correct these fields before activating: ",
    ar: "أكمل أو صحح هذه الحقول قبل التفعيل: ",
    tr: "Etkinleştirmeden önce şu alanları tamamlayın veya düzeltin: ",
  }[language];
  const sellerHint = issues.some(issue => issue.field.startsWith("seller.")) ? {
    fa: " اطلاعات فروشنده را در همین فرم تکمیل کنید. برای استفاده از مقادیر «مدیریت اطلاعات شرکت»، «دریافت دوباره از اطلاعات شرکت» را بزنید.",
    en: " Complete seller details in this form. Use Refresh from Company Information to restore company defaults.",
    ar: " أكمل بيانات البائع في هذا النموذج. استخدم تحديث من معلومات الشركة لاستعادة القيم الأصلية.",
    tr: " Satıcı bilgilerini bu formda tamamlayın. Şirket Bilgilerinden yenile ile şirket varsayılanlarını geri yükleyebilirsiniz.",
  }[language] : "";
  return prefix + names + "." + sellerHint;
}
