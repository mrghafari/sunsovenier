import { strict as assert } from "node:assert";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Language } from "@/lib/i18n";
import type { ShippingMarginReport } from "@shared/accounting-shipping-reports";
import { ShippingMarginReportResult, loadingReference } from "./shipping-margin-reports";

test("opaque loading references retain Persian digits while whitespace is trimmed",()=>{
  assert.equal(loadingReference(" بار-۱۲۳ "),"بار-۱۲۳");
  assert.equal(loadingReference(" " ),undefined);
});

const report = (overrides: Partial<ShippingMarginReport> = {}): ShippingMarginReport => ({
  filters:{companyId:7,from:"2024-03-01",to:"2024-03-31",view:"loading",page:2,pageSize:2},
  company:{id:7,name:"Sadaf Trading",baseCurrency:"USD"},
  currencies:[{code:"USD",decimals:2}],
  rows:[
    {orderId:501,orderNumber:"SO-501",loadingSourceId:"load-a",loadingCount:1,revenueEntryCount:2,costEntryCount:1,unpostedLoadingCount:0,unpostedCostLoadingCount:0,unpostedCostCount:0,costEvidenceIssueCount:0,revenueBase:"9007199254740993.123456",costBase:"9007199254740993.123456",marginBase:"0.000000",periodRevenueBase:"180.000000",periodCostBase:"180.000000",blockedReasons:[]},
    {orderId:502,orderNumber:"SO-502",loadingSourceId:"load-b",loadingCount:1,revenueEntryCount:0,costEntryCount:0,unpostedLoadingCount:1,unpostedCostLoadingCount:1,unpostedCostCount:1,costEvidenceIssueCount:0,revenueBase:null,costBase:null,marginBase:null,periodRevenueBase:"0.000000",periodCostBase:"0.000000",blockedReasons:["REVENUE_NOT_POSTED","COST_NOT_POSTED","UNPOSTED_COST_FACTS"]},
  ],
  pagination:{page:2,pageSize:2,totalRows:5},
  totals:{knownRevenueBase:"180.000000",knownCostBase:"180.000000",knownMarginBase:"0.000000",marginBase:null,periodRevenueBase:"180.000000",periodCostBase:"180.000000",incompleteGroupCount:2,completeGroupCount:3},
  coverage:{mappingReady:true,mappingBasis:"current",legacyOpeningVerified:false,includesReversals:true,amountsBasis:"selected-groups-as-of-to",periodBasis:"posted-entry-date",unattributedScope:"company-period-line-filters",unattributedPeriodLineCount:2,unattributedPeriodRevenueBase:"-20.000000",unattributedPeriodCostBase:"0.000000",postedEntryCount:8,capturedLoadingCount:2,unlinkedFactCount:0,financialCutoversReady:false},
  ...overrides,
});
const render = (language:Language, data:ShippingMarginReport) => renderToStaticMarkup(<ShippingMarginReportResult report={data} language={language} page={data.pagination.page} changePage={()=>{}}/>);
const localeDigits = (value:string, language:Language) => language === "fa"
  ? value.replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[Number(d)])
  : language === "ar" ? value.replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[Number(d)]) : value;

test("SSR renders fully localized shipping report in all supported languages and RTL direction", () => {
  for (const language of ["en","fa","ar","tr"] as const) {
    const html = render(language,report());
    assert.match(html,/Sadaf Trading/);
    assert.ok(html.includes(localeDigits("9,007,199,254,740,993",language)));
    assert.match(html,language === "fa" || language === "ar" ? /dir="rtl"/ : /dir="ltr"/);
    assert.match(html,/SO-502/);
    assert.match(html,/page|صفحه|صفحة|Sayfa/i);
  }
});

test("keeps unknown amounts distinct from actual zero and retains decimal precision", () => {
  const html = render("en",report());
  assert.match(html,/9,007,199,254,740,993\.123456/);
  assert.match(html,/—/);
  assert.match(html,/0\.00/);
  assert.match(html,/Unknown|unknown/i);
});

test("renders negative reversals, zero margins, pending costs, and blocked reasons", () => {
  const data = report({ rows:[
    {orderId:600,orderNumber:"REV-600",loadingSourceId:"load-reversal",loadingCount:2,revenueEntryCount:2,costEntryCount:2,unpostedLoadingCount:0,unpostedCostLoadingCount:0,unpostedCostCount:0,costEvidenceIssueCount:0,revenueBase:"-32.50",costBase:"0.00",marginBase:"-32.50",periodRevenueBase:"-12.50",periodCostBase:"0.00",blockedReasons:[]},
    {orderId:601,orderNumber:"PENDING-601",loadingSourceId:"load-pending",loadingCount:1,revenueEntryCount:0,costEntryCount:0,unpostedLoadingCount:1,unpostedCostLoadingCount:1,unpostedCostCount:2,costEvidenceIssueCount:0,revenueBase:null,costBase:null,marginBase:null,periodRevenueBase:"0.00",periodCostBase:"0.00",blockedReasons:["COST_NOT_POSTED","UNPOSTED_COST_FACTS"]},
  ]});
  const html = render("en",data);
  assert.match(html,/-32\.50/);
  assert.match(html,/0\.00/);
  assert.match(html,/PENDING-601/);
  assert.match(html,/One or more captured loading costs are not posted to the ledger/);
  assert.match(html,/unverified|Legacy opening history is unverified/i);
});

