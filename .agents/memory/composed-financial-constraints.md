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

Composable multi-record financial operations must roll back their own writes on
failure, even when a caller supplies the transaction.

**Why:** A caller can catch a JavaScript validation/settlement error and continue
the outer transaction; without an operation-local savepoint, earlier ledger,
receivable or hold writes can survive even though the operation failed.

**How to apply:** Use a unique savepoint for a supplied transaction, roll back and
release it before rethrowing, and test a caught downstream failure followed by
queries and a successful operation on the same transaction. A caller's ability
to roll back does not replace the operation's atomicity guarantee.

A successful migration does not prove that every PL/pgSQL guard expression runs.

**Why:** PostgreSQL can defer expression resolution until the trigger path is
executed; incompatible documentary and ledger amount types may surface only
when a real multi-record operation forces its deferred evidence checks.

**How to apply:** Exercise positive and negative source paths inside rollback-only
transactions and force deferred constraints before declaring a new guard ready.