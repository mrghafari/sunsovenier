import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";

// Browser-only synthetic fixtures; no app authentication bypass or real writes.
const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const component = "/src/components/admin/shop-contracts.tsx";
const source = await (await fetch(base + component)).text();
const main = await (await fetch(base + "/src/main.tsx")).text();
const reactUrl = source.match(/from ["']([^"']*\/react\.js[^"']*)["']/)?.[1];
const domUrl = main.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1];
const queryUrl = source.match(/from ["']([^"']*@tanstack_react-query[^"']*)["']/)?.[1];
assert.ok(reactUrl && domUrl && queryUrl);
const browser = await puppeteer.launch({
  executablePath: execFileSync("bash", ["-c", "command -v chromium"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage(), errors = [];
  let writes = 0;
  page.on("pageerror", e => errors.push(e.message));
  await page.setRequestInterception(true);
  page.on("request", req => {
    const url = new URL(req.url());
    if (url.pathname === "/__contract-customer-probe") {
      return req.respond({ contentType: "text/html", body: `<div id="probe"></div><script type="module">
        import RefreshRuntime from "/@react-refresh";
        RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;
        window.__vite_plugin_react_preamble_installed__=true;
        await import("/src/index.css");
        localStorage.setItem("language","en");localStorage.setItem("language-manually-selected","true");
        const React=(await import(${JSON.stringify(reactUrl)})).default;
        const dom=await import(${JSON.stringify(domUrl)});
        const createRoot=dom.createRoot||dom.default.createRoot;
        const {QueryClient,QueryClientProvider}=await import(${JSON.stringify(queryUrl)});
        const {LanguageProvider}=await import("/src/contexts/LanguageContext.tsx");
        const Component=(await import(${JSON.stringify(component)})).default;
        const client=new QueryClient({defaultOptions:{queries:{staleTime:Infinity,retry:false}}});
        client.setQueryData(["/api/admin/shop/contracts"],{success:true,contracts:[]});
        createRoot(document.getElementById("probe")).render(React.createElement(LanguageProvider,null,
          React.createElement(QueryClientProvider,{client},React.createElement(Component))));
      </script>` });
    }
    if (url.pathname.startsWith("/api/")) {
      if (req.method() !== "GET") { writes++; return req.abort(); }
      const customer = { id: 123, firstName: "Synthetic", lastName: "Buyer", customerCode: "9123456" };
      const q = (url.searchParams.get("q") || "").replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0));
      const data = url.pathname === "/api/crm/customers/search"
        ? { success: true, data: q === "9123456" || q === "Synthetic" ? [customer] : [] }
        : url.pathname === "/api/admin/shop/contracts/seller"
          ? { success: true, seller: { name: "Synthetic Seller", address: "", registration: "", representative: "", contact: "", country: "", taxNumber: "", city: "", postalCode: "", website: "" } }
          : { success: true, data: {}, contracts: [] };
      return req.respond({ contentType: "application/json", body: JSON.stringify(data) });
    }
    return req.continue();
  });
  await page.goto(base + "/__contract-customer-probe", { waitUntil: "networkidle0" });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some(n => n.textContent.trim() === "New contract"));
  await page.evaluate(() => [...document.querySelectorAll("button")].find(n => n.textContent.trim() === "New contract").click());
  await page.waitForSelector("#customer-search");
  await page.type("#customer-search", "۹۱۲۳۴۵۶");
  await page.waitForFunction(() => {
    const input = document.querySelector("#customer-search");
    return input.value === "" && input.placeholder.includes("Synthetic Buyer") && input.placeholder.includes("9123456");
  });
  assert.ok(await page.$eval('[role="dialog"]', n => n.textContent.includes("Synthetic Buyer") && n.textContent.includes("9123456")));
  assert.ok(await page.$$eval("textarea", nodes => nodes.some(n => n.value.includes("Synthetic Buyer") && n.value.includes("9123456"))));
  await page.type("#customer-search", "9999999");
  await page.waitForFunction(() => document.body.textContent.includes("No matching customer found."));
  assert.ok(await page.$$eval("textarea", nodes => nodes.every(n => !n.value.includes("9123456"))));
  await page.focus("#customer-search");
  await page.keyboard.down("Control");
  await page.keyboard.press("A");
  await page.keyboard.up("Control");
  await page.keyboard.press("Backspace");
  await page.type("#customer-search", "Synthetic");
  await page.waitForSelector('[role="option"]');
  assert.match(await page.$eval('[role="option"]', n => n.textContent), /Synthetic Buyer.*9123456/);
  await page.click('[role="option"]');
  await page.waitForFunction(() => document.querySelector("#customer-search").placeholder.includes("9123456"));
  assert.equal(writes, 0);
  assert.deepEqual(errors, []);
  console.log("Contract form: Persian-digit customer code auto-selects name + number, draft includes both, missing lookup clears old identity, name search supports explicit selection; no real writes.");
} finally { await browser.close(); }
