---
name: Warehouse settings authorization
description: Why warehouse management endpoints should honor module permissions rather than only department assignment.
---

Warehouse management settings should use the existing warehouse-management module permissions for viewing and editing. A direct department assignment is not the only legitimate way to access this page.

**Why:** An authenticated administrator with the super-admin role can open the warehouse page but may have no separate warehouse department assignment. Requiring that assignment on new settings endpoints produces HTTP 403 while the settings data itself is valid.

**How to apply:** Align new warehouse management API permissions with the page's established module-access checks, keeping read and edit permissions separate. Preserve authentication and do not make settings public.