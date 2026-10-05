import test from "node:test";
import assert from "node:assert/strict";
import {randomInt,randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {recordOperationalEvent} from "./events";
import {readCommercialWeight,approveCommercialWeight,resolveCommercialAccess} from "./commercial-weight";
import {readLoadingPreviews} from "./loading-previews";

test("contractual aggregate review is scoped, Commercial-only, immutable and stale on new loadings (rollback-only)",
  {skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback=new Error("ROLLBACK_COMMERCIAL_WEIGHT");let complete=false;
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const company=Number((await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
      values(${`Commercial test ${randomUUID()}`},'IQ','Asia/Baghdad','IQD') returning id`)).rows[0].id);
    await tx.execute(sql`insert into accounting_source_bindings(source_module,company_id,capture_enabled) values('shop',${company},true)
      on conflict(source_module) do update set company_id=excluded.company_id,capture_enabled=true`);
    const id=1900000000+randomInt(1,9000000),roleId=randomUUID(),customId=randomUUID();
    await tx.execute(sql`insert into custom_roles(id,name,display_name,permissions) values(${roleId},${"test-commercial-"+randomUUID()},
      'Rollback Commercial',ARRAY['shop_management']::text[])`);
    await tx.execute(sql`insert into custom_users(id,full_name,email,phone,password_hash,role_id)
      values(${customId},'Rollback reviewer',${randomUUID()+"@example.invalid"},${"TEST-"+randomUUID()},'disabled-fixture',${roleId})`);
    await tx.execute(sql`insert into crm_customers(id,email,first_name,last_name)
      values(${id},${randomUUID()+"@example.invalid"},'Weight','Fixture')`);
    const contractId=Number((await tx.execute(sql`insert into shop_contracts(number,customer_id,terms)
      values(${`TEST-C-${randomUUID()}`},${id},'Rollback contract') returning id`)).rows[0].id);
    await tx.execute(sql`insert into customer_orders(id,order_number,customer_id,total_amount,currency,
      shipping_address,payment_method,delivery_method,shipping_cost,created_at,contract_id)
      values(${id},${`TEST-M-${randomUUID()}`},${id},25000,'IQD','{}'::json,'bank_transfer','truck',0,'2026-06-01',${contractId})`);
    await tx.execute(sql`insert into order_items(id,order_id,product_name,product_sku,quantity,unit_price,total_price,unit)
      values(${id},${id},'Metric fixture','FIXTURE',25,1000,25000,'tons')`);
    await tx.execute(sql`insert into shop_contract_order_snapshots(order_id,contract_id,contract_snapshot)
      values(${id},${contractId},${JSON.stringify({id:contractId,number:"TEST-CONTRACT",
        draftData:{aggregateWeightAllowance:{basis:"percent",value:"2"}}})}::jsonb)`);
    const actor={actorId:customId,actorType:"custom" as const,canApprove:true};
    const capture=async(reference:string,weight:string)=>recordOperationalEvent(tx,{
      eventType:"LoadingCompleted",orderId:id,sourceId:reference,eventDate:"2026-06-02",
      weighbridgeReference:`test-weight-${id}-${reference}`,actualWeightTons:weight,
      lines:[{orderItemId:id,actualWeightTons:weight}],
    },{actorId:1,actorType:"admin",canManage:true});
    const read=()=>readCommercialWeight({companyId:company,orderId:id},actor,tx);
    const command=async()=>({companyId:company,orderId:id,historyKey:(await read()).historyKey,
      evidenceReference:"Rollback weight evidence",reason:"Within frozen contractual allowance"});
    const rejectedSql=async(query:Parameters<typeof tx.execute>[0])=>{
      await tx.execute(sql`savepoint expected_rejection`);let rejected=false;
      try{await tx.execute(query);}catch{rejected=true;}
      finally{await tx.execute(sql`rollback to savepoint expected_rejection`);await tx.execute(sql`release savepoint expected_rejection`);}
      assert.ok(rejected,"SQL change must be rejected");
    };
    await t.test("actual history and frozen contractual limit are used",async()=>{
      await capture("first","10");await capture("second","15.3");
      const r=await read();assert.equal(r.weightControl.loadedWeightTons,"25.3");
      assert.equal(r.weightControl.allowedWeightTons,"25.5");assert.equal(r.weightControl.contractNumber,"TEST-CONTRACT");
      assert.equal(r.approved,false);assert.equal(r.postingAllowed,false);
      // Changing the live parent cannot reprice/rewrite the order agreement.
      await tx.execute(sql`update shop_contracts set draft_data=${JSON.stringify({aggregateWeightAllowance:{basis:"percent",value:"99"}})}::jsonb
        where id=${contractId}`);
      assert.equal((await read()).weightControl.allowancePercent,"2");
      const page=await readLoadingPreviews({companyId:company,orderId:id,pageSize:1},tx);
      assert.equal(page.rows.length,1);assert.equal(page.rows[0].weightControl?.loadingCount,2);
      assert.equal(page.rows[0].weightControl?.loadedWeightTons,"25.3");
    });
    await t.test("readers, missing company and stale submissions cannot approve",async()=>{
      await assert.rejects(()=>approveCommercialWeight({companyId:company,orderId:id,historyKey:"0".repeat(64),
        evidenceReference:"Rollback note",reason:"Rollback reason"},actor,tx),/history changed/);
      await assert.rejects(()=>readCommercialWeight({companyId:2147483647,orderId:id},actor,tx),/not bound/);
      await assert.rejects(()=>approveCommercialWeight(awaitablePlaceholder,{...actor,canApprove:false},tx),/permission/);
    });
    await t.test("Commercial approval preserves UUID identity and exact retries",async()=>{
      const c=await command(),approved=await approveCommercialWeight(c,actor,tx);
      assert.equal(approved.approved,true);assert.equal(approved.approval?.actorId,customId);
      assert.equal((await approveCommercialWeight(c,actor,tx)).duplicate,true);
      await assert.rejects(()=>approveCommercialWeight({...c,reason:"Different reason after approval"},actor,tx),/immutable/);
      await rejectedSql(sql`update accounting_loading_weight_reviews set reason='Replaced note' where order_id=${id}`);
      await rejectedSql(sql`delete from accounting_loading_weight_reviews where order_id=${id}`);
    });
    await t.test("new history invalidates prior review; exceeding contract cannot be approved",async()=>{
      const prior=await command();await capture("third","0.3");
      const r=await read();assert.equal(r.approved,false);assert.equal(r.weightControl.status,"CONTRACT_LIMIT_EXCEEDED");
      await assert.rejects(()=>approveCommercialWeight(prior,actor,tx),/history changed/);
      const current=await command();
      await assert.rejects(()=>approveCommercialWeight(current,actor,tx),/contractual limit/);
      await rejectedSql(sql`insert into accounting_loading_weight_reviews(company_id,order_id,history_key,basis,evidence_reference,reason,actor_id,actor_type)
        values(${company},${id},${"f".repeat(64)},${JSON.stringify({...r.weightControl,status:"WITHIN_CONTRACT",allowedWeightTons:"99"})}::jsonb,
          'Forged test reference','Forged test reason',${customId},'custom')`);
    });
    await t.test("review evidence creates no financial effect",async()=>{
      const effects=(await tx.execute(sql`select
        (select count(*)::integer from accounting_journal_entries where company_id=${company}) as journals,
        (select count(*)::integer from accounting_wallet_movements where company_id=${company}) as wallets,
        (select count(*)::integer from accounting_receivable_items where company_id=${company}) as receivables,
        (select count(*)::integer from accounting_outbox where company_id=${company} and payload->>'postingEligible'='true') as eligible`)).rows[0];
      assert.deepEqual(effects,{journals:0,wallets:0,receivables:0,eligible:0});
    });
    complete=true;throw rollback;
  });}catch(e){if(e!==rollback)throw e;}finally{await pool.end();}
  assert.ok(complete);
});
const awaitablePlaceholder={};
test("Commercial authorization rejects unsigned-in and ambiguous namespaces before querying",async()=>{
  await assert.rejects(()=>resolveCommercialAccess({session:{}} as any),/sign-in/);
  await assert.rejects(()=>resolveCommercialAccess({session:{isAuthenticated:true,adminId:1,customUserId:randomUUID()}} as any),/sign-in/);
});
