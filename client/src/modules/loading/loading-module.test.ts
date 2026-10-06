import test from "node:test";
import assert from "node:assert/strict";
import { LOADING_SECTIONS, type LoadingFoundation } from "@shared/loading/contracts";
import { authorizedLoadingSections, hasLoadingSectionAccess } from "./sections";
import { isLoadingFoundationEnabled } from "./use-loading-foundation";

const foundation = (overrides: Partial<LoadingFoundation> = {}): LoadingFoundation => ({
  enabled: true,
  phase: 2,
  inventoryMode: "module-owned-simulation",
  realInventoryEnabled: false,
  financialPostingEnabled: false,
  schemaReady: true,
  missingTables: [],
  actor: { namespace: "admin", id: 17 },
  roles: ["weighbridge_operator"],
  sections: [...LOADING_SECTIONS],
  states: [],
  workflowApiAvailable: false,
  ...overrides,
});

test("foundation query is enabled only by an explicit enabled flag", () => {
  assert.equal(isLoadingFoundationEnabled(undefined), false);
  assert.equal(isLoadingFoundationEnabled({ enabled: false, phase: 2, inventoryMode: "module-owned-simulation", realInventoryEnabled: false, financialPostingEnabled: false }), false);
  assert.equal(isLoadingFoundationEnabled({ enabled: true, phase: 2, inventoryMode: "module-owned-simulation", realInventoryEnabled: false, financialPostingEnabled: false }), true);
});

test("server sections are narrowed by verified role policy and stable contract order", () => {
  const selected = authorizedLoadingSections(foundation({ sections: ["settings", "overview", "weighbridge", "loading"] }));
  assert.deepEqual(selected, ["overview", "weighbridge"]);
  assert.equal(hasLoadingSectionAccess(foundation(), "weighbridge"), true);
  assert.equal(hasLoadingSectionAccess(foundation(), "loading"), false);
});

test("manager access remains limited to sections actually granted by foundation", () => {
  const selected = authorizedLoadingSections(foundation({ roles: ["loading_manager"], sections: ["overview", "orders"] }));
  assert.deepEqual(selected, ["overview", "orders"]);
});