import type { Language } from "@/lib/i18n";

export type ProductPageCopy = {
  heroTitle: string; heroDescription: string; primaryAction: string; guideAction: string;
  benefitsTitle: string; benefitsDescription: string; portfolioTitle: string; portfolioDescription: string;
  features: string; applications: string; imageAvailable: string; downloadCatalog: string; inquiry: string;
  inStock: string; lowStock: string; outOfStock: string; reviews: string; noReviews: string;
  ctaTitle: string; ctaDescription: string; contact: string; catalog: string;
  specTitle: string; specDescription: string; property: string; value: string; standard: string;
  applicationTitle: string; applicationDescription: string; viewShop: string;
};

export const copyFor = (language: Language, values: Record<Language, ProductPageCopy>) => values[language];

export const fuelCopy: Record<Language, ProductPageCopy> = {
  en: { heroTitle:"Fuel Additives",heroDescription:"High-performance fuel additives designed to enhance combustion efficiency, reduce emissions, and extend engine life across automotive and industrial applications.",primaryAction:"Request Quote",guideAction:"Download Datasheet",benefitsTitle:"Why Choose Our Fuel Additives?",benefitsDescription:"Advanced chemical solutions that deliver measurable improvements in fuel performance and efficiency.",portfolioTitle:"Our Fuel Additive Portfolio",portfolioDescription:"Comprehensive range of specialized additives for every fuel application.",features:"Key Features:",applications:"Applications:",imageAvailable:"Image Available",downloadCatalog:"Download Catalog",inquiry:"Get Quote",inStock:"In Stock",lowStock:"Low Stock",outOfStock:"Out of Stock",reviews:"Reviews",noReviews:"No reviews",ctaTitle:"Ready to Enhance Your Fuel Performance?",ctaDescription:"Contact our technical team to discuss your specific fuel additive requirements and find the perfect solution.",contact:"Contact Technical Team",catalog:"Download Product Catalog",specTitle:"Technical Specifications",specDescription:"Our fuel additives meet or exceed international standards for quality and performance.",property:"Property",value:"Value",standard:"Standard",applicationTitle:"Industries We Serve",applicationDescription:"Our fuel additives are trusted by leading companies across multiple industries.",viewShop:"View in Shop"},
  ar: { heroTitle:"إضافات الوقود",heroDescription:"إضافات وقود عالية الأداء لتعزيز كفاءة الاحتراق وخفض الانبعاثات وإطالة عمر المحرك في تطبيقات السيارات والصناعة.",primaryAction:"اطلب عرض سعر",guideAction:"تحميل ورقة البيانات",benefitsTitle:"لماذا تختار إضافات الوقود لدينا؟",benefitsDescription:"حلول كيميائية متقدمة تحقق تحسينات قابلة للقياس في أداء الوقود وكفاءته.",portfolioTitle:"مجموعة إضافات الوقود",portfolioDescription:"مجموعة متكاملة من الإضافات المتخصصة لكل تطبيقات الوقود.",features:"الميزات الرئيسية:",applications:"التطبيقات:",imageAvailable:"الصورة متاحة",downloadCatalog:"تحميل الكتالوج",inquiry:"احصل على عرض سعر",inStock:"متوفر",lowStock:"مخزون منخفض",outOfStock:"غير متوفر",reviews:"التقييمات",noReviews:"لا توجد تقييمات",ctaTitle:"هل أنت مستعد لتحسين أداء الوقود؟",ctaDescription:"تواصل مع فريقنا الفني لمناقشة احتياجاتك من إضافات الوقود واختيار الحل المناسب.",contact:"تواصل مع الفريق الفني",catalog:"تحميل كتالوج المنتجات",specTitle:"المواصفات الفنية",specDescription:"تطابق إضافات الوقود لدينا المعايير الدولية للجودة والأداء أو تتجاوزها.",property:"الخاصية",value:"القيمة",standard:"المعيار",applicationTitle:"القطاعات التي نخدمها",applicationDescription:"تحظى إضافات الوقود لدينا بثقة الشركات الرائدة في قطاعات متعددة.",viewShop:"عرض في المتجر"},
  tr: { heroTitle:"Yakıt Katkıları",heroDescription:"Otomotiv ve endüstriyel uygulamalarda yanma verimliliğini artırmak, emisyonları azaltmak ve motor ömrünü uzatmak için tasarlanan yüksek performanslı yakıt katkıları.",primaryAction:"Teklif İste",guideAction:"Teknik Föyü İndir",benefitsTitle:"Yakıt Katkılarımızı Neden Seçmelisiniz?",benefitsDescription:"Yakıt performansında ve verimliliğinde ölçülebilir iyileştirmeler sağlayan gelişmiş kimyasal çözümler.",portfolioTitle:"Yakıt Katkısı Portföyümüz",portfolioDescription:"Her yakıt uygulaması için kapsamlı özel katkı seçenekleri.",features:"Temel Özellikler:",applications:"Uygulamalar:",imageAvailable:"Görsel mevcut",downloadCatalog:"Kataloğu indir",inquiry:"Teklif al",inStock:"Stokta",lowStock:"Düşük stok",outOfStock:"Stokta yok",reviews:"Yorumlar",noReviews:"Yorum yok",ctaTitle:"Yakıt performansınızı artırmaya hazır mısınız?",ctaDescription:"Yakıt katkısı ihtiyaçlarınızı görüşmek ve doğru çözümü bulmak için teknik ekibimizle iletişime geçin.",contact:"Teknik ekiple iletişim",catalog:"Ürün kataloğunu indir",specTitle:"Teknik Özellikler",specDescription:"Yakıt katkılarımız uluslararası kalite ve performans standartlarını karşılar veya aşar.",property:"Özellik",value:"Değer",standard:"Standart",applicationTitle:"Hizmet Verdiğimiz Sektörler",applicationDescription:"Yakıt katkılarımız birçok sektörde lider şirketler tarafından tercih edilmektedir.",viewShop:"Mağazada görüntüle"},
  fa: { heroTitle:"افزودنی‌های سوخت",heroDescription:"افزودنی‌های سوخت با عملکرد بالا برای افزایش بازده احتراق، کاهش آلایندگی و افزایش عمر موتور در کاربردهای خودرویی و صنعتی.",primaryAction:"درخواست قیمت",guideAction:"دانلود برگه فنی",benefitsTitle:"چرا افزودنی‌های سوخت ما؟",benefitsDescription:"راهکارهای شیمیایی پیشرفته برای بهبود قابل‌اندازه‌گیری عملکرد و بازده سوخت.",portfolioTitle:"سبد افزودنی‌های سوخت",portfolioDescription:"مجموعه‌ای کامل از افزودنی‌های تخصصی برای هر کاربرد سوخت.",features:"ویژگی‌های کلیدی:",applications:"کاربردها:",imageAvailable:"تصویر موجود است",downloadCatalog:"دانلود کاتالوگ",inquiry:"دریافت قیمت",inStock:"موجود",lowStock:"موجودی کم",outOfStock:"ناموجود",reviews:"دیدگاه‌ها",noReviews:"بدون دیدگاه",ctaTitle:"برای بهبود عملکرد سوخت آماده‌اید؟",ctaDescription:"برای گفت‌وگو درباره نیازهای افزودنی سوخت و انتخاب راهکار مناسب با تیم فنی ما تماس بگیرید.",contact:"تماس با تیم فنی",catalog:"دانلود کاتالوگ محصولات",specTitle:"مشخصات فنی",specDescription:"افزودنی‌های سوخت ما استانداردهای بین‌المللی کیفیت و عملکرد را رعایت می‌کنند یا فراتر می‌روند.",property:"ویژگی",value:"مقدار",standard:"استاندارد",applicationTitle:"صنایع تحت پوشش",applicationDescription:"شرکت‌های پیشرو در صنایع مختلف به افزودنی‌های سوخت ما اعتماد دارند.",viewShop:"مشاهده در فروشگاه"},
};

