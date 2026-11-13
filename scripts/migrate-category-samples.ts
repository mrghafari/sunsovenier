// Additive migration; run against the intended database before deploying the new category code.
import { pool } from "../server/db";
import { readLandingContent } from "../server/landing-content-store";
import assets from "../client/src/pages/landing/landing-assets.json";
import { BASE_PRODUCTS } from "../client/src/pages/landing/catalog";

const legacySlots: Record<string, { id: string; asset: number }> = {
  "fuel-additives": { id: "water", asset: 4 },
  "water-treatment": { id: "water-treatment", asset: 5 },
  "paint-solvents": { id: "ibc1000", asset: 5 },
  "agricultural-fertilizers": { id: "fert", asset: 6 },
  "chemicals": { id: "tank1500", asset: 7 },
  "industrial-chemicals": { id: "tank1500", asset: 7 },
  "technical-equipment": { id: "drum220", asset: 9 },
  "commercial-goods": { id: "commercial-goods", asset: 6 },
};

try {
  await pool.query("ALTER TABLE shop_categories ADD COLUMN IF NOT EXISTS sample_images json");
  const landing = await readLandingContent();
  const { rows } = await pool.query("SELECT id,slug,image_url FROM shop_categories WHERE sample_images IS NULL");
  let migrated = 0;
  for (const category of rows) {
    const legacy = legacySlots[category.slug];
    const sampleImages = legacy
      ? [{ id: `legacy-${legacy.id}`, imageUrl: landing.images[legacy.id] || assets.images[BASE_PRODUCTS.find(product => product.id === legacy.id)?.asset ?? legacy.asset].url, title: "", description: "" }]
      : category.image_url
        ? [{ id: `cover-${category.id}`, imageUrl: category.image_url, title: "", description: "" }]
        : [];
    await pool.query("UPDATE shop_categories SET sample_images=$1::json WHERE id=$2 AND sample_images IS NULL", [JSON.stringify(sampleImages), category.id]);
    migrated++;
  }
  console.log(`Category samples: initialized ${migrated} categories; existing galleries unchanged.`);
} finally {
  await pool.end();
}
