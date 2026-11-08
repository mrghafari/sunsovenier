import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";
const browser = await puppeteer.launch({
  executablePath: execFileSync("bash", ["-c", "command -v chromium || command -v chromium-browser"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const measure = page => page.$eval(".mc-about-copy", node => ({
  heading: Number(getComputedStyle(node.querySelector("h2")).opacity),
  paragraph: Number(getComputedStyle(node.querySelector("p")).opacity),
  color: getComputedStyle(node.querySelector("p")).color,
}));
async function position(page, fraction) {
  await page.$eval(".mc-about-copy", (node, fraction) => {
    let top = 0;
    for (let element = node; element; element = element.offsetParent) top += element.offsetTop;
    scrollTo({ top: top - innerHeight * fraction, behavior: "instant" });
  }, fraction);
}
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage();
    await page.setBypassServiceWorker(true);
    await page.setViewport({ width, height: 1000, hasTouch: width < 768 });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
    await page.goto(`https://${process.env.REPLIT_DEV_DOMAIN}/`, { waitUntil: "networkidle0", timeout: 60000 });
    await page.waitForFunction(() => document.querySelector(".mc-landing.mc-motion-ready .mc-about-copy"));
    if (width > 767) {
      const values = [];
      for (const fraction of [.9, .7, .4]) {
        await position(page, fraction); await pause(420);
        values.push(await measure(page));
      }
      assert.ok(values[0].heading < .5 && values[1].heading > values[0].heading + .2 && values[2].heading > .99, JSON.stringify(values));
      assert.ok(values[0].paragraph < .5 && values[2].paragraph > .99);
      assert.equal(values[0].color, values[2].color, "Preserve original text color");
      await position(page, .9); await pause(420);
      assert.ok((await measure(page)).heading < .5, "Reverse scrolling restores staged text fade");
    } else {
      await position(page, .7); await pause(150);
      const early = await measure(page);
      await pause(1100);
      const middle = await measure(page);
      await pause(1500);
      const normal = await measure(page);
      assert.ok(early.heading < .5 && middle.heading > early.heading + .2 && normal.heading > .99, JSON.stringify({ early, middle, normal }));
    }
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    assert.ok((await measure(page)).heading > .99, "Reduced motion shows full text immediately");
    await page.close();
    console.log(`PASS ${width}px: text progresses from faded to full color, original colors retained, reduced motion supported.`);
  }
} finally { await browser.close(); }
