import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {readShipmentCosts,postShipmentCost,captureShipmentCost} from "./shipment-costs";
import {reverseJournalEntry} from "./postJournalEntry";
import {readShippingMarginReport} from "./shipping-reports";
import type {AccountingAccess} from "@shared/accounting-api";
import {recordOperationalEvent} from "./events";

test("shipment cost posting, evidence, exact retry and closed-gate isolation (rollback-only)",
 {skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback=new Error("ROLLBACK_SHIPMENT_COSTS");let done=false;
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const role=(await tx.execute(sql`select id from admin_roles where is_active and
      lower(regexp_replace(btrim(name),'[[:space:]-]+','_','g')) in ('super_admin','supper_admin','admin') limit 1`)).rows[0];
    assert.ok(role);
    const actorId=Number((await tx.execute(sql`insert into users(username,email,password_hash,role_id)
      values(${"disabled-shipment-"+randomUUID()},${randomUUID()+"@example.invalid"},'disabled-test-hash',${role.id}) returning id`)).rows[0].id);
    const actor:AccountingAccess={actorId,actorType:"admin",canManage:true,canView:true};
    const companyId=Number((await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
      values(${"Shipment fixture "+randomUUID()},'IQ','Asia/Baghdad','IQD') returning id`)).rows[0].id);
    const otherId=Number((await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
      values(${"Shipment other "+randomUUID()},'IQ','Asia/Baghdad','IQD') returning id`)).rows[0].id);
    await tx.execute(sql`insert into accounting_fiscal_years(company_id,name,starts_on,ends_on)
      values(${companyId},'Rollback period','2026-01-01','2026-12-31')`);
    const accounts=new Map<string,number>();
    for(const [key,type] of [["SHIPPING_EXPENSE","expense"],["CARRIER_PAYABLE","liability"],["FLEET_COST_ABSORBED","expense"],["SHIPPING_REVENUE","revenue"]]){
      const id=Number((await tx.execute(sql`insert into accounting_accounts(company_id,code,name_ar,name_en,type)
        values(${companyId},${key},${key},${key},${type}) returning id`)).rows[0].id);
      accounts.set(key,id);
      await tx.execute(sql`insert into accounting_posting_rules(company_id,key,account_id) values(${companyId},${key},${id})`);
    }
    const centerId=Number((await tx.execute(sql`insert into accounting_cost_centers(company_id,code,name_ar,name_en)
      values(${companyId},'FLEET','Fleet','Fleet') returning id`)).rows[0].id);
    await tx.execute(sql`insert into accounting_settings(company_id,fleet_rate,fleet_rate_basis,fleet_cost_center_id)
      values(${companyId},10,'per_ton',${centerId})`);
    await tx.execute(sql`insert into accounting_exchange_rates(company_id,currency,effective_on,rate,source,reference)
      values(${companyId},'USD','2026-06-01',1500,'central_bank','Rollback official shipping rate')`);
    const orderId=987651,order={version:1,companyId,orderId,orderNumber:"M987651",shippingMode:"SELLER_ARRANGED"};
    const putFact=async(input:Record<string,unknown>,fleet:unknown=null)=>{
      const row=(await tx.execute(sql`insert into accounting_operational_facts(company_id,order_id,event_type,source_id,payload,actor_id,actor_type)
        values(${companyId},${orderId},${String(input.eventType)},${`${orderId}:${input.sourceId}`},
        ${JSON.stringify({order,input,fleet})}::jsonb,${actorId},'admin') returning id`)).rows[0];
      return Number(row.id);
    };
    await putFact({eventType:"LoadingCompleted",orderId,sourceId:"truck-A",eventDate:"2026-06-01",
      weighbridgeReference:"real-ticket",actualWeightTons:"24.350",lines:[{orderItemId:1,actualWeightTons:"24.350"}]});
    const baseInput={eventType:"ShipmentCostRecorded",orderId,sourceId:"carrier-A",eventDate:"2026-06-02",
      loadingSourceId:"truck-A",costType:"EXTERNAL_CARRIER",actualCost:"2500",currency:"IQD",
      carrierReference:"documented-carrier-17",costDocumentReference:"carrier-invoice-A"};
    const external=await putFact(baseInput);
    const internal=await putFact({...baseInput,sourceId:"fleet-A",costType:"INTERNAL_FLEET",distanceKm:"81"},
      {rate:"10",basis:"per_ton",costCenterId:centerId,currency:"IQD"});
    const foreign=await putFact({...baseInput,sourceId:"foreign-A",currency:"USD",actualCost:"100.25"});
    const hashes=new Map<number,string>();
    const refresh=async()=>{
      const report=await readShipmentCosts({companyId},tx);
      for(const plan of report.rows)hashes.set(plan.factId,plan.planHash);
    };
    const command=(factId:number,carrierPartyId:number|null=17)=>({companyId,factId,carrierPartyId,
      expectedPlanHash:hashes.get(factId)??"a".repeat(64),reason:"Reviewed documented shipment expense"});
    const rejected=async(fn:()=>Promise<unknown>,pattern:RegExp)=>{
      await tx.execute(sql`savepoint shipment_rejection`);
      try{await assert.rejects(fn,(error:unknown)=>{
        const e=error as {message?:string;cause?:{message?:string}};
        return pattern.test(e.cause?.message??e.message??"");
      });}finally{
        await tx.execute(sql`rollback to savepoint shipment_rejection`);await tx.execute(sql`release savepoint shipment_rejection`);
      }
    };
    await t.test("read-only plans expose closed gates without creating financial data",async()=>{
      const r=await readShipmentCosts({companyId,pageSize:1},tx);
      assert.equal(r.pagination.totalRows,3);assert.equal(r.rows.length,1);assert.equal(r.activationEnabled,false);
      assert.equal(r.rows[0].amount,"100.25");assert.equal(r.rows[0].baseAmount,"150375");
      assert.ok(r.rows[0].blockers.includes("CUTOVER_CLOSED"));assert.ok(r.rows[0].blockers.includes("FOREIGN_CUTOVER_CLOSED"));
      await rejected(()=>postShipmentCost(command(external),actor,tx),/CUTOVER_CLOSED/);
      await rejected(()=>postShipmentCost(command(external),{...actor,canManage:false},tx),/manager/);
      await rejected(()=>postShipmentCost({...command(external),companyId:otherId},actor,tx),/not found/);
      assert.equal((await tx.execute(sql`select count(*)::integer n from accounting_journal_entries where company_id=${companyId}`)).rows[0].n,0);
      await rejected(()=>captureShipmentCost({companyId:otherId,event:baseInput},actor,tx),/selected accounting company/);
      await rejected(()=>tx.execute(sql`insert into accounting_shipment_cutovers(company_id,processing_ready,starts_on)
        values(${companyId},true,'2026-01-01')`),/evidence|required|check constraint/);
    });
    // Only this isolated, rolled-back fixture is enabled; no real company is changed.
    await tx.execute(sql`insert into accounting_shipment_cutovers(company_id,processing_ready,starts_on,reviewed_by,evidence_reference)
      values(${companyId},true,'2026-01-01',${actorId},'Rollback verified shipment opening boundary')`);
    await refresh();
    let externalResult:{id:number;journalId:number;duplicate:boolean};
    await t.test("external journal creates a carrier payable once and blocks conflicting retries and independent reversal",async()=>{
      await rejected(()=>postShipmentCost(command(external,null),actor,tx),/explicit accounting carrier/);
      externalResult=await postShipmentCost(command(external),actor,tx);assert.equal(externalResult.duplicate,false);
      assert.equal((await postShipmentCost(command(external),actor,tx)).duplicate,true);
      await rejected(()=>postShipmentCost({...command(external),reason:"Different documentary reason"},actor,tx),/cannot be changed/);
      const rows=(await tx.execute(sql`select account_id,debit::text,credit::text,party_type,party_id from accounting_journal_lines
        where entry_id=${externalResult.journalId} order by id`)).rows;
      assert.equal(rows[0].account_id,accounts.get("SHIPPING_EXPENSE"));assert.equal(rows[1].account_id,accounts.get("CARRIER_PAYABLE"));
      assert.equal(rows[1].party_type,"carrier");assert.equal(rows[1].party_id,17);
      await rejected(()=>reverseJournalEntry(externalResult.journalId,"2026-06-03","Independent unsafe reversal",actor,tx),/coordinated return/);
    });
    await t.test("internal fleet uses the frozen rate, measured tons and original center, not edited current settings",async()=>{
      await tx.execute(sql`update accounting_settings set fleet_rate=999 where company_id=${companyId}`);
      const result=await postShipmentCost(command(internal,null),actor,tx);
      const rows=(await tx.execute(sql`select account_id,debit::text,credit::text,cost_center_id from accounting_journal_lines where entry_id=${result.journalId}`)).rows;
      assert.equal(rows.length,2);assert.ok(rows.some(x=>x.account_id===accounts.get("FLEET_COST_ABSORBED")));
      for(const row of rows)assert.equal(row.cost_center_id,centerId);
      const plan=(await readShipmentCosts({companyId},tx)).rows.find(r=>r.factId===internal)!;
      assert.equal(plan.amount,"244");assert.equal(plan.fleetRate,"10");assert.equal(plan.quantity,"24.35");
      const report=await readShippingMarginReport({companyId,from:"2026-06-01",to:"2026-06-30",view:"loading"},tx);
      assert.equal(report.rows[0].costEvidenceIssueCount,0);assert.equal(report.rows[0].marginBase,null);
    });
    await t.test("foreign posting needs its own gate and freezes original official FX and carrying amount",async()=>{
      await rejected(()=>postShipmentCost(command(foreign),actor,tx),/FOREIGN_CUTOVER_CLOSED/);
      await tx.execute(sql`update accounting_shipment_cutovers set foreign_processing_ready=true where company_id=${companyId}`);
      await refresh();
      const result=await postShipmentCost(command(foreign),actor,tx);
      const rows=(await tx.execute(sql`select exchange_rate::text,base_debit::text,base_credit::text from accounting_journal_lines where entry_id=${result.journalId}`)).rows;
      assert.ok(rows.some(r=>Number(r.base_debit)===150375));assert.ok(rows.every(r=>Number(r.exchange_rate)===1500));
      await tx.execute(sql`update accounting_exchange_rates set rate=2000,reference='Later edited reference' where company_id=${companyId}`);
      const plan=(await readShipmentCosts({companyId},tx)).rows.find(r=>r.factId===foreign)!;
      assert.equal(plan.rate,"1500.000000000000");assert.equal(plan.baseAmount,"150375");assert.equal(plan.rateReference,"Rollback official shipping rate");
      assert.equal((await postShipmentCost(command(foreign),actor,tx)).duplicate,true);
    });
    await t.test("a changed official rate cannot silently replace the manager-reviewed plan",async()=>{
      const stale=await putFact({...baseInput,sourceId:"stale-foreign",currency:"USD",actualCost:"10.25"});
      await refresh();
      await tx.execute(sql`update accounting_exchange_rates set rate=2100 where company_id=${companyId}`);
      await rejected(()=>postShipmentCost(command(stale),actor,tx),/reload and review/);
      assert.equal((await tx.execute(sql`select count(*)::integer n from accounting_shipment_costs where fact_id=${stale}`)).rows[0].n,0);
    });
    await t.test("record immutability, paused gates, balanced reports and no operational consumption",async()=>{
      await rejected(()=>tx.execute(sql`update accounting_shipment_costs set reason='tampered' where fact_id=${external}`),/immutable/);
      await rejected(()=>tx.execute(sql`delete from accounting_shipment_costs where fact_id=${external}`),/immutable/);
      await rejected(()=>tx.execute(sql`update accounting_shipment_cutovers set starts_on='2026-02-01' where company_id=${companyId}`),/immutable/);
      await tx.execute(sql`update accounting_shipment_cutovers set processing_ready=false,foreign_processing_ready=false where company_id=${companyId}`);
      assert.equal((await postShipmentCost(command(external),actor,tx)).duplicate,true);
      const fresh=await putFact({...baseInput,sourceId:"after-pause"});
      await rejected(()=>postShipmentCost(command(fresh),actor,tx),/CUTOVER_CLOSED/);
      const totals=(await tx.execute(sql`select sum(l.base_debit)::text d,sum(l.base_credit)::text c
        from accounting_journal_lines l join accounting_journal_entries j on j.id=l.entry_id where j.company_id=${companyId}`)).rows[0];
      assert.equal(totals.d,totals.c);
      assert.equal((await tx.execute(sql`select count(*)::integer n from accounting_receivable_items where company_id=${companyId}`)).rows[0].n,0);
      assert.equal((await tx.execute(sql`select count(*)::integer n from accounting_outbox where company_id=${companyId}
        and payload->>'postingEligible'='true'`)).rows[0].n,0);
      assert.equal((await tx.execute(sql`select count(*)::integer n from accounting_audit_logs where company_id=${companyId} and action='post_shipment_cost'`)).rows[0].n,3);
    });
    await t.test("real order-linked documentary capture is scope-checked, immutable, idempotent and nonfinancial",async()=>{
      const nativeId=1700000000+parseInt(randomUUID().slice(0,6),16);
      const product=(await tx.execute(sql`select id from shop_products order by id limit 1`)).rows[0];
      assert.ok(product);
      await tx.execute(sql`insert into crm_customers(id,email,first_name,last_name)
        values(${nativeId},${randomUUID()+"@example.invalid"},'Shipment','Rollback fixture')`);
      await tx.execute(sql`insert into accounting_source_bindings(source_module,company_id,capture_enabled)
        values('shop',${companyId},true) on conflict(source_module) do update set company_id=excluded.company_id,capture_enabled=true`);
      await tx.execute(sql`insert into customer_orders(id,order_number,customer_id,total_amount,currency,shipping_address,
        payment_method,payment_status,created_at,delivery_method,shipping_cost)
        values(${nativeId},${"TEST-"+randomUUID()},${nativeId},1000,'IQD','{}','bank_transfer','pending','2026-06-01','courier',0)`);
      await tx.execute(sql`insert into order_items(id,order_id,product_id,product_name,product_sku,quantity,unit_price,total_price,unit)
        values(${nativeId},${nativeId},${product.id},'Rollback measured goods','FIXTURE',1,1000,1000,'tons')`);
      await recordOperationalEvent(tx,{eventType:"LoadingCompleted",orderId:nativeId,sourceId:"native-truck",
        eventDate:"2026-06-02",weighbridgeReference:"native-scale-ticket",actualWeightTons:"1",
        lines:[{orderItemId:nativeId,actualWeightTons:"1"}]},actor);
      const before=(await tx.execute(sql`select to_jsonb(o) data from customer_orders o where id=${nativeId}`)).rows[0].data;
      const capture={companyId,event:{eventType:"ShipmentCostRecorded",orderId:nativeId,sourceId:"native-carrier-cost",
        eventDate:"2026-06-03",loadingSourceId:"native-truck",costType:"EXTERNAL_CARRIER",
        actualCost:"1500",currency:"IQD",carrierReference:"native-carrier",costDocumentReference:"actual-native-carrier-note"}};
      const result=await captureShipmentCost(capture,actor,tx);assert.equal(result.captureOnly,true);
      assert.equal((await captureShipmentCost(capture,actor,tx)).duplicate,true);
      await rejected(()=>captureShipmentCost({...capture,event:{...capture.event,actualCost:"1600"}},actor,tx),/different payload/);
      const plan=(await readShipmentCosts({companyId,orderId:nativeId},tx)).rows[0];
      assert.equal(plan.amount,"1500");assert.ok(plan.blockers.includes("CUTOVER_CLOSED"));
      assert.deepEqual((await tx.execute(sql`select to_jsonb(o) data from customer_orders o where id=${nativeId}`)).rows[0].data,before);
      assert.equal((await tx.execute(sql`select count(*)::integer n from accounting_shipment_costs where fact_id=${result.factId}`)).rows[0].n,0);
    });
    done=true;throw rollback;
  });}catch(error){if(error!==rollback)throw error;}finally{await pool.end();}
  assert.ok(done);
});
