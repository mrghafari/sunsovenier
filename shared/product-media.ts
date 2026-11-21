export const productDisplayModes = ["images", "3d_model", "images_and_3d"] as const;
export type ProductDisplayMode = typeof productDisplayModes[number];

export function normalizeProductDisplayMode(mode: unknown): ProductDisplayMode {
  return mode === "images_and_3d" || mode === "3d_model" ? mode : "images";
}

export function productPhotos(product: { imageUrl?: unknown; imageUrls?: unknown }): string[] {
  let { imageUrls } = product;
  if (typeof imageUrls === "string") {
    try { imageUrls = JSON.parse(imageUrls); } catch { imageUrls = []; }
  }
  return [...new Set([product.imageUrl, ...(Array.isArray(imageUrls) ? imageUrls : [])]
    .filter((url): url is string => typeof url === "string" && !!url.trim())
    .map(url => url.trim()))];
}

export function productMediaVisibility(product: { displayMode?: unknown; model3dKey?: string | null }, hasPhotos: boolean) {
  const mode = normalizeProductDisplayMode(product.displayMode);
  const modelKey = mode !== "images" ? product.model3dKey?.trim() || null : null;
  return {
    modelKey,
    showPhotos: hasPhotos && (mode !== "3d_model" || !modelKey),
    inlineModel: !!modelKey && (mode === "3d_model" || !hasPhotos),
  };
}

export function productModelUrl(key: string): string {
  const filename = key.split("/").filter(Boolean).pop() || key;
  return `/uploads/3d-models/${encodeURIComponent(filename)}`;
}
