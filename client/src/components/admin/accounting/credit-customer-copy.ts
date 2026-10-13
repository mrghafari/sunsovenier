const copy={
  fa:{
    customer:"شماره مشتری",help:"شماره هفت‌رقمی مشتری با شروع ۹؛ مانند 9300006. شناسه داخلی کیف پول لازم نیست.",
    invalid:"شرکت و شماره هفت‌رقمی مشتری با شروع ۹ را وارد کنید.",account:"حساب مرتبط با شرکت",choose:"حساب را انتخاب کنید",
    missing:"مشتری شناسایی شد، اما برای شرکت انتخاب‌شده هیچ حساب فعالِ متصل به حسابداری ندارد. بررسی اعتبار ممکن نیست؛ مسئول مالی باید وضعیت حساب و اتصال آن را بررسی کند. هیچ اتصال یا انتقال مانده‌ای خودکار انجام نشده است.",
    errors:{CUSTOMER_NOT_FOUND:"این شماره مشتری در CRM پیدا نشد.",AMBIGUOUS_CUSTOMER:"این شماره به بیش از یک مشتری تعلق دارد؛ مسئول CRM باید شماره‌های تکراری را بررسی کند.",
      COMPANY_NOT_FOUND:"شرکت انتخاب‌شده موجود یا فعال نیست.",INVALID_CUSTOMER_NUMBER:"شماره هفت‌رقمی مشتری با شروع ۹ و شرکت معتبر را انتخاب کنید.",
      WALLET_LINK_REQUIRED:"حساب انتخاب‌شده دیگر فعال یا متصل به حسابداری این شرکت نیست؛ اطلاعات مشتری را دوباره بررسی کنید.",failed:"بررسی انجام نشد؛ دوباره تلاش کنید."},
  },
  ar:{
    customer:"رقم العميل",help:"رقم العميل من سبعة أرقام يبدأ بـ٩، مثل 9300006. لا يلزم معرّف المحفظة الداخلي.",
    invalid:"اختر الشركة وأدخل رقم العميل من سبعة أرقام يبدأ بـ٩.",account:"الحساب المرتبط بالشركة",choose:"اختر الحساب",
    missing:"تم التعرف على العميل، لكن ليس لديه حساب نشط مرتبط بمحاسبة الشركة المختارة. يتعذر فحص الائتمان؛ يجب على المسؤول المالي مراجعة الحساب وربطه. لم يتم إنشاء ارتباط أو نقل أرصدة تلقائياً.",
    errors:{CUSTOMER_NOT_FOUND:"لم يتم العثور على رقم العميل في CRM.",AMBIGUOUS_CUSTOMER:"الرقم مرتبط بأكثر من عميل؛ يجب مراجعة الأرقام المكررة في CRM.",
      COMPANY_NOT_FOUND:"الشركة المختارة غير موجودة أو غير نشطة.",INVALID_CUSTOMER_NUMBER:"اختر شركة صالحة وأدخل رقم العميل من سبعة أرقام يبدأ بـ٩.",
      WALLET_LINK_REQUIRED:"الحساب المختار لم يعد نشطاً أو مرتبطاً بمحاسبة هذه الشركة؛ أعد فحص بيانات العميل.",failed:"تعذر إجراء الفحص؛ حاول مرة أخرى."},
  },
  en:{
    customer:"Customer number",help:"Seven-digit customer number starting with 9, e.g. 9300006. No internal wallet ID is needed.",
    invalid:"Choose a company and enter a seven-digit customer number starting with 9.",account:"Linked company account",choose:"Choose an account",
    missing:"Customer recognized, but no active account is linked to accounting for the selected company. Credit cannot be checked; finance staff must review the account and its link. No link or balance transfer was made automatically.",
    errors:{CUSTOMER_NOT_FOUND:"Customer number not found in CRM.",AMBIGUOUS_CUSTOMER:"This number belongs to more than one customer; CRM staff must review duplicate numbers.",
      COMPANY_NOT_FOUND:"The selected company is missing or inactive.",INVALID_CUSTOMER_NUMBER:"Choose a valid company and enter a seven-digit customer number starting with 9.",
      WALLET_LINK_REQUIRED:"The selected account is no longer active or linked to this company's accounting; check the customer again.",failed:"The check failed; please try again."},
  },
  tr:{
    customer:"Müşteri numarası",help:"9 ile başlayan yedi haneli müşteri numarası, ör. 9300006. Dahili cüzdan kimliği gerekmez.",
    invalid:"Bir şirket seçin ve 9 ile başlayan yedi haneli müşteri numarasını girin.",account:"Bağlı şirket hesabı",choose:"Hesap seçin",
    missing:"Müşteri bulundu, ancak seçilen şirketin muhasebesine bağlı aktif hesabı yok. Kredi kontrol edilemiyor; mali yetkili hesabı ve bağlantısını incelemelidir. Otomatik bağlantı veya bakiye aktarımı yapılmadı.",
    errors:{CUSTOMER_NOT_FOUND:"Müşteri numarası CRM'de bulunamadı.",AMBIGUOUS_CUSTOMER:"Bu numara birden fazla müşteriye ait; CRM yetkilisi yinelenen numaraları incelemelidir.",
      COMPANY_NOT_FOUND:"Seçilen şirket bulunamadı veya aktif değil.",INVALID_CUSTOMER_NUMBER:"Geçerli bir şirket seçin ve 9 ile başlayan yedi haneli müşteri numarasını girin.",
      WALLET_LINK_REQUIRED:"Seçilen hesap artık aktif veya bu şirketin muhasebesine bağlı değil; müşteriyi tekrar kontrol edin.",failed:"Kontrol başarısız; tekrar deneyin."},
  },
};
export function creditCustomerCopy(language:string){return copy[language as keyof typeof copy]??copy.en;}

export class CreditReadError extends Error{
  constructor(public code:string){super(code);}
}
export function creditReadErrorText(error:unknown,language:string):string{
  const errors=creditCustomerCopy(language).errors;
  return error instanceof CreditReadError&&error.code in errors?errors[error.code as keyof typeof errors]:errors.failed;
}
export async function readCreditJson<T>(url:string):Promise<T>{
  const response=await fetch(url,{credentials:"include",cache:"no-store"});
  const data=await response.json();
  if(!response.ok)throw new CreditReadError(typeof data.code==="string"?data.code:"failed");
  return data as T;
}
