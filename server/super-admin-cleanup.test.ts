import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { pool } from "./db";
import { cleanupIds, cleanupPlan, deleteCleanup } from "./super-admin-cleanup-service";
import { shipmentBlockers } from "./super-admin-removal-policy";
import { calculateLegacyCredit, transactionOrderNumber } from "./super-admin-removal-money";
import { ensureRemovalSchema } from "./super-admin-removal-schema";

test("targets remain exact, bounded and deterministic", () => {
  assert.deepEqual(cleanupIds("orders",[3,2,3]),{kind:"orders",ids:[2,3]});
  for (const ids of [[],[-1],["1"],[1.1],[2147483648],Array(101).fill(1)]) assert.throws(()=>cleanupIds("orders",ids));
  assert.throws(()=>cleanupIds("contract",[1,2]));
});
test("only actual dispatch, delivery or withdrawn state blocks eligibility", () => {
  assert.deepEqual(shipmentBlockers({status:"warehouse_ready",payment_status:"paid"},
    {financial_reviewed_at:new Date(),warehouse_processed_at:new Date(),logistics_processed_at:new Date()}),[]);
  for (const order of [{shipped_at:new Date()},{delivered_at:new Date()},{status:"in_transit"},{status:"delivered"}])
    assert.deepEqual(shipmentBlockers(order),["SHIPPED"]);
  assert.deepEqual(shipmentBlockers({}, {carrier_dispatched_at:new Date()}),["SHIPPED"]);
  assert.deepEqual(shipmentBlockers({status:"deleted"}),["ALREADY_REMOVED"]);
});
test("payment arithmetic does not double credit refunds, holds or excess; legacy identities are exact", () => {
  const order={total_amount:"100.00",currency:"IQD",customer_id:1,payment_status:"paid",payment_method:"wallet_full"};
  const debit={reference_type:"order",transaction_type:"debit",amount:"100",currency:"IQD",customer_id:1,
    status:"completed",balance_before:"120",balance_after:"20"};
  const refund={...debit,reference_type:"cancellation_refund",transaction_type:"credit",amount:"30",balance_before:"20",balance_after:"50"};
  assert.equal(calculateLegacyCredit(order,{},[debit,refund],[]).creditAmount,"70.00");
  const pending={...order,payment_status:"pending"};
  assert.equal(calculateLegacyCredit(pending,{financial_reviewed_at:new Date()},[],[]).creditAmount,"0.00");
  const reserved={...debit,status:"reserved",balance_after:"120",amount:"40"};
  const reservation=calculateLegacyCredit(pending,{},[reserved],[]);
  assert.equal(reservation.creditAmount,"0.00"); assert.equal(reservation.reservedRelease,"40.00");
  const bank={...order,payment_method:"bank_transfer"};
  const excess={...refund,reference_type:"overpayment",amount:"20",balance_before:"20",balance_after:"40"};
  const overpaid=calculateLegacyCredit(bank,{financial_reviewed_at:new Date(),bank_amount_paid:"120",excess_amount_credited:"20"},[excess],[]);
  assert.equal(overpaid.creditAmount,"100.00"); assert.equal(overpaid.alreadyAvailable,"20.00"); assert.equal(overpaid.confirmedPayment,"120.00");
  assert.throws(()=>calculateLegacyCredit(order,{},[],[]),/PAYMENT_EVIDENCE_REQUIRED/);
  assert.equal(transactionOrderNumber({description:"پرداخت سفارش M2601234"}),"M2601234");
  assert.equal(transactionOrderNumber({description:"پرداخت سفارش M26012345"}),null);
  assert.equal(transactionOrderNumber({description:"M2601234 و M2601235"}),null);
  assert.equal(transactionOrderNumber({metadata:{orderNumber:"M2601234"}}),"M2601234");
});

