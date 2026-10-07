---
name: Financial approval evidence
description: Preserve reviewer evidence when legacy finance screens encounter stricter accounting approval controls.
---

When a legacy finance screen sends an empty explanation into the newer accounting approval path, fix the review interaction rather than removing the server's explanation requirement. An automatically generated “approved” label and timestamp are not a reviewer's explanation.

**Why:** A customer-document approval failure was caused by the mismatch between the legacy optional-notes interface and the newer mandatory financial approval reason. Treating it as an upload failure, weakening the accounting check, or synthesizing a reason would hide the actual missing evidence.

**How to apply:** Require an explicit reviewer explanation before submitting financial approval, explain its validation limits in the selected language, and send alternate approval entry points through the same review form. Do not infer payment settlement or financial authorization merely from receipt availability.

Company attribution and a date after an accounting cutover do not prove an order is a credit sale. Distinguish explicitly enrolled credit sales, new prepaid wallet orders, and already-paid orders from verified unlinked historic wallets.

**Why:** After the missing approval explanation was supplied, a paid historic-wallet order still failed because a broad company/date filter routed it into credit registration. The customer's existing account had not been transferred to the independently opened new ledger.

**How to apply:** Preserve new-ledger enrollment and credit-limit checks, verify the historic-wallet boundary before retaining legacy review, and never debit or credit an already-paid wallet order again during approval. Do not manufacture CRM credit registration merely to dismiss this error.
