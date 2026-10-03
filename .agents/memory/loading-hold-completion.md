---
name: Loading holds and order completion
description: Why settling a measured loading invoice must not automatically finish its order or free every remaining hold.
---

Settling one loading invoice does not establish that the whole order is loaded.
Retain unconsumed held funds until an explicit release/cancellation decision or
a verified whole-order completion process. Do not automatically mark the native
order paid merely because one receivable is fully settled.

**Why:** Measured loading is recorded per truck and orders can have several
partial loadings. Releasing the rest after the first truck can remove funding
needed by subsequent trucks. Invoice, stock and cost integration is still a
separate prerequisite for financial activation.

**How to apply:** Consume only the payment's share of its own order hold.
Amounts above that remaining hold must use genuinely available free funds.
An explicit release changes available funds, not total wallet balance, and must
not be represented as a new wallet credit or refund.