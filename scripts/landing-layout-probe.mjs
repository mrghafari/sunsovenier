import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer";
import { landingContentSchema } from "../shared/landing-content.ts";
import { defaultLandingLayout } from "../shared/landing-layout.ts";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const component = "/src/components/admin/content/LandingPageEditor.tsx";
const source = await (await fetch(base + component)).text();
const main = await (await fetch(base + "/src/main.tsx")).text();
const reactUrl = source.match(/from ["']([^"']*\/react\.js[^"']*)["']/)?.[1];
const queryUrl = source.match(/from ["']([^"']*react-query[^"']*)["']/)?.[1];
const domUrl = main.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1];
assert.ok(reactUrl && queryUrl && domUrl);
let state = landingContentSchema.parse((await (await fetch(base + "/api/landing-content")).json()).data);
const imageUrl = state.images.about || "/api/landing-assets/36aa094fd485a835267488ef.png";
// Use an existing, valid landing image, never upload or save to the real application.
const assets = await (await fetch(base + "/src/pages/landing/landing-assets.json")).text();
const assetMatch = assets.match(/\/api\/landing-assets\/[a-f0-9]{24,64}\.(?:jpg|png|webp|gif|avif)/);
const uploadUrl = assetMatch?.[0] ?? imageUrl;
let saves = 0, submissions = 0;
const browser = await puppeteer.launch({
  executablePath: execFileSync("bash", ["-c", "command -v chromium || command -v chromium-browser"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.setBypassServiceWorker(true);
  await page.setViewport({ width: 1440, height: 1100 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  const errors = [];
  if (process.env.LAYOUT_DEBUG) page.on("console", msg => console.log("BROWSER", msg.type(), msg.text().slice(0, 700)));
  page.on("pageerror", e => errors.push(e.message));
  page.on("dialog", d => d.accept());
  await page.setRequestInterception(true);
  page.on("request", request => {
    const { pathname } = new URL(request.url());
    if (pathname === "/__landing-layout-probe") return request.respond({ contentType: "text/html", body: `
      <!doctype html><html><head><meta charset="utf-8"></head><body><div id="probe"></div><script type="module">
      localStorage.setItem("language","fa"); localStorage.setItem("language-manually-selected","true");
      import RefreshRuntime from "/@react-refresh";
      RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
      await import("/src/index.css");
      const rm=await import(${JSON.stringify(reactUrl)});const React=rm.default||rm;
      const dm=await import(${JSON.stringify(domUrl)});const createRoot=dm.createRoot||dm.default.createRoot;
      const {QueryClient,QueryClientProvider}=await import(${JSON.stringify(queryUrl)});
      const {LanguageProvider}=await import("/src/contexts/LanguageContext.tsx");
      const Editor=(await import(${JSON.stringify(component)})).default;
      createRoot(document.getElementById("probe")).render(React.createElement(QueryClientProvider,{client:new QueryClient({defaultOptions:{queries:{retry:false}}})},React.createElement(LanguageProvider,null,React.createElement(Editor))));
      </script></body></html>` });
    if (["/api/content-management/landing", "/api/landing-content"].includes(pathname)) {
      if (request.method() === "PUT") {
        const incoming = landingContentSchema.parse(JSON.parse(request.postData()));
        assert.equal(incoming.revision, state.revision);
        state = { ...incoming, revision: incoming.revision + 1 }; saves++;
      }
      return request.respond({ contentType: "application/json", body: JSON.stringify({ success: true, data: state }) });
    }
    if (pathname === "/api/content-management/landing/inquiries") return request.respond({
      contentType: "application/json", body: '{"success":true,"data":{"items":[],"hasMore":false}}',
    });
    if (pathname === "/api/content-management/landing/images") return request.respond({
      contentType: "application/json", body: JSON.stringify({ success: true, data: { url: uploadUrl } }),
    });
    if (pathname === "/api/landing-estimate") { submissions++; return request.respond({ status: 201, contentType: "application/json", body: '{"success":true,"id":999}' }); }
    request.continue();
  });
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const rowSelector = id => `article[data-testid="landing-layout-row-${id}"]`;
  const blockSelector = id => `section[data-testid="landing-layout-block-${id}"]`;
  async function rows() { return page.$$eval('article[data-testid^="landing-layout-row-"]', list => list.map(el => el.dataset.testid.replace("landing-layout-row-", ""))); }
  async function blocks(row) { return page.$$eval(`${rowSelector(row)} section[data-testid^="landing-layout-block-"]`, list => list.map(el => el.dataset.testid.replace("landing-layout-block-", ""))); }
  async function replace(handle, value) { await handle.click(); await page.keyboard.down("Control"); await page.keyboard.press("A"); await page.keyboard.up("Control"); await handle.type(value); }
  async function selectWithin(selector, label, value) {
    const selects = await page.$$(`${selector} select`);
    for (const select of selects) if ((await select.evaluate(el => el.getAttribute("aria-label") || el.closest("label")?.textContent || "")).includes(label)) {
      await select.select(value); return;
    }
    throw new Error("Missing select " + label);
  }
  async function addBlock(row, type) {
    const before = await blocks(row);
    await page.select(`${rowSelector(row)} [data-testid="landing-add-block"]`, type);
    return (await blocks(row)).find(id => !before.includes(id));
  }
  async function localizedField(block, part, locale, text) {
    const target = await page.evaluateHandle((selector, part, locale) => {
      const fieldset = [...document.querySelectorAll(`${selector} fieldset`)].find(el => el.querySelector("legend")?.textContent.includes(part));
      const label = [...fieldset.querySelectorAll("label")].find(el => el.querySelector("span")?.textContent === locale);
      return label.querySelector("input,textarea");
    }, blockSelector(block), part, locale);
    await replace(target.asElement(), text);
  }
  async function pointerDrag(fromSelector, targetSelector, bottom = false) {
    await page.$eval(fromSelector, el => el.scrollIntoView({ block: "center", behavior: "instant" }));
    const from = await (await page.$(fromSelector)).boundingBox();
    const target = await (await page.$(targetSelector)).boundingBox();
    assert.ok(from && target);
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 12, { steps: 4 });
    await pause(150);
    if (process.env.LAYOUT_DEBUG) console.log("DRAG", fromSelector, {from,target}, await page.$$eval("[aria-live]", els=>els.map(el=>el.textContent)));
    await page.mouse.move(target.x + Math.min(80, target.width / 2), bottom ? target.y + target.height - 8 : target.y + 5, { steps: 25 });
    await pause(300); await page.mouse.up();
    await page.waitForFunction(selector => {
      const item = document.querySelector(selector)?.closest("[data-rfd-draggable-id]");
      return item && item.style.position !== "fixed";
    }, { timeout: 10000 }, fromSelector);
    if (process.env.LAYOUT_DEBUG) console.log("DROP", await page.$$eval("[aria-live]", els=>els.map(el=>el.textContent)), await rows());
  }
  await page.goto(base + "/__landing-layout-probe", { waitUntil: "networkidle0", timeout: 90000 });
  await page.waitForSelector('[data-testid="landing-block-builder"]', { timeout: 60000 });
  assert.equal((await rows()).length, 7);
  // Real keyboard drag of a row, then real pointer drag back to its initial position.
  const rowHandle = '[data-testid="landing-layout-row-handle-row-trusted"]';
  await page.focus(rowHandle); await page.keyboard.press("Space"); await pause(150); await page.keyboard.press("ArrowUp"); await pause(150); await page.keyboard.press("Space"); await pause(400);
  assert.equal((await rows())[0], "row-trusted", "Keyboard row drag");
  await pointerDrag('[data-testid="landing-layout-row-handle-row-hero"]', rowSelector("row-trusted"));
  assert.equal((await rows())[0], "row-hero", "Pointer row drag");
  await pointerDrag('[data-testid="landing-layout-handle-block-trusted"]', '[data-rfd-droppable-id="blocks:row-hero"]');
  assert.ok((await blocks("row-hero")).includes("block-trusted"), "Cross-row pointer block drag");
  await selectWithin(blockSelector("block-trusted"), "انتقال به ردیف دیگر", "row-trusted");
  const before = await rows();
  await page.click('[data-testid="landing-add-row"]');
  const customRow = (await rows()).find(id => !before.includes(id));
  await selectWithin(rowSelector(customRow), "ستون‌های", "2");
  await selectWithin(rowSelector(customRow), "فاصله ردیف", "large");
  const text = await addBlock(customRow, "text");
  await localizedField(text, "عنوان", "فارسی", "چیدمان بلوکی آزمایشی");
  await localizedField(text, "متن", "فارسی", "متن چندخطی\nبدون تغییر کد");
  await selectWithin(blockSelector(text), "زمینه", "navy");
  await selectWithin(blockSelector(text), "چیدمان متن", "center");
  const button = await addBlock(customRow, "button");
  await localizedField(button, "متن دکمه", "فارسی", "خرید آزمایشی");
  await page.click(`${blockSelector(text)} button[aria-label="انتقال به پایین"]`);
  assert.equal((await blocks(customRow))[0], button, "Move-down moves one place");
  await page.click(`${blockSelector(text)} button[aria-label="انتقال به بالا"]`);
  const photo = await addBlock(customRow, "image");
  await localizedField(photo, "متن جایگزین", "فارسی", "تصویر بلوکی آزمایشی");
  const fileInput = await page.$(`${blockSelector(photo)} input[type=file]`);
  await fileInput.uploadFile("generated-artifacts/landing-verification/desktop.png");
  await page.waitForSelector(`${blockSelector(photo)} img`, { timeout: 15000 });
  await addBlock(customRow, "quote");
  const hidden = await addBlock(customRow, "spacer");
  await page.click(`${blockSelector(hidden)} input[type=checkbox]`);
  // Exact internal element permutations are saved, not CSS-only visual ordering.
  await page.$eval('[data-testid="landing-block-builder"] > details', el => el.open = true);
  const about = '[data-rfd-droppable-id="elements:about"]';
  const aboutItems = await page.$$(`${about} [data-rfd-draggable-id]`);
  await (await aboutItems[2].$('button[aria-label="انتقال جزء به بالا"]')).click();
  const aboutItems2 = await page.$$(`${about} [data-rfd-draggable-id]`);
  await (await aboutItems2[1].$('button[aria-label="انتقال جزء به بالا"]')).click();
  const form = '[data-rfd-droppable-id="elements:form"]';
  await page.click(`${form} [data-rfd-draggable-id="element-form-email"] button[aria-label="انتقال جزء به بالا"]`);
  await page.click('[data-testid="landing-save"]');
  await page.waitForNetworkIdle({ idleTime: 300 });
  assert.equal(saves, 1);
  assert.deepEqual(state.page.layout.elements.about, ["stats", "image", "copy"]);
  assert.equal(state.page.layout.elements.form[1], "email");
  assert.equal(state.images[`layout-${photo}`], uploadUrl);
  await page.reload({ waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForSelector('[data-testid="landing-save"]');
  assert.equal(await page.$eval('[data-testid="landing-save"]', el => el.disabled), true);
  await mkdir("generated-artifacts/landing-layout-verification", { recursive: true });
  await page.$eval('[data-testid="landing-block-builder"]', el => el.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.screenshot({ path: "generated-artifacts/landing-layout-verification/editor.png" });
  await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(`[data-layout-block="${text}"]`, { timeout: 90000 });
  assert.equal(await page.$eval(`[data-layout-block="${text}"] h2`, el => el.textContent), "چیدمان بلوکی آزمایشی");
  assert.equal(await page.$eval(`[data-layout-block="${text}"]`, el => getComputedStyle(el).textAlign), "center");
  assert.equal(await page.$eval(`[data-layout-block="${button}"] a`, el => el.getAttribute("href")), "/contact");
  assert.equal(await page.$$eval("#quote", nodes => nodes.length), 1);
  assert.equal(await page.$(".mc-hero #quote"), null);
  assert.equal(await page.$(`[data-layout-block="${hidden}"]`), null);
  assert.equal(await page.$eval(`[data-layout-block="${photo}"] img`, el => el.alt), "تصویر بلوکی آزمایشی");
  assert.deepEqual(await page.$$eval(".mc-about-grid > [data-home-part]", nodes => nodes.map(el => el.dataset.homePart)), ["stats", "image", "copy"]);
  const fieldOrder = await page.$$eval("#quote form [name]", nodes => nodes.map(el => el.name));
  assert.ok(fieldOrder.indexOf("email") < fieldOrder.indexOf("fullName"));
  await page.select("#mc-product", "ibc1000");
  for (const [name, value] of Object.entries({ fullName: "Synthetic Customer", email: "layout@example.invalid", phone: "+12345", address: "Synthetic address" })) {
    await page.$eval(`#quote [name="${name}"]`, (el, text) => { el.value = text; }, value);
  }
  await page.$eval("#quote form", el => el.requestSubmit());
  await page.waitForSelector("#quote .mc-form-feedback.success");
  assert.equal(submissions, 1, "The relocated form remains functional");
  await page.$eval(`[data-layout-row="${customRow}"]`, el => el.scrollIntoView({ block: "start", behavior: "instant" }));
  assert.equal(await page.$eval(`[data-layout-row="${customRow}"]`, el => getComputedStyle(el).gridTemplateColumns.split(" ").length), 2);
  await page.screenshot({ path: "generated-artifacts/landing-layout-verification/public-desktop.png" });
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(await page.$eval(`[data-layout-row="${customRow}"]`, el => getComputedStyle(el).gridTemplateColumns.split(" ").length), 1);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Public mobile fits");
  await page.$eval(`[data-layout-block="${text}"]`, el => el.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.screenshot({ path: "generated-artifacts/landing-layout-verification/public-mobile.png" });
  // Removal and reset must clean image references, not leave an unsavable layout.
  await page.goto(base + "/__landing-layout-probe", { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForSelector('[data-testid="landing-block-builder"]');
  await page.click(`${blockSelector(photo)} button[aria-label="حذف جایگاه تصویر"]`);
  await page.click('[data-testid="landing-save"]');
  await page.waitForNetworkIdle({ idleTime: 300 });
  assert.equal(saves, 2);
  assert.equal(state.images[`layout-${photo}`], undefined);
  const originalTexts = structuredClone(state.page.texts);
  const resetButtons = await page.$$('[data-testid="landing-block-builder"] > div:first-child button');
  await resetButtons[0].click();
  await page.click('[data-testid="landing-save"]');
  await page.waitForNetworkIdle({ idleTime: 300 });
  assert.equal(saves, 3);
  assert.deepEqual(state.page.layout, defaultLandingLayout());
  assert.deepEqual(state.page.texts, originalTexts);
  assert.deepEqual(errors, []);
  console.log("Block layout browser checks passed: keyboard and pointer row drag, cross-row pointer block drag, add/configure/delete/reset, image cleanup, move controls, internal/form order, localized custom text, fixture image upload, hidden blocks, schema-validated save/reload, standalone form submission, responsive 2-to-1 columns. All saves/uploads/submissions are intercepted fixtures; real signed-in UI and real uploads were not exercised. No live content changed.");
} finally { await browser.close(); }