test("separates as-of group amounts from period movements and labels unmatched scope", () => {
  const html = render("en",report());
  assert.match(html,/Amounts are booked ledger results for selected groups as of the end date/);
  assert.match(html,/Posted revenue movement · period/);
  assert.match(html,/This unmatched-line check uses company \+ period/);
  assert.match(html,/Unmatched revenue/);
  assert.match(html,/Full-scope margin is unavailable while unmatched company-period financial lines remain/);
});

test("supports partial financial scopes and reports totals and pagination from full scope", () => {
  const data = report({filters:{companyId:7,from:"2024-03-01",to:"2024-03-31",view:"order",orderId:501,currency:"USD",page:2,pageSize:2}});
  const html = render("en",data);
  assert.match(html,/This filter narrows the financial line scope/);
  assert.match(html,/3 Booked-complete/);
  assert.match(html,/5/);
  assert.match(html,/2 \/ 3/);
});

test("order rollup blocks booked margin when one of two revenue loadings has no posted cost", () => {
  const data = report({
    filters:{companyId:7,from:"2024-03-01",to:"2024-03-31",view:"order",orderId:702,page:1,pageSize:50},
    rows:[{
      orderId:702,orderNumber:"SO-702",loadingSourceId:null,loadingCount:2,
      revenueEntryCount:2,costEntryCount:1,unpostedLoadingCount:0,unpostedCostLoadingCount:1,unpostedCostCount:1,costEvidenceIssueCount:0,
      revenueBase:"240.00",costBase:"90.00",marginBase:null,periodRevenueBase:"240.00",periodCostBase:"90.00",
      blockedReasons:["COST_NOT_POSTED"],
    }],
    pagination:{page:1,pageSize:50,totalRows:1},
    totals:{knownRevenueBase:"240.00",knownCostBase:"90.00",knownMarginBase:"0.00",marginBase:null,periodRevenueBase:"240.00",periodCostBase:"90.00",incompleteGroupCount:1,completeGroupCount:0},
    coverage:{...report().coverage,unlinkedFactCount:3,unattributedPeriodLineCount:0},
  });
  const html = render("en",data);
  assert.match(html,/SO-702/);
  assert.match(html,/Loadings without posted cost/);
  assert.match(html,/Booked margin as of/);
  assert.match(html,/Posted cost evidence is missing for this group/);
  assert.match(html,/Unlinked captured facts through end date/);
  assert.match(html,/not narrowed by order or loading ID/);
  assert.match(html,/Booked margin is unavailable while unlinked or invalid captured facts remain through the end date/);
  assert.match(html,/>—<\/div>/);
});

test("cost snapshot mismatches are counted and block margin while booked amounts remain visible", () => {
  const data = report({
    rows:[{
      orderId:808,orderNumber:"SO-808",loadingSourceId:"load-808",loadingCount:1,
      revenueEntryCount:1,costEntryCount:1,unpostedLoadingCount:0,unpostedCostLoadingCount:0,
      unpostedCostCount:0,costEvidenceIssueCount:1,revenueBase:"125.00",costBase:"47.25",
      marginBase:null,periodRevenueBase:"0.00",periodCostBase:"0.00",blockedReasons:["COST_EVIDENCE_MISMATCH"],
    }],
    totals:{...report().totals,knownRevenueBase:"125.00",knownCostBase:"47.25",knownMarginBase:"0.00",marginBase:null,incompleteGroupCount:1},
  });
  const html = render("en",data);
  assert.match(html,/Cost evidence issues/);
  assert.match(html,/Recorded cost evidence is missing, malformed, or differs from the original posted native shipment cost\/currency/);
  assert.match(html,/>125\.00</);
  assert.match(html,/>47\.25</);
  assert.match(html,/>—<\/div>/);
  assert.match(html,/immutable captured snapshots/);
  assert.match(html,/Today(?:&#x27;|')s rates are never used/);
});

test("negative known margin and true zero full-scope margin remain separate", () => {
  const negative = report({totals:{...report().totals,knownMarginBase:"-42.75",marginBase:"-42.75",incompleteGroupCount:0,completeGroupCount:5}});
  const zero = report({totals:{...report().totals,knownMarginBase:"0.000000",marginBase:"0.000000",incompleteGroupCount:0,completeGroupCount:5},coverage:{...report().coverage,unattributedPeriodLineCount:0}});
  assert.match(render("en",negative),/-42\.75/);
  assert.match(render("en",zero),/0\.00/);
});