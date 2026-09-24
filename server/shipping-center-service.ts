import { pool } from "./db";
import {
  mergeOriginRouteDistances,
  isWithinShippingCountry,
  parsePositiveIntegerId,
  resolveRouteDistance,
  validateDistanceKm,
  validateShippingCenter,
  type RouteDistance,
  type ShippingCenterTuple,
} from "./shipping-route-resolution";

export class ShippingConfigurationError extends Error {
  constructor(message: string, public readonly statusCode = 400) {
    super(message);
    this.name = "ShippingConfigurationError";
  }
}

type DbCity = {
  id: number;
  countryCode: string;
  provinceId: number;
  provinceName: string;
  name: string;
  nameArabic: string | null;
  nameEnglish: string | null;
};

const ACTIVE_CITY_JOIN = `
  FROM iraqi_cities c
  JOIN iraqi_provinces p ON p.id = c.province_id
  JOIN geography_countries co ON co.code = c.country_code
`;
const ACTIVE_GEOGRAPHY_WHERE = `
  c.is_active = true AND p.is_active = true AND co.is_active = true
`;

function rowToCity(row: any): DbCity {
  return {
    id: Number(row.id),
    countryCode: row.country_code,
    provinceId: Number(row.province_id),
    provinceName: row.province_name,
    name: row.name,
    nameArabic: row.name_arabic ?? null,
    nameEnglish: row.name_english ?? null,
  };
}

async function getActiveCity(cityId: number): Promise<DbCity | null> {
  const result = await pool.query(
    `SELECT c.id, c.country_code, c.province_id, c.province_name, c.name,
            c.name_arabic, c.name_english
     ${ACTIVE_CITY_JOIN}
     WHERE ${ACTIVE_GEOGRAPHY_WHERE} AND c.id = $1
     LIMIT 1`,
    [cityId],
  );
  return result.rows[0] ? rowToCity(result.rows[0]) : null;
}

async function findErbilCityId(): Promise<number | null> {
  const result = await pool.query(
    `SELECT c.id
     ${ACTIVE_CITY_JOIN}
     WHERE ${ACTIVE_GEOGRAPHY_WHERE}
       AND c.country_code = 'IQ'
       AND (LOWER(COALESCE(c.name_english, '')) = 'erbil'
         OR LOWER(c.name) = 'erbil'
         OR c.name_arabic IN ('أربيل', 'اربیل', 'اربيل')
         OR LOWER(COALESCE(c.name_kurdish, '')) IN ('هەولێر', 'ھەولێر', 'hewler', 'hawler'))
     ORDER BY CASE WHEN LOWER(COALESCE(c.name_english, '')) = 'erbil' THEN 0 ELSE 1 END,
              c.id
     LIMIT 1`,
  );
  return result.rows[0] ? Number(result.rows[0].id) : null;
}

async function getFallbackCenter(): Promise<ShippingCenterTuple> {
  const erbilCityId = await findErbilCityId();
  if (erbilCityId === null) {
    throw new ShippingConfigurationError("No active Erbil city exists in Iraq; set a shipping center first.", 503);
  }
  const city = await getActiveCity(erbilCityId);
  if (!city) throw new ShippingConfigurationError("The default Erbil shipping center is inactive.", 503);
  return { countryCode: city.countryCode, provinceId: city.provinceId, cityId: city.id };
}

export async function getShippingCenter(): Promise<ShippingCenterTuple> {
  const stored = await pool.query(
    `SELECT country_code, province_id, city_id
     FROM logistics_shipping_center WHERE id = 1 LIMIT 1`,
  );
  if (!stored.rows[0]) return getFallbackCenter();

  const tuple: ShippingCenterTuple = {
    countryCode: stored.rows[0].country_code,
    provinceId: Number(stored.rows[0].province_id),
    cityId: Number(stored.rows[0].city_id),
  };
  const city = await getActiveCity(tuple.cityId);
  if (!city || city.countryCode !== tuple.countryCode || city.provinceId !== tuple.provinceId) {
    throw new ShippingConfigurationError("The saved shipping center is no longer active or geographically consistent.", 503);
  }
  return tuple;
}

export async function getShippingCenterCity(): Promise<DbCity> {
  const center = await getShippingCenter();
  const city = await getActiveCity(center.cityId);
  if (!city) throw new ShippingConfigurationError("The saved shipping center city is inactive.", 503);
  return city;
}

