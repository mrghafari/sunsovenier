import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../client/public/sw.js", import.meta.url), "utf8");

function fixture(cached) {
  let resolveNetwork;
  let rejectNetwork;
  let triggerTimeout;
  const writes = [];
  const response = { ok: true, clone: () => "fresh-copy" };
  const context = vm.createContext({
    self: { addEventListener() {} },
    console,
    caches: {
      open: async () => ({
        match: async () => cached,
        put: async (...args) => { writes.push(args); },
      }),
    },
    fetch: () => new Promise((resolve, reject) => {
      resolveNetwork = resolve;
      rejectNetwork = reject;
    }),
    setTimeout: callback => { triggerTimeout = callback; return 1; },
    clearTimeout() {},
  });
  vm.runInContext(source, context);
  return {
    run: () => vm.runInContext('networkFirstWithCache("/assets/App.js", "test", 10000)', context),
    timeout: () => triggerTimeout(),
    succeed: () => resolveNetwork(response),
    fail: () => rejectNetwork(new Error("offline")),
    response,
    writes,
  };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test("uncached slow bundle remains pending after timeout, then loads successfully", async () => {
  const f = fixture(undefined);
  let settled = false;
  const result = f.run();
  result.then(() => { settled = true; }, () => { settled = true; });
  await flush();
  f.timeout();
  await flush();
  assert.equal(settled, false);
  f.succeed();
  assert.equal(await result, f.response);
  assert.equal(f.writes.length, 1);
});

test("timeout serves an existing cached copy while the network refreshes it", async () => {
  const cached = { marker: "offline-copy" };
  const f = fixture(cached);
  const result = f.run();
  await flush();
  f.timeout();
  assert.equal(await result, cached);
  f.succeed();
  await flush();
  assert.equal(f.writes.length, 1);
});

test("fast successful requests return and cache the network response", async () => {
  const f = fixture(undefined);
  const result = f.run();
  await flush();
  f.succeed();
  assert.equal(await result, f.response);
  assert.equal(f.writes.length, 1);
});

test("offline requests use cache, but genuine uncached failures reject", async () => {
  const cached = { marker: "offline-copy" };
  const hit = fixture(cached);
  const result = hit.run();
  await flush();
  hit.fail();
  assert.equal(await result, cached);
  const miss = fixture(undefined);
  const failure = miss.run();
  const rejected = assert.rejects(failure, /offline/);
  await flush();
  miss.fail();
  await rejected;
});
