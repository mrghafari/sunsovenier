---
name: Preview warmup
description: Distinguishing slow development and verification warmup from an application failure.
---

The screenshot's settling window can end before frontend module loading finishes
after a development restart. A blank capture without browser errors is not by
itself evidence that the frontend crashed.

**Why:** Consecutive early captures showed an empty page, but a longer browser
load reached the normal protected-route login form with the same unchanged frontend.

**How to apply:** Check browser errors and verify the page with sufficient loading
time before changing frontend code or restarting again. Retain authentication:
seeing the login form confirms the public boundary, not the signed-in accounting UI.
When repeated short captures remain blank without errors, prefer one sufficiently
long real-browser load over more short captures or another server restart.

Fresh-environment validation and startup can also outlast tool deadlines. Treat
a timeout as an incomplete observation, not proof of a compile error.

**Why:** A build reported a shell timeout but subsequently completed in its log,
and a cold workflow start timed out before a later warm start served normally.
Whole-project type checking may also run beyond the available deadline.

**How to apply:** Check syntax cheaply first, inspect the existing process/log
and endpoint readiness after a timeout, and avoid concurrent repeated full
checks or duplicate servers. Report a full type check as unverified if it never
finishes; successful bundling or file diagnostics do not replace that check.