import { test } from "node:test";
import assert from "node:assert/strict";
import { readyVehicleDatabaseError } from "./ready-vehicle-errors";

test("wrapped duplicate plate failures explain how to move an existing vehicle between fleets", () => {
  const error = new Error("Insert failed", { cause: { code: "23505", constraint: "ready_vehicles_license_plate_key" } });
  const result = readyVehicleDatabaseError(error);
  assert.equal(result.status, 409);
  assert.match(result.message, /فرم ویرایش/);
});
test("primary key duplicates are not misreported as duplicate plates", () => {
  const result = readyVehicleDatabaseError({ code: "23505", constraint: "ready_vehicles_pkey" });
  assert.equal(result.status, 409);
  assert.match(result.message, /شماره‌گذاری/);
});
test("missing and stale template identities get actionable validation errors", () => {
  for (const cause of [{code:"23503"}, {code:"23502",column:"vehicle_template_id"}]) {
    const result = readyVehicleDatabaseError({cause:{cause}});
    assert.equal(result.status, 422);
    assert.match(result.message, /قالب‌های مشترک/);
  }
});
test("unknown failures never expose SQL, driver data or stack traces", () => {
  const result = readyVehicleDatabaseError(new Error("PRIVATE SQL ROW DATA"));
  assert.equal(result.status, 500);
  assert.doesNotMatch(result.message, /PRIVATE/);
  const loop: any = {}; loop.cause=loop;
  assert.equal(readyVehicleDatabaseError(loop).status,500);
});
