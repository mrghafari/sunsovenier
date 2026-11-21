import assert from "node:assert/strict";
import test from "node:test";
import { resolveProductMedia, productModelUrl, productPhotos } from "../shared/product-media";
import { showcaseProducts } from "../shared/showcase-schema";
import { kardexMediaToShop, normalizeModelUploadDate } from "./product-media-sync";

test("legacy exclusive preferences cannot hide a saved photo or model", () => {
  const model3dKey = "3d-models/fixture.glb";
  for (const displayMode of ["images", "3d_model", "images_and_3d", null]) {
    const product = { displayMode, model3dKey, imageUrls: ["/primary.jpg"] };
    assert.deepEqual(resolveProductMedia(product), {
      photos: ["/primary.jpg"], modelKey: model3dKey, displayMode: "images_and_3d", inlineModel: false,
    });
  }
});

test("photo-only and model-only products still render separately", () => {
  const model3dKey = "fixture.glb";
  assert.deepEqual(resolveProductMedia({ imageUrl: "/primary.jpg", model3dKey: " " }), {
    photos: ["/primary.jpg"], modelKey: null, displayMode: "images", inlineModel: false,
  });
  assert.deepEqual(resolveProductMedia({ model3dKey }), {
    photos: [], modelKey: model3dKey, displayMode: "3d_model", inlineModel: true,
  });
  assert.deepEqual(productPhotos({ imageUrl: "/primary.jpg", imageUrls: '["/second.jpg","/primary.jpg",""]' }), [
    "/primary.jpg", "/second.jpg",
  ]);
  assert.equal(productModelUrl("3d-models/a b.glb"), "/uploads/3d-models/a%20b.glb");
});

test("3D upload dates round-trip as database timestamps, not raw JSON strings", () => {
  const iso = "2026-11-21T10:00:00.000Z";
  const date = normalizeModelUploadDate(iso);
  assert.equal(showcaseProducts.model3dUploadDate.mapToDriverValue(date!), iso);
  assert.equal(normalizeModelUploadDate(undefined), undefined);
  assert.equal(normalizeModelUploadDate(null), null);
  assert.throws(() => normalizeModelUploadDate("not-a-date"));
});

test("Kardex sync copies the gallery and model together and clears only the removed model", () => {
  const product = {
    imageUrl: "/primary.jpg", imageUrls: ["/primary.jpg", "/second.jpg"],
    displayMode: "images", model3dKey: "3d-models/model.glb",
    model3dFileName: "model.glb", model3dUploadDate: new Date("2026-11-21"),
  };
  const media = kardexMediaToShop(product);
  assert.deepEqual(media, {
    imageUrls: product.imageUrls, thumbnailUrl: product.imageUrl,
    displayMode: "images_and_3d", model3dKey: product.model3dKey,
    model3dFileName: product.model3dFileName, model3dUploadDate: product.model3dUploadDate,
  });
  const removed = kardexMediaToShop({ ...product, model3dKey: "" });
  assert.deepEqual(removed.imageUrls, media.imageUrls);
  assert.equal(removed.displayMode, "images");
  assert.equal(removed.model3dKey, null);
  assert.equal(removed.model3dFileName, null);
  assert.equal(removed.model3dUploadDate, null);
});
