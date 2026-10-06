import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {readInventoryDocument,readInventoryDocuments,readInventoryDocumentMetadata,saveInventoryDocument,actInventoryDocument} from "./inventory-documents";
test("documentary purchases/openings are revisioned, scoped, auditable and nonfinancial (rollback-only)",
  {skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback=new Error("ROLLBACK_INVENTORY_DOCUMENTS");let done=false;
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const role=(await tx.execute(sql`select id from admin_roles where is_active
      and lower(regexp_replace(btrim(name),'[[:space:]-]+','_','g')) in ('super_admin','supper_admin','admin') order by id limit 1`)).rows[0];
    assert.ok(role,"An existing privileged role is required for a verified disabled fixture account");
    const actorId=Number((await tx.execute(sql`insert into users(username,email,password_hash,role_id)
      values(${"disabled-inventory-fixture-"+randomUUID()},${randomUUID()+"@example.invalid"},'disabled-fixture-hash',${role.id}) returning id`)).rows[0].id);
    const actor={actorId,actorType:"admin" as const,canManage:true};
    const companyId=Number((await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
      values(${"Inventory fixture "+randomUUID()},'IQ','Asia/Baghdad','IQD') returning id`)).rows[0].id);
    const meta=await readInventoryDocumentMetadata(companyId,tx);
    assert.ok(meta.products.length,"Catalog references are required");
    const productId=meta.products[0].id;
    const nativeBefore=(await tx.execute(sql`select to_jsonb(p) as data from shop_products p where id=${productId}`)).rows[0].data;
    const input={companyId,sourceId:randomUUID(),kind:"purchase" as const,reference:"Fixture invoice "+randomUUID(),
      documentDate:"2026-06-02",supplier:"Rollback supplier",currency:"USD",evidenceReference:"Rollback paper evidence",
      notes:"",lines:[{productId,batchReference:"Fixture-batch-A",quantityTons:"24.350",totalCost:"12000.25"},
        {productId,batchReference:"Fixture-batch-B",quantityTons:"1.2",totalCost:"100.10"}]};
    let saved:Awaited<ReturnType<typeof saveInventoryDocument>>;
    const rejectedSql=async(q:Parameters<typeof tx.execute>[0])=>{
      await tx.execute(sql`savepoint rejected_inventory_sql`);let rejected=false;
      try{await tx.execute(q);}catch{rejected=true;}
      finally{await tx.execute(sql`rollback to savepoint rejected_inventory_sql`);await tx.execute(sql`release savepoint rejected_inventory_sql`);}
      assert.ok(rejected);
    };
    await t.test("empty lists are honest and saves preserve exact amounts and idempotency",async()=>{
      assert.equal((await readInventoryDocuments({companyId},tx)).total,0);
      assert.equal(meta.postingAllowed,false);assert.equal(meta.valuationStatus,"documentary_only");
      saved=await saveInventoryDocument(input,actor,tx);
      assert.equal(saved.totalCost,"12100.35");assert.equal(saved.totalTons,"25.55");
      assert.equal(saved.status,"draft");assert.equal(saved.revision,1);assert.equal(saved.stockChanged,false);
      assert.equal((await saveInventoryDocument(input,actor,tx)).duplicate,true);
      await assert.rejects(()=>saveInventoryDocument({...input,notes:"conflicting source"},actor,tx),/already used/);
      await assert.rejects(()=>saveInventoryDocument({...input,sourceId:randomUUID()}, {...actor,canManage:false},tx),/permission/);
      await assert.rejects(()=>saveInventoryDocument({...input,sourceId:randomUUID(),currency:"IQD"},actor,tx),/precision/);
      await assert.rejects(()=>saveInventoryDocument({...input,sourceId:randomUUID(),documentDate:"2099-01-01"},actor,tx),/Future/);
    });
    await t.test("company scope, stale edits and draft approval require the exact current document",async()=>{
      await assert.rejects(()=>readInventoryDocument(saved.id,2147483647,tx),/not found/);
      saved=await saveInventoryDocument({...input,id:saved.id,revision:saved.revision,notes:"Reviewed draft"},actor,tx);
      assert.equal(saved.revision,2);
      await assert.rejects(()=>saveInventoryDocument({...input,id:saved.id,revision:1,notes:"Stale draft"},actor,tx),/changed/);
      const command={companyId,revision:saved.revision,reason:"Actual documentary review fixture"};
      saved=await actInventoryDocument(saved.id,"approve",command,actor,tx);
      assert.equal(saved.status,"approved");assert.equal(saved.approval?.actorId,String(actorId));
      assert.equal((await actInventoryDocument(saved.id,"approve",command,actor,tx)).duplicate,true);
      await assert.rejects(()=>saveInventoryDocument({...input,id:saved.id,revision:saved.revision,notes:"Rewrite approved proof"},actor,tx),/drafts/);
      await rejectedSql(sql`update accounting_inventory_documents set total_cost='1' where id=${saved.id}`);
      await rejectedSql(sql`delete from accounting_inventory_documents where id=${saved.id}`);
    });
    await t.test("voiding preserves approved evidence; discarded drafts remain visible and immutable",async()=>{
      const prior=saved.approval;
      saved=await actInventoryDocument(saved.id,"void",{companyId,revision:saved.revision,reason:"Withdraw incorrect documentary evidence fixture"},actor,tx);
      assert.equal(saved.status,"voided");assert.deepEqual(saved.approval,prior);assert.ok(saved.closure);
      const opening=await saveInventoryDocument({...input,sourceId:randomUUID(),kind:"opening",supplier:"",reference:"Opening fixture "+randomUUID()},actor,tx);
      const closed=await actInventoryDocument(opening.id,"discard",{companyId,revision:opening.revision,reason:"Discard unused opening draft fixture"},actor,tx);
      assert.equal(closed.status,"discarded");
      await assert.rejects(()=>actInventoryDocument(closed.id,"approve",{companyId,revision:closed.revision,reason:"Try approving discarded evidence"},actor,tx),/transition/);
      const list=await readInventoryDocuments({companyId,pageSize:1},tx);assert.equal(list.total,2);assert.equal(list.rows.length,1);
    });
    await t.test("missing review timestamps and counterfeit approvals cannot bypass database guards",async()=>{
      const draft=await saveInventoryDocument({...input,sourceId:randomUUID(),reference:"Forged fixture "+randomUUID()},actor,tx);
      await rejectedSql(sql`update accounting_inventory_documents set status='approved',revision=revision+1,
        approval=${JSON.stringify({actorId:String(actorId),actorType:"admin",reason:"No timestamp fixture"})}::jsonb where id=${draft.id}`);
      await rejectedSql(sql`update accounting_inventory_documents set status='approved',revision=revision+1,
        approval=${JSON.stringify({actorId:"999999",actorType:"admin",reason:"Wrong actor fixture",at:new Date().toISOString()})}::jsonb where id=${draft.id}`);
    });
    await t.test("no physical stock, opening balances, ledger, wallet, AR or event eligibility changes",async()=>{
      assert.deepEqual((await tx.execute(sql`select to_jsonb(p) as data from shop_products p where id=${productId}`)).rows[0].data,nativeBefore);
      const counts=(await tx.execute(sql`select
        (select count(*)::integer from accounting_journal_entries where company_id=${companyId}) as journals,
        (select count(*)::integer from accounting_wallet_movements where company_id=${companyId}) as wallets,
        (select count(*)::integer from accounting_receivable_items where company_id=${companyId}) as ar,
        (select count(*)::integer from accounting_outbox where company_id=${companyId}) as events,
        (select count(*)::integer from accounting_audit_logs where company_id=${companyId} and entity_type='inventory_document') as audits`)).rows[0];
      assert.equal(counts.journals,0);assert.equal(counts.wallets,0);assert.equal(counts.ar,0);assert.equal(counts.events,0);
      assert.ok(Number(counts.audits)>=7);
    });
    done=true;throw rollback;
  });}catch(e){if(e!==rollback)throw e;}finally{await pool.end();}
  assert.ok(done);
});
