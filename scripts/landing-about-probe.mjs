import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const output = "generated-artifacts/landing-about-verification";
const browser = await puppeteer.launch({
  executablePath: execFileSync("bash", ["-c", "command -v chromium || command -v chromium-browser"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
const errors = [];
try {
  await mkdir(output, { recursive: true });
  for (const [language, width] of [["en",1440],["fa",1440],["ar",1440],["tr",1440],["fa",390]]) {
    const page = await browser.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.setBypassServiceWorker(true);
    await page.setViewport({ width, height: 1000 });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.evaluateOnNewDocument(language => {
      localStorage.setItem("language", language);
      localStorage.setItem("language-manually-selected", "true");
    }, language);
    await page.goto(base + "/", { waitUntil: "networkidle0", timeout: 60000 });
    await page.waitForFunction(() => document.querySelector(".mc-chemical-art"));
    await page.$eval("#about", node => node.scrollIntoView({ behavior: "instant", block: "start" }));
    const result = await page.evaluate(() => {
      const svg = document.querySelector(".mc-chemical-art");
      return {
        label: svg.getAttribute("aria-label"),
        dir: document.querySelector(".mc-landing").dir,
        facts: document.querySelectorAll(".mc-about-facts li").length,
        photo: Boolean(document.querySelector(".mc-about-image img")),
        overflow: document.documentElement.scrollWidth > innerWidth,
        bubbleCount: svg.querySelectorAll(".mc-chemical-art__bubble").length,
        animations: [...svg.querySelectorAll("[class]")].every(node => getComputedStyle(node).animationName === "none"),
        clip: Boolean(svg.querySelector("clipPath")),
      };
    });
    assert.equal(result.dir, ["fa","ar"].includes(language) ? "rtl" : "ltr");
    assert.equal(result.facts, 3);
    assert.equal(result.photo, false);
    assert.equal(result.overflow, false);
    assert.equal(result.bubbleCount, 4);
    assert.ok(result.label.length > 30 && result.clip && result.animations);
    if (language === "fa" || language === "en") {
      await page.$eval("#about", node => node.scrollIntoView({ behavior: "instant", block: "start" }));
      await page.screenshot({ path: `${output}/${language}-${width}.jpg`, type: "jpeg", quality: 75 });
    }
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
    await page.$eval(".mc-chemical-art", node => node.scrollIntoView({ behavior: "instant", block: "center" }));
    await page.waitForFunction(() => document.querySelector(".mc-chemical-art")?.classList.contains("is-in-view"));
    const transform = () => page.$eval(".mc-chemical-art__orbit", node => getComputedStyle(node).transform);
    const before = await transform();
    await new Promise(resolve => setTimeout(resolve, 400));
    assert.notEqual(await transform(), before, "Supplied molecule orbit must actually move");
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForFunction(() => !document.querySelector(".mc-chemical-art")?.classList.contains("is-in-view"));
    assert.equal(await page.$eval(".mc-chemical-art__orbit", node => getComputedStyle(node).animationPlayState), "paused");
    await page.close();
    console.log(`PASS About ${language} ${width}px: uploaded artwork, facts, layout, motion, offscreen pausing and reduced motion.`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
