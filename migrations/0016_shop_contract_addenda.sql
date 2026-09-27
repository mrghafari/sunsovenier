CREATE TABLE shop_contract_addenda (
  id serial PRIMARY KEY,
  parent_contract_id integer NOT NULL REFERENCES shop_contracts(id) ON DELETE RESTRICT,
  sequence integer NOT NULL CHECK (sequence > 0),
  number text NOT NULL UNIQUE,
  contract_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_contract_addenda_parent_sequence_uidx UNIQUE (parent_contract_id, sequence)
);