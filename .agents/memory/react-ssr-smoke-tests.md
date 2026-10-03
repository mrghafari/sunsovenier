---
name: React SSR smoke tests
description: Avoid false failures when server-rendering isolated frontend components outside the Vite build.
---

Standalone TSX evaluation is not equivalent to rendering a component through the project's Vite build. Use an automatic JSX transform with workspace package resolution when doing isolated server-render smoke checks; compare normalized text rather than raw hydration markup.

**Why:** The project preserves JSX in TypeScript for Vite to transform. A standalone evaluator can instead emit classic JSX and fail with `React is not defined` despite a healthy app. Compiled files outside the workspace may not resolve installed React, and server rendering inserts comment nodes between adjacent text.

**How to apply:** Treat Vite/typecheck as the authoritative build checks. For supplemental SSR checks, compile with automatic JSX handling, resolve dependencies from the workspace, and strip hydration comments before checking visible text.

Render the actual production table/detail/result components in SSR tests. Tests of copy dictionaries, amount helpers or permission booleans alone are not UI-rendering verification.

**Why:** A suite named as an SSR smoke check initially exercised only helpers; it could pass without verifying that invoice allocations, event evidence or disabled action controls actually appeared in the workbench.

**How to apply:** Import the production presentation components, render realistic typed fixtures in all supported languages, and assert exact money, evidence, empty states and blocked controls in their output. Keep helper tests as complementary checks.