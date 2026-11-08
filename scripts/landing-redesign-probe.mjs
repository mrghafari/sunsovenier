import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const output = "generated-artifacts/landing-redesign-verification";
const browser = await puppeteer.launch({
  executablePath: execFileSync("bash", ["-c", "command -v chromium || command -v chromium-browser"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
const errors = [];
try {
  await mkdir(output, { recursive: true });
  for (const { language, width, height } of [
    { language: "fa", width: 1440, height: 1100 },
    { language: "en", width: 1440, height: 1100 },
    { language: "fa", width: 390, height: 844 },
    { language: "en", width: 390, height: 844 },
    { language: "fa", width: 1024, height: 900 },
  ]) {
    const page = await browser.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.setBypassServiceWorker(true);
    await page.setViewport({ width, height });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.evaluateOnNewDocument(language => {
      localStorage.setItem("language", language);
      localStorage.setItem("language-manually-selected", "true");
    }, language);
    await page.setRequestInterception(true);
    page.on("request", request => {
      const url = new URL(request.url());
      if (url.pathname.startsWith("/api/") && request.method() !== "GET") {
        return request.respond({ status: 403, body: "Read-only visual verification" });
      }
      return request.continue();
    });
    await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll(".mc-service-card").length === 6, { timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll(".mc-category-link").length > 0);
    const state = await page.evaluate(() => {
      const landing = document.querySelector(".mc-landing");
      const style = getComputedStyle(landing);
      return {
        dir: landing.dir,
        background: style.backgroundColor,
        accent: style.getPropertyValue("--mc-gold").trim(),
        h1: document.querySelectorAll("h1").length,
        title: document.querySelector("h1")?.textContent.trim(),
        sticky: getComputedStyle(document.querySelector(".mc-header")).position,
        overflow: document.documentElement.scrollWidth > innerWidth,
        text: landing.textContent,
      };
    });
    assert.equal(state.dir, language === "fa" ? "rtl" : "ltr");
    assert.equal(state.h1, 1);
    assert.ok(state.title.length > 10);
    assert.equal(state.accent.toLowerCase(), "#1a56db", "User's existing blue accent must be preserved");
    assert.ok(!state.text.includes("#FF6A1A"), "No orange palette reference should leak into the page");
    assert.equal(state.sticky, "sticky");
    assert.equal(state.overflow, false, `${language} at ${width}px must fit`);
    for (const placeholder of ["AI Sessions", "Basic $49", "Business $79", "Join 4,000", "[Your main headline]"]) {
      assert.ok(!state.text.includes(placeholder), `No invented SaaS content: ${placeholder}`);
    }
    assert.ok(await page.$(".mc-estimate-card form"), "Existing functional estimate form remains");
    await page.screenshot({ path: `${output}/${language}-${width}-hero.png` });
    await page.$eval(".mc-services", node => node.scrollIntoView({ behavior: "instant", block: "start" }));
    const lazyImages = await page.$$(".mc-service-image img");
    for (const image of lazyImages) {
      await image.evaluate(node => node.scrollIntoView({ behavior: "instant", block: "center" }));
      await page.waitForFunction(node => node.complete && node.naturalWidth > 0, {}, image);
    }
    await page.$eval(".mc-services", node => node.scrollIntoView({ behavior: "instant", block: "start" }));
    await page.waitForFunction(() => [...document.querySelectorAll(".mc-service-image img")].every(image => image.complete && image.naturalWidth > 0));
    await page.screenshot({ path: `${output}/${language}-${width}-products.png` });
    const detail = await page.$(".mc-detail-link");
    await detail.click();
    await page.waitForFunction(() => document.querySelector(".mc-modal")?.open);
    assert.ok(await page.$eval("#mc-modal-title", node => node.textContent.trim().length > 0));
    await page.click(".mc-modal-close");
    await page.waitForFunction(() => !document.querySelector(".mc-modal")?.open);
    if (width < 768) {
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await page.click(".mc-menu-toggle");
      assert.equal(await page.$eval(".mc-menu-toggle", node => node.getAttribute("aria-expanded")), "true");
      await page.click(".mc-menu-toggle");
    }
    await page.close();
    console.log(`PASS redesigned ${language} ${width}px: original blue palette, preserved products/form, RTL/LTR, responsive, product modal.`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
