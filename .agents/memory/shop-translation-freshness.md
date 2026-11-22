---
name: Shop translation freshness
description: How to keep localized product text accurate when the source catalog changes.
---

The same five existing Kardex fields (technical name/grade, description, technical specifications, features, and applications) must be editable in English, Persian, Arabic, and Turkish within their original block; the user rejected a separate translation section. Do not include the commercial title or short description in these tabs, but preserve previously saved versions. Display the selected storefront language automatically without a translation button or live translation service. A blank field falls back to the previous bundled translation only if its source still matches, otherwise to the original text.

**Why:** The user prefers maintaining product specifications in the four languages rather than asking customers to run a translator. Bundled historical translations can be stale, especially for technical claims.

**How to apply:** Use the canonical Kardex product and keep the four authored versions independent of checkout and inventory identifiers. Apply saved fields over safe fallbacks at render time. Do not overwrite authored translations on unrelated edits. Explicitly clear translation defaults when opening a new product after editing: resetting the form alone can restore the previous product's text.