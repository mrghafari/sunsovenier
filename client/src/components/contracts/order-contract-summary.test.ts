import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import OrderContractSummary, { type OrderContractSummaryData } from "./order-contract-summary";

const summary: OrderContractSummaryData = {
  id: 1, number: "C2601100", isActive: true, endedAt: null,
  deliveryDate: "2099-12-31", deliveryDateStatus: "valid",
  remainingQuantity: 7, remainingValue: 7000, currency: "IQD",
  items: [{ productId: 1, productName: "Resin", maxQuantity: 10, usedQuantity: 3, remainingQuantity: 7, unitPrice: 1000 }],
};
const render = (value: OrderContractSummaryData | null, language: "en" | "ar" | "fa" | "tr" = "en") =>
  renderToStaticMarkup(createElement(OrderContractSummary, { summary: value, language })).replace(/<!--.*?-->/g, "");

test("current quantity, value, date and contract number are visible in all four languages", () => {
  const headings = { en: "Current contract balance", fa: "وضعیت فعلی قرارداد", ar: "حالة العقد الحالية", tr: "Güncel sözleşme bakiyesi" };
  for (const language of ["en", "fa", "ar", "tr"] as const) {
    const html = render(summary, language);
    assert.ok(html.includes(headings[language]));
    assert.ok(html.includes("C2601100"));
    assert.ok(html.includes("IQD"));
    assert.ok(html.includes("Resin"));
    assert.ok(html.includes("bg-teal-900"));
  }
  assert.match(render(summary), /7,000 IQD/);
  assert.match(render(summary), /days remaining/);
});
test("missing contract information is explicit, not a fabricated zero balance", () => {
  const html = render(null);
  assert.match(html, /Contract information is unavailable/);
  assert.doesNotMatch(html, /0 IQD/);
});
test("missing and legacy malformed dates do not invent a remaining time", () => {
  assert.match(render({ ...summary, deliveryDate: null, deliveryDateStatus: "unset" }), /No delivery date set/);
  const invalid = render({ ...summary, deliveryDate: null, deliveryDateStatus: "unparseable" });
  assert.match(invalid, /No valid delivery date recorded/);
  assert.doesNotMatch(invalid, /days remaining/);
});
test("ended contracts retain their balance and show ended instead of a countdown", () => {
  const html = render({ ...summary, isActive: false, endedAt: "2026-01-01T00:00:00Z" });
  assert.match(html, /Ended/);
  assert.match(html, /7,000 IQD/);
  assert.doesNotMatch(html, /days remaining/);
});
test("temporarily inactive contracts are not incorrectly shown as ended", () => {
  const html = render({ ...summary, isActive: false });
  assert.match(html, /Inactive/);
  assert.match(html, /days remaining/);
  assert.doesNotMatch(html, />Ended</);
});