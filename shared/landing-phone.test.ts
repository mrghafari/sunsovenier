import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveLandingPhone } from "./landing-phone";

const legacy = { phoneLabel: "+964 (750) 000-0000", phoneHref: "tel:+9647500000000" };
test("existing published phones are retained until company settings override them", () => {
  assert.deepEqual(resolveLandingPhone(undefined, legacy), { label: legacy.phoneLabel, href: legacy.phoneHref });
  assert.deepEqual(resolveLandingPhone({}, legacy), { label: legacy.phoneLabel, href: legacy.phoneHref });
});
test("company phone changes both visible text and click-to-call target", () => {
  assert.deepEqual(resolveLandingPhone({ landingPhone: " +964 (750) 123-4567 " }, legacy),
    { label: "+964 (750) 123-4567", href: "tel:+9647501234567" });
});
test("clearing the company setting hides the phone instead of restoring the placeholder", () => {
  assert.equal(resolveLandingPhone({ landingPhone: "" }, legacy).label, "");
});
test("Persian and Arabic digits are supported without changing the displayed text", () => {
  assert.equal(resolveLandingPhone({ landingPhone: "+۹۶۴ ٧٥٠ ۱۲۳" }, legacy).href, "tel:+964750123");
});
