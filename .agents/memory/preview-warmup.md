---
name: Preview warmup
description: Distinguishing an early blank screenshot from a frontend failure after restarting development.
---

The screenshot's settling window can end before frontend module loading finishes
after a development restart. A blank capture without browser errors is not by
itself evidence that the frontend crashed.

**Why:** Consecutive early captures showed an empty page, but a longer browser
load reached the normal protected-route login form with the same unchanged frontend.

**How to apply:** Check browser errors and verify the page with sufficient loading
time before changing frontend code or restarting again. Retain authentication:
seeing the login form confirms the public boundary, not the signed-in accounting UI.