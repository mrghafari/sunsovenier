import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ManualDocumentDetail, ManualDocumentRow } from "@shared/accounting-documents";
import { DocumentActionBar, DocumentDetailView, DocumentRegisterTable } from "./accounting-documents";
import { documentCopy, documentLanguageKeys } from "./document-copy";
import {foreignExpenseMessage} from "./foreign-expense-copy";
import { documentCapabilities, documentSaveAllowed, equalDocumentAmounts, expenseDocumentAllowed, exactDocumentAmount, preserveExactDecimal, reversalDateAllowed, validNonNegativeAmount, validPositiveAmount } from "./document-presentation";

const row:ManualDocumentRow={id:21,companyId:7,sourceId:"manual-test-21",kind:"manual",entryDate:"2025-04-09",description:"Port handling adjustment",evidenceReference:"INV-PORT-2025-09",status:"draft",revision:3,journalId:null,reversalJournalId:null,currency:"IQD",debit:"1250.500",credit:"1250.500"};
const baseDetail:ManualDocumentDetail={
  metadata:{company:{id:7,name:"Basra Metals",baseCurrency:"IQD",isActive:true},currencyDecimals:3,currencyActive:true,postingReady:false,manualCutoverReady:false,pipelineReady:false,ledgerGuardsReady:false,accounts:[{id:11,code:"6100",nameFa:"",nameAr:"مصروف نقل",nameEn:"Freight expense",type:"expense",funding:false},{id:12,code:"1010",nameFa:"",nameAr:"البنك",nameEn:"Bank",type:"asset",funding:true}],costCenters:[{id:4,code:"OPS",nameFa:"",nameAr:"العمليات",nameEn:"Operations"}],fiscalPeriods:[{id:2,name:"FY25",startsOn:"2025-01-01",endsOn:"2025-12-31",status:"open"}],baseCurrencyOnly:false,currencies:[{code:"IQD",decimals:3},{code:"USD",decimals:2}],foreignExpenseReady:false},
  row:{...row,kind:"expense"},document:{companyId:7,sourceId:row.sourceId,kind:"expense",entryDate:row.entryDate,description:row.description,evidenceReference:row.evidenceReference,lines:[{accountId:11,debit:"1250.500",credit:"0",costCenterId:4,description:"Port service"},{accountId:12,debit:"0",credit:"1250.500",costCenterId:null,description:"Paid by bank"}]},
  preview:{currency:"IQD",debit:"1250.500",credit:"1250.500",difference:"0",balanced:true,periodOpen:true},history:[{id:91,action:"reverse",actorType:"staff",entryDate:"2025-04-10",createdAt:"2025-04-10T08:30:00Z",reason:"Duplicate freight payment",evidenceReference:"BANK-REV-0410",journalId:884}],postedLines:[],
};
const fxLoss={available:true,blockingReason:null,baseCurrency:"IQD",officialRate:"1440.0000",expenseBase:"180000.000",fundingBase:"181250.000",fxGain:"0",fxLoss:"1250.000",availableNative:"0.00",availableBase:"0.000"};
const fxGain={...fxLoss,expenseBase:"180000.000",fundingBase:"181250.000",fxGain:"1250.000",fxLoss:"0"};
function foreignDetail(valuation:typeof fxLoss|typeof fxGain|{available:boolean;blockingReason:string|null;baseCurrency:string;officialRate:null;expenseBase:null;fundingBase:null;fxGain:null;fxLoss:null;availableNative:null;availableBase:null}):ManualDocumentDetail {
  const metadata={...baseDetail.metadata,postingReady:true,manualCutoverReady:true,pipelineReady:true,ledgerGuardsReady:true,foreignExpenseReady:true};
  const posted=valuation.available;
  return {...baseDetail,metadata,row:{...baseDetail.row,status:"posted",currency:"USD",journalId:901,reversalJournalId:null},document:{...baseDetail.document,currency:"USD",lines:[{accountId:11,debit:"125.00",credit:"0",costCenterId:4,description:"Port service"},{accountId:12,debit:"0",credit:"125.00",costCenterId:null,description:"Paid from foreign bank"}]},
    preview:{currency:"USD",debit:"125.00",credit:"125.00",difference:"0",balanced:true,periodOpen:true,foreignExpense:valuation},foreignExpense:valuation,
    journalAccounts:[...baseDetail.metadata.accounts,{id:99,code:"7991",nameFa:"",nameAr:valuation.fxLoss==="0"?"ربح عملة":"خسارة عملة",nameEn:valuation.fxLoss==="0"?"Realized FX gain":"Realized FX loss",type:"expense",funding:false}],
    postedLines:posted?[{accountId:11,currency:"USD",debit:"125.00",credit:"0",baseDebit:valuation.expenseBase!,baseCredit:"0",exchangeRate:"1450.0000",costCenterId:4,description:"Expense at official rate"},{accountId:12,currency:"USD",debit:"0",credit:"125.00",baseDebit:"0",baseCredit:valuation.fundingBase!,exchangeRate:"1440.0000",costCenterId:null,description:"Funding at historical carrying value"},{accountId:99,currency:"IQD",debit:valuation.fxGain!=="0"?"1250.000":"0",credit:valuation.fxLoss!=="0"?"1250.000":"0",baseDebit:valuation.fxGain!=="0"?"1250.000":"0",baseCredit:valuation.fxLoss!=="0"?"1250.000":"0",exchangeRate:"1",costCenterId:null,description:valuation.fxLoss==="0"?"Realized FX gain":"Realized FX loss"}]:[],
  };
}

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

