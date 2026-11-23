---
name: Shared batch barcodes
description: Barcode validation rules for products represented by multiple batch rows.
---

Multiple rows for one batched product may intentionally share the same barcode. Updating one existing batch with its unchanged barcode must remain valid; duplicate detection applies when the barcode is actually changed.

**Why:** Treating every submitted barcode as a new uniqueness claim prevents ordinary edits such as changing a batch image and returns a misleading duplicate-barcode error.

**How to apply:** Compare a submitted barcode with the persisted row first. Skip duplicate lookup when it is unchanged, but retain duplicate protection when assigning a different barcode.

Product totals and category counters mean distinct product cards, not inventory batch rows. A non-shop batch belonging to a visible product is not an additional hidden product.

**Why:** The user explicitly distinguished their four actual products from twelve batch records and confirmed that none of those products were hidden.

**How to apply:** Use the same product grouping and representative visibility as the list, including homepage category counts, counts under decorative photos, and details-popup slides. Inventory-state counters use each product's combined batch stock; category counters remain product counts rather than batch counts.

Deleting a Kardex product card differs from deleting one inventory batch. The card represents all the rows with that barcode under the same vendor; no-barcode cards are individual.

**Why:** Removing only the representative row made the software report success while a surviving batch immediately replaced the card. A store product can also be referenced by contracts; deleting it must not break or discard those records.

**How to apply:** Confirm the full, vendor-scoped row set in the UI; validate the snapshot again and remove Kardex and matching shop entries atomically. Reject stale confirmations and protected references without partial deletion. Never infer ownership from a product name or a blank barcode.