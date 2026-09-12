---
name: Strict blog localization
description: Defines how multilingual blog content behaves when a translation is missing.
---

Every blog post must be authored in English, Arabic, Turkish, and Persian. Public list, detail, pagination, tags, and related-post queries must return only the currently selected language.

**Why:** Silent English fallback makes the page language and article content disagree, which violates the site's language selection.

**How to apply:** Filter by translation language before pagination and limits. If a post lacks the selected translation, omit it from lists and return an unavailable/not-found response for its detail page rather than substituting another language.