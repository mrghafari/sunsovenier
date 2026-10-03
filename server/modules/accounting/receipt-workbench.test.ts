import test from "node:test";
import assert from "node:assert/strict";
import {allowedReceiptActions,receiptInputSchema,receiptEventSchema,receiptListFiltersSchema,type ReceiptList} from "@shared/accounting-receipts";
import {receiptListCsv} from "./receipt-workbench-csv";
test("workbench cheque/return actions reflect the exact supported lifecycle",()=>{
  assert.deepEqual(allowedReceiptActions("BANK","confirmed"),["returned"]);
  assert.deepEqual(allowedReceiptActions("CASH","returned"),[]);
  assert.deepEqual(allowedReceiptActions("CHEQUE","received"),["deposited","bounced"]);
  assert.deepEqual(allowedReceiptActions("CHEQUE","deposited"),["cleared","bounced"]);
  assert.deepEqual(allowedReceiptActions("CHEQUE","cleared"),["bounced"]);
  for(const status of ["bounced","returned","confirmed"] as const)assert.deepEqual(allowedReceiptActions("CHEQUE",status),[]);
});
test("UI and receipt writer share exact evidence, money and allocation contracts",()=>{
  const input={companyId:1,customerId:2,currency:"IQD",sourceId:"stable-payment-reference",entryDate:"2026-01-01",
    amount:"10000000000000001",method:"BANK",evidenceReference:"Verified bank reference",reason:"Actual received funds",
    allocations:[{receivableId:8,amount:"7"}]};
  assert.ok(receiptInputSchema.safeParse(input).success);
  for(const changed of [{amount:100.1},{evidenceReference:""},{reason:""},{entryDate:"2026-02-30"},{method:"CHEQUE"},
    {allocations:[{receivableId:8,amount:"7"},{receivableId:8,amount:"1"}]},{amount:"-7"},{extra:"ignored?"}])
    assert.equal(receiptInputSchema.safeParse({...input,...changed}).success,false,JSON.stringify(changed));
  assert.ok(receiptInputSchema.safeParse({...input,method:"CHEQUE",chequeNumber:"Actual cheque 15"}).success);
  assert.deepEqual(receiptInputSchema.parse({...input,allocations:undefined}).allocations,[]);
  assert.equal(receiptEventSchema.safeParse({sourceId:"retry-stable-reference",entryDate:"2026-02-01",
    evidenceReference:"Actual proof",reason:"Confirmed event"}).success,true);
  assert.equal(receiptEventSchema.safeParse({sourceId:"retry-stable-reference",entryDate:"2026-02-01",
    evidenceReference:"No",reason:"Confirmed event"}).success,false);
});
test("receipt filters require valid scoped IDs, paired dates and bounded pages",()=>{
  assert.equal(receiptListFiltersSchema.parse({companyId:"1"}).pageSize,50);
  for(const changed of [{companyId:0},{customerId:"invalid"},{from:"2026-01-01"},{from:"2026-03-01",to:"2026-02-01"},
    {from:"0000-01-01",to:"2026-01-01"},{currency:"iqd"},{pageSize:101},{status:"paid"},{method:"WALLET"},{extra:"no"}])
    assert.equal(receiptListFiltersSchema.safeParse({companyId:1,...changed}).success,false,JSON.stringify(changed));
});
test("receipt register CSV preserves exact amounts and labels lifecycle-aware original amounts",()=>{
  const data:ReceiptList={metadata:{company:{id:1,name:"=danger",baseCurrency:"IRR",isActive:true},
    walletCutoverReady:false,receiptCutoverReady:false,ledgerGuardsReady:true,processingReady:false,activeCurrencies:["IRR"],legacyOpeningVerified:false},
    filters:{companyId:1,page:1,pageSize:50},pagination:{page:1,pageSize:50,totalRows:1},
    summaries:[{currency:"IRR",method:"CHEQUE",status:"received",receiptCount:1,amount:"10000000000000001.12345678",walletCredit:"7.12345678"}],
    items:[{id:1,companyId:1,customerId:2,customerName:'نام, "quote"\nعربی',customerCode:null,currency:"IRR",sourceId:"@attack",
      entryDate:"2026-01-01",method:"CHEQUE",status:"received",amount:"10000000000000001.12345678",
      walletCredit:"7.12345678",chequeNumber:"=bad",reason:"Verified actual receipt",evidenceReference:"Actual doc"}]};
  const csv=receiptListCsv(data);
  assert.ok(csv.startsWith("\ufeff"));assert.ok(csv.includes("\"'=danger\""));assert.ok(csv.includes("\"'@attack\""));
  assert.ok(csv.includes("\"'=bad\""));assert.ok(csv.includes('"10000000000000001.12345678"'));
  assert.ok(csv.includes('نام, ""quote""\nعربی'));assert.ok(csv.includes("not net available funds"));
  assert.ok(csv.includes("Received cheques are provisional"));assert.ok(csv.includes("summary.IRR.CHEQUE.received"));
});