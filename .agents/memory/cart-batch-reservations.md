---
name: Cart batch reservations
description: Invariants for reserving FIFO batch inventory between cart activity and verified payment.
---

Cart activity and verified payment must reserve exact FIFO batch allocations without changing physical batch stock. FIFO means oldest creation timestamp first, with the lowest stable batch ID breaking timestamp ties. Warehouse outbound finalizes those exact allocations, decrements physical stock once, and converts the proforma to a final invoice in the same transaction. Cancellation, deletion, and expiry before outbound only release reservations; cancellation after outbound must restore each quantity to its original batch.

**Why:** Re-running FIFO at warehouse time can change batch identity, while decrementing physical stock at cart or payment time records warehouse movement that has not happened. Payment callbacks must never trigger physical inventory movement. A finalized outbound allocation is the authoritative sale event, so leaving invoice conversion for a later status or periodic job can leave a completed sale with only a proforma.

**How to apply:** Serialize allocation and expiry reconciliation, keep pending reservations unavailable until explicitly released, attach allocations before payment, and finalize them only on warehouse approval/outbound. The transaction that finalizes outbound allocations must also mark the order invoice as final. Make finalization, invoice conversion, release, and post-finalization restoration idempotent. Restoration must use recorded batch IDs rather than rerunning FIFO, then recompute shop stock from all batches. Final sales invoices must print only finalized outbound allocation records; proformas must not infer or display a sold batch.