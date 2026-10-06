import test from "node:test";
import assert from "node:assert/strict";
import {partialReturnQuoteSchema,partialReturnCommandSchema} from "@shared/accounting-partial-returns";
const goods={kind:"GOODS",companyId:1,invoiceId:2,entryDate:"2026-06-04",items:[{orderItemId:8,quantityTons:"0.4000"}]};
const evidence={sourceId:"partial-return",expectedPlanHash:"a".repeat(64),evidenceReference:"actual goods receipt",
  reason:"Reviewed actual returned quantities",evidenceConfirmed:true};
test("canonical exact strings retain precision without floating money arithmetic",()=>{
  const parsed=partialReturnQuoteSchema.parse({...goods,items:[{orderItemId:8,quantityTons:"0.4000"},{orderItemId:3,quantityTons:"1.00000001"}]});
  assert.equal(parsed.kind,"GOODS");
  if(parsed.kind==="GOODS")assert.deepEqual(parsed.items,[{orderItemId:3,quantityTons:"1.00000001"},{orderItemId:8,quantityTons:"0.4"}]);
});
test("actual commands require documentary confirmation and reject financial overrides",()=>{
  assert.ok(partialReturnCommandSchema.safeParse({...goods,...evidence}).success);
  assert.equal(partialReturnCommandSchema.safeParse({...goods,...evidence,evidenceConfirmed:false}).success,false);
  assert.equal(partialReturnCommandSchema.safeParse({...goods,...evidence,baseAmount:"100"}).success,false);
  assert.equal(partialReturnCommandSchema.safeParse({...goods,...evidence,expectedPlanHash:"stale"}).success,false);
});
test("receipt quotes preserve separate allocated and prepaid amounts and normalize actual payout references",()=>{
  const receipt={kind:"RECEIPT",companyId:1,receiptId:4,entryDate:"2026-06-04",
    allocations:[{receivableId:6,amount:"20.00"}],walletAmount:"10.00"};
  const p=partialReturnCommandSchema.parse({...receipt,...evidence,payoutReference:"  bk-۱۲۳٤٥  "});
  assert.equal(p.kind,"RECEIPT");assert.equal(p.payoutReference,"BK-12345");
  if(p.kind==="RECEIPT"){assert.equal(p.walletAmount,"10");assert.equal(p.allocations[0].amount,"20");}
});
