---
name: SMS recipient language
description: Rules for selecting customer language across SMS and email notifications, plus truthful outbound delivery status.
---

For customer-targeted SMS and email, select the en/fa/ar/tr content or template using the authoritative saved customer preference. Never infer language from a phone prefix, country, or name. A raw recipient without a matched customer requires an explicit language fallback.

**Why:** Mixed-language batches cannot safely reuse one rendered message or template, and guessed language can send customers content they cannot read.

**How to apply:** Render per recipient, normalize persisted aliases, prefer the requested template language then English/default, preserve exact outbound content in logs, and call a provider response “accepted” unless a delivery callback proves delivery.