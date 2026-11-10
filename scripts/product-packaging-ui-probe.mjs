import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const component = "/src/components/products/PackagingSpecificationsEditor.tsx";
const source = await (await fetch(base + component)).text();
const main = await (await fetch(base + "/src/main.tsx")).text();
const react = source.match(/from ["']([^"']*\/react\.js[^"']*)["']/)?.[1];
const dom = main.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1];
assert.ok(react && dom);
let saved = null;
const browser = await puppeteer.launch({
  executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
await mkdir("generated-artifacts/packaging-verification", { recursive: true });
try {
  for (const language of ["en", "fa", "ar", "tr"]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewport({ width: language === "fa" ? 430 : 1280, height: 950 });
    await page.setBypassServiceWorker(true);
    await page.setRequestInterception(true);
    page.on("request", request => {
      const path = new URL(request.url()).pathname;
      if (path === "/__packaging-probe") {
        return request.respond({ contentType: "text/html", body: `<main id="root" style="padding:16px"></main><script type="module">
          import RefreshRuntime from "/@react-refresh";
          RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
          await import("/src/index.css");
          const rm=await import(${JSON.stringify(react)});const React=rm.default||rm;
          const dm=await import(${JSON.stringify(dom)});const createRoot=dm.createRoot||dm.default.createRoot;
          const {default:Editor,PackagingSpecificationsView}=await import(${JSON.stringify(component)});
          const {packagingSpecificationsSchema}=await import("/@fs/home/runner/workspace/shared/product-packaging.ts");
          function Harness(){
            const [value,setValue]=React.useState(${JSON.stringify(saved)});
            window.__packaging=value;
            return React.createElement(React.Fragment,null,
              React.createElement(Editor,{value,onChange:setValue,language:${JSON.stringify(language)}}),
              React.createElement("button",{id:"save-fixture",disabled:!packagingSpecificationsSchema.nullable().safeParse(value).success,onClick:()=>fetch("/__packaging-save",{method:"POST",body:JSON.stringify(value)})},"Save fixture"),
              React.createElement("div",{id:"read-view"},React.createElement(PackagingSpecificationsView,{value,language:${JSON.stringify(language)}})));
          }createRoot(document.getElementById("root")).render(React.createElement(Harness));
        </script>` });
      }
      if (path === "/__packaging-save") {
        saved = JSON.parse(request.postData());
        return request.respond({ contentType: "application/json", body: '{"success":true}' });
      }
      return request.continue();
    });
    await page.goto(base + "/__packaging-probe", { waitUntil: "networkidle0", timeout: 60000 });
    await page.waitForSelector("#packaging-nominalCapacityL");
    const setNumber = async (id, value) => {
      await page.click("#packaging-" + id);
      await page.keyboard.down("Control");
      await page.keyboard.press("A");
      await page.keyboard.up("Control");
      await page.keyboard.press("Backspace");
      if (value !== "") await page.type("#packaging-" + id, String(value));
    };
    if (language === "en") {
      await page.$$eval('[role="combobox"]', nodes => { if (nodes.length < 2) throw new Error("Missing container/material selectors"); });
      await (await page.$$('[role="combobox"]'))[0].click();
      await page.waitForSelector('[role="option"]');
      const options = await page.$$('[role="option"]');
      const names = await Promise.all(options.map(option => option.evaluate(node => node.textContent)));
      const drumIndex = names.findIndex(name => /drum/i.test(name));
      assert.ok(drumIndex >= 0);
      await options[drumIndex].click();
      assert.equal(await page.evaluate(() => window.__packaging.containerType), "drum");
      await setNumber("nominalCapacityL", 200);
      await setNumber("usableCapacityL", 250);
      assert.equal(await page.$eval("#save-fixture", node => node.disabled), true);
      await setNumber("usableCapacityL", 190);
      await setNumber("wallThicknessMm", 1.2);
      await setNumber("workingPressureBar", 0);
      await setNumber("testPressureKpa", 250);
      await setNumber("minTemperatureC", -20);
      await setNumber("maxTemperatureC", 60);
      await page.click('[data-testid="packaging-add-property"]');
      assert.equal(await page.$eval("#save-fixture", node => node.disabled), true);
      const row = await page.$eval('[data-testid="packaging-add-property"]', node => {
        const inputs = node.parentElement.querySelectorAll("input");
        inputs.forEach((input, index) => input.dataset.probeField = String(index));
        return inputs.length;
      });
      assert.equal(row, 3);
      await page.type('[data-probe-field="0"]', "Outlet");
      await page.type('[data-probe-field="1"]', "DN50");
      assert.equal(await page.$eval("#save-fixture", node => node.disabled), false,
        JSON.stringify(await page.evaluate(() => ({ value: window.__packaging, errors: [...document.querySelectorAll('[role="alert"]')].map(node => node.textContent) }))));
      await page.click("#save-fixture");
      await page.waitForNetworkIdle({ idleTime: 300 });
      assert.equal(saved.nominalCapacityL, 200);
      assert.equal(saved.workingPressureBar, 0);
      assert.equal(saved.minTemperatureC, -20);
      await page.reload({ waitUntil: "networkidle0", timeout: 60000 });
      assert.equal(await page.$eval("#packaging-wallThicknessMm", node => node.value), "1.2");
      await setNumber("wallThicknessMm", 1.4);
      assert.equal(await page.evaluate(() => window.__packaging.wallThicknessMm), 1.4);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.equal(await page.$eval("#read-view", node => node.textContent.includes("DN50")), true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `generated-artifacts/packaging-verification/${language}.jpg`, type: "jpeg", quality: 75 });
    page.once("dialog", dialog => dialog.dismiss());
    await page.click('[data-testid="packaging-clear"]');
    assert.notEqual(await page.evaluate(() => window.__packaging), null);
    page.once("dialog", dialog => dialog.accept());
    await page.click('[data-testid="packaging-clear"]');
    assert.equal(await page.evaluate(() => window.__packaging), null);
    assert.equal(await page.$eval("#packaging-nominalCapacityL", node => node.value), "");
    assert.deepEqual(errors, []);
    console.log(`PASS ${language}: controlled editor, labels, read-only values, no overflow, confirmed clear${language === "en" ? ", numeric validation, custom rows, fixture save/reload/edit" : ""}.`);
    await page.close();
  }
} finally {
  await browser.close();
}