test("rollback-only removal preserves signed/financial records, credits once, releases capacity and enforces late-write guards", {timeout:180000}, async () => {
  const client=await pool.connect(), originalConnect=pool.connect;
  const schema=`removal_${randomUUID().replaceAll("-","")}`;
  const query=client.query.bind(client);
  let sequence=0;
  const saves:string[]=[];
  const fixture:any={release(){},async query(sql:any,params?:any[]){
    if(sql==="BEGIN"){const name=`op_${++sequence}`;saves.push(name);return query(`SAVEPOINT ${name}`);}
    if(sql==="COMMIT")return query(`RELEASE SAVEPOINT ${saves.pop()}`);
    if(sql==="ROLLBACK"){const name=saves.pop();await query(`ROLLBACK TO SAVEPOINT ${name}`);return query(`RELEASE SAVEPOINT ${name}`);}
    return query(sql,params);
  }};
  try {
    await query("BEGIN");
    await query(`CREATE SCHEMA ${schema}; SET LOCAL search_path TO ${schema},public;
      CREATE TABLE admin_roles(id int PRIMARY KEY,name text,is_active boolean);
      CREATE TABLE users(id int PRIMARY KEY,role_id int REFERENCES admin_roles(id),is_active boolean);
      INSERT INTO admin_roles VALUES(1,'Supper Admin',true),(2,'admin',true);
      INSERT INTO users VALUES(1,1,true),(2,2,true);
      CREATE TABLE crm_customers(id int PRIMARY KEY); INSERT INTO crm_customers VALUES(1001);
      CREATE TABLE shop_contracts(id int PRIMARY KEY,number text,customer_id int,is_active boolean DEFAULT true,ended_at timestamptz,updated_at timestamptz DEFAULT now());
      CREATE TABLE customer_orders(id int PRIMARY KEY,order_number text,contract_id int REFERENCES shop_contracts(id),
        customer_id int,total_amount numeric,currency text,payment_method text,payment_status text,status text,
        shipped_at timestamptz,delivered_at timestamptz,receipt_path text,updated_at timestamptz DEFAULT now());
      CREATE TABLE order_management(id int PRIMARY KEY,customer_order_id int REFERENCES customer_orders(id),current_status text,
        financial_reviewed_at timestamptz,bank_amount_paid numeric DEFAULT 0,excess_amount_credited numeric DEFAULT 0,
        warehouse_processed_at timestamptz,carrier_dispatched_at timestamptz,updated_at timestamptz DEFAULT now());
      CREATE TABLE order_items(id int PRIMARY KEY,order_id int REFERENCES customer_orders(id),quantity int);
      CREATE TABLE shop_contract_items(id int PRIMARY KEY,contract_id int REFERENCES shop_contracts(id),product_id int,used_quantity int);
      CREATE TABLE shop_contract_holds(id text PRIMARY KEY,contract_id int REFERENCES shop_contracts(id),order_id int REFERENCES customer_orders(id),status text,updated_at timestamptz);
      CREATE TABLE shop_contract_hold_items(id int PRIMARY KEY,hold_id text REFERENCES shop_contract_holds(id),product_id int,quantity int);
      CREATE TABLE shop_contract_addenda(id int PRIMARY KEY,parent_contract_id int REFERENCES shop_contracts(id),number text);
      CREATE TABLE shop_contract_order_snapshots(order_id int REFERENCES customer_orders(id),contract_id int REFERENCES shop_contracts(id));
      CREATE TABLE contract_signing_challenges(id int PRIMARY KEY,contract_id int REFERENCES shop_contracts(id));
      CREATE TABLE electronic_contract_signatures(id int PRIMARY KEY,contract_id int REFERENCES shop_contracts(id));
      CREATE TABLE signed_contract_documents(id int PRIMARY KEY,contract_id int REFERENCES shop_contracts(id));
      CREATE TABLE payment_receipts(id int PRIMARY KEY,customer_order_id int REFERENCES customer_orders(id));
      CREATE TABLE customer_wallets(id serial PRIMARY KEY,customer_id int UNIQUE,balance numeric DEFAULT 0,reserved_balance numeric DEFAULT 0,
        currency text,status text DEFAULT 'active',last_activity_date timestamptz,updated_at timestamptz DEFAULT now());
      CREATE TABLE wallet_transactions(id serial PRIMARY KEY,wallet_id int REFERENCES customer_wallets(id),customer_id int,
        transaction_type text,amount numeric,currency text,balance_before numeric,balance_after numeric,description text,
        reference_type text,reference_id int,status text,processed_by int,metadata json,notes text,updated_at timestamptz DEFAULT now());
      CREATE TABLE vehicle_delivery_history(id int PRIMARY KEY,customer_order_id int,delivery_status text,pickup_datetime timestamptz,delivery_datetime timestamptz,actual_delivery_time timestamptz);
      CREATE TABLE showcase_products(id int PRIMARY KEY,barcode text,stock_quantity int,updated_at timestamptz);
      CREATE TABLE shop_products(id int PRIMARY KEY,barcode text,stock_quantity int,in_stock boolean,show_when_out_of_stock boolean,updated_at timestamptz);
      CREATE TABLE cart_inventory_reservations(id int PRIMARY KEY,order_id int,showcase_product_id int,shop_product_id int,quantity int,status text,released_at timestamptz,updated_at timestamptz);
      INSERT INTO shop_contracts(id,number,customer_id) VALUES(1,'FIXTURE-C1',1001),(2,'FIXTURE-C2',1001),(3,'FIXTURE-C3',1001);
      INSERT INTO customer_orders(id,order_number,contract_id,customer_id,total_amount,currency,payment_method,payment_status,status) VALUES
        (10,'M2601234',1,1001,100,'IQD','wallet_full','paid','warehouse_ready'),
        (20,'M2601235',2,1001,100,'IQD','bank_transfer','pending','pending'),
        (30,'M2601236',3,1001,100,'IQD','bank_transfer','pending','shipped');
      INSERT INTO order_management(id,customer_order_id,current_status,financial_reviewed_at,warehouse_processed_at) VALUES(110,10,'warehouse_pending',now(),now()),(120,20,'pending',null,null);
      INSERT INTO order_items VALUES(1,10,3);
      INSERT INTO shop_contract_items VALUES(1,1,7,3);
      INSERT INTO shop_contract_holds(id,contract_id,order_id,status) VALUES('h1',1,10,'attached');
      INSERT INTO shop_contract_hold_items VALUES(1,'h1',7,3);
      INSERT INTO shop_contract_order_snapshots VALUES(10,1);
      INSERT INTO electronic_contract_signatures VALUES(1,1);
      INSERT INTO signed_contract_documents VALUES(1,1);
      INSERT INTO shop_contract_addenda VALUES(1,1,'FIXTURE-C1-A');
      INSERT INTO payment_receipts VALUES(1,10);
      INSERT INTO customer_wallets(customer_id,balance,reserved_balance,currency) VALUES(1001,30,45,'IQD');
      INSERT INTO wallet_transactions(wallet_id,customer_id,transaction_type,amount,currency,balance_before,balance_after,description,reference_type,reference_id,status) VALUES
        (1,1001,'debit',100,'IQD',120,20,'پرداخت سفارش M2601234','order',null,'completed'),
        (1,1001,'credit',10,'IQD',20,30,'partial refund','cancellation_refund',10,'completed'),
        (1,1001,'debit',40,'IQD',30,30,'reservation','order',20,'reserved'),
        (1,1001,'debit',5,'IQD',30,30,'other hold','order',999,'reserved');
      INSERT INTO vehicle_delivery_history VALUES(1,20,'assigned',now()+interval '1 day',now()+interval '2 days',null);
      INSERT INTO showcase_products VALUES(7,'fixture',7,now());
      INSERT INTO shop_products VALUES(8,'fixture',7,true,false,now());
      INSERT INTO cart_inventory_reservations VALUES(1,10,7,8,3,'finalized',null,now());
    `);
    await ensureRemovalSchema(fixture);
    (pool as any).connect=async()=>fixture;
    const actor={namespace:"admin" as const,id:"1"};
    const plan=await cleanupPlan("contract",[1],fixture);
    assert.equal(plan.canDelete,true,plan.deletionBlockers.join(","));
    assert.equal(plan.credits[0].creditAmount,"90.00");
    const scheduled=await cleanupPlan("orders",[20],fixture);
    assert.equal(scheduled.canDelete,true,"scheduled delivery is not actual dispatch");
    assert.equal(scheduled.credits[0].creditAmount,"0.00");
    assert.equal(scheduled.credits[0].reservedRelease,"40.00");
    assert.ok((await cleanupPlan("contract",[3],fixture)).deletionBlockers.includes("SHIPPED"));
    await assert.rejects(deleteCleanup("contract",[1],plan.fingerprint,{namespace:"admin",id:"2"}),/SUPER_ADMIN_REQUIRED/);
    await query("UPDATE wallet_transactions SET amount=9,balance_after=29 WHERE reference_type='cancellation_refund'");
    await assert.rejects(deleteCleanup("contract",[1],plan.fingerprint,actor),/PREVIEW_CHANGED/);
    await query("UPDATE wallet_transactions SET amount=10,balance_after=30 WHERE reference_type='cancellation_refund'");
    // A forced failure after credit insertion must undo the entire financial operation.
    await query(`CREATE FUNCTION fail_removal() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'fixture failure'; END$$;
      CREATE TRIGGER fail_removal BEFORE INSERT ON super_admin_removals FOR EACH ROW EXECUTE FUNCTION fail_removal()`);
    await assert.rejects(deleteCleanup("contract",[1],plan.fingerprint,actor),/fixture failure/);
    assert.equal(String((await query("SELECT balance FROM customer_wallets")).rows[0].balance),"30");
    assert.equal((await query("SELECT count(*)::int n FROM super_admin_removals")).rows[0].n,0);
    await query("DROP TRIGGER fail_removal ON super_admin_removals");
    await deleteCleanup("contract",[1],plan.fingerprint,actor);
    assert.equal(String((await query("SELECT balance FROM customer_wallets")).rows[0].balance),"120.00");
    assert.equal((await query("SELECT status FROM customer_orders WHERE id=10")).rows[0].status,"deleted");
    assert.equal((await query("SELECT payment_status FROM customer_orders WHERE id=10")).rows[0].payment_status,"paid");
    assert.equal((await query("SELECT is_active FROM shop_contracts WHERE id=1")).rows[0].is_active,false);
    for(const table of ["signed_contract_documents","electronic_contract_signatures","payment_receipts","order_items","shop_contract_addenda"])
      assert.equal((await query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n,1,`${table} retained`);
    assert.equal((await query("SELECT used_quantity FROM shop_contract_items")).rows[0].used_quantity,0);
    assert.equal((await query("SELECT stock_quantity FROM showcase_products")).rows[0].stock_quantity,10);
    assert.equal((await query("SELECT count(*)::int n FROM wallet_transactions WHERE reference_type='admin_removal'")).rows[0].n,1);
    await assert.rejects(deleteCleanup("contract",[1],plan.fingerprint,actor),/ALREADY_REMOVED/);
    const second=await cleanupPlan("orders",[20],fixture);
    await deleteCleanup("orders",[20],second.fingerprint,actor);
    assert.equal(String((await query("SELECT balance FROM customer_wallets")).rows[0].balance),"120.00");
    assert.equal(Number((await query("SELECT reserved_balance FROM customer_wallets")).rows[0].reserved_balance),5);
    for(const statement of [
      "UPDATE customer_orders SET status='pending' WHERE id=10",
      "UPDATE order_management SET current_status='financial_approved' WHERE customer_order_id=10",
      "UPDATE shop_contracts SET is_active=true WHERE id=1",
      "INSERT INTO payment_receipts VALUES(2,10)",
      "INSERT INTO wallet_transactions(wallet_id,customer_id,transaction_type,amount,currency,balance_before,balance_after,description,reference_type,status) VALUES(1,1001,'debit',1,'IQD',120,119,'پرداخت سفارش M2601234','order','completed')",
      "INSERT INTO shop_contract_holds(id,contract_id,status) VALUES('late',1,'active')",
    ]) {
      await query("SAVEPOINT late_writer");
      await assert.rejects(query(statement),/removed|reactivated|workflow|capacity|evidence/i);
      await query("ROLLBACK TO SAVEPOINT late_writer"); await query("RELEASE SAVEPOINT late_writer");
    }
  } finally {
    (pool as any).connect=originalConnect;
    await query("ROLLBACK"); client.release(); await pool.end();
  }
});
