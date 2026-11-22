import { pool } from "./db";
import type { ProductLocalizations } from "@shared/product-localizations";

type ShopIdentity = { name: string; vendorId: number | null; barcode: string | null };

export const shopProductLocalizationSql = `
  SELECT product_localizations FROM showcase_products
  WHERE vendor_id IS NOT DISTINCT FROM $1::integer
    AND (CASE WHEN $2::text IS NOT NULL THEN barcode = $2 ELSE name = $3 END)
  ORDER BY (sync_with_shop IS DISTINCT FROM FALSE) DESC, id ASC
  LIMIT 1
`;

export async function getShopProductLocalizations(product: ShopIdentity): Promise<ProductLocalizations | null> {
  const { rows } = await pool.query<{ product_localizations: ProductLocalizations | null }>(
    shopProductLocalizationSql,
    [product.vendorId, product.barcode?.trim() || null, product.name],
  );
  return rows[0]?.product_localizations ?? null;
}
