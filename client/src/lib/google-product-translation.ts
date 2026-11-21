import type { ShopProduct } from "@shared/shop-schema";
import { shopTranslationSource, shopTranslationLanguages, type ShopTranslationLanguage } from "@shared/shop-translation";
export { shopTranslationLanguages as translationLanguages };

type PublicTranslationProduct = Pick<ShopProduct, "name" | "description" | "shortDescription" | "specifications" | "features" | "applications" | "tags">;

export function productTranslationText(product: PublicTranslationProduct): string {
  const source = shopTranslationSource(product);
  const details = [source.name, source.description, source.shortDescription]
    .map(text => text?.trim())
    .filter((text): text is string => !!text);
  return [
    ...new Set(details),
    source.specifications.map(([name, value]) => `${name}: ${value}`).join("\n"),
    source.features.join("\n"),
    source.applications.join("\n"),
    source.tags.join(", "),
  ].filter(Boolean).join("\n\n");
}

export function googleProductTranslationLinks(text: string, language: ShopTranslationLanguage): string[] {
  const links: string[] = [];
  let part = "";
  let encodedLength = 0;
  const flush = () => {
    if (part.trim()) {
      const url = new URL("https://translate.google.com/");
      url.search = new URLSearchParams({ sl: "auto", tl: language, text: part, op: "translate" }).toString();
      links.push(url.href);
    }
    part = "";
    encodedLength = 0;
  };
  const append = (piece: string) => {
    const length = new URLSearchParams({ t: piece }).toString().length - 2;
    if (length > 6500 || piece.length > 4500) {
      // Very long words (including non-Latin scripts) still need to fit in the link.
      for (const codePoint of piece) append(codePoint);
      return;
    }
    if (encodedLength + length > 6500 || part.length + piece.length > 4500) flush();
    part += piece;
    encodedLength += length;
  };
  for (const token of text.match(/\S+\s*|\s+/gu) ?? []) append(token);
  flush();
  return links;
}
