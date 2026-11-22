import { z } from "zod";

export const productLanguages = ["en", "fa", "ar", "tr"] as const;
export type ProductLanguage = typeof productLanguages[number];

export const productLocalizationFields = {
  name: 300,
  description: 12000,
  shortDescription: 3000,
  specifications: 12000,
  features: 6000,
  applications: 6000,
} as const;

const localizedText = z.object({
  name: z.string().max(productLocalizationFields.name).optional(),
  description: z.string().max(productLocalizationFields.description).optional(),
  shortDescription: z.string().max(productLocalizationFields.shortDescription).optional(),
  specifications: z.string().max(productLocalizationFields.specifications).optional(),
  features: z.string().max(productLocalizationFields.features).optional(),
  applications: z.string().max(productLocalizationFields.applications).optional(),
}).strict();

export const productLocalizationsSchema = z.object({
  en: localizedText.optional(),
  fa: localizedText.optional(),
  ar: localizedText.optional(),
  tr: localizedText.optional(),
}).strict();

export type ProductLocalizations = z.infer<typeof productLocalizationsSchema>;
export type ProductLocalizationField = keyof typeof productLocalizationFields;

export function readProductTextList(value: unknown): string[] {
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { return []; }
  }
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && !!item.trim()) : [];
}

export function normalizeProductLocalizations(value: ProductLocalizations): ProductLocalizations {
  const normalized: ProductLocalizations = {};
  for (const language of productLanguages) {
    const copy = value[language];
    if (!copy) continue;
    const fields = Object.entries(copy)
      .map(([field, text]) => [field, text?.trim()])
      .filter(([, text]) => !!text);
    if (fields.length) normalized[language] = Object.fromEntries(fields);
  }
  return normalized;
}

type LocalizableProduct = {
  name: string;
  description?: string | null;
  shortDescription?: string | null;
  specifications?: unknown;
  features?: unknown;
  applications?: unknown;
  productLocalizations?: ProductLocalizations | null;
};

export function withAuthoredProductLocalization<T extends LocalizableProduct>(product: T, language: ProductLanguage) {
  const text = product.productLocalizations?.[language];
  if (!text) return product;
  const applyList = (value: string) => value.split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
  return {
    ...product,
    ...(text.name?.trim() && { name: text.name.trim() }),
    ...(text.description?.trim() && { description: text.description.trim() }),
    ...(text.shortDescription?.trim() && { shortDescription: text.shortDescription.trim() }),
    ...(text.specifications?.trim() && { specifications: text.specifications.trim() }),
    ...(text.features?.trim() && { features: applyList(text.features) }),
    ...(text.applications?.trim() && { applications: applyList(text.applications) }),
  };
}
