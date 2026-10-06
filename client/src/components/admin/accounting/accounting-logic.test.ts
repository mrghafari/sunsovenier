import assert from "node:assert/strict";
import test from "node:test";
import { accountingRecordId, accountingViewerCapabilities, postingKeyLabel, sanitizeAccountingRecord, accountingName, accountingCurrencyName, normalizeAccountingDigits } from "./accounting-logic";
import {accountingSettingsSchemas} from "../../../../../shared/accounting-api";

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

test("Persian account names, currency labels and exact digit normalization",()=>{
  assert.equal(accountingName({nameFa:"بانک",nameAr:"البنك",nameEn:"Bank"},"fa"),"بانک");
  assert.equal(accountingName({nameAr:"البنك",nameEn:"Bank"},"fa"),"Bank");
  assert.equal(accountingName({nameFa:"بانک"},"en"),"بانک");
  assert.equal(accountingCurrencyName("IRR","fa"),"ریال ایران");
  assert.equal(normalizeAccountingDigits("۱۲۳۴۵۶۷۸۹۰٫۰۰"),"1234567890.00");
  assert.equal(normalizeAccountingDigits("١٢٣٫٤٥"),"123.45");
  assert.equal(normalizeAccountingDigits("۱۲۳٬۴۵۶"),"123٬456"); // ambiguous grouping is not silently removed
  assert.equal(accountingSettingsSchemas.accounts.parse({companyId:1,code:"BANK",nameFa:"بانک",type:"asset"}).nameFa,"بانک");
  assert.equal("nameFa" in accountingSettingsSchemas.accounts.parse({companyId:1,code:"BANK",nameEn:"Bank",type:"asset"}),false);
  const c=accountingSettingsSchemas.companies.parse({name:"شرکت",countryCode:"IR",timezone:"Asia/Tehran",baseCurrency:"IRR"});
  assert.equal(c.baseCurrency,"IRR");
  assert.equal(accountingSettingsSchemas.companies.safeParse({...c,baseCurrency:"تومان"}).success,false);
});