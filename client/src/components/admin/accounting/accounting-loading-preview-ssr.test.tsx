import { strict as assert } from "node:assert";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Language } from "@/lib/i18n";
import type { LoadingPreviewReport, LoadingPreviewRow } from "@shared/accounting-loading-preview";
import { LoadingPreviewResult, LoadingPreviewSafetyNotice } from "./accounting-loading-preview";
import { loadingPreviewCopy } from "./accounting-loading-preview-copy";

const row = (overrides: Partial<LoadingPreviewRow> = {}): LoadingPreviewRow => ({
  factId: 841, orderId: 1207, orderNumber: "MC-1207", loadingReference: "LOAD-841", eventDate: "2025-02-18",
  currency: "USD", issues: [], amounts: {
    goods: "1240.50", tax: "62.03", shipping: "18.75", total: "1321.28", dueDate: "2025-03-20",
    lines: [{ orderItemId: 24, weightTons: "12.500", goods: "1240.50", tax: "62.03" }],
  }, ...overrides,
});
const report = (rows: LoadingPreviewRow[] = [row()]): LoadingPreviewReport => ({
  company: { id: 9, name: "Momtazcom Petrochemicals" },
  filters: { companyId: 9, page: 1, pageSize: 25 },
  currencies: [{ code: "USD", decimals: 2 }],
  rows, pagination: { page: 1, pageSize: 25, totalRows: 31 },
  postingAllowed: false, readOnly: true,
  pending: ["INVENTORY_COST_EVIDENCE", "WEIGHT_TOLERANCE_APPROVAL", "AR_AND_SETTLEMENT", "OPENING_AND_CUTOVER"],
});
const render = (language: Language, data = report()) => renderToStaticMarkup(
  <LoadingPreviewResult report={data} language={language} page={data.pagination.page} totalPages={2} changePage={() => undefined}/>,
);

test("real preview result renders every supported locale with correct text direction and pending scope", () => {
  for (const language of ["en", "fa", "ar", "tr"] as const) {
    const html = render(language);
    assert.match(html, /Momtazcom Petrochemicals/);
    assert.match(html, /MC-1207/);
    assert.match(html, /12\.500/);
    assert.match(html, /1321\.28/);
    assert.ok(html.includes(loadingPreviewCopy(language, "readOnly")));
    assert.ok(html.includes(loadingPreviewCopy(language, "postingOff")));
    assert.match(html, language === "fa" || language === "ar" ? /dir="rtl"/ : /dir="ltr"/);
    assert.match(html, /2/);
  }
});

test("safety disclaimer is rendered prominently for each locale", () => {
  for (const language of ["en", "fa", "ar", "tr"] as const) {
    const html = renderToStaticMarkup(<LoadingPreviewSafetyNotice language={language}/>);
    assert.match(html, /role="alert"/);
    assert.ok(html.length > 100);
    assert.match(html, /alert|حساب|محاسبه|HESAPLAMA/i);
  }
  assert.match(renderToStaticMarkup(<LoadingPreviewSafetyNotice language="en"/>), /NOT AN ISSUED INVOICE/);
});

test("null amounts are visibly distinct and every known issue receives a translated explanation", () => {
  const html = render("en", report([row({
    factId: 842,
    amounts: null,
    issues: ["INVALID_CAPTURE", "FIXED_SHIPPING_ALLOCATION_REQUIRED", "TERMS_REQUIRED"],
  })]));
  assert.match(html, /Amounts unavailable/);
  assert.match(html, /Captured values are invalid/);
  assert.match(html, /no allocation is inferred/);
  assert.match(html, /Payment terms are required/);
  assert.doesNotMatch(html, /1,321\.28/);
});

test("unknown issue codes remain visible and pagination is rendered with known evidence fields", () => {
  const html = render("tr", report([row({ issues: ["FUTURE_CAPTURE_FACT" as LoadingPreviewRow["issues"][number]] })]));
  assert.match(html, /Bilinmeyen sorun: FUTURE_CAPTURE_FACT/);
  assert.match(html, /LOAD-841/);
  assert.match(html, /18\.75/);
  assert.match(html, /1 \/ 2/);
  assert.match(html, /Önceki/);
  assert.match(html, /Sonraki/);
});