import test from "node:test";
import assert from "node:assert/strict";
import Decimal from "decimal.js";
import { exactAmount, allocationRemainder, allocationTotal, ReceiptDecimal, receiptLabel, receiptEmptyLabel, receiptWriteAllowed, isChequeProvisional } from "./receipt-presentation";
import { receiptCopy } from "./receipt-copy";
import { normalizeAccountingDigits } from "./accounting-logic";
import {renderToStaticMarkup} from "react-dom/server";
import {ReceiptTableRow,ReceiptDetailView} from "./accounting-receipts";
import type {ReceiptDetail} from "@shared/accounting-receipts";
import type {ReceiptCopyKey} from "./receipt-copy";

test("actual receipt register/detail components render exact money, allocations, evidence, blocked actions and empty states",()=>{
  const detail:ReceiptDetail={
    metadata:{company:{id:6,name:"Test company",baseCurrency:"IRR",isActive:true},
      walletCutoverReady:false,receiptCutoverReady:false,ledgerGuardsReady:true,processingReady:false,
      activeCurrencies:["IRR"],legacyOpeningVerified:false},
    receipt:{id:12,companyId:6,customerId:15,customerName:"مشتری آزمایشی",customerCode:null,currency:"IRR",
      sourceId:"stable-reference",entryDate:"2026-04-01",method:"CHEQUE",status:"received",amount:"10000000000000001.12345678",
      walletCredit:"0",chequeNumber:"Verified cheque",reason:"Actual receipt evidence",evidenceReference:"bank-proof-12"},
    allocations:[{id:11,receivableId:5,amount:"7.12345678",status:"active",invoiceReference:"invoice-proof-5",
      invoiceJournalId:31,issuedOn:"2026-03-01",dueOn:"2026-04-01",invoiceAmount:"10",settledAmount:"7.12345678",openAmount:"2.87654322"}],
    events:[{id:1,action:"received",sourceId:"stable-reference",entryDate:"2026-04-01",journalId:32,journalStatus:"posted",
      reversalId:null,reason:"Posted staff evidence",evidenceReference:"bank-proof-12"}],
  };
  for(const language of ["fa","ar","en","tr"] as const){
    const t=(key:ReceiptCopyKey)=>receiptCopy(language,key);
    const table=renderToStaticMarkup(<table><tbody><ReceiptTableRow row={detail.receipt} language={language}
      selected={true} onSelect={()=>{}} t={t}/></tbody></table>);
    assert.ok(table.includes("10000000000000001.12345678"));assert.ok(table.includes(receiptLabel(language,"received")));
    assert.ok(table.includes("IRR"));assert.ok(table.includes("Verified cheque"));
    const html=renderToStaticMarkup(<ReceiptDetailView detail={detail} language={language} t={t} canWrite={false}
      writeReason={t("blockedReason")} onAction={()=>{}} onReports={()=>{}}/>);
    assert.ok(html.includes("invoice-proof-5"));assert.ok(html.includes("bank-proof-12"));assert.ok(html.includes("7.12345678"));
    assert.ok(html.includes(t("blockedReason")));assert.ok(html.includes('disabled=""'));
    const empty=renderToStaticMarkup(<ReceiptDetailView detail={{...detail,allocations:[],events:[]}} language={language} t={t}
      canWrite={false} writeReason={t("viewerReason")} onAction={()=>{}} onReports={()=>{}}/>);
    assert.ok(empty.includes(t("noAllocations")));assert.ok(empty.includes(t("noEvents")));
    for(const status of ["cleared","bounced","returned"] as const){
      const state=renderToStaticMarkup(<ReceiptDetailView detail={{...detail,receipt:{...detail.receipt,status}}}
        language={language} t={t} canWrite={false} writeReason={t("viewerReason")} onAction={()=>{}} onReports={()=>{}}/>);
      assert.ok(state.includes(receiptLabel(language,status)));
    }
  }
});

test("labels lifecycle states and methods in all supported languages", () => {
  for (const language of ["fa", "ar", "en", "tr"] as const) {
    assert.ok(receiptLabel(language, "received").length > 0);
    assert.ok(receiptLabel(language, "cleared").length > 0);
    assert.ok(receiptLabel(language, "bounced").length > 0);
    assert.ok(receiptLabel(language, "returned").length > 0);
    assert.ok(receiptLabel(language, "CHEQUE").length > 0);
    assert.ok(receiptEmptyLabel(language).length > 0);
    assert.ok(receiptCopy(language, "allocations").length > 0);
    assert.ok(receiptCopy(language, "events").length > 0);
    assert.ok(receiptCopy(language, "noAllocations").length > 0);
    assert.ok(receiptCopy(language, "noEvents").length > 0);
    assert.ok(receiptCopy(language, "blockedReason").length > 0);
    assert.ok(receiptCopy(language, "viewerReason").length > 0);
    assert.ok(receiptCopy(language, "scopeMismatch").length > 0);
    assert.ok(receiptCopy(language, "retryConflictWarning").length > 0);
  }
});

test("keeps large decimal money exact and computes overpayment without Number coercion", () => {
  const amount = "900719925474099312345.67009";
  assert.equal(exactAmount(amount), amount);
  assert.equal(allocationRemainder(amount, ["900719925474099312345.67"]), "0.00009");
  assert.equal(allocationRemainder("125.50", ["20.25", "5"]), "100.25");
  assert.equal(allocationTotal(["900719925474099312345.67", "0.00009"]), "900719925474099312345.67009");
});

test("uses a receipt-local Decimal clone, normalizes Persian digits, and rejects malformed totals", () => {
  assert.equal(Decimal.precision, 20);
  assert.equal(ReceiptDecimal.precision, 128);
  const amount = normalizeAccountingDigits("۱۲۵.۵۰");
  const allocation = normalizeAccountingDigits("۲۰.۲۵");
  assert.equal(allocationRemainder(amount, [allocation]), "105.25");
  assert.equal(allocationRemainder("not-money", ["20"]), null);
  assert.equal(allocationTotal(["غير-مبلغ"]), null);
});

test("write controls are blocked for viewers, unready processing, inactive companies, and inactive currencies", () => {
  const metadata = {
    company: { id: 6, name: "Roya Trading", baseCurrency: "IQD", isActive: true },
    walletCutoverReady: false, receiptCutoverReady: false, ledgerGuardsReady: false,
    processingReady: false, activeCurrencies: ["IQD"], legacyOpeningVerified: false as const,
  };
  assert.equal(receiptWriteAllowed(false, { ...metadata, processingReady: true }, "IQD", 6), false);
  assert.equal(receiptWriteAllowed(true, metadata, "IQD", 6), false);
  assert.equal(receiptWriteAllowed(true, { ...metadata, processingReady: true }, "USD", 6), false);
  assert.equal(receiptWriteAllowed(true, { ...metadata, company: { ...metadata.company, isActive: false }, processingReady: true }, "IQD", 6), false);
  assert.equal(receiptWriteAllowed(true, { ...metadata, processingReady: true }, "IQD", 5), false);
  assert.equal(receiptWriteAllowed(true, { ...metadata, processingReady: true }, "IQD", 6), true);
});

test("received and deposited cheques remain provisional; cleared and returned are not provisional", () => {
  assert.equal(isChequeProvisional("received"), true);
  assert.equal(isChequeProvisional("deposited"), true);
  assert.equal(isChequeProvisional("cleared"), false);
  assert.equal(isChequeProvisional("bounced"), false);
  assert.equal(isChequeProvisional("returned"), false);
});