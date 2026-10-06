import test from "node:test";
import assert from "node:assert/strict";
import {accountingReportFiltersSchema} from "@shared/accounting-reports";
import {csvCell,accountingReportCsv} from "./report-csv";

const input={companyId:"1",from:"2026-01-01",to:"2026-12-31"};
test("report queries require valid company/dates, paired parties and bounded pagination",()=>{
  assert.equal(accountingReportFiltersSchema.parse(input).pageSize,50);
  for(const change of [
    {companyId:"0"},{companyId:"1 OR 1=1"},{companyId:"2147483648"},{from:"2026-02-30"},
    {from:"0000-01-01"},{from:"2027-01-01"},{pageSize:"201"},{page:"-1"},
    {partyType:"customer"},{partyId:"1"},{partyType:"supplier",partyId:"1"},{currency:"usd"},{unknown:"1"},
  ])assert.equal(accountingReportFiltersSchema.safeParse({...input,...change}).success,false,JSON.stringify(change));
  const party=accountingReportFiltersSchema.parse({...input,partyType:"carrier",partyId:"123",accountId:""});
  assert.equal(party.partyId,123);assert.equal(party.accountId,undefined);
});
test("CSV quotes Unicode/multiline text, neutralizes formulas and preserves exact trusted monetary strings",()=>{
  for(const text of ["=1+1","+cmd","-formula","@SUM(A1)","  =bad","\t=bad","\n@bad"])
    assert.ok(csvCell(text).startsWith("\"'"),text);
  assert.equal(csvCell('فارسی,"quoted"\nعربي'),'"فارسی,""quoted""\nعربي"');
  assert.equal(csvCell("-123.00000000",true),'"-123.00000000"');
  assert.equal(csvCell("-SUM(A1)",true),'"\'-SUM(A1)"');
  assert.equal(csvCell("10000000000000001.12345678",true),'"10000000000000001.12345678"');
  const csv=accountingReportCsv({report:"ledger",filters:accountingReportFiltersSchema.parse(input),
    company:{id:1,name:"=HYPERLINK(\"danger\")",baseCurrency:"IQD"},
    coverage:{postedEntryCount:1,walletCutoverReady:false,receiptCutoverReady:false,legacyOpeningVerified:false},
    pagination:{page:1,pageSize:50,totalRows:1},totals:{openingBase:"-10",periodBaseDebit:"0",periodBaseCredit:"3",
      closingBase:"-13",closingDebit:"0",closingCredit:"13",balanceScope:"filtered",isBalanced:false},
    rows:[{entryId:"1",description:"=bad",debit:"10000000000000001.12345678",runningBase:"-13"}]});
  assert.ok(csv.startsWith("\ufeff"));assert.ok(csv.includes("legacy openings not verified"));
  assert.ok(csv.includes("\"'=bad\""));assert.ok(csv.includes('"runningNative","runningBase"'));
  assert.ok(csv.includes('"10000000000000001.12345678"'));assert.ok(csv.includes('"-13"'));
});