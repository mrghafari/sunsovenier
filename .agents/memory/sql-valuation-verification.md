---
name: SQL valuation execution checks
description: Financial SQL functions need exercised valuations, not merely successful migration creation.
---

Creating a PL/pgSQL valuation function successfully does not prove its internal
queries are valid: local-variable versus column/alias ambiguity can appear only
when a particular valuation branch first executes.

**Why:** Both migration creation and static TypeScript checks passed while
different goods/receipt valuation branches raised deferred SQL name-resolution
errors.

**How to apply:** Keep local names distinct from query aliases and qualify
aggregate columns. Exercise base and foreign goods and receipt branches inside
rollback-only transactions before freezing a financial migration. A migration
that has already been applied must receive forward-only amendments, not edits.
