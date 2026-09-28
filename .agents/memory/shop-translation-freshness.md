---
name: Shop translation freshness
description: How to keep localized product text accurate when the source catalog changes.
---

The existing product translations were generated once without a runtime translation provider. Display a translated field only while its original source text still matches the product's current field; if it changes, show the original with an explicit notice rather than presenting an outdated translation as current.

**Why:** Product descriptions contain technical and safety-sensitive claims. A translation produced before an edit may misrepresent the new description, and the project does not yet have a connected runtime translation provider.

**How to apply:** When adding automatic translation for newly created or edited products, connect a supported provider, save translations against a content version, and replace the one-time translations only after a successful new translation. Do not rely on a static ID match alone.