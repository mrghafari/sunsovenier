export const packagingTypes = ["bulk", "drum", "jumbo_bag", "big_bag", "bag", "ibc", "other"] as const;
export type PackagingType = typeof packagingTypes[number];
export type ContractPackaging = {
  type: PackagingType;
  customName: string;
  costPerTonne: number;
  vatRatePercent: number;
};
export type ContractPackagingCharge = ContractPackaging & {
  netWeightKg: number | null;
  netTonnes: number | null;
  costAmount: number;
  vatAmount: number;
  totalAmount: number;
  items: Array<{ productId: number; quantity: number; netWeightKg: number | null }>;
};

export function parseContractPackaging(value: unknown): ContractPackaging | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid contract packaging.");
  const v = value as Record<string, unknown>;
  if (!packagingTypes.includes(v.type as PackagingType)) throw new Error("Choose a valid packaging type.");
  const customName = typeof v.customName === "string" ? v.customName.trim() : "";
  if (customName.length > 100 || (v.type === "other" && !customName)) throw new Error("Enter the other packaging type (up to 100 characters).");
  const costPerTonne = Number(v.costPerTonne);
  const vatRatePercent = Number(v.vatRatePercent);
  if (!["number", "string"].includes(typeof v.costPerTonne) || v.costPerTonne === "" || v.costPerTonne == null || !Number.isSafeInteger(costPerTonne) || costPerTonne < 0) {
    throw new Error("Packaging cost per net tonne must be a nonnegative whole IQD amount.");
  }
  if (!["number", "string"].includes(typeof v.vatRatePercent) || v.vatRatePercent === "" || v.vatRatePercent == null || !Number.isFinite(vatRatePercent)
    || vatRatePercent < 0 || vatRatePercent > 100 || Math.abs(vatRatePercent * 100 - Math.round(vatRatePercent * 100)) > 1e-8) {
    throw new Error("Packaging VAT must be a percentage between 0 and 100 with at most two decimal places.");
  }
  return { type: v.type as PackagingType, customName: v.type === "other" ? customName : "", costPerTonne, vatRatePercent };
}

const kgFactors: Record<string, number> = {
  kg: 1, kilogram: 1, kilograms: 1, g: 0.001, gram: 0.001, grams: 0.001,
  t: 1000, ton: 1000, tonne: 1000, tons: 1000, tonnes: 1000,
  lb: 0.45359237, lbs: 0.45359237, pound: 0.45359237, pounds: 0.45359237,
  oz: 0.028349523125, ounce: 0.028349523125, ounces: 0.028349523125,
};

/** Net weight only: shipping/gross weight is never a substitute for packaging billing. */
export function calculateContractPackaging(
  rawPackaging: unknown,
  products: Array<{ productId: number; quantity: number; netWeight: unknown; weightUnit?: unknown }>,
): ContractPackagingCharge | null {
  const packaging = parseContractPackaging(rawPackaging);
  if (!packaging) return null;
  let missing = false;
  const items = products.map(p => {
    if (!Number.isSafeInteger(p.quantity) || p.quantity <= 0 || !Number.isSafeInteger(p.productId) || p.productId <= 0) {
      throw new Error("Invalid packaging cart quantity.");
    }
    const factor = kgFactors[String(p.weightUnit || "kg").trim().toLowerCase()];
    const value = p.netWeight == null || String(p.netWeight).trim() === "" ? NaN : Number(p.netWeight);
    const valid = factor !== undefined && Number.isFinite(value) && value > 0;
    if (!valid) missing = true;
    return { productId: p.productId, quantity: p.quantity, netWeightKg: valid ? Number((value * factor).toFixed(8)) : null };
  }).sort((a, b) => a.productId - b.productId);
  if (missing && packaging.costPerTonne > 0) throw new Error("وزن خالص کالا برای محاسبهٔ هزینهٔ بسته‌بندی مشخص نشده است.");
  const netWeightKg = missing ? null : Number(items.reduce((sum, p) => sum + (p.netWeightKg || 0) * p.quantity, 0).toFixed(8));
  const netTonnes = netWeightKg === null ? null : netWeightKg / 1000;
  const costAmount = Math.round((netTonnes ?? 0) * packaging.costPerTonne);
  const vatAmount = Math.round(costAmount * packaging.vatRatePercent / 100);
  const totalAmount = costAmount + vatAmount;
  if (![costAmount, vatAmount, totalAmount].every(Number.isSafeInteger)) throw new Error("Packaging amount exceeds the supported monetary range.");
  return { ...packaging, netWeightKg, netTonnes, costAmount, vatAmount, totalAmount, items };
}

export function packagingTypeLabel(packaging: Pick<ContractPackaging, "type" | "customName">, language = "fa"): string {
  const names: Record<string, Record<PackagingType, string>> = {
    fa: { bulk: "فله", drum: "بشکه", jumbo_bag: "جامبوبگ", big_bag: "بیگ‌بگ", bag: "کیسه", ibc: "مخزن IBC", other: "سایر" },
    ar: { bulk: "سائب", drum: "برميل", jumbo_bag: "جامبو باغ", big_bag: "بيغ باغ", bag: "كيس", ibc: "خزان IBC", other: "أخرى" },
    tr: { bulk: "Dökme", drum: "Varil", jumbo_bag: "Jumbo bag", big_bag: "Big bag", bag: "Çuval", ibc: "IBC tank", other: "Diğer" },
    en: { bulk: "Bulk", drum: "Drum", jumbo_bag: "Jumbo bag", big_bag: "Big bag", bag: "Bag", ibc: "IBC tank", other: "Other" },
  };
  return packaging.type === "other" ? packaging.customName : (names[language] || names.en)[packaging.type];
}

export function packagingTermsText(packaging: ContractPackaging, language = "fa"): string {
  const type = packagingTypeLabel(packaging, language);
  const fee = packaging.costPerTonne.toLocaleString(language);
  const vat = packaging.vatRatePercent.toLocaleString(language);
  const texts: Record<string, string> = {
    fa: `نوع بسته‌بندی: ${type}. هزینهٔ بسته‌بندی: ${fee} IQD به‌ازای هر تن وزن خالص کالا، جدا از قیمت کالا و پیش از مالیات. نرخ ارزش افزودهٔ بسته‌بندی: ${vat}٪، مستقل از مالیات کالا.`,
    ar: `نوع التعبئة: ${type}. رسوم التعبئة: ${fee} IQD لكل طن من الوزن الصافي، منفصلة عن سعر البضاعة وقبل الضريبة. ضريبة التعبئة: ${vat}٪، مستقلة عن ضريبة البضاعة.`,
    tr: `Ambalaj: ${type}. Paketleme bedeli: net ürün tonu başına ${fee} IQD; ürün fiyatından ayrı ve vergi öncesidir. Paketleme KDV: %${vat}, ürün KDV'sinden bağımsızdır.`,
    en: `Packaging: ${type}. Packaging fee: ${fee} IQD per net tonne of goods, separate from goods prices and before tax. Packaging VAT: ${vat}%, independent of goods VAT.`,
  };
  return texts[language] || texts.en;
}
