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