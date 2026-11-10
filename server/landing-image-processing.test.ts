import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { prepareLandingImage, LandingImageValidationError } from "./landing-image-processing";

const svg = (content: string, dimensions = 'width="80" height="40"') =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" ${dimensions}>${content}</svg>`);

test("slide SVG converts to PNG at original dimensions and preserves transparency", async () => {
  const result = await prepareLandingImage(svg('<rect width="40" height="40" fill="red"/>'));
  assert.equal(result.extension, "png");
  assert.equal(result.mimeType, "image/png");
  assert.equal(result.width, 80);
  assert.equal(result.height, 40);
  assert.equal(result.bytes, result.buffer.length);
  const metadata = await sharp(result.buffer).metadata();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.hasAlpha, true);
  const { data, info } = await sharp(result.buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(data[(20 * info.width + 20) * 4], 255);
  assert.equal(data[(20 * info.width + 60) * 4 + 3], 0);
});

test("viewBox-only SVG is accepted and active markup is never in the public file", async () => {
  const result = await prepareLandingImage(svg('<script>throw new Error("not executed")</script><rect width="20" height="10" fill="blue"/>', 'viewBox="0 0 20 10"'));
  assert.equal((await sharp(result.buffer).metadata()).format, "png");
  assert.equal(result.width, 20);
  assert.equal(result.height, 10);
});

test("existing raster uploads remain byte-for-byte unchanged", async () => {
  for (const format of ["png", "jpeg", "webp"] as const) {
    const input = await sharp({ create: { width: 16, height: 8, channels: 4, background: "#123456" } })[format]().toBuffer();
    const result = await prepareLandingImage(input);
    assert.deepEqual(result.buffer, input);
    assert.equal(result.extension, format === "jpeg" ? "jpg" : format);
  }
});

test("invalid images, malformed SVG and oversized SVG are rejected", async () => {
  for (const input of [
    Buffer.from("not an image"),
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><broken'),
    svg("<rect/>", 'width="100000" height="100000"'),
  ]) {
    await assert.rejects(prepareLandingImage(input), LandingImageValidationError);
  }
});
