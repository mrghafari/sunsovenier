---
name: Shop translation freshness
description: How to keep localized product text accurate when the source catalog changes.
---

Product text is curated in four Kardex language tabs. Display the selected storefront language automatically; do not put a translation button or call a live translation service. A blank field falls back to the previously bundled translation only if its source still matches, otherwise to the original text.

**Why:** The user prefers maintaining product specifications in the four languages rather than asking customers to run a translator. Bundled historical translations can be stale, especially for technical claims.

**How to apply:** Use the canonical Kardex product and keep the four authored versions independent of checkout and inventory identifiers. Apply saved fields over safe fallbacks at render time. Do not overwrite authored translations on unrelated edits. Explicitly clear translation defaults when opening a new product after editing: resetting the form alone can restore the previous product's text.