import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { pool } from "./db";
import { withShopPackaging, shopPackagingSql } from "./shop-packaging";

test("shop reads live base Kardex packaging, including edits and clear, without copying it (rollback only)", async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const name = `Packing test ${randomUUID()}`;
    const specs = { version: 1, material: "steel", nominalCapacityL: 200, reusable: false, workingPressureBar: 0 };
    const insert = async (value: unknown) => (await client.query(
      `INSERT INTO showcase_products(name,category,description,barcode,sku,packaging_specifications)
       VALUES($1,'test','Rollback-only packing',$2,$3,$4) RETURNING id`,
      [name, randomUUID(), randomUUID(), JSON.stringify(value)],
    )).rows[0].id;
    const base = await insert(specs);
    await insert({ version: 1, material: "glass", nominalCapacityL: 1 });
    const read = async (names: string[]) => (await client.query(shopPackagingSql, [names])).rows;
    const shop = [{ id: 1, name }];
    assert.deepEqual((await withShopPackaging(shop, read))[0].packagingSpecifications, specs);
    const changed = { ...specs, nominalCapacityL: 220 };
    await client.query("UPDATE showcase_products SET packaging_specifications=$1 WHERE id=$2", [JSON.stringify(changed), base]);
    assert.deepEqual((await withShopPackaging(shop, read))[0].packagingSpecifications, changed);
    await client.query("UPDATE showcase_products SET packaging_specifications=NULL WHERE id=$1", [base]);
    assert.equal((await withShopPackaging(shop, read))[0].packagingSpecifications, null);
  } finally {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
});
