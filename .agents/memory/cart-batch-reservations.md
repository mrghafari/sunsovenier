---
name: Cart batch reservations
description: Invariants for reserving FIFO batch inventory between cart activity and verified payment.
---

Cart activity must reserve exact FIFO batch allocations without changing physical batch stock. A verified paid transition finalizes those exact allocations once; cancellation, deletion, and expiry release them without restoring physical stock.

**Why:** Re-running FIFO at payment time can change batch order, while decrementing physical stock at add-to-cart time records a sale that has not happened. Generic, unverified payment callbacks must never trigger physical inventory movement.

**How to apply:** Serialize allocation and expiry reconciliation, keep pending reservations unavailable until explicitly released, attach allocations before transitioning an order to paid, and make both finalization and release idempotent. Final sales invoices must print the finalized allocation records; proformas must not infer or display a sold batch.