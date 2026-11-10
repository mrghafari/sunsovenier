import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import { packagingSpecificationsSchema } from "../shared/product-packaging";
import { validateProductPackaging } from "./product-packaging-validation";

test("container specs keep units, zero-rated pressure, negative temperature and unknown flags distinct", () => {
  const value = packagingSpecificationsSchema.parse({
    containerType: "ibc", material: "hdpe", nominalCapacityL: 1000,
    usableCapacityL: 950, wallThicknessMm: 2.5, tareWeightKg: 55,
    workingPressureBar: 0, testPressureKpa: 100,
    minTemperatureC: -20, maxTemperatureC: 60, stackingLoadKg: 0,
    reusable: false, additionalProperties: [{ name: "Outlet", value: "DN50", unit: "" }],
  });
  assert.equal(value.version, 1);
  assert.equal(value.workingPressureBar, 0);
  assert.equal(value.testPressureKpa, 100);
  assert.equal(value.reusable, false);
  assert.equal(value.uvResistant, undefined);
  assert.equal(value.minTemperatureC, -20);
});

test("invalid values and inconsistent intervals are rejected without inventing ratings", () => {
  for (const value of [
    { wallThicknessMm: -1 }, { wallThicknessMm: 0 }, { nominalCapacityL: "1000" },
    { workingPressureBar: -1 }, { testPressureKpa: Infinity }, { material: "unknown-value" },
    { minTemperatureC: -300 }, { minTemperatureC: 60, maxTemperatureC: 20 },
    { nominalCapacityL: 100, usableCapacityL: 200 },
    { additionalProperties: [{ name: "", value: "value" }] },
    { additionalProperties: Array.from({ length: 31 }, () => ({ name: "x", value: "y" })) },
    { isCertified: true },
  ]) assert.equal(packagingSpecificationsSchema.safeParse(value).success, false, JSON.stringify(value));
  assert.deepEqual(packagingSpecificationsSchema.parse({}), { version: 1 });
});

test("POST, PATCH and PUT reject bad specs before writes; omitted and null are distinct", async () => {
  const app = express();
  app.use(express.json());
  let writes = 0;
  for (const method of ["post", "patch", "put"] as const) {
    app[method]("/product", validateProductPackaging, (req, res) => { writes++; res.json(req.body); });
  }
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    for (const method of ["POST", "PATCH", "PUT"]) {
      const send = (body: unknown) => fetch(`http://127.0.0.1:${address.port}/product`, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const before = writes;
      const bad = await send({ packagingSpecifications: { minTemperatureC: 100, maxTemperatureC: 10 } });
      assert.equal(bad.status, 400);
      assert.equal(writes, before);
      assert.deepEqual((await bad.json()).errors[0].path, ["packagingSpecifications", "maxTemperatureC"]);
      assert.equal((await send({ packagingSpecifications: null })).status, 200);
      const omitted = await (await send({ name: "Legacy update" })).json();
      assert.equal(Object.hasOwn(omitted, "packagingSpecifications"), false);
      const valid = await (await send({ packagingSpecifications: { material: "steel" } })).json();
      assert.deepEqual(valid.packagingSpecifications, { version: 1, material: "steel" });
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
