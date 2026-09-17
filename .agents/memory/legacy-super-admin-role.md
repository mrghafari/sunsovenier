---
name: Legacy super-admin role
description: Compatibility rule for securely recognizing the project's historical super-admin role spelling.
---

Treat the canonical `super_admin` role and the known historical `Supper Admin` spelling as the same super-admin role after trimming, lowercasing, and normalizing spaces or hyphens to underscores. Do not broaden this to generic admin roles.

**Why:** The project’s active super-admin account is assigned to a legacy role whose stored name contains the historical “Supper” typo. Exact comparison with `super_admin` locks out the legitimate super admin with HTTP 403.

**How to apply:** For sensitive super-admin routes, continue verifying that exactly one admin identity is present and that both the user and joined role are active in the database. Canonicalize only the two recognized role names after that live verification.