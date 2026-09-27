import type { Express, Request, Response, NextFunction } from "express";
import { pool } from "./db";
import { isIncotermCode, type IncotermCode } from "@shared/incoterms";
import {
  contractDraftLanguages,
  isValidIsoDate,
  shopContractDraftSchema,
  type ContractDraftLanguage,
  type ShopContractDraftData,
} from "@shared/contract-draft";
import { buildContractDraftText } from "@shared/contract-document";
import { registerSignedContractDocuments } from "./signed-contract-documents";

const HOLD_TTL_MINUTES = 5;

export type ContractCart = Record<number | string, number> | Map<number, number>;
export type ContractShippingMode = "automatic_vehicle" | "self_transport";
export type ContractPricingItem = {
  unitPrice: number;
  maxQuantity: number;
  remainingQuantity: number;
};
export type LoadedContractPricing = {
  id: number;
  number: string;
  shippingMode: ContractShippingMode | null;
  items: Map<number, ContractPricingItem>;
};
export type ContractDefinition = {
  number: string;
  customerId: number;
  terms: string;
  deliveryTerm: IncotermCode | null;
  shippingMode?: ContractShippingMode | null;
  isActive: boolean;
  items: Array<{ productId: number; maxQuantity: number; unitPrice: number }>;
  draftData?: ShopContractDraftData | null;
  refreshSeller?: boolean;
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

export type ContractSellerSnapshot = NonNullable<ShopContractDraftData["seller"]>;
export type ShopContractLanguage = ContractDraftLanguage;

/** Maps only the company profile used by /mrg/company-information. */
export function companyProfileToContractSeller(
  profile: Record<string, unknown> | null | undefined,
  language: ContractDraftLanguage,
): ContractSellerSnapshot {
  const optionalText = (value: unknown) => typeof value === "string" ? value.trim() : "";
  const profileValue = (camelCase: string, snakeCase: string) =>
    profile?.[camelCase] ?? profile?.[snakeCase];
  const companyName = language === "fa"
    ? profileValue("tradeName", "trade_name")
    : language === "ar"
      ? profileValue("companyNameAr", "company_name_ar")
      : language === "tr"
        ? profileValue("companyNameTr", "company_name_tr")
        : profileValue("companyNameEn", "company_name_en");
  const address = [
    optionalText(profileValue("mainAddress", "main_address")),
    optionalText(profileValue("city", "city")),
    optionalText(profileValue("country", "country")),
    optionalText(profileValue("postalCode", "postal_code")),
  ].filter(Boolean).join(", ");
  const contact = [
    optionalText(profileValue("phonePrimary", "phone_primary")),
    optionalText(profileValue("emailPrimary", "email_primary")),
    optionalText(profileValue("phoneSecondary", "phone_secondary")),
    optionalText(profileValue("emailSecondary", "email_secondary")),
    optionalText(profileValue("contactPersonPhone", "contact_person_phone")),
    optionalText(profileValue("contactPersonEmail", "contact_person_email")),
  ].filter((value, index, values) => Boolean(value) && values.indexOf(value) === index).join(" · ");
  const representative = [
    optionalText(profileValue("contactPersonName", "contact_person_name")),
    optionalText(profileValue("contactPersonTitle", "contact_person_title")),
  ].filter(Boolean).join(" — ");
  return {
    name: optionalText(companyName),
    registration: optionalText(profileValue("registrationNumber", "registration_number")),
    taxNumber: optionalText(profileValue("taxNumber", "tax_number")),
    address,
    representative,
    contact,
    country: optionalText(profileValue("country", "country")),
    city: optionalText(profileValue("city", "city")),
    postalCode: optionalText(profileValue("postalCode", "postal_code")),
    website: optionalText(profileValue("websiteUrl", "website_url")),
  };
}

async function loadContractSeller(
  client: import("pg").PoolClient,
  language: ContractDraftLanguage,
): Promise<ContractSellerSnapshot> {
  const result = await client.query(
    `SELECT trade_name, company_name_en, company_name_ar, company_name_tr,
            registration_number, tax_number, main_address, city, country, postal_code,
            phone_primary, phone_secondary, email_primary, email_secondary, website_url,
            contact_person_name, contact_person_title,
            contact_person_phone, contact_person_email
       FROM company_information ORDER BY id LIMIT 1`,
  );
  return companyProfileToContractSeller(result.rows[0], language);
}

function draftLanguage(draft: ShopContractDraftData): ContractDraftLanguage {
  return draft.language || "fa";
}

function draftWithSeller(draft: ShopContractDraftData, seller: ContractSellerSnapshot): ShopContractDraftData {
  return { ...draft, seller } as ShopContractDraftData;
}

export function applyAuthoritativeContractSeller(
  draft: ShopContractDraftData,
  profile: Record<string, unknown> | null | undefined,
  savedSeller?: ContractSellerSnapshot,
  refreshSeller = false,
): ShopContractDraftData {
  if (savedSeller && !refreshSeller) return draftWithSeller(draft, savedSeller);
  if (!profile) throw new ContractError("Company information is unavailable for the selected contract language.", 409);
  return draftWithSeller(draft, companyProfileToContractSeller(profile, draftLanguage(draft)));
}

/** Shared strict payload validation used by both contract mutation endpoints. */
export function validateContractDefinition(body: any, generatingNumber = false): ContractDefinition {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ContractError("A contract body is required.");
  }
  if (!generatingNumber && (typeof body.number !== "string" || !body.number.trim())) {
    throw new ContractError("Contract number is required.");
  }
  if (!isIncotermCode(body.deliveryTerm) && !(body.deliveryTerm === null && !generatingNumber)) {
    throw new ContractError("Select a valid Incoterms 2020 delivery term.");
  }
  const hasShippingMode = Object.prototype.hasOwnProperty.call(body, "shippingMode");
  if (generatingNumber && (!hasShippingMode || body.shippingMode === null)) {
    throw new ContractError("Choose a contract shipping mode.");
  }
  if (hasShippingMode && body.shippingMode !== null
    && body.shippingMode !== "automatic_vehicle" && body.shippingMode !== "self_transport") {
    throw new ContractError("Choose automatic vehicle or self transport.");
  }
  if (typeof body.isActive !== "boolean") throw new ContractError("isActive must be a boolean.");
  if (body.refreshSeller !== undefined && typeof body.refreshSeller !== "boolean") {
    throw new ContractError("refreshSeller must be a boolean.");
  }
  if (!Array.isArray(body.items) || (body.items.length === 0 && (generatingNumber || body.isActive))) {
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
  let draftData: ShopContractDraftData | null | undefined;
  if (Object.prototype.hasOwnProperty.call(body, "draftData")) {
    if (body.draftData === null) {
      draftData = null;
    } else {
      const parsedDraft = shopContractDraftSchema.safeParse(body.draftData);
      if (!parsedDraft.success) {
        throw new ContractError(`Invalid contract draft data: ${parsedDraft.error.issues[0]?.message || "Invalid draft."}`);
      }
      draftData = parsedDraft.data;
    }
  }
  const structuredDraft = draftData !== undefined && draftData !== null;
  if (!structuredDraft && typeof body.terms !== "string") {
    throw new ContractError("Contract terms must be text.");
  }
  return {
    number: generatingNumber ? "" : body.number.trim(),
    customerId: parsePositiveId(body.customerId, "customerId"),
    // Structured terms are always generated from validated fields and saved
    // commercial data inside the mutation transaction.
    terms: structuredDraft ? "" : body.terms,
    deliveryTerm: body.deliveryTerm as IncotermCode | null,
    ...(hasShippingMode ? { shippingMode: body.shippingMode as ContractShippingMode | null } : {}),
    isActive: body.isActive,
    items,
    ...(body.refreshSeller === undefined ? {} : { refreshSeller: body.refreshSeller }),
    ...(draftData === undefined ? {} : { draftData }),
  };
}

/** Enforce the contract's saved delivery policy against the database-resolved method. */
export function assertContractShippingMode(mode: ContractShippingMode | null, canonicalMethod: unknown): void {
  if (mode === null) return; // Existing contracts retain their previous shipping choices.
  const method = String(canonicalMethod ?? "").trim().toLowerCase();
  if (mode === "automatic_vehicle" && method !== "smart_vehicle") {
    throw new ContractError("This contract requires automatic vehicle delivery.");
  }
  if (mode === "self_transport" && method !== "self_pickup") {
    throw new ContractError("This contract requires customer-arranged self transport.");
  }
}

export function resolveContractShippingMode(
  requested: ContractShippingMode | null | undefined,
  saved: ContractShippingMode | null | undefined,
): ContractShippingMode | null {
  return requested === undefined ? (saved ?? null) : requested;
}

export function assertCompleteActiveContractDraft(draft: ShopContractDraftData): void {
  if (draft.version === 2 && !isValidIsoDate(draft.date)) {
    throw new ContractError("Contract date must be a real YYYY-MM-DD date before activating a structured contract.");
  }
  if (draft.version === 2 && !isValidIsoDate(draft.delivery.date)) {
    throw new ContractError("Delivery date must be a real YYYY-MM-DD date before activating a structured contract.");
  }
  const required: Array<[string, string]> = [
    ["date", draft.date],
    ["seller.name", draft.seller.name],
    ["seller.address", draft.seller.address],
    ["seller.representative", draft.seller.representative],
    ["seller.registration", draft.seller.registration],
    ["seller.contact", draft.seller.contact],
    ["buyer.country", draft.buyer.country],
    ["buyer.address", draft.buyer.address],
    ["buyer.representative", draft.buyer.representative],
    ["delivery.location", draft.delivery.location],
    ["delivery.date", draft.delivery.date],
    ["disputeCity", draft.disputeCity],
  ];
  const missing = required.find(([, value]) => !value.trim());
  if (missing) throw new ContractError(`Complete ${missing[0]} before activating a structured contract.`);
  if (!/^[0-9]+$/.test(draft.payment.days) || !Number.isSafeInteger(Number(draft.payment.days))
    || Number(draft.payment.days) <= 0) {
    throw new ContractError("Payment days must be a positive whole number before activating a structured contract.");
  }
}

function readSavedDraft(value: unknown): ShopContractDraftData | null {
  if (value === null || value === undefined) return null;
  const parsed = shopContractDraftSchema.safeParse(value);
  if (!parsed.success) throw new ContractError("The saved contract draft is invalid and cannot be edited.", 409);
  return parsed.data;
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
    draftData: row.draft_data ?? null,
    deliveryTerm: row.delivery_term,
    shippingMode: row.shipping_mode ?? null,
    isActive: row.is_active,
    endedAt: row.ended_at ? new Date(row.ended_at).toISOString() : null,
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
    `SELECT c.id, c.number, c.terms, c.draft_data, c.delivery_term, c.shipping_mode, c.is_active, c.ended_at, c.customer_id,
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
       WHERE ci.contract_id = ANY($1::integer[]) AND ci.is_active = true
      ORDER BY ci.id`,
    [ids],
  );
  return contracts.rows.map((row: any) =>
    contractResponse(row, items.rows.filter((item: any) => Number(item.contract_id) === Number(row.id))),
  );
}

