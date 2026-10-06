-- An inactive contract can still be edited; only explicitly ended contracts
-- are archived and locked against further changes.
ALTER TABLE shop_contracts
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;