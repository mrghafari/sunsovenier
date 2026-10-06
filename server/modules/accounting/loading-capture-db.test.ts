import test from "node:test";
import assert from "node:assert/strict";
import {randomInt,randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {captureMeasuredLoading,readLoadingCaptureContext} from "./loading-capture";
import {readLoadingPreviews} from "./loading-previews";
test("transactional measured loading, documented inventory evidence and native nonmutation (rollback-only)",
  {skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback=new Error("ROLLBACK_LOADING_CAPTURE");let complete=false;
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const company=Number((await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
      values('Measured fixture','IQ','Asia/Baghdad','IQD') returning id`)).rows[0].id);
    await tx.execute(sql`insert into accounting_source_bindings(source_module,company_id,capture_enabled)
      values('shop',${company},true) on conflict(source_module) do update set company_id=excluded.company_id,capture_enabled=true`);
    const id=2000000000+randomInt(1,1000000);
    await tx.execute(sql`insert into crm_customers(id,email,first_name,last_name) values(${id},${randomUUID()+"@example.invalid"},'Loading','Fixture')`);
    await tx.execute(sql`insert into customer_orders(id,order_number,customer_id,total_amount,currency,shipping_address,payment_method,delivery_method,shipping_cost,created_at)
      values(${id},${"TEST-"+randomUUID()},${id},100,'IQD','{}'::json,'wallet_full','pickup',0,'2026-06-01'::timestamp)`);
    await tx.execute(sql`insert into order_items(id,order_id,product_id,product_name,product_sku,quantity,unit_price,total_price,unit)
      values(${id},${id},1,'Captured native kg','CAPTURE-TEST',10,2,20,'kg')`);
    const actor={actorId:1,actorType:"admin" as const,canManage:true};
    const input={companyId:company,orderId:id,sourceId:"truck-A",eventDate:"2026-06-02",weighbridgeReference:"ticket-A",
      actualWeightTons:"24.350",lines:[{orderItemId:id,actualWeightTons:"24.350"}],
      inventoryCosts:[{orderItemId:id,batchReference:"warehouse-batch-A",documentReference:"purchase-invoice-A",weightTons:"24.350",amount:"4870",currency:"IQD"}]};
    const before=(await tx.execute(sql`select status,total_amount::text,accounting_snapshot from customer_orders where id=${id}`)).rows[0];
    const productBefore=(await tx.execute(sql`select stock_quantity from shop_products where id=1`)).rows[0];
    await t.test("context exposes frozen order prices and explicit metric conversion without changing them",async()=>{
      const c=await readLoadingCaptureContext({companyId:company,orderId:id},actor,tx);
      assert.equal(c.lines[0].lockedUnitPrice,"2.00");assert.equal(c.pricing[0].pricePerTon,"2000");
      assert.equal(c.financialPostingAllowed,false);assert.equal(c.loadings.length,0);
      const view=await readLoadingCaptureContext({companyId:company,orderId:id},{...actor,canManage:false},tx);
      assert.equal(view.permissions.canCapture,false);
      await assert.rejects(()=>readLoadingCaptureContext({companyId:company+1,orderId:id},actor,tx),/selected accounting company/);
    });
    let factId=0;
    await t.test("fact, costs, metric price, actor, audit and ineligible outbox commit atomically",async()=>{
      const r=await captureMeasuredLoading(input,actor,tx);factId=r.factId;assert.equal(r.duplicate,false);
      const fact=(await tx.execute(sql`select payload from accounting_operational_facts where id=${factId}`)).rows[0].payload as any;
      assert.equal(fact.input.actualWeightTons,"24.35");assert.equal(fact.inventoryEvidence.costs[0].amount,"4870");
      assert.equal(fact.inventoryEvidence.basis,"staff-document-attestation-not-verified-stock-valuation");
      assert.equal(fact.pricingEvidence[0].pricePerTon,"2000");
      const event=(await tx.execute(sql`select payload,status from accounting_outbox where company_id=${company}
        and event_type='LoadingCompleted' and source_id=${`${id}:truck-A`}`)).rows[0];
      assert.equal(event.status,"captured");assert.equal((event.payload as any).postingEligible,false);
      assert.equal(Number((await tx.execute(sql`select count(*) n from accounting_audit_logs where company_id=${company}
        and entity_id=${String(factId)} and action='capture_operational_event'`)).rows[0].n),1);
      const preview=await readLoadingPreviews({companyId:company},tx);assert.equal(preview.rows[0].amounts?.goods,"48700");
      assert.equal(preview.postingAllowed,false);assert.ok(preview.pending.includes("INVENTORY_COST_EVIDENCE"));
      const ctx=await readLoadingCaptureContext({companyId:company,orderId:id},actor,tx);
      assert.equal(ctx.loadings[0].inventoryCosts[0].documentReference,"purchase-invoice-A");
    });
    await t.test("stable retries reuse source identity and conflicting payloads never overwrite",async()=>{
      const retry=await captureMeasuredLoading(input,actor,tx);assert.equal(retry.factId,factId);assert.equal(retry.duplicate,true);
      await assert.rejects(()=>captureMeasuredLoading({...input,weighbridgeReference:"different"},actor,tx),/different payload/);
      assert.equal(Number((await tx.execute(sql`select count(*) n from accounting_operational_facts where company_id=${company}`)).rows[0].n),1);
    });
    await t.test("bad batch weights/currency precision and missing measured line references roll back before capture",async()=>{
      await assert.rejects(()=>captureMeasuredLoading({...input,sourceId:"bad-weight",inventoryCosts:[{...input.inventoryCosts[0],weightTons:"1"}]},actor,tx),
        /batch weights/);
      await assert.rejects(()=>captureMeasuredLoading({...input,sourceId:"bad-amount",inventoryCosts:[{...input.inventoryCosts[0],amount:"1.01"}]},actor,tx),
        /currency precision/);
      await assert.rejects(()=>captureMeasuredLoading({...input,sourceId:"bad-line",inventoryCosts:[{...input.inventoryCosts[0],orderItemId:1}]},actor,tx),
        /measured order lines/);
      await assert.rejects(()=>captureMeasuredLoading(input,{...actor,canManage:false},tx),/management permission/);
    });
    await t.test("order amount/status/snapshot, product stock and all financial gates are unchanged",async()=>{
      const after=(await tx.execute(sql`select status,total_amount::text,accounting_snapshot from customer_orders where id=${id}`)).rows[0];
      assert.deepEqual(after,before);assert.deepEqual((await tx.execute(sql`select stock_quantity from shop_products where id=1`)).rows[0],productBefore);
      for(const table of ["accounting_journal_entries","accounting_wallet_holds","accounting_wallet_movements","accounting_receivable_items"]){
        assert.equal(Number((await tx.execute(sql`select count(*) n from ${sql.identifier(table)} where company_id=${company}`)).rows[0].n),0);
      }
      const gates=(await tx.execute(sql`select
        (select count(*) from accounting_wallet_cutovers where company_id=${company} and pipeline_ready)+
        (select count(*) from accounting_receipt_cutovers where company_id=${company} and processing_ready)+
        (select count(*) from accounting_manual_cutovers where company_id=${company} and processing_ready) as n`)).rows[0];
      assert.equal(Number(gates.n),0);
    });
    await tx.execute(sql`set constraints all immediate`);complete=true;throw rollback;
  });}catch(e){if(e!==rollback)throw e;}finally{await pool.end();}assert.ok(complete);
});