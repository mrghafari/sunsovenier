import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";

// Real form interactions, synthetic API responses only. No sign-in bypass,
// database access or request to a real contract mutation endpoint.
const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const source = await (await fetch(base + "/src/components/admin/shop-contracts.tsx")).text();
const main = await (await fetch(base + "/src/main.tsx")).text();
const react = source.match(/from ["']([^"']*\/react\.js[^"']*)["']/)?.[1];
const dom = main.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1];
const query = source.match(/from ["']([^"']*@tanstack_react-query[^"']*)["']/)?.[1];
assert.ok(react && dom && query);
const browser = await puppeteer.launch({
  executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const errors = [], payloads = [];
  let incompleteSeller = false;
  let sellerRevision = 0;
  page.on("pageerror", error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname === "/__contract-activation-probe") return request.respond({
      contentType: "text/html", body: `<div id="probe"></div><script type="module">
        import RefreshRuntime from "/@react-refresh";
        RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;
        window.__vite_plugin_react_preamble_installed__=true;
        await import("/src/index.css");
        localStorage.setItem("language","en");localStorage.setItem("language-manually-selected","true");
        const React=(await import(${JSON.stringify(react)})).default;
        const dom=await import(${JSON.stringify(dom)});
        const {QueryClient,QueryClientProvider}=await import(${JSON.stringify(query)});
        const {LanguageProvider}=await import("/src/contexts/LanguageContext.tsx");
        const Component=(await import("/src/components/admin/shop-contracts.tsx")).default;
        const client=new QueryClient({defaultOptions:{queries:{staleTime:Infinity,retry:false}}});
        window.contractProbeClient=client;
        client.setQueryData(["/api/admin/shop/contracts"],{success:true,contracts:[]});
        (dom.createRoot||dom.default.createRoot)(document.getElementById("probe")).render(
          React.createElement(LanguageProvider,null,React.createElement(QueryClientProvider,{client},React.createElement(Component))));
      </script>`,
    });
    if (url.pathname.startsWith("/api/")) {
      if (request.method() !== "GET") {
        assert.equal(url.pathname, "/api/admin/shop/contracts");
        assert.equal(request.method(), "POST");
        payloads.push(JSON.parse(request.postData()));
        return request.respond({ contentType: "application/json", body: '{"success":true}' });
      }
      const data = url.pathname.endsWith("/seller")
        ? { success: true, seller: { name: "Synthetic seller", registration: incompleteSeller ? "" : "123",
            address: "Seller address", representative: "Seller agent", contact: "Seller contact " + sellerRevision } }
        : url.pathname === "/api/crm/customers/search"
          ? { data: [{ id: -123, customerCode: "9123456", firstName: "Synthetic", lastName: "Buyer" }] }
          : url.pathname.endsWith("/products")
            ? { success: true, products: [{ id: -456, name: "Synthetic product" }] }
            : { success: true, data: {}, contracts: [] };
      return request.respond({ contentType: "application/json", body: JSON.stringify(data) });
    }
    return request.continue();
  });
  await page.goto(base + "/__contract-activation-probe", { waitUntil: "networkidle0" });
  const clickText = async (text, selector = "button") => {
    const handle = await page.evaluateHandle(({ text, selector }) =>
      [...document.querySelectorAll(selector)].find(node => node.textContent.trim() === text), { text, selector });
    assert.ok(handle.asElement(), `Missing ${text}`);
    await handle.asElement().click();
    await handle.dispose();
  };
  const fill = async (selector, value) => {
    await page.click(selector);
    await page.keyboard.down("Control"); await page.keyboard.press("A"); await page.keyboard.up("Control");
    await page.keyboard.press("Backspace");
    if (value) await page.type(selector, value);
  };
  const prepare = async (days) => {
    await clickText("New contract");
    await page.waitForSelector("#seller-name");
    await page.waitForFunction(() => document.getElementById("seller-name").value === "Synthetic seller"
      && !document.getElementById("seller-name").disabled);
    await page.type("#customer-search", "Synthetic");
    await page.waitForSelector('[role="option"]');
    await page.click('[role="option"]');
    await page.waitForFunction(() => document.getElementById("customer-search").placeholder.includes("9123456"));
    await page.click("#contract-delivery-term");
    await page.waitForSelector('[role="option"]');
    await clickText("FCA — Free Carrier", '[role="option"]');
    const productInput = await page.evaluateHandle(() => [...document.querySelectorAll("input")]
      .find(input => input.placeholder.toLowerCase().includes("product")));
    assert.ok(productInput.asElement(), "Missing product search");
    await productInput.asElement().type("Synthetic");
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some(button => button.textContent.trim() === "Synthetic product"));
    await clickText("Synthetic product");
    await fill("#max-0", "10"); await fill("#price-0", "1000");
    for (const id of ["draft-date", "draft-delivery-date"]) {
      await page.click("#" + id);
      await page.waitForSelector(".rmdp-day.rmdp-today span");
      await page.click(".rmdp-day.rmdp-today span");
    }
    for (const [id, value] of Object.entries({
      "buyer-country": "Iraq", "buyer-address": "Buyer address", "buyer-representative": "Buyer agent",
      "draft-location": "Delivery destination", "draft-city": "Dispute city", "draft-days": days,
    })) await fill("#" + id, value);
  };
  for (const days of ["30", "۳۰", "٣٠", " ۳٠ "]) {
    await prepare(days);
    const editedSeller = { name: "Edited seller", registration: "EDITED-123", address: "Edited address",
      representative: "Edited signer", contact: "Edited contact", taxNumber: "TAX-1", country: "Iraq",
      city: "Basra", postalCode: "12345", website: "https://edited.example.test" };
    for (const [key, value] of Object.entries(editedSeller)) await fill("#seller-" + key, value);
    // Background refetches must not overwrite staff edits.
    sellerRevision++;
    await page.evaluate(() => window.contractProbeClient.refetchQueries({ queryKey: ["/api/admin/shop/contracts/seller"] }));
    assert.equal(await page.$eval("#seller-name", input => input.value), "Edited seller");
    await clickText("Create contract");
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    assert.equal(payloads.at(-1).draftData.payment.days, "30");
    assert.equal(payloads.at(-1).isActive, true);
    assert.deepEqual(payloads.at(-1).draftData.seller, editedSeller);
  }
  assert.equal(payloads.length, 4);
  await prepare("۰");
  await fill("#seller-name", "Temporary seller edit");
  await clickText("Refresh from Company Information");
  await page.waitForFunction(() => document.getElementById("seller-name").value === "Synthetic seller"
    && !document.getElementById("seller-name").disabled);
  await clickText("Create contract");
  await page.waitForFunction(() => document.body.textContent.includes("Payment period (positive whole days)"));
  assert.equal(payloads.length, 4);
  assert.equal(await page.evaluate(() => document.activeElement.id), "draft-days");
  await fill("#draft-days", "۳۰");
  await fill("#buyer-country", "");
  await clickText("Create contract");
  await page.waitForFunction(() => document.body.textContent.includes("Complete or correct these fields before activating: Buyer country."));
  assert.equal(payloads.length, 4);
  await clickText("Cancel");
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
  incompleteSeller = true;
  await prepare("۳۰");
  await clickText("Create contract");
  await page.waitForFunction(() => document.body.textContent.includes("Complete or correct these fields before activating: Seller registration ID.")
    && document.body.textContent.includes("Complete seller details in this form"));
  assert.equal(payloads.length, 4);
  assert.equal(await page.evaluate(() => document.activeElement.id), "seller-registration");
  await page.click("#contract-active");
  await clickText("Create contract");
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
  assert.equal(payloads.at(-1).isActive, false);
  assert.equal(payloads.length, 5);
  assert.deepEqual(errors, []);
  console.log("PASS: all ten seller fields editable, seller edits submitted across repeated creation; English/Persian/Arabic/mixed days; invalid days, buyer and seller omissions named and focused; incomplete inactive draft saveable. All writes intercepted.");
} finally {
  await browser.close();
}
