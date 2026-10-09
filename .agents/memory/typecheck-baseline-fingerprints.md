---
name: Type-check baseline fingerprints
description: How to interpret baseline churn after additive Drizzle schema changes.
---

An additive Drizzle schema change can alter long inferred-type diagnostics, including counts such as “N more properties.” The baseline then reports old fingerprints as resolved and nearly identical diagnostics as new even when the underlying legacy errors did not change.

**Why:** The production build rejects any diagnostic whose complete normalized text is absent from the baseline. Schema type expansion can therefore block publishing without introducing a new behavioral defect.

**How to apply:** Compare the full new and resolved diagnostic groups after schema changes. If the affected call sites and error meaning are unchanged and only inferred-type text shifted, refresh the baseline, rerun the check, and execute the full production build.

Use the same increased Node heap for baseline regeneration as for the normal
check.

**Why:** Regeneration without a heap setting exhausted Node's default roughly
2 GB limit on this project's full type graph, although the 4 GB check succeeded.

**How to apply:** Invoke the existing baseline generator with
`node --max-old-space-size=4096 scripts/typecheck-baseline.mjs --update`;
review the resulting diff instead of treating an out-of-memory crash as a new
TypeScript error.