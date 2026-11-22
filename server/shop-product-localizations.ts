import { pool } from "./db";
import type { ProductLocalizations } from "@shared/product-localizations";

type ShopIdentity = { name: string; vendorId: number | null; barcode: string | null };

export const shopProductLocalizationSql = `
  SELECT product_localizations AS "productLocalizations", technical_name AS "technicalName" FROM showcase_products
  WHERE vendor_id IS NOT DISTINCT FROM $1::integer
    AND (CASE WHEN $2::text IS NOT NULL THEN barcode = $2 ELSE name = $3 END)
  ORDER BY (sync_with_shop IS DISTINCT FROM FALSE) DESC, id ASC
  LIMIT 1
`;

export async function getShopProductText(product: ShopIdentity) {
  const { rows } = await pool.query<{ productLocalizations: ProductLocalizations | null; technicalName: string | null }>(
    shopProductLocalizationSql,
    [product.vendorId, product.barcode?.trim() || null, product.name],
  );
  return rows[0] ?? { productLocalizations: null, technicalName: null };
}
