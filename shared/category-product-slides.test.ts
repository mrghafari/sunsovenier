import test from "node:test";
import assert from "node:assert/strict";
import { productsInCategory, firstProductImage, technicalRows } from "./category-product-slides";

test("slides contain only active products from the selected category in stable order", () => {
  const products = [
    { id: 3, category: "Managed category", displayOrder: 2 },
    { id: 4, category: "Other category", displayOrder: 0 },
    { id: 2, category: "managed-category", displayOrder: 1 },
    { id: 1, category: "Managed category", isActive: false, displayOrder: 0 },
  ];
  assert.deepEqual(productsInCategory(products, { name: "Managed category", slug: "managed-category" }).map(product => product.id), [2, 3]);
});
test("each product uses its own first image and has honest missing-image behavior", () => {
  assert.equal(firstProductImage({ imageUrls: ["/first.jpg", "/second.jpg"], imageUrl: "/legacy.jpg" }), "/first.jpg");
  assert.equal(firstProductImage({ imageUrls: '["/json-first.jpg","/json-second.jpg"]' }), "/json-first.jpg");
  assert.equal(firstProductImage({ imageUrls: [], imageUrl: "/legacy.jpg" }), "/legacy.jpg");
  assert.equal(firstProductImage({ imageUrls: null }), null);
});
test("technical rows retain zero and false, format units and omit blank values", () => {
  assert.deepEqual(technicalRows({ density: 0, flammable: false, omitted: "" }), [{ name: "density", value: "0" }, { name: "flammable", value: "false" }]);
  assert.deepEqual(technicalRows([{ name: "Purity", value: 98, unit: "%" }, { name: "Empty", value: null }]), [{ name: "Purity", value: "98 %" }]);
});
