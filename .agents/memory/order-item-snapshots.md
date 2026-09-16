---
name: Order item snapshots
description: Keeps historical order items consistent across customer and administrative views.
---

Use the product name, quantity, unit price, and total stored on the order item as the authoritative historical values. Normalize item responses to one camelCase shape while tolerating legacy snake_case data at display boundaries.

**Why:** Joining current catalog data can silently change old orders when a product is renamed or deleted, and inconsistent response casing can make one view show missing or different items.

**How to apply:** Any customer, finance, invoice, or warehouse view of an existing order should read its order-item snapshot and map item fields consistently before rendering or calculating totals.