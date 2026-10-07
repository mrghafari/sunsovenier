---
name: Browser component probes
description: Avoid false failures when testing real authenticated components with synthetic data in Vite.
---

Run synthetic component checks in a browser-only fixture document rather than
waiting for the entire public application to initialize. Keep actual app
authentication and production authorization unchanged.

**Why:** Language detection, authentication redirects, chat widgets and network
timeouts can destroy the probe's execution context or leave its root blank;
those failures do not establish that the selected component is broken.

**How to apply:** Initialize Vite's React-refresh preamble and app styles in the
fixture, mount real components under their normal providers, and supply synthetic
query-cache data. Resolve React, React DOM and query-library URLs from Vite's
transformed source instead of assuming dependency paths. Normalize CommonJS
default exports; otherwise a valid React DOM module may appear to lack createRoot.
Use real pointer/keyboard interactions for Radix controls rather than assuming
programmatic click dispatch exercises their mouse-down handlers. These probes
verify component behavior, not a real signed-in session.

Puppeteer's installed package does not imply its expected browser is cached.

**Why:** Default launch failed because the requested Chrome build was absent even
though the environment already had a working system Chromium.

**How to apply:** Resolve the installed Chromium executable with `command -v`
and supply its path explicitly; do not hardcode a Nix store hash or install a
second browser just to satisfy Puppeteer's default cache lookup.
