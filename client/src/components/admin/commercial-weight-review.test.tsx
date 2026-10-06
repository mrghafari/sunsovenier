import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CommercialWeightReview } from "@shared/accounting-commercial-weight";
import {
  CommercialWeightApprovalProvenance,
  CommercialWeightPermissionNotice,
  CommercialWeightStatus,
  StaleWeightReviewNotice,
  canApproveCommercialWeight,
  commercialWeightStatusLabel,
  reloadWeightReview,
} from "./commercial-weight-review";
import { commercialSelectionFromUrl, isLegacyContractsDeepLink } from "./commercial-selection";

const review: CommercialWeightReview = {
  companyId: 4,
  orderId: 81,
  orderNumber: "M-2081",
  historyKey: "a".repeat(64),
  canApprove: true,
  approved: false,
  postingAllowed: false,
  approval: null,
  weightControl: {
    status: "WITHIN_CONTRACT",
    orderedWeightTons: "20",
    loadedWeightTons: "19.4",
    excessWeightTons: "0",
    allowedWeightTons: "21",
    allowancePercent: "5",
    contractNumber: "CT-19",
    loadingCount: 2,
    reviewDepartment: "commercial",
    postingAllowed: false,
  },
};

test("renders actual localized weight labels, including unknown and exceeded status fallbacks", () => {
  const within = renderToStaticMarkup(createElement(CommercialWeightStatus, { language: "en", status: "WITHIN_CONTRACT" }));
  const exceeded = renderToStaticMarkup(createElement(CommercialWeightStatus, { language: "en", status: "CONTRACT_LIMIT_EXCEEDED" }));
  const unknown = renderToStaticMarkup(createElement(CommercialWeightStatus, { language: "en", status: "FUTURE_STATUS" }));
  assert.match(within, /Within contractual allowance/);
  assert.match(exceeded, /Contract limit exceeded/);
  assert.match(exceeded, /Approval is blocked/);
  assert.match(unknown, /Loading history is invalid/);
  assert.match(unknown, /Approval is blocked/);
  assert.equal(commercialWeightStatusLabel("fa", "CONTRACT_LIMIT_EXCEEDED"), "بیش از حد قرارداد");
});

test("approval permission follows status, API capability, approval state, and stale-review gate", () => {
  assert.equal(canApproveCommercialWeight(review, false), true);
  for (const status of ["CONTRACT_LIMIT_EXCEEDED", "CONTRACT_TERMS_REQUIRED", "ORDER_WEIGHT_REQUIRED", "INVALID_LOADING_HISTORY"]) {
    const blocked = { ...review, weightControl: { ...review.weightControl, status } } as CommercialWeightReview;
    assert.equal(canApproveCommercialWeight(blocked, false), false, `${status} must block approval`);
  }
  assert.equal(canApproveCommercialWeight({ ...review, canApprove: false }, false), false);
  assert.equal(canApproveCommercialWeight({ ...review, approved: true }, false), false);
  assert.equal(canApproveCommercialWeight({ ...review, approval: { actorId: "custom-user-id", actorType: "custom", evidenceReference: "DOC-123", reason: "Verified loading", approvedAt: "2026-04-11T10:00:00Z" } }, false), false);
  assert.equal(canApproveCommercialWeight(review, true), false);
  assert.match(renderToStaticMarkup(createElement(CommercialWeightPermissionNotice, { language: "en", canManage: false })), /read-only/);
  assert.match(renderToStaticMarkup(createElement(CommercialWeightPermissionNotice, { language: "en", canManage: true })), /Approval is blocked/);
});

test("stale review presentation requires explicit reload; reload clears confirmation before fetching", async () => {
  const markup = renderToStaticMarkup(createElement(StaleWeightReviewNotice, { language: "en", onReload: () => {}, disabled: false }));
  assert.match(markup, /This review changed before approval/);
  assert.match(markup, /Reload review/);
  let confirmed = true;
  const order: string[] = [];
  await reloadWeightReview(
    () => { confirmed = false; order.push("confirmation-cleared"); },
    async () => { assert.equal(confirmed, false); order.push("fresh-review-requested"); },
  );
  assert.deepEqual(order, ["confirmation-cleared", "fresh-review-requested"]);
});

test("approval provenance renders actor IDs verbatim, including UUID identities", () => {
  const actorId = "3bc4f6f9-7901-4b0f-a428-5ce3e5cb1dc7";
  const html = renderToStaticMarkup(createElement(CommercialWeightApprovalProvenance, {
    language: "en",
    approval: { actorType: "custom", actorId, evidenceReference: "DOC-2026-51", reason: "Verified scale records", approvedAt: "2026-04-11T10:25:00.000Z" },
  }));
  assert.ok(html.includes(actorId));
  assert.ok(!html.includes(`#${actorId}`));
});

test("weight review deep links select and persist the new sales subsection without changing old redirects", () => {
  assert.deepEqual(commercialSelectionFromUrl("?unit=sales&tab=weight-reviews"), { section: "weight-reviews", tab: "weight-reviews" });
  assert.deepEqual(commercialSelectionFromUrl("?unit=sales&group=weight-reviews"), { section: "store", tab: "orders" });
  assert.equal(isLegacyContractsDeepLink("?unit=sales&tab=contracts"), true);
  assert.deepEqual(commercialSelectionFromUrl("?unit=sales&tab=contracts"), { section: "store", tab: "orders" });
  assert.deepEqual(commercialSelectionFromUrl("?unit=procurement&tab=bulk-purchases"), { section: "store", tab: "bulk-purchases" });
});
