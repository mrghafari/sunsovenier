import assert from "node:assert/strict";
import { pool } from "../server/db";

// All writes target a temporary probe table, never orders/wallets/transactions.
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const legacy = await client.query(`
    SELECT w.customer_id,b.company_id FROM customer_wallets w
    JOIN accounting_source_bindings b ON b.source_module='shop' AND b.capture_enabled
    JOIN accounting_wallet_cutovers g ON g.company_id=b.company_id AND g.pipeline_ready
    WHERE w.status='active' AND w.currency='IQD'
      AND accounting_legacy_wallet_customer(w.customer_id)
    LIMIT 1`);
  assert.equal(legacy.rows.length, 1, "An evidenced legacy wallet and active pipeline are required");
  await client.query(`CREATE TEMP TABLE checkout_guard_probe ON COMMIT DROP AS
    SELECT id,customer_id,currency,total_amount,payment_method,payment_status,accounting_company_id,created_at
    FROM customer_orders WITH NO DATA`);
  await client.query(`CREATE TRIGGER checkout_guard_probe_trigger BEFORE UPDATE ON checkout_guard_probe
    FOR EACH ROW EXECUTE FUNCTION accounting_wallet_new_order_guard()`);
  await client.query(`INSERT INTO checkout_guard_probe
    (id,customer_id,currency,total_amount,payment_method,payment_status,accounting_company_id,created_at)
    VALUES(-2147480000,$1,'IQD',100,'wallet_full','pending',$2,now() AT TIME ZONE 'UTC')`,
    [legacy.rows[0].customer_id, legacy.rows[0].company_id]);
  await client.query("UPDATE checkout_guard_probe SET payment_status='paid'");
  const accepted = await client.query("SELECT payment_status FROM checkout_guard_probe");
  assert.equal(accepted.rows[0].payment_status, "paid", "Unmigrated legacy checkout must remain usable");

  async function assertRejected(customerId: number) {
    await client.query("UPDATE checkout_guard_probe SET payment_status='pending',customer_id=$1", [customerId]);
    await client.query("SAVEPOINT protected_payment");
    let error: any;
    try { await client.query("UPDATE checkout_guard_probe SET payment_status='paid'"); }
    catch (caught) { error = caught; }
    await client.query("ROLLBACK TO SAVEPOINT protected_payment");
    assert.equal(error?.code, "P0001");
    assert.match(error?.message || "", /cannot be marked paid before the loading settlement bridge/);
  }
  await assertRejected(-2147480000);
  const linked = await client.query("SELECT customer_id FROM accounting_wallet_links WHERE currency='IQD' LIMIT 1");
  if (linked.rows.length) await assertRejected(Number(linked.rows[0].customer_id));

  // The finance bridge uses TG_TABLE_NAME and unqualified order lookups.
  // Shadow those relations with temporary, synthetic rows, never live orders.
  await client.query(`CREATE TEMP TABLE customer_orders ON COMMIT DROP AS
    SELECT * FROM public.customer_orders WITH NO DATA`);
  await client.query(`CREATE TEMP TABLE order_management ON COMMIT DROP AS
    SELECT * FROM public.order_management WITH NO DATA`);
  await client.query(`INSERT INTO customer_orders
    (id,customer_id,currency,total_amount,payment_method,payment_status,accounting_company_id,created_at)
    VALUES(-2147480000,$1,'IQD',100,'wallet_full','pending',$2,now() AT TIME ZONE 'UTC')`,
    [legacy.rows[0].customer_id, legacy.rows[0].company_id]);
  await client.query(`INSERT INTO order_management(id,customer_order_id,current_status)
    VALUES(-2147480000,-2147480000,'pending')`);
  await client.query(`CREATE TRIGGER finance_bridge_probe BEFORE UPDATE ON order_management
    FOR EACH ROW EXECUTE FUNCTION public.accounting_wallet_finance_bridge()`);
  await client.query("UPDATE order_management SET current_status='financial_approved'");
  await client.query("UPDATE customer_orders SET customer_id=-2147480000");
  await client.query("SAVEPOINT protected_registration");
  let registrationError: any;
  try { await client.query("UPDATE order_management SET current_status='financial_approved'"); }
  catch (caught) { registrationError = caught; }
  await client.query("ROLLBACK TO SAVEPOINT protected_registration");
  assert.equal(registrationError?.code, "P0001");
  assert.match(registrationError?.message || "", /registration is incomplete/);
  await client.query("UPDATE order_management SET current_status='cancelled'");
  assert.equal((await client.query("SELECT current_status FROM order_management")).rows[0].current_status, "cancelled");
  console.log("PASS: actual PostgreSQL guards accept evidenced legacy checkout/review; reject unknown/linked prepaid payment and unregistered approval; allow cancellation without registration. Only temporary rows changed; all rolled back.");
} finally {
  await client.query("ROLLBACK");
  client.release();
  await pool.end();
}
