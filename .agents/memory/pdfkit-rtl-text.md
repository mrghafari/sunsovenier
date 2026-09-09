---
name: PDFKit RTL text
description: Correct direction and shaping rules for Persian and Arabic PDF output.
---

Pass Persian and Arabic text to the project's current PDFKit/fontkit stack in logical Unicode order and use right alignment. Do not reverse words, characters, or presentation forms manually. Keep labels and values in separate layout boxes, and isolate Latin values.

**Why:** PDFKit/fontkit already performs bidi layout and Arabic shaping, but mixed label/value strings and Arabic-script digits are reordered inconsistently. Manual reversal also reverses embedded emails and currency codes.

**How to apply:** Keep source strings unchanged and right-align RTL blocks. Draw RTL labels separately from their values, wrap Latin runs with LRI/PDI, and use Latin digits for invoice dates and amounts. Verify rendered images and extracted text.