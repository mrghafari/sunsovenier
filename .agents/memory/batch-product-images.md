---
name: Batch product images
description: How inventory views should resolve product images when separate batch rows do not duplicate media.
---

Separate inventory rows for additional batches may intentionally omit product media even though they represent the same product.

**Why:** New batch records can have distinct SKU or barcode values and no image fields, while the original product row retains the shared product images. Rendering only each row's own image makes later batches appear image-less.

**How to apply:** In batch-oriented inventory views, prefer the row's own image and otherwise inherit an image from an active product row with the same normalized product name. Do not group by barcode because batches can use different barcodes.