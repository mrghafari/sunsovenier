---
name: Public startup performance
description: Keep management code out of public-page startup and distinguish built verification from live deployment.
---

Public landing startup must not eagerly import management pages or their heavy reporting, spreadsheet and PDF dependencies. Declare lazy page components at module scope and retain a loading boundary without changing routes or authorization.

**Why:** A cold-mobile investigation found the public page waiting on a multi-megabyte application chunk before even starting its fast language and content requests. Serving a public homepage must not require initializing the entire business management application.

**How to apply:** Inspect the built manifest's static dependency closure, not just the size of the named App chunk: code splitting can relocate dependencies into shared files. Verify client-side shop navigation and protected-route login boundaries against the production build. A workspace build is not evidence that the external custom domain has been updated.
