import assert from "node:assert/strict";
import { test } from "node:test";
import { pool } from "./db";
import { deleteKardexProduct } from "./kardex-product-deletion";

test("Kardex deletion honors exact batch confirmation and vendor scope and preserves referenced products", async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Session-local fixtures hide the live tables during this test.
    await client.query(`
      CREATE TEMP TABLE showcase_products (id int PRIMARY KEY, vendor_id int, barcode text, sku text);
      CREATE TEMP TABLE shop_products (id int PRIMARY KEY, vendor_id int, barcode text, sku text);
      CREATE TEMP TABLE contract_fixture (product_id int REFERENCES shop_products(id));
      INSERT INTO showcase_products VALUES
        (1, NULL, '12345','main'), (2, NULL, '12345 ','batch'), (3, 42, '12345','vendor'),
        (4, NULL, NULL,'base'), (5,NULL,NULL,'other'), (6, NULL,'98765','contract'),
        (7, NULL, '98765','contract-batch'), (8, NULL, '', 'repeated'),
        (9, NULL, '', 'repeated');
      INSERT INTO shop_products VALUES
        (100,NULL,'12345','main'), (101,42,'12345','vendor'), (102,NULL,'','SP-4-LEGACY'),
        (103,NULL,NULL,'other'), (104,NULL,'98765','contract'), (105,NULL,NULL,'repeated');
      INSERT INTO contract_fixture VALUES (104);
    `);

    await assert.rejects(deleteKardexProduct(client, 1, null, [1]), { code: "scope_changed" });
    await assert.rejects(deleteKardexProduct(client, 1, null, [1, 2, 3]), { code: "scope_changed" });
    await assert.rejects(deleteKardexProduct(client, 1, 42, [1, 2]), { code: "not_found" });
    assert.deepEqual(await deleteKardexProduct(client, 1, null, [2, 1]), { deletedIds: [1, 2], shopDeletedIds: [100] });
    assert.deepEqual(await deleteKardexProduct(client, 4, null, [4]), { deletedIds: [4], shopDeletedIds: [102] });
    assert.deepEqual(await deleteKardexProduct(client, 8, null, [8]), { deletedIds: [8], shopDeletedIds: [] });

    await client.query("SAVEPOINT before_referenced_delete");
    await assert.rejects(deleteKardexProduct(client, 6, null, [6, 7]), { code: "23503" });
    await client.query("ROLLBACK TO SAVEPOINT before_referenced_delete");
    const ids = (table: "showcase_products" | "shop_products") =>
      client.query(`SELECT id FROM ${table} ORDER BY id`).then(({ rows }) => rows.map(row => row.id));
    assert.deepEqual(await ids("showcase_products"), [3, 5, 6, 7, 9]);
    assert.deepEqual(await ids("shop_products"), [101, 103, 104, 105]);
  } finally {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
});
