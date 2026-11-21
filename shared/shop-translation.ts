import type { ShopProduct } from "./shop-schema";

export const shopTranslationLanguages = ["en", "fa", "ar", "tr"] as const;
export type ShopTranslationLanguage = typeof shopTranslationLanguages[number];

function readLegacyJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return null; }
}

export function readProductTextList(value: unknown): string[] {
  const parsed = readLegacyJson(value);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && !!item.trim()) : [];
}

export function readProductTextSpecs(value: unknown): Record<string, string> {
  const parsed = readLegacyJson(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return Object.fromEntries(Object.entries(parsed)
    .filter(([, item]) => typeof item === "string" || typeof item === "number" || typeof item === "boolean")
    .map(([key, item]) => [key, String(item)]));
}

type ProductSource = Pick<ShopProduct, "name" | "description" | "shortDescription" | "specifications" | "features" | "applications" | "tags">;

export function canTranslatePublicShopProduct(product: Pick<ShopProduct, "isActive" | "contractOnly" | "stockQuantity" | "showWhenOutOfStock">): boolean {
  return product.isActive === true && !product.contractOnly && ((product.stockQuantity ?? 0) > 0 || product.showWhenOutOfStock === true);
}

// Do not include prices, SKUs, barcodes, documents, reviews, or any session/customer data.
export function shopTranslationSource(product: ProductSource) {
  return {
    name: product.name,
    description: product.description,
    shortDescription: product.shortDescription,
    specifications: Object.entries(readProductTextSpecs(product.specifications)),
    features: readProductTextList(product.features),
    applications: readProductTextList(product.applications),
    tags: readProductTextList(product.tags),
  };
}

export type ShopTranslationSource = ReturnType<typeof shopTranslationSource>;

export function mapShopTranslation(source: ShopTranslationSource, translate: (text: string) => string): ShopTranslationSource {
  return {
    name: translate(source.name),
    description: translate(source.description),
    shortDescription: source.shortDescription === null ? null : translate(source.shortDescription),
    specifications: source.specifications.map(([key, value]) => [translate(key), translate(value)]),
    features: source.features.map(translate),
    applications: source.applications.map(translate),
    tags: source.tags.map(translate),
  };
}

export type ShopTranslationResult =
  | { status: "translated"; source: string; text: ShopTranslationSource }
  | { status: "unavailable" };
