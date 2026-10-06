import test from "node:test";
import assert from "node:assert/strict";
import {fleetVariance,costReportExportLimit,readAccountingCostReport} from "./cost-reports";
import {accountingReportFiltersSchema} from "@shared/accounting-reports";
import {accountingCostReportCsv} from "./cost-report-csv";
import type {AccountingCostReport} from "@shared/accounting-cost-reports";

test("fleet variance preserves decimal precision and distinguishes under/over/zero",()=>{
  assert.deepEqual(fleetVariance("9007199254740993.001","9007199254740993"),
    {varianceBase:"0.001",underAbsorbedBase:"0.001",overAbsorbedBase:"0"});
  assert.deepEqual(fleetVariance("-10","5"),{varianceBase:"-15",underAbsorbedBase:"0",overAbsorbedBase:"15"});
  assert.deepEqual(fleetVariance("0","0"),{varianceBase:"0",underAbsorbedBase:"0",overAbsorbedBase:"0"});
});
test("report filters are strict and export is bounded without changing money",async()=>{
  const f={companyId:1,from:"2026-01-01",to:"2026-01-31"};
  assert.ok(accountingReportFiltersSchema.safeParse(f).success);
  for(const input of [{...f,to:"2025-12-31"},{...f,from:"2026-02-30"},{...f,companyId:0},
    {...f,partyId:1},{...f,posting:true},{...f,pageSize:10001}]){
    assert.equal(accountingReportFiltersSchema.safeParse(input).success,false);
  }
  costReportExportLimit(10000);assert.throws(()=>costReportExportLimit(10001),/safe row limit/);
  await assert.rejects(()=>readAccountingCostReport({...f,activate:true}),/Unrecognized key/);
});
test("CSV includes scope, full totals, missing fleet and spreadsheet-safe names",()=>{
  const r:AccountingCostReport={filters:{companyId:1,from:"2026-01-01",to:"2026-02-01",page:1,pageSize:50},
    company:{id:1,name:"=danger",baseCurrency:"IRR"},currencies:[{code:"IRR",decimals:0}],
    coverage:{postedEntryCount:0,periodEntryCount:0,expenseLineCount:1,legacyOpeningVerified:false,financialCutoversReady:false,mappingBasis:"current",includesReversals:true},
    pagination:{page:1,pageSize:50,totalRows:1},totals:{actualCostBase:"-10",allocationChargeBase:"0",absorbedBase:"0",netExpenseBase:"-10",unassignedActualCostBase:"-10",unassignedLineCount:1},
    fleet:{available:false,blockingReason:"FLEET_CENTER_REQUIRED",center:null,amounts:null,misplacedAbsorptionLineCount:0,absorbedAccountId:null,shippingExpenseAccountId:null},
    rows:[{costCenterId:null,code:null,nameFa:"@SUM(1)",nameAr:"حساب",nameEn:"line,\n\"quoted\"",currency:"IRR",lineCount:1,
      actualCostBase:"-10",allocationChargeBase:"0",absorbedBase:"0",netExpenseBase:"-10",
      actualNativeDebit:"0",actualNativeCredit:"10",actualNativeNet:"-10"}]};
  const csv=accountingCostReportCsv(r);
  assert.ok(csv.startsWith("\ufeff"));assert.match(csv,/'=danger/);assert.match(csv,/'@SUM\(1\)/);
  assert.match(csv,/"fleetAmounts","unavailable"/);assert.match(csv,/current posting mappings/i);
  assert.match(csv,/"netExpenseBase","-10"/);assert.ok(csv.includes('"line,\n""quoted"""'));
  assert.match(csv,/legacy openings.*not verified/);
});