---
name: PWA cache freshness
description: Prevent old frontend bundles from surviving deployments through the service worker.
---

Version service-worker cache names whenever its caching behavior changes, and serve application bundles network-first with cache as an offline fallback.

**Why:** Users can otherwise continue seeing old translations even after the source, build, and server are correct because the installed PWA serves a cached JavaScript bundle.

**How to apply:** For user-visible frontend releases, ensure the worker update bypasses HTTP cache, activates immediately, removes prior cache versions, and reloads once after taking control.