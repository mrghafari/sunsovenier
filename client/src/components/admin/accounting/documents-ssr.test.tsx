import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ManualDocumentDetail, ManualDocumentRow } from "@shared/accounting-documents";
import { DocumentDetailView, DocumentRegisterTable } from "./accounting-documents";
import { documentCopy, documentLanguageKeys } from "./document-copy";
import { documentCapabilities, documentSaveAllowed, equalDocumentAmounts, expenseDocumentAllowed, exactDocumentAmount, preserveExactDecimal, reversalDateAllowed, validNonNegativeAmount, validPositiveAmount } from "./document-presentation";

const row:ManualDocumentRow={id:21,companyId:7,sourceId:"manual-test-21",kind:"manual",entryDate:"2025-04-09",description:"Port handling adjustment",evidenceReference:"INV-PORT-2025-09",status:"draft",revision:3,journalId:null,reversalJournalId:null,currency:"IQD",debit:"1250.500",credit:"1250.500"};
const baseDetail:ManualDocumentDetail={
  metadata:{company:{id:7,name:"Basra Metals",baseCurrency:"IQD",isActive:true},currencyDecimals:3,currencyActive:true,postingReady:false,manualCutoverReady:false,pipelineReady:false,ledgerGuardsReady:false,accounts:[{id:11,code:"6100",nameFa:"",nameAr:"مصروف نقل",nameEn:"Freight expense",type:"expense",funding:false},{id:12,code:"1010",nameFa:"",nameAr:"البنك",nameEn:"Bank",type:"asset",funding:true}],costCenters:[{id:4,code:"OPS",nameFa:"",nameAr:"العمليات",nameEn:"Operations"}],fiscalPeriods:[{id:2,name:"FY25",startsOn:"2025-01-01",endsOn:"2025-12-31",status:"open"}],baseCurrencyOnly:true},
  row:{...row,kind:"expense"},document:{companyId:7,sourceId:row.sourceId,kind:"expense",entryDate:row.entryDate,description:row.description,evidenceReference:row.evidenceReference,lines:[{accountId:11,debit:"1250.500",credit:"0",costCenterId:4,description:"Port service"},{accountId:12,debit:"0",credit:"1250.500",costCenterId:null,description:"Paid by bank"}]},
  preview:{currency:"IQD",debit:"1250.500",credit:"1250.500",difference:"0",balanced:true,periodOpen:true},history:[{id:91,action:"reverse",actorType:"staff",entryDate:"2025-04-10",createdAt:"2025-04-10T08:30:00Z",reason:"Duplicate freight payment",evidenceReference:"BANK-REV-0410",journalId:884}],postedLines:[],
};

test("production register and detail render real table markup in all four locales",()=>{
  for(const language of documentLanguageKeys){
    const table=renderToStaticMarkup(createElement(DocumentRegisterTable,{items:[row],language,onSelect:()=>{},currencyDecimals:3}));
    const detail=renderToStaticMarkup(createElement(DocumentDetailView,{detail:baseDetail,language}));
    assert.match(table,/Port handling adjustment/);
    assert.match(table,/INV-PORT-2025-09/);
    assert.match(table,/1250\.500/);
    assert.match(detail,/Port service/);
    assert.match(detail,/Operations|العمليات/);
    assert.match(detail,/Duplicate freight payment/);
    assert.match(detail,/BANK-REV-0410/);
    assert.match(detail,/#884/);
    assert.ok(table.includes(documentCopy(language,"date")));
    assert.ok(detail.includes(documentCopy(language,"lines")));
    assert.ok(table.includes(documentCopy(language,"draft")));
  }
});

test("localized scope, exact amounts, expense structure, and role gates remain explicit",()=>{
  for(const language of documentLanguageKeys){
    const scope=documentCopy(language,"scope");
    assert.ok(scope.length>30);
    assert.ok(documentCopy(language,"expenseRules").length>25);
  }
  assert.equal(exactDocumentAmount("۱۲۳۴٫۵۶",2),"1234.56");
  assert.equal(exactDocumentAmount("not-a-number",2),null);
  assert.equal(preserveExactDecimal("2.005"),"2.005");
  assert.equal(preserveExactDecimal("not-a-number"),null);
  assert.equal(validPositiveAmount("٠٫٠"),false);
  assert.equal(validPositiveAmount("٠٫٠١"),true);
  assert.equal(validPositiveAmount("1.001",2),false);
  assert.equal(validPositiveAmount("1.01",2),true);
  assert.equal(validNonNegativeAmount("0.00",2),true);
  assert.equal(validNonNegativeAmount("-0.01",2),false);
  assert.equal(equalDocumentAmounts("01.250","1.25"),true);
  assert.equal(expenseDocumentAllowed(baseDetail),true);
  assert.equal(expenseDocumentAllowed({...baseDetail,document:{...baseDetail.document,lines:[baseDetail.document.lines[0]]}}),false);
  assert.deepEqual(documentCapabilities(false,baseDetail),{edit:false,discard:false,post:false,reverse:false});
  assert.deepEqual(documentCapabilities(true,baseDetail),{edit:true,discard:true,post:false,reverse:false});
  const readyDetail={...baseDetail,metadata:{...baseDetail.metadata,postingReady:true,manualCutoverReady:true,pipelineReady:true,ledgerGuardsReady:true}};
  assert.equal(documentCapabilities(true,readyDetail).post,true);
  for(const flag of ["postingReady","manualCutoverReady","pipelineReady","ledgerGuardsReady","currencyActive"] as const){
    assert.equal(documentCapabilities(true,{...readyDetail,metadata:{...readyDetail.metadata,[flag]:false}}).post,false);
    assert.equal(documentCapabilities(true,{...readyDetail,row:{...readyDetail.row,status:"posted"},metadata:{...readyDetail.metadata,[flag]:false}}).reverse,false);
  }
  assert.equal(documentSaveAllowed(true,baseDetail.metadata,7),true);
  assert.equal(documentSaveAllowed(false,baseDetail.metadata,7),false);
  assert.equal(documentSaveAllowed(true,{...baseDetail.metadata,currencyActive:false},7),false);
  assert.equal(documentSaveAllowed(true,{...baseDetail.metadata,company:{...baseDetail.metadata.company,isActive:false}},7),false);
  assert.equal(documentSaveAllowed(true,baseDetail.metadata,8),false);
  assert.deepEqual(documentCapabilities(true,{...readyDetail,row:{...readyDetail.row,status:"posted",kind:"manual"}}),{edit:false,discard:false,post:false,reverse:true});
  const postedExpense={...readyDetail,row:{...readyDetail.row,status:"posted" as const},preview:{...readyDetail.preview,periodOpen:false}};
  assert.deepEqual(documentCapabilities(true,postedExpense),{edit:false,discard:false,post:false,reverse:true});
  const laterOpenMetadata={...baseDetail.metadata,fiscalPeriods:[{id:3,name:"FY25-B",startsOn:"2025-04-10",endsOn:"2025-12-31",status:"open"}]};
  assert.equal(reversalDateAllowed(postedExpense,laterOpenMetadata,"2025-04-10"),true);
  assert.equal(reversalDateAllowed(postedExpense,laterOpenMetadata,"2025-04-09"),false);
  assert.equal(reversalDateAllowed(postedExpense,laterOpenMetadata,"2025-04-08"),false);
});