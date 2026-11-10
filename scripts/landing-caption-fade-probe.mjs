import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const seed = (await (await fetch(base + "/api/landing-content")).json()).data;
const browser = await puppeteer.launch({
  executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
try {
  for (const [width, language] of [[1440, "en"], [430, "fa"]].filter(([width]) => !process.env.CAPTION_FADE_WIDTH || width === Number(process.env.CAPTION_FADE_WIDTH))) {
    const context = await browser.createBrowserContext();
    try {
      const page = await context.newPage();
      await page.setViewport({ width, height: 932 });
      await page.setBypassServiceWorker(true);
      await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
      await page.evaluateOnNewDocument(language => {
        localStorage.setItem("language", language);
        localStorage.setItem("language-manually-selected", "true");
      }, language);
      const content = structuredClone(seed);
      content.page.autoplay = false;
      content.page.slideInterval = 3000;
      content.page.slides = content.page.slides.slice(0, 3).map((slide, index) => ({
        ...slide, isActive: true, showText: index !== 2,
        title: { en: `Caption ${index + 1}`, fa: `عنوان ${index + 1}` },
        eyebrow: { en: `Image ${index + 1}`, fa: `تصویر ${index + 1}` },
        description: { en: `Description ${index + 1}`, fa: `توضیح ${index + 1}` },
      }));
      await page.setRequestInterception(true);
      page.on("request", request => {
        const path = new URL(request.url()).pathname;
        if (path === "/api/landing-content") return request.respond({ contentType: "application/json", body: JSON.stringify({ success: true, data: content }) });
        if (request.resourceType() === "image" && path.startsWith("/api/landing-")) return request.respond({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#142338"/></svg>' });
        return request.continue();
      });
      const key = index => `${content.page.slides[index].id}:${language}`;
      const controlsReady = async () => page.waitForFunction(() =>
        [...document.querySelector(".mc-hero-controls").getAnimations({ subtree: true })]
          .filter(animation => animation.animationName === "mc-hero-enter")
          .every(animation => animation.playState === "finished"));
      const settled = async index => page.waitForFunction(key => {
        const node = document.querySelector(".mc-hero-copy");
        const heading = node?.querySelector("h1");
        return node?.dataset.captionKey === key && node.dataset.captionPhase === "visible"
          && Number(getComputedStyle(heading).opacity) >= .99;
      }, { timeout: 60000 }, key(index));
      const click = async index => {
        const selector = `.mc-slide-dots button:nth-child(${index + 1})`;
        await page.$eval(selector, node => node.scrollIntoView({ block: "center", behavior: "instant" }));
        await controlsReady();
        await page.click(selector);
      };
      await page.goto(base + "/", { waitUntil: "networkidle2", timeout: 60000 });
      await settled(0);
      await controlsReady();
      await page.evaluate(() => {
        window.__captionSamples = [];
        const start = performance.now();
        const sample = () => {
          const node = document.querySelector(".mc-hero-copy");
          window.__captionSamples.push({
            key: node.dataset.captionKey, phase: node.dataset.captionPhase,
            text: node.querySelector("h1").textContent,
            opacity: Number(getComputedStyle(node.querySelector("h1")).opacity),
            elapsed: performance.now() - start,
          });
          if (performance.now() - start < 1800) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      await click(1);
      await settled(1);
      await page.waitForFunction(() => window.__captionSamples.at(-1)?.elapsed >= 1750);
      const samples = await page.evaluate(() => window.__captionSamples);
      assert.ok(samples.some(sample => sample.key === key(0) && sample.opacity > .05 && sample.opacity < .9), "Outgoing words must visibly fade out");
      assert.ok(samples.some(sample => sample.key === key(1) && sample.opacity > .05 && sample.opacity < .9), "Incoming words must visibly fade in");
      assert.ok(samples.filter(sample => sample.key === key(0)).every(sample => sample.text === (language === "en" ? "Caption 1" : "عنوان 1")));
      await click(2);
      await page.waitForFunction(key => {
        const node = document.querySelector(".mc-hero-copy");
        return node?.dataset.captionKey === key && node.dataset.slideTextVisible === "false";
      }, {}, key(2));
      assert.equal(await page.$eval(".mc-hero-copy h1", node => getComputedStyle(node).visibility), "hidden");
      await click(0);
      await settled(0);
      await click(1);
      await page.waitForFunction(() => document.querySelector(".mc-hero-copy")?.dataset.captionPhase === "leaving");
      await click(0);
      await settled(0);
      await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
      await click(1);
      await settled(1);
      assert.equal(await page.$eval(".mc-hero-copy h1", node => getComputedStyle(node).transitionDuration), "0s");
      await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
      content.page.autoplay = true;
      await page.goto(base + "/", { waitUntil: "networkidle2", timeout: 60000 });
      await settled(0);
      await page.waitForFunction(() => document.querySelector(".mc-hero-copy")?.dataset.captionPhase === "leaving", { timeout: 6000 });
      await settled(1);
      console.log(`PASS ${width}px ${language}: measured fade-out/in, matching words, hidden captions, rapid clicks, reduced motion, autoplay.`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
