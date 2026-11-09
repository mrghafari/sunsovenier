import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";

const browser = await puppeteer.launch({
  executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  headless: true,
  args: ["--no-sandbox"],
});
const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function swipePageUp(session, height) {
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart", touchPoints: [{ x: 18, y: 130 }],
  });
  for (let step = 1; step <= 16; step++) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 18, y: 130 + step * (height - 250) / 16 }],
    });
    await pause(20);
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await pause(200);
}

async function assertUntrapped(page) {
  const state = await page.evaluate(() => ({
    heroScroll: document.querySelector(".mc-hero").scrollTop,
    landingScroll: document.querySelector(".mc-landing").scrollTop,
    bodyOverflow: getComputedStyle(document.body).overflow,
  }));
  assert.equal(state.heroScroll, 0, "Quote opening must not scroll the clipped hero");
  assert.equal(state.landingScroll, 0, "Only the document should scroll");
  assert.notEqual(state.bodyOverflow, "hidden", "The document must not be locked");
}

try {
  for (const [language, width, height] of [["en", 430, 932], ["fa", 430, 932], ["en", 1440, 900]]) {
    if (process.env.QUOTE_SCROLL_WIDTH && width !== Number(process.env.QUOTE_SCROLL_WIDTH)) continue;
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setBypassServiceWorker(true);
    await page.setViewport({ width, height, isMobile: width < 768, hasTouch: width < 768 });
    await page.evaluateOnNewDocument(language => {
      localStorage.setItem("language", language);
      localStorage.setItem("language-manually-selected", "true");
    }, language);
    await page.goto(base, { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForFunction(() => Boolean(document.querySelector('.mc-hero-buttons a[href="#quote"]')), { timeout: 60000 });
    if (width < 768) await page.tap('.mc-hero-buttons a[href="#quote"]');
    else await page.click('.mc-hero-buttons a[href="#quote"]');
    await page.waitForFunction(() => !document.querySelector("#quote").hidden && scrollY > 0);
    await pause(width < 768 ? 150 : 1000);
    await assertUntrapped(page);
    const session = await page.createCDPSession();
    if (width < 768) {
      await page.focus("#mc-name");
      await page.setViewport({ width, height: 650, isMobile: true, hasTouch: true });
      await page.evaluate(() => document.activeElement?.blur());
      await assertUntrapped(page);
      for (let count = 0; count < 3; count++) await swipePageUp(session, 650);
    } else {
      await page.mouse.wheel({ deltaY: -3000 });
    }
    await page.waitForFunction(() => scrollY <= 2, { timeout: 10000 });
    await assertUntrapped(page);
    await page.setViewport({ width, height, isMobile: width < 768, hasTouch: width < 768 });
    await page.click('.mc-hero-buttons a[href="#quote"]');
    await page.waitForFunction(() => scrollY > 0);
    await assertUntrapped(page);
    await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForFunction(() => document.querySelector("#quote")?.hidden === false);
    await pause(500);
    await assertUntrapped(page);
    assert.deepEqual(errors, []);
    console.log(`PASS ${language} ${width}×${height}: quote opens, document scrolls back to top, no inner scroll trap, repeated open and #quote reload${width < 768 ? ", touch swipe and smaller viewport" : ""}.`);
    await context.close();
  }
} finally {
  await browser.close();
}
