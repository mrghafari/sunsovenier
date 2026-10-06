import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBlogTranslations,
  getInitialBlogLanguages,
  validateEnabledBlogLanguages,
} from "./blog-form";
import type { BlogLanguage } from "@shared/blog-localization";

const english = {
  titleEn: "An English title",
  slugEn: "english-title",
  excerptEn: "An English excerpt",
  contentEn: "English body",
};
const arabic = {
  titleAr: "عنوان",
  slugAr: "عنوان",
  excerptAr: "ملخص",
  contentAr: "المحتوى",
};

test("payload includes only enabled translations, including when English is absent", () => {
  const payload = buildBlogTranslations({ ...english, ...arabic }, ["ar"]);
  assert.deepEqual(payload.map(({ language }) => language), ["ar"]);
  assert.equal(payload[0].title, arabic.titleAr);
});

test("disabled empty translations do not block saving enabled languages", () => {
  const result = validateEnabledBlogLanguages({ ...arabic, titleEn: "", slugEn: "", excerptEn: "", contentEn: "" }, ["ar"]);
  assert.equal(result.valid, true);
  assert.deepEqual(result.invalidLanguages, []);
});

test("enabled empty translation blocks saving and identifies its tab", () => {
  const result = validateEnabledBlogLanguages({ ...english, titleTr: "", slugTr: "", excerptTr: "", contentTr: "" }, ["en", "tr"]);
  assert.equal(result.valid, false);
  assert.equal(result.firstInvalidLanguage, "tr");
});

test("re-enabling a language includes locally retained values in the payload", () => {
  const locallyTyped = { ...english, ...arabic };
  const removedAndReenabled: BlogLanguage[] = ["en", "ar"];
  assert.deepEqual(buildBlogTranslations(locallyTyped, removedAndReenabled).map((item) => item.language), removedAndReenabled);
  assert.equal(buildBlogTranslations(locallyTyped, removedAndReenabled)[1].content, arabic.contentAr);
});

test("edit initialization selects exactly the existing single language", () => {
  assert.deepEqual(getInitialBlogLanguages([{ language: "fa" }]), ["fa"]);
});
