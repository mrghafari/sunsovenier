import { z } from "zod";
import { insertBlogPostSchema } from "@shared/blog-schema";

export function normalizeBlogPublishDate(value: unknown): Date | null | undefined {
  if (value === null || value === "") return null;
  if (value === undefined) return undefined;
  return z.date().parse(typeof value === "string" ? new Date(value) : value);
}

export function parseNewBlogPost(input: unknown) {
  const post = z.record(z.unknown()).parse(input);
  return insertBlogPostSchema.parse({
    ...post,
    publishDate: normalizeBlogPublishDate(post.publishDate),
  });
}