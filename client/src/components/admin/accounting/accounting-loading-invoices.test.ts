import { strict as assert } from "node:assert";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadingInvoiceCommandSchema, stockBookCommandSchema } from "@shared/accounting-loading-invoices";
import { loadingInvoicesKey, loadingInvoicesUrl, stockBooksKey } from "./accounting-loading-invoices-api";
import { loadingInvoiceBlockerText, loadingInvoiceText } from "./accounting-loading-invoices-copy";
import { LoadingInvoiceSafetyNotice } from "./accounting-loading-invoices";

test("loading invoice API URL carries validated company/order/page scope and query keys are isolated", () => {
  const url = new URL(loadingInvoicesUrl({ companyId: 12, orderId: 804, page: 3, pageSize: 20 }), "http://local");
  assert.equal(url.pathname, "/api/accounting/v2/loading-invoices");
  assert.deepEqual(Object.fromEntries(url.searchParams), { companyId: "12", orderId: "804", page: "3", pageSize: "20" });
  assert.deepEqual(loadingInvoicesKey({ companyId: 12, orderId: 804, page: 3, pageSize: 20 }), ["/api/accounting/v2/loading-invoices", 12, 804, 3, 20]);
  assert.notDeepEqual(loadingInvoicesKey({ companyId: 12, page: 1, pageSize: 20 }), loadingInvoicesKey({ companyId: 13, page: 1, pageSize: 20 }));
  assert.notDeepEqual(stockBooksKey(12), stockBooksKey(13));
});

test("commands validate strictly and default settlement to false", () => {
  const invoice = loadingInvoiceCommandSchema.parse({ companyId: 12, factId: 31, expectedPlanHash: "a".repeat(64), reason: "Truck ticket reviewed" });
  assert.equal(invoice.settleFromHold, false);
  assert.equal(loadingInvoiceCommandSchema.safeParse({ ...invoice, extra: true }).success, false);
  assert.equal(stockBookCommandSchema.safeParse({
    companyId: 12, documentId: 5, lineIndex: 0, journalId: 98, baseCost: "170.25", evidenceReference: "approved invoice 5",
  }).success, true);
  assert.equal(stockBookCommandSchema.safeParse({
    companyId: 12, documentId: 5, lineIndex: 0, journalId: 98, baseCost: "-1", evidenceReference: "no",
  }).success, false);
});

test("all supported languages include critical notices and every posting blocker", () => {
  const blockers = ["CUTOVER_CLOSED", "INVALID_CAPTURE", "FOREIGN_INVOICE_VALUATION_REQUIRED", "CUSTOMER_BINDING_REQUIRED", "LEGACY_OR_PAID_ORDER", "FINANCE_APPROVAL_REQUIRED", "COMMERCIAL_REVIEW_REQUIRED", "POSTING_MAPPING_REQUIRED", "OPEN_PERIOD_REQUIRED", "EARLIER_LOADING_PENDING", "VERIFIED_STOCK_SHORTFALL", "ORDER_WEIGHT_REQUIRED","BACKDATED_HISTORY_RECONCILIATION_REQUIRED","STOCK_RECONCILIATION_REQUIRED"];
  for (const language of ["fa", "ar", "ku", "tr", "en"]) {
    assert.ok(loadingInvoiceText(language, "warningTitle"));
    assert.ok(loadingInvoiceText(language, "constraints"));
    for (const blocker of blockers) assert.notEqual(loadingInvoiceBlockerText(language, blocker), blocker, `${language} missing ${blocker}`);
  }
});

test("safety notice SSR renders complete activation and documentary-cost disclosure with RTL locales", () => {
  for (const language of ["fa", "ar", "ku", "tr", "en"]) {
    const html = renderToStaticMarkup(React.createElement(LoadingInvoiceSafetyNotice, { language }));
    assert.ok(html.includes(loadingInvoiceText(language, "warningTitle")));
    assert.ok(html.includes(loadingInvoiceText(language, "warning")));
    assert.match(html, language === "en" ? /dir="ltr"/ : /dir="rtl"/);
  }
});
