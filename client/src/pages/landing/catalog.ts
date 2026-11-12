export type PackageId = "drum220" | "ibc1000" | "tank1500" | "bag25" | "bigbag";
export type LandingProduct = {
  id: string;
  title: string;
  short: string;
  long: string;
  specs: string[];
  pack: PackageId[];
  asset: number;
  categoryPath: string;
  custom?: boolean;
};

export const PACKAGES: Record<PackageId, { name: string; capacity: string; icon: string; description: string }> = {
  drum220: { name: "220L Steel Drum", capacity: "220 litres", icon: "fa-drum-steelpan", description: "Sealed steel drum for solvents" },
  ibc1000: { name: "1000L IBC Tote", capacity: "1,000 litres", icon: "fa-cube", description: "HDPE bottle in steel cage" },
  tank1500: { name: "1500L Steel Tank", capacity: "1,500 litres", icon: "fa-database", description: "304L stainless storage tank" },
  bag25: { name: "25 kg Bags", capacity: "25 kg", icon: "fa-bag-shopping", description: "Woven PP, moisture-protected" },
  bigbag: { name: "Big Bag (FIBC)", capacity: "500–1000 kg", icon: "fa-boxes-stacked", description: "Bulk bags for dry products" },
};
export const LIQUID_PACKAGES: PackageId[] = ["drum220", "ibc1000", "tank1500"];
export const BASE_PRODUCTS: LandingProduct[] = [
  { id: "drum220", title: "220L Standard Drums", short: "Heavy-duty steel drums designed for secure transport of liquid solvents and chemical fluids.", long: "Heavy-duty steel drums built for the safe transport and storage of liquid solvents and chemical fluids. Sealed closures protect product purity and make handling and stacking simple on pallets.", specs: ["Capacity: 220 litres", "Material: heavy-duty steel", "Sealed, tamper-evident closure", "Pallet and forklift friendly"], pack: LIQUID_PACKAGES, asset: 4, categoryPath: "/shop" },
  { id: "ibc1000", title: "1000L IBC Containers", short: "Intermediate Bulk Containers with high-density polyethylene and steel grid frame.", long: "Intermediate Bulk Containers combining a high-density polyethylene bottle with a galvanised steel grid frame. Ideal for medium-volume deliveries with a bottom discharge valve for easy, clean transfer.", specs: ["Capacity: 1,000 litres", "HDPE bottle + steel cage", "Bottom discharge valve", "Stackable, reusable"], pack: LIQUID_PACKAGES, asset: 5, categoryPath: "/shop" },
  { id: "tank1500", title: "1500L Stainless Storage Tank", short: "Specialized 304L stainless steel heavy-duty chemical storage tanks branded for bulk handling.", long: "Specialised 304L stainless steel storage tanks for bulk chemical handling. Excellent corrosion resistance and long service life for high-volume storage and repeat supply.", specs: ["Capacity: 1,500 litres", "Grade: 304L stainless steel", "High corrosion resistance", "Suited for bulk handling"], pack: LIQUID_PACKAGES, asset: 6, categoryPath: "/shop" },
  { id: "fert", title: "Agricultural Fertilizers", short: "Nitrogen, Phosphorus, Potassium (NPK).", long: "Agricultural fertilizers based on Nitrogen, Phosphorus and Potassium (NPK), supplied in the formulations your crops and soil require, with full documentation for every shipment.", specs: ["NPK formulations", "Granular and soluble grades", "CoA with every batch", "Bulk and retail volumes"], pack: ["bag25", "bigbag"], asset: 7, categoryPath: "/products/agricultural-fertilizers" },
  { id: "logistics", title: "Logistics", short: "Industrial packaging & printing optimization.", long: "Industrial packaging and printing optimisation: we plan, label and ship your products so they arrive safely, compliant and ready for use at your industrial site.", specs: ["Custom labelling and printing", "Palletising and load planning", "Safety documentation", "Delivery to your site"], pack: ["drum220", "ibc1000", "bigbag"], asset: 8, categoryPath: "/services" },
  { id: "water", title: "Water", short: "Clear, odorless, industrial-grade water.", long: "Water is a clear, odorless liquid. We supply industrial-grade water in a range of container sizes for process use, dilution and cleaning applications.", specs: ["Clear and odorless", "Industrial-grade quality", "Flexible container sizes", "Scheduled deliveries"], pack: LIQUID_PACKAGES, asset: 9, categoryPath: "/products/water-treatment" },
  { id: "water-treatment", title: "Water Treatment", short: "", long: "", specs: [], pack: LIQUID_PACKAGES, asset: 5, categoryPath: "/shop" },
  { id: "commercial-goods", title: "Commercial Goods", short: "", long: "", specs: [], pack: ["bag25", "bigbag"], asset: 6, categoryPath: "/shop" },
];

