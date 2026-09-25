---
name: Barcode-level shop weights
description: Why weights edited on a noncanonical Kardex batch must not silently change a shared shop product.
---

When several Kardex batches share one barcode, the customer-facing shop has only one product weight for that barcode. Use the same deterministic representative in the Kardex list and all shop sync paths. An edit to a different batch belongs to that batch and must not transiently replace the shared shop weight.

**Why:** A later full or automatic sync can otherwise undo a direct edit to the shop, leaving checkout shipping inconsistent with what the Kardex editor just showed. This is a product-level authority decision, not a request to overwrite all batches.

**How to apply:** Check the representative-selection rule before modifying weight sync, barcode grouping, vendor edits, or batch selectors. Keep amount and unit synchronized together.