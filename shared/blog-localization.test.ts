import assert from "node:assert/strict";
import { test } from "node:test";
import { blogLanguages, blogTranslationsSchema, selectBlogTranslation } from "./blog-localization";

const translation = (language: typeof blogLanguages[number]) => ({
  language, title: `Title ${language}`, slug: `post-${language}`,
  excerpt: "An excerpt", content: "Article text",
});

test("each of the four languages can be the only saved and published translation", () => {
  for (const language of blogLanguages) {
    assert.equal(blogTranslationsSchema.parse([translation(language)]).length, 1);
  }
});

test("any subset of one to four distinct complete translations is accepted", () => {
  for (let mask = 1; mask < 16; mask++) {
    const subset = blogLanguages.filter((_, index) => mask & (1 << index)).map(translation);
    assert.deepEqual(blogTranslationsSchema.parse(subset).map(item => item.language), subset.map(item => item.language));
  }
});

test("no languages, unsupported languages, duplicates and incomplete selected languages fail", () => {
  for (const value of [
    undefined, null, [], "en", [{ ...translation("en"), language: "de" }],
    [translation("fa"), translation("fa")],
    ...["title", "slug", "excerpt", "content"].map(key => [{ ...translation("ar"), [key]: "   " }]),
  ]) {
    assert.equal(blogTranslationsSchema.safeParse(value).success, false);
  }
});

test("all public blog views prefer the requested language, then English, then any remaining language", () => {
  const all = blogLanguages.map(translation);
  for (const requested of blogLanguages) {
    assert.equal(selectBlogTranslation(all, requested)?.language, requested);
    assert.equal(selectBlogTranslation([translation("en"), translation("ar")], "fa")?.language, "en");
    assert.equal(selectBlogTranslation([translation(requested)], "unknown")?.language, requested);
  }
  assert.equal(selectBlogTranslation([], "fa"), undefined);
  assert.equal(selectBlogTranslation([translation("fa"), translation("ar")], "en")?.language, "ar");
});

test("omitting a saved translation removes it without requiring English or modifying remaining content", () => {
  const saved = blogLanguages.map(translation);
  const retained = blogTranslationsSchema.parse(saved.filter(item => item.language === "fa"));
  assert.equal(retained.length, 1);
  assert.equal(retained[0].content, "Article text");
  assert.equal(selectBlogTranslation(retained, "en")?.language, "fa");
});