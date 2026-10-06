import test from "node:test";
import assert from "node:assert/strict";
import {creditExposureAmounts,readCreditExposure} from "./credit-exposure";
import {creditOrderSchema} from "./credit-orders";
import {assertAccountingOrigin} from "./access";
import type {Request} from "express";

test("credit exposure restores only allocated uncleared amounts and includes unbilled authorizations",()=>{
  assert.deepEqual(creditExposureAmounts("800","200","1200","150"),{exposure:"1150",remainingCredit:"50"});
  assert.deepEqual(creditExposureAmounts("1000","0","500"),{exposure:"1000",remainingCredit:"-500"});
  assert.deepEqual(creditExposureAmounts("0","0",null),{exposure:"0",remainingCredit:null});
});
test("credit calculations preserve huge and fractional native values without Number conversion",()=>{
  assert.deepEqual(creditExposureAmounts("9007199254740993.01","0.09","9007199254740994"),
    {exposure:"9007199254740993.1",remainingCredit:"0.9"});
});
test("credit registration requires explicit, finite identities and an evidence reference",()=>{
  const valid={companyId:1,walletId:2,orderId:3,evidenceReference:"review-document"};
  assert.equal(creditOrderSchema.safeParse(valid).success,true);
  for(const input of [{...valid,companyId:"1"},{...valid,orderId:0},{...valid,evidenceReference:""},
    {...valid,amount:"100"},{...valid,walletId:NaN}])
    assert.equal(creditOrderSchema.safeParse(input).success,false);
});
test("invalid credit report scope fails before any database operation",async()=>{
  await assert.rejects(()=>readCreditExposure(0,1),{code:"ACCOUNTING_VALIDATION"});
});
test("new native finance paths require the same origin as accounting mutations",()=>{
  const request=(origin?:string,host="app.example",forwarded?:string)=>({
    get:(key:string)=>key==="origin"?origin:key==="host"?host:key==="x-forwarded-host"?forwarded:undefined,
  }) as Request;
  assert.doesNotThrow(()=>assertAccountingOrigin(request("https://app.example")));
  assert.doesNotThrow(()=>assertAccountingOrigin(request("https://proxy.example","internal","proxy.example, internal")));
  for(const origin of [undefined,"null","https://other.example","file://app.example"])
    assert.throws(()=>assertAccountingOrigin(request(origin)),{code:"ORIGIN_DENIED"});
});