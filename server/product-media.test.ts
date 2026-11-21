import assert from "node:assert/strict";
import test from "node:test";
import { productMediaVisibility, productModelUrl, productPhotos } from "../shared/product-media";
import { showcaseProducts } from "../shared/showcase-schema";
import { kardexMediaToShop, normalizeModelUploadDate } from "./product-media-sync";

test("combined display keeps photos primary and makes the model available separately", () => {
  const model3dKey = "3d-models/fixture.glb";
  assert.deepEqual(productMediaVisibility({ displayMode: "images_and_3d", model3dKey }, true), {
    modelKey: model3dKey, showPhotos: true, inlineModel: false,
  });
  assert.deepEqual(productMediaVisibility({ displayMode: "images_and_3d", model3dKey }, false), {
    modelKey: model3dKey, showPhotos: false, inlineModel: true,
  });
  assert.deepEqual(productMediaVisibility({ displayMode: "images_and_3d", model3dKey: "" }, true), {
    modelKey: null, showPhotos: true, inlineModel: false,
  });
});

test("existing display preferences remain valid and legacy photos render", () => {
  const model3dKey = "fixture.glb";
  assert.deepEqual(productMediaVisibility({ displayMode: "images", model3dKey }, true), {
    modelKey: null, showPhotos: true, inlineModel: false,
  });
  assert.deepEqual(productMediaVisibility({ displayMode: "3d_model", model3dKey }, true), {
    modelKey: "fixture.glb", showPhotos: false, inlineModel: true,
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
    displayMode: "images_and_3d", model3dKey: "3d-models/model.glb",
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
  assert.equal(removed.model3dKey, null);
  assert.equal(removed.model3dFileName, null);
  assert.equal(removed.model3dUploadDate, null);
});
