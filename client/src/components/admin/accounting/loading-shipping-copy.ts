import type {Language} from "@/lib/i18n";
export const shippingCopy={
  fa:{
    title:"تخصیص دستی کرایهٔ ثابت",total:"کرایهٔ ثابت سفارش",approved:"جمع سهم‌های تأییدشده",remaining:"ماندهٔ تخصیص",
    allocation:"سهم این بار",reference:"مرجع مدرک",reason:"دلیل تخصیص",submit:"ثبت و تأیید سهم",busy:"در حال ثبت…",
    confirmation:"مبلغ و مدرک این سهم را بررسی کرده‌ام؛ تأیید نهایی قابل ویرایش یا حذف نیست.",
    notice:"فقط مدرک تخصیص کرایه ثبت می‌شود؛ فاکتور، سند حسابداری، کسر موجودی یا برداشت کیف پول ایجاد نمی‌شود. مانده به‌صورت خودکار به بار بعدی تخصیص نمی‌یابد.",
    saved:"سهم این بار تأیید شده است.",invalid:"مبلغ نامعتبر است یا مرجع مدرک و دلیل تخصیص کمتر از ۵ نویسه دارند.",failed:"ثبت سهم انجام نشد.",
    approvedAt:"زمان تأیید",actor:"تأییدکننده",viewOnly:"فقط کاربر دارای دسترسی مدیریت حسابداری می‌تواند این سهم را تأیید کند.",
  },
  en:{
    title:"Manual fixed-freight allocation",total:"Fixed order freight",approved:"Total approved shares",remaining:"Unallocated remainder",
    allocation:"This loading's share",reference:"Evidence reference",reason:"Allocation reason",submit:"Record and approve share",busy:"Saving…",
    confirmation:"I reviewed this amount and evidence; final approval cannot be edited or deleted.",
    notice:"Only allocation evidence is recorded. No invoice, journal, inventory deduction or wallet debit is created. The remainder is not automatically assigned to another loading.",
    saved:"This loading's share is approved.",invalid:"Invalid amount, or evidence reference and reason are shorter than five characters.",failed:"Share could not be recorded.",
    approvedAt:"Approval time",actor:"Approved by",viewOnly:"Accounting management access is required to approve this share.",
  },
  ar:{
    title:"التوزيع اليدوي لأجرة النقل الثابتة",total:"أجرة نقل الطلب الثابتة",approved:"مجموع الحصص المعتمدة",remaining:"المبلغ غير الموزع",
    allocation:"حصة هذه الحمولة",reference:"مرجع المستند",reason:"سبب التوزيع",submit:"تسجيل واعتماد الحصة",busy:"جارٍ التسجيل…",
    confirmation:"راجعت المبلغ والمستند؛ لا يمكن تعديل الاعتماد النهائي أو حذفه.",
    notice:"يسجل إثبات التوزيع فقط؛ لا تصدر فاتورة أو قيد محاسبي ولا يخصم المخزون أو رصيد المحفظة. لا يوزع الباقي تلقائياً على حمولة أخرى.",
    saved:"تم اعتماد حصة هذه الحمولة.",invalid:"المبلغ غير صالح أو مرجع المستند والسبب أقصر من خمسة أحرف.",failed:"تعذر تسجيل الحصة.",
    approvedAt:"وقت الاعتماد",actor:"المعتمد",viewOnly:"يلزم إذن إدارة المحاسبة لاعتماد الحصة.",
  },
  tr:{
    title:"Sabit navlun için manuel paylaştırma",total:"Siparişin sabit navlunu",approved:"Onaylanan payların toplamı",remaining:"Dağıtılmamış tutar",
    allocation:"Bu yüklemenin payı",reference:"Belge referansı",reason:"Paylaştırma gerekçesi",submit:"Payı kaydet ve onayla",busy:"Kaydediliyor…",
    confirmation:"Tutarı ve belgeyi inceledim; kesin onay değiştirilemez veya silinemez.",
    notice:"Yalnızca paylaştırma kanıtı kaydedilir. Fatura, muhasebe kaydı, stok düşümü veya cüzdan kesintisi oluşturulmaz. Kalan tutar başka yüklemeye otomatik atanmaz.",
    saved:"Bu yüklemenin payı onaylandı.",invalid:"Tutar geçersiz veya belge referansı ve gerekçe beş karakterden kısa.",failed:"Pay kaydedilemedi.",
    approvedAt:"Onay zamanı",actor:"Onaylayan",viewOnly:"Pay onayı için muhasebe yönetim yetkisi gerekir.",
  },
} satisfies Record<Language,Record<string,string>>;

