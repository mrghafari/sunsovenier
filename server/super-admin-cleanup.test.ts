import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { pool } from "./db";
import { cleanupIds, cleanupPlan, deleteCleanup } from "./super-admin-cleanup-service";
import { orderBlockers } from "./super-admin-cleanup-policy";

test("cleanup targets are bounded, exact and deterministic", () => {
  assert.deepEqual(cleanupIds("orders", [3, 2, 3]), { kind: "orders", ids: [2, 3] });
  for (const ids of [[], [-1], ["1"], [1.1], [2147483648], Array(101).fill(1)])
    assert.throws(() => cleanupIds("orders", ids));
  assert.throws(() => cleanupIds("contract", [1, 2]));
  assert.throws(() => cleanupIds("company", [1]));
});
test("payment markers and operational effects are protected even without a paid status", () => {
  assert.deepEqual(orderBlockers({ payment_status: "pending", invoice_type: "proforma" }), []);
  for (const order of [{ payment_status: "paid" }, { payment_status: "refunded" }, { receipt_path: "private-receipt" },
    { payment_transaction_id: "started" }, { invoice_type: "official_invoice" }, { invoice_converted_at: "2026-01-01" }])
    assert.ok(orderBlockers(order).includes("FINANCIAL_ACTIVITY"));
  assert.ok(orderBlockers({}, { wallet_amount_used: "0.01" }).includes("FINANCIAL_ACTIVITY"));
  assert.ok(orderBlockers({}, { financial_reviewed_at: "2026-01-01" }).includes("FINANCIAL_ACTIVITY"));
  assert.ok(orderBlockers({}, { warehouse_processed_at: "2026-01-01" }).includes("OPERATIONAL_ACTIVITY"));
});

