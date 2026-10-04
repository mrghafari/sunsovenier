---
name: Composed financial constraints
description: Transaction-wide constraint modes when multiple financial operations share one transaction.
---

PostgreSQL SET CONSTRAINTS changes the enclosing transaction's mode, not just the
current helper. A helper that checks evidence immediately leaves that mode active
for the next operation on the same transaction.

**Why:** Two financial operations can each work in isolation while the second
fails on its first insert because the previous operation made its multi-record
provenance constraint immediate.

**How to apply:** Each composable financial operation must defer its relevant
multi-record evidence checks before the first dependent mutation and check them
immediately before returning. Verify successive operations on the same caller
transaction, not just one operation per transaction. Do not globally disable
constraints or assume their initially-deferred defaults still apply.

For a trigger shared by tables with different row layouts, select table-specific
NEW fields in separate PL/pgSQL IF statements, not branches of a SQL CASE.

**Why:** PostgreSQL resolves record field references in the SQL expression even
when the corresponding CASE branch is not selected; one table can fail on a
field that exists only in another table.

**How to apply:** Validate every trigger-table path, including deferred callbacks,
not just inserts into the proof table.