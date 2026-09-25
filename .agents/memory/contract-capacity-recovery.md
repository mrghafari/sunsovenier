---
name: Contract capacity recovery
description: Why cancelled contractual orders need application-level allocation reconciliation.
---

Contract quantity allocations must be reconciled from the order's current status when contracts are read or claimed; database triggers are only an extra safeguard, not the sole release mechanism.

**Why:** A schema-diff publish or a Drizzle schema push can create tables without installing hand-written SQL triggers. If release depends solely on those triggers, cancelled or failed orders permanently consume a customer's remaining contract quantity.

**How to apply:** Any contract capacity claim or remaining-quantity display should reconcile terminal and orphaned order holds first. Keep release idempotent; verify behavior in environments without custom SQL triggers.