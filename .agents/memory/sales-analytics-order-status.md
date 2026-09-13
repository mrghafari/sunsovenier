---
name: Sales analytics order status
description: Defines which order statuses belong in geographic and product sales reporting.
---

Geographic and product sales analytics must consistently exclude orders whose status is `cancelled`, `failed`, or `deleted`.

**Why:** Deleted or unsuccessful historical orders previously inflated product quantities and revenue and produced misleading Unknown regions.

**How to apply:** Whenever adding or changing a sales-report query, apply the same exclusion to both summary totals and regional or product breakdowns.