export const genericCopy: Record<Language, ProductPageCopy> = {
  en: { ...fuelCopy.en }, ar: { ...fuelCopy.ar }, tr: { ...fuelCopy.tr }, fa: { ...fuelCopy.fa },
};

export const waterCopy = Object.fromEntries((Object.keys(genericCopy) as Language[]).map((lang) => [lang, {
  ...genericCopy[lang],
  heroTitle: ({en:"Water Treatment Solutions",ar:"حلول معالجة المياه",tr:"Su Arıtma Çözümleri",fa:"راهکارهای تصفیه آب"} as Record<Language,string>)[lang],
  portfolioTitle: ({en:"Our Water Treatment Products",ar:"منتجات معالجة المياه",tr:"Su Arıtma Ürünlerimiz",fa:"محصولات تصفیه آب ما"} as Record<Language,string>)[lang],
  benefitsTitle: ({en:"Advanced Water Treatment Benefits",ar:"مزايا معالجة المياه المتقدمة",tr:"Gelişmiş Su Arıtma Avantajları",fa:"مزایای پیشرفته تصفیه آب"} as Record<Language,string>)[lang],
  applicationTitle: ({en:"Application Areas",ar:"مجالات التطبيق",tr:"Uygulama Alanları",fa:"حوزه‌های کاربرد"} as Record<Language,string>)[lang],
  ctaTitle: ({en:"Need a Custom Water Treatment Solution?",ar:"هل تحتاج إلى حل مخصص لمعالجة المياه؟",tr:"Özel bir su arıtma çözümüne mi ihtiyacınız var?",fa:"به راهکار سفارشی تصفیه آب نیاز دارید؟"} as Record<Language,string>)[lang],
}])) as Record<Language, ProductPageCopy>;

