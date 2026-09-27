import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateAuthoritativeShippingCost, isActiveCanonicalShippingMethod } from "./order-shipping-pricing";
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

test("smart-vehicle delivery is resolved by canonical method rather than a seeded method ID", () => {
  const methodFromDatabase = { id: 42, value: "smart_vehicle", isActive: true };
  assert.equal(isActiveCanonicalShippingMethod(methodFromDatabase, "smart_vehicle"), true);
  assert.equal(isActiveCanonicalShippingMethod({ ...methodFromDatabase, isActive: false }, "smart_vehicle"), false);
  assert.equal(isActiveCanonicalShippingMethod({ ...methodFromDatabase, value: "courier" }, "smart_vehicle"), false);

  const routes = readFileSync("server/routes.ts", "utf8");
  const validatorStart = routes.indexOf("async function validateAndPriceOrderShipping");
  const validatorEnd = routes.indexOf("\n  }\n", validatorStart);
  const validator = routes.slice(validatorStart, validatorEnd);
  assert.ok(validator.includes('method: input.checkoutFlow === "shop" ? "vehicle_quote" : "smart_vehicle"'));
  assert.ok(validator.includes('isActiveCanonicalShippingMethod(selectedMethod, "smart_vehicle")'));
  assert.ok(!validator.includes("selectedMethod?.id !== 7"));
  assert.ok(!validator.includes('selector !== "7"'));

  const quoteStart = routes.indexOf('app.post("/api/calculate-delivery-cost"');
  const quoteEnd = routes.indexOf("\n  });", quoteStart);
  const quoteRoute = routes.slice(quoteStart, quoteEnd);
  assert.ok(quoteRoute.includes('method: "vehicle_quote"'), "Shop vehicle quotes retain their signed quote-type binding.");
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

test("contract checkout enforces its server-loaded shipping policy before pickup exemptions or quote handling", () => {
  const routes = readFileSync("server/routes.ts", "utf8");
  const validatorStart = routes.indexOf("async function validateAndPriceOrderShipping");
  const validatorEnd = routes.indexOf("\n  }\n", validatorStart);
  const validator = routes.slice(validatorStart, validatorEnd);
  const policyCheck = validator.indexOf("assertContractShippingMode(contractPricing.shippingMode, canonicalMethod)");
  const pickupEarlyReturn = validator.indexOf("if (isPickupMethod)");
  const vehicleQuoteCheck = validator.indexOf("const needsVehicleQuote");
  assert.notEqual(policyCheck, -1, "Contract order pricing must enforce the saved shipping mode.");
  assert.ok(policyCheck < pickupEarlyReturn, "A pickup shortcut must not bypass the contract shipping mode.");
  assert.ok(policyCheck < vehicleQuoteCheck, "Vehicle quote requirements must run after the saved contract mode check.");
  assert.ok(validator.includes('await loadContractPricing(contractId, customerId'));
});