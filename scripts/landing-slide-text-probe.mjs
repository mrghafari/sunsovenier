import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const component = "/src/components/admin/content/LandingSettingsEditor.tsx";
const source = await (await fetch(base + component)).text();
const parentSource = await (await fetch(base + "/src/components/admin/content/LandingPageEditor.tsx")).text();
const queryUrl = parentSource.match(/from ["']([^"']*tanstack_react-query[^"']*)["']/)?.[1];
const main = await (await fetch(base + "/src/main.tsx")).text();
const reactUrl = source.match(/from ["']([^"']*\/react\.js[^"']*)["']/)?.[1];
const domUrl = main.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1];
assert.ok(reactUrl && domUrl && queryUrl);
let state = structuredClone((await (await fetch(base + "/api/landing-content")).json()).data);
state.page.autoplay = false;
for (const slide of state.page.slides) delete slide.showText;
const first = state.page.slides[0].id;
const second = state.page.slides[1].id;
const browser = await puppeteer.launch({
  executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
try {
  let page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setBypassServiceWorker(true);
  await page.setViewport({ width: 1200, height: 1000 });
  await page.setRequestInterception(true);
  const requestHandler = request => {
    const url = new URL(request.url());
    if (url.pathname === "/__slide-text-probe") {
      return request.respond({ contentType: "text/html", body: `<div id="probe"></div><script type="module">
        import RefreshRuntime from "/@react-refresh";
        RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
        await import("/src/index.css");
        const rm=await import(${JSON.stringify(reactUrl)});const React=rm.default||rm;
        const dm=await import(${JSON.stringify(domUrl)});const createRoot=dm.createRoot||dm.default.createRoot;
        const Editor=(await import(${JSON.stringify(component)})).default;
        const seed=${JSON.stringify(state).replaceAll("<", "\\u003c")};
        function Harness(){
          const [content,setContent]=React.useState(seed);window.__slideDraft=content;
          return React.createElement(React.Fragment,null,
            React.createElement("button",{id:"save-fixture",onClick:()=>fetch("/__save-slide-fixture",{method:"POST",body:JSON.stringify(content)})},"Save fixture"),
            React.createElement(Editor,{page:content.page,content,language:"fa",onChange:page=>setContent(current=>({...current,page})),onContentChange:setContent,onImageUploaded:()=>{},uploadImage:async()=>{throw new Error("Not part of this probe")}}));
        }
        let view=React.createElement(Harness);
        if(${url.searchParams.has("full")}){
          localStorage.setItem("language","fa");localStorage.setItem("language-manually-selected","true");
          const {LanguageProvider}=await import("/src/contexts/LanguageContext.tsx");
          const {QueryClient,QueryClientProvider}=await import(${JSON.stringify(queryUrl)});
          const Parent=(await import("/src/components/admin/content/LandingPageEditor.tsx")).default;
          view=React.createElement(QueryClientProvider,{client:new QueryClient()},React.createElement(LanguageProvider,null,React.createElement(Parent,{})));
        }
        createRoot(document.getElementById("probe")).render(view);
      </script>` });
    }
    if (url.pathname === "/__save-slide-fixture") {
      state = JSON.parse(request.postData());
      return request.respond({ contentType: "application/json", body: '{"success":true}' });
    }
    if (url.pathname === "/api/landing-content" || url.pathname === "/api/content-management/landing") {
      if (url.pathname === "/api/content-management/landing" && request.method() === "PUT") {
        assert.ok(page.url().includes("/__slide-text-probe"), "Only the isolated fixture may save");
        state = { ...JSON.parse(request.postData()), revision: state.revision + 1 };
        return request.respond({ contentType: "application/json", body: JSON.stringify({ success: true, data: state }) });
      }
      assert.equal(request.method(), "GET", "Probe must not change live content");
      return request.respond({ contentType: "application/json", body: JSON.stringify({ success: true, data: state }) });
    }
    if (request.resourceType() === "image" && url.pathname.startsWith("/api/landing-")) {
      return request.respond({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#19222e"/></svg>' });
    }
    return request.continue();
  };
  page.on("request", requestHandler);
  await page.goto(base + "/__slide-text-probe", { waitUntil: "networkidle0", timeout: 60000 });
  const control = `[data-testid="slide-text-${first}"]`;
  await page.waitForSelector(control);
  assert.equal(await page.$eval(control, node => node.getAttribute("aria-checked")), "true");
  await page.click(control);
  assert.equal(await page.evaluate(id => window.__slideDraft.page.slides.find(slide => slide.id === id).showText, first), false);
  assert.equal(await page.evaluate(id => window.__slideDraft.page.slides.find(slide => slide.id === id).showText, second), undefined);
  await page.click("#save-fixture");
  await page.waitForNetworkIdle({ idleTime: 300, timeout: 15000 });
  await page.reload({ waitUntil: "networkidle0", timeout: 60000 });
  assert.equal(await page.$eval(control, node => node.getAttribute("aria-checked")), "false");
  await page.click(control);
  assert.equal(await page.evaluate(id => window.__slideDraft.page.slides.find(slide => slide.id === id).showText, first), true);
  console.log("PASS actual settings component: independent switch, fixture save/reload, restore; no live data changed.");

  await page.goto(base + "/__slide-text-probe?full=1", { waitUntil: "networkidle0", timeout: 60000 });
  const imageControl = `[data-testid="slide-image-text-${first}"]`;
  await page.waitForSelector(imageControl, { visible: true });
  assert.equal(await page.$eval(imageControl, node => node.getAttribute("aria-checked")), "false");
  await page.click(imageControl);
  assert.equal(await page.$eval(control, node => node.getAttribute("aria-checked")), "true");
  assert.equal(await page.$eval('[data-testid="landing-save"]', node => node.disabled), false);
  await page.click(control);
  assert.equal(await page.$eval(imageControl, node => node.getAttribute("aria-checked")), "false");
  assert.equal(await page.$eval('[data-testid="landing-save"]', node => node.disabled), true);
  console.log("PASS full landing editor: text button appears on slide image card, stays synchronized with settings and enables Save.");

  const fillCaption = async (slideId, part, text) => {
    const selector = `[data-testid="slide-caption-${slideId}-${part}"]`;
    await page.click(selector);
    await page.keyboard.down("Control");
    await page.keyboard.press("A");
    await page.keyboard.up("Control");
    await page.keyboard.press("Backspace");
    await page.type(selector, text);
  };
  await fillCaption(first, "eyebrow", "Image one");
  await fillCaption(first, "title", "Image one independent headline");
  await fillCaption(first, "description", "Only the first image description");
  await fillCaption(second, "title", "Image two independent headline");
  await page.select(`[data-testid="slide-caption-language-${first}"]`, "fa");
  await fillCaption(first, "title", "عنوان تصویر اول");
  await page.select(`[data-testid="slide-caption-language-${first}"]`, "en");
  assert.equal(await page.$eval(`[data-testid="slide-caption-${first}-title"]`, node => node.value), "Image one independent headline");
  await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === "/api/content-management/landing" && response.request().method() === "PUT"),
    page.click('[data-testid="landing-save"]'),
  ]);
  await page.waitForNetworkIdle({ idleTime: 300, timeout: 15000 });
  assert.equal(state.page.slides[0].title.en, "Image one independent headline");
  assert.equal(state.page.slides[0].title.fa, "عنوان تصویر اول");
  assert.equal(state.page.slides[0].showText, false);
  assert.equal(state.page.slides[1].title.en, "Image two independent headline");
  await page.reload({ waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForSelector(`[data-testid="slide-caption-${first}-title"]`);
  assert.equal(await page.$eval(`[data-testid="slide-caption-${first}-title"]`, node => node.value), "Image one independent headline");
  assert.equal(await page.$eval(imageControl, node => node.getAttribute("aria-checked")), "false");
  console.log("PASS per-image captions: independent slides/languages, real editor Save against isolated fixture, reload retains text and visibility; no live records written.");

  for (const width of process.env.SLIDE_EDITOR_ONLY ? [] : process.env.SLIDE_TEXT_WIDTH ? [Number(process.env.SLIDE_TEXT_WIDTH)] : [1440, 430]) {
    await page.close();
    page = await browser.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.setBypassServiceWorker(true);
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem("language", "en");
      localStorage.setItem("language-manually-selected", "true");
    });
    await page.setRequestInterception(true);
    page.on("request", requestHandler);
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.setViewport({ width, height: 932 });
    await page.goto(base + "/", { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForFunction(() => document.querySelector('.mc-hero-copy[data-slide-text-visible="false"]'));
    assert.equal(await page.$eval(".mc-hero-copy > h1", node => node.textContent), "Image one independent headline");
    const textState = await page.$$eval(".mc-hero-copy > .mc-eyebrow,.mc-hero-copy > h1,.mc-hero-copy > p", nodes => nodes.map(node => getComputedStyle(node).visibility));
    assert.deepEqual(textState, ["hidden", "hidden", "hidden"]);
    await page.waitForSelector(".mc-hero-buttons a", { visible: true });
    const nextIndex = state.page.slides.filter(slide => slide.isActive).findIndex(slide => slide.id === second);
    const dot = `.mc-slide-dots button:nth-child(${nextIndex + 1})`;
    await page.$eval(dot, node => node.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.click(dot);
    await page.waitForFunction(() => document.querySelector('.mc-hero-copy[data-slide-text-visible="true"]'), { timeout: 30000 });
    const restored = await page.$$eval(".mc-hero-copy > .mc-eyebrow,.mc-hero-copy > h1,.mc-hero-copy > p", nodes => nodes.every(node => getComputedStyle(node).visibility === "visible"));
    assert.equal(restored, true);
    assert.equal(await page.$eval(".mc-hero-copy > h1", node => node.textContent), "Image two independent headline");
    console.log(`PASS ${width}px public rendering: exactly three text sections hidden, CTA controls retained, next slide text visible.`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
