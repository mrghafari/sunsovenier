import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const [source, main, app] = await Promise.all([
  fetch(base + "/src/components/products/PackagingSpecificationsEditor.tsx").then(r => r.text()),
  fetch(base + "/src/main.tsx").then(r => r.text()),
  fetch(base + "/src/App.tsx").then(r => r.text()),
]);
const react = source.match(/from ["']([^"']*\/react\.js[^"']*)["']/)?.[1];
const dom = main.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1];
const query = app.match(/from ["']([^"']*tanstack_react-query[^"']*)["']/)?.[1];
assert.ok(react && dom && query);
const fixture = {
  id: 987654, name: "Kardex fixture", category: "Paint & Solvents", description: "Fixture chemical",
  sku: "FIXTURE-KARDEX", barcode: "1234567890128", stockQuantity: 10, minStockLevel: 1,
  maxStockLevel: 100, unitPrice: "5", currency: "IQD", netWeight: "10", grossWeight: "11",
  weightUnit: "kg", isActive: true, syncWithShop: true, imageUrls: [], features: [], applications: [],
  tags: [], isNonChemical: false, isVariant: false, isFlammable: false, contractOnly: false,
  packagingSpecifications: { version: 1, containerType: "drum", nominalCapacityL: 200 },
  createdAt: "2026-01-01T00:00:00.000Z",
};
const browser = await puppeteer.launch({
  executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  args: ["--no-sandbox"], headless: true,
});
await mkdir("generated-artifacts/kardex-sections", { recursive: true });
try {
  for (const [language, width] of [["en", 1440], ["fa", 430]]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const errors = [], writes = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewport({ width, height: 932 });
    await page.setBypassServiceWorker(true);
    await page.evaluateOnNewDocument(lang => {
      localStorage.setItem("language", lang);
      localStorage.setItem("language-manually-selected", "true");
    }, language);
    await page.setRequestInterception(true);
    page.on("request", request => {
      const path = new URL(request.url()).pathname;
      const json = body => request.respond({ contentType: "application/json", body: JSON.stringify(body) });
      if (path === "/__kardex-form-probe") {
        return request.respond({ contentType: "text/html", body: `<!doctype html><html><body><div id="root"></div><script type="module">
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
      }
      if (!path.startsWith("/api/")) return request.continue();
      // All authentication and inventory are isolated browser fixtures.
      // Never forward a mutation to the real application.
      if (!["GET", "HEAD"].includes(request.method())) {
        writes.push({ path, method: request.method() });
        return request.respond({ status: 400, contentType: "application/json", body: '{"message":"Probe blocks real mutations"}' });
      }
      if (path === "/api/admin/me") return json({ success: true, user: { id: 1, username: "Fixture admin", role: "admin" } });
      if (path === "/api/products") return json([fixture]);
      if (path === "/api/admin/categories") return json([{ id: 1, name: "Paint & Solvents" }]);
      if (path === "/api/admin/vendors/approved") return json({ vendors: [] });
      if (path.includes("/batches/")) return json({ success: true, batches: [] });
      return json({ success: true, data: [] });
    });
    await page.goto(base + "/__kardex-form-probe", { waitUntil: "networkidle0", timeout: 90000 });
    await page.waitForFunction(() => !!document.querySelector("button svg.lucide-square-pen,button svg.lucide-pen,button svg.lucide-edit"), { timeout: 60000 });
    await page.evaluate(() => document.querySelector("button svg.lucide-square-pen,button svg.lucide-pen,button svg.lucide-edit").closest("button").click());
    await page.waitForSelector("form [data-testid^='kardex-section-']");
    const sectionSelector = "form [data-testid^='kardex-section-']";
    const initial = await page.$$eval(sectionSelector, nodes => nodes.map(node => ({
      id: node.dataset.testid, closed: !node.open, summary: !!node.querySelector(":scope > summary"),
    })));
    assert.ok(initial.length >= 9, JSON.stringify(initial));
    assert.ok(initial.every(section => section.closed && section.summary), JSON.stringify(initial));
    const open = async id => {
      const selector = `[data-testid="kardex-section-${id}"]`;
      const ancestors = await page.$eval(selector, node => {
        const ids = [];
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
          if (parent.tagName === "DETAILS" && parent.dataset.testid) ids.unshift(parent.dataset.testid);
        }
        return ids;
      });
      for (const testId of ancestors) {
        const ancestor = `[data-testid="${testId}"]`;
        if (!await page.$eval(ancestor, node => node.open)) await page.click(`${ancestor} > summary`);
      }
      if (!await page.$eval(selector, node => node.open)) await page.click(`${selector} > summary`);
    };
    await open("basic");
    assert.equal(await page.$eval('[data-testid="kardex-section-pricing"]', node => node.open), false);
    const textBlock = '[data-testid="kardex-section-basic"] [data-testid="kardex-product-text"]';
    assert.equal(await page.$$eval(`${textBlock} [role="tab"]`, nodes => nodes.length), 4);
    const persianTab = `${textBlock} [role="tab"][lang="fa"]`;
    await page.click(persianTab);
    assert.equal(await page.$eval('[name="productLocalizations.fa.technicalName"]', node => node.dir), "rtl");
    assert.equal(await page.$( '[data-testid="kardex-section-localizations"]'), null);
    await page.$eval(textBlock, node => node.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.screenshot({ path: `generated-artifacts/kardex-sections/${language}-localized-fields.jpg` });
    const nameSelector = 'form input[name="name"]';
    await page.click(nameSelector);
    await page.keyboard.down("Control"); await page.keyboard.press("A"); await page.keyboard.up("Control");
    await page.type(nameSelector, "Retained edit");
    await page.click('[data-testid="kardex-section-basic"] > summary');
    await open("basic");
    assert.equal(await page.$eval(nameSelector, node => node.value), "Retained edit");
    const packing = '[data-testid="kardex-section-packaging"]';
    assert.equal(await page.$eval(packing, node => !!node.closest('[data-testid="kardex-section-inventory"]')), false, "Packing must not be nested in inventory");
    assert.equal(await page.$eval(packing, node => node.parentElement === document.querySelector('[data-testid="kardex-section-inventory"]').parentElement), true, "Packing must be a peer of the other form sections");
    assert.equal(await page.$$eval('[data-testid="packaging-editor-panel"] > summary', nodes => nodes.length), 0, "Packing must not repeat its outer dropdown");
    await open("packaging");
    assert.equal(await page.$eval('[data-testid="kardex-section-inventory"]', node => node.open), false);
    await page.click('[data-testid="packaging-section-capacity"] > summary');
    await page.click("#packaging-nominalCapacityL");
    await page.keyboard.down("Control"); await page.keyboard.press("A"); await page.keyboard.up("Control");
    await page.type("#packaging-nominalCapacityL", "250");
    await page.click(`${packing} > summary`);
    await open("packaging");
    assert.equal(await page.$eval("#packaging-nominalCapacityL", node => node.value), "250", "Collapsing packing must retain edits");
    await page.click('[data-testid="packaging-section-capacity"] > summary');
    for (const dark of [false, true]) {
      await page.evaluate(dark => document.documentElement.classList.toggle("dark", dark), dark);
      await new Promise(resolve => setTimeout(resolve, 250));
      const colors = await page.evaluate(() => {
        const inventory = document.querySelector('[data-testid="kardex-section-inventory"]');
        const packing = document.querySelector('[data-testid="kardex-section-packaging"]');
        return { inventory: getComputedStyle(inventory).backgroundColor, packing: getComputedStyle(packing).backgroundColor };
      });
      assert.notEqual(colors.inventory, colors.packing, "Packing must be different, not another generic block");
      await page.$eval(packing, node => node.scrollIntoView({ block: "center", behavior: "instant" }));
      await page.screenshot({ path: `generated-artifacts/kardex-sections/${language}-${dark ? "dark" : "light"}.jpg` });
    }
    await page.click(`${packing} > summary`);
    await page.evaluate(async () => {
      const { revealKardexSectionForField } = await import("/src/components/products/KardexFormSection.tsx");
      revealKardexSectionForField("packagingSpecifications.nominalCapacityL");
    });
    assert.equal(await page.$eval(packing, node => node.open), true, "Packing validation must reveal the independent section");
    assert.equal(await page.$eval('[data-testid="packaging-section-capacity"]', node => node.open), true);
    assert.equal(await page.$eval('[data-testid="kardex-section-inventory"]', node => node.open), false);
    await open("media");
    assert.equal(await page.$eval('[data-testid="kardex-section-catalog"]', node => node.open), false);
    await new Promise(resolve => setTimeout(resolve, 250));
    assert.equal(await page.$eval('[data-testid="kardex-section-catalog"] > summary > svg', node => getComputedStyle(node).transform), "none",
      "Opening media must not mark closed nested groups as expanded");
    assert.equal(await page.$eval('[data-testid="kardex-section-images"]', node => node.open), false);
    await page.waitForSelector('[data-testid="kardex-section-model3d"]');
    assert.equal(await page.$eval('[data-testid="kardex-section-model3d"]', node => node.open), false);
    await open("model3d");
    await page.click('[data-testid="kardex-section-media"] > summary');
    await open("pricing");
    const priceSelector = 'form input[name="unitPrice"]';
    await page.click(priceSelector);
    await page.keyboard.down("Control"); await page.keyboard.press("A"); await page.keyboard.up("Control");
    await page.keyboard.press("Backspace"); await page.type(priceSelector, "0");
    await page.click('[data-testid="kardex-section-pricing"] > summary');
    await page.click('form button[type="submit"]');
    await page.waitForFunction(() => document.querySelector('[data-testid="kardex-section-pricing"]').open, { timeout: 10000 });
    assert.equal(writes.length, 0, "Invalid submissions must not reach the API");
    assert.deepEqual(errors, []);
    console.log(`PASS actual Kardex form ${language} ${width}px: ${initial.length} closed sections, independent toggles, retained edits, contrasting packing light/dark, hidden-field validation revealed; no real writes.`);
    await context.close();
  }
} finally {
  await browser.close();
}
