import {test} from "node:test";
import assert from "node:assert/strict";
import {calculateUnpaidFirstReturn as split} from "./accounting-return-settlement";
const example={invoiceAmount:"100",settledAmount:"60",currencyDecimals:0};
test("partial return clears unpaid debt before granting account credit",()=>{
  assert.deepEqual(split({...example,returnAmount:"40"}),{
    invoiceAmount:"100",settledAmount:"60",unpaidBefore:"40",returnAmount:"40",
    debtReduction:"40",unpaidAfter:"0",customerCredit:"0"});
});
test("only excess above this invoice's unpaid debt becomes account credit",()=>{
  assert.equal(split({...example,returnAmount:"50"}).customerCredit,"10");
  assert.equal(split({...example,returnAmount:"20"}).unpaidAfter,"20");
  assert.equal(split({...example,returnAmount:"20"}).customerCredit,"0");
});
test("full returns credit only the original paid native amount",()=>{
  assert.equal(split({...example,returnAmount:"100"}).customerCredit,"60");
  assert.equal(split({...example,settledAmount:"0",returnAmount:"100"}).customerCredit,"0");
  assert.equal(split({...example,settledAmount:"100",returnAmount:"20"}).customerCredit,"20");
});
test("foreign minor units are conserved without binary rounding or FX guesses",()=>{
  const r=split({invoiceAmount:"0.03",settledAmount:"0.02",returnAmount:"0.02",currencyDecimals:2});
  assert.equal(r.unpaidBefore,"0.01");assert.equal(r.debtReduction,"0.01");
  assert.equal(r.customerCredit,"0.01");assert.equal(r.unpaidAfter,"0");
});
test("large native amounts retain every digit",()=>{
  const r=split({invoiceAmount:"900719925474099300000.01",settledAmount:"900719925474099300000",
    returnAmount:"0.02",currencyDecimals:2});
  assert.equal(r.debtReduction,"0.01");assert.equal(r.customerCredit,"0.01");
});
test("currency precision is strict; harmless trailing zeros normalize",()=>{
  assert.equal(split({...example,returnAmount:"040.00000000"}).returnAmount,"40");
  assert.throws(()=>split({...example,returnAmount:"40.01"}),/CURRENCY_PRECISION/);
  assert.throws(()=>split({...example,returnAmount:"40",currencyDecimals:9}),/INVALID_CURRENCY_PRECISION/);
  assert.throws(()=>split({...example,returnAmount:"40",currencyDecimals:1.5}),/INVALID_CURRENCY_PRECISION/);
});
test("malformed, negative, zero, oversized and overpaid evidence fails explicitly",()=>{
  for(const amount of ["0","-1","1e2","NaN","Infinity","101","40.000000001","40,0"])
    assert.throws(()=>split({...example,returnAmount:amount}));
  assert.throws(()=>split({...example,returnAmount:40 as unknown as string}));
  assert.throws(()=>split({...example,settledAmount:"101",returnAmount:"40"}),/INVALID_SETTLEMENT_EVIDENCE/);
  assert.throws(()=>split({...example,invoiceAmount:"0",settledAmount:"0",returnAmount:"1"}));
});
test("debt reduction plus customer credit exactly equals each native return",()=>{
  for(let paid=0;paid<=100;paid+=5)for(let returned=1;returned<=100;returned++){
    const r=split({...example,settledAmount:String(paid),returnAmount:String(returned)});
    assert.equal(BigInt(r.debtReduction)+BigInt(r.customerCredit),BigInt(returned));
    assert.equal(BigInt(r.unpaidAfter)+BigInt(r.debtReduction),100n-BigInt(paid));
    assert.ok(BigInt(r.customerCredit)<=BigInt(paid));
  }
});
