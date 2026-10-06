const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const puppeteer = require("puppeteer");

// Render the production dialog with synthetic destinations. Never authenticate,
// create an order, save an address or call a payment endpoint.
const addresses = [
  { id: "primary", label: "Primary fixture", address: "PRIMARY-ONLY-DESTINATION", city: "City A", phone: "PHONE-A" },
  { id: "saved:2", label: "Second fixture", address: "SECOND-ONLY-DESTINATION", city: "City B", phone: "PHONE-B" },
  { id: "new", label: "New fixture", address: "NEW-DRAFT-ONLY-DESTINATION", city: "City C", phone: "PHONE-C" },
  { id: "legacy", label: "Legacy fixture", address: "LEGACY-ONLY-DESTINATION", city: "City D", phone: "PHONE-D" },
  { id: "saved:3", label: "Saved new fixture", address: "SAVED-FRESH-ONLY-DESTINATION", city: "City E", phone: "PHONE-E" },
  { id: 123, label: "Numeric fixture", address: "NUMERIC-ONLY-DESTINATION", city: "City F", phone: "PHONE-F" },
];
const confirmLabels = { en: "Place order", fa: "ثبت سفارش", ar: "تأكيد الطلب", tr: "Siparişi ver" };
const baseUrl = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://127.0.0.1:5000";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${baseUrl}/shop`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForFunction(() => document.querySelector("#root")?.textContent?.trim(), { timeout: 45000 });
    await page.evaluate(async () => {
      const componentPath = "/src/components/checkout/order-review-dialog.tsx";
      const [componentSource, mainSource] = await Promise.all([
        fetch(componentPath).then(response => response.text()),
        fetch("/src/main.tsx").then(response => response.text()),
      ]);
      const reactPath = componentSource.match(/from "([^"]*\/react\.js[^"]*)"/)?.[1];
      const domPath = mainSource.match(/from "([^"]*\/react-dom_client\.js[^"]*)"/)?.[1];
      if (!reactPath || !domPath) throw new Error("Cannot resolve the app's React modules");
      const [reactModule, domModule, dialogModule] = await Promise.all([
        import(reactPath), import(domPath), import(componentPath),
      ]);
      const React = reactModule.default || reactModule;
      const ReactDOM = domModule.default || domModule;
      const host = document.createElement("div");
      document.body.append(host);
      window.__reviewAddressTest = { React, root: ReactDOM.createRoot(host), Dialog: dialogModule.default };
    });

    let passed = 0;
    for (const language of Object.keys(confirmLabels)) {
      await page.setViewport(language === "fa" ? { width: 402, height: 874 } : { width: 1280, height: 900 });
      for (const selected of [...addresses, null]) {
        const selectedId = selected ? String(selected.id) : "missing";
        await page.evaluate(({ addresses, selectedId, language }) => {
          const { React, root, Dialog } = window.__reviewAddressTest;
          root.render(React.createElement(Dialog, {
            open: true, onOpenChange() {}, onConfirm() {},
            addresses, selectedAddressId: selectedId,
            items: [{ id: 1, name: "Synthetic test item", quantity: 2, unitPrice: 100 }],
            shippingMethod: "Synthetic shipping", shippingCost: 20, subtotal: 200,
            tax: 0, total: 220, paymentMethod: "bank_receipt", language,
          }));
        }, { addresses, selectedId, language });
        await page.waitForFunction((label, confirmLabel) => {
          const dialog = document.querySelector('[role="dialog"]');
          const button = [...(dialog?.querySelectorAll("button") || [])]
            .find(item => item.textContent.trim() === confirmLabel);
          return button && (label ? dialog.textContent.includes(label) : button.disabled);
        }, { timeout: 10000 }, selected?.address || null, confirmLabels[language]);
        const result = await page.evaluate(confirmLabel => {
          const dialog = document.querySelector('[role="dialog"]');
          const button = [...dialog.querySelectorAll("button")].find(item => item.textContent.trim() === confirmLabel);
          return {
            text: dialog.textContent, disabled: button.disabled,
            radios: dialog.querySelectorAll('input[type="radio"], [role="radiogroup"]').length,
          };
        }, confirmLabels[language]);
        assert.equal(result.radios, 0, "Review must not offer another address selection");
        assert.equal(result.disabled, !selected, "Missing destination must block confirmation");
        for (const address of addresses) {
          if (address === selected) {
            assert.ok(result.text.includes(address.address));
            assert.ok(result.text.includes(address.phone));
          } else {
            assert.ok(!result.text.includes(address.address), `Unselected destination leaked: ${address.id}`);
            assert.ok(!result.text.includes(address.phone), `Unselected phone leaked: ${address.id}`);
          }
        }
        passed++;
      }
    }
    assert.deepEqual(errors, [], "Dialog must render without browser exceptions");
    console.log(`PASS: ${passed} production-dialog cases; selected address only, read-only, no default-address fallback.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
