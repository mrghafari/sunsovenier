---
name: Loading invoice price basis
description: Why captured native order prices cannot automatically be applied to weighbridge tons.
---

Weighbridge tons cannot be multiplied by a package/kg/native-unit price without
immutable evidence of the unit conversion. Correct-looking arithmetic must not
be labeled as invoice or posting readiness.

**Why:** The approved capture bridge preserves checkout's native price/unit
semantics; it does not establish a universal per-ton price or freeze actual
inventory cost. Changing this interpretation would silently change invoicing,
especially for older or partially loaded orders.

**How to apply:** Keep missing price/weight bases explicit. Require frozen unit
and valuation evidence before live invoice/COGS handlers, and retain separate
weight approval, settlement and opening/cutover prerequisites. Do not rewrite
historical snapshots or use today's catalog to complete old facts.