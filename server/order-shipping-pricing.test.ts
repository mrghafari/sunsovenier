import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateAuthoritativeShippingCost } from "./order-shipping-pricing";
import { isActivePickupShippingMethod, isStandardShippingMethod } from "./shipping-method-policy";

test("shipping uses the server rate and weight, not a client submitted zero", () => {
  const shippingCost = calculateAuthoritativeShippingCost({
    basePrice: "2500",
    pricePerKg: "500",
    totalWeightKg: 4,
    itemSubtotal: 10_000,
    freeShippingThreshold: "0",
  });
  assert.equal(shippingCost, 4_500);
});

test("free shipping applies only when the authoritative subtotal meets its promotion threshold", () => {
  assert.equal(calculateAuthoritativeShippingCost({
    basePrice: 2500,
    pricePerKg: 500,
    totalWeightKg: 4,
    itemSubtotal: 20_000,
    freeShippingThreshold: 20_000,
  }), 0);
});

test("unknown and disabled pickup methods are not considered valid pickup exemptions", () => {
  assert.equal(isActivePickupShippingMethod("pickup", null), false);
  assert.equal(isActivePickupShippingMethod("pickup", { value: "pickup", isActive: false }), false);
  assert.equal(isActivePickupShippingMethod("pickup", { value: "store_pickup", isActive: true }), false);
  assert.equal(isActivePickupShippingMethod("pickup", { value: "pickup", isActive: true }), true);
});

test("standard quote methods exclude smart and pickup while using authoritative rates", () => {
  assert.equal(isStandardShippingMethod("courier"), true);
  assert.equal(isStandardShippingMethod("smart_vehicle"), false);
  assert.equal(isStandardShippingMethod("pickup"), false);
  assert.equal(calculateAuthoritativeShippingCost({
    basePrice: 3200,
    pricePerKg: 450,
    totalWeightKg: 3,
    itemSubtotal: 10_000,
  }), 4_550);

  const routes = readFileSync("server/routes.ts", "utf8");
  const quoteRoute = routes.slice(
    routes.indexOf('app.post("/api/shipping/quote-standard"'),
    routes.indexOf("\n  });", routes.indexOf('app.post("/api/shipping/quote-standard"')),
  );
  assert.ok(quoteRoute.includes("validateAndPriceOrderShipping"));
  assert.ok(quoteRoute.includes("standardMethodsOnly: true"));
  assert.ok(quoteRoute.includes("checkoutFlow: \"standard_quote\""));
  assert.ok(!quoteRoute.includes("vehicleTemplates"));
  assert.ok(
    routes.includes('if (input.standardMethodsOnly && !rate)'),
    "A standard quote without a destination-matching active rate must not use a zero-default method price",
  );
});

test("admin shipping-center and route configuration endpoints require logistics capabilities", () => {
  const routes = readFileSync("server/routes.ts", "utf8");
  for (const route of [
    'app.get("/api/admin/logistics/shipping-center", requireModuleAccess(\'logistics_management\', \'view\')',
    'app.get("/api/admin/logistics/route-distances", requireModuleAccess(\'logistics_management\', \'view\')',
    'app.get("/api/admin/logistics/route-destinations", requireModuleAccess(\'logistics_management\', \'view\')',
    'app.put("/api/admin/logistics/shipping-center", requireModuleAccess(\'logistics_management\', \'edit\')',
    'app.put("/api/admin/logistics/route-distances", requireModuleAccess(\'logistics_management\', \'edit\')',
  ]) {
    assert.ok(routes.includes(route), `Missing expected capability guard: ${route}`);
  }
});

test("both active order routes validate shipping before reservations and order/payment writes", () => {
  const routes = readFileSync("server/routes.ts", "utf8");
  for (const path of ["/api/shop/orders", "/api/customers/orders"]) {
    const start = routes.indexOf(`app.post("${path}"`);
    assert.notEqual(start, -1, `Missing active order route ${path}`);
    const end = routes.indexOf("\n  });", start);
    const handler = routes.slice(start, end);
    const validation = handler.indexOf("validateAndPriceOrderShipping");
    assert.notEqual(validation, -1, `${path} does not validate shipping`);
    for (const sideEffect of ["reconcileCartReservations", "walletStorage.debitWallet", "customerStorage.createOrder("]) {
      const effectIndex = handler.indexOf(sideEffect);
      if (effectIndex !== -1) assert.ok(validation < effectIndex, `${path} runs ${sideEffect} before shipping validation`);
    }
  }
});