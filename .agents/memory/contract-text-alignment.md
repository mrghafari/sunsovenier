---
name: Contract text alignment
description: Local alignment rules for multilingual agreements and older addendum snapshots.
---

Agreement text follows its document language independently of the surrounding screen. Keep fixes local to agreement text rather than changing shared RTL utility rules across the application.

**Why:** Shared ancestor-based RTL overrides can flip alignment even when a nearer element has its own direction. Changing those rules globally risks unrelated business screens. Older agreements can also lack language metadata and begin with Latin contract numbers, so first-character automatic direction is unreliable.

**How to apply:** Check computed direction and alignment in contract details, text dialogs and addenda with opposing screen/document languages. Preserve stored text; use content-based direction only when the document language is unavailable.

The user specified that expanded contract and addendum text must display like the contents of the **Contract text** button, which they confirmed displays correctly.

**Why:** Direction-only corrections did not satisfy the reported difference; the dialog is the user's accepted display reference.

**How to apply:** Keep the complete document text presentation consistent across these views, not just their direction attributes. Do not treat another report of a display difference as only a publishing issue without checking the actual view.
