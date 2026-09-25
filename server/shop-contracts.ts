import type { Express, Request, Response, NextFunction } from "express";
import { pool } from "./db";

const HOLD_TTL_MINUTES = 5;

export type ContractCart = Record<number | string, number> | Map<number, number>;
export type ContractPricingItem = {
  unitPrice: number;
  maxQuantity: number;
  remainingQuantity: number;
};
export type LoadedContractPricing = {
  id: number;
  number: string;
  items: Map<number, ContractPricingItem>;
};
export type ContractDefinition = {
  number: string;
  customerId: number;
  terms: string;
  isActive: boolean;
  items: Array<{ productId: number; maxQuantity: number; unitPrice: number }>;
};

class ContractError extends Error {
  constructor(message: string, readonly statusCode = 400) {
    super(message);
  }
}

function parsePositiveId(value: unknown, label: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ContractError(`${label} must be a positive integer.`);
  return id;
}

/** Shared strict payload validation used by both contract mutation endpoints. */
export function validateContractDefinition(body: any): ContractDefinition {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ContractError("A contract body is required.");
  }
  if (typeof body.number !== "string" || !body.number.trim()) {
    throw new ContractError("Contract number is required.");
  }
  if (typeof body.terms !== "string") throw new ContractError("Contract terms must be text.");
  if (typeof body.isActive !== "boolean") throw new ContractError("isActive must be a boolean.");
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new ContractError("At least one contract product is required.");
  }
  const seen = new Set<number>();
  const items = body.items.map((item: any) => {
    const productId = parsePositiveId(item?.productId, "productId");
    const maxQuantity = Number(item?.maxQuantity);
    const unitPrice = Number(item?.unitPrice);
    if (!Number.isSafeInteger(maxQuantity) || maxQuantity <= 0) {
      throw new ContractError("Every product maxQuantity must be a positive integer.");
    }
    if (!Number.isSafeInteger(unitPrice) || unitPrice < 0) {
      throw new ContractError("Every unitPrice must be a nonnegative integer IQD amount.");
    }
    if (seen.has(productId)) throw new ContractError(`Product ${productId} is duplicated.`);
    seen.add(productId);
    return { productId, maxQuantity, unitPrice };
  });
  return {
    number: body.number.trim(),
    customerId: parsePositiveId(body.customerId, "customerId"),
    terms: body.terms,
    isActive: body.isActive,
    items,
  };
}

function rowsFromCart(cart: ContractCart): Array<[number, number]> {
  const entries = cart instanceof Map
    ? [...cart.entries()]
    : Object.entries(cart || {}).map(([id, quantity]) => [Number(id), quantity] as [number, number]);
  if (entries.length === 0) throw new ContractError("A non-empty contract cart is required.");
  const seen = new Set<number>();
  return entries.map(([rawId, rawQuantity]) => {
    const productId = parsePositiveId(rawId, "productId");
    const quantity = Number(rawQuantity);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new ContractError("Every cart quantity must be a positive integer.");
    }
    if (seen.has(productId)) throw new ContractError(`Product ${productId} is duplicated in the cart.`);
    seen.add(productId);
    return [productId, quantity];
  });
}

function expectedPrice(
  prices: Map<number, number> | Record<number | string, number>,
  productId: number,
): number | undefined {
  return prices instanceof Map ? prices.get(productId) : prices?.[productId];
}

