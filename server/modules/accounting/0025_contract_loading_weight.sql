-- Contract-weight review evidence only. No stock, journal, wallet or activation changes.
CREATE TABLE accounting_loading_weight_reviews (
  id serial PRIMARY KEY,
  company_id integer NOT NULL REFERENCES accounting_companies(id),
  order_id integer NOT NULL REFERENCES customer_orders(id),
  history_key text NOT NULL CHECK (history_key ~ '^[a-f0-9]{64}$'),
  basis jsonb NOT NULL CHECK (
    basis->>'status' = 'WITHIN_CONTRACT' AND basis->>'reviewDepartment' = 'commercial'
    AND basis->>'postingAllowed' = 'false'
    AND jsonb_typeof(basis->'orderedWeightTons')='string'
    AND jsonb_typeof(basis->'loadedWeightTons')='string'
    AND jsonb_typeof(basis->'allowedWeightTons')='string'
    AND (basis->>'orderedWeightTons')::numeric > 0
    AND (basis->>'loadedWeightTons')::numeric > 0
    AND (basis->>'loadedWeightTons')::numeric <= (basis->>'allowedWeightTons')::numeric
  ),
  evidence_reference text NOT NULL CHECK(length(btrim(evidence_reference)) BETWEEN 5 AND 500),
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 5 AND 500),
  actor_id integer NOT NULL CHECK(actor_id>0),
  actor_type text NOT NULL CHECK(actor_type IN ('admin','custom')),
  approved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,order_id,history_key)
);
CREATE TRIGGER accounting_loading_weight_review_immutable BEFORE UPDATE OR DELETE ON accounting_loading_weight_reviews
  FOR EACH ROW EXECUTE FUNCTION accounting_wallet_immutable();
