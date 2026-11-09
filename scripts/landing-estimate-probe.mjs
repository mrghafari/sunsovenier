import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";

const browser = await puppeteer.launch({
  executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  headless: true,
  args: ["--no-sandbox"],
});
const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
try {
  for (const [language, width] of [["en", 1440], ["ar", 390], ["fa", 390], ["tr", 1440]]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setBypassServiceWorker(true);
    await page.setViewport({ width, height: 1000, hasTouch: width < 768 });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.evaluateOnNewDocument(language => {
      localStorage.setItem("language", language);
      localStorage.setItem("language-manually-selected", "true");
    }, language);
    await page.goto(base + "/", { waitUntil: "networkidle2", timeout: 60000 });
    const trigger = "#quote [aria-expanded]";
    await page.waitForSelector(trigger);
    assert.equal(await page.$eval(trigger, node => node.getAttribute("aria-expanded")), "false");
    assert.equal(await page.$eval("#quote form", node => node.getBoundingClientRect().height), 0);
    const collapsedHeight = await page.$eval("#quote", node => node.getBoundingClientRect().height);
    await page.click(trigger);
    await page.waitForFunction(() => document.querySelector("#quote form").getBoundingClientRect().height > 0);
    assert.equal(await page.$eval(trigger, node => node.getAttribute("aria-expanded")), "true");
    assert.ok(await page.$eval("#quote", node => node.getBoundingClientRect().height) > collapsedHeight + 200);
    await page.type("#mc-name", "Estimate toggle test");
    await page.click(trigger);
    await page.focus(trigger);
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("#mc-name").getBoundingClientRect().height > 0);
    assert.equal(await page.$eval("#mc-name", node => node.value), "Estimate toggle test");
    await page.click(trigger);
    await page.click('a[href="#quote"]');
    await page.waitForFunction(() => document.querySelector("#quote [aria-expanded]").getAttribute("aria-expanded") === "true");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

    if (language === "en") {
      let submitted;
      await page.setRequestInterception(true);
      page.on("request", request => {
        if (request.url().endsWith("/api/landing-estimate") && request.method() === "POST") {
          submitted = JSON.parse(request.postData());
          void request.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
        } else void request.continue();
      });
      await page.waitForFunction(() => document.querySelector("#mc-product").options.length > 1);
      const product = await page.$eval("#mc-product", node => node.options[1].value);
      await page.select("#mc-product", product);
      await page.type('#quote [name="email"]', "estimate-probe@example.com");
      await page.type('#quote [name="phone"]', "+9647700000000");
      await page.type('#quote [name="address"]', "Test address");
      await page.click('#quote [type="submit"]');
      await page.waitForFunction(() => document.querySelector("#quote .mc-form-feedback.success"));
      assert.equal(submitted.fullName, "Estimate toggle test");
      assert.equal(submitted.productInterest, product);
      assert.equal(submitted.language, "en");
    }
    assert.deepEqual(errors, []);
    await page.goto(base + "/#quote", { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForFunction(() => document.querySelector("#quote [aria-expanded]")?.getAttribute("aria-expanded") === "true");
    console.log(`PASS ${language} ${width}px: default closed, mouse/keyboard toggle, values retained, CTA/hash open, no overflow${language === "en" ? ", mocked submission preserved" : ""}.`);
    await page.close();
  }
} finally {
  await browser.close();
}
