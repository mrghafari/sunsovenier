import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertCompleteActiveContractDraft,
  formatContractNumber,
  validateContractDefinition,
} from "./shop-contracts";
import { shopContractDraftSchema } from "@shared/contract-draft";
import { buildContractDraftText } from "@shared/contract-document";

const validDraft = () => ({
  version: 1 as const,
  dealType: "iran" as const,
  date: " 2026-04-30 ",
  seller: {
    name: " Seller ",
    registration: " 123 ",
    address: " Address ",
    representative: " Representative ",
    contact: " Contact ",
  },
  buyer: {
    country: " Iraq ",
    registration: " 456 ",
    address: " Buyer address ",
    representative: " Buyer representative ",
    contact: " Buyer contact ",
  },
  productDetails: {
    Polymer: { grade: " Grade ", tolerance: " +/- 2% ", packaging: " Bags " },
  },
  payment: { method: "advance" as const, days: " 30 " },
  delivery: { location: " Basra ", date: " 2026-05-20 " },
  disputeCity: " Tehran ",
});

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

test("structured contract drafts validate, trim text, and enforce size and product limits", () => {
  const parsed = shopContractDraftSchema.parse(validDraft());
  assert.equal(parsed.seller.name, "Seller");
  assert.equal(parsed.productDetails.Polymer.grade, "Grade");
  assert.equal(parsed.payment.days, "30");
  for (const invalid of [
    { ...validDraft(), version: 2 },
    { ...validDraft(), dealType: "unknown" },
    { ...validDraft(), payment: { method: "cash", days: "30" } },
    { ...validDraft(), productDetails: Object.fromEntries(
      Array.from({ length: 101 }, (_, index) => [`Product ${index}`, { grade: "", tolerance: "", packaging: "" }]),
    ) },
    { ...validDraft(), productDetails: Object.fromEntries(
      Array.from({ length: 20 }, (_, index) => [
        `Product ${index}`,
        { grade: "g".repeat(500), tolerance: "t".repeat(500), packaging: "p".repeat(500) },
      ]),
    ) },
  ]) {
    assert.equal(shopContractDraftSchema.safeParse(invalid).success, false);
  }
});

test("contract draft is optional for legacy payloads and supports explicit clearing", () => {
  const legacy = validateContractDefinition(validContract());
  assert.equal(Object.prototype.hasOwnProperty.call(legacy, "draftData"), false);

  const withDraft = validateContractDefinition({ ...validContract(), draftData: validDraft() });
  assert.equal(withDraft.draftData?.seller.name, "Seller");
  const clearDraft = validateContractDefinition({ ...validContract(), draftData: null });
  assert.equal(clearDraft.draftData, null);

  for (const draftData of [{ version: 9 }, "not a draft", 12]) {
    assert.throws(() => validateContractDefinition({ ...validContract(), draftData }), /Invalid contract draft data/);
  }
});

test("canonical document includes the server contract number and all authoritative item values", () => {
  const text = buildContractDraftText(validDraft() as any, {
    customerName: "CRM Customer",
    contractNumber: "C2601111",
    deliveryTerm: "FCA",
    items: [
      { productId: 11, productName: "Polyethylene", maxQuantity: 40, unitPrice: 12000 },
      { productId: 12, productName: "Polypropylene", maxQuantity: 20, unitPrice: 0 },
    ],
  });
  assert.match(text, /شماره قرارداد: C2601111/);
  assert.match(text, /CRM Customer/);
  assert.match(text, /Polyethylene: حداکثر 40 واحد، قیمت توافقی هر واحد 12000/);
  assert.match(text, /Polypropylene: حداکثر 20 واحد، قیمت توافقی هر واحد 0/);
  assert.match(text, /اینکوترم FCA/);
  assert.match(text, /در انتظار بازبینی و امضای طرفین/);
  assert.doesNotMatch(text, /به تأیید نهایی طرفین رسید|معادل امضای دستی و دارای اعتبار کامل حقوقی/);
});

test("structured drafts ignore client terms and require material fields only when active", () => {
  const submitted = {
    ...validContract(),
    terms: { attacker: "client-authored terms" },
    draftData: validDraft(),
  };
  const validated = validateContractDefinition(submitted);
  assert.equal(validated.terms, "");
  assert.doesNotThrow(() => assertCompleteActiveContractDraft(validated.draftData!));

  const incomplete = validDraft();
  incomplete.seller.address = "";
  assert.throws(() => assertCompleteActiveContractDraft(incomplete as any), /seller\.address/);
  const invalidDays = validDraft();
  invalidDays.payment.days = "thirty";
  assert.throws(() => assertCompleteActiveContractDraft(invalidDays as any), /Payment days/);
  assert.doesNotThrow(() => validateContractDefinition({
    ...validContract(),
    isActive: false,
    draftData: incomplete,
  }));
});

test("legacy terms remain authoritative when structured draft data is absent or cleared", () => {
  const legacy = validateContractDefinition(validContract());
  assert.equal(legacy.terms, "Agreed fixed prices");
  const cleared = validateContractDefinition({ ...validContract(), draftData: null });
  assert.equal(cleared.terms, "Agreed fixed prices");
  assert.equal(cleared.draftData, null);
});