import { strict as assert } from "node:assert";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadingInvoiceCommandSchema, stockBookCommandSchema } from "@shared/accounting-loading-invoices";
import { fetchLoadingInvoices, loadingInvoicesKey, loadingInvoicesUrl, stockBooksKey } from "./accounting-loading-invoices-api";
import { loadingInvoiceBlockerText, loadingInvoiceText } from "./accounting-loading-invoices-copy";
import { ForeignInvoiceValuationPanel, LoadingInvoiceReturnMarker, LoadingInvoiceSafetyNotice } from "./accounting-loading-invoices";
import type { LoadingInvoicePlan, LoadingInvoiceWorkbench } from "@shared/accounting-loading-invoices";
Object.assign(globalThis, { React });

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
  const blockers = ["CUTOVER_CLOSED", "INVALID_CAPTURE", "FOREIGN_INVOICE_VALUATION_REQUIRED", "FOREIGN_INVOICE_CUTOVER_CLOSED", "FOREIGN_INVOICE_BASE_VALUE_REQUIRED", "CUSTOMER_BINDING_REQUIRED", "LEGACY_OR_PAID_ORDER", "FINANCE_APPROVAL_REQUIRED", "COMMERCIAL_REVIEW_REQUIRED", "POSTING_MAPPING_REQUIRED", "OPEN_PERIOD_REQUIRED", "EARLIER_LOADING_PENDING", "VERIFIED_STOCK_SHORTFALL", "ORDER_WEIGHT_REQUIRED","BACKDATED_HISTORY_RECONCILIATION_REQUIRED","STOCK_RECONCILIATION_REQUIRED"];
  for (const language of ["fa", "ar", "tr", "en"]) {
    assert.ok(loadingInvoiceText(language, "warningTitle"));
    assert.ok(loadingInvoiceText(language, "constraints"));
    for (const blocker of blockers) assert.notEqual(loadingInvoiceBlockerText(language, blocker), blocker, `${language} missing ${blocker}`);
  }
});

test("safety notice SSR renders complete activation and documentary-cost disclosure with RTL locales", () => {
  for (const language of ["fa", "ar", "tr", "en"]) {
    const html = renderToStaticMarkup(React.createElement(LoadingInvoiceSafetyNotice, { language }));
    assert.ok(html.includes(loadingInvoiceText(language, "warningTitle")));
    assert.ok(html.includes(loadingInvoiceText(language, "warning")));
    assert.match(html, language === "en" ? /dir="ltr"/ : /dir="rtl"/);
  }
});

const verifiedForeignPlan = (posted: LoadingInvoicePlan["posted"] = null): LoadingInvoicePlan => ({
  companyId:12,factId:31,orderId:804,sourceId:"truck-31",eventDate:"2025-02-03",
  currency:"IRR",baseCurrency:"IQD",customerId:77,
  amounts:{goods:"1800000",tax:"180000",shipping:"75000",total:"2055000",dueDate:"2025-03-05",lines:[]},
  allocations:[],baseCost:"915.25",
  foreignValuation:{
    available:true,blockingReason:null,currency:"IRR",baseCurrency:"IQD",rateId:62,
    officialRate:"0.0000317",effectiveOn:"2025-02-02",evidenceReference:"CBI bulletin 2025-02-02 / ref 8",
    baseTotal:"65.14",baseGoods:"57.06",baseTax:"5.71",baseShipping:"2.37",
    roundingPolicy:"cumulative_components",customerId:77,
    lines:[{accountId:201,currency:"IRR",debit:"2055000",credit:"0",baseDebit:"65.14",baseCredit:"0",exchangeRate:"0.0000317",partyType:"customer",partyId:77,costCenterId:null,valuationBasis:"historical_carrying"}],
  },
  blockers:[],planHash:"a".repeat(64),postingAllowed:false,posted,
});

test("foreign valuation SSR preserves dated official evidence, native debt, base components and proof lines", () => {
  const plan=verifiedForeignPlan({invoiceId:501,journalId:502,cogsJournalId:503,receivableId:504,settlementId:null});
  const html=renderToStaticMarkup(React.createElement(ForeignInvoiceValuationPanel,{plan,language:"en"}));
  for(const value of ["0.0000317","2025-02-02","CBI bulletin 2025-02-02 / ref 8","65.14","57.06","5.71","2.37","2055000","#201","#77"]) assert.ok(html.includes(value),`missing ${value}`);
  assert.ok(html.includes(loadingInvoiceText("en","postedFrozen")));
  assert.ok(html.includes(loadingInvoiceText("en","nativeDebt")));
  assert.ok(html.includes(loadingInvoiceText("en","rounding")));
});

test("foreign valuation with missing or unverified proof stays unavailable without inferred values", () => {
  for(const proof of [null,undefined,{...verifiedForeignPlan().foreignValuation!,available:false}]) {
    const plan=verifiedForeignPlan();
    plan.foreignValuation=proof;
    const html=renderToStaticMarkup(React.createElement(ForeignInvoiceValuationPanel,{plan,language:"en"}));
    assert.ok(html.includes(loadingInvoiceText("en","valuationUnavailable")));
    assert.ok(!html.includes("0.0000317"));
    assert.ok(!html.includes("65.14"));
    assert.ok(!html.includes("CBI bulletin"));
  }
});

test("ordinary base-currency plan keeps the legacy invoice presentation without a foreign evidence panel", () => {
  const plan=verifiedForeignPlan();
  plan.currency="IQD";
  plan.foreignValuation=null;
  const html=renderToStaticMarkup(React.createElement(ForeignInvoiceValuationPanel,{plan,language:"en"}));
  assert.equal(html,"");
});

test("returned invoice keeps its immutable posted and reversal identifiers visible in four languages", () => {
  const returned = { id: 901, returnDate: "2025-05-14", invoiceReversalId: 902, cogsReversalId: 903 };
  for (const language of ["en", "fa", "ar", "tr"]) {
    const html = renderToStaticMarkup(React.createElement(LoadingInvoiceReturnMarker, { language, returned }));
    assert.ok(html.includes(loadingInvoiceText(language, "returned")));
    assert.ok(html.includes(loadingInvoiceText(language, "returnDate")));
    assert.ok(html.includes("2025-05-14"));
    assert.ok(html.includes("#901"));
    assert.ok(html.includes("#902"));
    assert.ok(html.includes("#903"));
  }
});

test("GET workbench API returns server foreign valuation unchanged and keeps authenticated GET semantics", async () => {
  const responsePlan=verifiedForeignPlan();
  const response:LoadingInvoiceWorkbench={company:{id:12,name:"Momtazchem Iraq",baseCurrency:"IQD"},rows:[responsePlan],pagination:{page:1,pageSize:20,totalRows:1},activationEnabled:false};
  const originalFetch=globalThis.fetch;
  let request:RequestInfo|URL|undefined;
  let init:RequestInit|undefined;
  globalThis.fetch=async (input,options)=>{request=input;init=options;return new Response(JSON.stringify(response),{status:200,headers:{"Content-Type":"application/json"}});};
  try {
    const received=await fetchLoadingInvoices({companyId:12,page:1,pageSize:20});
    assert.equal(String(request),"/api/accounting/v2/loading-invoices?companyId=12&page=1&pageSize=20");
    assert.equal(init?.credentials,"include");
    assert.equal(init?.method,undefined);
    assert.deepEqual(received.rows[0].foreignValuation,responsePlan.foreignValuation);
  } finally { globalThis.fetch=originalFetch; }
});