export async function saveShippingCenter(input: unknown): Promise<ShippingCenterTuple> {
  const body = input as Record<string, unknown> | null;
  const countryCode = typeof body?.countryCode === "string" ? body.countryCode.trim() : "";
  const provinceId = parsePositiveIntegerId(body?.provinceId);
  const cityId = parsePositiveIntegerId(body?.cityId);
  if (!countryCode || !provinceId || !cityId) {
    throw new ShippingConfigurationError("countryCode, provinceId, and cityId are required.");
  }

  const result = await pool.query(
    `SELECT co.code AS country_code, co.is_active AS country_is_active,
            p.id AS province_id, p.country_code AS province_country_code,
            p.is_active AS province_is_active,
            c.id AS city_id, c.country_code AS city_country_code,
            c.province_id AS city_province_id, c.is_active AS city_is_active
     FROM geography_countries co
     JOIN iraqi_provinces p ON p.country_code = co.code
     JOIN iraqi_cities c ON c.province_id = p.id
     WHERE co.code = $1 AND p.id = $2 AND c.id = $3
     LIMIT 1`,
    [countryCode, provinceId, cityId],
  );
  const row = result.rows[0];
  if (!row) throw new ShippingConfigurationError("The selected country, province, and city do not form a valid geography tuple.");
  const tuple = { countryCode, provinceId, cityId };
  const validationError = validateShippingCenter(
    tuple,
    { code: row.country_code, isActive: row.country_is_active },
    { id: Number(row.province_id), countryCode: row.province_country_code, isActive: row.province_is_active },
    {
      id: Number(row.city_id),
      countryCode: row.city_country_code,
      provinceId: Number(row.city_province_id),
      isActive: row.city_is_active,
    },
  );
  if (validationError) throw new ShippingConfigurationError(validationError);

  await pool.query(
    `INSERT INTO logistics_shipping_center (id, country_code, province_id, city_id, updated_at)
     VALUES (1, $1, $2, $3, NOW())
     ON CONFLICT (id) DO UPDATE
       SET country_code = EXCLUDED.country_code,
           province_id = EXCLUDED.province_id,
           city_id = EXCLUDED.city_id,
           updated_at = NOW()`,
    [countryCode, provinceId, cityId],
  );
  return tuple;
}

export async function resolveActiveCityByName(
  cityNames: string[],
  provinceNames: string[] = [],
  countryCode?: string,
): Promise<DbCity> {
  const normalizedCityNames = [...new Set(cityNames.map((name) => name.trim().toLocaleLowerCase()).filter(Boolean))];
  const normalizedProvinceNames = [...new Set(provinceNames.map((name) => name.trim().toLocaleLowerCase()).filter(Boolean))];
  if (!normalizedCityNames.length) throw new ShippingConfigurationError("Destination city is required.");

  const findMatches = async (matchCountryCode?: string) => {
    const params: unknown[] = [normalizedCityNames];
    let where = `${ACTIVE_GEOGRAPHY_WHERE}
      AND (LOWER(TRIM(c.name)) = ANY($1::text[])
        OR LOWER(TRIM(COALESCE(c.name_arabic, ''))) = ANY($1::text[])
        OR LOWER(TRIM(COALESCE(c.name_english, ''))) = ANY($1::text[]))`;
    if (normalizedProvinceNames.length) {
      params.push(normalizedProvinceNames);
      const provinceParam = params.length;
      where += ` AND (LOWER(TRIM(p.name)) = ANY($${provinceParam}::text[])
        OR LOWER(TRIM(p.name_arabic)) = ANY($${provinceParam}::text[])
        OR LOWER(TRIM(p.name_english)) = ANY($${provinceParam}::text[]))`;
    }
    if (matchCountryCode) {
      params.push(matchCountryCode);
      where += ` AND c.country_code = $${params.length}`;
    }
    return pool.query(
      `SELECT c.id, c.country_code, c.province_id, c.province_name, c.name,
              c.name_arabic, c.name_english
       ${ACTIVE_CITY_JOIN}
       WHERE ${where}
       ORDER BY c.id`,
      params,
    );
  };
  const result = await findMatches(countryCode);
  if (result.rows.length === 0) {
    if (countryCode && (await findMatches()).rows.length > 0) {
      throw new ShippingConfigurationError("Cross-country shipping is unavailable; destination must be in the selected shipping center country.", 422);
    }
    throw new ShippingConfigurationError("Destination city was not found in active geography.", 404);
  }
  if (result.rows.length > 1) {
    throw new ShippingConfigurationError("Destination city name is ambiguous; specify its province and country.");
  }
  return rowToCity(result.rows[0]);
}

