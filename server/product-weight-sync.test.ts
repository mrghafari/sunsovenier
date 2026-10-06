import assert from "node:assert/strict";
import test from "node:test";
import {
  kardexWeightsDiffer,
  kardexWeightsToShop,
  aggregateSyncEnabledProductsByBarcode,
  isCanonicalSyncEnabledProduct,
  normalizeProductWeightUpdates,
  shopWeightUpdatesFromKardex,
  kardexWeightUnitsDiffer,
} from "./product-weight-sync";

test("normalizes finite nonnegative net and gross weight updates", () => {
  assert.deepEqual(
    normalizeProductWeightUpdates({ netWeight: "1.25", grossWeight: 2, description: "unchanged" }),
    { netWeight: 1.25, grossWeight: 2 },
  );
  assert.deepEqual(normalizeProductWeightUpdates({ netWeight: 0 }), { netWeight: 0 });
  assert.deepEqual(normalizeProductWeightUpdates({ weightUnit: " G " }), { weightUnit: "g" });
  assert.deepEqual(
    normalizeProductWeightUpdates({ netWeight: null, grossWeight: null }),
    { netWeight: null, grossWeight: null },
  );
  assert.deepEqual(normalizeProductWeightUpdates({}), {});
});

test("rejects invalid modified product weights", () => {
  for (const value of ["", "not-a-number", Number.NaN, Number.POSITIVE_INFINITY, -0.01]) {
    assert.throws(
      () => normalizeProductWeightUpdates({ grossWeight: value }),
      /grossWeight must be a finite nonnegative number/,
    );
  }
  assert.throws(
    () => normalizeProductWeightUpdates({ netWeight: 2, grossWeight: 1 }),
    /grossWeight must be greater than or equal to netWeight/,
  );
  assert.throws(
    () => normalizeProductWeightUpdates(
      { grossWeight: 1.5 },
      { netWeight: "2", grossWeight: "2.5" },
    ),
    /grossWeight must be greater than or equal to netWeight/,
  );
  assert.throws(
    () => normalizeProductWeightUpdates(
      { grossWeight: 0 },
      { netWeight: "2", grossWeight: "2.5" },
    ),
    /grossWeight must be greater than or equal to netWeight/,
  );
  assert.throws(
    () => normalizeProductWeightUpdates(
      { netWeight: 3 },
      { netWeight: "1", grossWeight: "2.5" },
    ),
    /grossWeight must be greater than or equal to netWeight/,
  );
  for (const weightUnit of ["", "grams", "KGx", null, 1]) {
    assert.throws(
      () => normalizeProductWeightUpdates({ weightUnit }),
      /weightUnit must be one of kg, g, lb, oz, t/,
    );
  }
});

test("maps Kardex gross weight to checkout's legacy weight without losing zero", () => {
  assert.deepEqual(
    kardexWeightsToShop({
      netWeight: "0",
      grossWeight: "1.50",
      weight: "9",
      weightUnit: "kg",
    }),
    { netWeight: "0", grossWeight: "1.5", weight: "1.5", weightUnit: "kg" },
  );
  assert.deepEqual(
    kardexWeightsToShop({ grossWeight: null, weight: "3.25" }),
    { netWeight: null, grossWeight: null, weight: "3.25", weightUnit: "kg" },
  );
});

test("weight-only shop updates leave unrelated and unmodified weight fields alone", () => {
  assert.deepEqual(
    shopWeightUpdatesFromKardex(
      { netWeight: 1.2, grossWeight: 1.5, weight: "old" },
      ["grossWeight"],
    ),
    { grossWeight: "1.5", weight: "1.5", weightUnit: "kg" },
  );
  assert.deepEqual(
    shopWeightUpdatesFromKardex({ netWeight: null }, ["netWeight"]),
    { netWeight: null, weightUnit: "kg" },
  );
  assert.deepEqual(
    shopWeightUpdatesFromKardex({ netWeight: 1, grossWeight: 1.1, weightUnit: "g" }, ["weightUnit"]),
    { weightUnit: "g" },
  );
});

test("smart sync detects net or gross weight changes numerically", () => {
  assert.equal(kardexWeightsDiffer({ netWeight: "1.00", grossWeight: "1.5" }, {
    netWeight: 1,
    grossWeight: 1.5,
  }), false);
  assert.equal(kardexWeightsDiffer({ netWeight: 1.1, grossWeight: 1.5 }, {
    netWeight: 1,
    grossWeight: 1.5,
  }), true);
});

test("smart sync detects unit changes and defaults missing units to kg", () => {
  assert.equal(kardexWeightUnitsDiffer({ weightUnit: "g" }, { weightUnit: "kg" }), true);
  assert.equal(kardexWeightUnitsDiffer({}, { weightUnit: "kg" }), false);
});

test("barcode aggregation consistently chooses the lowest enabled Kardex ID", () => {
  const rows = [
    { id: 10, barcode: "ABC", stockQuantity: 4, syncWithShop: true, name: "higher-id" },
    { id: 2, barcode: "ABC", stockQuantity: 3, syncWithShop: false, name: "hidden" },
    { id: 7, barcode: "ABC", stockQuantity: 5, syncWithShop: true, name: "canonical" },
  ];

  const aggregated = aggregateSyncEnabledProductsByBarcode(rows);
  assert.equal(aggregated.length, 1);
  assert.equal(aggregated[0].id, 7);
  assert.equal(aggregated[0].name, "canonical");
  assert.equal(aggregated[0].stockQuantity, 9);
  assert.equal(isCanonicalSyncEnabledProduct(rows[2], rows), true);
  assert.equal(isCanonicalSyncEnabledProduct(rows[0], rows), false);
  assert.deepEqual(aggregateSyncEnabledProductsByBarcode([...rows].reverse()), aggregated);
});