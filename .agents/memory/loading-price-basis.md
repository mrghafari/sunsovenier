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

New metric conversion evidence may derive only from explicit, immutable kg/ton
units and their physical 1,000 kg/ton relationship. Older facts without conversion
evidence stay blocked; package weights and sale prices are not inventory costs.

**Why:** The limited loading connection must preserve historical pricing and
cannot turn a staff document reference into proof of verified FIFO carrying value.

**How to apply:** Record normalization separately from unchanged order snapshots.
Treat manually documented batch costs as attestations until independently tied to
stock valuation; keep COGS and financial activation prerequisites explicit.