async function ensureCustomerAndProducts(
  client: import("pg").PoolClient,
  definition: ContractDefinition,
  existingActiveProductIds = new Set<number>(),
) {
  const customer = await client.query("SELECT id FROM crm_customers WHERE id = $1", [definition.customerId]);
  if (!customer.rowCount) throw new ContractError("The selected CRM customer does not exist.");
  const products = await client.query(
    `SELECT id FROM shop_products
      WHERE id = ANY($1::integer[]) AND is_active = true AND visible_in_shop = true`,
    [definition.items.filter((item) => !existingActiveProductIds.has(item.productId)).map((item) => item.productId)],
  );
  const found = new Set([...existingActiveProductIds, ...products.rows.map((row: any) => Number(row.id))]);
  const invalid = definition.items.find((item) => !found.has(item.productId));
  if (invalid) throw new ContractError(`Product ${invalid.productId} does not exist or is not active in the shop.`);
}

async function canonicalTermsForContract(
  client: import("pg").PoolClient,
  contractId: number,
  contractNumber: string,
  customerId: number,
  deliveryTerm: IncotermCode | null,
  draft: ShopContractDraftData,
): Promise<string> {
  const customer = await client.query(
    `SELECT COALESCE(NULLIF(concat_ws(' ', first_name, last_name), ''), company, '') AS customer_name
       FROM crm_customers WHERE id = $1`,
    [customerId],
  );
  if (!customer.rowCount) throw new ContractError("The selected CRM customer does not exist.");
  const products = await client.query(
    `SELECT ci.product_id, sp.name AS product_name, ci.max_quantity, ci.unit_price
       FROM shop_contract_items ci
       JOIN shop_products sp ON sp.id = ci.product_id
      WHERE ci.contract_id = $1 AND ci.is_active = true
      ORDER BY ci.id`,
    [contractId],
  );
  return buildContractDraftText(draft, {
    customerName: customer.rows[0].customer_name,
    contractNumber,
    deliveryTerm,
    items: products.rows.map((row: any) => ({
      productId: Number(row.product_id),
      productName: row.product_name,
      maxQuantity: Number(row.max_quantity),
      unitPrice: Number(row.unit_price),
    })),
  });
}

