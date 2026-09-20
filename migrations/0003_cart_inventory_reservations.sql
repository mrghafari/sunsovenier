CREATE TABLE IF NOT EXISTS cart_inventory_reservations (
  id BIGSERIAL PRIMARY KEY,
  owner_key TEXT NOT NULL,
  session_id TEXT,
  customer_id INTEGER,
  shop_product_id INTEGER NOT NULL,
  showcase_product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'finalized', 'released')),
  order_id INTEGER,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  released_at TIMESTAMP,
  finalized_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS cart_inventory_reservations_owner_status_idx
  ON cart_inventory_reservations (owner_key, status);
CREATE INDEX IF NOT EXISTS cart_inventory_reservations_batch_status_idx
  ON cart_inventory_reservations (showcase_product_id, status);
CREATE INDEX IF NOT EXISTS cart_inventory_reservations_order_status_idx
  ON cart_inventory_reservations (order_id, status);

CREATE OR REPLACE FUNCTION finalize_cart_inventory_reservations()
RETURNS TRIGGER AS $$
DECLARE allocation RECORD;
BEGIN
  IF NEW.payment_status IN ('paid', 'confirmed')
     AND (TG_OP = 'INSERT'
          OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
             AND OLD.payment_status NOT IN ('paid', 'confirmed')) THEN
    IF EXISTS (
      SELECT 1 FROM cart_inventory_reservations WHERE order_id = NEW.id
    ) AND NOT EXISTS (
      SELECT 1 FROM cart_inventory_reservations
      WHERE order_id = NEW.id AND status IN ('pending', 'finalized')
    ) THEN
      RAISE EXCEPTION 'Inventory reservation for order % is no longer valid', NEW.id;
    END IF;
    FOR allocation IN
      SELECT showcase_product_id, SUM(quantity)::int AS quantity
      FROM cart_inventory_reservations
      WHERE order_id = NEW.id AND status = 'pending'
      GROUP BY showcase_product_id
      ORDER BY showcase_product_id
    LOOP
      UPDATE showcase_products
      SET stock_quantity = stock_quantity - allocation.quantity, updated_at = NOW()
      WHERE id = allocation.showcase_product_id
        AND stock_quantity >= allocation.quantity;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserved batch % has insufficient physical stock',
          allocation.showcase_product_id;
      END IF;
    END LOOP;
    UPDATE cart_inventory_reservations
    SET status = 'finalized', finalized_at = NOW(), updated_at = NOW()
    WHERE order_id = NEW.id AND status = 'pending';
  ELSIF NEW.payment_status NOT IN ('paid', 'confirmed')
     AND (NEW.payment_status IN ('failed', 'cancelled', 'canceled', 'expired')
         OR NEW.status IN ('cancelled', 'canceled', 'deleted'))
     AND (TG_OP = 'INSERT'
          OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
          OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE cart_inventory_reservations
    SET status = 'released', released_at = NOW(), updated_at = NOW()
    WHERE order_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cart_inventory_reservations_payment_trigger ON customer_orders;
DROP TRIGGER IF EXISTS customer_orders_cart_inventory_reservations_trg ON customer_orders;
DROP FUNCTION IF EXISTS finalize_or_release_cart_inventory_reservations();
CREATE TRIGGER cart_inventory_reservations_payment_trigger
AFTER INSERT OR UPDATE OF payment_status, status ON customer_orders
FOR EACH ROW EXECUTE FUNCTION finalize_cart_inventory_reservations();CREATE TABLE IF NOT EXISTS cart_inventory_reservations (
  id BIGSERIAL PRIMARY KEY,
  owner_key TEXT NOT NULL,
  session_id TEXT,
  customer_id INTEGER,
  shop_product_id INTEGER NOT NULL,
  showcase_product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'finalized', 'released')),
  order_id INTEGER,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  released_at TIMESTAMP,
  finalized_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS cart_inventory_reservations_owner_status_idx
  ON cart_inventory_reservations (owner_key, status);
CREATE INDEX IF NOT EXISTS cart_inventory_reservations_batch_status_idx
  ON cart_inventory_reservations (showcase_product_id, status);
CREATE INDEX IF NOT EXISTS cart_inventory_reservations_order_status_idx
  ON cart_inventory_reservations (order_id, status);

