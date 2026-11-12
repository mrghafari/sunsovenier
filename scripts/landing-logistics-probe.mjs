import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const assets = JSON.parse(await readFile("client/src/pages/landing/landing-assets.json", "utf8"));
const fixture = JSON.parse(execFileSync("npx", ["tsx", "-e", 'import {defaultLandingContent} from "./shared/landing-content";console.log(JSON.stringify(defaultLandingContent()))'], { encoding: "utf8" }));
// A legacy persisted header, plus a known CMS-selected background.
fixture.page.navigation = fixture.page.navigation.map(link => link.id === "logistics"
  ? { id: "account", href: "/customer/login", textKey: "navAccount", labels: {}, isActive: true } : link);
fixture.images.logistics = assets.images[8].url;
const browser = await puppeteer.launch({
  executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  args: ["--no-sandbox"], headless: true,
});
await mkdir("generated-artifacts/logistics", { recursive: true });
try {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/landing-content") return request.respond({
      contentType: "application/json", body: JSON.stringify({ success: true, data: fixture }),
    });
    return request.continue();
  });
  await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("language", "en");
    localStorage.setItem("language-manually-selected", "true");
  });
  for (const [language, title, status, width] of [
    ["en", "Logistics", "Under construction", 1440],
    ["fa", "لجستیک", "در حال ساخت", 430],
    ["ar", "الخدمات اللوجستية", "قيد الإنشاء", 430],
    ["tr", "Lojistik", "Yapım aşamasında", 1440],
  ]) {
    await page.setViewport({ width, height: 932 });
    if (language === "en") {
    await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector(".mc-header", { timeout: 120000 });
    const links = await page.$$eval(".mc-nav-links a", nodes => nodes.map(node => ({ href: node.getAttribute("href"), text: node.textContent })));
    assert.equal(links.filter(link => link.href === "/logistics").length, 1);
    assert.ok(!links.some(link => link.href === "/customer/login"));
    assert.equal(links.find(link => link.href === "/logistics").text, title);
    assert.equal(await page.$$eval(".mc-service-card h3", nodes => nodes.some(node => /^(Logistics|لجستیک|الخدمات اللوجستية|Lojistik)$/.test(node.textContent.trim()))), false);
    if (width < 600) await page.click(".mc-menu-toggle");
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 120000 }),
      page.click('.mc-nav-links a[href="/logistics"]'),
    ]);
    await page.waitForSelector(".logistics-plaque__status", { timeout: 120000 });
    } else {
      await page.setViewport({ width: 1440, height: 932 });
      const trigger = await page.$("header button:has(svg.lucide-globe)");
      assert.ok(trigger, "Global language picker");
      await trigger.click();
      const label = { fa: "فارسی", ar: "العربية", tr: "Türkçe" }[language];
      await page.waitForSelector('[role="menuitem"]');
      await page.evaluate(label => {
        [...document.querySelectorAll('[role="menuitem"]')].find(node => node.textContent.trim() === label).click();
      }, label);
      await page.waitForFunction(status => document.querySelector(".logistics-plaque__status")?.textContent === status, {}, status);
      await page.setViewport({ width, height: 932 });
    }
    assert.equal(new URL(page.url()).pathname, "/logistics");
    assert.equal(await page.$eval("h1", node => node.textContent), title);
    assert.equal(await page.$eval(".logistics-plaque__status", node => node.textContent), status);
    await page.waitForFunction(() => !document.querySelector(".logistics-plaque__error"));
    const css = await page.$eval(".logistics-scene__photo", node => getComputedStyle(node).backgroundImage);
    assert.ok(css.includes(fixture.images.logistics));
    assert.ok(await page.$eval(".logistics-page", node => node.getBoundingClientRect().right <= innerWidth + 1));
    await page.screenshot({ path: `generated-artifacts/logistics/${language}.jpg` });
    assert.deepEqual(errors, []);
    console.log(`${language}: translated page and original background passed; English also verified homepage header, card removal and navigation`);
  }
  await context.close();
} finally {
  await browser.close();
}
