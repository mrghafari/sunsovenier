import { blogLanguages, type BlogLanguage } from "@shared/blog-localization";

export type BlogFormTranslationInput = Record<string, string | undefined>;

export type BlogTranslationPayload = {
  language: BlogLanguage;
  title: string | undefined;
  slug: string | undefined;
  excerpt: string | undefined;
  content: string | undefined;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage?: string | null;
};

export function blogLanguageFields(language: BlogLanguage) {
  const suffix = language.charAt(0).toUpperCase() + language.slice(1);
  return [`title${suffix}`, `slug${suffix}`, `excerpt${suffix}`, `content${suffix}`] as const;
}

export function validateEnabledBlogLanguages(
  data: BlogFormTranslationInput,
  enabledLanguages: readonly BlogLanguage[],
) {
  const missingFields = enabledLanguages.flatMap((language) =>
    blogLanguageFields(language)
      .filter((field) => !data[field]?.trim())
      .map((field) => ({ language, field })),
  );
  const invalidLanguages = enabledLanguages.filter((language) =>
    missingFields.some((missing) => missing.language === language),
  );
  return {
    valid: invalidLanguages.length === 0,
    invalidLanguages,
    firstInvalidLanguage: invalidLanguages[0],
    missingFields,
  };
}

export function buildBlogTranslations(
  data: BlogFormTranslationInput,
  enabledLanguages: readonly BlogLanguage[],
): BlogTranslationPayload[] {
  return enabledLanguages.map((language) => {
    const suffix = language.charAt(0).toUpperCase() + language.slice(1);
    const translation: BlogTranslationPayload = {
      language,
      title: data[`title${suffix}`],
      slug: data[`slug${suffix}`],
      excerpt: data[`excerpt${suffix}`],
      content: data[`content${suffix}`],
      metaTitle: data[`metaTitle${suffix}`] || null,
      metaDescription: data[`metaDescription${suffix}`] || null,
    };
    if (language === "ar") translation.ogImage = data.ogImageAr || null;
    return translation;
  });
}

export function getInitialBlogLanguages(
  translations: readonly { language: string }[],
): BlogLanguage[] {
  const existing = blogLanguages.filter((language) =>
    translations.some((translation) => translation.language === language),
  );
  return existing.length ? existing : ["en"];
}
