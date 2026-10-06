import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID,randomInt} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {recordOperationalEvent,operationalEventSchema} from "./events";

test("operational event input uses exact strings and distinct measured facts",()=>{
  const input={eventType:"LoadingCompleted",orderId:1,sourceId:"truck-1",eventDate:"2026-06-01",
    weighbridgeReference:"ticket-1",actualWeightTons:"24.350",lines:[{orderItemId:1,actualWeightTons:"24.350"}]};
  assert.equal(operationalEventSchema.parse(input).actualWeightTons,"24.35");
  assert.equal(operationalEventSchema.safeParse({...input,actualWeightTons:24.35}).success,false);
  assert.equal(operationalEventSchema.safeParse({...input,actualWeightTons:"0"}).success,false);
  assert.equal(operationalEventSchema.safeParse({...input,actualWeightTons:"1e4"}).success,false);
  assert.equal(operationalEventSchema.safeParse({...input,actualWeightTons:"0.000000001"}).success,false);
  assert.equal(operationalEventSchema.safeParse({...input,estimatedWeight:"24.35"}).success,false);
});

test("transactional integration bridge (all native fixtures rolled back)",{skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback = new Error("ROLLBACK_OUTBOX_TESTS");
  let finished=false;
  try{
    await accountingDb.transaction(async tx=>{
      await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
      const company=(await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
        values('Outbox test','IQ','Asia/Baghdad','IQD') returning id`)).rows[0].id as number;
      await tx.execute(sql`insert into accounting_source_bindings(source_module,company_id,capture_enabled)
        values('shop',${company},true) on conflict(source_module) do update set company_id=excluded.company_id,capture_enabled=true`);
      // Explicit fixture IDs never consume or repair another module's live serial sequences.
      const fixtureId=2000000000+randomInt(1,1000000);
      const customer=(await tx.execute(sql`insert into crm_customers(id,email,first_name,last_name)
        values(${fixtureId},${randomUUID()+"@example.invalid"},'Accounting','Fixture') returning id`)).rows[0].id as number;
      const order=(await tx.execute(sql`insert into customer_orders(id,order_number,customer_id,total_amount,currency,
          shipping_address,payment_method,delivery_method,shipping_cost,created_at)
        values(${fixtureId},${`TEST-${randomUUID()}`},${customer},2445,'IQD','{}'::json,'wallet_full','truck',10,'2026-06-01'::timestamp) returning id`)).rows[0].id as number;
      const line=(await tx.execute(sql`insert into order_items(id,order_id,product_name,product_sku,quantity,unit_price,total_price,unit)
        values(${fixtureId},${order},'Fixture','FIXTURE',24.350,100,2435,'tons') returning id`)).rows[0].id as number;
      // Existing realtime SQL integration already creates management in the order's transaction.
      const managed=(await tx.execute(sql`select id from order_management where customer_order_id=${order}`)).rows[0].id as number;
      const wallet=(await tx.execute(sql`insert into customer_wallets(id,customer_id,balance,currency)
        values(${fixtureId},${customer},0,'IQD') returning id`)).rows[0].id as number;
      const actor={actorId:1,actorType:"admin" as const,canManage:true};
      const loading={eventType:"LoadingCompleted" as const,orderId:order,sourceId:"truck-1",eventDate:"2026-06-01",
        weighbridgeReference:"ticket-1",actualWeightTons:"24.350",lines:[{orderItemId:line,actualWeightTons:"24.350"}]};
      async function rejected(action:()=>Promise<unknown>){
        await tx.execute(sql`savepoint expected_outbox_failure`);
        let error:unknown;
        try{await action();}catch(e){error=e;}
        await tx.execute(sql`rollback to savepoint expected_outbox_failure`);
        await tx.execute(sql`release savepoint expected_outbox_failure`);
        assert.ok(error,"Expected operation to be rejected");
      }
      const events=async(kind:string)=>(await tx.execute(sql`select id,payload,status from accounting_outbox
        where company_id=${company} and event_type=${kind} order by id`)).rows;
      await t.test("price, currency, tax and shipping copies are frozen, native updates still work",async()=>{
        const before=(await tx.execute(sql`select accounting_order_event_snapshot(${order}) as snapshot`)).rows[0].snapshot as any;
        assert.equal(before.version,1);assert.equal(before.currency,"IQD");
        assert.equal(before.shippingMode,"SELLER_ARRANGED");assert.equal(before.shippingPrice,"10.00");
        assert.equal(before.lines[0].lockedUnitPrice,"100.00");assert.equal(before.lines[0].taxRate,"0");
        await tx.execute(sql`update customer_orders set total_amount=200,shipping_cost=20,notes='Native update' where id=${order}`);
        await tx.execute(sql`update order_items set unit_price=200,notes='Native update' where id=${line}`);
        const after=(await tx.execute(sql`select accounting_order_event_snapshot(${order}) as snapshot`)).rows[0].snapshot;
        assert.deepEqual(after,before);
        await rejected(()=>tx.execute(sql`update customer_orders set accounting_shipping_price=99 where id=${order}`));
        await rejected(()=>tx.execute(sql`update order_items set accounting_tax_rate=99 where id=${line}`));
      });
      await t.test("warehouse approval and dispatch never fabricate measured loading",async()=>{
        await tx.execute(sql`update order_management set current_status='warehouse_approved' where id=${managed}`);
        await tx.execute(sql`update order_management set current_status='logistics_dispatched',total_weight=999 where id=${managed}`);
        assert.equal((await events("LoadingCompleted")).length,0);
        assert.equal((await tx.execute(sql`select count(*) as n from accounting_journal_entries where company_id=${company}`)).rows[0].n,"0");
      });
      await t.test("paid markers are non-postable observations, not guessed bank receipts",async()=>{
        await tx.execute(sql`update customer_orders set payment_status='paid' where id=${order}`);
        const rows=await events("PaymentReceived");
        assert.equal(rows.length,1);
        const body=rows[0].payload as any;
        assert.equal(body.amount,null);assert.equal(body.receiptVerified,false);
        assert.equal(body.postingEligible,false);assert.equal(body.captureOnly,true);assert.equal(rows[0].status,"captured");
        await tx.execute(sql`update customer_orders set payment_status='paid',notes='Retry' where id=${order}`);
        assert.equal((await events("PaymentReceived")).length,1);
      });
      await t.test("wallet top-up and pre-existing holds emit once without changing hold timing",async()=>{
        const topup=(await tx.execute(sql`insert into wallet_transactions(id,wallet_id,customer_id,transaction_type,
          amount,currency,balance_before,balance_after,description,status) values(
          ${fixtureId},${wallet},${customer},'credit',100,'IQD',0,100,'Fixture','completed') returning id`)).rows[0].id;
        await tx.execute(sql`update customer_wallets set balance=100 where id=${wallet}`);
        assert.equal((await events("WalletTopUp")).length,1);
        await tx.execute(sql`update wallet_transactions set status='completed' where id=${topup}`);
        assert.equal((await events("WalletTopUp")).length,1);
        const hold=(await tx.execute(sql`insert into wallet_transactions(id,wallet_id,customer_id,transaction_type,
          amount,currency,balance_before,balance_after,description,status,reference_type,reference_id) values(
          ${fixtureId+1},${wallet},${customer},'debit',50,'IQD',100,100,'Fixture','reserved','order',${order}) returning id`)).rows[0].id;
        assert.equal((await events("WalletHoldCreated")).length,1);
        await tx.execute(sql`update wallet_transactions set status='cancelled' where id=${hold}`);
        assert.equal((await events("WalletHoldReleased")).length,1);
        assert.equal((await tx.execute(sql`select balance::text from customer_wallets where id=${wallet}`)).rows[0].balance,"100.00");
      });
      await t.test("native mutation and capture roll back together on forced failure",async()=>{
        await tx.execute(sql`savepoint rejected_native_capture`);
        await tx.execute(sql`insert into accounting_outbox(company_id,event_type,source_id,payload,status)
          values(${company},'OrderCancelled',${`order:${order}:cancelled`},'{}'::jsonb,'captured')`);
        await rejected(()=>tx.execute(sql`update customer_orders set status='cancelled' where id=${order}`));
        assert.notEqual((await tx.execute(sql`select status from customer_orders where id=${order}`)).rows[0].status,"cancelled");
        await tx.execute(sql`rollback to savepoint rejected_native_capture`);
        await tx.execute(sql`release savepoint rejected_native_capture`);
        await tx.execute(sql`savepoint forced_native_failure`);
        await tx.execute(sql`update customer_orders set status='cancelled' where id=${order}`);
        assert.equal((await events("OrderCancelled")).length,1);
        await tx.execute(sql`rollback to savepoint forced_native_failure`);
        assert.equal((await events("OrderCancelled")).length,0);
        assert.notEqual((await tx.execute(sql`select status from customer_orders where id=${order}`)).rows[0].status,"cancelled");
        await tx.execute(sql`release savepoint forced_native_failure`);
        // Both native modules can mark the same cancellation; only one event survives.
        await tx.execute(sql`update customer_orders set status='cancelled' where id=${order}`);
        await tx.execute(sql`update order_management set current_status='cancelled' where id=${managed}`);
        assert.equal((await events("OrderCancelled")).length,1);
      });
      await t.test("real per-truck measurements are atomic, normalized and idempotent",async()=>{
        const first=await recordOperationalEvent(tx,loading,actor);
        const retry=await recordOperationalEvent(tx,{...loading,actualWeightTons:"24.35"},actor);
        assert.equal(first.factId,retry.factId);assert.equal(retry.duplicate,true);
        assert.equal((await events("LoadingCompleted")).length,1);
        await rejected(()=>recordOperationalEvent(tx,{...loading,sourceId:"bad",actualWeightTons:"25"},actor));
        await rejected(()=>recordOperationalEvent(tx,{...loading,sourceId:"other",lines:[{orderItemId:999999999,actualWeightTons:"24.35"}]},actor));
        await rejected(()=>recordOperationalEvent(tx,{...loading,sourceId:"other"},{...actor,canManage:false}));
        await rejected(()=>recordOperationalEvent(tx,{...loading,eventDate:"2026-06-02"},actor));
        await rejected(()=>recordOperationalEvent(tx,{...loading,sourceId:"duplicate-ticket"},actor));
        await rejected(()=>recordOperationalEvent(tx,{...loading,sourceId:"before-order",weighbridgeReference:"different-ticket",eventDate:"2026-05-31"},actor));
        await rejected(()=>tx.execute(sql`update accounting_operational_facts set payload='{}' where id=${first.factId}`));
        await rejected(()=>tx.execute(sql`update accounting_outbox set payload='{}' where company_id=${company}`));
      });
      await t.test("shipment expense requires the loading, document, currency and measured inputs",async()=>{
        const cost={eventType:"ShipmentCostRecorded" as const,orderId:order,sourceId:"carrier-cost-1",eventDate:"2026-06-01",
          loadingSourceId:"truck-1",costType:"EXTERNAL_CARRIER" as const,carrierReference:"carrier-1",
          actualCost:"10000",currency:"IQD",costDocumentReference:"document-1"};
        await rejected(()=>recordOperationalEvent(tx,{...cost,loadingSourceId:"missing"},actor));
        await rejected(()=>recordOperationalEvent(tx,{...cost,actualCost:"100.05"},actor));
        const first=await recordOperationalEvent(tx,cost,actor);
        assert.equal((await recordOperationalEvent(tx,cost,actor)).factId,first.factId);
        assert.equal((await events("ShipmentCostRecorded")).length,1);
        await rejected(()=>recordOperationalEvent(tx,{eventType:"ShipmentCostRecorded",orderId:order,
          sourceId:"fleet",eventDate:"2026-06-01",loadingSourceId:"truck-1",costType:"INTERNAL_FLEET"},actor));
      });
      finished=true;throw rollback;
    });
  }catch(error){if(error!==rollback)throw error;}
  finally{await pool.end();}
  assert.equal(finished,true);
});