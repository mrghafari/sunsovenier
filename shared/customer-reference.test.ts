import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { customerReferenceCode } from "./customer-reference";

test("only issued seven-digit customer business references are displayed", () => {
  assert.equal(customerReferenceCode("9123456"), "9123456");
  assert.equal(customerReferenceCode("9000001"), "9000001");
  for (const value of [undefined, null, "", 9123456, 8, "8", "1234567", "912345", "91234567", "9ABCDEF", "9123456 "]) {
    assert.equal(customerReferenceCode(value), null);
  }
});

test("financial lists use references while details and prints retain the name", () => {
  const page = readFileSync(new URL("../client/src/pages/admin/finance-orders.tsx", import.meta.url), "utf8");
  assert.match(page, /sortableHeader\(customerCodeText\(language, 'number'\), 'customer'/);
  assert.match(page, /<CustomerCodeValue code=\{order.customerCode \|\| order.customer\?\.customerCode\}/);
  assert.match(page, /order.customerCode\?\.includes\(normalizedSearch\)/);
  assert.match(page, /<CustomerCodeValue code=\{orderDetails.customerCode \|\| orderDetails.customer\?\.customerCode\}/);
  assert.match(page, /escapeHtml\(customerReferenceCode\(orderDetails.customerCode/);
  assert.match(page, /escapeHtml\(customerName\)/);
});

test("shared order APIs and order details deliver the CRM reference, not a row ID", () => {
  const storage = readFileSync(new URL("../server/order-management-storage.ts", import.meta.url), "utf8");
  assert.equal((storage.match(/customerCode: crmCustomers.customerCode/g) || []).length, 2);
  assert.equal((storage.match(/customerCode: row.customerCode/g) || []).length, 4);
  const routes = readFileSync(new URL("../server/routes.ts", import.meta.url), "utf8");
  assert.match(routes, /customerCode: customerData.customer_code \|\| null/);
  assert.match(routes, /customerCode: customer.customerCode/);
  assert.match(routes, /customerCode: row.customer_code \|\| null/);
  assert.match(routes, /customer: 'crm.customer_code'/);
});
