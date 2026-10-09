---
name: Contract text alignment
description: Local alignment rules for multilingual agreements and older addendum snapshots.
---

Agreement text follows its document language independently of the surrounding screen. Keep fixes local to agreement text rather than changing shared RTL utility rules across the application.

**Why:** Shared ancestor-based RTL overrides can flip alignment even when a nearer element has its own direction. Changing those rules globally risks unrelated business screens. Older agreements can also lack language metadata and begin with Latin contract numbers, so first-character automatic direction is unreliable.

**How to apply:** Check computed direction and alignment in contract details, text dialogs and addenda with opposing screen/document languages. Preserve stored text; use content-based direction only when the document language is unavailable.
