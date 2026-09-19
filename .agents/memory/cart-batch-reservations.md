---
name: Cart batch reservations
description: Invariants for reserving FIFO batch inventory between cart activity and verified payment.
---

Cart activity must reserve exact FIFO batch allocations without changing physical batch stock. FIFO means oldest creation timestamp first, with the lowest stable batch ID breaking timestamp ties. A verified paid transition finalizes those exact allocations once. Cancellation, deletion, and expiry before finalization only release reservations; a financial rejection after finalization must restore each quantity to its original batch.

**Why:** Re-running FIFO at payment time can change batch order, while decrementing physical stock at add-to-cart time records a sale that has not happened. Generic, unverified payment callbacks must never trigger physical inventory movement.

**How to apply:** Serialize allocation and expiry reconciliation, keep pending reservations unavailable until explicitly released, attach allocations before transitioning an order to paid, and make finalization, release, and post-finalization restoration idempotent. Restoration must use recorded batch IDs rather than rerunning FIFO, then recompute shop stock from all batches. Final sales invoices must print the finalized allocation records; proformas must not infer or display a sold batch.