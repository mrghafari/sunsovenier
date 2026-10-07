import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCustomerSearch } from "./customer-search";

test("customer number search accepts Latin, Persian and Arabic digits without using internal IDs", () => {
  for (const value of ["9123456", "۹۱۲۳۴۵۶", "٩١٢٣٤٥٦", " ۹1٢۳۴۵6 "]) {
    assert.equal(normalizeCustomerSearch(value), "9123456");
  }
  assert.equal(normalizeCustomerSearch("  شرکت نمونه  "), "شرکت نمونه");
});
