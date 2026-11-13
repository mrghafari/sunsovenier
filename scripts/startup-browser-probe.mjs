// Verify the production build against the running dev API without deploying it.
// Build with `npx vite build --manifest` first.
import puppeteer from "puppeteer";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const directory = path.resolve("dist/server/public");
const html = await fs.readFile(path.join(directory, "index.html"));
const browser = await puppeteer.launch({
  executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 932 });
  await page.setBypassServiceWorker(true);
  const errors = [], requested = [];
  page.on("pageerror", error => { errors.push(error.message); console.error(error.message); });
  await page.setRequestInterception(true);
  page.on("request", async request => {
    try {
      const url = new URL(request.url());
      if (url.origin !== base || url.pathname === "/sw.js" || request.method() !== "GET") return request.abort();
      if (request.isNavigationRequest()) return request.respond({ status: 200, contentType: "text/html", body: html });
      if (url.pathname.startsWith("/assets/")) {
        requested.push(url.pathname);
        const file = path.resolve(directory, "." + url.pathname);
        assert.ok(file.startsWith(directory + "/assets/"));
        return request.respond({
          status: 200,
          contentType: file.endsWith(".css") ? "text/css" : "application/javascript",
          body: await fs.readFile(file),
        });
      }
      return request.continue();
    } catch (error) {
      console.error(error.message);
      await request.abort().catch(() => {});
    }
  });
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".mc-header", { timeout: 60000 });
  assert.ok(!requested.some(file => /accounting-management|content-management|barcode-inventory|\/products-/.test(file)));
  console.log("Built homepage rendered without heavy management chunks.");
  await fs.mkdir("generated-artifacts/startup", { recursive: true });
  await page.screenshot({ path: "generated-artifacts/startup/home.jpg" });
  await page.waitForSelector('.mc-category-link, .mc-category-empty a', { timeout: 30000 });
  await page.$eval('.mc-category-link, .mc-category-empty a', node => node.click());
  await page.waitForFunction(() => location.pathname === "/shop" && !!document.querySelector("main h1"), { timeout: 60000 });
  console.log("Client-side homepage-to-shop navigation rendered.");
  await page.goto(base + "/mrg/products", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => location.pathname === "/mrg/login" && !!document.querySelector('input[type="password"]'), { timeout: 60000 });
  assert.ok(!requested.some(file => /\/products-/.test(file)));
  console.log("Protected Kardex retained its login boundary without downloading its page.");
  await page.goto(base + "/logistics", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => /Under construction|در حال ساخت|قيد الإنشاء|Yapım aşamasında/.test(document.body.innerText), { timeout: 30000 });
  assert.deepEqual(errors, []);
  console.log("Logistics rendered; no browser runtime errors.");
} finally {
  await browser.close();
}
