---
name: Commercial module compatibility
description: Why an admin module rename should preserve shop integrations and existing permissions.
---

The admin-facing Shop module is presented as Commercial. Its Sales navigation is grouped into regular shop sales and contract sales; older Procurement deep links to bulk configuration and proforma deadlines must remain aliases for regular shop sales. Its established authorization identifier and public shopping/API routes are compatibility contracts.

**Why:** Staff assignments, customer checkouts, old direct links and contract workflows depend on those identifiers and routes. Bulk configuration and proforma deadlines apply to shop products/checkout, not only contract orders; grouping them as contract settings would imply the wrong scope.

**How to apply:** Keep shop-wide settings under regular shop sales and sales contracts under contract sales. Preserve old Procurement URL aliases, permission checks and public/shop APIs when changing labels or groups. Only change underlying identifiers as a separately planned, backward-compatible migration.