// Run after: npx vite build --manifest
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const directory = new URL("../dist/server/public/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL(".vite/manifest.json", directory), "utf8"));
const eager = new Set();
function visit(key) {
  assert.ok(manifest[key], `Missing build manifest entry: ${key}`);
  if (eager.has(key)) return;
  eager.add(key);
  for (const dependency of manifest[key].imports ?? []) visit(dependency);
}
visit("index.html");
visit("src/App.tsx");
for (const key of [
  "src/pages/admin/accounting-management.tsx",
  "src/pages/products.tsx",
  "src/pages/content-management.tsx",
  "src/pages/crm.tsx",
  "src/modules/loading/LoadingManagement.tsx",
]) {
  assert.ok(manifest[key]?.isDynamicEntry, `${key} must remain independently loadable`);
  assert.ok(!eager.has(key), `${key} must not block public startup`);
}
const bytes = (await Promise.all([...eager].map(async key =>
  (await stat(new URL(manifest[key].file, directory))).size,
))).reduce((sum, size) => sum + size, 0);
assert.ok(bytes < 3_000_000, `Initial JavaScript exceeds 3 MB: ${bytes} bytes`);
console.log(`Startup bundle: ${bytes.toLocaleString()} uncompressed JavaScript bytes; heavy management pages stay deferred.`);
