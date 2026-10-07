-- Additive only: legacy contracts/orders retain null and no new charges.
ALTER TABLE shop_contracts ADD COLUMN IF NOT EXISTS packaging jsonb;
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS packaging_details jsonb;
