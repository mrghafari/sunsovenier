ALTER TABLE shop_contracts
  ADD COLUMN IF NOT EXISTS delivery_term text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shop_contracts_delivery_term_check'
      AND conrelid = 'shop_contracts'::regclass
  ) THEN
    ALTER TABLE shop_contracts
      ADD CONSTRAINT shop_contracts_delivery_term_check
      CHECK (delivery_term IS NULL OR delivery_term IN (
        'EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'
      ));
  END IF;
END $$;