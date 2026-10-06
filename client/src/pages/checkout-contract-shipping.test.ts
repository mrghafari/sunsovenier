import assert from "node:assert/strict";
import { test } from "node:test";
import { getContractShippingMethodId } from "./checkout";

const methods = [
  { id: 3, value: "express", label: "Express" },
  { id: 7, value: "smart_vehicle", label: "Automatic vehicle" },
  { id: 8, value: "self_pickup", label: "Self transport", isPickup: true },
];

test("automatic vehicle contract selects the canonical smart_vehicle delivery method", () => {
  assert.equal(getContractShippingMethodId("automatic_vehicle", methods), "7");
});

test("self transport contract selects a canonical pickup delivery method", () => {
  assert.equal(getContractShippingMethodId("self_transport", methods), "8");
  for (const value of ["pickup", "personal_pickup", "self-pickup", "store_pickup"]) {
    assert.equal(getContractShippingMethodId("self_transport", [
      { id: 9, value, label: value, isPickup: true },
    ]), null);
  }
});

test("missing policy and legacy contract modes do not force a delivery method", () => {
  assert.equal(getContractShippingMethodId(null, methods), null);
  assert.equal(getContractShippingMethodId(undefined, methods), null);
  assert.equal(getContractShippingMethodId("automatic_vehicle", methods.filter(({ id }) => id !== 7)), null);
  assert.equal(getContractShippingMethodId("self_transport", methods.filter(({ id }) => id !== 8)), null);
  assert.equal(getContractShippingMethodId("self_transport", [
    { id: 10, value: "unknown_pickup", label: "Unknown", isPickup: true },
  ]), null);
});