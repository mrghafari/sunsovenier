import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import * as s from "./schema";
import {postJournalEntry,reverseJournalEntry} from "./postJournalEntry";
import {readAccountingReport,REPORT_EXPORT_LIMIT} from "./reports";
import {accountingReportCsv} from "./report-csv";

test("posted accounting reports, exact snapshots and exports (rollback-only)",{skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback=new Error("ROLLBACK_REPORT_FIXTURES");let complete=false;
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const actor={actorId:1,actorType:"admin" as const,canManage:true};
    const [company,other]=await tx.insert(s.accountingCompanies).values([
      {name:"Reports rollback "+randomUUID(),countryCode:"IQ",timezone:"Asia/Baghdad",baseCurrency:"IQD"},
      {name:"Other reports rollback "+randomUUID(),countryCode:"IQ",timezone:"Asia/Baghdad",baseCurrency:"IQD"},
    ]).returning();
    const [year]=await tx.insert(s.accountingFiscalYears).values({
      companyId:company.id,name:"Reports fiscal year",startsOn:"2026-01-01",endsOn:"2026-12-31",
    }).returning();
    const [bank,revenue,expense]=await tx.insert(s.accountingAccounts).values([
      {companyId:company.id,code:"1",nameFa:"بانک آزمون",nameAr:"البنك",nameEn:"Bank",type:"asset"},
      {companyId:company.id,code:"2",nameAr:"إيراد",nameEn:"Revenue",type:"revenue"},
      {companyId:company.id,code:"3",nameAr:"تكلفة",nameEn:"Expense",type:"expense"},
    ]).returning();
    const [otherAccount]=await tx.insert(s.accountingAccounts).values({companyId:other.id,code:"1",nameAr:"آخر",nameEn:"Other",type:"asset"}).returning();
    const [center]=await tx.insert(s.accountingCostCenters).values({companyId:company.id,code:"FLT",nameFa:"ناوگان",nameAr:"أسطول",nameEn:"Fleet"}).returning();
    const post=async(date:string,source:string,amount:string,currency="IQD",costCenterId?:number,description="Reports actual posted entry")=>
      postJournalEntry({companyId:company.id,entryDate:date,sourceType:"ReportFixture",sourceId:source,description,lines:[
        {accountId:bank.id,currency,debit:amount,partyType:"customer",partyId:991,costCenterId},
        {accountId:revenue.id,currency,credit:amount,partyType:"customer",partyId:991,costCenterId},
      ]},actor,tx);
    const opening="10000000000000001";
    await post("2026-01-01","opening",opening);
    const movement=await post("2026-02-01","period-iqd","10","IQD",center.id,'فارسی, "quoted"\n=staff-authored reference');
    await tx.insert(s.accountingExchangeRates).values({companyId:company.id,currency:"USD",effectiveOn:"2026-01-01",rate:"3",source:"central_bank",reference:"Rollback real test rate"});
    const fx=await post("2026-02-02","period-usd","2","USD");
    await postJournalEntry({companyId:company.id,entryDate:"2026-02-03",sourceType:"ReportExpense",sourceId:"expense",
      description:"Posted measured expense",lines:[
        {accountId:expense.id,currency:"IQD",debit:"3",costCenterId:center.id},
        {accountId:bank.id,currency:"IQD",credit:"3",costCenterId:center.id},
      ]},actor,tx);
    await reverseJournalEntry(Number(fx.entry.id),"2026-03-01","Actual correction retains original rate",actor,tx);
    // Draft and captured-only facts must never inflate a report.
    const [draft]=await tx.insert(s.accountingJournalEntries).values({companyId:company.id,fiscalYearId:year.id,entryDate:"2026-02-05",
      description:"Not posted",sourceType:"Draft",sourceId:"draft",sourceHash:"draft",createdBy:1,actorType:"admin"}).returning();
    await tx.insert(s.accountingJournalLines).values([
      {entryId:draft.id,accountId:bank.id,currency:"IQD",exchangeRate:"1",debit:"999",baseDebit:"999"},
      {entryId:draft.id,accountId:revenue.id,currency:"IQD",exchangeRate:"1",credit:"999",baseCredit:"999"},
    ]);
    await tx.insert(s.accountingOutbox).values({companyId:company.id,eventType:"PaymentReceived",sourceId:"captured",payload:{amount:"99999",captureOnly:true},status:"captured"});
    const f={companyId:company.id,from:"2026-02-01",to:"2026-02-28",page:1,pageSize:2};
    await t.test("trial balance separates opening, period movement and closing with exact large values",async()=>{
      const r=await readAccountingReport("trial-balance",f,tx);
      assert.equal(r.pagination.totalRows,3);assert.equal(r.rows.length,2);
      assert.equal(r.totals.periodBaseDebit,"19.00000000");assert.equal(r.totals.periodBaseCredit,"19.00000000");
      assert.equal(r.totals.closingDebit,"10000000000000017.00000000");
      assert.equal(r.totals.closingCredit,"10000000000000017.00000000");assert.equal(r.totals.isBalanced,true);
      assert.equal(r.coverage.postedEntryCount,5);assert.equal(r.coverage.walletCutoverReady,false);
      assert.equal(r.coverage.receiptCutoverReady,false);assert.equal(r.coverage.legacyOpeningVerified,false);
      const b=r.rows.find(x=>x.accountId===String(bank.id))!;
      assert.equal(b.openingBase,opening+".00000000");assert.equal(b.periodBaseDebit,"16.00000000");
      assert.equal(b.periodBaseCredit,"3.00000000");assert.equal(b.closingBase,"10000000000000014.00000000");
    });
    await t.test("ledger running values include opening and previous pages, with native currency partitioning",async()=>{
      const r=await readAccountingReport("ledger",{...f,accountId:bank.id,page:2,pageSize:1},tx);
      assert.equal(r.rows[0].currency,"USD");assert.equal(r.rows[0].runningNative,"2.00000000");
      assert.equal(r.rows[0].runningBase,"10000000000000017.00000000");
      assert.equal(r.nativeBalances?.find(b=>b.currency==="IQD")?.opening,opening+".00000000");
      assert.equal(r.nativeBalances?.find(b=>b.currency==="USD")?.closing,"2.00000000");
      const last=await readAccountingReport("ledger",{...f,accountId:bank.id,page:3,pageSize:1},tx);
      assert.equal(last.rows[0].runningNative,"10000000000000008.00000000");
      assert.equal(last.rows[0].runningBase,"10000000000000014.00000000");
      assert.equal(last.totals.periodBaseDebit,"16.00000000");assert.equal(last.totals.periodBaseCredit,"3.00000000");
    });
    await t.test("journal detail, account, cost-center, currency and party filters match only real posted lines",async()=>{
      const detail=await readAccountingReport("journal",{...f,entryId:movement.entry.id},tx);
      assert.equal(detail.pagination.totalRows,2);assert.ok(detail.rows.every(x=>x.entryId===String(movement.entry.id)));
      assert.ok(detail.rows.some(x=>x.costCenterNameFa==="ناوگان"));
      const scoped=await readAccountingReport("trial-balance",{...f,accountId:bank.id,currency:"IQD",costCenterId:center.id,partyType:"customer",partyId:991},tx);
      assert.equal(scoped.totals.balanceScope,"filtered");assert.equal(scoped.totals.periodBaseDebit,"10.00000000");
      assert.equal(scoped.totals.periodBaseCredit,"0.00000000");assert.equal(scoped.totals.isBalanced,false);
      assert.ok(detail.rows.every(x=>!String(x.description).includes("Not posted")));
    });
    await t.test("posted originals and reversals remain visible and cancel only at the reversal date",async()=>{
      const feb=await readAccountingReport("ledger",{...f,accountId:bank.id,currency:"USD"},tx);
      assert.equal(feb.totals.closingBase,"6.00000000");
      const march=await readAccountingReport("ledger",{...f,accountId:bank.id,currency:"USD",from:"2026-03-01",to:"2026-03-31"},tx);
      assert.equal(march.totals.openingBase,"6.00000000");assert.equal(march.totals.closingBase,"0.00000000");
      assert.equal(march.rows[0].reversalOfId,String(fx.entry.id));assert.equal(march.rows[0].runningNative,"0.00000000");
      const all=await readAccountingReport("journal",{...f,from:"2026-01-01",to:"2026-12-31",pageSize:200},tx);
      assert.equal(all.pagination.totalRows,10);assert.ok(all.rows.some(x=>x.reversalOfId===String(fx.entry.id)));
    });
    await t.test("empty companies and ranges remain honestly empty with no invented legacy balances",async()=>{
      const empty=await readAccountingReport("trial-balance",{...f,companyId:other.id},tx);
      assert.deepEqual(empty.rows,[]);assert.equal(empty.coverage.postedEntryCount,0);
      const later=await readAccountingReport("ledger",{...f,accountId:bank.id,from:"2026-04-01",to:"2026-04-30"},tx);
      assert.deepEqual(later.rows,[]);assert.equal(later.totals.openingBase,"10000000000000008.00000000");
    });
    await t.test("company isolation, invalid filters and missing ledger accounts fail explicitly",async()=>{
      await assert.rejects(()=>readAccountingReport("unknown",f,tx));
      await assert.rejects(()=>readAccountingReport("ledger",f,tx));
      await assert.rejects(()=>readAccountingReport("journal",{...f,accountId:otherAccount.id},tx));
      await assert.rejects(()=>readAccountingReport("trial-balance",{...f,entryId:movement.entry.id},tx));
      await assert.rejects(()=>readAccountingReport("journal",{...f,companyId:other.id,entryId:movement.entry.id},tx));
      await assert.rejects(()=>readAccountingReport("journal",{...f,currency:"ZZZ"},tx));
    });
    await t.test("CSV includes full filtered scope, not the visible page, and labels base currency",async()=>{
      const all=await readAccountingReport("journal",{...f,page:3,pageSize:1},tx,true);
      assert.equal(all.rows.length,6);assert.equal(all.pagination.totalRows,6);assert.equal(all.pagination.page,1);
      const csv=accountingReportCsv(all);assert.ok(csv.includes('"baseCurrency","IQD"'));
      assert.ok(csv.includes('"entryId"'));assert.ok(csv.includes('فارسی, ""quoted""'));
      assert.equal(REPORT_EXPORT_LIMIT,10000);
      const base=await readAccountingReport("trial-balance",f,tx,true);
      assert.equal(base.rows.length,3);assert.ok(accountingReportCsv(base).includes("10000000000000014.00000000"));
    });
    complete=true;throw rollback;
  });}catch(e){if(e!==rollback)throw e;}finally{await pool.end();}
  assert.ok(complete);
});