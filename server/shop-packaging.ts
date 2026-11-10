import { pool } from "./db";
import type { PackagingSpecifications } from "../shared/product-packaging";

export interface KardexPackagingRow {
  name: string;
  packaging_specifications: PackagingSpecifications | null;
}

// Shop synchronization uses the product name, not a shared numeric ID.
// The oldest Kardex row owns shared product settings; later rows are batches.
export const shopPackagingSql = `
  SELECT DISTINCT ON (name) name, packaging_specifications
  FROM showcase_products
  WHERE name = ANY($1::text[])
  ORDER BY name, id ASC
`;

export async function withShopPackaging<T extends { name: string }>(
  products: readonly T[],
  read: (names: string[]) => Promise<KardexPackagingRow[]> = async (names) =>
    (await pool.query<KardexPackagingRow>(shopPackagingSql, [names])).rows,
): Promise<Array<T & { packagingSpecifications: PackagingSpecifications | null }>> {
  if (products.length === 0) return [];
  const rows = await read([...new Set(products.map(product => product.name))]);
  const byName = new Map(rows.map(row => [row.name, row.packaging_specifications]));
  return products.map(product => ({
    ...product,
    packagingSpecifications: byName.get(product.name) ?? null,
  }));
}
