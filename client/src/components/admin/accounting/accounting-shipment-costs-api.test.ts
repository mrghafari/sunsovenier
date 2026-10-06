import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { shipmentCostCommandSchema, type ShipmentCostPlan } from "@shared/accounting-shipment-costs";
import { fetchShipmentCosts, shipmentCostsKey, shipmentCostsUrl } from "./accounting-shipment-costs-api";
import { shipmentCostText } from "./accounting-shipment-costs-copy";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("shipment-cost query URL validates and preserves optional order scope", () => {
  assert.equal(shipmentCostsUrl({ companyId: 7, page: 2, pageSize: 50 }), "/api/accounting/v2/shipment-costs?companyId=7&page=2&pageSize=50");
  assert.equal(shipmentCostsUrl({ companyId: 7, orderId: 31, page: 1, pageSize: 20 }), "/api/accounting/v2/shipment-costs?companyId=7&page=1&pageSize=20&orderId=31");
  assert.notDeepEqual(shipmentCostsKey({ companyId: 7, page: 1, pageSize: 20 }), shipmentCostsKey({ companyId: 7, page: 2, pageSize: 20 }));
  assert.throws(() => shipmentCostsUrl({ companyId: 0, page: 1, pageSize: 20 }));
});

test("workbench response is consumed directly and uses session credentials", async () => {
  const payload = { company: { id: 7, name: "North plant", baseCurrency: "IQD" }, rows: [], pagination: { page: 1, pageSize: 20, totalRows: 0 }, activationEnabled: false };
  let calledUrl = "";
  let calledInit: RequestInit | undefined;
  globalThis.fetch = (async (input, init) => {
    calledUrl = String(input); calledInit = init;
    return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  assert.deepEqual(await fetchShipmentCosts({ companyId: 7, page: 1, pageSize: 20 }), payload);
  assert.match(calledUrl, /shipment-costs/);
  assert.equal(calledInit?.credentials, "include");
});

test("server error message is preserved", async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ message: "Accounting period closed" }), { status: 409 })) as typeof fetch;
  await assert.rejects(fetchShipmentCosts({ companyId: 7, page: 1, pageSize: 20 }), /Accounting period closed/);
});

test("posting command fixture binds the selected immutable plan hash", () => {
  const plan: ShipmentCostPlan = {
    factId: 81, orderId: 17, sourceId: "FREIGHT-APR-81", loadingSourceId: "WB-991", eventDate: "2025-04-11",
    planHash: "a".repeat(64), costType: "EXTERNAL_CARRIER", carrierReference: "Haulage-77",
    costDocumentReference: "INV-FRT-81", currency: "USD", decimals: 2, amount: "123.45000000",
    baseAmount: "164.6000", baseCurrency: "IQD", rate: "1.3333", rateReference: "CB-2025-04-11",
    rateEffectiveOn: "2025-04-11", fleetCostCenterId: null, fleetRate: null, fleetRateBasis: null,
    quantity: null, blockers: [], postingAllowed: false, posted: null,
  };
  const parsed = shipmentCostCommandSchema.safeParse({
    companyId: 7, factId: plan.factId, carrierPartyId: 402, reason: "Carrier invoice reviewed",
    expectedPlanHash: plan.planHash,
  });
  assert.equal(parsed.success, true);
  assert.equal(parsed.success && parsed.data.expectedPlanHash, plan.planHash);
  assert.equal(shipmentCostCommandSchema.safeParse({
    companyId: 7, factId: plan.factId, carrierPartyId: 402, reason: "Carrier invoice reviewed", expectedPlanHash: "A".repeat(64),
  }).success, false);
});

test("stale-plan explanation requires fresh review in all supported languages",()=>{
  for(const language of ["fa","ar","en","tr"]) {
    assert.match(shipmentCostText(language,"planChanged"),/./);
    assert.match(shipmentCostText(language,"reviewRequired"),/./);
  }
});
