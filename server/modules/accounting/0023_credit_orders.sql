CREATE TABLE accounting_credit_orders (
  order_id integer PRIMARY KEY REFERENCES customer_orders(id),
  company_id integer NOT NULL REFERENCES accounting_companies(id),
  wallet_id integer NOT NULL REFERENCES accounting_wallet_links(wallet_id),
  customer_id integer NOT NULL REFERENCES crm_customers(id),
  currency text NOT NULL REFERENCES accounting_currencies(code),
  amount numeric(38,8) NOT NULL CHECK(amount>0),
  order_snapshot jsonb NOT NULL,
  evidence_reference text NOT NULL CHECK(length(trim(evidence_reference))>=5),
  actor_id integer NOT NULL CHECK(actor_id>0),
  actor_type text NOT NULL CHECK(actor_type IN ('admin','custom')),
  status text NOT NULL DEFAULT 'registered' CHECK(status IN ('registered','approved')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX accounting_credit_order_party ON accounting_credit_orders(company_id,customer_id,currency,status);
CREATE FUNCTION accounting_guard_credit_order() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Credit authorization evidence cannot be deleted'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status<>'registered' THEN RAISE EXCEPTION 'Credit orders require separate approval'; END IF;
  ELSE
    IF (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status') THEN
      RAISE EXCEPTION 'Credit authorization identity and snapshot are immutable';
    END IF;
    IF OLD.status<>NEW.status AND NOT (OLD.status='registered' AND NEW.status='approved') THEN
      RAISE EXCEPTION 'Invalid credit authorization transition';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_guard_credit_order BEFORE INSERT OR UPDATE OR DELETE ON accounting_credit_orders
  FOR EACH ROW EXECUTE FUNCTION accounting_guard_credit_order();