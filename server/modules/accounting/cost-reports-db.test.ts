import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import * as s from "./schema";
import {postJournalEntry,reverseJournalEntry} from "./postJournalEntry";
import {readAccountingCostReport} from "./cost-reports";
import {accountingCostReportCsv} from "./cost-report-csv";
import {Money} from "./money";

test("cost centers and fleet absorption from actual posted GL only (rollback-only)",{skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback=new Error("ROLLBACK_COST_REPORTS");let complete=false;
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    let cur="";
    do{cur="Z"+[...randomUUID().slice(0,2)].map(x=>String.fromCharCode(65+parseInt(x,16))).join("");}
    while((await tx.execute(sql`select 1 from accounting_currencies where code=${cur}`)).rows.length);
    await tx.insert(s.accountingCurrencies).values({code:cur,name:"Cost-report temporary base",decimals:3});
    const [c,other]=await tx.insert(s.accountingCompanies).values([
      {name:"Costs "+randomUUID(),countryCode:"IQ",timezone:"Asia/Baghdad",baseCurrency:cur},
      {name:"Other costs "+randomUUID(),countryCode:"IQ",timezone:"Asia/Baghdad",baseCurrency:cur},
    ]).returning();
    const [year]=await tx.insert(s.accountingFiscalYears).values({companyId:c.id,name:"Costs fiscal",startsOn:"2026-01-01",endsOn:"2026-12-31"}).returning();
    const [bank,fuel,shipping,absorb]=await tx.insert(s.accountingAccounts).values([
      {companyId:c.id,code:"BANK",type:"asset",nameAr:"بنك",nameEn:"Bank"},
      {companyId:c.id,code:"COST",type:"expense",nameAr:"وقود",nameEn:"Fuel"},
      {companyId:c.id,code:"SHIP",type:"expense",nameAr:"شحن",nameEn:"Shipping"},
      {companyId:c.id,code:"ABS",type:"expense",nameAr:"استيعاب",nameEn:"Absorption"},
    ]).returning();
    const [fleet,office,otherCenter]=await tx.insert(s.accountingCostCenters).values([
      {companyId:c.id,code:"F",nameFa:"ناوگان",nameAr:"أسطول",nameEn:"Fleet"},
      {companyId:c.id,code:"O",nameFa:"دفتر",nameAr:"مكتب",nameEn:"Office"},
      {companyId:other.id,code:"X",nameAr:"آخر",nameEn:"Other"},
    ]).returning();
    await tx.insert(s.accountingPostingRules).values([
      {companyId:c.id,key:"FLEET_COST_ABSORBED",accountId:absorb.id},
      {companyId:c.id,key:"SHIPPING_EXPENSE",accountId:shipping.id},
    ]);
    await tx.insert(s.accountingSettings).values({companyId:c.id,fleetCostCenterId:fleet.id});
    await tx.insert(s.accountingExchangeRates).values({companyId:c.id,currency:"USD",rate:"5",source:"central_bank",effectiveOn:"2026-01-01",reference:"Rollback cost report central rate"});
    const actor={actorId:1,actorType:"admin" as const,canManage:true};
    const operating=async(amount:string,center:number|null,dated="2026-02-02",currency=cur)=>{
      return postJournalEntry({companyId:c.id,entryDate:dated,description:"Attested operating cost",sourceType:"TestOperatingExpense",sourceId:randomUUID(),
        lines:[{accountId:fuel.id,currency,debit:amount,credit:"0",costCenterId:center},{accountId:bank.id,currency,debit:"0",credit:amount}]},actor,tx);
    };
    const allocation=async(amount:string,absorbedCenter:number|null=fleet.id)=>postJournalEntry({
      companyId:c.id,entryDate:"2026-02-03",description:"Internal shipping allocation",sourceType:"ShipmentCostRecorded",sourceId:randomUUID(),
      lines:[{accountId:shipping.id,currency:cur,debit:amount,credit:"0",costCenterId:fleet.id},
        {accountId:absorb.id,currency:cur,debit:"0",credit:amount,costCenterId:absorbedCenter}],
    },actor,tx);
    const filter={companyId:c.id,from:"2026-02-01",to:"2026-02-28",page:1,pageSize:1};
    const read=(extra:Record<string,unknown>={})=>readAccountingCostReport({...filter,...extra},tx);
    const eq=(a:string,b:string)=>assert.ok(new Money(a).eq(b),`${a} != ${b}`);
    await t.test("empty posted scope is honest; closed cutovers do not block read-only reporting",async()=>{
      const r=await read();assert.equal(r.coverage.financialCutoversReady,false);assert.equal(r.coverage.postedEntryCount,0);
      assert.equal(r.fleet.available,true);eq(r.fleet.amounts!.varianceBase,"0");assert.equal(r.pagination.totalRows,0);
      assert.equal(r.coverage.legacyOpeningVerified,false);
    });
    const old=await operating("100",fleet.id,"2026-01-02");
    const actual=await operating("95",fleet.id);
    await operating("20",office.id);await operating("10",null);await operating("2",fleet.id,"2026-02-02","USD");
    await operating("10000000000000000.001",office.id,"2026-02-04");
    const charge=await allocation("60");
    await t.test("all-scope totals, native currencies, expense-only classification and pagination reconcile",async()=>{
      const r=await read();assert.equal(r.pagination.totalRows,4);assert.equal(r.rows.length,1);
      eq(r.totals.actualCostBase,"10000000000000135.001");eq(r.totals.allocationChargeBase,"60");eq(r.totals.absorbedBase,"60");
      eq(r.totals.netExpenseBase,r.totals.actualCostBase);eq(r.totals.unassignedActualCostBase,"10");
      assert.equal(r.totals.unassignedLineCount,1);eq(r.fleet.amounts!.actualCostBase,"105");
      eq(r.fleet.amounts!.varianceBase,"45");eq(r.fleet.amounts!.underAbsorbedBase,"45");eq(r.fleet.amounts!.overAbsorbedBase,"0");
      const usd=await read({currency:"USD"});assert.equal(usd.rows.length,1);eq(usd.rows[0].actualNativeNet,"2");
      eq(usd.totals.actualCostBase,"10");assert.equal(usd.fleet.blockingReason,"PARTIAL_SCOPE");assert.equal(usd.fleet.amounts,null);
      const exported=await readAccountingCostReport(filter,tx,true);assert.equal(exported.rows.length,4);
      assert.ok(exported.rows.some(r=>r.costCenterId===null));assert.ok(accountingCostReportCsv(exported).includes("10000000000000135.001"));
      assert.equal(r.coverage.postedEntryCount,7);assert.equal(r.coverage.periodEntryCount,6);
    });
    await t.test("center/account/party/entry filters are scoped and partial fleet totals are never claimed",async()=>{
      const fleetOnly=await read({costCenterId:fleet.id});assert.equal(fleetOnly.fleet.available,true);eq(fleetOnly.totals.actualCostBase,"105");
      const officeOnly=await read({costCenterId:office.id});assert.equal(officeOnly.fleet.blockingReason,"PARTIAL_SCOPE");
      await assert.rejects(()=>read({costCenterId:otherCenter.id}),/another company/);
      await assert.rejects(()=>read({currency:"QQQ"}),/currency not found/);
      const byEntry=await read({entryId:actual.entry.id});eq(byEntry.totals.actualCostBase,"95");assert.equal(byEntry.fleet.amounts,null);
      const party=await read({partyType:"carrier",partyId:1});assert.equal(party.pagination.totalRows,0);assert.equal(party.fleet.blockingReason,"PARTIAL_SCOPE");
      const byAccount=await read({accountId:fuel.id});eq(byAccount.totals.actualCostBase,"10000000000000135.001");assert.equal(byAccount.fleet.available,false);
      const past=await read({from:"2026-01-01",to:"2026-01-31"});eq(past.totals.actualCostBase,"100");assert.equal(past.coverage.periodEntryCount,1);
      assert.ok(old.entry.id);
    });
    await t.test("reversals net exact historical expenses and allocation without counting absorption twice",async()=>{
      await reverseJournalEntry(charge.entry.id,"2026-02-10","Reversing original internal shipment cost",actor,tx);
      await reverseJournalEntry(actual.entry.id,"2026-02-10","Reversing original operating cost",actor,tx);
      const r=await read();eq(r.fleet.amounts!.actualCostBase,"10");eq(r.fleet.amounts!.absorbedBase,"0");
      eq(r.totals.allocationChargeBase,"0");eq(r.fleet.amounts!.varianceBase,"10");
      const day=await read({from:"2026-02-10",to:"2026-02-10"});eq(day.fleet.amounts!.actualCostBase,"-95");
      eq(day.fleet.amounts!.absorbedBase,"-60");eq(day.fleet.amounts!.varianceBase,"-35");eq(day.fleet.amounts!.overAbsorbedBase,"35");
    });
    await t.test("missing configuration or misplaced absorption is unavailable, not zero or inferred",async()=>{
      await tx.execute(sql`savepoint cost_config`);
      await allocation("5",null);
      const misplaced=await read({costCenterId:fleet.id});assert.equal(misplaced.fleet.available,false);
      assert.equal(misplaced.fleet.blockingReason,"MISPLACED_ABSORPTION");assert.equal(misplaced.fleet.misplacedAbsorptionLineCount,1);
      assert.equal(misplaced.fleet.amounts,null);await tx.execute(sql`rollback to savepoint cost_config`);
      await tx.execute(sql`delete from accounting_settings where company_id=${c.id}`);
      assert.equal((await read()).fleet.blockingReason,"FLEET_CENTER_REQUIRED");
      await tx.insert(s.accountingSettings).values({companyId:c.id,fleetCostCenterId:fleet.id});
      await tx.execute(sql`delete from accounting_posting_rules where company_id=${c.id} and key='SHIPPING_EXPENSE'`);
      const missing=await read();assert.equal(missing.fleet.blockingReason,"FLEET_MAPPING_REQUIRED");assert.equal(missing.fleet.amounts,null);
    });
    await t.test("retired historical names remain readable and reports never change ledger or activation",async()=>{
      const before=(await tx.execute(sql`select count(*)::integer n from accounting_journal_entries where company_id=${c.id}`)).rows[0].n;
      await tx.execute(sql`update accounting_cost_centers set is_active=false where id=${office.id}`);
      await tx.execute(sql`update accounting_fiscal_years set status='closed' where id=${year.id}`);
      const r=await read({costCenterId:office.id});assert.equal(r.rows[0].nameFa,"دفتر");assert.equal(r.coverage.financialCutoversReady,false);
      const after=(await tx.execute(sql`select count(*)::integer n from accounting_journal_entries where company_id=${c.id}`)).rows[0].n;
      assert.equal(before,after);
    });
    await tx.execute(sql`set constraints all immediate`);complete=true;throw rollback;
  });}catch(e){if(e!==rollback)throw e;}finally{await pool.end();}assert.ok(complete);
});