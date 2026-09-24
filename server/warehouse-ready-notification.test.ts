import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_READY_EMAIL_TEXT,
  DEFAULT_READY_SMS_TEXT,
  readyTemplateIdForLanguage,
  readyTemplateMatchesLanguage,
  type ReadyNotificationSettings,
} from "./warehouse-ready-notification";

const settings: ReadyNotificationSettings = {
  emailEnabled: true,
  smsEnabled: true,
  emailTemplateId: 11,
  smsTemplateId: 22,
  emailTemplateIds: { fa: 32, en: 11, ar: null },
  smsTemplateIds: { fa: 2, en: null },
  senderCategoryKey: "notifications",
};

test("selected recipient language uses its own email and SMS template", () => {
  assert.equal(readyTemplateIdForLanguage(settings, "email", "fa"), 32);
  assert.equal(readyTemplateIdForLanguage(settings, "email", "en"), 11);
  assert.equal(readyTemplateIdForLanguage(settings, "sms", "fa"), 2);
});

test("explicit built-in selection overrides a legacy global template", () => {
  assert.equal(readyTemplateIdForLanguage(settings, "email", "ar"), null);
  assert.equal(readyTemplateIdForLanguage(settings, "sms", "en"), null);
});

test("a legacy or changed template is used only in its own language", () => {
  assert.equal(readyTemplateMatchesLanguage({ language: "en" }, "fa"), false);
  assert.equal(readyTemplateMatchesLanguage({ language: "fa" }, "fa"), true);
  assert.equal(readyTemplateMatchesLanguage({ language: "en_ar" }, "ar"), false);
  assert.equal(readyTemplateMatchesLanguage(undefined, "tr"), false);
});

test("all supported languages have built-in email and SMS text", () => {
  for (const language of ["en", "fa", "ar", "tr"]) {
    assert.ok(DEFAULT_READY_EMAIL_TEXT[language]);
    assert.ok(DEFAULT_READY_SMS_TEXT[language]);
  }
});