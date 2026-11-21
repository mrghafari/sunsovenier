import test from "node:test";
import assert from "node:assert/strict";
import { distinctCatalogProducts, productsInCategory, firstProductImage, publicCategoryProductDocuments, technicalRows } from "./category-product-slides";

test("homepage categories count products, not batches, using the Kardex representative", () => {
  const batches = Array.from({ length: 12 }, (_, i) => ({
    id: 12 - i, barcode: `barcode-${Math.floor(i / 3)}`, category: "Paint & Solvents",
    syncWithShop: i % 3 === 0,
  }));
  const products = distinctCatalogProducts(batches);
  assert.equal(products.length, 4);
  assert.ok(products.every(product => product.syncWithShop));
  assert.equal(productsInCategory(products, { name: "Paint & Solvents", slug: "paint-solvents" }).length, 4);
  assert.equal(productsInCategory(products, { name: "Other", slug: "other" }).length, 0);
  assert.equal(distinctCatalogProducts([{ id: 1 }, { id: 2 }, { id: 3, barcode: "" }]).length, 3);
  assert.equal(distinctCatalogProducts([{ id: 4, barcode: "same" }, { id: 2, barcode: "same" }])[0].id, 2);
});

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

test("slide downloads use only the current product's customer-visible documents", () => {
  const product = { pdfCatalogUrl: "/uploads/product-catalogs/test.pdf", catalogFileName: "Chemical catalog.pdf",
    showCatalogToCustomers: true, msdsUrl: "https://example.com/safety.pdf", showMsdsToCustomers: true };
  assert.deepEqual(publicCategoryProductDocuments(product), [
    { kind: "catalog", href: "/uploads/product-catalogs/test.pdf", filename: "Chemical catalog.pdf" },
    { kind: "msds", href: "https://example.com/safety.pdf", filename: "MSDS.pdf" },
  ]);
  assert.deepEqual(publicCategoryProductDocuments({ ...product, showCatalogToCustomers: false }).map(file => file.kind), ["msds"]);
  assert.deepEqual(publicCategoryProductDocuments({ ...product, contractOnly: true }), []);
  assert.deepEqual(publicCategoryProductDocuments({ ...product, pdfCatalogUrl: "javascript:alert(1)", msdsUrl: " " }), []);
  assert.deepEqual(publicCategoryProductDocuments({ ...product, pdfCatalogUrl: "/\\external.example", msdsUrl: "//external.example" }), []);
  assert.deepEqual(publicCategoryProductDocuments({}), []);
});
