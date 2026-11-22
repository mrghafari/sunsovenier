import assert from "node:assert/strict";
import { test } from "node:test";
import type { ShopProduct } from "@shared/shop-schema";
import catalog from "./shop-product-locales.json";
import { hasCurrentShopProductTranslation, localizeShopProduct, productDetailCopy } from "./shop-product-localization";

function sourceProduct(id: keyof typeof catalog): ShopProduct {
  const source = catalog[id].source;
  return { id: Number(id), ...source } as unknown as ShopProduct;
}

test("all existing products show their translated details in each selected language", () => {
  for (const id of Object.keys(catalog) as Array<keyof typeof catalog>) {
    const original = sourceProduct(id);
    for (const language of ["fa", "ar", "tr"] as const) {
      const result = localizeShopProduct(original, language);
      const expected = catalog[id][language];
      assert.equal(result.name, expected.name);
      assert.equal(result.description, expected.description);
      assert.equal(result.shortDescription, expected.shortDescription);
      assert.deepEqual(result.features, expected.features);
      assert.deepEqual(result.applications, expected.applications);
      assert.deepEqual(result.tags, expected.tags);
      assert.ok(productDetailCopy[language].description);
      assert.equal(hasCurrentShopProductTranslation(original, language), true);
    }
    assert.strictEqual(localizeShopProduct(original, "en"), original);
  }
});

test("changed source text does not show a stale translation", () => {
  const original = sourceProduct("624");
  const edited = { ...original, description: "Updated product description" };
  const displayed = localizeShopProduct(edited, "fa");
  assert.equal(displayed.description, edited.description);
  assert.equal(displayed.name, catalog["624"].fa.name);
  assert.equal(hasCurrentShopProductTranslation(edited, "fa"), false);
});

test("new products without generated translations retain their original content", () => {
  const newProduct = { ...sourceProduct("624"), id: 987654, name: "New product" };
  assert.strictEqual(localizeShopProduct(newProduct, "tr"), newProduct);
  assert.equal(hasCurrentShopProductTranslation(newProduct, "tr"), false);
});

test("staff-entered translations override only the specified fields of the chosen language", () => {
  const original = sourceProduct("624");
  const edited = {
    ...original, specifications: { Density: "1.2" },
    productLocalizations: {
      en: { name: "English product" },
      fa: { name: "نام فارسی", description: "توضیح ثبت‌شده", specifications: "چگالی: ۱٫۲\nمشخصات دیگر", features: "ویژگی اول\n\nویژگی دوم" },
      ar: { specifications: "الكثافة: 1.2" },
      tr: { description: "Mağaza açıklaması" },
    },
  };
  const fa = localizeShopProduct(edited, "fa");
  assert.equal(fa.name, "نام فارسی");
  assert.equal(fa.description, "توضیح ثبت‌شده");
  assert.equal(fa.specifications, "چگالی: ۱٫۲\nمشخصات دیگر");
  assert.deepEqual(fa.features, ["ویژگی اول", "ویژگی دوم"]);
  assert.equal(fa.shortDescription, catalog["624"].fa.shortDescription);
  assert.equal(localizeShopProduct(edited, "en").name, "English product");
  assert.equal(localizeShopProduct(edited, "ar").specifications, "الكثافة: 1.2");
  assert.deepEqual(localizeShopProduct(edited, "tr").specifications, { Density: "1.2" });
  assert.equal(localizeShopProduct(edited, "tr").description, "Mağaza açıklaması");
});