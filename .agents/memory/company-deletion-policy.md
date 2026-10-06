---
name: Accounting company deletion
description: Why company removal is logical, super-admin-only and unavailable for companies in use.
---

Company deletion in accounting reference settings is reserved for an active
admin-namespace super admin, including the known legacy “Supper Admin” spelling.
It requires an explicit warning and exact-name confirmation.

**Why:** The user explicitly requested super-admin deletion with a warning;
generic financial-management permission is not authorization to remove a company.

Removal is logical rather than a purge, and is restricted to companies without
financial documents/activity or an operational source binding. Preserve reference
data and audit history.

**Why:** Accounting identifiers and their evidence must remain valid. Cascading
away historical records or disabling a company's active financial workflow would
break that requirement.

**How to apply:** Keep these consequences clear in the confirmation UI. Do not
change this action into a financial-history purge or silently disconnect a source.
Normal reference edits and template initialization must not resurrect a removed
company. Recheck and lock the real active super-admin role in the deletion
transaction rather than trusting a UI capability.
