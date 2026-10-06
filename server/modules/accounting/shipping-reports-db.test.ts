import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import * as s from "./schema";
import {postJournalEntry,reverseJournalEntry} from "./postJournalEntry";
import {readShippingMarginReport} from "./shipping-reports";
import {shippingMarginCsv} from "./shipping-report-csv";
import {Money} from "./money";

test("shipping attribution, period/as-of margins and evidence gaps (rollback-only)",{skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback=new Error("ROLLBACK_SHIPPING_REPORT");let complete=false;
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    let cur="";
    do{cur="Z"+[...randomUUID().slice(0,2)].map(x=>String.fromCharCode(65+parseInt(x,16))).join("");}
    while((await tx.execute(sql`select 1 from accounting_currencies where code=${cur}`)).rows.length);
    await tx.insert(s.accountingCurrencies).values({code:cur,name:"Shipping temporary base",decimals:3});
    const [c,other]=await tx.insert(s.accountingCompanies).values([
      {name:"Shipping "+randomUUID(),countryCode:"IQ",timezone:"Asia/Baghdad",baseCurrency:cur},
      {name:"Other shipping "+randomUUID(),countryCode:"IQ",timezone:"Asia/Baghdad",baseCurrency:cur},
    ]).returning();
    await tx.insert(s.accountingFiscalYears).values({companyId:c.id,name:"Shipping FY",startsOn:"2026-01-01",endsOn:"2026-12-31"});
    const [bank,rev,cost]=await tx.insert(s.accountingAccounts).values([
      {companyId:c.id,code:"BANK",nameAr:"بنك",nameEn:"Bank",type:"asset"},{companyId:c.id,code:"SHIPREV",nameAr:"شحن",nameEn:"Shipping",type:"revenue"},
      {companyId:c.id,code:"SHIPCOST",nameAr:"تكلفة",nameEn:"Shipping cost",type:"expense"},
    ]).returning();
    const [center,wrongCenter]=await tx.insert(s.accountingCostCenters).values([
      {companyId:c.id,code:"SHIP",nameAr:"شحن",nameEn:"Shipping"},{companyId:other.id,code:"OTHER",nameAr:"آخر",nameEn:"Other"},
    ]).returning();
    await tx.insert(s.accountingPostingRules).values([{companyId:c.id,key:"SHIPPING_REVENUE",accountId:rev.id},
      {companyId:c.id,key:"SHIPPING_EXPENSE",accountId:cost.id}]);
    await tx.insert(s.accountingExchangeRates).values({companyId:c.id,currency:"USD",rate:"5",source:"central_bank",effectiveOn:"2026-01-01",reference:"Temporary report rate"});
    const actor={actorId:1,actorType:"admin" as const,canManage:true};
    const fact=async(orderId:number,reference:string,eventType:"LoadingCompleted"|"ShipmentCostRecorded",date:string,loading?:string,actualCost="60")=>{
      return (await tx.insert(s.accountingOperationalFacts).values({companyId:c.id,orderId,eventType,sourceId:`${orderId}:${reference}`,
        payload:{input:{eventType,orderId,sourceId:reference,eventDate:date,...(loading?{loadingSourceId:loading,costType:"EXTERNAL_CARRIER",actualCost,currency:cur,costDocumentReference:"doc",carrierReference:"carrier"}:
          {actualWeightTons:"1",weighbridgeReference:reference,lines:[{orderItemId:1,actualWeightTons:"1"}]})},
          order:{orderId,orderNumber:orderId===91001?"=M91001":"M"+orderId},captureOnly:true,postingEligible:false},
        actorId:1,actorType:"admin"}).returning())[0];
    };
    const revenue=async(identity:string,amount:string,date:string,currency=cur)=>postJournalEntry({
      companyId:c.id,entryDate:date,description:"Posted shipping revenue",sourceType:"LoadingCompleted",sourceId:identity,
      lines:[{accountId:bank.id,currency,debit:amount,credit:"0"},
        {accountId:rev.id,currency,debit:"0",credit:amount,costCenterId:center.id}],
    },actor,tx);
    const costPost=async(identity:string,amount:string,date:string)=>postJournalEntry({
      companyId:c.id,entryDate:date,description:"Posted shipment cost",sourceType:"ShipmentCostRecorded",sourceId:identity,
      lines:[{accountId:cost.id,currency:cur,debit:amount,credit:"0",costCenterId:center.id},
        {accountId:bank.id,currency:cur,debit:"0",credit:amount}],
    },actor,tx);
    const filter={companyId:c.id,from:"2026-01-01",to:"2026-01-31",view:"loading",page:1,pageSize:1};
    const read=(extra:Record<string,unknown>={})=>readShippingMarginReport({...filter,...extra},tx);
    const eq=(a:string|null,b:string)=>{assert.notEqual(a,null);assert.ok(new Money(a!).eq(b),`${a} != ${b}`);};
    await t.test("empty scope and closed financial activation never imply zero historical profit",async()=>{
      const r=await read();assert.equal(r.pagination.totalRows,0);assert.equal(r.totals.marginBase,null);
      assert.equal(r.coverage.financialCutoversReady,false);assert.equal(r.coverage.legacyOpeningVerified,false);
    });
    const a=await fact(91001,"A","LoadingCompleted","2026-01-10");
    const b=await fact(91001,"B","LoadingCompleted","2026-01-12");
    const zero=await fact(91002,"Z","LoadingCompleted","2026-01-15");
    const aCost=await fact(91001,"CA","ShipmentCostRecorded","2026-01-20","A");
    const zCost=await fact(91002,"CZ","ShipmentCostRecorded","2026-01-15","Z","10");
    const aRev=await revenue(a.sourceId,"100","2026-01-10");
    await revenue(b.sourceId,"40","2026-01-12");
    await revenue(zero.sourceId,"2","2026-01-15","USD");
    const zPosted=await costPost(zCost.sourceId,"10","2026-01-15");
    const aPosted=await costPost(aCost.sourceId,"60","2026-02-02");
    await t.test("captured but future/unposted costs remain unknown, while a booked zero is real",async()=>{
      const r=await read();assert.equal(r.pagination.totalRows,3);assert.equal(r.rows.length,1);
      assert.equal(r.rows[0].costBase,null);assert.equal(r.rows[0].marginBase,null);assert.equal(r.rows[0].unpostedCostCount,1);
      eq(r.totals.knownRevenueBase,"150");eq(r.totals.knownCostBase,"10");assert.equal(r.totals.incompleteGroupCount,2);
      const z=await read({orderId:91002});eq(z.rows[0].marginBase,"0");eq(z.totals.marginBase,"0");
      assert.equal(r.totals.marginBase,null);
      const exported=await readShippingMarginReport(filter,tx,true);assert.equal(exported.rows.length,3);
      const csv=shippingMarginCsv(exported);assert.ok(csv.startsWith("\ufeff"));assert.ok(csv.includes("'=M91001"));
      assert.match(csv,/selected-groups-as-of-to/);assert.match(csv,/captures are not journals/);
    });
    await t.test("late costs use prior posted revenue for as-of margin and separate period movement",async()=>{
      const r=await read({from:"2026-02-01",to:"2026-02-28"});assert.equal(r.pagination.totalRows,1);
      eq(r.rows[0].revenueBase,"100");eq(r.rows[0].costBase,"60");eq(r.rows[0].marginBase,"40");
      eq(r.rows[0].periodRevenueBase,"0");eq(r.rows[0].periodCostBase,"60");eq(r.totals.marginBase,"40");
      const order=await read({from:"2026-02-01",to:"2026-02-28",view:"order"});
      assert.equal(order.rows[0].loadingCount,2);eq(order.rows[0].revenueBase,"140");
      assert.equal(order.rows[0].unpostedCostLoadingCount,1);assert.equal(order.rows[0].marginBase,null);
      assert.ok(order.rows[0].blockedReasons.includes("COST_NOT_POSTED"));assert.equal(order.rows[0].loadingSourceId,null);
    });
    await t.test("currency/party/center narrowing is honest, and company/resource identities cannot leak",async()=>{
      for(const extra of [{currency:"USD"},{costCenterId:center.id},{partyType:"customer",partyId:1}]){
        const r=await read(extra);assert.equal(r.totals.marginBase,null);
        assert.ok(r.rows.every(row=>row.marginBase===null&&row.blockedReasons.includes("PARTIAL_SCOPE")));
      }
      assert.equal((await read({companyId:other.id})).pagination.totalRows,0);
      await assert.rejects(()=>read({costCenterId:wrongCenter.id}),/selected company/);
      await assert.rejects(()=>read({currency:"QQQ"}),/Unknown report currency/);
      const scoped=await read({orderId:91001,loadingSourceId:"A",to:"2026-02-28"});assert.equal(scoped.pagination.totalRows,1);eq(scoped.rows[0].marginBase,"40");
    });
    await t.test("originals and reversals use posted historical amounts, not current rates",async()=>{
      await reverseJournalEntry(aPosted.entry.id,"2026-02-10","Carrier refund",actor,tx);
      await reverseJournalEntry(aRev.entry.id,"2026-02-10","Shipping revenue cancelled",actor,tx);
      const r=await read({from:"2026-02-10",to:"2026-02-10",orderId:91001,loadingSourceId:"A"});
      eq(r.rows[0].revenueBase,"0");eq(r.rows[0].costBase,"0");eq(r.rows[0].marginBase,"0");
      eq(r.rows[0].periodRevenueBase,"-100");eq(r.rows[0].periodCostBase,"-60");
      assert.equal(r.rows[0].revenueEntryCount,2);assert.equal(r.rows[0].costEntryCount,2);
      assert.ok(zPosted.entry.id);
    });
    await t.test("posted costs must match immutable native evidence; frozen fleet rates survive current settings",async()=>{
      await tx.execute(sql`savepoint shipping_evidence`);
      const mismatchLoad=await fact(91004,"M","LoadingCompleted","2026-02-05");
      const mismatchCost=await fact(91004,"CM","ShipmentCostRecorded","2026-02-05","M","20");
      await revenue(mismatchLoad.sourceId,"30","2026-02-05");await costPost(mismatchCost.sourceId,"10","2026-02-05");
      const mismatch=await read({from:"2026-02-01",to:"2026-02-28",orderId:91004});
      assert.equal(mismatch.rows[0].costEvidenceIssueCount,1);assert.equal(mismatch.rows[0].marginBase,null);
      assert.ok(mismatch.rows[0].blockedReasons.includes("COST_EVIDENCE_MISMATCH"));eq(mismatch.rows[0].costBase,"10");
      const fleetLoad=await fact(91005,"F","LoadingCompleted","2026-02-05");
      await tx.insert(s.accountingOperationalFacts).values({companyId:c.id,orderId:91005,eventType:"ShipmentCostRecorded",sourceId:"91005:CF",
        payload:{input:{eventType:"ShipmentCostRecorded",orderId:91005,sourceId:"CF",eventDate:"2026-02-05",loadingSourceId:"F",costType:"INTERNAL_FLEET"},
          fleet:{rate:"3.3334",basis:"per_ton",currency:cur,costCenterId:center.id}},actorId:1,actorType:"admin"});
      await tx.insert(s.accountingSettings).values({companyId:c.id,fleetCostCenterId:center.id,fleetRate:"999",fleetRateBasis:"per_km"});
      await revenue(fleetLoad.sourceId,"10","2026-02-05");await costPost("91005:CF","3.333","2026-02-05");
      const frozen=await read({from:"2026-02-01",to:"2026-02-28",orderId:91005});assert.equal(frozen.rows[0].costEvidenceIssueCount,0);
      eq(frozen.rows[0].marginBase,"6.667");
      await tx.execute(sql`rollback to savepoint shipping_evidence`);
    });
    await t.test("unlinked shipping money and malformed facts stay visible, not assigned to a convenient order",async()=>{
      await postJournalEntry({companyId:c.id,entryDate:"2026-02-11",description:"Unlinked shipping income",sourceType:"SalesInvoice",sourceId:randomUUID(),
        lines:[{accountId:bank.id,currency:cur,debit:"20",credit:"0"},{accountId:rev.id,currency:cur,debit:"0",credit:"20"}]},actor,tx);
      const bad=await tx.insert(s.accountingOperationalFacts).values({companyId:c.id,orderId:91003,eventType:"LoadingCompleted",sourceId:"wrong-source",
        payload:{input:{eventType:"LoadingCompleted",orderId:91003,sourceId:"bad",eventDate:"2026-02-30"}},actorId:1,actorType:"admin"}).returning();
      assert.ok(bad[0].id);
      const r=await read({from:"2026-02-01",to:"2026-02-28",orderId:91001,loadingSourceId:"A"});
      assert.equal(r.coverage.unattributedPeriodLineCount,1);eq(r.coverage.unattributedPeriodRevenueBase,"20");
      assert.equal(r.coverage.unlinkedFactCount,1);assert.equal(r.totals.marginBase,null);
      eq(r.rows[0].marginBase,"0");assert.equal(r.coverage.unattributedScope,"company-period-line-filters");
    });
    await t.test("missing mappings do not fabricate money, and no reader posts or enables a cutover",async()=>{
      const before=(await tx.execute(sql`select count(*)::integer n from accounting_journal_entries where company_id=${c.id}`)).rows[0].n;
      await tx.execute(sql`delete from accounting_posting_rules where company_id=${c.id} and key='SHIPPING_REVENUE'`);
      const r=await read({to:"2026-02-28"});assert.equal(r.coverage.mappingReady,false);
      assert.ok(r.rows.every(row=>row.marginBase===null&&row.revenueBase===null&&row.blockedReasons.includes("MAPPINGS_REQUIRED")));
      assert.equal(r.coverage.financialCutoversReady,false);
      const after=(await tx.execute(sql`select count(*)::integer n from accounting_journal_entries where company_id=${c.id}`)).rows[0].n;
      assert.equal(before,after);
    });
    await tx.execute(sql`set constraints all immediate`);complete=true;throw rollback;
  });}catch(e){if(e!==rollback)throw e;}finally{await pool.end();}assert.ok(complete);
});