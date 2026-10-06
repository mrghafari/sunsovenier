import assert from "node:assert/strict";
import test from "node:test";
import {
  isWithinShippingCountry,
  mergeOriginRouteDistances,
  resolveRouteDistance,
  validateDistanceKm,
  validateShippingCenter,
  type RouteDistance,
} from "./shipping-route-resolution";

test("center validation requires active, country-consistent province and city", () => {
  const tuple = { countryCode: "IR", provinceId: 8, cityId: 41 };
  const country = { code: "IR", isActive: true };
  const province = { id: 8, countryCode: "IR", isActive: true };
  const city = { id: 41, countryCode: "IR", provinceId: 8, isActive: true };

  assert.equal(validateShippingCenter(tuple, country, province, city), null);
  assert.match(
    validateShippingCenter(tuple, country, { ...province, countryCode: "IQ" }, city) ?? "",
    /does not match/,
  );
  assert.match(
    validateShippingCenter(tuple, country, province, { ...city, isActive: false }) ?? "",
    /inactive/,
  );
  assert.match(
    validateShippingCenter(tuple, country, province, { ...city, provinceId: 9 }) ?? "",
    /does not belong/,
  );
});

test("Erbil legacy baselines apply only to Erbil and manual values override", () => {
  const baseline: RouteDistance[] = [
    { originCityId: -1, destinationCityId: 20, distanceKm: 400, source: "baseline" },
  ];
  const manual: RouteDistance[] = [
    { originCityId: 10, destinationCityId: 20, distanceKm: 430, source: "manual" },
  ];
  assert.equal(resolveRouteDistance({
    originCityId: 10,
    destinationCityId: 20,
    erbilCityId: 10,
    manualDistances: [],
    erbilBaselines: baseline,
  })?.distanceKm, 400);
  assert.equal(resolveRouteDistance({
    originCityId: 10,
    destinationCityId: 20,
    erbilCityId: 10,
    manualDistances: manual,
    erbilBaselines: baseline,
  })?.distanceKm, 430);
  assert.equal(resolveRouteDistance({
    originCityId: 11,
    destinationCityId: 20,
    erbilCityId: 10,
    manualDistances: [],
    erbilBaselines: baseline,
  }), null);
});

test("route listings include Erbil baselines only for Erbil and preserve manual overrides", () => {
  const erbilRoutes = mergeOriginRouteDistances({
    originCityId: 10,
    erbilCityId: 10,
    manualDistances: [{ originCityId: 10, destinationCityId: 20, distanceKm: 450 }],
    erbilBaselines: [
      { originCityId: -1, destinationCityId: 20, distanceKm: 400 },
      { originCityId: -1, destinationCityId: 21, distanceKm: 100 },
    ],
  });
  assert.deepEqual(erbilRoutes.map((route) => [route.destinationCityId, route.distanceKm, route.source]), [
    [20, 450, "manual"],
    [21, 100, "baseline"],
  ]);
  assert.deepEqual(mergeOriginRouteDistances({
    originCityId: 11,
    erbilCityId: 10,
    manualDistances: [{ originCityId: 11, destinationCityId: 20, distanceKm: 75 }],
    erbilBaselines: [{ originCityId: -1, destinationCityId: 21, distanceKm: 100 }],
  }).map((route) => route.destinationCityId), [20]);
});

test("missing alternate-origin routes and cross-country routes are unavailable", () => {
  assert.equal(resolveRouteDistance({
    originCityId: 31,
    destinationCityId: 32,
    erbilCityId: 10,
    manualDistances: [],
    erbilBaselines: [{ originCityId: -1, destinationCityId: 32, distanceKm: 900 }],
  }), null);
  assert.equal(isWithinShippingCountry("IR", "IR", "ir"), true);
  assert.equal(isWithinShippingCountry("IR", "IQ", "IR"), false);
  assert.equal(isWithinShippingCountry("IQ", "IQ", "IR"), false);
});

test("Erbil does not treat a missing city baseline as a free route", () => {
  assert.equal(resolveRouteDistance({
    originCityId: 10,
    destinationCityId: 21,
    erbilCityId: 10,
    manualDistances: [],
    erbilBaselines: [],
  }), null);
  assert.deepEqual(resolveRouteDistance({
    originCityId: 10,
    destinationCityId: 10,
    erbilCityId: 10,
    manualDistances: [],
    erbilBaselines: [],
  }), { originCityId: 10, destinationCityId: 10, distanceKm: 0, source: "same-city" });
});

test("manual distance rules allow exactly zero only for a same-city route", () => {
  assert.deepEqual(resolveRouteDistance({
    originCityId: 4,
    destinationCityId: 4,
    erbilCityId: null,
    manualDistances: [],
    erbilBaselines: [],
  }), { originCityId: 4, destinationCityId: 4, distanceKm: 0, source: "same-city" });
  assert.equal(validateDistanceKm(4, 4, 0), 0);
  assert.equal(validateDistanceKm(4, 4, 2), null);
  assert.equal(validateDistanceKm(4, 5, 0), null);
  assert.equal(validateDistanceKm(4, 5, 12.5), 12.5);
  assert.equal(validateDistanceKm(4, 5, Number.POSITIVE_INFINITY), null);
});