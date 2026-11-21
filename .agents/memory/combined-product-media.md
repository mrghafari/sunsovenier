---
name: Combined product media
description: Keeps gallery images and 3D assets independent in Kardex and the shop.
---

A product can have photos and an interactive 3D model at the same time. If both are saved, show the photos first and open the model separately, without a separate mode choice. In the product management list, use the primary photo or the first gallery photo as the thumbnail regardless of model presence.

**Why:** The user wants 3D to supplement product photographs rather than replace them. A saved model was hidden by the legacy photo-only flag even though its real file was available. Legacy products may also lack a single-image field even though their gallery has usable photos.

**How to apply:** Derive the display mode from the actual files, not the persisted legacy flag. Preserve either asset when the other is replaced or removed. Carry both through creation, editing, and automated shop synchronization. Browser upload timestamps arrive as JSON strings; normalize them at the database write boundary so adding a model does not break an otherwise valid save.
