import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProductLocalizations, productLocalizationsSchema } from "./product-localizations";

test("all four locales may be saved, and blank fields return to fallback", () => {
  const values = productLocalizationsSchema.parse({
    en: { name: " Test " }, fa: { specifications: " چگالی: ۱٫۲ \n دادهٔ دوم " },
    ar: { name: " منتج " }, tr: { name: " ", description: " Açıklama " },
  });
  assert.deepEqual(normalizeProductLocalizations(values), {
    en: { name: "Test" }, fa: { specifications: "چگالی: ۱٫۲ \n دادهٔ دوم" },
    ar: { name: "منتج" }, tr: { description: "Açıklama" },
  });
  assert.deepEqual(normalizeProductLocalizations({ fa: { name: "" } }), {});
  for (const invalid of [{ de: { name: "Name" } }, { en: { price: "42" } }, { fa: { specifications: { invalid: true } } }]) {
    assert.equal(productLocalizationsSchema.safeParse(invalid).success, false);
  }
});
