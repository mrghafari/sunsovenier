---
name: Delivery GPS integrity
description: Security and consistency rules for GPS captured when a courier confirms delivery.
---

Courier delivery confirmation must validate a one-time code and GPS, require a dedicated courier permission, reject ineligible order states, consume the code, update every canonical order status, and insert the GPS record in one locked database transaction. A verified site administrator may confirm with the one-time code without GPS through a separate admin-only path.

**Why:** Couriers need accountable mobile confirmation, while site administrators must be able to resolve delivery without sharing their location. Separate writes or shared authorization can create GPS bypasses, duplicate confirmations, or inconsistent statuses.

**How to apply:** Keep courier and site-admin endpoints separately authorized. Require the dedicated delivery-confirmation permission and valid GPS for couriers; permit no-GPS confirmation only for active admin roles. Use server capture time, rate-limit wrong codes, lock the order, and expose only bounded, area-bucketed coordinates behind geographic-analytics permission.