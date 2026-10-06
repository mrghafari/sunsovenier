import { strict as assert } from "node:assert";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { capitalizationCommandSchema, capitalizationQuerySchema, type CapitalizationPlan } from "@shared/accounting-inventory-capitalization";
import { inventoryCapitalizationsKey, inventoryCapitalizationsUrl } from "./accounting-inventory-capitalization-api";
import { capitalizationBlockerText, capitalizationText } from "./accounting-inventory-capitalization-copy";
import { PlanCard } from "./accounting-inventory-capitalization";

const plan: CapitalizationPlan = {
  companyId: 12, documentId: 71, revision: 4, reference: "PUR-2024-018", kind: "purchase",
  documentDate: "2024-09-12", supplier: "Documented supplier", evidenceReference: "INV-ORIGINAL-18", currency: "USD", baseCurrency: "IQD",
  nativeTotal: "125.50", baseTotal: "163150.00", rate: { id: 9, value: "1300", effectiveOn: "2024-09-12", source: "central_bank" },
  stockAccountId: 18, counterAccount: { id: 42, code: "2104", name: "Supplier invoice liability", type: "liability" },
  lines: [{ lineIndex: 0, productId: 55, productName: "Wheat", batchReference: "B-18", quantityTons: "2.5", nativeCost: "125.50", baseCost: "163150.00" }],
  blockers: [], postingAllowed: true, planHash: "a".repeat(64), posted: null,
};

test("API scope URL, cache key, and command schema remain company-bound and strict", () => {
  const url = new URL(inventoryCapitalizationsUrl(12), "http://local");
  assert.equal(url.pathname, "/api/accounting/v2/inventory-capitalizations");
  assert.deepEqual(Object.fromEntries(url.searchParams), { companyId: "12" });
  assert.deepEqual(inventoryCapitalizationsKey(12), ["/api/accounting/v2/inventory-capitalizations", 12]);
  assert.notDeepEqual(inventoryCapitalizationsKey(12), inventoryCapitalizationsKey(13));
  assert.equal(capitalizationQuerySchema.safeParse({ companyId: "12" }).success, true);
  assert.equal(capitalizationCommandSchema.safeParse({ companyId: 12, documentId: 71, expectedPlanHash: "a".repeat(64), reason: "Verified invoice evidence" }).success, true);
  assert.equal(capitalizationCommandSchema.safeParse({ companyId: 12, documentId: 71, expectedPlanHash: "a".repeat(64), reason: "no", extra: true }).success, false);
  assert.equal(capitalizationCommandSchema.safeParse({ companyId: 12, documentId: 71, expectedPlanHash: "a".repeat(63), reason: "Verified invoice evidence" }).success, false);
});

test("four-language copy covers RTL locales and every shared capitalization blocker", () => {
  const blockers = ["CAPITALIZATION_CLOSED", "DOCUMENT_NOT_APPROVED", "OPEN_PERIOD_REQUIRED", "STOCK_ACCOUNT_REQUIRED", "COUNTER_ACCOUNT_REQUIRED", "OFFICIAL_RATE_REQUIRED", "FOREIGN_OPENING_CARRYING_REQUIRED", "BASE_VALUE_TOO_SMALL", "EXISTING_STOCK_PROOF", "BACKDATED_STOCK_RECONCILIATION_REQUIRED", "STOCK_RECONCILIATION_REQUIRED", "INACTIVE_CURRENCY"];
  for (const language of ["en", "fa", "ar", "ku", "tr"]) {
    assert.ok(capitalizationText(language, "warning"));
    for (const code of blockers) assert.notEqual(capitalizationBlockerText(language, code), code, `${language} lacks ${code}`);
  }
  assert.equal(capitalizationText("tr", "title"), capitalizationText("ku", "title"));
});

test("plan SSR shows documentary cost, counteraccount, and immutable posted references without override fields", () => {
  const html = renderToStaticMarkup(React.createElement(PlanCard, {
    plan, language: "en", canManage: true, reason: { 71: "Approved invoice reviewed" }, setReason: () => {},
    confirmations: { 71: true }, setConfirmations: () => {}, onPost: () => {}, busy: false,
  }));
  assert.match(html, /PUR-2024-018/);
  assert.match(html, /INV-ORIGINAL-18/);
  assert.match(html, /Supplier invoice liability/);
  assert.match(html, /1300/);
  assert.match(html, /Wheat/);
  assert.match(html, /Approved invoice reviewed/);
  assert.doesNotMatch(html, /name="journalId"|name="baseCost"|name="counterAccount"/);

  const postedHtml = renderToStaticMarkup(React.createElement(PlanCard, {
    plan: { ...plan, posted: { id: 19, journalId: 23, bookIds: [81, 82], reason: "Approved invoice reviewed" } },
    language: "en", canManage: true, reason: {}, setReason: () => {}, confirmations: {}, setConfirmations: () => {}, onPost: () => {}, busy: false,
  }));
  assert.match(postedHtml, /#19/);
  assert.match(postedHtml, /#23/);
  assert.match(postedHtml, /#81 · #82/);
  assert.doesNotMatch(postedHtml, /type="checkbox"/);
});
