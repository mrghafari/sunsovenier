---
name: Drizzle schema push
description: Project-specific schema introspection failure caused by a legacy PostgreSQL expression index.
---

`drizzle-kit push` can fail during introspection because a legacy expression index reports a null expression that the installed Drizzle Kit version rejects.

**Why:** This blocks otherwise valid additive schema updates before Drizzle evaluates the actual change.

**How to apply:** Keep `shared/schema.ts` as the source of truth. For a non-destructive additive development change, use a guarded development-only DDL statement and verify the resulting column. Production changes must still go through Replit Publish.