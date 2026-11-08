---
name: PWA cache freshness
description: Prevent old frontend bundles from surviving deployments through the service worker.
---

Version service-worker cache names whenever its caching behavior changes, and serve application bundles network-first with cache as an offline fallback.

**Why:** Users can otherwise continue seeing old translations even after the source, build, and server are correct because the installed PWA serves a cached JavaScript bundle.

**How to apply:** For user-visible frontend releases, ensure the worker update bypasses HTTP cache, activates immediately, removes prior cache versions, and reloads once after taking control.

A network-first timeout may select an existing cached response, but must not impose an absolute download deadline when no cached response exists.

**Why:** Healthy downloads of large application bundles on mobile connections can exceed a short cache-fallback timer. Treating the timer as a network failure can prevent application startup even though the download would succeed.

**How to apply:** When no cached response is available, keep awaiting the original network request. Distinguish a fallback deadline from an actual network rejection, and test both slow uncached downloads and real offline failures.