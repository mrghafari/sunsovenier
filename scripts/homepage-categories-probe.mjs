import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const [source, main, app, landing] = await Promise.all([
  fetch(base + "/src/pages/content-management.tsx").then(r => r.text()),
  fetch(base + "/src/main.tsx").then(r => r.text()),
  fetch(base + "/src/App.tsx").then(r => r.text()),
  Promise.resolve({ success: true, data: JSON.parse(execFileSync("npx", ["tsx", "-e", 'import {defaultLandingContent} from "./shared/landing-content";console.log(JSON.stringify(defaultLandingContent()))'], { encoding: "utf8" })) }),
]);
const react = source.match(/from ["']([^"']*\/react\.js[^"']*)["']/)?.[1];
const dom = main.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1];
const query = app.match(/from ["']([^"']*tanstack_react-query[^"']*)["']/)?.[1];
assert.ok(react && dom && query && landing.success);
const browser = await puppeteer.launch({
  executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  args: ["--no-sandbox"], headless: true,
});
await mkdir("generated-artifacts/homepage-categories", { recursive: true });
try {
  for (const [language, width] of [["en", 1440], ["fa", 430]]) {
    let categories = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1, name: `Category ${i + 1}`, slug: ["technical-equipment", "paint-solvents", "agricultural-fertilizers", "chemicals", "fuel-additives"][i],
      description: `Description ${i + 1}`, imageUrl: null, isActive: true, displayOrder: i,
    }));
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => { errors.push(error.message); console.error(error.stack); });
    await page.setViewport({ width, height: 932 });
    await page.setBypassServiceWorker(true);
    await page.evaluateOnNewDocument(lang => {
      localStorage.setItem("language", lang);
      localStorage.setItem("language-manually-selected", "true");
    }, language);
    await page.setRequestInterception(true);
    page.on("request", request => {
      const path = new URL(request.url()).pathname;
      const json = (body, status = 200) => request.respond({ status, contentType: "application/json", body: JSON.stringify(body) });
      if (path === "/__categories-probe" || path === "/__categories-home-probe") {
        const component = path.endsWith("home-probe") ? "/src/pages/home.tsx" : "/src/pages/content-management.tsx";
        return request.respond({ contentType: "text/html", body: `<!doctype html><html><body><div id="root"></div><script type="module">
          import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);
          window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
          await import("/src/index.css");
          const rm=await import(${JSON.stringify(react)});const React=rm.default||rm;
          const dm=await import(${JSON.stringify(dom)});const createRoot=dm.createRoot||dm.default.createRoot;
          const {QueryClientProvider}=await import(${JSON.stringify(query)});
          const {queryClient}=await import("/src/lib/queryClient.ts");
          const {LanguageProvider}=await import("/src/contexts/LanguageContext.tsx");
          const {default:Component}=await import(${JSON.stringify(component)});
          createRoot(document.getElementById("root")).render(React.createElement(QueryClientProvider,{client:queryClient},
            React.createElement(LanguageProvider,null,React.createElement(Component))));
        </script></body></html>` });
      }
      if (!path.startsWith("/api/")) return request.continue();
      if (path.startsWith("/api/landing-assets/") || path.startsWith("/api/landing-media/")) return request.continue();
      // All writes are fixture-only, never forwarded to the application.
      if (path === "/api/admin/categories" && request.method() === "POST") {
        const data = JSON.parse(request.postData());
        if (categories.some(cat => cat.slug === data.slug)) return json({ success: false, message: "This category slug is already in use." }, 409);
        const category = { ...data, id: 6 };
        categories.push(category);
        return json({ success: true, category });
      }
      if (/^\/api\/admin\/categories\/\d+$/.test(path) && request.method() === "PUT") {
        const id = Number(path.split("/").pop());
        categories = categories.map(cat => cat.id === id ? { ...cat, ...JSON.parse(request.postData()) } : cat);
        return json({ success: true, category: categories.find(cat => cat.id === id) });
      }
      if (!["GET", "HEAD"].includes(request.method())) return json({ message: "Fixture blocks mutation" }, 400);
      if (path === "/api/admin/me") return json({ success: true, user: { id: 1, role: "admin" } });
      if (path === "/api/admin/categories") return json(categories);
      if (path === "/api/public/categories") return json({ success: true, data: categories.filter(cat => cat.isActive) });
      if (path.includes("landing-content") || path === "/api/content-management/landing") return json(landing);
      if (path === "/api/products") return json([]);
      if (path === "/api/content-management/landing/inquiries") return json({ success: true, data: { items: [], hasMore: false } });
      return json({ success: true, data: [] });
    });
    const openEditor = async () => {
      await page.goto(base + "/__categories-probe", { waitUntil: "networkidle0", timeout: 90000 });
      await page.waitForSelector('[role="tab"]');
      const tabs = await page.$$eval('[role="tab"]', nodes => nodes.map(node => ({ text: node.textContent, controls: node.getAttribute("aria-controls") })));
      const categoryTab = tabs.find(tab => tab.text.includes(language === "fa" ? "دسته‌بندی‌های صفحه اصلی" : "Homepage Categories"));
      assert.ok(categoryTab, JSON.stringify(tabs));
      await page.click(`[aria-controls="${categoryTab.controls}"]`);
      await page.waitForSelector('[data-testid="category-create-name"]');
    };
    const fill = async (selector, value) => {
      await page.$eval(selector, (node, value) => {
        const setter = Object.getOwnPropertyDescriptor(node.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value").set;
        setter.call(node, value);
        node.dispatchEvent(new Event("input", { bubbles: true }));
      }, value);
    };
    await openEditor();
    assert.equal(await page.$$eval('[data-testid^="category-edit-"]', nodes => nodes.length), 5);
    const name = language === "fa" ? "دسته جدید" : "New Category";
    await fill('[data-testid="category-create-name"]', name);
    assert.equal(await page.$eval('[data-testid="category-create-slug"]', node => node.value), language === "fa" ? "دسته-جدید" : "new-category");
    await fill('[data-testid="category-create-description"]', "Created fixture description");
    await page.click('[data-testid="category-create-submit"]');
    await page.waitForSelector('[data-testid="category-edit-6"]');
    assert.equal(categories.length, 6);
    // Duplicate failure retains entered data and displays a visible error.
    await fill('[data-testid="category-create-name"]', name);
    await page.click('[data-testid="category-create-submit"]');
    await page.waitForSelector('[data-testid="category-create-error"]');
    assert.equal(categories.length, 6);
    await page.click('[data-testid="category-edit-1"]');
    await fill('[data-testid="category-edit-name-1"]', "Updated category");
    await page.click('[data-testid="category-save-1"]');
    await page.waitForFunction(() => !document.querySelector('[data-testid="category-edit-name-1"]'));
    assert.equal(categories[0].name, "Updated category");
    await openEditor();
    assert.equal(await page.$$eval('[data-testid^="category-edit-"]', nodes => nodes.filter(node => node.tagName === "BUTTON").length), 6);
    await page.screenshot({ path: `generated-artifacts/homepage-categories/${language}-editor.jpg` });
    await page.goto(base + "/__categories-home-probe", { waitUntil: "networkidle0", timeout: 90000 });
    await page.waitForSelector(".mc-category-link");
    const links = await page.$$eval(".mc-category-link", nodes => nodes.map(node => ({ text: node.textContent, href: node.getAttribute("href") })));
    assert.equal(links.length, 6);
    assert.ok(links.every(link => link.href === "/shop"));
    assert.ok(links.some(link => link.text.includes("Updated category")));
    assert.ok(links.some(link => link.text.includes(name)));
    const cardHeadings = await page.$$eval(".mc-service-card h3", nodes => nodes.map(node => node.textContent));
    assert.deepEqual(cardHeadings, language === "en"
      ? ["Fuel Additives", "Water Treatment", "Paint & Solvents", "Agricultural Fertilizers", "Industrial Chemicals", "Technical Equipment", "Commercial Goods"]
      : ["افزودنی‌های سوخت", "تصفیه آب", "رنگ و حلال‌ها", "کودهای کشاورزی", "مواد شیمیایی صنعتی", "تجهیزات فنی", "کالاهای تجاری"]);
    assert.ok(!cardHeadings.includes("220L Standard Drums"));
    await page.$eval(".mc-services-grid", node => node.scrollIntoView({ block: "start" }));
    await new Promise(resolve => setTimeout(resolve, 1200));
    await page.screenshot({ path: `generated-artifacts/homepage-categories/${language}-cards.jpg` });
    assert.deepEqual(errors, []);
    console.log(`${language}: five editable categories, create, duplicate, edit, reload, six shop links passed`);
    await context.close();
  }
} finally {
  await browser.close();
}
