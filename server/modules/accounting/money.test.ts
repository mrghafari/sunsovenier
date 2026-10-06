import test from "node:test";
import assert from "node:assert/strict";
import { decimal, roundMoney, exactMoney, convertBase, assertBalanced } from "./money";
import { accountingSettingsSchemas, POSTING_KEYS } from "@shared/accounting-api";
import { expectedAccountTypes } from "./settings-service";
import { getCountryPack } from "./country-packs";

test("decimal amounts never accept floating point numbers, signs or exponents",()=>{
  for (const v of [1.1,"1e3","-1","NaN","Infinity","01"," 1"]) assert.throws(()=>decimal(v as string));
});
test("IQD half-up rounding uses configurable precision",()=>{
  assert.equal(roundMoney("1234.5",0),"1235");
  assert.equal(roundMoney("1234.555",2),"1234.56");
  assert.equal(roundMoney("0.005",2),"0.01");
});
test("currency precision and overflow fail explicitly",()=>{
  assert.throws(()=>exactMoney("1.001",2));
  assert.throws(()=>exactMoney("1000000000000000000000000000000",0));
  assert.equal(exactMoney("24.350",3),"24.350");
});
test("FX conversion remains exact above JS safe integer range",()=>{
  assert.equal(convertBase("9007199254740993","1",0),"9007199254740993");
  assert.equal(convertBase("24.350","1310",0),"31899");
  assert.throws(()=>convertBase("10","0",0));
});
test("balance requires at least two lines and a positive, equal base total",()=>{
  assertBalanced([{baseDebit:"0.1",baseCredit:"0"},{baseDebit:"0.2",baseCredit:"0"},{baseDebit:"0",baseCredit:"0.3"}]);
  assert.throws(()=>assertBalanced([{baseDebit:"1",baseCredit:"0"},{baseDebit:"0",baseCredit:"0.99"}]));
  assert.throws(()=>assertBalanced([{baseDebit:"0",baseCredit:"0"},{baseDebit:"0",baseCredit:"0"}]));
});
test("every posting key has an explicit account type, never an account ID",()=>{
  assert.deepEqual(Object.keys(expectedAccountTypes).sort(),[...POSTING_KEYS].sort());
});
test("settings require money strings and valid Gregorian dates",()=>{
  assert.equal(accountingSettingsSchemas["tax-rules"].safeParse({companyId:1,countryCode:"IQ",productGroup:"chemicals",ratePercent:5,validFrom:"2026-01-01"}).success,false);
  assert.equal(accountingSettingsSchemas["fiscal-years"].safeParse({companyId:1,name:"2026",startsOn:"2026-02-30",endsOn:"2026-12-31"}).success,false);
  assert.equal(accountingSettingsSchemas["exchange-rates"].safeParse({companyId:1,currency:"USD",effectiveOn:"2026-01-01",rate:"1310",reference:"Central bank circular"}).success,true);
});
test("Iraq country pack does not invent tax or e-invoicing configuration",()=>{
  assert.equal(getCountryPack("IQ").defaultTaxRule,null);
  assert.equal(getCountryPack("IQ").invoiceCalendar,"gregorian");
  assert.throws(()=>getCountryPack("US"));
});