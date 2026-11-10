-- Optional, per-Kardex-product container specifications; no changes to weights,
-- historical orders, barcode grouping or existing technical specifications.
ALTER TABLE showcase_products
  ADD COLUMN IF NOT EXISTS packaging_specifications jsonb;
