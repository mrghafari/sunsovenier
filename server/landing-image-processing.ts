import sharp from "sharp";

const maxPixels = 40_000_000;
const imageTypes: Record<string, string> = {
  jpg: "image/jpeg", png: "image/png", webp: "image/webp",
  gif: "image/gif", avif: "image/avif",
};

export class LandingImageValidationError extends Error {}

/** Preserve raster originals; never store or serve uploaded SVG markup. */
export async function prepareLandingImage(input: Buffer) {
  let metadata;
  try {
    metadata = await sharp(input, { limitInputPixels: maxPixels }).metadata();
  } catch {
    throw new LandingImageValidationError("The file is not a valid image.");
  }
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > maxPixels) {
    throw new LandingImageValidationError("Choose an image with no more than 40 million pixels.");
  }
  let buffer = input;
  let extension = metadata.format === "jpeg" ? "jpg"
    : metadata.format === "heif" && metadata.compression === "av1" ? "avif" : metadata.format;
  if (extension === "svg") {
    try {
      // The buffer has no filesystem base URI. Rasterization does not run SVG
      // scripts; the public asset contains pixels only, not active XML.
      const converted = await sharp(input, { limitInputPixels: maxPixels })
        .timeout({ seconds: 10 }).png().toBuffer({ resolveWithObject: true });
      buffer = converted.data;
      metadata = { ...metadata, width: converted.info.width, height: converted.info.height };
      extension = "png";
    } catch {
      throw new LandingImageValidationError("The SVG could not be converted to an image.");
    }
  } else {
    if (!extension || !imageTypes[extension]) {
      throw new LandingImageValidationError("Use JPEG, PNG, WebP, GIF, AVIF or SVG. SVG is converted to PNG.");
    }
    try {
      await sharp(input, { limitInputPixels: maxPixels }).timeout({ seconds: 10 }).stats();
    } catch {
      throw new LandingImageValidationError("The image could not be decoded.");
    }
  }
  return {
    buffer, extension, mimeType: imageTypes[extension],
    width: metadata.width, height: metadata.height, bytes: buffer.length,
  };
}
