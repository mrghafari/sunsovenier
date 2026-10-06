export interface ShippingCenterTuple {
  countryCode: string;
  provinceId: number;
  cityId: number;
}

export interface ActiveGeographyRecord {
  id: number;
  countryCode?: string;
  provinceId?: number;
  isActive?: boolean | null;
  countryIsActive?: boolean | null;
  provinceIsActive?: boolean | null;
  provinceCountryCode?: string;
}

export interface RouteDistance {
  originCityId: number;
  destinationCityId: number;
  distanceKm: number;
  source?: string;
}

export function isWithinShippingCountry(
  originCountryCode: string,
  destinationCountryCode: string,
  centerCountryCode: string,
): boolean {
  const normalizedCenter = centerCountryCode.trim().toUpperCase();
  return normalizedCenter.length > 0
    && originCountryCode.trim().toUpperCase() === normalizedCenter
    && destinationCountryCode.trim().toUpperCase() === normalizedCenter;
}

export function validateShippingCenter(
  tuple: ShippingCenterTuple,
  country: { code: string; isActive: boolean | null },
  province: { id: number; countryCode: string; isActive: boolean | null },
  city: { id: number; countryCode: string; provinceId: number; isActive: boolean | null },
): string | null {
  if (!country.isActive) return "Shipping center country is inactive";
  if (!province.isActive) return "Shipping center province is inactive";
  if (!city.isActive) return "Shipping center city is inactive";
  if (tuple.countryCode !== country.code || province.countryCode !== country.code || city.countryCode !== country.code) {
    return "Shipping center country does not match its province and city";
  }
  if (tuple.provinceId !== province.id || city.provinceId !== province.id || tuple.cityId !== city.id) {
    return "Shipping center city does not belong to the selected province";
  }
  return null;
}

export function parsePositiveIntegerId(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function validateDistanceKm(
  originCityId: number,
  destinationCityId: number,
  value: unknown,
): number | null {
  if (
    typeof value !== "number"
    && (typeof value !== "string" || value.trim() === "")
  ) return null;
  const distanceKm = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return null;
  if (originCityId === destinationCityId) return distanceKm === 0 ? 0 : null;
  return distanceKm > 0 ? distanceKm : null;
}

export function resolveRouteDistance(input: {
  originCityId: number;
  destinationCityId: number;
  erbilCityId: number | null;
  manualDistances: RouteDistance[];
  erbilBaselines: RouteDistance[];
}): RouteDistance | null {
  const { originCityId, destinationCityId } = input;
  if (originCityId === destinationCityId) {
    return { originCityId, destinationCityId, distanceKm: 0, source: "same-city" };
  }
  const manual = input.manualDistances.find(
    (route) => route.originCityId === originCityId && route.destinationCityId === destinationCityId,
  );
  if (manual) return { ...manual, source: manual.source ?? "manual" };

  if (input.erbilCityId === originCityId) {
    const baseline = input.erbilBaselines.find((route) => route.destinationCityId === destinationCityId);
    if (baseline) return { ...baseline, originCityId, source: "baseline" };
  }
  return null;
}

export function mergeOriginRouteDistances(input: {
  originCityId: number;
  erbilCityId: number | null;
  manualDistances: RouteDistance[];
  erbilBaselines: RouteDistance[];
}): RouteDistance[] {
  const byDestination = new Map<number, RouteDistance>();
  for (const route of input.manualDistances) {
    if (route.originCityId === input.originCityId) {
      byDestination.set(route.destinationCityId, { ...route, source: route.source ?? "manual" });
    }
  }
  if (input.erbilCityId === input.originCityId) {
    for (const route of input.erbilBaselines) {
      if (!byDestination.has(route.destinationCityId)) {
        byDestination.set(route.destinationCityId, { ...route, source: "baseline" });
      }
    }
  }
  return [...byDestination.values()].sort((a, b) => a.destinationCityId - b.destinationCityId);
}