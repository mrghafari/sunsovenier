import type { Language } from "@/lib/i18n";

const copy = {
  en: {
    title: "FIFO documentary simulation",
    intro: "Trace measured truck quantities to current approved purchase and opening papers. This is evidence replay, not a stock valuation.",
    company: "Company", orderId: "Order ID (optional)", apply: "Run preview", choose: "Choose a company and run the preview to inspect measured loading lines.",
    noCompanies: "No companies are available for this view.", invalid: "Choose a valid company and enter a positive numeric order ID, if needed.",
    loading: "Replaying approved documents…", failed: "Could not load the FIFO simulation", retry: "Retry", refresh: "Recalculate",
    stale: "The selected scope changed. Run the preview again to load the new scope.", empty: "No measured loading rows match this scope.",
    result: "Documentary replay", fact: "Loading fact", order: "Order", page: "Page", of: "of", rows: "loadings", previous: "Previous", next: "Next",
    permissions: "READ ONLY · NO POSTING OR RESERVATION", permissionBody: "This viewer can inspect provenance only. The report has no post, activate, or reserve action.",
    safetyTitle: "CURRENT DOCUMENTARY CALCULATION — NOT VERIFIED STOCK OR COGS",
    safetyBody: "Current approved documents are recalculated now. Physical stock is unchanged; no journals are created and nothing is activated. Even full documentary coverage does not resolve historical consumption, opening stock, or FX book values.",
    companyReplay: "Company-wide replay", sourceDocuments: "Approved source documents", history: "History entries",
    replayHelp: "These counts cover the entire company replay, not this order filter or displayed page.",
    measuredLines: "Measured lines", orderItem: "Order item", product: "Product", tons: "Measured tons", requested: "Requested",
    allocations: "Documented FIFO allocations", noAllocations: "No documentary layer was allocated to this line.",
    document: "Document ID", revision: "Revision", reference: "Paper reference", date: "Document date", batch: "Batch", quantity: "Allocated tons",
    cost: "Native-currency documented cost", noCost: "Cost unknown — no amount is asserted.", shortage: "Documented shortage",
    noShortage: "Shortage quantity is unknown.", issues: "Replay issues", noIssues: "No replay issues reported.",
    costs: "Documented cost by native currency", perLoadingCosts: "Each loading is shown separately; currencies are not converted.", noCosts: "Total cost unknown; no native-currency cost groups are reported.",
    invalidHistory: "Invalid prior loading history blocks later allocations in this company replay.",
    issuesMap: {
      INVALID_LOADING_HISTORY: "Prior loading history is invalid; subsequent allocations are blocked.",
      DOCUMENTED_STOCK_SHORTFALL: "Documented layers do not cover the measured quantity.",
      PREVIOUS_SHORTFALL: "A previous documentary shortfall blocks this later allocation.",
      AMBIGUOUS_LAYER_IDENTITY: "The product and batch identity is duplicated across documents; layer provenance is ambiguous.",
    },
  },
  fa: {
    title: "شبیه‌سازی مستند FIFO",
    intro: "مقدار اندازه‌گیری‌شدهٔ کامیون را تا اسناد خرید و افتتاحیهٔ تأییدشدهٔ فعلی دنبال کنید؛ این بازپخش شواهد است، نه ارزش‌گذاری موجودی.",
    company: "شرکت", orderId: "شناسه سفارش (اختیاری)", apply: "اجرای پیش‌نمایش", choose: "شرکت را انتخاب و پیش‌نمایش را اجرا کنید تا ردیف‌های اندازه‌گیری‌شده بررسی شوند.",
    noCompanies: "شرکتی برای این نما موجود نیست.", invalid: "شرکت معتبر انتخاب کنید و در صورت نیاز شناسه سفارش عددی مثبت وارد کنید.",
    loading: "در حال بازپخش اسناد تأییدشده…", failed: "بارگذاری شبیه‌سازی FIFO ممکن نشد", retry: "تلاش دوباره", refresh: "محاسبهٔ دوباره",
    stale: "محدوده تغییر کرده است؛ برای دریافت محدودهٔ جدید پیش‌نمایش را دوباره اجرا کنید.", empty: "ردیف بارگیری اندازه‌گیری‌شده‌ای در این محدوده نیست.",
    result: "بازپخش مستند", fact: "واقعیت بارگیری", order: "سفارش", page: "صفحه", of: "از", rows: "بارگیری", previous: "قبلی", next: "بعدی",
    permissions: "فقط‌خواندنی · بدون ثبت یا رزرو", permissionBody: "این نما فقط برای بررسی منشأ اسناد است؛ عملی برای ثبت، فعال‌سازی یا رزرو ندارد.",
    safetyTitle: "محاسبهٔ مستندِ فعلی — نه موجودی یا بهای تمام‌شدهٔ تأییدشده",
    safetyBody: "اسناد تأییدشدهٔ فعلی اکنون دوباره محاسبه می‌شوند. موجودی فیزیکی تغییر نمی‌کند؛ سند روزنامه‌ای ساخته یا چیزی فعال نمی‌شود. حتی پوشش کامل اسناد نیز مصرف تاریخی، موجودی افتتاحیه یا ارزش دفتری ارز را حل نمی‌کند.",
    companyReplay: "بازپخش کل شرکت", sourceDocuments: "اسناد منبع تأییدشده", history: "ورودی‌های تاریخچه",
    replayHelp: "این شمارنده‌ها مربوط به بازپخش کل شرکت هستند، نه فیلتر سفارش یا صفحهٔ نمایش.",
    measuredLines: "ردیف‌های اندازه‌گیری‌شده", orderItem: "قلم سفارش", product: "کالا", tons: "تن اندازه‌گیری‌شده", requested: "درخواستی",
    allocations: "تخصیص‌های FIFO مستند", noAllocations: "برای این ردیف لایهٔ مستندی تخصیص نیافته است.",
    document: "شناسه سند", revision: "بازبینی", reference: "ارجاع کاغذی", date: "تاریخ سند", batch: "بچ", quantity: "تن تخصیص‌یافته",
    cost: "بهای مستند به ارز اصلی", noCost: "بها نامشخص است — مبلغی گزارش نشده است.", shortage: "کسری مستند",
    noShortage: "مقدار کسری نامشخص است.", issues: "ایرادهای بازپخش", noIssues: "ایرادی برای بازپخش گزارش نشده است.",
    costs: "بهای مستند به تفکیک ارز اصلی", perLoadingCosts: "هر بارگیری جداگانه نمایش داده می‌شود؛ ارزها تبدیل نمی‌شوند.", noCosts: "جمع بها نامشخص است؛ گروه بهای ارزی گزارش نشده است.",
    invalidHistory: "تاریخچهٔ بارگیری قبلی نامعتبر است و تخصیص‌های بعدی را در بازپخش شرکت مسدود می‌کند.",
    issuesMap: {
      INVALID_LOADING_HISTORY: "تاریخچهٔ بارگیری قبلی نامعتبر است؛ تخصیص‌های بعدی مسدود شده‌اند.",
      DOCUMENTED_STOCK_SHORTFALL: "لایه‌های مستند مقدار اندازه‌گیری‌شده را پوشش نمی‌دهند.",
      PREVIOUS_SHORTFALL: "کسری مستند قبلی این تخصیص بعدی را مسدود می‌کند.",
      AMBIGUOUS_LAYER_IDENTITY: "هویت کالا و بچ در چند سند تکرار شده و منشأ لایه مبهم است.",
    },
  },
  ar: {
    title: "محاكاة FIFO المستندية",
    intro: "تتبّع كمية الشاحنة المقاسة إلى مستندات الشراء والافتتاح المعتمدة حاليًا. هذا استعراض للأدلة وليس تقييمًا للمخزون.",
    company: "الشركة", orderId: "رقم الطلب (اختياري)", apply: "تشغيل المعاينة", choose: "اختر شركة وشغّل المعاينة لفحص بنود التحميل المقاسة.",
    noCompanies: "لا توجد شركات لهذا العرض.", invalid: "اختر شركة صالحة وأدخل رقم طلب موجبًا عند الحاجة.",
    loading: "جارٍ إعادة تشغيل المستندات المعتمدة…", failed: "تعذر تحميل محاكاة FIFO", retry: "إعادة المحاولة", refresh: "إعادة الحساب",
    stale: "تغير النطاق المحدد. شغّل المعاينة مجددًا لتحميل النطاق الجديد.", empty: "لا توجد صفوف تحميل مقاسة تطابق هذا النطاق.",
    result: "إعادة التشغيل المستندية", fact: "واقعة التحميل", order: "الطلب", page: "صفحة", of: "من", rows: "تحميلات", previous: "السابق", next: "التالي",
    permissions: "للقراءة فقط · بلا ترحيل أو حجز", permissionBody: "يمكن لهذا العارض فحص المصدر فقط؛ لا توجد إجراءات للترحيل أو التفعيل أو الحجز.",
    safetyTitle: "حساب مستندي حالي — ليس مخزونًا أو تكلفة بضاعة مباعة موثقة",
    safetyBody: "تُعاد الآن حسابات المستندات المعتمدة حاليًا. لا يتغير المخزون الفعلي، ولا تُنشأ قيود يومية أو يُفعّل شيء. حتى التغطية المستندية الكاملة لا تحسم الاستهلاك التاريخي أو المخزون الافتتاحي أو القيم الدفترية للعملات الأجنبية.",
    companyReplay: "إعادة تشغيل الشركة كاملة", sourceDocuments: "مستندات المصدر المعتمدة", history: "سجلات التاريخ",
    replayHelp: "تعكس هذه الأعداد إعادة تشغيل الشركة كاملة، لا مرشح الطلب أو الصفحة المعروضة.",
    measuredLines: "البنود المقاسة", orderItem: "بند الطلب", product: "المنتج", tons: "الأطنان المقاسة", requested: "المطلوب",
    allocations: "تخصيصات FIFO المستندية", noAllocations: "لم تُخصص طبقة مستندية لهذا البند.",
    document: "رقم المستند", revision: "المراجعة", reference: "مرجع الورق", date: "تاريخ المستند", batch: "الدفعة", quantity: "الأطنان المخصصة",
    cost: "التكلفة المستندية بالعملة الأصلية", noCost: "التكلفة غير معروفة — لا يوجد مبلغ مؤكد.", shortage: "العجز المستندي",
    noShortage: "كمية العجز غير معروفة.", issues: "مشكلات إعادة التشغيل", noIssues: "لم تُسجل مشكلات لإعادة التشغيل.",
    costs: "التكلفة المستندية حسب العملة الأصلية", perLoadingCosts: "يُعرض كل تحميل على حدة؛ لا تُحوّل العملات.", noCosts: "إجمالي التكلفة غير معروف؛ لا توجد مجموعات تكلفة بالعملة الأصلية.",
    invalidHistory: "سجل التحميل السابق غير صالح، ويمنع التخصيصات اللاحقة في إعادة تشغيل الشركة.",
    issuesMap: {
      INVALID_LOADING_HISTORY: "سجل التحميل السابق غير صالح؛ التخصيصات اللاحقة محظورة.",
      DOCUMENTED_STOCK_SHORTFALL: "الطبقات المستندية لا تغطي الكمية المقاسة.",
      PREVIOUS_SHORTFALL: "عجز مستندي سابق يمنع هذا التخصيص اللاحق.",
      AMBIGUOUS_LAYER_IDENTITY: "هوية المنتج والدفعة مكررة عبر المستندات؛ مصدر الطبقة ملتبس.",
    },
  },
  tr: {
    title: "FIFO belge simülasyonu",
    intro: "Ölçülen kamyon miktarını güncel onaylı alış ve açılış belgelerine kadar izleyin. Bu, stok değerlemesi değil kanıtların yeniden oynatımıdır.",
    company: "Şirket", orderId: "Sipariş kimliği (isteğe bağlı)", apply: "Önizlemeyi çalıştır", choose: "Ölçülen yükleme satırlarını incelemek için şirket seçip önizlemeyi çalıştırın.",
    noCompanies: "Bu görünüm için şirket bulunmuyor.", invalid: "Geçerli bir şirket seçin; gerekiyorsa pozitif sayısal sipariş kimliği girin.",
    loading: "Onaylı belgeler yeniden hesaplanıyor…", failed: "FIFO simülasyonu yüklenemedi", retry: "Yeniden dene", refresh: "Yeniden hesapla",
    stale: "Seçilen kapsam değişti. Yeni kapsamı yüklemek için önizlemeyi yeniden çalıştırın.", empty: "Bu kapsamda ölçülmüş yükleme satırı yok.",
    result: "Belgesel yeniden oynatım", fact: "Yükleme olgusu", order: "Sipariş", page: "Sayfa", of: "/", rows: "yükleme", previous: "Önceki", next: "Sonraki",
    permissions: "SALT OKUNUR · KAYIT VEYA REZERVASYON YOK", permissionBody: "Bu görüntüleyici yalnızca belge izini inceleyebilir; kayıt, etkinleştirme veya rezervasyon işlemi yoktur.",
    safetyTitle: "GÜNCEL BELGESEL HESAP — DOĞRULANMIŞ STOK VEYA COGS DEĞİL",
    safetyBody: "Güncel onaylı belgeler şimdi yeniden hesaplanır. Fiziksel stok değişmez; yevmiye oluşturulmaz ve hiçbir şey etkinleştirilmez. Tam belgesel kapsama bile geçmiş tüketimi, açılış stoğunu veya döviz defter değerlerini çözmez.",
    companyReplay: "Şirket genelinde yeniden oynatım", sourceDocuments: "Onaylı kaynak belgeler", history: "Geçmiş kayıtları",
    replayHelp: "Bu sayılar sipariş filtresini veya gösterilen sayfayı değil, şirket genelindeki yeniden oynatımı kapsar.",
    measuredLines: "Ölçülen satırlar", orderItem: "Sipariş kalemi", product: "Ürün", tons: "Ölçülen ton", requested: "Talep",
    allocations: "Belgesel FIFO tahsisleri", noAllocations: "Bu satıra belgesel katman tahsis edilmedi.",
    document: "Belge kimliği", revision: "Revizyon", reference: "Belge referansı", date: "Belge tarihi", batch: "Parti", quantity: "Tahsis edilen ton",
    cost: "Yerel para biriminde belgelenmiş maliyet", noCost: "Maliyet bilinmiyor — tutar ileri sürülmüyor.", shortage: "Belgesel açık",
    noShortage: "Açık miktarı bilinmiyor.", issues: "Yeniden oynatım sorunları", noIssues: "Yeniden oynatım sorunu bildirilmedi.",
    costs: "Yerel para birimine göre belgelenmiş maliyet", perLoadingCosts: "Her yükleme ayrı gösterilir; para birimleri dönüştürülmez.", noCosts: "Toplam maliyet bilinmiyor; yerel para biriminde maliyet grubu bildirilmedi.",
    invalidHistory: "Geçersiz önceki yükleme geçmişi, şirket genelindeki yeniden oynatımda sonraki tahsisleri engeller.",
    issuesMap: {
      INVALID_LOADING_HISTORY: "Önceki yükleme geçmişi geçersiz; sonraki tahsisler engellendi.",
      DOCUMENTED_STOCK_SHORTFALL: "Belgesel katmanlar ölçülen miktarı karşılamıyor.",
      PREVIOUS_SHORTFALL: "Önceki belgesel açık bu sonraki tahsisi engelliyor.",
      AMBIGUOUS_LAYER_IDENTITY: "Ürün ve parti kimliği belgeler arasında yineleniyor; katman kaynağı belirsiz.",
    },
  },
} as const;

export type InventoryFifoCopyKey = { [Key in keyof typeof copy.en]: typeof copy.en[Key] extends string ? Key : never }[keyof typeof copy.en];
export function inventoryFifoCopy(language: Language, key: InventoryFifoCopyKey): string {
  const locale = language in copy ? language as keyof typeof copy : "en";
  const value = copy[locale][key];
  return typeof value === "string" ? value : copy.en[key] as string;
}
export function inventoryFifoIssueCopy(language: Language, issue: string): string {
  const locale = language in copy ? language as keyof typeof copy : "en";
  const localized = (copy[locale].issuesMap as Record<string, string>)[issue];
  return localized ?? `${inventoryFifoCopy(language, "issues")}: ${issue}`;
}
