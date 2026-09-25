import assert from "node:assert/strict";
import { test } from "node:test";
import { formatContractNumber, validateContractDefinition } from "./shop-contracts";

const validContract = () => ({
  number: "C-2026-1",
  customerId: 7,
  terms: "Agreed fixed prices",
  deliveryTerm: "FCA",
  isActive: true,
  items: [
    { productId: 11, maxQuantity: 40, unitPrice: 12000 },
    { productId: 12, maxQuantity: 20, unitPrice: 0 },
  ],
});

test("contract requires a customer, number, terms, delivery term, status, and priced products", () => {
  assert.deepEqual(validateContractDefinition(validContract()), validContract());
  for (const key of ["number", "customerId", "terms", "deliveryTerm", "isActive", "items"] as const) {
    const input: any = validContract();
    delete input[key];
    assert.throws(() => validateContractDefinition(input), { name: "Error" });
  }
});

test("delivery term accepts only the eleven Incoterms 2020 codes", () => {
  for (const code of ["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FAS", "FOB", "CFR", "CIF"]) {
    assert.equal(validateContractDefinition({ ...validContract(), deliveryTerm: code }).deliveryTerm, code);
  }
  for (const value of ["fca", "OTHER", "FOO", "", 123]) {
    assert.throws(() => validateContractDefinition({ ...validContract(), deliveryTerm: value }));
  }
  assert.equal(validateContractDefinition({ ...validContract(), deliveryTerm: null }).deliveryTerm, null);
  assert.throws(() => validateContractDefinition({ ...validContract(), deliveryTerm: null }, true));
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

test("new contract numbers follow the order format with an independent C prefix", () => {
  assert.equal(formatContractNumber(2026, 1111), "C2601111");
  assert.equal(formatContractNumber(2030, 12345), "C3012345");
  assert.throws(() => formatContractNumber(2026, 100000));
  assert.equal(validateContractDefinition({ ...validContract(), number: "ignored" }, true).number, "");
});

test("an inactive contract may have its last product removed", () => {
  assert.deepEqual(validateContractDefinition({ ...validContract(), items: [], isActive: false }).items, []);
  assert.throws(() => validateContractDefinition({ ...validContract(), items: [] }));
  assert.throws(() => validateContractDefinition({ ...validContract(), items: [], isActive: false }, true));
});