---
name: Google OAuth callback consistency
description: Replit-hosted Google OAuth behavior across development and production domains.
---

Google OAuth must receive the same absolute callback URL during authorization and code exchange, derived from the current request origin. Passport exchange failures must be handled with a custom callback rather than relying only on `failureRedirect`.

**Why:** A relative callback URL can be resolved differently across proxied development and production domains. Passport can also pass token-exchange failures to Express before the normal route handler, producing a raw HTTP 500.

**How to apply:** For OAuth routes behind Replit proxies, derive one HTTPS-aware absolute callback URL and pass it to both Passport calls. Use Passport’s custom callback to log exchange failures and return users to the login page safely.