async function inTransaction<T>(callback: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function releaseHoldWithinTransaction(client: import("pg").PoolClient, holdId: string): Promise<void> {
  const hold = await client.query(
    `UPDATE shop_contract_holds
        SET status = 'released', updated_at = now()
      WHERE id = $1 AND status <> 'released'
      RETURNING contract_id`,
    [holdId],
  );
  if (!hold.rowCount) return;
  const allocations = await client.query(
    `SELECT product_id, sum(quantity)::integer AS quantity
       FROM shop_contract_hold_items WHERE hold_id = $1 GROUP BY product_id`,
    [holdId],
  );
  for (const allocation of allocations.rows) {
    const updated = await client.query(
      `UPDATE shop_contract_items
          SET used_quantity = used_quantity - $3
        WHERE contract_id = $1 AND product_id = $2 AND used_quantity >= $3`,
      [hold.rows[0].contract_id, allocation.product_id, allocation.quantity],
    );
    if (updated.rowCount !== 1) throw new Error("Contract allocation counter is inconsistent.");
  }
}

// Reconcile from order state on every contract read/claim. Database schema
// publishing does not necessarily install SQL triggers, so they are not the
// only mechanism for returning cancelled/failed units to the contract.
async function reconcileContractHolds(client: import("pg").PoolClient): Promise<void> {
  const stale = await client.query(
    `SELECT h.id FROM shop_contract_holds h
      LEFT JOIN customer_orders o ON o.id = h.order_id
      WHERE (h.status = 'active' AND h.order_id IS NULL AND h.expires_at <= now())
         OR (h.status = 'attached' AND
             (o.id IS NULL OR o.status IN ('cancelled', 'deleted')
               OR o.payment_status IN ('failed', 'cancelled')))
      FOR UPDATE OF h`,
  );
  for (const row of stale.rows) await releaseHoldWithinTransaction(client, row.id);
}

async function reconcileShopContractHolds(): Promise<void> {
  await inTransaction(reconcileContractHolds);
}

function contractResponse(row: any, itemRows: any[]) {
  return {
    id: Number(row.id),
    number: row.number,
    terms: row.terms,
    isActive: row.is_active,
    customerId: Number(row.customer_id),
    customerName: row.customer_name,
    items: itemRows.map((item) => ({
      productId: Number(item.product_id),
      productName: item.product_name,
      maxQuantity: Number(item.max_quantity),
      usedQuantity: Number(item.used_quantity),
      remainingQuantity: Math.max(0, Number(item.max_quantity) - Number(item.used_quantity)),
      unitPrice: Number(item.unit_price),
    })),
  };
}

async function loadContractRows(client: import("pg").PoolClient, contractId?: number) {
  const contracts = await client.query(
    `SELECT c.id, c.number, c.terms, c.is_active, c.customer_id,
            COALESCE(NULLIF(concat_ws(' ', cc.first_name, cc.last_name), ''), cc.company, '') AS customer_name
       FROM shop_contracts c
       JOIN crm_customers cc ON cc.id = c.customer_id
      ${contractId === undefined ? "" : "WHERE c.id = $1"}
      ORDER BY c.id DESC`,
    contractId === undefined ? [] : [contractId],
  );
  if (contracts.rows.length === 0) return [];
  const ids = contracts.rows.map((row: any) => Number(row.id));
  const items = await client.query(
    `SELECT ci.contract_id, ci.product_id, sp.name AS product_name,
            ci.max_quantity, ci.used_quantity, ci.unit_price
       FROM shop_contract_items ci
       JOIN shop_products sp ON sp.id = ci.product_id
      WHERE ci.contract_id = ANY($1::integer[])
      ORDER BY ci.id`,
    [ids],
  );
  return contracts.rows.map((row: any) =>
    contractResponse(row, items.rows.filter((item: any) => Number(item.contract_id) === Number(row.id))),
  );
}

async function ensureCustomerAndProducts(client: import("pg").PoolClient, definition: ContractDefinition) {
  const customer = await client.query("SELECT id FROM crm_customers WHERE id = $1", [definition.customerId]);
  if (!customer.rowCount) throw new ContractError("The selected CRM customer does not exist.");
  const products = await client.query(
    `SELECT id FROM shop_products
      WHERE id = ANY($1::integer[]) AND is_active = true AND visible_in_shop = true`,
    [definition.items.map((item) => item.productId)],
  );
  const found = new Set(products.rows.map((row: any) => Number(row.id)));
  const invalid = definition.items.find((item) => !found.has(item.productId));
  if (invalid) throw new ContractError(`Product ${invalid.productId} does not exist or is not active in the shop.`);
}

async function saveContract(definition: ContractDefinition, contractId?: number): Promise<any> {
  return inTransaction(async (client) => {
    await reconcileContractHolds(client);
    await ensureCustomerAndProducts(client, definition);
    if (contractId === undefined) {
      const result = await client.query(
        `INSERT INTO shop_contracts (number, customer_id, terms, is_active)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [definition.number, definition.customerId, definition.terms, definition.isActive],
      );
      const id = Number(result.rows[0].id);
      for (const item of definition.items) {
        await client.query(
          `INSERT INTO shop_contract_items (contract_id, product_id, max_quantity, unit_price)
           VALUES ($1, $2, $3, $4)`,
          [id, item.productId, item.maxQuantity, item.unitPrice],
        );
      }
      return (await loadContractRows(client, id))[0];
    }

    const locked = await client.query(
      "SELECT id, customer_id FROM shop_contracts WHERE id = $1 FOR UPDATE",
      [contractId],
    );
    if (!locked.rowCount) throw new ContractError("Contract not found.", 404);
    const currentItems = await client.query(
      `SELECT product_id, used_quantity FROM shop_contract_items
        WHERE contract_id = $1 FOR UPDATE`,
      [contractId],
    );
    const usageByProduct = new Map<number, number>(
      currentItems.rows.map((row: any) => [Number(row.product_id), Number(row.used_quantity)]),
    );
    const totalUsage = [...usageByProduct.values()].reduce((sum, quantity) => sum + quantity, 0);
    if (totalUsage > 0 && Number(locked.rows[0].customer_id) !== definition.customerId) {
      throw new ContractError("Customer cannot be changed after contract units have been used.");
    }
    for (const item of definition.items) {
      if ((usageByProduct.get(item.productId) || 0) > item.maxQuantity) {
        throw new ContractError(`Product ${item.productId} cap cannot be lower than its used quantity.`);
      }
    }
    for (const [productId, usedQuantity] of usageByProduct) {
      if (usedQuantity > 0 && !definition.items.some((item) => item.productId === productId)) {
        throw new ContractError(`Product ${productId} cannot be removed while units have been used.`);
      }
    }
    await client.query(
      `UPDATE shop_contracts SET number = $2, customer_id = $3, terms = $4,
       is_active = $5, updated_at = now() WHERE id = $1`,
      [contractId, definition.number, definition.customerId, definition.terms, definition.isActive],
    );
    const retained = definition.items.map((item) => item.productId);
    await client.query(
      `DELETE FROM shop_contract_items WHERE contract_id = $1
       AND NOT (product_id = ANY($2::integer[])) AND used_quantity = 0`,
      [contractId, retained],
    );
    for (const item of definition.items) {
      await client.query(
        `INSERT INTO shop_contract_items (contract_id, product_id, max_quantity, used_quantity, unit_price)
         VALUES ($1, $2, $3, 0, $4)
         ON CONFLICT (contract_id, product_id) DO UPDATE
           SET max_quantity = EXCLUDED.max_quantity, unit_price = EXCLUDED.unit_price`,
        [contractId, item.productId, item.maxQuantity, item.unitPrice],
      );
    }
    return (await loadContractRows(client, contractId))[0];
  });
}

function errorResponse(res: Response, error: unknown) {
  if (error instanceof ContractError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  const code = (error as any)?.code;
  if (code === "23505") return res.status(409).json({ success: false, message: "Contract number is already in use." });
  if (code === "23503") return res.status(400).json({ success: false, message: "Contract references a missing customer, product, or order." });
  console.error("Shop contract request failed:", error);
  return res.status(500).json({ success: false, message: "Unable to process the shop contract request." });
}

async function requireShopManagement(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  const adminId = session?.adminId;
  const customUserId = session?.customUserId;
  if (!session?.isAuthenticated || Boolean(adminId) === Boolean(customUserId)) {
    return res.status(401).json({ success: false, message: "Admin authentication required." });
  }
  try {
    let authorized = false;
    if (customUserId) {
      const result = await pool.query(
        `SELECT cr.name, cr.permissions
           FROM custom_users cu JOIN custom_roles cr ON cr.id = cu.role_id
          WHERE cu.id = $1 AND cu.is_active = true AND cr.is_active = true`,
        [customUserId],
      );
      const role = String(result.rows[0]?.name || "").toLowerCase().replace(/[\s-]+/g, "_");
      const permissions: string[] = result.rows[0]?.permissions || [];
      authorized = ["super_admin", "supper_admin", "superadmin"].includes(role) || permissions.includes("shop_management");
    } else {
      const result = await pool.query(
        `SELECT ar.name AS role_name,
                EXISTS (
                  SELECT 1 FROM role_permissions rp
                  JOIN admin_permissions ap ON ap.id = rp.permission_id
                  WHERE rp.role_id = ar.id AND ap.is_active = true
                    AND (ap.name = 'shop_management' OR ap.module = 'shop_management')
                ) AS can_manage_shop
           FROM users u JOIN admin_roles ar ON ar.id = u.role_id
          WHERE u.id = $1 AND u.is_active = true AND ar.is_active = true`,
        [adminId],
      );
      const role = String(result.rows[0]?.role_name || "").toLowerCase().replace(/[\s-]+/g, "_");
      authorized = ["super_admin", "supper_admin", "superadmin"].includes(role) || result.rows[0]?.can_manage_shop === true;
    }
    if (!authorized) return res.status(403).json({ success: false, message: "Shop management permission required." });
    next();
  } catch (error) {
    console.error("Shop contract authorization failed:", error);
    res.status(500).json({ success: false, message: "Unable to verify admin permissions." });
  }
}

function crmCustomerIdFromRequest(req: Request): number | null {
  const session = req.session as any;
  const candidate = session?.crmCustomerId ?? session?.customerId;
  const id = Number(candidate);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function registerShopContractRoutes(app: Express): void {
  app.get("/api/shop/contracts/mine", async (req, res) => {
    const customerId = crmCustomerIdFromRequest(req);
    if (!customerId) return res.status(401).json({ success: false, message: "Customer authentication required." });
    try {
      await reconcileShopContractHolds();
      const result = await pool.query(
        `SELECT c.id, c.number, c.terms, c.is_active, c.customer_id,
                COALESCE(NULLIF(concat_ws(' ', cc.first_name, cc.last_name), ''), cc.company, '') AS customer_name
           FROM shop_contracts c JOIN crm_customers cc ON cc.id = c.customer_id
          WHERE c.customer_id = $1 ORDER BY c.id DESC`,
        [customerId],
      );
      const ids = result.rows.map((row: any) => Number(row.id));
      const itemRows = ids.length ? await pool.query(
        `SELECT ci.contract_id, ci.product_id, sp.name AS product_name,
                ci.max_quantity, ci.used_quantity, ci.unit_price
           FROM shop_contract_items ci JOIN shop_products sp ON sp.id = ci.product_id
          WHERE ci.contract_id = ANY($1::integer[]) ORDER BY ci.id`,
        [ids],
      ) : { rows: [] };
      return res.json({
        success: true,
        contracts: result.rows.map((row: any) => contractResponse(
          row, itemRows.rows.filter((item: any) => Number(item.contract_id) === Number(row.id)),
        )),
      });
    } catch (error) {
      return errorResponse(res, error);
    }
  });

  app.get("/api/admin/shop/contracts", requireShopManagement, async (_req, res) => {
    try {
      await reconcileShopContractHolds();
      const contracts = await inTransaction((client) => loadContractRows(client));
      res.json({ success: true, contracts });
    } catch (error) {
      errorResponse(res, error);
    }
  });

  app.get("/api/admin/shop/contracts/:id", requireShopManagement, async (req, res) => {
    try {
      const id = parsePositiveId(req.params.id, "Contract id");
      await reconcileShopContractHolds();
      const contracts = await inTransaction((client) => loadContractRows(client, id));
      if (!contracts.length) return res.status(404).json({ success: false, message: "Contract not found." });
      res.json({ success: true, contract: contracts[0] });
    } catch (error) {
      errorResponse(res, error);
    }
  });

  app.post("/api/admin/shop/contracts", requireShopManagement, async (req, res) => {
    try {
      const contract = await saveContract(validateContractDefinition(req.body));
      res.status(201).json({ success: true, contract });
    } catch (error) {
      errorResponse(res, error);
    }
  });

  app.put("/api/admin/shop/contracts/:id", requireShopManagement, async (req, res) => {
    try {
      const id = parsePositiveId(req.params.id, "Contract id");
      const contract = await saveContract(validateContractDefinition(req.body), id);
      res.json({ success: true, contract });
    } catch (error) {
      errorResponse(res, error);
    }
  });
}

export async function loadContractPricing(
  contractId: number,
  customerId: number,
  cart: ContractCart,
): Promise<LoadedContractPricing> {
  const requested = rowsFromCart(cart);
  return inTransaction(async (client) => {
    await reconcileContractHolds(client);
    const contractResult = await client.query(
      `SELECT id, number FROM shop_contracts
        WHERE id = $1 AND customer_id = $2 AND is_active = true`,
      [parsePositiveId(contractId, "Contract id"), parsePositiveId(customerId, "Customer id")],
    );
    if (!contractResult.rowCount) throw new ContractError("Active contract not found for this customer.", 404);
    const result = await client.query(
      `SELECT ci.product_id, ci.max_quantity, ci.used_quantity, ci.unit_price
         FROM shop_contract_items ci JOIN shop_products sp ON sp.id = ci.product_id
        WHERE ci.contract_id = $1 AND ci.product_id = ANY($2::integer[])
          AND sp.is_active = true AND sp.visible_in_shop = true`,
      [contractId, requested.map(([productId]) => productId)],
    );
    const byId = new Map<number, ContractPricingItem>(result.rows.map((row: any) => [
      Number(row.product_id),
      {
        unitPrice: Number(row.unit_price),
        maxQuantity: Number(row.max_quantity),
        remainingQuantity: Math.max(0, Number(row.max_quantity) - Number(row.used_quantity)),
      },
    ] as [number, ContractPricingItem]));
    for (const [productId, quantity] of requested) {
      const item = byId.get(productId);
      if (!item) throw new ContractError(`Product ${productId} is not available on this contract.`, 422);
      if (quantity > item.remainingQuantity) {
        throw new ContractError(`Product ${productId} exceeds its remaining contract quantity.`, 409);
      }
    }
    return { id: Number(contractResult.rows[0].id), number: contractResult.rows[0].number, items: byId };
  });
}

export async function claimContractCart(
  contractId: number,
  customerId: number,
  cart: ContractCart,
  expectedPriceById: Map<number, number> | Record<number | string, number>,
): Promise<string> {
  const requested = rowsFromCart(cart);
  return inTransaction(async (client) => {
    await reconcileContractHolds(client);
    const contract = await client.query(
      `SELECT id FROM shop_contracts
        WHERE id = $1 AND customer_id = $2 AND is_active = true FOR UPDATE`,
      [parsePositiveId(contractId, "Contract id"), parsePositiveId(customerId, "Customer id")],
    );
    if (!contract.rowCount) throw new ContractError("Active contract not found for this customer.", 404);
    const products = await client.query(
      `SELECT ci.product_id, ci.max_quantity, ci.used_quantity, ci.unit_price
         FROM shop_contract_items ci JOIN shop_products sp ON sp.id = ci.product_id
        WHERE ci.contract_id = $1 AND ci.product_id = ANY($2::integer[])
          AND sp.is_active = true AND sp.visible_in_shop = true
        FOR UPDATE OF ci`,
      [contractId, requested.map(([productId]) => productId)],
    );
    const byId = new Map<number, any>(products.rows.map((row: any) => [Number(row.product_id), row] as [number, any]));
    for (const [productId, quantity] of requested) {
      const row = byId.get(productId);
      if (!row) throw new ContractError(`Product ${productId} is not available on this contract.`, 422);
      const expected = Number(expectedPrice(expectedPriceById, productId));
      const contractPrice = Number(row.unit_price);
      if (!Number.isSafeInteger(expected) || expected !== contractPrice) {
        throw new ContractError(`Contract price changed for product ${productId}; refresh pricing.`, 409);
      }
      if (Number(row.used_quantity) + quantity > Number(row.max_quantity)) {
        throw new ContractError(`Product ${productId} exceeds its remaining contract quantity.`, 409);
      }
    }
    for (const [productId, quantity] of requested) {
      await client.query(
        `UPDATE shop_contract_items SET used_quantity = used_quantity + $3
          WHERE contract_id = $1 AND product_id = $2`,
        [contractId, productId, quantity],
      );
    }
    const hold = await client.query(
      `INSERT INTO shop_contract_holds
         (contract_id, customer_id, status, expires_at)
       VALUES ($1, $2, 'active', now() + ($3 * interval '1 minute'))
       RETURNING id`,
      [contractId, customerId, HOLD_TTL_MINUTES],
    );
    for (const [productId, quantity] of requested) {
      await client.query(
        "INSERT INTO shop_contract_hold_items (hold_id, product_id, quantity) VALUES ($1, $2, $3)",
        [hold.rows[0].id, productId, quantity],
      );
    }
    return hold.rows[0].id as string;
  });
}

export async function attachContractHold(holdId: string, orderId: number): Promise<void> {
  await inTransaction(async (client) => {
    const hold = await client.query(
      `SELECT id, contract_id, customer_id FROM shop_contract_holds
        WHERE id = $1 AND status = 'active' AND expires_at > now() FOR UPDATE`,
      [holdId],
    );
    if (!hold.rowCount) throw new ContractError("Contract hold is missing, expired, or already attached.", 409);
    const order = await client.query(
      `UPDATE customer_orders SET contract_id = $2, updated_at = now()
        WHERE id = $1 AND customer_id = $3
          AND status NOT IN ('cancelled', 'deleted')
          AND payment_status NOT IN ('failed', 'cancelled')
          AND (contract_id IS NULL OR contract_id = $2) RETURNING id`,
      [parsePositiveId(orderId, "Order id"), hold.rows[0].contract_id, hold.rows[0].customer_id],
    );
    if (!order.rowCount) throw new ContractError("Order not found or already belongs to another contract.", 404);
    await client.query(
      `UPDATE shop_contract_holds SET order_id = $2, status = 'attached',
        updated_at = now() WHERE id = $1`,
      [holdId, orderId],
    );
  });
}

export async function releaseContractHold(holdId: string): Promise<void> {
  await inTransaction((client) => releaseHoldWithinTransaction(client, holdId));
}