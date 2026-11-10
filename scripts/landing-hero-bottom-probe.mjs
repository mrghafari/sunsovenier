import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const original = (await (await fetch(base + "/api/landing-content")).json()).data;
const browser = await puppeteer.launch({
  executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
try {
  for (const { width, language, showText } of [
    { width: 430, language: "en", showText: true },
    { width: 390, language: "fa", showText: false },
    { width: 1440, language: "en", showText: false },
    { width: 1440, language: "fa", showText: true },
  ]) {
    const context = await browser.createBrowserContext();
    try {
      const page = await context.newPage();
      await page.setViewport({ width, height: 932 });
      await page.setBypassServiceWorker(true);
      await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
      await page.evaluateOnNewDocument(language => {
        localStorage.setItem("language", language);
        localStorage.setItem("language-manually-selected", "true");
      }, language);
      const content = structuredClone(original);
      content.page.autoplay = false;
      content.page.slides.forEach(slide => { slide.showText = showText; });
      await page.setRequestInterception(true);
      page.on("request", request => {
        if (new URL(request.url()).pathname === "/api/landing-content") {
          return request.respond({ contentType: "application/json", body: JSON.stringify({ success: true, data: content }) });
        }
        return request.continue();
      });
      await page.goto(base + "/", { waitUntil: "networkidle2", timeout: 60000 });
      await page.waitForSelector(".mc-hero-buttons", { visible: true, timeout: 60000 });
      const bounds = await page.evaluate(() => {
        const hero = document.querySelector(".mc-hero").getBoundingClientRect();
        const buttons = document.querySelector(".mc-hero-buttons").getBoundingClientRect();
        const dots = document.querySelector(".mc-slide-dots").getBoundingClientRect();
        return {
          inset: hero.bottom - Math.max(buttons.bottom, dots.bottom),
          ordered: innerWidth > 767 || buttons.bottom <= dots.top,
          contained: buttons.top > hero.top && buttons.left >= hero.left && buttons.right <= hero.right,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
        };
      });
      assert.ok(bounds.inset >= 7 && bounds.inset <= 40, JSON.stringify(bounds));
      assert.equal(bounds.ordered, true);
      assert.equal(bounds.contained, true);
      assert.equal(bounds.overflow, false);
      const quoteLink = '.mc-hero-buttons a[href="#quote"]';
      await page.$eval(quoteLink, node => node.scrollIntoView({ block: "center", behavior: "instant" }));
      await page.click(quoteLink);
      await page.waitForSelector("#quote:not([hidden])", { visible: true });
      const opened = await page.evaluate(() => {
        const hero = document.querySelector(".mc-hero");
        const quote = document.querySelector("#quote");
        const buttons = document.querySelector(".mc-hero-buttons").getBoundingClientRect();
        return {
          scroll: hero.scrollTop,
          clear: !hero.contains(quote) || quote.getBoundingClientRect().bottom <= buttons.top,
        };
      });
      assert.equal(opened.scroll, 0);
      assert.equal(opened.clear, true, "Controls must not overlap the expanded quote form");
      console.log(`PASS ${width}px ${language} text=${showText}: bottom inset ${bounds.inset}px, no overflow, quote opens without overlap or internal scroll.`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
