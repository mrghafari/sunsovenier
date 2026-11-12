import assert from "node:assert/strict";
import test from "node:test";
import { currentPublicProductLink, isRetiredProductPath } from "./retired-product-paths";

test("all public products paths resolve to the shop, including old links with queries", () => {
  for (const href of [
    "/products", "/products/", "/products?category=Fertilizers", "/products#list",
    "/products/agricultural-fertilizers", "/products/water-treatment",
    "/products/commercial-goods", "/products/unknown/deeper-page",
  ]) {
    assert.equal(isRetiredProductPath(href), true);
    assert.equal(currentPublicProductLink(href), "/shop");
  }
});

test("Kardex, vendor products, APIs and current storefront remain untouched", () => {
  for (const href of [
    "/mrg/products", "/vendor/products", "/api/products", "/api/shop/products",
    "/shop", "/shop/product/12", "/product-reviews/12", "/products-other", "#services",
  ]) {
    assert.equal(isRetiredProductPath(href), false);
    assert.equal(currentPublicProductLink(href), href);
  }
});
