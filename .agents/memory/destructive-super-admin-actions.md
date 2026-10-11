---
name: Destructive super-admin actions
description: Authorization and transaction rules for irreversible multi-record administration.
---

Destructive super-admin operations must verify an active `super_admin` role, not a generic authenticated-session flag. Multi-record deletion must validate and lock every target before deleting anything, then use one checked-out database connection and one all-or-nothing transaction.

**Why:** Customer sessions can also be authenticated, and pool-level transaction statements do not guarantee that subsequent queries use the same connection. Either mistake can make permanent deletion unauthorized or partially applied.

**How to apply:** Snapshot and display exact targets before confirmation, cap and validate IDs, lock related evidence using exact identifiers, roll back the entire batch on any missing target or failure, and never claim partial success for an atomic request.

Super-admin removal is now withdrawal from active circulation, not physical deletion. An unshipped order or wholly unshipped contract can be withdrawn even if signed or financially reviewed. Signed contracts, addenda, payment evidence and historical counters remain. Only confirmed payments not already returned become customer credit and wallet funds; uncaptured holds are released, not credited.

**Why:** The user changed the earlier unsigned/no-financial-activity restriction and explicitly chose archive_signed and confirmed_net_payment. Preserving evidence does not mean keeping signed contracts in active circulation.

**How to apply:** Reject real dispatch/delivery including historical evidence. Any shipped linked order blocks whole-contract withdrawal. Preserve signed documents, reverse posted obligations with historical valuation where necessary, prevent duplicate customer credit, keep legacy balances separate from the new ledger, and never issue automatic bank payouts.

Check-to-delete locks alone do not protect against a stale financial writer that submits after deletion commits. Financial reference checks must serialize with the source order and reject missing sources; retain the distinction between legacy shop-order and customer-order identity namespaces.

**Why:** A financial writer can read its source before cleanup and insert later, after a table lock has been released. Equal numeric IDs in different order namespaces are not proof of the same source.

**How to apply:** Preserve live-source enforcement when changing cleanup or financial writers. Do not infer complete race safety from a passing deletion transaction alone.