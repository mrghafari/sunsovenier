import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const component = "/src/components/admin/content/LandingPageEditor.tsx";
const source = await (await fetch(base + component)).text();
const main = await (await fetch(base + "/src/main.tsx")).text();
const reactUrl = source.match(/from ["']([^"']*\/react\.js[^"']*)["']/)?.[1];
const queryUrl = source.match(/from ["']([^"']*react-query[^"']*)["']/)?.[1];
const domUrl = main.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1];
assert.ok(reactUrl && queryUrl && domUrl);
let state = (await (await fetch(base + "/api/landing-content")).json()).data;
let saves = 0, submissions = [];
const browser = await puppeteer.launch({
  executablePath: execFileSync("bash", ["-c", "command -v chromium || command -v chromium-browser"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("dialog", dialog => dialog.accept());
  await page.setRequestInterception(true);
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname === "/__landing-dashboard-probe") return request.respond({ contentType: "text/html", body: `
      <div id="probe"></div><script type="module">
      localStorage.setItem("language","fa");localStorage.setItem("language-manually-selected","true");
      import RefreshRuntime from "/@react-refresh";
      RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
      await import("/src/index.css");
      const rm=await import(${JSON.stringify(reactUrl)});const React=rm.default||rm;
      const dm=await import(${JSON.stringify(domUrl)});const createRoot=dm.createRoot||dm.default.createRoot;
      const {QueryClient,QueryClientProvider}=await import(${JSON.stringify(queryUrl)});
      const {LanguageProvider}=await import("/src/contexts/LanguageContext.tsx");
      const Editor=(await import(${JSON.stringify(component)})).default;
      createRoot(document.getElementById("probe")).render(React.createElement(QueryClientProvider,{client:new QueryClient({defaultOptions:{queries:{retry:false}}})},React.createElement(LanguageProvider,null,React.createElement(Editor))));
      </script>` });
    if (["/api/content-management/landing", "/api/landing-content"].includes(url.pathname)) {
      if (request.method() === "PUT") {
        const incoming = JSON.parse(request.postData());
        assert.equal(incoming.revision, state.revision);
        state = { ...incoming, revision: incoming.revision + 1 }; saves++;
      }
      return request.respond({ contentType: "application/json", body: JSON.stringify({ success: true, data: state }) });
    }
    if (url.pathname === "/api/content-management/landing/inquiries") return request.respond({
      contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [
        { id: 999, firstName: "Synthetic", lastName: "Customer", email: "probe@example.invalid", company: "Probe", productInterest: "IBC", message: "[LANDING_ESTIMATE]\nSynthetic dashboard request", createdAt: "2026-01-01T00:00:00Z" },
      ], hasMore: false } }),
    });
    if (url.pathname === "/api/landing-estimate") {
      submissions.push(JSON.parse(request.postData()));
      return request.respond({ status: 201, contentType: "application/json", body: '{"success":true,"id":999}' });
    }
    request.continue();
  });
  async function replace(handle, value) {
    await handle.click(); await page.keyboard.down("Control"); await page.keyboard.press("A"); await page.keyboard.up("Control"); await handle.type(value);
  }
  async function open(group) {
    await page.$eval(`[data-setting-group="${group}"]`, element => {
      if (element.tagName === "DETAILS") element.open = true;
      const parent = element.closest("details"); if (parent) parent.open = true;
    });
  }
  async function field(group, text, value) {
    await open(group);
    const labels = await page.$$(`[data-setting-group="${group}"] label`);
    for (const label of labels) {
      if ((await label.evaluate(element => element.textContent)).includes(text)) {
        const target = await label.$("input:not([type=checkbox]),textarea") ||
          await page.$(`#${await label.evaluate(element => CSS.escape(element.htmlFor))}`);
        if (target) { await replace(target, value); return; }
      }
    }
    throw new Error(`Missing field ${group}: ${text}`);
  }
  await page.goto(base + "/__landing-dashboard-probe", { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForSelector('[data-testid="landing-language"]', { timeout: 60000 });
  await page.select('[data-testid="landing-language"]', "fa");
  await field("text-hero", "عنوان بنر", "عنوان مدیریت‌شده آزمایشی");
  await field("text-about", "عنوان درباره", "درباره مدیریت‌شده");
  await field("text-footer", "حق نشر", "حقوق آزمایشی ممتاز");
  await field("sections", "شماره نمایشی", "+964 123456789");
  await page.click('[data-testid="landing-section-process"]');
  await open("stats");
  const faStats = await page.$$('[data-setting-group="stats"] fieldset');
  await replace(await faStats[0].$("input"), "۹۹۹");
  await open("navigation");
  const firstLink = await page.$('[data-setting-group="navigation"] article');
  const navInputs = await firstLink.$$("input:not([type=checkbox])");
  await replace(navInputs[0], "/contact");
  await replace(navInputs[1], "پیوند مدیریت‌شده");
  await open("form");
  const formRows = await page.$$('[data-setting-group="form"] > div > div');
  await (await formRows[3].$('input[type=checkbox]')).click();
  await open("cards");
  await page.click('[data-setting-group="cards"] article input[type=checkbox]');
  await page.click('[data-testid="landing-save"]');
  await page.waitForNetworkIdle({ idleTime: 300 });
  assert.equal(saves, 1, "Settings must save successfully");
  assert.equal(state.page.texts.fa.heroTitle, "عنوان مدیریت‌شده آزمایشی");
  assert.equal(state.page.sections.process, false);
  assert.equal(state.page.form.fields.address.visible, false);
  assert.equal(state.page.form.fields.address.required, false);
  assert.equal(state.page.cards.drum220.isActive, false);
  assert.equal(state.page.stats.fa[0].value, "۹۹۹");
  await page.reload({ waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForSelector('[data-testid="landing-save"]');
  assert.equal(await page.$eval('[data-testid="landing-save"]', el => el.disabled), true, "Reloaded state is saved, not dirty");
  const inboxText = await page.$eval('[aria-label="درخواست‌های صفحه اصلی / Landing inquiries"]', el => el.textContent);
  assert.ok(inboxText.includes("Synthetic"));
  await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => document.querySelector(".mc-hero h1")?.textContent === "عنوان مدیریت‌شده آزمایشی", { timeout: 90000 });
  assert.equal(await page.$(".mc-process"), null);
  assert.equal(await page.$("#mc-address"), null);
  assert.equal(await page.$eval(".mc-phone", el => el.textContent), "+964 123456789");
  assert.ok(await page.$eval(".mc-stats", el => el.textContent.includes("۹۹۹")));
  assert.ok(await page.$eval(".mc-footer-bottom", el => el.textContent.includes("حقوق آزمایشی ممتاز")));
  assert.equal(await page.$eval(".mc-nav-links a", el => el.textContent), "پیوند مدیریت‌شده");
  assert.equal(await page.$eval(".mc-nav-links a", el => el.getAttribute("href")), "/contact");
  assert.equal(await page.$$eval(".mc-service-card", nodes => nodes.length), 5);
  await page.select("#mc-product", "ibc1000");
  for (const [name, value] of Object.entries({ fullName: "Synthetic Customer", email: "probe@example.invalid", phone: "+12345" })) {
    await page.$eval(`[name="${name}"]`, (el, text) => { el.value = text; }, value);
  }
  await page.$eval(".mc-estimate-card form", form => form.requestSubmit());
  await page.waitForSelector(".mc-form-feedback.success");
  assert.equal(submissions.length, 1);
  assert.equal(submissions[0].address, "");
  assert.equal(submissions[0].productInterest, "ibc1000");
  await page.setViewport({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Mobile layout fits");
  assert.deepEqual(errors, []);
  console.log("Dashboard-to-home checks passed: Persian copy, links, contact, stats, section visibility, card visibility, optional fields, shared-save reload and inquiry display. Form requests/API saves were browser fixtures; real auth was not bypassed and live content was not changed.");
} finally { await browser.close(); }
