ALTER TABLE showcase_products
  ADD COLUMN IF NOT EXISTS contract_only boolean NOT NULL DEFAULT false;

ALTER TABLE shop_products
  ADD COLUMN IF NOT EXISTS contract_only boolean NOT NULL DEFAULT false;