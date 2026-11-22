-- Optional curated translations; existing product text remains the fallback.
ALTER TABLE showcase_products ADD COLUMN IF NOT EXISTS product_localizations jsonb;
