---
name: Google OAuth callback consistency
description: Replit-hosted Google OAuth behavior across development and production domains.
---

Google OAuth must receive the same absolute callback URL during authorization and code exchange. Production OAuth uses the canonical public origin `https://www.momtazchem.com`; development derives its callback from the local request origin. Passport exchange failures must be handled with a custom callback rather than relying only on `failureRedirect`.

**Why:** Replit's generated deployment domain is not the site's public Google OAuth origin. Proxy-derived hosts and relative callback URLs can therefore select the wrong domain. Passport can also pass token-exchange failures to Express before the normal route handler, producing a raw HTTP 500.

**How to apply:** Keep the canonical production callback fixed to the public `www` domain, derive only development callbacks from the request, and pass the selected URL to both Passport calls. Use Passport’s custom callback to log exchange failures and return users to the login page safely.