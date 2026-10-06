import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const SOURCE = "iran_uploaded_matrix";
const ARCHIVE_PATH =
  "attached_assets/1b2fc745b408f0ec42e49cfa9b0d1399-516e9bf352eefe5002f5afd0e7a73_1790285797074.zip";
const JSON_BASENAME = "iran-cities-distances-km.json";
const BATCH_SIZE = 300;

export type DistanceDataset = {
  unit: "km";
  destinations: string[];
  matrix: Record<string, Record<string, number | null>>;
};

export type DatasetSummary = {
  origins: number;
  destinations: number;
  nonNullDistances: number;
  nullDistances: number;
  asymmetricDirectionalDistances: number;
};

export type CityCandidate = {
  id: number;
  name: string;
  nameArabic: string | null;
  nameEnglish: string | null;
  provinceName: string;
};

export type CityMapping = {
  cityBySourceName: Map<string, CityCandidate>;
  ambiguousNames: Set<string>;
  unmatchedNames: string[];
};

export type ImportRoute = {
  originCityId: number;
  destinationCityId: number;
  distanceKm: number;
  originName: string;
  destinationName: string;
};

type InsertStatement = {
  sql: string;
  values: unknown[];
};

export type RoutePlan = {
  routes: ImportRoute[];
  mappedRowsBeforeDeduplication: number;
  deduplicatedIdenticalRows: number;
  conflictingDuplicatePairs: ImportRoute[][];
  excludedNullPairs: number;
  excludedUnmappedPairs: number;
  excludedSameCityPairs: number;
};

export function normalizeCityName(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\s\u200c]+/g, "");
}

export function validateDataset(input: unknown): { dataset: DistanceDataset; summary: DatasetSummary } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Dataset must be a JSON object.");
  }
  const record = input as Record<string, unknown>;
  if (record.unit !== "km") throw new Error("Dataset unit must be km.");
  if (!Array.isArray(record.destinations) || !record.destinations.every((name) => typeof name === "string" && name.trim())) {
    throw new Error("Dataset destinations must be a non-empty list of city names.");
  }
  const destinations = record.destinations as string[];
  if (new Set(destinations).size !== destinations.length) {
    throw new Error("Dataset destinations must be unique.");
  }
  if (!record.matrix || typeof record.matrix !== "object" || Array.isArray(record.matrix)) {
    throw new Error("Dataset matrix must be an object keyed by origin city.");
  }
  const rawMatrix = record.matrix as Record<string, unknown>;
  const origins = Object.keys(rawMatrix);
  if (origins.length !== 59 || origins.some((origin) => !origin.trim())) {
    throw new Error("Matrix must contain 59 non-empty origin city names.");
  }

  const matrix: Record<string, Record<string, number | null>> = {};
  let nonNullDistances = 0;
  let nullDistances = 0;
  for (const origin of origins) {
    const rawRow = rawMatrix[origin];
    if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow)) {
      throw new Error(`Matrix row for ${origin} must be an object.`);
    }
    const row = rawRow as Record<string, unknown>;
    const rowNames = Object.keys(row);
    if (rowNames.length !== destinations.length || rowNames.some((name) => !destinations.includes(name))) {
      throw new Error(`Matrix row for ${origin} must contain every destination exactly once.`);
    }
    matrix[origin] = {};
    for (const destination of destinations) {
      const distance = row[destination];
      if (distance === null) {
        nullDistances += 1;
        matrix[origin][destination] = null;
        continue;
      }
      if (normalizeCityName(origin) === normalizeCityName(destination)) {
        throw new Error(`Non-null distance for identical city ${origin} is not allowed.`);
      }
      if (typeof distance !== "number" || !Number.isFinite(distance) || distance <= 0) {
        throw new Error(`Distance from ${origin} to ${destination} must be finite and positive or null.`);
      }
      nonNullDistances += 1;
      matrix[origin][destination] = distance;
    }
  }

  let asymmetricDirectionalDistances = 0;
  const comparableOrigins = destinations.filter((name) => Object.hasOwn(matrix, name));
  for (let i = 0; i < comparableOrigins.length; i += 1) {
    for (let j = i + 1; j < comparableOrigins.length; j += 1) {
      const forward = matrix[comparableOrigins[i]][comparableOrigins[j]];
      const reverse = matrix[comparableOrigins[j]][comparableOrigins[i]];
      if (forward !== null && reverse !== null && forward !== reverse) asymmetricDirectionalDistances += 2;
    }
  }
  const summary = {
    origins: origins.length,
    destinations: destinations.length,
    nonNullDistances,
    nullDistances,
    asymmetricDirectionalDistances,
  };
  if (
    summary.origins !== 59 ||
    summary.destinations !== 59 ||
    summary.nonNullDistances !== 3422 ||
    summary.asymmetricDirectionalDistances !== 50
  ) {
    throw new Error(
      `Unexpected dataset counts: ${summary.origins} origins, ${summary.destinations} destinations, ` +
      `${summary.nonNullDistances} non-null distances, ${summary.asymmetricDirectionalDistances} asymmetric directional distances.`,
    );
  }
  return { dataset: { unit: "km", destinations: [...destinations], matrix }, summary };
}

