import assert from "node:assert/strict";
import test from "node:test";
import { getContractDraftActivationIssues, normalizeContractPaymentDays, shopContractDraftSchema } from "./contract-draft";
import { contractDraftActivationMessage, contractDraftIssueFieldId } from "../client/src/lib/contract-draft-validation";

const completeDraft = (days = "30") => shopContractDraftSchema.parse({
  version: 2, language: "en", dealType: "iran", date: "2026-10-08",
  seller: { name: "Seller", registration: "123", address: "Seller address", representative: "Seller agent", contact: "Seller contact" },
  buyer: { country: "Iraq", registration: "", address: "Buyer address", representative: "Buyer agent", contact: "" },
  productDetails: {}, payment: { method: "advance", days },
  delivery: { location: "Destination", date: "2026-10-09" }, disputeCity: "Dispute city",
});

test("complete contracts accept English, Persian, Arabic and mixed payment digits without changing the amount", () => {
  for (const days of ["30", "۳۰", "٣٠", " ۳٠ "]) {
    const draft = completeDraft(days);
    assert.equal(draft.payment.days, "30");
    assert.deepEqual(getContractDraftActivationIssues(draft), []);
    draft.payment.days = days;
    assert.deepEqual(getContractDraftActivationIssues(draft), []);
    assert.equal(normalizeContractPaymentDays(days), "30");
  }
});

test("zero, negative, fractional, invalid and unsafe payment periods stay blocked", () => {
  for (const days of ["", "0", "۰", "٠", "-1", "۱.۵", "30 days", "1e2", "9007199254740992"]) {
    assert.deepEqual(getContractDraftActivationIssues(completeDraft(days)), [{ field: "payment.days", reason: "days" }]);
  }
});

test("all missing fields are identified and seller omissions explain editable fields and company defaults in every language", () => {
  const draft = completeDraft();
  draft.seller.registration = "";
  draft.seller.contact = " ";
  draft.buyer.country = "";
  const issues = getContractDraftActivationIssues(draft);
  assert.deepEqual(issues.map(issue => issue.field), ["seller.registration", "seller.contact", "buyer.country"]);
  assert.equal(contractDraftIssueFieldId(issues[0]), "seller-registration");
  for (const language of ["en", "fa", "ar", "tr"] as const) {
    const message = contractDraftActivationMessage(issues, language);
    assert.ok(message.length > 80);
    assert.ok(!message.includes("seller.registration"));
    assert.match(message, /Company Information|اطلاعات شرکت|معلومات الشركة|Şirket Bilgileri/);
  }
});

test("real ISO dates are required for activation, while inactive drafts can still omit dates", () => {
  const draft = completeDraft();
  draft.date = "";
  draft.delivery.date = "";
  assert.ok(shopContractDraftSchema.safeParse(draft).success);
  assert.deepEqual(getContractDraftActivationIssues(draft), [
    { field: "date", reason: "date" }, { field: "delivery.date", reason: "date" },
  ]);
  draft.date = "2026-02-30";
  draft.delivery.date = "2026-10-09";
  assert.deepEqual(getContractDraftActivationIssues(draft), [{ field: "date", reason: "date" }]);
});
