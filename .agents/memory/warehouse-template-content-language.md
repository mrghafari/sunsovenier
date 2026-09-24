---
name: Warehouse template content language
description: Existing notification template metadata can disagree with its actual language or purpose.
---

Do not treat a template's language tag as proof that its subject and body are written in that language, or that it describes the warehouse-ready event. Some existing templates tagged Persian contain English order-confirmation content, and some Persian SMS templates describe delivery codes rather than readiness.

**Why:** A language-matched selection can still show or send unrelated or untranslated text. Template selection and translation are different operations.

**How to apply:** When revisiting warehouse notification copy, inspect the actual selected text and supported placeholders; use localized readiness defaults when no suitable content exists. Ask before translating or replacing customer-facing copy automatically.