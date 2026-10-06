---
name: Vite development error handling
description: Why client-side Vite and HMR errors must not terminate the development workflow.
---

Do not call `process.exit` from Vite's custom logger for ordinary development-server errors. Log them and let fatal startup failures reject the server setup normally.

**Why:** After a restart, an open browser tab can briefly request an outdated dynamically imported module. Vite reports this as an error even though the server started correctly; treating every logger error as fatal repeatedly stopped the workflow.

**How to apply:** Keep development logger callbacks non-fatal. Diagnose startup failures through rejected setup calls, bind/listen errors, and workflow readiness checks instead of exiting on browser or HMR messages.