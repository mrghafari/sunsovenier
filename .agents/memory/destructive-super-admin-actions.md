---
name: Destructive super-admin actions
description: Authorization and transaction rules for irreversible multi-record administration.
---

Destructive super-admin operations must verify an active `super_admin` role, not a generic authenticated-session flag. Multi-record deletion must validate and lock every target before deleting anything, then use one checked-out database connection and one all-or-nothing transaction.

**Why:** Customer sessions can also be authenticated, and pool-level transaction statements do not guarantee that subsequent queries use the same connection. Either mistake can make permanent deletion unauthorized or partially applied.

**How to apply:** Snapshot and display exact targets before confirmation, cap and validate IDs, delete dependents before primary records using exact identifiers, roll back the entire batch on any missing target or failure, and never claim partial success for an atomic request.