export async function resolveShippingRoute(input: {
  destinationCityId?: unknown;
  destinationCity?: unknown;
  destinationProvince?: unknown;
  destinationCountryCode?: unknown;
}): Promise<{ distanceKm: number; destinationCityId: number }> {
  const center = await getShippingCenter();
  if (
    input.destinationCountryCode
    && String(input.destinationCountryCode).trim().toUpperCase() !== center.countryCode.toUpperCase()
  ) {
    throw new ShippingConfigurationError(
      "Cross-country shipping is unavailable; destination must be in the selected shipping center country.",
      422,
    );
  }

  const requestedId = input.destinationCityId == null || input.destinationCityId === ""
    ? null
    : parsePositiveIntegerId(input.destinationCityId);
  if (input.destinationCityId != null && input.destinationCityId !== "" && requestedId === null) {
    throw new ShippingConfigurationError("destinationCityId must be a positive integer.");
  }

  const cityName = typeof input.destinationCity === "string" ? input.destinationCity.trim() : "";
  const provinceName = typeof input.destinationProvince === "string" ? input.destinationProvince.trim() : "";
  let namedCity: DbCity | null = null;
  if (cityName && requestedId === null) {
    namedCity = await resolveActiveCityByName(
      [cityName],
      provinceName ? [provinceName] : [],
      center.countryCode,
    );
  }

  let destination: DbCity | null = null;
  if (requestedId !== null) {
    destination = await getActiveCity(requestedId);
    if (!destination) {
      throw new ShippingConfigurationError("Destination city is not active or does not exist.", 422);
    }
  }
  destination = destination ?? namedCity;
  if (!destination) {
    throw new ShippingConfigurationError(
      "Destination city or destinationCityId is required to resolve a road route.",
      422,
    );
  }
  if (destination.countryCode !== center.countryCode) {
    throw new ShippingConfigurationError(
      "Cross-country shipping is unavailable; destination must be in the selected shipping center country.",
      422,
    );
  }

  const route = await getRouteDistance(center.cityId, destination.id);
  if (!route) {
    throw new ShippingConfigurationError(
      "Road distance is unavailable from the selected shipping center to the destination.",
      422,
    );
  }
  return { distanceKm: route.distanceKm, destinationCityId: destination.id };
}

async function getManualRoutes(originCityId: number): Promise<RouteDistance[]> {
  const result = await pool.query(
    `SELECT origin_city_id, destination_city_id, distance_km, source
     FROM logistics_route_distances
     WHERE origin_city_id = $1`,
    [originCityId],
  );
  return result.rows.map((row: any) => ({
    originCityId: Number(row.origin_city_id),
    destinationCityId: Number(row.destination_city_id),
    distanceKm: Number(row.distance_km),
    source: row.source,
  }));
}

async function getErbilBaselines(): Promise<RouteDistance[]> {
  const result = await pool.query(
    `SELECT c.id AS destination_city_id, c.distance_from_erbil_km AS distance_km
     FROM iraqi_cities c
     JOIN iraqi_provinces p ON p.id = c.province_id
     JOIN geography_countries co ON co.code = c.country_code
     WHERE c.country_code = 'IQ' AND c.is_active = true
        AND p.is_active = true AND co.is_active = true
        AND c.distance_from_erbil_km > 0`,
  );
  return result.rows.flatMap((row: any) => {
    const distanceKm = Number(row.distance_km);
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) return [];
    return [{
      originCityId: -1,
      destinationCityId: Number(row.destination_city_id),
      distanceKm,
      source: "baseline",
    }];
  });
}

export async function getOriginRouteDistances(originCityId: number): Promise<RouteDistance[]> {
  const [origin, center] = await Promise.all([getActiveCity(originCityId), getShippingCenter()]);
  if (!origin) {
    throw new ShippingConfigurationError("Origin city is not active.", 404);
  }
  if (!isWithinShippingCountry(origin.countryCode, origin.countryCode, center.countryCode)) {
    throw new ShippingConfigurationError("Route origins must be in the selected shipping center country.", 422);
  }
  const [erbilCityId, manualDistances] = await Promise.all([
    origin.countryCode === "IQ" ? findErbilCityId() : Promise.resolve(null),
    getManualRoutes(originCityId),
  ]);
  const erbilBaselines = originCityId === erbilCityId ? await getErbilBaselines() : [];
  return mergeOriginRouteDistances({ originCityId, erbilCityId, manualDistances, erbilBaselines });
}

