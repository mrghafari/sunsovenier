const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const puppeteer = require("puppeteer");

// Mount real components with synthetic query-cache data. No sign-in, contract
// mutation, real customer data, or authorization bypass in application code.
const labels = {
  fa: { text: "متن قرارداد", ended: "قراردادهای خاتمه‌یافته", close: "بستن", empty: "برای این قرارداد متنی ثبت نشده است." },
  en: { text: "Contract text", ended: "Ended contracts", close: "Close", empty: "No text has been recorded for this contract." },
  ar: { text: "نص العقد", close: "إغلاق", empty: "لم يتم تسجيل نص لهذا العقد." },
  tr: { text: "Sözleşme metni", close: "Kapat", empty: "Bu sözleşme için metin kaydedilmemiş." },
};
const baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
(async () => {
  const browser = await puppeteer.launch({
    executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
    headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const clickText = async (selector, label) => {
      const handle = await page.evaluateHandle(({ selector, label }) =>
        [...document.querySelectorAll(selector)].find(button => button.textContent.trim() === label), { selector, label });
      const button = handle.asElement();
      assert.ok(button, `Missing button: ${label}`);
      await button.click();
      await handle.dispose();
    };
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on("request", request => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        return request.respond({ status: 200, contentType: "text/html", body: `<!doctype html><html><body>
          <script type="module">
            import RefreshRuntime from "/@react-refresh";
            RefreshRuntime.injectIntoGlobalHook(window);
            window.$RefreshReg$ = () => {};
            window.$RefreshSig$ = () => type => type;
            window.__vite_plugin_react_preamble_installed__ = true;
            await import("/src/index.css");
            window.fixtureReady = true;
          </script></body></html>` });
      }
      return request.continue();
    });
    await page.goto(`${baseUrl}/shop`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForFunction(() => window.fixtureReady);
    for (const entry of ["sales", "legal"]) {
      for (const language of Object.keys(labels)) {
        await page.setViewport({ width: language === "fa" ? 402 : 1280, height: 874 });
        const terms = "شرایط توافق‌شده\nپرداخت ظرف ۱۰ روز؛ تحویل در محل مشتری.\n<script>window.UNSAFE_CONTRACT=true</script>";
        await page.evaluate(async ({ entry, language, terms }) => {
          localStorage.setItem("language", language);
          localStorage.setItem("language-manually-selected", "true");
          const [source, main] = await Promise.all([
            fetch("/src/components/admin/shop-contracts.tsx").then(response => response.text()),
            fetch("/src/main.tsx").then(response => response.text()),
          ]);
          const reactPath = source.match(/from "([^"]*\/react\.js[^"]*)"/)?.[1];
          const domPath = main.match(/from "([^"]*\/react-dom_client\.js[^"]*)"/)?.[1];
          const queryPath = source.match(/from "([^"]*\/@tanstack_react-query\.js[^"]*)"/)?.[1];
          if (!reactPath || !domPath || !queryPath) throw new Error("Cannot resolve app module instances");
          const React = (await import(reactPath)).default;
          const domModule = await import(domPath);
          const { createRoot } = domModule.default || domModule;
          const { QueryClient, QueryClientProvider } = await import(queryPath);
          const { LanguageProvider } = await import("/src/contexts/LanguageContext.tsx");
          const Component = (await import(entry === "sales"
            ? "/src/components/admin/shop-contracts.tsx" : "/src/pages/legal-affairs.tsx")).default;
          window.contractFixtureRoot?.unmount();
          document.querySelector("#contract-fixture")?.remove();
          const container = document.createElement("div");
          container.id = "contract-fixture";
          document.body.appendChild(container);
          const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
          const common = { customerId: -99, customerName: "Synthetic customer", deliveryTerm: "DAP",
            shippingMode: "self_transport", items: [], addendumCount: 0 };
          client.setQueryData(["/api/admin/shop/contracts"], { success: true, contracts: [
            { ...common, id: -1, number: "FIXTURE-CURRENT", terms, draftData: { language: "fa" }, isActive: true, endedAt: null },
            { ...common, id: -2, number: "FIXTURE-ENDED", terms: "", draftData: null, isActive: false, endedAt: "2026-01-01" },
          ] });
          window.contractFixtureRoot = createRoot(container);
          window.contractFixtureRoot.render(React.createElement(QueryClientProvider, { client },
            React.createElement(LanguageProvider, null, React.createElement(Component))));
        }, { entry, language, terms });
        await page.waitForFunction(label => [...document.querySelectorAll("#contract-fixture button")]
          .some(button => button.textContent.trim() === label), {}, labels[language].text);
        await clickText("#contract-fixture button", labels[language].text);
        await page.waitForSelector('[data-testid="contract-text-content"]');
        const result = await page.evaluate(() => {
          const content = document.querySelector('[data-testid="contract-text-content"]');
          const dialog = content.closest('[role="dialog"]');
          return { text: content.textContent, direction: content.dir, number: dialog.textContent,
            executed: !!window.UNSAFE_CONTRACT, fits: dialog.getBoundingClientRect().width <= innerWidth };
        });
        assert.equal(result.text, terms);
        assert.equal(result.direction, "rtl");
        assert.ok(result.number.includes("FIXTURE-CURRENT"));
        assert.equal(result.executed, false);
        assert.equal(result.fits, true);
        await clickText('[role="dialog"] button', labels[language].close);
        await page.waitForFunction(() => !document.querySelector('[data-testid="contract-text-content"]'));
        await page.click('#contract-fixture [role="tab"]:nth-child(2)');
        await page.waitForFunction(() => document.querySelector("#contract-fixture")?.textContent.includes("FIXTURE-ENDED"));
        await clickText("#contract-fixture button", labels[language].text);
        await page.waitForSelector('[data-testid="contract-text-content"]');
        assert.equal(await page.$eval('[data-testid="contract-text-content"]', node => node.textContent), labels[language].empty);
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => !document.querySelector('[data-testid="contract-text-content"]'));
      }
    }
    assert.deepEqual(errors, []);
    console.log("PASS: both contract sections, four languages, current/ended contracts, exact plain text, empty state, close/Escape, RTL and mobile width (16 cases).");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
