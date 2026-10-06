import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = resolve(fileURLToPath(new URL(".", import.meta.url)));
const root = resolve(here, "../../../../../");
const temp = await mkdtemp(resolve(root, ".tmp-accounting-partial-returns-"));
try {
  for (const entry of ["accounting-partial-returns-ssr.test.tsx", "accounting-partial-returns-api.test.ts"]) {
    const result = await build({
      absWorkingDir: root, entryPoints: [resolve(here, entry)],
      bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic", packages: "external",
      alias: { "@": resolve(root, "client/src"), "@shared": resolve(root, "shared") }, logLevel: "silent",
    });
    const bundle = resolve(temp, `${entry}.mjs`);
    await writeFile(bundle, result.outputFiles[0].contents);
    const run = spawnSync(process.execPath, ["--test", bundle], { cwd: root, stdio: "inherit" });
    if (run.error) throw run.error;
    if (run.status !== 0) process.exitCode = run.status ?? 1;
  }
} finally { await rm(temp, { recursive: true, force: true }); }