export async function getRouteDestinationCities(originCityId: number): Promise<Array<{
  id: number;
  countryCode: string;
  provinceId: number;
  name: string;
  nameArabic: string | null;
  nameEnglish: string | null;
}>> {
  const [origin, center] = await Promise.all([getActiveCity(originCityId), getShippingCenter()]);
  if (!origin) throw new ShippingConfigurationError("Origin city is not active.", 404);
  if (!isWithinShippingCountry(origin.countryCode, origin.countryCode, center.countryCode)) {
    throw new ShippingConfigurationError("Route origins must be in the selected shipping center country.", 422);
  }
  const result = await pool.query(
    `SELECT c.id, c.country_code, c.province_id, c.name, c.name_arabic, c.name_english
     ${ACTIVE_CITY_JOIN}
     WHERE ${ACTIVE_GEOGRAPHY_WHERE} AND c.country_code = $1
     ORDER BY c.province_name, c.name`,
    [center.countryCode],
  );
  return result.rows.map((row: any) => ({
    id: Number(row.id),
    countryCode: row.country_code,
    provinceId: Number(row.province_id),
    name: row.name,
    nameArabic: row.name_arabic ?? null,
    nameEnglish: row.name_english ?? null,
  }));
}

export async function getRouteDistance(originCityId: number, destinationCityId: number): Promise<RouteDistance | null> {
  const [origin, destination, center] = await Promise.all([
    getActiveCity(originCityId),
    getActiveCity(destinationCityId),
    getShippingCenter(),
  ]);
  if (!origin || !destination) {
    throw new ShippingConfigurationError("Origin and destination must be active cities.", 404);
  }
  if (!isWithinShippingCountry(origin.countryCode, destination.countryCode, center.countryCode)) {
    throw new ShippingConfigurationError("Cross-country shipping is unavailable; origin and destination must be in the selected shipping center country.", 422);
  }
  if (originCityId === destinationCityId) {
    return { originCityId, destinationCityId, distanceKm: 0, source: "same-city" };
  }

  const [erbilCityId, manualDistances] = await Promise.all([
    origin.countryCode === "IQ" ? findErbilCityId() : Promise.resolve(null),
    getManualRoutes(originCityId),
  ]);
  const erbilBaselines = originCityId === erbilCityId ? await getErbilBaselines() : [];
  return resolveRouteDistance({
    originCityId,
    destinationCityId,
    erbilCityId,
    manualDistances,
    erbilBaselines,
  });
}

export async function saveRouteDistance(input: unknown): Promise<RouteDistance> {
  const body = input as Record<string, unknown> | null;
  const originCityId = parsePositiveIntegerId(body?.originCityId);
  const destinationCityId = parsePositiveIntegerId(body?.destinationCityId);
  if (!originCityId || !destinationCityId) {
    throw new ShippingConfigurationError("originCityId and destinationCityId must be positive integer IDs.");
  }
  const distanceKm = validateDistanceKm(originCityId, destinationCityId, body?.distanceKm);
  if (distanceKm === null) {
    throw new ShippingConfigurationError("Distance must be finite and positive, except same-city routes which must be exactly zero.");
  }
  const [origin, destination] = await Promise.all([
    getActiveCity(originCityId),
    getActiveCity(destinationCityId),
  ]);
  if (!origin || !destination) {
    throw new ShippingConfigurationError("Origin and destination must be active cities.", 400);
  }
  const center = await getShippingCenter();
  if (!isWithinShippingCountry(origin.countryCode, destination.countryCode, center.countryCode)) {
    throw new ShippingConfigurationError("Manual routes must remain within the selected shipping center country.", 422);
  }

  const saved = await pool.query(
    `INSERT INTO logistics_route_distances
       (origin_city_id, destination_city_id, distance_km, source, updated_at)
     VALUES ($1, $2, $3, 'manual', NOW())
     ON CONFLICT (origin_city_id, destination_city_id) DO UPDATE
       SET distance_km = EXCLUDED.distance_km, source = 'manual', updated_at = NOW()
     RETURNING origin_city_id, destination_city_id, distance_km, source`,
    [originCityId, destinationCityId, distanceKm],
  );
  const row = saved.rows[0];
  return {
    originCityId: Number(row.origin_city_id),
    destinationCityId: Number(row.destination_city_id),
    distanceKm: Number(row.distance_km),
    source: row.source,
  };
}