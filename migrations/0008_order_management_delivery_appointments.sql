ALTER TABLE order_management
  ADD COLUMN IF NOT EXISTS estimated_delivery_at timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_delivery_timezone text;