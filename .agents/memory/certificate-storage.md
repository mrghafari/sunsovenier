---
name: Certificate storage
description: Storage and access policy for company certificate files.
---

New company certificate files must be stored in the private Amazon S3 bucket, not Replit Object Storage. Database records should contain stable application URLs rather than expiring AWS URLs.

**Why:** Replit Object Storage depends on an internal sidecar that may not be available to the production server behind the custom domain. Direct S3 URLs would either expose a private bucket or expire after being saved.

**How to apply:** Upload certificates under a dedicated private S3 prefix. Generate short-lived signed PUT URLs for authenticated administrators and resolve stable application download paths to short-lived signed GET URLs. Preserve legacy Object Storage routes for existing records until they are migrated.