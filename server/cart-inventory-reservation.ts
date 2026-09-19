import { pool } from "./db";

export type CartSnapshot = Record<string, number> | Array<{ productId: number; quantity: number }>;

export class InsufficientCartInventoryError extends Error {
  readonly productId: number;
  readonly requested: number;
  readonly available: number;

  constructor(productId: number, requested: number, available: number) {
    super(`Insufficient inventory for product ${productId}: requested ${requested}, available ${available}`);
    this.name = "InsufficientCartInventoryError";
    this.productId = productId;
    this.requested = requested;
    this.available = available;
  }
}

let schemaReady: Promise<void> | null = null;

export function ownerKeyForRequest(sessionId: string, customerId?: number | null): string {
  // Keep the owner stable when a guest signs in during checkout. The opaque,
  // server-issued session id is safer than a client id and prevents duplicate
  // guest + customer reservations for the same browser cart.
  return `session:${sessionId}`;
}

export async function ensureCartReservationSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(`
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
        ALTER TABLE cart_inventory_reservations
          DROP CONSTRAINT IF EXISTS cart_inventory_reservations_status_check;
        ALTER TABLE cart_inventory_reservations
          ADD CONSTRAINT cart_inventory_reservations_status_check
          CHECK (status IN ('active', 'pending', 'finalized', 'released', 'restored'));
        CREATE INDEX IF NOT EXISTS cart_inventory_reservations_owner_status_idx
          ON cart_inventory_reservations (owner_key, status);
        CREATE INDEX IF NOT EXISTS cart_inventory_reservations_batch_status_idx
          ON cart_inventory_reservations (showcase_product_id, status);
        CREATE INDEX IF NOT EXISTS cart_inventory_reservations_order_status_idx
          ON cart_inventory_reservations (order_id, status);
        CREATE OR REPLACE FUNCTION finalize_cart_inventory_reservations()
        RETURNS TRIGGER AS $$
        BEGIN
          IF (NEW.payment_status IN ('failed', 'cancelled', 'canceled', 'expired')
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
      `);
    })().catch(error => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function normalizeCart(cart: CartSnapshot): Map<number, number> {
  const result = new Map<number, number>();
  const entries = Array.isArray(cart)
    ? cart.map(item => [item.productId, item.quantity] as const)
    : Object.entries(cart || {}).map(([id, quantity]) => [Number(id), Number(quantity)] as const);
  for (const [productId, quantity] of entries) {
    const id = Number(productId);
    const amount = Math.floor(Number(quantity));
    if (Number.isInteger(id) && id > 0 && amount > 0) {
      result.set(id, (result.get(id) || 0) + amount);
    }
  }
  return result;
}

type OwnerOptions = {
  ownerKey: string;
  sessionId?: string | null;
  customerId?: number | null;
  expiresAt?: Date;
};

export function reservationExpiryForPayment(paymentMethod?: string | null): Date {
  const hours = paymentMethod === "bank_transfer_grace" ||
    paymentMethod === "واریز بانکی با مهلت 3 روزه" ? 73 : 25;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export async function reconcileCartReservations(options: OwnerOptions & {
  cart: CartSnapshot;
}) {
  await ensureCartReservationSchema();
  const client = await pool.connect();
  const desired = normalizeCart(options.cart);
  const expiresAt = options.expiresAt || new Date(Date.now() + 2 * 60 * 60 * 1000);

  try {
    await client.query("BEGIN");
    // Reservations do not mutate the batch row, so a row lock alone can use a
    // stale statement snapshot after waiting. Serialize allocation decisions
    // to guarantee that two owners cannot reserve the same free units.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('cart-inventory-allocation'::text))",
    );
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1::text))", [options.ownerKey]);
    await client.query(`
      UPDATE cart_inventory_reservations
      SET status = 'released', released_at = NOW(), updated_at = NOW()
      WHERE owner_key = $1 AND status = 'active' AND expires_at <= NOW()
    `, [options.ownerKey]);

    const currentResult = await client.query(`
      SELECT shop_product_id, showcase_product_id, quantity
      FROM cart_inventory_reservations
      WHERE owner_key = $1 AND status = 'active'
      ORDER BY id
      FOR UPDATE
    `, [options.ownerKey]);
    const currentByProduct = new Map<number, Array<{ batchId: number; quantity: number }>>();
    for (const row of currentResult.rows) {
      const list = currentByProduct.get(Number(row.shop_product_id)) || [];
      list.push({ batchId: Number(row.showcase_product_id), quantity: Number(row.quantity) });
      currentByProduct.set(Number(row.shop_product_id), list);
    }

    const allProductIds = new Set([...currentByProduct.keys(), ...desired.keys()]);
    for (const productId of allProductIds) {
      const wanted = desired.get(productId) || 0;
      const allocations = currentByProduct.get(productId) || [];
      const current = allocations.reduce((sum, row) => sum + row.quantity, 0);

      if (wanted < current) {
        let toRelease = current - wanted;
        for (const allocation of [...allocations].reverse()) {
          if (toRelease <= 0) break;
          const released = Math.min(toRelease, allocation.quantity);
          const remaining = allocation.quantity - released;
          if (remaining > 0) {
            await client.query(`
              UPDATE cart_inventory_reservations
              SET quantity = $1, expires_at = $2, updated_at = NOW()
              WHERE owner_key = $3 AND shop_product_id = $4
                AND showcase_product_id = $5 AND status = 'active'
            `, [remaining, expiresAt, options.ownerKey, productId, allocation.batchId]);
          } else {
            await client.query(`
              UPDATE cart_inventory_reservations
              SET status = 'released', released_at = NOW(), updated_at = NOW()
              WHERE owner_key = $1 AND shop_product_id = $2
                AND showcase_product_id = $3 AND status = 'active'
            `, [options.ownerKey, productId, allocation.batchId]);
          }
          allocation.quantity = remaining;
          toRelease -= released;
        }
      } else if (wanted > current) {
        const additional = wanted - current;
        const productResult = await client.query(`
          SELECT id, name, barcode, stock_quantity, created_at
          FROM shop_products
          WHERE id = $1 AND is_active = true
          FOR UPDATE
        `, [productId]);
        if (productResult.rows.length === 0) {
          throw new InsufficientCartInventoryError(productId, wanted, current);
        }
        const shopProduct = productResult.rows[0];
        const matchColumn = shopProduct.barcode
          ? "sp.barcode = $1"
          : "LOWER(TRIM(sp.name)) = LOWER(TRIM($1::text))";
        const matchValue = shopProduct.barcode || shopProduct.name;
        const batchesResult = await client.query(`
          SELECT sp.id, sp.stock_quantity,
            COALESCE((
              SELECT SUM(cir.quantity)::int
              FROM cart_inventory_reservations cir
              WHERE cir.showcase_product_id = sp.id
                AND (
                  cir.status = 'pending'
                  OR (cir.status = 'active' AND cir.expires_at > NOW())
                )
                AND cir.owner_key <> $2
            ), 0)::int AS reserved_quantity
          FROM showcase_products sp
          WHERE sp.is_active = true AND ${matchColumn}
          ORDER BY sp.created_at ASC, sp.id ASC
          FOR UPDATE
        `, [matchValue, options.ownerKey]);

        let available = 0;
        const candidates = batchesResult.rows.map(row => {
          const own = allocations.find(item => item.batchId === Number(row.id))?.quantity || 0;
          const free = Math.max(
            0,
            Number(row.stock_quantity) - Number(row.reserved_quantity) - own,
          );
          available += free;
          return { id: Number(row.id), free };
        });
        if (available < additional) {
          throw new InsufficientCartInventoryError(productId, wanted, current + available);
        }
        let remaining = additional;
        for (const candidate of candidates) {
          if (remaining <= 0) break;
          const amount = Math.min(remaining, candidate.free);
          if (amount <= 0) continue;
          const existing = allocations.find(item => item.batchId === candidate.id);
          if (existing) {
            await client.query(`
              UPDATE cart_inventory_reservations
              SET quantity = quantity + $1, expires_at = $2, updated_at = NOW()
              WHERE owner_key = $3 AND shop_product_id = $4
                AND showcase_product_id = $5 AND status = 'active'
            `, [amount, expiresAt, options.ownerKey, productId, candidate.id]);
          } else {
            await client.query(`
              INSERT INTO cart_inventory_reservations
                (owner_key, session_id, customer_id, shop_product_id, showcase_product_id, quantity, status, expires_at)
              VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
            `, [options.ownerKey, options.sessionId || null, options.customerId || null,
              productId, candidate.id, amount, expiresAt]);
          }
          remaining -= amount;
        }
      } else if (current > 0) {
        await client.query(`
          UPDATE cart_inventory_reservations
          SET expires_at = $1, updated_at = NOW()
          WHERE owner_key = $2 AND shop_product_id = $3 AND status = 'active'
        `, [expiresAt, options.ownerKey, productId]);
      }
    }

    const availability = await getAvailabilityInTransaction(client, [...allProductIds]);
    await client.query("COMMIT");
    return {
      acceptedCart: Object.fromEntries(desired),
      availability,
      expiresAt
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getAvailabilityInTransaction(client: any, productIds: number[]) {
  if (productIds.length === 0) return {};
  const result = await client.query(`
    SELECT sp.id AS shop_product_id,
      GREATEST(0, COALESCE(SUM(b.stock_quantity), 0) - COALESCE(SUM(r.reserved_quantity), 0))::int AS available
    FROM shop_products sp
    LEFT JOIN showcase_products b
      ON b.is_active = true AND (
        (NULLIF(sp.barcode, '') IS NOT NULL AND b.barcode = sp.barcode)
        OR (NULLIF(sp.barcode, '') IS NULL AND LOWER(TRIM(b.name)) = LOWER(TRIM(sp.name)))
      )
    LEFT JOIN (
      SELECT showcase_product_id, SUM(quantity)::int AS reserved_quantity
      FROM cart_inventory_reservations
       WHERE status = 'pending'
          OR (status = 'active' AND expires_at > NOW())
      GROUP BY showcase_product_id
    ) r ON r.showcase_product_id = b.id
    WHERE sp.id = ANY($1::int[])
    GROUP BY sp.id
  `, [productIds]);
  return Object.fromEntries(result.rows.map((row: any) => [row.shop_product_id, Number(row.available)]));
}

export async function getAvailableQuantities(productIds: number[]) {
  await ensureCartReservationSchema();
  const client = await pool.connect();
  try {
    return await getAvailabilityInTransaction(client, productIds);
  } finally {
    client.release();
  }
}

export async function getOwnerReservationQuantities(ownerKey: string) {
  await ensureCartReservationSchema();
  const result = await pool.query(`
    SELECT shop_product_id, SUM(quantity)::int AS quantity
    FROM cart_inventory_reservations
    WHERE owner_key = $1 AND status = 'active' AND expires_at > NOW()
    GROUP BY shop_product_id
  `, [ownerKey]);
  return Object.fromEntries(result.rows.map(row => [row.shop_product_id, Number(row.quantity)]));
}

export async function releaseOwnerReservations(ownerKey: string) {
  await ensureCartReservationSchema();
  await pool.query(`
    UPDATE cart_inventory_reservations
    SET status = 'released', released_at = NOW(), updated_at = NOW()
    WHERE owner_key = $1 AND status = 'active'
  `, [ownerKey]);
}

export async function attachOwnerReservationsToOrder(
  ownerKey: string,
  orderId: number,
  productIds?: number[],
  expiresAt?: Date,
) {
  await ensureCartReservationSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1::text))", [ownerKey]);
    await client.query(`
      UPDATE cart_inventory_reservations
      SET status = 'pending', order_id = $1,
          expires_at = COALESCE($4, expires_at), updated_at = NOW()
      WHERE owner_key = $2 AND status = 'active'
        AND ($3::int[] IS NULL OR shop_product_id = ANY($3::int[]))
      RETURNING shop_product_id, quantity
    `, [orderId, ownerKey, productIds?.length ? productIds : null, expiresAt || null]);
    const attached = await client.query(`
      SELECT shop_product_id, SUM(quantity)::int AS quantity
      FROM cart_inventory_reservations
      WHERE order_id = $1 AND status = 'pending'
      GROUP BY shop_product_id
    `, [orderId]);
    await client.query("COMMIT");
    return Object.fromEntries(
      attached.rows.map(row => [Number(row.shop_product_id), Number(row.quantity)]),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function finalizeOrderReservations(orderId: number) {
  await ensureCartReservationSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const rows = await client.query(`
      SELECT id, showcase_product_id, shop_product_id, quantity
      FROM cart_inventory_reservations
      WHERE order_id = $1 AND status = 'pending'
      ORDER BY showcase_product_id, id
      FOR UPDATE
    `, [orderId]);
    for (const row of rows.rows) {
      const updated = await client.query(`
        UPDATE showcase_products
        SET stock_quantity = stock_quantity - $1, updated_at = NOW()
        WHERE id = $2 AND stock_quantity >= $1
        RETURNING id
      `, [Number(row.quantity), Number(row.showcase_product_id)]);
      if (updated.rows.length === 0) {
        throw new Error(`Reserved batch ${row.showcase_product_id} no longer has sufficient physical stock`);
      }
    }
    await client.query(`
      UPDATE cart_inventory_reservations
      SET status = 'finalized', finalized_at = NOW(), updated_at = NOW()
      WHERE order_id = $1 AND status = 'pending'
    `, [orderId]);
    const shopProductIds = [...new Set(rows.rows.map(row => Number(row.shop_product_id)))];
    for (const shopProductId of shopProductIds) {
      await client.query(`
        UPDATE shop_products shop
        SET stock_quantity = totals.total_stock,
            in_stock = totals.total_stock > 0 OR COALESCE(shop.show_when_out_of_stock, false),
            updated_at = NOW()
        FROM (
          SELECT COALESCE(SUM(showcase.stock_quantity), 0)::int AS total_stock
          FROM showcase_products showcase
          WHERE showcase.barcode = (
            SELECT barcode FROM shop_products WHERE id = $1
          )
        ) totals
        WHERE shop.id = $1
      `, [shopProductId]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function releaseOrderReservations(orderId: number) {
  await ensureCartReservationSchema();
  const result = await pool.query(`
    UPDATE cart_inventory_reservations
    SET status = 'released', released_at = NOW(), updated_at = NOW()
    WHERE order_id = $1 AND status = 'pending'
    RETURNING id
  `, [orderId]);
  return result.rowCount || 0;
}

export async function restoreRejectedOrderInventory(orderId: number) {
  await ensureCartReservationSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const reservations = await client.query<{
      showcase_product_id: number;
      shop_product_id: number;
      quantity: number;
      status: string;
    }>(`
      SELECT showcase_product_id, shop_product_id, quantity, status
      FROM cart_inventory_reservations
      WHERE order_id = $1 AND status IN ('pending', 'finalized')
      ORDER BY showcase_product_id, id
      FOR UPDATE
    `, [orderId]);

    const restoredByBatch = new Map<number, number>();
    const shopProductIds = new Set<number>();
    for (const reservation of reservations.rows) {
      shopProductIds.add(Number(reservation.shop_product_id));
      if (reservation.status !== "finalized") continue;
      const batchId = Number(reservation.showcase_product_id);
      restoredByBatch.set(
        batchId,
        (restoredByBatch.get(batchId) || 0) + Number(reservation.quantity),
      );
    }

    for (const [batchId, quantity] of restoredByBatch) {
      await client.query(`
        UPDATE showcase_products
        SET stock_quantity = stock_quantity + $1, updated_at = NOW()
        WHERE id = $2
      `, [quantity, batchId]);
    }

    await client.query(`
      UPDATE cart_inventory_reservations
      SET status = CASE WHEN status = 'finalized' THEN 'restored' ELSE 'released' END,
          released_at = NOW(),
          updated_at = NOW()
      WHERE order_id = $1 AND status IN ('pending', 'finalized')
    `, [orderId]);

    for (const shopProductId of shopProductIds) {
      await client.query(`
        UPDATE shop_products shop
        SET stock_quantity = totals.total_stock,
            in_stock = totals.total_stock > 0 OR COALESCE(shop.show_when_out_of_stock, false),
            updated_at = NOW()
        FROM (
          SELECT COALESCE(SUM(showcase.stock_quantity), 0)::int AS total_stock
          FROM showcase_products showcase
          WHERE showcase.barcode = (
            SELECT barcode FROM shop_products WHERE id = $1
          )
        ) totals
        WHERE shop.id = $1
      `, [shopProductId]);
    }

    await client.query("COMMIT");
    return {
      restoredQuantity: Array.from(restoredByBatch.values()).reduce((sum, quantity) => sum + quantity, 0),
      restoredBatches: restoredByBatch.size,
      releasedPendingReservations: reservations.rows.filter(row => row.status === "pending").length,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function orderHasReservations(orderId: number): Promise<boolean> {
  await ensureCartReservationSchema();
  const result = await pool.query(
    `SELECT 1 FROM cart_inventory_reservations WHERE order_id = $1 LIMIT 1`,
    [orderId],
  );
  return (result.rowCount || 0) > 0;
}

export async function releaseExpiredReservations() {
  await ensureCartReservationSchema();
  const result = await pool.query(`
    UPDATE cart_inventory_reservations
    SET status = 'released', released_at = NOW(), updated_at = NOW()
    WHERE status IN ('active', 'pending') AND expires_at <= NOW()
    RETURNING id
  `);
  return result.rowCount || 0;
}