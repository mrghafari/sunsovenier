---
name: S3 asset fallback
description: Why public image routes need local fallback behavior in this project.
---

Public logo and image routes may be reached while external S3 credentials are unavailable or invalid in the development environment.

**Why:** A missing S3 credential caused repeated 403 responses and a visibly broken header logo even though a valid local logo asset existed.

**How to apply:** Serve a verified local asset before attempting S3 for public, non-sensitive assets, and keep legacy public URLs compatible where practical.