export function buildCityMapping(names: string[], cities: CityCandidate[]): CityMapping {
  const indexes = new Map<string, Set<number>>();
  for (const city of cities) {
    const cityNames = [city.name, city.nameArabic, city.nameEnglish].filter(
      (name): name is string => typeof name === "string" && name.trim().length > 0,
    );
    for (const name of cityNames) {
      const normalized = normalizeCityName(name);
      if (!normalized) continue;
      const cityIds = indexes.get(normalized) ?? new Set<number>();
      cityIds.add(city.id);
      indexes.set(normalized, cityIds);
    }
  }

  const cityBySourceName = new Map<string, CityCandidate>();
  const ambiguousNames = new Set<string>();
  const unmatchedNames: string[] = [];
  for (const name of names) {
    const matches = indexes.get(normalizeCityName(name));
    if (!matches?.size) {
      unmatchedNames.push(name);
    } else if (matches.size !== 1) {
      ambiguousNames.add(name);
    } else {
      const matchedId = [...matches][0];
      const city = cities.find((candidate) => candidate.id === matchedId);
      if (city) cityBySourceName.set(name, city);
    }
  }
  return { cityBySourceName, ambiguousNames, unmatchedNames };
}

export function buildRoutePlan(dataset: DistanceDataset, mapping: CityMapping): RoutePlan {
  const mappedRows: ImportRoute[] = [];
  let excludedNullPairs = 0;
  let excludedUnmappedPairs = 0;
  let excludedSameCityPairs = 0;
  for (const originName of Object.keys(dataset.matrix)) {
    for (const destinationName of dataset.destinations) {
      const distanceKm = dataset.matrix[originName][destinationName];
      const origin = mapping.cityBySourceName.get(originName);
      const destination = mapping.cityBySourceName.get(destinationName);
      const skipReason = shouldSkipRoute(distanceKm, origin, destination);
      if (skipReason === "null") {
        excludedNullPairs += 1;
        continue;
      }
      if (skipReason === "unmapped") {
        excludedUnmappedPairs += 1;
        continue;
      }
      if (skipReason === "same-city") {
        excludedSameCityPairs += 1;
        continue;
      }
      if (!origin || !destination || distanceKm === null) throw new Error("Route skip classifier returned an inconsistent result.");
      mappedRows.push({
        originCityId: origin.id,
        destinationCityId: destination.id,
        distanceKm,
        originName,
        destinationName,
      });
    }
  }

  const routesByCityPair = new Map<string, ImportRoute[]>();
  for (const route of mappedRows) {
    const key = `${route.originCityId}:${route.destinationCityId}`;
    const group = routesByCityPair.get(key) ?? [];
    group.push(route);
    routesByCityPair.set(key, group);
  }
  const routes: ImportRoute[] = [];
  const conflictingDuplicatePairs: ImportRoute[][] = [];
  let deduplicatedIdenticalRows = 0;
  for (const group of routesByCityPair.values()) {
    const distances = new Set(group.map((route) => route.distanceKm));
    if (distances.size > 1) {
      conflictingDuplicatePairs.push(group);
      continue;
    }
    routes.push(group[0]);
    deduplicatedIdenticalRows += group.length - 1;
  }
  return {
    routes,
    mappedRowsBeforeDeduplication: mappedRows.length,
    deduplicatedIdenticalRows,
    conflictingDuplicatePairs,
    excludedNullPairs,
    excludedUnmappedPairs,
    excludedSameCityPairs,
  };
}

