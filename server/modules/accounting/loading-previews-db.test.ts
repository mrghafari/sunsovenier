import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import * as s from "./schema";
import {readLoadingPreviews} from "./loading-previews";
test("loading previews are scoped, immutable-evidence calculations without financial writes (rollback-only)",
  {skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback=new Error("ROLLBACK_LOADING_PREVIEWS");let complete=false;
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    let currency="";
    do{currency="Z"+[...randomUUID().slice(0,2)].map(x=>String.fromCharCode(65+parseInt(x,16))).join("");}
    while((await tx.execute(sql`select 1 from accounting_currencies where code=${currency}`)).rows.length);
    await tx.insert(s.accountingCurrencies).values({code:currency,name:"Preview temporary currency",decimals:0});
    const [c,other]=await tx.insert(s.accountingCompanies).values([
      {name:"Loading preview "+randomUUID(),countryCode:"IQ",timezone:"Asia/Baghdad",baseCurrency:currency},
      {name:"Other preview "+randomUUID(),countryCode:"IQ",timezone:"Asia/Baghdad",baseCurrency:currency},
    ]).returning();
    const filters={companyId:c.id,page:1,pageSize:1};
    const capture=async(version:number,orderId:number,companyId=c.id)=>tx.insert(s.accountingOperationalFacts).values({
      companyId,orderId,eventType:"LoadingCompleted",sourceId:`${orderId}:scale-${version}`,actorId:1,actorType:"admin",
      payload:{input:{eventType:"LoadingCompleted",orderId,sourceId:`scale-${version}`,eventDate:"2026-10-04",weighbridgeReference:"weigh-ticket",
        actualWeightTons:"24.350",lines:[{orderItemId:1,actualWeightTons:"24.350"}]},
      order:{version,companyId,orderId,orderNumber:`M${orderId}`,currency,shippingMode:"CUSTOMER_ARRANGED",shippingPrice:"0",
        shippingPriceBasis:"fixed",paymentTermsDays:0,
        lines:[{version,orderItemId:1,unit:"ton",priceBasis:"native_order_unit",lockedUnitPrice:"1000",taxRate:"0"}]}}
    });
    await t.test("empty scope is not an issued invoice or posting permission",async()=>{
      const r=await readLoadingPreviews(filters,tx);assert.equal(r.pagination.totalRows,0);
      assert.equal(r.postingAllowed,false);assert.equal(r.readOnly,true);
      assert.ok(r.pending.includes("OPENING_AND_CUTOVER"));assert.ok(r.pending.includes("INVENTORY_COST_EVIDENCE"));
    });
    await capture(1,93001);await capture(0,93002);await capture(1,93001,other.id);
    await t.test("calculation uses captured snapshots and paginates all facts including blocked legacy history",async()=>{
      const one=await readLoadingPreviews(filters,tx);assert.equal(one.pagination.totalRows,2);
      assert.equal(one.rows.length,1);assert.equal(one.rows[0].orderId,93002);
      assert.ok(one.rows[0].issues.includes("LEGACY_SNAPSHOT"));assert.equal(one.rows[0].amounts,null);
      const two=await readLoadingPreviews({...filters,page:2},tx);assert.equal(two.rows[0].amounts?.total,"24350");
      assert.equal(two.rows[0].amounts?.dueDate,"2026-10-04");assert.equal(two.postingAllowed,false);
    });
    await t.test("company and numeric order filters do not expose other companies",async()=>{
      const only=await readLoadingPreviews({...filters,orderId:93001},tx);assert.equal(only.pagination.totalRows,1);
      assert.equal(only.company.id,c.id);assert.equal(only.rows[0].orderId,93001);
      assert.equal((await readLoadingPreviews({...filters,companyId:other.id},tx)).pagination.totalRows,1);
      await assert.rejects(()=>readLoadingPreviews({...filters,companyId:2147483647},tx),/not found/);
      await assert.rejects(()=>readLoadingPreviews({...filters,post:true},tx),/Unrecognized key/);
    });
    await t.test("preview does not create journals, receivables, wallet movements or activate cutovers",async()=>{
      await readLoadingPreviews({...filters,pageSize:100},tx);
      for(const table of ["accounting_journal_entries","accounting_receivable_items","accounting_wallet_movements"]){
        const n=(await tx.execute(sql`select count(*)::integer n from ${sql.identifier(table)} where company_id=${c.id}`)).rows[0].n;
        assert.equal(n,0);
      }
      const cutovers=(await tx.execute(sql`select
        (select count(*) from accounting_wallet_cutovers where company_id=${c.id} and pipeline_ready)+
        (select count(*) from accounting_receipt_cutovers where company_id=${c.id} and processing_ready)+
        (select count(*) from accounting_manual_cutovers where company_id=${c.id} and processing_ready) as n`)).rows[0];
      assert.equal(Number(cutovers.n),0);
    });
    await tx.execute(sql`set constraints all immediate`);complete=true;throw rollback;
  });}catch(e){if(e!==rollback)throw e;}finally{await pool.end();}assert.ok(complete);
});