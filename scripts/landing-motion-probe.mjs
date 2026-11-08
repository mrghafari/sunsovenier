import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const output = "generated-artifacts/landing-motion-verification";
const original = (await (await fetch(base + "/api/landing-content")).json()).data;
assert.ok(original?.page?.layout);
const browser = await puppeteer.launch({
  executablePath: execFileSync("bash", ["-c", "command -v chromium || command -v chromium-browser"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const errors = [];
let customLayout = false;
const fixture = structuredClone(original);
fixture.page.layout.rows.push({
  id: "motion-fixture-row", columns: 2, width: "contained", gap: "normal",
  blocks: [
    { id: "motion-fixture-copy", type: "text", enabled: true, title: { en: "Motion fixture" }, body: { en: "Custom CMS content remains readable" }, alignment: "start", tone: "plain", spacing: "normal" },
    { id: "motion-fixture-link", type: "button", enabled: true, title: { en: "Fixture contact" }, body: {}, href: "/contact", alignment: "start", tone: "plain", spacing: "normal" },
  ],
});
try {
  await mkdir(output, { recursive: true });
  const page = await browser.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.setBypassServiceWorker(true);
  await page.setViewport({ width: 1440, height: 1000 });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("language", "en");
    localStorage.setItem("language-manually-selected", "true");
  });
  await page.setRequestInterception(true);
  page.on("request", request => {
    const { pathname } = new URL(request.url());
    if (pathname === "/api/landing-content") return request.respond({
      contentType: "application/json", body: JSON.stringify({ success: true, data: customLayout ? fixture : original }),
    });
    if (request.method() !== "GET" && pathname.startsWith("/api/")) {
      return request.respond({ status: 403, body: "Read-only animation verification" });
    }
    request.continue();
  });
  async function load() {
    await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll(".mc-service-card").length === 6, { timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll(".mc-category-link").length > 0);
    await delay(1800);
  }
  const content = () => page.evaluate(() => ({
    title: document.querySelector("h1")?.textContent,
    images: [...document.querySelectorAll(".mc-service-image img")].map(img => img.getAttribute("src")),
    fields: [...document.querySelectorAll(".mc-estimate-card [name]")].map(input => input.name),
    phone: document.querySelector(".mc-phone")?.textContent,
  }));
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await load();
  const snapshot = await content();
  assert.equal(await page.$eval("h1", el => getComputedStyle(el).opacity), "1");
  // Observe actual animations while scrolling rather than relying on a still image.
  const animations = new Set();
  const height = await page.$eval("body", el => el.scrollHeight);
  for (let top = 0; top < height; top += 450) {
    await page.evaluate(y => window.scrollTo({ top: y, behavior: "instant" }), top);
    await delay(90);
    const names = await page.evaluate(() => document.getAnimations().map(animation =>
      animation.animationName || animation.transitionProperty || animation.constructor.name));
    names.forEach(name => animations.add(name));
  }
  assert.ok(animations.size > 0, "Scroll should trigger real transitions or animations");
  await delay(1100);
  assert.ok(await page.$$eval(".mc-reveal", nodes => nodes.every(node => getComputedStyle(node).opacity === "1")), "Visited reveal content is visible");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await delay(300);
  await page.screenshot({ path: `${output}/desktop.png` });
  const scrollBefore = await page.evaluate(() => scrollY);
  await delay(400);
  assert.equal(await page.evaluate(() => scrollY), scrollBefore, "No automatic scrolling");
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await delay(100);
  assert.ok(await page.$$eval(".mc-reveal", nodes => nodes.every(node => getComputedStyle(node).opacity === "1")), "Live reduced-motion change exposes all content");
  assert.deepEqual(await content(), snapshot, "Motion must not replace copy, images, form fields or phone");
  await load();
  assert.deepEqual(await content(), snapshot, "Reduced-motion initial render preserves content");
  await page.setViewport({ width: 390, height: 844 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await load();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No mobile horizontal overflow");
  await page.click(".mc-menu-toggle");
  assert.equal(await page.$eval(".mc-menu-toggle", el => el.getAttribute("aria-expanded")), "true");
  await page.click(".mc-menu-toggle");
  await page.screenshot({ path: `${output}/mobile.png` });
  await page.setViewport({ width: 1440, height: 1000 });
  customLayout = true;
  await load();
  await page.$eval('[data-layout-block="motion-fixture-copy"]', node => node.scrollIntoView({ behavior: "instant", block: "center" }));
  await delay(1200);
  assert.ok(await page.$eval('[data-layout-block="motion-fixture-copy"]', node => node.textContent.includes("Custom CMS content")));
  const customLink = await page.$('[data-layout-block="motion-fixture-link"] a');
  await customLink.focus();
  assert.equal(await customLink.evaluate(node => node.getAttribute("href")), "/contact");
  assert.ok(await customLink.evaluate(node => {
    for (let parent = node; parent && parent !== document.body; parent = parent.parentElement) {
      if (Number(getComputedStyle(parent).opacity) === 0) return false;
    }
    return true;
  }), "Keyboard-focused custom content remains visible");
  await page.screenshot({ path: `${output}/custom-layout.png` });
  // Missing observers must degrade to a usable, completely visible landing page.
  await page.evaluateOnNewDocument(() => { delete window.IntersectionObserver; });
  await load();
  assert.ok(await page.$$eval(".mc-reveal", nodes => nodes.every(node => getComputedStyle(node).opacity === "1")), "Observer fallback does not hide content");
  assert.deepEqual(errors, []);
  console.log("PASS: real motion on scroll, desktop/mobile, unchanged content, native scrolling, live/initial reduced motion, custom CMS layout, keyboard focus and observer fallback.", [...animations]);
} finally {
  await browser.close();
}
