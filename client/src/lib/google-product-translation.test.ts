import assert from "node:assert/strict";
import test from "node:test";
import { googleProductTranslationLinks, productTranslationText, translationLanguages } from "./google-product-translation";

test("only current public product text is sent to Google Translate", () => {
  const product = {
    name: "Test name", description: "Current description & details", shortDescription: "Current description & details",
    specifications: '{"Density":"1.00","Ready":true,"bad":null}', features: ["Feature", null],
    applications: '["Application"]', tags: ["Tag"],
    sku: "hidden-sku", price: "hidden-price", review: "hidden-review",
  };
  const text = productTranslationText(product);
  assert.deepEqual(text.split("\n\n"), [
    "Test name", "Current description & details", "Density: 1.00\nReady: true", "Feature", "Application", "Tag",
  ]);
  assert.doesNotMatch(text, /hidden-/);
});

test("translation links encode all four languages and preserve punctuation and RTL text", () => {
  const text = "English & فارسی؟\nالعربية / Türkçe % #";
  for (const language of translationLanguages) {
    const [href] = googleProductTranslationLinks(text, language);
    const url = new URL(href);
    assert.equal(url.origin, "https://translate.google.com");
    assert.deepEqual(Object.fromEntries(url.searchParams), { sl: "auto", tl: language, text, op: "translate" });
  }
  assert.deepEqual(googleProductTranslationLinks("   ", "fa"), []);
});

test("long, multilingual source text is preserved across bounded links", () => {
  const text = "آزمایش 🔬 ".repeat(1500) + "ژ".repeat(9500) + "A".repeat(6000);
  const links = googleProductTranslationLinks(text, "ar").map(href => new URL(href));
  assert.ok(links.length > 1);
  assert.ok(links.every(url => url.href.length < 6700 && url.searchParams.get("text")!.length <= 4500));
  assert.equal(links.map(url => url.searchParams.get("text")).join(""), text);
});
