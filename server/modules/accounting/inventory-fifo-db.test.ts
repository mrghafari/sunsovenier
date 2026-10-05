import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {readInventoryFifo} from "./inventory-fifo";
import {saveInventoryDocument,actInventoryDocument} from "./inventory-documents";
import {accountingOperationalFacts} from "./schema";
test("FIFO report replays company-wide documentary evidence without financial or stock writes (rollback-only)",
  {skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback=new Error("ROLLBACK_FIFO_REPORT");let done=false;
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const role=(await tx.execute(sql`select id from admin_roles where is_active
      and lower(regexp_replace(btrim(name),'[[:space:]-]+','_','g')) in ('super_admin','supper_admin','admin') order by id limit 1`)).rows[0];
    assert.ok(role);
    const actorId=Number((await tx.execute(sql`insert into users(username,email,password_hash,role_id)
      values(${"disabled-fifo-fixture-"+randomUUID()},${randomUUID()+"@example.invalid"},'disabled-fixture',${role.id}) returning id`)).rows[0].id);
    const actor={actorId,actorType:"admin" as const,canManage:true};
    const companies=(await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
      values(${"FIFO rollback "+randomUUID()},'IQ','Asia/Baghdad','IQD'),
      (${"Other FIFO rollback "+randomUUID()},'IQ','Asia/Baghdad','IQD') returning id`)).rows;
    const companyId=Number(companies[0].id),other=Number(companies[1].id);
    const product=(await tx.execute(sql`select id,to_jsonb(p) as data from shop_products p order by id limit 1`)).rows[0];
    assert.ok(product);
    const productId=Number(product.id),nativeBefore=product.data;
    const input=(cid=companyId,batch="lot-A",reference=randomUUID())=>({
      companyId:cid,sourceId:randomUUID(),kind:"purchase" as const,reference,documentDate:"2026-01-01",
      supplier:"Rollback supplier",currency:"USD",evidenceReference:"Rollback paper evidence only",notes:"",
      lines:[{productId,batchReference:batch,quantityTons:"2",totalCost:"20.00"}]});
    const approve=async(doc:Awaited<ReturnType<typeof saveInventoryDocument>>)=>
      actInventoryDocument(doc.id,"approve",{companyId:doc.companyId,revision:doc.revision,reason:"Rollback documented review"},actor,tx);
    const capture=async(orderId:number,date:string,cid=companyId,version=1)=>{
      const ref=randomUUID();
      const [f]=await tx.insert(accountingOperationalFacts).values({
        companyId:cid,orderId,eventType:"LoadingCompleted",sourceId:`${orderId}:${ref}`,actorId,actorType:"admin",
        payload:{input:{eventType:"LoadingCompleted",orderId,sourceId:ref,eventDate:date,
          weighbridgeReference:randomUUID(),actualWeightTons:"1",lines:[{orderItemId:orderId,actualWeightTons:"1"}]},
          order:{version,companyId:cid,orderId,lines:[{orderItemId:orderId,productId}]}}
      }).returning();return f;
    };
    await t.test("empty scope is explicitly a simulation, not known-zero inventory",async()=>{
      const r=await readInventoryFifo({companyId},tx);
      assert.deepEqual(r.rows,[]);assert.equal(r.sourceDocumentCount,0);assert.equal(r.historyCount,0);
      assert.equal(r.valuationStatus,"documentary_simulation");assert.equal(r.postingAllowed,false);
      assert.ok(r.pending.includes("STOCK_OPENING_RECONCILIATION"));
    });
    const usable=await approve(await saveInventoryDocument(input(),actor,tx));
    await saveInventoryDocument(input(companyId,"draft-lot"),actor,tx);
    const voided=await approve(await saveInventoryDocument(input(companyId,"void-lot"),actor,tx));
    await actInventoryDocument(voided.id,"void",{companyId,revision:voided.revision,reason:"Rollback withdraw evidence"},actor,tx);
    await approve(await saveInventoryDocument(input(other,"foreign-company-lot"),actor,tx));
    const first=await capture(101,"2026-01-02"),second=await capture(102,"2026-01-03"),third=await capture(103,"2026-01-04");
    await capture(104,"2026-01-02",other);
    const before=(await tx.execute(sql`select
      (select count(*) from accounting_audit_logs where company_id=${companyId}) as audits,
      (select count(*) from accounting_outbox where company_id=${companyId}) as outbox`)).rows[0];
    await t.test("pagination and order filters only change display, never earlier consumption",async()=>{
      const r=await readInventoryFifo({companyId,pageSize:1},tx);
      assert.equal(r.rows[0].factId,third.id);assert.equal(r.rows[0].documentedCosts,null);
      assert.deepEqual(r.rows[0].issues,["DOCUMENTED_STOCK_SHORTFALL"]);
      assert.equal(r.pagination.totalRows,3);assert.equal(r.historyCount,3);assert.equal(r.sourceDocumentCount,1);
      const selected=await readInventoryFifo({companyId,orderId:102},tx);
      assert.equal(selected.rows[0].factId,second.id);
      assert.deepEqual(selected.rows[0].documentedCosts,[{currency:"USD",amount:"10.00"}]);
      assert.equal(selected.rows[0].lines[0].allocations[0].documentId,usable.id);
      assert.equal(selected.rows[0].lines[0].allocations[0].documentRevision,usable.revision);
      assert.equal((await readInventoryFifo({companyId,page:3,pageSize:1},tx)).rows[0].factId,first.id);
      assert.equal((await readInventoryFifo({companyId:other},tx)).historyCount,1);
      await assert.rejects(()=>readInventoryFifo({companyId:2147483647},tx),/not found/);
      await assert.rejects(()=>readInventoryFifo({companyId,post:true},tx),/Unrecognized/);
    });
    await t.test("report has no mutations, fake opening, journals, wallets, AR, audit or event activation",async()=>{
      assert.deepEqual((await tx.execute(sql`select to_jsonb(p) as data from shop_products p where id=${productId}`)).rows[0].data,nativeBefore);
      const after=(await tx.execute(sql`select
        (select count(*) from accounting_audit_logs where company_id=${companyId}) as audits,
        (select count(*) from accounting_outbox where company_id=${companyId}) as outbox`)).rows[0];
      assert.deepEqual(after,before);
      for(const table of ["accounting_journal_entries","accounting_receivable_items","accounting_wallet_movements"]){
        assert.equal(Number((await tx.execute(sql`select count(*) as n from ${sql.identifier(table)} where company_id=${companyId}`)).rows[0].n),0);
      }
      const cutovers=(await tx.execute(sql`select
        (select count(*) from accounting_wallet_cutovers where company_id=${companyId} and pipeline_ready)+
        (select count(*) from accounting_receipt_cutovers where company_id=${companyId} and processing_ready)+
        (select count(*) from accounting_manual_cutovers where company_id=${companyId} and processing_ready) as n`)).rows[0];
      assert.equal(Number(cutovers.n),0);
    });
    await t.test("new corrupt prior history blocks the selected order instead of skipping evidence",async()=>{
      await capture(105,"2026-01-01",companyId,0);
      const selected=await readInventoryFifo({companyId,orderId:102},tx);
      assert.equal(selected.rows[0].documentedCosts,null);
      assert.deepEqual(selected.rows[0].issues,["INVALID_LOADING_HISTORY"]);
    });
    done=true;throw rollback;
  });}catch(e){if(e!==rollback)throw e;}finally{await pool.end();}assert.ok(done);
});
