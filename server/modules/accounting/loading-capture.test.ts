import test from "node:test";
import assert from "node:assert/strict";
import {capturedMetricPricing} from "./loading-pricing-evidence";
import {loadingCaptureSchema} from "@shared/accounting-loading-capture";
import {operationalEventSchema} from "./events";
import {captureMeasuredLoading} from "./loading-capture";
import {calculateLoadingInvoicePreview} from "./loading-invoice-calculation";
test("metric price evidence preserves immutable native price and physical kg/ton conversion without catalog prices",()=>{
  const order={version:1,lines:[{version:1,orderItemId:1,unit:"kg",priceBasis:"native_order_unit",lockedUnitPrice:"2.125"},
    {version:1,orderItemId:2,unit:"bag",priceBasis:"native_order_unit",lockedUnitPrice:"500"}]};
  assert.deepEqual(capturedMetricPricing(order),[{orderItemId:1,nativeUnit:"kg",tonsToPriceUnits:"1000",
    lockedUnitPrice:"2.125",pricePerTon:"2125",basis:"frozen-explicit-metric-unit"}]);
  assert.equal(order.lines[0].lockedUnitPrice,"2.125");
  assert.deepEqual(capturedMetricPricing({...order,version:0}),[]);
  assert.deepEqual(capturedMetricPricing(null),[]);
});
test("only new matching captured conversion evidence permits kg pricing; altered metadata is blocked",()=>{
  const order={version:1,companyId:1,orderId:1,currency:"IQD",shippingMode:"CUSTOMER_ARRANGED",shippingPrice:"0",
    paymentTermsDays:0,lines:[{version:1,orderItemId:1,unit:"kg",priceBasis:"native_order_unit",lockedUnitPrice:"2",taxRate:"0"}]};
  const fact={id:1,companyId:1,orderId:1,sourceId:"1:A",payload:{order,
    input:{eventType:"LoadingCompleted",orderId:1,sourceId:"A",eventDate:"2026-10-04",weighbridgeReference:"ticket",
      actualWeightTons:"24.350",lines:[{orderItemId:1,actualWeightTons:"24.350"}]},pricingEvidence:capturedMetricPricing(order)}};
  assert.equal(calculateLoadingInvoicePreview(fact,[{code:"IQD",decimals:0}]).amounts?.goods,"48700");
  fact.payload.pricingEvidence[0].pricePerTon="20000";
  assert.equal(calculateLoadingInvoicePreview(fact,[{code:"IQD",decimals:0}]).amounts,null);
  fact.payload.pricingEvidence=[];
  assert.equal(calculateLoadingInvoicePreview(fact,[{code:"IQD",decimals:0}]).amounts,null);
});
test("loading/cost contract uses exact decimals, refs, and no activation/pricing override fields",()=>{
  const f={companyId:1,orderId:1,sourceId:"بار-۱۲۳",eventDate:"2026-10-04",weighbridgeReference:"weigh-1",
    actualWeightTons:"24.350",lines:[{orderItemId:1,actualWeightTons:"24.350"}],
    inventoryCosts:[{orderItemId:1,batchReference:"batch",documentReference:"purchase-1",weightTons:"24.350",amount:"0",currency:"IQD"}]};
  assert.ok(loadingCaptureSchema.safeParse(f).success);
  const {companyId,...input}=f;assert.ok(operationalEventSchema.safeParse({...input,eventType:"LoadingCompleted"}).success);
  for(const changed of [{actualWeightTons:24.35},{actualWeightTons:"0"},{activate:true},{lockedUnitPrice:"5"},
    {inventoryCosts:[{...f.inventoryCosts[0],amount:"1e5"}]},{inventoryCosts:[]}])
    assert.equal(loadingCaptureSchema.safeParse({...f,...changed}).success,false);
});
test("read-only accounting viewers cannot attest or mutate a loading",async()=>{
  await assert.rejects(()=>captureMeasuredLoading({}, {actorId:1,actorType:"custom",canManage:false}),
    /management permission/);
});