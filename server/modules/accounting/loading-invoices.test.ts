import test from "node:test";
import assert from "node:assert/strict";
import {allocateCarryingLayers,type CarryingLayer} from "./loading-invoice-stock";
import {standardOrderWeightCovered} from "./loading-invoices";
import {loadingInvoiceCommandSchema,stockBookCommandSchema} from "@shared/accounting-loading-invoices";
const layer=(extra:Partial<CarryingLayer>={}):CarryingLayer=>({id:1,documentId:1,lineIndex:0,productId:8,
  batchReference:"B1",date:"2026-01-01",quantityTons:"3",baseCost:"100",usedTons:"0",usedCost:"0",...extra});
test("real carrying FIFO preserves the full base cost across successive partial loads",()=>{
  let l=layer();const costs=[];
  for(let n=0;n<3;n++){
    const a=allocateCarryingLayers([l],[{orderItemId:19,productId:8,quantityTons:"1"}],"2026-02-01",0)!;
    costs.push(a[0].baseCost);l={...l,usedTons:String(n+1),usedCost:String(Number(l.usedCost)+Number(a[0].baseCost))};
  }
  assert.deepEqual(costs,["33","34","33"]);assert.equal(l.usedCost,"100");
});
test("known rounding zero is not an unknown cost and does not consume the whole layer",()=>{
  const a=allocateCarryingLayers([layer({quantityTons:"1000",baseCost:"1"})],[{orderItemId:1,productId:8,quantityTons:"1"}],"2026-01-01",0)!;
  assert.equal(a[0].baseCost,"0");assert.equal(a[0].quantityTons,"1");
});
test("unknown coverage, product mismatch and future purchases never produce a zero cost",()=>{
  const requested=[{orderItemId:1,productId:8,quantityTons:"1"}];
  assert.equal(allocateCarryingLayers([],requested,"2026-01-01",0),null);
  assert.equal(allocateCarryingLayers([layer({productId:9})],requested,"2026-01-01",0),null);
  assert.equal(allocateCarryingLayers([layer({date:"2026-02-01"})],requested,"2026-01-01",0),null);
  assert.equal(allocateCarryingLayers([layer()], [{...requested[0],quantityTons:"4"}],"2026-01-01",0),null);
});
test("date/document/line order is stable independently of input and scopes product/batch identity",()=>{
  const a=allocateCarryingLayers([layer({id:2,documentId:2,batchReference:"B2"}),layer()], [{orderItemId:1,productId:8,quantityTons:"4"}],"2026-01-01",0)!;
  assert.deepEqual(a.map(x=>[x.layerId,x.quantityTons]),[[1,"3"],[2,"1"]]);
  assert.equal(allocateCarryingLayers([layer(),layer({id:2,documentId:2})],[{orderItemId:1,productId:8,quantityTons:"1"}],"2026-01-01",0),null);
});
test("corrupt capacity or carrying costs fail explicitly",()=>{
  assert.throws(()=>allocateCarryingLayers([layer({usedTons:"4"})],[],"2026-01-01",0),/Corrupt/);
  assert.throws(()=>allocateCarryingLayers([layer({usedCost:"101"})],[],"2026-01-01",0),/Corrupt/);
});
const payload=(q:string,unit="tons",snapshotQty="2")=>({order:{version:1,lines:[{orderItemId:1,quantity:snapshotQty,unit}]},
  input:{lines:[{orderItemId:1,actualWeightTons:q}]}});
test("ordinary orders require real captured metric quantities; no package or company-tolerance guesses",()=>{
  assert.equal(standardOrderWeightCovered([payload("1"),payload("1")]),true);
  assert.equal(standardOrderWeightCovered([payload("1"),payload("1.01")]),false);
  assert.equal(standardOrderWeightCovered([payload("1","kg","1000")]),true);
  assert.equal(standardOrderWeightCovered([payload("1","box","1000")]),false);
  assert.equal(standardOrderWeightCovered([payload("1"),payload("1","tons","3")]),false);
});
test("public commands cannot supply invoice totals, fabricated value overrides or activate finance",()=>{
  const c={companyId:1,factId:1,expectedPlanHash:"a".repeat(64),reason:"Verified fixture reason"};
  assert.equal(loadingInvoiceCommandSchema.parse(c).settleFromHold,false);
  for(const field of ["baseCost","amount","processingReady","customerId","allocations"])
    assert.equal(loadingInvoiceCommandSchema.safeParse({...c,[field]:"1"}).success,false);
  assert.equal(stockBookCommandSchema.safeParse({companyId:1,documentId:1,lineIndex:0,journalId:1,baseCost:"1.001",evidenceReference:"Source paper"}).success,true);
});
