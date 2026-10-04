import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { LOADING_SECTIONS, type LoadingFoundation, type LoadingModuleStatus } from "@shared/loading/contracts";
import { LoadingFoundationView } from "./LoadingManagement";

const base: LoadingModuleStatus = {
  enabled: true,
  phase: 2,
  inventoryMode: "module-owned-simulation",
  realInventoryEnabled: false,
  financialPostingEnabled: false,
};
const foundation: LoadingFoundation = {
  ...base,
  schemaReady: false,
  missingTables: ["loading_orders"],
  actor: { namespace: "admin", id: 24 },
  roles: ["weighbridge_operator"],
  sections: [...LOADING_SECTIONS],
  states: [],
  workflowApiAvailable: false,
};

test("disabled flag never renders operational foundation content", () => {
  const html = renderToString(<LoadingFoundationView status={{ ...base, enabled: false }} foundation={foundation} section="overview" language="en"/>);
  assert.match(html, /Module unavailable/i);
  assert.doesNotMatch(html, /loading_orders|Foundation status|Phase boundary/);
});

test("read-only overview renders real schema and verified role facts", () => {
  const html = renderToString(<LoadingFoundationView status={base} foundation={foundation} section="overview" language="en"/>);
  assert.match(html, /loading_orders/);
  assert.match(html, /Weighbridge operator/);
  assert.match(html, /Schema is not ready/);
  assert.match(html, /Workflow API unavailable/);
});

test("role-sensitive section route is explicitly denied", () => {
  const html = renderToString(<LoadingFoundationView status={base} foundation={foundation} section="loading" language="en"/>);
  assert.match(html, /Access denied/);
  assert.doesNotMatch(html, /Not operational yet/);
});