CREATE OR REPLACE FUNCTION finalize_cart_inventory_reservations()
RETURNS TRIGGER AS $$
DECLARE allocation RECORD;
BEGIN
  IF NEW.payment_status IN ('paid', 'confirmed')
     AND (TG_OP = 'INSERT'
          OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
             AND OLD.payment_status NOT IN ('paid', 'confirmed')) THEN
    IF EXISTS (
      SELECT 1 FROM cart_inventory_reservations WHERE order_id = NEW.id
    ) AND NOT EXISTS (
      SELECT 1 FROM cart_inventory_reservations
      WHERE order_id = NEW.id AND status IN ('pending', 'finalized')
    ) THEN
      RAISE EXCEPTION 'Inventory reservation for order % is no longer valid', NEW.id;
    END IF;
    FOR allocation IN
      SELECT showcase_product_id, SUM(quantity)::int AS quantity
      FROM cart_inventory_reservations
      WHERE order_id = NEW.id AND status = 'pending'
      GROUP BY showcase_product_id
      ORDER BY showcase_product_id
    LOOP
      UPDATE showcase_products
      SET stock_quantity = stock_quantity - allocation.quantity, updated_at = NOW()
      WHERE id = allocation.showcase_product_id
        AND stock_quantity >= allocation.quantity;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserved batch % has insufficient physical stock',
          allocation.showcase_product_id;
      END IF;
    END LOOP;
    UPDATE cart_inventory_reservations
    SET status = 'finalized', finalized_at = NOW(), updated_at = NOW()
    WHERE order_id = NEW.id AND status = 'pending';
  ELSIF NEW.payment_status NOT IN ('paid', 'confirmed')
     AND (NEW.payment_status IN ('failed', 'cancelled', 'canceled', 'expired')
         OR NEW.status IN ('cancelled', 'canceled', 'deleted'))
     AND (TG_OP = 'INSERT'
          OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
          OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE cart_inventory_reservations
    SET status = 'released', released_at = NOW(), updated_at = NOW()
    WHERE order_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cart_inventory_reservations_payment_trigger ON customer_orders;
DROP TRIGGER IF EXISTS customer_orders_cart_inventory_reservations_trg ON customer_orders;
DROP FUNCTION IF EXISTS finalize_or_release_cart_inventory_reservations();
CREATE TRIGGER cart_inventory_reservations_payment_trigger
AFTER INSERT OR UPDATE OF payment_status, status ON customer_orders
FOR EACH ROW EXECUTE FUNCTION finalize_cart_inventory_reservations();CREATE TABLE IF NOT EXISTS cart_inventory_reservations (
  id BIGSERIAL PRIMARY KEY,
  owner_key TEXT NOT NULL,
  session_id TEXT,
  customer_id INTEGER,
  shop_product_id INTEGER NOT NULL,
  showcase_product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'finalized', 'released')),
  order_id INTEGER,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  released_at TIMESTAMP,
  finalized_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS cart_inventory_reservations_owner_status_idx
  ON cart_inventory_reservations (owner_key, status);
CREATE INDEX IF NOT EXISTS cart_inventory_reservations_batch_status_idx
  ON cart_inventory_reservations (showcase_product_id, status);
CREATE INDEX IF NOT EXISTS cart_inventory_reservations_order_status_idx
  ON cart_inventory_reservations (order_id, status);

