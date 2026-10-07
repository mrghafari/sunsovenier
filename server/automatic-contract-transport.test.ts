import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateSelectedBulkTemplate } from "./bulk-order-transport";

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
