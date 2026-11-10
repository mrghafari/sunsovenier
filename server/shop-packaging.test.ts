import assert from "node:assert/strict";
import test from "node:test";
import { withShopPackaging, shopPackagingSql } from "./shop-packaging";
import type { PackagingSpecifications } from "../shared/product-packaging";

test("shop packaging is attached by Kardex name, not unrelated shop IDs, in one read", async () => {
  const specs: PackagingSpecifications = {
    version: 1, material: "hdpe", nominalCapacityL: 200,
    workingPressureBar: 0, reusable: false,
    additionalProperties: [{ name: "Seal", value: "Tamper evident" }],
  };
  let reads = 0;
  const products = [{ id: 75, name: "Drum" }, { id: 82, name: "Missing" }, { id: 90, name: "Drum" }];
  const result = await withShopPackaging(products, async names => {
    reads++;
    assert.deepEqual(names, ["Drum", "Missing"]);
    return [{ name: "Drum", packaging_specifications: specs }];
  });
  assert.equal(reads, 1);
  assert.deepEqual(result[0].packagingSpecifications, specs);
  assert.equal(result[1].packagingSpecifications, null);
  assert.deepEqual(result[2].packagingSpecifications, specs);
  assert.equal("packagingSpecifications" in products[0], false);
  assert.equal(result[0].id, 75);
});

test("empty products do not query; a cleared base does not acquire another batch's packaging", async () => {
  assert.deepEqual(await withShopPackaging([], async () => { throw new Error("Unexpected read"); }), []);
  const result = await withShopPackaging([{ name: "Empty" }], async () => [
    { name: "Empty", packaging_specifications: null },
  ]);
  assert.equal(result[0].packagingSpecifications, null);
  assert.match(shopPackagingSql, /DISTINCT ON \(name\)/);
  assert.match(shopPackagingSql, /ORDER BY name, id ASC/);
  assert.doesNotMatch(shopPackagingSql, /packaging_specifications IS NOT NULL/i);
});