export function formatContractNumber(year: number, counter: number): string {
  if (!Number.isSafeInteger(year) || year < 2000 || !Number.isSafeInteger(counter) || counter < 1111 || counter > 99999) {
    throw new ContractError("Contract number counter is out of range.", 500);
  }
  return `C${String(year % 100).padStart(2, "0")}${String(counter).padStart(5, "0")}`;
}

async function nextContractNumber(client: import("pg").PoolClient): Promise<string> {
  const year = new Date().getFullYear();
  const yearCode = String(year % 100).padStart(2, "0");
  // Seed above old manually entered C numbers, but never share the order's M counter.
  await client.query(
    `INSERT INTO shop_contract_number_counters (year, counter)
     VALUES ($1, GREATEST(1110, COALESCE((
       SELECT MAX(substring(number FROM 4)::integer) FROM shop_contracts
       WHERE number ~ ('^C' || $2 || '[0-9]{5}$')
     ), 0)))
     ON CONFLICT (year) DO NOTHING`,
    [year, yearCode],
  );
  const next = await client.query(
    `UPDATE shop_contract_number_counters SET counter = counter + 1
      WHERE year = $1 AND counter < 99999 RETURNING counter`,
    [year],
  );
  if (!next.rowCount) throw new ContractError("Annual contract number range is exhausted.", 409);
  return formatContractNumber(year, Number(next.rows[0].counter));
}

