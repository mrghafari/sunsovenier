import test from "node:test";
import assert from "node:assert/strict";
import {normalizeManualDocument,evaluateManualDocument,saveManualDocument,postManualDocument,discardManualDocument,reverseManualDocument} from "./manual-documents";
import {manualDocumentSchema,saveManualDocumentSchema,manualDocumentActionSchema,reverseManualDocumentSchema,manualDocumentFiltersSchema,type ManualDocumentMetadata} from "@shared/accounting-documents";
const meta:ManualDocumentMetadata={
  company:{id:1,name:"Test",baseCurrency:"IRR",isActive:true},currencyDecimals:8,currencyActive:true,
  postingReady:false,manualCutoverReady:false,pipelineReady:false,ledgerGuardsReady:true,baseCurrencyOnly:false,
  currencies:[{code:"IRR",decimals:8},{code:"USD",decimals:2}],foreignExpenseReady:true,
  accounts:[{id:1,code:"1100",type:"asset",funding:true,nameFa:"بانک",nameAr:"",nameEn:"Bank"},
    {id:2,code:"5500",type:"expense",funding:false,nameFa:"هزینه",nameAr:"",nameEn:"Expense"}],
  costCenters:[{id:3,code:"HQ",nameFa:"مرکز",nameAr:"",nameEn:"Center"}],
  fiscalPeriods:[{id:1,name:"Test",startsOn:"2026-01-01",endsOn:"2026-12-31",status:"open"}],
};
const input={companyId:1,sourceId:"stable-manual-source",kind:"manual",entryDate:"2026-04-01",description:"Actual staff document",
  evidenceReference:"verified-bank-evidence",lines:[{accountId:2,debit:"12.50000000",credit:"0",costCenterId:3},{accountId:1,debit:"0",credit:"12.5"}]};
test("normalizes exact money without numeric coercion and preserves source identity",()=>{
  const d=normalizeManualDocument(input);assert.equal(d.sourceId,input.sourceId);assert.equal(d.lines[0].debit,"12.5");
  const amount="900719925474099312345.12345678";
  const p=evaluateManualDocument(normalizeManualDocument({...input,lines:[{accountId:2,debit:amount,credit:"0"},{accountId:1,debit:"0",credit:amount}]}),meta);
  assert.equal(p.debit,amount);assert.equal(p.credit,amount);assert.equal(p.difference,"0");assert.equal(p.balanced,true);
});
test("unbalanced draft and closed fiscal date are explicit, never posted or fabricated balanced",()=>{
  const p=evaluateManualDocument(normalizeManualDocument({...input,entryDate:"2025-04-01",
    lines:[{accountId:2,debit:"10",credit:"0"},{accountId:1,debit:"0",credit:"7.12345678"}]}),meta);
  assert.equal(p.difference,"2.87654322");assert.equal(p.balanced,false);assert.equal(p.periodOpen,false);
});
test("safe company accounts, cost centers and one-sided precision are mandatory",()=>{
  assert.throws(()=>evaluateManualDocument(normalizeManualDocument(input),{...meta,company:{...meta.company,id:2}}),/company/);
  for(const line of [
    {accountId:999,debit:"10",credit:"0"}, {accountId:2,debit:"10",credit:"0",costCenterId:999},
    {accountId:2,debit:"10",credit:"1"}, {accountId:2,debit:"0",credit:"0"},
    {accountId:2,debit:"0.123456789",credit:"0"},
  ])assert.throws(()=>evaluateManualDocument(normalizeManualDocument({...input,lines:[line,input.lines[1]]}),meta));
});
test("paid expenses require two equal expense/bank-cash lines and an expense center",()=>{
  const d=normalizeManualDocument({...input,kind:"expense"});assert.equal(evaluateManualDocument(d,meta).balanced,true);
  for(const changed of [
    {...d,lines:[{...d.lines[0],costCenterId:null},d.lines[1]]},
    {...d,lines:[d.lines[1],d.lines[0]]},
    {...d,lines:[d.lines[0],{...d.lines[1],credit:"1"}]},
  ])assert.throws(()=>evaluateManualDocument(changed,meta),/expense/);
  assert.throws(()=>evaluateManualDocument(d,{...meta,accounts:meta.accounts.map(a=>({...a,funding:false}))}),/expense/);
});
test("clients cannot supply operational sources, foreign rates, ledger IDs or party settlements",()=>{
  for(const extra of [{sourceType:"PaymentReceived"},{journalId:1},{exchangeRate:"1.25"},{fundingBase:"1"},{reversalOfId:1}])
    assert.equal(manualDocumentSchema.safeParse({...input,...extra}).success,false);
  assert.equal(manualDocumentSchema.safeParse({...input,lines:[{...input.lines[0],partyType:"customer"},input.lines[1]]}).success,false);
  assert.equal(saveManualDocumentSchema.safeParse({document:input,id:1}).success,false);
  assert.equal(saveManualDocumentSchema.safeParse({document:input,revision:1}).success,false);
  assert.equal(manualDocumentActionSchema.safeParse({companyId:1,revision:1,attested:false}).success,false);
  assert.equal(reverseManualDocumentSchema.safeParse({companyId:1,revision:1,attested:true,entryDate:"2026-04-02",reason:"x",evidenceReference:"evidence"}).success,false);
});
test("filters are strict, bounded and paired, without accepting unsupported currencies",()=>{
  assert.equal(manualDocumentFiltersSchema.safeParse({companyId:1,status:"reversed",page:2,pageSize:100}).success,true);
  for(const f of [{from:"2026-04-01"},{from:"2026-04-02",to:"2026-04-01"},{currency:"USD"},{pageSize:101},{companyId:0}])
    assert.equal(manualDocumentFiltersSchema.safeParse({companyId:1,...f}).success,false);
});
test("viewer mutation denial precedes malformed-payload parsing and does not open a transaction",async()=>{
  const actor={actorId:1,actorType:"admin" as const,canManage:false};
  for(const run of [
    ()=>saveManualDocument({},actor),()=>postManualDocument(0,{},actor),
    ()=>discardManualDocument(0,{},actor),()=>reverseManualDocument(0,{},actor),
  ])await assert.rejects(run,e=>Boolean(e&&typeof e==="object"&&"status" in e&&e.status===403));
});
test("foreign paid expenses use active native precision while general foreign journals stay closed",()=>{
  assert.throws(()=>evaluateManualDocument(normalizeManualDocument({...input,currency:"USD"}),meta),/base-currency/);
  const d=normalizeManualDocument({...input,kind:"expense",currency:"USD"});
  assert.equal(evaluateManualDocument(d,meta).currency,"USD");
  assert.throws(()=>evaluateManualDocument({...d,currency:"EUR"},meta),/active/);
  assert.throws(()=>evaluateManualDocument({...d,lines:[{...d.lines[0],debit:"12.501"},d.lines[1]]},meta),/precision/);
  assert.equal(manualDocumentSchema.safeParse({...d,foreignExpense:{fundingBase:"10"}}).success,false);
});