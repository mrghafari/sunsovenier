---
name: Editable contract seller
description: User-directed boundary between company defaults and individual agreements.
---

Seller fields imported from Company Information must be editable in the contract form. Edits belong to that agreement, not the company's master settings.

**Why:** The user explicitly requested: «اطلاعات شرکت فروشنده را که آوردی فیلدها را قابل ادیت کن». Treating company defaults as compulsory save-time values would silently discard those authorized edits.

**How to apply:** Preserve submitted, validated seller details in new contracts, edits and addenda. Keep existing agreement snapshots independent of later company-profile changes. Only an explicit refresh or document-language change should replace staff edits with company defaults; background refetches must not do so.
