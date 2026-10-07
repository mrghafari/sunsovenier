import assert from "node:assert/strict";
import {pool} from "../server/db";
import {calculateContractPackaging} from "../shared/contract-packaging";

// Temporary table copies only: no live rows, serial counters, or data are changed.
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const columns = await client.query(`SELECT table_name,column_name,data_type,is_nullable
    FROM information_schema.columns WHERE table_schema='public'
    AND ((table_name='shop_contracts' AND column_name='packaging')
      OR (table_name='customer_orders' AND column_name='packaging_details'))`);
  assert.equal(columns.rowCount,2);
  assert.ok(columns.rows.every(row=>row.data_type==="jsonb" && row.is_nullable==="YES"));
  await client.query(`CREATE TEMP TABLE packaging_contract_probe (LIKE shop_contracts);
    CREATE TEMP TABLE packaging_order_probe (LIKE customer_orders);
    INSERT INTO packaging_contract_probe SELECT * FROM shop_contracts LIMIT 1;
    INSERT INTO packaging_order_probe SELECT * FROM customer_orders LIMIT 1;`);
  const original = {type:"drum",customName:"",costPerTonne:12000,vatRatePercent:9.25};
  const charge = calculateContractPackaging(original,[{productId:1,quantity:10,netWeight:1000}])!;
  await client.query("UPDATE packaging_contract_probe SET packaging=$1",[original]);
  await client.query("UPDATE packaging_order_probe SET packaging_details=$1",[charge]);
  const saved = await client.query("SELECT packaging_details FROM packaging_order_probe");
  assert.ok(saved.rowCount);
  assert.deepEqual(saved.rows[0].packaging_details,charge);
  assert.equal(charge.netTonnes,10); assert.equal(charge.costAmount,120000);
  assert.equal(charge.vatAmount,11100);
  await client.query("UPDATE packaging_contract_probe SET packaging=$1",[{...original,costPerTonne:20000,vatRatePercent:20}]);
  const frozen = await client.query("SELECT packaging_details FROM packaging_order_probe");
  assert.deepEqual(frozen.rows[0].packaging_details,charge);
  console.log("Nullable JSONB schema, packaging persistence, net-tonne billing, independent VAT and frozen order terms passed.");
}finally{
  await client.query("ROLLBACK"); client.release(); await pool.end();
}
