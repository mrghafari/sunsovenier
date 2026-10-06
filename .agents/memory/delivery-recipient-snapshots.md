---
name: Delivery recipient snapshots
description: Defines which address and phone are authoritative for fulfillment and delivery.
---

The recipient name, phone, and address entered during checkout are the authoritative delivery snapshot for that order. Customer profile and saved-address data are fallbacks only when the order has no recipient value.

**Why:** A customer can intentionally send an order to a different address or recipient. Using current profile details can misdeliver the order and can also change the meaning of historical orders after the profile is edited.

**How to apply:** When creating an order, copy recipient details into both dedicated recipient fields and the delivery-facing shipping snapshot. Warehouse, logistics, labels, exports, notifications, and delivery views must read recipient fields first and use shipping/profile values only as fallbacks.