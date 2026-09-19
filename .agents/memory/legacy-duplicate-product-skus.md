---
name: Legacy duplicate product SKUs
description: Safe validation behavior when editing products created before strict SKU uniqueness.
---

When updating an existing product, validate SKU uniqueness only if the normalized SKU value actually changes. Continue enforcing uniqueness for new products and real SKU changes.

**Why:** Legacy batch/showcase rows can already share an SKU. Revalidating an unchanged SKU blocks unrelated edits such as attaching a 3D model, even though the edit does not create a new duplicate.

**How to apply:** Load the current row before update, compare trimmed SKU values, and run duplicate detection only when they differ. Keep database uniqueness errors and explicit validation errors user-readable.