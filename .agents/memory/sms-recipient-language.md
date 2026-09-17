---
name: SMS recipient language
description: Rules for multilingual SMS selection and truthful outbound delivery status.
---

For customer-targeted SMS, select an en/fa/ar/tr message using the authoritative saved customer preference. Never infer language from a phone prefix, country, or name. A raw number without a matched customer requires an explicit language fallback.

**Why:** Mixed-language batches cannot safely reuse one rendered message, and guessed language can send customers content they cannot read.

**How to apply:** Render per recipient, normalize persisted language aliases, require all relevant variants, preserve the exact outbound text in logs, and call a provider response “accepted” unless a delivery callback proves delivery.