ALTER TABLE shop_contracts
  ADD COLUMN IF NOT EXISTS shipping_mode text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'shop_contracts_shipping_mode_check'
       AND conrelid = 'shop_contracts'::regclass
  ) THEN
    ALTER TABLE shop_contracts
      ADD CONSTRAINT shop_contracts_shipping_mode_check
      CHECK (shipping_mode IS NULL OR shipping_mode IN ('automatic_vehicle', 'self_transport'));
  END IF;
END $$;