import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertShippingQuoteBindings,
  assertShippingQuoteCheckoutFlow,
  signShippingQuote,
  verifyShippingQuote,
  type ShippingQuoteClaims,
} from "./shipping-quote";

const cart: ShippingQuoteClaims["cart"] = [{
  id: 17,
  quantity: 2,
  weightKg: 1.25,
  isFlammable: false,
  isHazardous: false,
}];

function payload(): Omit<ShippingQuoteClaims, "version" | "issuedAt" | "expiresAt"> {
  return {
    center: { cityId: 10, countryCode: "IQ" },
    destinationCityId: 22,
    distanceKm: 34.5,
    cart,
    totalWeightKg: 2.5,
    isFlammable: false,
    isHazardous: false,
    method: "smart_vehicle",
    selectedVehicles: [{ id: 4, name: "Van", type: "van" }],
    shippingCost: 12500,
  };
}

function expectedBindings() {
  return {
    center: { cityId: 10, countryCode: "IQ" },
    destinationCityId: 22,
    distanceKm: 34.5,
    cart,
    totalWeightKg: 2.5,
    isFlammable: false,
    isHazardous: false,
    method: "smart_vehicle",
  };
}

test("both checkout flows bind contract quotes to the same contract, never another or ordinary purchase", () => {
  process.env.SESSION_SECRET = "test-session-secret";
  for (const method of ["smart_vehicle", "vehicle_quote"] as const) {
    const quote = verifyShippingQuote(signShippingQuote({ ...payload(), contractId: 7, method }, 1_000), 2_000);
    assert.doesNotThrow(() => assertShippingQuoteBindings(quote, { ...expectedBindings(), method, contractId: 7 }));
    assert.throws(() => assertShippingQuoteBindings(quote, { ...expectedBindings(), method, contractId: 8 }), /does not match/);
    assert.throws(() => assertShippingQuoteBindings(quote, { ...expectedBindings(), method, contractId: null }), /does not match/);
    const ordinary = verifyShippingQuote(signShippingQuote({ ...payload(), method }, 1_000), 2_000);
    assert.throws(() => assertShippingQuoteBindings(ordinary, { ...expectedBindings(), method, contractId: 7 }), /does not match/);
  }
});

