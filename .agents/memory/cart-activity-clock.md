---
name: Cart activity clock
description: Defines which customer actions reset abandoned-cart timing.
---

Reset cart activity only when the effective cart changes: items are added or removed, quantities change, or an effective price or purchase condition changes. Opening, closing, viewing, logging in, or restoring an identical snapshot is not activity.

**Why:** Read-only visits and automatic synchronization can otherwise keep an abandoned cart alive indefinitely even though the customer made no purchasing decision.

**How to apply:** Compare normalized cart snapshots before writing activity timestamps. Preserve timestamps for identical JSON/cart contents, while real item, quantity, price, or purchase-condition changes update them.