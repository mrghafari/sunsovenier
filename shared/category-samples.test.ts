import test from "node:test";
import assert from "node:assert/strict";
import { categorySamples, categorySamplesSchema } from "./category-samples";

test("gallery order and explicit removal are authoritative over cover images", () => {
  const images = categorySamplesSchema.parse([
    { id: "second", imageUrl: "/example-b.jpg", title: "B" },
    { id: "first", imageUrl: "https://example.com/a.jpg" },
  ]);
  assert.deepEqual(categorySamples({ id: 1, imageUrl: "/cover.jpg", sampleImages: images }).map(item => item.id), ["second", "first"]);
  assert.deepEqual(categorySamples({ id: 1, imageUrl: "/cover.jpg", sampleImages: [] }), []);
  assert.equal(categorySamples({ id: 1, imageUrl: "/cover.jpg" })[0].imageUrl, "/cover.jpg");
});
test("gallery rejects unsafe URLs, duplicates, oversized text and too many pictures", () => {
  const image = { id: "a", imageUrl: "/a.jpg" };
  for (const value of [
    [{ ...image, imageUrl: "javascript:alert(1)" }],
    [{ ...image, imageUrl: "//evil.example/a.jpg" }],
    [image, image],
    [{ ...image, title: "x".repeat(181) }],
    Array.from({ length: 25 }, (_, index) => ({ ...image, id: String(index) })),
  ]) assert.equal(categorySamplesSchema.safeParse(value).success, false);
});
