---
name: Wouter prefix migrations
description: Reliable way to change a browser-visible route prefix in this project's Wouter setup.
---

When changing a browser-visible route prefix, update the actual route declarations and every direct authentication redirect. Keep a navigation adapter only for legacy programmatic navigation that still needs translation.

**Why:** In the installed Wouter version, a custom parser or location remapping layer did not reliably alter how `Switch` selected child routes. A correctly matched new route could also appear broken when its component immediately redirected to the old login prefix.

**How to apply:** Treat route matching, link generation, programmatic navigation, and direct `window.location` authentication redirects as separate surfaces. Verify the new unauthenticated entry page and the disabled old prefix independently.