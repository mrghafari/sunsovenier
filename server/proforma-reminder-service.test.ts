import test from "node:test";
import assert from "node:assert/strict";
import {
  channelsForMethod,
  localDateAndHour,
  reminderWindowHasOpened,
  renderReminderTemplate,
  validReminderSchedule,
} from "./proforma-reminder-service";

test("renders repeated legacy and modern reminder placeholders", () => {
  const rendered = renderReminderTemplate(
    "{{customer_name}} / {order_number} / {{customer_name}}",
    { customer_name: "Ali", order_number: "M-100" },
  );
  assert.equal(rendered, "Ali / M-100 / Ali");
});

test("rejects unresolved reminder placeholders", () => {
  assert.throws(
    () => renderReminderTemplate("Hello {{missing_value}}", {}),
    /Unresolved template variables/,
  );
});

test("selects independent channels from configured method", () => {
  assert.deepEqual(channelsForMethod("email"), ["email"]);
  assert.deepEqual(channelsForMethod("sms"), ["sms"]);
  assert.deepEqual(channelsForMethod("both"), ["email", "sms"]);
  assert.throws(() => channelsForMethod("push"), /notificationMethod/);
});

test("validates schedule numeric ranges and method", () => {
  assert.deepEqual(
    validReminderSchedule({ reminderHour: 14, daysBefore: 2, notificationMethod: "both", priority: 1 }),
    { ok: true },
  );
  assert.equal(validReminderSchedule({ reminderHour: 24, daysBefore: 2, notificationMethod: "email", priority: 1 }).ok, false);
  assert.equal(validReminderSchedule({ reminderHour: 10, daysBefore: -1, notificationMethod: "email", priority: 1 }).ok, false);
  assert.equal(validReminderSchedule({ reminderHour: 10, daysBefore: 1, notificationMethod: "push", priority: 1 }).ok, false);
});

test("computes local date and hour in the configured timezone", () => {
  const instant = new Date("2026-09-20T10:30:00.000Z");
  assert.deepEqual(localDateAndHour(instant, "Asia/Tehran"), { date: "2026-09-20", hour: 14 });
  assert.deepEqual(localDateAndHour(instant, "UTC"), { date: "2026-09-20", hour: 10 });
});

test("catches up reminders after the configured hour instead of missing them", () => {
  assert.equal(reminderWindowHasOpened(9, 10), false);
  assert.equal(reminderWindowHasOpened(10, 10), true);
  assert.equal(reminderWindowHasOpened(15, 10), true);
});