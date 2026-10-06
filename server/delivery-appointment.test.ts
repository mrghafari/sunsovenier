import assert from "node:assert/strict";
import test from "node:test";
import { getDestinationTimeZone, formatDeliveryAppointment } from "../shared/delivery-timezone";
import {
  resolveDestinationDeliveryAppointment,
  resolveLocalDeliveryAppointment,
} from "./delivery-appointment";

test("Tehran and Baghdad local delivery times resolve using destination offsets", () => {
  assert.equal(
    resolveDestinationDeliveryAppointment("2025-01-15T12:30", "Asia/Tehran", "Iran").toISOString(),
    "2025-01-15T09:00:00.000Z",
  );
  assert.equal(
    resolveDestinationDeliveryAppointment("2025-01-15T12:30", "Asia/Baghdad", "Iraq").toISOString(),
    "2025-01-15T09:30:00.000Z",
  );
});

test("local conversion handles UTC date rollover and rejects nonexistent or ambiguous times", () => {
  assert.equal(
    resolveLocalDeliveryAppointment("2025-01-01T00:15", "Asia/Tehran").toISOString(),
    "2024-12-31T20:45:00.000Z",
  );
  assert.throws(
    () => resolveLocalDeliveryAppointment("2024-03-10T02:30", "America/New_York"),
    /does not exist/,
  );
  assert.throws(
    () => resolveLocalDeliveryAppointment("2024-11-03T01:30", "America/New_York"),
    /ambiguous/,
  );
});

test("known destination country requires its mapped zone, unknown country needs a valid explicit zone", () => {
  assert.equal(getDestinationTimeZone("UAE"), "Asia/Dubai");
  assert.throws(
    () => resolveDestinationDeliveryAppointment("2025-01-15T12:30", "Europe/Istanbul", "Iraq"),
    /must match/,
  );
  assert.equal(
    resolveDestinationDeliveryAppointment("2025-01-15T12:30", "Europe/Paris", "France").toISOString(),
    "2025-01-15T11:30:00.000Z",
  );
  assert.equal(
    formatDeliveryAppointment("2025-01-15T09:00:00.000Z", "Asia/Tehran", "en-US"),
    "Jan 15, 2025, 12:30 PM",
  );
});