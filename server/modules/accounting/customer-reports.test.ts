import test from "node:test";
import assert from "node:assert/strict";
import {accountingCustomerCodeSchema,customerReportFiltersSchema,type CustomerAccountingReport} from "@shared/accounting-customer-reports";
import {customerReportCsv} from "./customer-report-csv";
test("customer report filters reject invalid dates, IDs, currencies and invented filters",()=>{
  const f={companyId:"1",customerId:"123",from:"2026-01-01",to:"2026-12-31"};
  assert.equal(customerReportFiltersSchema.parse(f).pageSize,50);
  for(const diff of [{companyId:"0"},{customerId:"2147483648"},{from:"2026-02-30"},{from:"0000-01-01"},
    {from:"2027-01-01"},{currency:"usd"},{pageSize:"201"},{page:"0"},{accountId:"1"}])
    assert.equal(customerReportFiltersSchema.safeParse({...f,...diff}).success,false,JSON.stringify(diff));
  assert.equal(customerReportFiltersSchema.parse({companyId:1,asOf:"2026-04-02",customerId:""}).customerId,undefined);
});
test("customer CSV preserves decimal precision, null deadlines and safely quoted unknown debt/credits",()=>{
  const r:CustomerAccountingReport={report:"receivables-aging",filters:{companyId:1,asOf:"2026-04-02",page:1,pageSize:50},
    company:{id:1,name:"=formula",baseCurrency:"IRR"},customer:null,
    coverage:{postedEntryCount:2,receivableAccountCount:1,walletCutoverReady:false,receiptCutoverReady:false,legacyOpeningVerified:false},
    balances:[],agingSummaries:[{currency:"IRR",current:"0",days1to30:"0",days31to60:"0",days61to90:"0",over90:"0",
      trackedOutstanding:"0",unclassifiedDebit:"10000000000000001.12345678",unclassifiedCredit:"7",ledgerClosing:"9999999999999994.12345678"}],
    rows:[{kind:"unclassified",customerName:'فارسی, "quote"\nالعربية',currency:"IRR",bucket:"unknown",dueOn:null,outstanding:"10000000000000001.12345678"},
      {kind:"unclassified",customerName:"@bad",currency:"IRR",bucket:"credit",dueOn:null,outstanding:"-7.00000000"}],
    pagination:{page:1,pageSize:50,totalRows:2}};
  const csv=customerReportCsv(r);
  assert.ok(csv.startsWith("\ufeff"));assert.ok(csv.includes("\"'=formula\""));assert.ok(csv.includes("\"'@bad\""));
  assert.ok(csv.includes('"10000000000000001.12345678"'));assert.ok(csv.includes('"-7.00000000"'));
  assert.ok(csv.includes('فارسی, ""quote""\nالعربية'));assert.ok(csv.includes("legacy openings not verified"));
  assert.ok(csv.includes("aging.IRR.unclassifiedCredit"));assert.ok(csv.includes('"dueOn"'));
});
test("business customer numbers are normalized and kept separate from internal IDs",()=>{
  for(const value of ["9300006","۹۳۰۰۰۰۶","٩٣٠٠٠٠٦"," 9300006 "]){
    assert.equal(accountingCustomerCodeSchema.parse(value),"9300006");
    const parsed=customerReportFiltersSchema.parse({companyId:1,customerCode:value,asOf:"2026-10-12"});
    assert.equal(parsed.customerCode,"9300006");
    assert.equal(parsed.customerId,undefined);
  }
  for(const value of ["8","8300006","93000060","930000","9.300006",9300006])
    assert.equal(accountingCustomerCodeSchema.safeParse(value).success,false);
  assert.equal(customerReportFiltersSchema.safeParse({companyId:1,customerCode:"9300006",customerId:8}).success,false);
  assert.equal(customerReportFiltersSchema.parse({companyId:1,customerCode:"",asOf:"2026-10-12"}).customerCode,undefined);
});