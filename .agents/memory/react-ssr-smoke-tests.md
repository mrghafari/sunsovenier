---
name: React SSR smoke tests
description: Avoid false failures when server-rendering isolated frontend components outside the Vite build.
---

Standalone TSX evaluation is not equivalent to rendering a component through the project's Vite build. Use an automatic JSX transform with workspace package resolution when doing isolated server-render smoke checks; compare normalized text rather than raw hydration markup.

**Why:** The project preserves JSX in TypeScript for Vite to transform. A standalone evaluator can instead emit classic JSX and fail with `React is not defined` despite a healthy app. Compiled files outside the workspace may not resolve installed React, and server rendering inserts comment nodes between adjacent text.

**How to apply:** Treat Vite/typecheck as the authoritative build checks. For supplemental SSR checks, compile with automatic JSX handling, resolve dependencies from the workspace, and strip hydration comments before checking visible text.