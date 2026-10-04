const messages={
  en:{
    MISSING_OFFICIAL_RATE:"No official central-bank rate is available for this date.",
    INSUFFICIENT_FUNDING:"The posted bank/cash ledger has insufficient funds in this currency.",
    BACKDATED_FUNDING:"The expense date precedes a later movement of these funds.",
    FUNDING_RECONCILIATION_REQUIRED:"The funding balance or historical book value needs reconciliation.",
    FX_ACCOUNT_REQUIRED:"An active realized FX gain/loss account must be configured.",
    INVALID_FOREIGN_EXPENSE:"Select a valid expense, cost center, funding account and equal native amounts.",
    VALUATION_OVERFLOW:"The base value exceeds the supported accounting precision.",
    snapshot:"Historical funding balances shown here are the immutable snapshot at original posting, not today's available funds.",
    generatedFx:"Realized FX on historical expense funding",
  },
  fa:{
    MISSING_OFFICIAL_RATE:"نرخ رسمی بانک مرکزی برای این تاریخ در دسترس نیست.",
    INSUFFICIENT_FUNDING:"ماندهٔ ثبت‌شدهٔ بانک/صندوق به این ارز کافی نیست.",
    BACKDATED_FUNDING:"تاریخ هزینه قبل از گردش جدیدتر این وجوه است.",
    FUNDING_RECONCILIATION_REQUIRED:"ماندهٔ وجوه یا ارزش تاریخی آن نیاز به تطبیق دارد.",
    FX_ACCOUNT_REQUIRED:"حساب فعال سود یا زیان تحقق‌یافتهٔ ارز باید تنظیم شود.",
    INVALID_FOREIGN_EXPENSE:"حساب هزینه، مرکز هزینه، حساب پرداخت و مبالغ ارزی برابر و معتبر انتخاب کنید.",
    VALUATION_OVERFLOW:"ارزش پایه از دقت پشتیبانی‌شدهٔ حسابداری بیشتر است.",
    snapshot:"مانده‌های وجوه در این بخش، اطلاعات ثابت هنگام ثبت اصلی هستند؛ نه موجودی قابل‌استفادهٔ امروز.",
    generatedFx:"سود یا زیان تحقق‌یافتهٔ ارز بابت ارزش تاریخی وجوه هزینه",
  },
  ar:{
    MISSING_OFFICIAL_RATE:"لا يتوفر سعر رسمي للبنك المركزي لهذا التاريخ.",
    INSUFFICIENT_FUNDING:"رصيد البنك أو النقدية المرحّل بهذه العملة غير كافٍ.",
    BACKDATED_FUNDING:"تاريخ المصروف يسبق حركة أحدث لهذه الأموال.",
    FUNDING_RECONCILIATION_REQUIRED:"يجب مطابقة رصيد التمويل أو قيمته الدفترية التاريخية.",
    FX_ACCOUNT_REQUIRED:"يجب إعداد حساب نشط لربح أو خسارة الصرف المحققة.",
    INVALID_FOREIGN_EXPENSE:"اختر مصروفاً ومركز تكلفة وحساب تمويل ومبالغ عملة متساوية وصحيحة.",
    VALUATION_OVERFLOW:"تتجاوز القيمة الأساسية الدقة المحاسبية المدعومة.",
    snapshot:"أرصدة التمويل هنا لقطة ثابتة عند الترحيل الأصلي وليست الأموال المتاحة اليوم.",
    generatedFx:"فرق الصرف المحقق للقيمة التاريخية لتمويل المصروف",
  },
  tr:{
    MISSING_OFFICIAL_RATE:"Bu tarih için resmi merkez bankası kuru yok.",
    INSUFFICIENT_FUNDING:"Bu para birimindeki kaydedilmiş banka/kasa bakiyesi yetersiz.",
    BACKDATED_FUNDING:"Gider tarihi bu fonların daha sonraki bir hareketinden önce.",
    FUNDING_RECONCILIATION_REQUIRED:"Fon bakiyesi veya tarihi defter değeri mutabakat gerektiriyor.",
    FX_ACCOUNT_REQUIRED:"Etkin bir gerçekleşmiş kur kazancı/kaybı hesabı tanımlanmalı.",
    INVALID_FOREIGN_EXPENSE:"Geçerli gider, maliyet merkezi, fon hesabı ve eşit döviz tutarları seçin.",
    VALUATION_OVERFLOW:"Temel değer desteklenen muhasebe hassasiyetini aşıyor.",
    snapshot:"Buradaki fon bakiyeleri ilk kayıt anının değişmez görünümüdür; bugünkü kullanılabilir fonlar değildir.",
    generatedFx:"Gider fonlarının tarihi değeri üzerinden gerçekleşmiş kur farkı",
  },
};
export function foreignExpenseMessage(language:string,key:string){
  const locale=language==="fa"||language==="ar"||language==="tr"?language:"en";
  return messages[locale][key as keyof typeof messages.en]??key;
}