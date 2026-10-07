import test from "node:test";
import assert from "node:assert/strict";
import { isValidFinancialApprovalReason } from "./financial-approval";

test("financial approval rejects missing, whitespace and short reasons", () => {
  for (const notes of [undefined, null, 12345, "", "     ", "abcd", "  abcd  "]) {
    assert.equal(isValidFinancialApprovalReason(notes), false);
  }
});

test("financial approval accepts staff explanations in all site languages", () => {
  for (const notes of ["Receipt reviewed", "مدرک پرداخت بررسی شد", "تمت مراجعة الإيصال", "Dekont incelendi"]) {
    assert.equal(isValidFinancialApprovalReason(notes), true);
  }
});

test("financial approval respects the existing server length boundaries", () => {
  assert.equal(isValidFinancialApprovalReason("a".repeat(5)), true);
  assert.equal(isValidFinancialApprovalReason("a".repeat(500)), true);
  assert.equal(isValidFinancialApprovalReason("a".repeat(501)), false);
});
