---
name: Legacy persistent carts
description: How to investigate a saved cart when database shape differs from current schema declarations.
---

Inspect the live database schema before assuming saved carts use the shape declared in the current application schema. Some environments retain JSON cart snapshots rather than per-item rows.

**Why:** A query based on the newer declared shape failed while a legacy saved cart was present. Assuming the declared shape can misdiagnose a missing-catalog shipping failure.

**How to apply:** When investigating a customer's cart, inspect the real table structure and compare saved catalog IDs to actual shop products. Never silently discard missing items; make them visible and removable by the customer.