---
name: Legacy private receipt fallback
description: How to preserve private receipt access while moving legacy Object Storage files to S3.
---

Keep legacy `/objects/uploads/<uuid>` receipt URLs stable. Migrate a file to a deterministic private-S3 key derived from the same UUID, and let the application endpoint use that copy only when the original Object Storage read fails. Inspect the original media type before migration: extensionless URLs may point to images rather than PDFs.

**Why:** Development can still read historical Object Storage files while production may fail against the same bucket. Rewriting shared database paths before the new application version is published creates an avoidable outage, and making receipts public would expose financial documents. Assuming every legacy receipt is a PDF can serve an image with the wrong media type and leave image viewers unable to display it.

**How to apply:** For legacy receipt recovery, copy the verified file to private S3 without changing database references. Preserve GET and HEAD behavior on the stable application endpoint, return the original content type, and let viewers use the response media type instead of guessing from a UUID URL. Add ownership/role authorization separately rather than relying on UUID secrecy.