import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb,type AccountingTransaction} from "./db";
import {pool} from "../../db";
import * as s from "./schema";
import {postJournalEntry} from "./postJournalEntry";
import {saveManualDocument,previewManualDocument,readManualDocument,readManualMetadata,postManualDocument,reverseManualDocument} from "./manual-documents";
import type {ManualDocumentInput} from "@shared/accounting-documents";
import {decimal} from "./money";

test("foreign paid expenses retain pooled historical funding and exact FX (rollback-only)",{skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback=new Error("ROLLBACK_FOREIGN_EXPENSE");let completed=false;
  const actor={actorId:1,actorType:"admin" as const,canManage:true};
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    let baseCurrency="";
    do{baseCurrency="Z"+[...randomUUID().replace(/-/g,"").slice(0,2)].map(x=>String.fromCharCode(65+parseInt(x,16))).join("");}
    while((await tx.execute(sql`select 1 from accounting_currencies where code=${baseCurrency}`)).rows.length);
    await tx.insert(s.accountingCurrencies).values({code:baseCurrency,name:"Rollback-only test base currency",decimals:3,isActive:true});
    const [c]=await tx.insert(s.accountingCompanies).values({name:`Foreign expense ${randomUUID()}`,countryCode:"IQ",timezone:"Asia/Baghdad",baseCurrency}).returning();
    await tx.insert(s.accountingFiscalYears).values({companyId:c.id,name:"Expense fiscal",startsOn:"2026-01-01",endsOn:"2026-12-31"});
    const [bank,cash,expense,equity,gain,loss,roundBank]=await tx.insert(s.accountingAccounts).values([
      {companyId:c.id,code:"BANK",type:"asset",nameAr:"بنك",nameEn:"Bank"},
      {companyId:c.id,code:"CASH",type:"asset",nameAr:"نقد",nameEn:"Cash"},
      {companyId:c.id,code:"COST",type:"expense",nameAr:"تكلفة",nameEn:"Expense"},
      {companyId:c.id,code:"EQUITY",type:"equity",nameAr:"رأس مال",nameEn:"Equity"},
      {companyId:c.id,code:"FXG",type:"revenue",nameAr:"ربح",nameEn:"FX gain"},
      {companyId:c.id,code:"FXL",type:"expense",nameAr:"خسارة",nameEn:"FX loss"},
      {companyId:c.id,code:"ROUND",type:"asset",nameAr:"نقد صغير",nameEn:"Rounding cash"},
    ]).returning();
    const [center]=await tx.insert(s.accountingCostCenters).values({companyId:c.id,code:"HQ",nameAr:"مركز",nameEn:"Center"}).returning();
    await tx.insert(s.accountingPostingRules).values([
      {companyId:c.id,key:"BANK",accountId:bank.id},{companyId:c.id,key:"CASH",accountId:cash.id},
      {companyId:c.id,key:"FX_GAIN",accountId:gain.id},{companyId:c.id,key:"FX_LOSS",accountId:loss.id},
    ]);
    const rate=async(date:string,value:string)=>{await tx.insert(s.accountingExchangeRates).values({companyId:c.id,currency:"USD",rate:value,effectiveOn:date,source:"central_bank",reference:"Rollback-only central bank reference"});};
    await rate("2026-01-01","4");await rate("2026-02-01","5");await rate("2026-04-01","3");await rate("2026-06-01","0.0001");
    const funding=async(account:number,amount:string,date:string)=>postJournalEntry({companyId:c.id,entryDate:date,description:"Isolated reconciled opening, never committed",sourceType:"TestExpenseFunding",sourceId:randomUUID(),
      lines:[{accountId:account,currency:"USD",debit:amount,credit:"0"},{accountId:equity.id,currency:"USD",debit:"0",credit:amount}]},actor,tx);
    await funding(bank.id,"100","2026-01-01");await funding(cash.id,"100","2026-01-01");
    const doc=(amount:string,date="2026-02-02",account=bank.id):ManualDocumentInput=>({
      companyId:c.id,currency:"USD",sourceId:randomUUID(),kind:"expense",entryDate:date,
      description:"Attested actual foreign expense",evidenceReference:"verified-expense-bank-statement",
      lines:[{accountId:expense.id,debit:amount,credit:"0",costCenterId:center.id,description:"Staff expense description"},
        {accountId:account,debit:"0",credit:amount,costCenterId:null,description:"Staff funding evidence"}],
    });
    async function rejected(run:(inner:AccountingTransaction)=>Promise<unknown>){
      await tx.execute(sql`savepoint foreign_expense_invalid`);
      try{await assert.rejects(()=>run(tx));}finally{await tx.execute(sql`rollback to savepoint foreign_expense_invalid`);await tx.execute(sql`release savepoint foreign_expense_invalid`);}
    }
    async function section(name:string,run:()=>Promise<void>){
      await tx.execute(sql`savepoint foreign_expense_section`);
      try{await t.test(name,run);}finally{await tx.execute(sql`rollback to savepoint foreign_expense_section`);await tx.execute(sql`release savepoint foreign_expense_section`);}
    }
    const activate=async()=>{
      await tx.execute(sql`insert into accounting_manual_cutovers(company_id,processing_ready) values(${c.id},true)`);
      await tx.execute(sql`insert into accounting_receipt_cutovers(company_id,processing_ready) values(${c.id},true)`);
      await tx.execute(sql`insert into accounting_wallet_cutovers(company_id,pipeline_ready,enabled_at,opening_reference,reviewed_by)
        values(${c.id},true,'2026-01-01','Rollback-only reconciled company opening',1)`);
    };
    await section("real preview does not activate or post; unavailable funds and rates are explicit",async()=>{
      const p=await previewManualDocument(doc("20"),tx);
      assert.equal(p.currency,"USD");assert.equal(p.foreignExpense?.expenseBase,"100.000");assert.equal(p.foreignExpense?.fundingBase,"80.000");
      assert.equal(p.foreignExpense?.fxGain,"20.000");assert.equal(p.foreignExpense?.fxLoss,"0");
      assert.equal(decimal(p.foreignExpense!.availableNative!).toFixed(),"100");assert.equal((await readManualMetadata(c.id,tx)).postingReady,false);
      const saved=await saveManualDocument({document:doc("20")},actor,tx);
      await rejected(inner=>postManualDocument(saved.id,{companyId:c.id,revision:1,attested:true},actor,inner));
      assert.equal((await previewManualDocument(doc("101"),tx)).foreignExpense?.blockingReason,"INSUFFICIENT_FUNDING");
      assert.equal((await previewManualDocument({...doc("1"),entryDate:"2025-01-01"},tx)).foreignExpense?.blockingReason,"MISSING_OFFICIAL_RATE");
      await rejected(inner=>previewManualDocument(doc("1","2026-01-01",roundBank.id),inner));
      await rejected(inner=>saveManualDocument({document:{...doc("1"),kind:"manual"}},actor,inner));
    });
    await section("partial and final expense posting recognize gain and consume the exact residual",async()=>{
      await activate();const first=await saveManualDocument({document:doc("20")},actor,tx);
      const one=await postManualDocument(first.id,{companyId:c.id,revision:1,attested:true},actor,tx);
      assert.equal((await postManualDocument(first.id,{companyId:c.id,revision:1,attested:true},actor,tx)).duplicate,true);
      const d=await readManualDocument(first.id,c.id,tx);assert.equal(d.postedLines.length,3);assert.equal(d.foreignExpense?.fundingBase,"80.000");
      assert.equal(d.postedLines[2].accountId,gain.id);assert.equal(decimal(d.postedLines[2].credit).toFixed(),"20");
      const second=await saveManualDocument({document:doc("80","2026-02-03")},actor,tx);
      await postManualDocument(second.id,{companyId:c.id,revision:1,attested:true},actor,tx);
      const balance=(await tx.execute(sql`select sum(l.debit-l.credit)::text native,sum(l.base_debit-l.base_credit)::text base
        from accounting_journal_lines l join accounting_journal_entries e on e.id=l.entry_id where e.company_id=${c.id}
        and e.status='posted' and l.account_id=${bank.id} and l.currency='USD'`)).rows[0];
      assert.ok(decimal(String(balance.native)).isZero());assert.ok(decimal(String(balance.base)).isZero());
      await rejected(inner=>reverseManualDocument(first.id,{companyId:c.id,revision:2,attested:true,entryDate:"2026-02-02",reason:"Before later funding outflow",evidenceReference:"cancellation-reference"},actor,inner));
      const reversed=await reverseManualDocument(first.id,{companyId:c.id,revision:2,attested:true,entryDate:"2026-02-04",reason:"Verified cancelled expense",evidenceReference:"bank-cancellation-evidence"},actor,tx);
      assert.equal((await readManualDocument(first.id,c.id,tx)).row.reversalJournalId,reversed.journalId);
      assert.equal((await readManualDocument(first.id,c.id,tx)).foreignExpense?.fundingBase,"80.000");
      assert.notEqual(one.journalId,reversed.journalId);
    });
    await section("cash expense loss and a later-rate reversal preserve original base values exactly",async()=>{
      await activate();const saved=await saveManualDocument({document:doc("10","2026-04-02",cash.id)},actor,tx);
      await postManualDocument(saved.id,{companyId:c.id,revision:1,attested:true},actor,tx);
      const d=await readManualDocument(saved.id,c.id,tx);assert.equal(d.foreignExpense?.fundingBase,"40.000");
      assert.equal(d.foreignExpense?.expenseBase,"30.000");assert.equal(d.postedLines[2].accountId,loss.id);
      const reversed=await reverseManualDocument(saved.id,{companyId:c.id,revision:2,attested:true,entryDate:"2026-06-02",reason:"Attested later cancellation",evidenceReference:"dated-bank-evidence"},actor,tx);
      const lines=(await tx.execute(sql`select base_debit::text,base_credit::text from accounting_journal_lines where entry_id=${reversed.journalId} order by id`)).rows;
      assert.equal(decimal(String(lines[0].base_credit)).toFixed(),"30");assert.equal(decimal(String(lines[1].base_debit)).toFixed(),"40");
      const h=(await readManualDocument(saved.id,c.id,tx)).history.at(-1)!;assert.equal(h.evidenceReference,"dated-bank-evidence");
    });
    await section("positive native last minor unit may carry zero base and reverses without invented money",async()=>{
      await activate();await tx.execute(sql`update accounting_posting_rules set account_id=${roundBank.id} where company_id=${c.id} and key='CASH'`);
      await funding(roundBank.id,"10","2026-06-01");
      const first=await saveManualDocument({document:doc("9.99","2026-06-02",roundBank.id)},actor,tx);
      await postManualDocument(first.id,{companyId:c.id,revision:1,attested:true},actor,tx);
      const last=await saveManualDocument({document:doc("0.01","2026-06-03",roundBank.id)},actor,tx);
      await postManualDocument(last.id,{companyId:c.id,revision:1,attested:true},actor,tx);
      const d=await readManualDocument(last.id,c.id,tx);assert.ok(decimal(d.foreignExpense!.fundingBase!).isZero());
      assert.ok(d.postedLines.every(l=>decimal(l.baseDebit).isZero()&&decimal(l.baseCredit).isZero()));
      const input={companyId:c.id,revision:2,attested:true,entryDate:"2026-06-04",reason:"Cancellation of final minor unit",evidenceReference:"minor-unit-cancellation"};
      await reverseManualDocument(last.id,input,actor,tx);
      assert.equal((await reverseManualDocument(last.id,input,actor,tx)).duplicate,true);
    });
    await section("orphan proofs, document tampering and direct proof/journal forgery fail closed",async()=>{
      await activate();const saved=await saveManualDocument({document:doc("5")},actor,tx);
      await rejected(async inner=>{await inner.execute(sql`insert into accounting_manual_expense_books(document_id) values(${saved.id})`);await inner.execute(sql`set constraints accounting_manual_expense_book_used immediate`);});
      const posted=await postManualDocument(saved.id,{companyId:c.id,revision:1,attested:true},actor,tx);
      await rejected(async inner=>{await inner.execute(sql`update accounting_manual_expense_books set valuation='{}' where document_id=${saved.id}`);});
      await rejected(async inner=>{await inner.execute(sql`delete from accounting_manual_expense_books where document_id=${saved.id}`);});
      await rejected(async inner=>{await inner.execute(sql`update accounting_manual_documents set input=jsonb_set(input,'{currency}','\"IQD\"'),currency='IQD',revision=revision+1 where id=${saved.id}`);});
      await rejected(inner=>postJournalEntry({companyId:c.id,entryDate:"2026-02-02",description:"Forged foreign expense without document",
        sourceType:"ManualExpense",sourceId:randomUUID(),lines:[{accountId:expense.id,currency:"USD",debit:"1",credit:"0",costCenterId:center.id},{accountId:bank.id,currency:"USD",debit:"0",credit:"1"}]},actor,inner));
      assert.ok(posted.journalId>0);
    });
    await tx.execute(sql`set constraints all immediate`);completed=true;throw rollback;
  });}catch(e){if(e!==rollback)throw e;}finally{await pool.end();}assert.ok(completed);
});