async function saveContract(definition: ContractDefinition, contractId?: number): Promise<any> {
  return inTransaction(async (client) => {
    await reconcileContractHolds(client);
    if (contractId === undefined) {
      let effectiveDraft = definition.draftData ?? null;
      if (effectiveDraft) {
        effectiveDraft = applyAuthoritativeContractSeller(
          effectiveDraft,
          await loadContractSeller(client, draftLanguage(effectiveDraft)),
          undefined,
          true,
        );
      }
      if (effectiveDraft && definition.isActive) {
        assertCompleteActiveContractDraft(effectiveDraft);
      }
      await ensureCustomerAndProducts(client, definition);
      const number = await nextContractNumber(client);
      const result = await client.query(
        `INSERT INTO shop_contracts (number, customer_id, terms, draft_data, delivery_term, shipping_mode, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [number, definition.customerId, definition.terms, effectiveDraft, definition.deliveryTerm, definition.shippingMode, definition.isActive],
      );
      const id = Number(result.rows[0].id);
      for (const item of definition.items) {
        await client.query(
          `INSERT INTO shop_contract_items (contract_id, product_id, max_quantity, unit_price)
           VALUES ($1, $2, $3, $4)`,
          [id, item.productId, item.maxQuantity, item.unitPrice],
        );
      }
      if (effectiveDraft) {
        const terms = await canonicalTermsForContract(
          client, id, number, definition.customerId, definition.deliveryTerm, effectiveDraft,
        );
        await client.query("UPDATE shop_contracts SET terms = $2, updated_at = now() WHERE id = $1", [id, terms]);
      }
      return (await loadContractRows(client, id))[0];
    }

    const locked = await client.query(
      "SELECT id, number, customer_id, delivery_term, shipping_mode, ended_at, draft_data FROM shop_contracts WHERE id = $1 FOR UPDATE",
      [contractId],
    );
    if (!locked.rowCount) throw new ContractError("Contract not found.", 404);
    if (locked.rows[0].ended_at !== null) {
      throw new ContractError("An ended contract cannot be edited.", 409);
    }
    if (definition.deliveryTerm === null && locked.rows[0].delivery_term !== null) {
      throw new ContractError("A saved contract delivery term cannot be removed.");
    }
    const hasDraftData = Object.prototype.hasOwnProperty.call(definition, "draftData");
    const hasShippingMode = Object.prototype.hasOwnProperty.call(definition, "shippingMode");
    const effectiveShippingMode = resolveContractShippingMode(
      hasShippingMode ? definition.shippingMode : undefined,
      locked.rows[0].shipping_mode,
    );
    const savedDraft = readSavedDraft(locked.rows[0].draft_data);
    let effectiveDraft = hasDraftData
      ? definition.draftData ?? null
      : savedDraft;
    if (effectiveDraft) {
      const refreshSeller = Boolean(definition.refreshSeller || !savedDraft);
      effectiveDraft = applyAuthoritativeContractSeller(
        effectiveDraft,
        refreshSeller ? await loadContractSeller(client, draftLanguage(effectiveDraft)) : null,
        savedDraft?.seller,
        refreshSeller,
      );
    }
    if (effectiveDraft && definition.isActive) assertCompleteActiveContractDraft(effectiveDraft);
    const currentItems = await client.query(
      `SELECT product_id, used_quantity, is_active FROM shop_contract_items
        WHERE contract_id = $1 FOR UPDATE`,
      [contractId],
    );
    const usageByProduct = new Map<number, number>(
      currentItems.rows.map((row: any) => [Number(row.product_id), Number(row.used_quantity)]),
    );
    await ensureCustomerAndProducts(
      client,
      definition,
      new Set(currentItems.rows.filter((row: any) => row.is_active).map((row: any) => Number(row.product_id))),
    );
    const totalUsage = [...usageByProduct.values()].reduce((sum, quantity) => sum + quantity, 0);
    if (Number(locked.rows[0].customer_id) !== definition.customerId) {
      if (totalUsage > 0) {
        throw new ContractError("Customer cannot be changed after contract units have been used.");
      }
      // Signed files remain bound to the original customer's agreement. The
      // archive upload also locks this contract before inserting its record.
      const archive = await client.query(
        "SELECT 1 FROM signed_contract_documents WHERE contract_id = $1 LIMIT 1",
        [contractId],
      );
      if (archive.rowCount) {
        throw new ContractError("Customer cannot be changed after a signed contract PDF has been archived.", 409);
      }
    }
    for (const item of definition.items) {
      if ((usageByProduct.get(item.productId) || 0) > item.maxQuantity) {
        throw new ContractError(`Product ${item.productId} cap cannot be lower than its used quantity.`);
      }
    }
    if (hasDraftData || definition.refreshSeller) {
      await client.query(
        `UPDATE shop_contracts SET customer_id = $2, draft_data = $3,
         delivery_term = $4, shipping_mode = $5, is_active = $6, updated_at = now() WHERE id = $1`,
        [contractId, definition.customerId, effectiveDraft, definition.deliveryTerm, effectiveShippingMode, definition.isActive],
      );
    } else {
      await client.query(
        `UPDATE shop_contracts SET customer_id = $2,
         delivery_term = $3, shipping_mode = $4, is_active = $5, updated_at = now() WHERE id = $1`,
        [contractId, definition.customerId, definition.deliveryTerm, effectiveShippingMode, definition.isActive],
      );
    }
    const retained = definition.items.map((item) => item.productId);
    await client.query(
      `DELETE FROM shop_contract_items WHERE contract_id = $1
       AND NOT (product_id = ANY($2::integer[])) AND used_quantity = 0`,
      [contractId, retained],
    );
    // A used allocation must remain for prior orders and hold reconciliation,
    // but must no longer be available for future contract purchases.
    await client.query(
      `UPDATE shop_contract_items SET is_active = false
        WHERE contract_id = $1 AND NOT (product_id = ANY($2::integer[])) AND is_active = true`,
      [contractId, retained],
    );
    for (const item of definition.items) {
      await client.query(
        `INSERT INTO shop_contract_items (contract_id, product_id, max_quantity, used_quantity, unit_price, is_active)
         VALUES ($1, $2, $3, 0, $4, true)
         ON CONFLICT (contract_id, product_id) DO UPDATE
           SET max_quantity = EXCLUDED.max_quantity, unit_price = EXCLUDED.unit_price, is_active = true`,
        [contractId, item.productId, item.maxQuantity, item.unitPrice],
      );
    }
    const terms = effectiveDraft
      ? await canonicalTermsForContract(
        client,
        contractId,
        locked.rows[0].number,
        definition.customerId,
        definition.deliveryTerm,
        effectiveDraft,
      )
      : definition.terms;
    await client.query(
      "UPDATE shop_contracts SET terms = $2, updated_at = now() WHERE id = $1",
      [contractId, terms],
    );
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

// The legacy Commercial module retains contract access for existing staff,
// while new roles can be granted Legal Affairs independently.
export async function requireContractManagement(req: Request, res: Response, next: NextFunction) {
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
       authorized = ["super_admin", "supper_admin", "superadmin"].includes(role)
         || permissions.includes("legal_affairs") || permissions.includes("shop_management");
    } else {
      const result = await pool.query(
        `SELECT ar.name AS role_name,
                EXISTS (
                  SELECT 1 FROM role_permissions rp
                  JOIN admin_permissions ap ON ap.id = rp.permission_id
                  WHERE rp.role_id = ar.id AND ap.is_active = true
                     AND (ap.name IN ('shop_management', 'legal_affairs')
                       OR ap.module IN ('shop_management', 'legal_affairs'))
                 ) AS can_manage_contracts
           FROM users u JOIN admin_roles ar ON ar.id = u.role_id
          WHERE u.id = $1 AND u.is_active = true AND ar.is_active = true`,
        [adminId],
      );
      const role = String(result.rows[0]?.role_name || "").toLowerCase().replace(/[\s-]+/g, "_");
       authorized = ["super_admin", "supper_admin", "superadmin"].includes(role) || result.rows[0]?.can_manage_contracts === true;
    }
     if (!authorized) return res.status(403).json({ success: false, message: "Legal Affairs or Commercial permission required." });
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
        `SELECT c.id, c.number, c.terms, c.draft_data, c.delivery_term, c.shipping_mode, c.is_active, c.ended_at, c.customer_id,
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
           WHERE ci.contract_id = ANY($1::integer[]) AND ci.is_active = true ORDER BY ci.id`,
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

   app.get("/api/admin/shop/contracts", requireContractManagement, async (_req, res) => {
    try {
      await reconcileShopContractHolds();
      const contracts = await inTransaction((client) => loadContractRows(client));
      res.json({ success: true, contracts });
    } catch (error) {
      errorResponse(res, error);
    }
  });

  // Return the legal seller snapshot for the selected document language.
   app.get("/api/admin/shop/contracts/seller", requireContractManagement, async (req, res) => {
    const requestedLanguage = typeof req.query.language === "string" ? req.query.language : "fa";
    if (!contractDraftLanguages.includes(requestedLanguage as ContractDraftLanguage)) {
      return res.status(400).json({ success: false, message: "Select one of the supported contract languages: fa, ar, en, tr." });
    }
    try {
      const seller = await inTransaction((client) =>
        loadContractSeller(client, requestedLanguage as ContractDraftLanguage),
      );
      res.json({ success: true, seller });
    } catch (error) {
      errorResponse(res, error);
    }
  });

  // Admin contract product picker must include contract-only materials, which
  // are deliberately excluded from the public shop search endpoint.
   app.get("/api/admin/shop/contracts/products", requireContractManagement, async (req, res) => {
    try {
      const query = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
      if (query.length < 2) return res.json({ success: true, products: [] });
      const result = await pool.query(
        `SELECT id, name FROM shop_products
          WHERE is_active = true AND visible_in_shop = true
            AND (name ILIKE '%' || $1 || '%' OR sku ILIKE '%' || $1 || '%')
          ORDER BY name, id LIMIT 30`,
        [query],
      );
      res.json({ success: true, products: result.rows });
    } catch (error) {
      errorResponse(res, error);
    }
  });

   app.get("/api/admin/shop/contracts/:id", requireContractManagement, async (req, res) => {
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

   app.post("/api/admin/shop/contracts", requireContractManagement, async (req, res) => {
    try {
      const contract = await saveContract(validateContractDefinition(req.body, true));
      res.status(201).json({ success: true, contract });
    } catch (error) {
      errorResponse(res, error);
    }
  });

   app.put("/api/admin/shop/contracts/:id", requireContractManagement, async (req, res) => {
    try {
      const id = parsePositiveId(req.params.id, "Contract id");
      const contract = await saveContract(validateContractDefinition(req.body), id);
      res.json({ success: true, contract });
    } catch (error) {
      errorResponse(res, error);
    }
  });

   app.post("/api/admin/shop/contracts/:id/end", requireContractManagement, async (req, res) => {
    try {
      const id = parsePositiveId(req.params.id, "Contract id");
      const contract = await inTransaction(async (client) => {
        // The conditional update serializes with checkout's contract row lock:
        // once this commits, no new contract cart can claim capacity.
        const updated = await client.query(
          `UPDATE shop_contracts SET is_active = false, ended_at = now(), updated_at = now()
             WHERE id = $1 AND ended_at IS NULL RETURNING id`,
          [id],
        );
        if (!updated.rowCount) {
          const existing = await client.query("SELECT id FROM shop_contracts WHERE id = $1", [id]);
          throw new ContractError(existing.rowCount ? "Contract has already ended." : "Contract not found.", existing.rowCount ? 409 : 404);
        }
        return (await loadContractRows(client, id))[0];
      });
      res.json({ success: true, contract });
    } catch (error) {
      errorResponse(res, error);
    }
  });
  registerSignedContractDocuments(app, requireContractManagement);
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
      `SELECT id, number, shipping_mode FROM shop_contracts
        WHERE id = $1 AND customer_id = $2 AND is_active = true`,
      [parsePositiveId(contractId, "Contract id"), parsePositiveId(customerId, "Customer id")],
    );
    if (!contractResult.rowCount) throw new ContractError("Active contract not found for this customer.", 404);
    const result = await client.query(
      `SELECT ci.product_id, ci.max_quantity, ci.used_quantity, ci.unit_price
         FROM shop_contract_items ci JOIN shop_products sp ON sp.id = ci.product_id
        WHERE ci.contract_id = $1 AND ci.is_active = true AND ci.product_id = ANY($2::integer[])
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
    return {
      id: Number(contractResult.rows[0].id),
      number: contractResult.rows[0].number,
      shippingMode: contractResult.rows[0].shipping_mode ?? null,
      items: byId,
    };
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
        WHERE ci.contract_id = $1 AND ci.is_active = true AND ci.product_id = ANY($2::integer[])
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