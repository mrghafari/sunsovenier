import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { pool } from "./db";
import { packagingSpecificationsSchema } from "../shared/product-packaging";

test("packaging persists, edits and clears independently of product weights and technical data (rollback only)", async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const specs = packagingSpecificationsSchema.parse({ containerType: "drum", material: "steel", nominalCapacityL: 200, wallThicknessMm: 1.2, tareWeightKg: 18, testPressureKpa: 250 });
    const result = await client.query(`INSERT INTO showcase_products
      (name,category,description,barcode,sku,net_weight,gross_weight,weight_unit,specifications,packaging_specifications)
      VALUES($1,'test','Rollback-only container test',$2,$3,180,198,'kg',$4,$5)
      RETURNING id,packaging_specifications`,
      ["Packaging rollback fixture", randomUUID(), randomUUID(), JSON.stringify({ purity: "99.5%" }), JSON.stringify(specs)]);
    const id = result.rows[0].id;
    assert.deepEqual(result.rows[0].packaging_specifications, specs);
    await client.query("UPDATE showcase_products SET name=$1 WHERE id=$2", ["Legacy edit", id]);
    const retained = (await client.query("SELECT packaging_specifications,net_weight,gross_weight,specifications FROM showcase_products WHERE id=$1", [id])).rows[0];
    assert.deepEqual(retained.packaging_specifications, specs);
    assert.equal(Number(retained.net_weight), 180);
    assert.equal(Number(retained.gross_weight), 198);
    assert.equal(retained.specifications.purity, "99.5%");
    await client.query("UPDATE showcase_products SET packaging_specifications=$1 WHERE id=$2", [JSON.stringify({ ...specs, wallThicknessMm: 1.4 }), id]);
    assert.equal((await client.query("SELECT packaging_specifications FROM showcase_products WHERE id=$1", [id])).rows[0].packaging_specifications.wallThicknessMm, 1.4);
    await client.query("UPDATE showcase_products SET packaging_specifications=NULL WHERE id=$1", [id]);
    assert.equal((await client.query("SELECT packaging_specifications FROM showcase_products WHERE id=$1", [id])).rows[0].packaging_specifications, null);
  } finally {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
});
