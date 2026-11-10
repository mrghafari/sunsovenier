---
name: Product container specifications
description: Scope and evidence boundaries for technical container details in Kardex.
---

Kardex container specifications describe the physical packaging, not contractual packaging charges.

**Why:** The user requested a product block for container material, volume, wall thickness, allowable pressure and other standard-related properties. Existing contract packaging covers commercial billing and is a separate concern.

**How to apply:** Keep technical container data separate from contract prices, product chemistry and shipping weight authority. Do not recalculate net/gross weights or overwrite every batch from recorded container capacity or tare weight.

Record manufacturer/test evidence without implying certification or compatibility.

**Why:** Test pressure and allowable working pressure have different meanings; a populated technical form is not proof that a container is approved for a substance or transport route.

**How to apply:** Preserve explicit units, distinguish unknown ratings from zero/false, leave old records unspecified, and do not invent standardized limits or backfill them from product names. Attached certificates remain separate scope.

Show populated Kardex container specifications to customers through a “Packing” popup, with its button at the opposite end of the product-name row.

**Why:** The user requested all filled packaging fields in a shop popup, then clarified «دکمه را ببر نقطه مقابل نام روبرو».

**How to apply:** Preserve this placement in grid/list and RTL layouts. Hide empty fields, not valid zero or false values; include custom properties and their units. Use live Kardex evidence rather than a second editable shop copy. When several batches share a shop product, retain a stable base record rather than silently substituting another batch’s container claims.

All Kardex form blocks must support independent expand/collapse, with packing kept in place and given an unmistakably different background.

**Why:** The user requested collapsed packing blocks, then clarified «قابلیت اکسپد و هیدن را به همه بلوکهای کاردکس اضافه کن و رنگ بلوک پکینگ را حتما متفاوت کن الان باز یکی است». A subtle shared-theme tint was not visually different enough.

**How to apply:** Start form-block disclosures closed and let staff expand each group independently, including media/document groups. Preserve edited values when closing a block and reveal hidden invalid fields on failed validation. Give packing a visibly distinct, opaque color treatment in both light and dark themes, not another subtle blue/gray tint.
