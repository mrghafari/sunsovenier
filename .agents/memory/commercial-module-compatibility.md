---
name: Commercial module compatibility
description: Why an admin module rename should preserve shop integrations and existing permissions.
---

The admin-facing Shop module is presented as Commercial, with Sales and Procurement units, but its established authorization identifier and public shopping/API routes are compatibility contracts. Keep them intact when changing administrative navigation.

**Why:** Existing staff assignments, customer checkouts, direct links and contract workflows depend on those identifiers and routes; renaming them as part of a display change would silently break access or purchases.

**How to apply:** Put sales tools (including sales contracts) and purchasing tools in the appropriate administrative unit while retaining old entry aliases and permission checks. Only change the underlying identifiers as a separately planned, backward-compatible migration.