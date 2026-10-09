---
name: Contract text alignment
description: Local alignment rules for multilingual agreements and older addendum snapshots.
---

Agreement text follows its document language independently of the surrounding screen. Keep fixes local to agreement text rather than changing shared RTL utility rules across the application.

**Why:** Shared ancestor-based RTL overrides can flip alignment even when a nearer element has its own direction. Changing those rules globally risks unrelated business screens. Older agreements can also lack language metadata and begin with Latin contract numbers, so first-character automatic direction is unreliable.

**How to apply:** Check computed direction and alignment in contract details, text dialogs and addenda with opposing screen/document languages. Preserve stored text; use content-based direction only when the document language is unavailable.

کاربر «Contract text preview» را مرجع نمایش صحیح معرفی کرد؛ متن زیر «Terms» هنگام باز کردن قرارداد یا متمم باید مثل همان پیش‌نمایش باشد و شمارهٔ ماده‌های فارسی و عربی در سمت راست قرار بگیرند.

**Why:** The user repeated that earlier direction-only fixes did not correct the expanded view, and specifically identified the draft preview as the correct reference.

**How to apply:** Compare the full paragraph presentation with the accepted draft preview, including numbered articles, not just computed direction or alignment. Keep expanded contracts, addenda and text dialogs consistent. Do not treat another report of a difference as only a publishing issue without checking the actual view.