function readDatasetFromArchive(): unknown {
  const archiveEntries = execFileSync("unzip", ["-Z1", ARCHIVE_PATH], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
  const jsonEntries = archiveEntries.filter((entry) => entry.split("/").at(-1) === JSON_BASENAME);
  if (jsonEntries.length !== 1) {
    throw new Error(`Expected exactly one ${JSON_BASENAME} entry in the provided archive.`);
  }
  const json = execFileSync("unzip", ["-p", ARCHIVE_PATH, jsonEntries[0]], { encoding: "utf8", maxBuffer: 2_000_000 });
  return JSON.parse(json) as unknown;
}

function printReport(
  summary: DatasetSummary,
  mapping: CityMapping,
  plan: RoutePlan,
  mappedOriginNames: number,
  mappedDestinationNames: number,
  totalUniqueSourceNames: number,
  activeCityCount: number,
  conflicts: Map<string, string>,
  sameSourceUpdates: number,
): void {
  console.log(`Mode: dry-run (no database writes)`);
  console.log(`Dataset: ${summary.origins} origins, ${summary.destinations} destinations, ${summary.nonNullDistances} non-null directed distances, ${summary.asymmetricDirectionalDistances} asymmetric directional distances`);
  console.log(`Active IR cities: ${activeCityCount}`);
  console.log(
    `Unique source labels mapped: ${mapping.cityBySourceName.size}/${totalUniqueSourceNames}; ` +
    `origins: ${mappedOriginNames}/${summary.origins}; destinations: ${mappedDestinationNames}/${summary.destinations}; ` +
    `ambiguous: ${mapping.ambiguousNames.size}; unmatched: ${mapping.unmatchedNames.length}`,
  );
  if (mapping.ambiguousNames.size) console.log(`Ambiguous names: ${[...mapping.ambiguousNames].join(", ")}`);
  if (mapping.unmatchedNames.length) console.log(`Unmatched names: ${mapping.unmatchedNames.join(", ")}`);
  console.log(
    `Mapped directed-row candidates: ${plan.mappedRowsBeforeDeduplication}; identical duplicate rows collapsed: ${plan.deduplicatedIdenticalRows}; ` +
    `conflicting duplicate city-pairs excluded: ${plan.conflictingDuplicatePairs.length}; ` +
    `unique rows after mapping deduplication: ${plan.routes.length}; currently write-eligible after database conflicts: ${plan.routes.length - conflicts.size}; ` +
    `excluded null: ${plan.excludedNullPairs}; ` +
    `excluded unmapped: ${plan.excludedUnmappedPairs}; excluded same-city: ${plan.excludedSameCityPairs}`,
  );
  if (plan.conflictingDuplicatePairs.length) {
    console.log("Conflicting duplicate city-pairs (all source labels/distances excluded):");
    for (const group of plan.conflictingDuplicatePairs) {
      console.log(
        `  ${group[0].originCityId} -> ${group[0].destinationCityId}: ` +
        group.map((route) => `${route.originName} -> ${route.destinationName} = ${route.distanceKm} km`).join("; "),
      );
    }
  }
  console.log(`Existing non-importer rows protected/skipped: ${conflicts.size}; existing importer rows eligible for update: ${sameSourceUpdates}`);
  if (conflicts.size) {
    const routeByKey = new Map(plan.routes.map((route) => [`${route.originCityId}:${route.destinationCityId}`, route]));
    console.log("Protected conflict examples:");
    for (const [key, source] of [...conflicts].slice(0, 10)) {
      const route = routeByKey.get(key);
      console.log(`  ${route?.originName ?? key} -> ${route?.destinationName ?? key} (existing source: ${source})`);
    }
  }
  const tehran = plan.routes.filter((route) => route.originName === "تهران");
  console.log(`Representative Tehran routes (${tehran.length} mapped):`);
  for (const route of tehran.slice(0, 10)) {
    console.log(`  تهران -> ${route.destinationName}: ${route.distanceKm} km`);
  }
}

function parseMode(args: string[]): "dry-run" | "apply" {
  if (args.length === 0) return "dry-run";
  if (args.length === 1 && args[0] === "--apply") return "apply";
  throw new Error("Usage: NODE_ENV=development npx tsx scripts/import-iran-route-distances.ts [--apply]");
}

function makeInsertStatement(batch: ImportRoute[]): InsertStatement {
  const values: unknown[] = [];
  const tuples = batch.map((route, index) => {
    const base = index * 4;
    values.push(route.originCityId, route.destinationCityId, route.distanceKm, SOURCE);
    return `($${base + 1}::integer, $${base + 2}::integer, $${base + 3}::numeric, $${base + 4}::text)`;
  });
  return {
    sql: `INSERT INTO logistics_route_distances
       (origin_city_id, destination_city_id, distance_km, source, updated_at)
     VALUES ${tuples.join(", ")}
     ON CONFLICT (origin_city_id, destination_city_id) DO UPDATE
       SET distance_km = EXCLUDED.distance_km, source = EXCLUDED.source, updated_at = NOW()
       WHERE logistics_route_distances.source = EXCLUDED.source`,
    values,
  };
}

function safePostgresFailure(error: unknown, sql?: string): string {
  if (!error || typeof error !== "object") return "PostgreSQL code unavailable; constraint unavailable";
  const pgError = error as { code?: unknown; constraint?: unknown; position?: unknown };
  const code = typeof pgError.code === "string" && /^[0-9A-Z]{5}$/.test(pgError.code)
    ? pgError.code
    : "unavailable";
  const constraint = typeof pgError.constraint === "string" && /^[a-zA-Z0-9_]+$/.test(pgError.constraint)
    ? pgError.constraint
    : "unavailable";
  const position = typeof pgError.position === "string" && /^\d+$/.test(pgError.position)
    ? Number(pgError.position)
    : null;
  let location = "position unavailable";
  if (position !== null) {
    location = `position=${position}`;
    if (sql && position > 0) {
      const start = Math.max(0, position - 41);
      const end = Math.min(sql.length, position + 39);
      const snippet = sql.slice(start, end).replace(/\s+/g, " ");
      location += `; SQL template near error="${snippet}"`;
    }
  }
  return `PostgreSQL code=${code}; constraint=${constraint}; ${location}`;
}

async function run(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Importer is development-only; set NODE_ENV=development explicitly.");
  }
  const { dataset, summary } = validateDataset(readDatasetFromArchive());
  const { pool } = await import("../server/db");
  try {
    const citiesResult = await pool.query(
      `SELECT c.id, c.name, c.name_arabic, c.name_english, c.province_name
       FROM iraqi_cities c
       JOIN iraqi_provinces p ON p.id = c.province_id
       JOIN geography_countries co ON co.code = c.country_code
       WHERE c.country_code = 'IR' AND c.is_active = true
         AND p.is_active = true AND p.country_code = 'IR'
         AND co.is_active = true`,
    );
    const cities: CityCandidate[] = citiesResult.rows.map((row: any) => ({
      id: Number(row.id),
      name: row.name,
      nameArabic: row.name_arabic ?? null,
      nameEnglish: row.name_english ?? null,
      provinceName: row.province_name,
    }));
    const originNames = Object.keys(dataset.matrix);
    const sourceNames = [...new Set([...originNames, ...dataset.destinations])];
    const mapping = buildCityMapping(sourceNames, cities);
    const plan = buildRoutePlan(dataset, mapping);
    const conflicts = new Map<string, string>();
    let sameSourceUpdates = 0;

    for (let offset = 0; offset < plan.routes.length; offset += BATCH_SIZE) {
      const batch = plan.routes.slice(offset, offset + BATCH_SIZE);
      const values: unknown[] = [];
      const tuples = batch.map((route, index) => {
        const base = index * 2;
        values.push(route.originCityId, route.destinationCityId);
        return `($${base + 1}::integer, $${base + 2}::integer)`;
      });
      const existing = await pool.query(
        `SELECT incoming.origin_city_id, incoming.destination_city_id, routes.source
         FROM (VALUES ${tuples.join(", ")}) AS incoming(origin_city_id, destination_city_id)
         JOIN logistics_route_distances routes
           ON routes.origin_city_id = incoming.origin_city_id
          AND routes.destination_city_id = incoming.destination_city_id`,
        values,
      );
      for (const row of existing.rows) {
        const key = `${row.origin_city_id}:${row.destination_city_id}`;
        if (row.source === SOURCE) sameSourceUpdates += 1;
        else conflicts.set(key, String(row.source));
      }
    }

    let preflightBatchCount = 0;
    for (let offset = 0; offset < plan.routes.length; offset += BATCH_SIZE) {
      const statement = makeInsertStatement(plan.routes.slice(offset, offset + BATCH_SIZE));
      try {
        await pool.query(`EXPLAIN ${statement.sql}`, statement.values);
      } catch (error) {
        console.error(`Read-only INSERT syntax preflight failed (${safePostgresFailure(error, statement.sql)}).`);
        throw new Error("INSERT syntax preflight failed; database details were withheld.");
      }
      preflightBatchCount += 1;
    }

    printReport(
      summary,
      mapping,
      plan,
      originNames.filter((name) => mapping.cityBySourceName.has(name)).length,
      dataset.destinations.filter((name) => mapping.cityBySourceName.has(name)).length,
      sourceNames.length,
      cities.length,
      conflicts,
      sameSourceUpdates,
    );
    console.log(`INSERT syntax preflight: ${preflightBatchCount} parameterized batch(es) parsed via EXPLAIN; no writes.`);
    if (mode === "dry-run") return;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let offset = 0; offset < plan.routes.length; offset += BATCH_SIZE) {
        const statement = makeInsertStatement(plan.routes.slice(offset, offset + BATCH_SIZE));
        await client.query(
          statement.sql,
          statement.values,
        );
      }
      await client.query("COMMIT");
      console.log(`Applied eligible directed rows using source ${SOURCE}; conflicting manual/other-source rows remained unchanged.`);
    } catch (error) {
      console.error(`Import transaction failed (${safePostgresFailure(error)}); rolling back.`);
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(`Rollback failed (${safePostgresFailure(rollbackError)}).`);
      }
      throw new Error("Import transaction failed; database details were withheld.");
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

export function shouldSkipRoute(
  distance: number | null,
  origin: CityCandidate | undefined,
  destination: CityCandidate | undefined,
): "null" | "unmapped" | "same-city" | null {
  if (distance === null) return "null";
  if (!origin || !destination) return "unmapped";
  if (origin.id === destination.id) return "same-city";
  return null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run().catch(() => {
    console.error("Iran route-distance importer stopped; details were withheld to protect database configuration.");
    process.exitCode = 1;
  });
}