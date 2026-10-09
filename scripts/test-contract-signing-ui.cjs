const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const puppeteer = require("puppeteer");

// Real components, synthetic API responses only. Never sign a real agreement.
(async () => {
  const browser = await puppeteer.launch({
    executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
    headless: true, args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const errors = [], requests = [];
    let docs = [], emailStatus = "accepted", senderId = null;
    const signature = {
      id: "00000000-0000-4000-8000-000000000001", number: "FIXTURE-C", signerName: "Synthetic Signer",
      signedAt: new Date().toISOString(), emailStatus,
      downloadUrl: "/api/customers/contract-signing/signatures/00000000-0000-4000-8000-000000000001/download",
    };
    page.on("pageerror", error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on("request", async request => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        return request.respond({ status: 200, contentType: "text/html", body: `<!doctype html><html><body>
          <script type="module">
            import RefreshRuntime from "/@react-refresh";
            RefreshRuntime.injectIntoGlobalHook(window);
            window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
            window.__vite_plugin_react_preamble_installed__ = true;
            await import("/src/index.css"); window.fixtureReady = true;
          </script></body></html>` });
      }
      const path = new URL(request.url()).pathname;
      if (!path.startsWith("/api/")) return request.continue();
      let result = { success: true }, status = 200;
      const method = request.method();
      const body = request.postData() ? JSON.parse(request.postData()) : null;
      requests.push({ path, method, body });
      if (path === "/api/customers/contract-signing") result.documents = docs;
      if (path.endsWith("/challenge")) {
        await new Promise(resolve => setTimeout(resolve, 120));
        result = { success: true, challengeId: "00000000-0000-4000-8000-000000000002",
          expiresAt: new Date(Date.now() + 600000).toISOString(), maskedEmail: "s***@example.invalid" };
      }
      if (path.endsWith("/complete")) {
        if (body.code !== "123456") { status = 400; result = { success: false, code: "OTP_INVALID", message: "OTP_INVALID" }; }
        else {
          const saved = { ...signature, emailStatus };
          docs[0] = { ...docs[0], canSign: false, signature: saved, signatures: [saved] };
          result.signature = saved;
        }
      }
      if (path.endsWith("/resend")) {
        const saved = { ...signature, emailStatus: "accepted" };
        docs[0] = { ...docs[0], signature: saved, signatures: [saved] };
        result.signature = saved;
      }
      if (path === "/api/admin/legal-affairs/signing-settings") {
        if (method === "PUT") senderId = body.senderId;
        result = { success: true, senderId, storageConfigured: true,
          senders: [{ id: 1, fromEmail: "legal@example.invalid", fromName: "Legal", categoryName: null }],
          templates: ["Contract signing OTP", "Signed contract copy"].flatMap(name =>
            ["fa", "ar", "en", "tr"].map(language => ({ name, language, isActive: true }))) };
      }
      if (path === "/api/admin/legal-affairs/signatures") result.signatures = [
        { ...signature, customerName: "Synthetic Signer", customerEmail: "signer@example.invalid",
          contractId: 1234567, documentType: "contract",
          downloadUrl: "/api/admin/legal-affairs/signatures/00000000-0000-4000-8000-000000000001/download" },
      ];
      return request.respond({ status, contentType: "application/json", body: JSON.stringify(result) });
    });
    await page.goto(`https://${process.env.REPLIT_DEV_DOMAIN}/customer-profile`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.fixtureReady);
    const mount = async (language, admin = false) => {
      await page.evaluate(async ({ language, admin }) => {
        localStorage.setItem("language", language);
        localStorage.setItem("language-manually-selected", "true");
        const [source, main] = await Promise.all([
          fetch("/src/components/customer/contract-signing.tsx").then(r => r.text()),
          fetch("/src/main.tsx").then(r => r.text()),
        ]);
        const reactPath = source.match(/from "([^"]*\/react\.js[^"]*)"/)[1];
        const domPath = main.match(/from "([^"]*\/react-dom_client\.js[^"]*)"/)[1];
        const queryPath = source.match(/from "([^"]*\/@tanstack_react-query\.js[^"]*)"/)[1];
        const React = (await import(reactPath)).default;
        const dom = await import(domPath);
        const { createRoot } = dom.default || dom;
        const { QueryClient, QueryClientProvider } = await import(queryPath);
        const { LanguageProvider } = await import("/src/contexts/LanguageContext.tsx");
        const Component = (await import(admin ? "/src/pages/legal-affairs.tsx"
          : "/src/components/customer/contract-signing.tsx")).default;
        const { Toaster } = await import("/src/components/ui/toaster.tsx");
        window.signingRoot?.unmount(); document.querySelector("#signing-fixture")?.remove();
        const container = document.createElement("div"); container.id = "signing-fixture"; document.body.appendChild(container);
        window.signingRoot = createRoot(container);
        const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
        window.signingRoot.render(React.createElement(QueryClientProvider, { client },
          React.createElement(LanguageProvider, null, React.createElement(React.Fragment, null,
            React.createElement(Component), React.createElement(Toaster)))));
      }, { language, admin });
    };
    const buttons = async (fragment) => {
      // Dismiss previous case's real toasts so their fixed overlay cannot intercept clicks.
      await page.evaluate(() => document.querySelectorAll("[toast-close]").forEach(el => el.click()));
       const handle = await page.evaluateHandle(fragment => [...document.querySelectorAll("#signing-fixture button, [role='dialog'] button")]
        .find(button => button.textContent.includes(fragment)), fragment);
      assert.ok(handle.asElement(), `Missing button: ${fragment}`);
      await handle.asElement().evaluate(el => el.scrollIntoView({ block: "center" }));
      await handle.asElement().click(); await handle.dispose();
    };
    const requestLabels = { fa: "ارسال کد تأیید به ایمیل", ar: "إرسال رمز تحقق إلى بريدي", en: "Email me a verification code", tr: "E-posta doğrulama kodu gönder" };
    const finishLabels = { fa: "تأیید و امضا", ar: "تحقق ووقّع", en: "Verify and sign", tr: "Doğrula ve imzala" };
    for (const language of ["fa", "ar", "en", "tr"]) {
      await page.setViewport({ width: language === "fa" ? 402 : 1280, height: 900 });
      emailStatus = language === "fa" ? "failed" : "accepted";
      const terms = (language === "fa" || language === "ar" ? "متن قرارداد و شرایط پرداخت و تحویل\n" : "Agreement terms, payment and delivery.\n").repeat(70);
      docs = [
        { key: "contract:1234567", contractId: 1234567, addendumId: null, number: "FIXTURE-C", type: "contract",
          terms, language, versionHash: "a".repeat(64), canSign: true, signature: null, signatures: [] },
        { key: "addendum:1234568", contractId: 1234567, addendumId: 1234568, number: "FIXTURE-A", type: "addendum",
          terms, language, versionHash: "b".repeat(64), canSign: true, signature: null, signatures: [] },
      ];
      // A new fixture document isolates Radix's global portal/scroll-lock lifecycle.
      await page.goto(`https://${process.env.REPLIT_DEV_DOMAIN}/customer-profile`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.fixtureReady);
      await mount(language);
      await page.waitForSelector('[data-testid="customer-contract-terms"]');
      assert.equal(await page.$eval('[role="checkbox"]', el => el.disabled), true, "reading acknowledgement must be gated by text viewport");
      await page.$eval('[data-testid="customer-contract-terms"]', el => el.scrollTo(0, el.scrollHeight));
      await page.waitForFunction(() => !document.querySelector('[role="checkbox"]').disabled);
      const checks = await page.$$('[role="checkbox"]');
      assert.equal(checks.length, 4);
      for (const checkbox of checks) await checkbox.click();
      await page.type('input[autocomplete="name"]', "Synthetic Signer");
      const ink = await page.$("canvas");
      await ink.evaluate(el => el.scrollIntoView({ block: "center" }));
      const bounds = await ink.boundingBox();
      await page.mouse.move(bounds.x + bounds.width * .1, bounds.y + bounds.height * .3);
      await page.mouse.down();
      await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height * .7, { steps: 8 });
      await page.mouse.move(bounds.x + bounds.width * .8, bounds.y + bounds.height * .2, { steps: 8 });
      await page.mouse.up();
      await buttons(requestLabels[language]);
      try { await page.waitForSelector('input[autocomplete="one-time-code"]', { timeout: 7000 }); }
      catch (error) { console.error("Fixture diagnostics", { language, requests: requests.slice(-5), errors }, await page.$eval("#signing-fixture", el => el.innerText)); throw error; }
      assert.equal(await page.$eval('input[autocomplete="name"]', el => el.disabled), true);
      const challenge = requests.filter(r => r.path.endsWith("/challenge")).at(-1);
      assert.equal(challenge.body.versionHash, "a".repeat(64));
      assert.equal(challenge.body.consent, true);
      assert.ok(challenge.body.strokes.flat().every(point => point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1));
      await page.type('input[autocomplete="one-time-code"]', "123456");
      await buttons(finishLabels[language]);
      await page.waitForSelector('a[href*="/signatures/"][href$="/download"]');
      assert.equal(await page.$('input[autocomplete="name"]'), null);
      assert.ok(docs[0].signature);
      await buttons("FIXTURE-A");
      await page.waitForSelector('input[autocomplete="name"]');
      assert.equal(await page.$eval('input[autocomplete="name"]', el => el.value), "");
      assert.equal(await page.$('input[autocomplete="one-time-code"]'), null);
      assert.equal(await page.$eval('[role="checkbox"]', el => el.getAttribute("data-state")), "unchecked");
      assert.equal(await page.$eval("canvas", el => [...el.getContext("2d").getImageData(0, 0, el.width, el.height).data].some(value => value)), false);
      await mount(language, true);
       await page.waitForSelector('[data-testid="legal-signing-settings-button"]');
       assert.equal(await page.$('[role="combobox"]'), null, "Signing settings must not appear at the bottom of the page");
       await page.click('[data-testid="legal-signing-settings-button"]');
      await page.waitForSelector('[role="combobox"]');
      await page.click('[role="combobox"]');
      await page.waitForSelector('[role="option"]');
      const option = await page.evaluateHandle(() => [...document.querySelectorAll('[role="option"]')]
        .find(el => el.textContent.includes("legal@example.invalid")));
      await option.asElement().click(); await option.dispose();
      // Save is the only non-outline settings action; locate by supplied labels.
      const saveLabels = { fa: "ذخیره", ar: "حفظ", en: "Save", tr: "Göndericiyi kaydet" };
      await buttons(saveLabels[language]);
      await page.waitForFunction(() => ![...document.querySelectorAll("#signing-fixture button")].some(el => el.disabled));
      assert.equal(senderId, 1);
      await page.waitForSelector('a[href^="/api/admin/legal-affairs/signatures/"]');
      assert.equal(await page.$eval('a[href="/mrg/email-templates-central"]', el => el.getAttribute("href")), "/mrg/email-templates-central");
       assert.equal(await page.$eval('[role="dialog"]', el => el.getBoundingClientRect().width <= innerWidth), true);
       if (language === "fa") await page.screenshot({ path: "/tmp/legal-signing-settings-mobile.jpg" });
       await page.click('[role="dialog"] > button');
       await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
       assert.equal(await page.$('[role="combobox"]'), null);
       await page.click('[data-testid="legal-signing-settings-button"]');
       await page.waitForFunction(() => document.querySelector('[role="combobox"]')?.textContent.includes("legal@example.invalid"));
       await page.evaluate(() => document.querySelectorAll("[toast-close]").forEach(el => el.click()));
       await page.keyboard.press("Escape");
       await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    }
    assert.deepEqual(errors, []);
    console.log("PASS: customer read/consent/authority gates, real pointer signature, OTP freeze/submit, signed download, version switching reset, admin sender settings and signed PDF links in fa/ar/en/tr; all API mutations intercepted.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
