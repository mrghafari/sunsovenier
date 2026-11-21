import { resolveProductMedia } from "../shared/product-media";
import type { ShowcaseProduct } from "../shared/showcase-schema";

export function normalizeModelUploadDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  if (!parsed || !Number.isFinite(parsed.getTime())) throw new Error("Invalid 3D model upload date");
  return parsed;
}

export function kardexMediaToShop(product: Pick<ShowcaseProduct,
  "imageUrl" | "imageUrls" | "model3dKey" | "model3dFileName" | "model3dUploadDate">) {
  const { photos: imageUrls, modelKey: model3dKey, displayMode } = resolveProductMedia(product);
  return {
    imageUrls,
    thumbnailUrl: imageUrls[0] ?? null,
    displayMode,
    model3dKey,
    model3dFileName: model3dKey ? product.model3dFileName || null : null,
    model3dUploadDate: model3dKey ? product.model3dUploadDate ?? null : null,
  };
}
