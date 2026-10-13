import {accountingOrderNumberSchema} from "@shared/accounting-loading-preview";

export const loadingOrderCopy={
  fa:{order:"شماره سفارش (اختیاری)",help:"شماره سفارش، مانند M2601287؛ شناسه داخلی لازم نیست. خالی بگذارید تا همه بارگیری‌ها نمایش داده شوند.",
    invalid:"یک شرکت موجود انتخاب کنید و شماره سفارش مانند M2601287 یا شناسه داخلی عددی معتبر وارد کنید.",
    ORDER_NOT_FOUND:"این شماره سفارش پیدا نشد.",AMBIGUOUS_ORDER:"این شماره سفارش تکراری است؛ مسئول سیستم باید آن را بررسی کند.",
    ORDER_SCOPE:"این سفارش به حسابداری شرکت انتخاب‌شده مرتبط نیست.",empty:"برای این محدوده، بارگیری ثبت‌شده‌ای جهت بررسی فاکتور وجود ندارد. پیدا شدن سفارش به‌تنهایی به معنی آماده بودن فاکتور نیست."},
  en:{order:"Order number (optional)",help:"Order number, e.g. M2601287; no internal ID needed. Leave blank to show all loadings.",
    invalid:"Select an existing company and enter an order number such as M2601287 or a valid numeric internal ID.",
    ORDER_NOT_FOUND:"This order number was not found.",AMBIGUOUS_ORDER:"This order number is duplicated; system staff must review it.",
    ORDER_SCOPE:"This order is not linked to the selected company's accounting.",empty:"No recorded loadings are available for invoice review in this scope. Finding an order alone does not mean an invoice is ready."},
  ar:{order:"رقم الطلب (اختياري)",help:"رقم الطلب، مثل M2601287؛ لا يلزم المعرّف الداخلي. اتركه فارغاً لعرض كل التحميلات.",
    invalid:"اختر شركة موجودة وأدخل رقم طلب مثل M2601287 أو معرّفاً داخلياً رقمياً صحيحاً.",
    ORDER_NOT_FOUND:"لم يتم العثور على رقم الطلب.",AMBIGUOUS_ORDER:"رقم الطلب مكرر؛ يجب على مسؤول النظام مراجعته.",
    ORDER_SCOPE:"هذا الطلب غير مرتبط بمحاسبة الشركة المختارة.",empty:"لا توجد تحميلات مسجلة لمراجعة الفواتير ضمن هذا النطاق. العثور على الطلب وحده لا يعني أن الفاتورة جاهزة."},
  tr:{order:"Sipariş numarası (isteğe bağlı)",help:"Sipariş numarası, ör. M2601287; dahili kimlik gerekmez. Tüm yüklemeler için boş bırakın.",
    invalid:"Mevcut bir şirket seçin; M2601287 gibi bir sipariş numarası veya geçerli sayısal dahili kimlik girin.",
    ORDER_NOT_FOUND:"Bu sipariş numarası bulunamadı.",AMBIGUOUS_ORDER:"Sipariş numarası yinelenmiş; sistem yetkilisi incelemelidir.",
    ORDER_SCOPE:"Bu sipariş seçilen şirketin muhasebesine bağlı değil.",empty:"Bu kapsamda fatura incelemesi için kaydedilmiş yükleme yok. Siparişin bulunması tek başına faturanın hazır olduğu anlamına gelmez."},
};
export const loadingOrderReferenceCopy={
  fa:{order:"شماره سفارش / شناسه داخلی (اختیاری)",help:"شماره سفارش مثل M2601287 یا شناسه عددی داخلی را وارد کنید. خالی بگذارید تا همه بارگیری‌ها نمایش داده شوند."},
  en:{order:"Order number / internal ID (optional)",help:"Enter an order number such as M2601287 or a numeric internal ID. Leave blank to show all loadings."},
  ar:{order:"رقم الطلب / المعرّف الداخلي (اختياري)",help:"أدخل رقم طلب مثل M2601287 أو معرّفاً داخلياً رقمياً. اتركه فارغاً لعرض كل التحميلات."},
  tr:{order:"Sipariş numarası / dahili kimlik (isteğe bağlı)",help:"M2601287 gibi bir sipariş numarası veya sayısal dahili kimlik girin. Tüm yüklemeler için boş bırakın."},
};
export function parseLoadingOrderReference(value:string):{orderId?:number;orderNumber?:string}|undefined{
  const cleaned=value.trim().replace(/[۰-۹٠-٩]/g,digit=>String(
    "۰۱۲۳۴۵۶۷۸۹".includes(digit)?"۰۱۲۳۴۵۶۷۸۹".indexOf(digit):"٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  if(!cleaned)return {};
  if(/^[1-9][0-9]*$/.test(cleaned)){
    const orderId=Number(cleaned);
    return Number.isSafeInteger(orderId)&&orderId<=2147483647?{orderId}:undefined;
  }
  const parsed=accountingOrderNumberSchema.safeParse(cleaned);
  return parsed.success?{orderNumber:parsed.data}:undefined;
}
export function loadingOrderError(error:unknown,language:string,fallback:string){
  const copy=loadingOrderCopy[language as keyof typeof loadingOrderCopy]??loadingOrderCopy.en;
  const code=(error as {code?:string})?.code;
  return code&&code in copy?copy[code as keyof typeof copy]:error instanceof Error?error.message:fallback;
}
