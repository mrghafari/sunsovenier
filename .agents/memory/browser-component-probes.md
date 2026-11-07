---
name: Browser component probes
description: Avoid false failures when testing real authenticated components with synthetic data in Vite.
---

Use HTML5 doctype in synthetic drag-and-drop documents, and scroll instantly before measuring controls for pointer gestures.

**Why:** Quirks mode changes drag measurements; inherited smooth scrolling can move a handle after its coordinates are read, falsely suggesting cross-list dragging is broken.

**How to apply:** Set `<!doctype html>` and use `scrollIntoView({behavior:"instant"})` in the fixture before reading bounding boxes. Test both keyboard and pointer dragging. Button-based drag handles need the drag library's explicit interactive-element opt-in.

Bypass service workers when navigating from the real PWA back to a request-intercepted component fixture.

**Why:** The PWA's navigation fallback can serve the application shell before the interception handler sees the synthetic URL, making a healthy fixture appear to time out.

**How to apply:** Use the browser automation client's service-worker bypass for synthetic checks; do not disable the application's real service worker to make tests pass. Await completion of drag/drop animation before asserting the reordered DOM.

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
The same default-export normalization applies to React itself: the browser's
dynamic import may expose `createElement` only on the module's default export.
Dependency URLs may begin with `/@fs/` as well as `/node_modules/`; extract
the full URL from transformed imports rather than matching one prefix.
Use real pointer/keyboard interactions for Radix controls rather than assuming
programmatic click dispatch exercises their mouse-down handlers. These probes
verify component behavior, not a real signed-in session.

Use a fresh fixture document for independent language/component cases that open
Radix portals.

**Why:** Unmounting a Select before its exit cleanup completed left global
pointer/scroll state behind; later buttons looked enabled but real clicks never
reached them. Reusing that document produced false signing failures with no API
request. A fresh navigation isolates the portal lifecycle.

**How to apply:** Keep real Radix interactions, dismiss stale toasts, and navigate
to a new browser-only fixture between cases instead of mutating global body
styles or dispatching synthetic clicks.

Puppeteer's installed package does not imply its expected browser is cached.

**Why:** Default launch failed because the requested Chrome build was absent even
though the environment already had a working system Chromium.

**How to apply:** Resolve the installed Chromium executable with `command -v`
and supply its path explicitly; do not hardcode a Nix store hash or install a
second browser just to satisfy Puppeteer's default cache lookup.

Coordinate-based pointer probes must use bounds from a stable viewport.

**Why:** Smooth scrolling can continue after bounds are read. A taller document
list caused a signature probe to draw outside its canvas and falsely appear to
break signing, despite the component working correctly.

**How to apply:** Finish scrolling before measuring a pointer target and verify
that hit-testing the intended coordinates reaches that target. Do not infer an
application failure from a coordinate gesture that missed its control.

On navigation-prone app startup, prefer boolean readiness polling over transferring
an element handle between Puppeteer execution contexts.

**Why:** A visible-element wait repeatedly failed with Chromium's
`DOM.describeNode: Cannot find context with specified id` during startup navigation,
even though the storefront rendered and its controls worked.

**How to apply:** Poll DOM readiness with `waitForFunction`, then locate controls
after navigation settles. Wait for actual page content, not just the shared header,
before capturing screenshots.
