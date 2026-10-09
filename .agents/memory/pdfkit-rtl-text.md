---
name: PDFKit RTL text
description: Correct direction and shaping rules for Persian and Arabic PDF output.
---

Preserve Persian and Arabic in logical Unicode order. Do not reverse words, characters, or presentation forms manually. Keep labels and values in separate layout boxes, and isolate Latin values.

**Why:** Logical text and right alignment alone do not guarantee correct output: PDFKit's default cached layout splits at spaces, so Arabic letters may be shaped correctly while whole words appear in the wrong order. Font shaping is not full bidirectional paragraph layout. Manual reversal also corrupts embedded emails and currency codes. Rendering a real Persian signed agreement exposed this despite earlier invoice observations.

**How to apply:** For complete multilingual signed agreements, use the browser's bidi and print layout with embedded local fonts, escaped text and no network access. Keep RTL fixes local rather than changing established invoice renderers without verification. Verify rendered images and extracted text; distinguish correct letter shaping from correct word and digit order.