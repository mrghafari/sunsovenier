import assert from "node:assert/strict";
import test from "node:test";
import { challengeInput, completionInput, signingDocument, otpHash, otpMatches, maskedEmail } from "./contract-signing-domain";
import { contractEmailDefaults, fillContractEmail } from "./contract-signing-email";

const contract = { id: 1, number: "TEST-C", terms: "شرایط اصلی قرارداد", is_active: true, ended_at: null, draft_data: { language: "fa" } };
test("version hashes freeze text, identity and language, not usage counters", () => {
  const doc = signingDocument(contract);
  assert.equal(doc.versionHash, signingDocument({ ...contract, items: [{ usedQuantity: 500 }] }).versionHash);
  assert.notEqual(doc.versionHash, signingDocument({ ...contract, terms: "متن تغییر کرد" }).versionHash);
  assert.notEqual(doc.versionHash, signingDocument({ ...contract, draft_data: { language: "ar" } }).versionHash);
  assert.equal(signingDocument({ ...contract, is_active: false }).canSign, false);
  assert.equal(signingDocument({ ...contract, ended_at: new Date() }).canSign, false);
  assert.equal(signingDocument({ ...contract, terms: " " }).canSign, false);
});
test("original agreement is not silently replaced by the latest addendum", () => {
  const current = { ...contract, terms: "آخرین متمم", original_contract_snapshot: { terms: "اصل توافق", draftData: { language: "fa" } } };
  assert.equal(signingDocument(current).terms, "اصل توافق");
  const addendum = signingDocument(current, { id: 2, number: "TEST-C-1", contract_snapshot: { terms: "متن متمم", draftData: { language: "ar" } } });
  assert.equal(addendum.terms, "متن متمم");
  assert.equal(addendum.language, "ar");
  assert.equal(addendum.key, "addendum:2");
});
test("bounded handwritten ink and explicit consent are required", () => {
  const good = { documentKey: "contract:1", versionHash: signingDocument(contract).versionHash,
    signerName: "Test Signer", consent: true, strokes: [[{ x: .1, y: .1 }, { x: .8, y: .8 }]] };
  assert.equal(challengeInput.safeParse(good).success, true);
  for (const invalid of [
    { ...good, consent: false }, { ...good, strokes: [] }, { ...good, signerName: "" },
    { ...good, strokes: [[{ x: -.1, y: .1 }, { x: .8, y: .8 }]] },
    { ...good, strokes: [[{ x: .1, y: .1 }, { x: .101, y: .1 }]] },
    { ...good, documentKey: "contract:0" }, { ...good, customerId: 2 },
    { ...good, strokes: Array(4).fill(Array(2000).fill({ x: .1, y: .1 })) },
  ]) assert.equal(challengeInput.safeParse(invalid).success, false);
});
test("OTP is keyed to the challenge; Persian and Arabic digits are accepted", () => {
  const hash = otpHash("nonce", "123456", "test-secret");
  assert.equal(otpMatches("nonce", "123456", hash, "test-secret"), true);
  assert.equal(otpMatches("other-nonce", "123456", hash, "test-secret"), false);
  assert.equal(otpMatches("nonce", "123457", hash, "test-secret"), false);
  const id = "00000000-0000-4000-8000-000000000001";
  assert.equal(completionInput.parse({ challengeId: id, code: "۱۲۳۴۵۶" }).code, "123456");
  assert.equal(completionInput.parse({ challengeId: id, code: "١٢٣٤٥٦" }).code, "123456");
  assert.equal(completionInput.safeParse({ challengeId: id, code: "12345" }).success, false);
  assert.equal(maskedEmail("synthetic@example.invalid"), "s***@example.invalid");
});
test("OTP and signed-copy templates exist in four languages and escape injected values", () => {
  const defaults = contractEmailDefaults();
  assert.equal(defaults.length, 8);
  for (const template of defaults) {
    const variables = Object.fromEntries(template.variables.map(key => [key, "<img src=x>"]));
    assert.ok(fillContractEmail(template.html, variables, true).includes("&lt;img"));
    assert.ok(!fillContractEmail(template.html, variables, true).includes("<img"));
  }
  assert.throws(() => fillContractEmail("{{unknown}}", {}));
});