CREATE OR REPLACE FUNCTION finalize_cart_inventory_reservations()
RETURNS TRIGGER AS $$
DECLARE allocation RECORD;
BEGIN
  IF NEW.payment_status IN ('paid', 'confirmed')
     AND (TG_OP = 'INSERT'
          OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
             AND OLD.payment_status NOT IN ('paid', 'confirmed')) THEN
    IF EXISTS (
      SELECT 1 FROM cart_inventory_reservations WHERE order_id = NEW.id
    ) AND NOT EXISTS (
      SELECT 1 FROM cart_inventory_reservations
      WHERE order_id = NEW.id AND status IN ('pending', 'finalized')
    ) THEN
      RAISE EXCEPTION 'Inventory reservation for order % is no longer valid', NEW.id;
    END IF;
    FOR allocation IN
      SELECT showcase_product_id, SUM(quantity)::int AS quantity
      FROM cart_inventory_reservations
      WHERE order_id = NEW.id AND status = 'pending'
      GROUP BY showcase_product_id
      ORDER BY showcase_product_id
    LOOP
      UPDATE showcase_products
      SET stock_quantity = stock_quantity - allocation.quantity, updated_at = NOW()
      WHERE id = allocation.showcase_product_id
        AND stock_quantity >= allocation.quantity;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserved batch % has insufficient physical stock',
          allocation.showcase_product_id;
      END IF;
    END LOOP;
    UPDATE cart_inventory_reservations
    SET status = 'finalized', finalized_at = NOW(), updated_at = NOW()
    WHERE order_id = NEW.id AND status = 'pending';
  ELSIF NEW.payment_status NOT IN ('paid', 'confirmed')
     AND (NEW.payment_status IN ('failed', 'cancelled', 'canceled', 'expired')
         OR NEW.status IN ('cancelled', 'canceled', 'deleted'))
     AND (TG_OP = 'INSERT'
          OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
          OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE cart_inventory_reservations
    SET status = 'released', released_at = NOW(), updated_at = NOW()
    WHERE order_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cart_inventory_reservations_payment_trigger ON customer_orders;
DROP TRIGGER IF EXISTS customer_orders_cart_inventory_reservations_trg ON customer_orders;
DROP FUNCTION IF EXISTS finalize_or_release_cart_inventory_reservations();
CREATE TRIGGER cart_inventory_reservations_payment_trigger
AFTER INSERT OR UPDATE OF payment_status, status ON customer_orders
FOR EACH ROW EXECUTE FUNCTION finalize_cart_inventory_reservations();CREATE TABLE IF NOT EXISTS cart_inventory_reservations (
  id BIGSERIAL PRIMARY KEY,
  owner_key TEXT NOT NULL,
  session_id TEXT,
  customer_id INTEGER,
  shop_product_id INTEGER NOT NULL,
  showcase_product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'finalized', 'released')),
  order_id INTEGER,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  released_at TIMESTAMP,
  finalized_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS cart_inventory_reservations_owner_status_idx
  ON cart_inventory_reservations (owner_key, status);
CREATE INDEX IF NOT EXISTS cart_inventory_reservations_batch_status_idx
  ON cart_inventory_reservations (showcase_product_id, status);
CREATE INDEX IF NOT EXISTS cart_inventory_reservations_order_status_idx
  ON cart_inventory_reservations (order_id, status);

CREATE OR REPLACE FUNCTION finalize_cart_inventory_reservations()
RETURNS TRIGGER AS $$
DECLARE allocation RECORD;
BEGIN
  IF NEW.payment_status IN ('paid', 'confirmed')
     AND (TG_OP = 'INSERT'
          OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
             AND OLD.payment_status NOT IN ('paid', 'confirmed')) THEN
    IF EXISTS (
      SELECT 1 FROM cart_inventory_reservations WHERE order_id = NEW.id
    ) AND NOT EXISTS (
      SELECT 1 FROM cart_inventory_reservations
      WHERE order_id = NEW.id AND status IN ('pending', 'finalized')
    ) THEN
      RAISE EXCEPTION 'Inventory reservation for order % is no longer valid', NEW.id;
    END IF;
    FOR allocation IN
      SELECT showcase_product_id, SUM(quantity)::int AS quantity
      FROM cart_inventory_reservations
      WHERE order_id = NEW.id AND status = 'pending'
      GROUP BY showcase_product_id
      ORDER BY showcase_product_id
    LOOP
      UPDATE showcase_products
      SET stock_quantity = stock_quantity - allocation.quantity, updated_at = NOW()
      WHERE id = allocation.showcase_product_id
        AND stock_quantity >= allocation.quantity;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserved batch % has insufficient physical stock',
          allocation.showcase_product_id;
      END IF;
    END LOOP;
    UPDATE cart_inventory_reservations
    SET status = 'finalized', finalized_at = NOW(), updated_at = NOW()
    WHERE order_id = NEW.id AND status = 'pending';
  ELSIF NEW.payment_status NOT IN ('paid', 'confirmed')
     AND (NEW.payment_status IN ('failed', 'cancelled', 'canceled', 'expired')
         OR NEW.status IN ('cancelled', 'canceled', 'deleted'))
     AND (TG_OP = 'INSERT'
          OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
          OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE cart_inventory_reservations
    SET status = 'released', released_at = NOW(), updated_at = NOW()
    WHERE order_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cart_inventory_reservations_payment_trigger ON customer_orders;
DROP TRIGGER IF EXISTS customer_orders_cart_inventory_reservations_trg ON customer_orders;
DROP FUNCTION IF EXISTS finalize_or_release_cart_inventory_reservations();
CREATE TRIGGER cart_inventory_reservations_payment_trigger
AFTER INSERT OR UPDATE OF payment_status, status ON customer_orders
FOR EACH ROW EXECUTE FUNCTION finalize_cart_inventory_reservations();