---
name: Blog localization fallback
description: Defines optional per-article languages and fallback when the site's language is omitted.
---

Each article may contain any selected subset of English, Arabic, Turkish, and Persian, with at least one complete translation. No language, including English, is mandatory. Editors must be able to omit unwanted languages when creating or editing a post; removing an existing populated translation requires confirmation and takes effect only on Save.

**Why:** The user explicitly changed the former mandatory-four-language requirement: unwanted languages must be removable so the article can be published without producing them. Articles must still open when the selected site language was intentionally omitted.

**How to apply:** Validate complete title, slug, excerpt, and content only for retained languages, and save their set atomically. Prefer the selected site language, otherwise English, then Arabic, Turkish, or Persian among available translations. Apply the same fallback to list, detail, and related articles. Do not silently invent content or delete existing translations without the editor selecting their removal.