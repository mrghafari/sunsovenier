---
name: Abandoned cart analytics honesty
description: Limits of the available records when reporting abandoned-cart performance.
---

Report abandonment and notification trends only for records still retained. Do not call a stored notification an email delivery, and do not infer recovered sales from opening, reactivating, or completing a cart without a verified order-linked event.

**Why:** Old daily analytics snapshots were never populated; cleanup deletes abandoned sessions together with their notifications, and no reliable purchase attribution is recorded. Historical totals and recovery rates cannot be reconstructed from these sources.

**How to apply:** Label reporting periods and retention limits in the dashboard. If order-linked recovery events are added, make them durable independently of cleanup and deduplicate by cart/order before offering a recovery rate.