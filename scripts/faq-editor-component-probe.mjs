import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const component = "/src/components/admin/content/FaqEditor.tsx";
const source = await (await fetch(base + component)).text();
const main = await (await fetch(base + "/src/main.tsx")).text();
const reactUrl = source.match(/from ["']([^"']*\/react\.js[^"']*)["']/)?.[1];
const queryUrl = source.match(/from ["']([^"']*react-query[^"']*)["']/)?.[1];
const domUrl = main.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1];
assert.ok(reactUrl && queryUrl && domUrl);
let state = { revision: 0, items: [
  { id: "first", isActive: true, translations: { fa: { question: "پرسش نخست", answer: "پاسخ نخست" } } },
  { id: "second", isActive: true, translations: { fa: { question: "پرسش دوم", answer: "پاسخ دوم" } } },
] };
let conflict = false, saves = 0;
const browser = await puppeteer.launch({
  executablePath: execFileSync("bash", ["-c", "command -v chromium || command -v chromium-browser"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("dialog", dialog => dialog.accept());
  await page.setRequestInterception(true);
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname === "/__faq-editor-probe") return request.respond({ contentType: "text/html", body: `
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
    if (url.pathname === "/api/content-management/faq") {
      if (request.method() === "PUT") {
        if (conflict) return request.respond({ status: 409, contentType: "application/json", body: '{"success":false,"message":"Concurrent edit"}' });
        const incoming = JSON.parse(request.postData());
        assert.equal(incoming.revision, state.revision);
        state = { ...incoming, revision: state.revision + 1 }; saves++;
      }
      return request.respond({ contentType: "application/json", body: JSON.stringify({ success: true, data: state }) });
    }
    return request.continue();
  });
  const selector = id => `[data-testid="${id}"]`;
  const click = id => page.click(selector(id));
  async function fill(id, value) {
    await click(id);
    await page.keyboard.down("Control"); await page.keyboard.press("A"); await page.keyboard.up("Control");
    await page.type(selector(id), value);
  }
  async function save() {
    const previous = saves;
    await click("faq-save");
    await page.waitForFunction(() => !document.querySelector('[data-testid="faq-save"]').textContent.includes("ذخیره…"));
    await page.waitForNetworkIdle({ idleTime: 250 });
    assert.equal(saves, previous + 1);
  }
  await page.goto(base + "/__faq-editor-probe", { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForSelector(selector("faq-add"), { timeout: 60000 });
  await page.select(selector("faq-language"), "fa");
  await fill("faq-answer-first", "پاسخ ویرایش‌شده");
  await save();
  assert.equal(state.items[0].translations.fa.answer, "پاسخ ویرایش‌شده");
  await click("faq-add");
  await click("faq-save");
  await page.waitForSelector('[role="alert"]');
  assert.equal(saves, 1, "Empty new question must not be saved");
  const questions = await page.$$eval('[data-testid^="faq-question-"]', elements => elements.map(el => el.dataset.testid));
  const id = questions.at(-1).slice("faq-question-".length);
  await fill(`faq-question-${id}`, "پرسش تازه");
  await fill(`faq-answer-${id}`, "پاسخ تازه\nخط دوم");
  await save();
  assert.equal(state.items.length, 3);
  await click(`faq-move-up-${id}`);
  await click(`faq-active-${id}`);
  await save();
  assert.equal(state.items[1].id, id);
  assert.equal(state.items[1].isActive, false);
  await page.reload({ waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForSelector(selector(`faq-question-${id}`));
  await page.select(selector("faq-language"), "fa");
  assert.equal(await page.$eval(selector(`faq-answer-${id}`), el => el.value), "پاسخ تازه\nخط دوم");
  await click(`faq-delete-${id}`);
  await save();
  assert.equal(state.items.length, 2);
  conflict = true;
  await fill("faq-question-first", "حفظ پیش‌نویس در تعارض");
  await click("faq-save");
  await page.waitForSelector(selector("faq-reload"));
  assert.equal(await page.$eval(selector("faq-question-first"), el => el.value), "حفظ پیش‌نویس در تعارض");
  await click("faq-reload");
  await page.waitForFunction(() => document.querySelector('[data-testid="faq-question-first"]').value === "پرسش نخست");
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "No horizontal overflow on mobile");
  assert.deepEqual(errors, []);
  console.log("FAQ component passed Persian CRUD, validation, order/visibility, reload persistence, conflict retention/recovery and mobile width. Browser-only fixture APIs; no live data changed or authentication bypassed.");
} finally { await browser.close(); }
