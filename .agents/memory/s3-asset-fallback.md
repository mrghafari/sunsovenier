---
name: S3 asset fallback
description: Why public image routes need local fallback behavior in this project.
---

Public logo and image routes may be reached while external S3 credentials are unavailable or invalid in the development environment.

**Why:** A missing S3 credential caused repeated 403 responses and a visibly broken header logo even though a valid local logo asset existed. An uploaded logo also caused PDFKit's internal `offsets` error in production while the bundled logo rendered correctly.

**How to apply:** Serve a verified local asset before attempting S3 for public, non-sensitive assets, keep legacy public URLs compatible where practical, and prefer rotated runtime secrets over credentials stored in the S3 settings row. Browser print windows must use a URL verified to return an image; this Vite setup serves root `/company-logo.png` through the SPA fallback, while `/attached_assets/company-logo.png` is a real PNG. For server-generated PDFs, use a known PDFKit-compatible bundled image unless uploaded images are decoded and validated first.