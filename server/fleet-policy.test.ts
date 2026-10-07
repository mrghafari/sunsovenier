import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pool } from "./db";
import { fleetCategoryForContract, parseFleetCategory, assertFleetCategory, fleetCategoryLabel, eligibleFleetCategories } from "../shared/fleet-category";
import { getOrderFleetCategory, validateFleetAssignment, validateReadyFleetCategoryChange } from "./fleet-policy";
import type { Response } from "express";

function response() {
  const result = { code: 200, body: null as any, status(code: number) { this.code = code; return this; },
    json(body: any) { this.body = body; return this; } };
  return result;
}

test("fleet ownership follows every contractual purchase, independently of bulk template category", () => {
  assert.equal(fleetCategoryForContract(null), "standard");
  assert.equal(fleetCategoryForContract(undefined), "standard");
  assert.equal(fleetCategoryForContract(17), "contract");
  assert.equal(fleetCategoryForContract("17"), "contract");
  assert.equal(parseFleetCategory(undefined), "standard");
  for (const invalid of ["bulk", "", "both", {}, 1]) assert.throws(() => parseFleetCategory(invalid));
  assert.doesNotThrow(() => assertFleetCategory(17, "contract"));
  assert.doesNotThrow(() => assertFleetCategory(null, "standard"));
  assert.throws(() => assertFleetCategory(17, "standard"), /قراردادی/);
  assert.doesNotThrow(() => assertFleetCategory(null, "contract"));
  assert.deepEqual(eligibleFleetCategories("standard"), ["standard", "contract"]);
  assert.deepEqual(eligibleFleetCategories("contract"), ["contract"]);
  for (const language of ["fa", "ar", "tr", "en"]) {
    assert.notEqual(fleetCategoryLabel("standard", language), fleetCategoryLabel("contract", language));
  }
});

test("listing uses the persisted order identity, not a client-supplied purchase mode", async () => {
  const stub = mock.method(pool as any, "query", async (_sql: string, values: unknown[]) => {
    assert.deepEqual(values, [11]);
    return { rows: [{ contract_id: 17 }], rowCount: 1 };
  });
  try {
    assert.equal(await getOrderFleetCategory(11), "contract");
    await assert.rejects(() => getOrderFleetCategory(-1));
  } finally { stub.mock.restore(); }
});

for (const contractId of [null, 17]) {
  for (const category of ["standard", "contract"] as const) {
    test(`assignment checks persisted group: contract=${contractId}, vehicle=${category}`, async () => {
      let calls = 0;
      const stub = mock.method(pool as any, "query", async (sql: string, params: unknown[]) => {
        calls++;
        if (calls === 1) {
          assert.match(sql, /om.id=\$1 AND co.id=\$2/);
          assert.deepEqual(params, [101, 11]);
          return { rows: [{ id: 11, contract_id: contractId, shipping_method: "smart_vehicle" }], rowCount: 1 };
        }
        if (calls === 3) {
          assert.match(sql, /FROM order_management/);
          assert.deepEqual(params, ["UNIT-1"]);
          return { rows: [], rowCount: 0 };
        }
        assert.match(sql, /id=\$1 AND BTRIM\(license_plate\)=\$2/);
        assert.deepEqual(params, [7, "UNIT-1"]);
        return { rows: [{ fleet_category: category, plate: "UNIT-1", is_available: true }], rowCount: 1 };
      });
      const res = response();
      try {
        const valid = await validateFleetAssignment(res as unknown as Response,
          { managementId: 101, customerOrderId: 11, vehicleId: 7, plate: "UNIT-1", source: "ready" });
        assert.equal(valid, contractId === null || category === "contract");
        assert.equal(res.code, valid ? 200 : 422);
      } finally { stub.mock.restore(); }
    });
  }
}

test("unrelated order-management identities and unregistered vehicles cannot bypass fleet membership", async () => {
  const stub = mock.method(pool as any, "query", async () => ({ rows: [], rowCount: 0 }));
  try {
    const res = response();
    assert.equal(await validateFleetAssignment(res as unknown as Response,
      { managementId: 101, customerOrderId: 12, vehicleId: 7, plate: "UNIT-1" }), false);
    assert.equal(res.code, 404);
  } finally { stub.mock.restore(); }
});

test("legacy delivery fleet fallback obeys the same contract-group restriction", async () => {
  let calls = 0;
  const stub = mock.method(pool as any, "query", async (sql: string) => {
    calls++;
    if (calls === 1) return { rows: [{ contract_id: 17 }], rowCount: 1 };
    assert.match(sql, /FROM delivery_vehicles/);
    return { rows: [{ fleet_category: "standard" }], rowCount: 1 };
  });
  try {
    const res = response();
    assert.equal(await validateFleetAssignment(res as unknown as Response,
      { managementId: 101, vehicleId: 7, source: "delivery" }), false);
    assert.equal(res.code, 422);
  } finally { stub.mock.restore(); }
});

test("a category change cannot invalidate a truck's active assignment", async () => {
  const stub = mock.method(pool as any, "query", async () => ({ rows: [{ id: 101 }], rowCount: 1 }));
  try {
    const res = response();
    assert.equal(await validateReadyFleetCategoryChange(res as unknown as Response, 7, "standard"), false);
    assert.equal(res.code, 409);
  } finally { stub.mock.restore(); }
});

