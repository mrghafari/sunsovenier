---
name: Sales analytics order status
description: Defines which order statuses belong in geographic and product sales reporting.
---

Geographic, product, and KPI sales analytics must consistently exclude orders whose status is `cancelled`, `failed`, or `deleted`, plus orders whose payment status is `failed`.

Never add revenue from different currencies into one headline total or growth calculation. Group by currency and compare each currency only with the same currency in the previous period.

**Why:** Deleted or unsuccessful historical orders previously inflated product quantities and revenue. Development data also contained completed vendor-sale transactions linked to orders that later became ineligible, so transaction completion alone does not prove an order remains a sale. Combining currencies produces a mathematically invalid total and misleading growth.

**How to apply:** Apply the same eligibility predicate to summaries and all breakdowns. Return per-currency aggregates and select a deterministic headline currency without converting values.