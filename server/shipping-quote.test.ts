import { test } from "node:test";
import assert from "node:assert/strict";
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
    methodSelector: "7",
    canonicalMethod: "smart_vehicle",
  }), /vehicle_quote/i);
  assert.doesNotThrow(() => assertShippingQuoteCheckoutFlow(smartQuote, {
    flow: "customers",
    methodSelector: "smart_vehicle",
    canonicalMethod: "smart_vehicle",
  }));

  const shopPayload = { ...payload(), method: "vehicle_quote" };
  const shopQuote = verifyShippingQuote(signShippingQuote(shopPayload, 1_000), 2_000);
  assert.doesNotThrow(() => assertShippingQuoteCheckoutFlow(shopQuote, {
    flow: "shop",
    methodSelector: "7",
    canonicalMethod: "smart_vehicle",
  }));
  assert.throws(() => assertShippingQuoteCheckoutFlow(shopQuote, {
    flow: "customers",
    methodSelector: "smart_vehicle",
    canonicalMethod: "smart_vehicle",
  }), /smart_vehicle/i);
});

test("shop vehicle quotes require exact active selector 7 and canonical smart_vehicle", () => {
  process.env.SESSION_SECRET = "test-session-secret";
  const shopQuote = verifyShippingQuote(signShippingQuote({ ...payload(), method: "vehicle_quote" }, 1_000), 2_000);
  for (const incorrect of [
    { methodSelector: "8", canonicalMethod: "smart_vehicle" },
    { methodSelector: "7", canonicalMethod: "courier" },
  ]) {
    assert.throws(() => assertShippingQuoteCheckoutFlow(shopQuote, {
      flow: "shop",
      ...incorrect,
    }), /delivery method 7/i);
  }
});