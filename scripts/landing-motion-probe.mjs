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
  let page;
  async function freshPage(viewport = { width: 1440, height: 1000 }) {
  if (page) await page.close();
  page = await browser.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.setBypassServiceWorker(true);
  await page.setViewport(viewport);
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
  }
  await freshPage();
  async function load() {
    await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll(".mc-service-card").length === 6, { timeout: 60000 })
      .catch(async error => {
        console.error("LOAD DIAGNOSTIC", await page.evaluate(() => ({
          url: location.href, cards: document.querySelectorAll(".mc-service-card").length,
          text: document.body.innerText.slice(0, 500),
        })), errors);
        throw error;
      });
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
  const layerPositions = () => page.evaluate(() => {
    const quote = document.querySelector(".mc-hero .mc-estimate-card");
    const background = document.querySelector(".mc-hero-slider");
    return {
      quote: quote ? quote.getBoundingClientRect().top + scrollY : null,
      background: background ? new DOMMatrixReadOnly(getComputedStyle(background).transform).m42 : null,
    };
  });
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await delay(150);
  const layersAtTop = await layerPositions();
  await page.evaluate(() => scrollTo({ top: 500, behavior: "instant" }));
  await delay(250);
  const layersScrolled = await layerPositions();
  assert.ok(Math.abs(layersScrolled.quote - layersAtTop.quote) >= 45,
    `Foreground depth must be perceptible, not just a few pixels: ${layersScrolled.quote - layersAtTop.quote}px`);
  assert.ok(Math.abs(layersScrolled.background - layersAtTop.background) >= 20,
    `Background should move at a distinct, noticeable speed: ${layersScrolled.background - layersAtTop.background}px`);
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await delay(250);
  const layersReturned = await layerPositions();
  assert.ok(Math.abs(layersReturned.quote - layersAtTop.quote) <= 3, "Scroll depth follows reverse scrolling too");
  console.log("Verified real desktop scroll deltas:", {
    foreground: layersScrolled.quote - layersAtTop.quote,
    background: layersScrolled.background - layersAtTop.background,
  });
  async function checkSectionScrub(selector) {
    const anchor = await page.$eval(selector, node => {
      let top = 0;
      for (let element = node; element; element = element.offsetParent) top += element.offsetTop;
      return top;
    });
    const sectionState = () => page.$eval(selector, node => {
      const bounds = node.getBoundingClientRect();
      return {
        documentY: bounds.top + scrollY,
        translate: getComputedStyle(node).translate,
        scale: getComputedStyle(node).scale,
        opacity: Number(getComputedStyle(node).opacity),
        progress: node.dataset.motionProgress,
      };
    });
    await page.evaluate(top => scrollTo({ top, behavior: "instant" }), Math.max(0, anchor - 920));
    await delay(180);
    const entering = await sectionState();
    await page.evaluate(top => scrollTo({ top, behavior: "instant" }), Math.max(0, anchor - 430));
    await delay(250);
    const centered = await sectionState();
    assert.ok(Math.abs(centered.documentY - entering.documentY) >= 20,
      `Desktop ${selector} must move progressively beyond natural scrolling: ${JSON.stringify({ entering, centered })}`);
    assert.ok(centered.opacity >= entering.opacity, "Section brightens as it enters");
    await page.evaluate(top => scrollTo({ top, behavior: "instant" }), Math.max(0, anchor - 920));
    await delay(200);
    const returning = await sectionState();
    assert.ok(Math.abs(returning.documentY - entering.documentY) < 6, "Section progress reverses with scroll");
    console.log("Verified desktop section scrub:", selector, { entering, centered });
  }
  await checkSectionScrub(".mc-about-image");
  await checkSectionScrub(".mc-service-card");
  // Touchscreen desktop/laptop must not be mistaken for a narrow mobile screen.
  await freshPage({ width: 1440, height: 1000, hasTouch: true });
  await load();
  assert.equal(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), true);
  await checkSectionScrub(".mc-about-image");
  await freshPage({ width: 1440, height: 1000, hasTouch: false });
  await load();
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
  assert.ok(await page.$$eval(".mc-reveal", nodes => nodes.filter(node => {
    const bounds = node.getBoundingClientRect();
    return bounds.top > 30 && bounds.bottom < innerHeight - 30;
  }).every(node => getComputedStyle(node).opacity === "1")), "In-view reveal content is visible");
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
  assert.ok(await page.evaluate(() => [...document.querySelectorAll(".mc-landing *")].every(node => {
    const style = getComputedStyle(node);
    return style.animationName === "none";
  })), "Reduced motion disables all landing animations, including delayed ones");
  await freshPage();
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await load();
  assert.deepEqual(await content(), snapshot, "Reduced-motion initial render preserves content");
  await freshPage({ width: 390, height: 844, hasTouch: true });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await load();
  const mobileTiming = await page.evaluate(() => ({
    reveal: getComputedStyle(document.querySelector(".mc-about-image")).transitionDuration,
    hero: getComputedStyle(document.querySelector("h1")).animationDuration,
  }));
  assert.ok(mobileTiming.reveal.split(",").some(duration => Math.abs(parseFloat(duration) - 2.34) < 0.001),
    `Mobile reveal duration must be exactly three times 0.78s: ${JSON.stringify(mobileTiming)}`);
  assert.equal(parseFloat(mobileTiming.hero), 2.28, "Mobile hero entrance is three times 0.76s");
  await delay(1600);
  const mobileAnchor = await page.$eval(".mc-about-image", node => {
    let top = 0;
    for (let element = node; element; element = element.offsetParent) top += element.offsetTop;
    return top;
  });
  await page.evaluate(top => scrollTo({ top, behavior: "instant" }), mobileAnchor - 780);
  await delay(250);
  const mobileFadeStart = await page.$eval(".mc-about-image", node => Number(getComputedStyle(node).opacity));
  await delay(1000);
  const mobileFadeMiddle = await page.$eval(".mc-about-image", node => Number(getComputedStyle(node).opacity));
  await delay(1400);
  const mobileFadeEnd = await page.$eval(".mc-about-image", node => Number(getComputedStyle(node).opacity));
  assert.ok(mobileFadeStart < 0.7 && mobileFadeMiddle < 0.96 && mobileFadeMiddle > mobileFadeStart && mobileFadeEnd > 0.99,
    `Mobile fade should remain visibly progressive for the longer duration: ${JSON.stringify({mobileFadeStart, mobileFadeMiddle, mobileFadeEnd})}`);
  console.log("Verified mobile fade:", mobileTiming, { mobileFadeStart, mobileFadeMiddle, mobileFadeEnd });
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await delay(2900);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No mobile horizontal overflow");
  await page.click(".mc-menu-toggle");
  assert.equal(await page.$eval(".mc-menu-toggle", el => el.getAttribute("aria-expanded")), "true");
  await page.click(".mc-menu-toggle");
  await page.screenshot({ path: `${output}/mobile.png` });
  await freshPage();
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
  const fallback = await browser.newPage();
  await fallback.setBypassServiceWorker(true);
  await fallback.evaluateOnNewDocument(() => {
    delete window.IntersectionObserver;
    localStorage.setItem("language", "en");
    localStorage.setItem("language-manually-selected", "true");
  });
  fallback.on("pageerror", error => errors.push(error.message));
  await fallback.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await fallback.waitForFunction(() => document.querySelectorAll(".mc-service-card").length === 6, { timeout: 60000 });
  assert.ok(await fallback.$$eval(".mc-reveal", nodes => nodes.every(node => getComputedStyle(node).opacity === "1")), "Observer fallback does not hide content");
  await fallback.close();
  assert.deepEqual(errors, []);
  console.log("PASS: real motion on scroll, desktop/mobile, unchanged content, native scrolling, live/initial reduced motion, custom CMS layout, keyboard focus and observer fallback.", [...animations]);
} finally {
  await browser.close();
}
