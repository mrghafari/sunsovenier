---
name: Legacy warehouse history
description: How to identify orders that passed through the warehouse when older workflow records are incomplete.
---

Warehouse history must not rely only on the warehouse processing timestamp. Some legacy orders passed through the warehouse without that timestamp, while their status-transition history still records warehouse involvement.

**Why:** Filtering only by current warehouse statuses hides orders after they move to logistics; filtering only by the processing timestamp also misses older and cancelled orders whose timestamps were never populated.

**How to apply:** When building warehouse history or reports, combine canonical current workflow stages with evidence from status transitions involving the warehouse. Keep current work and historical work as separate views, and do not treat all cancelled orders as warehouse history.