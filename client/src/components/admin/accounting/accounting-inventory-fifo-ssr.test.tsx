import { strict as assert } from "node:assert";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Language } from "@/lib/i18n";
import type { InventoryFifoReport, FifoLoading } from "@shared/accounting-inventory-fifo";
import { InventoryFifoError, InventoryFifoResult, InventoryFifoSafetyNotice, InventoryFifoStaleScopeNotice, inventoryFifoScopeMatches } from "./accounting-inventory-fifo";
import { inventoryFifoCopy, inventoryFifoIssueCopy } from "./accounting-inventory-fifo-copy";
import "./accounting-inventory-fifo-api.test";

const load = (overrides: Partial<FifoLoading> = {}): FifoLoading => ({
  factId: 501, orderId: 742, loadingReference: "TRUCK-24 / weighbridge 3", eventDate: "2025-04-12",
  lines: [{
    orderItemId: 83, productId: 19, quantityTons: "14.275", shortfallTons: "1.125",
    allocations: [
      { documentId: 210, documentRevision: 4, documentReference: "PUR-IR-210", documentDate: "2025-03-02", lineIndex: 0, batchReference: "LOT-A9", quantityTons: "9.000", currency: "IQD", documentedCost: "184500.750" },
      { documentId: 211, documentRevision: 2, documentReference: "OPEN-IR-04", documentDate: "2025-03-10", lineIndex: 1, batchReference: "LOT-B2", quantityTons: "4.150", currency: "USD", documentedCost: "720.00" },
      { documentId: 212, documentRevision: 1, documentReference: "PUR-IR-212", documentDate: "2025-03-12", lineIndex: 0, batchReference: "LOT-C1", quantityTons: "1.125", currency: "IQD", documentedCost: "0" },
    ],
    issues: ["DOCUMENTED_STOCK_SHORTFALL"],
  }],
  issues: [],
  documentedCosts: [{ currency: "IQD", amount: "184500.750" }, { currency: "USD", amount: "720.00" }],
  ...overrides,
});
const report = (rows: FifoLoading[] = [load()]): InventoryFifoReport => ({
  company: { id: 7, name: "Momtaz Chemical Trading" }, rows,
  pagination: { page: 1, pageSize: 20, totalRows: rows.length },
  sourceDocumentCount: 18, historyCount: 63,
  basis: "current_approved_documents", valuationStatus: "documentary_simulation",
  postingAllowed: false, stockChanged: false, readOnly: true,
  pending: ["STOCK_OPENING_RECONCILIATION", "HISTORICAL_CONSUMPTION_RECONCILIATION", "BASE_CARRYING_VALUES", "INVOICE_CONSUMER"],
});
const render = (language: Language, data = report()) => renderToStaticMarkup(
  <InventoryFifoResult report={data} language={language} page={data.pagination.page} totalPages={1} changePage={() => undefined}/>,
);

test("FIFO documentary results render empty, provenance, disclosures, and native-currency evidence in all locales", () => {
  for (const language of ["fa", "ar", "en", "tr"] as const) {
    const emptyHtml = render(language, report([]));
    assert.ok(emptyHtml.includes(inventoryFifoCopy(language, "empty")));
    assert.ok(emptyHtml.includes(inventoryFifoCopy(language, "noCosts")));
    assert.match(emptyHtml, language === "fa" || language === "ar" ? /dir="rtl"/ : /dir="ltr"/);

    const html = render(language);
    for (const evidence of ["TRUCK-24 / weighbridge 3", "14.275", "PUR-IR-210", "OPEN-IR-04", "LOT-A9", "210", "184500.750", "720.00", "IQD", "USD", "2025-03-02", "4.150"]) {
      assert.ok(html.includes(evidence), `${language} output missing ${evidence}`);
    }
    assert.ok(html.includes(inventoryFifoCopy(language, "permissions")));
    assert.ok(html.includes(inventoryFifoCopy(language, "sourceDocuments")));
    assert.ok(html.includes(inventoryFifoCopy(language, "replayHelp")));
    assert.ok(html.includes(inventoryFifoCopy(language, "shortage")));
    assert.ok(html.includes(inventoryFifoIssueCopy(language, "DOCUMENTED_STOCK_SHORTFALL")));
  }
});

