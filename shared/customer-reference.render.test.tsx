import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider } from "../client/src/contexts/LanguageContext";
import { CustomerCodeValue } from "../client/src/components/crm/customer-code-settings";

test("customer references render left-to-right and never expose a database ID", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const missingLabels = {
    en: "Customer number not issued",
    fa: "شماره مشتری صادر نشده",
    ar: "لم يتم إصدار رقم العميل",
    tr: "Müşteri numarası verilmedi",
  };
  try {
    for (const [language, missingLabel] of Object.entries(missingLabels)) {
      Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
        getItem: (key: string) => key === "language" ? language : key === "language-manually-selected" ? "true" : null,
        setItem: () => {},
        removeItem: () => {},
      } });
      const valid = renderToStaticMarkup(<LanguageProvider><CustomerCodeValue code="9123456" /></LanguageProvider>);
      assert.match(valid, /dir="ltr"/);
      assert.match(valid, />9123456<\/span>/);
      for (const code of [undefined, "8", "bad-code"]) {
        const missing = renderToStaticMarkup(<LanguageProvider><CustomerCodeValue code={code} /></LanguageProvider>);
        assert.ok(missing.includes(missingLabel), `${language}: explain the missing reference`);
        assert.doesNotMatch(missing, />8<\/span>/);
      }
    }
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