export const paintCopy = Object.fromEntries((Object.keys(genericCopy) as Language[]).map((lang) => [lang, {
  ...genericCopy[lang],
  heroTitle: ({en:"Paint & Solvents",ar:"الدهانات والمذيبات",tr:"Boya ve Solventler",fa:"رنگ و حلال‌ها"} as Record<Language,string>)[lang],
  portfolioTitle: ({en:"Our Paint & Thinner Products",ar:"منتجات الدهانات والمخففات",tr:"Boya ve Tiner Ürünlerimiz",fa:"محصولات رنگ و تینر ما"} as Record<Language,string>)[lang],
  benefitsTitle: ({en:"Why Choose Our Paint & Thinner Products?",ar:"لماذا تختار منتجات الدهانات والمخففات لدينا؟",tr:"Boya ve tiner ürünlerimizi neden seçmelisiniz?",fa:"چرا محصولات رنگ و تینر ما؟"} as Record<Language,string>)[lang],
  applicationTitle: ({en:"Applications",ar:"التطبيقات",tr:"Uygulamalar",fa:"کاربردها"} as Record<Language,string>)[lang],
}])) as Record<Language, ProductPageCopy>;

export const agricultureCopy = Object.fromEntries((Object.keys(genericCopy) as Language[]).map((lang) => [lang, {
  ...genericCopy[lang],
  heroTitle: ({en:"Agricultural Fertilizers",ar:"الأسمدة الزراعية",tr:"Tarım Gübreleri",fa:"کودهای کشاورزی"} as Record<Language,string>)[lang],
  portfolioTitle: ({en:"Our Agricultural Products",ar:"منتجاتنا الزراعية",tr:"Tarım Ürünlerimiz",fa:"محصولات کشاورزی ما"} as Record<Language,string>)[lang],
  benefitsTitle: ({en:"Why Choose Our Agricultural Solutions?",ar:"لماذا تختار حلولنا الزراعية؟",tr:"Tarım çözümlerimizi neden seçmelisiniz?",fa:"چرا راهکارهای کشاورزی ما؟"} as Record<Language,string>)[lang],
  applicationTitle: ({en:"Agricultural Applications",ar:"التطبيقات الزراعية",tr:"Tarımsal Uygulamalar",fa:"کاربردهای کشاورزی"} as Record<Language,string>)[lang],
  ctaTitle: ({en:"Ready to Improve Your Harvest?",ar:"هل أنت مستعد لتحسين محصولك؟",tr:"Hasadınızı geliştirmeye hazır mısınız?",fa:"برای بهبود برداشت آماده‌اید؟"} as Record<Language,string>)[lang],
}])) as Record<Language, ProductPageCopy>;