test("a zero allocation cost from rounding is a known native-currency amount", () => {
  for (const language of ["fa", "ar", "en", "tr"] as const) {
    const knownZero = load({
      lines: [{
        ...load().lines[0],
        shortfallTons: "0",
        issues: [],
        allocations: [{ ...load().lines[0].allocations[0], documentedCost: "0" }],
      }],
      documentedCosts: [{ currency: "IQD", amount: "0" }],
    });
    const html = render(language, report([knownZero]));
    assert.match(html, />0 IQD</);
    assert.match(html, />0 t</);
    assert.doesNotMatch(html, new RegExp(inventoryFifoCopy(language, "noCost").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("previous-shortfall and ambiguous-identity rows distinguish unknown shortage and unknown total from zero in every locale", () => {
  const unknownLine = (issue: "PREVIOUS_SHORTFALL" | "AMBIGUOUS_LAYER_IDENTITY", factId: number): FifoLoading => {
    const base = load();
    return {
      ...base,
      factId,
      issues: [issue],
      documentedCosts: null,
      lines: base.lines.map(line => ({ ...line, shortfallTons: null, allocations: [], issues: [issue] })),
    };
  };
  const unknownRows = report([unknownLine("PREVIOUS_SHORTFALL", 601), unknownLine("AMBIGUOUS_LAYER_IDENTITY", 602)]);
  for (const language of ["fa", "ar", "en", "tr"] as const) {
    const html = render(language, unknownRows);
    assert.equal(html.match(new RegExp(inventoryFifoCopy(language, "noShortage"), "g"))?.length, 2);
    assert.equal(html.match(new RegExp(inventoryFifoCopy(language, "noCosts"), "g"))?.length, 2);
    assert.ok(html.includes(inventoryFifoIssueCopy(language, "PREVIOUS_SHORTFALL")));
    assert.ok(html.includes(inventoryFifoIssueCopy(language, "AMBIGUOUS_LAYER_IDENTITY")));
    assert.doesNotMatch(html, />0 t</);
    assert.doesNotMatch(html, /No documented shortage reported/);
  }
});

test("read-only disclosure covers current recalculation, unchanged stock, no journals, and unresolved history in every locale", () => {
  for (const language of ["fa", "ar", "en", "tr"] as const) {
    const html = renderToStaticMarkup(<InventoryFifoSafetyNotice language={language}/>);
    assert.match(html, /role="alert"/);
    assert.ok(html.includes(inventoryFifoCopy(language, "safetyTitle")));
    assert.ok(html.includes(inventoryFifoCopy(language, "safetyBody")));
    assert.ok(html.includes(inventoryFifoCopy(language, "permissionBody")));
    assert.doesNotMatch(html, /<button|<form/i);
  }
});

test("invalid prior history and all current issue keys have visible explanations in every locale", () => {
  const data = report([load({ issues: ["INVALID_LOADING_HISTORY", "PREVIOUS_SHORTFALL", "AMBIGUOUS_LAYER_IDENTITY"] })]);
  for (const language of ["fa", "ar", "en", "tr"] as const) {
    const html = render(language, data);
    assert.ok(html.includes(inventoryFifoCopy(language, "invalidHistory")));
    assert.ok(html.includes(inventoryFifoIssueCopy(language, "INVALID_LOADING_HISTORY")));
    assert.ok(html.includes(inventoryFifoIssueCopy(language, "PREVIOUS_SHORTFALL")));
    assert.ok(html.includes(inventoryFifoIssueCopy(language, "AMBIGUOUS_LAYER_IDENTITY")));
    assert.ok(html.length > 100);
  }
});

test("FIFO error state gives the real server message and retry affordance in all locales", () => {
  for (const language of ["fa", "ar", "en", "tr"] as const) {
    const html = renderToStaticMarkup(<InventoryFifoError language={language} message="Upstream replay unavailable" onRetry={() => undefined}/>);
    assert.match(html, /role="alert"/);
    assert.ok(html.includes("Upstream replay unavailable"));
    assert.ok(html.includes(inventoryFifoCopy(language, "retry")));
  }
});

test("changing company or order scope marks the old report stale and hides its result", () => {
  const companies = [{ id: 7, name: "Momtaz Chemical Trading" }, { id: 8, name: "Persian Gulf Chemicals" }];
  const applied = { companyId: 7, orderId: 742, page: 1, pageSize: 20 };
  const originalDraft = { companyId: "7", orderId: "742" };
  assert.equal(inventoryFifoScopeMatches(originalDraft, applied, companies), true);
  assert.equal(inventoryFifoScopeMatches({ ...originalDraft, companyId: "8" }, applied, companies), false);
  assert.equal(inventoryFifoScopeMatches({ ...originalDraft, orderId: "743" }, applied, companies), false);
  for (const language of ["fa", "ar", "en", "tr"] as const) {
    const html = renderToStaticMarkup(<InventoryFifoStaleScopeNotice language={language}/>);
    assert.match(html, /role="status"/);
    assert.ok(html.includes(inventoryFifoCopy(language, "stale")));
    assert.doesNotMatch(html, /Momtaz Chemical Trading/);
  }
});
