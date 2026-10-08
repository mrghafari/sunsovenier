---
name: Cached form initialization
description: Reinitializing dialogs whose defaults come from structurally shared query data.
---

When a dialog resets its local form, initialize query-backed defaults on the new dialog opening as well as on changes to the fetched data.

**Why:** React Query can preserve an identical response object's reference across refetches. An effect dependent only on that response may never run again after the local form is reset. Repeated contract creation exposed this as blank, noneditable seller details despite complete company settings.

**How to apply:** Test opening, saving or cancelling, and reopening the same dialog without reloading the page. Include the reset/open lifecycle in initialization while preserving saved historical data when editing. Wait for the closing animation to finish before the next pointer interaction in browser probes.
