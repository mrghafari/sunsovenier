---
name: Blog localization fallback
description: Defines multilingual blog behavior for new posts and legacy posts missing translations.
---

New blog posts must be authored in English, Arabic, Turkish, and Persian. Legacy posts that do not yet have Persian or Turkish content may temporarily return their English translation instead of failing.

**Why:** Existing posts predate four-language authoring. Returning “not found” when users switch those posts to Persian or Turkish is worse than showing the available English content until editors add the missing translations.

**How to apply:** Prefer the selected-language translation everywhere. Fall back only to English for legacy gaps; keep all four translations mandatory for create and update so newly saved posts become fully localized.