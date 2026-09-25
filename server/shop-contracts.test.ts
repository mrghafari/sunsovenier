import assert from "node:assert/strict";
import { test } from "node:test";
import { validateContractDefinition } from "./shop-contracts";

const validContract = () => ({
  number: "C-2026-1",
  customerId: 7,
  terms: "Agreed fixed prices",
  isActive: true,
  items: [
    { productId: 11, maxQuantity: 40, unitPrice: 12000 },
    { productId: 12, maxQuantity: 20, unitPrice: 0 },
  ],
});

test("contract requires a customer, number, terms, status, and priced products", () => {
  assert.deepEqual(validateContractDefinition(validContract()), validContract());
  for (const key of ["number", "customerId", "terms", "isActive", "items"] as const) {
    const input: any = validContract();
    delete input[key];
    assert.throws(() => validateContractDefinition(input), { name: "Error" });
  }
});

test("contract prices are fixed whole IQD amounts and product caps are positive integers", () => {
  for (const [field, value] of [
    ["unitPrice", -1], ["unitPrice", 2.5], ["unitPrice", Number.POSITIVE_INFINITY],
    ["maxQuantity", 0], ["maxQuantity", 1.5],
  ] as const) {
    const input = validContract();
    (input.items[0] as any)[field] = value;
    assert.throws(() => validateContractDefinition(input), { name: "Error" });
  }
});

test("contract rejects duplicate product entries", () => {
  const input = validContract();
  input.items[1].productId = input.items[0].productId;
  assert.throws(() => validateContractDefinition(input), { name: "Error" });
});