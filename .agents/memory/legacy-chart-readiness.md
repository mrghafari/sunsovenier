---
name: Legacy chart readiness
description: Operational readiness requires checking persisted company settings, not only freshly seeded test fixtures.
---

Passing financial activation tests against a freshly seeded chart does not prove
that an existing company's persisted settings are complete.

**Why:** A user encountered an opening-activation settings rejection after isolated
activation tests had passed. A newer template setting had never been added to the
older company chart.

**How to apply:** Check the actual company's date coverage and all canonical
posting keys, account ownership, type and active/posting flags before reporting
readiness. Template upgrades may add missing defaults, but must not overwrite
staff-assigned mappings or reinterpret custom accounts. Report exact missing
settings rather than a generic count. A rollback-only existing-company probe can
verify the whole activation path without attributing a real approval to a fixture
identity.
