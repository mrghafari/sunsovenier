// The seven category headings supplied by the site owner. Keep photo slot IDs
// stable so previously uploaded images and saved card settings remain attached.
const headings: Record<string, Record<string, string>> = {
  water: { en: "Fuel Additives", fa: "افزودنی‌های سوخت", ar: "إضافات الوقود", tr: "Yakıt Katkıları" },
  "water-treatment": { en: "Water Treatment", fa: "تصفیه آب", ar: "معالجة المياه", tr: "Su Arıtma" },
  ibc1000: { en: "Paint & Solvents", fa: "رنگ و حلال‌ها", ar: "الدهانات والمذيبات", tr: "Boya ve Solventler" },
  fert: { en: "Agricultural Fertilizers", fa: "کودهای کشاورزی", ar: "الأسمدة الزراعية", tr: "Tarımsal Gübreler" },
  tank1500: { en: "Industrial Chemicals", fa: "مواد شیمیایی صنعتی", ar: "المواد الكيميائية الصناعية", tr: "Endüstriyel Kimyasallar" },
  drum220: { en: "Technical Equipment", fa: "تجهیزات فنی", ar: "المعدات التقنية", tr: "Teknik Ekipman" },
  "commercial-goods": { en: "Commercial Goods", fa: "کالاهای تجاری", ar: "السلع التجارية", tr: "Ticari Mallar" },
};

export function categoryCardHeading(cardId: string, language: string, fallback: string): string {
  return headings[cardId]?.[language] ?? headings[cardId]?.en ?? fallback;
}

export function categoryCardOrder(cardId: string, fallback: number): number {
  const index = Object.keys(headings).indexOf(cardId);
  return index < 0 ? 7 + fallback : index;
}
