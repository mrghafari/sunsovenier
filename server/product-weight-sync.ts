const PRODUCT_WEIGHT_FIELDS = ["netWeight", "grossWeight"] as const;
const VALID_WEIGHT_UNITS = ["kg", "g", "lb", "oz", "t"] as const;

export type ProductWeightField = typeof PRODUCT_WEIGHT_FIELDS[number] | "weightUnit";
export type ProductWeightUpdates = Partial<Record<typeof PRODUCT_WEIGHT_FIELDS[number], number | null>> & {
  weightUnit?: typeof VALID_WEIGHT_UNITS[number];
};

export function normalizeProductWeightUpdates(
  data: Record<string, unknown>,
  existing?: { netWeight?: unknown; grossWeight?: unknown },
): ProductWeightUpdates {
  const updates: ProductWeightUpdates = {};

  for (const field of PRODUCT_WEIGHT_FIELDS) {
    if (data[field] === undefined) continue;
    if (data[field] === null) {
      updates[field] = null;
      continue;
    }

    const value = typeof data[field] === "string" && data[field].trim() !== ""
      ? Number(data[field])
      : data[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new Error(`${field} must be a finite nonnegative number`);
    }

    updates[field] = value;
  }

  if (data.weightUnit !== undefined) {
    const unit = typeof data.weightUnit === "string" ? data.weightUnit.trim().toLowerCase() : "";
    if (!(VALID_WEIGHT_UNITS as readonly string[]).includes(unit)) {
      throw new Error("weightUnit must be one of kg, g, lb, oz, t");
    }
    updates.weightUnit = unit as typeof VALID_WEIGHT_UNITS[number];
  }

  const hasWeightUpdate = PRODUCT_WEIGHT_FIELDS.some(field => updates[field] !== undefined);
  const netWeight = numericWeight(
    updates.netWeight !== undefined ? updates.netWeight : existing?.netWeight,
  );
  const grossWeight = numericWeight(
    updates.grossWeight !== undefined ? updates.grossWeight : existing?.grossWeight,
  );
  if (
    hasWeightUpdate &&
    netWeight !== null &&
    grossWeight !== null &&
    grossWeight < netWeight
  ) {
    throw new Error("grossWeight must be greater than or equal to netWeight");
  }

  return updates;
}

function numericWeight(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function kardexWeightsToShop(product: {
  netWeight?: unknown;
  grossWeight?: unknown;
  weight?: unknown;
  weightUnit?: string | null;
}) {
  const grossWeight = numericWeight(product.grossWeight);
  const legacyWeight = numericWeight(product.weight);
  const netWeight = numericWeight(product.netWeight);

  return {
    netWeight: netWeight === null ? null : String(netWeight),
    grossWeight: grossWeight === null ? null : String(grossWeight),
    // Keep the legacy checkout weight aligned with gross weight where available.
    weight: grossWeight !== null
      ? String(grossWeight)
      : (legacyWeight !== null ? String(legacyWeight) : null),
    weightUnit: product.weightUnit || "kg",
  };
}

export function shopWeightUpdatesFromKardex(
  product: {
    netWeight?: unknown;
    grossWeight?: unknown;
    weight?: unknown;
    weightUnit?: string | null;
  },
  changedFields: ProductWeightField[],
) {
  const mapped = kardexWeightsToShop(product);
  return {
    ...(changedFields.includes("netWeight") ? { netWeight: mapped.netWeight } : {}),
    ...(changedFields.includes("grossWeight")
      ? { grossWeight: mapped.grossWeight, weight: mapped.weight }
      : {}),
    ...(changedFields.length > 0 ? { weightUnit: mapped.weightUnit } : {}),
  };
}

export function kardexWeightsDiffer(
  kardexProduct: { netWeight?: unknown; grossWeight?: unknown },
  shopProduct: { netWeight?: unknown; grossWeight?: unknown },
): boolean {
  return numericWeight(kardexProduct.netWeight) !== numericWeight(shopProduct.netWeight) ||
    numericWeight(kardexProduct.grossWeight) !== numericWeight(shopProduct.grossWeight);
}

export function kardexWeightUnitsDiffer(
  kardexProduct: { weightUnit?: string | null },
  shopProduct: { weightUnit?: string | null },
): boolean {
  return (kardexProduct.weightUnit || "kg").trim().toLowerCase() !==
    (shopProduct.weightUnit || "kg").trim().toLowerCase();
}

export interface KardexBarcodeProduct {
  id: number;
  barcode?: string | null;
  syncWithShop?: boolean | null;
  stockQuantity?: number | null;
}

export function aggregateSyncEnabledProductsByBarcode<T extends KardexBarcodeProduct>(
  products: T[],
): Array<Omit<T, "barcode" | "stockQuantity"> & { barcode: string; stockQuantity: number }> {
  const groups = new Map<string, { canonical: T; totalStock: number }>();

  for (const product of products) {
    const barcode = product.barcode?.trim();
    if (!barcode || product.syncWithShop === false) continue;

    const group = groups.get(barcode);
    if (!group) {
      groups.set(barcode, {
        canonical: product,
        totalStock: Number(product.stockQuantity) || 0,
      });
      continue;
    }

    group.totalStock += Number(product.stockQuantity) || 0;
    if (Number(product.id) < Number(group.canonical.id)) {
      group.canonical = product;
    }
  }

  return Array.from(groups.entries()).map(([barcode, group]) => ({
    ...group.canonical,
    barcode,
    stockQuantity: group.totalStock,
  })) as Array<Omit<T, "barcode" | "stockQuantity"> & { barcode: string; stockQuantity: number }>;
}

export function isCanonicalSyncEnabledProduct(
  product: KardexBarcodeProduct,
  allProducts: KardexBarcodeProduct[],
): boolean {
  const barcode = product.barcode?.trim();
  if (!barcode) return true;

  const canonical = aggregateSyncEnabledProductsByBarcode(allProducts)
    .find(candidate => candidate.barcode === barcode);
  return canonical?.id === product.id;
}