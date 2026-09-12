import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const root = process.cwd();
const configPath = path.join(root, "tsconfig.json");
const baselinePath = path.join(root, "typecheck-baseline.json");
const updateBaseline = process.argv.includes("--update");
const formatHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: () => root,
  getNewLine: () => ts.sys.newLine,
};

function fail(message) {
  console.error(`Type-check baseline error: ${message}`);
  process.exit(2);
}

function normalizeText(text) {
  return ts.flattenDiagnosticMessageText(text, "\n").replaceAll(root, "<root>");
}

function sourceContext(diagnostic) {
  if (!diagnostic.file || diagnostic.start === undefined) return "";

  const source = diagnostic.file.text;
  const start = diagnostic.start;
  const lineStart = source.lastIndexOf("\n", start - 1) + 1;
  const lineEndIndex = source.indexOf("\n", start);
  const lineEnd = lineEndIndex === -1 ? source.length : lineEndIndex;
  return source.slice(lineStart, lineEnd).trim().replace(/\s+/g, " ");
}

function diagnosticKey(diagnostic) {
  const file = diagnostic.file
    ? path.relative(root, diagnostic.file.fileName).replaceAll(path.sep, "/")
    : "<global>";
  return JSON.stringify([
    file,
    diagnostic.code,
    normalizeText(diagnostic.messageText),
    sourceContext(diagnostic),
  ]);
}

function countDiagnostics(diagnostics) {
  const counts = new Map();
  for (const diagnostic of diagnostics) {
    const key = diagnosticKey(diagnostic);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function sortedEntries(counts) {
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => ({ key, count }));
}

function configFingerprint(configText) {
  return createHash("sha256").update(configText).digest("hex");
}

const configText = await readFile(configPath, "utf8").catch((error) =>
  fail(`cannot read tsconfig.json: ${error.message}`),
);
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
if (configFile.error) {
  console.error(ts.formatDiagnostic(configFile.error, formatHost));
  process.exit(2);
}

const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
if (parsed.errors.length > 0) {
  console.error(ts.formatDiagnostics(parsed.errors, formatHost));
  process.exit(2);
}

const program = ts.createProgram({
  rootNames: parsed.fileNames,
  options: parsed.options,
  projectReferences: parsed.projectReferences,
});
const diagnostics = ts.getPreEmitDiagnostics(program);
const currentCounts = countDiagnostics(diagnostics);
const metadata = {
  typescriptVersion: ts.version,
  tsconfigSha256: configFingerprint(configText),
};

if (updateBaseline) {
  const baseline = {
    metadata,
    diagnostics: sortedEntries(currentCounts),
  };
  await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(
    `Updated type-check baseline with ${diagnostics.length} diagnostics in ${currentCounts.size} groups.`,
  );
  process.exit(0);
}

const baseline = await readFile(baselinePath, "utf8")
  .then(JSON.parse)
  .catch((error) => fail(`cannot read valid typecheck-baseline.json: ${error.message}`));

if (
  baseline.metadata?.typescriptVersion !== metadata.typescriptVersion ||
  baseline.metadata?.tsconfigSha256 !== metadata.tsconfigSha256
) {
  fail(
    "TypeScript or tsconfig.json changed. Review raw diagnostics, then deliberately run npm run check:baseline:update.",
  );
}

if (!Array.isArray(baseline.diagnostics)) {
  fail("baseline diagnostics are missing or invalid");
}

const baselineCounts = new Map(
  baseline.diagnostics.map(({ key, count }) => [key, count]),
);
const newDiagnostics = [];
let resolvedCount = 0;

for (const diagnostic of diagnostics) {
  const key = diagnosticKey(diagnostic);
  const remaining = baselineCounts.get(key) ?? 0;
  if (remaining > 0) {
    baselineCounts.set(key, remaining - 1);
  } else {
    newDiagnostics.push(diagnostic);
  }
}

for (const count of baselineCounts.values()) resolvedCount += count;

console.log(
  `Type-check: ${diagnostics.length} current, ${diagnostics.length - newDiagnostics.length} baselined, ${newDiagnostics.length} new, ${resolvedCount} resolved.`,
);

if (resolvedCount > 0) {
  console.error(
    "Some baseline diagnostics were resolved. Review the raw result and run npm run check:baseline:update to remove stale allowances.",
  );
}

if (newDiagnostics.length > 0) {
  console.error("\nNew TypeScript diagnostics:\n");
  console.error(ts.formatDiagnosticsWithColorAndContext(newDiagnostics, formatHost));
}

if (newDiagnostics.length > 0 || resolvedCount > 0) process.exit(1);