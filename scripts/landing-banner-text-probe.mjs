import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";
const browser = await puppeteer.launch({
  executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
try {
  for (const width of [1440, 430]) {
    const page = await browser.newPage();
    await page.setBypassServiceWorker(true);
    await page.setViewport({ width, height: 932, isMobile: width < 768, hasTouch: width < 768 });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem("language", "fa");
      localStorage.setItem("language-manually-selected", "true");
    });
    await page.goto(`https://${process.env.REPLIT_DEV_DOMAIN}`, { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForSelector(".mc-slide-dots", { timeout: 90000 });
    for (const index of [0, 2, 1]) {
      await page.click(`.mc-slide-dots button:nth-child(${index+1})`);
      await page.waitForFunction(i => document.querySelector(`.mc-slide-dots button:nth-child(${i+1})`)?.getAttribute("aria-pressed") === "true", {}, index);
      if (index === 1) {
        assert(await page.$(".mc-hero-copy h1"), "Unlettered banner keeps translated site title");
        assert.equal(await page.$(".mc-hero-artwork"), null);
      } else {
        assert.equal(await page.$(".mc-hero-copy h1"), null, "Lettered banner must not duplicate site title");
        const state = await page.evaluate(async () => {
          const svg = document.querySelector(".mc-hero-artwork");
          const texts = [...svg.querySelectorAll("text")];
          const image = document.querySelector(".mc-hero-slide.is-active").style.backgroundImage.match(/url\(["']?(.*?)["']?\)$/)[1];
          const response = await fetch(image);
          const svgBounds = svg.getBoundingClientRect();
          return { count: texts.length, contentType: response.headers.get("content-type"), dir: svg.getAttribute("direction"),
            fits: texts.every(text => { const b=text.getBoundingClientRect(); return b.left>=-2 && b.right<=innerWidth+2; }),
            heroScroll: document.querySelector(".mc-hero").scrollTop, width: svgBounds.width };
        });
        assert(state.count >= 3);
        assert.match(state.contentType, /^image\/png/);
        assert.equal(state.dir, "ltr");
        assert(state.fits, "Every text layer must fit viewport");
        assert.equal(state.heroScroll, 0);
        await new Promise(r=>setTimeout(r,1400));
        await page.screenshot({path:`generated-artifacts/banner-text/verified-${width}-${index}.png`});
      }
    }
    await page.click('.mc-slide-dots button:nth-child(1)');
    await page.waitForSelector(".mc-hero-artwork");
    await page.click('.mc-hero-buttons a[href="#quote"]');
    await page.waitForFunction(() => !document.querySelector("#quote").hidden);
    assert.equal(await page.$eval(".mc-hero", e => e.scrollTop), 0);
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}: extracted text, image MIME, RTL alignment, slide fallback, quote scrolling`);
    await page.close();
  }
} finally { await browser.close(); }
