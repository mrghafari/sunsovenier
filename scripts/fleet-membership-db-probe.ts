import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "../server/db";

// All fixture writes are rolled back; no existing vehicle is changed.
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const template = await client.query("SELECT id FROM vehicle_templates LIMIT 1");
  assert.ok(template.rowCount, "A shared vehicle template is required");
  // Explicit fixture IDs avoid touching SERIAL sequences, which do not roll back.
  const readyId = await client.query("SELECT COALESCE(MAX(id),0)+10000 AS id FROM ready_vehicles");
  const legacyId = await client.query("SELECT COALESCE(MAX(id),0)+10000 AS id FROM delivery_vehicles");
  const plate = `TEST-${randomUUID().slice(0, 10)}`;
  const created = await client.query(
    `INSERT INTO ready_vehicles
     (id,vehicle_template_id,license_plate,driver_name,driver_mobile,load_capacity,fleet_category)
     VALUES ($1,$2,$3,'Test fixture','00000000000',1000,'standard') RETURNING id`,
    [readyId.rows[0].id, template.rows[0].id, plate]);
  const id = created.rows[0].id;
  await client.query("UPDATE ready_vehicles SET fleet_category='both' WHERE id=$1", [id]);
  for (const group of ["standard", "contract"]) {
    const rows = await client.query(
      "SELECT id FROM ready_vehicles WHERE id=$1 AND fleet_category IN ($2,'both')", [id, group]);
    assert.equal(rows.rows[0]?.id, id);
  }
  await client.query("UPDATE ready_vehicles SET fleet_category='standard' WHERE id=$1", [id]);
  const removed = await client.query(
    "SELECT id FROM ready_vehicles WHERE id=$1 AND fleet_category IN ('contract','both')", [id]);
  assert.equal(removed.rowCount, 0);
  const legacy = await client.query(
    `INSERT INTO delivery_vehicles (id,vehicle_type,plate_number,max_weight,fleet_category)
     VALUES ($1,'truck',$2,1000,'both') RETURNING fleet_category`, [legacyId.rows[0].id, plate]);
  assert.equal(legacy.rows[0].fleet_category, "both");
  console.log("Fleet membership persistence: shared identity, both catalogs, reversible membership, legacy source passed.");
} finally {
  await client.query("ROLLBACK");
  client.release();
  await pool.end();
}