test("both fleet groups reuse one template source; create/edit and every fallback carry the group policy", () => {
  const form = readFileSync(new URL("../client/src/pages/admin/logistics-management.tsx", import.meta.url), "utf8");
  assert.equal((form.match(/fleetCategory: parseFleetCategory\(formData.get\('fleetCategory'\)\)/g) || []).length, 2);
  assert.equal((form.match(/<FleetCategoryField /g) || []).length, 2);
  assert.equal((form.match(/\/api\/admin\/fleet-vehicles\?status=available&orderId=/g) || []).length, 2);
  assert.match(form, /\/api\/logistics\/ready-vehicles\?orderId=/);
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const suitable = routes.slice(routes.indexOf("// Get suitable vehicles for order"), routes.indexOf("totalReadyVehicles:", routes.indexOf("// Get suitable vehicles for order")));
  assert.match(suitable, /contractId: customerOrders.contractId/);
  assert.match(suitable, /inArray\(readyVehicles.fleetCategory, eligibleFleetCategories\(requiredFleetCategory\)\)/);
  assert.match(suitable, /noActiveFleetAssignment\(readyVehicles.licensePlate\)/);
  const assignments = routes.split('app.post("/api/logistics/assign-vehicle"').slice(1);
  assert.equal(assignments.length, 2);
  for (const route of assignments) assert.match(route.slice(0, 700), /validateFleetAssignment/);
  assert.match(routes, /managementId: orderId, vehicleId, source: "delivery"/);
});

for (const scenario of [
  { name: "free ready vehicle", source: "ready", vehicle: { is_available: true }, missions: [], allowed: true },
  { name: "ready vehicle marked unavailable", source: "ready", vehicle: { is_available: false }, missions: [], allowed: false },
  { name: "available flag with another active mission", source: "ready", vehicle: { is_available: true }, missions: [22], allowed: false },
  { name: "updating the current mission", source: "ready", vehicle: { is_available: false }, missions: [11], allowed: true },
  { name: "current and another mission", source: "ready", vehicle: { is_available: true }, missions: [11, 22], allowed: false },
  { name: "free legacy vehicle", source: "delivery", vehicle: { is_active: true, current_status: "available" }, missions: [], allowed: true },
  { name: "legacy vehicle in transit", source: "delivery", vehicle: { is_active: true, current_status: "in_transit" }, missions: [], allowed: false },
  { name: "inactive legacy vehicle", source: "delivery", vehicle: { is_active: false, current_status: "available" }, missions: [], allowed: false },
] as const) {
  test(`ordinary orders borrow contract fleet only when free: ${scenario.name}`, async () => {
    let calls = 0;
    const stub = mock.method(pool as any, "query", async () => {
      calls++;
      if (calls === 1) return { rows: [{ id: 11, contract_id: null }], rowCount: 1 };
      if (calls === 2) return { rows: [{ fleet_category: "contract", plate: "UNIT-1", ...scenario.vehicle }], rowCount: 1 };
      return { rows: scenario.missions.map(customer_order_id => ({
        id: customer_order_id === 11 ? 101 : 202, customer_order_id,
      })), rowCount: scenario.missions.length };
    });
    try {
      const res = response();
      assert.equal(await validateFleetAssignment(res as unknown as Response, {
        managementId: 101, vehicleId: 7, source: scenario.source,
      }), scenario.allowed);
      assert.equal(res.code, scenario.allowed ? 200 : 409);
    } finally { stub.mock.restore(); }
  });
}

test("category changes only block removing contract eligibility from a vehicle on a contract mission", async () => {
  const stub = mock.method(pool as any, "query", async (query: string, values: unknown[]) => {
    assert.match(query, /AND \$2='standard' AND co.contract_id IS NOT NULL/);
    assert.deepEqual(values, [7, "contract"]);
    return { rows: [], rowCount: 0 };
  });
  try {
    assert.equal(await validateReadyFleetCategoryChange(response() as unknown as Response, 7, "contract"), true);
  } finally { stub.mock.restore(); }
});

test("a contract truck borrowed by an ordinary mission cannot also be assigned to a contract order", async () => {
  let calls = 0;
  const stub = mock.method(pool as any, "query", async () => {
    calls++;
    if (calls === 1) return { rows: [{ id: 11, contract_id: 17 }], rowCount: 1 };
    if (calls === 2) return { rows: [{ fleet_category: "contract", plate: "UNIT-1", is_available: true }], rowCount: 1 };
    return { rows: [{ customer_order_id: 22 }], rowCount: 1 };
  });
  try {
    const res = response();
    assert.equal(await validateFleetAssignment(res as unknown as Response, {
      managementId: 101, vehicleId: 7, source: "ready",
    }), false);
    assert.equal(res.code, 409);
  } finally { stub.mock.restore(); }
});

test("another active management mission on the same customer order is not an edit of this assignment", async () => {
  let calls = 0;
  const stub = mock.method(pool as any, "query", async () => {
    calls++;
    if (calls === 1) return { rows: [{ id: 11, contract_id: null }], rowCount: 1 };
    if (calls === 2) return { rows: [{ fleet_category: "contract", plate: " UNIT-1 ", is_available: true }], rowCount: 1 };
    return { rows: [{ id: 202, customer_order_id: 11 }], rowCount: 1 };
  });
  try {
    const res = response();
    assert.equal(await validateFleetAssignment(res as unknown as Response, {
      managementId: 101, vehicleId: 7, source: "ready",
    }), false);
    assert.equal(res.code, 409);
  } finally { stub.mock.restore(); }
});
