---
name: Contract wallet safety
description: Why wallet payment is unavailable for contractual purchases until order-linked reversals exist.
---

Contractual checkout must not debit a wallet before the order, its contract allocation, and its items can be completed or safely compensated.

**Why:** The existing wallet flow debits before an order ID exists and has no idempotent reversal tied to that debit. A later contract allocation or order failure could leave funds deducted without a valid order.

**How to apply:** Keep wallet methods rejected server-side for contract purchases, with matching UI guidance, until an order-linked reserve/confirm flow and an idempotent reversal cover every failure path. Ordinary purchases follow their existing payment behavior.