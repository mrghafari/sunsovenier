import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const browser = await puppeteer.launch({
  executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  args: ["--no-sandbox"],
});
await mkdir("generated-artifacts/vendor-entry", { recursive: true });
try {
  for (const [language, label, width] of [
    ["en", "Vendor", 1440], ["fa", "پنل فروشندگان", 430],
    ["ar", "بوابة البائعين", 390], ["tr", "Satıcı paneli", 1024],
  ]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const errors = [];
    let visible = true;
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewport({ width, height: 932 });
    await page.setBypassServiceWorker(true);
    await page.evaluateOnNewDocument(language => {
      localStorage.setItem("language", language);
      localStorage.setItem("language-manually-selected", "true");
    }, language);
    await page.setRequestInterception(true);
    page.on("request", async request => {
      const path = new URL(request.url()).pathname;
      if (path === "/sw.js") return request.abort();
      if (!["GET", "HEAD"].includes(request.method())) return request.abort();
      if (path === "/api/marketplace/display-settings") return request.respond({
        contentType: "application/json", body: JSON.stringify({ vendorEntryVisible: visible }),
      });
      if (path === "/api/landing-content") {
        const response = await fetch(base + path);
        const body = await response.json();
        body.data.page.navigation = body.data.page.navigation.filter(link => link.href !== "/vendor");
        return request.respond({ contentType: "application/json", body: JSON.stringify(body) });
      }
      return request.continue();
    });
    await page.goto(base, { waitUntil: "networkidle2", timeout: 120000 });
    await page.waitForSelector('[data-testid="landing-vendor-button"]');
    if (width < 768) await page.click(".mc-menu-toggle");
    const header = '.mc-nav-links a[href="/vendor"]';
    assert.equal(await page.$eval(header, node => node.textContent), label);
    assert.equal(await page.$eval('[data-testid="landing-vendor-button"]', node => node.textContent), label);
    assert.equal(await page.$eval(header, node => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.left >= 0 && rect.right <= innerWidth;
    }), true, "Vendor link must be visible and inside viewport");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.screenshot({ path: `generated-artifacts/vendor-entry/${language}.jpg` });
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 90000 }),
      page.click(header),
    ]);
    assert.equal(new URL(page.url()).pathname, "/vendor");
    await page.waitForSelector('a[href="/vendor/login"]');
    visible = false;
    await page.goto(base, { waitUntil: "networkidle2", timeout: 120000 });
    await page.waitForSelector(".mc-header");
    assert.equal(await page.$$eval('.mc-nav-links a[href="/vendor"], [data-testid="landing-vendor-button"]', nodes => nodes.length), 0);
    assert.deepEqual(errors, []);
    console.log(`${language}: legacy header restored, localized button/link, navigation, layout and visibility setting passed`);
    await context.close();
  }
} finally {
  await browser.close();
}
