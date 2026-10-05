import test from "node:test";
import assert from "node:assert/strict";
import {calculateInventoryFifo,type FifoSource,type FifoFact} from "./inventory-fifo-calculation";
const currencies=[{code:"USD",decimals:2},{code:"IQD",decimals:0},{code:"IRR",decimals:0}];
const source=(id=1,date="2026-01-01",tons="3",cost="100.00",currency="USD",productId=1):FifoSource=>({
  id,revision:2,reference:`paper-${id}`,documentDate:date,currency,
  lines:[{productId,batchReference:`batch-${id}`,quantityTons:tons,totalCost:cost}]});
const fact=(id=1,date="2026-01-02",tons="1",orderId=10,productId=1):FifoFact=>({
  id,companyId:1,orderId,sourceId:`${orderId}:truck-${id}`,payload:{
    input:{eventType:"LoadingCompleted",eventDate:date,orderId,sourceId:`truck-${id}`,weighbridgeReference:`ticket-${id}`,
      actualWeightTons:tons,lines:[{orderItemId:100+id,actualWeightTons:tons}]},
    order:{version:1,companyId:1,orderId,lines:[{orderItemId:100+id,productId}]}}});
test("FIFO uses document date then document ID, not insertion order, sale price or batch cost attestations",()=>{
  const f=fact(1,"2026-01-05","3");(f.payload as any).order.lines[0].unitPrice="999999";
  (f.payload as any).costEvidence=[{totalCost:"999999"}];
  const r=calculateInventoryFifo([source(2,"2026-01-01","2","20"),source(1,"2026-01-01","2","100")],[f],currencies)[0];
  assert.deepEqual(r.lines[0].allocations.map(a=>[a.documentId,a.quantityTons,a.documentedCost]),[[1,"2","100.00"],[2,"1","10.00"]]);
  assert.deepEqual(r.documentedCosts,[{currency:"USD",amount:"110.00"}]);
  assert.equal(r.lines[0].allocations[0].documentRevision,2);
});
test("split cumulative rounding conserves the complete original cost including penny residuals",()=>{
  const r=calculateInventoryFifo([source()],[fact(3),fact(1),fact(2)],currencies);
  assert.deepEqual(r.map(x=>x.documentedCosts?.[0].amount),["33.33","33.34","33.33"]);
  const q=calculateInventoryFifo([source(1,"2026-01-01","3","1","IRR")],[fact(1),fact(2),fact(3)],currencies);
  assert.deepEqual(q.map(x=>x.documentedCosts?.[0].amount),["0","1","0"]);
});
test("all prior orders consume layers before a selected order; chronology is date then fact ID",()=>{
  const r=calculateInventoryFifo([source(1,"2026-01-01","2","20")],
    [fact(3,"2026-01-04","1",11),fact(2,"2026-01-03","1",10),fact(1,"2026-01-02","1",9)],currencies);
  assert.equal(r[2].documentedCosts,null);assert.deepEqual(r[2].issues,["DOCUMENTED_STOCK_SHORTFALL"]);
});
test("future documents never supply earlier loadings; shortfall prevents later fabricated recovery",()=>{
  const r=calculateInventoryFifo([source(1,"2026-02-01")],[fact(1),fact(2,"2026-03-01")],currencies);
  assert.equal(r[0].lines[0].shortfallTons,"1");assert.equal(r[0].documentedCosts,null);
  assert.deepEqual(r[1].issues,["PREVIOUS_SHORTFALL"]);assert.equal(r[1].lines[0].shortfallTons,null);
  assert.deepEqual(r[1].lines[0].allocations,[]);
});
test("missing costs are unknown rather than zero; partial allocations expose exact remaining shortage",()=>{
  const r=calculateInventoryFifo([source(1,"2026-01-01","0.5","2.00")],[fact()],currencies)[0];
  assert.equal(r.documentedCosts,null);assert.equal(r.lines[0].shortfallTons,"0.5");
  assert.equal(r.lines[0].allocations[0].documentedCost,"2.00");
  assert.equal(calculateInventoryFifo([],[],currencies).length,0);
  assert.equal(calculateInventoryFifo([],[fact()],currencies)[0].documentedCosts,null);
});
test("native currencies stay separate, independent of invoice currency; no conversion rate is invented",()=>{
  const f=fact(1,"2026-01-02","2");(f.payload as any).order.currency="TRY";
  const r=calculateInventoryFifo([source(1,"2026-01-01","1","100","IQD"),source(2,"2026-01-01","1","2.50","USD")],[f],currencies)[0];
  assert.deepEqual(r.documentedCosts,[{currency:"IQD",amount:"100"},{currency:"USD",amount:"2.50"}]);
});
test("invalid prior capture blocks every later allocation; unlocated bad dates block the whole replay",()=>{
  for(const corrupt of [
    (f:FifoFact)=>{(f.payload as any).order.version=0;},
    (f:FifoFact)=>{(f.payload as any).input.actualWeightTons="2";},
    (f:FifoFact)=>{(f.payload as any).order.lines[0].productId=null;},
    (f:FifoFact)=>{(f.payload as any).input.eventDate="invalid";},
    (f:FifoFact)=>{(f.payload as any).input.lines.push((f.payload as any).input.lines[0]);},
    (f:FifoFact)=>{f.sourceId="forged";}
  ]){
    const bad=fact(1);corrupt(bad);
    const r=calculateInventoryFifo([source()],[fact(2,"2026-01-03"),bad],currencies);
    assert.ok(r.every(x=>x.documentedCosts===null&&x.issues.includes("INVALID_LOADING_HISTORY")));
  }
});
test("a late invalid record does not contaminate earlier sound calculations; product shortfalls are isolated",()=>{
  const bad=fact(2,"2026-01-03");(bad.payload as any).order.version=0;
  const r=calculateInventoryFifo([source()],[bad,fact()],currencies);
  assert.equal(r[0].documentedCosts?.[0].amount,"33.33");assert.equal(r[1].documentedCosts,null);
  const q=calculateInventoryFifo([source(1,"2026-01-01","3","100","USD",2)],[fact(),fact(2,"2026-01-03","1",11,2)],currencies);
  assert.equal(q[1].documentedCosts?.[0].amount,"33.33");
});
test("duplicate source facts and duplicate document batch identities are blocked, not double-counted",()=>{
  const duplicate=fact();
  assert.equal(calculateInventoryFifo([source()],[duplicate,structuredClone(duplicate)],currencies)[1].documentedCosts,null);
  const a=source(),b=source(2);b.lines[0].batchReference=a.lines[0].batchReference;
  const r=calculateInventoryFifo([a,b],[fact()],currencies)[0];
  assert.deepEqual(r.issues,["AMBIGUOUS_LAYER_IDENTITY"]);assert.deepEqual(r.lines[0].allocations,[]);
  assert.equal(r.lines[0].shortfallTons,null);
});
test("approved layer corruption fails explicitly without substituting costs",()=>{
  for(const s of [source(1,"2026-01-01","0"),source(1,"2026-01-01","1","1.001"),
    source(1,"2026-01-01","1","10","XXX"),source(1,"invalid")]){
    assert.throws(()=>calculateInventoryFifo([s],[fact()],currencies));
  }
});
test("calculation does not mutate source documents or captured immutable facts",()=>{
  const s=[source()],f=[fact()],before=JSON.stringify([s,f]);calculateInventoryFifo(s,f,currencies);
  assert.equal(JSON.stringify([s,f]),before);
});