export const shippingErrorCopy:Record<Language,Record<string,string>>={
  fa:{FIXED_SHIPPING_LIMIT_EXCEEDED:"جمع سهم‌ها از کرایهٔ ثابت سفارش بیشتر می‌شود؛ داده‌ها را تازه‌سازی و مبلغ را اصلاح کنید.",
    INVALID_SHIPPING_AMOUNT:"مبلغ باید با تعداد اعشار مجاز ارز هماهنگ باشد.",IDEMPOTENCY_CONFLICT:"این سهم قبلاً با اطلاعات دیگری تأیید شده و قابل جایگزینی نیست.",
    ORDER_SNAPSHOT_CONFLICT:"کرایهٔ ثابت یا ارز این بار با تأییدهای قبلی سفارش مطابقت ندارد.",SHIPPING_SNAPSHOT_REQUIRED:"اطلاعات ثابت و معتبر کرایه و بارگیری لازم است.",
    ACCESS_DENIED:"دسترسی مدیریت حسابداری برای تأیید این سهم لازم است."},
  en:{FIXED_SHIPPING_LIMIT_EXCEEDED:"Combined shares exceed fixed order freight. Refresh and correct the amount.",
    INVALID_SHIPPING_AMOUNT:"Use the currency's permitted decimal precision.",IDEMPOTENCY_CONFLICT:"This share was already approved with different data and cannot be replaced.",
    ORDER_SNAPSHOT_CONFLICT:"This loading's fixed freight or currency differs from earlier approvals.",SHIPPING_SNAPSHOT_REQUIRED:"Valid immutable freight and loading evidence is required.",
    ACCESS_DENIED:"Accounting management access is required."},
  ar:{FIXED_SHIPPING_LIMIT_EXCEEDED:"مجموع الحصص يتجاوز أجرة النقل الثابتة. حدّث البيانات وصحح المبلغ.",
    INVALID_SHIPPING_AMOUNT:"يجب أن يطابق المبلغ دقة العملة.",IDEMPOTENCY_CONFLICT:"اعتمدت هذه الحصة ببيانات مختلفة ولا يمكن استبدالها.",
    ORDER_SNAPSHOT_CONFLICT:"أجرة النقل أو العملة تختلف عن الاعتمادات السابقة.",SHIPPING_SNAPSHOT_REQUIRED:"يلزم إثبات ثابت وصالح للنقل والحمولة.",
    ACCESS_DENIED:"يلزم إذن إدارة المحاسبة."},
  tr:{FIXED_SHIPPING_LIMIT_EXCEEDED:"Payların toplamı sabit navlunu aşıyor. Verileri yenileyip tutarı düzeltin.",
    INVALID_SHIPPING_AMOUNT:"Para biriminin izin verdiği ondalık hassasiyeti kullanın.",IDEMPOTENCY_CONFLICT:"Bu pay farklı verilerle onaylandı ve değiştirilemez.",
    ORDER_SNAPSHOT_CONFLICT:"Bu yüklemenin navlunu veya para birimi önceki onaylarla uyuşmuyor.",SHIPPING_SNAPSHOT_REQUIRED:"Geçerli ve değişmez navlun ve yükleme kanıtı gerekiyor.",
    ACCESS_DENIED:"Muhasebe yönetim yetkisi gerekiyor."},
};
