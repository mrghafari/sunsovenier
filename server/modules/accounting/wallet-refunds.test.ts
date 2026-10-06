import {test} from "node:test";
import assert from "node:assert/strict";
import {walletRefundQuoteSchema,walletRefundCommandSchema} from "@shared/accounting-wallet-refunds";
const quote={companyId:1,walletId:2,amount:"10.01",entryDate:"2026-06-01",channel:"BANK" as const};
const command={...quote,sourceId:"documented-payout",expectedPlanHash:"a".repeat(64),
  payoutReference:"bank-tx-12345",evidenceReference:"bank-transaction-verified",reason:"Customer requested payout",payoutDocumentConfirmed:true};
test("documented payout is separate from invoice or receipt return and requires explicit evidence",()=>{
  assert.ok(walletRefundCommandSchema.safeParse(command).success);
  for(const extra of [{payoutDocumentConfirmed:false},{payoutDocumentConfirmed:undefined},{evidenceReference:""},
    {payoutReference:undefined},{payoutReference:""},{expectedPlanHash:""},{amount:10},{amount:"-1"},{amount:"0"},{invoiceId:10},{receiptId:20},{baseAmount:"1000"},{exchangeRate:"1500"}])
    assert.equal(walletRefundCommandSchema.safeParse({...command,...extra}).success,false);
});
test("actual payout references normalize case and Persian/Arabic digits, independently of command IDs",()=>{
  assert.equal(walletRefundCommandSchema.parse({...command,payoutReference:" tx-۱۲٣۴۵ "}).payoutReference,"TX-12345");
  assert.equal(walletRefundCommandSchema.safeParse({...command,payoutReference:"ß".repeat(100)}).success,false);
});
test("native quotes have no client valuation, party mapping or financial activation fields",()=>{
  assert.ok(walletRefundQuoteSchema.safeParse(quote).success);
  assert.ok(walletRefundQuoteSchema.safeParse({...quote,channel:"CASH"}).success);
  for(const extra of [{currency:"USD"},{fxGain:"1"},{fundingBase:"15000"},{processingReady:true},
    {companyId:"1"},{entryDate:"2026-02-30"},{walletId:0},{channel:"GATEWAY"}])
    assert.equal(walletRefundQuoteSchema.safeParse({...quote,...extra}).success,false);
});
