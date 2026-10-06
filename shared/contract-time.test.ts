import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getContractDeliveryTiming } from "./contract-time";

const today = new Date(2026, 9, 1, 23, 59);
test("future delivery dates use whole calendar days", () => {
  assert.deepEqual(getContractDeliveryTiming("2026-10-05", "valid", null, today), { state: "upcoming", days: 4 });
});
test("same day is due today, not expired at midnight", () => {
  assert.deepEqual(getContractDeliveryTiming("2026-10-01", "valid", null, today), { state: "today", days: 0 });
});
test("past delivery dates are overdue, not automatically ended", () => {
  assert.deepEqual(getContractDeliveryTiming("2026-09-28", "valid", null, today), { state: "overdue", days: 3 });
});
test("explicit ending takes precedence over a future deadline", () => {
  assert.deepEqual(getContractDeliveryTiming("2026-12-01", "valid", "2026-09-30T12:00:00Z", today), { state: "ended", days: null });
});
test("unset and unparseable legacy dates do not invent deadlines", () => {
  assert.deepEqual(getContractDeliveryTiming(null, "unset", null, today), { state: "unset", days: null });
  assert.deepEqual(getContractDeliveryTiming(null, "unparseable", null, today), { state: "unparseable", days: null });
  assert.deepEqual(getContractDeliveryTiming("2026-02-30", "valid", null, today), { state: "unparseable", days: null });
});