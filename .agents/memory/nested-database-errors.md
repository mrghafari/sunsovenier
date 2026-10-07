---
name: Nested database errors
description: Expected PostgreSQL conflicts can be hidden inside a Drizzle error cause.
---

Read SQLSTATE and constraint information from nested error causes, not only from the outer error.

**Why:** Drizzle's outer insert error did not expose the PostgreSQL code directly. Checking only the outer code turned an ordinary duplicate-plate conflict into a generic internal failure, obscuring the user's corrective action.

**How to apply:** When diagnosing or mapping database failures, inspect the bounded cause chain. Distinguish the specific constraint before explaining a conflict; do not assume every uniqueness failure is the same business-field duplicate. Do not return SQL, row values or stack traces to clients.
