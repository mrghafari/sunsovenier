import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInsertStatement,
  buildCityMapping,
  buildRoutePlan,
  normalizeCityName,
  shouldSkipRoute,
  validateDataset,
  type CityCandidate,
  type DistanceDataset,
} from "./import-iran-route-distances";

function validDataset(): DistanceDataset {
  const destinations = Array.from({ length: 59 }, (_, index) => `city-${index}`);
  const matrix: DistanceDataset["matrix"] = {};
  for (const origin of destinations) {
    matrix[origin] = {};
    for (const destination of destinations) {
      matrix[origin][destination] = origin === destination ? null : 10;
    }
  }
  for (let index = 0; index < 25; index += 1) {
    matrix[destinations[index]][destinations[index + 1]] = 11;
  }
  return { unit: "km", destinations, matrix };
}

const city = (id: number, name: string): CityCandidate => ({
  id,
  name,
  nameArabic: null,
  nameEnglish: null,
  provinceName: "province",
});

test("normalization folds Persian/Arabic yeh and kaf and removes spaces and ZWNJ", () => {
  assert.equal(normalizeCityName("  كیف\u200cی "), normalizeCityName("کیفی"));
  assert.equal(normalizeCityName("ياسوج"), normalizeCityName("یاسوج"));
});

test("dataset validation accepts the expected complete km matrix and rejects invalid values", () => {
  const validated = validateDataset(validDataset());
  assert.equal(validated.summary.destinations, 59);
  assert.equal(validated.summary.origins, 59);
  assert.equal(validated.summary.nonNullDistances, 3422);
  assert.equal(validated.summary.asymmetricDirectionalDistances, 50);

  const invalidValue = validDataset();
  invalidValue.matrix["city-0"]["city-1"] = Number.POSITIVE_INFINITY;
  assert.throws(() => validateDataset(invalidValue), /finite and positive/);

  const invalidUnit = { ...validDataset(), unit: "miles" };
  assert.throws(() => validateDataset(invalidUnit), /unit must be km/);
});

test("mapping is normalized but remains exact and rejects ambiguous normalized names", () => {
  const mapping = buildCityMapping(
    ["تهران", "کاشان", "ناشناخته"],
    [city(1, "تهران"), city(2, "كاشان"), city(3, "کاشان"), city(4, "تهران بزرگ")],
  );
  assert.equal(mapping.cityBySourceName.get("تهران")?.id, 1);
  assert.equal(mapping.cityBySourceName.has("کاشان"), false);
  assert.deepEqual([...mapping.ambiguousNames], ["کاشان"]);
  assert.deepEqual(mapping.unmatchedNames, ["ناشناخته"]);
});

test("route planning skips unavailable, unmapped and same-city pairs without reverse inference", () => {
  const dataset: DistanceDataset = {
    unit: "km",
    destinations: ["تهران", "طهران", "قم"],
    matrix: {
      تهران: { تهران: null, طهران: 20, قم: 150 },
      طهران: { تهران: 22, طهران: null, قم: null },
      قم: { تهران: 149, طهران: 148, قم: null },
    },
  };
  const mapping = {
    cityBySourceName: new Map([
      ["تهران", city(1, "تهران")],
      ["طهران", city(1, "تهران")],
      ["قم", city(2, "قم")],
    ]),
    ambiguousNames: new Set<string>(),
    unmatchedNames: [],
  };
  const plan = buildRoutePlan(dataset, mapping);
  assert.deepEqual(
    plan.routes.map(({ originName, destinationName, distanceKm }) => [originName, destinationName, distanceKm]),
    [["تهران", "قم", 150]],
  );
  assert.equal(plan.excludedNullPairs, 4);
  assert.equal(plan.excludedSameCityPairs, 2);
  assert.equal(plan.excludedUnmappedPairs, 0);
  assert.equal(plan.conflictingDuplicatePairs.length, 1);
  assert.deepEqual(plan.conflictingDuplicatePairs[0].map((route) => route.distanceKm), [149, 148]);
  assert.equal(shouldSkipRoute(20, city(1, "A"), city(2, "B")), null);
  assert.equal(shouldSkipRoute(null, city(1, "A"), city(2, "B")), "null");
  assert.equal(shouldSkipRoute(20, undefined, city(2, "B")), "unmapped");
  assert.equal(shouldSkipRoute(20, city(1, "A"), city(1, "alias")), "same-city");
});

test("route planning collapses identical alias rows and excludes conflicting duplicate city-pairs", () => {
  const dataset: DistanceDataset = {
    unit: "km",
    destinations: ["تهران", "طهران", "قم"],
    matrix: {
      تهران: { تهران: null, طهران: null, قم: 150 },
      طهران: { تهران: null, طهران: null, قم: 150 },
      قم: { تهران: 149, طهران: 148, قم: null },
    },
  };
  const mapping = {
    cityBySourceName: new Map([
      ["تهران", city(1, "تهران")],
      ["طهران", city(1, "تهران")],
      ["قم", city(2, "قم")],
    ]),
    ambiguousNames: new Set<string>(),
    unmatchedNames: [],
  };
  const plan = buildRoutePlan(dataset, mapping);
  assert.equal(plan.mappedRowsBeforeDeduplication, 4);
  assert.equal(plan.deduplicatedIdenticalRows, 1);
  assert.deepEqual(plan.routes.map((route) => [route.originName, route.destinationName, route.distanceKm]), [
    ["تهران", "قم", 150],
  ]);
  assert.equal(plan.conflictingDuplicatePairs.length, 1);
  assert.deepEqual(
    plan.conflictingDuplicatePairs[0].map((route) => [route.originName, route.destinationName, route.distanceKm]),
    [["قم", "تهران", 149], ["قم", "طهران", 148]],
  );
});

test("batched INSERT supplies an updated_at expression for every target column", () => {
  const statement = buildInsertStatement([
    { originCityId: 1, destinationCityId: 2, distanceKm: 10, originName: "A", destinationName: "B" },
    { originCityId: 2, destinationCityId: 1, distanceKm: 11, originName: "B", destinationName: "A" },
  ]);
  assert.match(
    statement.sql,
    /\(origin_city_id, destination_city_id, distance_km, source, updated_at\)\s+VALUES/,
  );
  assert.match(statement.sql, /\(\$1::integer, \$2::integer, \$3::numeric, \$4::text, NOW\(\)\)/);
  assert.match(statement.sql, /\(\$5::integer, \$6::integer, \$7::numeric, \$8::text, NOW\(\)\)/);
  assert.equal(statement.values.length, 8);
});