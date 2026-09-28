---
name: Multilingual form validation visibility
description: Avoid silent submission failures in multi-tab editor forms.
---

If an editor requires content in several language tabs, a failed submit must select a tab with invalid fields and show a visible summary near the submit control.

**Why:** Client-side validation can block a request before it reaches the server. Errors rendered only within inactive tabs make Save appear to do nothing; browser extension console warnings are a distraction, not evidence of the app's cause.

**How to apply:** Keep required-language rules explicit, provide a form-level invalid-submission handler, highlight invalid tabs, and distinguish a missing network request from a failed server response when troubleshooting.