CREATE TABLE shop_contracts (
  id serial PRIMARY KEY,
  number text NOT NULL UNIQUE,
  customer_id integer NOT NULL REFERENCES crm_customers(id),
  terms text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE shop_contract_items (
  id serial PRIMARY KEY,
  contract_id integer NOT NULL REFERENCES shop_contracts(id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES shop_products(id),
  max_quantity integer NOT NULL CONSTRAINT shop_contract_items_max_quantity_ck CHECK (max_quantity > 0),
  used_quantity integer NOT NULL DEFAULT 0 CONSTRAINT shop_contract_items_used_quantity_ck CHECK (used_quantity >= 0),
  unit_price integer NOT NULL CONSTRAINT shop_contract_items_unit_price_ck CHECK (unit_price >= 0),
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT shop_contract_items_contract_product_uidx UNIQUE (contract_id, product_id)
);

CREATE TABLE shop_contract_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id integer NOT NULL REFERENCES shop_contracts(id),
  customer_id integer NOT NULL REFERENCES crm_customers(id),
  order_id integer REFERENCES customer_orders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'attached', 'released')),
  expires_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE shop_contract_hold_items (
  id serial PRIMARY KEY,
  hold_id uuid NOT NULL REFERENCES shop_contract_holds(id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES shop_products(id),
  quantity integer NOT NULL CONSTRAINT shop_contract_hold_items_quantity_ck CHECK (quantity > 0),
  CONSTRAINT shop_contract_hold_items_hold_product_uidx UNIQUE (hold_id, product_id)
);

CREATE INDEX shop_contracts_customer_idx ON shop_contracts(customer_id);
CREATE INDEX shop_contract_holds_expiry_idx ON shop_contract_holds(status, expires_at);
CREATE INDEX shop_contract_holds_order_idx ON shop_contract_holds(order_id);

ALTER TABLE customer_orders
  ADD COLUMN contract_id integer REFERENCES shop_contracts(id) ON DELETE SET NULL;

-- Idempotently release reserved contract quantities when an order is cancelled,
-- payment fails, or its row is deleted. Applications may also call
-- releaseContractHold() after other known failure/cancellation paths.
CREATE OR REPLACE FUNCTION release_shop_contract_holds_for_order(p_order_id integer)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  released_hold record;
BEGIN
  FOR released_hold IN
    UPDATE shop_contract_holds
       SET status = 'released', updated_at = now()
     WHERE order_id = p_order_id AND status <> 'released'
     RETURNING id
  LOOP
    UPDATE shop_contract_items ci
       SET used_quantity = ci.used_quantity - totals.quantity
      FROM (
        SELECT product_id, sum(quantity)::integer AS quantity
          FROM shop_contract_hold_items
         WHERE hold_id = released_hold.id
         GROUP BY product_id
      ) totals
     WHERE ci.contract_id = (
             SELECT contract_id FROM shop_contract_holds WHERE id = released_hold.id
           )
       AND ci.product_id = totals.product_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION shop_contract_order_lifecycle_release()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM release_shop_contract_holds_for_order(OLD.id);
    RETURN OLD;
  END IF;

  IF (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status)
     OR (NEW.payment_status IN ('failed', 'cancelled')
         AND OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    PERFORM release_shop_contract_holds_for_order(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER customer_orders_release_shop_contract_holds
AFTER UPDATE OF status, payment_status ON customer_orders
FOR EACH ROW EXECUTE FUNCTION shop_contract_order_lifecycle_release();

CREATE TRIGGER customer_orders_delete_release_shop_contract_holds
BEFORE DELETE ON customer_orders
FOR EACH ROW EXECUTE FUNCTION shop_contract_order_lifecycle_release();