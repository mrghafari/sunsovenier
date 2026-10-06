---
name: Financial note localization
description: Keep automatically generated financial approval notes multilingual without rewriting historical or staff-authored text.
---

Translate the complete machine-generated approval note at display time, including both the approval/status phrase and any appended wallet adjustment. Do not rewrite historical records based on the viewer's current site language, and leave manually authored notes unchanged.

**Why:** The finance workflow persists a mixed-language free-text note. Translating only its wallet suffix leaves the English approval phrase visible on Persian, Arabic, or Turkish screens; translating the stored note on save would make the next language switch incorrect and could alter a staff member's own text.

**How to apply:** Match only known generated phrases when rendering the note, keep the raw value available for editing, and exercise all supported site languages with examples containing both approval and wallet text.