CREATE TABLE IF NOT EXISTS shop_contract_number_counters (
  year integer PRIMARY KEY,
  counter integer NOT NULL CHECK (counter >= 1110 AND counter <= 99999)
);

ALTER TABLE shop_contract_items
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;