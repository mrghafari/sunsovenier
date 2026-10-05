import test from "node:test";
import assert from "node:assert/strict";
import {inventoryDocumentSchema,inventoryDocumentActionSchema} from "@shared/accounting-inventory-documents";
const doc={companyId:1,sourceId:"stable-purchase-fixture",kind:"purchase",reference:"Invoice-001",
  documentDate:"2026-06-02",supplier:"Supplier fixture",currency:"USD",evidenceReference:"Paper file 001",notes:"",
  lines:[{productId:1,batchReference:"batch-A",quantityTons:"24.350",totalCost:"12000.25"}]};
test("real purchase/opening inputs require source documents and strictly positive measured quantities and costs",()=>{
  assert.ok(inventoryDocumentSchema.safeParse(doc).success);
  assert.ok(inventoryDocumentSchema.safeParse({...doc,kind:"opening",supplier:""}).success);
  for(const patch of [{supplier:""},{evidenceReference:""},{documentDate:"2026-02-30"},{currency:"usd"},
    {lines:[]},{lines:[{...doc.lines[0],totalCost:"0"}]},{lines:[{...doc.lines[0],quantityTons:"0"}]},
    {lines:[{...doc.lines[0],quantityTons:"1e2"}]},{lines:[doc.lines[0],doc.lines[0]]},{postingAllowed:true}]){
    assert.equal(inventoryDocumentSchema.safeParse({...doc,...patch}).success,false);
  }
});
test("edits are explicitly revisioned and review reasons cannot be omitted",()=>{
  assert.equal(inventoryDocumentSchema.safeParse({...doc,id:1}).success,false);
  assert.equal(inventoryDocumentSchema.safeParse({...doc,revision:1}).success,false);
  assert.equal(inventoryDocumentSchema.safeParse({...doc,id:1,revision:1}).success,true);
  assert.equal(inventoryDocumentActionSchema.safeParse({companyId:1,revision:1,reason:""}).success,false);
  assert.equal(inventoryDocumentActionSchema.safeParse({companyId:1,revision:1,reason:"Reviewed paper evidence"}).success,true);
});