test("bilingual contract checkout sends contract quote context and enforces customer-arranged transport", () => {
  const form = readFileSync(new URL("../client/src/components/bilingual-purchase-form.tsx", import.meta.url), "utf8");
  const request = form.slice(form.indexOf("fetch('/api/logistics/select-optimal-vehicle'"), form.indexOf("const data = await response.json()", form.indexOf("fetch('/api/logistics/select-optimal-vehicle'")));
  assert.match(request, /contractId: selectedContractId/);
  assert.match(form, /preferredContractShippingMethod\(selectedContractShippingMode, currentValue\)/);
  assert.match(form, /disabled=\{selectedContractShippingMode === "self_transport"\}/);
  assert.match(form, /isContractShippingMethodAllowed\(selectedContractShippingMode, currentValue\)/);
  assert.match(form, /freshContract\.shippingMode !== contractAsPresented\.shippingMode/);
  assert.match(form, /contract:\$\{selectedContractId/);
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const quote = routes.slice(routes.indexOf("let verifiedContractId: number | null", routes.indexOf("// Checkout weight and hazardous flags")));
  assert.match(quote, /const session = req\.session/);
  assert.ok(quote.indexOf("loadContractPricing(") < quote.indexOf("issueCheckoutShippingQuote("));
  assert.match(quote, /contractId: verifiedContractId/);
  assert.match(quote, /eligibleTransportTemplates\(activeTemplates,bulkTransport\?"bulk":"standard",null,verifiedContractId!==null\)/);
  assert.match(routes, /const weightValue = product\.grossWeight \?\? product\.weight/);
  const validation = routes.slice(routes.indexOf("const isPickupMethod ="), routes.indexOf("const countryName =", routes.indexOf("const isPickupMethod =")));
  assert.match(validation, /if \(isPickupMethod\)[\s\S]*shippingCost: 0/);
  assert.doesNotMatch(validation, /verifyShippingQuote/);
});

test("signed smart-vehicle shipping quote verifies and binds all order facts", () => {
  process.env.SESSION_SECRET = "test-session-secret";
  const quote = verifyShippingQuote(signShippingQuote(payload(), 1_000), 2_000);
  assert.equal(quote.shippingCost, 12_500);
  assert.equal(quote.selectedVehicles[0].id, 4);
  assert.doesNotThrow(() => assertShippingQuoteBindings(quote, expectedBindings()));
});

test("tampered shipping quote is rejected", () => {
  process.env.SESSION_SECRET = "test-session-secret";
  const token = signShippingQuote(payload(), 1_000);
  const [body, signature] = token.split(".");
  assert.throws(() => verifyShippingQuote(`${body}.${signature.slice(0, -1)}x`, 2_000), /signature/i);
});

test("expired shipping quote is rejected", () => {
  process.env.SESSION_SECRET = "test-session-secret";
  const token = signShippingQuote(payload(), 1_000);
  assert.throws(() => verifyShippingQuote(token, 301_001), /expired/i);
});

test("shipping quote rejects a changed cart", () => {
  process.env.SESSION_SECRET = "test-session-secret";
  const quote = verifyShippingQuote(signShippingQuote(payload(), 1_000), 2_000);
  assert.throws(() => assertShippingQuoteBindings(quote, {
    ...expectedBindings(),
    cart: [{ ...cart[0], quantity: 3 }],
  }), /does not match/i);
});

test("shipping quote rejects a changed center", () => {
  process.env.SESSION_SECRET = "test-session-secret";
  const quote = verifyShippingQuote(signShippingQuote(payload(), 1_000), 2_000);
  assert.throws(() => assertShippingQuoteBindings(quote, {
    ...expectedBindings(),
    center: { cityId: 11, countryCode: "IQ" },
  }), /does not match/i);
});

test("shipping quote rejects a changed destination", () => {
  process.env.SESSION_SECRET = "test-session-secret";
  const quote = verifyShippingQuote(signShippingQuote(payload(), 1_000), 2_000);
  assert.throws(() => assertShippingQuoteBindings(quote, {
    ...expectedBindings(),
    destinationCityId: 23,
  }), /does not match/i);
});

test("vehicle quotes cannot be substituted between shop and customer checkout flows", () => {
  process.env.SESSION_SECRET = "test-session-secret";
  const smartQuote = verifyShippingQuote(signShippingQuote(payload(), 1_000), 2_000);
  assert.throws(() => assertShippingQuoteCheckoutFlow(smartQuote, {
    flow: "shop",
    canonicalMethod: "smart_vehicle",
  }), /vehicle_quote/i);
  assert.doesNotThrow(() => assertShippingQuoteCheckoutFlow(smartQuote, {
    flow: "customers",
    canonicalMethod: "smart_vehicle",
  }));

  const shopPayload = { ...payload(), method: "vehicle_quote" };
  const shopQuote = verifyShippingQuote(signShippingQuote(shopPayload, 1_000), 2_000);
  assert.doesNotThrow(() => assertShippingQuoteCheckoutFlow(shopQuote, {
    flow: "shop",
    canonicalMethod: "smart_vehicle",
  }));
  assert.throws(() => assertShippingQuoteCheckoutFlow(shopQuote, {
    flow: "customers",
    canonicalMethod: "smart_vehicle",
  }), /smart_vehicle/i);
});

test("shop vehicle quotes require the signed vehicle-quote type and canonical smart_vehicle method", () => {
  process.env.SESSION_SECRET = "test-session-secret";
  const shopQuote = verifyShippingQuote(signShippingQuote({ ...payload(), method: "vehicle_quote" }, 1_000), 2_000);
  for (const incorrect of [{ canonicalMethod: "courier" }]) {
    assert.throws(() => assertShippingQuoteCheckoutFlow(shopQuote, {
      flow: "shop",
      ...incorrect,
    }), /vehicle_quote/i);
  }
  const customerQuote = verifyShippingQuote(signShippingQuote(payload(), 1_000), 2_000);
  assert.throws(() => assertShippingQuoteCheckoutFlow(customerQuote, {
    flow: "shop",
    canonicalMethod: "smart_vehicle",
  }), /vehicle_quote/i);
});