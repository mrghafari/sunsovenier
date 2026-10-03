import assert from "node:assert/strict";
import test from "node:test";
import { accountingRecordId, accountingViewerCapabilities, postingKeyLabel, sanitizeAccountingRecord } from "./accounting-logic";

test("existing rows are reset with only strict-schema keys and keep form defaults", () => {
  const values = sanitizeAccountingRecord(
    ["code", "name", "isActive"],
    { code: "", name: "", isActive: true },
    { id: 42, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-02T00:00:00Z", code: "IQD", isActive: false, serverOnly: "ignored" },
  );
  assert.deepEqual(values, { code: "IQD", name: "", isActive: false });
  assert.equal("id" in values, false);
  assert.equal("createdAt" in values, false);
  assert.equal("updatedAt" in values, false);
  assert.equal("serverOnly" in values, false);
});

test("currency records use their string code as the PUT id; other resources keep numeric ids", () => {
  assert.equal(accountingRecordId("currencies", { code: "IQD", name: "Iraqi dinar" }), "IQD");
  assert.equal(accountingRecordId("companies", { id: 27, name: "Momtazcom Iraq" }), 27);
});

test("posting rule labels are localized for every supported language and retain the stable key", () => {
  assert.equal(postingKeyLabel("BANK", "en"), "BANK · Bank");
  assert.equal(postingKeyLabel("BANK", "fa"), "BANK · بانک");
  assert.equal(postingKeyLabel("BANK", "ar"), "BANK · البنك");
  assert.equal(postingKeyLabel("BANK", "tr"), "BANK · Banka");
});

test("viewer form affordances stay read-only while managers retain edit controls", () => {
  assert.deepEqual(accountingViewerCapabilities(false), {
    canCreate: false, canEdit: false, fieldsDisabled: true, showSave: false, rowAction: "view",
  });
  assert.deepEqual(accountingViewerCapabilities(true), {
    canCreate: true, canEdit: true, fieldsDisabled: false, showSave: true, rowAction: "edit",
  });
});