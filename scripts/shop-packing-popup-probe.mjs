import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const source = await (await fetch(base + "/src/components/products/PackagingSpecificationsEditor.tsx")).text();
const main = await (await fetch(base + "/src/main.tsx")).text();
const react = source.match(/from ["']([^"']*\/react\.js[^"']*)["']/)?.[1];
const dom = main.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1];
assert.ok(react && dom);
const browser = await puppeteer.launch({
  executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
const value = {
  version: 1, containerType: "drum", material: "steel", nominalCapacityL: 200,
  wallThicknessMm: 1.2, workingPressureBar: 0, reusable: false,
  additionalProperties: [{ name: "Custom seal", value: "Q".repeat(250), unit: "mm" }],
  notes: Array.from({ length: 70 }, (_, i) => `Recorded specification ${i}`).join("\n"),
};
try {
  for (const [language, width] of [["en", 1440], ["fa", 430], ["ar", 430], ["tr", 1280]]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewport({ width, height: 932 });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.setRequestInterception(true);
    page.on("request", request => {
      if (new URL(request.url()).pathname !== "/__shop-packing-probe") return request.continue();
      return request.respond({ contentType: "text/html", body: `<!doctype html><html><head></head><body><div id="root"></div>
        <script type="module">
          import RefreshRuntime from "/@react-refresh";
          RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
          await import("/src/index.css");
          const rm=await import(${JSON.stringify(react)});const React=rm.default||rm;
          const dm=await import(${JSON.stringify(dom)});const createRoot=dm.createRoot||dm.default.createRoot;
          const {default:Packing}=await import("/src/components/products/ProductPackingDialog.tsx");
          window.parentClicks=0;
          const props={language:${JSON.stringify(language)}};
          createRoot(document.getElementById("root")).render(React.createElement("div",{onClick:()=>window.parentClicks++},
            React.createElement(Packing,{...props,productName:"Steel container",value:${JSON.stringify(value)}}),
            React.createElement(Packing,{...props,productName:"Empty container",value:null})));
        </script></body></html>` });
    });
    await page.goto(base + "/__shop-packing-probe", { waitUntil: "networkidle0", timeout: 60000 });
    await page.waitForSelector('[data-testid="product-packing-trigger"]');
    const triggers = await page.$$('[data-testid="product-packing-trigger"]');
    for (const dark of [false, true]) {
      await page.evaluate(dark => document.documentElement.classList.toggle("dark", dark), dark);
      for (const hovered of [false, true]) {
        if (hovered) await triggers[0].hover();
        else await page.mouse.move(0, 0);
        await new Promise(resolve => setTimeout(resolve, 350));
        const colors = await triggers[0].evaluate(node => {
          const style = getComputedStyle(node);
          return { text: style.color, background: style.backgroundColor, icon: getComputedStyle(node.querySelector("svg")).color };
        });
        const luminance = color => {
          const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
            const component = value / 255;
            return component <= .04045 ? component / 12.92 : ((component + .055) / 1.055) ** 2.4;
          });
          return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
        };
        const a = luminance(colors.text), b = luminance(colors.background);
        const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        assert.ok(ratio >= 4.5, `Packing contrast ${ratio.toFixed(2)}:1, dark=${dark}, hover=${hovered}`);
        assert.equal(colors.icon, colors.text);
      }
    }
    await triggers[0].click();
    await page.waitForSelector('[data-testid="product-packing-dialog"]');
    const result = await page.$eval('[data-testid="product-packing-dialog"]', node => ({
      fields: node.querySelectorAll("dt").length,
      values: [...node.querySelectorAll("dd")].map(item => item.textContent),
      text: node.textContent,
      direction: node.getAttribute("dir"),
      fits: node.getBoundingClientRect().left >= 0 && node.getBoundingClientRect().right <= innerWidth,
      scrollable: [...node.querySelectorAll("div")].some(item => item.scrollHeight > item.clientHeight && getComputedStyle(item).overflowY === "auto"),
      horizontalOverflow: node.scrollWidth > node.clientWidth + 1,
    }));
    assert.equal(result.fields, 7, "Only seven populated fixed fields, including false and zero");
    assert.ok(result.values.some(text => /[0۰٠]/.test(text)));
    assert.ok(result.text.includes("Custom seal"));
    assert.ok(result.text.includes("Recorded specification 69"));
    assert.equal(result.direction, language === "fa" || language === "ar" ? "rtl" : "ltr");
    assert.ok(result.fits && result.scrollable && !result.horizontalOverflow, JSON.stringify(result));
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector('[data-testid="product-packing-dialog"]'));
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('[data-testid="product-packing-trigger"]')), true);
    // Trigger interaction must not navigate or activate its surrounding product card.
    assert.equal(await page.evaluate(() => window.parentClicks), 0);
    await triggers[1].click();
    await page.waitForSelector('[data-testid="product-packing-dialog"]');
    assert.equal(await page.$$eval('[data-testid="product-packing-dialog"] dt', nodes => nodes.length), 0);
    assert.ok((await page.$eval('[data-testid="product-packing-dialog"]', node => node.textContent)).includes("Empty container"));
    await page.click('[data-testid="product-packing-dialog"] button');
    await page.waitForFunction(() => !document.querySelector('[data-testid="product-packing-dialog"]'));
    assert.deepEqual(errors, []);
    console.log(`PASS ${language} ${width}px: light/dark normal/hover contrast >=4.5:1, matching icon, popup values/scroll/RTL, close and focus restoration.`);
    await page.close();
  }
} finally {
  await browser.close();
}
