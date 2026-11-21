export const productDisplayModes = ["images", "3d_model", "images_and_3d"] as const;
export type ProductDisplayMode = typeof productDisplayModes[number];

export function productPhotos(product: { imageUrl?: unknown; imageUrls?: unknown }): string[] {
  let { imageUrls } = product;
  if (typeof imageUrls === "string") {
    try { imageUrls = JSON.parse(imageUrls); } catch { imageUrls = []; }
  }
  return [...new Set([product.imageUrl, ...(Array.isArray(imageUrls) ? imageUrls : [])]
    .filter((url): url is string => typeof url === "string" && !!url.trim())
    .map(url => url.trim()))];
}

export function resolveProductMedia(product: {
  imageUrl?: unknown;
  imageUrls?: unknown;
  model3dKey?: string | null;
}) {
  const photos = productPhotos(product);
  const modelKey = product.model3dKey?.trim() || null;
  // Older products can have both files saved with a stale exclusive mode.
  const displayMode: ProductDisplayMode = modelKey
    ? (photos.length ? "images_and_3d" : "3d_model")
    : "images";
  return { photos, modelKey, displayMode, inlineModel: displayMode === "3d_model" };
}

export function productModelUrl(key: string): string {
  const filename = key.split("/").filter(Boolean).pop() || key;
  return `/uploads/3d-models/${encodeURIComponent(filename)}`;
}
