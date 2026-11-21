import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const [source, main, app] = await Promise.all(
  ["/src/pages/products.tsx", "/src/main.tsx", "/src/App.tsx"].map(path => fetch(base + path).then(r => r.text())),
);
const react = source.match(/from ["']([^"']*\/react\.js[^"']*)["']/)?.[1];
const dom = main.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1];
const query = app.match(/from ["']([^"']*tanstack_react-query[^"']*)["']/)?.[1];
assert.ok(react && dom && query);

const browser = await puppeteer.launch({
  executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const temp = await mkdtemp(join(tmpdir(), "product-media-probe-"));
const photoFile = join(temp, "fixture.png");
const modelFile = join(temp, "fixture.glb");
const picture = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=", "base64");
const photoUrl = "/__media-fixture/photo.png";
const modelKey = "3d-models/fixture.glb";
const modelPath = "/uploads/3d-models/fixture.glb";
function makeModel() {
  const vertices = Buffer.alloc(36);
  [0, 0, 0, 1, 0, 0, 0, 1, 0].forEach((value, index) => vertices.writeFloatLE(value, index * 4));
  const asset = JSON.stringify({
    asset: {version: "2.0"}, scene: 0, scenes: [{nodes: [0]}], nodes: [{mesh: 0}],
    meshes: [{primitives: [{attributes: {POSITION: 0}}]}],
    accessors: [{bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0]}],
    bufferViews: [{buffer: 0, byteLength: vertices.length, target: 34962}],
    buffers: [{byteLength: vertices.length}],
  });
  const json = Buffer.from(asset.padEnd(Math.ceil(asset.length / 4) * 4, " "));
  const header = Buffer.alloc(20);
  header.write("glTF"); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + vertices.length, 8);
  header.writeUInt32LE(json.length, 12); header.write("JSON", 16);
  const bin = Buffer.alloc(8);
  bin.writeUInt32LE(vertices.length); bin.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, json, bin, vertices]);
}
const model = makeModel();
await writeFile(photoFile, picture);
await writeFile(modelFile, model);
let record = {
  id: 987654, name: "Mixed media fixture", category: "Paint & Solvents", description: "Fixture description",
  sku: "FIXTURE-MEDIA", barcode: "1234567890128", stockQuantity: 10, minStockLevel: 1,
  maxStockLevel: 100, unitPrice: "5", price: "5", currency: "IQD", netWeight: "10", grossWeight: "11",
  weightUnit: "kg", isActive: true, inStock: true, syncWithShop: true, imageUrl: "", imageUrls: [],
  features: [], applications: [], tags: [], displayMode: "images", createdAt: "2026-01-01T00:00:00.000Z",
};
const writes = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("language", "en");
    localStorage.setItem("language-manually-selected", "true");
  });
  const errors = [];
  page.on("pageerror", err => errors.push(err.message));
  await page.setRequestInterception(true);
  page.on("request", request => {
    const url = new URL(request.url());
    const path = url.pathname;
    const json = body => request.respond({ contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/__media-fixture/kardex") return request.respond({ contentType: "text/html", body: `<!doctype html><html><body><div id="root"></div><script type="module">
      import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
      await import("/src/index.css");
      const rm=await import(${JSON.stringify(react)});const React=rm.default||rm;
      const dm=await import(${JSON.stringify(dom)});const createRoot=dm.createRoot||dm.default.createRoot;
      const {QueryClientProvider}=await import(${JSON.stringify(query)});
      const {queryClient}=await import("/src/lib/queryClient.ts");
      const {LanguageProvider}=await import("/src/contexts/LanguageContext.tsx");
      const {default:Products}=await import("/src/pages/products.tsx");
      createRoot(document.getElementById("root")).render(React.createElement(QueryClientProvider,{client:queryClient},
        React.createElement(LanguageProvider,null,React.createElement(Products))));
    </script></body></html>` });
    if (path === photoUrl) return request.respond({ contentType: "image/png", body: picture });
    if (path === modelPath) return request.respond({ contentType: "model/gltf-binary", body: model });
    if (url.hostname === "www.googletagmanager.com" || path === "/sw.js") return request.abort();
    if (path === "/api/upload/model3d") return json({ key: modelKey, originalName: "fixture.glb" });
    if (path === "/api/upload") return json({ url: photoUrl });
    if (!["GET", "HEAD"].includes(request.method())) {
      if (path === `/api/products/${record.id}` || path === "/api/products") {
        const payload = JSON.parse(request.postData());
        writes.push({ method: request.method(), payload });
        record = { ...record, ...payload };
        return json({ success: true, product: record });
      }
      return json({ success: true }); // No writes, including sync calls, reach the server.
    }
    if (!path.startsWith("/api/")) return request.continue();
    if (path === "/api/admin/me") return json({ success: true, user: { id: 1, username: "Fixture", role: "admin" } });
    if (path === "/api/products" || path === "/api/shop/products") return json([record]);
    if (path === `/api/products/${record.id}` || path === `/api/shop/products/${record.id}`) return json(record);
    if (path === "/api/admin/categories") return json([{ id: 1, name: "Paint & Solvents", slug: "paint-solvents" }]);
    if (path === "/api/admin/vendors/approved") return json({ vendors: [] });
    if (path === "/api/shop/categories" || path === "/api/shop/discounts") return json([]);
    if (path.includes("/batches/")) return json({ success: true, batches: [] });
    return json({ success: true, data: [] });
  });
  const section = id => `[data-testid="kardex-section-${id}"]`;
  const open = async id => {
    if (!await page.$eval(section(id), node => node.open)) await page.click(`${section(id)} > summary`);
  };
  const openMedia = async () => {
    await open("media");
    await open("images");
    await open("model3d");
  };
  const upload = async (selector, file) => {
    const input = await page.waitForSelector(selector);
    await input.uploadFile(file);
  };
  const edit = async () => {
    const selector = "button svg.lucide-square-pen,button svg.lucide-pen,button svg.lucide-edit";
    await page.waitForSelector(selector);
    await page.$eval(selector, node => node.closest("button").click());
    await page.waitForSelector("form");
  };
  const go = path => page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 90000 });
  await go("/__media-fixture/kardex");
  await edit();
  await openMedia();
  await upload(`${section("images")} input[type=file]`, photoFile);
  await page.waitForSelector(`${section("images")} img[src="${photoUrl}"]`);
  await upload("#model3d-upload-btn", modelFile);
  await page.waitForFunction(key => document.querySelector('input[name="model3dKey"]')?.value === key, {}, modelKey);
  const save = () => page.$eval('form button[type="submit"]', node => node.click());
  await save();
  await page.waitForSelector("form", { hidden: true });
  assert.equal(writes.at(-1)?.method, "PUT");
  assert.equal(record.displayMode, "images_and_3d");
  assert.equal(record.model3dKey, modelKey);
  assert.deepEqual(record.imageUrls, [photoUrl]);
  await edit();
  await open("media");
  await open("images");
  await page.waitForSelector(`${section("images")} img[src="${photoUrl}"]`);
  await open("model3d");
  assert.equal(await page.$eval('input[name="model3dKey"]', node => node.value), modelKey);
  console.log("Kardex: upload photo and model, save and reopen with both retained.");

  // Legacy store records can contain both assets but still say "images".
  record.displayMode = "images";
  await go("/shop");
  const button = '[data-testid="shop-card-view-3d"]';
  const specs = '[data-testid="shop-card-specifications"]';
  await page.waitForSelector(button, {visible: true});
  await page.waitForSelector(`img[src="${photoUrl}"]`, {visible: true});
  assert.equal(await page.$("model-viewer"), null);
  const checkDialog = async selector => {
    await page.click(selector);
    const viewer = '[role="dialog"] model-viewer';
    await page.waitForSelector(viewer, { visible: true });
    assert.equal(await page.$eval(viewer, node => node.getAttribute("src")), modelPath);
    await page.waitForFunction(selector => document.querySelector(selector)?.loaded === true, { timeout: 30000 }, viewer);
    await page.keyboard.press("Escape");
    await page.waitForSelector(viewer, { hidden: true });
  };
  const checkSeparateActions = async () => {
    await page.waitForSelector(specs, { visible: true });
    const modelBounds = await (await page.$(button)).boundingBox();
    const specsBounds = await (await page.$(specs)).boundingBox();
    assert.ok(modelBounds.y + modelBounds.height <= specsBounds.y, "3D and specifications controls must not overlap");
    await page.click(specs);
    await page.waitForSelector('[role="dialog"]', { visible: true });
    assert.equal(await page.$('[role="dialog"] model-viewer'), null, "The specifications button must not open the model");
    await page.keyboard.press("Escape");
    await page.waitForSelector('[role="dialog"]', { hidden: true });
    await checkDialog(button);
  };
  await checkSeparateActions();
  const listSelector = "button svg.lucide-list";
  await page.$eval(listSelector, icon => icon.closest("button").click());
  await checkSeparateActions();
  await page.setViewport({ width: 430, height: 850 });
  await go("/shop");
  await checkSeparateActions();
  await go(`/shop/product/${record.id}`);
  await page.waitForSelector(`img[src="${photoUrl}"]`, {visible: true});
  await checkDialog('[data-testid="shop-detail-view-3d"]');

  await page.setViewport({ width: 1280, height: 900 });
  await go("/__media-fixture/kardex");
  await edit();
  await open("media");
  await open("model3d");
  await page.$eval(`${section("model3d")} button svg.lucide-x`, icon => icon.closest("button").click());
  await save();
  await page.waitForSelector("form", { hidden: true });
  assert.equal(record.model3dKey, "");
  assert.equal(record.model3dUploadDate, null);
  assert.deepEqual(record.imageUrls, [photoUrl]);

  const add = "button > svg.lucide-plus";
  await page.waitForSelector(add);
  await page.$eval(add, icon => icon.closest("button").click());
  await page.waitForSelector("form");
  const fill = async (name, value) => {
    const selector = `form input[name="${name}"]`;
    await page.click(selector, { clickCount: 3 });
    await page.keyboard.press("Backspace");
    await page.type(selector, value);
  };
  await open("basic");
  await fill("name", "New media fixture");
  await page.click('[data-kardex-field="category"] [role="combobox"]');
  await page.waitForSelector('[role="option"]');
  await page.click('[role="option"]');
  await open("pricing");
  await fill("sku", "FIX-NEW-MEDIA");
  await fill("unitPrice", "5");
  await fill("barcode", "1234567890135");
  await open("inventory");
  await fill("netWeight", "10");
  await fill("grossWeight", "11");
  await openMedia();
  await upload(`${section("images")} input[type=file]`, photoFile);
  await page.waitForSelector(`${section("images")} img[src="${photoUrl}"]`);
  await upload("#model3d-upload-btn", modelFile);
  await page.waitForFunction(key => document.querySelector('input[name="model3dKey"]')?.value === key, {}, modelKey);
  await save();
  await page.waitForSelector("form", { hidden: true });
  assert.equal(writes.at(-1)?.method, "POST");
  assert.equal(record.displayMode, "images_and_3d");
  assert.equal(record.model3dKey, modelKey);
  assert.deepEqual(record.imageUrls, [photoUrl]);
  const thumb = '[data-testid="kardex-product-thumbnail"]';
  await page.waitForSelector(thumb, { visible: true });
  assert.equal(await page.$eval(thumb, node => node.getAttribute("src")), photoUrl);
  // A legacy product may only have a photo in its gallery, not in imageUrl.
  record.imageUrl = "";
  await go("/__media-fixture/kardex");
  await page.waitForSelector(thumb, { visible: true });
  assert.equal(await page.$eval(thumb, node => node.getAttribute("src")), photoUrl);
  assert.equal(await page.$("model-viewer"), null);
  assert.deepEqual(errors, []);
  console.log("Shop: photos and real GLB rendered in grid, list and mobile detail.");
  console.log("Kardex: removing the model keeps photos; new products submit both media types.");
  console.log("Kardex cards: gallery photos are thumbnails even when a 3D model exists and the legacy main photo is blank.");
} finally {
  await browser.close();
  await rm(temp, { recursive: true, force: true });
}
