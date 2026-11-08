import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";

const browser = await puppeteer.launch({
  executablePath: execFileSync("bash", ["-c", "command -v chromium || command -v chromium-browser"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const state = page => page.$eval(".mc-service-card", node => ({
  shade: Number(getComputedStyle(node, "::before").opacity),
  filter: getComputedStyle(node.querySelector("img")).filter,
  duration: getComputedStyle(node, "::before").transitionDuration,
}));
async function open(width, reduced = false) {
  const page = await browser.newPage();
  await page.setBypassServiceWorker(true);
  await page.setViewport({ width, height: 1000 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }]);
  await page.goto(`https://${process.env.REPLIT_DEV_DOMAIN}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForFunction(() => document.querySelector(".mc-service-card"));
  return page;
}
async function position(page, fraction) {
  await page.$eval(".mc-service-card", (node, fraction) => {
    let top = 0;
    for (let current = node; current; current = current.offsetParent) top += current.offsetTop;
    scrollTo({ top: top - innerHeight * fraction, behavior: "instant" });
  }, fraction);
}
try {
  const desktop = await open(1440);
  await position(desktop, .9); await pause(450);
  const dark = await state(desktop);
  await position(desktop, .65); await pause(450);
  const middle = await state(desktop);
  await position(desktop, .4); await pause(450);
  const clear = await state(desktop);
  assert.ok(dark.shade > .65, JSON.stringify(dark));
  assert.ok(middle.shade < dark.shade - .2, JSON.stringify({ dark, middle }));
  assert.ok(clear.shade < .02 && clear.filter.includes("brightness(1)"), JSON.stringify(clear));
  await position(desktop, .9); await pause(450);
  assert.ok((await state(desktop)).shade > .65, "Reverse scroll must restore the staged effect");
  await position(desktop, .4); await pause(450);
  await desktop.click(".mc-detail-link");
  await desktop.waitForFunction(() => document.querySelector(".mc-modal")?.open);
  await desktop.close();
  console.log("PASS desktop: dark → intermediate → normal on real scrolling, reverse scroll and product details.");

  const mobile = await open(390);
  await position(mobile, .7); await pause(120);
  const early = await state(mobile);
  await pause(1050);
  const half = await state(mobile);
  await pause(1600);
  const complete = await state(mobile);
  assert.equal(early.duration, "2.34s");
  assert.ok(early.shade > .65 && half.shade < early.shade - .2 && complete.shade < .02, JSON.stringify({ early, half, complete }));
  await mobile.close();
  console.log("PASS mobile: gradual dark-to-normal appearance over 2.34 seconds.");

  const reduced = await open(1440, true);
  await position(reduced, .7);
  assert.equal(await reduced.$eval(".mc-landing", node => node.classList.contains("mc-motion-ready")), false);
  assert.ok(!(await state(reduced)).filter.includes("brightness("));
  await reduced.close();
  console.log("PASS reduced motion: photos remain immediately normal with no dimming animation.");
} finally {
  await browser.close();
}
