import assert from "node:assert/strict";
import test from "node:test";
import { canTranslatePublicShopProduct, shopTranslationSource } from "../shared/shop-translation";
import { createShopTranslationService } from "./shop-translation";

const source = shopTranslationSource({
  name: "Product", description: "Original content", shortDescription: "Original content",
  specifications: { Density: "1.23" }, features: [], applications: ["Application"], tags: null,
});

test("only active public catalog products may be sent for translation", () => {
  const record = { isActive: true, contractOnly: false, stockQuantity: 10, showWhenOutOfStock: false };
  assert.equal(canTranslatePublicShopProduct(record), true);
  assert.equal(canTranslatePublicShopProduct({ ...record, isActive: false }), false);
  assert.equal(canTranslatePublicShopProduct({ ...record, contractOnly: true }), false);
  assert.equal(canTranslatePublicShopProduct({ ...record, stockQuantity: 0 }), false);
  assert.equal(canTranslatePublicShopProduct({ ...record, stockQuantity: 0, showWhenOutOfStock: true }), true);
});

test("automatic translation matches the requested language and exact source, with in-flight deduplication", async () => {
  const calls: string[][] = [];
  const service = createShopTranslationService(async (words, target) => {
    calls.push(words);
    return words.map(word => `${target}:${word}`);
  });
  assert.deepEqual(await service(source, "fa", undefined), { status: "unavailable" });
  assert.equal(calls.length, 0);
  const [first, simultaneous] = await Promise.all([service(source, "fa", "fixture"), service(source, "fa", "fixture")]);
  assert.deepEqual(first, simultaneous);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ["Product", "Original content", "Density", "Application"]);
  assert.equal(first.status, "translated");
  assert.equal(first.source, JSON.stringify(source));
  assert.equal(first.text.name, "fa:Product");
  assert.deepEqual(first.text.specifications, [["fa:Density", "1.23"]]);
  await service(source, "fa", "fixture");
  assert.equal(calls.length, 1);
  const edited = await service({ ...source, description: "New content" }, "fa", "fixture");
  assert.equal(edited.status, "translated");
  assert.equal(edited.text.description, "fa:New content");
  const other = await service(source, "tr", "fixture");
  assert.equal(other.status, "translated");
  assert.equal(other.text.description, "tr:Original content");
  assert.equal(calls.length, 3);
});

test("incomplete provider results do not present partial text as translated", async () => {
  const service = createShopTranslationService(async () => []);
  assert.deepEqual(await service(source, "ar", "fixture"), { status: "unavailable" });
});
