import { z } from "zod";
import { insertBlogPostTranslationSchema } from "./blog-schema";

export const blogLanguages = ["en", "ar", "tr", "fa"] as const;
export type BlogLanguage = typeof blogLanguages[number];

const completeTranslationSchema = insertBlogPostTranslationSchema.extend({
  language: z.enum(blogLanguages),
  title: z.string().trim().min(1, "Translation title is required"),
  slug: z.string().trim().min(1, "Translation slug is required"),
  excerpt: z.string().trim().min(1, "Translation excerpt is required"),
  content: z.string().trim().min(1, "Translation content is required"),
});

// The submitted list is the complete set of translations to retain on Save.
export const blogTranslationsSchema = z.array(completeTranslationSchema)
  .min(1, "At least one complete blog language is required")
  .max(blogLanguages.length)
  .superRefine((translations, context) => {
    const seen = new Set<BlogLanguage>();
    translations.forEach((translation, index) => {
      if (seen.has(translation.language)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate blog language",
          path: [index, "language"],
        });
      }
      seen.add(translation.language);
    });
  });

// English remains the first fallback for compatibility, but is no longer mandatory.
export function selectBlogTranslation<T extends { language: string }>(
  translations: readonly T[],
  requestedLanguage: string,
): T | undefined {
  return translations.find(item => item.language === requestedLanguage) ||
    blogLanguages.map(language => translations.find(item => item.language === language)).find(Boolean);
}