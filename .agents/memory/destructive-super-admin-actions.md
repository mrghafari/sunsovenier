---
name: Destructive super-admin actions
description: Authorization and transaction rules for irreversible multi-record administration.
---

Destructive super-admin operations must verify an active `super_admin` role, not a generic authenticated-session flag. Multi-record deletion must validate and lock every target before deleting anything, then use one checked-out database connection and one all-or-nothing transaction.

**Why:** Customer sessions can also be authenticated, and pool-level transaction statements do not guarantee that subsequent queries use the same connection. Either mistake can make permanent deletion unauthorized or partially applied.

**How to apply:** Snapshot and display exact targets before confirmation, cap and validate IDs, delete dependents before primary records using exact identifiers, roll back the entire batch on any missing target or failure, and never claim partial success for an atomic request.

Signed contracts and signed addenda must be preserved even when no financial operation has begun. Permanent cleanup is for unsigned records without financial activity; reversing or failing a payment does not make its history disposable.

**Why:** The user explicitly selected «قرارداد امضاشده حفظ شود» when restoring the super-admin cleanup module.

**How to apply:** Treat electronic signatures and uploaded signed documents as blockers, including when deleting related orders. Never turn this administrative cleanup into a financial reversal or a signed-document erasure.

Check-to-delete locks alone do not protect against a stale financial writer that submits after deletion commits. Financial reference checks must serialize with the source order and reject missing sources; retain the distinction between legacy shop-order and customer-order identity namespaces.

**Why:** A financial writer can read its source before cleanup and insert later, after a table lock has been released. Equal numeric IDs in different order namespaces are not proof of the same source.

**How to apply:** Preserve live-source enforcement when changing cleanup or financial writers. Do not infer complete race safety from a passing deletion transaction alone.