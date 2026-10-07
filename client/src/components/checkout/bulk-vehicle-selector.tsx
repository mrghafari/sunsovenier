const copy = {
  fa: { title: "حمل فله‌ای", automatic: "قالب مناسب خودرو به‌صورت خودکار توسط سیستم انتخاب می‌شود. لجستیک، خودروی واقعی را از ناوگان قراردادی به آن تخصیص می‌دهد.", self: "طبق قرارداد، حمل توسط مشتری است؛ به انتخاب قالب یا وجود خودروی شرکت نیازی نیست و کرایهٔ شرکت اضافه نمی‌شود.", price: "قیمت کالا طبق قرارداد باقی می‌ماند." },
  ar: { title: "نقل سائب", automatic: "يختار النظام قالب المركبة المناسب تلقائياً. تخصص اللوجستيات مركبة فعلية من الأسطول التعاقدي.", self: "النقل على العميل حسب العقد؛ لا يلزم اختيار قالب أو توفر مركبة للشركة، ولا تضاف أجرة نقل الشركة.", price: "يبقى سعر البضاعة حسب العقد." },
  tr: { title: "Dökme taşıma", automatic: "Sistem uygun araç şablonunu otomatik seçer. Lojistik, sözleşmeli filodan gerçek aracı tahsis eder.", self: "Sözleşmeye göre taşıma müşteriye aittir; şablon seçimi veya şirket aracı gerekmez, şirket nakliye ücreti eklenmez.", price: "Ürün fiyatı sözleşmeye göre korunur." },
  en: { title: "Bulk transport", automatic: "The system automatically selects the appropriate vehicle template. Logistics assigns a physical vehicle from the contract fleet.", self: "Transport is customer-arranged under the contract. No template selection or company vehicle is required, and no company freight is added.", price: "Goods retain their contract prices." },
};

/** Informational only: template pricing belongs to the server, physical assignment to logistics. */
export default function BulkVehicleSelector({ language, selfTransport = false }: {
  language: string; selfTransport?: boolean;
}) {
  const t = copy[language as keyof typeof copy] ?? copy.en;
  return <section className="my-3 space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3" role="status">
    <h3 className="font-semibold">{t.title}</h3>
    <p className="text-sm">{selfTransport ? t.self : t.automatic}</p>
    <p className="text-xs">{t.price}</p>
  </section>;
}
