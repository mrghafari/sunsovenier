import test from "node:test";
import assert from "node:assert/strict";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { shouldDeferWalletCheckout } from "./wallet";
import { customerOrderErrorResponse } from "../../customer-order-errors";
import { readFileSync } from "node:fs";

function readerFor(rows: Array<Array<Record<string, unknown>>>) {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const reader = {
    async execute(statement: SQL) {
      queries.push(new PgDialect().sqlToQuery(statement));
      assert.ok(rows.length, "Unexpected additional database query");
      return { rows: rows.shift()! };
    },
  };
  return { reader: reader as unknown as NonNullable<Parameters<typeof shouldDeferWalletCheckout>[1]>, queries };
}

test("no accounting tables or no active pipeline preserves legacy checkout", async () => {
  assert.equal(await shouldDeferWalletCheckout(12, readerFor([[{ relation: null }]]).reader), false);
  assert.equal(await shouldDeferWalletCheckout(12, readerFor([[{ relation: "cutovers" }], []]).reader), false);
});

test("explicitly linked account retains the new deferred-payment flow", async () => {
  const fixture = readerFor([[{ relation: "cutovers" }], [{ company_id: 1 }], [{ id: 5 }]]);
  assert.equal(await shouldDeferWalletCheckout(12, fixture.reader), true);
  assert.equal(fixture.queries.length, 3);
});

test("verified unlinked pre-cutover wallet retains its existing payment flow", async () => {
  const fixture = readerFor([[{ relation: "cutovers" }], [{ company_id: 1 }], [], [{ id: 5 }]]);
  assert.equal(await shouldDeferWalletCheckout(12, fixture.reader), false);
  const query = fixture.queries[3];
  assert.match(query.sql, /w\.customer_id=\$/);
  assert.match(query.sql, /w\.status='active'.*w\.currency='IQD'/s);
  assert.match(query.sql, /w\.created_at\s*<\s*\(/);
  assert.match(query.sql, /min\(g\.enabled_at\)/);
  assert.match(query.sql, /g\.pipeline_ready/);
  assert.match(query.sql, /b\.capture_enabled/);
  assert.match(query.sql, /not exists.*l\.wallet_id=w\.id/s);
  assert.deepEqual(query.params, [12]);
});

test("new, linked elsewhere, inactive, unknown-date or unproven wallets cannot fall back", async () => {
  const fixture = readerFor([[{ relation: "cutovers" }], [{ company_id: 1 }], [], []]);
  await assert.rejects(() => shouldDeferWalletCheckout(12, fixture.reader),
    (error: any) => error.name === "AccountingError" && error.code === "WALLET_LINK_REQUIRED" && error.status === 409);
});

test("ambiguous accounting or legacy wallet matches fail closed", async () => {
  for (const rows of [
    [[{ relation: "cutovers" }], [{ company_id: 1 }], [{ id: 5 }, { id: 6 }]],
    [[{ relation: "cutovers" }], [{ company_id: 1 }], [], [{ id: 5 }, { id: 6 }]],
  ]) {
    await assert.rejects(() => shouldDeferWalletCheckout(12, readerFor(rows).reader),
      (error: any) => error.code === "WALLET_LINK_REQUIRED");
  }
});

test("database failures never grant legacy checkout", async () => {
  const reader = { execute: async () => { throw new Error("Database unavailable"); } };
  await assert.rejects(() => shouldDeferWalletCheckout(12, reader as any), /Database unavailable/);
});

test("expected financial errors retain their status and localized safe message", () => {
  const error = Object.assign(new Error("Internal private account data"), {
    name: "AccountingError", status: 409, code: "WALLET_LINK_REQUIRED",
  });
  for (const language of ["en", "fa", "ar", "tr"]) {
    const failure = customerOrderErrorResponse(error, language, "test-reference");
    assert.equal(failure.status, 409);
    assert.equal(failure.body.code, "WALLET_LINK_REQUIRED");
    assert.match(failure.body.message, /test-reference/);
    assert.doesNotMatch(JSON.stringify(failure.body), /Internal private account data/);
  }
  assert.match(customerOrderErrorResponse(error, "fa", "reference").body.message, /اتصال حسابداری/);
});

test("unexpected errors do not expose SQL, stack or internal messages", () => {
  const error = new Error("SQL with credentials and customer details");
  const failure = customerOrderErrorResponse(error, "fa", "reference");
  assert.equal(failure.status, 500);
  assert.equal(failure.body.code, "ORDER_CREATION_FAILED");
  assert.doesNotMatch(JSON.stringify(failure.body), /credentials|customer details|stack/);
});

test("customer checkout validates the boundary before numbers, holds or debits", () => {
  const routes = readFileSync(new URL("../../routes.ts", import.meta.url), "utf8");
  const route = routes.slice(routes.indexOf('app.post("/api/customers/orders",'));
  const preflight = route.indexOf("accountingCustomerWalletDeferred = await");
  assert.ok(preflight > 0);
  for (const marker of [
    "reconcileCartReservations(", "claimContractCart(", "generateOrderNumberInTransaction(",
    "walletStorage.debitWallet(",
  ]) assert.ok(preflight < route.indexOf(marker), `${marker} must follow validation`);
  assert.doesNotMatch(route.slice(0, route.indexOf("try {")), /JSON.stringify\(req.headers/);
});
