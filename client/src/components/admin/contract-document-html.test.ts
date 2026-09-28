import assert from "node:assert/strict";
import { test } from "node:test";
import { renderContractDocumentHtml } from "./contract-document-html";

const logo = "data:image/png;base64,iVBORw0KGgo=";

test("contract output includes the company logo at the physical top-left in RTL and LTR", () => {
  for (const language of ["fa", "ar", "en", "tr"] as const) {
    const html = renderContractDocumentHtml("C2601001", "<terms>", language, logo);
    assert.match(html, /<header><img src="data:image\/png;base64,iVBORw0KGgo=" alt="Company logo"><\/header><h1>/);
    assert.match(html, /header\{direction:ltr;text-align:left;/);
    assert.match(html, new RegExp(`lang="${language}" dir="${language === "fa" || language === "ar" ? "rtl" : "ltr"}"`));
    assert.match(html, /&lt;terms&gt;/);
  }
});

test("contract output rejects an unsafe image URL", () => {
  assert.throws(() => renderContractDocumentHtml("C2601001", "Terms", "fa", '" onerror="alert(1)'), /Invalid company logo/);
});