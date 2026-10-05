-- Approval evidence only. Never changes a fact, journal, inventory or activation gate.
CREATE TABLE accounting_loading_shipping (
  fact_id integer PRIMARY KEY REFERENCES accounting_operational_facts(id),
  company_id integer NOT NULL REFERENCES accounting_companies(id),
  order_id integer NOT NULL,
  currency text NOT NULL REFERENCES accounting_currencies(code),
  order_shipping_total numeric(38,8) NOT NULL CHECK (order_shipping_total > 0),
  amount numeric(38,8) NOT NULL CHECK (amount >= 0 AND amount <= order_shipping_total),
  evidence_reference text NOT NULL CHECK (length(trim(evidence_reference)) BETWEEN 5 AND 500),
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 5 AND 500),
  actor_id integer NOT NULL CHECK (actor_id > 0),
  actor_type text NOT NULL CHECK (actor_type IN ('admin','custom')),
  approved_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX accounting_loading_shipping_order ON accounting_loading_shipping(company_id,order_id);

CREATE FUNCTION accounting_loading_shipping_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE f accounting_operational_facts%ROWTYPE; precision integer; committed numeric;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Approved loading shipping evidence is immutable';
  END IF;
  PERFORM pg_advisory_xact_lock(718392,0);
  SELECT * INTO STRICT f FROM accounting_operational_facts WHERE id=NEW.fact_id;
  IF f.event_type <> 'LoadingCompleted' OR f.company_id <> NEW.company_id OR f.order_id <> NEW.order_id
    OR f.payload->'order'->>'version' IS DISTINCT FROM '1'
    OR f.payload->'order'->>'companyId' IS DISTINCT FROM NEW.company_id::text
    OR f.payload->'order'->>'orderId' IS DISTINCT FROM NEW.order_id::text
    OR f.payload->'order'->>'currency' IS DISTINCT FROM NEW.currency
    OR f.payload->'order'->>'shippingMode' IS DISTINCT FROM 'SELLER_ARRANGED'
    OR f.payload->'order'->>'shippingPriceBasis' IS DISTINCT FROM 'fixed'
    OR (f.payload->'order'->>'shippingPrice')::numeric IS DISTINCT FROM NEW.order_shipping_total THEN
    RAISE EXCEPTION 'Loading shipping approval does not match its immutable source';
  END IF;
  SELECT decimals INTO STRICT precision FROM accounting_currencies WHERE code=NEW.currency AND is_active;
  IF round(NEW.amount,precision) <> NEW.amount OR round(NEW.order_shipping_total,precision) <> NEW.order_shipping_total THEN
    RAISE EXCEPTION 'Invalid loading shipping currency precision';
  END IF;
  IF EXISTS(SELECT 1 FROM accounting_loading_shipping WHERE company_id=NEW.company_id AND order_id=NEW.order_id
      AND (currency<>NEW.currency OR order_shipping_total<>NEW.order_shipping_total)) THEN
    RAISE EXCEPTION 'Conflicting order shipping snapshot';
  END IF;
  SELECT coalesce(sum(amount),0) INTO committed FROM accounting_loading_shipping
    WHERE company_id=NEW.company_id AND order_id=NEW.order_id;
  IF committed + NEW.amount > NEW.order_shipping_total THEN
    RAISE EXCEPTION 'Loading shipping approvals exceed the fixed order total';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_loading_shipping_guard BEFORE INSERT OR UPDATE OR DELETE ON accounting_loading_shipping
  FOR EACH ROW EXECUTE FUNCTION accounting_loading_shipping_guard();
