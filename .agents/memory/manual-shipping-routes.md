---
name: Manual shipping routes
description: Why changing shipping centers must never infer new road distances from legacy Erbil data.
---

Use manually supplied directional origin-to-destination road distances for a selected center. Only the legacy Erbil-to-Iraqi-city positive distances qualify when Erbil is the origin; an absent distance is not a zero-cost route. The current shipping scope is within the center's country.

**Why:** The user specifically chose manual road distances, and the city data does not supply reliable coordinates or routes. Deriving Tehran-to-Iran or another new origin from Erbil distances would generate misleading charges.

**How to apply:** When a center changes, quote only routes recorded for that origin (or its own same-city zero-distance route). Preserve older route records for their original origins but never treat them as evidence for the new origin.

For uploaded road-distance matrices, match both endpoints uniquely to active cities in the same country. Preserve the source's direction and nulls, skip missing or ambiguous city names rather than guessing, and let independently entered manual distances take precedence over imports.

**Why:** Uploaded matrices can include misspelled or absent cities and asymmetric distances. Inventing aliases or overwriting a separately measured route would create charges the source cannot justify.

**How to apply:** Before importing, report coverage and excluded pairs. Re-imports may refresh their own rows but must leave other sources untouched; do not assume development database contents appear in production.