import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { normalizeBlogPublishDate, parseNewBlogPost } from "./blog-post-input";

test("accepts the date string sent by the new blog form", () => {
  const post = parseNewBlogPost({
    authorName: "Editor",
    status: "published",
    publishDate: "2026-09-28",
    tags: ["news"],
  });
  assert.equal(post.publishDate?.toISOString(), "2026-09-28T00:00:00.000Z");
});

test("allows a draft without a publish date", () => {
  const post = parseNewBlogPost({
    authorName: "Editor",
    status: "draft",
    publishDate: null,
  });
  assert.equal(post.publishDate, null);
  assert.equal(normalizeBlogPublishDate(""), null);
});

test("rejects malformed dates rather than passing invalid dates to the database", () => {
  assert.throws(() => parseNewBlogPost({
    authorName: "Editor",
    publishDate: "not a date",
  }), z.ZodError);
});