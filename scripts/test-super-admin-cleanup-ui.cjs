const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const puppeteer = require("puppeteer");

// Render production components in an isolated document; all destructive API calls
// are intercepted with synthetic responses. Never bypass the running app's auth.
(async () => {
  const browser = await puppeteer.launch({
    executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
    headless: true, args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const errors = [], mutations = [];
    let staleOnce = false;
    let previewCount = 0;
    const orders = [
      { id: 7001, orderNumber: "FIXTURE-M1", customerName: "Synthetic Customer", customerEmail: "synthetic@example.invalid", totalAmount: "50", currency: "USD", status: "pending", paymentMethod: "bank_transfer", createdAt: "2026-10-01", canDelete: true, deletionBlockers: [] },
      { id: 7002, orderNumber: "FIXTURE-M2", customerName: "Synthetic Customer", customerEmail: "synthetic@example.invalid", totalAmount: "50", currency: "USD", status: "shipped", paymentMethod: "bank_transfer", createdAt: "2026-10-01", canDelete: false, deletionBlockers: ["SHIPPED"] },
    ];
    page.on("pageerror", error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on("request", async request => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) return request.respond({
        status: 200, contentType: "text/html", body: `<!doctype html><html><body><script type="module">
          import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window);
          window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type;
          window.__vite_plugin_react_preamble_installed__=true;
          await import("/src/index.css"); window.fixtureReady=true;
        </script></body></html>`,
      });
      const path = new URL(request.url()).pathname;
      if (!path.startsWith("/api/")) return request.continue();
      const body = request.postData() ? JSON.parse(request.postData()) : null;
      let result = { success: true }, status = 200;
      if (path === "/api/super-admin/deletable-orders") result = {
        success: true, data: orders, pagination: { total: 2, hasMore: false },
      };
      if (path === "/api/super-admin/contracts") result = {
        success: true, data: [
          { id: 9001, number: "FIXTURE-C1", customerName: "Synthetic Customer", customerCode: "9200001", items: [{ productName: "Synthetic Goods", quantity: 5 }], orderCount: 1, addendumCount: 1, canDelete: true, deletionBlockers: [] },
          { id: 9002, number: "FIXTURE-C2", customerName: "Synthetic Customer", customerCode: "9200001", items: [], orderCount: 1, addendumCount: 0, canDelete: false, deletionBlockers: ["SHIPPED"] },
        ], pagination: { total: 2, limit: 25, hasMore: false },
      };
      if (path.endsWith("/cleanup/preview")) {
        previewCount++;
        result = { success: true, preview: {
          kind: body.kind, mode: "archive", credits: [{ orderId:7001,orderNumber:"FIXTURE-M1",customerId:99001,currency:"USD",
            confirmedPayment:"50.00",previouslyReturned:"10.00",creditAmount:"40.00",reservedRelease:"5.00",alreadyAvailable:"2.00" }],
          targets: body.ids.map(id => ({ id, number: body.kind === "contract" ? "FIXTURE-C1" : "FIXTURE-M1" })),
          linkedOrders: [{ id: 7001, orderNumber: "FIXTURE-M1" }], canDelete: true, deletionBlockers: [],
          effects: [{ table: "order_items", count: 2 }], token: `synthetic-${previewCount}`,
        } };
      }
      if (path.endsWith("/cleanup/delete")) {
        mutations.push(body);
        if (staleOnce) { staleOnce = false; status = 409; result = { success: false, code: "PREVIEW_CHANGED" }; }
        else result = { success: true, deletedIds: body.ids, deletedCount: body.ids.length };
      }
      return request.respond({ status, contentType: "application/json", body: JSON.stringify(result) });
    });
    await page.goto(`https://${process.env.REPLIT_DEV_DOMAIN}/mrg/super-admin-order-management`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.fixtureReady);
    const mount = async language => page.evaluate(async language => {
      localStorage.setItem("language", language);
      localStorage.setItem("language-manually-selected", "true");
      const source = await (await fetch("/src/pages/admin/super-admin-order-management.tsx")).text();
      const main = await (await fetch("/src/main.tsx")).text();
      const React = (await import(source.match(/from "([^"]*\/react\.js[^"]*)"/)[1])).default;
      const dom = await import(main.match(/from "([^"]*\/react-dom_client\.js[^"]*)"/)[1]);
      const { createRoot } = dom.default || dom;
      const { QueryClient, QueryClientProvider } = await import(source.match(/from "([^"]*\/@tanstack_react-query\.js[^"]*)"/)[1]);
      const { LanguageProvider } = await import("/src/contexts/LanguageContext.tsx");
      const Component = (await import("/src/pages/admin/super-admin-order-management.tsx")).default;
      window.cleanupRoot?.unmount(); document.querySelector("#cleanup-fixture")?.remove();
      const container = document.createElement("div"); container.id = "cleanup-fixture"; document.body.appendChild(container);
      window.cleanupRoot = createRoot(container);
      window.cleanupRoot.render(React.createElement(QueryClientProvider,
        { client: new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }) },
        React.createElement(LanguageProvider, null, React.createElement(Component))));
    }, language);
    const findClick = async (selector, text) => {
      const elements = await page.$$(selector);
      for (const element of elements) if ((await element.evaluate(node => node.textContent)).trim() === text) {
        await element.click(); return;
      }
      throw new Error(`Missing ${selector}: ${text}`);
    };
    const languages = {
      en: { contracts: "Contracts", bulk: "Remove selected", delete: "Remove from active lists", cancel: "Cancel" },
      fa: { contracts: "قراردادها", bulk: "خارج‌کردن انتخاب‌شده‌ها", delete: "خارج‌کردن از فهرست فعال", cancel: "انصراف" },
      ar: { contracts: "العقود", bulk: "إزالة المحدد", delete: "إزالة من القوائم النشطة", cancel: "إلغاء" },
      tr: { contracts: "Sözleşmeler", bulk: "Seçilenleri kaldır", delete: "Etkin listelerden kaldır", cancel: "İptal" },
    };
    for (const [language, labels] of Object.entries(languages)) {
      await mount(language);
      await page.waitForFunction(() => document.body.textContent.includes("FIXTURE-M2"));
      const protectedRow = await page.evaluate(() => [...document.querySelectorAll("tbody tr")].find(row => row.textContent.includes("FIXTURE-M2")).querySelectorAll("button[disabled]").length);
      assert.ok(protectedRow >= 2, "protected orders disable selection and deletion");
      await page.click("thead button[role=checkbox]");
      await findClick("button", labels.bulk);
      await page.waitForSelector("#cleanup-confirm");
      assert.match(await page.$eval("[role=dialog]", node => node.textContent), /order_items/);
      const reviewText = await page.$eval("[role=dialog]", node => node.textContent);
      assert.match(reviewText,/40/); assert.match(reviewText,/USD/);
      assert.match(reviewText,/10/); assert.match(reviewText,/5/);
      await page.type("#cleanup-confirm", "wrong");
      assert.equal(await page.evaluate(text => [...document.querySelectorAll("[role=dialog] button")].find(button => button.textContent.trim() === text).disabled, labels.delete), true);
      await page.$eval("#cleanup-confirm", element => { element.focus(); element.select(); });
      await page.keyboard.type("FIXTURE-M1");
      staleOnce = true;
      const before = previewCount;
      await findClick("[role=dialog] button", labels.delete);
      await page.waitForFunction(() => document.querySelector("#cleanup-confirm")?.value === "");
      assert.ok(previewCount > before, "changed preview requires fresh explicit confirmation");
      assert.deepEqual(mutations.at(-1).ids, [7001], "select-all excludes shipped records");
      assert.equal(mutations.at(-1).confirmation, "FIXTURE-M1", "a one-order bulk selection uses the single target number");
      await findClick("[role=dialog] button", labels.cancel);
      await page.waitForFunction(() => !document.querySelector("[role=dialog]"));
      await findClick("[role=tab]", labels.contracts);
      await page.waitForFunction(() => document.body.textContent.includes("FIXTURE-C2"));
      assert.equal(await page.evaluate(() => [...document.querySelectorAll("tbody tr")].find(row => row.textContent.includes("FIXTURE-C2")).querySelector("button").disabled), true);
      await page.evaluate(() => [...document.querySelectorAll("tbody tr")].find(row => row.textContent.includes("FIXTURE-C1")).querySelector("button").click());
      await page.waitForSelector("#cleanup-confirm");
      await page.type("#cleanup-confirm", "FIXTURE-C1");
      await findClick("[role=dialog] button", labels.delete);
      await page.waitForFunction(() => !document.querySelector("[role=dialog]"));
      assert.equal(mutations.at(-1).kind, "contract");
      console.info(`Cleanup UI ${language}: protected rows, frozen targets, dependency review, stale confirmation and contract deletion passed`);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
