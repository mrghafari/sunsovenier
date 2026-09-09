---
name: PDFKit RTL text
description: Correct direction and shaping rules for Persian and Arabic PDF output.
---

Pass Persian and Arabic text to the project's current PDFKit/fontkit stack in logical Unicode order and use right alignment. Do not reverse words, characters, or presentation forms manually.

**Why:** PDFKit/fontkit already performs bidi layout and Arabic shaping. Manual reversal made Persian and Arabic invoice text render backwards and also reversed embedded Latin text such as emails and currency codes. Applying the `rtla` OpenType feature to mixed full lines also reversed their Latin fragments.

**How to apply:** Keep source strings unchanged, right-align RTL blocks, and let PDFKit shape them. Verify changes by rendering sample PDFs to images containing Persian/Arabic, numbers, email addresses, phone numbers, and Latin currency codes.