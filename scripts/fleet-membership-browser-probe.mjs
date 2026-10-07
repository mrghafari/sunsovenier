import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const component = "/src/components/admin/FleetCategoryField.tsx";
const source = await (await fetch(base + component)).text();
const main = await (await fetch(base + "/src/main.tsx")).text();
const reactUrl = source.match(/from ["']([^"']*\/react\.js[^"']*)["']/)?.[1];
const domUrl = main.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1];
assert.ok(reactUrl && domUrl, "Resolve actual Vite module URLs");
const browser = await puppeteer.launch({
  executablePath: execFileSync("bash", ["-c", "command -v chromium || command -v chromium-browser"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on("request", request => {
    if (new URL(request.url()).pathname !== "/__fleet-membership-probe") return request.continue();
    return request.respond({ contentType: "text/html", body: `<div id="probe"></div><script type="module">
      import RefreshRuntime from "/@react-refresh";
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const reactModule = await import(${JSON.stringify(reactUrl)});
      const React = reactModule.default || reactModule;
      const domModule = await import(${JSON.stringify(domUrl)});
      const createRoot = domModule.createRoot || domModule.default.createRoot;
      const Field = (await import(${JSON.stringify(component)})).default;
      const root = createRoot(document.getElementById("probe"));
      function Host({ initial, language }) {
        const [value,setValue] = React.useState(initial);
        return React.createElement("form", { id:"membership-form" },
          React.createElement(Field, { language, value, onChange:setValue }));
      }
      window.mountMembership = (initial,language) => root.render(
        React.createElement(Host, { key:initial+language, initial, language }));
      window.mountMembership("standard","fa");
    </script>` });
  });
  await page.goto(base + "/__fleet-membership-probe", { waitUntil: "networkidle0" });
  await page.waitForSelector('input[name="fleetCategory"]');
  const value = () => page.$eval('input[name="fleetCategory"]', input => input.value);
  assert.equal(await value(), "standard");
  await page.click('input[type="checkbox"]:not(:checked)');
  assert.equal(await value(), "both");
  await page.click('input[type="checkbox"]');
  assert.equal(await value(), "contract");
  await page.click('input[type="checkbox"]:checked');
  assert.equal(await value(), "");
  assert.ok(await page.$('[role="alert"]'));
  for (const language of ["en", "ar", "tr", "fa"]) {
    await page.evaluate(language => window.mountMembership("both", language), language);
    await page.waitForFunction(() => document.querySelector('input[name="fleetCategory"]').value === "both");
    assert.equal(await page.$$eval('input[type="checkbox"]:checked', inputs => inputs.length), 2);
    await page.click('input[type="checkbox"]');
    await page.click('input[type="checkbox"]:checked');
    await page.waitForSelector('[role="alert"]');
    assert.equal(await value(), "");
  }
  assert.deepEqual(errors, []);
  console.log("Real membership field: add second membership, remove either, edit both, four-language empty validation passed.");
} finally { await browser.close(); }