test("rollback-only database cleanup verifies signed/financial blockers, preview changes, role revocation and atomic deletion",
  { timeout: 90000 }, async () => {
    const connection = await pool.connect();
    const query = connection.query.bind(connection);
    const savedConnect = pool.connect;
    const schema = `cleanup_probe_${randomUUID().replaceAll("-", "")}`;
    let transaction = 0;
    const saves: string[] = [];
    const fixtureQuery = async (sql: string, params?: any[]) => {
      if (sql === "BEGIN") { const name = `operation_${++transaction}`; saves.push(name); return query(`SAVEPOINT ${name}`); }
      if (sql === "COMMIT") return query(`RELEASE SAVEPOINT ${saves.pop()}`);
      if (sql === "ROLLBACK") { const name = saves.pop(); await query(`ROLLBACK TO SAVEPOINT ${name}`); return query(`RELEASE SAVEPOINT ${name}`); }
      return query(sql, params);
    };
    const fixture = { query: fixtureQuery, release() {} };
    try {
      await query("BEGIN");
      await query(`CREATE SCHEMA ${schema}; SET LOCAL search_path TO ${schema}, public;
        CREATE TABLE admin_roles(id int PRIMARY KEY,name text,is_active boolean);
        CREATE TABLE users(id int PRIMARY KEY,role_id int REFERENCES admin_roles(id),is_active boolean);
        INSERT INTO admin_roles VALUES(1,'Supper Admin',true),(2,'admin',true);
        INSERT INTO users VALUES(1,1,true),(2,2,true);
        CREATE TABLE shop_contracts(id int PRIMARY KEY,number text);
        CREATE TABLE customer_orders(id int PRIMARY KEY,order_number text,contract_id int REFERENCES shop_contracts(id),payment_status text,status text);
        CREATE TABLE order_management(id int PRIMARY KEY,customer_order_id int REFERENCES customer_orders(id));
        CREATE TABLE order_items(id int PRIMARY KEY,order_id int REFERENCES customer_orders(id),quantity int);
        CREATE TABLE shop_contract_items(id int PRIMARY KEY,contract_id int REFERENCES shop_contracts(id),product_id int,used_quantity int);
        CREATE TABLE shop_contract_holds(id text PRIMARY KEY,contract_id int REFERENCES shop_contracts(id),order_id int REFERENCES customer_orders(id),status text,updated_at timestamptz);
        CREATE TABLE shop_contract_hold_items(id int PRIMARY KEY,hold_id text REFERENCES shop_contract_holds(id),product_id int,quantity int);
        CREATE TABLE shop_contract_addenda(id int PRIMARY KEY,parent_contract_id int REFERENCES shop_contracts(id),number text);
        CREATE TABLE shop_contract_order_snapshots(order_id int REFERENCES customer_orders(id),contract_id int REFERENCES shop_contracts(id));
        CREATE TABLE contract_signing_challenges(id int PRIMARY KEY,contract_id int REFERENCES shop_contracts(id),addendum_id int REFERENCES shop_contract_addenda(id));
        CREATE TABLE electronic_contract_signatures(id int PRIMARY KEY,contract_id int REFERENCES shop_contracts(id));
        CREATE TABLE signed_contract_documents(id int PRIMARY KEY,contract_id int REFERENCES shop_contracts(id));
        CREATE TABLE payment_receipts(id int PRIMARY KEY,customer_order_id int REFERENCES customer_orders(id));
        CREATE TABLE wallet_transactions(id int PRIMARY KEY,reference_id int,reference_type text);
        CREATE TABLE accounting_operational_facts(id int PRIMARY KEY,order_id int);
        CREATE TABLE order_status_history(id int PRIMARY KEY,order_management_id int REFERENCES order_management(id));
        INSERT INTO shop_contracts VALUES(1,'TEST-C1'),(2,'TEST-C2'),(3,'TEST-C3'),(4,'TEST-C4');
        INSERT INTO customer_orders VALUES(10,'TEST-M10',1,'pending','pending'),(20,'TEST-M20',2,'pending','pending'),
          (30,'TEST-M30',3,'pending','pending'),(40,'TEST-M40',4,'pending','pending');
        INSERT INTO order_management VALUES(110,10),(120,20);
        INSERT INTO order_items VALUES(1,10,3),(2,20,5);
        INSERT INTO order_status_history VALUES(1,110);
        INSERT INTO shop_contract_items VALUES(1,1,10,3),(2,2,10,5);
        INSERT INTO shop_contract_holds(id,contract_id,order_id,status) VALUES('hold-1',1,10,'attached'),('hold-2',2,20,'attached');
        INSERT INTO shop_contract_hold_items VALUES(1,'hold-1',10,3),(2,'hold-2',10,5);
        INSERT INTO shop_contract_addenda VALUES(1,1,'TEST-C1-A');
        INSERT INTO shop_contract_order_snapshots VALUES(10,1),(20,2);
        INSERT INTO contract_signing_challenges VALUES(1,1,1);
      `);
      (pool as any).connect = async () => fixture;
      const actor = { namespace: "admin" as const, id: "1" };
      const plan = () => cleanupPlan("contract", [1], fixture);
      assert.equal((await plan()).canDelete, true);
      await query("INSERT INTO electronic_contract_signatures VALUES(1,1)");
      assert.ok((await plan()).deletionBlockers.includes("SIGNED_CONTRACT"));
      await assert.rejects(deleteCleanup("contract", [1], (await plan()).fingerprint, actor), /SIGNED_CONTRACT/);
      await query("DELETE FROM electronic_contract_signatures");
      await query("INSERT INTO signed_contract_documents VALUES(1,1)");
      assert.ok((await plan()).deletionBlockers.includes("SIGNED_CONTRACT"));
      await query("DELETE FROM signed_contract_documents");
      for (const sql of ["INSERT INTO payment_receipts VALUES(1,10)",
        "INSERT INTO wallet_transactions VALUES(1,10,'order')", "INSERT INTO accounting_operational_facts VALUES(1,10)"]) {
        await query(sql);
        assert.ok((await plan()).deletionBlockers.includes("FINANCIAL_ACTIVITY"));
        await query("DELETE FROM payment_receipts; DELETE FROM wallet_transactions; DELETE FROM accounting_operational_facts");
      }
      const oldPreview = await plan();
      await query("INSERT INTO order_items VALUES(99,10,1)");
      await assert.rejects(deleteCleanup("contract", [1], oldPreview.fingerprint, actor), /PREVIEW_CHANGED/);
      await query("DELETE FROM order_items WHERE id=99");
      await assert.rejects(deleteCleanup("contract", [1], (await plan()).fingerprint, { namespace: "admin", id: "2" }), /SUPER_ADMIN_REQUIRED/);
      await query("UPDATE admin_roles SET is_active=false WHERE id=1");
      await assert.rejects(deleteCleanup("contract", [1], (await plan()).fingerprint, actor), /SUPER_ADMIN_REQUIRED/);
      await query("UPDATE admin_roles SET is_active=true WHERE id=1");
      // A new, differently named CASCADE child must never be silently purged.
      await query("CREATE TABLE unexpected_evidence(id int PRIMARY KEY,linked_item int REFERENCES order_items(id) ON DELETE CASCADE); INSERT INTO unexpected_evidence VALUES(1,1)");
      assert.ok((await plan()).deletionBlockers.includes("UNKNOWN_DEPENDENCY"));
      await query("DROP TABLE unexpected_evidence");
      const mixed = await cleanupPlan("orders", [30, 40], fixture);
      await query("UPDATE customer_orders SET payment_status='paid' WHERE id=40");
      await assert.rejects(deleteCleanup("orders", [30, 40], mixed.fingerprint, actor), /FINANCIAL_ACTIVITY/);
      assert.equal((await query("SELECT count(*)::int n FROM customer_orders WHERE id IN (30,40)")).rows[0].n, 2);
      const before = await plan();
      await deleteCleanup("contract", [1], before.fingerprint, actor);
      for (const table of ["contract_signing_challenges", "shop_contract_addenda", "order_status_history"])
        assert.equal((await query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n, 0);
      assert.equal((await query("SELECT count(*)::int n FROM customer_orders WHERE id=10")).rows[0].n, 0);
      assert.equal((await query("SELECT count(*)::int n FROM shop_contracts WHERE id=1")).rows[0].n, 0);
      assert.equal((await query("SELECT count(*)::int n FROM customer_orders WHERE id=20")).rows[0].n, 1, "other contracts' orders remain");
      for (const sql of [
        "INSERT INTO payment_receipts VALUES(9,10)",
        "INSERT INTO wallet_transactions VALUES(9,10,'order')",
        "INSERT INTO accounting_operational_facts VALUES(9,10)",
      ]) {
        await query("SAVEPOINT stale_finance");
        await assert.rejects(query(sql), (error: any) => error.code === "23503");
        await query("ROLLBACK TO SAVEPOINT stale_finance; RELEASE SAVEPOINT stale_finance");
      }
      // Other wallets' reference namespaces remain valid; no balance is changed.
      await query("INSERT INTO wallet_transactions VALUES(9,99999,'recharge')");
      await query("DELETE FROM wallet_transactions WHERE id=9");
      // Ordinary order removal releases capacity without removing its contract.
      const orderPlan = await cleanupPlan("orders", [20], fixture);
      await deleteCleanup("orders", [20], orderPlan.fingerprint, actor);
      assert.equal((await query("SELECT used_quantity FROM shop_contract_items WHERE contract_id=2")).rows[0].used_quantity, 0);
      assert.equal((await query("SELECT count(*)::int n FROM shop_contracts WHERE id=2")).rows[0].n, 1);
      // A blocked dependency or late error always leaves every target unchanged.
      await assert.rejects(cleanupPlan("orders", [30, 999], fixture), /TARGET_NOT_FOUND/);
    } finally {
      (pool as any).connect = savedConnect;
      await query("ROLLBACK");
      connection.release();
      await pool.end();
    }
  });
