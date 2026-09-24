---
name: Manual shipping routes
description: Why changing shipping centers must never infer new road distances from legacy Erbil data.
---

Use manually supplied directional origin-to-destination road distances for a selected center. Only the legacy Erbil-to-Iraqi-city positive distances qualify when Erbil is the origin; an absent distance is not a zero-cost route. The current shipping scope is within the center's country.

**Why:** The user specifically chose manual road distances, and the city data does not supply reliable coordinates or routes. Deriving Tehran-to-Iran or another new origin from Erbil distances would generate misleading charges.

**How to apply:** When a center changes, quote only routes recorded for that origin (or its own same-city zero-distance route). Preserve older route records for their original origins but never treat them as evidence for the new origin.