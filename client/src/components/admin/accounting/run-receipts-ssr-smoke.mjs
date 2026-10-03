import { build } from "esbuild";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../../../");
const temp = await mkdtemp(resolve(root, ".tmp-accounting-receipts-ssr-"));
try {
  const result = await build({
    absWorkingDir: root,
    entryPoints: [resolve(here, "receipts-ssr.test.tsx")],
    bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic",
    packages: "external", alias: { "@": resolve(root, "client/src"), "@shared": resolve(root, "shared") },
    logLevel: "silent",
  });
  const bundle = resolve(temp, "receipts-ssr.test.mjs");
  await writeFile(bundle, result.outputFiles[0].contents);
  const run = spawnSync(process.execPath, ["--test", bundle], { cwd: root, stdio: "inherit" });
  if (run.error) throw run.error;
  process.exitCode = run.status ?? 1;
} finally { await rm(temp, { recursive: true, force: true }); }