import assert from "node:assert/strict";
import { test } from "node:test";
import { pool } from "./db";
import { enrichOrderWithContractSummary, getCustomerOrderContractSummaries } from "./shop-contracts";
import { buildShopContractSummary } from "@shared/shop-contract-summary";

test("contract summary computes current active-line balances and retains ended contracts", async () => {
  const originalConnect = pool.connect;
  const statements: Array<{ sql: string; params?: unknown[] }> = [];
  (pool as any).connect = async () => ({
    query: async (sql: string, params?: unknown[]) => {
      statements.push({ sql, params });
      if (sql.includes("SELECT h.id FROM shop_contract_holds")) return { rowCount: 0, rows: [] };
      if (sql.includes("FROM customer_orders co")) {
        return {
          rowCount: 1,
          rows: [{
            order_id: 81,
            id: 16,
            number: "C2601111",
            is_active: false,
            ended_at: new Date("2026-06-01T12:00:00.000Z"),
            draft_data: { delivery: { date: "2026-07-15" } },
          }],
        };
      }
      if (sql.includes("FROM shop_contract_items ci")) {
        return {
          rowCount: 1,
          rows: [{
            contract_id: 16,
            product_id: 4,
            product_name: "Resin",
            max_quantity: 20,
            used_quantity: 7,
            unit_price: 12500,
          }],
        };
      }
      return { rowCount: 1, rows: [] };
    },
    release() {},
  });
  try {
    const summaries = await getCustomerOrderContractSummaries(9, [81, 82, 81]);
    const summary = summaries.get(81);
    assert.ok(summary);
    assert.equal(summary.id, 16);
    assert.equal(summary.number, "C2601111");
    assert.equal(summary.isActive, false);
    assert.equal(summary.endedAt, "2026-06-01T12:00:00.000Z");
    assert.equal(summary.deliveryDate, "2026-07-15");
    assert.equal(summary.deliveryDateStatus, "valid");
    assert.equal(summary.remainingQuantity, 13);
    assert.equal(summary.remainingValue, 162500);
    assert.equal(summary.currency, "IQD");
    assert.deepEqual(summary.items, [{
      productId: 4,
      productName: "Resin",
      maxQuantity: 20,
      usedQuantity: 7,
      remainingQuantity: 13,
      unitPrice: 12500,
    }]);
    assert.equal(summaries.has(82), false);

    const ownershipQuery = statements.find(({ sql }) => sql.includes("FROM customer_orders co"))!;
    assert.match(ownershipQuery.sql, /co\.customer_id = \$2/);
    assert.match(ownershipQuery.sql, /c\.customer_id = \$2/);
    assert.match(ownershipQuery.sql, /co\.id = ANY\(\$1::integer\[\]\)/);
    assert.doesNotMatch(ownershipQuery.sql, /c\.is_active\s*=\s*true/);
    assert.deepEqual(ownershipQuery.params, [[81, 82], 9]);

    const activeLinesQuery = statements.find(({ sql }) => sql.includes("FROM shop_contract_items ci"))!;
    assert.match(activeLinesQuery.sql, /ci\.is_active = true/);
    assert.deepEqual(activeLinesQuery.params, [[16]]);
  } finally {
    (pool as any).connect = originalConnect;
  }
});

test("delivery date distinguishes unset, valid, and unparseable legacy values", () => {
  const makeSummary = (date: unknown) => buildShopContractSummary({
    id: 1,
    number: "C1",
    isActive: true,
    endedAt: null,
    draftData: date === undefined ? null : { delivery: { date } },
  }, []);

  assert.deepEqual(
    [makeSummary(undefined).deliveryDate, makeSummary(undefined).deliveryDateStatus],
    [null, "unset"],
  );
  assert.deepEqual(
    [makeSummary("").deliveryDate, makeSummary("").deliveryDateStatus],
    [null, "unset"],
  );
  assert.deepEqual(
    [makeSummary("2026-02-29").deliveryDate, makeSummary("2026-02-29").deliveryDateStatus],
    [null, "unparseable"],
  );
  assert.deepEqual(
    [makeSummary(" 2026-07-15 ").deliveryDate, makeSummary(" 2026-07-15 ").deliveryDateStatus],
    [null, "unparseable"],
  );
  assert.deepEqual(
    [makeSummary("2028-02-29").deliveryDate, makeSummary("2028-02-29").deliveryDateStatus],
    ["2028-02-29", "valid"],
  );
});

test("missing summaries preserve an order's existing contract ID and C-number", () => {
  const existing = {
    id: 81,
    contractId: 16,
    contractNumber: "C2601111",
    orderNumber: "M2600081",
    orderCategory: "regular",
  };
  assert.deepEqual(enrichOrderWithContractSummary(existing, null), {
    ...existing,
    contractSummary: null,
  });

  const currentSummary = buildShopContractSummary({
    id: 16,
    number: "C2601111-1",
    isActive: false,
    endedAt: null,
    draftData: null,
  }, []);
  const enriched = enrichOrderWithContractSummary(existing, currentSummary);
  assert.equal(enriched.contractId, 16);
  assert.equal(enriched.contractNumber, "C2601111-1");
  assert.equal(enriched.contractSummary, currentSummary);
  assert.equal(enriched.orderCategory, "regular");
});