test("production foreign-expense proof renders native cash, historical carrying value, realized gain/loss, and null valuation",()=>{
  for(const language of documentLanguageKeys){
    const loss=renderToStaticMarkup(createElement(DocumentDetailView,{detail:foreignDetail(fxLoss),language}));
    const gain=renderToStaticMarkup(createElement(DocumentDetailView,{detail:foreignDetail(fxGain),language}));
    const unavailable=renderToStaticMarkup(createElement(DocumentDetailView,{detail:foreignDetail({available:false,blockingReason:"Historical funding balance unavailable",baseCurrency:"IQD",officialRate:null,expenseBase:null,fundingBase:null,fxGain:null,fxLoss:null,availableNative:null,availableBase:null}),language}));
    const reversedDetail={...foreignDetail(fxLoss),row:{...foreignDetail(fxLoss).row,status:"reversed" as const,reversalJournalId:902},history:[{id:92,action:"reverse",actorType:"staff",entryDate:"2025-04-10",createdAt:"2025-04-10T08:30:00Z",reason:"Foreign payment returned",evidenceReference:"BANK-REV-0410",journalId:902}]};
    const reversed=renderToStaticMarkup(createElement(DocumentDetailView,{detail:reversedDetail,language}));
    assert.match(loss,/125\.00 USD/);
    assert.match(loss,/181250\.000 IQD/);
    assert.match(loss,/180000\.000 IQD/);
    assert.match(loss,/1 USD = 1440\.0000 IQD/);
    assert.ok(loss.includes(documentCopy(language,"fxLoss")));
    assert.ok(gain.includes(documentCopy(language,"fxGain")));
    assert.match(loss,/Realized FX loss/);
    assert.match(gain,/Realized FX gain/);
    assert.match(loss,/#901/);
    assert.ok(unavailable.includes(documentCopy(language,"valuationUnavailable")));
    assert.match(unavailable,/Historical funding balance unavailable/);
    assert.match(reversed,/#901/);
    assert.match(reversed,/#902/);
    assert.match(reversed,/Foreign payment returned/);
    assert.match(reversed,/BANK-REV-0410/);
    assert.match(reversed,/2025-04-10/);
    assert.ok(loss.includes(documentCopy(language,"foreignExpenseNote")));
    assert.ok(loss.includes(documentCopy(language,"postedJournalLines")));
  }
  const zero=renderToStaticMarkup(createElement(DocumentDetailView,{detail:foreignDetail(fxLoss),language:"en"}));
  assert.match(zero,/Remaining native funds[\s\S]*?0\.00 USD/);
  assert.match(zero,/Remaining carrying value[\s\S]*?0\.000 IQD/);
});

test("production action controls reflect readiness, company scope, open period, and reversal proof gates",()=>{
  const ready={...baseDetail,row:{...baseDetail.row,kind:"manual" as const},metadata:{...baseDetail.metadata,company:{...baseDetail.metadata.company,isActive:true},currencyActive:true,postingReady:true,manualCutoverReady:true,pipelineReady:true,ledgerGuardsReady:true},preview:{...baseDetail.preview,balanced:true,periodOpen:true}};
  const renderActions=(detail:ManualDocumentDetail,canManage=true)=>renderToStaticMarkup(createElement(DocumentActionBar,{detail,metadata:detail.metadata,canManage,saveAllowed:documentSaveAllowed(canManage,detail.metadata,7),pending:false,onEdit:()=>{},onDiscard:()=>{},onPost:()=>{},onReverse:()=>{},language:"en"}));
  const closed={...ready,preview:{...ready.preview,periodOpen:false}};
  const inactive={...ready,metadata:{...ready.metadata,company:{...ready.metadata.company,isActive:false}}};
  const foreignNotReady={...foreignDetail(fxLoss),row:{...foreignDetail(fxLoss).row,status:"draft" as const},metadata:{...foreignDetail(fxLoss).metadata,foreignExpenseReady:false}};
  const foreignCurrencyInactive={...foreignDetail(fxLoss),row:{...foreignDetail(fxLoss).row,status:"draft" as const},metadata:{...foreignDetail(fxLoss).metadata,currencies:[{code:"IQD",decimals:3}]}};
  for(const [detail,label,shouldBeDisabled] of [[ready,"Post journal",false],[closed,"Post journal",true],[inactive,"Post journal",true],[foreignNotReady,"Post journal",true],[foreignCurrencyInactive,"Post journal",true]] as const){
    const html=renderActions(detail);
    const at=html.indexOf(label);assert.notEqual(at,-1);
    const button=html.slice(html.lastIndexOf("<button",at),html.indexOf("</button>",at)+9);
    assert.equal(button.includes("disabled="),shouldBeDisabled,`${label} readiness for ${detail.row.status}`);
  }
  const postedClosedOriginal={...ready,row:{...ready.row,status:"posted" as const,kind:"expense" as const},preview:{...ready.preview,periodOpen:false}};
  const reversal=renderActions(postedClosedOriginal);
  assert.match(reversal,/<button[^>]*>.*?Reverse<\/button>/);
  assert.doesNotMatch(reversal,/<button[^>]*disabled=""[^>]*>.*?Reverse<\/button>/);
  assert.equal(renderActions(ready,false),"");
});
test("production detail labels original balance snapshots and unavailable reasons in every locale",()=>{
  const plain=(html:string)=>html.replace(/<[^>]*>/g,"").replace(/&#x27;/g,"'").replace(/&amp;/g,"&");
  for(const language of documentLanguageKeys){
    const posted=plain(renderToStaticMarkup(createElement(DocumentDetailView,{detail:foreignDetail(fxGain),language})));
    assert.ok(posted.includes(foreignExpenseMessage(language,"snapshot")));
    const unavailable=plain(renderToStaticMarkup(createElement(DocumentDetailView,{detail:foreignDetail({
      available:false,blockingReason:"INSUFFICIENT_FUNDING",baseCurrency:"IQD",officialRate:null,
      expenseBase:null,fundingBase:null,fxGain:null,fxLoss:null,availableNative:null,availableBase:null,
    }),language})));
    assert.ok(unavailable.includes(foreignExpenseMessage(language,"INSUFFICIENT_FUNDING")));
    assert.ok(!unavailable.includes("INSUFFICIENT_FUNDING"));
  }
});