import type { PoolClient } from "@neondatabase/serverless";

export class KardexDeleteError extends Error {
  constructor(readonly code: "not_found" | "scope_changed") {
    super(code);
  }
}

// The caller starts a transaction on this client. Lock writes before reading the
// confirmed set so no batch can be added or reassigned between that check and deletion.
export async function deleteKardexProduct(
  client: PoolClient,
  productId: number,
  vendorRestriction: number | null,
  confirmedIds: number[],
) {
  await client.query("SET LOCAL lock_timeout = '5s'");
  await client.query("LOCK TABLE showcase_products IN SHARE ROW EXCLUSIVE MODE");
  const { rows: [product] } = await client.query<{ vendor_id: number | null; barcode: string | null; sku: string | null }>(
    `SELECT vendor_id, NULLIF(btrim(barcode), '') AS barcode, sku
       FROM showcase_products
      WHERE id = $1 AND ($2::int IS NULL OR vendor_id = $2)`,
    [productId, vendorRestriction],
  );
  if (!product) throw new KardexDeleteError("not_found");

  const { vendor_id: vendorId, barcode, sku } = product;
  const { rows: group } = await client.query<{ id: number }>(
    `SELECT id FROM showcase_products
      WHERE vendor_id IS NOT DISTINCT FROM $1::int
        AND (CASE WHEN $2::text IS NULL THEN id = $3 ELSE btrim(barcode) = $2 END)
      ORDER BY id`,
    [vendorId, barcode, productId],
  );
  const ids = group.map(row => row.id);
  const confirmed = new Set(confirmedIds);
  if (confirmed.size !== ids.length || ids.some(id => !confirmed.has(id))) {
    throw new KardexDeleteError("scope_changed");
  }

  // Do not guess based on name or blank barcode. For a legacy unbarcoded item,
  // match its generated shop SKU or an exact SKU not shared by another Kardex row.
  const shop = await client.query<{ id: number }>(
    `DELETE FROM shop_products AS shop
      WHERE shop.vendor_id IS NOT DISTINCT FROM $1::int
        AND (CASE WHEN $2::text IS NOT NULL THEN btrim(shop.barcode) = $2 ELSE
          NULLIF(btrim(shop.barcode), '') IS NULL
          AND (left(shop.sku, length($3::text)) = $3
            OR (shop.sku = $4 AND NOT EXISTS (
              SELECT 1 FROM showcase_products AS other
               WHERE other.vendor_id IS NOT DISTINCT FROM $1::int AND other.id <> $5 AND other.sku = $4
            )))
        END)
      RETURNING shop.id`,
    [vendorId, barcode, `SP-${productId}-`, sku || null, productId],
  );
  const kardex = await client.query<{ id: number }>(
    "DELETE FROM showcase_products WHERE id = ANY($1::int[]) RETURNING id",
    [ids],
  );
  if (kardex.rows.length !== ids.length) throw new KardexDeleteError("scope_changed");
  return { deletedIds: ids, shopDeletedIds: shop.rows.map(row => row.id) };
}
