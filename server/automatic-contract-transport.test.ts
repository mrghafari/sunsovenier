import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateSelectedBulkTemplate } from "./bulk-order-transport";
import { isContractShippingMethodAllowed, preferredContractShippingMethod } from "../shared/contract-shipping-policy";

test("automatic quotes do not require a customer-selected template", async () => {
  for (const selectedTemplateId of [null, undefined]) {
    assert.equal(await validateSelectedBulkTemplate({
      contractId: 7, products: [{isBulkSale:true}], selectedTemplateId,
      quotedVehicles: [{id:12}],
    }), null);
  }
});

test("customers cannot force a different contract template even when it is active", async () => {
  for (const contractId of [7, "7"]) for (const selectedTemplateId of [12, "12", -1, "other"]) {
    await assert.rejects(() => validateSelectedBulkTemplate({
      contractId, products: [{isBulkSale:true}], selectedTemplateId,
      quotedVehicles: [{id:12}],
    }), /automatically/);
  }
});

test("contract checkout does not send a manual template or require template loading for self transport", () => {
  const checkout = readFileSync(new URL("../client/src/pages/checkout.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(checkout, /bulkVehicleTemplateId|selectedBulkVehicleTemplateId|selectedVehicleTemplateId:/);
  const notice = readFileSync(new URL("../client/src/components/checkout/bulk-vehicle-selector.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(notice, /<select|useQuery|fetch\(/);
  assert.match(notice, /ناوگان قراردادی/);
  assert.match(notice, /به انتخاب قالب یا وجود خودروی شرکت نیازی نیست/);
  assert.doesNotMatch(checkout, /hasBulkContractProducts\s*\?\s*["']automatic_vehicle["']/);
});

test("automatic contracts always allow either company delivery or customer-arranged transport", () => {
  for (const method of ["smart_vehicle", "self_pickup", " SELF_PICKUP "]) {
    assert.equal(isContractShippingMethodAllowed("automatic_vehicle", method), true);
  }
  for (const method of ["courier", "express", "pickup", "store_pickup", "", null]) {
    assert.equal(isContractShippingMethodAllowed("automatic_vehicle", method), false);
  }
});

test("choosing customer transport is sticky across quote failures, refreshes and rerenders", () => {
  let current = "smart_vehicle";
  current = "self_pickup";
  for (let render = 0; render < 5; render++) {
    current = preferredContractShippingMethod("automatic_vehicle", current)!;
    assert.equal(current, "self_pickup");
  }
  current = "smart_vehicle";
  assert.equal(preferredContractShippingMethod("automatic_vehicle", current), "smart_vehicle");
  assert.equal(preferredContractShippingMethod("automatic_vehicle", "express"), "smart_vehicle");
  assert.equal(preferredContractShippingMethod("automatic_vehicle", null), "smart_vehicle");
});

test("customer-only contracts remain customer-only; legacy choices remain unrestricted", () => {
  assert.equal(isContractShippingMethodAllowed("self_transport", "self_pickup"), true);
  assert.equal(isContractShippingMethodAllowed("self_transport", "smart_vehicle"), false);
  assert.equal(preferredContractShippingMethod("self_transport", "smart_vehicle"), "self_pickup");
  assert.equal(isContractShippingMethodAllowed(null, "express"), true);
  assert.equal(preferredContractShippingMethod(null, "express"), null);
});

test("both forms unlock automatic contracts but retain the explicit customer-only restriction", () => {
  for (const path of [
    "../client/src/pages/checkout.tsx",
    "../client/src/components/bilingual-purchase-form.tsx",
  ]) {
    const form = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(form, /disabled=\{selectedContractShippingMode === "self_transport"\}/);
    assert.doesNotMatch(form, /disabled=\{hasEnforcedContractShippingMode\}/);
    assert.match(form, /isContractShippingMethodAllowed/);
    assert.match(form, /preferredContractShippingMethod/);
  }
});
