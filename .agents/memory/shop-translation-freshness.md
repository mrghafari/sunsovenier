---
name: Shop translation freshness
description: How to keep localized product text accurate when the source catalog changes.
---

The existing product translations were generated once without a runtime translation provider. Display a translated field only while its original source text still matches the product's current field; if it changes, show the original with an explicit notice rather than presenting an outdated translation as current.

**Why:** Product descriptions contain technical and safety-sensitive claims. A translation produced before an edit may misrepresent the new description, and the project does not yet have a connected runtime translation provider.

**How to apply:** Product detail uses the site's selected language. Use the bundled translation where still current, then the official Google Cloud provider when configured, keyed by source content and language. Send only public catalog copy; never transfer hidden or contract-only products. On failure keep the original/current bundled text, and let visitors open Google Translate for the current language explicitly.