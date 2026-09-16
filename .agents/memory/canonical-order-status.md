---
name: Canonical order status
description: Defines the durable boundary between persisted order workflow data and consistent status presentation.
---

Keep the public order status, payment status, and internal workflow status as separate persisted facts, but resolve their combined meaning through one shared, pure status projection. All audiences must consume that projection rather than maintain local precedence rules or alias maps.

**Why:** Historical aliases and independent page-level conditions caused the same order to appear delivered in one department and awaiting financial approval to the customer.

**How to apply:** Add aliases, labels, badge styles, customer phases, and department visibility rules to the shared resolver. Preserve raw fields and status history for transitions and auditing; do not make a UI page reinterpret them independently.