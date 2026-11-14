// Isolated browser fixtures mount the real management/home components.
// All mutations remain in memory; no application authentication is bypassed.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer";
const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const [source, main, app] = await Promise.all(["/src/pages/category-management.tsx", "/src/main.tsx", "/src/App.tsx"].map(url => fetch(base + url).then(r => r.text())));
const react = source.match(/from ["']([^"']*\/react\.js[^"']*)["']/)?.[1];
const dom = main.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1];
const query = app.match(/from ["']([^"']*tanstack_react-query[^"']*)["']/)?.[1];
assert.ok(react && dom && query);
const landing = JSON.parse(execFileSync("npx", ["tsx", "-e", 'import {defaultLandingContent} from "./shared/landing-content";console.log(JSON.stringify(defaultLandingContent()))'], { encoding: "utf8" }));
const browser = await puppeteer.launch({ executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(), args: ["--no-sandbox"] });
await mkdir("generated-artifacts/homepage-categories", { recursive: true });
try {
  for (const [language, width] of [["en", 1440], ["fa", 430]]) {
    let categories = [{ id: 1, name: "Managed category", slug: "managed-category", description: "Managed description", imageUrl: null, sampleImages: [{ id: "sample-1", imageUrl: "/api/landing-assets/fbbcfa42ad4cf8943bbea5fc.jpg", title: "Managed photo", description: "Managed photo description" }], isActive: true, displayOrder: 0 }];
    const context = await browser.createBrowserContext(), page = await context.newPage(), errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.setViewport({ width, height: 932 });
    await page.setBypassServiceWorker(true);
    await page.evaluateOnNewDocument(language => { localStorage.setItem("language", language); localStorage.setItem("language-manually-selected", "true"); }, language);
    await page.setRequestInterception(true);
    page.on("request", request => {
      const url = new URL(request.url()), pathname = url.pathname;
      const json = (body, status = 200) => request.respond({ status, contentType: "application/json", body: JSON.stringify(body) });
      if (pathname === "/sw.js" || url.origin !== base) return request.abort();
      if (pathname.startsWith("/__categories-")) {
        const component = pathname.endsWith("home-probe") ? "/src/pages/home.tsx" : "/src/pages/category-management.tsx";
        return request.respond({ contentType: "text/html", body: `<!doctype html><div id="root"></div><script type="module">
          import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
          await import("/src/index.css");const rm=await import(${JSON.stringify(react)});const React=rm.default||rm;
          const dm=await import(${JSON.stringify(dom)});const {QueryClientProvider}=await import(${JSON.stringify(query)});
          const {queryClient}=await import("/src/lib/queryClient.ts");const {LanguageProvider}=await import("/src/contexts/LanguageContext.tsx");
          const {default:Component}=await import(${JSON.stringify(component)});(dm.createRoot||dm.default.createRoot)(document.getElementById("root")).render(React.createElement(QueryClientProvider,{client:queryClient},React.createElement(LanguageProvider,null,React.createElement(Component))));
        </script>` });
      }
      if (pathname === "/api/admin/categories" && request.method() === "POST") {
        const data = JSON.parse(request.postData());
        if (categories.some(cat => cat.slug === data.slug)) return json({ message: "Duplicate slug" }, 409);
        const category = { ...data, id: 2 }; categories.push(category); return json({ success: true, category });
      }
      if (/^\/api\/admin\/categories\/\d+$/.test(pathname) && request.method() === "PUT") {
        const id = Number(pathname.split("/").pop()), data = JSON.parse(request.postData());
        categories = categories.map(cat => cat.id === id ? { ...cat, ...data } : cat);
        return json({ success: true, category: categories.find(cat => cat.id === id) });
      }
      if (pathname.endsWith("/image") && request.method() === "POST") return json({ success: true, url: "/api/landing-assets/f7d7890b0064971506413cbc.jpg" });
      if (!["GET", "HEAD"].includes(request.method())) return json({ message: "Fixture blocked mutation" }, 400);
      if (!pathname.startsWith("/api/") || pathname.startsWith("/api/landing-assets/") || pathname.startsWith("/api/landing-media/")) return request.continue();
      if (pathname === "/api/admin/categories") return json(categories);
      if (pathname === "/api/public/categories") return json({ success: true, data: categories.filter(cat => cat.isActive) });
      if (pathname === "/api/landing-content") return json({ success: true, data: landing });
      if (pathname === "/api/products") return json([
        { id: 101, barcode: "shared-product-barcode", name: "First category product", category: "Renamed category", description: "First product description", imageUrls: ["/api/landing-assets/fbbcfa42ad4cf8943bbea5fc.jpg", "/wrong-second-image.jpg"], specifications: { Purity: "98%" }, packagingSpecifications: { version: 1, nominalCapacityL: 200 }, isActive: true },
        { id: 102, name: "Second category product", category: "Renamed category", description: "Second product description", imageUrls: ["/api/landing-assets/f7d7890b0064971506413cbc.jpg"], specifications: { Density: "1.2" }, packagingSpecifications: { version: 1, nominalCapacityL: 1000 }, isActive: true },
        { id: 103, name: "Unrelated product", category: "Other category", imageUrls: ["/unrelated.jpg"], isActive: true },
        { id: 104, barcode: "shared-product-barcode", name: "Duplicate inventory batch", category: "Renamed category", syncWithShop: false, isActive: true },
      ]);
      return json({ success: true, data: [] });
    });
    const fill = async (selector, value) => page.$eval(selector, (node, value) => {
      Object.getOwnPropertyDescriptor(node.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value").set.call(node, value);
      node.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
    await page.goto(base + "/__categories-editor-probe", { waitUntil: "networkidle0", timeout: 90000 });
    await page.waitForSelector('[data-testid="category-photo-preview-1"] img');
    assert.equal(await page.$eval('[data-testid="category-photo-preview-1"] img', node => node.getAttribute("src")), categories[0].sampleImages[0].imageUrl);
    await page.screenshot({ path: `generated-artifacts/homepage-categories/${language}-thumbnails.jpg` });
    const editText = language === "fa" ? "ویرایش" : "Edit";
    await page.click('[data-testid="category-photo-preview-1"]');
    await page.waitForSelector('[data-testid="category-samples-editor"]');
    await fill('input[name="name"]', "Renamed category");
    await fill('[data-testid="category-sample-row"] input', "Updated sample");
    await fill('[data-testid="category-samples-editor"] input[placeholder="https://…"]', "/api/landing-assets/f7d7890b0064971506413cbc.jpg");
    await page.$$eval("button", (nodes, text) => nodes.find(n => n.textContent.trim() === text).click(), language === "fa" ? "افزودن عکس" : "Add image");
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="category-sample-row"]').length === 2);
    await page.screenshot({ path: `generated-artifacts/homepage-categories/${language}-editor.jpg` });
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    assert.equal(categories[0].name, "Renamed category"); assert.equal(categories[0].sampleImages.length, 2);
    assert.equal(categories[0].sampleImages[0].title, "Updated sample");
    await page.reload({ waitUntil: "networkidle0" });
    await page.$$eval("tbody button", (nodes, text) => nodes.find(n => n.textContent.trim() === text).click(), editText);
    await page.waitForSelector('[data-testid="category-sample-row"]');
    assert.equal(await page.$$eval('[data-testid="category-sample-row"]', nodes => nodes.length), 2);
    await page.click(`[aria-label="${language === "fa" ? "انتقال به پایین" : "Move down"}"]`);
    await page.click('button[type="submit"]'); await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    assert.equal(categories[0].sampleImages[1].title, "Updated sample");
    await page.goto(base + "/__categories-home-probe", { waitUntil: "networkidle0", timeout: 90000 });
    await page.waitForSelector(".mc-service-card");
    const expectedCount = new Intl.NumberFormat(language).format(2);
    assert.ok((await page.$eval(".mc-category-link > small", node => node.textContent)).startsWith(expectedCount + " "));
    assert.deepEqual(await page.$$eval('[data-testid="category-photo-product-count"]', nodes => nodes.map(node => node.textContent.split(" ")[0])), [expectedCount, expectedCount]);
    assert.equal(await page.$eval(".mc-category-samples", node => node.textContent.includes("Duplicate inventory batch")), false);
    assert.equal(await page.$eval(".mc-category-photo-heading", node => node.textContent), "Renamed category");
    assert.equal(await page.$$eval(".mc-service-card", nodes => nodes.length), 2);
    const images = await page.$$eval(".mc-service-image img", nodes => nodes.map(node => node.getAttribute("src")));
    assert.deepEqual(images, categories[0].sampleImages.map(sample => sample.imageUrl));
    await page.$eval(".mc-services-grid", node => node.scrollIntoView()); await new Promise(resolve => setTimeout(resolve, 700));
    await page.screenshot({ path: `generated-artifacts/homepage-categories/${language}-cards.jpg` });
    await page.$eval(".mc-detail-link", node => node.click()); await page.waitForSelector("dialog[open]");
    assert.equal(await page.$eval("dialog[open] img", node => node.getAttribute("src")), "/api/landing-assets/fbbcfa42ad4cf8943bbea5fc.jpg");
    assert.equal(await page.$eval('[data-testid="category-slide-name"]', node => node.textContent), "First category product");
    assert.ok((await page.$eval(".mc-carousel-caption > span", node => node.textContent)).endsWith("/ " + expectedCount));
    assert.match(await page.$eval('[data-testid="category-slide-technical"]', node => node.textContent), /98%/);
    assert.match(await page.$eval('[data-testid="category-slide-packing"]', node => node.textContent), /[2۲٢][0۰٠]{2}/);
    await page.$eval('[data-testid="category-product-next"]', node => node.click());
    await page.waitForFunction(() => document.querySelector('[data-testid="category-slide-name"]')?.textContent === "Second category product");
    assert.equal(await page.$eval("dialog[open] img", node => node.getAttribute("src")), "/api/landing-assets/f7d7890b0064971506413cbc.jpg");
    assert.match(await page.$eval('[data-testid="category-slide-technical"]', node => node.textContent), /1.2/);
    assert.match(await page.$eval('[data-testid="category-slide-packing"]', node => node.textContent), /[1۱١][,.٬]?[0۰٠]{3}/);
    assert.doesNotMatch(await page.$eval('[data-testid="category-slide-details"]', node => node.textContent), /98%|Unrelated/);
    await page.$eval('[data-testid="category-product-prev"]', node => node.click());
    await page.waitForFunction(() => document.querySelector('[data-testid="category-slide-name"]')?.textContent === "First category product");
    const panels = await page.evaluate(() => {
      const technical = document.querySelector('[data-testid="category-slide-technical"]');
      const packing = document.querySelector('[data-testid="category-slide-packing"]');
      const image = document.querySelector(".mc-carousel-visual").getBoundingClientRect();
      const details = document.querySelector(".mc-product-carousel .mc-modal-body").getBoundingClientRect();
      return { different: getComputedStyle(technical).backgroundColor !== getComputedStyle(packing).backgroundColor, imageOnLeft: image.right <= details.left + 1 };
    });
    assert.equal(panels.different, true);
    if (width > 1024) assert.equal(panels.imageOnLeft, true);
    await page.$eval('[data-testid="category-slide-packing"]', node => node.scrollIntoView({ block: "center" }));
    await page.screenshot({ path: `generated-artifacts/homepage-categories/${language}-product-carousel.jpg` });
    assert.equal(await page.$eval('[data-testid="modal-purchase"]', node => node.getAttribute("href")), "/shop");
    assert.equal(await page.$eval('[data-testid^="card-purchase-"]', node => node.getAttribute("href")), "/shop");
    assert.deepEqual(errors, []);
    console.log(`${language}: actual category form edits, gallery add/reorder/save/reload, grouped homepage photos and details/shop links passed.`);
    await context.close();
  }
} finally { await browser.close(); }
