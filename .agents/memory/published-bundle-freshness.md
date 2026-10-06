---
name: Published bundle freshness
description: Distinguish outdated published builds from frontend rendering or API bugs.
---

When multiple recently added UI elements are absent together, distinguish the running development app from the published build before changing component logic again. The published app can be healthy yet still serve an earlier bundle. Also compare the platform-reported published domain with any custom domain; they can lead to different deployments.

**Why:** In this project, a deployed JavaScript bundle lacked all three newly added notification-setting labels while the live development module contained them. Repeated component changes could not affect that published build. In another incident, a receipt worked at the active published domain but failed at the custom domain, which still served an older asset bundle and was not listed on the active deployment.

**How to apply:** Compare harmless textual markers in the shipped asset and development module, then explain that publishing is needed if the deployed asset is old. If a custom domain is involved, first check whether it appears among the active deployment's URLs and compare the same endpoint on both hosts. A domain pointing elsewhere needs domain configuration, not another code change. Treat service-worker staleness as a separate possibility only when the published asset itself already contains the change.