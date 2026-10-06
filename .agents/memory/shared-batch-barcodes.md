---
name: Shared batch barcodes
description: Barcode validation rules for products represented by multiple batch rows.
---

Multiple rows for one batched product may intentionally share the same barcode. Updating one existing batch with its unchanged barcode must remain valid; duplicate detection applies when the barcode is actually changed.

**Why:** Treating every submitted barcode as a new uniqueness claim prevents ordinary edits such as changing a batch image and returns a misleading duplicate-barcode error.

**How to apply:** Compare a submitted barcode with the persisted row first. Skip duplicate lookup when it is unchanged, but retain duplicate protection when assigning a different barcode.