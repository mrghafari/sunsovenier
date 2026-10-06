---
name: Drizzle array interpolation
description: PostgreSQL array parameters and SQL list interpolation behave differently in Drizzle templates.
---

An interpolated JavaScript array in a Drizzle SQL template can expand to a SQL
record/list rather than one PostgreSQL array parameter. Do not assume a cast
after the interpolation makes it usable with `ANY`.

**Why:** A real PostgreSQL financial validation generated a parenthesized list
of separate parameters and failed before its business guards could run, despite
successful compilation.

**How to apply:** For a finite membership list, build a parameterized `IN` list.
For an actual array parameter, use an explicit binding supported by the client.
Execute the query against PostgreSQL; TypeScript or SQL-function creation alone
cannot prove the generated expression is valid.
