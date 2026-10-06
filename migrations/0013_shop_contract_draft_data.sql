ALTER TABLE shop_contracts
  ADD COLUMN IF NOT EXISTS draft_data jsonb;