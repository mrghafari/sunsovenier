import crypto from "crypto";

export type ShippingQuoteClaims = {
  version: 1;
  issuedAt: number;
  expiresAt: number;
  center: { cityId: number; countryCode: string };
  destinationCityId: number;
  distanceKm: number;
  cart: Array<{
    id: number;
    quantity: number;
    weightKg: number | null;
    isFlammable: boolean;
    isHazardous: boolean;
  }>;
  totalWeightKg: number;
  isFlammable: boolean;
  isHazardous: boolean;
  method: string;
  selectedVehicles: Array<{ id: number | string; name: string; type: string }>;
  shippingCost: number;
};

const QUOTE_LIFETIME_MS = 5 * 60 * 1000;

function signingKey(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required to issue or verify shipping quotes.");
  return secret;
}

export function signShippingQuote(
  payload: Omit<ShippingQuoteClaims, "version" | "issuedAt" | "expiresAt">,
  now = Date.now(),
): string {
  const claims: ShippingQuoteClaims = {
    ...payload,
    version: 1,
    issuedAt: now,
    expiresAt: now + QUOTE_LIFETIME_MS,
  };
  const encoded = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = crypto.createHmac("sha256", signingKey()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyShippingQuote(token: unknown, now = Date.now()): ShippingQuoteClaims {
  if (typeof token !== "string") throw new Error("A valid shipping quote token is required.");
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error("Shipping quote token is invalid.");
  const expected = crypto.createHmac("sha256", signingKey()).update(parts[0]).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(parts[1], "base64url");
  } catch {
    throw new Error("Shipping quote token is invalid.");
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    throw new Error("Shipping quote signature is invalid.");
  }
  let claims: ShippingQuoteClaims;
  try {
    claims = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch {
    throw new Error("Shipping quote token is invalid.");
  }
  if (claims.version !== 1 || !Number.isFinite(claims.expiresAt) || claims.expiresAt <= now) {
    throw new Error("Shipping quote has expired or is invalid.");
  }
  return claims;
}

export function assertShippingQuoteBindings(
  claims: ShippingQuoteClaims,
  expected: {
    center: { cityId: number; countryCode: string };
    destinationCityId: number;
    distanceKm: number;
    cart: ShippingQuoteClaims["cart"];
    totalWeightKg: number;
    isFlammable: boolean;
    isHazardous: boolean;
    method: "smart_vehicle" | "vehicle_quote";
  },
): void {
  if (
    !claims.center
    || claims.center.cityId !== expected.center.cityId
    || claims.center.countryCode !== expected.center.countryCode
    || claims.destinationCityId !== expected.destinationCityId
    || claims.distanceKm !== expected.distanceKm
    || JSON.stringify(claims.cart) !== JSON.stringify(expected.cart)
    || claims.totalWeightKg !== expected.totalWeightKg
    || claims.isFlammable !== expected.isFlammable
    || claims.isHazardous !== expected.isHazardous
    || claims.method !== expected.method
    || !Array.isArray(claims.selectedVehicles)
    || !claims.selectedVehicles.length
    || !Number.isFinite(claims.shippingCost)
    || claims.shippingCost < 0
  ) {
    throw new Error("Shipping quote does not match the current center, route, catalog cart, or vehicle requirements.");
  }
}

export function assertShippingQuoteCheckoutFlow(
  claims: ShippingQuoteClaims,
  expected: {
    flow: "shop" | "customers";
    methodSelector: string;
    canonicalMethod: string;
  },
): void {
  if (
    expected.flow === "shop"
    && (claims.method !== "vehicle_quote" || expected.methodSelector !== "7" || expected.canonicalMethod !== "smart_vehicle")
  ) {
    throw new Error("Shop vehicle quotes require vehicle_quote and delivery method 7 (smart_vehicle).");
  }
  if (
    expected.flow === "customers"
    && (claims.method !== "smart_vehicle" || expected.canonicalMethod !== "smart_vehicle")
  ) {
    throw new Error("Customer vehicle quotes require the smart_vehicle checkout method.");
  }
}