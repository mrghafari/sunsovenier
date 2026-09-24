---
name: Published bundle freshness
description: Distinguish outdated published builds from frontend rendering or API bugs.
---

When multiple recently added UI elements are absent together, distinguish the running development app from the published build before changing component logic again. The published app can be healthy yet still serve an earlier bundle.

**Why:** In this project, a deployed JavaScript bundle lacked all three newly added notification-setting labels while the live development module contained them. Repeated component changes could not affect that published build.

**How to apply:** Compare harmless textual markers in the shipped asset and development module, then explain that publishing is needed if the deployed asset is old. Treat service-worker staleness as a separate possibility only when the published asset itself already contains the change.