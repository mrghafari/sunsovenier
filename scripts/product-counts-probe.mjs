// Isolated component fixtures only; never signs in or mutates application data.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const [source, main, app] = await Promise.all(["/src/pages/products.tsx", "/src/main.tsx", "/src/App.tsx"].map(url => fetch(base + url).then(r => r.text())));
const react = source.match(/from ["']([^"']*\/react\.js[^"']*)["']/)?.[1];
const dom = main.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1];
const query = app.match(/from ["']([^"']*tanstack_react-query[^"']*)["']/)?.[1];
assert.ok(react && dom && query);
const products = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1, name: `Product ${Math.floor(i / 3) + 1}`, barcode: ["8649677191615", "8649677165005", "8649677182866", "8649677139204"][Math.floor(i / 3)],
  category: "Paint & Solvents", stockQuantity: i % 3 === 0 ? 200 : 0,
  minStockLevel: 10, maxStockLevel: 1000, syncWithShop: i % 3 === 0,
  createdAt: "2026-01-01", unitPrice: "1", currency: "USD", isActive: true,
}));
const browser = await puppeteer.launch({ executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(), args: ["--no-sandbox"] });
await mkdir("generated-artifacts/product-counts", { recursive: true });
try {
  for (const [language, width] of [["en", 1440], ["fa", 430]]) {
    const page = await browser.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewport({ width, height: 932 });
    await page.setBypassServiceWorker(true);
    await page.evaluateOnNewDocument(language => {
      localStorage.setItem("language", language);
      localStorage.setItem("language-manually-selected", "true");
    }, language);
    await page.setRequestInterception(true);
    page.on("request", request => {
      const url = new URL(request.url()), path = url.pathname;
      const json = body => request.respond({ contentType: "application/json", body: JSON.stringify(body) });
      if (path === "/sw.js" || url.origin !== base) return request.abort();
      if (path === "/__product-counts-probe") return request.respond({ contentType: "text/html", body: `<!doctype html><div id="root"></div><script type="module">
        import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
        await import("/src/index.css");const rm=await import(${JSON.stringify(react)});const React=rm.default||rm;
        const dm=await import(${JSON.stringify(dom)});const {QueryClientProvider}=await import(${JSON.stringify(query)});
        const {queryClient}=await import("/src/lib/queryClient.ts");const {LanguageProvider}=await import("/src/contexts/LanguageContext.tsx");
        const {default:Component}=await import("/src/pages/products.tsx");
        (dm.createRoot||dm.default.createRoot)(document.getElementById("root")).render(React.createElement(QueryClientProvider,{client:queryClient},React.createElement(LanguageProvider,null,React.createElement(Component))));
      </script>` });
      if (!["GET", "HEAD"].includes(request.method())) return json({ success: false, message: "Fixture blocked mutation" });
      if (path === "/api/products") return json(products);
      if (path === "/api/admin/me") return json({ success: true, user: { id: 1, username: "Fixture", role: "admin" } });
      if (path === "/api/admin/categories") return json([{ id: 1, name: "Paint & Solvents" }, { id: 2, name: "Water Treatment" }]);
      if (path.startsWith("/api/")) return json({ success: true, vendors: [], data: [] });
      return request.continue();
    });
    await page.goto(base + "/__product-counts-probe", { waitUntil: "networkidle0", timeout: 90000 });
    const number = n => new Intl.NumberFormat(language).format(n);
    const text = selector => page.$eval(selector, node => node.textContent);
    assert.equal(await text('[data-testid="product-count-total"]'), number(4));
    assert.equal(await text('[data-testid="product-count-hidden"]'), number(0));
    assert.equal(await text('[data-testid="product-count-in-stock"]'), number(4));
    assert.equal(await text('[data-testid="product-count-out-of-stock"]'), number(0));
    assert.ok((await text('[data-testid="product-category-all"]')).includes(number(4)));
    assert.ok((await text('[data-testid="product-category-Paint & Solvents"]')).includes(number(4)));
    assert.ok((await text('[data-testid="product-category-Water Treatment"]')).includes(number(0)));
    await page.click('[data-testid="product-category-Water Treatment"]');
    await page.waitForFunction(() => !document.querySelector('[role="tabpanel"]')?.textContent.includes("Product 1"));
    assert.equal((await text('[role="tabpanel"]')).includes("Product 4"), false);
    await page.click('[data-testid="product-category-Paint & Solvents"]');
    await page.waitForFunction(() => document.querySelector('[role="tabpanel"]')?.textContent.includes("Product 1"));
    await page.screenshot({ path: `generated-artifacts/product-counts/${language}.jpg`, fullPage: false });
    assert.deepEqual(errors, []);
    console.log(`${language}: 12 batch rows => 4 products, 0 hidden, aggregated stock and category counts passed`);
    await page.close();
  }
} finally { await browser.close(); }
