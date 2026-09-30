---
name: CRM purchase metrics
description: Source-of-truth and currency safety for customer purchase amounts.
---

For customer purchase amounts, derive values from eligible recorded orders, not the CRM profile's cached spend counter, and keep currencies separate.

**Why:** Development data had linked customer orders while every stored CRM total-spent counter was zero. A single total would also misstate purchases if a customer has orders in different currencies.

**How to apply:** Use the same exclusion rules as sales analytics for unsuccessful orders and failed payments. Aggregate by customer and currency, show each currency distinctly, and do not display stale cached spend as an apparent purchase amount.