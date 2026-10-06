---
name: Central geography source
description: Rules for keeping customer and logistics country, province, and city data consistent.
---

Use one database-backed geography source for customer registration, profile editing, and logistics. Preserve the established Iraqi province and city identifiers because shipping rates and logistics records depend on them; distinguish countries on those records instead of copying Iraq into a second location hierarchy.

**Why:** Separate client-side Iranian lists and duplicate Iraqi APIs caused forms to disagree and risked breaking logistics foreign keys if Iraqi locations were re-created with new identifiers.

**How to apply:** Add or edit locations in the shared geography records, expose them through the generic geography API, and filter the same records to Iraq for Iraq-only logistics operations. Static location lists may seed the database but must not be used as the runtime source for selectors.