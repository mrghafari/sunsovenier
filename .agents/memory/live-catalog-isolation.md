---
name: Live catalog isolation
description: Why catalog data edits must be treated as potentially live even when code changes are unpublished.
---

Do not assume product data in development is isolated from the published catalog. In a weight investigation, the same product's weight and update timestamp appeared on both development and published shop APIs immediately after a Kardex edit, without a new code publication. This observation does not by itself establish how the database connections are configured.

**Why:** Automatically repairing or overwriting a development product weight could also affect customers on the published site, even while the published JavaScript still uses an older build.

**How to apply:** Compare read-only catalog responses before a data repair, verify which product and unit the user intends, and do not treat unpublished code as a guarantee of data isolation.