import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import * as s from "./schema";
import {approveLoadingShipping} from "./loading-shipping";
import {readLoadingPreviews} from "./loading-previews";
import type {AccountingAccess} from "@shared/accounting-api";

test("reviewed fixed freight shares are capped, immutable evidence only (rollback-only)",
  {skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback=new Error("ROLLBACK_SHIPPING_APPROVALS");let complete=false;
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    let currency="";
    do{currency="Z"+[...randomUUID().slice(0,2)].map(x=>String.fromCharCode(65+parseInt(x,16))).join("");}
    while((await tx.execute(sql`select 1 from accounting_currencies where code=${currency}`)).rows.length);
    await tx.insert(s.accountingCurrencies).values({code:currency,name:"Freight test currency",decimals:2});
    const [company,other]=await tx.insert(s.accountingCompanies).values([
      {name:"Freight approval "+randomUUID(),countryCode:"IQ",timezone:"Asia/Baghdad",baseCurrency:currency},
      {name:"Other freight "+randomUUID(),countryCode:"IQ",timezone:"Asia/Baghdad",baseCurrency:currency},
    ]).returning();
    const actor={actorId:1,actorType:"admin",canView:true,canManage:true} as AccountingAccess;
    let capturedFacts=0;
    const capture=async(sourceId:string,total="100",orderId=95001,version=1)=>{
      const [fact]=await tx.insert(s.accountingOperationalFacts).values({
        companyId:company.id,orderId,eventType:"LoadingCompleted",sourceId:`${orderId}:${sourceId}`,actorId:1,actorType:"admin",
        payload:{input:{eventType:"LoadingCompleted",orderId,sourceId,eventDate:"2026-10-05",weighbridgeReference:`weight-${sourceId}`,
          actualWeightTons:"5.5",lines:[{orderItemId:1,actualWeightTons:"5.5"}]},
          order:{version,companyId:company.id,orderId,orderNumber:`M${orderId}`,currency,shippingMode:"SELLER_ARRANGED",
            shippingPrice:total,shippingPriceBasis:"fixed",paymentTermsDays:5,
            lines:[{version:1,orderItemId:1,unit:"ton",priceBasis:"native_order_unit",lockedUnitPrice:"1000",taxRate:"0"}]}}
      }).returning();capturedFacts+=1;return fact.id;
    };
    const first=await capture("first"),second=await capture("second"),third=await capture("third");
    const command=(factId:number,amount:string)=>({companyId:company.id,factId,amount,evidenceReference:"freight-note-123",reason:"Reviewed manual freight share"});
    const preview=()=>readLoadingPreviews({companyId:company.id,orderId:95001},tx);
    const rejectedSql=async(query:Parameters<typeof tx.execute>[0],pattern:RegExp)=>{
      await tx.execute(sql`savepoint rejection`);
      try{await assert.rejects(()=>tx.execute(query),(error:unknown)=>{
        const wrapped=error as {message?:string;cause?:{message?:string}};
        return pattern.test(wrapped.cause?.message??wrapped.message??"");
      });}
      finally{await tx.execute(sql`rollback to savepoint rejection`);await tx.execute(sql`release savepoint rejection`);}
    };
    await t.test("pending evidence exposes full budget and cannot create an invoice",async()=>{
      const report=await preview();assert.equal(report.postingAllowed,false);assert.equal(report.readOnly,true);
      for(const row of report.rows){assert.equal(row.amounts,null);assert.equal(row.fixedShipping?.remaining,"100.00");}
    });
    await t.test("viewers, malformed amounts, wrong company and legacy facts are rejected",async()=>{
      await assert.rejects(()=>approveLoadingShipping(command(first,"40"),{...actor,canManage:false},tx),/management permission/);
      await assert.rejects(()=>approveLoadingShipping(command(first,"40.001"),actor,tx),/currency precision/);
      await assert.rejects(()=>approveLoadingShipping(command(first,"-1"),actor,tx));
      await assert.rejects(()=>approveLoadingShipping({...command(first,"40"),companyId:other.id},actor,tx),/not found/);
      const legacy=await capture("legacy","100",95002,0);
      await assert.rejects(()=>approveLoadingShipping(command(legacy,"40"),actor,tx),/snapshot/);
    });
    await t.test("approved shares feed exact arithmetic without repricing goods or consuming the remainder",async()=>{
      const result=await approveLoadingShipping(command(first,"40"),actor,tx);assert.equal(result.duplicate,false);
      const report=await preview(),row=report.rows.find(row=>row.factId===first)!;
      assert.equal(row.amounts?.goods,"5500.00");assert.equal(row.amounts?.shipping,"40.00");assert.equal(row.amounts?.total,"5540.00");
      assert.equal(row.fixedShipping?.evidenceReference,"freight-note-123");
      for(const entry of report.rows){assert.equal(entry.fixedShipping?.approvedTotal,"40.00");assert.equal(entry.fixedShipping?.remaining,"60.00");}
      assert.equal(report.rows.find(row=>row.factId===second)?.amounts,null);
    });
    await t.test("retries are idempotent; approved evidence and changed snapshots cannot be replaced",async()=>{
      assert.equal((await approveLoadingShipping(command(first,"40.00"),actor,tx)).duplicate,true);
      await assert.rejects(()=>approveLoadingShipping(command(first,"41"),actor,tx),/cannot be replaced/);
      const conflicting=await capture("conflicting","101");
      await assert.rejects(()=>approveLoadingShipping(command(conflicting,"10"),actor,tx),/snapshot differs/);
      const audit=(await tx.execute(sql`select count(*)::integer n from accounting_audit_logs
        where company_id=${company.id} and action='approve_loading_shipping'`)).rows[0];
      assert.equal(audit.n,1);
      await rejectedSql(sql`update accounting_loading_shipping set amount=41 where fact_id=${first}`,/immutable/);
      await rejectedSql(sql`delete from accounting_loading_shipping where fact_id=${first}`,/immutable/);
    });
    await t.test("combined shares are capped both by service and database guard",async()=>{
      await assert.rejects(()=>approveLoadingShipping(command(second,"60.01"),actor,tx),/exceed/);
      await rejectedSql(sql`insert into accounting_loading_shipping(fact_id,company_id,order_id,currency,order_shipping_total,
        amount,evidence_reference,reason,actor_id,actor_type) values(${second},${company.id},95001,${currency},100,
        60.01,'freight-note-456','Reviewed freight share',1,'admin')`,/exceed/);
      await approveLoadingShipping(command(second,"60"),actor,tx);
      await assert.rejects(()=>approveLoadingShipping(command(third,"0.01"),actor,tx),/exceed/);
      await approveLoadingShipping(command(third,"0"),actor,tx);
      const report=await preview();
      for(const row of report.rows.filter(row=>[first,second,third].includes(row.factId))){
        assert.equal(row.fixedShipping?.remaining,"0.00");assert.equal(row.fixedShipping?.approvedTotal,"100.00");
      }
      assert.equal(report.rows.find(row=>row.factId===third)?.amounts?.shipping,"0.00");
    });
    await t.test("no posting, wallet movement or stock write accompanies evidence approval",async()=>{
      const result=(await tx.execute(sql`select
        (select count(*) from accounting_journal_entries where company_id=${company.id})::integer as journals,
        (select count(*) from accounting_outbox where company_id=${company.id})::integer as events,
        ((select count(*) from accounting_wallet_cutovers where company_id=${company.id} and pipeline_ready)+
         (select count(*) from accounting_receipt_cutovers where company_id=${company.id} and processing_ready)+
         (select count(*) from accounting_manual_cutovers where company_id=${company.id} and processing_ready))::integer as enabled`)).rows[0];
      // Capturing the fixtures already produces capture-only outbox rows.
      // Freight approval must neither create additional events nor activate them.
      assert.deepEqual(result,{journals:0,events:capturedFacts,enabled:0});
      const wallets=(await tx.execute(sql`select count(*)::integer n from accounting_wallet_movements where company_id=${company.id}`)).rows[0];
      assert.equal(wallets.n,0);
    });
    await tx.execute(sql`set constraints all immediate`);
    complete=true;throw rollback;
  });}catch(error){if(error!==rollback){console.error("Freight fixture database cause:",(error as {cause?:Error}).cause?.message);throw error;}}finally{await pool.end();}
  assert.equal(complete,true);
});
