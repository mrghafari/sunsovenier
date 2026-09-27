---
name: Contract addendum timing
description: Historical-agreement integrity when addenda change live contract prices, caps, or terms.
---

Capture the effective contract agreement when a checkout claims capacity, then carry that snapshot to the order. An addendum can commit between claim and order attachment; taking the snapshot only at attachment would incorrectly give the order newer terms than the price and capacity it claimed. Preserve the pre-first-addendum state separately and keep numbered addenda immutable.

**Why:** Addenda change the live contract for future sales without creating a second sellable contract or rewriting old orders. Lock ordering must reconcile stale holds before locking the contract, matching checkout's order, to avoid deadlocks.

**How to apply:** When changing checkout or contract amendments, keep claim-time snapshots and the reconciliation-before-contract lock order together. Do not infer exact terms for old orders that predate snapshots if the parent could have been edited before its first addendum; expose that uncertainty rather than backfilling guessed history.