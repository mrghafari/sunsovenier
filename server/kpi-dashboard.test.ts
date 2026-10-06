import test from "node:test";
import assert from "node:assert/strict";
import { eligibleOrder, groupEligibleOrdersByCurrency, percentage } from "./kpi-dashboard";

test("excludes cancelled, failed, deleted and failed-payment orders", () => {
  const source = [
    { status: "confirmed", payment_status: "paid", currency: "USD", total_amount: "12" },
    { status: "cancelled", payment_status: "paid", currency: "USD", total_amount: "99" },
    { status: "confirmed", payment_status: "failed", currency: "USD", total_amount: "99" },
    { status: "deleted", payment_status: "paid", currency: "USD", total_amount: "99" },
  ];
  assert.equal(source.filter(eligibleOrder).length, 1);
  assert.deepEqual(groupEligibleOrdersByCurrency(source), [{ currency: "USD", revenue: 12, orders: 1, averageOrderValue: 12 }]);
});

test("keeps currency groups separate and chooses largest order group first", () => {
  const groups = groupEligibleOrdersByCurrency([
    { status: "confirmed", payment_status: "paid", currency: "EUR", total_amount: 10 },
    { status: "confirmed", payment_status: "paid", currency: "USD", total_amount: 20 },
    { status: "confirmed", payment_status: "paid", currency: "USD", total_amount: 30 },
  ]);
  assert.deepEqual(groups.map(group => group.currency), ["USD", "EUR"]);
  assert.equal(groups[0].averageOrderValue, 25);
});

test("returns null for percentage with no denominator", () => {
  assert.equal(percentage(0, 0), null);
  assert.equal(percentage(2, 4), 50);
});