import { strict as assert } from "node:assert";
import test from "node:test";
import { loadingCaptureSchema } from "@shared/accounting-loading-capture";
import type { LoadingCaptureContext, LoadingCaptureScope } from "@shared/accounting-loading-capture";
import { buildLoadingCapturePayload, captureContextMatchesScope, captureScopeMatchesDraft, dateIsWithinCompanyDay, decimalSum, decimalsEqual, normalizeNumericField, type LoadingCaptureDraft } from "./loading-measurement-capture-form";

const baseDraft = (): LoadingCaptureDraft => ({
  companyId: "۹", orderId: "۱۲۴", sourceId: "بار-۰۷ / Load", eventDate: "۲۰۲۵-۰۳-۰۹", weighbridgeReference: "قبض باسکول ٧/م",
  actualWeightTons: "12.375", lines: [{ orderItemId: 31, actualWeightTons: "12.375" }],
  inventoryCosts: [{ orderItemId: 31, batchReference: "بچ-٠٧", documentReference: "INV-ف/12", weightTons: "12.375", amount: "۸۷.٥٠", currency: "USD" }],
});

test("numeric normalization is confined to numeric values and decimal summation remains exact", () => {
  assert.equal(normalizeNumericField("۱۲۳٫۵٠"), "123.50");
  assert.equal(decimalSum(["0.1", "0.02", "1.880"]), "2");
  assert.equal(decimalsEqual("12.375000", "۱۲٫۳۷۵"), true);
  assert.equal(decimalsEqual("0.1", "0.1001"), false);
});

test("capture payload preserves Unicode references, normalizes numerics, and keeps costs as decimal strings", () => {
  const payload = buildLoadingCapturePayload(baseDraft());
  assert.deepEqual(payload, {
    companyId: 9, orderId: 124, sourceId: "بار-۰۷ / Load", eventDate: "2025-03-09", weighbridgeReference: "قبض باسکول ٧/م",
    actualWeightTons: "12.375", lines: [{ orderItemId: 31, actualWeightTons: "12.375" }],
    inventoryCosts: [{ orderItemId: 31, batchReference: "بچ-٠٧", documentReference: "INV-ف/12", weightTons: "12.375", amount: "87.50", currency: "USD" }],
  });
  assert.equal(typeof payload.inventoryCosts?.[0].amount, "string");
  assert.equal(loadingCaptureSchema.safeParse(payload).success, true);
});

test("strict shared schema rejects omitted and malformed evidence fields without inventing defaults", () => {
  const valid = buildLoadingCapturePayload(baseDraft());
  const row = valid.inventoryCosts![0];
  assert.equal(loadingCaptureSchema.safeParse({ ...valid, inventoryCosts: [{ ...row, amount: "" }] }).success, false);
  assert.equal(loadingCaptureSchema.safeParse({ ...valid, inventoryCosts: [{ ...row, documentReference: undefined }] }).success, false);
  assert.equal(loadingCaptureSchema.safeParse({ ...valid, actualWeightTons: "0" }).success, false);
});

test("opaque business order-number lookup resolves and guards the returned native ID", () => {
  const numberScope: LoadingCaptureScope = { companyId: 9, orderNumber: "M٢٦٠١٣٠٣" };
  const context = {
    company: { id: 9, name: "Momtazcom" }, order: { id: 880, number: "M٢٦٠١٣٠٣", currency: "USD", snapshotVersion: 2 },
  } as LoadingCaptureContext;
  assert.equal(captureScopeMatchesDraft(numberScope, "۹", "number", "M٢٦٠١٣٠٣", true), true);
  assert.equal(captureScopeMatchesDraft(numberScope, "۹", "number", "M2601303", true), false);
  assert.equal(captureContextMatchesScope(numberScope, context), true);
  assert.equal(captureContextMatchesScope({ companyId: 9, orderId: 881 }, context), false);
  assert.equal(buildLoadingCapturePayload({ ...baseDraft(), companyId: "9", orderId: String(context.order.id) }).orderId, 880);
});

test("capture date guard respects the company's Gregorian local day", () => {
  assert.equal(dateIsWithinCompanyDay("2025-03-09", "2025-03-09"), true);
  assert.equal(dateIsWithinCompanyDay("2025-03-10", "2025-03-09"), false);
  assert.equal(dateIsWithinCompanyDay("", "2025-03-09"), false);
});