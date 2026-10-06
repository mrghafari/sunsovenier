import test from "node:test";
import assert from "node:assert/strict";
import {loadingReturnCommandSchema,loadingReturnFiltersSchema} from "@shared/accounting-loading-returns";
import {allocateCarryingLayers} from "./loading-invoice-stock";
test("full return commands require documentary receipt, date, reviewed identity and disallow invented amounts",()=>{
  const command={companyId:1,invoiceId:2,expectedPlanHash:"a".repeat(64),returnDate:"2026-06-04",
    goodsReceiptReference:"Verified goods receipt",reason:"Return all documented loading goods"};
  assert.ok(loadingReturnCommandSchema.safeParse(command).success);
  assert.ok(loadingReturnCommandSchema.safeParse({...command,creditToCustomerConfirmed:true}).success);
  assert.equal(loadingReturnCommandSchema.safeParse({...command,creditToCustomerConfirmed:false}).success,false);
  for(const changed of [{...command,amount:"1"},{...command,partial:true},
    {...command,processingReady:true},{...command,returnDate:"2026-02-31"},
    {...command,goodsReceiptReference:""},{...command,expectedPlanHash:""}])
    assert.equal(loadingReturnCommandSchema.safeParse(changed).success,false);
  assert.equal(loadingReturnFiltersSchema.safeParse({companyId:1,pageSize:101}).success,false);
});
test("returned middle rounding allocations preserve actual remaining cost, including known zero",()=>{
  const layer={id:1,documentId:1,lineIndex:0,productId:1,batchReference:"real",date:"2026-06-01",
    quantityTons:"3",baseCost:"2",usedTons:"2",usedCost:"2",hasReturns:true};
  const result=allocateCarryingLayers([layer],[{orderItemId:1,productId:1,quantityTons:"0.1"}],"2026-06-05",0)!;
  assert.equal(result[0].baseCost,"0");
  assert.equal(allocateCarryingLayers([{...layer,hasReturns:false}],
    [{orderItemId:1,productId:1,quantityTons:"1"}],"2026-06-05",0)![0].baseCost,"0");
  assert.throws(()=>allocateCarryingLayers([{...layer,usedCost:"-1"}],[],"2026-06-05",0));
});
test("returned carrying capacity conserves exact large costs without binary floating arithmetic",()=>{
  const layer={id:1,documentId:1,lineIndex:0,productId:1,batchReference:"actual",date:"2026-06-01",
    quantityTons:"3",baseCost:"9007199254740993.25",usedTons:"1",usedCost:"9007199254740993.24",hasReturns:true};
  const allocations=allocateCarryingLayers([layer],[
    {orderItemId:1,productId:1,quantityTons:"1"},{orderItemId:2,productId:1,quantityTons:"1"}],"2026-06-05",2)!;
  assert.deepEqual(allocations.map(a=>a.baseCost),["0.01","0.00"]);
});
