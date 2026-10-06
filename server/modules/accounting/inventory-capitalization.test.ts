import test from "node:test";
import assert from "node:assert/strict";
import {allocatePurchaseBase} from "./inventory-capitalization";
import {capitalizationCommandSchema} from "@shared/accounting-inventory-capitalization";
test("purchase base allocations conserve the official original total with cumulative rounding",()=>{
  assert.deepEqual(allocatePurchaseBase(["0.01","0.01","0.01"],"150",0),["2","1","2"]);
  assert.deepEqual(allocatePurchaseBase(["12345678901234567890","10"],"1",0),["12345678901234567890","10"]);
});
test("zero rounded acquisition value is blocked, not invented or silently distributed",()=>{
  assert.throws(()=>allocatePurchaseBase(["0.01","1"],"1",0),/positive base value/);
  assert.throws(()=>allocatePurchaseBase(["1"],"0",0),/positive/);
});
test("capitalization commands cannot provide values, rates, quantities, accounts or activation flags",()=>{
  const valid={companyId:1,documentId:2,expectedPlanHash:"a".repeat(64),reason:"Reviewed real source"};
  assert.equal(capitalizationCommandSchema.safeParse(valid).success,true);
  for(const field of ["baseTotal","rate","stockAccountId","quantityTons","processingReady"])
    assert.equal(capitalizationCommandSchema.safeParse({...valid,[field]:"1"}).success,false);
  assert.equal(capitalizationCommandSchema.safeParse({...valid,reason:""}).success,false);
});
