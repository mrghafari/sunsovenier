import assert from "node:assert/strict";
import test from "node:test";
import { shippingWeightKg } from "./shipping-weight";

test("uses gross weight and converts its unit to kilograms", () => {
  assert.equal(shippingWeightKg({ grossWeight: "1500", weight: "9", weightUnit: "g" }), 1.5);
  assert.equal(shippingWeightKg({ grossWeight: "2.5", weightUnit: "kg" }), 2.5);
  assert.equal(shippingWeightKg({ grossWeight: "0", weight: "9", weightUnit: "kg" }), 0);
  assert.equal(shippingWeightKg({ weight: "3", weightUnit: "lb" }), 3 * 0.45359237);
});

test("does not invent a shipping weight for missing or invalid catalog data", () => {
  assert.equal(shippingWeightKg({ grossWeight: null, weight: null }), null);
  assert.equal(shippingWeightKg({ grossWeight: "bad", weightUnit: "kg" }), null);
  assert.equal(shippingWeightKg({ grossWeight: "2", weightUnit: "unknown" }), null);
});