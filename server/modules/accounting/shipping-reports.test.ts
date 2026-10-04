import test from "node:test";
import assert from "node:assert/strict";
import {shippingReportFiltersSchema} from "@shared/accounting-shipping-reports";
import {shippingMarginRow,readShippingMarginReport} from "./shipping-reports";
const raw={orderId:1,orderNumber:"M1",loadingSourceId:"A",loadingCount:1,revenueEntryCount:1,costEntryCount:1,
  unpostedLoadingCount:0,unpostedCostLoadingCount:0,unpostedCostCount:0,revenue:"9007199254740993.001",cost:"9007199254740993",
  periodRevenueBase:"0",periodCostBase:"1"};
test("booked shipping margin is exact and null is not zero",()=>{
  assert.equal(shippingMarginRow(raw,true,false).marginBase,"0.001");
  assert.equal(shippingMarginRow({...raw,revenue:"0",cost:"0"},true,false).marginBase,"0");
  assert.equal(shippingMarginRow({...raw,revenue:"-10",cost:"2"},true,false).marginBase,"-12");
  const noCost=shippingMarginRow({...raw,costEntryCount:0,cost:"0",unpostedCostLoadingCount:1},true,false);
  assert.equal(noCost.costBase,null);assert.equal(noCost.marginBase,null);assert.ok(noCost.blockedReasons.includes("COST_NOT_POSTED"));
});
test("partial filters, incomplete order loadings and pending facts block unsupported profit",()=>{
  for(const row of [
    shippingMarginRow(raw,false,false),shippingMarginRow(raw,true,true),
    shippingMarginRow({...raw,loadingCount:2,unpostedCostLoadingCount:1},true,false),
    shippingMarginRow({...raw,unpostedCostCount:1},true,false),
    shippingMarginRow({...raw,unpostedLoadingCount:1},true,false),
    shippingMarginRow({...raw,costEvidenceIssueCount:1},true,false),
  ])assert.equal(row.marginBase,null);
});
test("shipping filters reject unknown mutation fields, bad dates and ambiguous loading/party scope",async()=>{
  const f={companyId:1,from:"2026-01-01",to:"2026-02-01"};
  assert.ok(shippingReportFiltersSchema.safeParse(f).success);
  for(const extra of [{post:true},{from:"2026-02-30"},{to:"2025-12-31"},{loadingSourceId:"A"},
    {view:"order",orderId:1,loadingSourceId:"A"},{partyId:1},{pageSize:10001}]){
    assert.equal(shippingReportFiltersSchema.safeParse({...f,...extra}).success,false);
  }
  await assert.rejects(()=>readShippingMarginReport({...f,activate:true}),/Unrecognized key/);
});