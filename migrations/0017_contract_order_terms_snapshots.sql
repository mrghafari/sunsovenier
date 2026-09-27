ALTER TABLE shop_contracts
  ADD COLUMN original_contract_snapshot jsonb,
  ADD COLUMN original_snapshot_at timestamptz;

ALTER TABLE shop_contract_holds
  ADD COLUMN contract_snapshot jsonb;

CREATE TABLE IF NOT EXISTS shop_contract_order_snapshots (
  order_id integer NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  contract_id integer NOT NULL REFERENCES shop_contracts(id) ON DELETE RESTRICT,
  contract_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_contract_order_snapshots_order_id_key UNIQUE (order_id)
);