import assert from "node:assert/strict";
import test from "node:test";
import {
  LogisticsDeliveryNotificationValidationError,
  parseTemplateIds,
  renderDeliveryTemplate,
  updateSettings,
  validateEmailTemplateBodies,
  validateTemplateBody,
  validateTemplateIdMap,
  validateTemplatePlaceholders,
} from "./logistics-delivery-notification-settings";

test("template maps parse into supported language selections", () => {
  assert.deepEqual(parseTemplateIds('{"en":12,"fa":null}'), {
    en: 12, fa: null, ar: null, tr: null,
  });
  assert.throws(
    () => parseTemplateIds('{"xx":12}'),
    LogisticsDeliveryNotificationValidationError,
  );
  assert.throws(
    () => validateTemplateIdMap({ en: 0 }, "smsTemplateIds"),
    LogisticsDeliveryNotificationValidationError,
  );
});

test("request bodies reject empty, non-object, and unknown settings", async () => {
  await assert.rejects(updateSettings(null), LogisticsDeliveryNotificationValidationError);
  await assert.rejects(updateSettings({}), LogisticsDeliveryNotificationValidationError);
  await assert.rejects(
    updateSettings({ smsTemplateIds: {}, unrelated: true }),
    LogisticsDeliveryNotificationValidationError,
  );
});

test("selected template body requires delivery code and supported placeholders", () => {
  assert.throws(
    () => validateTemplateBody("Your order is ready", "sms", "en"),
    /delivery_code/,
  );
  assert.throws(
    () => validateTemplateBody("Code {{verification_code}}", "sms", "en"),
    /unsupported placeholder/,
  );
  assert.throws(
    () => validateTemplatePlaceholders("{{customer_email}}", "email", "en"),
    /unsupported placeholder/,
  );
});

test("email template requires delivery code in each sent body", () => {
  assert.doesNotThrow(() => validateEmailTemplateBodies("<p>Code: {{delivery_code}}</p>", null, "en"));
  assert.doesNotThrow(() => validateEmailTemplateBodies("", "Code: {{delivery_code}}", "en"));
  assert.doesNotThrow(() => validateEmailTemplateBodies(
    "<p>HTML code: {{delivery_code}}</p>",
    "Text code: {{delivery_code}}",
    "en",
  ));
  assert.throws(
    () => validateEmailTemplateBodies("<p>Code pending</p>", null, "en"),
    /delivery_code/,
  );
  assert.throws(
    () => validateEmailTemplateBodies('<p data-code="{{delivery_code}}">Code pending</p>', null, "en"),
    /delivery_code/,
  );
  assert.throws(
    () => validateEmailTemplateBodies(
      "<p>HTML code: {{delivery_code}}</p>",
      "Code pending",
      "en",
    ),
    /delivery_code/,
  );
  assert.throws(
    () => validateEmailTemplateBodies(
      "<p>HTML code pending</p>",
      "Text code: {{delivery_code}}",
      "en",
    ),
    /delivery_code/,
  );
});

test("delivery template renders allowed variables and escapes HTML values", () => {
  const variables = {
    customer_name: "<Customer & Co>",
    order_number: "ORD-4",
    delivery_code: "1234",
  };
  assert.equal(
    renderDeliveryTemplate("{{customer_name}}: {{order_number}} / {{delivery_code}}", variables),
    "<Customer & Co>: ORD-4 / 1234",
  );
  assert.equal(
    renderDeliveryTemplate("{{customer_name}} {{delivery_code}}", variables, true),
    "&lt;Customer &amp; Co&gt; 1234",
  );
});