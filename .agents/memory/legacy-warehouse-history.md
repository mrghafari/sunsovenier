---
name: Legacy warehouse history
description: How to identify orders that passed through the warehouse when older workflow records are incomplete.
---

Warehouse history must not rely only on the warehouse processing timestamp. Some legacy orders passed through the warehouse without that timestamp, while their status-transition history still records warehouse involvement.

**Why:** Filtering only by current warehouse statuses hides orders after they move to logistics; filtering only by the processing timestamp also misses older and cancelled orders whose timestamps were never populated.

**How to apply:** When building warehouse history or reports, combine canonical current workflow stages with evidence from status transitions involving the warehouse. Keep current work and historical work as separate views, and do not treat all cancelled orders as warehouse history.

Route registration order is also part of this contract: a generic department route with a path parameter can capture the warehouse endpoint before its dedicated history-aware handler runs.

**Why:** Express matches the first compatible route, so a generic `/order-management/:department` endpoint silently returned only current warehouse work and omitted the history payload.

**How to apply:** Let generic department routing call `next()` for warehouse requests, or register the warehouse-specific routes first.