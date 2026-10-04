import test from "node:test";
import assert from "node:assert/strict";
import {calculateLoadingInvoicePreview as calculate} from "./loading-invoice-calculation";
import {loadingPreviewFiltersSchema} from "@shared/accounting-loading-preview";
const currencies=[{code:"IQD",decimals:0},{code:"USD",decimals:2},{code:"IRR",decimals:0}];
const fact=()=>({id:1,companyId:1,orderId:22,sourceId:"22:بار-۱۲۳",payload:{
  input:{eventType:"LoadingCompleted",orderId:22,sourceId:"بار-۱۲۳",eventDate:"2026-10-04",weighbridgeReference:"scale-1",
    actualWeightTons:"24.350",lines:[{orderItemId:7,actualWeightTons:"24.350"}]},
  order:{version:1,companyId:1,orderId:22,orderNumber:"M22",currency:"IQD",shippingMode:"SELLER_ARRANGED",shippingPrice:"100",
    shippingPriceBasis:"per_ton",paymentTermsDays:30,lines:[{version:1,orderItemId:7,unit:"ton",priceBasis:"native_order_unit",
      lockedUnitPrice:"1000",taxRate:"5"}]}}});
test("24.350 metric tons uses locked price, tax and shipping; due date uses loading date",()=>{
  const r=calculate(fact(),currencies);
  assert.deepEqual(r.issues,[]);assert.equal(r.loadingReference,"بار-۱۲۳");
  assert.deepEqual(r.amounts,{goods:"24350",tax:"1218",shipping:"2435",total:"28003",dueDate:"2026-11-03",
    lines:[{orderItemId:7,weightTons:"24.35",goods:"24350",tax:"1218"}]});
});
test("USD/IRR precision, per-line rounding, zero tax and pickup stay exact",()=>{
  const f=fact();f.payload.order.currency="USD";f.payload.order.shippingMode="CUSTOMER_ARRANGED";f.payload.order.shippingPrice="0";
  f.payload.order.lines[0].lockedUnitPrice="1.0001";f.payload.order.lines[0].taxRate="0";
  assert.equal(calculate(f,currencies).amounts?.total,"24.35");
  f.payload.order.currency="IRR";assert.equal(calculate(f,currencies).amounts?.total,"24");
});
test("each line rounds independently and large exact amounts do not pass through JS numbers",()=>{
  const f=fact();f.payload.order.currency="USD";f.payload.order.shippingMode="CUSTOMER_ARRANGED";f.payload.order.shippingPrice="0";
  f.payload.order.lines[0].lockedUnitPrice="1";f.payload.order.lines[0].taxRate="0";
  f.payload.order.lines.push({...f.payload.order.lines[0],orderItemId:8});
  f.payload.input.lines=[{orderItemId:7,actualWeightTons:"12.175"},{orderItemId:8,actualWeightTons:"12.175"}];
  assert.equal(calculate(f,currencies).amounts?.goods,"24.36");
  const huge=fact();huge.payload.order.lines[0].lockedUnitPrice="9007199254740993";
  huge.payload.order.lines[0].taxRate="0";huge.payload.order.shippingPrice="0";
  assert.equal(calculate(huge,currencies).amounts?.goods,"219325301852943180");
});
test("fixed shipping is never arbitrarily apportioned between trucks",()=>{
  const f=fact();f.payload.order.shippingPriceBasis="fixed";
  assert.ok(calculate(f,currencies).issues.includes("FIXED_SHIPPING_ALLOCATION_REQUIRED"));
  assert.equal(calculate(f,currencies).amounts,null);
  f.payload.order.shippingPrice="0";assert.equal(calculate(f,currencies).amounts?.shipping,"0");
});
test("legacy, cross-company, altered identity, unknown currencies and malformed dates fail closed",()=>{
  for(const mutate of [
    (f:ReturnType<typeof fact>)=>{f.payload.order.version=0;},
    (f:ReturnType<typeof fact>)=>{f.payload.order.companyId=99;},
    (f:ReturnType<typeof fact>)=>{f.sourceId="different";},
    (f:ReturnType<typeof fact>)=>{f.payload.order.currency="QQQ";},
    (f:ReturnType<typeof fact>)=>{f.payload.input.eventDate="2026-02-30";},
    (f:ReturnType<typeof fact>)=>{f.payload.input.weighbridgeReference="";},
  ]){const f=fact();mutate(f);assert.equal(calculate(f,currencies).amounts,null);}
  assert.equal(calculate({...fact(),payload:null},currencies).amounts,null);
});
test("estimated/package weights, duplicate lines, absent taxes and changed unit basis cannot produce an invoice",()=>{
  const f=fact();f.payload.order.lines[0].unit="kg";assert.ok(calculate(f,currencies).issues.includes("PRICE_BASIS_REQUIRED"));
  const duplicate=fact();duplicate.payload.input.lines.push({...duplicate.payload.input.lines[0]});
  assert.ok(calculate(duplicate,currencies).issues.includes("INVALID_MEASUREMENTS"));
  const wrong=fact();wrong.payload.input.actualWeightTons="24";assert.equal(calculate(wrong,currencies).amounts,null);
  const absent=fact();(absent.payload.order.lines[0] as Record<string,unknown>).taxRate=null;
  assert.ok(calculate(absent,currencies).issues.includes("TAX_SNAPSHOT_REQUIRED"));
});
test("numeric overflow, malformed decimals, negative prices and date overflow never throw",()=>{
  for(const value of ["-1","NaN","Infinity","1e30","999999999999999999999999999999"]){
    const f=fact();f.payload.order.lines[0].lockedUnitPrice=value;
    assert.equal(calculate(f,currencies).amounts,null);
  }
  const f=fact();f.payload.input.eventDate="9999-12-31";assert.equal(calculate(f,currencies).amounts,null);
});
test("filter contract rejects unsafe IDs, unknown mutation fields and excessive pages",()=>{
  assert.ok(loadingPreviewFiltersSchema.safeParse({companyId:"1"}).success);
  for(const f of [{companyId:0},{companyId:1,post:true},{companyId:1,pageSize:101},{companyId:1,orderId:"bogus"}])
    assert.equal(loadingPreviewFiltersSchema.safeParse(f).success,false);
});