export const LOCALIZED_PRODUCTS: Record<string, Array<[string, string, string]>> = {
  fa: [
    ["بشکه استاندارد ۲۲۰ لیتری", "بشکه‌های فولادی مقاوم برای حمل ایمن حلال‌ها و مایعات شیمیایی.", "بشکه ۲۲۰ لیتری"],
    ["مخزن IBC هزار لیتری", "مخزن‌های IBC از پلی‌اتیلن سنگین با قاب شبکه‌ای فولادی.", "IBC هزار لیتری"],
    ["مخزن استیل ۱۵۰۰ لیتری", "مخازن نگهداری سنگین از استیل 304L برای جابه‌جایی عمده.", "مخزن ۱۵۰۰ لیتری"],
    ["کودهای کشاورزی", "نیتروژن، فسفر و پتاسیم (NPK)", "کود کشاورزی"], ["لجستیک", "بهینه‌سازی بسته‌بندی و چاپ صنعتی:", "لجستیک"], ["آب", "آب شفاف و بی‌بو", "آب"],
  ],
  ar: [
    ["براميل قياسية 220 لتر", "براميل فولاذية شديدة التحمل لنقل المذيبات والسوائل الكيميائية بأمان.", "براميل 220 لتر"],
    ["حاويات IBC سعة 1000 لتر", "حاويات IBC من البولي إيثيلين عالي الكثافة بإطار شبكي فولاذي.", "IBC 1000 لتر"],
    ["خزان تخزين مقاوم للصدأ 1500 لتر", "خزانات كيميائية متينة من الفولاذ المقاوم للصدأ 304L للتعامل بالجملة.", "خزانات 1500 لتر"],
    ["أسمدة زراعية", "النيتروجين والفوسفور والبوتاسيوم (NPK)", "الأسمدة الزراعية"], ["الخدمات اللوجستية", "تحسين التعبئة والطباعة الصناعية:", "الخدمات اللوجستية"], ["المياه", "الماء صافٍ وعديم الرائحة", "المياه"],
  ],
  tr: [
    ["220L Standart Variller", "Sıvı solventlerin ve kimyasal akışkanların güvenli taşınması için ağır hizmet tipi çelik variller.", "220L Variller"],
    ["1000L IBC Konteynerler", "Yüksek yoğunluklu polietilen ve çelik kafes çerçeveli IBC konteynerler.", "1000L IBC"],
    ["1500L Paslanmaz Depolama Tankı", "Toplu taşıma için 304L paslanmaz çelikten özel ağır hizmet kimyasal tankları.", "1500L Tanklar"],
    ["Tarımsal gübreler", "Azot, Fosfor, Potasyum (NPK)", "Tarımsal gübreler"], ["Lojistik", "Endüstriyel Ambalaj ve Baskı Optimizasyonu:", "Lojistik"], ["Su", "Su berrak ve kokusuzdur", "Su"],
  ],
};

export const PRODUCT_DETAILS_UI: Record<string, { specifications: string; packaging: string; request: string; detail: string; close: string }> = {
  en: { specifications: "Specifications", packaging: "Available packaging types", request: "REQUEST A QUOTE", detail: "PRODUCT DETAILS", close: "Close product details" },
  fa: { specifications: "مشخصات", packaging: "انواع بسته‌بندی موجود", request: "درخواست قیمت", detail: "جزئیات محصول", close: "بستن جزئیات محصول" },
  ar: { specifications: "المواصفات", packaging: "أنواع التعبئة المتاحة", request: "اطلب عرض سعر", detail: "تفاصيل المنتج", close: "إغلاق تفاصيل المنتج" },
  tr: { specifications: "Teknik özellikler", packaging: "Mevcut ambalaj türleri", request: "TEKLİF İSTE", detail: "ÜRÜN DETAYLARI", close: "Ürün detaylarını kapat" },
};
