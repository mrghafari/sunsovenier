---
name: Delivery GPS integrity
description: Security and consistency rules for GPS captured when a courier confirms delivery.
---

Delivery confirmation must validate a one-time code and GPS, reject every terminal order status, consume the code, update the order, and insert the GPS record in one locked database transaction.

**Why:** Separate writes can consume the code or mark an order delivered without creating its map point, and concurrent confirmations can create duplicate or regressed deliveries.

**How to apply:** Require explicit logistics edit permission for confirmation. Use server capture time, validate coordinate accuracy, and expose only bounded, area-bucketed coordinates behind geographic-analytics permission.