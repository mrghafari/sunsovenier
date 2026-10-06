import test from "node:test";
import assert from "node:assert/strict";
import {renderToStaticMarkup} from "react-dom/server";
import {CreditExposureResult,creditCopy} from "./accounting-credit";
import type {AccountingCreditExposure} from "@shared/accounting-credit";

const report:AccountingCreditExposure={
  companyId:1,walletId:2,customerId:3,currency:"USD",creditLimit:null,openReceivables:"9007199254740993.01",
  unclearedChequeAllocations:"0.09",approvedUnbilledCredit:"25",exposure:"9007199254741018.1",
  remainingCredit:null,ledgerReceivables:null,openingApproved:false,reconciled:false,
  blockingCodes:["CREDIT_OPENING_NOT_APPROVED"],readOnly:true,
};
for(const language of ["fa","ar","en","tr"] as const){
  test(`credit result preserves observed amounts and unavailable/opening states in ${language}`,()=>{
    const html=renderToStaticMarkup(<CreditExposureResult report={report} language={language}/>);
    const copy=creditCopy[language];
    for(const value of [report.exposure,report.openReceivables,copy.unavailable,copy.blocked,copy.unbilled,copy.unreconciled])
      assert.ok(html.includes(value));
    assert.ok(!html.includes(copy.ready));
    assert.ok(html.includes('dir="ltr"'));
  });
}
test("zero credit is displayed as zero, never confused with unavailable policy",()=>{
  const html=renderToStaticMarkup(<CreditExposureResult report={{...report,creditLimit:"0",remainingCredit:"-25",
    openingApproved:true,reconciled:true,blockingCodes:[]}} language="en"/>);
  assert.ok(html.includes("0 USD"));assert.ok(html.includes("-25 USD"));
  assert.ok(!html.includes(creditCopy.en.unavailable));assert.ok(html.includes(creditCopy.en.ready));
});