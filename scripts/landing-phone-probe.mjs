import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const component = "/src/pages/admin/company-information.tsx";
const source = await (await fetch(base + component)).text();
const main = await (await fetch(base + "/src/main.tsx")).text();
const reactUrl = source.match(/from ["']([^"']*\/react\.js[^"']*)["']/)?.[1];
const queryUrl = source.match(/from ["']([^"']*react-query[^"']*)["']/)?.[1];
const domUrl = main.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1];
assert.ok(reactUrl && queryUrl && domUrl);
let company = { id: 1, contactSettings: { supportEmail: "fixture@example.invalid" } };
let saved = 0;
const browser = await puppeteer.launch({
  executablePath: execFileSync("bash", ["-c", "command -v chromium || command -v chromium-browser"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.setBypassServiceWorker(true);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("language", "en");
    localStorage.setItem("language-manually-selected", "true");
  });
  await page.setRequestInterception(true);
  page.on("request", request => {
    const { pathname } = new URL(request.url());
    if (pathname === "/__landing-phone-probe") return request.respond({ contentType: "text/html", body: `
      <!doctype html><html><body><div id="probe"></div><script type="module">
      import RefreshRuntime from "/@react-refresh";
      RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
      await import("/src/index.css");
      const rm=await import(${JSON.stringify(reactUrl)});const React=rm.default||rm;
      const dm=await import(${JSON.stringify(domUrl)});
      const {QueryClient,QueryClientProvider}=await import(${JSON.stringify(queryUrl)});
      const {LanguageProvider}=await import("/src/contexts/LanguageContext.tsx");
      const {getQueryFn}=await import("/src/lib/queryClient.ts");
      const Component=(await import(${JSON.stringify(component)})).default;
      (dm.createRoot||dm.default.createRoot)(document.getElementById("probe")).render(
        React.createElement(QueryClientProvider,{client:new QueryClient({defaultOptions:{queries:{retry:false,queryFn:getQueryFn({on401:"throw"})}}})},
        React.createElement(LanguageProvider,null,React.createElement(Component))));
      </script></body></html>` });
    if (["/api/company-information", "/api/admin/company-information"].includes(pathname)) {
      if (request.method() === "PUT") {
        company = { ...company, ...JSON.parse(request.postData()) };
        saved++;
      }
      return request.respond({ contentType: "application/json", body: JSON.stringify({ success: true, data: company }) });
    }
    // Avoid live mutation and unrelated admin queries; keep actual public homepage APIs.
    if (pathname.startsWith("/api/") && pathname !== "/api/landing-content" && page.url().includes("__landing-phone-probe")) {
      assert.equal(request.method(), "GET", `Unexpected write: ${pathname}`);
      return request.respond({ contentType: "application/json", body: '{"success":true,"data":[]}' });
    }
    return request.continue();
  });
  async function openEditor() {
    await page.goto(base + "/__landing-phone-probe", { waitUntil: "networkidle0", timeout: 60000 });
    await page.waitForSelector('[role="tab"][data-state="active"]', { timeout: 60000 });
    const tabs = await page.$$('[role="tab"]');
    for (const tab of tabs) {
      if ((await tab.evaluate(element => element.textContent)).includes("Phone & WhatsApp")) {
        await tab.click();
        break;
      }
    }
    await page.waitForSelector("#landingPhone");
  }
  async function changeAndSave(value) {
    await page.click("#landingPhone");
    await page.keyboard.down("Control"); await page.keyboard.press("A"); await page.keyboard.up("Control");
    await page.keyboard.press("Backspace");
    if (value) await page.type("#landingPhone", value);
    const nextSave = saved + 1;
    await page.$$eval("button", buttons => buttons.find(button => button.textContent.includes("Save Company Information")).click());
    await page.waitForFunction(() => document.querySelector("#landingPhone")?.value !== undefined);
    const deadline = Date.now() + 10000;
    while (saved < nextSave && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(saved, nextSave);
    assert.equal(company.contactSettings.landingPhone, value);
    assert.equal(company.contactSettings.supportEmail, "fixture@example.invalid");
  }
  await openEditor();
  assert.ok(await page.$eval("#landingPhone", input => input.value.length > 0), "Shows existing legacy header phone");
  await changeAndSave("+964 (750) 123-4567");
  await openEditor();
  assert.equal(await page.$eval("#landingPhone", input => input.value), "+964 (750) 123-4567");
  await page.goto(base, { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForFunction(() => document.querySelector(".mc-phone")?.textContent.includes("123-4567"));
  assert.equal(await page.$eval(".mc-phone", link => link.getAttribute("href")), "tel:+9647501234567");
  await openEditor();
  await changeAndSave("");
  await page.goto(base, { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForSelector(".mc-nav-actions", { timeout: 60000 });
  await page.waitForFunction(() => !document.querySelector(".mc-phone"));
  assert.deepEqual(errors, []);
  console.log("PASS: company field default, edit/save/reload, public text and tel link, clear/hide; no real data changed.");
} finally {
  await browser.close();
}
