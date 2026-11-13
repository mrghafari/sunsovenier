import { z } from "zod";

export const categorySampleSchema = z.object({
  id: z.string().min(1).max(100),
  imageUrl: z.string().trim().min(1).max(2000).refine(
    value => /^\/(?!\/)/.test(value) || /^https?:\/\/[^\s]+$/i.test(value),
    "Use a relative image path or an HTTP(S) URL",
  ),
  title: z.string().trim().max(180).default(""),
  description: z.string().trim().max(4000).default(""),
});
export const categorySamplesSchema = z.array(categorySampleSchema).max(24)
  .refine(items => new Set(items.map(item => item.id)).size === items.length, "Duplicate sample IDs");
export type CategorySample = z.infer<typeof categorySampleSchema>;

export function categorySamples(category: { id: number; imageUrl?: string | null; sampleImages?: CategorySample[] | null }): CategorySample[] {
  return category.sampleImages ?? (category.imageUrl ? [{ id: `cover-${category.id}`, imageUrl: category.imageUrl, title: "", description: "" }] : []);
}
