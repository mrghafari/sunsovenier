---
name: Legacy private receipt fallback
description: How to preserve private receipt access while moving legacy Object Storage files to S3.
---

Keep legacy `/objects/uploads/<uuid>` receipt URLs stable. Migrate a file to a deterministic private-S3 key derived from the same UUID, and let the application endpoint use that copy only when the original Object Storage read fails. Inspect the original media type before migration: extensionless URLs may point to images rather than PDFs.

**Why:** Development can still read historical Object Storage files while production may fail against the same bucket. Rewriting shared database paths before the new application version is published creates an avoidable outage, and making receipts public would expose financial documents. Assuming every legacy receipt is a PDF can serve an image with the wrong media type and leave image viewers unable to display it.

**How to apply:** For legacy receipt recovery, copy the verified file to private S3 without changing database references. Preserve GET and HEAD behavior on the stable application endpoint, return the original content type, and let viewers use the response media type instead of guessing from a UUID URL. Add ownership/role authorization separately rather than relying on UUID secrecy.

New bank receipts should go through an authenticated, same-origin application upload into private S3, rather than anonymous Object Storage upload links or browser-to-storage PUT requests.

**Why:** The older receipt uploader depended on the storage sidecar and a separate browser upload/validation sequence that could fail on the published site. Private S3 itself was verified to accept and return a synthetic receipt through the backend.

**How to apply:** Keep persisted receipt links stable and enforce ownership. Preserve the original document bytes, verify file metadata on the server, and bind attachment evidence to the uploading customer. Uploading proof does not authorize financial approval or wallet adjustments.

Credentialed receipt GET/HEAD requests must stay on the application's origin; serve private bytes through the authenticated backend rather than redirecting browser fetches to S3.

**Why:** A real, readable PDF failed in the finance viewer because its credentialed HEAD request followed a redirect to S3, whose wildcard CORS origin is invalid when credentials are included. This was a browser transport failure, not a missing receipt or payment failure.

**How to apply:** Preserve customer ownership and staff authorization, actual media type, private/no-store caching, and HEAD metadata without a body. Do not make receipts public, weaken authentication, or change shared bucket CORS merely to hide this error.